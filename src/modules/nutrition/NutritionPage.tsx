import { Flame, Info, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { BarChart } from '../../components/charts/BarChart';
import { Card } from '../../components/ui/Card';
import { DateNav, PageHeader } from '../../components/ui/layout';
import { Meter, ProgressRing } from '../../components/ui/progress';
import { formatShort, formatWeekdayShort, lastNDays, weekdayLetter, type ISODate } from '../../lib/dates';
import { formatCompact, formatKcal, formatNumber } from '../../lib/format';
import { isRamadan } from '../../lib/hijri';
import { useToday } from '../../lib/hooks';
import { sumByDate, useNutritionTargets } from '../../store/selectors';
import { useStore } from '../../store/store';
import type { MealEntry, MealSlot } from '../../store/types';
import { defaultSlot, mealSlots, removeMeal } from './actions';
import { AddFoodSheet } from './AddFoodSheet';

export function MacroBars({ entries }: { entries: MealEntry[] }) {
  const targets = useNutritionTargets();
  const totals = entries.reduce(
    (a, m) => ({ protein: a.protein + m.protein, carbs: a.carbs + m.carbs, fat: a.fat + m.fat }),
    { protein: 0, carbs: 0, fat: 0 },
  );
  const rows = [
    { key: 'protein', label: 'Protéines', value: totals.protein, target: targets.protein },
    { key: 'carbs', label: 'Glucides', value: totals.carbs, target: targets.carbs },
    { key: 'fat', label: 'Lipides', value: totals.fat, target: targets.fat },
  ];
  return (
    <div className="macro-bars">
      {rows.map((r) => (
        <div key={r.key}>
          <div className="macro-label">
            <span>{r.label}</span>
            <span>
              <strong>{formatNumber(r.value)}</strong>/{r.target} g
            </span>
          </div>
          <Meter value={r.value} max={r.target} thin label={`${r.label} : ${formatNumber(r.value)} g sur ${r.target} g`} />
        </div>
      ))}
    </div>
  );
}

export function NutritionPage() {
  const today = useToday();
  const [date, setDate] = useState<ISODate>(today);
  const [sheetSlot, setSheetSlot] = useState<MealSlot | null>(null);

  const meals = useStore((s) => s.meals);
  const workouts = useStore((s) => s.workouts);
  const hijriOffset = useStore((s) => s.settings.prayer.hijriOffset);
  const targets = useNutritionTargets();

  const ramadan = isRamadan(date, hijriOffset);
  const slots = mealSlots(ramadan);
  const dayMeals = useMemo(() => meals.filter((m) => m.date === date), [meals, date]);
  const kcalByDay = useMemo(() => sumByDate(meals, (m) => m.kcal), [meals]);
  const consumed = kcalByDay.get(date) ?? 0;
  const burned = workouts.filter((w) => w.date === date).reduce((a, w) => a + w.kcal, 0);
  const remaining = targets.kcal ? targets.kcal - consumed : null;

  const last7 = lastNDays(7, today);
  const chartData = last7.map((d) => ({
    key: d,
    label: weekdayLetter(d),
    fullLabel: `${formatWeekdayShort(d)} ${formatShort(d)}`,
    value: kcalByDay.get(d) ?? 0,
    current: d === today,
  }));

  return (
    <div className="stack-lg accent-nutrition">
      <PageHeader
        title="Nutrition"
        subtitle={ramadan ? 'Mode Ramadan : s’hour, ftour et dîner' : 'Calories et macronutriments du jour'}
        back={{ to: '/sante', label: 'Santé' }}
      />
      <DateNav value={date} onChange={setDate} />

      <Card accent="nutrition">
        <div className="row gap-lg" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
          <ProgressRing value={consumed} max={targets.kcal ?? 2000} size={150} stroke={12} accent="nutrition" label="Calories consommées">
            <span style={{ fontSize: 28, fontWeight: 800 }}>{formatNumber(consumed)}</span>
            <span className="muted xsmall">{targets.kcal ? `sur ${formatNumber(targets.kcal)} kcal` : 'kcal'}</span>
          </ProgressRing>
          <div className="stack-sm grow" style={{ minWidth: 200 }}>
            {remaining !== null ? (
              <p className="bold" style={{ fontSize: 17 }}>
                {remaining >= 0 ? `${formatKcal(remaining)} restantes` : `${formatKcal(-remaining)} au-dessus de l’objectif`}
              </p>
            ) : (
              <p className="muted small">
                <Link to="/reglages" className="accent-text bold">
                  Complétez votre profil
                </Link>{' '}
                (âge, taille, poids) pour calculer vos besoins.
              </p>
            )}
            {burned > 0 && (
              <span className="badge accent" style={{ alignSelf: 'flex-start' }}>
                <Flame size={13} /> {formatKcal(burned)} brûlées au sport
              </span>
            )}
            <MacroBars entries={dayMeals} />
          </div>
        </div>
      </Card>

      <div className="grid cols-2">
        {slots.map((s) => {
          const entries = dayMeals.filter((m) => m.slot === s.slot).sort((a, b) => a.ts - b.ts);
          const kcal = entries.reduce((a, m) => a + m.kcal, 0);
          return (
            <Card
              key={s.slot}
              title={
                <span>
                  <span aria-hidden>{s.emoji}</span> {s.label}
                </span>
              }
              subtitle={entries.length ? formatKcal(kcal) : 'Rien pour l’instant'}
              action={
                <button type="button" className="btn btn-soft btn-sm" onClick={() => setSheetSlot(s.slot)}>
                  <Plus size={16} /> Ajouter
                </button>
              }
            >
              {entries.length > 0 && (
                <div className="list">
                  {entries.map((m) => (
                    <div key={m.id} className="list-item">
                      <div className="grow">
                        <div className="item-title">{m.name}</div>
                        <div className="item-meta">
                          {m.qty !== 1 ? `${formatNumber(m.qty, 1)} × ` : ''}
                          {m.unit} · P {formatNumber(m.protein)} · G {formatNumber(m.carbs)} · L {formatNumber(m.fat)}
                        </div>
                      </div>
                      <span className="bold nowrap small">{formatNumber(m.kcal)} kcal</span>
                      <button type="button" className="icon-btn sm" onClick={() => removeMeal(m.id)} aria-label={`Retirer ${m.name}`}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Card title="7 derniers jours" subtitle="Calories consommées par jour">
        <BarChart
          title="Calories consommées sur les 7 derniers jours"
          data={chartData}
          color="var(--c-nutrition)"
          goal={targets.kcal}
          formatValue={formatKcal}
          formatTick={formatCompact}
          valueHeader="Calories"
        />
      </Card>

      <div className="banner accent-nutrition">
        <Info size={18} className="banner-icon" />
        <p className="tip">
          Objectif calculé avec la formule de Mifflin-St Jeor selon votre profil et votre niveau d’activité. Protéines :
          1,8 g/kg de poids corporel. Les valeurs des plats sont indicatives : ajustez les quantités.
        </p>
      </div>

      <AddFoodSheet
        open={sheetSlot !== null}
        onClose={() => setSheetSlot(null)}
        date={date}
        slot={sheetSlot ?? defaultSlot()}
        slots={slots}
      />
    </div>
  );
}
