import type { BotLevel } from './bots/bots';
import type { Card } from './engine/cards';
import type { Rules } from './engine/rules';
import type { GameEvent, Seat, Team } from './engine/types';
import type { PlayerView } from './engine/view';
import type { Mode, ShopCategory } from './economy';

/** À incrémenter à chaque changement incompatible du protocole. */
export const PROTOCOL_VERSION = 1;

export interface PublicProfile {
  id: string;
  name: string;
  avatar: number;
  level: number;
  frame: string;
  vip: boolean;
}

export interface PlayerStats {
  played: number;
  won: number;
  played1v1: number;
  won1v1: number;
  played2v2: number;
  won2v2: number;
  darbas: number;
  missas: number;
  rondas: number;
  tringas: number;
  streak: number;
  bestStreak: number;
  coinsWon: number;
}

export interface Profile extends PublicProfile {
  coins: number;
  xp: number;
  stats: PlayerStats;
  daily: { streak: number; lastClaim: string | null };
  /** Horodatage à partir duquel les pièces gratuites sont disponibles. */
  freeCoinsAt: number;
  ads: { date: string; count: number };
  rescueDate: string | null;
  owned: string[];
  equipped: Record<ShopCategory, string>;
  noAds: boolean;
  vipUntil: number | null;
  /** Code à noter pour retrouver son compte sur un autre téléphone. */
  transferCode: string;
  referralCode: string;
  referredBy: string | null;
  createdAt: number;
}

export interface SeatInfo {
  seat: Seat;
  player: PublicProfile | null;
  /** Niveau du bot qui occupe la place (toujours affiché comme bot). */
  bot: BotLevel | null;
  connected: boolean;
  /** Le jeu joue à la place de ce joueur (absent ou trop lent). */
  auto: boolean;
}

export interface RoomState {
  code: string;
  mode: Mode;
  hostId: string;
  rules: Rules;
  stake: number;
  seats: SeatInfo[];
}

export interface MatchInfo {
  matchId: string;
  mode: Mode;
  rules: Rules;
  seat: Seat;
  seats: SeatInfo[];
  stake: number;
  tableId: string | null;
  private: boolean;
  turnMs: number;
}

export interface WireStep {
  event: GameEvent;
  view: PlayerView;
}

export interface MatchResult {
  winnerTeam: Team | null;
  scores: [number, number];
  /** Pièces gagnées (positif) ou mise perdue (négatif). */
  coins: number;
  xp: number;
  levelUp: number | null;
  forfeit: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  player: PublicProfile;
  xp: number;
  won: number;
}

export type RewardKind = 'daily' | 'free' | 'ad' | 'rescue' | 'levelUp' | 'purchase' | 'referral' | 'vip';

export type ClientMessage =
  | { t: 'hello'; v: number; token?: string; name?: string; avatar?: number; lang?: string; platform?: string }
  | { t: 'profile.update'; name?: string; avatar?: number }
  | { t: 'queue.join'; mode: Mode; tableId: string }
  | { t: 'queue.leave' }
  | { t: 'room.create'; mode: Mode; rules?: Partial<Rules>; stake?: number }
  | { t: 'room.join'; code: string }
  | { t: 'room.leave' }
  | { t: 'room.seat'; seat: Seat }
  | { t: 'room.bot'; seat: Seat; level: BotLevel | null }
  | { t: 'room.start' }
  | { t: 'play'; card: Card; move: number }
  | { t: 'emote'; id: string }
  | { t: 'match.leave' }
  /** Reprendre la main après que le jeu a joué automatiquement (temps écoulé). */
  | { t: 'match.resume' }
  | { t: 'claim'; kind: 'daily' | 'free' | 'ad' | 'rescue' }
  | { t: 'shop.buy'; itemId: string }
  | { t: 'shop.equip'; itemId: string }
  | { t: 'referral'; code: string }
  | { t: 'leaderboard' }
  | { t: 'account.restore'; code: string }
  | { t: 'ping'; ts: number };

export type ErrorCode =
  | 'bad_version'
  | 'bad_message'
  | 'not_authenticated'
  | 'not_enough_coins'
  | 'level_too_low'
  | 'room_not_found'
  | 'room_full'
  | 'not_host'
  | 'busy'
  | 'not_in_match'
  | 'illegal_move'
  | 'already_claimed'
  | 'not_available'
  | 'rate_limited'
  | 'unknown_item'
  | 'bad_name'
  | 'bad_code'
  | 'server_error';

export type ServerMessage =
  | { t: 'welcome'; token: string; profile: Profile; online: number; serverTime: number }
  | { t: 'profile'; profile: Profile }
  | { t: 'queue.status'; mode: Mode; tableId: string; since: number }
  | { t: 'queue.left' }
  | { t: 'room'; room: RoomState }
  | { t: 'room.closed'; reason: 'left' | 'host_left' | 'started_elsewhere' | 'expired' }
  | { t: 'match.start'; match: MatchInfo; view: PlayerView; deadline: number | null }
  | { t: 'match.steps'; steps: WireStep[]; deadline: number | null }
  | { t: 'match.sync'; match: MatchInfo; view: PlayerView; deadline: number | null }
  | { t: 'match.seat'; info: SeatInfo }
  | { t: 'match.emote'; seat: Seat; id: string }
  | { t: 'match.end'; result: MatchResult; profile: Profile | null }
  | { t: 'reward'; kind: RewardKind; coins: number; profile: Profile }
  | { t: 'leaderboard'; entries: LeaderboardEntry[] }
  | { t: 'online'; count: number }
  | { t: 'error'; code: ErrorCode; message?: string }
  | { t: 'pong'; ts: number; serverTime: number };

export type ClientMessageType = ClientMessage['t'];
