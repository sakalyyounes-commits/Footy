import { QURAN_PAGES } from '../../data/deen';
import type { ISODate } from '../../lib/dates';
import { vibrate } from '../../lib/misc';
import { update } from '../../store/store';
import type { AdhkarKey, FastKind, PrayerLog, PrayerName, SunnahKey, TasbihState, ZakatInputs } from '../../store/types';

/** Définit (ou efface avec null) le suivi d'une prière. */
export function setPrayer(date: ISODate, prayer: PrayerName, log: PrayerLog | null): void {
  vibrate(10);
  update((s) => {
    const day = { ...(s.prayerLog[date] ?? {}) };
    if (log) day[prayer] = log;
    else delete day[prayer];
    const prayerLog = { ...s.prayerLog };
    if (Object.keys(day).length) prayerLog[date] = day;
    else delete prayerLog[date];
    return { prayerLog };
  });
}

export function toggleSunnah(date: ISODate, key: SunnahKey): void {
  update((s) => {
    const day = { ...(s.sunnahLog[date] ?? {}) };
    day[key] = !day[key];
    return { sunnahLog: { ...s.sunnahLog, [date]: day } };
  });
}

export function toggleAdhkar(date: ISODate, key: AdhkarKey): void {
  update((s) => {
    const day = { ...(s.adhkarLog[date] ?? {}) };
    day[key] = !day[key];
    return { adhkarLog: { ...s.adhkarLog, [date]: day } };
  });
}

export function setQadaInitial(prayer: PrayerName, value: number): void {
  update((s) => ({ qada: { ...s.qada, initial: { ...s.qada.initial, [prayer]: Math.max(0, Math.round(value)) } } }));
}

/** Enregistre une prière de rattrapage accomplie (ou l'annule avec delta = -1). */
export function addQadaDone(prayer: PrayerName, delta = 1): void {
  vibrate(10);
  update((s) => ({ qada: { ...s.qada, done: { ...s.qada.done, [prayer]: Math.max(0, s.qada.done[prayer] + delta) } } }));
}

/** Ajoute des pages lues aujourd'hui et avance la khatma (passe à la suivante à 604). */
export function addQuranPages(date: ISODate, pages: number): void {
  update((s) => {
    const log = { ...s.quran.log, [date]: Math.max(0, (s.quran.log[date] ?? 0) + pages) };
    if (!log[date]) delete log[date];
    let page = s.quran.page + pages;
    let khatmas = s.quran.khatmas;
    while (page >= QURAN_PAGES) {
      page -= QURAN_PAGES;
      khatmas++;
    }
    return { quran: { ...s.quran, log, page: Math.max(0, page), khatmas } };
  });
}

export function setQuranPosition(page: number, khatmas?: number): void {
  update((s) => ({
    quran: { ...s.quran, page: Math.min(QURAN_PAGES - 1, Math.max(0, Math.round(page))), khatmas: khatmas ?? s.quran.khatmas },
  }));
}

export function setFast(date: ISODate, kind: FastKind | null): void {
  update((s) => {
    const fasts = { ...s.fasts };
    if (kind) fasts[date] = kind;
    else delete fasts[date];
    return { fasts };
  });
}

export function setFastQadaOwed(n: number): void {
  update(() => ({ fastQadaOwed: Math.max(0, Math.round(n)) }));
}

export function updateTasbih(patch: Partial<TasbihState>): void {
  update((s) => ({ tasbih: { ...s.tasbih, ...patch } }));
}

export function updateZakat(patch: Partial<ZakatInputs>): void {
  update((s) => ({ zakat: { ...s.zakat, ...patch } }));
}
