import { Lesson } from '../types';
import { formatDateYYYYMMDD, formatRussianDate, DAYS_OF_WEEK } from './scheduleEngine';
import { OAUTH_CLIENT_ID } from './firebase';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: unknown }) => void;
          }) => {
            requestAccessToken: () => void;
          };
        };
      };
    };
  }
}

export async function ensureGoogleIdentitySDK(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (window.google?.accounts?.oauth2) return true;

  return new Promise((resolve) => {
    let script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]') as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (window.google?.accounts?.oauth2) {
        clearInterval(interval);
        resolve(true);
      } else if (attempts >= 25) {
        clearInterval(interval);
        resolve(Boolean(window.google?.accounts?.oauth2));
      }
    }, 100);
  });
}

let cachedGoogleToken: string | null = null;
let tokenExpiry = 0;

export async function getGoogleAccessToken(
  scopes: string = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/documents'
): Promise<string> {
  if (cachedGoogleToken && Date.now() < tokenExpiry) {
    return cachedGoogleToken;
  }

  const hasSdk = await ensureGoogleIdentitySDK();
  if (!hasSdk || !window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services SDK не загружен. Используйте прямую отправку через веб-интерфейс Gmail/Календаря.');
  }

  return new Promise((resolve, reject) => {
    try {
      const client = window.google!.accounts.oauth2.initTokenClient({
        client_id: OAUTH_CLIENT_ID,
        scope: scopes,
        callback: (resp) => {
          if (resp.error) {
            reject(new Error(`Ошибка Google OAuth: ${typeof resp.error === 'string' ? resp.error : 'доступ отклонён'}. Используйте прямое открытие в веб-клиенте.`));
          } else if (resp.access_token) {
            cachedGoogleToken = resp.access_token;
            tokenExpiry = Date.now() + 3500 * 1000;
            resolve(resp.access_token);
          } else {
            reject(new Error('Не удалось получить токен доступа Google'));
          }
        },
      });

      client.requestAccessToken();
    } catch (err: any) {
      reject(new Error(err?.message || 'Ошибка инициализации Google OAuth'));
    }
  });
}

/**
 * Creates Google Calendar events for a day's lessons
 */
export async function exportDayToGoogleCalendar(
  lessons: Lesson[],
  date: Date,
  token?: string
): Promise<{ success: boolean; count: number; message: string }> {
  try {
    const accessToken = token || (await getGoogleAccessToken('https://www.googleapis.com/auth/calendar.events'));
    const dateStr = formatDateYYYYMMDD(date);
    let createdCount = 0;

    for (const l of lessons) {
      const startDateTime = `${dateStr}T${l.startTime}:00`;
      const endDateTime = `${dateStr}T${l.endTime}:00`;

      const eventBody = {
        summary: `Пара: ${l.subject}`,
        location: l.classroomName ? `Кабинет ${l.classroomName}` : undefined,
        description: [
          `Тип: ${l.type}`,
          l.teacherName ? `Преподаватель: ${l.teacherName}` : '',
          l.group ? `Группа: ${l.group}` : '',
          l.comment ? `Заметка: ${l.comment}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
        start: {
          dateTime: new Date(startDateTime).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: new Date(endDateTime).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        colorId: l.type === 'lecture' ? '1' : l.type === 'lab' ? '5' : '2',
      };

      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventBody),
      });

      if (res.ok) {
        createdCount++;
      }
    }

    return {
      success: true,
      count: createdCount,
      message: `Успешно добавлено ${createdCount} пар в Google Календарь на ${formatRussianDate(date, false)}!`,
    };
  } catch (err: any) {
    return {
      success: false,
      count: 0,
      message: err.message || 'Ошибка добавления в Google Календарь',
    };
  }
}

/**
 * Sends morning schedule digest email via Gmail API
 */
export async function sendMorningDigestEmail(
  toEmail: string,
  date: Date,
  digestContent: string,
  token?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const accessToken = token || (await getGoogleAccessToken('https://www.googleapis.com/auth/gmail.send'));
    const subject = `Расписание пар на ${formatRussianDate(date, true)}`;

    const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
    const messageParts = [
      `To: ${toEmail}`,
      `Subject: ${utf8Subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      digestContent,
    ];
    const message = messageParts.join('\r\n');

    // Base64url encode
    const encodedMessage = btoa(unescape(encodeURIComponent(message)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedMessage }),
    });

    if (!res.ok) {
      const errJson = await res.json();
      throw new Error(errJson.error?.message || 'Не удалось отправить письмо');
    }

    return {
      success: true,
      message: `Сводка расписания успешно отправлена на ${toEmail}!`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Ошибка отправки через Gmail',
    };
  }
}

/**
 * Exports full weekly schedule into a Google Doc
 */
export async function exportScheduleToGoogleDocs(
  title: string,
  scheduleText: string,
  token?: string
): Promise<{ success: boolean; docUrl?: string; message: string }> {
  try {
    const accessToken = token || (await getGoogleAccessToken('https://www.googleapis.com/auth/documents'));

    // 1. Create document
    const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });

    if (!createRes.ok) {
      throw new Error('Не удалось создать Google Документ');
    }

    const docData = await createRes.json();
    const docId = docData.documentId;

    // 2. Insert schedule text into document
    const insertRes = await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: scheduleText,
            },
          },
        ],
      }),
    });

    if (!insertRes.ok) {
      // Return link anyway as document exists
    }

    const docUrl = `https://docs.google.com/document/d/${docId}/edit`;
    return {
      success: true,
      docUrl,
      message: 'Расписание успешно экспортировано в Google Документ!',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Ошибка экспорта в Google Docs',
    };
  }
}

export const syncDayLessonsToGoogleCalendar = exportDayToGoogleCalendar;

export async function exportScheduleToGoogleDoc(
  lessons: Lesson[],
  docTitle: string = 'Учебное расписание'
): Promise<{ success: boolean; docUrl?: string; message: string }> {
  // Format formatted text for doc
  let content = `${docTitle}\n=====================================\n\n`;
  for (const day of DAYS_OF_WEEK) {
    const dayLessons = lessons.filter((l) => l.dayOfWeek === day.id);
    if (dayLessons.length > 0) {
      content += `\n--- ${day.full.toUpperCase()} ---\n`;
      for (const l of dayLessons) {
        content += `${l.startTime} - ${l.endTime}: ${l.subject} (${l.type})\n`;
        if (l.classroomName) content += `  Кабинет: ${l.classroomName}\n`;
        if (l.teacherName) content += `  Преподаватель: ${l.teacherName}\n`;
        if (l.comment) content += `  Заметка: ${l.comment}\n`;
      }
    }
  }

  return exportScheduleToGoogleDocs(docTitle, content);
}

export function exportScheduleToICS(lessons: Lesson[], fileName: string = 'schedule.ics') {
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//StudySchedule//RU',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  const now = new Date();
  const dtStamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  for (const l of lessons) {
    const startClean = l.startTime.replace(':', '') + '00';
    const endClean = l.endTime.replace(':', '') + '00';
    const uid = `lesson-${l.id}-${Date.now()}@schedule.app`;

    icsContent.push('BEGIN:VEVENT');
    icsContent.push(`UID:${uid}`);
    icsContent.push(`DTSTAMP:${dtStamp}`);
    icsContent.push(`SUMMARY:${l.subject} (${l.type})`);
    if (l.classroomName) icsContent.push(`LOCATION:Кабинет ${l.classroomName}`);
    icsContent.push(
      `DESCRIPTION:${[l.teacherName ? `Преподаватель: ${l.teacherName}` : '', l.comment ? `Заметка: ${l.comment}` : ''].filter(Boolean).join(' \\n ')}`
    );
    icsContent.push('END:VEVENT');
  }

  icsContent.push('END:VCALENDAR');

  const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Builds direct web URL to Google Calendar event creation (works 100% without OAuth tokens!)
 */
export function buildGoogleCalendarWebUrl(lesson: Lesson, date: Date): string {
  const dateStr = formatDateYYYYMMDD(date).replace(/-/g, '');
  const startClean = lesson.startTime.replace(':', '') + '00';
  const endClean = lesson.endTime.replace(':', '') + '00';
  const dates = `${dateStr}T${startClean}/${dateStr}T${endClean}`;

  const details = [
    `Тип: ${lesson.type}`,
    lesson.teacherName ? `Преподаватель: ${lesson.teacherName}` : '',
    lesson.group ? `Группа: ${lesson.group}` : '',
    lesson.comment ? `Заметка: ${lesson.comment}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Пара: ${lesson.subject} (${lesson.type})`,
    dates,
    details,
    location: lesson.classroomName ? `Аудитория ${lesson.classroomName}` : '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Opens Google Calendar in new tab pre-filled with the lesson data
 */
export function openLessonInGoogleCalendar(lesson: Lesson, date: Date) {
  const url = buildGoogleCalendarWebUrl(lesson, date);
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Shares formatted schedule text directly to Telegram (web/app)
 */
export function shareScheduleToTelegram(text: string) {
  const url = `https://t.me/share/url?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Sends message to Telegram via Bot API or server endpoint
 */
export async function sendTelegramBotMessage(
  botToken: string,
  chatId: string,
  text: string
): Promise<{ success: boolean; message: string }> {
  try {
    const cleanToken = botToken?.trim();
    const cleanChatId = chatId?.trim();
    if (!cleanChatId) {
      return { success: false, message: 'Укажите Chat ID Telegram' };
    }

    // Try server endpoint first (which can use process.env.TELEGRAM_BOT_TOKEN)
    try {
      const srvRes = await fetch('/api/telegram/send-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: cleanChatId,
          botToken: cleanToken || undefined,
          lessons: [], // formatted text is sent directly if using direct API
        }),
      });
      if (srvRes.ok) {
        const data = await srvRes.json();
        if (data.success) return { success: true, message: data.message };
      }
    } catch {
      // fallback to direct client call below
    }

    if (!cleanToken) {
      return { success: false, message: 'Укажите токен бота Telegram или настройте переменную TELEGRAM_BOT_TOKEN' };
    }

    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text,
        parse_mode: 'HTML',
      }),
    });

    const data = await res.json();
    if (data.ok) {
      return { success: true, message: 'Сообщение успешно отправлено в Telegram!' };
    } else {
      return { success: false, message: `Ошибка Telegram API: ${data.description || 'Неизвестная ошибка'}` };
    }
  } catch (err) {
    return { success: false, message: `Сетевая ошибка отправки: ${String(err)}` };
  }
}

/**
 * Checks if the backend has TELEGRAM_BOT_TOKEN configured and returns server stats
 */
export async function checkTelegramBotStatus(): Promise<{
  configured: boolean;
  serverTimeMoscow?: string;
  serverDateMoscow?: string;
  activeSubscribers?: number;
}> {
  try {
    const res = await fetch('/api/telegram/status');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to check Telegram bot status:', err);
  }
  return { configured: false };
}

/**
 * Sends test verification message to Telegram bot
 */
export async function testTelegramBotConnection(
  chatId: string,
  botToken?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/telegram/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, botToken }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true, message: data.message };
    }
    return { success: false, message: data.error || 'Не удалось отправить сообщение' };
  } catch (err) {
    // If backend route is unavailable, try client-side fetch if botToken provided
    if (botToken && chatId) {
      return sendTelegramBotMessage(
        botToken,
        chatId,
        `🔔 <b>Тест бота расписания!</b>\n\nБот подключен и готов отправлять вам пары.`
      );
    }
    return { success: false, message: `Ошибка соединения: ${String(err)}` };
  }
}

/**
 * Sends full schedule for a day to Telegram immediately (morning digest or evening preview)
 */
export async function sendScheduleToTelegramChat(
  chatId: string,
  lessons: Lesson[],
  date: Date,
  botToken?: string,
  type: 'morning' | 'evening' | 'custom' = 'morning',
  userName?: string
): Promise<{ success: boolean; message: string }> {
  const dateStr = formatRussianDate(date, true);
  const weekdayName = DAYS_OF_WEEK.find((d) => d.id === (date.getDay() === 0 ? 7 : date.getDay()))?.full || 'Сегодня';

  try {
    const res = await fetch('/api/telegram/send-schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId,
        botToken: botToken || undefined,
        lessons,
        dateStr,
        weekdayName,
        type,
        userName,
      }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true, message: data.message };
    }
    return { success: false, message: data.error || 'Ошибка отправки расписания' };
  } catch (err) {
    return { success: false, message: `Сетевая ошибка: ${String(err)}` };
  }
}

/**
 * Saves subscription for daily automatic delivery (both morning & evening) on the backend
 */
export async function syncTelegramDailySubscription(
  userId: string,
  chatId: string,
  morningTime: string,
  lessons: Lesson[],
  enabled: boolean,
  shareCode?: string,
  botToken?: string,
  eveningTime?: string,
  eveningEnabled?: boolean,
  morningEnabled?: boolean,
  weekSettings?: any,
  overrides?: any[],
  displayName?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/telegram/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        chatId,
        morningTime: morningTime || '07:00',
        morningEnabled: morningEnabled !== false,
        eveningTime: eveningTime || '17:00',
        eveningEnabled: eveningEnabled !== false,
        lessons,
        enabled,
        shareCode,
        botToken: botToken || undefined,
        weekSettings,
        overrides,
        displayName,
      }),
    });
    const data = await res.json();
    return { success: res.ok, message: data.message || data.error };
  } catch (err) {
    return { success: false, message: String(err) };
  }
}

/**
 * Opens Gmail in a new tab with pre-filled recipient, subject and body (100% reliable, zero token setup)
 */
export function openEmailInGmailWeb(to: string, subject: string, body: string) {
  const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Opens Yandex Mail in a new tab with pre-filled recipient, subject and body
 */
export function openEmailInYandexWeb(to: string, subject: string, body: string) {
  const url = `https://mail.yandex.ru/compose?to=${encodeURIComponent(to)}&subj=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Opens user's default email client (Gmail / Outlook / Apple Mail) with pre-filled subject and body
 */
export function openEmailClient(to: string, subject: string, body: string) {
  const mailtoUrl = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const link = document.createElement('a');
  link.href = mailtoUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
  }, 100);
}

/**
 * Opens a clean printable view of schedule
 */
export function printSchedule(lessons: Lesson[], title: string = 'Расписание занятий') {
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) return;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <meta charset="utf-8" />
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #111; }
        h1 { font-size: 20px; border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 16px; }
        .day-group { margin-bottom: 24px; }
        .day-title { font-weight: bold; font-size: 14px; text-transform: uppercase; background: #f3f4f6; padding: 6px 10px; border-radius: 4px; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        th, td { border: 1px solid #e5e7eb; padding: 8px 10px; font-size: 13px; text-align: left; }
        th { background-color: #f9fafb; font-weight: 600; }
        .type-badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 11px; background: #e0f2fe; color: #0369a1; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      ${DAYS_OF_WEEK.map((day) => {
        const dayLessons = lessons.filter((l) => l.dayOfWeek === day.id);
        if (dayLessons.length === 0) return '';
        return `
          <div class="day-group">
            <div class="day-title">${day.full}</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 110px;">Время</th>
                  <th>Предмет</th>
                  <th style="width: 90px;">Тип</th>
                  <th style="width: 100px;">Аудитория</th>
                  <th>Преподаватель</th>
                </tr>
              </thead>
              <tbody>
                ${dayLessons
                  .map(
                    (l) => `
                  <tr>
                    <td><strong>${l.startTime} — ${l.endTime}</strong></td>
                    <td>${l.subject}</td>
                    <td><span class="type-badge">${l.type}</span></td>
                    <td>${l.classroomName || '—'}</td>
                    <td>${l.teacherName || '—'}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        `;
      }).join('')}
      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
