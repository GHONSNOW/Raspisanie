export type LessonType = 'lecture' | 'practice' | 'lab' | 'seminar' | 'other';

export interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  subject?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export interface Classroom {
  id: string;
  number: string;
  building?: string;
  floor?: string;
  notes?: string;
}

export interface Lesson {
  id: string;
  subject: string;
  startTime: string; // "09:00"
  endTime: string;   // "10:30"
  dayOfWeek: number; // 1 (Пн) to 7 (Вс)
  weekType: 'all' | '1' | '2' | '3' | '4' | number; // 'all' or week number in cycle
  teacherId?: string;
  teacherName?: string;
  classroomId?: string;
  classroomName?: string;
  type: LessonType;
  group?: string;
  comment?: string;
  colorTag?: string;
}

export interface Friend {
  id: string;
  firstName: string;
  lastName: string;
  nickname?: string;
  group: string;
  avatarUrl?: string;
  color?: string;
  shareCode?: string;
  lastSyncedAt?: string;
  lessons: Lesson[];
  teachers?: Teacher[];
  classrooms?: Classroom[];
  weekSettings?: WeekSettings;
}

export type ScheduleCycleType = 'single' | 'two_weeks' | 'four_weeks' | 'custom';
export type WeekCycleType = ScheduleCycleType;

export interface WeekSettings {
  cycleType: ScheduleCycleType;
  totalWeeks: number; // 1, 2, 4
  referenceDate: string; // ISO string of Monday that started Week 1
  names?: Record<number, string>; // e.g. {1: '1-я неделя (Числитель)', 2: '2-я неделя (Знаменатель)'}
  semesterStartDate?: string;
}

export interface ScheduleOverride {
  id: string;
  date: string; // "YYYY-MM-DD"
  targetScheduleId?: string; // 'my' or friendId
  originalLessonId?: string; // ID of the recurring lesson
  action: 'cancelled' | 'moved' | 'replaced' | 'added';
  replacementLesson?: Partial<Lesson>;
  notes?: string;
}

export interface NotificationSettings {
  morningPush: boolean;
  morningEmail: boolean;
  morningTime: string; // "07:00"
  reminder15Min: boolean;
  reminder30Min: boolean;
  scheduleChangeAlert: boolean;
  freeWindowAlert: boolean;
  emptyScheduleWarning: boolean;
  emailAddress: string;
  includeFriendsSummary: boolean;
  telegramEnabled?: boolean;
  telegramChatId?: string;
  telegramBotToken?: string;
  telegramMorningEnabled?: boolean;
  telegramMorningTime?: string; // "07:00" - morning digest on the day of classes
  telegramEveningEnabled?: boolean;
  telegramEveningTime?: string; // "17:00" - evening reminder the day before classes
  soundEnabled?: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  university?: string;
  group?: string;
  photoURL?: string;
  shareCode?: string;
}

export interface FreeWindow {
  startTime: string;
  endTime: string;
  durationMinutes: number;
  availableParticipants: string[]; // Names of people free during this slot
  allFree: boolean;
  isLunchBreak?: boolean;
}
