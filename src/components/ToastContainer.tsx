import { CheckCircle2, Info, AlertCircle, X } from 'lucide-react';

export interface ToastItem {
  id: string;
  type: 'success' | 'info' | 'error';
  message: string;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const Icon =
          t.type === 'success' ? CheckCircle2 : t.type === 'error' ? AlertCircle : Info;
        const iconColor =
          t.type === 'success'
            ? 'text-emerald-400'
            : t.type === 'error'
              ? 'text-rose-400'
              : 'text-sky-400';

        return (
          <div
            key={t.id}
            className="animate-pop-in pointer-events-auto flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-xs font-medium shadow-xl backdrop-blur-md"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-primary)',
              boxShadow: 'var(--shadow-overlay)',
            }}
          >
            <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />
            <span className="max-w-[280px] leading-snug">{t.message}</span>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              className="ml-1 rounded p-0.5 transition-colors hover:bg-[var(--bg-hover)]"
              style={{ color: 'var(--text-muted)' }}
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
