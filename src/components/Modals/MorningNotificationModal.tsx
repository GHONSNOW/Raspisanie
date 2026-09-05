import React, { useState } from 'react';
import { useSchedule } from '../../context/ScheduleContext';
import {
  getEffectiveLessonsForDate,
  formatMorningNotification,
  formatRussianDate,
} from '../../lib/scheduleEngine';
import {
  sendMorningDigestEmail,
  openEmailInGmailWeb,
  openEmailInYandexWeb,
  openEmailClient,
  shareScheduleToTelegram,
} from '../../lib/googleServices';
import { X, Bell, Mail, Copy, Check, Send, ExternalLink } from 'lucide-react';

interface MorningNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MorningNotificationModal: React.FC<MorningNotificationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    selectedDate,
    myLessons,
    friends,
    overrides,
    weekSettings,
    notificationSettings,
    updateNotificationSettings,
    showToast,
  } = useSchedule();

  const [copied, setCopied] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [targetEmail, setTargetEmail] = useState(notificationSettings.emailAddress || 'halilovramazan394@gmail.com');

  if (!isOpen) return null;

  // Effective lessons for selected date
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

  const notif = formatMorningNotification(selectedDate, effectiveLessons, friendsSummaries);

  const handleCopy = () => {
    navigator.clipboard.writeText(notif.fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenGmailWeb = () => {
    const email = targetEmail.trim();
    if (email && email !== notificationSettings.emailAddress) {
      updateNotificationSettings({ emailAddress: email });
    }
    openEmailInGmailWeb(email, notif.title, notif.fullText);
    setEmailStatus('Открыта вкладка Gmail с заполненным письмом! Нажмите «Отправить».');
    setTimeout(() => setEmailStatus(null), 6000);
  };

  const handleOpenYandexWeb = () => {
    const email = targetEmail.trim();
    openEmailInYandexWeb(email, notif.title, notif.fullText);
    setEmailStatus('Открыта вкладка Яндекс.Почты с заполненным письмом!');
    setTimeout(() => setEmailStatus(null), 6000);
  };

  const handleOpenMailto = () => {
    const email = targetEmail.trim();
    openEmailClient(email, notif.title, notif.fullText);
    setEmailStatus('Запущен системный почтовый клиент');
    setTimeout(() => setEmailStatus(null), 5000);
  };

  const handleSendViaGmailApi = async () => {
    const email = targetEmail.trim();
    if (!email) {
      showToast('Пожалуйста, укажите Email адрес', 'error');
      return;
    }

    if (email !== notificationSettings.emailAddress) {
      updateNotificationSettings({ emailAddress: email });
    }

    setIsSending(true);
    setEmailStatus(null);
    const res = await sendMorningDigestEmail(email, selectedDate, notif.fullText);
    setIsSending(false);

    if (res.success) {
      setEmailStatus(res.message);
    } else {
      // Automatic graceful fallback to Gmail Web
      setEmailStatus(`Google SDK: ${res.message}. Открываем прямое письмо в Gmail Web...`);
      setTimeout(() => {
        openEmailInGmailWeb(email, notif.title, notif.fullText);
      }, 800);
    }
    setTimeout(() => setEmailStatus(null), 6000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Утреннее напоминание на сегодня
              </h3>
              <p className="text-xs text-zinc-500">
                Автоматически формируется в {notificationSettings.morningTime}
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

        {/* Target email input */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Email получателя:</span>
          </label>
          <input
            type="email"
            value={targetEmail}
            onChange={(e) => setTargetEmail(e.target.value)}
            placeholder="ваш_email@gmail.com"
            className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium"
          />
        </div>

        {/* Message Preview Container */}
        <div className="bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3.5 font-mono text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-line leading-relaxed shadow-inner max-h-48 overflow-y-auto">
          {notif.fullText}
        </div>

        {emailStatus && (
          <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 text-xs font-medium">
            {emailStatus}
          </div>
        )}

        {/* Action Controls - Guaranteed sending options */}
        <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
            Способы отправки:
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {/* 1. Direct Web Gmail (100% reliable) */}
            <button
              onClick={handleOpenGmailWeb}
              className="py-2 px-2.5 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/30 hover:bg-red-100/70 dark:hover:bg-red-900/50 text-xs font-bold text-red-700 dark:text-red-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              title="Открыть готовое письмо в веб-версии Gmail"
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0 text-red-600 dark:text-red-400" />
              <span>В веб-Gmail</span>
            </button>

            {/* 2. Direct Telegram */}
            <button
              onClick={() => shareScheduleToTelegram(notif.fullText)}
              className="py-2 px-2.5 rounded-xl border border-sky-200 dark:border-sky-900/40 bg-sky-50/50 dark:bg-sky-950/30 hover:bg-sky-100/70 dark:hover:bg-sky-900/50 text-xs font-bold text-sky-700 dark:text-sky-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              title="Отправить текст в Telegram"
            >
              <Send className="w-3.5 h-3.5 shrink-0 text-sky-500" />
              <span>В Telegram</span>
            </button>

            {/* 3. Mailto */}
            <button
              onClick={handleOpenMailto}
              className="py-2 px-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              title="Открыть почтовый клиент по умолчанию"
            >
              <Mail className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
              <span>Mailto</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Скопировано!' : 'Скопировать'}
            </button>

            <button
              onClick={handleSendViaGmailApi}
              disabled={isSending}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
              title="Отправка через фоновый Gmail API (Google SDK)"
            >
              <Send className="w-3.5 h-3.5" />
              {isSending ? 'Запрос SDK...' : 'Через Gmail SDK'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
