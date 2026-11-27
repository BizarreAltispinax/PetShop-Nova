import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useDb } from '../../store/db';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useDb();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[70] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none no-print">
      {toasts.map((t) => {
        const isErr = t.type === 'error';
        const isOk = t.type === 'success';
        return (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 rounded-[12px] border p-4 shadow-lg bg-white ${
              isErr
                ? 'border-red-200'
                : isOk
                ? 'border-emerald-200'
                : 'border-teal-200'
            }`}
          >
            {isErr ? (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            ) : isOk ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <Info className="w-5 h-5 text-[#0F8B8D] shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-900">{t.title}</div>
              {t.message && <p className="text-xs text-slate-600 mt-0.5">{t.message}</p>}
            </div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-slate-700 cursor-pointer"
              aria-label="Cerrar notificación"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
