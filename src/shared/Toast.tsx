import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

interface ToastOptions {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

const ToastContext = createContext<(t: ToastOptions) => void>(() => {});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(ToastOptions & { key: number }) | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback((t: ToastOptions) => {
    window.clearTimeout(timer.current);
    setToast({ ...t, key: Date.now() });
    timer.current = window.setTimeout(() => setToast(null), t.duration ?? (t.actionLabel ? 6000 : 3000));
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center px-4 pb-safe sm:pb-6">
        {toast && (
          <div
            key={toast.key}
            role="status"
            className="pointer-events-auto mb-20 flex w-full max-w-md animate-toast-in items-center gap-3 rounded-2xl bg-[#1A1A1A] px-4 py-3.5 text-[15px] text-white shadow-lg sm:mb-0"
          >
            <span className="flex-1">{toast.message}</span>
            {toast.actionLabel && (
              <button
                className="-my-2 -mr-2 min-h-11 rounded-lg px-2 font-semibold text-accent"
                onClick={() => {
                  toast.onAction?.();
                  setToast(null);
                }}
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
