import { useMemo } from 'react';
import { baseWaterGoal, calorieTarget, latestWeight, macroTargets, sportWaterBonus } from '../lib/health';
import type { ISODate } from '../lib/dates';
import { useStore } from './store';

/** Somme d'une valeur par date. */
export function sumByDate<T extends { date: ISODate }>(items: T[], value: (item: T) => number): Map<ISODate, number> {
  const map = new Map<ISODate, number>();
  for (const item of items) map.set(item.date, (map.get(item.date) ?? 0) + value(item));
  return map;
}

export function useLatestWeightKg(): number | null {
  const weights = useStore((s) => s.weights);
  return useMemo(() => latestWeight(weights)?.kg ?? null, [weights]);
}

/** Objectif d'hydratation du jour : base (poids ou manuel) + bonus des séances de sport. */
export function useWaterGoal(date: ISODate): { base: number; bonus: number; total: number } {
  const weightKg = useLatestWeightKg();
  const override = useStore((s) => s.settings.goals.waterMl);
  const workouts = useStore((s) => s.workouts);
  return useMemo(() => {
    const base = baseWaterGoal(weightKg, override);
    const minutes = workouts.filter((w) => w.date === date).reduce((a, w) => a + w.durationMin, 0);
    const bonus = sportWaterBonus(minutes);
    return { base, bonus, total: base + bonus };
  }, [weightKg, override, workouts, date]);
}

export interface NutritionTargets {
  kcal: number | null;
  protein: number;
  carbs: number;
  fat: number;
  /** true si calculé depuis le profil (false si saisi manuellement). */
  auto: boolean;
}

export function useNutritionTargets(): NutritionTargets {
  const profile = useStore((s) => s.profile);
  const override = useStore((s) => s.settings.goals.kcal);
  const weightKg = useLatestWeightKg();
  return useMemo(() => {
    const kcal = calorieTarget(profile, weightKg, override);
    const macros = macroTargets(kcal ?? 2000, weightKg);
    return { kcal, ...macros, auto: !override };
  }, [profile, override, weightKg]);
}
