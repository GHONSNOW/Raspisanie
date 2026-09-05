import React, { useState } from 'react';
import { useSchedule } from '../context/ScheduleContext';
import { formatRussianDate, getWeekLabel, getWeekNumberForDate, formatDateYYYYMMDD } from '../lib/scheduleEngine';
import {
  Calendar as CalendarIcon,
  Sun,
  Moon,
  Bell,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  User as UserIcon,
  Settings2,
  CalendarCheck,
  Smartphone,
} from 'lucide-react';

interface HeaderProps {
  onOpenNotificationModal: () => void;
  onOpenWeekSettingsModal: () => void;
  onOpenAuthModal: () => void;
  onOpenCalendarSyncModal: () => void;
  onOpenDeviceSyncModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNotificationModal,
  onOpenWeekSettingsModal,
  onOpenAuthModal,
  onOpenCalendarSyncModal,
  onOpenDeviceSyncModal,
}) => {
  const {
    selectedDate,
    setSelectedDate,
    weekSettings,
    isDarkMode,
    setIsDarkMode,
    user,
    setCurrentWeekAsWeekOne,
  } = useSchedule();

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const currentWeekNum = getWeekNumberForDate(selectedDate, weekSettings);
  const weekLabel = getWeekLabel(currentWeekNum, weekSettings);

  const goToPrevDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  const goToNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const goToTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDate(tomorrow);
  };

  const isTodaySelected =
    formatDateYYYYMMDD(selectedDate) === formatDateYYYYMMDD(new Date());

  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const isTomorrowSelected =
    formatDateYYYYMMDD(selectedDate) === formatDateYYYYMMDD(tomorrowDate);

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 transition-colors">
      <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4">
        {/* Top bar: Brand & Utilities */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 font-semibold text-sm shadow-sm">
              Р
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
                Расписание
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <button
                  onClick={onOpenWeekSettingsModal}
                  className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                  title="Нажмите для настройки цикла недель"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  {weekLabel}
                  <Settings2 className="w-2.5 h-2.5 ml-0.5 opacity-60" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick utility icons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={onOpenDeviceSyncModal}
              aria-label="Синхронизация с устройствами"
              title="Синхронизация и ссылки для проверки с телефона"
              className="px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer border border-blue-200/60 dark:border-blue-800/40"
            >
              <Smartphone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="hidden sm:inline">Телефон / Ссылки</span>
            </button>

            <button
              onClick={onOpenNotificationModal}
              aria-label="Утреннее напоминание и Email"
              title="Утреннее напоминание и Email"
              className="p-2 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors relative"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900"></span>
            </button>

            <button
              onClick={onOpenCalendarSyncModal}
              aria-label="Синхронизация с Google"
              title="Google Календарь и Документы"
              className="p-2 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <CalendarCheck className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              aria-label="Переключить тему"
              className="p-2 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-600" />}
            </button>

            <button
              onClick={onOpenAuthModal}
              aria-label="Профиль"
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1 text-xs font-medium"
            >
              {user?.photoURL ? (
                <img src={user.photoURL} alt="avatar" className="w-5 h-5 rounded-full" />
              ) : (
                <UserIcon className="w-4 h-4" />
              )}
              <span className="hidden sm:inline max-w-[80px] truncate">
                {user ? user.displayName?.split(' ')[0] || 'Профиль' : 'Войти'}
              </span>
            </button>
          </div>
        </div>

        {/* Date Selector Navigation Row */}
        <div className="flex items-center justify-between gap-2 pt-1">
          {/* Quick preset chips: Сегодня / Завтра */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={goToToday}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                isTodaySelected
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-xs'
                  : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              Сегодня
            </button>
            <button
              onClick={goToTomorrow}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                isTomorrowSelected
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-xs'
                  : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              Завтра
            </button>
          </div>

          {/* Current Date Display with Day Stepper */}
          <div className="flex items-center gap-1 bg-zinc-100/90 dark:bg-zinc-800/90 px-2 py-1 rounded-lg border border-zinc-200/60 dark:border-zinc-700/60">
            <button
              onClick={goToPrevDay}
              aria-label="Предыдущий день"
              className="p-1 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="relative">
              <button
                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                className="px-1.5 py-0.5 text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5"
              >
                <CalendarIcon className="w-3.5 h-3.5 opacity-70" />
                <span>{formatRussianDate(selectedDate, true)}</span>
              </button>

              {/* Native date input popover */}
              {isDatePickerOpen && (
                <div className="absolute right-0 mt-2 p-2 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 z-50">
                  <input
                    type="date"
                    value={formatDateYYYYMMDD(selectedDate)}
                    onChange={(e) => {
                      if (e.target.value) {
                        const [y, m, d] = e.target.value.split('-').map(Number);
                        setSelectedDate(new Date(y, m - 1, d));
                        setIsDatePickerOpen(false);
                      }
                    }}
                    className="px-2 py-1 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded text-zinc-900 dark:text-zinc-100 outline-hidden"
                  />
                </div>
              )}
            </div>

            <button
              onClick={goToNextDay}
              aria-label="Следующий день"
              className="p-1 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
