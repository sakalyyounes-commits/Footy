import { addDays, parseISODate, type ISODate } from './dates';

export const HIJRI_MONTHS = [
  { fr: 'Mouharram', ar: 'محرم' },
  { fr: 'Safar', ar: 'صفر' },
  { fr: 'Rabi‘ al-awwal', ar: 'ربيع الأول' },
  { fr: 'Rabi‘ ath-thani', ar: 'ربيع الآخر' },
  { fr: 'Joumada al-oula', ar: 'جمادى الأولى' },
  { fr: 'Joumada al-akhira', ar: 'جمادى الآخرة' },
  { fr: 'Rajab', ar: 'رجب' },
  { fr: 'Cha‘bane', ar: 'شعبان' },
  { fr: 'Ramadan', ar: 'رمضان' },
  { fr: 'Chawwal', ar: 'شوال' },
  { fr: 'Dhou al-Qi‘da', ar: 'ذو القعدة' },
  { fr: 'Dhou al-Hijja', ar: 'ذو الحجة' },
];

export interface HijriDate {
  day: number;
  /** 1 à 12 */
  month: number;
  year: number;
}

let formatter: Intl.DateTimeFormat | null | undefined;

function getFormatter(): Intl.DateTimeFormat | null {
  if (formatter !== undefined) return formatter;
  for (const cal of ['islamic-umalqura', 'islamic-civil', 'islamic']) {
    try {
      const f = new Intl.DateTimeFormat(`en-US-u-ca-${cal}-nu-latn`, { day: 'numeric', month: 'numeric', year: 'numeric' });
      if (f.resolvedOptions().calendar.startsWith('islamic')) return (formatter = f);
    } catch {
      /* calendrier non supporté, on essaie le suivant */
    }
  }
  return (formatter = null);
}

/** Date hégirienne (calendrier Umm al-Qura) avec décalage en jours. */
export function toHijri(date: ISODate, offsetDays = 0): HijriDate | null {
  const f = getFormatter();
  if (!f) return null;
  const parts = f.formatToParts(parseISODate(addDays(date, offsetDays)));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const day = get('day');
  const month = get('month');
  const year = get('year');
  if (!day || !month || !year) return null;
  return { day, month, year };
}

/** « 15 Rabi‘ ath-thani 1448 » */
export function formatHijri(h: HijriDate | null): string {
  if (!h) return '';
  return `${h.day} ${HIJRI_MONTHS[h.month - 1].fr} ${h.year}`;
}

/** « ١٥ ربيع الآخر ١٤٤٨ هـ » */
export function formatHijriAr(h: HijriDate | null): string {
  if (!h) return '';
  const ar = new Intl.NumberFormat('ar-MA-u-nu-arab', { useGrouping: false });
  return `${ar.format(h.day)} ${HIJRI_MONTHS[h.month - 1].ar} ${ar.format(h.year)} هـ`;
}

export function isRamadan(date: ISODate, offsetDays = 0): boolean {
  return toHijri(date, offsetDays)?.month === 9;
}

export interface FastSuggestion {
  label: string;
  detail: string;
}

/** Jeûnes surérogatoires recommandés pour une date donnée. */
export function fastSuggestionsFor(date: ISODate, offsetDays = 0): FastSuggestion[] {
  const out: FastSuggestion[] = [];
  const h = toHijri(date, offsetDays);
  const weekday = parseISODate(date).getDay();
  if (h?.month === 9) return [{ label: 'Ramadan', detail: 'Jeûne obligatoire du mois de Ramadan' }];
  if (h && h.month === 10 && h.day === 1) return [{ label: 'Aïd al-Fitr', detail: 'Jeûner est interdit ce jour' }];
  if (h && h.month === 12 && h.day >= 10 && h.day <= 13) return [{ label: 'Aïd al-Adha / Tachriq', detail: 'Jeûner est interdit ces jours' }];
  if (weekday === 1) out.push({ label: 'Lundi', detail: 'Jeûne sunna du lundi' });
  if (weekday === 4) out.push({ label: 'Jeudi', detail: 'Jeûne sunna du jeudi' });
  if (h && h.day >= 13 && h.day <= 15) out.push({ label: 'Jours blancs', detail: `${h.day} ${HIJRI_MONTHS[h.month - 1].fr} (13, 14, 15)` });
  if (h && h.month === 12 && h.day === 9) out.push({ label: 'Jour de ‘Arafat', detail: 'Jeûne fortement recommandé' });
  if (h && h.month === 1 && (h.day === 9 || h.day === 10)) out.push({ label: 'Tassou‘a / ‘Achoura', detail: `${h.day} Mouharram` });
  if (h && h.month === 10 && h.day > 1) out.push({ label: 'Six jours de Chawwal', detail: 'Jeûne recommandé après l’Aïd' });
  return out;
}

/** Nombre de jours avant le prochain 1er Ramadan (null si on est en Ramadan). */
export function daysUntilRamadan(date: ISODate, offsetDays = 0): number | null {
  for (let i = 0; i <= 360; i++) {
    const h = toHijri(addDays(date, i), offsetDays);
    if (!h) return null;
    if (h.month === 9) return i === 0 ? null : i;
  }
  return null;
}
