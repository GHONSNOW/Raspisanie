import React, { useState } from 'react';
import { useSchedule } from '../context/ScheduleContext';
import {
  Bell,
  Mail,
  Calendar,
  Layers,
  Sparkles,
  Cloud,
  RotateCcw,
  Trash2,
  CheckCircle2,
  Send,
  Lock,
  ExternalLink,
  Smartphone,
  ShieldCheck,
  Bot,
  Info,
  RefreshCw,
  Clock,
  Utensils,
} from 'lucide-react';
import {
  sendMorningDigestEmail,
  openEmailInGmailWeb,
  shareScheduleToTelegram,
  checkTelegramBotStatus,
} from '../lib/googleServices';
import { formatMorningNotification, STANDARD_PAIRS, LUNCH_BREAK } from '../lib/scheduleEngine';

interface SettingsViewProps {
  onOpenWeekSettingsModal: () => void;
  onOpenCalendarSyncModal: () => void;
  onOpenDeviceSyncModal?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onOpenWeekSettingsModal,
  onOpenCalendarSyncModal,
  onOpenDeviceSyncModal,
}) => {
  const {
    weekSettings,
    notificationSettings,
    updateNotificationSettings,
    setCurrentWeekAsWeekOne,
    selectedDate,
    myLessons,
    friends,
    user,
    userProfile,
    updateUserProfile,
    clearMySchedule,
    clearFriends,
    clearDirectory,
    clearAllData,
    purgeAllLegacyData,
    syncWithCloud,
    loginWithGoogle,
    logout,
    showToast,
    showConfirm,
    testTelegramBot,
    sendTelegramScheduleNow,
    alignAllLessonsToStandardTimes,
  } = useSchedule();

  const [testEmailStatus, setTestEmailStatus] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [testPushStatus, setTestPushStatus] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(() => userProfile?.displayName || '');
  const [profileGroup, setProfileGroup] = useState(() => userProfile?.group || '');
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Telegram bot state
  const [isTestingTg, setIsTestingTg] = useState(false);
  const [isSendingTgSchedule, setIsSendingTgSchedule] = useState(false);
  const [showTgHelp, setShowTgHelp] = useState(false);
  const [tgStatusMessage, setTgStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [serverTgStatus, setServerTgStatus] = useState<{ configured: boolean; serverTimeMoscow?: string } | null>(null);

  React.useEffect(() => {
    checkTelegramBotStatus().then((status) => {
      setServerTgStatus(status);
    });
  }, []);

  const handleTestPush = () => {
    const notif = formatMorningNotification(
      selectedDate,
      myLessons.filter((l) => l.dayOfWeek === 4),
      friends.map((f) => ({ name: f.nickname || f.firstName, count: f.lessons.length }))
    );

    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(notif.title, {
          body: notif.body,
          icon: '/public/favicon.ico',
        });
        setTestPushStatus('Push-уведомление отправлено!');
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            new Notification(notif.title, { body: notif.body });
            setTestPushStatus('Push-уведомление отправлено!');
          } else {
            setTestPushStatus('Разрешение на уведомления не получено');
          }
        });
      } else {
        setTestPushStatus('Уведомления заблокированы в браузере');
      }
    } else {
      setTestPushStatus('Браузер не поддерживает Push API');
    }

    setTimeout(() => setTestPushStatus(null), 4000);
  };

  const handleSendTestEmail = async () => {
    if (!notificationSettings.emailAddress) {
      setTestEmailStatus('Пожалуйста, укажите Email адрес');
      return;
    }

    setIsSendingEmail(true);
    setTestEmailStatus(null);

    const notif = formatMorningNotification(
      selectedDate,
      myLessons.filter((l) => l.dayOfWeek === 4),
      friends.map((f) => ({ name: f.nickname || f.firstName, count: f.lessons.length }))
    );

    const res = await sendMorningDigestEmail(
      notificationSettings.emailAddress,
      selectedDate,
      notif.fullText
    );

    setIsSendingEmail(false);
    if (!res.success) {
      // Automatic fallback: open prepared Gmail draft
      openEmailInGmailWeb(notificationSettings.emailAddress, notif.title, notif.fullText);
      setTestEmailStatus('Открыта вкладка веб-Gmail с готовым письмом (прямой канал)!');
    } else {
      setTestEmailStatus(res.message);
    }
    setTimeout(() => setTestEmailStatus(null), 6000);
  };

  return (
    <div className="space-y-6 pb-28 max-w-2xl mx-auto">
      {/* Top Banner */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Настройки
        </h2>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Система недель, утренние напоминания, рассылка и синхронизация
        </p>
      </div>

      {/* 1. СИСТЕМА НЕДЕЛЬ */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                Система недель
              </h3>
              <p className="text-xs text-zinc-500">
                {weekSettings.cycleType === 'single'
                  ? 'Одинаковое каждую неделю'
                  : weekSettings.cycleType === 'two_weeks'
                  ? 'Чередование: 1-я / 2-я неделя (Числитель / Знаменатель)'
                  : `${weekSettings.totalWeeks}-недельный цикл`}
              </p>
            </div>
          </div>

          <button
            onClick={onOpenWeekSettingsModal}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            Настроить
          </button>
        </div>

        {/* Quick Calibration Button */}
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 block">
              Быстрая калибровка цикла
            </span>
            <span className="text-[11px] text-zinc-400">
              Пересчитать отсчёт недель, сделав текущую неделю первой
            </span>
          </div>
          <button
            onClick={() => {
              setCurrentWeekAsWeekOne();
              showToast('Готово! Текущая неделя установлена как 1-я', 'success');
            }}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 whitespace-nowrap cursor-pointer"
          >
            «Сегодня начинается 1-я неделя»
          </button>
        </div>
      </div>

      {/* 2. РАСПИСАНИЕ ЗВОНКОВ (95 МИНУТ И ОБЕДЕННЫЙ ПЕРЕРЫВ) */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                Регламент звонков: пары по 95 минут
              </h3>
              <p className="text-xs text-zinc-500">
                Длительность пары 1 ч 35 мин • Большой обеденный перерыв с 11:50 до 12:20
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={alignAllLessonsToStandardTimes}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs transition-colors self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Привести мои пары к 95 мин</span>
          </button>
        </div>

        {/* Schedule of pairs grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
          {STANDARD_PAIRS.map((pair) => (
            <div
              key={pair.num}
              className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-800 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold text-xs flex items-center justify-center">
                  {pair.num}
                </span>
                <div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    {pair.start} — {pair.end}
                  </div>
                  <div className="text-[10px] text-zinc-400">95 минут</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Lunch Break banner */}
        <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-900/60 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
            <Utensils className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <span className="font-bold">Обеденный перерыв: {LUNCH_BREAK.start} — {LUNCH_BREAK.end} (30 минут)</span>
              <p className="text-[11px] text-amber-700/90 dark:text-amber-300/80 mt-0.5">
                Между 2-й и 3-й парами. Учитывается во всех расчетах свободных окон и совместного отдыха.
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-100 font-mono text-[11px] font-bold shrink-0">
            30 мин
          </span>
        </div>
      </div>

      {/* 2. УТРЕННИЕ УВЕДОМЛЕНИЯ И EMAIL РАССЫЛКА */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
              Утреннее напоминание о расписании
            </h3>
            <p className="text-xs text-zinc-500">
              Автоматическая утренняя сводка пар для вас и кратко о друзьях
            </p>
          </div>
        </div>

        {/* Time of Morning Reminder */}
        <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 block">
              Время утреннего уведомления
            </span>
            <span className="text-[11px] text-zinc-400">
              Во сколько каждое утро формировать сводку дня
            </span>
          </div>
          <input
            type="time"
            value={notificationSettings.morningTime}
            onChange={(e) => updateNotificationSettings({ morningTime: e.target.value })}
            className="px-2 py-1 text-xs sm:text-sm font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
          />
        </div>

        {/* Push Notification Toggle */}
        <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-zinc-400" />
            <div>
              <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 block">
                Push-уведомление на устройство
              </span>
              <span className="text-[11px] text-zinc-400">
                Мгновенное уведомление в {notificationSettings.morningTime}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleTestPush}
              className="text-[11px] font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline"
            >
              Проверить
            </button>
            <input
              type="checkbox"
              checked={notificationSettings.morningPush}
              onChange={(e) => updateNotificationSettings({ morningPush: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
          </div>
        </div>
        {testPushStatus && (
          <p className="text-xs text-blue-600 dark:text-blue-400">{testPushStatus}</p>
        )}

        {/* Email Digest Section */}
        <div className="pt-1 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-zinc-400" />
              <div>
                <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 block">
                  Получать расписание на Email
                </span>
                <span className="text-[11px] text-zinc-400">
                  Ежедневная сводка в почтовый ящик
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={notificationSettings.morningEmail}
              onChange={(e) => updateNotificationSettings({ morningEmail: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="email"
              placeholder="vash.email@univ.edu"
              value={notificationSettings.emailAddress}
              onChange={(e) => updateNotificationSettings({ emailAddress: e.target.value })}
              className="flex-1 min-w-[180px] px-3 py-2 text-xs sm:text-sm rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
            />
            <button
              onClick={() => {
                const email = notificationSettings.emailAddress || prompt('Email получателя:', 'halilovramazan394@gmail.com');
                if (email) {
                  const notif = formatMorningNotification(
                    selectedDate,
                    myLessons.filter((l) => l.dayOfWeek === 4),
                    friends.map((f) => ({ name: f.nickname || f.firstName, count: f.lessons.length }))
                  );
                  openEmailInGmailWeb(email, notif.title, notif.fullText);
                  setTestEmailStatus('Открыта вкладка Gmail с готовым письмом!');
                  setTimeout(() => setTestEmailStatus(null), 5000);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white whitespace-nowrap cursor-pointer shadow-xs"
            >
              <ExternalLink className="w-3 h-3" />
              Веб-Gmail (100%)
            </button>
            <button
              onClick={handleSendTestEmail}
              disabled={isSendingEmail}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 disabled:opacity-50 whitespace-nowrap cursor-pointer"
            >
              <Send className="w-3 h-3" />
              {isSendingEmail ? 'Отправка...' : 'Gmail API'}
            </button>
          </div>
          {testEmailStatus && (
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{testEmailStatus}</p>
          )}
        </div>

        {/* Telegram Notifications */}
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-500 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 block">
                  Двухразовые уведомления в Telegram бот
                </span>
                <span className="text-[11px] text-zinc-400">
                  {notificationSettings.telegramEnabled
                    ? `Вечером в ${notificationSettings.telegramEveningTime || '17:00'} (за день) и утром в ${notificationSettings.telegramMorningTime || notificationSettings.morningTime || '07:00'} (в день пар)`
                    : 'Автоматическая отправка расписания прямо в Telegram'}
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              id="telegram-daily-toggle"
              checked={notificationSettings.telegramEnabled || false}
              onChange={(e) => {
                updateNotificationSettings({ telegramEnabled: e.target.checked });
                if (e.target.checked && !notificationSettings.telegramChatId) {
                  showToast('Укажите ваш Chat ID ниже для доставки сообщений', 'info');
                }
              }}
              className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
            />
          </div>

          {/* Dual Schedule Time Configuration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-sky-50/50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50">
            {/* 1. Evening Notification (Day before at 17:00) */}
            <div className="p-3 rounded-lg bg-white dark:bg-zinc-800/80 border border-sky-100 dark:border-zinc-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">🌙</span>
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    За день до пар (вечер)
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={notificationSettings.telegramEveningEnabled !== false}
                  onChange={(e) => updateNotificationSettings({ telegramEveningEnabled: e.target.checked })}
                  className="w-3.5 h-3.5 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">
                Анонс на завтра со списком пар, временем и напоминанием собрать конспекты.
              </p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-zinc-600 dark:text-zinc-300 font-medium">Время (МСК):</span>
                <input
                  type="time"
                  value={notificationSettings.telegramEveningTime || '17:00'}
                  onChange={(e) => updateNotificationSettings({ telegramEveningTime: e.target.value })}
                  className="px-2 py-1 text-xs font-semibold rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>

            {/* 2. Morning Notification (Day of classes at 07:00) */}
            <div className="p-3 rounded-lg bg-white dark:bg-zinc-800/80 border border-sky-100 dark:border-zinc-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">☀️</span>
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    В день пар (утро)
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={notificationSettings.telegramMorningEnabled !== false}
                  onChange={(e) => updateNotificationSettings({ telegramMorningEnabled: e.target.checked })}
                  className="w-3.5 h-3.5 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">
                «Не забудьте: сегодня такие пары» — утреннее напоминание с аудиториями перед выходом.
              </p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-zinc-600 dark:text-zinc-300 font-medium">Время (МСК):</span>
                <input
                  type="time"
                  value={notificationSettings.telegramMorningTime || notificationSettings.morningTime || '07:00'}
                  onChange={(e) =>
                    updateNotificationSettings({
                      telegramMorningTime: e.target.value,
                      morningTime: e.target.value,
                    })
                  }
                  className="px-2 py-1 text-xs font-semibold rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>
          </div>

          {/* Connection status badge */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  notificationSettings.telegramEnabled && (notificationSettings.telegramChatId || serverTgStatus?.configured)
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-amber-500'
                }`}
              />
              <span className="text-[11px] text-zinc-600 dark:text-zinc-300">
                {serverTgStatus?.configured
                  ? `Бот активен 24/7 на сервере (МСК время: ${serverTgStatus.serverTimeMoscow || 'МСК'})`
                  : notificationSettings.telegramBotToken
                  ? `Персональный бот (Серверное время: ${serverTgStatus?.serverTimeMoscow || 'МСК'})`
                  : 'Ожидается настройка токена бота'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowTgHelp(!showTgHelp)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{showTgHelp ? 'Скрыть инструкцию' : 'Как настроить?'}</span>
            </button>
          </div>

          {/* Quick Step-by-Step Setup Guide */}
          {showTgHelp && (
            <div className="p-3.5 rounded-xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs text-zinc-700 dark:text-zinc-300 space-y-2">
              <p className="font-semibold text-sky-900 dark:text-sky-200">
                🚀 Как подключить бота за 1 минуту:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
                <li>
                  Создайте бота в Telegram: перейдите в{' '}
                  <a
                    href="https://t.me/BotFather"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-sky-600 dark:text-sky-400 underline"
                  >
                    @BotFather
                  </a>{' '}
                  и отправьте команду <code className="px-1 bg-white dark:bg-zinc-900 rounded font-mono">/newbot</code>.
                </li>
                <li>
                  <strong>Важно:</strong> Откройте диалог с созданным ботом и нажмите кнопку <b>START</b> (или отправьте команду <code className="px-1 bg-white dark:bg-zinc-900 rounded font-mono">/start</code>).
                </li>
                <li>
                  Узнайте свой Chat ID: откройте бота{' '}
                  <a
                    href="https://t.me/userinfobot"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-sky-600 dark:text-sky-400 underline"
                  >
                    @userinfobot
                  </a>
                  , он мгновенно напишет ваш цифровой <b>Id</b> (например: <code className="px-1 bg-white dark:bg-zinc-900 rounded font-mono">748291039</code>).
                </li>
                <li>
                  Вставьте полученный <b>Id</b> в поле <b>Chat ID</b> ниже, а токен бота — в поле <b>Bot Token</b> (или в <code className="px-1 bg-white dark:bg-zinc-900 rounded font-mono">TELEGRAM_BOT_TOKEN</code> в .env).
                </li>
              </ol>
            </div>
          )}

          {/* Inputs Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block mb-1">
                Ваш Telegram Chat ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="telegram-chat-id-input"
                placeholder="Например: 748291039"
                value={notificationSettings.telegramChatId || ''}
                onChange={(e) => updateNotificationSettings({ telegramChatId: e.target.value.trim() })}
                className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block mb-1">
                Токен бота (Bot Token) {serverTgStatus?.configured ? '(опционально)' : ''}
              </label>
              <input
                type="password"
                id="telegram-bot-token-input"
                placeholder={serverTgStatus?.configured ? 'Используется токен из .env' : '123456:ABC-DEF...'}
                value={notificationSettings.telegramBotToken || ''}
                onChange={(e) => updateNotificationSettings({ telegramBotToken: e.target.value.trim() })}
                className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-mono"
              />
            </div>
          </div>

          {/* Actions & Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              disabled={isTestingTg}
              onClick={async () => {
                if (!notificationSettings.telegramChatId) {
                  showToast('Сначала введите ваш Telegram Chat ID', 'error');
                  return;
                }
                setIsTestingTg(true);
                setTgStatusMessage(null);
                const res = await testTelegramBot(
                  notificationSettings.telegramChatId,
                  notificationSettings.telegramBotToken
                );
                setIsTestingTg(false);
                setTgStatusMessage({
                  text: res.message,
                  type: res.success ? 'success' : 'error',
                });
                showToast(res.message, res.success ? 'success' : 'error');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTestingTg ? 'animate-spin' : ''}`} />
              <span>{isTestingTg ? 'Проверка...' : 'Проверить бота (тест)'}</span>
            </button>

            {/* Test Evening Notification (Tomorrow) */}
            <button
              type="button"
              disabled={isSendingTgSchedule}
              onClick={async () => {
                if (!notificationSettings.telegramChatId) {
                  showToast('Сначала введите ваш Telegram Chat ID', 'error');
                  return;
                }
                setIsSendingTgSchedule(true);
                setTgStatusMessage(null);
                const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
                const res = await sendTelegramScheduleNow(
                  notificationSettings.telegramChatId,
                  tomorrow,
                  notificationSettings.telegramBotToken,
                  'evening'
                );
                setIsSendingTgSchedule(false);
                setTgStatusMessage({
                  text: res.message,
                  type: res.success ? 'success' : 'error',
                });
                showToast(res.message, res.success ? 'success' : 'error');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <span>🌙</span>
              <span>Тест: Вечерний анонс (17:00)</span>
            </button>

            {/* Test Morning Notification (Today) */}
            <button
              type="button"
              disabled={isSendingTgSchedule}
              onClick={async () => {
                if (!notificationSettings.telegramChatId) {
                  showToast('Сначала введите ваш Telegram Chat ID', 'error');
                  return;
                }
                setIsSendingTgSchedule(true);
                setTgStatusMessage(null);
                const res = await sendTelegramScheduleNow(
                  notificationSettings.telegramChatId,
                  new Date(),
                  notificationSettings.telegramBotToken,
                  'morning'
                );
                setIsSendingTgSchedule(false);
                setTgStatusMessage({
                  text: res.message,
                  type: res.success ? 'success' : 'error',
                });
                showToast(res.message, res.success ? 'success' : 'error');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <span>☀️</span>
              <span>Тест: Утреннее напоминание (07:00)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const notif = formatMorningNotification(
                  selectedDate,
                  myLessons.filter((l) => l.dayOfWeek === 4),
                  friends.map((f) => ({ name: f.nickname || f.firstName, count: f.lessons.length }))
                );
                shareScheduleToTelegram(notif.fullText);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
              <span>Открыть диалог в TG</span>
            </button>
          </div>

          {/* Feedback Status Alert */}
          {tgStatusMessage && (
            <div
              className={`p-2.5 rounded-lg text-xs font-medium ${
                tgStatusMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
              }`}
            >
              {tgStatusMessage.text}
            </div>
          )}
        </div>

        {/* Sound alerts toggle */}
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 block">
              Звуковой сигнал оповещений 🔔
            </span>
            <span className="text-[11px] text-zinc-400">
              Воспроизводить мягкий перезвон при уведомлении о паре
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                const { playNotificationSound } = await import('../lib/notificationSound');
                playNotificationSound();
              }}
              className="text-[11px] font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline cursor-pointer"
            >
              Слушать
            </button>
            <input
              type="checkbox"
              checked={notificationSettings.soundEnabled !== false}
              onChange={(e) => updateNotificationSettings({ soundEnabled: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Secondary Alerts (Section 13) */}
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Дополнительные оповещения
          </span>

          <label className="flex items-center justify-between text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
            <span>Напоминание за 15 минут до начала пары</span>
            <input
              type="checkbox"
              checked={notificationSettings.reminder15Min}
              onChange={(e) => updateNotificationSettings({ reminder15Min: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600"
            />
          </label>

          <label className="flex items-center justify-between text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
            <span>Напоминание за 30 минут до начала пары</span>
            <input
              type="checkbox"
              checked={notificationSettings.reminder30Min}
              onChange={(e) => updateNotificationSettings({ reminder30Min: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600"
            />
          </label>

          <label className="flex items-center justify-between text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
            <span>Оповещение об изменении / переносе пары</span>
            <input
              type="checkbox"
              checked={notificationSettings.scheduleChangeAlert}
              onChange={(e) => updateNotificationSettings({ scheduleChangeAlert: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600"
            />
          </label>

          <label className="flex items-center justify-between text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
            <span>Оповещение о свободном «общем окне» с друзьями</span>
            <input
              type="checkbox"
              checked={notificationSettings.freeWindowAlert}
              onChange={(e) => updateNotificationSettings({ freeWindowAlert: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600"
            />
          </label>

          <label className="flex items-center justify-between text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
            <span>Напоминать, если расписание на завтра не заполнено</span>
            <input
              type="checkbox"
              checked={notificationSettings.emptyScheduleWarning}
              onChange={(e) => updateNotificationSettings({ emptyScheduleWarning: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600"
            />
          </label>
        </div>
      </div>

      {/* 3. ИНТЕГРАЦИИ GOOGLE WORKSPACE */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                Google Календарь и Google Docs
              </h3>
              <p className="text-xs text-zinc-500">
                Экспорт занятий прямо в календарь телефона и распечатка расписания
              </p>
            </div>
          </div>
          <button
            onClick={onOpenCalendarSyncModal}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            Экспорт
          </button>
        </div>
      </div>

      {/* 4. СИНХРОНИЗАЦИЯ С ДРУГИМИ УСТРОЙСТВАМИ */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                Синхронизация и ссылки для других устройств
              </h3>
              <p className="text-xs text-zinc-500">
                QR-код, прямая ссылка на расписание и проверка на телефоне
              </p>
            </div>
          </div>
          {onOpenDeviceSyncModal && (
            <button
              onClick={onOpenDeviceSyncModal}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
            >
              Открыть ссылки и QR
            </button>
          )}
        </div>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Ваш код расписания: <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{userProfile?.shareCode || 'STU-STUDENT'}</span>. Вы можете передать эту ссылку на смартфон или планшет, чтобы всегда иметь расписание под рукой.
        </p>
      </div>

      {/* 5. ПРОФИЛЬ СТУДЕНТА */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm border border-blue-100 dark:border-blue-900/50">
              {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'С'}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                {userProfile?.displayName || 'Студент'}
              </h3>
              <p className="text-xs text-zinc-500">
                Группа: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{userProfile?.group || 'Не указана'}</span> • Код: <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{userProfile?.shareCode || 'STU-STUDENT'}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              {isEditingProfile ? 'Скрыть' : 'Изменить данные'}
            </button>
            <button
              onClick={() => {
                if (userProfile?.shareCode) {
                  navigator.clipboard.writeText(userProfile.shareCode);
                  showToast(`Код ${userProfile.shareCode} скопирован в буфер обмена!`, 'success');
                }
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 cursor-pointer"
            >
              Скопировать код
            </button>
          </div>
        </div>

        {/* Profile editing form */}
        {isEditingProfile && (
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                  Имя и фамилия
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Например: Рамазан Халилов"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                  Учебная группа
                </label>
                <input
                  type="text"
                  value={profileGroup}
                  onChange={(e) => setProfileGroup(e.target.value)}
                  placeholder="Например: ИВТ-21 или ФИИТ-2"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {profileSuccess && (
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {profileSuccess}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  updateUserProfile({
                    displayName: profileName.trim() || 'Студент',
                    group: profileGroup.trim(),
                  });
                  setProfileSuccess('Профиль сохранен!');
                  setTimeout(() => {
                    setProfileSuccess(null);
                    setIsEditingProfile(false);
                  }, 1200);
                }}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer transition-colors"
              >
                Сохранить профиль
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. ОБЛАЧНАЯ СИНХРОНИЗАЦИЯ И УПРАВЛЕНИЕ ДАННЫМИ */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                Облачная синхронизация
              </h3>
              <p className="text-xs text-zinc-500">
                {user ? `Синхронизировано с аккаунтом ${user.email}` : 'Локальное сохранение (offline-first)'}
              </p>
            </div>
          </div>

          {user ? (
            <button
              onClick={() => {
                syncWithCloud()
                  .then(() => showToast('Данные успешно сохранены в облаке!', 'success'))
                  .catch(() => showToast('Ошибка синхронизации с облаком', 'error'));
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 cursor-pointer"
            >
              Синхронизировать
            </button>
          ) : (
            <button
              onClick={loginWithGoogle}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 cursor-pointer"
            >
              Войти через Google
            </button>
          )}
        </div>

        {/* Granular Clear & Delete Controls */}
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
            Управление данными и очистка расписания:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => {
                showConfirm({
                  title: 'Очистить моё расписание?',
                  message: 'Удалить все ваши пары? Друзья и справочник преподавателей останутся без изменений.',
                  confirmText: 'Очистить расписание',
                  isDestructive: true,
                  onConfirm: () => {
                    clearMySchedule();
                    showToast('Ваше расписание очищено', 'info');
                  },
                });
              }}
              className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-red-300 dark:hover:border-red-900 hover:bg-red-50/50 dark:hover:bg-red-950/20 text-left transition-all cursor-pointer"
            >
              <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                Очистить расписание
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">Удалить все мои занятия</div>
            </button>

            <button
              type="button"
              onClick={() => {
                showConfirm({
                  title: 'Удалить всех друзей?',
                  message: 'Вы уверены, что хотите удалить всех добавленных друзей и все их расписания?',
                  confirmText: 'Очистить друзей',
                  isDestructive: true,
                  onConfirm: () => {
                    clearFriends();
                    showToast('Список друзей и их расписания очищены', 'info');
                  },
                });
              }}
              className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-red-300 dark:hover:border-red-900 hover:bg-red-50/50 dark:hover:bg-red-950/20 text-left transition-all cursor-pointer"
            >
              <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                Очистить друзей
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">Удалить список сокурсников</div>
            </button>

            <button
              type="button"
              onClick={() => {
                showConfirm({
                  title: 'Очистить справочник?',
                  message: 'Удалить всех сохраненных преподавателей и аудитории из справочника?',
                  confirmText: 'Очистить справочник',
                  isDestructive: true,
                  onConfirm: () => {
                    clearDirectory();
                    showToast('Справочник очищен', 'info');
                  },
                });
              }}
              className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-red-300 dark:hover:border-red-900 hover:bg-red-50/50 dark:hover:bg-red-950/20 text-left transition-all cursor-pointer"
            >
              <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                Очистить справочник
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">Преподаватели и аудитории</div>
            </button>

            <button
              type="button"
              onClick={() => {
                showConfirm({
                  title: 'Полная очистка приложения?',
                  message: 'ВНИМАНИЕ: Это полностью удалит все расписания, всех друзей и справочники. Это действие необратимо.',
                  confirmText: 'Удалить все данные',
                  isDestructive: true,
                  onConfirm: () => {
                    clearAllData();
                    showToast('Все данные приложения полностью сброшены', 'info');
                  },
                });
              }}
              className="p-2.5 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/30 dark:bg-red-950/10 hover:bg-red-50 dark:hover:bg-red-950/30 text-left transition-all cursor-pointer"
            >
              <div className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                Полная очистка
              </div>
              <div className="text-[11px] text-red-500/80 mt-0.5">Сбросить всё приложение</div>
            </button>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                showConfirm({
                  title: 'Полный сброс кеша (Hard Reset)?',
                  message: 'Очистить весь локальный кеш браузера (localStorage) и восстановить чистое состояние?',
                  confirmText: 'Сбросить кеш',
                  isDestructive: true,
                  onConfirm: () => {
                    purgeAllLegacyData();
                    showToast('Локальный кеш полностью очищен!', 'success');
                  },
                });
              }}
              className="w-full py-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-300 dark:hover:border-red-800 text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-300 text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Очистить весь локальный кеш браузера (Hard Reset)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
