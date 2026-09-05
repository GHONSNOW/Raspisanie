import { Lesson, WeekSettings, ScheduleOverride, Friend, FreeWindow, LessonType } from '../types';

export const LESSON_TYPES_INFO: Record<LessonType, { label: string; short: string; badgeClass: string; dotClass: string }> = {
  lecture: {
    label: 'Лекция',
    short: 'Лекц',
    badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/40',
    dotClass: 'bg-blue-500',
  },
  practice: {
    label: 'Практика',
    short: 'Практ',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40',
    dotClass: 'bg-emerald-500',
  },
  lab: {
    label: 'Лабораторная',
    short: 'Лаб',
    badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/40',
    dotClass: 'bg-amber-500',
  },
  seminar: {
    label: 'Семинар',
    short: 'Семин',
    badgeClass: 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/40',
    dotClass: 'bg-purple-500',
  },
  other: {
    label: 'Другое',
    short: 'Консульт',
    badgeClass: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
    dotClass: 'bg-zinc-400',
  },
};

export const DAYS_OF_WEEK = [
  { id: 1, short: 'ПН', full: 'Понедельник' },
  { id: 2, short: 'ВТ', full: 'Вторник' },
  { id: 3, short: 'СР', full: 'Среда' },
  { id: 4, short: 'ЧТ', full: 'Четверг' },
  { id: 5, short: 'ПТ', full: 'Пятница' },
  { id: 6, short: 'СБ', full: 'Суббота' },
  { id: 7, short: 'ВС', full: 'Воскресенье' },
];

export const PAIR_DURATION_MINUTES = 95;

export const LUNCH_BREAK = {
  start: '11:50',
  end: '12:20',
  durationMinutes: 30,
  label: 'Обеденный перерыв (11:50 – 12:20)',
};

export const STANDARD_PAIRS = [
  { num: 1, start: '08:30', end: '10:05', label: '1 пара (08:30 – 10:05)' },
  { num: 2, start: '10:15', end: '11:50', label: '2 пара (10:15 – 11:50)' },
  { num: 3, start: '12:20', end: '13:55', label: '3 пара (12:20 – 13:55)' },
  { num: 4, start: '14:05', end: '15:40', label: '4 пара (14:05 – 15:40)' },
  { num: 5, start: '15:50', end: '17:25', label: '5 пара (15:50 – 17:25)' },
  { num: 6, start: '17:35', end: '19:10', label: '6 пара (17:35 – 19:10)' },
  { num: 7, start: '19:20', end: '20:55', label: '7 пара (19:20 – 20:55)' },
];

/**
 * Maps old 90-minute bell schedule times to the new 95-minute standard
 */
export const OLD_TO_NEW_PAIR_TIMES: Record<string, { start: string; end: string }> = {
  '08:30-10:00': { start: '08:30', end: '10:05' },
  '10:15-11:45': { start: '10:15', end: '11:50' },
  '12:20-13:50': { start: '12:20', end: '13:55' },
  '14:05-15:35': { start: '14:05', end: '15:40' },
  '15:50-17:20': { start: '15:50', end: '17:25' },
  '17:35-19:05': { start: '17:35', end: '19:10' },
};

/**
 * Calculates end time for a given start time (+95 minutes by default)
 */
export function calculateEndTime(startTime: string, durationMinutes = PAIR_DURATION_MINUTES): string {
  if (!startTime || !startTime.includes(':')) return '';
  const [h, m] = startTime.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '';
  const total = h * 60 + m + durationMinutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

/**
 * Determines which standard pair number corresponds to the given start time
 */
export function getPairNumber(startTime: string): number | null {
  const match = STANDARD_PAIRS.find((p) => p.start === startTime);
  return match ? match.num : null;
}

/**
 * Normalizes lesson times to 95 minutes if it matched the previous 90-min preset
 */
export function normalizeLessonTimes<T extends { startTime: string; endTime: string }>(lesson: T): T {
  const key = `${lesson.startTime}-${lesson.endTime}`;
  const mapped = OLD_TO_NEW_PAIR_TIMES[key];
  if (mapped) {
    return {
      ...lesson,
      startTime: mapped.start,
      endTime: mapped.end,
    };
  }
  return lesson;
}

/**
 * Normalizes date to midnight UTC/local representation YYYY-MM-DD
 */
export function formatDateYYYYMMDD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Gets Monday of the week for given date
 */
export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Computes which week in cycle (1 to totalWeeks) a given date belongs to
 */
export function getWeekNumberForDate(date: Date, settings: WeekSettings): number {
  if (settings.totalWeeks <= 1) return 1;

  const targetMonday = getMondayOfWeek(date);
  const refMonday = getMondayOfWeek(new Date(settings.referenceDate || '2026-08-31'));

  const diffTime = targetMonday.getTime() - refMonday.getTime();
  const diffWeeks = Math.round(diffTime / (7 * 24 * 60 * 60 * 1000));

  const total = settings.totalWeeks;
  const mod = ((diffWeeks % total) + total) % total;
  return mod + 1;
}

/**
 * Returns human label for current week (e.g. "1-я неделя", "2-я неделя (Знаменатель)")
 */
export function getWeekLabel(weekNum: number, settings: WeekSettings): string {
  if (settings.names && settings.names[weekNum]) {
    return settings.names[weekNum];
  }
  if (settings.cycleType === 'two_weeks') {
    return weekNum === 1 ? '1-я неделя (Числитель)' : '2-я неделя (Знаменатель)';
  }
  return `${weekNum}-я неделя`;
}

/**
 * Computes lessons for a specific date, accounting for week cycle and date-specific overrides
 */
export function getEffectiveLessonsForDate(
  date: Date,
  lessons: Lesson[] = [],
  overrides: ScheduleOverride[] = [],
  settings: WeekSettings,
  targetScheduleId = 'my'
): (Lesson & { isOverridden?: boolean; overrideAction?: string; originalLessonId?: string })[] {
  if (!date) return [];
  const safeLessons = Array.isArray(lessons) ? lessons : [];
  const safeOverrides = Array.isArray(overrides) ? overrides : [];
  const safeSettings = settings || { totalWeeks: 2, cycleType: 'two_weeks' as const, referenceDate: '2026-08-31' };

  const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();
  const weekNum = getWeekNumberForDate(date, safeSettings);
  const dateStr = formatDateYYYYMMDD(date);

  // 1. Filter recurring lessons for this day and week cycle
  let baseLessons = safeLessons.filter((l) => {
    if (!l) return false;
    if (l.dayOfWeek !== dayOfWeek) return false;
    if (l.weekType === 'all') return true;
    return Number(l.weekType) === weekNum;
  });

  // 2. Apply overrides for this date
  const relevantOverrides = safeOverrides.filter(
    (o) => o && o.date === dateStr && (!o.targetScheduleId || o.targetScheduleId === targetScheduleId)
  );

  const result: (Lesson & { isOverridden?: boolean; overrideAction?: string; originalLessonId?: string })[] = [];

  for (const l of baseLessons) {
    const override = relevantOverrides.find((o) => o.originalLessonId === l.id);
    if (!override) {
      result.push({ ...l });
    } else if (override.action === 'cancelled') {
      // Lesson cancelled for this date - skip or mark
      continue;
    } else if (override.action === 'replaced' || override.action === 'moved') {
      result.push({
        ...l,
        ...override.replacementLesson,
        id: l.id,
        isOverridden: true,
        overrideAction: override.action,
        originalLessonId: l.id,
      });
    }
  }

  // 3. Add any standalone added lessons for this date
  const addedOverrides = relevantOverrides.filter((o) => o.action === 'added' && o.replacementLesson);
  for (const add of addedOverrides) {
    const repl = add.replacementLesson!;
    result.push({
      id: add.id,
      subject: repl.subject || 'Новая пара',
      startTime: repl.startTime || '09:00',
      endTime: repl.endTime || '10:30',
      dayOfWeek,
      weekType: 'all',
      teacherName: repl.teacherName,
      classroomName: repl.classroomName,
      type: repl.type || 'lecture',
      group: repl.group,
      comment: repl.comment || add.notes,
      isOverridden: true,
      overrideAction: 'added',
    });
  }

  // Sort chronologically by start time
  return result.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

/**
 * Format Russian date header: "Четверг, 3 сентября"
 */
export function formatRussianDate(date: Date, includeWeekday = true): string {
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
  ];
  const weekdays = [
    'Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота',
  ];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const weekday = weekdays[date.getDay()];

  if (!includeWeekday) return `${day} ${month}`;
  return `${weekday}, ${day} ${month}`;
}

/**
 * Time string to minutes from midnight
 */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Minutes from midnight to "HH:MM"
 */
export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Finds free windows between student and selected friends
 */
export function findFreeWindows(
  myLessons: Lesson[],
  friendsWithLessons: { friend: Friend; lessons: Lesson[] }[],
  dayStart = '08:30',
  dayEnd = '19:30'
): FreeWindow[] {
  const startLimit = timeToMinutes(dayStart);
  const endLimit = timeToMinutes(dayEnd);
  const STEP = 5; // 5-minute resolution for precise 95-minute pairs and 11:50-12:20 lunch

  // Group all busy blocks by participant
  type BusyBlock = { start: number; end: number; name: string };
  const allBusy: BusyBlock[] = [];

  (Array.isArray(myLessons) ? myLessons : []).forEach((l) => {
    if (l && l.startTime && l.endTime) {
      allBusy.push({
        start: timeToMinutes(l.startTime),
        end: timeToMinutes(l.endTime),
        name: 'Я',
      });
    }
  });

  (Array.isArray(friendsWithLessons) ? friendsWithLessons : []).forEach(({ friend, lessons }) => {
    if (!friend) return;
    const name = friend.nickname || friend.firstName || 'Друг';
    (Array.isArray(lessons) ? lessons : []).forEach((l) => {
      if (l && l.startTime && l.endTime) {
        allBusy.push({
          start: timeToMinutes(l.startTime),
          end: timeToMinutes(l.endTime),
          name,
        });
      }
    });
  });

  // Calculate discrete time slots in 5-minute intervals
  const participants = ['Я', ...friendsWithLessons.map((f) => f.friend.nickname || f.friend.firstName)];
  const totalSlots = Math.floor((endLimit - startLimit) / STEP);
  const slotFreeNames: string[][] = [];

  for (let i = 0; i < totalSlots; i++) {
    const slotStart = startLimit + i * STEP;
    const slotEnd = slotStart + STEP;

    const freeForThisSlot = participants.filter((person) => {
      const busy = allBusy.some((b) => b.name === person && !(slotEnd <= b.start || slotStart >= b.end));
      return !busy;
    });

    slotFreeNames.push(freeForThisSlot);
  }

  // Merge consecutive slots where ALL are free
  const windows: FreeWindow[] = [];
  let currentStart = -1;
  let currentParticipants: string[] = [];

  const lunchStartMins = timeToMinutes(LUNCH_BREAK.start); // 11:50 -> 710
  const lunchEndMins = timeToMinutes(LUNCH_BREAK.end);     // 12:20 -> 740

  const pushWindow = (startMins: number, endMins: number) => {
    const duration = endMins - startMins;
    if (duration >= 25) {
      const isLunch = startMins <= lunchStartMins && endMins >= lunchEndMins;
      windows.push({
        startTime: minutesToTime(startMins),
        endTime: minutesToTime(endMins),
        durationMinutes: duration,
        availableParticipants: currentParticipants,
        allFree: true,
        isLunchBreak: isLunch,
      });
    }
  };

  for (let i = 0; i < totalSlots; i++) {
    const free = slotFreeNames[i];
    const isAllFree = free.length === participants.length;

    if (isAllFree) {
      if (currentStart === -1) {
        currentStart = startLimit + i * STEP;
        currentParticipants = [...free];
      }
    } else {
      if (currentStart !== -1) {
        const currentEnd = startLimit + i * STEP;
        pushWindow(currentStart, currentEnd);
        currentStart = -1;
      }
    }
  }

  if (currentStart !== -1) {
    const currentEnd = endLimit;
    pushWindow(currentStart, currentEnd);
  }

  return windows;
}

/**
 * Generates morning notification text as requested
 */
export function formatMorningNotification(
  date: Date,
  lessons: Lesson[],
  friendsSummary?: { name: string; count: number }[]
): { title: string; body: string; fullText: string } {
  const dateStr = formatRussianDate(date, true).toLowerCase();
  const title = `Доброе утро 👋`;

  if (lessons.length === 0) {
    let body = `Сегодня ${dateStr}.\nПар нет 🎉 Можно отдыхать.`;
    if (friendsSummary && friendsSummary.length > 0) {
      const friendNotes = friendsSummary.map((f) => `У ${f.name} — ${f.count} ${getLessonPlural(f.count)}`).join('. ');
      body += `\n\nДрузья: ${friendNotes}.`;
    }
    return { title, body, fullText: `${title}\n${body}` };
  }

  const lessonCountText = `У тебя сегодня ${lessons.length} ${getLessonPlural(lessons.length)}:`;
  const lessonsLines = lessons.map((l) => {
    let line = `• ${l.startTime} — ${l.subject}`;
    if (l.classroomName) line += ` (${l.classroomName} каб.)`;
    if (l.teacherName) line += ` • ${l.teacherName}`;
    return line;
  });

  let body = `Сегодня ${dateStr}.\n${lessonCountText}\n\n${lessonsLines.join('\n')}`;

  if (friendsSummary && friendsSummary.length > 0) {
    const friendsLines = friendsSummary.map((f) => `У ${f.name} — ${f.count} ${getLessonPlural(f.count)}`).join('. ');
    body += `\n\nДрузья: ${friendsLines}.`;
  }

  return { title, body, fullText: `${title}\n${body}` };
}

export function getLessonPlural(n: number): string {
  const abs = Math.abs(n) % 100;
  const num = abs % 10;
  if (abs > 10 && abs < 20) return 'пар';
  if (num > 1 && num < 5) return 'пары';
  if (num === 1) return 'пара';
  return 'пар';
}
