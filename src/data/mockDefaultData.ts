import { Classroom, Friend, Lesson, NotificationSettings, ScheduleOverride, Teacher, WeekSettings } from '../types';

export const DEFAULT_TEACHERS: Teacher[] = [];

export const DEFAULT_CLASSROOMS: Classroom[] = [];

export const DEFAULT_MY_LESSONS: Lesson[] = [];

export const DEFAULT_FRIENDS: Friend[] = [];

export const DEFAULT_WEEK_SETTINGS: WeekSettings = {
  cycleType: 'two_weeks',
  totalWeeks: 2,
  referenceDate: '2026-08-31', // Monday 31 Aug 2026 starts Week 1
  names: {
    1: '1-я неделя (Числитель)',
    2: '2-я неделя (Знаменатель)',
  },
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  morningPush: true,
  morningEmail: false,
  morningTime: '07:00',
  reminder15Min: true,
  reminder30Min: false,
  scheduleChangeAlert: true,
  freeWindowAlert: true,
  emptyScheduleWarning: true,
  emailAddress: 'halilovramazan394@gmail.com',
  includeFriendsSummary: true,
  telegramEnabled: true,
  telegramMorningEnabled: true,
  telegramMorningTime: '07:00',
  telegramEveningEnabled: true,
  telegramEveningTime: '17:00',
};

export const DEFAULT_OVERRIDES: ScheduleOverride[] = [];

