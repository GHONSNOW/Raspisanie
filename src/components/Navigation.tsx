import React from 'react';
import { useSchedule } from '../context/ScheduleContext';
import { CalendarDays, Users, BookMarked, Settings, Plus, Sparkles, Clock } from 'lucide-react';

interface NavigationProps {
  onOpenAddLessonModal: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ onOpenAddLessonModal }) => {
  const { activeMainTab, setActiveMainTab } = useSchedule();

  const navItems = [
    { id: 'today', label: 'Сегодня', icon: Clock },
    { id: 'schedule', label: 'Расписание', icon: CalendarDays },
    { id: 'friends', label: 'Друзья', icon: Users },
    { id: 'directory', label: 'Справочник', icon: BookMarked },
    { id: 'settings', label: 'Настройки', icon: Settings },
  ] as const;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-lg border-t border-zinc-200 dark:border-zinc-800 transition-colors safe-area-pb">
      <div className="max-w-md mx-auto px-4 py-2 flex items-center justify-between relative">
        {/* Navigation buttons left of center */}
        <div className="flex items-center space-x-1 sm:space-x-3">
          {navItems.slice(0, 2).map((item) => {
            const Icon = item.icon;
            const isActive = activeMainTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveMainTab(item.id)}
                className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                  isActive
                    ? 'text-zinc-900 dark:text-zinc-100 font-semibold'
                    : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.2px]' : 'stroke-[1.8px]'}`} />
                <span className="text-[11px] mt-0.5 tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Central Prominent Quick-Add Button */}
        <div className="flex justify-center -mt-5">
          <button
            onClick={onOpenAddLessonModal}
            className="w-12 h-12 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer ring-4 ring-white dark:ring-zinc-900"
            aria-label="Добавить пару"
            title="Добавить новую пару"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Navigation buttons right of center */}
        <div className="flex items-center space-x-1 sm:space-x-3">
          {navItems.slice(2).map((item) => {
            const Icon = item.icon;
            const isActive = activeMainTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveMainTab(item.id)}
                className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                  isActive
                    ? 'text-zinc-900 dark:text-zinc-100 font-semibold'
                    : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.2px]' : 'stroke-[1.8px]'}`} />
                <span className="text-[11px] mt-0.5 tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
