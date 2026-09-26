import { uid } from '../../lib/misc';
import { removeItem } from '../../store/helpers';
import { update } from '../../store/store';
import type { FoodItem, MealEntry, MealSlot } from '../../store/types';

export function addMeal(entry: Omit<MealEntry, 'id' | 'ts'>): void {
  update((s) => ({ meals: [...s.meals, { ...entry, id: uid(), ts: Date.now() }] }));
}

export function removeMeal(id: string): void {
  removeItem('meals', id, 'Aliment retiré');
}

export function addCustomFood(food: Omit<FoodItem, 'id' | 'custom'>): FoodItem {
  const item: FoodItem = { ...food, id: `perso-${uid()}`, custom: true };
  update((s) => ({ customFoods: [...s.customFoods, item] }));
  return item;
}

export function removeCustomFood(id: string): void {
  removeItem('customFoods', id, 'Aliment supprimé');
}

export interface SlotDef {
  slot: MealSlot;
  label: string;
  emoji: string;
}

/** Repas de la journée ; pendant le Ramadan : s’hour, ftour, dîner. */
export function mealSlots(ramadan: boolean): SlotDef[] {
  return ramadan
    ? [
        { slot: 'breakfast', label: 'S’hour', emoji: '🌌' },
        { slot: 'lunch', label: 'Ftour', emoji: '🌙' },
        { slot: 'dinner', label: 'Dîner', emoji: '🍲' },
        { slot: 'snack', label: 'Collations', emoji: '🍉' },
      ]
    : [
        { slot: 'breakfast', label: 'Petit-déjeuner', emoji: '☕' },
        { slot: 'lunch', label: 'Déjeuner', emoji: '🍽️' },
        { slot: 'dinner', label: 'Dîner', emoji: '🌙' },
        { slot: 'snack', label: 'Collations', emoji: '🍎' },
      ];
}

/** Repas proposé par défaut selon l'heure. */
export function defaultSlot(now: Date = new Date()): MealSlot {
  const h = now.getHours();
  if (h < 11) return 'breakfast';
  if (h < 16) return 'lunch';
  if (h < 18) return 'snack';
  return 'dinner';
}
