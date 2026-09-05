import React, { useState } from 'react';
import { useSchedule } from '../../context/ScheduleContext';
import {
  X,
  Smartphone,
  Copy,
  Check,
  QrCode,
  CloudUpload,
  Download,
  Upload,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Share2,
  Trash2,
  FileJson,
  UserCheck,
} from 'lucide-react';

interface DeviceSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeviceSyncModal: React.FC<DeviceSyncModalProps> = ({ isOpen, onClose }) => {
  const {
    user,
    userProfile,
    updateUserProfile,
    myLessons,
    teachers,
    classrooms,
    publishScheduleToCloud,
    importMyScheduleByShareCode,
    importFriendByShareCode,
    exportScheduleJSON,
    importScheduleJSON,
    purgeAllLegacyData,
    showToast,
    showConfirm,
  } = useSchedule();

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedDirectLink, setCopiedDirectLink] = useState(false);
  const [customCodeInput, setCustomCodeInput] = useState(userProfile?.shareCode || 'STU-STUDENT');
  const [importCodeInput, setImportCodeInput] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'links' | 'cloud' | 'file' | 'clean'>('links');

  if (!isOpen) return null;

  // Dynamically compute the current host URL
  const getDetectedUrl = () => {
    if (typeof window !== 'undefined' && window.location) {
      return (window.location.origin + window.location.pathname).replace(/\/$/, '');
    }
    return '';
  };
  const baseUrl = getDetectedUrl();
  const currentCode = userProfile?.shareCode || 'STU-STUDENT';
  const directScheduleUrl = baseUrl
    ? `${baseUrl}?code=${encodeURIComponent(currentCode)}`
    : `?code=${encodeURIComponent(currentCode)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(directScheduleUrl)}`;

  const handleCopy = (text: string, type: 'link' | 'code' | 'direct') => {
    navigator.clipboard.writeText(text);
    if (type === 'link') {
      setCopiedLink(true);
      showToast('Ссылка на приложение скопирована', 'info');
      setTimeout(() => setCopiedLink(false), 2000);
    } else if (type === 'code') {
      setCopiedCode(true);
      showToast(`Код ${text} скопирован`, 'info');
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedDirectLink(true);
      showToast('Прямая ссылка на расписание скопирована', 'success');
      setTimeout(() => setCopiedDirectLink(false), 2000);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    setPublishStatus(null);
    const code = (customCodeInput || currentCode).trim().toUpperCase();
    const res = await publishScheduleToCloud(code);
    setIsPublishing(false);
    if (res.success) {
      setPublishStatus({ type: 'success', text: res.message });
      showToast(res.message, 'success');
    } else {
      setPublishStatus({ type: 'error', text: res.message });
      showToast(res.message, 'error');
    }
  };

  const handlePublishAndCopy = async () => {
    setIsPublishing(true);
    setPublishStatus(null);
    const code = (customCodeInput || currentCode).trim().toUpperCase();
    const res = await publishScheduleToCloud(code);
    setIsPublishing(false);
    if (res.success) {
      const link = `${baseUrl}?code=${encodeURIComponent(code)}`;
      navigator.clipboard.writeText(link);
      setCopiedDirectLink(true);
      setTimeout(() => setCopiedDirectLink(false), 3000);
      showToast(`Опубликовано! Ссылка на расписание скопирована`, 'success');
      setPublishStatus({ type: 'success', text: `Расписание сохранено в облаке и прямая ссылка скопирована в буфер обмена!` });
    } else {
      setPublishStatus({ type: 'error', text: res.message });
      showToast(res.message, 'error');
    }
  };

  const handleImportAsMine = async () => {
    if (!importCodeInput.trim()) return;
    setIsImporting(true);
    setImportStatus(null);
    const res = await importMyScheduleByShareCode(importCodeInput.trim());
    setIsImporting(false);
    if (res.success) {
      setImportStatus({ type: 'success', text: res.message });
      setImportCodeInput('');
    } else {
      setImportStatus({ type: 'error', text: res.message });
    }
  };

  const handleImportAsFriend = async () => {
    if (!importCodeInput.trim()) return;
    setIsImporting(true);
    setImportStatus(null);
    const res = await importFriendByShareCode(importCodeInput.trim());
    setIsImporting(false);
    if (res.success) {
      setImportStatus({ type: 'success', text: `Друг «${res.friendName || 'Друг'}» успешно добавлен!` });
      setImportCodeInput('');
    } else {
      setImportStatus({ type: 'error', text: res.error || 'Ошибка при добавлении друга' });
    }
  };

  const handleExportFile = () => {
    const jsonStr = exportScheduleJSON();
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schedule_${currentCode}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const res = importScheduleJSON(content);
        if (res.success) {
          showToast(res.message, 'success');
          onClose();
        } else {
          showToast(res.message, 'error');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handlePurge = () => {
    showConfirm({
      title: 'Полный сброс кеша?',
      message: 'ВНИМАНИЕ: Это полностью сотрет весь локальный кеш браузера, удалит любые остаточные данные и восстановит исходно чистый профиль. Продолжить?',
      confirmText: 'Сбросить кеш',
      isDestructive: true,
      onConfirm: () => {
        purgeAllLegacyData();
        showToast('Локальный кеш полностью очищен! Приложение в чистом состоянии.', 'success');
        onClose();
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl space-y-5 my-auto max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Синхронизация между устройствами
              </h2>
              <p className="text-xs text-zinc-500">
                Откройте расписание на телефоне, планшете или компьютере
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1 text-xs font-medium">
          <button
            onClick={() => setActiveTab('links')}
            className={`flex-1 py-2 rounded-lg transition-all text-center ${
              activeTab === 'links'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            📱 Ссылки и QR
          </button>
          <button
            onClick={() => setActiveTab('cloud')}
            className={`flex-1 py-2 rounded-lg transition-all text-center ${
              activeTab === 'cloud'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            ☁️ Облачный код
          </button>
          <button
            onClick={() => setActiveTab('file')}
            className={`flex-1 py-2 rounded-lg transition-all text-center ${
              activeTab === 'file'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            📁 Файл JSON
          </button>
          <button
            onClick={() => setActiveTab('clean')}
            className={`flex-1 py-2 rounded-lg transition-all text-center ${
              activeTab === 'clean'
                ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-semibold shadow-xs'
                : 'text-zinc-500 hover:text-red-600'
            }`}
          >
            🧹 Сброс
          </button>
        </div>

        {/* TAB 1: LINKS & QR CODE */}
        {activeTab === 'links' && (
          <div className="space-y-4">
            {/* Direct App Link */}
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                1. Ссылка на приложение
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={baseUrl}
                  className="flex-1 text-xs font-mono px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-700 dark:text-zinc-300 focus:outline-hidden select-all"
                />
                <button
                  onClick={() => handleCopy(baseUrl, 'link')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:opacity-90 transition-all cursor-pointer whitespace-nowrap shadow-xs"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Скопировано!' : 'Копировать'}</span>
                </button>
                <a
                  href={baseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  title="Открыть в новой вкладке"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Direct Schedule Link with Code */}
            <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-800 dark:text-blue-300">
                  2. Прямая ссылка на ваше расписание
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-bold">
                  {currentCode}
                </span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-300">
                При переходе по этой ссылке с любого устройства расписание загрузится автоматически.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                <input
                  type="text"
                  readOnly
                  value={directScheduleUrl}
                  className="flex-1 text-xs font-mono px-3 py-2 bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-900/60 rounded-xl text-zinc-700 dark:text-zinc-300 focus:outline-hidden select-all truncate"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(directScheduleUrl, 'direct')}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-all cursor-pointer whitespace-nowrap shadow-xs"
                >
                  {copiedDirectLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedDirectLink ? 'Скопировано!' : 'Копировать'}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePublishAndCopy}
                  disabled={isPublishing}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-all cursor-pointer whitespace-nowrap shadow-xs disabled:opacity-50"
                  title="Сначала обновить облако, а затем скопировать ссылку"
                >
                  <CloudUpload className="w-3.5 h-3.5" />
                  <span>{isPublishing ? 'Сохранение...' : 'Обновить в облаке и скопировать'}</span>
                </button>
              </div>
            </div>

            {/* Visual QR Code */}
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60">
              <div className="bg-white p-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-xs shrink-0">
                <img
                  src={qrUrl}
                  alt="QR Code"
                  className="w-32 h-32 object-contain rounded-lg"
                  loading="lazy"
                />
              </div>
              <div className="space-y-1.5 text-center sm:text-left">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center justify-center sm:justify-start gap-1.5">
                  <QrCode className="w-4 h-4 text-blue-500" />
                  Отсканируйте камерой смартфона
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Наведите камеру телефона на этот QR-код, чтобы моментально открыть приложение на мобильном устройстве.
                </p>
                <div className="pt-1">
                  <button
                    onClick={handlePublish}
                    disabled={isPublishing}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    <CloudUpload className="w-3.5 h-3.5" />
                    {isPublishing ? 'Обновляем в облаке...' : 'Обновить облачную копию перед сканированием'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CLOUD CODE */}
        {activeTab === 'cloud' && (
          <div className="space-y-4">
            {/* Publish Section */}
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <CloudUpload className="w-4 h-4 text-emerald-500" />
                    Опубликовать расписание в облако
                  </h4>
                  <p className="text-xs text-zinc-500">
                    Сохраните текущее расписание ({myLessons.length} пар), чтобы открыть его по коду
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customCodeInput}
                  onChange={(e) => setCustomCodeInput(e.target.value.toUpperCase())}
                  placeholder="Например: STU-STUDENT"
                  className="flex-1 text-xs font-mono font-bold uppercase px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100"
                />
                <button
                  onClick={handlePublish}
                  disabled={isPublishing}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-all cursor-pointer shadow-xs disabled:opacity-50 whitespace-nowrap"
                >
                  <CloudUpload className="w-3.5 h-3.5" />
                  <span>{isPublishing ? 'Публикация...' : 'Опубликовать'}</span>
                </button>
              </div>

              {publishStatus && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    publishStatus.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                      : 'bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-300'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>{publishStatus.text}</span>
                </div>
              )}
            </div>

            {/* Import Section */}
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 space-y-3">
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-blue-500" />
                  Загрузить расписание на этом устройстве
                </h4>
                <p className="text-xs text-zinc-500">
                  Введите код расписания, опубликованного с другого устройства или одногруппником
                </p>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={importCodeInput}
                  onChange={(e) => setImportCodeInput(e.target.value.toUpperCase())}
                  placeholder="Введите код (например STU-STUDENT)"
                  className="w-full text-xs font-mono font-bold uppercase px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleImportAsMine}
                    disabled={isImporting || !importCodeInput.trim()}
                    className="flex-1 py-2 px-3 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:opacity-90 transition-all cursor-pointer shadow-xs disabled:opacity-40"
                  >
                    Загрузить как Моё расписание
                  </button>
                  <button
                    onClick={handleImportAsFriend}
                    disabled={isImporting || !importCodeInput.trim()}
                    className="flex-1 py-2 px-3 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-all cursor-pointer disabled:opacity-40"
                  >
                    Добавить как Друга
                  </button>
                </div>
              </div>

              {importStatus && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    importStatus.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                      : 'bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-300'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>{importStatus.text}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: FILE JSON */}
        {activeTab === 'file' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 space-y-3">
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <FileJson className="w-4 h-4 text-blue-500" />
                  Экспорт и импорт в файл
                </h4>
                <p className="text-xs text-zinc-500">
                  Сохраните файл со всеми парами, преподавателями и аудиториями на компьютер или передайте через Telegram/диск.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  onClick={handleExportFile}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs font-semibold hover:border-zinc-400 transition-all shadow-xs cursor-pointer"
                >
                  <Download className="w-4 h-4 text-blue-500" />
                  <span>Скачать .json файл</span>
                </button>

                <label className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs font-semibold hover:border-zinc-400 transition-all shadow-xs cursor-pointer">
                  <Upload className="w-4 h-4 text-emerald-500" />
                  <span>Загрузить из .json файла</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleImportFile}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CLEAN RESET */}
        {activeTab === 'clean' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-800/40 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-300 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-red-900 dark:text-red-200">
                    Полная очистка локального кеша
                  </h4>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                    Если в вашем браузере остались старые тестовые данные или кешированные записи, эта кнопка полностью сотрет все локальные ключи и вернет систему в абсолютно чистое исходное состояние.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handlePurge}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-all cursor-pointer shadow-xs"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Стереть все локальные данные и кеш</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-blue-500" />
            {user ? `Вошли как: ${user.email}` : 'Режим: Автономный / По коду'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
