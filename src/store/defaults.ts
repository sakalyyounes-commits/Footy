import { DEFAULT_CATEGORIES } from '../data/categories';
import type { AppData, PrayerName } from './types';

const zeroPrayers = (): Record<PrayerName, number> => ({ fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 });

export function createInitialData(): AppData {
  return {
    meta: { createdAt: Date.now(), onboarded: false, lastBackupAt: null },
    profile: {
      name: '',
      sex: 'male',
      birthYear: null,
      heightCm: null,
      activity: 'light',
      goal: 'maintain',
      targetWeightKg: null,
    },
    settings: {
      theme: 'system',
      currency: 'MAD',
      prayer: {
        cityId: 'casablanca',
        label: 'Casablanca',
        lat: 33.5731,
        lng: -7.5898,
        method: 'morocco',
        asr: 'standard',
        adjustments: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
        hijriOffset: 0,
      },
      goals: {
        waterMl: null,
        kcal: null,
        steps: 8000,
        sleepHours: 7.5,
        workoutsPerWeek: 3,
        quranPagesPerDay: 4,
      },
      waterQuickAdd: [150, 250, 330, 500],
    },

    prayerLog: {},
    sunnahLog: {},
    qada: { initial: zeroPrayers(), done: zeroPrayers() },
    quran: { page: 0, khatmas: 0, log: {} },
    adhkarLog: {},
    fasts: {},
    fastQadaOwed: 0,
    tasbih: { phrase: 'subhanallah', count: 0, target: 33, total: 0 },
    zakat: {
      cash: 0,
      gold: 0,
      silver: 0,
      investments: 0,
      receivables: 0,
      debts: 0,
      goldPricePerGram: 0,
      silverPricePerGram: 0,
      nisabBase: 'gold',
    },

    water: [],
    meals: [],
    customFoods: [],
    workouts: [],
    steps: {},
    sleep: [],
    weights: [],

    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    transactions: [],
    recurring: [],
    savings: [],

    habits: [],
    habitLogs: {},
    journal: {},
    tasks: [],
    goals: [],
  };
}
