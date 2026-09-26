/** Date locale au format `AAAA-MM-JJ` — clé de toutes les données journalières. */
export type ISODate = string;
/** Mois au format `AAAA-MM`. */
export type MonthKey = string;

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Interprète `AAAA-MM-JJ` comme une date locale à midi (évite les pièges des changements d'heure). */
export function parseISODate(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function todayISO(now: Date = new Date()): ISODate {
  return toISODate(now);
}

export function isISODate(s: unknown): s is ISODate {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export function addDays(s: ISODate, n: number): ISODate {
  const d = parseISODate(s);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** Nombre de jours de `b` à `a` (positif si `a` est après `b`). */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((parseISODate(a).getTime() - parseISODate(b).getTime()) / 86_400_000);
}

/** 0 = lundi … 6 = dimanche. */
export function weekdayIndex(s: ISODate): number {
  return (parseISODate(s).getDay() + 6) % 7;
}

export function startOfWeek(s: ISODate): ISODate {
  return addDays(s, -weekdayIndex(s));
}

/** Liste des jours de `start` à `end` inclus. */
export function rangeDays(start: ISODate, end: ISODate): ISODate[] {
  const out: ISODate[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Les `n` derniers jours se terminant par `end` (du plus ancien au plus récent). */
export function lastNDays(n: number, end: ISODate = todayISO()): ISODate[] {
  return rangeDays(addDays(end, -(n - 1)), end);
}

export function monthKey(s: ISODate): MonthKey {
  return s.slice(0, 7);
}

export function addMonths(key: MonthKey, n: number): MonthKey {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1, 12);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function daysInMonth(key: MonthKey): number {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function monthDays(key: MonthKey): ISODate[] {
  return Array.from({ length: daysInMonth(key) }, (_, i) => `${key}-${pad(i + 1)}`);
}

/** Les `n` derniers mois se terminant par `end` (du plus ancien au plus récent). */
export function lastNMonths(n: number, end: MonthKey): MonthKey[] {
  return Array.from({ length: n }, (_, i) => addMonths(end, i - (n - 1)));
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const fmtLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtFull = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fmtShort = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const fmtShortYear = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtWeekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });
const fmtMonth = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
const fmtMonthShort = new Intl.DateTimeFormat('fr-FR', { month: 'short' });

/** « Samedi 26 septembre » */
export function formatLong(s: ISODate): string {
  return capitalize(fmtLong.format(parseISODate(s)));
}

/** « Samedi 26 septembre 2026 » */
export function formatFull(s: ISODate): string {
  return capitalize(fmtFull.format(parseISODate(s)));
}

/** « 26 sept. » (ajoute l'année si elle diffère de l'année en cours) */
export function formatShort(s: ISODate, today: ISODate = todayISO()): string {
  const d = parseISODate(s);
  return s.slice(0, 4) === today.slice(0, 4) ? fmtShort.format(d) : fmtShortYear.format(d);
}

/** « sam. » */
export function formatWeekdayShort(s: ISODate): string {
  return fmtWeekday.format(parseISODate(s));
}

/** Initiale du jour : L M M J V S D */
export function weekdayLetter(s: ISODate): string {
  return 'LMMJVSD'[weekdayIndex(s)];
}

/** « Septembre 2026 » */
export function formatMonth(key: MonthKey): string {
  return capitalize(fmtMonth.format(parseISODate(`${key}-01`)));
}

/** « sept. » */
export function formatMonthShort(key: MonthKey): string {
  return fmtMonthShort.format(parseISODate(`${key}-01`));
}

/** « Aujourd'hui », « Hier », « Demain » ou la date longue. */
export function formatRelativeDay(s: ISODate, today: ISODate = todayISO()): string {
  const d = diffDays(s, today);
  if (d === 0) return 'Aujourd’hui';
  if (d === -1) return 'Hier';
  if (d === 1) return 'Demain';
  return formatLong(s);
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

/** « 05:42 » */
export function formatTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function nowHHMM(now: Date = new Date()): string {
  return formatTime(now);
}
