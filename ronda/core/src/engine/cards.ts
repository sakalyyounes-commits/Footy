/**
 * Jeu espagnol de 40 cartes utilisé au Maroc pour la Ronda.
 *
 * Couleurs : oros (dheb, les deniers), copas (tbaye9, les coupes), espadas (syouf, les épées),
 * bastos (zrawet, les bâtons). Rangs : 1 à 7 puis 10 (sota), 11 (caballo, le cheval) et 12 (rey, le roi).
 */
export const SUITS = ['oros', 'copas', 'espadas', 'bastos'] as const;
export type Suit = (typeof SUITS)[number];

/** Rangs dans l'ordre des suites : le 7 est directement suivi du 10. */
export const RANKS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12] as const;
export type Rank = (typeof RANKS)[number];

/** Une carte est un entier de 0 à 39 : index de couleur × 10 + index de rang. */
export type Card = number;

export const DECK_SIZE = 40;

/** Position du rang dans la suite 1-2-3-4-5-6-7-10-11-12 (0 à 9). */
export function rankIndex(card: Card): number {
  return card % 10;
}

export function rankOf(card: Card): Rank {
  return RANKS[card % 10];
}

export function suitOf(card: Card): Suit {
  return SUITS[Math.floor(card / 10)];
}

export function makeCard(suit: Suit, rank: Rank): Card {
  const s = SUITS.indexOf(suit);
  const r = RANKS.indexOf(rank);
  if (s < 0 || r < 0) throw new Error(`Carte invalide : ${rank} de ${suit}`);
  return s * 10 + r;
}

export function isCard(value: unknown): value is Card {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < DECK_SIZE;
}

export function newDeck(): Card[] {
  return Array.from({ length: DECK_SIZE }, (_, i) => i);
}

const SUIT_CODES: Record<string, Suit> = { o: 'oros', c: 'copas', e: 'espadas', b: 'bastos' };

/** Lit une carte écrite « 5o », « 12e », « 1c », « 10b » (rang + initiale de la couleur). */
export function parseCard(code: string): Card {
  const m = /^(\d{1,2})([ocebOCEB])$/.exec(code.trim());
  if (!m) throw new Error(`Code de carte invalide : ${code}`);
  return makeCard(SUIT_CODES[m[2].toLowerCase()], Number(m[1]) as Rank);
}

export function cardCode(card: Card): string {
  return `${rankOf(card)}${suitOf(card)[0]}`;
}

export function parseCards(codes: string): Card[] {
  return codes
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(parseCard);
}

/** Tri d'affichage : par rang puis par couleur. */
export function compareCards(a: Card, b: Card): number {
  return rankIndex(a) - rankIndex(b) || a - b;
}
