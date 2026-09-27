/**
 * Économie du jeu en ligne : pièces virtuelles (jamais convertibles en argent), tables à mise,
 * niveaux, récompenses et boutique. Le serveur fait foi ; l'application n'affiche que ces valeurs.
 */

export type Mode = '1v1' | '2v2';
export const MODES: readonly Mode[] = ['1v1', '2v2'];

export function modePlayers(mode: Mode): 2 | 4 {
  return mode === '1v1' ? 2 : 4;
}

export interface TableTier {
  id: string;
  /** Ville marocaine qui donne son nom et son décor à la table. */
  city: string;
  cityAr: string;
  entry: number;
  minLevel: number;
  theme: string;
}

/** Tables de jeu en ligne, de la plus accessible à la plus prestigieuse. */
export const TABLES: readonly TableTier[] = [
  { id: 'tanja', city: 'Tanger', cityAr: 'طنجة', entry: 100, minLevel: 1, theme: 'riad' },
  { id: 'fes', city: 'Fès', cityAr: 'فاس', entry: 500, minLevel: 2, theme: 'riad' },
  { id: 'chaouen', city: 'Chefchaouen', cityAr: 'شفشاون', entry: 1_000, minLevel: 4, theme: 'chefchaouen' },
  { id: 'souira', city: 'Essaouira', cityAr: 'الصويرة', entry: 2_500, minLevel: 6, theme: 'majorelle' },
  { id: 'casa', city: 'Casablanca', cityAr: 'الدار البيضاء', entry: 10_000, minLevel: 10, theme: 'nuit' },
  { id: 'marrakech', city: 'Marrakech', cityAr: 'مراكش', entry: 50_000, minLevel: 15, theme: 'sahara' },
  { id: 'rabat', city: 'Rabat', cityAr: 'الرباط', entry: 250_000, minLevel: 22, theme: 'palais' },
];

export function findTable(id: string): TableTier | undefined {
  return TABLES.find((t) => t.id === id);
}

/** Part prélevée sur le pot (puits de pièces qui équilibre l'économie). */
export const RAKE = 0.1;

/** Gain d'un gagnant : le pot moins la commission, partagé entre les gagnants. */
export function prizePerWinner(entry: number, mode: Mode): number {
  const players = modePlayers(mode);
  const winners = players / 2;
  return Math.floor((entry * players * (1 - RAKE)) / winners);
}

// ---------------------------------------------------------------------------------------------
// Niveaux
// ---------------------------------------------------------------------------------------------

/** XP cumulée nécessaire pour atteindre le niveau `level` (niveau 1 = 0 XP). */
export function xpForLevel(level: number): number {
  return 50 * level * (level - 1);
}

export function levelForXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

export function levelProgress(xp: number): { level: number; current: number; needed: number } {
  const level = levelForXp(xp);
  const base = xpForLevel(level);
  return { level, current: xp - base, needed: xpForLevel(level + 1) - base };
}

export function matchXp(won: boolean, tableIndex: number): number {
  return (won ? 30 : 10) + tableIndex * 4;
}

export function levelUpReward(level: number): number {
  return 250 + level * 100;
}

// ---------------------------------------------------------------------------------------------
// Récompenses
// ---------------------------------------------------------------------------------------------

export const STARTING_COINS = 2_500;
/** Bonus quotidien selon le nombre de jours consécutifs (le 7e jour est le gros lot). */
export const DAILY_REWARDS: readonly number[] = [500, 750, 1_000, 1_500, 2_000, 2_500, 5_000];
export const FREE_COINS = 250;
export const FREE_COINS_INTERVAL_MS = 4 * 60 * 60 * 1000;
export const AD_REWARD = 400;
export const ADS_PER_DAY = 8;
/** Coup de pouce quotidien quand on n'a plus de quoi s'asseoir à la plus petite table. */
export const RESCUE_COINS = 500;
export const RESCUE_THRESHOLD = 100;
export const VIP_DAILY_COINS = 5_000;
/** Bonus de parrainage (pour le parrain et le filleul). */
export const REFERRAL_COINS = 2_000;

export function dailyReward(streakDay: number): number {
  return DAILY_REWARDS[Math.min(Math.max(streakDay, 1), DAILY_REWARDS.length) - 1];
}

// ---------------------------------------------------------------------------------------------
// Boutique
// ---------------------------------------------------------------------------------------------

export type ShopCategory = 'cardBack' | 'table' | 'frame';

export interface ShopItem {
  id: string;
  category: ShopCategory;
  price: number;
  minLevel?: number;
  /** Réservé aux VIP ou à un pack payant. */
  exclusive?: 'vip' | 'starter';
}

export const SHOP_ITEMS: readonly ShopItem[] = [
  { id: 'back-zellige', category: 'cardBack', price: 0 },
  { id: 'back-majorelle', category: 'cardBack', price: 5_000 },
  { id: 'back-berbere', category: 'cardBack', price: 12_000, minLevel: 3 },
  { id: 'back-chaouen', category: 'cardBack', price: 15_000, minLevel: 5 },
  { id: 'back-royal', category: 'cardBack', price: 40_000, minLevel: 10 },
  { id: 'back-or', category: 'cardBack', price: 0, exclusive: 'starter' },
  { id: 'back-vip', category: 'cardBack', price: 0, exclusive: 'vip' },
  { id: 'table-riad', category: 'table', price: 0 },
  { id: 'table-majorelle', category: 'table', price: 8_000 },
  { id: 'table-chefchaouen', category: 'table', price: 12_000, minLevel: 3 },
  { id: 'table-sahara', category: 'table', price: 15_000, minLevel: 5 },
  { id: 'table-nuit', category: 'table', price: 25_000, minLevel: 8 },
  { id: 'table-palais', category: 'table', price: 60_000, minLevel: 12 },
  { id: 'frame-none', category: 'frame', price: 0 },
  { id: 'frame-bronze', category: 'frame', price: 3_000 },
  { id: 'frame-argent', category: 'frame', price: 20_000, minLevel: 8 },
  { id: 'frame-or', category: 'frame', price: 75_000, minLevel: 15 },
  { id: 'frame-vip', category: 'frame', price: 0, exclusive: 'vip' },
];

export const DEFAULT_EQUIPPED: Record<ShopCategory, string> = {
  cardBack: 'back-zellige',
  table: 'table-riad',
  frame: 'frame-none',
};

export function findShopItem(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((i) => i.id === id);
}

/** Achats en argent réel (identifiants à créer à l'identique dans Google Play et App Store Connect). */
export interface IapProduct {
  id: string;
  coins: number;
  /** Prix indicatif affiché hors ligne ; le vrai prix vient du store. */
  fallbackPrice: string;
  unlocks?: string[];
  noAds?: boolean;
  vipDays?: number;
  badge?: 'popular' | 'best';
  oneTime?: boolean;
}

export const IAP_PRODUCTS: readonly IapProduct[] = [
  { id: 'ronda_coins_10k', coins: 10_000, fallbackPrice: '0,99 €' },
  { id: 'ronda_coins_60k', coins: 60_000, fallbackPrice: '4,99 €', badge: 'popular' },
  { id: 'ronda_coins_150k', coins: 150_000, fallbackPrice: '9,99 €' },
  { id: 'ronda_coins_1m', coins: 1_000_000, fallbackPrice: '49,99 €', badge: 'best' },
  { id: 'ronda_starter', coins: 30_000, fallbackPrice: '1,99 €', unlocks: ['back-or'], oneTime: true },
  { id: 'ronda_no_ads', coins: 0, fallbackPrice: '2,99 €', noAds: true, oneTime: true },
  { id: 'ronda_vip_month', coins: 0, fallbackPrice: '4,99 €/mois', vipDays: 30, noAds: true, unlocks: ['back-vip', 'frame-vip'] },
];

export function findIapProduct(id: string): IapProduct | undefined {
  return IAP_PRODUCTS.find((p) => p.id === id);
}

// ---------------------------------------------------------------------------------------------
// Messages rapides (pas de chat libre : rien à modérer, adapté à tous les âges)
// ---------------------------------------------------------------------------------------------

export const EMOJIS: readonly string[] = ['😂', '😎', '🔥', '👏', '😱', '😡', '🤲', '😴'];
export const PHRASES: readonly string[] = [
  'salam',
  'yallah',
  'zwina',
  'hak',
  'tbarkellah',
  'mabrouk',
  'dghya',
  'ma3lich',
  'sm7li',
  'm3allem',
  'hhh',
  'bslama',
];

export function isValidEmote(id: string): boolean {
  return EMOJIS.includes(id) || PHRASES.includes(id);
}

export const AVATAR_COUNT = 16;

/** Personnages des bots : prénom et avatar assortis (les bots sont toujours signalés comme tels). */
export const BOT_PERSONAS: readonly { name: string; avatar: number }[] = [
  { name: 'Karim', avatar: 0 },
  { name: 'Salma', avatar: 1 },
  { name: 'Hamid', avatar: 2 },
  { name: 'Youssef', avatar: 3 },
  { name: 'Nadia', avatar: 4 },
  { name: 'Brahim', avatar: 5 },
  { name: 'Mehdi', avatar: 6 },
  { name: 'Anas', avatar: 7 },
  { name: 'Hassan', avatar: 8 },
  { name: 'Imane', avatar: 9 },
  { name: 'Omar', avatar: 10 },
  { name: 'Zineb', avatar: 11 },
  { name: 'Ayoub', avatar: 12 },
  { name: 'Rachid', avatar: 13 },
  { name: 'Hajar', avatar: 14 },
  { name: 'Driss', avatar: 15 },
];
export const NAME_MIN = 2;
export const NAME_MAX = 16;

/** Nettoie un pseudo : lettres (dont arabes), chiffres, espaces simples, tirets et points. */
export function sanitizeName(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const name = input
    .normalize('NFC')
    .replace(/[^\p{L}\p{N} ._-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (name.length < NAME_MIN || name.length > NAME_MAX) return null;
  return name;
}
