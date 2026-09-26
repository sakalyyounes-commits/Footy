import { Check, Clock, MapPin, X } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { formatTime, todayISO } from '../../lib/dates';
import { formatCountdown } from '../../lib/format';
import { formatHijri, toHijri } from '../../lib/hijri';
import { useNow } from '../../lib/hooks';
import { cx } from '../../lib/misc';
import { getDayTimes, getNextPrayer, PRAYERS, suggestStatus, TIME_LABELS } from '../../lib/prayer';
import { useStore } from '../../store/store';
import type { PrayerName } from '../../store/types';
import { setPrayer } from './actions';

const STATUS_ICON = { ontime: Check, late: Clock, missed: X };

/** Carte « prochaine prière » avec compte à rebours et suivi rapide des 5 prières du jour. */
export function NextPrayerCard({ showLink = false }: { showLink?: boolean }) {
  const now = useNow(15_000);
  const settings = useStore((s) => s.settings.prayer);
  const today = todayISO(now);
  const dayLog = useStore((s) => s.prayerLog[today]);

  const times = useMemo(() => getDayTimes(settings, today), [settings, today]);
  const next = getNextPrayer(settings, now);
  const hijri = formatHijri(toHijri(today, settings.hijriOffset));

  const toggle = (p: PrayerName) => {
    const current = dayLog?.[p];
    if (current) setPrayer(today, p, null);
    else setPrayer(today, p, { status: suggestStatus(settings, today, p, new Date()) });
  };

  return (
    <section className="hero" aria-label="Prochaine prière">
      <div className="row between top">
        <div>
          <div className="hero-label">{next.key === 'sunrise' ? 'Lever du soleil' : 'Prochaine prière'}</div>
          <div className="row" style={{ gap: 10, alignItems: 'baseline' }}>
            <span className="hero-title">{TIME_LABELS[next.key].fr}</span>
            <span className="hero-ar ar">{TIME_LABELS[next.key].ar}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="hero-time">{formatTime(next.time)}</div>
          <div className="hero-meta">dans {formatCountdown(next.time.getTime() - now.getTime())}</div>
        </div>
      </div>

      <div className="row between hero-meta" style={{ margin: '10px 0 14px' }}>
        <span className="row" style={{ gap: 4 }}>
          <MapPin size={14} /> {settings.label}
        </span>
        <span>{hijri}</span>
      </div>

      <div className="prayer-pills">
        {PRAYERS.map((p) => {
          const log = dayLog?.[p];
          const Icon = log ? STATUS_ICON[log.status] : null;
          const isCurrent = next.current === p && !log;
          return (
            <button
              key={p}
              type="button"
              className={cx('prayer-pill', log?.status, isCurrent && 'current')}
              onClick={() => toggle(p)}
              aria-pressed={!!log}
              aria-label={`${TIME_LABELS[p].fr} ${formatTime(times[p])}${log ? ' : faite' : ' : marquer comme faite'}`}
            >
              <span className="pill-icon">{Icon && <Icon size={14} strokeWidth={3} />}</span>
              <span>{TIME_LABELS[p].fr}</span>
              <span className="pill-time">{formatTime(times[p])}</span>
            </button>
          );
        })}
      </div>

      {showLink && (
        <Link to="/din" className="btn btn-hero btn-sm btn-block" style={{ marginTop: 12 }}>
          Détails, sunna et statistiques
        </Link>
      )}
    </section>
  );
}
