import React from 'react';
import { useSchedule } from '../../context/ScheduleContext';
import { AlertCircle, CheckCircle2, Info, X, Trash2, HelpCircle } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useSchedule();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => {
        let bgClass = 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-700/50';
        let Icon = Info;
        let iconColor = 'text-blue-400';

        if (toast.type === 'success') {
          Icon = CheckCircle2;
          iconColor = 'text-emerald-400';
        } else if (toast.type === 'error') {
          Icon = AlertCircle;
          iconColor = 'text-red-400';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-2xl shadow-xl border text-xs sm:text-sm font-medium transition-all transform translate-y-0 ${bgClass}`}
          >
            <div className="flex items-center gap-2.5">
              <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />
              <span className="leading-snug">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-lg opacity-60 hover:opacity-100 transition-opacity cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export const ConfirmDialogModal: React.FC = () => {
  const { confirmDialog, hideConfirm } = useSchedule();

  if (!confirmDialog) return null;

  const handleConfirm = () => {
    try {
      confirmDialog.onConfirm();
    } finally {
      hideConfirm();
    }
  };

  const handleCancel = () => {
    if (confirmDialog.onCancel) {
      confirmDialog.onCancel();
    }
    hideConfirm();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              confirmDialog.isDestructive !== false
                ? 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400'
                : 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
            }`}
          >
            {confirmDialog.isDestructive !== false ? (
              <Trash2 className="w-5 h-5" />
            ) : (
              <HelpCircle className="w-5 h-5" />
            )}
          </div>

          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {confirmDialog.title}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              {confirmDialog.message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-xs font-medium rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            {confirmDialog.cancelText || 'Отмена'}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`px-4 py-2 text-xs font-semibold rounded-xl text-white shadow-xs transition-all cursor-pointer ${
              confirmDialog.isDestructive !== false
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90'
            }`}
          >
            {confirmDialog.confirmText || (confirmDialog.isDestructive !== false ? 'Удалить' : 'Подтвердить')}
          </button>
        </div>
      </div>
    </div>
  );
};
