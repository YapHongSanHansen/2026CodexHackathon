// hooks/useToast.tsx — minimal toast provider for copy/confirm notices.
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

type ToastTone = 'ok' | 'info' | 'warn';
interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastApi {
  push: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const push = useCallback((message: string, tone: ToastTone = 'ok') => {
    const id = seq.current++;
    setToasts((t) => [...t, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 2200);
  }, []);

  const api = useMemo<ToastApi>(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={[
              'pointer-events-auto flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm shadow-lg backdrop-blur',
              'animate-[toastIn_180ms_ease-out]',
              t.tone === 'ok'
                ? 'border-forge-600/50 bg-ink-800/90 text-forge-400'
                : t.tone === 'warn'
                ? 'border-ember-500/50 bg-ink-800/90 text-ember-400'
                : 'border-ink-600 bg-ink-800/90 text-slate-200',
            ].join(' ')}
          >
            <span aria-hidden>
              {t.tone === 'ok' ? '✓' : t.tone === 'warn' ? '⚠' : 'ℹ'}
            </span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
