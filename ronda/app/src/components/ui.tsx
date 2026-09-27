import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { sfx } from '../audio/audio';
import { formatCoins, isRtl, useT } from '../i18n';
import { useSettings } from '../store/settings';
import { useToasts } from '../store/toast';
import { starPoints } from '../cards/CardDefs';

/** Pièce du jeu : un jeton de casino doré, vu de face. */
export function CoinIcon({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className="coin-icon" aria-hidden="true">
      <circle cx="20" cy="20" r="19" fill="#8a5a00" />
      <circle cx="20" cy="19" r="18" fill="url(#g-gold)" />
      <g stroke="#fffbe0" strokeWidth="4.5" strokeDasharray="4.2 5.2" fill="none" opacity="0.9">
        <circle cx="20" cy="19" r="15.8" />
      </g>
      <circle cx="20" cy="19" r="11" fill="#e8a410" stroke="#8a5a00" strokeWidth="1.2" />
      <polygon points={starPoints(20, 19, 7.5, 4.2)} fill="#fff3c4" stroke="#8a5a00" strokeWidth="0.8" />
      <ellipse cx="15" cy="12" rx="6" ry="3" fill="#fff" opacity="0.35" />
    </svg>
  );
}

export function Coins({ amount, onPlus }: { amount: number | null; onPlus?: () => void }) {
  const lang = useSettings((s) => s.lang);
  return (
    <button className="coins" onClick={onPlus} aria-label="coins">
      <CoinIcon />
      <span>{amount === null ? '—' : formatCoins(amount, lang)}</span>
      {onPlus && (
        <span className="plus">
          <Plus size={16} strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

export function TopBar({ title, onBack, right }: { title?: ReactNode; onBack?: () => void; right?: ReactNode }) {
  const rtl = isRtl(useSettings((s) => s.lang));
  const t = useT();
  return (
    <div className="topbar">
      {onBack && (
        <button
          className="icon-btn"
          aria-label={t('common.back')}
          onClick={() => {
            sfx('tap');
            onBack();
          }}
        >
          {rtl ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
        </button>
      )}
      <h1 className="title">{title}</h1>
      {right}
    </div>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented" role="group">
      {options.map((o) => (
        <button
          key={String(o.value)}
          aria-pressed={o.value === value}
          onClick={() => {
            sfx('tap');
            onChange(o.value);
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      className="switch"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => {
        sfx('tap');
        onChange(!checked);
      }}
    />
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose?: () => void;
  title?: ReactNode;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose?.();
          }}
        >
          <motion.div
            className="modal panel-ornate"
            initial={{ scale: 0.85, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          >
            {title && <h2 className="modal-title gold-text">{title}</h2>}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Toasts() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div className="toast-zone">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            className={`toast ${t.kind}`}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
          >
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Logo : « RONDA » en lettres dorées en relief, ruban « DYALNA » et calligraphie « روندا ». */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`logo ${compact ? 'compact' : ''}`}>
      <div className="logo-word">RONDA</div>
      <div className="logo-ribbon">DYALNA</div>
      {!compact && <div className="logo-ar">روندا</div>}
    </div>
  );
}

export function LevelBadge({ level }: { level: number }) {
  return <span className="level-badge">{level}</span>;
}

export function Row({ children, onClick, chevron = false }: { children: ReactNode; onClick?: () => void; chevron?: boolean }) {
  const rtl = isRtl(useSettings((s) => s.lang));
  return (
    <div
      className="list-row"
      role={onClick ? 'button' : undefined}
      onClick={
        onClick
          ? () => {
              sfx('tap');
              onClick();
            }
          : undefined
      }
      style={{ cursor: onClick ? 'pointer' : undefined }}
    >
      {children}
      {chevron && (rtl ? <ChevronLeft size={20} className="muted" /> : <ChevronRight size={20} className="muted" />)}
    </div>
  );
}
