import React, { useState } from 'react';
import { useSchedule } from '../../context/ScheduleContext';
import { Friend } from '../../types';
import { X, Users, UserPlus, QrCode, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingFriend?: Friend | null;
}

export const AddFriendModal: React.FC<AddFriendModalProps> = ({
  isOpen,
  onClose,
  editingFriend,
}) => {
  const { addFriend, updateFriend, importFriendByShareCode } = useSchedule();

  const [mode, setMode] = useState<'manual' | 'code'>('manual');
  const [firstName, setFirstName] = useState(editingFriend?.firstName || '');
  const [lastName, setLastName] = useState(editingFriend?.lastName || '');
  const [nickname, setNickname] = useState(editingFriend?.nickname || '');
  const [group, setGroup] = useState(editingFriend?.group || '');
  const [avatarUrl, setAvatarUrl] = useState(editingFriend?.avatarUrl || '');

  const [shareCodeInput, setShareCodeInput] = useState('');
  const [codeStatus, setCodeStatus] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) return;

    if (editingFriend) {
      updateFriend(editingFriend.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        nickname: nickname.trim() || undefined,
        group: group.trim(),
        avatarUrl: avatarUrl.trim() || undefined,
      });
    } else {
      addFriend({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        nickname: nickname.trim() || undefined,
        group: group.trim() || 'Группа 1',
        avatarUrl: avatarUrl.trim() || undefined,
      });
    }

    onClose();
  };

  const handleImportByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareCodeInput.trim()) return;

    setIsImporting(true);
    setCodeStatus(null);
    setCodeError(null);

    const clean = shareCodeInput.trim().toUpperCase();

    const res = await importFriendByShareCode(clean);
    setIsImporting(false);
    if (res.success) {
      setCodeStatus(`Друг ${res.friendName || ''} успешно добавлен по коду!`);
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      setCodeError(res.error || 'Не удалось найти расписание по указанному коду');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {editingFriend ? 'Редактировать друга' : 'Добавить друга'}
              </h3>
              <p className="text-xs text-zinc-500">
                Следите за расписанием одногруппников и находите общие окна
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

        {!editingFriend && (
          <div className="flex p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold">
            <button
              onClick={() => setMode('manual')}
              className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                mode === 'manual'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Вручную
            </button>
            <button
              onClick={() => setMode('code')}
              className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                mode === 'code'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              По коду друга
            </button>
          </div>
        )}

        {mode === 'code' && !editingFriend ? (
          <form onSubmit={handleImportByCode} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Код расписания друга (например STU-XXXXXX)
              </label>
              <input
                type="text"
                required
                placeholder="STU-XXXXXX"
                value={shareCodeInput}
                onChange={(e) => setShareCodeInput(e.target.value)}
                className="w-full p-2.5 font-mono text-sm uppercase bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder:normal-case"
              />
              <p className="text-[11px] text-zinc-400 mt-1">
                Друг может скопировать свой код в окне своего профиля
              </p>
            </div>

            {codeStatus && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{codeStatus}</span>
              </div>
            )}

            {codeError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{codeError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={isImporting}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 disabled:opacity-50"
              >
                {isImporting ? 'Импорт...' : 'Добавить по коду'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Имя *
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ахмед"
                  className="w-full p-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Фамилия
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Магомедов"
                  className="w-full p-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Короткое имя / Никнейм
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Ахмед"
                  className="w-full p-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Учебная группа
                </label>
                <input
                  type="text"
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  placeholder="ИВТ-21"
                  className="w-full p-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Ссылка на фото (необязательно)
              </label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
                className="w-full p-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
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
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90"
              >
                {editingFriend ? 'Сохранить' : 'Добавить друга'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
