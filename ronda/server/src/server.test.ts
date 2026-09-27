import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import {
  chooseCard,
  findTable,
  PROTOCOL_VERSION,
  prizePerWinner,
  STARTING_COINS,
  type ClientMessage,
  type MatchInfo,
  type PlayerView,
  type Profile,
  type ServerMessage,
} from '@ronda/core';
import { testConfig, type ServerConfig } from './config';
import { createGameServer, type GameServer } from './server';

type Msg<T extends ServerMessage['t']> = Extract<ServerMessage, { t: T }>;

/** Client de test : garde les messages reçus et peut jouer automatiquement ses coups. */
class TestClient {
  readonly ws: WebSocket;
  readonly inbox: ServerMessage[] = [];
  private waiters: { match: (m: ServerMessage) => boolean; resolve: (m: ServerMessage) => void }[] = [];
  token = '';
  profile!: Profile;
  match: MatchInfo | null = null;
  view: PlayerView | null = null;
  autoplay = false;
  ended: Msg<'match.end'> | null = null;

  constructor(url: string) {
    this.ws = new WebSocket(url);
    this.ws.on('message', (data) => {
      const msg = JSON.parse(data.toString()) as ServerMessage;
      this.inbox.push(msg);
      this.onMessage(msg);
      const i = this.waiters.findIndex((w) => w.match(msg));
      if (i >= 0) this.waiters.splice(i, 1)[0].resolve(msg);
    });
  }

  opened(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws.readyState === WebSocket.OPEN) resolve();
      this.ws.once('open', () => resolve());
      this.ws.once('error', reject);
    });
  }

  send(msg: ClientMessage): void {
    this.ws.send(JSON.stringify(msg));
  }

  /** Attend un message (en regardant d'abord ceux déjà reçus après `from`). */
  next<T extends ServerMessage['t']>(t: T, pred: (m: Msg<T>) => boolean = () => true, timeoutMs = 10_000): Promise<Msg<T>> {
    const match = (m: ServerMessage) => m.t === t && pred(m as Msg<T>);
    const already = this.inbox.find(match);
    if (already) {
      this.inbox.splice(this.inbox.indexOf(already), 1);
      return Promise.resolve(already as Msg<T>);
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`timeout en attendant ${t}`)), timeoutMs);
      this.waiters.push({
        match,
        resolve: (m) => {
          clearTimeout(timer);
          this.inbox.splice(this.inbox.indexOf(m), 1);
          resolve(m as Msg<T>);
        },
      });
    });
  }

  async hello(token?: string, name = 'Testeur'): Promise<Profile> {
    await this.opened();
    this.send({ t: 'hello', v: PROTOCOL_VERSION, token, name });
    const w = await this.next('welcome');
    this.token = w.token;
    this.profile = w.profile;
    return w.profile;
  }

  private onMessage(msg: ServerMessage): void {
    if (msg.t === 'profile' || msg.t === 'reward') this.profile = msg.profile;
    if (msg.t === 'welcome') this.profile = msg.profile;
    if (msg.t === 'match.start' || msg.t === 'match.sync') {
      this.match = msg.match;
      this.view = msg.view;
      this.ended = null;
    }
    if (msg.t === 'match.steps') this.view = msg.steps.at(-1)?.view ?? this.view;
    if (msg.t === 'match.end') {
      this.ended = msg;
      if (msg.profile) this.profile = msg.profile;
    }
    if (this.autoplay) this.maybePlay();
  }

  maybePlay(): void {
    const v = this.view;
    if (!v || !this.match || this.ended || v.phase !== 'play' || v.turn !== v.seat || !v.hand.length) return;
    this.send({ t: 'play', card: chooseCard(v, 'medium'), move: v.moveCount });
  }

  close(): void {
    this.ws.close();
  }
}

let server: GameServer;
let url = '';
let clients: TestClient[] = [];

async function start(overrides: Partial<ServerConfig> = {}) {
  server = createGameServer(testConfig(overrides));
  const port = await server.listen();
  url = `ws://127.0.0.1:${port}/ws`;
  return port;
}

function client(): TestClient {
  const c = new TestClient(url);
  clients.push(c);
  return c;
}

beforeEach(() => {
  clients = [];
});

afterEach(async () => {
  for (const c of clients) c.close();
  await server?.close();
});

describe('comptes', () => {
  it('crée un compte invité puis le retrouve avec le jeton', async () => {
    await start();
    const a = client();
    const p = await a.hello(undefined, 'Younes');
    expect(p.coins).toBe(STARTING_COINS);
    expect(p.name).toBe('Younes');
    expect(a.token.length).toBeGreaterThan(20);
    a.close();

    const b = client();
    const again = await b.hello(a.token);
    expect(again.id).toBe(p.id);
  });

  it('refuse une version de protocole trop ancienne', async () => {
    await start();
    const a = client();
    await a.opened();
    a.send({ t: 'hello', v: 0 });
    expect((await a.next('error')).code).toBe('bad_version');
  });

  it('change le pseudo et refuse les pseudos invalides', async () => {
    await start();
    const a = client();
    await a.hello();
    a.send({ t: 'profile.update', name: '  Sara  ', avatar: 3 });
    const p = await a.next('profile');
    expect(p.profile.name).toBe('Sara');
    expect(p.profile.avatar).toBe(3);
    a.send({ t: 'profile.update', name: 'x' });
    expect((await a.next('error')).code).toBe('bad_name');
  });

  it('limite la création de comptes par adresse IP', async () => {
    await start({ accountsPerIpPerHour: 2 });
    await client().hello();
    await client().hello();
    const third = client();
    await third.opened();
    third.send({ t: 'hello', v: PROTOCOL_VERSION });
    expect((await third.next('error')).code).toBe('rate_limited');
  });

  it('restaure le compte sur un autre appareil avec le code de transfert', async () => {
    await start();
    const a = client();
    const p = await a.hello();
    const b = client();
    await b.hello();
    b.send({ t: 'account.restore', code: p.transferCode.toLowerCase() });
    const w = await b.next('welcome');
    expect(w.profile.id).toBe(p.id);
  });
});

describe('récompenses et boutique', () => {
  it('bonus quotidien une fois par jour, pièces gratuites avec délai', async () => {
    await start();
    const a = client();
    await a.hello();
    a.send({ t: 'claim', kind: 'daily' });
    const r = await a.next('reward');
    expect(r.coins).toBe(500);
    expect(r.profile.coins).toBe(STARTING_COINS + 500);
    a.send({ t: 'claim', kind: 'daily' });
    expect((await a.next('error')).code).toBe('already_claimed');
    a.send({ t: 'claim', kind: 'free' });
    expect((await a.next('reward')).kind).toBe('free');
    a.send({ t: 'claim', kind: 'free' });
    expect((await a.next('error')).code).toBe('not_available');
  });

  it('achète et équipe un dos de cartes avec des pièces', async () => {
    await start();
    const a = client();
    await a.hello();
    a.send({ t: 'shop.buy', itemId: 'back-royal' });
    expect((await a.next('error')).code).toBe('level_too_low');
    a.send({ t: 'shop.buy', itemId: 'frame-bronze' });
    expect((await a.next('error')).code).toBe('not_enough_coins');
    a.send({ t: 'claim', kind: 'daily' });
    await a.next('reward');
    a.send({ t: 'shop.buy', itemId: 'frame-bronze' });
    const p = await a.next('profile');
    expect(p.profile.coins).toBe(STARTING_COINS + 500 - 3_000);
    expect(p.profile.equipped.frame).toBe('frame-bronze');
    expect(p.profile.frame).toBe('frame-bronze');
    a.send({ t: 'shop.equip', itemId: 'frame-none' });
    expect((await a.next('profile')).profile.equipped.frame).toBe('frame-none');
  });
});

describe('parties en ligne', () => {
  it('1v1 : deux joueurs de la même table sont appariés et la partie va au bout', async () => {
    await start();
    const a = client();
    const b = client();
    await a.hello(undefined, 'Amine');
    await b.hello(undefined, 'Badr');
    a.autoplay = true;
    b.autoplay = true;
    a.send({ t: 'queue.join', mode: '1v1', tableId: 'tanja' });
    b.send({ t: 'queue.join', mode: '1v1', tableId: 'tanja' });
    const [sa, sb] = await Promise.all([a.next('match.start'), b.next('match.start')]);
    expect(sa.match.seats.every((s) => s.player && !s.bot)).toBe(true);
    expect(sa.match.seat).not.toBe(sb.match.seat);
    // La main de l'adversaire n'est jamais envoyée.
    expect(sa.view.hand.length === 0 || sa.view.hand.every((card) => !sb.view.hand.includes(card))).toBe(true);
    a.maybePlay();
    b.maybePlay();
    const [ea, eb] = await Promise.all([a.next('match.end', () => true, 30_000), b.next('match.end', () => true, 30_000)]);
    const entry = findTable('tanja')!.entry;
    const prize = prizePerWinner(entry, '1v1');
    const winnerCoins = [ea, eb].filter((e) => e.result.coins > 0);
    expect(winnerCoins).toHaveLength(1);
    expect(winnerCoins[0].result.coins).toBe(prize - entry);
    const loser = [ea, eb].find((e) => e.result.coins < 0)!;
    expect(loser.result.coins).toBe(-entry);
    expect(ea.profile!.stats.played).toBe(1);
    expect(Math.max(ea.result.scores[0], ea.result.scores[1])).toBeGreaterThanOrEqual(41);
  });

  it('complète la table avec des bots signalés comme tels quand personne n’arrive', async () => {
    await start({ botFillMs: 150 });
    const a = client();
    await a.hello();
    a.autoplay = true;
    a.send({ t: 'queue.join', mode: '2v2', tableId: 'tanja' });
    await a.next('queue.status');
    const s = await a.next('match.start');
    expect(s.match.seats.filter((x) => x.bot)).toHaveLength(3);
    a.maybePlay();
    const end = await a.next('match.end', () => true, 30_000);
    expect(end.result.forfeit).toBe(false);
    expect(end.profile!.stats.played2v2).toBe(1);
  });

  it('refuse une table au-dessus de son niveau ou de ses moyens', async () => {
    await start();
    const a = client();
    await a.hello();
    a.send({ t: 'queue.join', mode: '1v1', tableId: 'casa' });
    expect((await a.next('error')).code).toBe('level_too_low');
    a.send({ t: 'queue.join', mode: '1v1', tableId: 'nulle-part' });
    expect((await a.next('error')).code).toBe('bad_message');
  });

  it('refuse un coup illégal et renvoie l’état', async () => {
    await start({ botFillMs: 50 });
    const a = client();
    await a.hello();
    a.send({ t: 'queue.join', mode: '1v1', tableId: 'tanja' });
    await a.next('match.start');
    // Attend que ce soit notre tour.
    while (!(a.view && a.view.phase === 'play' && a.view.turn === a.view.seat)) await a.next('match.steps');
    const notMine = [...Array(40).keys()].find((card) => !a.view!.hand.includes(card))!;
    a.send({ t: 'play', card: notMine, move: a.view.moveCount });
    expect((await a.next('error')).code).toBe('illegal_move');
    await a.next('match.sync');
  });

  it('abandon en 1v1 : défaite pour celui qui part, victoire immédiate pour l’autre', async () => {
    await start();
    const a = client();
    const b = client();
    await a.hello();
    await b.hello();
    a.send({ t: 'queue.join', mode: '1v1', tableId: 'tanja' });
    b.send({ t: 'queue.join', mode: '1v1', tableId: 'tanja' });
    await Promise.all([a.next('match.start'), b.next('match.start')]);
    a.send({ t: 'match.leave' });
    const [ea, eb] = await Promise.all([a.next('match.end'), b.next('match.end')]);
    expect(ea.result.forfeit).toBe(true);
    expect(ea.result.coins).toBe(-100);
    expect(eb.result.coins).toBe(prizePerWinner(100, '1v1') - 100);
  });

  it('reconnexion en pleine partie : on retrouve sa place', async () => {
    await start({ turnMs: 5_000 });
    const a = client();
    const b = client();
    await a.hello();
    await b.hello();
    a.send({ t: 'queue.join', mode: '1v1', tableId: 'tanja' });
    b.send({ t: 'queue.join', mode: '1v1', tableId: 'tanja' });
    const [sa] = await Promise.all([a.next('match.start'), b.next('match.start')]);
    a.close();
    await b.next('match.seat', (m) => m.info.seat === sa.match.seat && !m.info.connected);
    const a2 = client();
    await a2.hello(a.token);
    const sync = await a2.next('match.sync');
    expect(sync.match.matchId).toBe(sa.match.matchId);
    expect(sync.match.seat).toBe(sa.match.seat);
  });
});

describe('salons privés', () => {
  it('2v2 entre amis avec un code, les places vides sont prises par des bots', async () => {
    await start();
    const host = client();
    const friend = client();
    await host.hello(undefined, 'Hôte');
    await friend.hello(undefined, 'Ami');
    host.send({ t: 'room.create', mode: '2v2', rules: { target: 21, darbaChain: true } });
    const created = await host.next('room');
    expect(created.room.code).toMatch(/^[A-Z0-9]{5}$/);
    expect(created.room.rules.target).toBe(21);
    friend.send({ t: 'room.join', code: created.room.code.toLowerCase() });
    const joined = await host.next('room', (m) => m.room.seats.filter((s) => s.player).length === 2);
    // L'ami passe en face de l'hôte (même équipe : place 2).
    const friendSeat = joined.room.seats.find((s) => s.player?.name === 'Ami')!.seat;
    if (friendSeat !== 2) {
      friend.send({ t: 'room.seat', seat: 2 });
      await host.next('room', (m) => m.room.seats[2].player?.name === 'Ami');
    }
    host.send({ t: 'room.bot', seat: 1, level: 'hard' });
    await host.next('room', (m) => m.room.seats[1].bot === 'hard');
    friend.send({ t: 'room.start' });
    expect((await friend.next('error')).code).toBe('not_host');
    host.autoplay = true;
    friend.autoplay = true;
    host.send({ t: 'room.start' });
    const [sh, sf] = await Promise.all([host.next('match.start'), friend.next('match.start')]);
    expect(sh.match.private).toBe(true);
    expect(sh.match.seat % 2).toBe(sf.match.seat % 2);
    expect(sh.match.seats.filter((s) => s.bot)).toHaveLength(2);
    host.maybePlay();
    friend.maybePlay();
    const [eh, ef] = await Promise.all([host.next('match.end', () => true, 30_000), friend.next('match.end', () => true, 30_000)]);
    expect(eh.result.winnerTeam).toBe(ef.result.winnerTeam);
    expect(eh.result.coins).toBe(0);

    // Revanche : la même table se rouvre (même code) et chacun y retrouve sa place et ses bots.
    const code = created.room.code;
    expect(eh.result.rematch).toBe(code);
    expect(ef.result.rematch).toBe(code);
    // Les clients de test jouent en rafale : on laisse leur quota de messages anti-abus se
    // recharger (12 par seconde) avant la revanche, comme le ferait un joueur devant l'écran de fin.
    await new Promise((r) => setTimeout(r, 2_600));
    // (les messages de salon d'avant la partie sont encore dans les boîtes de réception)
    friend.inbox.length = 0;
    host.inbox.length = 0;
    friend.send({ t: 'room.join', code });
    const back = await friend.next('room', (m) => m.room.seats[2].player?.name === 'Ami');
    expect(back.room.seats[1].bot).toBe('hard');
    expect(back.room.seats[0].player).toBeNull();
    host.send({ t: 'room.join', code });
    const full = await host.next('room', (m) => m.room.seats[0].player?.name === 'Hôte');
    expect(full.room.seats[2].player?.name).toBe('Ami');
    const leader = full.room.hostId === sh.match.seats[sh.match.seat].player?.id ? host : friend;
    leader.send({ t: 'room.start' });
    await Promise.all([host.next('match.start'), friend.next('match.start')]);
  });

  it('code inconnu', async () => {
    await start();
    const a = client();
    await a.hello();
    a.send({ t: 'room.join', code: 'ZZZZZ' });
    expect((await a.next('error')).code).toBe('room_not_found');
  });
});

describe('HTTP', () => {
  it('santé, page d’invitation et webhook d’achat', async () => {
    const port = await start();
    const base = `http://127.0.0.1:${port}`;
    expect(await (await fetch(`${base}/health`)).text()).toBe('ok');
    const page = await (await fetch(`${base}/join/abcde`)).text();
    expect(page).toContain('ABCDE');
    expect(page).toContain('rondadyalna://join/ABCDE');

    const a = client();
    const p = await a.hello();
    const body = { event: { type: 'NON_RENEWING_PURCHASE', app_user_id: p.id, product_id: 'ronda_coins_60k', transaction_id: 'tx-1' } };
    const unauthorized = await fetch(`${base}/webhooks/revenuecat`, { method: 'POST', body: JSON.stringify(body) });
    expect(unauthorized.status).toBe(401);
    const post = () =>
      fetch(`${base}/webhooks/revenuecat`, { method: 'POST', body: JSON.stringify(body), headers: { authorization: 'Bearer test-secret' } });
    expect((await post()).status).toBe(200);
    const reward = await a.next('reward');
    expect(reward.kind).toBe('purchase');
    expect(reward.profile.coins).toBe(STARTING_COINS + 60_000);
    // Le même achat n'est jamais crédité deux fois.
    expect((await post()).status).toBe(200);
    const status = (await (await fetch(`${base}/api/status`)).json()) as { players: number };
    expect(status.players).toBe(1);
    expect(server.store.getProfile(p.id)!.coins).toBe(STARTING_COINS + 60_000);
  });
});
