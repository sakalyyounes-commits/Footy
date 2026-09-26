import { Footprints, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BarChart } from '../../components/charts/BarChart';
import { Card } from '../../components/ui/Card';
import { NumberInput } from '../../components/ui/Field';
import { EmptyState, PageHeader } from '../../components/ui/layout';
import { Meter, ProgressRing, Stat } from '../../components/ui/progress';
import { INTENSITY_LABELS, workoutType } from '../../data/workouts';
import { addDays, formatRelativeDay, formatShort, lastNDays, startOfWeek, type ISODate } from '../../lib/dates';
import { formatDuration, formatKcal, formatNumber } from '../../lib/format';
import { useToday } from '../../lib/hooks';
import { groupBy } from '../../lib/misc';
import { sumByDate } from '../../store/selectors';
import { useStore } from '../../store/store';
import type { Workout } from '../../store/types';
import { setSteps } from './actions';
import { WorkoutSheet } from './WorkoutSheet';

/** Nombre de semaines consécutives où l'objectif de séances est atteint. */
function weeksStreak(workouts: Workout[], goal: number, today: ISODate): number {
  if (goal <= 0) return 0;
  const perWeek = new Map<ISODate, number>();
  for (const w of workouts) perWeek.set(startOfWeek(w.date), (perWeek.get(startOfWeek(w.date)) ?? 0) + 1);
  let week = startOfWeek(today);
  if ((perWeek.get(week) ?? 0) < goal) week = addDays(week, -7);
  let n = 0;
  while ((perWeek.get(week) ?? 0) >= goal) {
    n++;
    week = addDays(week, -7);
  }
  return n;
}

export function SportPage() {
  const today = useToday();
  const workouts = useStore((s) => s.workouts);
  const steps = useStore((s) => s.steps);
  const goals = useStore((s) => s.settings.goals);
  const [editing, setEditing] = useState<Workout | null>(null);
  const [open, setOpen] = useState(false);

  const weekStart = startOfWeek(today);
  const thisWeek = workouts.filter((w) => w.date >= weekStart && w.date <= today);
  const weekMinutes = thisWeek.reduce((a, w) => a + w.durationMin, 0);
  const weekKcal = thisWeek.reduce((a, w) => a + w.kcal, 0);
  const streak = weeksStreak(workouts, goals.workoutsPerWeek, today);

  const minutesByDay = useMemo(() => sumByDate(workouts, (w) => w.durationMin), [workouts]);
  const last14 = lastNDays(14, today);
  const chartData = last14.map((d) => ({
    key: d,
    label: String(Number(d.slice(8))),
    fullLabel: formatShort(d),
    value: minutesByDay.get(d) ?? 0,
    current: d === today,
  }));

  const history = useMemo(() => {
    const sorted = [...workouts].sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts).slice(0, 60);
    return Object.entries(groupBy(sorted, (w) => w.date));
  }, [workouts]);

  const todaySteps = steps[today] ?? null;

  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };

  return (
    <div className="stack-lg accent-sport">
      <PageHeader
        title="Sport"
        subtitle="Séances, pas et régularité"
        back={{ to: '/sante', label: 'Santé' }}
        actions={
          <button type="button" className="btn btn-primary btn-sm" onClick={openNew}>
            <Plus size={16} /> Séance
          </button>
        }
      />

      <div className="grid cols-2">
        <Card title="Cette semaine" subtitle={`Objectif : ${goals.workoutsPerWeek} séances`} accent="sport">
          <div className="row gap-lg">
            <ProgressRing value={thisWeek.length} max={goals.workoutsPerWeek} size={116} stroke={11} accent="sport" label="Séances de la semaine">
              <span style={{ fontSize: 30, fontWeight: 800 }}>{thisWeek.length}</span>
              <span className="muted xsmall">sur {goals.workoutsPerWeek}</span>
            </ProgressRing>
            <div className="stack-sm grow">
              <Stat label="Temps actif" value={formatDuration(weekMinutes)} />
              <Stat label="Dépense" value={formatKcal(weekKcal)} />
            </div>
          </div>
          <p className="muted small" style={{ marginTop: 12 }}>
            {streak > 0
              ? `🔥 ${streak} semaine${streak > 1 ? 's' : ''} d’affilée à l’objectif`
              : 'Atteignez votre objectif cette semaine pour lancer une série.'}
          </p>
        </Card>

        <Card title="Pas du jour" subtitle={`Objectif : ${formatNumber(goals.steps)} pas`} icon={<Footprints size={18} />} accent="sport">
          <div className="stack">
            <NumberInput
              value={todaySteps}
              onChange={(v) => setSteps(today, v)}
              suffix="pas"
              decimals={false}
              min={0}
              max={100000}
              placeholder="Saisir vos pas"
              ariaLabel="Nombre de pas aujourd’hui"
            />
            <Meter value={todaySteps ?? 0} max={goals.steps} label="Progression des pas" />
            <p className="muted small">
              Recopiez le compteur de votre téléphone (Santé / Google Fit). ≈ {formatNumber(((todaySteps ?? 0) * 0.75) / 1000, 1)} km
              parcourus.
            </p>
          </div>
        </Card>
      </div>

      <Card title="14 derniers jours" subtitle="Minutes d’activité par jour">
        <BarChart
          title="Minutes d’activité sur 14 jours"
          data={chartData}
          color="var(--c-sport)"
          formatValue={(v) => formatDuration(v)}
          formatTick={(v) => `${v}`}
          valueHeader="Durée"
        />
      </Card>

      <Card title="Historique">
        {history.length === 0 ? (
          <EmptyState
            emoji="🏋️"
            title="Aucune séance enregistrée"
            text="Musculation, foot, course, marche… chaque séance compte."
            action={
              <button type="button" className="btn btn-primary" onClick={openNew}>
                <Plus size={18} /> Première séance
              </button>
            }
          />
        ) : (
          history.map(([date, items]) => (
            <div key={date}>
              <div className="list-group-title">
                <span>{formatRelativeDay(date, today)}</span>
                <span>{formatDuration(items.reduce((a, w) => a + w.durationMin, 0))}</span>
              </div>
              <div className="list">
                {items.map((w) => {
                  const t = workoutType(w.type);
                  return (
                    <button
                      key={w.id}
                      type="button"
                      className="list-item"
                      onClick={() => {
                        setEditing(w);
                        setOpen(true);
                      }}
                    >
                      <span className="emoji-chip" aria-hidden>
                        {t.emoji}
                      </span>
                      <div className="grow">
                        <div className="item-title">{t.name}</div>
                        <div className="item-meta">
                          {formatDuration(w.durationMin)} · {INTENSITY_LABELS[w.intensity]}
                          {w.distanceKm ? ` · ${formatNumber(w.distanceKm, 1)} km` : ''}
                          {w.note ? ` · ${w.note}` : ''}
                        </div>
                      </div>
                      <span className="small muted nowrap">{formatKcal(w.kcal)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </Card>

      <WorkoutSheet open={open} onClose={() => setOpen(false)} workout={editing} />
    </div>
  );
}
