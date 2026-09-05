import React, { useState } from 'react';
import { ScheduleProvider, useSchedule } from './context/ScheduleContext';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { TodayTimeline } from './components/TodayTimeline';
import { WeekScheduleView } from './components/WeekScheduleView';
import { FriendsView } from './components/FriendsView';
import { DirectoryView } from './components/DirectoryView';
import { SettingsView } from './components/SettingsView';

import { AddLessonModal } from './components/Modals/AddLessonModal';
import { LessonDetailsModal } from './components/Modals/LessonDetailsModal';
import { ScheduleOverrideModal } from './components/Modals/ScheduleOverrideModal';
import { MorningNotificationModal } from './components/Modals/MorningNotificationModal';
import { NotificationCenterModal } from './components/Modals/NotificationCenterModal';
import { WeekSettingsModal } from './components/Modals/WeekSettingsModal';
import { CalendarSyncModal } from './components/Modals/CalendarSyncModal';
import { AddFriendModal } from './components/Modals/AddFriendModal';
import { SharedWindowsModal } from './components/Modals/SharedWindowsModal';
import { AuthModal } from './components/Modals/AuthModal';
import { DeviceSyncModal } from './components/Modals/DeviceSyncModal';
import { ToastContainer, ConfirmDialogModal } from './components/UI/ToastAndConfirm';

import { Lesson } from './types';

const MainAppContent: React.FC = () => {
  const { activeMainTab, importMyScheduleByShareCode, showToast } = useSchedule();

  // Modal visibility states
  const [isAddLessonOpen, setIsAddLessonOpen] = useState(false);
  const [addLessonInitialDay, setAddLessonInitialDay] = useState<number>(1);
  const [addLessonTargetFriendId, setAddLessonTargetFriendId] = useState<string | undefined>(undefined);
  const [editingLesson, setEditingLesson] = useState<Lesson | undefined>(undefined);

  const [selectedLesson, setSelectedLesson] = useState<{
    lesson: Lesson;
    isFriend?: boolean;
    friendName?: string;
    friendId?: string;
  } | null>(null);

  const [overrideLesson, setOverrideLesson] = useState<Lesson | null>(null);
  const [isMorningNotifOpen, setIsMorningNotifOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isWeekSettingsOpen, setIsWeekSettingsOpen] = useState(false);
  const [isCalendarSyncOpen, setIsCalendarSyncOpen] = useState(false);
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [isSharedWindowsOpen, setIsSharedWindowsOpen] = useState(false);
  const [isDeviceSyncOpen, setIsDeviceSyncOpen] = useState(false);

  // Check URL for ?code=STU-XXXX on mount safely without alerts
  React.useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code) {
        // Clean URL parameter without reloading
        window.history.replaceState({}, document.title, window.location.pathname);

        importMyScheduleByShareCode(code).then((res) => {
          if (res.success) {
            showToast(`✅ Расписание загружено по коду ${code.toUpperCase()} (${res.lessonCount} пар)`, 'success');
          } else {
            showToast(res.message || `Не удалось загрузить код ${code}`, 'error');
          }
        }).catch((err) => {
          showToast(`Ошибка загрузки: ${String(err)}`, 'error');
        });
      }
    } catch (e) {
      console.warn('URL param parse error', e);
    }
  }, [importMyScheduleByShareCode, showToast]);

  const handleOpenAddLesson = (targetFriendId?: string, initialDay?: number) => {
    setEditingLesson(undefined);
    setAddLessonTargetFriendId(targetFriendId === 'my' ? undefined : targetFriendId);
    if (initialDay) setAddLessonInitialDay(initialDay);
    setIsAddLessonOpen(true);
  };

  const handleEditLesson = (lesson: Lesson, targetFriendId?: string) => {
    setEditingLesson(lesson);
    setAddLessonInitialDay(lesson.dayOfWeek);
    setAddLessonTargetFriendId(targetFriendId);
    setIsAddLessonOpen(true);
  };

  return (
    <div className="min-h-screen bg-zinc-100/50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors">
      {/* Top Header */}
      <Header
        onOpenNotificationModal={() => setIsNotificationCenterOpen(true)}
        onOpenWeekSettingsModal={() => setIsWeekSettingsOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenCalendarSyncModal={() => setIsCalendarSyncOpen(true)}
        onOpenDeviceSyncModal={() => setIsDeviceSyncOpen(true)}
      />

      {/* Main App Container */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 pt-4">
        {activeMainTab === 'today' && (
          <TodayTimeline
            onSelectLesson={(lesson, isFriend, friendName, friendId) =>
              setSelectedLesson({ lesson, isFriend, friendName, friendId })
            }
            onOpenAddLessonModal={handleOpenAddLesson}
            onOpenOverrideModal={(lesson) => setOverrideLesson(lesson)}
            onOpenSharedWindowsModal={() => setIsSharedWindowsOpen(true)}
          />
        )}

        {activeMainTab === 'schedule' && (
          <WeekScheduleView
            onSelectLesson={(lesson) => setSelectedLesson({ lesson })}
            onOpenAddLessonModal={(day) => handleOpenAddLesson(undefined, day)}
            onExportWeekToDocs={() => setIsCalendarSyncOpen(true)}
          />
        )}

        {activeMainTab === 'friends' && (
          <FriendsView
            onOpenAddFriendModal={() => setIsAddFriendOpen(true)}
            onOpenAddLessonForFriend={(friendId) => handleOpenAddLesson(friendId)}
            onSelectLesson={(lesson, isFriend, friendName, friendId) =>
              setSelectedLesson({ lesson, isFriend, friendName, friendId })
            }
          />
        )}

        {activeMainTab === 'directory' && <DirectoryView />}

        {activeMainTab === 'settings' && (
          <SettingsView
            onOpenWeekSettingsModal={() => setIsWeekSettingsOpen(true)}
            onOpenCalendarSyncModal={() => setIsCalendarSyncOpen(true)}
            onOpenDeviceSyncModal={() => setIsDeviceSyncOpen(true)}
          />
        )}
      </main>

      {/* Bottom Sticky Navigation */}
      <Navigation onOpenAddLessonModal={() => handleOpenAddLesson()} />

      {/* MODALS */}
      <AddLessonModal
        isOpen={isAddLessonOpen}
        onClose={() => {
          setIsAddLessonOpen(false);
          setEditingLesson(undefined);
        }}
        initialDayOfWeek={addLessonInitialDay}
        targetFriendId={addLessonTargetFriendId}
        initialLesson={editingLesson}
      />

      <LessonDetailsModal
        lesson={selectedLesson ? selectedLesson.lesson : null}
        isFriend={selectedLesson?.isFriend}
        friendName={selectedLesson?.friendName}
        friendId={selectedLesson?.friendId}
        onClose={() => setSelectedLesson(null)}
        onEditLesson={(l) => handleEditLesson(l, selectedLesson?.friendId)}
        onOpenOverride={(l) => setOverrideLesson(l)}
      />

      <ScheduleOverrideModal
        lesson={overrideLesson}
        isOpen={Boolean(overrideLesson)}
        onClose={() => setOverrideLesson(null)}
      />

      <NotificationCenterModal
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
      />

      <MorningNotificationModal
        isOpen={isMorningNotifOpen}
        onClose={() => setIsMorningNotifOpen(false)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <WeekSettingsModal
        isOpen={isWeekSettingsOpen}
        onClose={() => setIsWeekSettingsOpen(false)}
      />

      <CalendarSyncModal
        isOpen={isCalendarSyncOpen}
        onClose={() => setIsCalendarSyncOpen(false)}
      />

      <AddFriendModal
        isOpen={isAddFriendOpen}
        onClose={() => setIsAddFriendOpen(false)}
      />

      <SharedWindowsModal
        isOpen={isSharedWindowsOpen}
        onClose={() => setIsSharedWindowsOpen(false)}
      />

      <DeviceSyncModal
        isOpen={isDeviceSyncOpen}
        onClose={() => setIsDeviceSyncOpen(false)}
      />

      {/* Global In-App Toast & Confirm Dialogs */}
      <ToastContainer />
      <ConfirmDialogModal />
    </div>
  );
};

export default function App() {
  return (
    <ScheduleProvider>
      <MainAppContent />
    </ScheduleProvider>
  );
}
