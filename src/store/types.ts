import type { ISODate } from '../lib/dates';

export type { ISODate };

/* ───────────── Profil & réglages ───────────── */

export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type WeightGoal = 'lose' | 'maintain' | 'gain';

export interface Profile {
  name: string;
  sex: Sex;
  birthYear: number | null;
  heightCm: number | null;
  activity: ActivityLevel;
  goal: WeightGoal;
  targetWeightKg: number | null;
}

export type ThemePref = 'system' | 'light' | 'dark';

export type PrayerMethodId =
  | 'morocco'
  | 'mwl'
  | 'egyptian'
  | 'ummalqura'
  | 'uoif'
  | 'isna'
  | 'turkey'
  | 'karachi'
  | 'dubai'
  | 'qatar'
  | 'kuwait'
  | 'singapore'
  | 'moonsighting';

export type TimeKey = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export interface PrayerSettings {
  /** Identifiant de ville prédéfinie, ou null pour une position personnalisée (GPS). */
  cityId: string | null;
  label: string;
  lat: number;
  lng: number;
  method: PrayerMethodId;
  asr: 'standard' | 'hanafi';
  /** Ajustements manuels en minutes, ajoutés au calcul. */
  adjustments: Record<TimeKey, number>;
  /** Décalage du calendrier hégirien en jours (annonce officielle locale). */
  hijriOffset: number;
}

export interface Goals {
  /** null = calculé automatiquement depuis le poids. */
  waterMl: number | null;
  /** null = calculé automatiquement depuis le profil. */
  kcal: number | null;
  steps: number;
  sleepHours: number;
  workoutsPerWeek: number;
  quranPagesPerDay: number;
}

export interface Settings {
  theme: ThemePref;
  currency: string;
  prayer: PrayerSettings;
  goals: Goals;
  waterQuickAdd: number[];
}

/* ───────────── Dîn ───────────── */

export type PrayerName = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export type PrayerStatus = 'ontime' | 'late' | 'missed';

export interface PrayerLog {
  status: PrayerStatus;
  /** Prière faite en groupe / à la mosquée. */
  jamaa?: boolean;
}

export type DayPrayers = Partial<Record<PrayerName, PrayerLog>>;

export type SunnahKey = 'raghiba' | 'duha' | 'nawafil' | 'witr' | 'qiyam';

export type AdhkarKey = 'morning' | 'evening' | 'afterPrayer' | 'sleep' | 'kahf' | 'mulk';

export type FastKind = 'ramadan' | 'qada' | 'sunna' | 'other';

export interface QuranState {
  /** Dernière page lue de la khatma en cours (0 à 604). */
  page: number;
  khatmas: number;
  /** Pages lues par jour. */
  log: Record<ISODate, number>;
}

export interface TasbihState {
  phrase: string;
  count: number;
  target: number;
  total: number;
}

export interface ZakatInputs {
  cash: number;
  gold: number;
  silver: number;
  investments: number;
  receivables: number;
  debts: number;
  goldPricePerGram: number;
  silverPricePerGram: number;
  nisabBase: 'gold' | 'silver';
}

/* ───────────── Santé ───────────── */

export interface WaterEntry {
  id: string;
  date: ISODate;
  ts: number;
  ml: number;
}

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodItem extends Macros {
  id: string;
  name: string;
  /** Unité de référence, ex. « 1 bol (300 ml) » ou « 100 g ». */
  unit: string;
  category: string;
  custom?: boolean;
}

export interface MealEntry extends Macros {
  id: string;
  date: ISODate;
  slot: MealSlot;
  name: string;
  qty: number;
  unit: string;
  foodId?: string;
  ts: number;
}

export type Intensity = 1 | 2 | 3;

export interface Workout {
  id: string;
  date: ISODate;
  type: string;
  durationMin: number;
  intensity: Intensity;
  kcal: number;
  distanceKm?: number;
  note?: string;
  ts: number;
}

export type Rating = 1 | 2 | 3 | 4 | 5;

export interface SleepEntry {
  id: string;
  /** Date du réveil. */
  date: ISODate;
  bedtime: string;
  wake: string;
  quality: Rating;
  fajr?: boolean;
  note?: string;
}

export interface WeightEntry {
  id: string;
  date: ISODate;
  kg: number;
  waistCm?: number;
  bodyFatPct?: number;
}

/* ───────────── Finances ───────────── */

export type TxType = 'expense' | 'income';

export interface FinanceCategory {
  id: string;
  name: string;
  type: TxType;
  emoji: string;
  /** Budget mensuel (dépenses uniquement). */
  budget: number | null;
  archived?: boolean;
}

export interface Transaction {
  id: string;
  date: ISODate;
  type: TxType;
  amount: number;
  categoryId: string;
  note?: string;
  recurringId?: string;
  ts: number;
}

export interface RecurringItem {
  id: string;
  name: string;
  type: TxType;
  amount: number;
  categoryId: string;
  dayOfMonth: number;
  active: boolean;
}

export interface SavingsGoal {
  id: string;
  name: string;
  emoji: string;
  target: number;
  saved: number;
  deadline: ISODate | null;
  createdAt: ISODate;
}

/* ───────────── Vie perso ───────────── */

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  /** Jours actifs : 0 = lundi … 6 = dimanche. */
  days: number[];
  /** Nombre de fois par jour (1 = simple case à cocher). */
  target: number;
  createdAt: ISODate;
  archived?: boolean;
}

export interface JournalEntry {
  date: ISODate;
  mood: Rating | null;
  energy: Rating | null;
  gratitude: string[];
  note: string;
  updatedAt: number;
}

export type Priority = 'high' | 'normal' | 'low';
export type LifeArea = 'deen' | 'health' | 'finance' | 'family' | 'work' | 'personal';

export interface Task {
  id: string;
  title: string;
  due: ISODate | null;
  priority: Priority;
  area: LifeArea;
  done: boolean;
  doneAt?: number;
  createdAt: number;
}

export interface Goal {
  id: string;
  title: string;
  area: LifeArea;
  deadline: ISODate | null;
  progress: number;
  note: string;
  createdAt: ISODate;
  done: boolean;
}

/* ───────────── État global ───────────── */

export interface Meta {
  createdAt: number;
  onboarded: boolean;
  lastBackupAt: number | null;
}

export interface AppData {
  meta: Meta;
  profile: Profile;
  settings: Settings;

  prayerLog: Record<ISODate, DayPrayers>;
  sunnahLog: Record<ISODate, Partial<Record<SunnahKey, boolean>>>;
  qada: { initial: Record<PrayerName, number>; done: Record<PrayerName, number> };
  quran: QuranState;
  adhkarLog: Record<ISODate, Partial<Record<AdhkarKey, boolean>>>;
  fasts: Record<ISODate, FastKind>;
  fastQadaOwed: number;
  tasbih: TasbihState;
  zakat: ZakatInputs;

  water: WaterEntry[];
  meals: MealEntry[];
  customFoods: FoodItem[];
  workouts: Workout[];
  steps: Record<ISODate, number>;
  sleep: SleepEntry[];
  weights: WeightEntry[];

  categories: FinanceCategory[];
  transactions: Transaction[];
  recurring: RecurringItem[];
  savings: SavingsGoal[];

  habits: Habit[];
  habitLogs: Record<string, Record<ISODate, number>>;
  journal: Record<ISODate, JournalEntry>;
  tasks: Task[];
  goals: Goal[];
}
