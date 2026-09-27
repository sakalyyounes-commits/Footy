import type {
  Announcement,
  BotLevel,
  Card,
  DarbaLevel,
  GameEvent,
  Mode,
  PlayerView,
  PointReason,
  Seat,
  Team,
} from '@ronda/core';

export interface SeatDisplay {
  seat: Seat;
  name: string;
  avatar: number;
  level: number;
  frame: string;
  vip: boolean;
  bot: BotLevel | null;
  connected: boolean;
  auto: boolean;
  isMe: boolean;
}

export type Banner =
  | { id: number; kind: 'darba'; seat: Seat; level: DarbaLevel; points: number }
  | { id: number; kind: 'missa'; seat: Seat; points: number }
  | { id: number; kind: 'lastDeal' }
  | { id: number; kind: 'announce'; entries: Announcement[]; winners: Seat[]; points: [number, number] }
  | { id: number; kind: 'sweep'; seat: Seat; count: number };

export interface Floater {
  id: number;
  seat: Seat | null;
  team: Team;
  points: number;
  reason: PointReason;
}

export interface Bubble {
  id: number;
  seat: Seat;
  text: string;
  /** Annonce de jeu (ronda, tringa) plutôt que message d'un joueur. */
  announce?: boolean;
}

export interface RoundSummary {
  round: number;
  counts: [number, number];
  points: [number, number];
  scores: [number, number];
}

export interface ResultDisplay {
  winner: Team | null;
  scores: [number, number];
  won: boolean;
  coins: number | null;
  xp: number | null;
  levelUp: number | null;
  forfeit: boolean;
}

export interface GameDisplay {
  kind: 'local' | 'online';
  mode: Mode;
  me: Seat;
  view: PlayerView;
  seats: SeatDisplay[];
  lastEvent: GameEvent | null;
  /** Dernière carte posée par un autre joueur (animation d'arrivée depuis sa place). */
  lastPlay: { seat: Seat; card: Card } | null;
  /** Heure locale (ms) à laquelle le temps du joueur actif expire. */
  deadline: number | null;
  turnMs: number;
  banner: Banner | null;
  floaters: Floater[];
  bubbles: Bubble[];
  summary: RoundSummary | null;
  result: ResultDisplay | null;
  /** Des animations sont en cours : le joueur ne peut pas encore jouer. */
  busy: boolean;
  /** Carte envoyée au serveur, en attente de confirmation. */
  pendingPlay: Card | null;
  netStatus: 'ok' | 'reconnecting';
  stake: number;
  tableId: string | null;
  cardBack: string;
  table: string;
}
