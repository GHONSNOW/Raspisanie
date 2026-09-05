import React, { useState } from 'react';
import { useSchedule } from '../../context/ScheduleContext';
import { WeekCycleType } from '../../types';
import { getWeekNumberForDate, getWeekLabel, formatRussianDate } from '../../lib/scheduleEngine';
import { X, Layers, Calendar, Check, RefreshCw } from 'lucide-react';

interface WeekSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WeekSettingsModal: React.FC<WeekSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    weekSettings,
    updateWeekSettings,
    setCurrentWeekAsWeekOne,
    selectedDate,
  } = useSchedule();

  const [cycleType, setCycleType] = useState<WeekCycleType>(weekSettings.cycleType);
  const [totalWeeks, setTotalWeeks] = useState<number>(weekSettings.totalWeeks);
  const [semesterStart, setSemesterStart] = useState<string>(weekSettings.semesterStartDate || weekSettings.referenceDate || '');

  if (!isOpen) return null;

  const currentWeekNumber = getWeekNumberForDate(selectedDate, {
    ...weekSettings,
    cycleType,
    totalWeeks,
    semesterStartDate: semesterStart,
    referenceDate: semesterStart || weekSettings.referenceDate,
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateWeekSettings({
      cycleType,
      totalWeeks: cycleType === 'single' ? 1 : cycleType === 'two_weeks' ? 2 : totalWeeks,
      semesterStartDate: semesterStart,
      referenceDate: semesterStart || weekSettings.referenceDate,
    });
    onClose();
  };

  const handleCalibrateToday = () => {
    setCurrentWeekAsWeekOne();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Настройка цикла недель
              </h3>
              <p className="text-xs text-zinc-500">
                Автоматическое чередование расписания
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

        {/* Current status display */}
        <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs space-y-1">
          <span className="text-zinc-500">Текущий расчёт для {formatRussianDate(selectedDate)}:</span>
          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            {getWeekLabel(currentWeekNumber, {
              ...weekSettings,
              cycleType,
              totalWeeks,
            })}
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Cycle Options */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
              Тип чередования расписания:
            </label>

            <label
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                cycleType === 'two_weeks'
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
              }`}
            >
              <input
                type="radio"
                name="cycle"
                checked={cycleType === 'two_weeks'}
                onChange={() => {
                  setCycleType('two_weeks');
                  setTotalWeeks(2);
                }}
                className="mt-0.5 text-blue-600"
              />
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                  1-я и 2-я неделя (Числитель / Знаменатель)
                </span>
                <span className="text-[11px] text-zinc-500">
                  Классическая система: расписание меняется каждые 7 дней
                </span>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                cycleType === 'single'
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
              }`}
            >
              <input
                type="radio"
                name="cycle"
                checked={cycleType === 'single'}
                onChange={() => {
                  setCycleType('single');
                  setTotalWeeks(1);
                }}
                className="mt-0.5 text-blue-600"
              />
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                  Одинаковое расписание каждую неделю
                </span>
                <span className="text-[11px] text-zinc-500">
                  Без разделения на недели
                </span>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                cycleType === 'custom' || cycleType === 'four_weeks'
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
              }`}
            >
              <input
                type="radio"
                name="cycle"
                checked={cycleType === 'four_weeks' || cycleType === 'custom'}
                onChange={() => {
                  setCycleType('four_weeks');
                  setTotalWeeks(4);
                }}
                className="mt-0.5 text-blue-600"
              />
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                  Многонедельный цикл (3, 4 или больше)
                </span>
                <span className="text-[11px] text-zinc-500">
                  Для модульных систем и блоков
                </span>
              </div>
            </label>
          </div>

          {/* If custom / four_weeks, choose number of weeks */}
          {(cycleType === 'four_weeks' || cycleType === 'custom') && (
            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Количество недель в цикле:
              </label>
              <input
                type="number"
                min={2}
                max={12}
                value={totalWeeks}
                onChange={(e) => setTotalWeeks(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
              />
            </div>
          )}

          {/* Quick Calibration Button */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={handleCalibrateToday}
              className="w-full py-2.5 px-3 text-xs font-semibold rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
              <span>Калибровка: «Сегодня начинается 1-я неделя»</span>
            </button>
            <p className="text-[11px] text-zinc-400 text-center mt-1">
              Система автоматически откалибрует отсчет и все последующие недели
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90"
            >
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
