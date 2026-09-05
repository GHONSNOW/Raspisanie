import React, { useState } from 'react';
import { useSchedule } from '../../context/ScheduleContext';
import {
  findFreeWindows,
  getEffectiveLessonsForDate,
  formatRussianDate,
} from '../../lib/scheduleEngine';
import { X, Coffee, Clock, Users, Sparkles, CheckCircle2, Utensils } from 'lucide-react';

interface SharedWindowsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SharedWindowsModal: React.FC<SharedWindowsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    myLessons,
    friends,
    overrides,
    weekSettings,
    selectedDate,
  } = useSchedule();

  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>(
    friends.map((f) => f.id)
  );

  if (!isOpen) return null;

  const effectiveMyLessons = getEffectiveLessonsForDate(
    selectedDate,
    myLessons,
    overrides,
    weekSettings,
    'my'
  );

  const selectedFriendsData = friends
    .filter((f) => selectedFriendIds.includes(f.id))
    .map((f) => ({
      friend: f,
      lessons: getEffectiveLessonsForDate(
        selectedDate,
        f.lessons,
        overrides,
        weekSettings,
        f.id
      ),
    }));

  const freeWindows = findFreeWindows(effectiveMyLessons, selectedFriendsData);

  const toggleFriend = (id: string) => {
    setSelectedFriendIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Coffee className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Свободные окна с друзьями
              </h3>
              <p className="text-xs text-zinc-500">
                {formatRussianDate(selectedDate, true)}
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

        {/* Filter by friends */}
        {friends.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              Учитывать друзей:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {friends.map((f) => {
                const isChecked = selectedFriendIds.includes(f.id);
                return (
                  <button
                    key={f.id}
                    onClick={() => toggleFriend(f.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                      isChecked
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200'
                    }`}
                  >
                    <span>{f.nickname || f.firstName}</span>
                    {isChecked && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Windows List */}
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {freeWindows.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
              Общих свободных окон от 30 минут в этот день не найдено.
            </div>
          ) : (
            freeWindows.map((win, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  win.isLunchBreak
                    ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60'
                    : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      win.isLunchBreak
                        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                        : 'bg-emerald-500/10 text-emerald-600'
                    }`}
                  >
                    {win.isLunchBreak ? <Utensils className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {win.startTime} — {win.endTime}
                    </span>
                    <p className="text-xs text-zinc-500">
                      {win.isLunchBreak ? (
                        <span className="text-amber-700 dark:text-amber-400 font-medium">
                          Обеденный перерыв • {win.durationMinutes} мин
                        </span>
                      ) : (
                        <>
                          Длительность:{' '}
                          <strong>
                            {Math.floor(win.durationMinutes / 60)} ч{' '}
                            {win.durationMinutes % 60 ? `${win.durationMinutes % 60} мин` : ''}
                          </strong>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    win.isLunchBreak
                      ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200'
                      : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                  }`}
                >
                  {win.isLunchBreak ? '🍽️ На обед вместе' : 'Свободны вместе'}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-xs font-semibold rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
};
