import React, { useState } from 'react';
import { useSchedule } from '../context/ScheduleContext';
import {
  DAYS_OF_WEEK,
  LESSON_TYPES_INFO,
  getWeekLabel,
  getWeekNumberForDate,
  getPairNumber,
  timeToMinutes,
} from '../lib/scheduleEngine';
import { Lesson } from '../types';
import { Plus, Clock, MapPin, User, FileText, Calendar, Filter, Trash2, Utensils, Coffee } from 'lucide-react';

interface WeekScheduleViewProps {
  onSelectLesson: (lesson: Lesson) => void;
  onOpenAddLessonModal: (initialDayOfWeek?: number) => void;
  onExportWeekToDocs: () => void;
}

export const WeekScheduleView: React.FC<WeekScheduleViewProps> = ({
  onSelectLesson,
  onOpenAddLessonModal,
  onExportWeekToDocs,
}) => {
  const {
    myLessons,
    weekSettings,
    deleteLesson,
    clearDayLessons,
    showToast,
    showConfirm,
  } = useSchedule();

  // Selected week filter in view: 'all' or week number (1, 2, etc.) based on today's actual week
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<number | 'all'>(() => {
    return getWeekNumberForDate(new Date(), weekSettings);
  });
  const [activeDayTab, setActiveDayTab] = useState<number>(() => {
    const d = new Date().getDay();
    return d === 0 ? 1 : d; // 1=ПН..6=СБ, Sunday defaults to Monday
  });

  // Filter lessons based on selected week filter
  const getDayLessons = (dayId: number) => {
    return myLessons
      .filter((l) => {
        if (l.dayOfWeek !== dayId) return false;
        if (selectedWeekFilter === 'all') return true;
        if (l.weekType === 'all') return true;
        return Number(l.weekType) === selectedWeekFilter;
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const currentDayLessons = getDayLessons(activeDayTab);

  return (
    <div className="space-y-6 pb-24">
      {/* Week Header with Week Cycle Filter and Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Расписание на неделю
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Сетка регулярных занятий по дням недели
          </p>
        </div>

        {/* Week Switcher Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {weekSettings.totalWeeks > 1 && (
            <div className="inline-flex p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-medium border border-zinc-200/60 dark:border-zinc-700/60">
              <button
                onClick={() => setSelectedWeekFilter(1)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  selectedWeekFilter === 1
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                1-я неделя
              </button>
              <button
                onClick={() => setSelectedWeekFilter(2)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  selectedWeekFilter === 2
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                2-я неделя
              </button>
              <button
                onClick={() => setSelectedWeekFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  selectedWeekFilter === 'all'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                Все
              </button>
            </div>
          )}

          <button
            onClick={onExportWeekToDocs}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors border border-zinc-200/60 dark:border-zinc-700/60"
            title="Экспортировать расписание недели в Google Документ"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">В Google Docs</span>
          </button>
        </div>
      </div>

      {/* Days of Week Tab Bar (ПН ВТ СР ЧТ ПТ СБ) */}
      <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
        {DAYS_OF_WEEK.slice(0, 6).map((day) => {
          const count = getDayLessons(day.id).length;
          const isActive = activeDayTab === day.id;

          return (
            <button
              key={day.id}
              onClick={() => setActiveDayTab(day.id)}
              className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-xl transition-all cursor-pointer border ${
                isActive
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-xs'
                  : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <span className="text-xs sm:text-sm font-bold">{day.short}</span>
              <span className={`text-[10px] mt-0.5 ${isActive ? 'opacity-80' : 'text-zinc-400'}`}>
                {count > 0 ? `${count} пар` : '—'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Day Schedule Content */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
            {DAYS_OF_WEEK.find((d) => d.id === activeDayTab)?.full}
            {selectedWeekFilter !== 'all' && (
              <span className="text-xs font-normal text-zinc-500 ml-2">
                ({selectedWeekFilter}-я неделя)
              </span>
            )}
          </h3>

          <div className="flex items-center gap-2">
            {currentDayLessons.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const dayName = DAYS_OF_WEEK.find((d) => d.id === activeDayTab)?.full || 'этот день';
                  showConfirm({
                    title: 'Очистить день?',
                    message: `Вы действительно хотите удалить все ${currentDayLessons.length} пар за ${dayName}?`,
                    confirmText: 'Очистить день',
                    isDestructive: true,
                    onConfirm: () => {
                      clearDayLessons(activeDayTab);
                      showToast(`Все пары за ${dayName} удалены`, 'info');
                    },
                  });
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                title="Удалить все пары за этот день"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Очистить день</span>
              </button>
            )}
            <button
              onClick={() => onOpenAddLessonModal(activeDayTab)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Добавить пару
            </button>
          </div>
        </div>

        {currentDayLessons.length === 0 ? (
          <div className="text-center py-14 px-4 bg-zinc-50 dark:bg-zinc-900/40 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
            <Calendar className="w-8 h-8 mx-auto text-zinc-400 mb-2 opacity-60" />
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              В этот день нет занятий
            </p>
            <p className="text-xs text-zinc-400 mt-0.5 mb-3">
              Для выбранной недели пары не назначены
            </p>
            <button
              onClick={() => onOpenAddLessonModal(activeDayTab)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Добавить пару
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Bell schedule reminder banner */}
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 py-1.5 px-3 bg-zinc-100/60 dark:bg-zinc-800/40 rounded-xl flex items-center justify-between flex-wrap gap-2 border border-zinc-200/50 dark:border-zinc-700/50">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-3 h-3 text-blue-500" />
                Длительность пары: <strong>95 минут</strong>
              </span>
              <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-medium">
                <Utensils className="w-3 h-3" />
                Обеденный перерыв: <strong>11:50 — 12:20 (30 мин)</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {currentDayLessons.map((lesson, idx) => {
                const typeInfo = LESSON_TYPES_INFO[lesson.type] || LESSON_TYPES_INFO.other;
                const pairNum = getPairNumber(lesson.startTime);
                const startMins = timeToMinutes(lesson.startTime);
                const endMins = timeToMinutes(lesson.endTime);
                const duration = Math.max(0, endMins - startMins);

                const prevLesson = idx > 0 ? currentDayLessons[idx - 1] : null;
                const prevEndMins = prevLesson ? timeToMinutes(prevLesson.endTime) : 0;
                const breakMins = prevLesson ? startMins - prevEndMins : 0;
                const isLunch =
                  prevLesson &&
                  prevEndMins <= timeToMinutes('11:55') &&
                  startMins >= timeToMinutes('12:15');

                return (
                  <React.Fragment key={lesson.id}>
                    {prevLesson && breakMins > 0 && (
                      <div className="my-1">
                        {isLunch ? (
                          <div className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-xs">
                            <Utensils className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span className="font-semibold">Обеденный перерыв</span>
                            <span className="font-mono text-[11px] opacity-80">(11:50 — 12:20 • 30 мин)</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 font-medium pl-1">
                            <Coffee className="w-3 h-3 text-zinc-400" />
                            <span>
                              Перемена {breakMins} мин ({prevLesson.endTime} — {lesson.startTime})
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <div
                      onClick={() => onSelectLesson(lesson)}
                      className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer shadow-xs group"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {pairNum && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                              {pairNum} пара
                            </span>
                          )}
                          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-zinc-400" />
                            {lesson.startTime} — {lesson.endTime}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            ({duration} мин)
                          </span>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${typeInfo.badgeClass}`}>
                            {typeInfo.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {lesson.weekType !== 'all' ? (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                              {lesson.weekType}-я неделя
                            </span>
                          ) : (
                            <span className="text-[10px] text-zinc-400">Каждая нед.</span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              showConfirm({
                                title: 'Удалить пару?',
                                message: `Удалить пару «${lesson.subject}» из расписания?`,
                                confirmText: 'Удалить пару',
                                isDestructive: true,
                                onConfirm: () => {
                                  deleteLesson(lesson.id);
                                  showToast(`Пара «${lesson.subject}» удалена`, 'info');
                                },
                              });
                            }}
                            className="p-1 rounded text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                            title="Удалить пару"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h4 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {lesson.subject}
                      </h4>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                        {lesson.classroomName && (
                          <span className="flex items-center gap-1 font-medium text-zinc-800 dark:text-zinc-200">
                            <MapPin className="w-3 h-3 text-zinc-400" />
                            Каб. {lesson.classroomName}
                          </span>
                        )}
                    {lesson.teacherName && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-zinc-400" />
                        {lesson.teacherName}
                      </span>
                    )}
                    {lesson.group && (
                      <span className="text-zinc-400">{lesson.group}</span>
                    )}
                  </div>

                  {lesson.comment && (
                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 italic">
                      {lesson.comment}
                    </p>
                  )}
                </div>
              </React.Fragment>
            );
          })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
