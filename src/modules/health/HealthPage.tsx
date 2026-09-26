import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { MODULES, type ModuleDef } from '../../app/nav';
import { LinkCard } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/layout';
import { Meter } from '../../components/ui/progress';
import { startOfWeek } from '../../lib/dates';
import { formatDuration, formatMl, formatNumber } from '../../lib/format';
import { bmi, sleepMinutes } from '../../lib/health';
import { useToday } from '../../lib/hooks';
import { useLatestWeightKg, useNutritionTargets, useWaterGoal } from '../../store/selectors';
import { useStore } from '../../store/store';

function ModuleCard({ module: m, value, detail, progress }: { module: ModuleDef; value: ReactNode; detail: ReactNode; progress?: [number, number] }) {
  return (
    <LinkCard to={m.to} accent={m.accent}>
      <div className="row">
        <span className="icon-chip">
          <m.icon size={18} />
        </span>
        <span className="card-title grow">{m.label}</span>
        <ChevronRight size={18} className="subtle" />
      </div>
      <div style={{ marginTop: 12 }}>
        <div className="stat-value" style={{ fontSize: 24 }}>
          {value}
        </div>
        <div className="muted small">{detail}</div>
      </div>
      {progress && (
        <div style={{ marginTop: 10 }}>
          <Meter value={progress[0]} max={progress[1]} label={`${m.label} : progression`} />
        </div>
      )}
    </LinkCard>
  );
}

export function HealthPage() {
  const today = useToday();
  const water = useStore((s) => s.water);
  const meals = useStore((s) => s.meals);
  const workouts = useStore((s) => s.workouts);
  const sleep = useStore((s) => s.sleep);
  const goals = useStore((s) => s.settings.goals);
  const heightCm = useStore((s) => s.profile.heightCm);
  const waterGoal = useWaterGoal(today);
  const targets = useNutritionTargets();
  const weightKg = useLatestWeightKg();

  const waterToday = water.filter((w) => w.date === today).reduce((a, w) => a + w.ml, 0);
  const kcalToday = meals.filter((m) => m.date === today).reduce((a, m) => a + m.kcal, 0);
  const weekStart = startOfWeek(today);
  const sessions = workouts.filter((w) => w.date >= weekStart && w.date <= today).length;
  const lastNight = sleep.find((s) => s.date === today);

  return (
    <div className="stack-lg">
      <PageHeader title="Santé" subtitle="Hygiène de vie au quotidien" />
      <div className="grid cols-2">
        <ModuleCard
          module={MODULES.water}
          value={formatMl(waterToday)}
          detail={`sur ${formatMl(waterGoal.total)} aujourd’hui`}
          progress={[waterToday, waterGoal.total]}
        />
        <ModuleCard
          module={MODULES.nutrition}
          value={`${formatNumber(kcalToday)} kcal`}
          detail={targets.kcal ? `sur ${formatNumber(targets.kcal)} kcal` : 'Objectif à définir'}
          progress={targets.kcal ? [kcalToday, targets.kcal] : undefined}
        />
        <ModuleCard
          module={MODULES.sport}
          value={`${sessions} séance${sessions > 1 ? 's' : ''}`}
          detail={`cette semaine · objectif ${goals.workoutsPerWeek}`}
          progress={[sessions, goals.workoutsPerWeek]}
        />
        <ModuleCard
          module={MODULES.sleep}
          value={lastNight ? formatDuration(sleepMinutes(lastNight.bedtime, lastNight.wake)) : '—'}
          detail={lastNight ? `Coucher ${lastNight.bedtime} · réveil ${lastNight.wake}` : 'Nuit non renseignée'}
        />
        <ModuleCard
          module={MODULES.body}
          value={weightKg ? `${formatNumber(weightKg, 1)} kg` : '—'}
          detail={weightKg && heightCm ? `IMC ${formatNumber(bmi(weightKg, heightCm), 1)}` : 'Ajoutez votre poids et votre taille'}
        />
      </div>
    </div>
  );
}
