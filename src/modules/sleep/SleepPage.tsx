import { Moon, Pencil, Plus, Sunrise } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BarChart } from '../../components/charts/BarChart';
import { Card } from '../../components/ui/Card';
import { StarRating, Switch } from '../../components/ui/controls';
import { Field } from '../../components/ui/Field';
import { EmptyState, PageHeader } from '../../components/ui/layout';
import { Stat } from '../../components/ui/progress';
import { Sheet } from '../../components/ui/Sheet';
import { toast } from '../../components/ui/toast';
import { addDays, formatRelativeDay, formatShort, isISODate, lastNDays, todayISO } from '../../lib/dates';
import { formatDuration, formatNumber } from '../../lib/format';
import { averageClockTime, sleepMinutes } from '../../lib/health';
import { useToday } from '../../lib/hooks';
import { average, uid } from '../../lib/misc';
import { removeItem } from '../../store/helpers';
import { update, useStore } from '../../store/store';
import type { Rating, SleepEntry } from '../../store/types';

export const QUALITY_LABELS = ['Très mauvaise', 'Mauvaise', 'Correcte', 'Bonne', 'Excellente'];

/** Enregistre la nuit (une seule par date de réveil). */
export function saveSleep(entry: SleepEntry): void {
  update((s) => ({ sleep: [...s.sleep.filter((e) => e.id !== entry.id && e.date !== entry.date), entry] }));
}

export function SleepSheet({ open, onClose, entry }: { open: boolean; onClose: () => void; entry?: SleepEntry | null }) {
  return (
    <Sheet open={open} onClose={onClose} title={entry ? 'Modifier la nuit' : 'Ma nuit'} accent="sleep">
      <SleepForm entry={entry ?? null} onDone={onClose} />
    </Sheet>
  );
}

function SleepForm({ entry, onDone }: { entry: SleepEntry | null; onDone: () => void }) {
  const existing = useStore((s) => s.sleep);
  const [date, setDate] = useState(entry?.date ?? todayISO());
  const last = useMemo(() => [...existing].sort((a, b) => b.date.localeCompare(a.date))[0], [existing]);
  const [bedtime, setBedtime] = useState(entry?.bedtime ?? last?.bedtime ?? '23:00');
  const [wake, setWake] = useState(entry?.wake ?? last?.wake ?? '06:30');
  const [quality, setQuality] = useState<Rating>(entry?.quality ?? 3);
  const [fajr, setFajr] = useState(entry?.fajr ?? false);
  const [note, setNote] = useState(entry?.note ?? '');

  const minutes = sleepMinutes(bedtime, wake);
  const replaces = !entry && existing.some((e) => e.date === date);

  return (
    <div className="stack">
      <Field label="Nuit se terminant le" hint={replaces ? 'Une nuit existe déjà à cette date : elle sera remplacée.' : undefined}>
        {(id) => (
          <input id={id} type="date" className="input" value={date} max={todayISO()} onChange={(e) => isISODate(e.target.value) && setDate(e.target.value)} />
        )}
      </Field>
      <div className="form-row">
        <Field label="Coucher">{(id) => <input id={id} type="time" className="input" value={bedtime} onChange={(e) => setBedtime(e.target.value)} />}</Field>
        <Field label="Réveil">{(id) => <input id={id} type="time" className="input" value={wake} onChange={(e) => setWake(e.target.value)} />}</Field>
      </div>
      <div className="banner accent-sleep">
        <Moon size={18} className="banner-icon" />
        <span>
          Durée : <strong>{formatDuration(minutes)}</strong>
        </span>
      </div>
      <Field label={`Qualité : ${QUALITY_LABELS[quality - 1]}`}>{() => <StarRating value={quality} onChange={setQuality} labels={QUALITY_LABELS} />}</Field>
      <Switch checked={fajr} onChange={setFajr} label="Réveillé(e) pour Fajr" />
      <Field label="Note (optionnel)">
        {(id) => <input id={id} className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Réveils nocturnes, rêves, café tardif…" />}
      </Field>
      <div className="sheet-actions">
        {entry && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              removeItem('sleep', entry.id, 'Nuit supprimée');
              onDone();
            }}
          >
            Supprimer
          </button>
        )}
        <button
          type="button"
          className="btn btn-primary btn-lg grow"
          onClick={() => {
            saveSleep({ id: entry?.id ?? uid(), date, bedtime, wake, quality, fajr, note: note.trim() || undefined });
            toast('Nuit enregistrée 🌙');
            onDone();
          }}
        >
          Enregistrer
        </button>
      </div>
    </div>
  );
}

const TIPS = [
  'Couchez-vous tôt après Icha : c’est la sunna et cela facilite le réveil pour Fajr.',
  'Gardez des horaires réguliers, même le week-end : le corps adore la constance.',
  'Pas d’écran 30 à 60 minutes avant de dormir ; lisez ou récitez les adhkar du coucher.',
  'Une courte sieste (qaylula) de 15 à 20 minutes en début d’après-midi recharge sans perturber la nuit.',
  'Évitez le café et le thé après 16 h, et les repas lourds juste avant de dormir.',
];

export function SleepPage() {
  const today = useToday();
  const entries = useStore((s) => s.sleep);
  const goalHours = useStore((s) => s.settings.goals.sleepHours);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SleepEntry | null>(null);

  const byDate = useMemo(() => new Map(entries.map((e) => [e.date, e])), [entries]);
  const lastNight = byDate.get(today);
  const last7 = lastNDays(7, today).map((d) => byDate.get(d)).filter((e): e is SleepEntry => !!e);
  const avgMin = average(last7.map((e) => sleepMinutes(e.bedtime, e.wake)));
  const avgQuality = average(last7.map((e) => e.quality));
  const fajrNights = last7.filter((e) => e.fajr).length;

  const chartData = lastNDays(14, today).map((d) => {
    const e = byDate.get(d);
    return {
      key: d,
      label: String(Number(d.slice(8))),
      fullLabel: `Nuit du ${formatShort(addDays(d, -1))} au ${formatShort(d)}`,
      value: e ? sleepMinutes(e.bedtime, e.wake) / 60 : 0,
      current: d === today,
    };
  });

  const history = [...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);

  const openEntry = (e: SleepEntry | null) => {
    setEditing(e);
    setOpen(true);
  };

  return (
    <div className="stack-lg accent-sleep">
      <PageHeader
        title="Sommeil"
        subtitle={`Objectif : ${formatNumber(goalHours, 1)} h par nuit`}
        back={{ to: '/sante', label: 'Santé' }}
        actions={
          <button type="button" className="btn btn-primary btn-sm" onClick={() => openEntry(lastNight ?? null)}>
            <Plus size={16} /> Ma nuit
          </button>
        }
      />

      <div className="grid cols-2">
        <Card
          title="Dernière nuit"
          icon={<Moon size={18} />}
          accent="sleep"
          action={
            lastNight && (
              <button type="button" className="icon-btn" onClick={() => openEntry(lastNight)} aria-label="Modifier la dernière nuit">
                <Pencil size={18} />
              </button>
            )
          }
        >
          {lastNight ? (
            <div className="stack-sm">
              <span className="big-number">{formatDuration(sleepMinutes(lastNight.bedtime, lastNight.wake))}</span>
              <span className="muted">
                {lastNight.bedtime} → {lastNight.wake} · {QUALITY_LABELS[lastNight.quality - 1]}
              </span>
              {lastNight.fajr && (
                <span className="badge accent" style={{ alignSelf: 'flex-start' }}>
                  <Sunrise size={13} /> Réveillé(e) pour Fajr
                </span>
              )}
            </div>
          ) : (
            <EmptyState
              emoji="🌙"
              title="Nuit non renseignée"
              text="Notez vos heures de coucher et de réveil."
              action={
                <button type="button" className="btn btn-primary" onClick={() => openEntry(null)}>
                  Enregistrer ma nuit
                </button>
              }
            />
          )}
        </Card>

        <Card title="Moyenne sur 7 nuits" accent="sleep">
          <div className="stats">
            <Stat label="Durée" value={avgMin ? formatDuration(avgMin) : '—'} />
            <Stat label="Qualité" value={avgQuality ? `${formatNumber(avgQuality, 1)} / 5` : '—'} />
            <Stat label="Coucher" value={averageClockTime(last7.map((e) => e.bedtime)) ?? '—'} />
            <Stat label="Réveil" value={averageClockTime(last7.map((e) => e.wake)) ?? '—'} />
          </div>
          <p className="muted small" style={{ marginTop: 10 }}>
            {last7.length ? `Réveillé(e) pour Fajr ${fajrNights} nuit${fajrNights > 1 ? 's' : ''} sur ${last7.length}.` : 'Aucune nuit cette semaine.'}
          </p>
        </Card>
      </div>

      <Card title="14 dernières nuits" subtitle="Durée de sommeil">
        <BarChart
          title="Durée de sommeil sur 14 nuits"
          data={chartData}
          color="var(--c-sleep)"
          goal={goalHours}
          formatValue={(v) => (v ? formatDuration(v * 60) : '—')}
          formatTick={(v) => `${v} h`}
          valueHeader="Durée"
        />
      </Card>

      <Card title="Historique">
        {history.length === 0 ? (
          <p className="muted small">Vos nuits apparaîtront ici.</p>
        ) : (
          <div className="list">
            {history.map((e) => (
              <button key={e.id} type="button" className="list-item" onClick={() => openEntry(e)}>
                <div className="grow">
                  <div className="item-title">{formatRelativeDay(e.date, today)}</div>
                  <div className="item-meta">
                    {e.bedtime} → {e.wake} · {'★'.repeat(e.quality)}
                    {e.fajr ? ' · Fajr ✓' : ''}
                  </div>
                </div>
                <span className="bold nowrap">{formatDuration(sleepMinutes(e.bedtime, e.wake))}</span>
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card title="Hygiène du sommeil" accent="sleep">
        <ul className="stack-sm tip" style={{ margin: 0, paddingLeft: 18 }}>
          {TIPS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </Card>

      <SleepSheet open={open} onClose={() => setOpen(false)} entry={editing} />
    </div>
  );
}
