import { randomBytes } from 'node:crypto';
import type { WebSocket } from 'ws';
import {
  BOT_LEVELS,
  findTable,
  isCard,
  isValidEmote,
  levelForXp,
  makeRules,
  matchXp,
  MODES,
  modePlayers,
  prizePerWinner,
  PROTOCOL_VERSION,
  sanitizeName,
  sanitizeRules,
  TABLES,
  AVATAR_COUNT,
  type BotLevel,
  type ClientMessage,
  type ErrorCode,
  type LeaderboardEntry,
  type MatchResult,
  type Mode,
  type Profile,
  type RoomState,
  type Rules,
  type SeatInfo,
  type ServerMessage,
  type Team,
} from '@ronda/core';
import { createProfile, freshProfile, profileForToken, publicProfile, randomCode, restoreWithCode } from './accounts';
import type { ServerConfig } from './config';
import { botSeat, humanSeat, Match, type MatchSeat, type SeatOutcome } from './match';
import type { Store } from './store';
import { Wallet } from './wallet';

interface Client {
  ws: WebSocket;
  profileId: string | null;
  alive: boolean;
  tokens: number;
  lastRefill: number;
}

interface QueueEntry {
  profileId: string;
  since: number;
}

type RoomSeat = { profileId: string } | { bot: BotLevel } | null;

interface Room {
  code: string;
  mode: Mode;
  hostId: string;
  rules: Rules;
  stake: number;
  seats: RoomSeat[];
  createdAt: number;
}

const ROOM_TTL_MS = 45 * 60 * 1000;
/** Un joueur qui quitte l'appli (pour partager le code sur WhatsApp…) garde sa place 3 minutes. */
const ROOM_GRACE_MS = 3 * 60 * 1000;
const MAX_STAKE = 1_000_000;
/** Débit autorisé : 12 messages par seconde, avec une réserve de 30. */
const RATE_PER_SEC = 12;
const RATE_BURST = 30;

/** Chef d'orchestre du serveur : connexions, files d'attente, salons privés et parties. */
export class Hub {
  private readonly clients = new Set<Client>();
  private readonly byProfile = new Map<string, Client>();
  private readonly matches = new Map<string, Match>();
  private readonly matchOf = new Map<string, Match>();
  private readonly rooms = new Map<string, Room>();
  private readonly roomOf = new Map<string, Room>();
  private readonly queues = new Map<string, QueueEntry[]>();
  private readonly queueOf = new Map<string, string>();
  /** Joueurs déconnectés qui gardent leur place dans un salon : date de déconnexion. */
  private readonly roomGrace = new Map<string, number>();
  private readonly wallet: Wallet;
  private readonly tickTimer: NodeJS.Timeout;
  private leaderboardCache: { at: number; entries: LeaderboardEntry[] } | null = null;

  constructor(
    private readonly config: ServerConfig,
    private readonly store: Store,
  ) {
    this.wallet = new Wallet(store);
    this.tickTimer = setInterval(() => this.tick(), Math.min(1_000, Math.max(50, config.botFillMs / 4)));
    this.tickTimer.unref();
  }

  // -------------------------------------------------------------------------------------------
  // Connexions
  // -------------------------------------------------------------------------------------------

  attach(ws: WebSocket): void {
    const client: Client = { ws, profileId: null, alive: true, tokens: RATE_BURST, lastRefill: Date.now() };
    this.clients.add(client);
    ws.on('pong', () => {
      client.alive = true;
    });
    ws.on('message', (data, isBinary) => {
      if (isBinary) return;
      if (!this.allow(client)) {
        this.send(client, { t: 'error', code: 'rate_limited' });
        return;
      }
      let msg: ClientMessage;
      try {
        msg = JSON.parse(data.toString()) as ClientMessage;
      } catch {
        this.send(client, { t: 'error', code: 'bad_message' });
        return;
      }
      if (typeof msg !== 'object' || msg === null || typeof msg.t !== 'string') {
        this.send(client, { t: 'error', code: 'bad_message' });
        return;
      }
      try {
        this.handle(client, msg);
      } catch (err) {
        console.error('[hub] erreur de traitement', msg.t, err);
        this.send(client, { t: 'error', code: 'server_error' });
      }
    });
    ws.on('close', () => this.detach(client));
    ws.on('error', () => ws.terminate());
  }

  /** Vérifie la présence des clients (appelé toutes les 30 s) et coupe les connexions mortes. */
  heartbeat(): void {
    for (const c of this.clients) {
      if (!c.alive) {
        c.ws.terminate();
        continue;
      }
      c.alive = false;
      c.ws.ping();
    }
  }

  onlineCount(): number {
    return this.byProfile.size;
  }

  status() {
    let waiting = 0;
    for (const q of this.queues.values()) waiting += q.length;
    return { online: this.onlineCount(), matches: this.matches.size, rooms: this.rooms.size, waiting, players: this.store.profileCount() };
  }

  close(): void {
    clearInterval(this.tickTimer);
    for (const m of this.matches.values()) m.dispose();
    for (const c of this.clients) c.ws.terminate();
  }

  private allow(c: Client): boolean {
    const now = Date.now();
    c.tokens = Math.min(RATE_BURST, c.tokens + ((now - c.lastRefill) / 1000) * RATE_PER_SEC);
    c.lastRefill = now;
    if (c.tokens < 1) return false;
    c.tokens -= 1;
    return true;
  }

  private detach(client: Client): void {
    this.clients.delete(client);
    const id = client.profileId;
    if (!id || this.byProfile.get(id) !== client) return;
    this.byProfile.delete(id);
    this.leaveQueue(id);
    const room = this.roomOf.get(id);
    if (room) {
      this.roomGrace.set(id, Date.now());
      this.broadcastRoom(room);
    }
    this.matchOf.get(id)?.setConnected(id, false);
  }

  private send(client: Client, msg: ServerMessage): void {
    if (client.ws.readyState === client.ws.OPEN) client.ws.send(JSON.stringify(msg));
  }

  sendTo(profileId: string, msg: ServerMessage): void {
    const c = this.byProfile.get(profileId);
    if (c) this.send(c, msg);
  }

  private error(client: Client, code: ErrorCode, message?: string): void {
    this.send(client, { t: 'error', code, message });
  }

  private profileMsg(p: Profile): ServerMessage {
    return { t: 'profile', profile: freshProfile(p) };
  }

  // -------------------------------------------------------------------------------------------
  // Messages
  // -------------------------------------------------------------------------------------------

  private handle(client: Client, msg: ClientMessage): void {
    if (msg.t === 'ping') {
      this.send(client, { t: 'pong', ts: Number(msg.ts) || 0, serverTime: Date.now() });
      return;
    }
    if (msg.t === 'hello') {
      this.hello(client, msg);
      return;
    }
    if (msg.t === 'account.restore') {
      this.restore(client, msg.code);
      return;
    }
    const p = client.profileId ? this.store.getProfile(client.profileId) : undefined;
    if (!p) {
      this.error(client, 'not_authenticated');
      return;
    }
    const now = Date.now();
    switch (msg.t) {
      case 'profile.update': {
        if (msg.name !== undefined) {
          const name = sanitizeName(msg.name);
          if (!name) return this.error(client, 'bad_name');
          p.name = name;
        }
        if (msg.avatar !== undefined) {
          if (!Number.isInteger(msg.avatar) || msg.avatar < 0 || msg.avatar >= AVATAR_COUNT) return this.error(client, 'bad_message');
          p.avatar = msg.avatar;
        }
        this.store.saveProfile(p);
        this.send(client, this.profileMsg(p));
        return;
      }
      case 'queue.join':
        return this.joinQueue(client, p, msg.mode, msg.tableId);
      case 'queue.leave':
        this.leaveQueue(p.id);
        this.send(client, { t: 'queue.left' });
        return;
      case 'room.create':
        return this.createRoom(client, p, msg.mode, msg.rules, msg.stake);
      case 'room.join':
        return this.joinRoom(client, p, msg.code);
      case 'room.leave': {
        const room = this.roomOf.get(p.id);
        if (room) this.leaveRoom(p.id, room);
        this.send(client, { t: 'room.closed', reason: 'left' });
        return;
      }
      case 'room.seat':
        return this.roomSeat(client, p, msg.seat);
      case 'room.bot':
        return this.roomBot(client, p, msg.seat, msg.level);
      case 'room.start':
        return this.startRoom(client, p);
      case 'play': {
        const match = this.matchOf.get(p.id);
        if (!match) return this.error(client, 'not_in_match');
        if (!isCard(msg.card) || !Number.isInteger(msg.move)) return this.error(client, 'bad_message');
        const err = match.play(p.id, msg.card, msg.move);
        if (err) {
          this.error(client, err);
          match.sync(p.id);
        }
        return;
      }
      case 'emote': {
        const match = this.matchOf.get(p.id);
        if (match && typeof msg.id === 'string' && isValidEmote(msg.id)) match.emote(p.id, msg.id);
        return;
      }
      case 'match.leave': {
        this.matchOf.get(p.id)?.leave(p.id);
        return;
      }
      case 'match.resume': {
        const match = this.matchOf.get(p.id);
        if (match) {
          match.resume(p.id);
          match.sync(p.id);
        }
        return;
      }
      case 'claim': {
        const r =
          msg.kind === 'daily'
            ? this.wallet.claimDaily(p, now)
            : msg.kind === 'free'
              ? this.wallet.claimFree(p, now)
              : msg.kind === 'ad'
                ? this.wallet.claimAd(p, now)
                : msg.kind === 'rescue'
                  ? this.wallet.claimRescue(p, now)
                  : null;
        if (!r) return this.error(client, 'bad_message');
        if (!r.ok) return this.error(client, r.code);
        this.send(client, { t: 'reward', kind: r.kind ?? msg.kind, coins: r.coins, profile: freshProfile(p) });
        return;
      }
      case 'shop.buy':
      case 'shop.equip': {
        if (typeof msg.itemId !== 'string') return this.error(client, 'bad_message');
        const r = msg.t === 'shop.buy' ? this.wallet.buy(p, msg.itemId) : this.wallet.equip(p, msg.itemId);
        if (!r.ok) return this.error(client, r.code);
        this.send(client, this.profileMsg(p));
        return;
      }
      case 'referral': {
        if (typeof msg.code !== 'string') return this.error(client, 'bad_message');
        const r = this.wallet.referral(p, msg.code, now);
        if (!r.ok) return this.error(client, r.code);
        this.send(client, { t: 'reward', kind: 'referral', coins: 0, profile: freshProfile(p) });
        this.sendTo(r.sponsor.id, { t: 'reward', kind: 'referral', coins: 0, profile: freshProfile(r.sponsor) });
        return;
      }
      case 'leaderboard':
        this.send(client, { t: 'leaderboard', entries: this.leaderboard() });
        return;
      default:
        this.error(client, 'bad_message');
    }
  }

  private hello(client: Client, msg: Extract<ClientMessage, { t: 'hello' }>): void {
    if (msg.v !== PROTOCOL_VERSION) {
      this.error(client, 'bad_version', 'Mettez l’application à jour');
      return;
    }
    let profile = profileForToken(this.store, msg.token);
    let token = typeof msg.token === 'string' ? msg.token : '';
    if (!profile) {
      const created = createProfile(this.store, { name: msg.name, avatar: msg.avatar });
      profile = created.profile;
      token = created.token;
    }
    this.login(client, profile, token);
  }

  private restore(client: Client, code: unknown): void {
    const r = restoreWithCode(this.store, code);
    if (!r) {
      this.error(client, 'bad_code');
      return;
    }
    if (client.profileId && client.profileId !== r.profile.id) this.detachProfile(client);
    this.login(client, r.profile, r.token);
  }

  private detachProfile(client: Client): void {
    const id = client.profileId;
    if (!id) return;
    if (this.byProfile.get(id) === client) {
      this.byProfile.delete(id);
      this.leaveQueue(id);
      const room = this.roomOf.get(id);
      if (room) this.leaveRoom(id, room);
      this.matchOf.get(id)?.setConnected(id, false);
    }
    client.profileId = null;
  }

  private login(client: Client, profile: Profile, token: string): void {
    // Une seule connexion par compte : l'ancienne est fermée.
    const previous = this.byProfile.get(profile.id);
    if (previous && previous !== client) {
      previous.profileId = null;
      this.clients.delete(previous);
      previous.ws.close(4001, 'Connecté sur un autre appareil');
    }
    client.profileId = profile.id;
    this.byProfile.set(profile.id, client);
    this.send(client, { t: 'welcome', token, profile: freshProfile(profile), online: this.onlineCount(), serverTime: Date.now() });
    const match = this.matchOf.get(profile.id);
    if (match) {
      match.setConnected(profile.id, true);
      match.sync(profile.id);
    }
    const room = this.roomOf.get(profile.id);
    if (room) {
      this.roomGrace.delete(profile.id);
      this.broadcastRoom(room);
    }
  }

  // -------------------------------------------------------------------------------------------
  // Matchmaking
  // -------------------------------------------------------------------------------------------

  private busy(profileId: string): boolean {
    return this.matchOf.has(profileId) || this.roomOf.has(profileId);
  }

  private joinQueue(client: Client, p: Profile, mode: Mode, tableId: string): void {
    const table = typeof tableId === 'string' ? findTable(tableId) : undefined;
    if (!MODES.includes(mode) || !table) return this.error(client, 'bad_message');
    if (this.busy(p.id)) return this.error(client, 'busy');
    if (levelForXp(p.xp) < table.minLevel) return this.error(client, 'level_too_low');
    if (!this.wallet.canAfford(p, table.entry)) return this.error(client, 'not_enough_coins');
    this.leaveQueue(p.id);
    const key = `${mode}:${table.id}`;
    const entry = { profileId: p.id, since: Date.now() };
    const queue = this.queues.get(key) ?? [];
    queue.push(entry);
    this.queues.set(key, queue);
    this.queueOf.set(p.id, key);
    this.send(client, { t: 'queue.status', mode, tableId: table.id, since: entry.since });
    this.tryMatch(key, false);
  }

  private leaveQueue(profileId: string): void {
    const key = this.queueOf.get(profileId);
    if (!key) return;
    this.queueOf.delete(profileId);
    const queue = this.queues.get(key);
    if (!queue) return;
    const i = queue.findIndex((e) => e.profileId === profileId);
    if (i >= 0) queue.splice(i, 1);
    if (!queue.length) this.queues.delete(key);
  }

  /** Forme une table dès qu'il y a assez de joueurs, ou complète avec des bots après l'attente. */
  private tryMatch(key: string, allowBots: boolean): void {
    const queue = this.queues.get(key);
    if (!queue?.length) return;
    const [mode, tableId] = key.split(':') as [Mode, string];
    const table = findTable(tableId)!;
    const players = modePlayers(mode);
    // Écarte les joueurs partis ou qui n'ont plus de quoi payer la mise.
    for (let i = queue.length - 1; i >= 0; i--) {
      const p = this.store.getProfile(queue[i].profileId);
      if (!p || !this.byProfile.has(p.id) || !this.wallet.canAfford(p, table.entry)) {
        this.queueOf.delete(queue[i].profileId);
        queue.splice(i, 1);
      }
    }
    while (queue.length >= players) {
      const group = queue.splice(0, players);
      this.startPublicMatch(mode, table.id, group.map((e) => e.profileId));
    }
    if (allowBots && queue.length && this.config.botFillMs > 0 && Date.now() - queue[0].since >= this.config.botFillMs) {
      const group = queue.splice(0, queue.length);
      this.startPublicMatch(mode, table.id, group.map((e) => e.profileId));
    }
    if (!queue.length) this.queues.delete(key);
  }

  private startPublicMatch(mode: Mode, tableId: string, humans: string[]): void {
    const table = findTable(tableId)!;
    const players = modePlayers(mode);
    for (const id of humans) this.queueOf.delete(id);
    const tableIndex = TABLES.indexOf(table);
    const botLevel: BotLevel = tableIndex >= 3 ? 'hard' : 'medium';
    const taken = new Set<string>();
    const seats: MatchSeat[] = [];
    for (let i = 0; i < players; i++) {
      const id = humans[i];
      const p = id ? this.store.getProfile(id) : undefined;
      seats.push(p ? humanSeat(p.id, publicProfile(p), true) : botSeat(botLevel, taken));
    }
    this.startMatch({ mode, rules: makeRules(players), seats, stake: table.entry, tableId: table.id, isPrivate: false });
  }

  private startMatch(opts: { mode: Mode; rules: Rules; seats: MatchSeat[]; stake: number; tableId: string | null; isPrivate: boolean }): void {
    for (const s of opts.seats) {
      if (!s.profileId) continue;
      const p = this.store.getProfile(s.profileId)!;
      if (opts.stake > 0) this.wallet.debit(p, opts.stake);
      this.sendTo(p.id, this.profileMsg(p));
    }
    const match = new Match({
      id: randomBytes(8).toString('base64url'),
      ...opts,
      config: this.config,
      hooks: {
        send: (profileId, msg) => this.sendTo(profileId, msg),
        onForfeit: (m, outcome) => this.onForfeit(m, outcome),
        onEnd: (m, outcomes, winner) => this.onMatchEnd(m, outcomes, winner),
      },
    });
    this.matches.set(match.id, match);
    for (const s of opts.seats) if (s.profileId) this.matchOf.set(s.profileId, match);
    match.start();
  }

  private settle(match: Match, outcome: SeatOutcome, winner: Team | null): { result: MatchResult; profile: Profile } | null {
    const p = this.store.getProfile(outcome.profileId);
    if (!p) return null;
    const tableIndex = match.tableId ? Math.max(0, TABLES.findIndex((t) => t.id === match.tableId)) : 0;
    const st = p.stats;
    st.played += 1;
    if (match.mode === '1v1') st.played1v1 += 1;
    else st.played2v2 += 1;
    st.darbas += outcome.stats.darbas;
    st.missas += outcome.stats.missas;
    st.rondas += outcome.stats.rondas;
    st.tringas += outcome.stats.tringas;
    let coins = match.stake > 0 ? -match.stake : 0;
    if (outcome.won) {
      st.won += 1;
      if (match.mode === '1v1') st.won1v1 += 1;
      else st.won2v2 += 1;
      st.streak += 1;
      st.bestStreak = Math.max(st.bestStreak, st.streak);
      if (match.stake > 0) {
        const prize = prizePerWinner(match.stake, match.mode);
        p.coins += prize;
        coins += prize;
        st.coinsWon += prize - match.stake;
      }
    } else {
      st.streak = 0;
    }
    const xp = outcome.forfeit ? 5 : matchXp(outcome.won, tableIndex);
    const levelUp = this.wallet.addXp(p, xp);
    this.store.saveProfile(p);
    return {
      result: { winnerTeam: winner, scores: [match.state.scores[0], match.state.scores[1]], coins, xp, levelUp, forfeit: outcome.forfeit },
      profile: p,
    };
  }

  private onForfeit(match: Match, outcome: SeatOutcome): void {
    this.matchOf.delete(outcome.profileId);
    const settled = this.settle(match, outcome, null);
    if (settled) this.sendTo(outcome.profileId, { t: 'match.end', result: settled.result, profile: freshProfile(settled.profile) });
  }

  private onMatchEnd(match: Match, outcomes: SeatOutcome[], winner: Team | null): void {
    this.matches.delete(match.id);
    for (const outcome of outcomes) {
      if (this.matchOf.get(outcome.profileId) === match) this.matchOf.delete(outcome.profileId);
      const settled = this.settle(match, outcome, winner);
      if (settled) this.sendTo(outcome.profileId, { t: 'match.end', result: settled.result, profile: freshProfile(settled.profile) });
    }
    this.leaderboardCache = null;
  }

  // -------------------------------------------------------------------------------------------
  // Salons privés entre amis
  // -------------------------------------------------------------------------------------------

  private roomState(room: Room): RoomState {
    const seats: SeatInfo[] = room.seats.map((s, seat) => {
      if (s && 'profileId' in s) {
        const p = this.store.getProfile(s.profileId);
        return { seat, player: p ? publicProfile(p) : null, bot: null, connected: this.byProfile.has(s.profileId), auto: false };
      }
      if (s && 'bot' in s) return { seat, player: null, bot: s.bot, connected: true, auto: false };
      return { seat, player: null, bot: null, connected: false, auto: false };
    });
    return { code: room.code, mode: room.mode, hostId: room.hostId, rules: room.rules, stake: room.stake, seats };
  }

  private broadcastRoom(room: Room): void {
    const state = this.roomState(room);
    for (const s of room.seats) if (s && 'profileId' in s) this.sendTo(s.profileId, { t: 'room', room: state });
  }

  private createRoom(client: Client, p: Profile, mode: Mode, rules: unknown, stake: unknown): void {
    if (!MODES.includes(mode)) return this.error(client, 'bad_message');
    if (this.busy(p.id)) return this.error(client, 'busy');
    const amount = Number.isInteger(stake) && (stake as number) > 0 ? Math.min(stake as number, MAX_STAKE) : 0;
    if (!this.wallet.canAfford(p, amount)) return this.error(client, 'not_enough_coins');
    this.leaveQueue(p.id);
    let code: string;
    do code = randomCode(5);
    while (this.rooms.has(code));
    const players = modePlayers(mode);
    const room: Room = {
      code,
      mode,
      hostId: p.id,
      rules: sanitizeRules(rules, players),
      stake: amount,
      seats: Array.from({ length: players }, (_, i) => (i === 0 ? { profileId: p.id } : null)),
      createdAt: Date.now(),
    };
    this.rooms.set(code, room);
    this.roomOf.set(p.id, room);
    this.broadcastRoom(room);
  }

  private joinRoom(client: Client, p: Profile, rawCode: unknown): void {
    const code = typeof rawCode === 'string' ? rawCode.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
    const room = this.rooms.get(code);
    if (!room) return this.error(client, 'room_not_found');
    if (this.roomOf.get(p.id) === room) return this.send(client, { t: 'room', room: this.roomState(room) });
    if (this.busy(p.id)) return this.error(client, 'busy');
    if (!this.wallet.canAfford(p, room.stake)) return this.error(client, 'not_enough_coins');
    // Priorité aux places vides, sinon on remplace un bot.
    let seat = room.seats.findIndex((s) => s === null);
    if (seat < 0) seat = room.seats.findIndex((s) => s !== null && 'bot' in s);
    if (seat < 0) return this.error(client, 'room_full');
    this.leaveQueue(p.id);
    room.seats[seat] = { profileId: p.id };
    this.roomOf.set(p.id, room);
    this.broadcastRoom(room);
  }

  private leaveRoom(profileId: string, room: Room): void {
    this.roomOf.delete(profileId);
    this.roomGrace.delete(profileId);
    const i = room.seats.findIndex((s) => s !== null && 'profileId' in s && s.profileId === profileId);
    if (i >= 0) room.seats[i] = null;
    const humans = room.seats.filter((s): s is { profileId: string } => s !== null && 'profileId' in s);
    if (!humans.length) {
      this.rooms.delete(room.code);
      return;
    }
    if (room.hostId === profileId) room.hostId = humans[0].profileId;
    this.broadcastRoom(room);
  }

  private roomSeat(client: Client, p: Profile, seat: unknown): void {
    const room = this.roomOf.get(p.id);
    if (!room) return this.error(client, 'room_not_found');
    if (!Number.isInteger(seat) || (seat as number) < 0 || (seat as number) >= room.seats.length) return this.error(client, 'bad_message');
    if (room.seats[seat as number] !== null) return this.error(client, 'room_full');
    const from = room.seats.findIndex((s) => s !== null && 'profileId' in s && s.profileId === p.id);
    room.seats[from] = null;
    room.seats[seat as number] = { profileId: p.id };
    this.broadcastRoom(room);
  }

  private roomBot(client: Client, p: Profile, seat: unknown, level: unknown): void {
    const room = this.roomOf.get(p.id);
    if (!room) return this.error(client, 'room_not_found');
    if (room.hostId !== p.id) return this.error(client, 'not_host');
    if (!Number.isInteger(seat) || (seat as number) < 0 || (seat as number) >= room.seats.length) return this.error(client, 'bad_message');
    const current = room.seats[seat as number];
    if (current !== null && 'profileId' in current) return this.error(client, 'room_full');
    if (level !== null && !BOT_LEVELS.includes(level as BotLevel)) return this.error(client, 'bad_message');
    room.seats[seat as number] = level === null ? null : { bot: level as BotLevel };
    this.broadcastRoom(room);
  }

  private startRoom(client: Client, p: Profile): void {
    const room = this.roomOf.get(p.id);
    if (!room) return this.error(client, 'room_not_found');
    if (room.hostId !== p.id) return this.error(client, 'not_host');
    const humans = room.seats.filter((s): s is { profileId: string } => s !== null && 'profileId' in s);
    for (const h of humans) {
      const hp = this.store.getProfile(h.profileId);
      if (!hp || !this.wallet.canAfford(hp, room.stake)) return this.error(client, 'not_enough_coins', hp?.name);
    }
    const taken = new Set<string>();
    const seats: MatchSeat[] = room.seats.map((s) => {
      if (s && 'profileId' in s) {
        const hp = this.store.getProfile(s.profileId)!;
        return humanSeat(hp.id, publicProfile(hp), this.byProfile.has(hp.id));
      }
      return botSeat(s && 'bot' in s ? s.bot : 'medium', taken);
    });
    this.rooms.delete(room.code);
    for (const h of humans) {
      this.roomOf.delete(h.profileId);
      this.roomGrace.delete(h.profileId);
    }
    this.startMatch({ mode: room.mode, rules: room.rules, seats, stake: room.stake, tableId: null, isPrivate: true });
  }

  // -------------------------------------------------------------------------------------------
  // Divers
  // -------------------------------------------------------------------------------------------

  private tick(): void {
    for (const key of [...this.queues.keys()]) this.tryMatch(key, true);
    const now = Date.now();
    for (const [id, since] of [...this.roomGrace]) {
      if (now - since < ROOM_GRACE_MS) continue;
      const room = this.roomOf.get(id);
      if (room) this.leaveRoom(id, room);
      else this.roomGrace.delete(id);
    }
    for (const room of [...this.rooms.values()]) {
      if (now - room.createdAt < ROOM_TTL_MS) continue;
      this.rooms.delete(room.code);
      for (const s of room.seats) {
        if (s && 'profileId' in s) {
          this.roomOf.delete(s.profileId);
          this.sendTo(s.profileId, { t: 'room.closed', reason: 'expired' });
        }
      }
    }
  }

  leaderboard(): LeaderboardEntry[] {
    const now = Date.now();
    if (this.leaderboardCache && now - this.leaderboardCache.at < 60_000) return this.leaderboardCache.entries;
    const entries = this.store
      .allProfiles()
      .filter((p) => p.stats.played > 0)
      .sort((a, b) => b.xp - a.xp || b.stats.won - a.stats.won)
      .slice(0, 50)
      .map((p, i) => ({ rank: i + 1, player: publicProfile(p, now), xp: p.xp, won: p.stats.won }));
    this.leaderboardCache = { at: now, entries };
    return entries;
  }

  /** Achat confirmé par le store (webhook RevenueCat). */
  grantPurchase(profileId: string, productId: string, transactionId: string): ErrorCode | null {
    const p = this.store.getProfile(profileId);
    if (!p) return 'not_authenticated';
    const r = this.wallet.grantPurchase(p, productId, transactionId, Date.now());
    if (!r.ok) return r.code === 'already_claimed' ? null : r.code;
    this.sendTo(p.id, { t: 'reward', kind: 'purchase', coins: r.coins, profile: freshProfile(p) });
    return null;
  }
}
