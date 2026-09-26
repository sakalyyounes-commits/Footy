import { CalendarHeart } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Field, NumberInput } from '../../components/ui/Field';
import { MonthNav } from '../../components/ui/layout';
import { Stat } from '../../components/ui/progress';
import { FAST_KINDS } from '../../data/deen';
import { addDays, formatLong, formatRelativeDay, monthDays, monthKey, weekdayIndex, type ISODate } from '../../lib/dates';
import { daysUntilRamadan, fastSuggestionsFor, formatHijri, toHijri } from '../../lib/hijri';
import { useToday } from '../../lib/hooks';
import { cx } from '../../lib/misc';
import { useStore } from '../../store/store';
import type { FastKind } from '../../store/types';
import { setFast, setFastQadaOwed } from './actions';

export function FastTab() {
  const today = useToday();
  const fasts = useStore((s) => s.fasts);
  const owed = useStore((s) => s.fastQadaOwed);
  const hijriOffset = useStore((s) => s.settings.prayer.hijriOffset);
  const [month, setMonth] = useState(monthKey(today));
  const [selected, setSelected] = useState<ISODate>(today);

  const days = monthDays(month);
  const leading = weekdayIndex(days[0]);
  const selectedKind = fasts[selected] ?? null;
  const qadaDone = useMemo(() => Object.values(fasts).filter((k) => k === 'qada').length, [fasts]);
  const yearCounts = useMemo(() => {
    const year = today.slice(0, 4);
    const counts: Record<FastKind, number> = { ramadan: 0, qada: 0, sunna: 0, other: 0 };
    for (const [d, k] of Object.entries(fasts)) if (d.startsWith(year)) counts[k]++;
    return counts;
  }, [fasts, today]);

  const upcoming = useMemo(() => {
    const out: Array<{ date: ISODate; label: string; title: string; detail: string }> = [];
    for (let i = 0; i < 14 && out.length < 4; i++) {
      const d = addDays(today, i);
      for (const s of fastSuggestionsFor(d, hijriOffset)) {
        if (s.label.startsWith('Aïd') || s.label.includes('Six jours')) continue;
        const weekday = s.label === 'Lundi' || s.label === 'Jeudi';
        out.push({ date: d, label: s.label, title: weekday ? s.detail : s.label, detail: weekday ? '' : s.detail });
        break;
      }
    }
    return out;
  }, [today, hijriOffset]);

  const ramadanIn = daysUntilRamadan(today, hijriOffset);

  return (
    <div className="stack-lg">
      <div className="grid cols-2">
        <Card title="Calendrier des jeûnes" icon={<CalendarHeart size={18} />} accent="deen">
          <div className="stack">
            <MonthNav value={month} onChange={setMonth} />
            <div className="heatmap-cal" role="grid" aria-label="Jours de jeûne du mois">
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                <span key={i} className="cal-head" aria-hidden>
                  {d}
                </span>
              ))}
              {Array.from({ length: leading }, (_, i) => (
                <span key={`e${i}`} />
              ))}
              {days.map((d) => {
                const kind = fasts[d];
                return (
                  <button
                    key={d}
                    type="button"
                    className={cx('cal-day', kind && 'on', d === today && 'today', d === selected && 'selected')}
                    onClick={() => setSelected(d)}
                    aria-label={`${formatLong(d)}${kind ? ` : ${FAST_KINDS[kind].label}` : ''}`}
                    aria-pressed={d === selected}
                  >
                    {Number(d.slice(8))}
                  </button>
                );
              })}
            </div>
            <div className="divider" />
            <div className="stack-sm">
              <div className="bold">
                {formatRelativeDay(selected, today)} <span className="muted small">· {formatHijri(toHijri(selected, hijriOffset))}</span>
              </div>
              <div className="chips accent-deen" role="radiogroup" aria-label="Type de jeûne">
                {(Object.keys(FAST_KINDS) as FastKind[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    className="chip"
                    role="radio"
                    aria-checked={selectedKind === k}
                    onClick={() => setFast(selected, selectedKind === k ? null : k)}
                  >
                    <span aria-hidden>{FAST_KINDS[k].emoji}</span> {FAST_KINDS[k].label}
                  </button>
                ))}
              </div>
              {selected > today && <p className="xsmall muted">Vous pouvez planifier un jeûne à l’avance.</p>}
            </div>
          </div>
        </Card>

        <div className="stack-lg">
          <Card title="Jours recommandés" accent="deen">
            {ramadanIn !== null && (
              <p className="small" style={{ marginBottom: 10 }}>
                🌙 Ramadan dans <strong>{ramadanIn} jours</strong> (estimation, selon l’observation du croissant).
              </p>
            )}
            {upcoming.length === 0 ? (
              <p className="muted small">Aucun jour particulier dans les deux prochaines semaines.</p>
            ) : (
              <div className="list">
                {upcoming.map((u) => (
                  <div key={u.date} className="list-item">
                    <div className="grow">
                      <div className="item-title">{u.title}</div>
                      <div className="item-meta">
                        {formatRelativeDay(u.date, today)}
                        {u.detail ? ` · ${u.detail}` : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={cx('btn btn-sm', fasts[u.date] ? 'btn-secondary' : 'btn-soft')}
                      onClick={() => setFast(u.date, fasts[u.date] ? null : u.label === 'Ramadan' ? 'ramadan' : 'sunna')}
                    >
                      {fasts[u.date] ? 'Prévu ✓' : 'Je jeûne'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Jeûnes à rattraper" accent="deen">
            <div className="stack">
              <Field label="Jours dus (Ramadan manqués)">
                {(id) => <NumberInput id={id} value={owed} onChange={(v) => v !== null && setFastQadaOwed(v)} decimals={false} min={0} allowEmpty={false} />}
              </Field>
              <div className="stats">
                <Stat label="Rattrapés" value={qadaDone} />
                <Stat label="Restants" value={Math.max(0, owed - qadaDone)} />
              </div>
            </div>
          </Card>

          <Card title={`Bilan ${today.slice(0, 4)}`} accent="deen">
            <div className="stats">
              {(Object.keys(FAST_KINDS) as FastKind[]).map((k) => (
                <Stat key={k} label={FAST_KINDS[k].label} value={yearCounts[k]} sub="jours" />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
