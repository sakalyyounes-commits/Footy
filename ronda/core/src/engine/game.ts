import { compareCards, DECK_SIZE, isCard, newDeck, rankIndex, rankOf, RANKS, type Card } from './cards';
import { shuffle, type Rng } from './rng';
import { dealPattern, type Rules } from './rules';
import {
  DARBA_REASONS,
  RondaError,
  teamOf,
  type Announcement,
  type Combo,
  type DarbaLevel,
  type GameEvent,
  type GameState,
  type LastCardOutcome,
  type PointReason,
  type Seat,
  type SeatPlay,
  type Step,
  type Team,
  type Transition,
} from './types';

/** Contexte d'exécution : `steps` à null désactive l'enregistrement (simulations des bots). */
export interface Ctx {
  steps: Step[] | null;
}

export interface DeckOptions {
  /** Ordre de distribution imposé (tests, tutoriel, serveur qui mélange lui-même). */
  deck?: Card[];
  rng?: Rng;
}

export interface NewGameOptions extends DeckOptions {
  /** Donneur imposé (tests, tutoriel). Sans lui, les joueurs tirent une carte : la plus petite donne. */
  dealer?: Seat;
}

export interface DealerDraw {
  /** Tirages successifs : le premier concerne tout le monde, les suivants les seuls ex æquo. */
  rounds: SeatPlay[][];
  dealer: Seat;
}

function emit(s: GameState, ctx: Ctx, event: GameEvent): void {
  if (ctx.steps) ctx.steps.push({ event, state: cloneState(s) });
}

export function cloneState(s: GameState): GameState {
  return {
    rules: s.rules,
    phase: s.phase,
    round: s.round,
    dealer: s.dealer,
    dealNo: s.dealNo,
    deck: s.deck.slice(),
    hands: s.hands.map((h) => h.slice()),
    table: s.table.slice(),
    pending: s.pending ? { ...s.pending, cards: s.pending.cards.slice() } : null,
    piles: [s.piles[0].slice(), s.piles[1].slice()],
    scores: [s.scores[0], s.scores[1]],
    turn: s.turn,
    lastPlayed: s.lastPlayed ? { ...s.lastPlayed } : null,
    lastCapturer: s.lastCapturer,
    announcements: s.announcements.map((a) => ({
      seat: a.seat,
      combos: a.combos.map((c) => ({ ...c, cards: c.cards.slice() })),
    })),
    played: s.played.slice(),
    dealAnnounced: s.dealAnnounced.map((a) => ({ seat: a.seat, kinds: a.kinds.slice() })),
    dealPlays: s.dealPlays.slice(),
    winner: s.winner,
    moveCount: s.moveCount,
  };
}

function prepareDeck(opts: DeckOptions): Card[] {
  if (opts.deck) {
    const seen = new Set(opts.deck);
    if (opts.deck.length !== DECK_SIZE || seen.size !== DECK_SIZE || !opts.deck.every(isCard)) {
      throw new RondaError('bad_deck', 'Le paquet doit contenir les 40 cartes exactement une fois');
    }
    return opts.deck.slice();
  }
  return shuffle(newDeck(), opts.rng ?? Math.random);
}

/**
 * Construit un paquet qui distribue exactement les mains voulues (tests et tutoriel).
 * `deals[d][seat]` : cartes de la place `seat` à la donne `d`. Le reste du paquet suit dans
 * l'ordre croissant, sauf `rest` qui permet d'imposer l'ordre des cartes suivantes.
 */
export function stackDeck(players: 2 | 4, dealer: Seat, deals: Card[][][], rest: Card[] = []): Card[] {
  const order: Card[] = [];
  for (const hands of deals) {
    for (let i = 1; i <= players; i++) order.push(...hands[(dealer + i) % players]);
  }
  order.push(...rest);
  const used = new Set(order);
  if (used.size !== order.length) throw new Error('stackDeck : carte en double');
  for (const c of newDeck()) if (!used.has(c)) order.push(c);
  return order;
}

/**
 * Tirage du donneur : chaque joueur tire une carte et la plus petite donne (1, 2… 7, 10, 11, 12 ;
 * la couleur ne compte pas). Si plusieurs joueurs ont la plus petite, eux seuls retirent, jusqu'à
 * ce qu'il n'en reste qu'un.
 */
export function drawForDealer(players: number, rng: Rng = Math.random): DealerDraw {
  let pool = shuffle(newDeck(), rng);
  let contenders = Array.from({ length: players }, (_, seat) => seat);
  const rounds: SeatPlay[][] = [];
  for (;;) {
    // Paquet épuisé à force d'égalités (en pratique jamais) : on rebat les 40 cartes.
    if (pool.length < contenders.length) pool = shuffle(newDeck(), rng);
    const round = contenders.map((seat) => ({ seat, card: pool.pop()! }));
    rounds.push(round);
    const lowest = Math.min(...round.map((d) => rankIndex(d.card)));
    contenders = round.filter((d) => rankIndex(d.card) === lowest).map((d) => d.seat);
    if (contenders.length === 1) return { rounds, dealer: contenders[0] };
  }
}

export function newGame(rules: Rules, opts: NewGameOptions = {}): Transition {
  const n = rules.players;
  const draw = opts.dealer === undefined ? drawForDealer(n, opts.rng ?? Math.random) : null;
  const dealer = draw ? draw.dealer : opts.dealer! % n;
  const s: GameState = {
    rules,
    phase: 'play',
    round: 1,
    dealer,
    dealNo: 0,
    deck: [],
    hands: Array.from({ length: n }, () => []),
    table: [],
    pending: null,
    piles: [[], []],
    scores: [0, 0],
    turn: (dealer + 1) % n,
    lastPlayed: null,
    lastCapturer: null,
    announcements: [],
    played: [],
    dealAnnounced: [],
    dealPlays: [],
    winner: null,
    moveCount: 0,
  };
  const ctx: Ctx = { steps: [] };
  if (draw) emit(s, ctx, { type: 'dealerDraw', rounds: draw.rounds, dealer });
  startRound(s, prepareDeck(opts), ctx);
  return { state: s, steps: ctx.steps! };
}

/** Lance la manche suivante (le donneur tourne d'une place). */
export function nextRound(state: GameState, opts: DeckOptions = {}): Transition {
  if (state.phase !== 'roundEnd') throw new RondaError('bad_phase', 'La manche n’est pas terminée');
  const s = cloneState(state);
  const ctx: Ctx = { steps: [] };
  s.round += 1;
  s.dealer = (s.dealer + 1) % s.rules.players;
  startRound(s, prepareDeck(opts), ctx);
  return { state: s, steps: ctx.steps! };
}

/** Joue une carte. Lève une RondaError si le coup est illégal. */
export function applyPlay(state: GameState, seat: Seat, card: Card, opts: { record?: boolean } = {}): Transition {
  const s = cloneState(state);
  const ctx: Ctx = { steps: opts.record === false ? null : [] };
  playMut(s, seat, card, ctx);
  return { state: s, steps: ctx.steps ?? [] };
}

export function legalCards(state: GameState, seat: Seat): Card[] {
  return state.phase === 'play' && state.turn === seat ? state.hands[seat].slice() : [];
}

function startRound(s: GameState, deck: Card[], ctx: Ctx): void {
  s.phase = 'play';
  s.deck = deck;
  s.dealNo = 0;
  s.table = [];
  s.pending = null;
  s.piles = [[], []];
  s.lastPlayed = null;
  s.lastCapturer = null;
  s.announcements = [];
  s.played = [];
  s.dealAnnounced = [];
  s.dealPlays = [];
  s.hands = s.hands.map(() => []);
  s.turn = (s.dealer + 1) % s.rules.players;
  emit(s, ctx, { type: 'roundStart', round: s.round, dealer: s.dealer });
  deal(s, ctx);
  if (s.phase === 'play') emit(s, ctx, { type: 'turn', seat: s.turn });
}

function deal(s: GameState, ctx: Ctx): void {
  const n = s.rules.players;
  const count = dealPattern(n)[s.dealNo];
  s.dealNo += 1;
  for (let i = 1; i <= n; i++) {
    const seat = (s.dealer + i) % n;
    s.hands[seat] = s.deck.splice(0, count).sort(compareCards);
  }
  s.turn = (s.dealer + 1) % n;
  s.dealPlays = [];
  emit(s, ctx, { type: 'deal', dealNo: s.dealNo, count, last: s.deck.length === 0 });
  announce(s, ctx);
}

// ---------------------------------------------------------------------------------------------
// Annonces : ronda (paire) et tringa (brelan)
// ---------------------------------------------------------------------------------------------

/** Combinaisons d'une main, la meilleure en premier. Un carré compte comme une tringa. */
export function combosOf(hand: readonly Card[]): Combo[] {
  const groups = new Map<number, Card[]>();
  for (const c of hand) {
    const r = rankIndex(c);
    const g = groups.get(r);
    if (g) g.push(c);
    else groups.set(r, [c]);
  }
  const combos: Combo[] = [];
  for (const [r, cards] of groups) {
    if (cards.length >= 2) combos.push({ kind: cards.length >= 3 ? 'tringa' : 'ronda', rank: RANKS[r], cards });
  }
  return combos.sort((a, b) => comboStrength(b) - comboStrength(a));
}

/** Force d'une combinaison : toute tringa bat toute ronda, puis le rang le plus haut l'emporte. */
export function comboStrength(c: Combo): number {
  return (c.kind === 'tringa' ? 100 : 0) + RANKS.indexOf(c.rank);
}

export function comboValue(c: Combo, rules: Rules): number {
  return c.kind === 'tringa' ? rules.tringaPoints : rules.rondaPoints;
}

function announcementValue(a: Announcement, rules: Rules): number {
  return a.combos.reduce((sum, c) => sum + comboValue(c, rules), 0);
}

function announcementReason(a: Announcement): PointReason {
  return a.combos[0].kind;
}

/**
 * Les quatre joueurs ont chacun exactement une ronda (et aucune tringa) : dans ce cas, c'est la
 * plus petite ronda qui gagne. Avec cinq rondas (un joueur en a deux), la plus grande reprend
 * le dessus.
 */
export function fourRondas(entries: readonly Announcement[], players: number): boolean {
  return (
    players === 4 &&
    entries.length === 4 &&
    entries.every((e) => e.combos.length === 1 && e.combos[0].kind === 'ronda')
  );
}

function announce(s: GameState, ctx: Ctx): void {
  const n = s.rules.players;
  const entries: Announcement[] = [];
  for (let i = 1; i <= n; i++) {
    const seat = (s.dealer + i) % n;
    const combos = combosOf(s.hands[seat]);
    if (combos.length) entries.push({ seat, combos });
  }
  s.announcements = [];
  s.dealAnnounced = entries.map((e) => ({ seat: e.seat, kinds: e.combos.map((c) => c.kind) }));
  if (!entries.length) return;
  for (const e of entries) emit(s, ctx, { type: 'announce', seat: e.seat, kinds: e.combos.map((c) => c.kind) });

  const teams = new Set(entries.map((e) => teamOf(e.seat)));
  if (teams.size > 1) {
    // Annonces adverses : on départage à la fin de la donne, quand les cartes ont été jouées.
    s.announcements = entries;
    return;
  }
  const points: [number, number] = [0, 0];
  for (const e of entries) points[teamOf(e.seat)] += announcementValue(e, s.rules);
  emit(s, ctx, { type: 'announceResult', entries: [], winners: entries.map((e) => e.seat), points });
  for (const e of entries) award(s, ctx, teamOf(e.seat), announcementValue(e, s.rules), announcementReason(e), e.seat);
  checkWin(s, ctx);
}

function resolveAnnouncements(s: GameState, ctx: Ctx): void {
  const entries = s.announcements;
  s.announcements = [];
  if (!entries.length) return;
  const pot = entries.reduce((sum, e) => sum + announcementValue(e, s.rules), 0);
  const lowest = fourRondas(entries, s.rules.players);
  const strengths = entries.map((e) => comboStrength(e.combos[0]));
  const best = lowest ? Math.min(...strengths) : Math.max(...strengths);
  const winners = entries.filter((_, i) => strengths[i] === best);
  const awards: { seat: Seat; points: number }[] = [];
  if (new Set(winners.map((w) => teamOf(w.seat))).size === 1) {
    awards.push({ seat: winners[0].seat, points: pot });
  } else {
    // Égalité entre adversaires : le pot est partagé.
    const share = Math.floor(pot / winners.length);
    for (const w of winners) awards.push({ seat: w.seat, points: share });
  }
  const points: [number, number] = [0, 0];
  for (const a of awards) points[teamOf(a.seat)] += a.points;
  emit(s, ctx, {
    type: 'announceResult',
    entries,
    winners: winners.map((w) => w.seat),
    points,
    ...(lowest ? { lowest: true as const } : {}),
  });
  const reason = announcementReason(winners[0]);
  for (const a of awards) award(s, ctx, teamOf(a.seat), a.points, reason, a.seat);
  checkWin(s, ctx);
}

// ---------------------------------------------------------------------------------------------
// Jeu d'une carte
// ---------------------------------------------------------------------------------------------

function award(s: GameState, ctx: Ctx, team: Team, points: number, reason: PointReason, seat: Seat | null): void {
  if (points <= 0) return;
  s.scores[team] += points;
  emit(s, ctx, { type: 'points', team, seat, points, reason });
}

/** Lecture non « rétrécie » par TypeScript : la phase change dans les fonctions appelées. */
function isOver(s: GameState): boolean {
  return s.phase === 'gameOver';
}

/** Termine la partie si une équipe a atteint l'objectif (en cas d'égalité, on continue). */
function checkWin(s: GameState, ctx: Ctx): boolean {
  if (s.phase === 'gameOver') return true;
  const [a, b] = s.scores;
  const t = s.rules.target;
  if ((a >= t || b >= t) && a !== b) {
    s.phase = 'gameOver';
    s.winner = a > b ? 0 : 1;
    emit(s, ctx, { type: 'gameOver', winner: s.winner, scores: [a, b] });
    return true;
  }
  return false;
}

function finalizePending(s: GameState, ctx: Ctx): void {
  const p = s.pending;
  if (!p) return;
  s.pending = null;
  const team = teamOf(p.owner);
  s.piles[team].push(...p.cards);
  emit(s, ctx, { type: 'collect', seat: p.owner, cards: p.cards.slice() });
  award(s, ctx, team, s.rules.darbaPoints[p.level - 1], DARBA_REASONS[p.level], p.owner);
  if (p.missa) award(s, ctx, team, s.rules.missaPoints, 'missa', p.owner);
  checkWin(s, ctx);
}

/**
 * Dernière carte de la manche, toujours jouée par le donneur : s'il prend avec un 12, son équipe
 * marque les points ; s'il prend avec un 1, ou s'il ne prend rien, c'est l'équipe adverse.
 */
function dealerLastCard(s: GameState, ctx: Ctx, seat: Seat, card: Card, took: boolean): void {
  // `?? 0` : parties sauvegardées avant l'arrivée de la règle.
  const points = s.rules.lastCardPoints ?? 0;
  if (points <= 0 || seat !== s.dealer) return;
  const rank = rankOf(card);
  const outcome: LastCardOutcome | null = !took ? 'miss' : rank === 12 ? 'king' : rank === 1 ? 'ace' : null;
  if (outcome === null) return;
  const team: Team = outcome === 'king' ? teamOf(seat) : teamOf(seat + 1);
  emit(s, ctx, { type: 'lastCard', seat, card, outcome, team, points });
  award(s, ctx, team, points, 'lastCard', outcome === 'king' ? seat : null);
}

/** Version mutable du coup (utilisée telle quelle par les simulations des bots). */
export function playMut(s: GameState, seat: Seat, card: Card, ctx: Ctx): void {
  if (s.phase !== 'play') throw new RondaError('not_playing');
  if (seat !== s.turn) throw new RondaError('not_your_turn');
  const hand = s.hands[seat];
  const at = hand.indexOf(card);
  if (at < 0) throw new RondaError('card_not_in_hand');

  const n = s.rules.players;
  const prev = (seat + n - 1) % n;
  const r = rankIndex(card);
  const team = teamOf(seat);
  const p = s.pending;
  const zid = p !== null && p.owner === prev && rankIndex(p.cards[0]) === r && p.level < 3;

  if (p && !zid) {
    // Le joueur ne rebondit pas : la darba précédente devient définitive.
    finalizePending(s, ctx);
    if (isOver(s)) return;
  }

  hand.splice(at, 1);
  s.moveCount += 1;
  s.played.push(card);
  s.dealPlays.push({ seat, card });
  const lastCardOfRound = s.deck.length === 0 && s.hands.every((h) => h.length === 0);
  const prevPlayed = s.lastPlayed;

  if (zid && p) {
    // « Zid » : on rebondit sur la darba et on emporte tout le paquet.
    p.cards.push(card);
    p.victim = prev;
    p.owner = seat;
    p.level = (p.level + 1) as DarbaLevel;
    s.lastPlayed = { seat, card, onTable: false };
    s.lastCapturer = seat;
    emit(s, ctx, { type: 'play', seat, card });
    emit(s, ctx, { type: 'darba', seat, victim: prev, level: p.level, rank: p.rank });
    if (p.level === 3 || lastCardOfRound) {
      finalizePending(s, ctx);
      if (isOver(s)) return;
    }
    if (lastCardOfRound) {
      dealerLastCard(s, ctx, seat, card, true);
      if (checkWin(s, ctx)) return;
    }
    endTurn(s, ctx);
    return;
  }

  // La carte arrive sur le tapis, puis prend éventuellement la carte de même valeur et sa suite.
  s.table.push(card);
  s.table.sort(compareCards);
  s.lastPlayed = { seat, card, onTable: true };
  emit(s, ctx, { type: 'play', seat, card });

  const match = s.table.find((c) => c !== card && rankIndex(c) === r);
  if (match === undefined) {
    if (lastCardOfRound) {
      dealerLastCard(s, ctx, seat, card, false);
      if (checkWin(s, ctx)) return;
    }
    endTurn(s, ctx);
    return;
  }
  const captured = [card, match];
  for (let k = r + 1; k < RANKS.length; k++) {
    const next = s.table.find((c) => rankIndex(c) === k);
    if (next === undefined) break;
    captured.push(next);
  }
  s.table = s.table.filter((c) => !captured.includes(c));
  const darba = prevPlayed !== null && prevPlayed.onTable && prevPlayed.seat === prev && prevPlayed.card === match;
  const missa = s.table.length === 0 && !lastCardOfRound;
  s.lastCapturer = seat;
  s.lastPlayed = { seat, card, onTable: false };

  if (darba && s.rules.darbaChain && !lastCardOfRound) {
    s.pending = { owner: seat, victim: prev, rank: RANKS[r], cards: captured, level: 1, missa };
    emit(s, ctx, { type: 'capture', seat, card, cards: captured, pending: true });
    emit(s, ctx, { type: 'darba', seat, victim: prev, level: 1, rank: RANKS[r] });
    if (missa) emit(s, ctx, { type: 'missa', seat });
    endTurn(s, ctx);
    return;
  }

  s.piles[team].push(...captured);
  emit(s, ctx, { type: 'capture', seat, card, cards: captured, pending: false });
  if (darba) {
    emit(s, ctx, { type: 'darba', seat, victim: prev, level: 1, rank: RANKS[r] });
    award(s, ctx, team, s.rules.darbaPoints[0], 'darba', seat);
  }
  if (missa) {
    emit(s, ctx, { type: 'missa', seat });
    award(s, ctx, team, s.rules.missaPoints, 'missa', seat);
  }
  if (lastCardOfRound) dealerLastCard(s, ctx, seat, card, true);
  if (checkWin(s, ctx)) return;
  endTurn(s, ctx);
}

function endTurn(s: GameState, ctx: Ctx): void {
  s.turn = (s.turn + 1) % s.rules.players;
  if (s.hands.some((h) => h.length > 0)) {
    emit(s, ctx, { type: 'turn', seat: s.turn });
    return;
  }
  // Fin de la donne.
  resolveAnnouncements(s, ctx);
  if (s.phase === 'gameOver') return;
  if (s.deck.length > 0) {
    deal(s, ctx);
    if (s.phase === 'play') emit(s, ctx, { type: 'turn', seat: s.turn });
    return;
  }
  endRound(s, ctx);
}

function endRound(s: GameState, ctx: Ctx): void {
  finalizePending(s, ctx);
  if (s.phase === 'gameOver') return;
  if (s.table.length && s.lastCapturer !== null) {
    const cards = s.table;
    s.table = [];
    s.piles[teamOf(s.lastCapturer)].push(...cards);
    emit(s, ctx, { type: 'sweep', seat: s.lastCapturer, cards: cards.slice() });
  }
  const counts: [number, number] = [s.piles[0].length, s.piles[1].length];
  const points: [number, number] = [Math.max(0, counts[0] - 20), Math.max(0, counts[1] - 20)];
  for (const t of [0, 1] as const) award(s, ctx, t, points[t], 'cards', null);
  s.phase = 'roundEnd';
  emit(s, ctx, { type: 'roundEnd', counts, points, scores: [s.scores[0], s.scores[1]] });
  checkWin(s, ctx);
}

/** Nombre total de cartes suivies par l'état (doit toujours valoir 40). */
export function countCards(s: GameState): number {
  return (
    s.deck.length +
    s.hands.reduce((sum, h) => sum + h.length, 0) +
    s.table.length +
    (s.pending?.cards.length ?? 0) +
    s.piles[0].length +
    s.piles[1].length
  );
}
