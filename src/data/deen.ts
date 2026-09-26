import type { AdhkarKey, FastKind, SunnahKey } from '../store/types';

export const SUNNAH_ITEMS: Array<{ key: SunnahKey; label: string; detail: string }> = [
  { key: 'raghiba', label: 'Raghiba du Fajr', detail: '2 rak‘as avant le Sobh' },
  { key: 'duha', label: 'Doha', detail: 'Matinée, après le lever du soleil' },
  { key: 'nawafil', label: 'Nawafil (rawatib)', detail: 'Avant / après les prières' },
  { key: 'witr', label: 'Chaf‘ & Witr', detail: 'Après Icha' },
  { key: 'qiyam', label: 'Qiyam al-layl', detail: 'Prière de la nuit' },
];

export const ADHKAR_ITEMS: Array<{ key: AdhkarKey; label: string; ar: string; detail: string; fridayOnly?: boolean }> = [
  { key: 'morning', label: 'Adhkar du matin', ar: 'أذكار الصباح', detail: 'Après Fajr, jusqu’au lever du soleil' },
  { key: 'evening', label: 'Adhkar du soir', ar: 'أذكار المساء', detail: 'Après Asr, jusqu’au Maghrib' },
  { key: 'afterPrayer', label: 'Tasbih après les prières', ar: 'أذكار بعد الصلاة', detail: '33 × Subhana Allah, Alhamdulillah, Allahu akbar' },
  { key: 'sleep', label: 'Adhkar du coucher', ar: 'أذكار النوم', detail: 'Ayat al-Kursi, les 3 Qul, invocations' },
  { key: 'mulk', label: 'Sourate Al-Mulk', ar: 'سورة الملك', detail: 'Chaque soir, avant de dormir' },
  { key: 'kahf', label: 'Sourate Al-Kahf', ar: 'سورة الكهف', detail: 'Le vendredi', fridayOnly: true },
];

export interface TasbihPhrase {
  id: string;
  ar: string;
  fr: string;
  target: number;
}

export const TASBIH_PHRASES: TasbihPhrase[] = [
  { id: 'subhanallah', ar: 'سُبْحَانَ اللهِ', fr: 'Subhana Allah', target: 33 },
  { id: 'alhamdulillah', ar: 'الْحَمْدُ لِلَّهِ', fr: 'Alhamdulillah', target: 33 },
  { id: 'allahuakbar', ar: 'اللهُ أَكْبَرُ', fr: 'Allahu akbar', target: 34 },
  { id: 'tahlil', ar: 'لَا إِلَهَ إِلَّا اللهُ', fr: 'La ilaha illa Allah', target: 100 },
  { id: 'istighfar', ar: 'أَسْتَغْفِرُ اللهَ', fr: 'Astaghfiru Allah', target: 100 },
  { id: 'salawat', ar: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ', fr: 'Allahumma salli ‘ala Muhammad', target: 100 },
  { id: 'subhanallahwabihamdihi', ar: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ', fr: 'Subhana Allahi wa bihamdihi', target: 100 },
];

export const FAST_KINDS: Record<FastKind, { label: string; emoji: string }> = {
  ramadan: { label: 'Ramadan', emoji: '🌙' },
  qada: { label: 'Rattrapage', emoji: '↩️' },
  sunna: { label: 'Sunna / surérogatoire', emoji: '✨' },
  other: { label: 'Autre (vœu, expiation…)', emoji: '🤲' },
};

/** Nombre de pages du Mushaf standard (Médine). */
export const QURAN_PAGES = 604;
