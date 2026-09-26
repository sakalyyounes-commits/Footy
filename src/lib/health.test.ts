import { describe, expect, it } from 'vitest';
import type { Profile } from '../store/types';
import {
  averageClockTime,
  baseWaterGoal,
  bmi,
  bmiCategory,
  bmr,
  calorieTarget,
  latestWeight,
  macroTargets,
  sleepMinutes,
  sportWaterBonus,
  workoutKcal,
} from './health';

const profile: Profile = {
  name: 'Test',
  sex: 'male',
  birthYear: new Date().getFullYear() - 30,
  heightCm: 180,
  activity: 'moderate',
  goal: 'maintain',
  targetWeightKg: null,
};

describe('santé', () => {
  it('calcule le métabolisme de base (Mifflin-St Jeor)', () => {
    expect(bmr('male', 80, 180, 30)).toBe(1780);
    expect(bmr('female', 60, 165, 30)).toBeCloseTo(1320.25);
  });

  it('calcule l’objectif calorique selon l’activité et l’objectif', () => {
    expect(calorieTarget(profile, 80, null)).toBe(2760); // 1780 × 1,55
    expect(calorieTarget({ ...profile, goal: 'lose' }, 80, null)).toBe(2210); // −20 %
    expect(calorieTarget({ ...profile, goal: 'gain' }, 80, null)).toBe(3030); // +10 %
    expect(calorieTarget(profile, 80, 2400)).toBe(2400); // objectif manuel
    expect(calorieTarget({ ...profile, heightCm: null }, 80, null)).toBeNull();
    expect(calorieTarget(profile, null, null)).toBeNull();
  });

  it('répartit les macronutriments', () => {
    expect(macroTargets(2000, 70)).toEqual({ protein: 126, fat: 60, carbs: 239 });
  });

  it('calcule l’objectif d’eau', () => {
    expect(baseWaterGoal(75, null)).toBe(2600);
    expect(baseWaterGoal(null, null)).toBe(2500);
    expect(baseWaterGoal(75, 3000)).toBe(3000);
    expect(baseWaterGoal(200, null)).toBe(4500);
    expect(sportWaterBonus(60)).toBe(500);
    expect(sportWaterBonus(45)).toBe(400);
    expect(sportWaterBonus(0)).toBe(0);
  });

  it('estime les calories d’une séance', () => {
    expect(workoutKcal(5, 80, 60, 2)).toBe(400);
    expect(workoutKcal(5, 80, 60, 3)).toBe(480);
    expect(workoutKcal(5, null, 30, 1)).toBe(140);
  });

  it('calcule l’IMC et sa catégorie', () => {
    expect(bmi(80, 180)).toBeCloseTo(24.69, 2);
    expect(bmiCategory(24.6).label).toBe('Corpulence normale');
    expect(bmiCategory(27).tone).toBe('warning');
    expect(bmiCategory(31).tone).toBe('critical');
  });

  it('gère le sommeil qui passe minuit', () => {
    expect(sleepMinutes('23:30', '06:30')).toBe(420);
    expect(sleepMinutes('01:00', '08:00')).toBe(420);
    expect(averageClockTime(['23:30', '00:30'])).toBe('00:00');
    expect(averageClockTime(['22:00', '23:00'])).toBe('22:30');
    expect(averageClockTime([])).toBeNull();
  });

  it('trouve la pesée la plus récente', () => {
    expect(
      latestWeight([
        { id: 'a', date: '2026-09-01', kg: 80 },
        { id: 'b', date: '2026-09-20', kg: 78 },
        { id: 'c', date: '2026-09-10', kg: 79 },
      ])?.kg,
    ).toBe(78);
    expect(latestWeight([])).toBeNull();
  });
});
