import React, { useState, useEffect } from 'react';
import { useSchedule } from '../../context/ScheduleContext';
import { Lesson, LessonType } from '../../types';
import {
  DAYS_OF_WEEK,
  LESSON_TYPES_INFO,
  STANDARD_PAIRS,
  calculateEndTime,
  PAIR_DURATION_MINUTES,
  LUNCH_BREAK,
} from '../../lib/scheduleEngine';
import { X, Clock, MapPin, User, Tag, Plus, Check, Trash2, Utensils } from 'lucide-react';

interface AddLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDayOfWeek?: number;
  targetFriendId?: string;
  initialLesson?: Lesson;
}

export const AddLessonModal: React.FC<AddLessonModalProps> = ({
  isOpen,
  onClose,
  initialDayOfWeek = 1,
  targetFriendId,
  initialLesson,
}) => {
  const {
    teachers,
    classrooms,
    addLesson,
    updateLesson,
    deleteLesson,
    friends,
    myLessons,
    addTeacher,
    addClassroom,
    showToast,
    showConfirm,
  } = useSchedule();

  const [selectedTarget, setSelectedTarget] = useState<string>(targetFriendId || 'my');
  const [subject, setSubject] = useState(initialLesson?.subject || '');
  const [dayOfWeek, setDayOfWeek] = useState<number>(initialLesson?.dayOfWeek || initialDayOfWeek);
  const [startTime, setStartTime] = useState(initialLesson?.startTime || '09:00');
  const [endTime, setEndTime] = useState(initialLesson?.endTime || '10:30');
  const [weekType, setWeekType] = useState<string>(
    initialLesson ? String(initialLesson.weekType) : 'all'
  );
  const [type, setType] = useState<LessonType>(initialLesson?.type || 'lecture');
  const [teacherId, setTeacherId] = useState(initialLesson?.teacherId || '');
  const [teacherName, setTeacherName] = useState(initialLesson?.teacherName || '');
  const [classroomId, setClassroomId] = useState(initialLesson?.classroomId || '');
  const [classroomName, setClassroomName] = useState(initialLesson?.classroomName || '');
  const [group, setGroup] = useState(initialLesson?.group || '');
  const [comment, setComment] = useState(initialLesson?.comment || '');

  const [teacherInputMode, setTeacherInputMode] = useState<'select' | 'manual'>(() => {
    if (initialLesson?.teacherId) return 'select';
    if (initialLesson?.teacherName) return 'manual';
    return teachers.length > 0 ? 'select' : 'manual';
  });

  const [classroomInputMode, setClassroomInputMode] = useState<'select' | 'manual'>(() => {
    if (initialLesson?.classroomId) return 'select';
    if (initialLesson?.classroomName) return 'manual';
    return classrooms.length > 0 ? 'select' : 'manual';
  });

  // Quick subject autocomplete suggestions from existing lessons
  const existingSubjects = Array.from(new Set(myLessons.map((l) => l.subject))).slice(0, 5);

  useEffect(() => {
    if (isOpen) {
      setSelectedTarget(targetFriendId || 'my');
      setSubject(initialLesson?.subject || '');
      setDayOfWeek(initialLesson?.dayOfWeek || initialDayOfWeek);
      setStartTime(initialLesson?.startTime || '09:00');
      setEndTime(initialLesson?.endTime || '10:30');
      setWeekType(initialLesson ? String(initialLesson.weekType) : 'all');
      setType(initialLesson?.type || 'lecture');
      setTeacherId(initialLesson?.teacherId || '');
      setTeacherName(initialLesson?.teacherName || '');
      setClassroomId(initialLesson?.classroomId || '');
      setClassroomName(initialLesson?.classroomName || '');
      setGroup(initialLesson?.group || '');
      setComment(initialLesson?.comment || '');
      setTeacherInputMode(
        initialLesson?.teacherId ? 'select' : initialLesson?.teacherName ? 'manual' : (teachers.length > 0 ? 'select' : 'manual')
      );
      setClassroomInputMode(
        initialLesson?.classroomId ? 'select' : initialLesson?.classroomName ? 'manual' : (classrooms.length > 0 ? 'select' : 'manual')
      );
    }
  }, [isOpen, initialLesson, initialDayOfWeek, targetFriendId, teachers.length, classrooms.length]);

  if (!isOpen) return null;

  const handlePairPreset = (pair: { start: string; end: string }) => {
    setStartTime(pair.start);
    setEndTime(pair.end);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return;

    // Resolve teacher name and id
    let finalTeacherName = teacherName.trim();
    let finalTeacherId = teacherId;
    if (teacherInputMode === 'manual') {
      finalTeacherId = '';
    } else if (teacherId) {
      const found = teachers.find((t) => t.id === teacherId);
      if (found) finalTeacherName = `${found.lastName} ${found.firstName[0]}.${found.middleName ? found.middleName[0] + '.' : ''}`;
    }

    // Resolve classroom name and id
    let finalClassroomName = classroomName.trim();
    let finalClassroomId = classroomId;
    if (classroomInputMode === 'manual') {
      finalClassroomId = '';
    } else if (classroomId) {
      const found = classrooms.find((c) => c.id === classroomId);
      if (found) finalClassroomName = found.number;
    }

    const payload: Omit<Lesson, 'id'> = {
      subject: subject.trim(),
      dayOfWeek: Number(dayOfWeek),
      startTime,
      endTime,
      weekType: weekType === 'all' ? 'all' : (Number(weekType) as any),
      type,
      teacherId: finalTeacherId || undefined,
      teacherName: finalTeacherName || undefined,
      classroomId: finalClassroomId || undefined,
      classroomName: finalClassroomName || undefined,
      group: group.trim() || undefined,
      comment: comment.trim() || undefined,
    };

    if (initialLesson) {
      updateLesson(initialLesson.id, payload, selectedTarget);
      showToast('Пара обновлена', 'success');
    } else {
      addLesson(payload, selectedTarget);
      showToast('Пара добавлена в расписание', 'success');
    }

    onClose();
  };

  const handleDelete = () => {
    if (!initialLesson) return;
    showConfirm({
      title: 'Удалить пару?',
      message: `Вы действительно хотите удалить пару «${initialLesson.subject}»? Это действие нельзя отменить.`,
      confirmText: 'Удалить пару',
      isDestructive: true,
      onConfirm: () => {
        deleteLesson(initialLesson.id, selectedTarget);
        showToast(`Пара «${initialLesson.subject}» удалена`, 'info');
        onClose();
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {initialLesson ? 'Редактировать пару' : '+ Добавить пару'}
            </h3>
            <p className="text-xs text-zinc-500">
              Заполните параметры занятия в расписании
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target: My schedule vs Friend's schedule */}
          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
              Кому добавить пару:
            </label>
            <select
              value={selectedTarget}
              onChange={(e) => setSelectedTarget(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
            >
              <option value="my">Моё расписание</option>
              {friends.map((f) => (
                <option key={f.id} value={f.id}>
                  Друг: {f.nickname || f.firstName} ({f.group})
                </option>
              ))}
            </select>
          </div>

          {/* Subject with Quick suggestions */}
          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
              Предмет *
            </label>
            <input
              type="text"
              required
              placeholder="Программирование, Высшая математика..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
            />
            {existingSubjects.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {existingSubjects.map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setSubject(s)}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Day of Week & Week Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                День недели
              </label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Неделя
              </label>
              <select
                value={weekType}
                onChange={(e) => setWeekType(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
              >
                <option value="all">Каждая неделя</option>
                <option value="1">1-я неделя (Числитель)</option>
                <option value="2">2-я неделя (Знаменатель)</option>
                <option value="3">3-я неделя</option>
                <option value="4">4-я неделя</option>
              </select>
            </div>
          </div>

          {/* Time: Start - End with Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <span>Время пары (95 мин)</span>
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    if (startTime) {
                      setEndTime(calculateEndTime(startTime, PAIR_DURATION_MINUTES));
                    }
                  }}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors cursor-pointer"
                  title="Установить длительность ровно 95 минут"
                >
                  +95 мин
                </button>
              </div>
            </div>

            {/* Presets by bell schedule */}
            <div className="flex flex-wrap items-center gap-1 mb-2 p-1.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 text-[10px]">
              {STANDARD_PAIRS.slice(0, 2).map((p) => (
                <button
                  type="button"
                  key={p.num}
                  onClick={() => handlePairPreset(p)}
                  className={`px-2 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    startTime === p.start && endTime === p.end
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200/60 dark:border-zinc-700/60'
                  }`}
                  title={p.label}
                >
                  {p.num} пара ({p.start})
                </button>
              ))}

              <div
                className="px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60 flex items-center gap-1 font-semibold"
                title="Обеденный перерыв между 2 и 3 парами (11:50 – 12:20)"
              >
                <Utensils className="w-2.5 h-2.5" />
                <span>Обед 11:50–12:20</span>
              </div>

              {STANDARD_PAIRS.slice(2).map((p) => (
                <button
                  type="button"
                  key={p.num}
                  onClick={() => handlePairPreset(p)}
                  className={`px-2 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    startTime === p.start && endTime === p.end
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200/60 dark:border-zinc-700/60'
                  }`}
                  title={p.label}
                >
                  {p.num} пара ({p.start})
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">
                  Начало пары
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => {
                    const val = e.target.value;
                    setStartTime(val);
                    if (val) {
                      setEndTime(calculateEndTime(val, PAIR_DURATION_MINUTES));
                    }
                  }}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">
                  Окончание (авто +95 мин)
                </label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>
            <p className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">
              Стандартная пара длится <strong>95 минут</strong>. Обеденный перерыв — с <strong>11:50 до 12:20</strong>.
            </p>
          </div>

          {/* Lesson Type */}
          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
              Тип занятия
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {(Object.keys(LESSON_TYPES_INFO) as LessonType[]).map((lt) => {
                const info = LESSON_TYPES_INFO[lt];
                const isSelected = type === lt;
                return (
                  <button
                    type="button"
                    key={lt}
                    onClick={() => setType(lt)}
                    className={`py-1.5 px-2 text-xs rounded-lg border font-medium transition-all ${
                      isSelected
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-xs'
                        : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {info.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Teacher & Classroom (from directory or free input) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Преподаватель
                </label>
                {teachers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setTeacherInputMode(teacherInputMode === 'select' ? 'manual' : 'select')}
                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    {teacherInputMode === 'select' ? 'Ввести вручную' : 'Выбрать из списка'}
                  </button>
                )}
              </div>
              {teacherInputMode === 'select' && teachers.length > 0 ? (
                <select
                  value={teacherId}
                  onChange={(e) => {
                    setTeacherId(e.target.value);
                    if (!e.target.value) setTeacherName('');
                  }}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
                >
                  <option value="">(Выбрать преподавателя)</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.lastName} {t.firstName[0]}.{t.middleName ? t.middleName[0] + '.' : ''} {t.subject ? `(${t.subject})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Иванов И.И."
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
                />
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Кабинет / Аудитория
                </label>
                {classrooms.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setClassroomInputMode(classroomInputMode === 'select' ? 'manual' : 'select')}
                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    {classroomInputMode === 'select' ? 'Ввести вручную' : 'Выбрать из списка'}
                  </button>
                )}
              </div>
              {classroomInputMode === 'select' && classrooms.length > 0 ? (
                <select
                  value={classroomId}
                  onChange={(e) => {
                    setClassroomId(e.target.value);
                    if (!e.target.value) setClassroomName('');
                  }}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
                >
                  <option value="">(Выбрать аудиторию)</option>
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      Ауд. {c.number} {c.building ? `(${c.building})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="304 или Ауд. 101"
                  value={classroomName}
                  onChange={(e) => setClassroomName(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
                />
              )}
            </div>
          </div>

          {/* Group & Comment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Группа / Подгруппа
              </label>
              <input
                type="text"
                placeholder="ИВТ-21"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Комментарий / Заметка
              </label>
              <input
                type="text"
                placeholder="Взять ноутбук, сдать лабу №2..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            {initialLesson ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Удалить пару</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition-all shadow-xs cursor-pointer"
              >
                {initialLesson ? 'Сохранить изменения' : 'Добавить пару'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
