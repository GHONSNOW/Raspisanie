import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';

interface TelegramSubscription {
  userId: string;
  chatId: string;
  botToken?: string;
  enabled: boolean;
  morningEnabled: boolean;
  morningTime: string; // e.g. "07:00"
  eveningEnabled: boolean;
  eveningTime: string; // e.g. "17:00" (day before)
  lessons: any[];
  weekSettings?: any;
  overrides?: any[];
  shareCode?: string;
  displayName?: string;
  lastMorningSentDate?: string; // "DD.MM.YYYY"
  lastEveningSentDate?: string; // "DD.MM.YYYY"
}

const SUBSCRIPTIONS_FILE = path.join(process.cwd(), 'telegram_subscriptions.json');

// In-memory subscription store backed by disk persistence
const subscriptions: Map<string, TelegramSubscription> = new Map();

function loadSubscriptionsFromDisk(): void {
  try {
    if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
      const data = fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        parsed.forEach((sub) => {
          if (sub && sub.userId && sub.chatId) {
            subscriptions.set(String(sub.userId), sub);
          }
        });
        console.log(`[Telegram Bot] Loaded ${subscriptions.size} subscription(s) from disk.`);
      }
    }
  } catch (err) {
    console.warn('[Telegram Bot] Failed to load subscriptions from disk:', err);
  }
}

function saveSubscriptionsToDisk(): void {
  try {
    const list = Array.from(subscriptions.values());
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Telegram Bot] Failed to save subscriptions to disk:', err);
  }
}

// Initial disk load
loadSubscriptionsFromDisk();

function getMoscowDate(): {
  dateStr: string;
  timeStr: string;
  dayOfWeek: number;
  weekdayName: string;
  rawMoscowDate: Date;
} {
  const now = new Date();
  const moscowTimeStr = now.toLocaleTimeString('ru-RU', {
    timeZone: 'Europe/Moscow',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const moscowDateStr = now.toLocaleDateString('ru-RU', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const d = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
  const jsDay = d.getDay();
  const dayOfWeek = jsDay === 0 ? 7 : jsDay;

  const weekdays = ['', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
  const weekdayName = weekdays[dayOfWeek] || 'Сегодня';

  return {
    dateStr: moscowDateStr,
    timeStr: moscowTimeStr,
    dayOfWeek,
    weekdayName,
    rawMoscowDate: d,
  };
}

function getLessonsForDate(
  date: Date,
  lessons: any[],
  weekSettings?: any,
  overrides?: any[]
): any[] {
  if (!Array.isArray(lessons)) return [];
  const jsDay = date.getDay();
  const dayOfWeek = jsDay === 0 ? 7 : jsDay;

  // Calculate week number if cycleType is two_weeks
  let weekNum = 1;
  if (weekSettings && weekSettings.referenceDate) {
    try {
      const ref = new Date(weekSettings.referenceDate);
      const diffMs = date.getTime() - ref.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffWeeks = Math.floor(diffDays / 7);
      const totalWeeks = weekSettings.totalWeeks || 2;
      const normalizedWeek = ((diffWeeks % totalWeeks) + totalWeeks) % totalWeeks;
      weekNum = normalizedWeek + 1;
    } catch {}
  }

  // Format YYYY-MM-DD for override matching
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;

  // 1. Filter recurring lessons for this day and parity
  let result = lessons.filter((l) => {
    if (!l || l.dayOfWeek !== dayOfWeek) return false;
    if (!l.weekType || l.weekType === 'all') return true;
    return Number(l.weekType) === weekNum;
  });

  // 2. Apply date-specific overrides (cancellations, replacements, moves)
  if (Array.isArray(overrides)) {
    const dayOverrides = overrides.filter((o) => o && o.date === dateStr);
    for (const ov of dayOverrides) {
      if (ov.action === 'cancelled') {
        result = result.filter((l) => l.id !== ov.originalLessonId);
      } else if (ov.action === 'replaced' || ov.action === 'moved') {
        result = result.map((l) =>
          l.id === ov.originalLessonId ? { ...l, ...ov.replacementLesson, isOverridden: true } : l
        );
      }
    }
  }

  return result.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderLessonList(lessons: any[]): string {
  return lessons.map((l, idx) => {
    const num = idx + 1;
    const typeLabel =
      l.type === 'lecture'
        ? 'Лекция'
        : l.type === 'practice'
        ? 'Практика'
        : l.type === 'lab'
        ? 'Лабораторная'
        : 'Пара';

    let item = `<b>${num}. ⏰ ${l.startTime} — ${l.endTime}</b>\n   📚 <b>${escapeHtml(l.subject)}</b> (<i>${typeLabel}</i>)`;
    if (l.classroomName) {
      item += `\n   📍 Кабинет: <code>${escapeHtml(l.classroomName)}</code>`;
    }
    if (l.teacherName) {
      item += `\n   👨‍🏫 Преподаватель: ${escapeHtml(l.teacherName)}`;
    }
    if (l.comment) {
      item += `\n   📝 <i>${escapeHtml(l.comment)}</i>`;
    }
    return item;
  }).join('\n\n');
}

// Evening reminder: Sent the day before classes (e.g. at 17:00)
function formatEveningReminderTelegramHTML(
  lessons: any[],
  tomorrowDateStr: string,
  tomorrowWeekdayName: string,
  userName?: string
): string {
  const greeting = userName ? `Добрый вечер, <b>${escapeHtml(userName)}</b>!` : 'Добрый вечер!';

  if (!lessons || lessons.length === 0) {
    return `🌙 ${greeting}\n\n🏖️ <b>Напоминание на завтра (${tomorrowWeekdayName}, ${tomorrowDateStr})</b>:\n\nЗавтра пар нет — у вас свободный день! Можно спокойно отдохнуть, сделать домашку или выспаться 🎉`;
  }

  const sorted = [...lessons].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  const firstLesson = sorted[0];
  const lastLesson = sorted[sorted.length - 1];

  return `🌙 ${greeting}\n\n🔔 <b>Напоминание на завтра (${tomorrowWeekdayName}, ${tomorrowDateStr})</b>:\n\nВсего завтра пар: <b>${lessons.length}</b>\nНачало первой пары: ⏰ <b>${firstLesson.startTime}</b> (до ${lastLesson.endTime})\n\n${renderLessonList(sorted)}\n\n💡 <i>Совет: соберите сумку с вечера и не забудьте завести будильник! Спокойной ночи 😴</i>`;
}

// Morning reminder: Sent on the day of classes (e.g. at 07:00)
function formatMorningReminderTelegramHTML(
  lessons: any[],
  todayDateStr: string,
  todayWeekdayName: string,
  userName?: string
): string {
  const greeting = userName ? `Доброе утро, <b>${escapeHtml(userName)}</b>!` : 'Доброе утро!';

  if (!lessons || lessons.length === 0) {
    return `☀️ ${greeting}\n\n🎉 <b>Сегодня ${todayWeekdayName} (${todayDateStr})</b>:\n\nПо расписанию сегодня пар нет! Отличный день для отдыха и любимых дел 🌴`;
  }

  const sorted = [...lessons].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  const firstLesson = sorted[0];

  return `☀️ ${greeting}\n\n🔔 <b>Не забудьте, сегодня ${todayWeekdayName} (${todayDateStr})!</b>\n\nВсего пар сегодня: <b>${lessons.length}</b>\nПервая пара начинается в ⏰ <b>${firstLesson.startTime}</b> (${escapeHtml(firstLesson.subject)})\n\n${renderLessonList(sorted)}\n\n🚀 <i>Удачного и продуктивного учебного дня! Не забудьте студенческий билет 🎒</i>`;
}

async function sendTelegramApiMessage(botToken: string, chatId: string, text: string) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  });
  const data = await response.json();
  return data;
}

// Background automated scheduler: runs every 30 seconds to deliver evening and morning notifications
async function checkAndSendDailyNotifications() {
  const { dateStr, timeStr, dayOfWeek, weekdayName, rawMoscowDate } = getMoscowDate();

  // Tomorrow calculation in Moscow timezone
  const tomorrowDate = new Date(rawMoscowDate.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowDayOfWeek = tomorrowDate.getDay() === 0 ? 7 : tomorrowDate.getDay();
  const tomorrowDateStr = tomorrowDate.toLocaleDateString('ru-RU', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const weekdays = ['', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
  const tomorrowWeekdayName = weekdays[tomorrowDayOfWeek] || 'Завтра';

  for (const [id, sub] of subscriptions.entries()) {
    if (!sub.enabled || !sub.chatId) continue;
    const token = sub.botToken || process.env.TELEGRAM_BOT_TOKEN;
    if (!token) continue;

    // 1. EVENING REMINDER (За день до начала пар, по умолчанию в 17:00)
    const eveningTime = sub.eveningTime || '17:00';
    const eveningEnabled = sub.eveningEnabled !== false;
    // Window: from eveningTime until midnight (with catch-up if container was idle)
    const isEveningWindow = timeStr >= eveningTime && timeStr <= '23:59';

    if (eveningEnabled && isEveningWindow && sub.lastEveningSentDate !== dateStr) {
      const tomorrowLessons = getLessonsForDate(
        tomorrowDate,
        sub.lessons,
        sub.weekSettings,
        sub.overrides
      );

      const message = formatEveningReminderTelegramHTML(
        tomorrowLessons,
        tomorrowDateStr,
        tomorrowWeekdayName,
        sub.displayName
      );

      try {
        const res = await sendTelegramApiMessage(token, sub.chatId, message);
        if (res.ok) {
          sub.lastEveningSentDate = dateStr;
          saveSubscriptionsToDisk();
          console.log(`[Telegram Bot] Successfully sent evening reminder to chatId ${sub.chatId} for tomorrow (${tomorrowDateStr})`);
        } else {
          console.error(`[Telegram Bot] Error sending evening reminder to chatId ${sub.chatId}:`, res.description);
        }
      } catch (err) {
        console.error(`[Telegram Bot] Network failure sending evening reminder to chatId ${sub.chatId}:`, err);
      }
    }

    // 2. MORNING REMINDER (Утром в день пар, по умолчанию в 07:00)
    const morningTime = sub.morningTime || '07:00';
    const morningEnabled = sub.morningEnabled !== false;
    // Window: from morningTime until 14:00 (with catch-up if container was idle overnight)
    const isMorningWindow = timeStr >= morningTime && timeStr < '14:00';

    if (morningEnabled && isMorningWindow && sub.lastMorningSentDate !== dateStr) {
      const todayLessons = getLessonsForDate(
        rawMoscowDate,
        sub.lessons,
        sub.weekSettings,
        sub.overrides
      );

      const message = formatMorningReminderTelegramHTML(
        todayLessons,
        dateStr,
        weekdayName,
        sub.displayName
      );

      try {
        const res = await sendTelegramApiMessage(token, sub.chatId, message);
        if (res.ok) {
          sub.lastMorningSentDate = dateStr;
          saveSubscriptionsToDisk();
          console.log(`[Telegram Bot] Successfully sent morning reminder to chatId ${sub.chatId} for today (${dateStr})`);
        } else {
          console.error(`[Telegram Bot] Error sending morning reminder to chatId ${sub.chatId}:`, res.description);
        }
      } catch (err) {
        console.error(`[Telegram Bot] Network failure sending morning reminder to chatId ${sub.chatId}:`, err);
      }
    }
  }
}

// Start recurring scheduler every 30 seconds
setInterval(checkAndSendDailyNotifications, 30000);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // External Cron trigger endpoint (e.g. for Cron-Job.org or uptime pings)
  app.get('/api/telegram/cron', async (req, res) => {
    try {
      const moscow = getMoscowDate();
      await checkAndSendDailyNotifications();
      return res.json({
        success: true,
        message: 'Notification check completed',
        serverTimeMoscow: moscow.timeStr,
        serverDateMoscow: moscow.dateStr,
        activeSubscribers: subscriptions.size,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Telegram bot status check
  app.get('/api/telegram/status', (req, res) => {
    const hasEnvToken = Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN.trim().length > 10);
    const moscow = getMoscowDate();
    res.json({
      configured: hasEnvToken,
      activeSubscribers: subscriptions.size,
      serverTimeMoscow: moscow.timeStr,
      serverDateMoscow: moscow.dateStr,
    });
  });

  // Send a test verification message to the user's Telegram Chat
  app.post('/api/telegram/test', async (req, res) => {
    try {
      const { chatId, botToken } = req.body;
      const tokenToUse = (botToken || process.env.TELEGRAM_BOT_TOKEN || '').trim();

      if (!tokenToUse) {
        return res.status(400).json({
          success: false,
          error: 'Бот-токен не указан. Задайте переменную TELEGRAM_BOT_TOKEN или введите токен бота в настройках.',
        });
      }

      if (!chatId) {
        return res.status(400).json({
          success: false,
          error: 'Укажите Chat ID Telegram (ваш персональный ID в Telegram).',
        });
      }

      const moscow = getMoscowDate();
      const testMessage = `🔔 <b>Связь с Telegram ботом установлена!</b>\n\nПривет! Бот успешно подключен к вашему приложению «Расписание пар».\n\n⏰ Серверное время: <b>${moscow.timeStr} (МСК)</b>\n📅 Дата: <b>${moscow.dateStr}</b>\n\nТеперь бот будет автоматически отправлять:\n• 🌙 <b>Вечерний анонс в 17:00</b> — за день до начала пар (со списком занятий на завтра)\n• ☀️ <b>Утреннее напоминание в 07:00</b> — «Не забудьте, сегодня такие пары»\n\nВсе расписания синхронизированы! 🎓`;

      const tgRes = await sendTelegramApiMessage(tokenToUse, String(chatId).trim(), testMessage);

      if (tgRes.ok) {
        return res.json({
          success: true,
          message: 'Тестовое сообщение успешно отправлено в Telegram!',
        });
      } else {
        return res.status(400).json({
          success: false,
          error: `Ошибка Telegram API: ${tgRes.description || 'Не удалось отправить сообщение'}. Проверьте токен бота и Chat ID (напишите боту /start в Telegram).`,
        });
      }
    } catch (err: any) {
      console.error('Error in /api/telegram/test:', err);
      return res.status(500).json({ success: false, error: err.message || 'Внутренняя ошибка сервера' });
    }
  });

  // Send today's or tomorrow's schedule right now to Telegram (preview)
  app.post('/api/telegram/send-schedule', async (req, res) => {
    try {
      const { chatId, botToken, lessons, dateStr, weekdayName, type, userName } = req.body;
      const tokenToUse = (botToken || process.env.TELEGRAM_BOT_TOKEN || '').trim();

      if (!tokenToUse) {
        return res.status(400).json({
          success: false,
          error: 'Бот-токен не указан. Задайте TELEGRAM_BOT_TOKEN в переменных окружения или введите в настройках.',
        });
      }

      if (!chatId) {
        return res.status(400).json({
          success: false,
          error: 'Укажите Chat ID Telegram.',
        });
      }

      const dateInfo = getMoscowDate();
      const targetDateStr = dateStr || dateInfo.dateStr;
      const targetWeekdayName = weekdayName || dateInfo.weekdayName;

      let message: string;
      if (type === 'evening') {
        message = formatEveningReminderTelegramHTML(lessons || [], targetDateStr, targetWeekdayName, userName);
      } else {
        message = formatMorningReminderTelegramHTML(lessons || [], targetDateStr, targetWeekdayName, userName);
      }

      const tgRes = await sendTelegramApiMessage(tokenToUse, String(chatId).trim(), message);

      if (tgRes.ok) {
        return res.json({
          success: true,
          message: type === 'evening'
            ? 'Вечерний анонс пар на завтра успешно отправлен в Telegram!'
            : 'Утреннее напоминание расписания успешно отправлено в Telegram!',
        });
      } else {
        return res.status(400).json({
          success: false,
          error: `Ошибка отправки в Telegram: ${tgRes.description || 'Неизвестная ошибка'}.`,
        });
      }
    } catch (err: any) {
      console.error('Error in /api/telegram/send-schedule:', err);
      return res.status(500).json({ success: false, error: err.message || 'Внутренняя ошибка сервера' });
    }
  });

  // Save or update daily notification subscription with morning & evening support
  app.post('/api/telegram/subscribe', (req, res) => {
    try {
      const {
        userId,
        chatId,
        botToken,
        morningTime,
        morningEnabled,
        eveningTime,
        eveningEnabled,
        enabled,
        lessons,
        weekSettings,
        overrides,
        shareCode,
        displayName,
      } = req.body;

      if (!userId || !chatId) {
        return res.status(400).json({ success: false, error: 'Параметры userId и chatId обязательны' });
      }

      const subKey = String(userId);
      const existing = subscriptions.get(subKey);

      const updatedSub: TelegramSubscription = {
        userId: subKey,
        chatId: String(chatId).trim(),
        botToken: botToken ? String(botToken).trim() : (existing?.botToken || undefined),
        enabled: Boolean(enabled),
        morningEnabled: morningEnabled !== false,
        morningTime: morningTime || '07:00',
        eveningEnabled: eveningEnabled !== false,
        eveningTime: eveningTime || '17:00',
        lessons: Array.isArray(lessons) ? lessons : (existing?.lessons || []),
        weekSettings: weekSettings || existing?.weekSettings,
        overrides: Array.isArray(overrides) ? overrides : (existing?.overrides || []),
        shareCode: shareCode || existing?.shareCode,
        displayName: displayName || existing?.displayName,
        lastMorningSentDate: existing?.lastMorningSentDate,
        lastEveningSentDate: existing?.lastEveningSentDate,
      };

      subscriptions.set(subKey, updatedSub);
      saveSubscriptionsToDisk();

      console.log(
        `[Telegram Bot] Updated subscription for user ${userId}: morning=${updatedSub.morningTime} (on=${updatedSub.morningEnabled}), evening=${updatedSub.eveningTime} (on=${updatedSub.eveningEnabled}), enabled=${updatedSub.enabled}`
      );

      return res.json({
        success: true,
        message: 'Настройки расписания в Telegram (утро и вечер) сохранены на сервере!',
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || 'Ошибка сохранения подписки' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Study Schedule server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
