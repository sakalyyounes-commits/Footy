import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { Link } from 'react-router';
import {
  addDays,
  addMonths,
  formatLong,
  formatMonth,
  formatRelativeDay,
  isISODate,
  todayISO,
  type ISODate,
  type MonthKey,
} from '../../lib/dates';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** Lien de retour affiché sur mobile (ex. vers le hub Santé). */
  back?: { to: string; label: string };
}

export function PageHeader({ title, subtitle, actions, back }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="grow">
        {back && (
          <Link to={back.to} className="back-link">
            <ChevronLeft size={18} />
            {back.label}
          </Link>
        )}
        <h1>{title}</h1>
        {subtitle && <p className="page-sub">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

interface EmptyStateProps {
  emoji: string;
  title: string;
  text?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ emoji, title, text, action }: EmptyStateProps) {
  return (
    <div className="empty">
      <div className="empty-emoji" aria-hidden>
        {emoji}
      </div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

function openPicker(input: HTMLInputElement | null) {
  if (!input) return;
  try {
    input.showPicker();
  } catch {
    input.focus();
    input.click();
  }
}

interface DateNavProps {
  value: ISODate;
  onChange: (value: ISODate) => void;
  /** Interdit de naviguer dans le futur. */
  noFuture?: boolean;
}

/** Navigation jour par jour avec sélecteur de date natif. */
export function DateNav({ value, onChange, noFuture = true }: DateNavProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const today = todayISO();
  const main = formatRelativeDay(value, today);
  const long = formatLong(value);
  return (
    <div className="date-nav">
      <button type="button" className="icon-btn" onClick={() => onChange(addDays(value, -1))} aria-label="Jour précédent">
        <ChevronLeft size={20} />
      </button>
      <button type="button" className="date-label" onClick={() => openPicker(inputRef.current)}>
        {main}
        {main !== long && <small>{long}</small>}
      </button>
      <input
        ref={inputRef}
        type="date"
        tabIndex={-1}
        aria-hidden
        value={value}
        max={noFuture ? today : undefined}
        onChange={(e) => isISODate(e.target.value) && onChange(e.target.value)}
      />
      <button
        type="button"
        className="icon-btn"
        onClick={() => onChange(addDays(value, 1))}
        disabled={noFuture && value >= today}
        aria-label="Jour suivant"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}

interface MonthNavProps {
  value: MonthKey;
  onChange: (value: MonthKey) => void;
}

export function MonthNav({ value, onChange }: MonthNavProps) {
  const current = todayISO().slice(0, 7);
  return (
    <div className="date-nav">
      <button type="button" className="icon-btn" onClick={() => onChange(addMonths(value, -1))} aria-label="Mois précédent">
        <ChevronLeft size={20} />
      </button>
      <button type="button" className="date-label" onClick={() => onChange(current)} title="Revenir au mois en cours">
        {formatMonth(value)}
        {value === current && <small>Mois en cours</small>}
      </button>
      <button type="button" className="icon-btn" onClick={() => onChange(addMonths(value, 1))} aria-label="Mois suivant">
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
