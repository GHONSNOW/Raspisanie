import React, { useState } from 'react';
import { useSchedule } from '../context/ScheduleContext';
import { Friend, Lesson } from '../types';
import {
  DAYS_OF_WEEK,
  LESSON_TYPES_INFO,
  findFreeWindows,
  formatRussianDate,
} from '../lib/scheduleEngine';
import {
  Users,
  Plus,
  Coffee,
  Calendar,
  Clock,
  MapPin,
  Trash2,
  Edit2,
  Check,
  ChevronDown,
  ChevronUp,
  Eraser,
  RefreshCw,
  Copy,
} from 'lucide-react';

interface FriendsViewProps {
  onOpenAddFriendModal: () => void;
  onOpenAddLessonForFriend: (friendId: string) => void;
  onSelectLesson: (lesson: Lesson, isFriend?: boolean, friendName?: string, friendId?: string) => void;
}

export const FriendsView: React.FC<FriendsViewProps> = ({
  onOpenAddFriendModal,
  onOpenAddLessonForFriend,
  onSelectLesson,
}) => {
  const {
    friends,
    deleteFriend,
    clearFriendSchedule,
    deleteLesson,
    myLessons,
    selectedDate,
    showToast,
    showConfirm,
    refreshFriendSchedule,
    copyFriendScheduleToMySchedule,
    copySingleLessonToMySchedule,
  } = useSchedule();
  const [selectedFriendId, setSelectedFriendId] = useState<string>(friends[0]?.id || '');
  const [activeDayFilter, setActiveDayFilter] = useState<number>(selectedDate.getDay() === 0 ? 7 : selectedDate.getDay());
  const [showFreeWindowsMode, setShowFreeWindowsMode] = useState<boolean>(true);
  const [isSyncingFriend, setIsSyncingFriend] = useState<boolean>(false);
  const [isCopyingSchedule, setIsCopyingSchedule] = useState<boolean>(false);

  const selectedFriend = friends.find((f) => f.id === selectedFriendId) || friends[0];

  // Calculate shared free windows for the selected day
  const friendsForAnalysis = friends.map((f) => ({
    friend: f,
    lessons: f.lessons.filter((l) => l.dayOfWeek === activeDayFilter),
  }));

  const myLessonsForDay = myLessons.filter((l) => l.dayOfWeek === activeDayFilter);
  const sharedWindows = findFreeWindows(myLessonsForDay, friendsForAnalysis);

  const activeDayName = DAYS_OF_WEEK.find((d) => d.id === activeDayFilter)?.full || 'Четверг';

  return (
    <div className="space-y-6 pb-24">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            Расписание друзей
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Следите за парами друзей и находите общие свободные окна
          </p>
        </div>

        <button
          onClick={onOpenAddFriendModal}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:opacity-90 transition-all shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Добавить друга
        </button>
      </div>

      {friends.length === 0 ? (
        <div className="text-center py-16 px-4 bg-zinc-50 dark:bg-zinc-900/40 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl">
          <Users className="w-10 h-10 mx-auto mb-3 text-zinc-400" />
          <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
            Нет друзей в списке
          </h3>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto mt-1 mb-4">
            Добавьте друзей, чтобы заполнить их расписание и автоматически находить время, когда вы свободны вместе.
          </p>
          <button
            onClick={onOpenAddFriendModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Добавить друга
          </button>
        </div>
      ) : (
        <>
          {/* «Общее окно» (Shared Free Windows Analyzer) */}
          <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 rounded-2xl p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
                  <Coffee className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-emerald-950 dark:text-emerald-200">
                    Режим «Общее окно» — {activeDayName}
                  </h3>
                  <p className="text-xs text-emerald-800/80 dark:text-emerald-400">
                    Промежутки времени, когда вы и все друзья свободны одновременно
                  </p>
                </div>
              </div>

              {/* Day filter selector */}
              <div className="flex items-center gap-1 overflow-x-auto py-1">
                {DAYS_OF_WEEK.slice(0, 6).map((day) => (
                  <button
                    key={day.id}
                    onClick={() => setActiveDayFilter(day.id)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                      activeDayFilter === day.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-100/60 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-300 hover:bg-emerald-200/60'
                    }`}
                  >
                    {day.short}
                  </button>
                ))}
              </div>
            </div>

            {/* Results */}
            {sharedWindows.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                {sharedWindows.map((win, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-emerald-200 dark:border-emerald-800/60 shadow-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                      <div>
                        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          {win.startTime} — {win.endTime}
                        </span>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          Длительность: {Math.floor(win.durationMinutes / 60)} ч{' '}
                          {win.durationMinutes % 60 ? `${win.durationMinutes % 60} мин` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                      Свободны все
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-white/70 dark:bg-zinc-900/70 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 text-xs text-emerald-900/70 dark:text-emerald-300/70">
                В этот день общих свободных окон длительностью от 30 минут не найдено (расписания пересекаются).
              </div>
            )}
          </div>

          {/* Friends List Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {friends.map((f) => {
              const isSelected = f.id === selectedFriend?.id;
              const displayName = f.nickname || `${f.firstName} ${f.lastName}`;
              return (
                <button
                  key={f.id}
                  onClick={() => setSelectedFriendId(f.id)}
                  className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap border cursor-pointer ${
                    isSelected
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-xs'
                      : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-[10px] font-bold">
                    {f.avatarUrl ? (
                      <img src={f.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      f.firstName[0]
                    )}
                  </div>
                  <span>{displayName}</span>
                  <span className="text-[10px] opacity-70">({f.lessons.length})</span>
                </button>
              );
            })}
          </div>

          {/* Selected Friend's Detailed Schedule Card */}
          {selectedFriend && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-base text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                    {selectedFriend.avatarUrl ? (
                      <img src={selectedFriend.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      selectedFriend.firstName[0]
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                      {selectedFriend.firstName} {selectedFriend.lastName}{' '}
                      {selectedFriend.nickname && (
                        <span className="font-normal text-zinc-500">({selectedFriend.nickname})</span>
                      )}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-zinc-500">Группа: {selectedFriend.group}</p>
                      {selectedFriend.shareCode && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {selectedFriend.shareCode}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center flex-wrap gap-2">
                  {selectedFriend.lessons.length > 0 && (
                    <button
                      type="button"
                      disabled={isCopyingSchedule}
                      onClick={() => {
                        showConfirm({
                          title: 'Скопировать расписание друга себе?',
                          message: `Вы хотите полностью скопировать расписание друга ${selectedFriend.firstName}? Все ${selectedFriend.lessons.length} пар, кабинеты, преподаватели и настройки недели станут вашим личным расписанием (текущее ваше расписание будет заменено расписанием друга).`,
                          confirmText: 'Скопировать себе',
                          onConfirm: async () => {
                            setIsCopyingSchedule(true);
                            const res = await copyFriendScheduleToMySchedule(selectedFriend.id);
                            setIsCopyingSchedule(false);
                            if (res.success) {
                              showToast(
                                `Расписание друга ${res.friendName} (${res.lessonCount} пар) теперь ваше! Все кабинеты и преподаватели перенесены.`,
                                'success'
                              );
                            } else {
                              showToast(res.error || 'Не удалось скопировать расписание', 'error');
                            }
                          },
                        });
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      title="Сделать расписание друга своим основным расписанием"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{isCopyingSchedule ? 'Копирование...' : 'Сделать моим'}</span>
                    </button>
                  )}

                  {selectedFriend.shareCode && (
                    <button
                      type="button"
                      disabled={isSyncingFriend}
                      onClick={async () => {
                        setIsSyncingFriend(true);
                        const res = await refreshFriendSchedule(selectedFriend.id);
                        setIsSyncingFriend(false);
                        if (res.success) {
                          showToast(`Расписание друга ${selectedFriend.firstName} обновлено (${res.lessonCount ?? 0} пар)`, 'success');
                        } else {
                          showToast(res.error || 'Не удалось обновить расписание', 'error');
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50 cursor-pointer"
                      title="Синхронизировать расписание друга с облаком"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncingFriend ? 'animate-spin' : ''}`} />
                      <span>{isSyncingFriend ? 'Обновление...' : 'Обновить'}</span>
                    </button>
                  )}

                  <button
                    onClick={() => onOpenAddLessonForFriend(selectedFriend.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Добавить пару другу
                  </button>

                  {selectedFriend.lessons.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        showConfirm({
                          title: 'Очистить пары друга?',
                          message: `Вы действительно хотите удалить все (${selectedFriend.lessons.length}) пар из расписания друга ${selectedFriend.firstName}?`,
                          confirmText: 'Очистить',
                          isDestructive: true,
                          onConfirm: () => {
                            clearFriendSchedule(selectedFriend.id);
                            showToast(`Расписание друга ${selectedFriend.firstName} очищено`, 'info');
                          },
                        });
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                      title="Очистить расписание друга"
                    >
                      <Eraser className="w-3.5 h-3.5" />
                      Очистить пары
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      showConfirm({
                        title: 'Удалить друга?',
                        message: `Удалить ${selectedFriend.firstName} ${selectedFriend.lastName || ''} из списка друзей и стереть его расписание?`,
                        confirmText: 'Удалить друга',
                        isDestructive: true,
                        onConfirm: () => {
                          const name = selectedFriend.firstName;
                          deleteFriend(selectedFriend.id);
                          showToast(`Друг ${name} удален`, 'info');
                          const remaining = friends.filter((f) => f.id !== selectedFriend.id);
                          if (remaining.length > 0) {
                            setSelectedFriendId(remaining[0].id);
                          } else {
                            setSelectedFriendId('');
                          }
                        },
                      });
                    }}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                    title="Удалить друга"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Copy prompt banner */}
              {selectedFriend.lessons.length > 0 && (
                <div className="mb-4 p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
                    <span className="font-bold">Хотите такое же расписание?</span> Вы можете в один клик скопировать все {selectedFriend.lessons.length} пар, кабинеты и преподавателей {selectedFriend.firstName} в своё личное расписание.
                  </div>
                  <button
                    type="button"
                    disabled={isCopyingSchedule}
                    onClick={() => {
                      showConfirm({
                        title: 'Скопировать расписание друга себе?',
                        message: `Вы хотите полностью скопировать расписание друга ${selectedFriend.firstName}? Все ${selectedFriend.lessons.length} пар, кабинеты, преподаватели и настройки недели станут вашим личным расписанием.`,
                        confirmText: 'Скопировать себе',
                        onConfirm: async () => {
                          setIsCopyingSchedule(true);
                          const res = await copyFriendScheduleToMySchedule(selectedFriend.id);
                          setIsCopyingSchedule(false);
                          if (res.success) {
                            showToast(
                              `Расписание друга ${res.friendName} (${res.lessonCount} пар) теперь ваше! Все кабинеты и преподаватели перенесены.`,
                              'success'
                            );
                          } else {
                            showToast(res.error || 'Не удалось скопировать расписание', 'error');
                          }
                        },
                      });
                    }}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Скопировать всё расписание</span>
                  </button>
                </div>
              )}

              {/* Friend's Lessons by day */}
              {selectedFriend.lessons.length === 0 ? (
                <div className="text-center py-8 text-xs text-zinc-500 dark:text-zinc-400">
                  У этого друга пока не заполнено расписание. Нажмите «Добавить пару другу», чтобы внести его занятия.
                </div>
              ) : (
                <div className="space-y-4">
                  {DAYS_OF_WEEK.slice(0, 6).map((day) => {
                    const dayLessons = selectedFriend.lessons
                      .filter((l) => l.dayOfWeek === day.id)
                      .sort((a, b) => a.startTime.localeCompare(b.startTime));

                    if (dayLessons.length === 0) return null;

                    return (
                      <div key={day.id} className="space-y-2">
                        <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                          {day.full} ({dayLessons.length})
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {dayLessons.map((l) => {
                            const typeInfo = LESSON_TYPES_INFO[l.type] || LESSON_TYPES_INFO.other;
                            return (
                              <div
                                key={l.id}
                                onClick={() =>
                                  onSelectLesson(l, true, selectedFriend.nickname || selectedFriend.firstName, selectedFriend.id)
                                }
                                className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/70 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer group"
                              >
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className="font-bold text-zinc-900 dark:text-zinc-100">
                                    {l.startTime} — {l.endTime}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded border ${typeInfo.badgeClass}`}>
                                      {typeInfo.label}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        copySingleLessonToMySchedule(l, selectedFriend.firstName);
                                      }}
                                      className="p-0.5 rounded text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                                      title="Скопировать эту пару в моё расписание"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        showConfirm({
                                          title: 'Удалить пару?',
                                          message: `Удалить пару «${l.subject}» из расписания друга?`,
                                          confirmText: 'Удалить',
                                          isDestructive: true,
                                          onConfirm: () => {
                                            deleteLesson(l.id, selectedFriend.id);
                                            showToast(`Пара «${l.subject}» удалена`, 'info');
                                          },
                                        });
                                      }}
                                      className="p-0.5 rounded text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                                      title="Удалить пару"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                                <h6 className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                                  {l.subject}
                                </h6>
                                <div className="mt-1 flex items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400">
                                  {l.classroomName && <span>Каб. {l.classroomName}</span>}
                                  {l.teacherName && <span className="truncate">{l.teacherName}</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
