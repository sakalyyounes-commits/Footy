import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cx } from '../../lib/misc';

export type Accent =
  | 'brand'
  | 'deen'
  | 'water'
  | 'nutrition'
  | 'sport'
  | 'sleep'
  | 'body'
  | 'finance'
  | 'habits'
  | 'journal'
  | 'tasks';

interface CardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  accent?: Accent;
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
  id?: string;
}

export function Card({ title, subtitle, icon, accent, action, className, children, id }: CardProps) {
  return (
    <section id={id} className={cx('card', accent && `accent-${accent}`, className)}>
      {(title || icon || action) && (
        <header className="card-header">
          {icon && <span className="icon-chip">{icon}</span>}
          <div className="grow">
            {title && <h2 className="card-title">{title}</h2>}
            {subtitle && <p className="card-sub">{subtitle}</p>}
          </div>
          {action && <div className="card-action">{action}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

/** Carte entièrement cliquable menant vers un module. */
export function LinkCard({
  to,
  accent,
  className,
  children,
}: {
  to: string;
  accent?: Accent;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link to={to} className={cx('card link-card', accent && `accent-${accent}`, className)}>
      {children}
    </Link>
  );
}
