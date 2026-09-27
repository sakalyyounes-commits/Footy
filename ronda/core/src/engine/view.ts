import { rankIndex, RANKS, type Card } from './cards';
import { dealPattern, type Rules } from './rules';
import type {
  AnnouncedKinds,
  DarbaLevel,
  GameState,
  LastPlayed,
  PendingDarba,
  Phase,
  Seat,
  Team,
} from './types';

export type PublicAnnouncement = AnnouncedKinds;

/** Ce qu'un joueur a le droit de voir : sa main, le tapis, les compteurs, jamais les autres mains. */
export interface PlayerView {
  rules: Rules;
  /** Place du joueur qui regarde (-1 pour un spectateur). */
  seat: Seat;
  phase: Phase;
  round: number;
  dealer: Seat;
  dealNo: number;
  dealsPerRound: number;
  deckCount: number;
  hand: Card[];
  handCounts: number[];
  table: Card[];
  pending: PendingDarba | null;
  pileCounts: [number, number];
  scores: [number, number];
  turn: Seat;
  lastPlayed: LastPlayed | null;
  lastCapturer: Seat | null;
  /** Annonces encore contestées dans la donne en cours. */
  announcements: PublicAnnouncement[];
  played: Card[];
  /** Annonces du début de la donne en cours (y compris celles déjà réglées). */
  dealAnnounced: PublicAnnouncement[];
  dealPlays: { seat: Seat; card: Card }[];
  winner: Team | null;
  moveCount: number;
}

export function viewFor(s: GameState, seat: Seat): PlayerView {
  return {
    rules: s.rules,
    seat,
    phase: s.phase,
    round: s.round,
    dealer: s.dealer,
    dealNo: s.dealNo,
    dealsPerRound: dealPattern(s.rules.players).length,
    deckCount: s.deck.length,
    hand: seat >= 0 && seat < s.hands.length ? s.hands[seat].slice() : [],
    handCounts: s.hands.map((h) => h.length),
    table: s.table.slice(),
    pending: s.pending ? { ...s.pending, cards: s.pending.cards.slice() } : null,
    pileCounts: [s.piles[0].length, s.piles[1].length],
    scores: [s.scores[0], s.scores[1]],
    turn: s.turn,
    lastPlayed: s.lastPlayed ? { ...s.lastPlayed } : null,
    lastCapturer: s.lastCapturer,
    announcements: s.announcements.map((a) => ({ seat: a.seat, kinds: a.combos.map((c) => c.kind) })),
    played: s.played.slice(),
    dealAnnounced: s.dealAnnounced.map((a) => ({ seat: a.seat, kinds: a.kinds.slice() })),
    dealPlays: s.dealPlays.map((p) => ({ ...p })),
    winner: s.winner,
    moveCount: s.moveCount,
  };
}

export interface CapturePreview {
  /** Cartes du tapis (ou du paquet de darba) qui seraient ramassées. */
  captures: Card[];
  /** Niveau de darba obtenu (0 si aucune). */
  darba: 0 | DarbaLevel;
  /** Rebond sur une darba adverse (b'khamsa ou b'achra). */
  zid: boolean;
  missa: boolean;
}

type PreviewSource = Pick<
  PlayerView,
  'rules' | 'table' | 'pending' | 'lastPlayed' | 'deckCount' | 'handCounts' | 'turn'
>;

/**
 * Ce que ferait la carte si elle était jouée maintenant par le joueur dont c'est le tour :
 * sert à surligner les prises possibles et aux bots.
 */
export function capturePreview(v: PreviewSource, card: Card): CapturePreview {
  const n = v.rules.players;
  const seat = v.turn;
  const prev = (seat + n - 1) % n;
  const r = rankIndex(card);
  const p = v.pending;
  if (p && p.owner === prev && rankIndex(p.cards[0]) === r && p.level < 3) {
    return { captures: p.cards.slice(), darba: (p.level + 1) as DarbaLevel, zid: true, missa: p.missa };
  }
  const match = v.table.find((c) => rankIndex(c) === r);
  if (match === undefined) return { captures: [], darba: 0, zid: false, missa: false };
  const captures = [match];
  for (let k = r + 1; k < RANKS.length; k++) {
    const next = v.table.find((c) => rankIndex(c) === k);
    if (next === undefined) break;
    captures.push(next);
  }
  const remainingHands = v.handCounts.reduce((sum, c) => sum + c, 0) - 1;
  const lastCardOfRound = v.deckCount === 0 && remainingHands === 0;
  const lp = v.lastPlayed;
  const darba = lp !== null && lp.onTable && lp.seat === prev && lp.card === match;
  return {
    captures,
    darba: darba ? 1 : 0,
    zid: false,
    missa: captures.length === v.table.length && !lastCardOfRound,
  };
}
