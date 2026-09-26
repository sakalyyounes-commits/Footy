import { Minus, Plus, Star } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '../../lib/misc';

interface SegmentedProps<T extends string | number> {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: ReactNode }>;
  ariaLabel: string;
  className?: string;
}

/** Sélecteur à options exclusives (groupe de boutons radio). */
export function Segmented<T extends string | number>({ value, onChange, options, ariaLabel, className }: SegmentedProps<T>) {
  return (
    <div className={cx('segmented', className)} role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

interface TabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  tabs: Array<{ value: T; label: ReactNode }>;
  ariaLabel: string;
}

export function Tabs<T extends string>({ value, onChange, tabs, ariaLabel }: TabsProps<T>) {
  return (
    <div className="tabs" role="tablist" aria-label={ariaLabel}>
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          className="tab"
          aria-selected={t.value === value}
          onClick={() => onChange(t.value)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  format?: (value: number) => string;
  ariaLabel: string;
}

export function Stepper({ value, onChange, step = 1, min = 0, max = Infinity, format, ariaLabel }: StepperProps) {
  const set = (n: number) => onChange(Math.min(max, Math.max(min, Math.round(n * 100) / 100)));
  return (
    <div className="stepper" role="group" aria-label={ariaLabel}>
      <button type="button" onClick={() => set(value - step)} disabled={value <= min} aria-label="Diminuer">
        <Minus size={18} />
      </button>
      <span className="value" aria-live="polite">
        {format ? format(value) : value}
      </span>
      <button type="button" onClick={() => set(value + step)} disabled={value >= max} aria-label="Augmenter">
        <Plus size={18} />
      </button>
    </div>
  );
}

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
}

export function Switch({ checked, onChange, label, description }: SwitchProps) {
  return (
    <label className="switch-row">
      <span className="grow">
        <span className="bold" style={{ fontWeight: 600 }}>
          {label}
        </span>
        {description && <span className="field-hint" style={{ display: 'block' }}>{description}</span>}
      </span>
      <input type="checkbox" role="switch" className="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function StarRating({
  value,
  onChange,
  labels,
}: {
  value: number;
  onChange: (value: 1 | 2 | 3 | 4 | 5) => void;
  labels?: string[];
}) {
  return (
    <div className="star-rating" role="radiogroup" aria-label="Note">
      {([1, 2, 3, 4, 5] as const).map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={labels?.[n - 1] ?? `${n} sur 5`}
          className={cx(n <= value && 'on')}
          onClick={() => onChange(n)}
        >
          <Star size={26} fill={n <= value ? 'currentColor' : 'none'} strokeWidth={n <= value ? 1.5 : 1.8} />
        </button>
      ))}
    </div>
  );
}
