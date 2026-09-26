import { Coffee, CupSoda, GlassWater, Info, Milk, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BarChart } from '../../components/charts/BarChart';
import { Card } from '../../components/ui/Card';
import { Field, NumberInput } from '../../components/ui/Field';
import { DateNav, EmptyState, PageHeader } from '../../components/ui/layout';
import { ProgressRing, Stat } from '../../components/ui/progress';
import { Sheet } from '../../components/ui/Sheet';
import { formatShort, formatTime, lastNDays, weekdayLetter, formatWeekdayShort, type ISODate } from '../../lib/dates';
import { formatMl, formatNumber } from '../../lib/format';
import { baseWaterGoal } from '../../lib/health';
import { isRamadan } from '../../lib/hijri';
import { useToday } from '../../lib/hooks';
import { average } from '../../lib/misc';
import { currentStreak } from '../../lib/streaks';
import { sumByDate, useLatestWeightKg, useWaterGoal } from '../../store/selectors';
import { useStore } from '../../store/store';
import { addWater, removeWater } from './actions';

export function quickAddIcon(ml: number) {
  if (ml <= 180) return Coffee;
  if (ml <= 280) return GlassWater;
  if (ml <= 400) return CupSoda;
  return Milk;
}

export function quickAddLabel(ml: number) {
  if (ml <= 180) return 'Tasse';
  if (ml <= 280) return 'Verre';
  if (ml <= 400) return 'Canette';
  return 'Bouteille';
}

export function WaterQuickAdd({ date }: { date: ISODate }) {
  const amounts = useStore((s) => s.settings.waterQuickAdd);
  return (
    <div className="water-quick">
      {amounts.map((ml) => {
        const Icon = quickAddIcon(ml);
        return (
          <button key={ml} type="button" className="tile-btn" onClick={() => addWater(ml, date)} aria-label={`Ajouter ${formatMl(ml)}`}>
            <Icon size={22} className="accent-text" />
            <span>+{formatMl(ml)}</span>
          </button>
        );
      })}
    </div>
  );
}

const TIPS = [
  'Un grand verre d’eau au réveil relance l’hydratation après la nuit.',
  'Gardez une bouteille visible sur votre bureau : on boit plus quand l’eau est à portée de main.',
  'Buvez un verre avant chaque repas et après chaque prière : 5 prières, 5 verres.',
  'Le thé à la menthe et le café comptent, mais l’eau reste la meilleure boisson.',
  'Urines claires = bonne hydratation. Foncées = il est temps de boire.',
];

const RAMADAN_TIP =
  'Ramadan : répartissez l’eau entre le ftour et le s’hour (par exemple 2 verres au ftour, 1 verre toutes les heures, 2 verres au s’hour) et limitez le sel et le café.';

export function WaterPage() {
  const today = useToday();
  const [date, setDate] = useState<ISODate>(today);
  const [customOpen, setCustomOpen] = useState(false);
  const [customMl, setCustomMl] = useState<number | null>(200);

  const water = useStore((s) => s.water);
  const hijriOffset = useStore((s) => s.settings.prayer.hijriOffset);
  const override = useStore((s) => s.settings.goals.waterMl);
  const weightKg = useLatestWeightKg();
  const goal = useWaterGoal(date);

  const byDay = useMemo(() => sumByDate(water, (w) => w.ml), [water]);
  const entries = useMemo(() => water.filter((w) => w.date === date).sort((a, b) => b.ts - a.ts), [water, date]);
  const total = byDay.get(date) ?? 0;
  const remaining = Math.max(0, goal.total - total);
  const baseGoal = baseWaterGoal(weightKg, override);

  const last7 = lastNDays(7, today);
  const chartData = last7.map((d) => ({
    key: d,
    label: weekdayLetter(d),
    fullLabel: `${formatWeekdayShort(d)} ${formatShort(d)}`,
    value: byDay.get(d) ?? 0,
    current: d === today,
  }));
  const avg7 = average(last7.map((d) => byDay.get(d) ?? 0)) ?? 0;
  const reached7 = last7.filter((d) => (byDay.get(d) ?? 0) >= baseGoal).length;
  const streak = currentStreak((d) => (byDay.get(d) ?? 0) >= baseGoal, today);
  const tip = isRamadan(today, hijriOffset) ? RAMADAN_TIP : TIPS[new Date().getDate() % TIPS.length];

  return (
    <div className="stack-lg accent-water">
      <PageHeader title="Hydratation" subtitle="Objectif ajusté à votre poids et à vos séances" back={{ to: '/sante', label: 'Santé' }} />
      <DateNav value={date} onChange={setDate} />

      <div className="grid cols-2">
        <Card accent="water">
          <div className="stack" style={{ alignItems: 'center' }}>
            <ProgressRing value={total} max={goal.total} size={188} stroke={14} accent="water" label="Eau bue aujourd’hui">
              <span className="big-number">{formatMl(total)}</span>
              <span className="muted small">sur {formatMl(goal.total)}</span>
            </ProgressRing>
            <p className="center bold">
              {remaining > 0 ? `Encore ${formatMl(remaining)} à boire` : 'Objectif atteint, bravo ! 🎉'}
            </p>
            {goal.bonus > 0 && (
              <span className="badge accent">+{formatMl(goal.bonus)} ajoutés pour votre séance de sport</span>
            )}
            <div style={{ width: '100%' }}>
              <WaterQuickAdd date={date} />
            </div>
            <button type="button" className="btn btn-soft btn-block" onClick={() => setCustomOpen(true)}>
              <Plus size={18} /> Autre quantité
            </button>
          </div>
        </Card>

        <Card title="Journal du jour" subtitle={`${entries.length} prise${entries.length > 1 ? 's' : ''}`}>
          {entries.length === 0 ? (
            <EmptyState emoji="💧" title="Rien bu pour l’instant" text="Touchez un verre ci-contre pour l’ajouter." />
          ) : (
            <div className="list">
              {entries.map((e) => {
                const Icon = quickAddIcon(e.ml);
                return (
                  <div key={e.id} className="list-item">
                    <span className="icon-chip">
                      <Icon size={18} />
                    </span>
                    <div className="grow">
                      <div className="item-title">{formatMl(e.ml)}</div>
                      <div className="item-meta">{formatTime(new Date(e.ts))}</div>
                    </div>
                    <button type="button" className="icon-btn" onClick={() => removeWater(e.id)} aria-label={`Supprimer ${formatMl(e.ml)}`}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Card title="7 derniers jours" subtitle="Quantité bue par jour">
        <BarChart
          title="Eau bue sur les 7 derniers jours"
          data={chartData}
          color="var(--c-water)"
          goal={baseGoal}
          formatValue={formatMl}
          formatTick={(v) => (v >= 1000 ? `${formatNumber(v / 1000, 1)} L` : `${v}`)}
          valueHeader="Eau"
        />
        <div className="stats cols-3" style={{ marginTop: 12 }}>
          <Stat label="Moyenne" value={formatMl(Math.round(avg7 / 50) * 50)} sub="par jour" />
          <Stat label="Objectif atteint" value={`${reached7} / 7`} sub="jours" />
          <Stat label="Série" value={`${streak} j`} sub="consécutifs" />
        </div>
      </Card>

      <div className="banner accent-water">
        <Info size={18} className="banner-icon" />
        <p className="tip">{tip}</p>
      </div>

      <Sheet
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        title="Ajouter une quantité"
        accent="water"
        footer={
          <button
            type="button"
            className="btn btn-primary"
            disabled={!customMl}
            onClick={() => {
              if (customMl) addWater(customMl, date);
              setCustomOpen(false);
            }}
          >
            Ajouter
          </button>
        }
      >
        <Field label="Quantité">
          {(id) => <NumberInput id={id} value={customMl} onChange={setCustomMl} suffix="ml" decimals={false} min={0} max={5000} autoFocus />}
        </Field>
      </Sheet>
    </div>
  );
}
