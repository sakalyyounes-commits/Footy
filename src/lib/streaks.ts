import { addDays, type ISODate } from './dates';

/**
 * Série de jours consécutifs réussis, en remontant depuis `today`.
 * - Les jours non planifiés sont ignorés (ils ne cassent pas la série).
 * - Si aujourd'hui n'est pas encore validé, la série part d'hier (la journée n'est pas finie).
 */
export function currentStreak(
  isDone: (d: ISODate) => boolean,
  today: ISODate,
  isScheduled: (d: ISODate) => boolean = () => true,
  maxLookback = 3660,
): number {
  let streak = 0;
  let d = today;
  if (isScheduled(d) && !isDone(d)) d = addDays(d, -1);
  for (let i = 0; i < maxLookback; i++, d = addDays(d, -1)) {
    if (!isScheduled(d)) continue;
    if (!isDone(d)) break;
    streak++;
  }
  return streak;
}

/** Meilleure série sur une liste de jours triés (du plus ancien au plus récent). */
export function bestStreak(
  days: ISODate[],
  isDone: (d: ISODate) => boolean,
  isScheduled: (d: ISODate) => boolean = () => true,
): number {
  let best = 0;
  let run = 0;
  for (const d of days) {
    if (!isScheduled(d)) continue;
    if (isDone(d)) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }
  return best;
}
