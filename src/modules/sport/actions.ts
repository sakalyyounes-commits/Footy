import type { ISODate } from '../../lib/dates';
import { removeItem, upsertItem } from '../../store/helpers';
import { update } from '../../store/store';
import type { Workout } from '../../store/types';

export function saveWorkout(workout: Workout): void {
  upsertItem('workouts', workout);
}

export function removeWorkout(id: string): void {
  removeItem('workouts', id, 'Séance supprimée');
}

export function setSteps(date: ISODate, steps: number | null): void {
  update((s) => {
    const next = { ...s.steps };
    if (steps && steps > 0) next[date] = Math.round(steps);
    else delete next[date];
    return { steps: next };
  });
}
