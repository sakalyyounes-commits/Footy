import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { cx } from '../../lib/misc';
import type { Accent } from './Card';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  accent?: Accent;
  wide?: boolean;
}

/**
 * Fenêtre modale : feuille glissant du bas sur mobile, boîte centrée sur grand écran.
 * S'appuie sur <dialog> (gestion native du focus et de la touche Échap).
 */
export function Sheet({ open, onClose, title, children, footer, accent, wide }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      onCloseRef.current();
    };
    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, []);

  return (
    <dialog
      ref={ref}
      className={cx('sheet', wide && 'wide', accent && `accent-${accent}`)}
      aria-label={typeof title === 'string' ? title : undefined}
      onClick={(e) => {
        // Clic sur le fond (en dehors du contenu) : fermeture.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {open && (
        <>
          <div className="sheet-handle" aria-hidden />
          <div className="sheet-header">
            <h2>{title}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Fermer">
              <X size={20} />
            </button>
          </div>
          <div className="sheet-body">{children}</div>
          {footer && <div className="sheet-footer">{footer}</div>}
        </>
      )}
    </dialog>
  );
}
