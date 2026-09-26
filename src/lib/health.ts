import type { ActivityLevel, Intensity, Macros, Profile, Sex, WeightEntry, WeightGoal } from '../store/types';
import { round } from './misc';

export const ACTIVITY_LEVELS: Record<ActivityLevel, { label: string; detail: string; factor: number }> = {
  sedentary: { label: 'Sédentaire', detail: 'Travail de bureau, peu de sport', factor: 1.2 },
  light: { label: 'Légèrement actif', detail: 'Sport 1 à 3 fois / semaine', factor: 1.375 },
  moderate: { label: 'Actif', detail: 'Sport 3 à 5 fois / semaine', factor: 1.55 },
  active: { label: 'Très actif', detail: 'Sport 6 à 7 fois / semaine', factor: 1.725 },
  very_active: { label: 'Athlète', detail: 'Entraînement intense quotidien ou métier physique', factor: 1.9 },
};

export const WEIGHT_GOALS: Record<WeightGoal, { label: string; factor: number }> = {
  lose: { label: 'Perdre du poids', factor: 0.8 },
  maintain: { label: 'Maintenir', factor: 1 },
  gain: { label: 'Prendre du muscle', factor: 1.1 },
};

export function ageFromBirthYear(birthYear: number | null, now: Date = new Date()): number | null {
  if (!birthYear) return null;
  const age = now.getFullYear() - birthYear;
  return age > 0 && age < 120 ? age : null;
}

/** Métabolisme de base (Mifflin-St Jeor), en kcal/jour. */
export function bmr(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161);
}

/** Dépense énergétique totale estimée (kcal/jour). */
export function tdee(profile: Profile, weightKg: number | null, now: Date = new Date()): number | null {
  const age = ageFromBirthYear(profile.birthYear, now);
  if (!weightKg || !profile.heightCm || !age) return null;
  return bmr(profile.sex, weightKg, profile.heightCm, age) * ACTIVITY_LEVELS[profile.activity].factor;
}

/** Objectif calorique quotidien : manuel si défini, sinon calculé depuis le profil. */
export function calorieTarget(profile: Profile, weightKg: number | null, override: number | null): number | null {
  if (override) return override;
  const t = tdee(profile, weightKg);
  if (!t) return null;
  const floor = profile.sex === 'male' ? 1500 : 1200;
  return Math.max(floor, round((t * WEIGHT_GOALS[profile.goal].factor) / 10) * 10);
}

/** Répartition des macronutriments : protéines 1,8 g/kg, lipides 27 %, glucides le reste. */
export function macroTargets(kcal: number, weightKg: number | null): Omit<Macros, 'kcal'> {
  const protein = Math.min(250, round((weightKg ?? 70) * 1.8));
  const fat = round((kcal * 0.27) / 9);
  const carbs = Math.max(0, round((kcal - protein * 4 - fat * 9) / 4));
  return { protein, carbs, fat };
}

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export function bmiCategory(value: number): { label: string; tone: 'good' | 'warning' | 'critical' } {
  if (value < 18.5) return { label: 'Insuffisance pondérale', tone: 'warning' };
  if (value < 25) return { label: 'Corpulence normale', tone: 'good' };
  if (value < 30) return { label: 'Surpoids', tone: 'warning' };
  return { label: 'Obésité', tone: 'critical' };
}

/** Objectif d'eau : 35 ml/kg arrondi à 100 ml (2,5 L par défaut). */
export function baseWaterGoal(weightKg: number | null, override: number | null): number {
  if (override) return override;
  if (!weightKg) return 2500;
  return Math.min(4500, Math.max(1500, round((weightKg * 35) / 100) * 100));
}

/** Bonus d'hydratation lié au sport : +500 ml par heure d'effort (arrondi à 50 ml). */
export function sportWaterBonus(workoutMinutes: number): number {
  return round((workoutMinutes / 60) * 500 / 50) * 50;
}

const INTENSITY_FACTOR: Record<Intensity, number> = { 1: 0.8, 2: 1, 3: 1.2 };

/** Calories dépensées : MET × poids (kg) × durée (h), modulé par l'intensité. */
export function workoutKcal(met: number, weightKg: number | null, minutes: number, intensity: Intensity): number {
  return Math.round(met * INTENSITY_FACTOR[intensity] * (weightKg ?? 70) * (minutes / 60));
}

/** Dernier poids enregistré (ou null). */
export function latestWeight(weights: WeightEntry[]): WeightEntry | null {
  let best: WeightEntry | null = null;
  for (const w of weights) if (!best || w.date > best.date) best = w;
  return best;
}

/** Durée de sommeil en minutes entre deux heures « HH:MM » (passage de minuit géré). */
export function sleepMinutes(bedtime: string, wake: string): number {
  const [bh, bm] = bedtime.split(':').map(Number);
  const [wh, wm] = wake.split(':').map(Number);
  let d = wh * 60 + wm - (bh * 60 + bm);
  if (d <= 0) d += 1440;
  return d;
}

/**
 * Moyenne d'heures de coucher, en gérant le passage de minuit :
 * 23:30 et 00:30 donnent 00:00 (et non 12:00).
 */
export function averageClockTime(times: string[]): string | null {
  if (!times.length) return null;
  // Décale l'origine à midi pour que la nuit soit continue.
  const mins = times.map((t) => {
    const [h, m] = t.split(':').map(Number);
    return (h * 60 + m - 720 + 1440) % 1440;
  });
  const avg = mins.reduce((a, b) => a + b, 0) / mins.length;
  const real = Math.round(avg + 720) % 1440;
  return `${String(Math.floor(real / 60)).padStart(2, '0')}:${String(real % 60).padStart(2, '0')}`;
}
