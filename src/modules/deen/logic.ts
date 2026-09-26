import { PRAYERS } from '../../lib/prayer';
import type { ISODate } from '../../lib/dates';
import type { AppData, DayPrayers, PrayerLog, PrayerName } from '../../store/types';

export const isPrayed = (log?: PrayerLog): boolean => !!log && log.status !== 'missed';

export function prayedCount(day?: DayPrayers): number {
  return PRAYERS.filter((p) => isPrayed(day?.[p])).length;
}

export interface PrayerStats {
  /** Nombre de prières attendues sur la période. */
  expected: number;
  ontime: number;
  late: number;
  missed: number;
  jamaa: number;
  perPrayer: Record<PrayerName, { ontime: number; late: number; missed: number }>;
}

export function computePrayerStats(prayerLog: AppData['prayerLog'], days: ISODate[]): PrayerStats {
  const perPrayer = Object.fromEntries(PRAYERS.map((p) => [p, { ontime: 0, late: 0, missed: 0 }])) as PrayerStats['perPrayer'];
  const stats: PrayerStats = { expected: days.length * PRAYERS.length, ontime: 0, late: 0, missed: 0, jamaa: 0, perPrayer };
  for (const d of days) {
    const day = prayerLog[d];
    if (!day) continue;
    for (const p of PRAYERS) {
      const log = day[p];
      if (!log) continue;
      stats[log.status]++;
      perPrayer[p][log.status]++;
      if (log.jamaa && log.status !== 'missed') stats.jamaa++;
    }
  }
  return stats;
}

/** Prières marquées « manquée » dans tout l'historique, par prière. */
export function missedCounts(prayerLog: AppData['prayerLog']): Record<PrayerName, number> {
  const out = Object.fromEntries(PRAYERS.map((p) => [p, 0])) as Record<PrayerName, number>;
  for (const day of Object.values(prayerLog)) for (const p of PRAYERS) if (day[p]?.status === 'missed') out[p]++;
  return out;
}

/** Prières restant à rattraper : dette initiale + prières manquées − rattrapages faits. */
export function qadaOutstanding(qada: AppData['qada'], missed: Record<PrayerName, number>): Record<PrayerName, number> {
  return Object.fromEntries(
    PRAYERS.map((p) => [p, Math.max(0, qada.initial[p] + missed[p] - qada.done[p])]),
  ) as Record<PrayerName, number>;
}
