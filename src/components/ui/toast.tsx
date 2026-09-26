import { create } from 'zustand';
import { uid } from '../../lib/misc';

interface ToastItem {
  id: string;
  message: string;
  tone: 'default' | 'error';
  action?: { label: string; run: () => void };
}

const useToasts = create<{ items: ToastItem[] }>(() => ({ items: [] }));

function dismiss(id: string) {
  useToasts.setState((s) => ({ items: s.items.filter((t) => t.id !== id) }));
}

export function toast(message: string, opts: { tone?: 'default' | 'error'; action?: ToastItem['action']; duration?: number } = {}) {
  const id = uid();
  useToasts.setState((s) => ({
    items: [...s.items.slice(-2), { id, message, tone: opts.tone ?? 'default', action: opts.action }],
  }));
  setTimeout(() => dismiss(id), opts.duration ?? (opts.action ? 5000 : 2600));
}

/** Notification avec bouton « Annuler ». */
export function toastUndo(message: string, undo: () => void) {
  toast(message, { action: { label: 'Annuler', run: undo } });
}

export function Toaster() {
  const items = useToasts((s) => s.items);
  return (
    <div className="toaster" aria-live="polite" role="status">
      {items.map((t) => (
        <div key={t.id} className={t.tone === 'error' ? 'toast error' : 'toast'}>
          <span>{t.message}</span>
          {t.action && (
            <button
              type="button"
              onClick={() => {
                t.action?.run();
                dismiss(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
