import { randomInt } from 'node:crypto';
import {
  applyPlay,
  BOT_PERSONAS,
  chooseCard,
  cryptoRng,
  newDeck,
  newGame,
  nextRound,
  shuffle,
  stepsDuration,
  teamOf,
  viewFor,
  type BotLevel,
  type Card,
  type ErrorCode,
  type GameState,
  type MatchInfo,
  type Mode,
  type PublicProfile,
  type Rules,
  type Seat,
  type SeatInfo,
  type ServerMessage,
  type Step,
  type Team,
  type Transition,
} from '@ronda/core';
import type { ServerConfig } from './config';

export interface MatchSeat {
  profileId: string | null;
  public: PublicProfile;
  bot: BotLevel | null;
  connected: boolean;
  /** Le jeu joue à la place du joueur (temps écoulé trop souvent ou abandon). */
  auto: boolean;
  left: boolean;
  timeouts: number;
  lastEmote: number;
}

export interface SeatStats {
  darbas: number;
  missas: number;
  rondas: number;
  tringas: number;
}

export interface SeatOutcome {
  profileId: string;
  seat: Seat;
  won: boolean;
  forfeit: boolean;
  stats: SeatStats;
}

export interface MatchHooks {
  send(profileId: string, msg: ServerMessage): void;
  /** Un joueur a quitté la partie en cours : défaite immédiate pour lui. */
  onForfeit(match: Match, outcome: SeatOutcome): void;
  onEnd(match: Match, outcomes: SeatOutcome[], winner: Team | null): void;
}

export interface MatchOptions {
  id: string;
  mode: Mode;
  rules: Rules;
  seats: MatchSeat[];
  stake: number;
  tableId: string | null;
  isPrivate: boolean;
  config: ServerConfig;
  hooks: MatchHooks;
}

const EMOTE_COOLDOWN_MS = 1_500;
/** Délai laissé à un joueur déconnecté avant de jouer pour lui. */
const DISCONNECTED_GRACE_MS = 6_000;

/** Une partie en ligne : le serveur applique les règles, cache les mains et gère les chronos. */
export class Match {
  readonly id: string;
  readonly mode: Mode;
  readonly rules: Rules;
  readonly seats: MatchSeat[];
  readonly stake: number;
  readonly tableId: string | null;
  readonly isPrivate: boolean;
  state!: GameState;
  deadline: number | null = null;
  finished = false;
  readonly createdAt = Date.now();
  private readonly config: ServerConfig;
  private readonly hooks: MatchHooks;
  private readonly stats: SeatStats[];
  private timer: NodeJS.Timeout | null = null;
  private readonly rng = cryptoRng();

  constructor(opts: MatchOptions) {
    this.id = opts.id;
    this.mode = opts.mode;
    this.rules = opts.rules;
    this.seats = opts.seats;
    this.stake = opts.stake;
    this.tableId = opts.tableId;
    this.isPrivate = opts.isPrivate;
    this.config = opts.config;
    this.hooks = opts.hooks;
    this.stats = opts.seats.map(() => ({ darbas: 0, missas: 0, rondas: 0, tringas: 0 }));
  }

  start(): void {
    const t = newGame(this.rules, { deck: this.freshDeck(), dealer: randomInt(this.rules.players) });
    this.state = t.state;
    this.track(t.steps);
    const first = t.steps[0]?.state ?? t.state;
    for (const seat of this.humanSeats()) {
      this.sendTo(seat, { t: 'match.start', match: this.info(seat), view: viewFor(first, seat), deadline: null });
    }
    this.commitSteps(t.steps);
  }

  seatOf(profileId: string): Seat {
    return this.seats.findIndex((s) => s.profileId === profileId);
  }

  info(seat: Seat): MatchInfo {
    return {
      matchId: this.id,
      mode: this.mode,
      rules: this.rules,
      seat,
      seats: this.seats.map((s, i) => this.seatInfo(i, s)),
      stake: this.stake,
      tableId: this.tableId,
      private: this.isPrivate,
      turnMs: this.config.turnMs,
    };
  }

  seatInfo(seat: Seat, s = this.seats[seat]): SeatInfo {
    return { seat, player: s.public, bot: s.bot, connected: s.bot !== null || s.connected, auto: s.auto };
  }

  /** Coup d'un joueur humain. */
  play(profileId: string, card: Card, move: number): ErrorCode | null {
    const seat = this.seatOf(profileId);
    if (seat < 0 || this.finished || this.seats[seat].left) return 'not_in_match';
    const s = this.state;
    if (s.phase !== 'play' || s.turn !== seat || move !== s.moveCount) return 'illegal_move';
    let t: Transition;
    try {
      t = applyPlay(s, seat, card);
    } catch {
      return 'illegal_move';
    }
    const info = this.seats[seat];
    info.timeouts = 0;
    if (info.auto) {
      info.auto = false;
      this.broadcastSeat(seat);
    }
    this.commit(t);
    return null;
  }

  resume(profileId: string): void {
    const seat = this.seatOf(profileId);
    if (seat < 0 || this.seats[seat].left) return;
    const info = this.seats[seat];
    info.timeouts = 0;
    if (info.auto) {
      info.auto = false;
      this.broadcastSeat(seat);
      if (this.state.phase === 'play' && this.state.turn === seat) this.schedule(0);
    }
  }

  emote(profileId: string, id: string): void {
    const seat = this.seatOf(profileId);
    if (seat < 0) return;
    const now = Date.now();
    if (now - this.seats[seat].lastEmote < EMOTE_COOLDOWN_MS) return;
    this.seats[seat].lastEmote = now;
    for (const other of this.humanSeats()) this.sendTo(other, { t: 'match.emote', seat, id });
  }

  setConnected(profileId: string, connected: boolean): void {
    const seat = this.seatOf(profileId);
    if (seat < 0 || this.seats[seat].left) return;
    const info = this.seats[seat];
    if (info.connected === connected) return;
    info.connected = connected;
    if (connected) {
      info.timeouts = 0;
      info.auto = false;
      this.sendTo(seat, { t: 'match.sync', match: this.info(seat), view: viewFor(this.state, seat), deadline: this.deadline });
    }
    this.broadcastSeat(seat);
    // Si c'est à lui de jouer, on recale le chrono (délai de grâce ou chrono normal).
    if (!this.finished && this.state.phase === 'play' && this.state.turn === seat) this.schedule(0);
  }

  /** Renvoie l'état complet à un joueur (reconnexion, retour au premier plan). */
  sync(profileId: string): void {
    const seat = this.seatOf(profileId);
    if (seat < 0) return;
    this.sendTo(seat, { t: 'match.sync', match: this.info(seat), view: viewFor(this.state, seat), deadline: this.deadline });
  }

  /** Abandon : défaite immédiate, un bot finit la partie à sa place. */
  leave(profileId: string): void {
    const seat = this.seatOf(profileId);
    if (seat < 0 || this.seats[seat].left || this.finished) return;
    const info = this.seats[seat];
    info.left = true;
    info.auto = true;
    info.connected = false;
    this.hooks.onForfeit(this, { profileId, seat, won: false, forfeit: true, stats: this.stats[seat] });
    const remaining = this.humanSeats();
    if (remaining.length === 0) {
      this.finish(null);
      return;
    }
    if (this.mode === '1v1') {
      // En 1 contre 1, l'adversaire gagne tout de suite.
      this.finish(teamOf((seat + 1) % 2));
      return;
    }
    this.broadcastSeat(seat);
    if (this.state.phase === 'play' && this.state.turn === seat) this.schedule(0);
  }

  dispose(): void {
    this.clearTimer();
    this.finished = true;
  }

  // -------------------------------------------------------------------------------------------

  private freshDeck(): Card[] {
    return shuffle(newDeck(), this.rng);
  }

  /** Places encore tenues par des humains présents dans la partie. */
  humanSeats(): Seat[] {
    const out: Seat[] = [];
    this.seats.forEach((s, i) => {
      if (s.profileId && !s.left) out.push(i);
    });
    return out;
  }

  private sendTo(seat: Seat, msg: ServerMessage): void {
    const id = this.seats[seat].profileId;
    if (id && !this.seats[seat].left) this.hooks.send(id, msg);
  }

  private broadcastSeat(seat: Seat): void {
    const info = this.seatInfo(seat);
    for (const other of this.humanSeats()) this.sendTo(other, { t: 'match.seat', info });
  }

  private track(steps: Step[]): void {
    for (const { event } of steps) {
      if (event.type !== 'points' || event.seat === null) continue;
      const st = this.stats[event.seat];
      if (event.reason === 'darba' || event.reason === 'khamsa' || event.reason === 'achra') st.darbas++;
      else if (event.reason === 'missa') st.missas++;
      else if (event.reason === 'ronda') st.rondas++;
      else if (event.reason === 'tringa') st.tringas++;
    }
  }

  private commit(t: Transition): void {
    this.state = t.state;
    this.track(t.steps);
    this.commitSteps(t.steps);
  }

  /** Programme la suite puis envoie les étapes à chaque joueur (avec sa propre vue). */
  private commitSteps(steps: Step[]): void {
    const animMs = Math.round(stepsDuration(steps.map((s) => s.event)) * this.config.animationScale);
    this.schedule(animMs);
    for (const seat of this.humanSeats()) {
      this.sendTo(seat, {
        t: 'match.steps',
        steps: steps.map((st) => ({ event: st.event, view: viewFor(st.state, seat) })),
        deadline: this.deadline,
      });
    }
  }

  private clearTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private later(ms: number, fn: () => void): void {
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      if (!this.finished) fn();
    }, Math.max(0, ms));
  }

  /** Décide de la suite : manche suivante, coup d'un bot ou attente d'un humain. */
  private schedule(animMs: number): void {
    this.deadline = null;
    if (this.finished) return;
    const s = this.state;
    if (s.phase === 'gameOver') {
      this.clearTimer();
      this.finish(s.winner);
      return;
    }
    if (s.phase === 'roundEnd') {
      this.later(animMs + this.config.roundPauseMs, () => this.commit(nextRound(this.state, { deck: this.freshDeck() })));
      return;
    }
    const seat = s.turn;
    const info = this.seats[seat];
    if (info.bot || info.auto || info.left) {
      const [min, max] = this.config.botDelayMs;
      const think = info.bot ? min + Math.floor(this.rng() * (max - min + 1)) : Math.min(min, 600);
      this.later(animMs + think, () => this.autoPlay(seat));
      return;
    }
    const wait = info.connected ? this.config.turnMs : Math.min(this.config.turnMs, DISCONNECTED_GRACE_MS);
    this.deadline = Date.now() + animMs + wait;
    this.later(animMs + wait, () => this.onTimeout(seat));
  }

  private onTimeout(seat: Seat): void {
    const info = this.seats[seat];
    info.timeouts += 1;
    if (!info.auto && (info.timeouts >= this.config.maxTimeouts || !info.connected)) {
      info.auto = true;
      this.broadcastSeat(seat);
    }
    this.autoPlay(seat);
  }

  private autoPlay(seat: Seat): void {
    const s = this.state;
    if (s.phase !== 'play' || s.turn !== seat) return;
    const level: BotLevel = this.seats[seat].bot ?? 'medium';
    // 48 mondes simulés : ~2 ms par décision experte. En dessous, l'expert s'affaiblit nettement
    // en 2v2 (trois mains cachées à deviner) : 54 % contre Mtwasset avec 24 mondes, 59 % avec 48.
    const card = chooseCard(viewFor(s, seat), level, { rng: this.rng, samples: 48 });
    this.commit(applyPlay(s, seat, card));
  }

  private finish(winner: Team | null): void {
    if (this.finished) return;
    this.finished = true;
    this.clearTimer();
    this.deadline = null;
    const outcomes: SeatOutcome[] = this.humanSeats().map((seat) => ({
      profileId: this.seats[seat].profileId!,
      seat,
      won: winner !== null && teamOf(seat) === winner,
      forfeit: false,
      stats: this.stats[seat],
    }));
    this.hooks.onEnd(this, outcomes, winner);
  }
}

const BOT_LEVEL_NUMBER: Record<BotLevel, [number, number]> = { easy: [1, 5], medium: [4, 12], hard: [10, 25] };

export function botSeat(level: BotLevel, taken: Set<string>): MatchSeat {
  const free = BOT_PERSONAS.filter((p) => !taken.has(p.name));
  const persona = free[randomInt(free.length)] ?? BOT_PERSONAS[0];
  taken.add(persona.name);
  const [lo, hi] = BOT_LEVEL_NUMBER[level];
  return {
    profileId: null,
    public: {
      id: `bot-${persona.name.toLowerCase()}`,
      name: persona.name,
      avatar: persona.avatar,
      level: lo + randomInt(hi - lo + 1),
      frame: 'frame-none',
      vip: false,
    },
    bot: level,
    connected: true,
    auto: false,
    left: false,
    timeouts: 0,
    lastEmote: 0,
  };
}

export function humanSeat(profileId: string, pub: PublicProfile, connected: boolean): MatchSeat {
  return { profileId, public: pub, bot: null, connected, auto: false, left: false, timeouts: 0, lastEmote: 0 };
}
