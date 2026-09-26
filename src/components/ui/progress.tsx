import type { ReactNode } from 'react';
import { clamp, cx } from '../../lib/misc';
import type { Accent } from './Card';

interface RingProps {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  accent?: Accent;
  children?: ReactNode;
  label: string;
}

/** Anneau de progression (jauge circulaire). */
export function ProgressRing({ value, max, size = 120, stroke = 10, accent, children, label }: RingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = max > 0 ? clamp(value / max, 0, 1) : 0;
  return (
    <div
      className={cx('ring', accent && `accent-${accent}`)}
      style={{ width: size, height: size }}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
        <circle
          className="ring-value"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - ratio)}
          style={{ opacity: ratio === 0 ? 0 : 1 }}
        />
      </svg>
      {children && <div className="ring-center">{children}</div>}
    </div>
  );
}

interface MeterProps {
  value: number;
  max: number;
  state?: 'ok' | 'warning' | 'over';
  thin?: boolean;
  label: string;
  className?: string;
}

/** Barre de progression linéaire ; la couleur signale l'état (alerte, dépassement). */
export function Meter({ value, max, state = 'ok', thin, label, className }: MeterProps) {
  const ratio = max > 0 ? clamp(value / max, 0, 1) : 0;
  return (
    <div
      className={cx('meter', thin && 'thin', state !== 'ok' && state, className)}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
    >
      <span style={{ width: `${ratio * 100}%` }} />
    </div>
  );
}

export function Stat({ label, value, sub }: { label: ReactNode; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}
