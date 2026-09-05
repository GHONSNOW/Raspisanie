import React, { useState } from 'react';
import { useSchedule } from '../../context/ScheduleContext';
import {
  X,
  User as UserIcon,
  LogIn,
  LogOut,
  Mail,
  Lock,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Share2,
  Users,
  Shield,
  Sparkles,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const {
    user,
    userProfile,
    updateUserProfile,
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    logout,
    syncWithCloud,
  } = useSchedule();

  const [mode, setMode] = useState<'view' | 'email_login' | 'email_register'>('view');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Profile editable fields
  const [editName, setEditName] = useState(() => userProfile?.displayName || '');
  const [editGroup, setEditGroup] = useState(() => userProfile?.group || '');
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await loginWithGoogle();
      setSuccessMsg('Успешный вход через Google!');
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1200);
    } catch (e: unknown) {
      const err = e as Error;
      setErrorMsg(err.message || 'Ошибка входа через Google. Попробуйте еще раз.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Пожалуйста, заполните все поля');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      if (mode === 'email_register') {
        await registerWithEmail(email, password, displayName || 'Студент');
        setSuccessMsg('Аккаунт успешно создан!');
      } else {
        await loginWithEmail(email, password);
        setSuccessMsg('Успешный вход в аккаунт!');
      }
      setTimeout(() => {
        setSuccessMsg(null);
        setMode('view');
        onClose();
      }, 1200);
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setErrorMsg('Неверный email или пароль');
      } else if (err.code === 'auth/email-already-in-use') {
        setErrorMsg('Аккаунт с таким email уже существует');
      } else if (err.code === 'auth/weak-password') {
        setErrorMsg('Пароль должен быть не менее 6 символов');
      } else {
        setErrorMsg(err.message || 'Ошибка авторизации');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const shareCode = userProfile?.shareCode || (user ? `STU-${user.uid.slice(0, 6).toUpperCase()}` : 'STU-DEMO01');

  const handleCopyCode = () => {
    navigator.clipboard.writeText(shareCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center">
              <UserIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {user ? 'Профиль и аккаунт' : 'Авторизация и профиль'}
              </h3>
              <p className="text-xs text-zinc-500">
                Разделение расписания и облачная синхронизация
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

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {mode === 'view' ? (
          <>
            {/* Active User Status Card */}
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 space-y-3">
              <div className="flex items-center gap-3">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="avatar"
                    className="w-11 h-11 rounded-full border border-zinc-200 dark:border-zinc-700 object-cover"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-200 font-bold text-base">
                    {(userProfile?.displayName || 'С')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {userProfile?.displayName || (user ? user.email : 'Локальный профиль')}
                  </h4>
                  <p className="text-xs text-zinc-500">
                    {user?.email ? user.email : 'Офлайн режим (данные изолированы)'}
                  </p>
                </div>
              </div>

              {/* Personal Share Code for Friends */}
              <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 block">
                    Код для синхронизации с друзьями:
                  </span>
                  <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    {shareCode}
                  </span>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Скопировано</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Скопировать</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Real Student Profile Editor */}
            <div className="space-y-2 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Данные студента
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
                >
                  {isEditingProfile ? 'Скрыть' : 'Редактировать'}
                </button>
              </div>

              {isEditingProfile ? (
                <div className="space-y-2 pt-1">
                  <div>
                    <label className="text-[11px] text-zinc-500 block mb-0.5">Имя и фамилия</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Например: Рамазан Халилов"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-500 block mb-0.5">Учебная группа</label>
                    <input
                      type="text"
                      value={editGroup}
                      onChange={(e) => setEditGroup(e.target.value)}
                      placeholder="Например: ИВТ-21 или ПМИ-3"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      updateUserProfile({ displayName: editName.trim() || 'Студент', group: editGroup.trim() });
                      setIsEditingProfile(false);
                      setSuccessMsg('Профиль успешно обновлен!');
                      setTimeout(() => setSuccessMsg(null), 1500);
                    }}
                    className="w-full py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Сохранить данные профиля
                  </button>
                </div>
              ) : (
                <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-0.5">
                  <p>
                    <span className="text-zinc-400">Группа:</span>{' '}
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {userProfile?.group ? userProfile.group : 'Не указана (нажмите Редактировать)'}
                    </span>
                  </p>
                </div>
              )}
            </div>

            {/* Login & Cloud Actions */}
            <div className="pt-2 space-y-2.5">
              {!user ? (
                <>
                  <button
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Войти через Google</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setMode('email_login')}
                      className="py-2 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Вход по Email</span>
                    </button>
                    <button
                      onClick={() => setMode('email_register')}
                      className="py-2 px-3 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      <UserIcon className="w-3.5 h-3.5" />
                      <span>Регистрация</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => syncWithCloud().then(() => setSuccessMsg('Синхронизировано с Firestore!'))}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:opacity-90"
                  >
                    <Cloud className="w-3.5 h-3.5" />
                    <span>Синхронизировать сейчас</span>
                  </button>

                  <button
                    onClick={logout}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Выйти</span>
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Email / Password Form */
          <form onSubmit={handleEmailAuth} className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                {mode === 'email_register' ? 'Создание учебного аккаунта' : 'Вход в аккаунт'}
              </span>
              <button
                type="button"
                onClick={() => setMode('view')}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Назад
              </button>
            </div>

            {mode === 'email_register' && (
              <div>
                <label className="text-[11px] font-medium text-zinc-500 block mb-1">
                  Имя и фамилия:
                </label>
                <input
                  type="text"
                  placeholder="Иван Петров"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                />
              </div>
            )}

            <div>
              <label className="text-[11px] font-medium text-zinc-500 block mb-1">Email:</label>
              <input
                type="email"
                required
                placeholder="student@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-zinc-500 block mb-1">Пароль:</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isLoading ? (
                  <span>Загрузка...</span>
                ) : mode === 'email_register' ? (
                  <span>Зарегистрироваться</span>
                ) : (
                  <span>Войти в аккаунт</span>
                )}
              </button>
            </div>
          </form>
        )}

        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
