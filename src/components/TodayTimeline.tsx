import React, { useState } from 'react';
import { useSchedule } from '../context/ScheduleContext';
import {
  getEffectiveLessonsForDate,
  formatRussianDate,
  formatDateYYYYMMDD,
  getLessonPlural,
  LESSON_TYPES_INFO,
  timeToMinutes,
  findFreeWindows,
  getPairNumber,
  LUNCH_BREAK,
} from '../lib/scheduleEngine';
import { Lesson, Friend } from '../types';
import {
  Clock,
  MapPin,
  User,
  AlertCircle,
  Users,
  Sparkles,
  ChevronRight,
  Plus,
  Coffee,
  CheckCircle2,
  CalendarClock,
  ArrowRight,
  Trash2,
  Copy,
  Utensils,
} from 'lucide-react';

interface TodayTimelineProps {
  onSelectLesson: (lesson: Lesson, isFriend?: boolean, friendName?: string, friendId?: string) => void;
  onOpenAddLessonModal: (initialFriendId?: string) => void;
  onOpenOverrideModal: (lesson: Lesson) => void;
  onOpenSharedWindowsModal: () => void;
}

export const TodayTimeline: React.FC<TodayTimelineProps> = ({
  onSelectLesson,
  onOpenAddLessonModal,
  onOpenOverrideModal,
  onOpenSharedWindowsModal,
}) => {
  const {
    myLessons,
    friends,
    overrides,
    weekSettings,
    selectedDate,
    setActiveMainTab,
    deleteLesson,
    showToast,
    showConfirm,
    copyFriendScheduleToMySchedule,
    copySingleLessonToMySchedule,
  } = useSchedule();

  const [activeTab, setActiveTab] = useState<'my' | 'friends'>('my');

  // Compute effective lessons for selected date
  const effectiveMyLessons = getEffectiveLessonsForDate(
    selectedDate,
    myLessons,
    overrides,
    weekSettings,
    'my'
  );

  // Compute each friend's effective lessons for selected date
  const friendsToday = friends.map((friend) => ({
    friend,
    lessons: getEffectiveLessonsForDate(
      selectedDate,
      friend.lessons,
      overrides,
      weekSettings,
      friend.id
    ),
  }));

  // Calculate shared free windows between user and friends for today
  const freeWindows = findFreeWindows(effectiveMyLessons, friendsToday);
  const bestSharedWindow = freeWindows.length > 0 ? freeWindows[0] : null;

  // Helpers to calculate pair state (active, next, completed)
  const isSelectedRealToday = formatDateYYYYMMDD(selectedDate) === formatDateYYYYMMDD(new Date());
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const isSelectedTomorrow = formatDateYYYYMMDD(selectedDate) === formatDateYYYYMMDD(tomorrowDate);
  const topLabel = isSelectedRealToday ? 'Сегодня' : isSelectedTomorrow ? 'Завтра' : 'Выбранный день';

  const [currentMinutes, setCurrentMinutes] = useState<number>(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  React.useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentMinutes(now.getHours() * 60 + now.getMinutes());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6 pb-24">
      {/* Top Banner & Header */}
      <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 rounded-2xl p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-400">
              {topLabel}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mt-0.5">
              {formatRussianDate(selectedDate, true)}
            </h2>
          </div>

          {/* Quick Tab Switcher: Моё расписание | Друзья */}
          <div className="inline-flex p-1 rounded-xl bg-zinc-200/70 dark:bg-zinc-700/70 text-xs font-medium">
            <button
              onClick={() => setActiveTab('my')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'my'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              Моё расписание
            </button>
            <button
              onClick={() => setActiveTab('friends')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'friends'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Друзья
              {friendsToday.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold">
                  {friendsToday.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Big Status Summary Card */}
        <div className="mt-4 pt-4 border-t border-zinc-200/60 dark:border-zinc-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            {activeTab === 'my' ? (
              effectiveMyLessons.length > 0 ? (
                <p className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <span>У тебя сегодня</span>
                  <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-base font-bold">
                    {effectiveMyLessons.length} {getLessonPlural(effectiveMyLessons.length)}
                  </span>
                </p>
              ) : (
                <p className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <span>Пар сегодня нет 🎉</span>
                  <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">Можно отдыхать</span>
                </p>
              )
            ) : (
              <p className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>Расписание друзей</span>
                <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">
                  {friendsToday.reduce((acc, f) => acc + f.lessons.length, 0)} пар всего
                </span>
              </p>
            )}
          </div>

          {/* Quick Shared Free Window Action */}
          {bestSharedWindow && (
            <button
              onClick={onOpenSharedWindowsModal}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-xs font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors self-start sm:self-auto cursor-pointer"
            >
              <Coffee className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>
                Свободны вместе: <strong>{bestSharedWindow.startTime}–{bestSharedWindow.endTime}</strong>
              </span>
              <ChevronRight className="w-3 h-3 ml-0.5 opacity-60" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'my' ? (
        /* --- MY SCHEDULE VERTICAL TIMELINE --- */
        <div className="space-y-4">
          {effectiveMyLessons.length === 0 ? (
            <div className="text-center py-16 px-4 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/30">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500">
                <Coffee className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">Сегодня свободный день</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mt-1 mb-4">
                На этот день не запланировано ни одной пары. Можно заняться проектами или отдохнуть.
              </p>
              <button
                onClick={() => onOpenAddLessonModal('my')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:opacity-90 transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Добавить пару на этот день
              </button>
            </div>
          ) : (
            <div className="relative pl-6 sm:pl-8 space-y-5 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
              {/* Bell Schedule Header Notice */}
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 py-1 px-2.5 bg-zinc-100/70 dark:bg-zinc-800/40 rounded-lg flex items-center justify-between flex-wrap gap-1.5 border border-zinc-200/50 dark:border-zinc-700/50">
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-3 h-3 text-blue-500" />
                  Пары по <strong>95 минут</strong>
                </span>
                <span className="flex items-center gap-1 text-amber-700 dark:text-amber-300 font-medium">
                  <Utensils className="w-3 h-3" />
                  Обед: <strong>11:50 — 12:20</strong>
                </span>
              </div>

              {effectiveMyLessons.map((lesson, idx) => {
                const typeInfo = LESSON_TYPES_INFO[lesson.type] || LESSON_TYPES_INFO.other;
                const startMins = timeToMinutes(lesson.startTime);
                const endMins = timeToMinutes(lesson.endTime);
                const durationMins = Math.max(0, endMins - startMins);
                const pairNum = getPairNumber(lesson.startTime);

                const isCurrent = isSelectedRealToday && currentMinutes >= startMins && currentMinutes <= endMins;
                const isPast = isSelectedRealToday
                  ? currentMinutes > endMins
                  : formatDateYYYYMMDD(selectedDate) < formatDateYYYYMMDD(new Date());

                // Calculate break before this lesson
                const prevLesson = idx > 0 ? effectiveMyLessons[idx - 1] : null;
                const prevEndMins = prevLesson ? timeToMinutes(prevLesson.endTime) : 0;
                const breakMins = prevLesson ? startMins - prevEndMins : 0;
                const isLunchBreakBetween =
                  prevLesson &&
                  prevEndMins <= timeToMinutes('11:55') &&
                  startMins >= timeToMinutes('12:15');

                return (
                  <React.Fragment key={lesson.id}>
                    {/* Render break indicator if there is gap between classes */}
                    {prevLesson && breakMins > 0 && (
                      <div className="relative my-2">
                        {isLunchBreakBetween ? (
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

                    <div className="relative group">
                      {/* Timeline Node Point */}
                      <div
                        className={`absolute -left-6 sm:-left-8 top-4 w-5 h-5 rounded-full border-2 bg-white dark:bg-zinc-900 flex items-center justify-center transition-all ${
                          isCurrent
                            ? 'border-blue-500 ring-4 ring-blue-500/20'
                            : isPast
                            ? 'border-zinc-400 dark:border-zinc-600'
                            : 'border-zinc-300 dark:border-zinc-700'
                        }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full ${
                            isCurrent
                              ? 'bg-blue-600 animate-pulse'
                              : isPast
                              ? 'bg-zinc-400'
                              : 'bg-zinc-300 dark:bg-zinc-600'
                          }`}
                        />
                      </div>

                      {/* Timeline Card */}
                      <div
                        onClick={() => onSelectLesson(lesson)}
                        className="bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-xl p-4 sm:p-5 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer"
                      >
                        {/* Top info line */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            {pairNum && (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                                {pairNum} пара
                              </span>
                            )}
                            <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-zinc-400" />
                              {lesson.startTime} — {lesson.endTime}
                            </span>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                              ({durationMins} мин)
                            </span>
                            <span
                              className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${typeInfo.badgeClass}`}
                            >
                              {typeInfo.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {lesson.isOverridden && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Изменена сегодня
                              </span>
                            )}

                            {isCurrent && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white flex items-center gap-1 animate-pulse">
                                Идёт сейчас
                              </span>
                            )}
                          </div>
                        </div>

                      {/* Subject Name */}
                      <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {lesson.subject}
                      </h3>

                      {/* Details row: Room & Teacher & Group */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                        {lesson.classroomName && (
                          <div className="flex items-center gap-1 font-medium text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                            <MapPin className="w-3 h-3 text-zinc-500" />
                            <span>Кабинет {lesson.classroomName}</span>
                          </div>
                        )}

                        {lesson.teacherName && (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-zinc-400" />
                            <span>{lesson.teacherName}</span>
                          </div>
                        )}

                        {lesson.group && (
                          <span className="text-zinc-400 dark:text-zinc-500">Группа: {lesson.group}</span>
                        )}
                      </div>

                      {/* Comment preview */}
                      {lesson.comment && (
                        <div className="mt-3 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-300 italic">
                          «{lesson.comment}»
                        </div>
                      )}

                      {/* Quick action bar */}
                      <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
                        <span className="text-zinc-400 dark:text-zinc-500">Нажмите для подробностей</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              showConfirm({
                                title: 'Удалить пару?',
                                message: `Удалить пару «${lesson.subject}» из вашего расписания?`,
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
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenOverrideModal(lesson);
                            }}
                            className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 px-2 py-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                          >
                            Изменить на сегодня
                          </button>
                          <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
            </div>
          )}
        </div>
      ) : (
        /* --- FRIENDS TODAY SCHEDULE SECTION --- */
        <div className="space-y-6">
          {friendsToday.length === 0 ? (
            <div className="text-center py-16 px-4 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/30">
              <Users className="w-10 h-10 mx-auto mb-3 text-zinc-400" />
              <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
                Добавьте друзей, чтобы видеть их расписание
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mt-1 mb-4">
                Вы сможете сравнивать расписания на день и находить общие свободные окна между парами.
              </p>
              <button
                onClick={() => setActiveMainTab('friends')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:opacity-90 transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Добавить первого друга
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {friendsToday.map(({ friend, lessons }) => {
                const displayName = friend.nickname || `${friend.firstName} ${friend.lastName}`;
                return (
                  <div
                    key={friend.id}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs"
                  >
                    {/* Friend Header */}
                    <div className="flex items-center justify-between mb-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex items-center justify-center font-semibold text-sm text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                          {friend.avatarUrl ? (
                            <img src={friend.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                          ) : (
                            friend.firstName[0]
                          )}
                        </div>
                        <div>
                          <h4 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                            {displayName}
                          </h4>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">Группа {friend.group}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {friend.lessons.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              showConfirm({
                                title: 'Скопировать расписание друга себе?',
                                message: `Скопировать всё расписание ${displayName}? Все ${friend.lessons.length} пар, кабинеты, преподаватели и настройки недели станут вашим личным расписанием.`,
                                confirmText: 'Скопировать себе',
                                onConfirm: async () => {
                                  const res = await copyFriendScheduleToMySchedule(friend.id);
                                  if (res.success) {
                                    showToast(
                                      `Расписание ${res.friendName} (${res.lessonCount} пар) теперь ваше!`,
                                      'success'
                                    );
                                  } else {
                                    showToast(res.error || 'Не удалось скопировать расписание', 'error');
                                  }
                                },
                              });
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold transition-colors cursor-pointer"
                            title="Сделать расписание друга своим расписанием"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Сделать моим</span>
                          </button>
                        )}

                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          {lessons.length} {getLessonPlural(lessons.length)}
                        </span>
                      </div>
                    </div>

                    {/* Friend Lessons */}
                    {lessons.length === 0 ? (
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 italic py-2">
                        У друга сегодня пар нет 🎉
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {lessons.map((l) => (
                          <div
                            key={l.id}
                            onClick={() => onSelectLesson(l, true, displayName, friend.id)}
                            className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer flex flex-col justify-between"
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                                {l.startTime} — {l.endTime}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {l.classroomName && (
                                  <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                                    {l.classroomName} каб.
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copySingleLessonToMySchedule(l, displayName);
                                  }}
                                  className="p-1 rounded text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                                  title="Скопировать эту пару себе в расписание"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    showConfirm({
                                      title: 'Удалить пару у друга?',
                                      message: `Удалить пару «${l.subject}» из расписания ${displayName}?`,
                                      confirmText: 'Удалить',
                                      isDestructive: true,
                                      onConfirm: () => {
                                        deleteLesson(l.id, friend.id);
                                        showToast(`Пара «${l.subject}» удалена у друга`, 'info');
                                      },
                                    });
                                  }}
                                  className="p-1 rounded text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                                  title="Удалить пару у друга"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <h5 className="text-xs sm:text-sm font-medium text-zinc-900 dark:text-zinc-100 line-clamp-1">
                              {l.subject}
                            </h5>
                            {l.teacherName && (
                              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 truncate">
                                {l.teacherName}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
