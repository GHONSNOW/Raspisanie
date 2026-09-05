import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  Classroom,
  Friend,
  Lesson,
  NotificationSettings,
  ScheduleOverride,
  Teacher,
  WeekSettings,
  UserProfile,
} from '../types';
import {
  DEFAULT_CLASSROOMS,
  DEFAULT_FRIENDS,
  DEFAULT_MY_LESSONS,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_OVERRIDES,
  DEFAULT_TEACHERS,
  DEFAULT_WEEK_SETTINGS,
} from '../data/mockDefaultData';
import { auth, db, sanitizeForFirestore } from '../lib/firebase';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import {
  getMondayOfWeek,
  formatDateYYYYMMDD,
  getEffectiveLessonsForDate,
  normalizeLessonTimes,
  STANDARD_PAIRS,
  PAIR_DURATION_MINUTES,
} from '../lib/scheduleEngine';
import { playNotificationSound } from '../lib/notificationSound';
import {
  testTelegramBotConnection,
  sendScheduleToTelegramChat,
  syncTelegramDailySubscription,
} from '../lib/googleServices';

export interface NotificationLogItem {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

interface ScheduleContextType {
  user: User | null;
  userProfile: UserProfile | null;
  currentProfileId: string;
  myLessons: Lesson[];
  friends: Friend[];
  teachers: Teacher[];
  classrooms: Classroom[];
  weekSettings: WeekSettings;
  overrides: ScheduleOverride[];
  notificationSettings: NotificationSettings;
  notificationLog: NotificationLogItem[];
  selectedDate: Date;
  isDarkMode: boolean;
  activeMainTab: 'today' | 'schedule' | 'friends' | 'directory' | 'settings';
  // State setters
  setSelectedDate: (date: Date) => void;
  setIsDarkMode: (dark: boolean) => void;
  setActiveMainTab: (tab: 'today' | 'schedule' | 'friends' | 'directory' | 'settings') => void;
  updateUserProfile: (data: Partial<UserProfile>) => void;
  addLesson: (lesson: Omit<Lesson, 'id'>, targetFriendId?: string) => void;
  updateLesson: (id: string, lesson: Partial<Lesson>, targetFriendId?: string) => void;
  deleteLesson: (id: string, targetFriendId?: string) => void;
  clearMySchedule: () => void;
  clearDayLessons: (dayOfWeek: number, targetFriendId?: string) => void;
  addFriend: (friend: Omit<Friend, 'id' | 'lessons'>) => void;
  updateFriend: (id: string, friend: Partial<Friend>) => void;
  deleteFriend: (id: string) => void;
  clearFriends: () => void;
  clearFriendSchedule: (friendId: string) => void;
  addTeacher: (teacher: Omit<Teacher, 'id'>) => Teacher;
  updateTeacher: (id: string, teacher: Partial<Teacher>) => void;
  deleteTeacher: (id: string) => void;
  addClassroom: (classroom: Omit<Classroom, 'id'>) => Classroom;
  updateClassroom: (id: string, classroom: Partial<Classroom>) => void;
  deleteClassroom: (id: string) => void;
  clearDirectory: () => void;
  updateWeekSettings: (settings: Partial<WeekSettings>) => void;
  setCurrentWeekAsWeekOne: (date?: Date) => void;
  addOverride: (override: Omit<ScheduleOverride, 'id'>) => void;
  removeOverride: (id: string) => void;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  resetToDemoData: () => void;
  clearAllData: () => void;
  purgeAllLegacyData: () => void;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  switchDemoProfile: (profileId: string, name: string) => void;
  logout: () => Promise<void>;
  syncWithCloud: () => Promise<void>;
  publishScheduleToCloud: (customCode?: string) => Promise<{ success: boolean; shareCode: string; message: string }>;
  importMyScheduleByShareCode: (code: string) => Promise<{ success: boolean; lessonCount: number; author?: string; message: string }>;
  exportScheduleJSON: () => string;
  importScheduleJSON: (jsonStr: string) => { success: boolean; message: string };
  triggerLiveNotification: (title: string, body: string) => void;
  importFriendByShareCode: (code: string) => Promise<{ success: boolean; friendName?: string; lessonCount?: number; error?: string }>;
  refreshFriendSchedule: (friendId: string) => Promise<{ success: boolean; lessonCount?: number; error?: string }>;
  copyFriendScheduleToMySchedule: (friendId: string, options?: { copyGroup?: boolean; copyWeekSettings?: boolean }) => Promise<{ success: boolean; lessonCount: number; friendName: string; error?: string }>;
  copySingleLessonToMySchedule: (lesson: Lesson, friendName?: string) => void;
  alignAllLessonsToStandardTimes: () => Promise<{ updatedCount: number }>;
  testTelegramBot: (chatId: string, botToken?: string) => Promise<{ success: boolean; message: string }>;
  sendTelegramScheduleNow: (chatId: string, targetDate?: Date, botToken?: string, type?: 'morning' | 'evening' | 'custom') => Promise<{ success: boolean; message: string }>;
  toasts: ToastInfo[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  confirmDialog: ConfirmDialogOptions | null;
  showConfirm: (options: ConfirmDialogOptions) => void;
  hideConfirm: () => void;
}

export interface ToastInfo {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

const ScheduleContext = createContext<ScheduleContextType | null>(null);

const STORAGE_KEY_PREFIX = 'study_schedule_';

// Generate a clean, readable, unique student share code (e.g. STU-9X4K2M)
export function generateUniqueShareCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = 'STU-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Detect and eliminate mock data once and for all
function isMockTeacher(t: any): boolean {
  if (!t || typeof t !== 'object') return false;
  const id = String(t.id || '');
  const name = String(t.name || t.fullName || t.lastName || '');
  return id === 't-1' || id === 't-2' || id === 't-3' || id === 't-4' ||
         name.includes('Иванов') || name.includes('Петров') || name.includes('Сидоров') || name.includes('Смирнова');
}

function isMockClassroom(c: any): boolean {
  if (!c || typeof c !== 'object') return false;
  const id = String(c.id || '');
  const num = String(c.number || c.name || '');
  return id === 'c-304' || id === 'c-212' || id === 'c-401' || id === 'c-205' ||
         num === '304' || num === '212' || num === '401' || num === '205';
}

function isMockFriend(f: any): boolean {
  if (!f || typeof f !== 'object') return false;
  const id = String(f.id || '');
  const name = String(f.firstName || f.name || f.nickname || '');
  return id === 'fr-ahmed' || id === 'fr-magomed' || id === 'fr-anna' || id === 'fr-maxim' || id === 'fr-ivan' ||
         name === 'Ахмед' || name === 'Магомед' || name === 'Анна' || name === 'Максим' || name === 'Иван';
}

function isMockLesson(l: any): boolean {
  if (!l || typeof l !== 'object') return false;
  const id = String(l.id || '');
  return id.startsWith('l-mon-') || id.startsWith('l-tue-') || id.startsWith('l-wed-') || id.startsWith('l-thu-') || id.startsWith('l-fri-') || id.startsWith('demo-');
}

// Global one-time cleanup of stale localStorage keys
try {
  const legacyKeys = [
    'study_schedule_user_ivan_my_lessons',
    'study_schedule_user_anna_my_lessons',
    'study_schedule_user_maxim_my_lessons',
    'study_schedule_user_ivan_friends',
    'study_schedule_user_anna_friends',
    'study_schedule_user_maxim_friends',
    'study_schedule_user_ivan_user_profile',
    'study_schedule_user_anna_user_profile',
    'study_schedule_user_maxim_user_profile',
  ];
  legacyKeys.forEach((k) => localStorage.removeItem(k));
} catch {}

function getDeletedLessonIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + 'deleted_lesson_ids');
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {}
  return new Set();
}

function markLessonDeleted(id: string) {
  try {
    const set = getDeletedLessonIds();
    set.add(id);
    localStorage.setItem(STORAGE_KEY_PREFIX + 'deleted_lesson_ids', JSON.stringify(Array.from(set).slice(-500)));
  } catch {}
}

function unmarkLessonDeleted(id: string) {
  try {
    const set = getDeletedLessonIds();
    if (set.has(id)) {
      set.delete(id);
      localStorage.setItem(STORAGE_KEY_PREFIX + 'deleted_lesson_ids', JSON.stringify(Array.from(set)));
    }
  } catch {}
}

function getDeletedFriendIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + 'deleted_friend_ids');
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {}
  return new Set();
}

function markFriendDeleted(id: string, shareCode?: string) {
  try {
    const set = getDeletedFriendIds();
    if (id) set.add(id);
    if (shareCode) set.add(shareCode);
    localStorage.setItem(STORAGE_KEY_PREFIX + 'deleted_friend_ids', JSON.stringify(Array.from(set).slice(-500)));
  } catch {}
}

function unmarkFriendDeleted(id: string, shareCode?: string) {
  try {
    const set = getDeletedFriendIds();
    let changed = false;
    if (id && set.has(id)) {
      set.delete(id);
      changed = true;
    }
    if (shareCode && set.has(shareCode)) {
      set.delete(shareCode);
      changed = true;
    }
    if (changed) {
      localStorage.setItem(STORAGE_KEY_PREFIX + 'deleted_friend_ids', JSON.stringify(Array.from(set)));
    }
  } catch {}
}

function cleanFriendFromLocalStorage(id: string, shareCode?: string) {
  try {
    const targetKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_KEY_PREFIX) && k.includes('friends')) {
        targetKeys.push(k);
      }
    }
    for (const key of targetKeys) {
      try {
        if (id === '*') {
          localStorage.setItem(key, JSON.stringify([]));
          continue;
        }
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const filtered = parsed.filter(
              (f: any) => f && f.id !== id && (!shareCode || f.shareCode !== shareCode)
            );
            localStorage.setItem(key, JSON.stringify(filtered));
          }
        }
      } catch {}
    }
  } catch {}
}

// Synchronous and resilient LocalStorage Helpers
function loadSavedLessons(uid?: string): Lesson[] {
  const candidateKeys: string[] = [];
  if (uid) {
    candidateKeys.push(`${STORAGE_KEY_PREFIX}${uid}_my_lessons`);
  }
  candidateKeys.push(
    STORAGE_KEY_PREFIX + 'my_lessons',
    STORAGE_KEY_PREFIX + 'student_main_my_lessons'
  );

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_KEY_PREFIX) && k.endsWith('_my_lessons') && !candidateKeys.includes(k)) {
        candidateKeys.push(k);
      }
    }
  } catch {}

  const deletedIds = getDeletedLessonIds();

  for (const k of candidateKeys) {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed
            .filter((l) => !isMockLesson(l) && !deletedIds.has(l?.id))
            .map((l) => normalizeLessonTimes(l));
          if (valid.length > 0) return valid;
        }
      }
    } catch {}
  }
  return [];
}

export function persistLessonsLocally(lessons: Lesson[], uid?: string) {
  try {
    const json = JSON.stringify(lessons);
    localStorage.setItem(STORAGE_KEY_PREFIX + 'my_lessons', json);
    localStorage.setItem(STORAGE_KEY_PREFIX + 'student_main_my_lessons', json);
    if (uid) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${uid}_my_lessons`, json);
    }
  } catch (e) {
    console.error('persistLessonsLocally error:', e);
  }
}

function loadSavedFriends(uid?: string): Friend[] {
  const deletedIds = getDeletedFriendIds();
  const candidateKeys: string[] = [];
  if (uid) {
    candidateKeys.push(`${STORAGE_KEY_PREFIX}${uid}_friends`);
  }
  candidateKeys.push(
    STORAGE_KEY_PREFIX + 'friends',
    STORAGE_KEY_PREFIX + 'student_main_friends'
  );
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_KEY_PREFIX) && k.endsWith('_friends') && !candidateKeys.includes(k)) {
        candidateKeys.push(k);
      }
    }
  } catch {}

  for (const k of candidateKeys) {
    try {
      const raw = localStorage.getItem(k);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const valid = parsed
            .filter(
              (f) =>
                !isMockFriend(f) &&
                !deletedIds.has(f?.id) &&
                (!f?.shareCode || !deletedIds.has(f.shareCode))
            )
            .map((f) => ({
              ...f,
              lessons: Array.isArray(f.lessons) ? f.lessons.map((l: Lesson) => normalizeLessonTimes(l)) : [],
            }));
          // Found authoritative stored array (even if empty)
          return valid;
        }
      }
    } catch {}
  }
  return [];
}

export function persistFriendsLocally(friendsList: Friend[], uid?: string) {
  try {
    const json = JSON.stringify(friendsList);
    localStorage.setItem(STORAGE_KEY_PREFIX + 'friends', json);
    localStorage.setItem(STORAGE_KEY_PREFIX + 'student_main_friends', json);
    if (uid) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${uid}_friends`, json);
    }
  } catch (e) {}
}

function loadSavedTeachers(): Teacher[] {
  const candidateKeys = [
    STORAGE_KEY_PREFIX + 'teachers',
    STORAGE_KEY_PREFIX + 'student_main_teachers',
  ];
  for (const k of candidateKeys) {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter((t) => !isMockTeacher(t));
          if (valid.length > 0) return valid;
        }
      }
    } catch {}
  }
  return [];
}

export function persistTeachersLocally(teachersList: Teacher[], uid?: string) {
  try {
    const json = JSON.stringify(teachersList);
    localStorage.setItem(STORAGE_KEY_PREFIX + 'teachers', json);
    localStorage.setItem(STORAGE_KEY_PREFIX + 'student_main_teachers', json);
    if (uid) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${uid}_teachers`, json);
    }
  } catch (e) {}
}

function loadSavedClassrooms(): Classroom[] {
  const candidateKeys = [
    STORAGE_KEY_PREFIX + 'classrooms',
    STORAGE_KEY_PREFIX + 'student_main_classrooms',
  ];
  for (const k of candidateKeys) {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter((c) => !isMockClassroom(c));
          if (valid.length > 0) return valid;
        }
      }
    } catch {}
  }
  return [];
}

export function persistClassroomsLocally(classroomsList: Classroom[], uid?: string) {
  try {
    const json = JSON.stringify(classroomsList);
    localStorage.setItem(STORAGE_KEY_PREFIX + 'classrooms', json);
    localStorage.setItem(STORAGE_KEY_PREFIX + 'student_main_classrooms', json);
    if (uid) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${uid}_classrooms`, json);
    }
  } catch (e) {}
}

function loadSavedWeekSettings(): WeekSettings {
  const candidateKeys = [
    STORAGE_KEY_PREFIX + 'week_settings',
    STORAGE_KEY_PREFIX + 'student_main_week_settings',
  ];
  for (const k of candidateKeys) {
    try {
      const raw = localStorage.getItem(k);
      if (raw) return JSON.parse(raw);
    } catch {}
  }
  return DEFAULT_WEEK_SETTINGS;
}

export function persistWeekSettingsLocally(ws: WeekSettings, uid?: string) {
  try {
    const json = JSON.stringify(ws);
    localStorage.setItem(STORAGE_KEY_PREFIX + 'week_settings', json);
    localStorage.setItem(STORAGE_KEY_PREFIX + 'student_main_week_settings', json);
    if (uid) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${uid}_week_settings`, json);
    }
  } catch (e) {}
}

function loadSavedOverrides(): ScheduleOverride[] {
  const candidateKeys = [
    STORAGE_KEY_PREFIX + 'overrides',
    STORAGE_KEY_PREFIX + 'student_main_overrides',
  ];
  for (const k of candidateKeys) {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
  }
  return [];
}

export function persistOverridesLocally(ov: ScheduleOverride[], uid?: string) {
  try {
    const json = JSON.stringify(ov);
    localStorage.setItem(STORAGE_KEY_PREFIX + 'overrides', json);
    localStorage.setItem(STORAGE_KEY_PREFIX + 'student_main_overrides', json);
    if (uid) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${uid}_overrides`, json);
    }
  } catch (e) {}
}

function loadSavedUserProfile(): UserProfile {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'user_profile');
    if (saved) {
      const p = JSON.parse(saved);
      if (p && p.uid && !p.uid.startsWith('user_')) {
        if (!p.shareCode || p.shareCode === 'STU-STUDENT') {
          p.shareCode = generateUniqueShareCode();
          localStorage.setItem(STORAGE_KEY_PREFIX + 'user_profile', JSON.stringify(p));
        }
        return p;
      }
    }
  } catch {}

  const defaultProfile: UserProfile = {
    uid: 'student_main',
    displayName: 'Студент',
    email: 'halilovramazan394@gmail.com',
    group: '',
    shareCode: generateUniqueShareCode(),
  };
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'user_profile', JSON.stringify(defaultProfile));
  } catch {}
  return defaultProfile;
}

export function persistUserProfileLocally(profile: UserProfile) {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'user_profile', JSON.stringify(profile));
  } catch {}
}

export const ScheduleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentProfileId, setCurrentProfileId] = useState<string>(() => {
    const active = localStorage.getItem(STORAGE_KEY_PREFIX + 'active_profile_id');
    if (active === 'user_ivan' || active === 'user_anna' || active === 'user_maxim') {
      localStorage.setItem(STORAGE_KEY_PREFIX + 'active_profile_id', 'student_main');
      return 'student_main';
    }
    return active || 'student_main';
  });

  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'user_profile');
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (p.uid !== 'user_ivan' && p.uid !== 'user_anna' && p.uid !== 'user_maxim') {
          return p;
        }
      } catch (e) {
        // ignore
      }
    }
    return {
      uid: 'student_main',
      displayName: 'Студент',
      email: 'halilovramazan394@gmail.com',
      group: '',
      shareCode: 'STU-STUDENT',
    };
  });

  // Dynamic storage key for current user profile
  const getKey = useCallback((suffix: string) => {
    const uid = user ? user.uid : currentProfileId;
    return `${STORAGE_KEY_PREFIX}${uid}_${suffix}`;
  }, [user, currentProfileId]);

  // Core state - completely free of fake users and fake schedules
  const [myLessons, setMyLessons] = useState<Lesson[]>(() => loadSavedLessons());

  const [friends, setFriends] = useState<Friend[]>(() => loadSavedFriends());

  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'teachers') || localStorage.getItem(STORAGE_KEY_PREFIX + 'student_main_teachers');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((t) => !isMockTeacher(t));
        }
      } catch {}
    }
    return [];
  });

  const [classrooms, setClassrooms] = useState<Classroom[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'classrooms') || localStorage.getItem(STORAGE_KEY_PREFIX + 'student_main_classrooms');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((c) => !isMockClassroom(c));
        }
      } catch {}
    }
    return [];
  });

  const [weekSettings, setWeekSettings] = useState<WeekSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'week_settings') || localStorage.getItem(STORAGE_KEY_PREFIX + 'student_main_week_settings');
    return saved ? JSON.parse(saved) : DEFAULT_WEEK_SETTINGS;
  });

  const [overrides, setOverrides] = useState<ScheduleOverride[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'overrides') || localStorage.getItem(STORAGE_KEY_PREFIX + 'student_main_overrides');
    return saved ? JSON.parse(saved) : [];
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'notifications') || localStorage.getItem(STORAGE_KEY_PREFIX + 'student_main_notifications');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.telegramMorningTime || parsed.telegramMorningTime === '08:00') {
          parsed.telegramMorningTime = '07:00';
        }
        if (!parsed.morningTime || parsed.morningTime === '08:00') {
          parsed.morningTime = '07:00';
        }
        return parsed;
      } catch {}
    }
    return { ...DEFAULT_NOTIFICATION_SETTINGS, morningTime: '07:00', telegramMorningTime: '07:00', soundEnabled: true, reminder15Min: true };
  });

  const [notificationLog, setNotificationLog] = useState<NotificationLogItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'notification_log');
    return saved ? JSON.parse(saved) : [
      {
        id: 'n-1',
        title: 'Добро пожаловать в учебное расписание!',
        body: 'Все системы синхронизированы. Напоминания активны.',
        time: 'Сегодня, 07:00',
        read: true,
      },
    ];
  });

  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [activeMainTab, setActiveMainTab] = useState<'today' | 'schedule' | 'friends' | 'directory' | 'settings'>('today');

  // Automatic calendar date updater: when a new day arrives (midnight, waking device, or tab focus)
  useEffect(() => {
    let lastDateStr = formatDateYYYYMMDD(new Date());

    const checkDateRollOver = () => {
      const currentDateStr = formatDateYYYYMMDD(new Date());
      if (currentDateStr !== lastDateStr) {
        lastDateStr = currentDateStr;
        // If the user's selected date was yesterday's today or if they are in 'today' tab, roll forward
        setSelectedDate((prevDate) => {
          const prevStr = formatDateYYYYMMDD(prevDate);
          // If viewing today or previous today, advance to today
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          if (prevStr === formatDateYYYYMMDD(yesterday)) {
            return new Date();
          }
          return prevDate;
        });
      }
    };

    const interval = setInterval(checkDateRollOver, 30000); // check every 30 seconds
    window.addEventListener('focus', checkDateRollOver);
    document.addEventListener('visibilitychange', checkDateRollOver);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkDateRollOver);
      document.removeEventListener('visibilitychange', checkDateRollOver);
    };
  }, []);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'dark_mode');
    return saved !== null ? JSON.parse(saved) : false;
  });

  // In-app toasts & confirmation dialogs
  const [toasts, setToasts] = useState<ToastInfo[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogOptions | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = 't-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showConfirm = useCallback((options: ConfirmDialogOptions) => {
    setConfirmDialog(options);
  }, []);

  const hideConfirm = useCallback(() => {
    setConfirmDialog(null);
  }, []);

  // Apply dark mode class to html document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEY_PREFIX + 'dark_mode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  // Persist state changes synchronously across universal and per-profile storage keys
  useEffect(() => {
    persistLessonsLocally(myLessons, user?.uid || currentProfileId);
  }, [myLessons, user, currentProfileId]);

  useEffect(() => {
    persistFriendsLocally(friends, user?.uid || currentProfileId);
  }, [friends, user, currentProfileId]);

  useEffect(() => {
    persistTeachersLocally(teachers, user?.uid || currentProfileId);
  }, [teachers, user, currentProfileId]);

  useEffect(() => {
    persistClassroomsLocally(classrooms, user?.uid || currentProfileId);
  }, [classrooms, user, currentProfileId]);

  useEffect(() => {
    persistWeekSettingsLocally(weekSettings, user?.uid || currentProfileId);
  }, [weekSettings, user, currentProfileId]);

  useEffect(() => {
    persistOverridesLocally(overrides, user?.uid || currentProfileId);
  }, [overrides, user, currentProfileId]);

  useEffect(() => {
    localStorage.setItem(getKey('notifications'), JSON.stringify(notificationSettings));
  }, [notificationSettings, getKey]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'notification_log', JSON.stringify(notificationLog));
  }, [notificationLog]);

  // Trigger real notifications
  const triggerLiveNotification = useCallback((title: string, body: string) => {
    // 1. Play gentle sound
    if (notificationSettings.soundEnabled !== false) {
      playNotificationSound();
    }

    // 2. Dispatch browser OS notification safely
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
        });
      }
    } catch (err) {
      console.warn('Browser notification failed:', err);
    }

    // 3. Add to in-app log
    const nowStr = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    setNotificationLog((prev) => [
      {
        id: 'notif-' + Date.now(),
        title,
        body,
        time: nowStr,
        read: false,
      },
      ...prev.slice(0, 19),
    ]);
  }, [notificationSettings.soundEnabled]);

  // Background automated reminders runner
  const alertedLessonsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const interval = setInterval(() => {
      if (!notificationSettings.reminder15Min && !notificationSettings.reminder30Min) return;

      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const totalMinutesNow = currentHours * 60 + currentMinutes;

      // Check current day's effective lessons
      const todayEffective = getEffectiveLessonsForDate(
        selectedDate,
        myLessons,
        overrides,
        weekSettings,
        'my'
      );

      todayEffective.forEach((lesson) => {
        const [h, m] = lesson.startTime.split(':').map(Number);
        const lessonStartMinutes = h * 60 + m;
        const diff = lessonStartMinutes - totalMinutesNow;

        // Check 15-min alert
        if (notificationSettings.reminder15Min && diff >= 13 && diff <= 16) {
          const alertKey = `15min-${lesson.id}-${formatDateYYYYMMDD(selectedDate)}`;
          if (!alertedLessonsRef.current.has(alertKey)) {
            alertedLessonsRef.current.add(alertKey);
            triggerLiveNotification(
              `Через 15 минут пара: ${lesson.subject}`,
              `Аудитория: ${lesson.classroomName || 'Не указана'}. Начало в ${lesson.startTime}.`
            );
          }
        }

        // Check 30-min alert
        if (notificationSettings.reminder30Min && diff >= 28 && diff <= 31) {
          const alertKey = `30min-${lesson.id}-${formatDateYYYYMMDD(selectedDate)}`;
          if (!alertedLessonsRef.current.has(alertKey)) {
            alertedLessonsRef.current.add(alertKey);
            triggerLiveNotification(
              `Через 30 минут пара: ${lesson.subject}`,
              `Кабинет ${lesson.classroomName || '—'}, преподаватель: ${lesson.teacherName || '—'}.`
            );
          }
        }
      });

      // Daily Telegram schedule dispatch (when app is open in browser; backend also does this 24/7)
      if (
        notificationSettings.telegramEnabled &&
        notificationSettings.telegramChatId
      ) {
        const todayKey = formatDateYYYYMMDD(new Date());
        const nowHH = String(now.getHours()).padStart(2, '0');
        const nowMM = String(now.getMinutes()).padStart(2, '0');
        const currentTimeStr = `${nowHH}:${nowMM}`;

        // 1. Evening reminder (day before, default 17:00)
        const eveningEnabled = notificationSettings.telegramEveningEnabled !== false;
        const eveningTime = notificationSettings.telegramEveningTime || '17:00';
        if (eveningEnabled && currentTimeStr === eveningTime) {
          const sentKey = `tg_evening_sent_${currentProfileId}_${todayKey}`;
          if (!localStorage.getItem(sentKey)) {
            localStorage.setItem(sentKey, 'true');
            const tomorrowDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
            const tomorrowLessons = getEffectiveLessonsForDate(
              tomorrowDate,
              myLessons,
              overrides,
              weekSettings,
              'my'
            );
            sendScheduleToTelegramChat(
              notificationSettings.telegramChatId,
              tomorrowLessons,
              tomorrowDate,
              notificationSettings.telegramBotToken,
              'evening',
              userProfile?.displayName
            ).then((res) => {
              if (res.success) {
                triggerLiveNotification('Telegram бот', 'Вечерний анонс пар на завтра отправлен в Telegram!');
              }
            }).catch(() => {});
          }
        }

        // 2. Morning reminder (day of classes, default 07:00)
        const morningEnabled = notificationSettings.telegramMorningEnabled !== false;
        const morningTime = notificationSettings.telegramMorningTime || notificationSettings.morningTime || '07:00';
        if (morningEnabled && currentTimeStr === morningTime) {
          const sentKey = `tg_morning_sent_${currentProfileId}_${todayKey}`;
          if (!localStorage.getItem(sentKey)) {
            localStorage.setItem(sentKey, 'true');
            const todayLessons = getEffectiveLessonsForDate(
              new Date(),
              myLessons,
              overrides,
              weekSettings,
              'my'
            );
            sendScheduleToTelegramChat(
              notificationSettings.telegramChatId,
              todayLessons,
              new Date(),
              notificationSettings.telegramBotToken,
              'morning',
              userProfile?.displayName
            ).then((res) => {
              if (res.success) {
                triggerLiveNotification('Telegram бот', 'Утреннее расписание пар отправлено в Telegram!');
              }
            }).catch(() => {});
          }
        }
      }
    }, 30000); // check every 30 seconds

    return () => clearInterval(interval);
  }, [myLessons, overrides, weekSettings, selectedDate, notificationSettings, triggerLiveNotification, currentProfileId, userProfile?.displayName]);

  // Sync Telegram subscription to backend server whenever settings or lessons change
  useEffect(() => {
    if (notificationSettings.telegramChatId) {
      syncTelegramDailySubscription(
        user?.uid || currentProfileId,
        notificationSettings.telegramChatId,
        notificationSettings.telegramMorningTime || notificationSettings.morningTime || '07:00',
        myLessons,
        Boolean(notificationSettings.telegramEnabled),
        userProfile?.shareCode,
        notificationSettings.telegramBotToken,
        notificationSettings.telegramEveningTime || '17:00',
        notificationSettings.telegramEveningEnabled !== false,
        notificationSettings.telegramMorningEnabled !== false,
        weekSettings,
        overrides,
        userProfile?.displayName
      ).catch((e) => console.warn('Telegram subscription sync error:', e));
    }
  }, [
    user?.uid,
    currentProfileId,
    notificationSettings.telegramEnabled,
    notificationSettings.telegramChatId,
    notificationSettings.telegramMorningTime,
    notificationSettings.telegramMorningEnabled,
    notificationSettings.telegramEveningTime,
    notificationSettings.telegramEveningEnabled,
    notificationSettings.morningTime,
    notificationSettings.telegramBotToken,
    myLessons,
    weekSettings,
    overrides,
    userProfile?.shareCode,
    userProfile?.displayName,
  ]);

  // Firebase Auth observer: run only once on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const profile: UserProfile = {
          uid: currentUser.uid,
          email: currentUser.email || '',
          displayName: currentUser.displayName || userProfile?.displayName || 'Студент',
          photoURL: currentUser.photoURL || undefined,
          shareCode: userProfile?.shareCode && userProfile.shareCode !== 'STU-STUDENT'
            ? userProfile.shareCode
            : `STU-${currentUser.uid.slice(0, 6).toUpperCase()}`,
        };
        setUserProfile(profile);
        persistUserProfileLocally(profile);

        // Load data from Firestore with smart merge (never erase user's local input)
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const data = snap.data();
            const deletedIds = getDeletedLessonIds();
            const remoteLessons = (Array.isArray(data.myLessons) ? data.myLessons : []).filter(
              (l) => !isMockLesson(l) && !deletedIds.has(l?.id)
            );
            const localLessons = loadSavedLessons(currentUser.uid).filter(
              (l) => !isMockLesson(l) && !deletedIds.has(l?.id)
            );

            // Merge lessons non-destructively:
            // Put remote lessons in map first, then overlay local lessons
            const lessonMap = new Map<string, Lesson>();
            remoteLessons.forEach((l) => {
              if (l && l.id) lessonMap.set(l.id, l);
            });
            localLessons.forEach((l) => {
              if (l && l.id) lessonMap.set(l.id, l);
            });

            const mergedLessons = Array.from(lessonMap.values());
            setMyLessons(mergedLessons);
            persistLessonsLocally(mergedLessons, currentUser.uid);

            // Synchronize the complete merged dataset back to Firestore
            setDoc(
              userDocRef,
              sanitizeForFirestore({
                myLessons: mergedLessons,
                updatedAt: new Date().toISOString(),
              }),
              { merge: true }
            ).catch((err) => console.warn('Sync merged lessons to Firestore deferred:', err));

            // Friends non-destructive merge with tombstones
            if (Array.isArray(data.deletedFriendIds)) {
              data.deletedFriendIds.forEach((id: string) => markFriendDeleted(id));
            }
            const currentDeletedFriendIds = getDeletedFriendIds();

            const remoteFriends = (Array.isArray(data.friends) ? data.friends : []).filter(
              (f) =>
                !isMockFriend(f) &&
                !currentDeletedFriendIds.has(f?.id) &&
                (!f?.shareCode || !currentDeletedFriendIds.has(f.shareCode))
            );
            const localFriends = loadSavedFriends(currentUser.uid).filter(
              (f) =>
                !isMockFriend(f) &&
                !currentDeletedFriendIds.has(f?.id) &&
                (!f?.shareCode || !currentDeletedFriendIds.has(f.shareCode))
            );
            const friendMap = new Map<string, Friend>();
            remoteFriends.forEach((f) => {
              if (f && f.id) friendMap.set(f.id, f);
            });
            localFriends.forEach((f) => {
              if (f && f.id) friendMap.set(f.id, f);
            });
            const mergedFriends = Array.from(friendMap.values());
            setFriends(mergedFriends);
            persistFriendsLocally(mergedFriends, currentUser.uid);

            // Synchronize clean merged friends and tombstones back to Firestore immediately
            setDoc(
              userDocRef,
              sanitizeForFirestore({
                friends: mergedFriends,
                deletedFriendIds: Array.from(currentDeletedFriendIds),
                updatedAt: new Date().toISOString(),
              }),
              { merge: true }
            ).catch((err) => console.warn('Sync merged friends to Firestore deferred:', err));

            if (Array.isArray(data.teachers) && data.teachers.length > 0) {
              setTeachers(data.teachers);
              persistTeachersLocally(data.teachers, currentUser.uid);
            }
            if (Array.isArray(data.classrooms) && data.classrooms.length > 0) {
              setClassrooms(data.classrooms);
              persistClassroomsLocally(data.classrooms, currentUser.uid);
            }
            if (data.weekSettings) {
              setWeekSettings(data.weekSettings);
              persistWeekSettingsLocally(data.weekSettings, currentUser.uid);
            }
            if (Array.isArray(data.overrides) && data.overrides.length > 0) {
              setOverrides(data.overrides);
              persistOverridesLocally(data.overrides, currentUser.uid);
            }
            if (data.notificationSettings) setNotificationSettings(data.notificationSettings);
          } else {
            // First time login: seed user document with local data so nothing is lost!
            const localLessons = loadSavedLessons(currentUser.uid);
            const localFriends = loadSavedFriends(currentUser.uid);
            const localTeachers = loadSavedTeachers();
            const localClassrooms = loadSavedClassrooms();
            const localWeek = loadSavedWeekSettings();
            const localOverrides = loadSavedOverrides();

            await setDoc(userDocRef, sanitizeForFirestore({
              userId: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName || 'Студент',
              myLessons: localLessons,
              friends: localFriends,
              teachers: localTeachers,
              classrooms: localClassrooms,
              weekSettings: localWeek,
              overrides: localOverrides,
              notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
              shareCode: profile.shareCode,
              updatedAt: new Date().toISOString(),
            }));

            // Also seed public schedule
            const pubRef = doc(db, 'publicSchedules', profile.shareCode);
            await setDoc(pubRef, sanitizeForFirestore({
              userId: currentUser.uid,
              displayName: currentUser.displayName || 'Студент',
              shareCode: profile.shareCode,
              lessons: localLessons,
              teachers: localTeachers,
              classrooms: localClassrooms,
              weekSettings: localWeek,
              updatedAt: new Date().toISOString(),
            }), { merge: true }).catch(() => {});
          }
        } catch (e) {
          console.warn('Firestore load failed, using local offline copy', e);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Debounced auto-sync to Firestore and publicSchedules
  useEffect(() => {
    const timeout = setTimeout(async () => {
      const shareCode = userProfile?.shareCode;

      // Sync to publicSchedules
      if (shareCode) {
        try {
          const pubDocRef = doc(db, 'publicSchedules', shareCode);
          await setDoc(
            pubDocRef,
            sanitizeForFirestore({
              userId: user?.uid || currentProfileId,
              displayName: userProfile?.displayName || user?.displayName || 'Студент',
              group: userProfile?.group || '',
              shareCode,
              lessons: myLessons,
              teachers,
              classrooms,
              weekSettings,
              updatedAt: new Date().toISOString(),
            }),
            { merge: true }
          );
        } catch (pubErr) {
          console.warn('Auto-save to publicSchedules note:', pubErr);
        }
      }

      // If authenticated, sync to user's private database document
      if (user?.uid) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(
            userDocRef,
            sanitizeForFirestore({
              userId: user.uid,
              email: user.email,
              displayName: userProfile?.displayName || user.displayName || 'Студент',
              group: userProfile?.group || '',
              myLessons,
              friends,
              deletedFriendIds: Array.from(getDeletedFriendIds()),
              teachers,
              classrooms,
              weekSettings,
              overrides,
              notificationSettings,
              shareCode: shareCode || '',
              updatedAt: new Date().toISOString(),
            }),
            { merge: true }
          );
        } catch (userErr) {
          console.warn('Auto-save to userDoc error:', userErr);
        }
      }
    }, 1200);

    return () => clearTimeout(timeout);
  }, [user, userProfile, currentProfileId, myLessons, friends, teachers, classrooms, weekSettings, overrides, notificationSettings]);

  // Profile & Data Management
  const switchDemoProfile = (profileId: string, name: string) => {
    setCurrentProfileId(profileId);
    localStorage.setItem(STORAGE_KEY_PREFIX + 'active_profile_id', profileId);

    const code = `STU-${profileId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}`;
    const newProfile: UserProfile = {
      uid: profileId,
      displayName: name,
      email: `${profileId}@university.edu`,
      group: '',
      shareCode: code,
    };
    setUserProfile(newProfile);
    localStorage.setItem(STORAGE_KEY_PREFIX + 'user_profile', JSON.stringify(newProfile));

    const savedLessons = localStorage.getItem(`${STORAGE_KEY_PREFIX}${profileId}_my_lessons`);
    if (savedLessons) {
      try {
        setMyLessons(JSON.parse(savedLessons));
      } catch {
        setMyLessons([]);
      }
    } else {
      setMyLessons([]);
    }
  };

  const updateUserProfile = (data: Partial<UserProfile>) => {
    setUserProfile((prev) => {
      const updated: UserProfile = prev
        ? { ...prev, ...data }
        : {
            uid: 'student_main',
            displayName: 'Студент',
            email: 'halilovramazan394@gmail.com',
            group: '',
            shareCode: 'STU-STUDENT',
            ...data,
          };
      localStorage.setItem(STORAGE_KEY_PREFIX + 'user_profile', JSON.stringify(updated));
      return updated;
    });
  };

  const clearMySchedule = () => {
    myLessons.forEach((l) => markLessonDeleted(l.id));
    setMyLessons([]);
    localStorage.removeItem(getKey('my_lessons'));
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'my_lessons');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'student_main_my_lessons');
    if (user?.uid) {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${user.uid}_my_lessons`);
      const userDocRef = doc(db, 'users', user.uid);
      setDoc(userDocRef, { myLessons: [], updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
    }
    if (userProfile?.shareCode) {
      const pubDocRef = doc(db, 'publicSchedules', userProfile.shareCode);
      setDoc(pubDocRef, { lessons: [], updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
    }
  };

  const clearDayLessons = (dayOfWeek: number, targetFriendId?: string) => {
    if (!targetFriendId || targetFriendId === 'my') {
      setMyLessons((prev) => {
        const removed = prev.filter((l) => l.dayOfWeek === dayOfWeek);
        removed.forEach((l) => markLessonDeleted(l.id));
        const next = prev.filter((l) => l.dayOfWeek !== dayOfWeek);
        persistLessonsLocally(next, user?.uid || currentProfileId);
        if (user?.uid) {
          const userDocRef = doc(db, 'users', user.uid);
          setDoc(userDocRef, sanitizeForFirestore({ myLessons: next, updatedAt: new Date().toISOString() }), { merge: true }).catch(() => {});
        }
        return next;
      });
    } else {
      setFriends((prev) =>
        prev.map((f) =>
          f.id === targetFriendId
            ? { ...f, lessons: f.lessons.filter((l) => l.dayOfWeek !== dayOfWeek) }
            : f
        )
      );
    }
  };

  const clearFriends = () => {
    friends.forEach((f) => markFriendDeleted(f.id, f.shareCode));
    cleanFriendFromLocalStorage('*');
    setFriends([]);
    localStorage.removeItem(getKey('friends'));
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'friends');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'student_main_friends');
    if (user?.uid) {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${user.uid}_friends`);
      syncFriendsToCloud([]);
    }
  };

  const clearFriendSchedule = (friendId: string) => {
    setFriends((prev) => {
      const next = prev.map((f) => (f.id === friendId ? { ...f, lessons: [] } : f));
      persistFriendsLocally(next, user?.uid || currentProfileId);
      syncFriendsToCloud(next);
      return next;
    });
  };

  const clearDirectory = () => {
    setTeachers([]);
    setClassrooms([]);
    localStorage.removeItem(getKey('teachers'));
    localStorage.removeItem(getKey('classrooms'));
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'teachers');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'classrooms');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'student_main_teachers');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'student_main_classrooms');
  };

  const syncWithCloud = async () => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(
        userDocRef,
        {
          userId: user.uid,
          email: user.email,
          displayName: userProfile?.displayName || user.displayName || 'Студент',
          myLessons,
          friends,
          teachers,
          classrooms,
          weekSettings,
          overrides,
          notificationSettings,
          shareCode: userProfile?.shareCode,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // Also publish to public schedule if shareCode exists
      if (userProfile?.shareCode) {
        const pubDoc = doc(db, 'publicSchedules', userProfile.shareCode);
        await setDoc(pubDoc, {
          userId: user.uid,
          displayName: userProfile.displayName,
          shareCode: userProfile.shareCode,
          lessons: myLessons,
          teachers,
          classrooms,
          weekSettings,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn('Sync with cloud failed:', e);
    }
  };

  const publishScheduleToCloud = async (customCode?: string): Promise<{ success: boolean; shareCode: string; message: string }> => {
    const codeToUse = (customCode || userProfile?.shareCode || `STU-${(user?.uid || 'STUDENT').slice(0, 6).toUpperCase()}`).trim().toUpperCase();
    try {
      const pubDoc = doc(db, 'publicSchedules', codeToUse);
      await setDoc(pubDoc, {
        userId: user?.uid || currentProfileId,
        displayName: userProfile?.displayName || 'Студент',
        group: userProfile?.group || '',
        shareCode: codeToUse,
        lessons: myLessons,
        teachers,
        classrooms,
        weekSettings,
        updatedAt: new Date().toISOString(),
      });
      // Update local profile with this code
      updateUserProfile({ shareCode: codeToUse });
      return {
        success: true,
        shareCode: codeToUse,
        message: `Расписание опубликовано в облаке! Доступно по коду ${codeToUse}`,
      };
    } catch (e: any) {
      console.error('Publish schedule error:', e);
      return {
        success: false,
        shareCode: codeToUse,
        message: `Ошибка публикации: ${e.message || String(e)}`,
      };
    }
  };

  const importMyScheduleByShareCode = async (code: string): Promise<{ success: boolean; lessonCount: number; author?: string; message: string }> => {
    try {
      const cleanCode = code.trim().toUpperCase();
      const pubDocRef = doc(db, 'publicSchedules', cleanCode);
      const snap = await getDoc(pubDocRef);
      if (snap.exists()) {
        const data = snap.data();
        const loadedLessons = Array.isArray(data.lessons) ? data.lessons : [];
        setMyLessons(loadedLessons);

        if (Array.isArray(data.teachers) && data.teachers.length > 0) {
          setTeachers(data.teachers);
        }
        if (Array.isArray(data.classrooms) && data.classrooms.length > 0) {
          setClassrooms(data.classrooms);
        }
        if (data.weekSettings) {
          setWeekSettings(data.weekSettings);
        }
        if (data.displayName || data.group) {
          updateUserProfile({
            displayName: data.displayName || userProfile?.displayName,
            group: data.group || userProfile?.group,
            shareCode: cleanCode,
          });
        }
        return {
          success: true,
          lessonCount: loadedLessons.length,
          author: data.displayName || 'Студент',
          message: `Расписание успешно загружено! Загружено пар: ${loadedLessons.length}`,
        };
      } else {
        return {
          success: false,
          lessonCount: 0,
          message: `Расписание с кодом ${cleanCode} не найдено в облаке.`,
        };
      }
    } catch (e: any) {
      console.error('Import schedule error:', e);
      return {
        success: false,
        lessonCount: 0,
        message: `Ошибка загрузки: ${e.message || String(e)}`,
      };
    }
  };

  const exportScheduleJSON = (): string => {
    const data = {
      version: 2,
      exportedAt: new Date().toISOString(),
      userProfile,
      myLessons,
      friends,
      teachers,
      classrooms,
      weekSettings,
      overrides,
    };
    return JSON.stringify(data, null, 2);
  };

  const importScheduleJSON = (jsonString: string): { success: boolean; message: string } => {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.myLessons)) setMyLessons(data.myLessons);
      if (Array.isArray(data.friends)) setFriends(data.friends);
      if (Array.isArray(data.teachers)) setTeachers(data.teachers);
      if (Array.isArray(data.classrooms)) setClassrooms(data.classrooms);
      if (data.weekSettings) setWeekSettings(data.weekSettings);
      if (Array.isArray(data.overrides)) setOverrides(data.overrides);
      if (data.userProfile) updateUserProfile(data.userProfile);
      return {
        success: true,
        message: `Импорт завершен успешно! Загружено пар: ${data.myLessons?.length || 0}`,
      };
    } catch (e: any) {
      return {
        success: false,
        message: 'Не удалось прочитать файл: ' + (e.message || String(e)),
      };
    }
  };

  const purgeAllLegacyData = () => {
    // Purge every item starting with study_schedule_
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_KEY_PREFIX)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));

    // Clear state
    setMyLessons([]);
    setFriends([]);
    setTeachers([]);
    setClassrooms([]);
    setOverrides([]);
    setWeekSettings(DEFAULT_WEEK_SETTINGS);
    setUserProfile({
      uid: 'student_main',
      displayName: 'Студент',
      email: 'halilovramazan394@gmail.com',
      group: '',
      shareCode: 'STU-STUDENT',
    });
    setCurrentProfileId('student_main');
  };

  const loginWithGoogle = async () => {
    const { googleProvider } = await import('../lib/firebase');
    await signInWithPopup(auth, googleProvider);
  };

  const loginWithEmail = async (emailStr: string, pass: string) => {
    await signInWithEmailAndPassword(auth, emailStr, pass);
  };

  const registerWithEmail = async (emailStr: string, pass: string, name: string) => {
    const res = await createUserWithEmailAndPassword(auth, emailStr, pass);
    if (res.user && name) {
      await updateProfile(res.user, { displayName: name });
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setCurrentProfileId('student_main');
    setUserProfile({
      uid: 'student_main',
      displayName: 'Студент',
      email: 'halilovramazan394@gmail.com',
      group: '',
      shareCode: 'STU-STUDENT',
    });
  };

  const importFriendByShareCode = async (code: string): Promise<{ success: boolean; friendName?: string; lessonCount?: number; error?: string }> => {
    try {
      const cleanCode = code.trim().toUpperCase();
      if (!cleanCode) {
        return { success: false, error: 'Введите корректный код' };
      }

      let scheduleData: any = null;

      // 1. Try fetching from publicSchedules
      try {
        const pubDocRef = doc(db, 'publicSchedules', cleanCode);
        const snap = await getDoc(pubDocRef);
        if (snap.exists()) {
          scheduleData = snap.data();
        }
      } catch (pubErr) {
        console.warn('Public schedule fetch error:', pubErr);
      }

      // 2. If not found in publicSchedules, fallback to querying users collection by shareCode
      if (!scheduleData) {
        try {
          const usersQuery = query(collection(db, 'users'), where('shareCode', '==', cleanCode));
          const querySnap = await getDocs(usersQuery);
          if (!querySnap.empty) {
            const uDoc = querySnap.docs[0].data();
            scheduleData = {
              displayName: uDoc.displayName || 'Студент',
              group: uDoc.group || '',
              lessons: uDoc.myLessons || [],
              shareCode: cleanCode,
            };
          }
        } catch (uErr) {
          console.warn('Query users by shareCode error:', uErr);
        }
      }

      if (scheduleData) {
        const friendLessons: Lesson[] = Array.isArray(scheduleData.lessons)
          ? scheduleData.lessons
          : (Array.isArray(scheduleData.myLessons) ? scheduleData.myLessons : []);

        const existingFriendIndex = friends.findIndex(
          (f) => (f.shareCode && f.shareCode === cleanCode) || f.nickname === scheduleData.displayName
        );

        let nextFriends: Friend[];
        let resultFriendName: string;

        if (existingFriendIndex >= 0) {
          const existing = friends[existingFriendIndex];
          resultFriendName = existing.firstName || scheduleData.displayName || 'Друг';
          const updated: Friend = {
            ...existing,
            firstName: scheduleData.displayName || existing.firstName,
            group: scheduleData.group || existing.group,
            lessons: friendLessons,
            teachers: Array.isArray(scheduleData.teachers) ? scheduleData.teachers : existing.teachers,
            classrooms: Array.isArray(scheduleData.classrooms) ? scheduleData.classrooms : existing.classrooms,
            weekSettings: scheduleData.weekSettings || existing.weekSettings,
            shareCode: cleanCode,
            lastSyncedAt: new Date().toISOString(),
          };
          unmarkFriendDeleted(existing.id, cleanCode);
          nextFriends = [...friends];
          nextFriends[existingFriendIndex] = updated;
        } else {
          resultFriendName = scheduleData.displayName || 'Друг';
          const newFriend: Friend = {
            id: 'fr-' + Date.now(),
            firstName: scheduleData.displayName || 'Друг',
            lastName: scheduleData.lastName || '',
            nickname: scheduleData.displayName,
            group: scheduleData.group || 'Группа',
            color: '#3b82f6',
            lessons: friendLessons,
            teachers: Array.isArray(scheduleData.teachers) ? scheduleData.teachers : undefined,
            classrooms: Array.isArray(scheduleData.classrooms) ? scheduleData.classrooms : undefined,
            weekSettings: scheduleData.weekSettings || undefined,
            shareCode: cleanCode,
            lastSyncedAt: new Date().toISOString(),
          };
          unmarkFriendDeleted(newFriend.id, cleanCode);
          nextFriends = [...friends, newFriend];
        }

        setFriends(nextFriends);
        persistFriendsLocally(nextFriends, user?.uid || currentProfileId);
        syncFriendsToCloud(nextFriends);

        return {
          success: true,
          friendName: resultFriendName,
          lessonCount: friendLessons.length,
        };
      } else {
        return {
          success: false,
          error: `Расписание с кодом «${cleanCode}» не найдено в базе данных. Проверьте правильность кода.`,
        };
      }
    } catch (err: any) {
      console.error('importFriendByShareCode error:', err);
      return { success: false, error: err.message || String(err) };
    }
  };

  const refreshFriendSchedule = async (friendId: string): Promise<{ success: boolean; lessonCount?: number; error?: string }> => {
    const friend = friends.find((f) => f.id === friendId);
    if (!friend) return { success: false, error: 'Друг не найден' };
    if (!friend.shareCode) return { success: false, error: 'У этого друга не сохранен код расписания' };

    const res = await importFriendByShareCode(friend.shareCode);
    if (res.success) {
      return { success: true, lessonCount: res.lessonCount };
    } else {
      return { success: false, error: res.error };
    }
  };

  // Direct cloud sync helpers
  const syncMyLessonsToCloud = useCallback((lessonsToSync: Lesson[]) => {
    try {
      const cleanLessons = sanitizeForFirestore(lessonsToSync);
      if (user?.uid) {
        const userDocRef = doc(db, 'users', user.uid);
        setDoc(
          userDocRef,
          {
            myLessons: cleanLessons,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        ).catch((e) => console.warn('Direct sync to users doc deferred:', e));
      }
      const code = userProfile?.shareCode;
      if (code) {
        const pubDocRef = doc(db, 'publicSchedules', code);
        setDoc(
          pubDocRef,
          {
            lessons: cleanLessons,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        ).catch((e) => console.warn('Direct sync to publicSchedules deferred:', e));
      }
    } catch (err) {
      console.warn('syncMyLessonsToCloud error:', err);
    }
  }, [user, userProfile]);

  const syncFriendsToCloud = useCallback((friendsToSync: Friend[]) => {
    try {
      if (user?.uid) {
        const userDocRef = doc(db, 'users', user.uid);
        const deletedFriendIds = Array.from(getDeletedFriendIds());
        setDoc(
          userDocRef,
          sanitizeForFirestore({
            friends: friendsToSync,
            deletedFriendIds,
            updatedAt: new Date().toISOString(),
          }),
          { merge: true }
        ).catch((e) => console.warn('Direct sync friends doc deferred:', e));
      }
    } catch (err) {
      console.warn('syncFriendsToCloud error:', err);
    }
  }, [user]);

  // Copy single lesson from friend to user's schedule
  const copySingleLessonToMySchedule = useCallback(
    (lesson: Lesson, friendName?: string) => {
      let finalTeacherId = lesson.teacherId;
      const updatedTeachers = [...teachers];
      if (lesson.teacherName && lesson.teacherName.trim()) {
        const nameStr = lesson.teacherName.trim();
        let found = updatedTeachers.find(
          (t) =>
            t.id === finalTeacherId ||
            (t.lastName && nameStr.toLowerCase().includes(t.lastName.toLowerCase())) ||
            `${t.lastName} ${t.firstName}`.trim().toLowerCase() === nameStr.toLowerCase()
        );
        if (!found) {
          const parts = nameStr.split(/\s+/);
          const createdTeacher: Teacher = {
            id: 't-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
            lastName: parts[0] || nameStr,
            firstName: parts.slice(1).join(' ') || '',
            subject: lesson.subject || '',
          };
          updatedTeachers.push(createdTeacher);
          found = createdTeacher;
        }
        finalTeacherId = found.id;
        setTeachers(updatedTeachers);
        persistTeachersLocally(updatedTeachers, user?.uid || currentProfileId);
      }

      let finalClassroomId = lesson.classroomId;
      const updatedClassrooms = [...classrooms];
      if (lesson.classroomName && lesson.classroomName.trim()) {
        const numStr = lesson.classroomName.trim();
        let found = updatedClassrooms.find(
          (c) => c.id === finalClassroomId || c.number.trim().toLowerCase() === numStr.toLowerCase()
        );
        if (!found) {
          const createdClassroom: Classroom = {
            id: 'c-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
            number: numStr,
          };
          updatedClassrooms.push(createdClassroom);
          found = createdClassroom;
        }
        finalClassroomId = found.id;
        setClassrooms(updatedClassrooms);
        persistClassroomsLocally(updatedClassrooms, user?.uid || currentProfileId);
      }

      const newId = 'l-single-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
      unmarkLessonDeleted(newId);
      const normalized = normalizeLessonTimes(lesson);
      const newLesson: Lesson = {
        ...normalized,
        id: newId,
        teacherId: finalTeacherId,
        classroomId: finalClassroomId,
      };

      setMyLessons((prev) => {
        const next = [...prev, newLesson];
        persistLessonsLocally(next, user?.uid || currentProfileId);
        syncMyLessonsToCloud(next);
        return next;
      });

      showToast(
        `Пара «${lesson.subject}» ${friendName ? `от ${friendName} ` : ''}добавлена в ваше расписание`,
        'success'
      );
    },
    [teachers, classrooms, user, currentProfileId, syncMyLessonsToCloud, showToast]
  );

  // Full copy of a friend's schedule to become the user's schedule
  const copyFriendScheduleToMySchedule = useCallback(
    async (
      friendId: string,
      options?: { copyGroup?: boolean; copyWeekSettings?: boolean }
    ): Promise<{ success: boolean; lessonCount: number; friendName: string; error?: string }> => {
      const friend = friends.find((f) => f.id === friendId);
      if (!friend) {
        return { success: false, lessonCount: 0, friendName: '', error: 'Друг не найден' };
      }

      const friendName = friend.nickname || `${friend.firstName} ${friend.lastName}`.trim() || 'Друг';

      let sourceLessons: Lesson[] = Array.isArray(friend.lessons) ? [...friend.lessons] : [];
      let sourceTeachers: Teacher[] = Array.isArray(friend.teachers) ? [...friend.teachers] : [];
      let sourceClassrooms: Classroom[] = Array.isArray(friend.classrooms) ? [...friend.classrooms] : [];
      let sourceWeekSettings: WeekSettings | undefined = friend.weekSettings;
      let sourceGroup: string = friend.group || '';

      // If friend has a shareCode, fetch freshest data from Firestore
      if (friend.shareCode) {
        try {
          const cleanCode = friend.shareCode.trim().toUpperCase();
          const pubDocRef = doc(db, 'publicSchedules', cleanCode);
          const snap = await getDoc(pubDocRef);
          if (snap.exists()) {
            const data = snap.data();
            if (Array.isArray(data.lessons) && data.lessons.length > 0) {
              sourceLessons = data.lessons;
            }
            if (Array.isArray(data.teachers) && data.teachers.length > 0) {
              sourceTeachers = data.teachers;
            }
            if (Array.isArray(data.classrooms) && data.classrooms.length > 0) {
              sourceClassrooms = data.classrooms;
            }
            if (data.weekSettings) {
              sourceWeekSettings = data.weekSettings;
            }
            if (data.group) {
              sourceGroup = data.group;
            }
          }
        } catch (cloudErr) {
          console.warn('Could not fetch cloud data for friend, using cached data:', cloudErr);
        }
      }

      if (!sourceLessons || sourceLessons.length === 0) {
        return {
          success: false,
          lessonCount: 0,
          friendName,
          error: `У друга ${friendName} нет пар в расписании для копирования.`,
        };
      }

      // 1. Process Teachers
      const updatedTeachers: Teacher[] = [...teachers];

      if (sourceTeachers && sourceTeachers.length > 0) {
        for (const st of sourceTeachers) {
          const exists = updatedTeachers.some(
            (t) =>
              t.id === st.id ||
              (t.lastName.toLowerCase() === (st.lastName || '').toLowerCase() &&
                ((t.firstName || '').toLowerCase() === (st.firstName || '').toLowerCase() || !t.firstName || !st.firstName))
          );
          if (!exists) {
            updatedTeachers.push({
              ...st,
              id: st.id || 't-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
            });
          }
        }
      }

      for (const l of sourceLessons) {
        if (l.teacherName && l.teacherName.trim()) {
          const nameStr = l.teacherName.trim();
          let found = updatedTeachers.find(
            (t) =>
              (t.lastName && nameStr.toLowerCase().includes(t.lastName.toLowerCase())) ||
              `${t.lastName} ${t.firstName}`.trim().toLowerCase() === nameStr.toLowerCase()
          );
          if (!found) {
            const parts = nameStr.split(/\s+/);
            const createdTeacher: Teacher = {
              id: 't-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
              lastName: parts[0] || nameStr,
              firstName: parts.slice(1).join(' ') || '',
              subject: l.subject || '',
            };
            updatedTeachers.push(createdTeacher);
          }
        }
      }

      // 2. Process Classrooms
      const updatedClassrooms: Classroom[] = [...classrooms];

      if (sourceClassrooms && sourceClassrooms.length > 0) {
        for (const sc of sourceClassrooms) {
          const exists = updatedClassrooms.some(
            (c) =>
              c.id === sc.id ||
              c.number.trim().toLowerCase() === (sc.number || '').trim().toLowerCase()
          );
          if (!exists) {
            updatedClassrooms.push({
              ...sc,
              id: sc.id || 'c-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
            });
          }
        }
      }

      for (const l of sourceLessons) {
        if (l.classroomName && l.classroomName.trim()) {
          const numStr = l.classroomName.trim();
          let found = updatedClassrooms.find(
            (c) => c.number.trim().toLowerCase() === numStr.toLowerCase()
          );
          if (!found) {
            const createdClassroom: Classroom = {
              id: 'c-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
              number: numStr,
            };
            updatedClassrooms.push(createdClassroom);
          }
        }
      }

      // 3. Build User's new Lessons with fresh IDs and linked teacher/classroom IDs
      const newLessons: Lesson[] = sourceLessons.map((l, index) => {
        let teacherId = l.teacherId;
        if (l.teacherName) {
          const match = updatedTeachers.find(
            (t) =>
              (t.lastName && l.teacherName!.toLowerCase().includes(t.lastName.toLowerCase())) ||
              `${t.lastName} ${t.firstName}`.trim().toLowerCase() === l.teacherName!.trim().toLowerCase()
          );
          if (match) teacherId = match.id;
        }

        let classroomId = l.classroomId;
        if (l.classroomName) {
          const match = updatedClassrooms.find(
            (c) => c.number.trim().toLowerCase() === l.classroomName!.trim().toLowerCase()
          );
          if (match) classroomId = match.id;
        }

        const freshId = `l-copied-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`;
        unmarkLessonDeleted(freshId);

        const norm = normalizeLessonTimes(l);

        return {
          id: freshId,
          subject: norm.subject,
          startTime: norm.startTime,
          endTime: norm.endTime,
          dayOfWeek: norm.dayOfWeek,
          weekType: norm.weekType ?? 'all',
          type: norm.type || 'lecture',
          teacherId,
          teacherName: norm.teacherName,
          classroomId,
          classroomName: norm.classroomName,
          group: norm.group || sourceGroup || userProfile?.group,
          comment: norm.comment,
          colorTag: norm.colorTag,
        };
      });

      // 4. Update Week Settings if provided
      let finalWeekSettings = weekSettings;
      if (sourceWeekSettings && options?.copyWeekSettings !== false) {
        finalWeekSettings = {
          ...weekSettings,
          cycleType: sourceWeekSettings.cycleType || weekSettings.cycleType,
          totalWeeks: sourceWeekSettings.totalWeeks || weekSettings.totalWeeks,
          referenceDate: sourceWeekSettings.referenceDate || weekSettings.referenceDate,
          names: sourceWeekSettings.names || weekSettings.names,
          semesterStartDate: sourceWeekSettings.semesterStartDate || weekSettings.semesterStartDate,
        };
        setWeekSettings(finalWeekSettings);
        persistWeekSettingsLocally(finalWeekSettings, user?.uid || currentProfileId);
      }

      // 5. Update user profile group if provided
      if (sourceGroup && options?.copyGroup !== false) {
        updateUserProfile({
          group: sourceGroup,
        });
      }

      // 6. Reset old overrides
      setOverrides([]);
      persistOverridesLocally([], user?.uid || currentProfileId);

      // 7. Save teachers and classrooms
      setTeachers(updatedTeachers);
      persistTeachersLocally(updatedTeachers, user?.uid || currentProfileId);

      setClassrooms(updatedClassrooms);
      persistClassroomsLocally(updatedClassrooms, user?.uid || currentProfileId);

      // 8. Save new lessons
      setMyLessons(newLessons);
      persistLessonsLocally(newLessons, user?.uid || currentProfileId);

      // 9. Sync to cloud
      syncMyLessonsToCloud(newLessons);

      // 10. Sync Telegram notifications
      if (notificationSettings.telegramEnabled && notificationSettings.telegramChatId) {
        syncTelegramDailySubscription(
          user?.uid || currentProfileId,
          notificationSettings.telegramChatId,
          notificationSettings.telegramMorningTime || notificationSettings.morningTime || '07:00',
          newLessons,
          Boolean(notificationSettings.telegramEnabled),
          userProfile?.shareCode,
          notificationSettings.telegramBotToken,
          notificationSettings.telegramEveningTime || '17:00',
          notificationSettings.telegramEveningEnabled !== false,
          notificationSettings.telegramMorningEnabled !== false,
          finalWeekSettings,
          [],
          userProfile?.displayName || user?.displayName
        ).catch((e) => console.warn('Telegram sync after copy schedule warning:', e));
      }

      // 11. Switch active view to schedule
      setActiveMainTab('schedule');

      return {
        success: true,
        lessonCount: newLessons.length,
        friendName,
      };
    },
    [
      friends,
      teachers,
      classrooms,
      weekSettings,
      userProfile,
      user,
      currentProfileId,
      notificationSettings,
      syncMyLessonsToCloud,
      updateUserProfile,
      setActiveMainTab,
    ]
  );

  const alignAllLessonsToStandardTimes = useCallback(async (): Promise<{ updatedCount: number }> => {
    let count = 0;
    const updated = myLessons.map((lesson) => {
      const normalized = normalizeLessonTimes(lesson);
      if (normalized.startTime !== lesson.startTime || normalized.endTime !== lesson.endTime) {
        count++;
        return normalized;
      }
      const pair = STANDARD_PAIRS.find((p) => p.start === lesson.startTime);
      if (pair && lesson.endTime !== pair.end) {
        count++;
        return { ...lesson, endTime: pair.end };
      }
      return lesson;
    });

    if (count > 0) {
      setMyLessons(updated);
      persistLessonsLocally(updated, user?.uid || currentProfileId);
      syncMyLessonsToCloud(updated);
      showToast(`Расписание обновлено: ${count} пар переведено на 95 минут`, 'success');
    } else {
      showToast('Все пары уже соответствуют звонкам (95 минут)', 'info');
    }
    return { updatedCount: count };
  }, [myLessons, user, currentProfileId, syncMyLessonsToCloud, showToast]);

  // Actions with immediate synchronous persistence and reliable database sync
  const addLesson = (lesson: Omit<Lesson, 'id'>, targetFriendId?: string) => {
    const newId = 'l-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const normalized = normalizeLessonTimes(lesson as Lesson);
    const newLesson: Lesson = { ...normalized, id: newId };
    unmarkLessonDeleted(newId);

    if (!targetFriendId || targetFriendId === 'my') {
      setMyLessons((prev) => {
        const next = [...prev, newLesson];
        persistLessonsLocally(next, user?.uid || currentProfileId);
        syncMyLessonsToCloud(next);
        return next;
      });
    } else {
      setFriends((prev) => {
        const next = prev.map((f) =>
          f.id === targetFriendId ? { ...f, lessons: [...f.lessons, newLesson] } : f
        );
        persistFriendsLocally(next, user?.uid || currentProfileId);
        syncFriendsToCloud(next);
        return next;
      });
    }
  };

  const updateLesson = (id: string, updated: Partial<Lesson>, targetFriendId?: string) => {
    const normalizedUpdated = (updated.startTime && updated.endTime)
      ? normalizeLessonTimes(updated as { startTime: string; endTime: string })
      : updated;

    if (!targetFriendId || targetFriendId === 'my') {
      setMyLessons((prev) => {
        const next = prev.map((l) => (l.id === id ? { ...l, ...normalizedUpdated } : l));
        persistLessonsLocally(next, user?.uid || currentProfileId);
        syncMyLessonsToCloud(next);
        return next;
      });
    } else {
      setFriends((prev) => {
        const next = prev.map((f) =>
          f.id === targetFriendId
            ? { ...f, lessons: f.lessons.map((l) => (l.id === id ? { ...l, ...normalizedUpdated } : l)) }
            : f
        );
        persistFriendsLocally(next, user?.uid || currentProfileId);
        syncFriendsToCloud(next);
        return next;
      });
    }
  };

  const deleteLesson = (id: string, targetFriendId?: string) => {
    if (!targetFriendId || targetFriendId === 'my') {
      markLessonDeleted(id);
      setMyLessons((prev) => {
        const next = prev.filter((l) => l.id !== id);
        persistLessonsLocally(next, user?.uid || currentProfileId);
        syncMyLessonsToCloud(next);
        return next;
      });
    } else {
      setFriends((prev) => {
        const next = prev.map((f) =>
          f.id === targetFriendId ? { ...f, lessons: f.lessons.filter((l) => l.id !== id) } : f
        );
        persistFriendsLocally(next, user?.uid || currentProfileId);
        syncFriendsToCloud(next);
        return next;
      });
    }
  };

  const addFriend = (friendData: Omit<Friend, 'id' | 'lessons'>) => {
    const newFriend: Friend = {
      ...friendData,
      id: 'fr-' + Date.now(),
      lessons: [],
    };
    unmarkFriendDeleted(newFriend.id, newFriend.shareCode);
    setFriends((prev) => {
      const next = [...prev, newFriend];
      persistFriendsLocally(next, user?.uid || currentProfileId);
      syncFriendsToCloud(next);
      return next;
    });
  };

  const updateFriend = (id: string, friendData: Partial<Friend>) => {
    setFriends((prev) => {
      const next = prev.map((f) => (f.id === id ? { ...f, ...friendData } : f));
      persistFriendsLocally(next, user?.uid || currentProfileId);
      syncFriendsToCloud(next);
      return next;
    });
  };

  const deleteFriend = (id: string) => {
    const friendToDelete = friends.find((f) => f.id === id);
    const shareCode = friendToDelete?.shareCode;

    // 1. Mark as deleted in tombstones
    markFriendDeleted(id, shareCode);

    // 2. Eradicate from all localStorage keys
    cleanFriendFromLocalStorage(id, shareCode);

    // 3. Compute updated list
    const next = friends.filter((f) => f.id !== id);

    // 4. Update React state
    setFriends(next);

    // 5. Persist to active local storage
    persistFriendsLocally(next, user?.uid || currentProfileId);

    // 6. Push to Firestore immediately with deletedFriendIds
    syncFriendsToCloud(next);
  };

  const addTeacher = (teacherData: Omit<Teacher, 'id'>): Teacher => {
    const newTeacher: Teacher = {
      ...teacherData,
      id: 't-' + Date.now(),
    };
    setTeachers((prev) => [...prev, newTeacher]);
    return newTeacher;
  };

  const updateTeacher = (id: string, data: Partial<Teacher>) => {
    setTeachers((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)));
  };

  const deleteTeacher = (id: string) => {
    setTeachers((prev) => prev.filter((t) => t.id !== id));
  };

  const addClassroom = (classroomData: Omit<Classroom, 'id'>): Classroom => {
    const newClassroom: Classroom = {
      ...classroomData,
      id: 'c-' + Date.now(),
    };
    setClassrooms((prev) => [...prev, newClassroom]);
    return newClassroom;
  };

  const updateClassroom = (id: string, data: Partial<Classroom>) => {
    setClassrooms((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
  };

  const deleteClassroom = (id: string) => {
    setClassrooms((prev) => prev.filter((c) => c.id !== id));
  };

  const updateWeekSettings = (settings: Partial<WeekSettings>) => {
    setWeekSettings((prev) => ({ ...prev, ...settings }));
  };

  const setCurrentWeekAsWeekOne = (date?: Date) => {
    const d = date || selectedDate;
    const monday = getMondayOfWeek(d);
    const mondayStr = formatDateYYYYMMDD(monday);
    setWeekSettings((prev) => ({
      ...prev,
      referenceDate: mondayStr,
    }));
  };

  const addOverride = (override: Omit<ScheduleOverride, 'id'>) => {
    const newOv: ScheduleOverride = {
      ...override,
      id: 'ov-' + Date.now(),
    };
    setOverrides((prev) => [...prev, newOv]);
  };

  const removeOverride = (id: string) => {
    setOverrides((prev) => prev.filter((o) => o.id !== id));
  };

  const updateNotificationSettings = (settings: Partial<NotificationSettings>) => {
    setNotificationSettings((prev) => ({ ...prev, ...settings }));
  };

  const resetToDemoData = () => {
    setMyLessons(DEFAULT_MY_LESSONS);
    setFriends(DEFAULT_FRIENDS);
    setTeachers(DEFAULT_TEACHERS);
    setClassrooms(DEFAULT_CLASSROOMS);
    setWeekSettings(DEFAULT_WEEK_SETTINGS);
    setOverrides(DEFAULT_OVERRIDES);
    setNotificationSettings({ ...DEFAULT_NOTIFICATION_SETTINGS, soundEnabled: true, reminder15Min: true });
  };

  const clearAllData = () => {
    setMyLessons([]);
    setFriends([]);
    setTeachers([]);
    setClassrooms([]);
    setOverrides([]);
  };

  const testTelegramBot = async (chatId: string, botToken?: string): Promise<{ success: boolean; message: string }> => {
    const token = botToken || notificationSettings.telegramBotToken;
    const targetChat = chatId || notificationSettings.telegramChatId;
    return testTelegramBotConnection(targetChat, token);
  };

  const sendTelegramScheduleNow = async (
    chatId: string,
    targetDate?: Date,
    botToken?: string,
    type: 'morning' | 'evening' | 'custom' = 'morning'
  ): Promise<{ success: boolean; message: string }> => {
    const d = targetDate || selectedDate;
    const targetLessons = getEffectiveLessonsForDate(d, myLessons, overrides, weekSettings, 'my');
    const token = botToken || notificationSettings.telegramBotToken;
    const targetChat = chatId || notificationSettings.telegramChatId;
    return sendScheduleToTelegramChat(targetChat, targetLessons, d, token, type, userProfile?.displayName);
  };

  return (
    <ScheduleContext.Provider
      value={{
        user,
        userProfile,
        currentProfileId,
        myLessons,
        friends,
        teachers,
        classrooms,
        weekSettings,
        overrides,
        notificationSettings,
        notificationLog,
        selectedDate,
        isDarkMode,
        activeMainTab,
        setSelectedDate,
        setIsDarkMode,
        setActiveMainTab,
        updateUserProfile,
        addLesson,
        updateLesson,
        deleteLesson,
        clearMySchedule,
        clearDayLessons,
        addFriend,
        updateFriend,
        deleteFriend,
        clearFriends,
        clearFriendSchedule,
        addTeacher,
        updateTeacher,
        deleteTeacher,
        addClassroom,
        updateClassroom,
        deleteClassroom,
        clearDirectory,
        updateWeekSettings,
        setCurrentWeekAsWeekOne,
        addOverride,
        removeOverride,
        updateNotificationSettings,
        resetToDemoData,
        clearAllData,
        purgeAllLegacyData,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        switchDemoProfile,
        logout,
        syncWithCloud,
        publishScheduleToCloud,
        importMyScheduleByShareCode,
        exportScheduleJSON,
        importScheduleJSON,
        triggerLiveNotification,
        importFriendByShareCode,
        refreshFriendSchedule,
        copyFriendScheduleToMySchedule,
        copySingleLessonToMySchedule,
        alignAllLessonsToStandardTimes,
        testTelegramBot,
        sendTelegramScheduleNow,
        toasts,
        showToast,
        removeToast,
        confirmDialog,
        showConfirm,
        hideConfirm,
      }}
    >
      {children}
    </ScheduleContext.Provider>
  );
};

export const useSchedule = () => {
  const ctx = useContext(ScheduleContext);
  if (!ctx) {
    throw new Error('useSchedule must be used within ScheduleProvider');
  }
  return ctx;
};
