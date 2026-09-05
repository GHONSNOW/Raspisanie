import React from 'react';
import { useSchedule } from '../../context/ScheduleContext';
import { Lesson } from '../../types';
import { LESSON_TYPES_INFO, DAYS_OF_WEEK, formatDateYYYYMMDD } from '../../lib/scheduleEngine';
import {
  X,
  Clock,
  MapPin,
  User,
  BookOpen,
  Calendar,
  AlertCircle,
  Trash2,
  Edit2,
  CalendarClock,
  Layers,
  CalendarPlus,
  Send,
  RotateCcw,
  Copy,
} from 'lucide-react';
import { openLessonInGoogleCalendar, shareScheduleToTelegram } from '../../lib/googleServices';

interface LessonDetailsModalProps {
  lesson: (Lesson & { isOverridden?: boolean; overrideAction?: string }) | null;
  onClose: () => void;
  isFriend?: boolean;
  friendName?: string;
  friendId?: string;
  onEditLesson: (lesson: Lesson) => void;
  onOpenOverride: (lesson: Lesson) => void;
}

export const LessonDetailsModal: React.FC<LessonDetailsModalProps> = ({
  lesson,
  onClose,
  isFriend,
  friendName,
  friendId,
  onEditLesson,
  onOpenOverride,
}) => {
  const {
    teachers,
    classrooms,
    deleteLesson,
    weekSettings,
    selectedDate,
    overrides,
    removeOverride,
    showToast,
    showConfirm,
    copySingleLessonToMySchedule,
    copyFriendScheduleToMySchedule,
  } = useSchedule();

  if (!lesson) return null;

  const typeInfo = LESSON_TYPES_INFO[lesson.type] || LESSON_TYPES_INFO.other;
  const dayName = DAYS_OF_WEEK.find((d) => d.id === lesson.dayOfWeek)?.full;

  // Lookup teacher and classroom from directory
  const teacherDetails = teachers.find(
    (t) =>
      t.id === lesson.teacherId ||
      lesson.teacherName?.includes(t.lastName) ||
      (t.lastName && lesson.teacherName?.includes(t.lastName))
  );

  const classroomDetails = classrooms.find(
    (c) => c.id === lesson.classroomId || c.number === lesson.classroomName
  );

  const dateStr = formatDateYYYYMMDD(selectedDate);
  const matchingOverride = overrides.find(
    (o) =>
      (o.originalLessonId === lesson.id || o.id === lesson.id) &&
      o.date === dateStr
  );

  const handleDelete = () => {
    showConfirm({
      title: 'Удалить пару?',
      message: isFriend
        ? `Удалить пару «${lesson.subject}» из расписания друга?`
        : `Удалить пару «${lesson.subject}» из вашего расписания?`,
      confirmText: 'Удалить пару',
      isDestructive: true,
      onConfirm: () => {
        deleteLesson(lesson.id, isFriend ? friendId : undefined);
        showToast(`Пара «${lesson.subject}» удалена`, 'info');
        onClose();
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${typeInfo.badgeClass}`}>
                {typeInfo.label}
              </span>
              {isFriend && friendName && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-medium">
                  Пара друга: {friendName}
                </span>
              )}
              {lesson.isOverridden && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Разовое изменение
                </span>
              )}
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {lesson.subject}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Core Attributes */}
        <div className="space-y-3 text-xs sm:text-sm">
          {/* Time & Day */}
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200 font-semibold">
              <Clock className="w-4 h-4 text-zinc-500" />
              <span>
                {lesson.startTime} — {lesson.endTime}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
              <Calendar className="w-3.5 h-3.5" />
              <span>{dayName}</span>
              <span>•</span>
              <span>
                {lesson.weekType === 'all'
                  ? 'Каждая неделя'
                  : `${lesson.weekType}-я неделя`}
              </span>
            </div>
          </div>

          {/* Classroom / Location */}
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500">Аудитория</span>
              <div className="flex items-center gap-1 font-bold text-zinc-900 dark:text-zinc-100">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                <span>Кабинет {lesson.classroomName || 'Не указан'}</span>
              </div>
            </div>
            {classroomDetails && (
              <p className="text-xs text-zinc-600 dark:text-zinc-400 pt-1 border-t border-zinc-200/50 dark:border-zinc-700/50">
                {classroomDetails.building} {classroomDetails.floor ? `• ${classroomDetails.floor}` : ''}
                {classroomDetails.notes ? ` (${classroomDetails.notes})` : ''}
              </p>
            )}
          </div>

          {/* Teacher */}
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500">Преподаватель</span>
              <div className="flex items-center gap-1 font-semibold text-zinc-900 dark:text-zinc-100">
                <User className="w-3.5 h-3.5 text-zinc-400" />
                <span>{lesson.teacherName || 'Не указан'}</span>
              </div>
            </div>
            {teacherDetails && (
              <div className="text-xs text-zinc-600 dark:text-zinc-400 pt-1 border-t border-zinc-200/50 dark:border-zinc-700/50 space-y-0.5">
                <p className="font-medium text-zinc-800 dark:text-zinc-200">
                  {teacherDetails.lastName} {teacherDetails.firstName} {teacherDetails.middleName || ''}
                </p>
                {teacherDetails.email && <p>Email: {teacherDetails.email}</p>}
                {teacherDetails.notes && <p className="italic">«{teacherDetails.notes}»</p>}
              </div>
            )}
          </div>

          {/* Group */}
          {lesson.group && (
            <div className="flex items-center justify-between px-3 py-2 text-xs">
              <span className="text-zinc-500">Группа:</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">{lesson.group}</span>
            </div>
          )}

          {/* Comment */}
          {lesson.comment && (
            <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200">
              <span className="font-bold block mb-0.5">Комментарий:</span>
              {lesson.comment}
            </div>
          )}
        </div>

        {/* External integrations: Google Calendar & Telegram */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <button
            onClick={() => openLessonInGoogleCalendar(lesson, selectedDate)}
            className="py-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            title="Открыть форму создания события в Google Календаре с заполненными данными"
          >
            <CalendarPlus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>В Google Календарь</span>
          </button>

          <button
            onClick={() => {
              const text = `Пара: ${lesson.subject} (${lesson.type})\nВремя: ${lesson.startTime} — ${lesson.endTime}\nАудитория: ${lesson.classroomName || 'Не указана'}\nПреподаватель: ${lesson.teacherName || '—'}`;
              shareScheduleToTelegram(text);
            }}
            className="py-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            title="Отправить информацию о паре в Telegram"
          >
            <Send className="w-3.5 h-3.5 text-sky-500" />
            <span>В Telegram</span>
          </button>
        </div>

        {/* Action buttons (Schedule Override, Edit, Delete) */}
        {!isFriend ? (
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
            {matchingOverride ? (
              <button
                onClick={() => {
                  removeOverride(matchingOverride.id);
                  showToast('Разовое изменение отменено — пара возвращена в расписание', 'success');
                  onClose();
                }}
                className="w-full py-2 px-3 text-xs font-semibold rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors flex items-center justify-center gap-2 cursor-pointer border border-amber-200 dark:border-amber-850"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Вернуть обычную пару (сбросить изменение)</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  onClose();
                  onOpenOverride(lesson);
                }}
                className="w-full py-2 px-3 text-xs font-semibold rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <CalendarClock className="w-3.5 h-3.5 text-amber-600" />
                <span>Изменить только на сегодня (перенос / отмена / замена)</span>
              </button>
            )}

            <div className="flex items-center justify-between gap-2">
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Удалить пару
              </button>

              <button
                onClick={() => {
                  onClose();
                  onEditLesson(lesson);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 shadow-xs cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Редактировать
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            {/* Action to copy this specific lesson to user schedule */}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  copySingleLessonToMySchedule(lesson, friendName);
                  onClose();
                }}
                className="flex-1 py-2 px-3 text-xs font-semibold rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Скопировать эту пару себе</span>
              </button>

              {friendId && (
                <button
                  type="button"
                  onClick={() => {
                    showConfirm({
                      title: 'Скопировать всё расписание друга себе?',
                      message: `Скопировать всё расписание ${friendName || 'друга'}? Все пары, кабинеты, преподаватели и настройки недели станут вашим личным расписанием.`,
                      confirmText: 'Скопировать всё себе',
                      onConfirm: async () => {
                        const res = await copyFriendScheduleToMySchedule(friendId);
                        onClose();
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
                  className="py-2 px-3 text-xs font-semibold rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Всё расписание друга себе</span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Удалить пару у друга
              </button>

              <button
                onClick={() => {
                  onClose();
                  onEditLesson(lesson);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 shadow-xs cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Редактировать
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
