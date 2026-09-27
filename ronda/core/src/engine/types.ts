import type { Card, Rank } from './cards';
import type { Rules } from './rules';

/** Place autour de la table, dans l'ordre de jeu (sens inverse des aiguilles d'une montre). */
export type Seat = number;
/** Équipe : les places paires contre les places impaires (en 1v1, chaque joueur est une équipe). */
export type Team = 0 | 1;

export function teamOf(seat: Seat): Team {
  return (seat % 2) as Team;
}

export type ComboKind = 'ronda' | 'tringa';

export interface Combo {
  kind: ComboKind;
  rank: Rank;
  cards: Card[];
}

export interface Announcement {
  seat: Seat;
  combos: Combo[];
}

/** Annonce publique : on sait qu'un joueur a une ronda ou une tringa, pas de quel rang. */
export interface AnnouncedKinds {
  seat: Seat;
  kinds: ComboKind[];
}

export interface SeatPlay {
  seat: Seat;
  card: Card;
}

/** Niveau de darba : 1 = b'wahed, 2 = b'khamsa, 3 = b'achra. */
export type DarbaLevel = 1 | 2 | 3;

/**
 * Prise par darba encore contestable : le joueur suivant peut rebondir (« zid ») avec une carte
 * de même valeur et emporter tout le paquet.
 */
export interface PendingDarba {
  owner: Seat;
  victim: Seat;
  rank: Rank;
  cards: Card[];
  level: DarbaLevel;
  /** La prise a vidé le tapis : la missa revient à celui qui emporte le paquet. */
  missa: boolean;
}

export interface LastPlayed {
  seat: Seat;
  card: Card;
  /** La carte est restée sur le tapis (elle n'a rien pris) : elle peut subir une darba. */
  onTable: boolean;
}

export type Phase = 'play' | 'roundEnd' | 'gameOver';

export interface GameState {
  rules: Rules;
  phase: Phase;
  round: number;
  dealer: Seat;
  /** Nombre de donnes déjà faites dans la manche. */
  dealNo: number;
  deck: Card[];
  hands: Card[][];
  /** Cartes visibles sur le tapis (au plus une par rang). */
  table: Card[];
  pending: PendingDarba | null;
  /** Cartes ramassées par équipe pendant la manche. */
  piles: [Card[], Card[]];
  scores: [number, number];
  turn: Seat;
  lastPlayed: LastPlayed | null;
  lastCapturer: Seat | null;
  /** Annonces contestées de la donne en cours, départagées en fin de donne. */
  announcements: Announcement[];
  /** Toutes les cartes jouées depuis le début de la manche (information publique). */
  played: Card[];
  /** Annonces faites au début de la donne en cours (information publique). */
  dealAnnounced: AnnouncedKinds[];
  /** Cartes jouées depuis le début de la donne en cours, avec leur joueur. */
  dealPlays: SeatPlay[];
  winner: Team | null;
  /** Compteur de coups joués : sert d'identifiant de tour côté réseau. */
  moveCount: number;
}

export type PointReason = 'ronda' | 'tringa' | 'darba' | 'khamsa' | 'achra' | 'missa' | 'cards';

export const DARBA_REASONS: Record<DarbaLevel, PointReason> = { 1: 'darba', 2: 'khamsa', 3: 'achra' };

export type GameEvent =
  | { type: 'roundStart'; round: number; dealer: Seat }
  | { type: 'deal'; dealNo: number; count: number; last: boolean }
  | { type: 'announce'; seat: Seat; kinds: ComboKind[] }
  | {
      type: 'announceResult';
      /** Combinaisons dévoilées (vide quand l'annonce n'était pas contestée). */
      entries: Announcement[];
      winners: Seat[];
      points: [number, number];
    }
  | { type: 'play'; seat: Seat; card: Card }
  | { type: 'capture'; seat: Seat; card: Card; cards: Card[]; pending: boolean }
  | { type: 'darba'; seat: Seat; victim: Seat; level: DarbaLevel; rank: Rank }
  | { type: 'missa'; seat: Seat }
  | { type: 'collect'; seat: Seat; cards: Card[] }
  | { type: 'points'; team: Team; seat: Seat | null; points: number; reason: PointReason }
  | { type: 'sweep'; seat: Seat; cards: Card[] }
  | { type: 'roundEnd'; counts: [number, number]; points: [number, number]; scores: [number, number] }
  | { type: 'gameOver'; winner: Team; scores: [number, number] }
  | { type: 'turn'; seat: Seat };

export type GameEventType = GameEvent['type'];

/** Un événement et l'état de la partie juste après lui (pour animer pas à pas). */
export interface Step {
  event: GameEvent;
  state: GameState;
}

export interface Transition {
  state: GameState;
  steps: Step[];
}

export class RondaError extends Error {
  readonly code: string;
  constructor(code: 'not_playing' | 'not_your_turn' | 'card_not_in_hand' | 'bad_phase' | 'bad_deck', message?: string) {
    super(message ?? code);
    this.code = code;
    this.name = 'RondaError';
  }
}
