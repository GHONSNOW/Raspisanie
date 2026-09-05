import React, { useState } from 'react';
import { useSchedule } from '../../context/ScheduleContext';
import {
  syncDayLessonsToGoogleCalendar,
  exportScheduleToGoogleDoc,
  exportScheduleToICS,
  openLessonInGoogleCalendar,
} from '../../lib/googleServices';
import { getEffectiveLessonsForDate, formatRussianDate, DAYS_OF_WEEK } from '../../lib/scheduleEngine';
import {
  X,
  Calendar,
  FileText,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';

interface CalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CalendarSyncModal: React.FC<CalendarSyncModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    myLessons,
    selectedDate,
    overrides,
    weekSettings,
  } = useSchedule();

  const [calSyncStatus, setCalSyncStatus] = useState<string | null>(null);
  const [docExportUrl, setDocExportUrl] = useState<string | null>(null);
  const [docCopiedNotice, setDocCopiedNotice] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const effectiveLessons = getEffectiveLessonsForDate(
    selectedDate,
    myLessons,
    overrides,
    weekSettings,
    'my'
  );

  const handleSyncToGoogleCalendar = async () => {
    setIsProcessing(true);
    setCalSyncStatus(null);

    const res = await syncDayLessonsToGoogleCalendar(effectiveLessons, selectedDate);
    setIsProcessing(false);

    if (res.success) {
      setCalSyncStatus(res.message);
    } else {
      setCalSyncStatus(`${res.message} — Скачайте .ICS файл ниже или добавьте пару напрямую.`);
    }
  };

  const handleExportToGoogleDoc = async () => {
    setIsProcessing(true);
    setDocExportUrl(null);
    setDocCopiedNotice(null);

    // Prepare clean text representation of schedule
    let content = `УЧЕБНОЕ РАСПИСАНИЕ\n=====================================\n\n`;
    for (const day of DAYS_OF_WEEK) {
      const dayLessons = myLessons.filter((l) => l.dayOfWeek === day.id);
      if (dayLessons.length > 0) {
        content += `\n--- ${day.full.toUpperCase()} ---\n`;
        for (const l of dayLessons) {
          content += `${l.startTime} - ${l.endTime}: ${l.subject} (${l.type})\n`;
          if (l.classroomName) content += `  Аудитория: ${l.classroomName}\n`;
          if (l.teacherName) content += `  Преподаватель: ${l.teacherName}\n`;
          if (l.comment) content += `  Заметка: ${l.comment}\n`;
        }
      }
    }

    // Try Google Docs API
    const res = await exportScheduleToGoogleDoc(myLessons, 'Учебное расписание');
    setIsProcessing(false);

    if (res.success && res.docUrl) {
      setDocExportUrl(res.docUrl);
    } else {
      // Graceful fallback: Copy to clipboard and open https://docs.new
      navigator.clipboard.writeText(content);
      const link = document.createElement('a');
      link.href = 'https://docs.new';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) document.body.removeChild(link);
      }, 100);

      setDocCopiedNotice('Текст расписания скопирован в буфер обмена! На открывшейся странице Google Документов нажмите Вставить (Ctrl+V).');
    }
  };

  const handleDownloadICS = () => {
    exportScheduleToICS(myLessons);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Экспорт и синхронизация
              </h3>
              <p className="text-xs text-zinc-500">
                Google Календарь, Google Docs и файл .ics
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

        {/* 1. iCal (.ics) - Highest Reliability */}
        <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Скачать календарь (.ics)
                </h4>
                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-200/80 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                  100% надёжно
                </span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                Импортируется в Google Календарь, Apple Календарь и Outlook в 1 клик
              </p>
            </div>
            <button
              onClick={handleDownloadICS}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Скачать .ics
            </button>
          </div>
        </div>

        {/* 2. Google Calendar API Sync */}
        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Синхронизация через Google SDK
              </h4>
              <p className="text-xs text-zinc-500">
                События на {formatRussianDate(selectedDate)} ({effectiveLessons.length} пар)
              </p>
            </div>
            <button
              onClick={handleSyncToGoogleCalendar}
              disabled={isProcessing || effectiveLessons.length === 0}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? 'Синхронизация...' : 'Экспортировать'}
            </button>
          </div>

          {calSyncStatus && (
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 flex items-start gap-1.5">
              <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{calSyncStatus}</span>
            </p>
          )}
        </div>

        {/* 3. Google Docs Export */}
        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                В Google Документ
              </h4>
              <p className="text-xs text-zinc-500">
                Таблица для печати или редактирования
              </p>
            </div>
            <button
              onClick={handleExportToGoogleDoc}
              disabled={isProcessing}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              Создать документ
            </button>
          </div>

          {docExportUrl && (
            <div className="pt-2">
              <a
                href={docExportUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                <span>Открыть созданный документ</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {docCopiedNotice && (
            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{docCopiedNotice}</span>
            </div>
          )}
        </div>

        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
