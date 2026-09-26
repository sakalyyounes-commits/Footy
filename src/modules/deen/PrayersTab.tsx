import { Check, Clock, Moon, Plus, Undo2, Users, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Segmented } from '../../components/ui/controls';
import { Field, NumberInput } from '../../components/ui/Field';
import { DateNav } from '../../components/ui/layout';
import { Meter, Stat } from '../../components/ui/progress';
import { Sheet } from '../../components/ui/Sheet';
import { SUNNAH_ITEMS } from '../../data/deen';
import { formatTime, lastNDays, type ISODate } from '../../lib/dates';
import { formatNumber, formatPercent } from '../../lib/format';
import { useToday } from '../../lib/hooks';
import { cx } from '../../lib/misc';
import { getDayTimes, getNextPrayer, PRAYERS, STATUS_LABELS, suggestStatus, TIME_KEYS, TIME_LABELS } from '../../lib/prayer';
import { currentStreak } from '../../lib/streaks';
import { useStore } from '../../store/store';
import type { PrayerName, PrayerStatus } from '../../store/types';
import { addQadaDone, setPrayer, setQadaInitial, toggleSunnah } from './actions';
import { computePrayerStats, missedCounts, prayedCount, qadaOutstanding } from './logic';
import { NextPrayerCard } from './NextPrayerCard';

const STATUS_BUTTONS: Array<{ status: PrayerStatus; icon: typeof Check }> = [
  { status: 'ontime', icon: Check },
  { status: 'late', icon: Clock },
  { status: 'missed', icon: X },
];

function PrayerTracker({ date }: { date: ISODate }) {
  const settings = useStore((s) => s.settings.prayer);
  const dayLog = useStore((s) => s.prayerLog[date]);
  const today = useToday();
  const times = useMemo(() => getDayTimes(settings, date), [settings, date]);
  const current = date === today ? getNextPrayer(settings, new Date()).current : null;

  return (
    <Card
      title="Horaires & suivi"
      subtitle={`${prayedCount(dayLog)} / 5 prières accomplies`}
      accent="deen"
    >
      <div>
        {TIME_KEYS.map((key) => {
          if (key === 'sunrise') {
            return (
              <div key={key} className="prayer-row sunrise">
                <span className="prayer-time">{formatTime(times.sunrise)}</span>
                <div className="grow">
                  <span className="prayer-name">{TIME_LABELS.sunrise.fr}</span>{' '}
                  <span className="ar muted">{TIME_LABELS.sunrise.ar}</span>
                  <div className="xsmall muted">Fin du temps de Fajr</div>
                </div>
              </div>
            );
          }
          const p = key as PrayerName;
          const log = dayLog?.[p];
          return (
            <div key={key} className={cx('prayer-row', current === p && 'current')}>
              <span className="prayer-time">{formatTime(times[p])}</span>
              <div className="grow">
                <span className="prayer-name">{TIME_LABELS[p].fr}</span> <span className="ar muted">{TIME_LABELS[p].ar}</span>
                <div className="xsmall muted">{log ? STATUS_LABELS[log.status] + (log.jamaa ? ' · en groupe' : '') : current === p ? 'En cours' : ' '}</div>
              </div>
              <div className="status-group">
                {STATUS_BUTTONS.map(({ status, icon: Icon }) => (
                  <button
                    key={status}
                    type="button"
                    className={cx('status-btn', status)}
                    aria-pressed={log?.status === status}
                    aria-label={`${TIME_LABELS[p].fr} : ${STATUS_LABELS[status]}`}
                    title={STATUS_LABELS[status]}
                    onClick={() => setPrayer(date, p, log?.status === status ? null : { status, jamaa: status === 'missed' ? false : log?.jamaa })}
                  >
                    <Icon size={18} strokeWidth={2.4} />
                  </button>
                ))}
                <button
                  type="button"
                  className="status-btn jamaa"
                  aria-pressed={!!log?.jamaa}
                  aria-label={`${TIME_LABELS[p].fr} : en groupe / à la mosquée`}
                  title="En groupe / à la mosquée"
                  onClick={() =>
                    setPrayer(date, p, {
                      status: log && log.status !== 'missed' ? log.status : suggestStatus(settings, date, p, new Date()),
                      jamaa: !log?.jamaa,
                    })
                  }
                >
                  <Users size={17} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="row between xsmall muted" style={{ marginTop: 10 }}>
        <span className="row" style={{ gap: 4 }}>
          <Moon size={13} /> Milieu de la nuit {formatTime(times.midnight)}
        </span>
        <span>Dernier tiers {formatTime(times.lastThird)}</span>
      </div>
      <p className="xsmall subtle" style={{ marginTop: 6 }}>
        ✓ à l’heure · ⏱ en retard · ✕ manquée · 👥 en groupe
      </p>
    </Card>
  );
}

function SunnahCard({ date }: { date: ISODate }) {
  const day = useStore((s) => s.sunnahLog[date]);
  return (
    <Card title="Prières surérogatoires" subtitle="Sunna & nawafil" accent="deen">
      <div className="list">
        {SUNNAH_ITEMS.map((item) => {
          const done = !!day?.[item.key];
          return (
            <div key={item.key} className="list-item">
              <div className="grow">
                <div className="item-title">{item.label}</div>
                <div className="item-meta">{item.detail}</div>
              </div>
              <button
                type="button"
                className={cx('check-btn', done && 'done')}
                aria-pressed={done}
                aria-label={item.label}
                onClick={() => toggleSunnah(date, item.key)}
              >
                <Check size={20} strokeWidth={3} />
              </button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function StatsCard() {
  const today = useToday();
  const prayerLog = useStore((s) => s.prayerLog);
  const [period, setPeriod] = useState<7 | 30>(7);
  const days = lastNDays(period, today);
  const stats = computePrayerStats(prayerLog, days);
  const prayed = stats.ontime + stats.late;
  const streak = currentStreak((d) => prayedCount(prayerLog[d]) === 5, today);

  const weakest = PRAYERS.map((p) => ({ p, rate: stats.perPrayer[p].ontime / period })).sort((a, b) => a.rate - b.rate)[0];

  return (
    <Card title="Statistiques" accent="deen" action={<Segmented ariaLabel="Période" value={period} onChange={setPeriod} options={[{ value: 7, label: '7\u00a0j' }, { value: 30, label: '30\u00a0j' }]} />}>
      <div className="stats">
        <Stat label="Accomplies" value={formatPercent(prayed / stats.expected)} sub={`${prayed} / ${stats.expected}`} />
        <Stat label="À l’heure" value={formatPercent(stats.ontime / stats.expected)} sub={`${stats.ontime} prières`} />
        <Stat label="En groupe" value={formatNumber(stats.jamaa)} sub="prières" />
        <Stat label="Série" value={`${streak} j`} sub="avec les 5 prières" />
      </div>
      <div className="stack-sm" style={{ marginTop: 14 }}>
        <div className="small bold">À l’heure, par prière</div>
        {PRAYERS.map((p) => {
          const s = stats.perPrayer[p];
          return (
            <div key={p} className="row">
              <span className="small" style={{ width: 64 }}>
                {TIME_LABELS[p].fr}
              </span>
              <div className="grow">
                <Meter value={s.ontime} max={period} label={`${TIME_LABELS[p].fr} à l’heure`} />
              </div>
              <span className="small muted num" style={{ width: 48, textAlign: 'right' }}>
                {s.ontime}/{period}
              </span>
            </div>
          );
        })}
        {prayed > 0 && weakest && weakest.rate < 0.8 && (
          <p className="tip" style={{ marginTop: 4 }}>
            💡 {TIME_LABELS[weakest.p].fr} est la prière à renforcer en priorité
            {weakest.p === 'fajr' ? ' : couchez-vous plus tôt et programmez un réveil avant l’adhan.' : '.'}
          </p>
        )}
      </div>
    </Card>
  );
}

function QadaCard() {
  const qada = useStore((s) => s.qada);
  const prayerLog = useStore((s) => s.prayerLog);
  const [editOpen, setEditOpen] = useState(false);
  const missed = useMemo(() => missedCounts(prayerLog), [prayerLog]);
  const outstanding = qadaOutstanding(qada, missed);
  const total = PRAYERS.reduce((a, p) => a + outstanding[p], 0);
  const done = PRAYERS.reduce((a, p) => a + qada.done[p], 0);

  return (
    <Card
      title="Rattrapage (qada)"
      subtitle={total ? `${formatNumber(total)} prière${total > 1 ? 's' : ''} à rattraper` : 'Aucune prière à rattraper'}
      accent="deen"
      action={
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditOpen(true)}>
          Dette initiale
        </button>
      }
    >
      <div className="list">
        {PRAYERS.map((p) => (
          <div key={p} className="list-item">
            <div className="grow">
              <div className="item-title">{TIME_LABELS[p].fr}</div>
              <div className="item-meta">
                {formatNumber(outstanding[p])} restante{outstanding[p] > 1 ? 's' : ''} · {formatNumber(qada.done[p])} faite{qada.done[p] > 1 ? 's' : ''}
              </div>
            </div>
            {qada.done[p] > 0 && (
              <button type="button" className="icon-btn sm" onClick={() => addQadaDone(p, -1)} aria-label={`Annuler un rattrapage de ${TIME_LABELS[p].fr}`}>
                <Undo2 size={16} />
              </button>
            )}
            <button type="button" className="btn btn-soft btn-sm" disabled={outstanding[p] === 0} onClick={() => addQadaDone(p)}>
              <Plus size={16} /> Faite
            </button>
          </div>
        ))}
      </div>
      <p className="xsmall muted" style={{ marginTop: 8 }}>
        Les prières marquées « manquée » s’ajoutent automatiquement. {done > 0 && `${formatNumber(done)} rattrapage${done > 1 ? 's' : ''} accompli${done > 1 ? 's' : ''}, qu’Allah les accepte.`}
      </p>

      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title="Dette initiale" accent="deen">
        <div className="stack">
          <p className="muted small">
            Nombre de prières manquées avant d’utiliser l’application (estimation). Exemple : 1 an sans prier ≈ 365 par prière.
          </p>
          {PRAYERS.map((p) => (
            <Field key={p} label={TIME_LABELS[p].fr}>
              {(id) => <NumberInput id={id} value={qada.initial[p]} onChange={(v) => v !== null && setQadaInitial(p, v)} decimals={false} min={0} allowEmpty={false} />}
            </Field>
          ))}
          <button type="button" className="btn btn-primary" onClick={() => setEditOpen(false)}>
            Terminé
          </button>
        </div>
      </Sheet>
    </Card>
  );
}

export function PrayersTab() {
  const today = useToday();
  const [date, setDate] = useState<ISODate>(today);
  return (
    <div className="stack-lg">
      {date === today && <NextPrayerCard />}
      <DateNav value={date} onChange={setDate} />
      <div className="grid cols-2">
        <PrayerTracker date={date} />
        <div className="stack-lg">
          <SunnahCard date={date} />
          {date !== today && (
            <button type="button" className="btn btn-secondary" onClick={() => setDate(today)}>
              Revenir à aujourd’hui
            </button>
          )}
        </div>
      </div>
      <div className="grid cols-2">
        <StatsCard />
        <QadaCard />
      </div>
    </div>
  );
}
