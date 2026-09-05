import React, { useState } from 'react';
import { useSchedule } from '../../context/ScheduleContext';
import {
  getEffectiveLessonsForDate,
  formatMorningNotification,
  formatRussianDate,
} from '../../lib/scheduleEngine';
import {
  shareScheduleToTelegram,
  sendTelegramBotMessage,
  sendScheduleToTelegramChat,
  openEmailClient,
  openEmailInGmailWeb,
  openEmailInYandexWeb,
  sendMorningDigestEmail,
} from '../../lib/googleServices';
import { playNotificationSound } from '../../lib/notificationSound';
import {
  X,
  Bell,
  Send,
  Mail,
  Smartphone,
  Copy,
  Check,
  Volume2,
  ExternalLink,
  Clock,
  Sparkles,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    selectedDate,
    myLessons,
    friends,
    overrides,
    weekSettings,
    userProfile,
    notificationSettings,
    updateNotificationSettings,
    notificationLog,
    triggerLiveNotification,
  } = useSchedule();

  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  // Effective lessons for current selected date
  const effectiveLessons = getEffectiveLessonsForDate(
    selectedDate,
    myLessons,
    overrides,
    weekSettings,
    'my'
  );

  const friendsSummaries = friends.map((f) => {
    const friendLessons = getEffectiveLessonsForDate(
      selectedDate,
      f.lessons,
      overrides,
      weekSettings,
      f.id
    );
    return {
      name: f.nickname || f.firstName,
      count: friendLessons.length,
      lastEndTime: friendLessons.length > 0 ? friendLessons[friendLessons.length - 1].endTime : undefined,
    };
  });

  const morningDigest = formatMorningNotification(selectedDate, effectiveLessons, friendsSummaries);

  const handleCopy = () => {
    navigator.clipboard.writeText(morningDigest.fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePushNow = () => {
    triggerLiveNotification(morningDigest.title, morningDigest.body);
    setStatusMessage('Уведомление отправлено на ваше устройство!');
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleSoundTest = () => {
    playNotificationSound();
    setStatusMessage('Звуковой сигнал воспроизведен 🔔');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleTelegramShare = () => {
    shareScheduleToTelegram(morningDigest.fullText);
  };

  const handleSendTelegramBot = async () => {
    const token = notificationSettings.telegramBotToken;
    let chatId = notificationSettings.telegramChatId;

    if (!chatId) {
      const enteredChatId = prompt('Введите ваш Telegram Chat ID (узнать можно у @userinfobot):', '');
      if (!enteredChatId) return;
      chatId = enteredChatId.trim();
      updateNotificationSettings({
        telegramChatId: chatId,
        telegramEnabled: true,
      });
    }

    setIsSending(true);
    const res = await sendScheduleToTelegramChat(
      chatId,
      effectiveLessons,
      selectedDate,
      token,
      'morning',
      userProfile?.displayName
    );
    setIsSending(false);
    setStatusMessage(res.message);
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleSendEmail = async () => {
    const email = notificationSettings.emailAddress || prompt('Введите ваш Email адрес:');
    if (!email) return;

    if (!notificationSettings.emailAddress) {
      updateNotificationSettings({ emailAddress: email, morningEmail: true });
    }

    setIsSending(true);
    const res = await sendMorningDigestEmail(email, selectedDate, morningDigest.fullText);
    setIsSending(false);

    if (res.success) {
      setStatusMessage(res.message);
    } else {
      // Fallback to mailto client
      openEmailClient(email, morningDigest.title, morningDigest.fullText);
      setStatusMessage('Открыт почтовый клиент для отправки письма');
    }
    setTimeout(() => setStatusMessage(null), 5000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Top Header */}
        <div className="flex items-start justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Центр уведомлений и рассылки
              </h3>
              <p className="text-xs text-zinc-500">
                Утренние сводки, пуши на телефон, Telegram и Email
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {statusMessage && (
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 text-xs flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0 text-blue-600" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Live Test & Dispatch Buttons */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
            Куда отправить или открыть сводку сейчас:
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <button
              onClick={handlePushNow}
              className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-left transition-all cursor-pointer"
            >
              <Smartphone className="w-4 h-4 text-blue-600 mb-1" />
              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Push в браузер</div>
              <div className="text-[10px] text-zinc-500">На экран устройства</div>
            </button>

            <button
              onClick={handleTelegramShare}
              className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-left transition-all cursor-pointer"
            >
              <Send className="w-4 h-4 text-sky-500 mb-1" />
              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">В Telegram</div>
              <div className="text-[10px] text-zinc-500">Диалог / Избранное</div>
            </button>

            <button
              onClick={() => {
                const email = notificationSettings.emailAddress || prompt('Email получателя:', 'halilovramazan394@gmail.com');
                if (email) {
                  openEmailInGmailWeb(email, morningDigest.title, morningDigest.fullText);
                  setStatusMessage('Открыта вкладка Gmail с готовым письмом!');
                  setTimeout(() => setStatusMessage(null), 4000);
                }
              }}
              className="p-2.5 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/40 dark:bg-red-950/20 hover:bg-red-100/60 dark:hover:bg-red-900/40 text-left transition-all cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 text-red-600 mb-1" />
              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Веб-Gmail</div>
              <div className="text-[10px] text-zinc-500">100% без токенов</div>
            </button>

            <button
              onClick={handleSendEmail}
              disabled={isSending}
              className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-left transition-all cursor-pointer"
            >
              <Mail className="w-4 h-4 text-emerald-600 mb-1" />
              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Почта (SDK)</div>
              <div className="text-[10px] text-zinc-500">{isSending ? 'Отправка...' : 'Gmail API'}</div>
            </button>

            <button
              onClick={handleSoundTest}
              className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-left transition-all cursor-pointer"
            >
              <Volume2 className="w-4 h-4 text-amber-500 mb-1" />
              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Звук колокола</div>
              <div className="text-[10px] text-zinc-500">Проверить сигнал</div>
            </button>
          </div>
        </div>

        {/* Morning Notification Preview Box */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Текст утренней сводки на сегодня:
            </span>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-600 font-semibold">Скопировано!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Скопировать</span>
                </>
              )}
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 font-mono text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-line leading-relaxed shadow-inner max-h-48 overflow-y-auto">
            {morningDigest.fullText}
          </div>
        </div>

        {/* Notification Log (Recently Delivered) */}
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              История отправленных оповещений:
            </span>
            <span className="text-[10px] text-zinc-400">
              {notificationLog.length} записей
            </span>
          </div>

          {notificationLog.length === 0 ? (
            <p className="text-xs text-zinc-400 italic py-2">
              Оповещений пока не было. Фоновый таймер проверяет пары каждые 30 секунд.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {notificationLog.slice(0, 5).map((entry) => (
                <div
                  key={entry.id}
                  className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-700/60 text-xs flex items-start gap-2"
                >
                  <Clock className="w-3.5 h-3.5 text-zinc-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                        {entry.title}
                      </span>
                      <span className="text-[10px] text-zinc-400 ml-2 shrink-0">{entry.time}</span>
                    </div>
                    <p className="text-zinc-500 dark:text-zinc-400 line-clamp-1">{entry.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 px-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
