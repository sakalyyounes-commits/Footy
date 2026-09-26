import {
  CalculationMethod,
  CalculationParameters,
  Coordinates,
  HighLatitudeRule,
  Madhab,
  PrayerTimes,
  Qibla,
  SunnahTimes,
} from 'adhan';
import type { PrayerMethodId, PrayerName, PrayerSettings, PrayerStatus, TimeKey } from '../store/types';
import { addDays, parseISODate, toISODate, type ISODate } from './dates';

export const PRAYERS: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
export const TIME_KEYS: TimeKey[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

export const TIME_LABELS: Record<TimeKey, { fr: string; ar: string }> = {
  fajr: { fr: 'Fajr', ar: 'الفجر' },
  sunrise: { fr: 'Chourouk', ar: 'الشروق' },
  dhuhr: { fr: 'Dhohr', ar: 'الظهر' },
  asr: { fr: 'Asr', ar: 'العصر' },
  maghrib: { fr: 'Maghrib', ar: 'المغرب' },
  isha: { fr: 'Icha', ar: 'العشاء' },
};

export const STATUS_LABELS: Record<PrayerStatus, string> = {
  ontime: 'À l’heure',
  late: 'En retard',
  missed: 'Manquée',
};

type Adjustments = Record<TimeKey, number>;

interface MethodDef {
  label: string;
  detail: string;
  build: () => CalculationParameters;
}

function custom(fajr: number, isha: number, adj: Partial<Adjustments> = {}): CalculationParameters {
  const p = new CalculationParameters('Other', fajr, isha);
  Object.assign(p.methodAdjustments, adj);
  return p;
}

/**
 * Méthodes de calcul. La méthode « Maroc » reproduit les horaires officiels du
 * ministère des Habous (Fajr 19°, Icha 17°) avec les décalages de précaution
 * observés sur le calendrier officiel (Chourouk −3 min, Dhohr +5 min, Maghrib +5 min).
 * Calibrée sur des horaires officiels de Casablanca et Rabat (écart ≤ 1 min).
 */
export const METHODS: Record<PrayerMethodId, MethodDef> = {
  morocco: {
    label: 'Maroc — Ministère des Habous',
    detail: 'Fajr 19°, Icha 17°',
    build: () => custom(19, 17, { sunrise: -3, dhuhr: 5.5, asr: 1, maghrib: 4.5, isha: 0.5 }),
  },
  mwl: { label: 'Ligue islamique mondiale', detail: 'Fajr 18°, Icha 17°', build: () => CalculationMethod.MuslimWorldLeague() },
  egyptian: { label: 'Égypte', detail: 'Fajr 19,5°, Icha 17,5°', build: () => CalculationMethod.Egyptian() },
  ummalqura: { label: 'Umm al-Qura (La Mecque)', detail: 'Fajr 18,5°, Icha 90 min', build: () => CalculationMethod.UmmAlQura() },
  uoif: { label: 'France — UOIF', detail: 'Fajr 12°, Icha 12°', build: () => custom(12, 12) },
  isna: { label: 'Amérique du Nord — ISNA', detail: 'Fajr 15°, Icha 15°', build: () => CalculationMethod.NorthAmerica() },
  turkey: { label: 'Turquie — Diyanet', detail: 'Fajr 18°, Icha 17°', build: () => CalculationMethod.Turkey() },
  karachi: { label: 'Karachi', detail: 'Fajr 18°, Icha 18°', build: () => CalculationMethod.Karachi() },
  dubai: { label: 'Dubaï', detail: 'Fajr 18,2°, Icha 18,2°', build: () => CalculationMethod.Dubai() },
  qatar: { label: 'Qatar', detail: 'Fajr 18°, Icha 90 min', build: () => CalculationMethod.Qatar() },
  kuwait: { label: 'Koweït', detail: 'Fajr 18°, Icha 17,5°', build: () => CalculationMethod.Kuwait() },
  singapore: { label: 'Singapour', detail: 'Fajr 20°, Icha 18°', build: () => CalculationMethod.Singapore() },
  moonsighting: {
    label: 'Moonsighting Committee',
    detail: 'Fajr 18°, Icha 18° (saisonnier)',
    build: () => CalculationMethod.MoonsightingCommittee(),
  },
};

export type DayTimes = Record<TimeKey, Date> & {
  /** Milieu de la nuit (fin de l'heure préférable d'Icha). */
  midnight: Date;
  /** Début du dernier tiers de la nuit. */
  lastThird: Date;
};

function buildParams(settings: PrayerSettings, coords: Coordinates): CalculationParameters {
  const params = (METHODS[settings.method] ?? METHODS.morocco).build();
  params.madhab = settings.asr === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  params.highLatitudeRule = HighLatitudeRule.recommended(coords);
  Object.assign(params.adjustments, settings.adjustments);
  return params;
}

/** Horaires de prière d'une journée (date locale). */
export function getDayTimes(settings: PrayerSettings, date: ISODate): DayTimes {
  const coords = new Coordinates(settings.lat, settings.lng);
  const params = buildParams(settings, coords);
  const pt = new PrayerTimes(coords, parseISODate(date), params);
  const sunnah = new SunnahTimes(pt);
  return {
    fajr: pt.fajr,
    sunrise: pt.sunrise,
    dhuhr: pt.dhuhr,
    asr: pt.asr,
    maghrib: pt.maghrib,
    isha: pt.isha,
    midnight: sunnah.middleOfTheNight,
    lastThird: sunnah.lastThirdOfTheNight,
  };
}

/** Fin du temps d'une prière (au-delà, elle est accomplie en retard). */
export function prayerWindowEnd(prayer: PrayerName, times: DayTimes, nextDay: DayTimes): Date {
  switch (prayer) {
    case 'fajr':
      return times.sunrise;
    case 'dhuhr':
      return times.asr;
    case 'asr':
      return times.maghrib;
    case 'maghrib':
      return times.isha;
    case 'isha':
      return nextDay.fajr;
  }
}

/** Statut proposé quand on coche une prière : à l'heure si on est encore dans son temps. */
export function suggestStatus(settings: PrayerSettings, date: ISODate, prayer: PrayerName, now: Date): PrayerStatus {
  const times = getDayTimes(settings, date);
  const end = prayerWindowEnd(prayer, times, getDayTimes(settings, addDays(date, 1)));
  return now.getTime() <= end.getTime() ? 'ontime' : 'late';
}

export interface NextPrayer {
  key: TimeKey;
  time: Date;
  /** Date (locale) à laquelle appartient cet horaire. */
  date: ISODate;
  /** Prière en cours (dont le temps a commencé), si applicable. */
  current: PrayerName | null;
}

/** Prochain horaire (prière ou lever du soleil) à partir de `now`. */
export function getNextPrayer(settings: PrayerSettings, now: Date): NextPrayer {
  const today = toISODate(now);
  const times = getDayTimes(settings, today);
  let current: PrayerName | null = null;
  for (const p of PRAYERS) if (times[p].getTime() <= now.getTime()) current = p;
  if (current === 'fajr' && now.getTime() >= times.sunrise.getTime()) current = null;
  if (current === null && now.getTime() < times.fajr.getTime()) current = 'isha';

  for (const key of TIME_KEYS) {
    if (times[key].getTime() > now.getTime()) return { key, time: times[key], date: today, current };
  }
  const tomorrow = addDays(today, 1);
  return { key: 'fajr', time: getDayTimes(settings, tomorrow).fajr, date: tomorrow, current };
}

/** Direction de la Qibla en degrés depuis le nord géographique. */
export function qiblaBearing(lat: number, lng: number): number {
  return Qibla(new Coordinates(lat, lng));
}

export function compassLabel(deg: number): string {
  const labels = ['Nord', 'Nord-Est', 'Est', 'Sud-Est', 'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest'];
  return labels[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}
