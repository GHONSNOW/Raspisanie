import React, { useState } from 'react';
import { useSchedule } from '../../context/ScheduleContext';
import { Lesson, ScheduleOverride } from '../../types';
import {
  formatDateYYYYMMDD,
  formatRussianDate,
  STANDARD_PAIRS,
  calculateEndTime,
  PAIR_DURATION_MINUTES,
} from '../../lib/scheduleEngine';
import { X, CalendarClock, Ban, ArrowRight, User, MapPin, Clock } from 'lucide-react';

interface ScheduleOverrideModalProps {
  lesson: Lesson | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ScheduleOverrideModal: React.FC<ScheduleOverrideModalProps> = ({
  lesson,
  isOpen,
  onClose,
}) => {
  const { selectedDate, addOverride, classrooms, teachers } = useSchedule();

  const [overrideAction, setOverrideAction] = useState<'cancelled' | 'moved' | 'replaced'>('replaced');
  const [newSubject, setNewSubject] = useState(lesson?.subject || '');
  const [newStartTime, setNewStartTime] = useState(lesson?.startTime || '09:00');
  const [newEndTime, setNewEndTime] = useState(lesson?.endTime || '10:30');
  const [newClassroom, setNewClassroom] = useState(lesson?.classroomName || '');
  const [newTeacher, setNewTeacher] = useState(lesson?.teacherName || '');
  const [overrideNotes, setOverrideNotes] = useState('');

  if (!isOpen || !lesson) return null;

  const dateStr = formatDateYYYYMMDD(selectedDate);
  const formattedDate = formatRussianDate(selectedDate, true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (overrideAction === 'cancelled') {
      addOverride({
        date: dateStr,
        originalLessonId: lesson.id,
        action: 'cancelled',
        notes: overrideNotes.trim() || 'Пара отменена на этот день',
      });
    } else {
      addOverride({
        date: dateStr,
        originalLessonId: lesson.id,
        action: overrideAction,
        replacementLesson: {
          subject: newSubject.trim() || lesson.subject,
          startTime: newStartTime,
          endTime: newEndTime,
          classroomName: newClassroom.trim() || lesson.classroomName,
          teacherName: newTeacher.trim() || lesson.teacherName,
        },
        notes: overrideNotes.trim() || 'Разовое изменение расписания',
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-amber-500" />
              Разовое изменение расписания
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Действует только на <strong>{formattedDate}</strong>, основное расписание не изменится
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Lesson Pill */}
        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60 text-xs">
          <span className="text-zinc-400 block mb-0.5">Исходная пара:</span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            {lesson.startTime} — {lesson.subject} (каб. {lesson.classroomName || '—'})
          </span>
        </div>

        {/* Action Type Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-xs font-medium">
          <button
            type="button"
            onClick={() => setOverrideAction('cancelled')}
            className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
              overrideAction === 'cancelled'
                ? 'bg-red-500 text-white font-semibold shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            <Ban className="w-3.5 h-3.5" />
            Отменить
          </button>
          <button
            type="button"
            onClick={() => setOverrideAction('moved')}
            className={`py-1.5 rounded-lg transition-all cursor-pointer ${
              overrideAction === 'moved'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            Перенести
          </button>
          <button
            type="button"
            onClick={() => setOverrideAction('replaced')}
            className={`py-1.5 rounded-lg transition-all cursor-pointer ${
              overrideAction === 'replaced'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            Заменить
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          {overrideAction === 'cancelled' ? (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/40 text-xs text-red-900 dark:text-red-200 space-y-2">
              <p className="font-semibold">Пара будет отменена только на {formattedDate}.</p>
              <p className="text-zinc-600 dark:text-zinc-400">
                В другие дни и на других неделях пара останется на своём месте.
              </p>
            </div>
          ) : (
            <>
              {overrideAction === 'replaced' && (
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Новый предмет / Тема занятия
                  </label>
                  <input
                    type="text"
                    required
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="Физика (вместо математики)..."
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Время пары (95 мин)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (newStartTime) {
                        setNewEndTime(calculateEndTime(newStartTime, PAIR_DURATION_MINUTES));
                      }
                    }}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    +95 мин
                  </button>
                </div>

                <div className="flex flex-wrap gap-1 mb-2">
                  {STANDARD_PAIRS.map((p) => (
                    <button
                      type="button"
                      key={p.num}
                      onClick={() => {
                        setNewStartTime(p.start);
                        setNewEndTime(p.end);
                      }}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      {p.num} пара ({p.start})
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">
                      Новое время начала
                    </label>
                    <input
                      type="time"
                      value={newStartTime}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewStartTime(val);
                        if (val) {
                          setNewEndTime(calculateEndTime(val, PAIR_DURATION_MINUTES));
                        }
                      }}
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">
                      Новое время окончания
                    </label>
                    <input
                      type="time"
                      value={newEndTime}
                      onChange={(e) => setNewEndTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Аудитория на сегодня
                  </label>
                  <input
                    type="text"
                    value={newClassroom}
                    onChange={(e) => setNewClassroom(e.target.value)}
                    placeholder="401"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Преподаватель на сегодня
                  </label>
                  <input
                    type="text"
                    value={newTeacher}
                    onChange={(e) => setNewTeacher(e.target.value)}
                    placeholder="Сидоров А.В."
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
              Причина / Комментарий
            </label>
            <input
              type="text"
              value={overrideNotes}
              onChange={(e) => setOverrideNotes(e.target.value)}
              placeholder="Преподаватель на конференции, замена кабинета..."
              className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 cursor-pointer"
            >
              Применить только на эту дату
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
