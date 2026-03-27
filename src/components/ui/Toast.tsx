import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  action?: ToastAction;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success', action?: ToastAction) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev.slice(-2), { id, message, type, action }]);
    timers.current[id] = setTimeout(() => removeToast(id), 4000);
  }, [removeToast]);

  const icons = { success: CheckCircle2, error: XCircle, info: Info };
  const colors = {
    success: 'bg-emerald-500',
    error: 'bg-red-500',
    info: 'bg-primary',
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-28 left-0 right-0 z-[300] flex flex-col items-center gap-2 pointer-events-none px-6">
        <AnimatePresence>
          {toasts.map(toast => {
            const Icon = icons[toast.type];
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className={`max-w-md w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-2xl text-white pointer-events-auto ${colors[toast.type]}`}
              >
                <Icon size={18} className="shrink-0" />
                <p className="text-sm font-semibold flex-1">{toast.message}</p>
                {toast.action && (
                  <button
                    onClick={() => { toast.action!.onClick(); removeToast(toast.id); }}
                    className="text-xs font-bold underline underline-offset-2 opacity-90 hover:opacity-100 active:scale-90 transition-all shrink-0"
                  >
                    {toast.action.label}
                  </button>
                )}
                <button onClick={() => removeToast(toast.id)} className="opacity-70 hover:opacity-100 active:scale-90 transition-all">
                  <X size={16} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
