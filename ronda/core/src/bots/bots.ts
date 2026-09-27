import { newDeck, rankIndex, RANKS, type Card } from '../engine/cards';
import { combosOf, playMut, type Ctx } from '../engine/game';
import { createRng, shuffle, type Rng } from '../engine/rng';
import { dealPattern } from '../engine/rules';
import { teamOf, type GameState, type Seat } from '../engine/types';
import { capturePreview, type PlayerView } from '../engine/view';

/**
 * Bots de Ronda.
 * - easy (Mbtadi) : joue surtout au hasard, prend quand il voit une prise.
 * - medium (Mtwasset) : compte les cartes et évalue le risque de darba du joueur suivant.
 * - hard (M3allem) : échantillonne des mains cachées compatibles avec ce qu'il a vu et simule la
 *   fin de la donne pour chaque carte possible, les joueurs simulés raisonnant comme Mtwasset.
 * Les bots ne voient que la vue du joueur : ils ne trichent jamais.
 */
export type BotLevel = 'easy' | 'medium' | 'hard';
export const BOT_LEVELS: readonly BotLevel[] = ['easy', 'medium', 'hard'];

/** Valeur moyenne d'une carte ramassée (chaque carte au-delà de 20 vaut un point). */
const CARD_VALUE = 0.7;

export interface BotOptions {
  rng?: Rng;
  /** Nombre de mondes simulés par le bot expert. */
  samples?: number;
  /** Réglages internes du bot expert (expérimentation). */
  hard?: HardOptions;
}

export function chooseCard(view: PlayerView, level: BotLevel, opts: BotOptions = {}): Card {
  const rng = opts.rng ?? Math.random;
  if (view.hand.length === 0) throw new Error('Main vide');
  const candidates = distinctRanks(view.hand);
  if (candidates.length === 1) return candidates[0];
  switch (level) {
    case 'easy':
      return easyChoice(view, candidates, rng);
    case 'medium':
      return bestOf(candidates, mediumScores(view, candidates), rng);
    case 'hard':
      return hardChoice(view, candidates, rng, opts.samples ?? 60, opts.hard);
  }
}

/** Une carte par rang : la couleur n'a aucun effet en Ronda. */
function distinctRanks(hand: readonly Card[]): Card[] {
  const seen = new Set<number>();
  const out: Card[] = [];
  for (const c of hand) {
    const r = rankIndex(c);
    if (!seen.has(r)) {
      seen.add(r);
      out.push(c);
    }
  }
  return out;
}

function bestOf(candidates: Card[], scores: number[], rng: Rng): Card {
  let best = -Infinity;
  let pool: Card[] = [];
  candidates.forEach((c, i) => {
    const s = scores[i];
    if (s > best + 1e-9) {
      best = s;
      pool = [c];
    } else if (Math.abs(s - best) <= 1e-9) pool.push(c);
  });
  return pool[Math.floor(rng() * pool.length)];
}

function easyChoice(view: PlayerView, candidates: Card[], rng: Rng): Card {
  const captures = candidates.filter((c) => capturePreview(view, c).captures.length > 0);
  if (captures.length && rng() < 0.65) return captures[Math.floor(rng() * captures.length)];
  return candidates[Math.floor(rng() * candidates.length)];
}

// ---------------------------------------------------------------------------------------------
// Bot moyen : comptage des cartes et risque immédiat
// ---------------------------------------------------------------------------------------------

/** Probabilité qu'une main de `h` cartes, tirée parmi `unknown` cartes, contienne au moins une des `k`. */
export function probAtLeastOne(unknown: number, k: number, h: number): number {
  if (k <= 0 || h <= 0) return 0;
  if (h > unknown - k) return 1;
  let pNone = 1;
  for (let i = 0; i < h; i++) pNone *= (unknown - k - i) / (unknown - i);
  return 1 - pNone;
}

/** Nombre de cartes de chaque rang encore invisibles pour ce joueur (autres mains + talon). */
export function unseenByRank(view: Pick<PlayerView, 'hand' | 'played'>): number[] {
  const counts = new Array<number>(RANKS.length).fill(4);
  for (const c of view.hand) counts[rankIndex(c)]--;
  for (const c of view.played) counts[rankIndex(c)]--;
  return counts;
}

/** Ce que le bot moyen regarde : la vue d'un joueur, ou un joueur d'un monde simulé. */
type MediumSource = Pick<
  PlayerView,
  'rules' | 'seat' | 'hand' | 'played' | 'table' | 'pending' | 'lastPlayed' | 'deckCount' | 'handCounts' | 'dealNo' | 'turn' | 'dealer'
>;

/** Taille de la main avec laquelle le joueur `seat` jouera son prochain coup. */
function nextHandSize(view: MediumSource, seat: Seat): number {
  if (view.handCounts[seat] > 0) return view.handCounts[seat];
  if (view.deckCount === 0) return 0;
  return dealPattern(view.rules.players)[view.dealNo] ?? 0;
}

/** Longueur de la suite qui partirait avec une prise sur le rang `r` (cartes au-dessus de r). */
function sequenceAbove(table: readonly Card[], r: number): number {
  let n = 0;
  for (let k = r + 1; k < RANKS.length; k++) {
    if (!table.some((c) => rankIndex(c) === k)) break;
    n++;
  }
  return n;
}

function mediumScores(view: MediumSource, candidates: Card[]): number[] {
  const rules = view.rules;
  const n = rules.players;
  const next = (view.seat + 1) % n;
  const unseen = unseenByRank(view);
  const unknown = unseen.reduce((a, b) => a + b, 0);
  const hNext = nextHandSize(view, next);
  const qNext = (r: number) => probAtLeastOne(unknown, unseen[r], hNext);
  const remaining = view.handCounts.reduce((a, b) => a + b, 0) - 1;
  const lastCardOfRound = view.deckCount === 0 && remaining === 0;

  /** Meilleure prise attendue du joueur suivant sur un tapis donné. */
  const exposure = (table: Card[], dropped: Card | null): number => {
    if (hNext === 0 || lastCardOfRound) return 0;
    let worst = 0;
    for (const c of table) {
      const r = rankIndex(c);
      const q = qNext(r);
      if (q === 0) continue;
      const seq = sequenceAbove(table, r);
      let value = CARD_VALUE * (2 + seq);
      if (1 + seq === table.length) value += rules.missaPoints;
      if (dropped !== null && c === dropped) value += rules.darbaPoints[0];
      worst = Math.max(worst, q * value);
    }
    return worst;
  };

  const scores = candidates.map((card) => {
    const r = rankIndex(card);
    const pv = capturePreview(view, card);
    if (pv.captures.length === 0) {
      const table = [...view.table, card];
      // Poser une carte « morte » (toutes les autres déjà vues) est sans danger.
      return -exposure(table, card) - 0.05 * unseen[r];
    }
    const cards = pv.captures.length + 1;
    const pts = (pv.darba ? rules.darbaPoints[pv.darba - 1] : 0) + (pv.missa ? rules.missaPoints : 0);
    const tableAfter = pv.zid ? view.table.slice() : view.table.filter((c) => !pv.captures.includes(c));
    let gain = pts + CARD_VALUE * cards;
    const contestable = pv.darba > 0 && pv.darba < 3 && rules.darbaChain && !lastCardOfRound;
    if (contestable) {
      const q = qNext(r);
      const theirPts = rules.darbaPoints[pv.darba as 1 | 2] + (pv.missa ? rules.missaPoints : 0);
      gain = (1 - q) * gain - q * (theirPts + CARD_VALUE * (cards + 1));
    }
    return gain - exposure(tableAfter, null);
  });
  return scores.map((score, i) => score + lastCardOutlook(view, candidates[i]));
}

function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [items.slice()];
  const out: T[][] = [];
  items.forEach((x, i) => {
    for (const rest of permutations([...items.slice(0, i), ...items.slice(i + 1)])) out.push([x, ...rest]);
  });
  return out;
}

/**
 * Règle de la dernière carte, vue par le donneur à deux cartes de la fin de la manche : les
 * autres joueurs n'ont plus qu'une carte chacun, qu'ils joueront forcément, et les cartes
 * invisibles sont exactement celles-là. On essaie toutes leurs répartitions pour estimer ce que
 * rapportera la carte gardée pour la fin (un 12 qui prend : gagné ; un 1, ou rien pris : perdu).
 * Approximation : les rebonds de darba sur la dernière levée sont ignorés.
 */
function lastCardOutlook(view: MediumSource, play: Card): number {
  const points = view.rules.lastCardPoints ?? 0;
  if (points <= 0 || view.deckCount !== 0 || view.seat !== view.dealer || view.hand.length !== 2) return 0;
  const keep = view.hand.find((c) => c !== play);
  if (keep === undefined) return 0;
  const others: number[] = [];
  unseenByRank(view).forEach((count, r) => {
    for (let i = 0; i < count; i++) others.push(r);
  });
  if (others.length !== view.rules.players - 1) return 0;
  const kept = rankIndex(keep);
  if (RANKS[kept] === 1) return -points;
  // Tapis (en rangs) après la carte jouée maintenant.
  const start = new Set(view.table.map(rankIndex));
  const pv = capturePreview(view, play);
  if (!pv.zid) {
    if (pv.captures.length) for (const c of pv.captures) start.delete(rankIndex(c));
    else start.add(rankIndex(play));
  }
  const orders = permutations(others);
  let total = 0;
  for (const order of orders) {
    const table = new Set(start);
    for (const r of order) {
      if (!table.has(r)) {
        table.add(r);
        continue;
      }
      table.delete(r);
      for (let k = r + 1; k < RANKS.length && table.has(k); k++) table.delete(k);
    }
    total += table.has(kept) ? (RANKS[kept] === 12 ? points : 0) : -points;
  }
  return total / orders.length;
}

// ---------------------------------------------------------------------------------------------
// Bot expert : Monte-Carlo sur des mondes compatibles avec ce que le joueur a vu
// ---------------------------------------------------------------------------------------------

function kindsKey(kinds: readonly string[]): string {
  return kinds.slice().sort().join(',');
}

/**
 * Reconstitue un état complet en distribuant au hasard les cartes invisibles, en respectant les
 * annonces de la donne : un joueur qui a annoncé une ronda a bien une paire, un joueur resté
 * silencieux n'en a pas.
 */
export function determinize(view: PlayerView, rng: Rng, useAnnouncements = true): GameState {
  const n = view.rules.players;
  const visible = new Set<Card>([...view.hand, ...view.played]);
  let pool = shuffle(
    newDeck().filter((c) => !visible.has(c)),
    rng,
  );
  const hands: Card[][] = new Array<Card[]>(n);
  hands[view.seat] = view.hand.slice();
  for (let i = 1; i < n; i++) {
    const seat = (view.seat + i) % n;
    const count = view.handCounts[seat];
    if (!useAnnouncements || count === 0) {
      hands[seat] = pool.splice(0, count);
      continue;
    }
    const want = kindsKey(view.dealAnnounced.find((a) => a.seat === seat)?.kinds ?? []);
    const plays = view.dealPlays.filter((p) => p.seat === seat).map((p) => p.card);
    let chosen: Card[] | null = null;
    for (let attempt = 0; attempt < 24 && !chosen; attempt++) {
      const candidate = pool.slice(0, count);
      if (kindsKey(combosOf([...candidate, ...plays]).map((c) => c.kind)) === want) chosen = candidate;
      else pool = shuffle(pool, rng);
    }
    chosen ??= pool.slice(0, count);
    const taken = new Set(chosen);
    pool = pool.filter((c) => !taken.has(c));
    hands[seat] = chosen;
  }
  const onTable = new Set<Card>([...view.table, ...(view.pending?.cards ?? [])]);
  const inPiles = view.played.filter((c) => !onTable.has(c));
  return {
    rules: view.rules,
    phase: 'play',
    round: view.round,
    dealer: view.dealer,
    dealNo: view.dealNo,
    deck: pool,
    hands,
    table: view.table.slice(),
    pending: view.pending ? { ...view.pending, cards: view.pending.cards.slice() } : null,
    piles: [inPiles.slice(0, view.pileCounts[0]), inPiles.slice(view.pileCounts[0])],
    scores: [view.scores[0], view.scores[1]],
    turn: view.turn,
    lastPlayed: view.lastPlayed ? { ...view.lastPlayed } : null,
    lastCapturer: view.lastCapturer,
    announcements: [],
    played: view.played.slice(),
    dealAnnounced: view.dealAnnounced.map((a) => ({ seat: a.seat, kinds: a.kinds.slice() })),
    dealPlays: view.dealPlays.map((p) => ({ ...p })),
    winner: null,
    moveCount: view.moveCount,
  };
}

function cloneForSim(s: GameState): GameState {
  return {
    ...s,
    deck: s.deck.slice(),
    hands: s.hands.map((h) => h.slice()),
    table: s.table.slice(),
    pending: s.pending ? { ...s.pending, cards: s.pending.cards.slice() } : null,
    piles: [s.piles[0].slice(), s.piles[1].slice()],
    scores: [s.scores[0], s.scores[1]],
    lastPlayed: s.lastPlayed ? { ...s.lastPlayed } : null,
    announcements: [],
    played: s.played.slice(),
    dealPlays: s.dealPlays.slice(),
  };
}

const NO_RECORD: Ctx = { steps: null };

/** Politique « aveugle » des simulations : prise la plus rentable, sinon la carte la plus « morte ». */
function rolloutCardBlind(s: GameState, rng: Rng): Card {
  const seat = s.turn;
  const hand = s.hands[seat];
  if (hand.length === 1) return hand[0];
  const view = {
    rules: s.rules,
    table: s.table,
    pending: s.pending,
    lastPlayed: s.lastPlayed,
    deckCount: s.deck.length,
    handCounts: s.hands.map((h) => h.length),
    turn: seat,
  };
  let best: Card = hand[0];
  let bestScore = -Infinity;
  for (const card of hand) {
    const pv = capturePreview(view, card);
    let score: number;
    if (pv.captures.length) {
      score =
        2 +
        CARD_VALUE * (pv.captures.length + 1) +
        (pv.darba ? s.rules.darbaPoints[pv.darba - 1] : 0) +
        (pv.missa ? s.rules.missaPoints : 0);
    } else {
      const r = rankIndex(card);
      let seen = 0;
      for (const c of s.played) if (rankIndex(c) === r) seen++;
      for (const c of hand) if (rankIndex(c) === r) seen++;
      score = seen * 0.3 - sequenceAbove(s.table, r) * 0.2;
    }
    score += rng() * 0.25;
    if (score > bestScore) {
      bestScore = score;
      best = card;
    }
  }
  return best;
}

/**
 * Politique « information parfaite » : dans un monde simulé, chacun voit la main du joueur
 * suivant et évite de lui offrir une darba ou un rebond.
 */
function rolloutCardPeek(s: GameState, rng: Rng): Card {
  const seat = s.turn;
  const hand = s.hands[seat];
  if (hand.length === 1) return hand[0];
  const rules = s.rules;
  const next = (seat + 1) % rules.players;
  const nextHand = s.hands[next];
  const nextHas = (r: number) => {
    for (const c of nextHand) if (rankIndex(c) === r) return true;
    return false;
  };
  const handCounts = s.hands.map((h) => h.length);
  const remaining = handCounts.reduce((a, b) => a + b, 0) - 1;
  const lastCardOfRound = s.deck.length === 0 && remaining === 0;
  const view = {
    rules,
    table: s.table,
    pending: s.pending,
    lastPlayed: s.lastPlayed,
    deckCount: s.deck.length,
    handCounts,
    turn: seat,
  };
  const exposure = (table: Card[], dropped: Card | null): number => {
    if (lastCardOfRound || nextHand.length === 0) return 0;
    let worst = 0;
    for (const c of table) {
      const r = rankIndex(c);
      if (!nextHas(r)) continue;
      const seq = sequenceAbove(table, r);
      let value = CARD_VALUE * (2 + seq);
      if (1 + seq === table.length) value += rules.missaPoints;
      if (c === dropped) value += rules.darbaPoints[0];
      if (value > worst) worst = value;
    }
    return worst;
  };
  let best: Card = hand[0];
  let bestScore = -Infinity;
  for (const card of hand) {
    const r = rankIndex(card);
    const pv = capturePreview(view, card);
    let score: number;
    if (pv.captures.length) {
      const cards = pv.captures.length + 1;
      const pts = (pv.darba ? rules.darbaPoints[pv.darba - 1] : 0) + (pv.missa ? rules.missaPoints : 0);
      score = 1 + CARD_VALUE * cards + pts;
      const contestable = pv.darba > 0 && pv.darba < 3 && rules.darbaChain && !lastCardOfRound;
      if (contestable && nextHas(r)) score -= 2 * (pts + CARD_VALUE * cards) + rules.darbaPoints[pv.darba as 1 | 2];
      const tableAfter = pv.zid ? s.table : s.table.filter((c) => !pv.captures.includes(c));
      score -= exposure(tableAfter, null);
    } else {
      score = -exposure([...s.table, card], card);
    }
    score += rng() * 0.1;
    if (score > bestScore) {
      bestScore = score;
      best = card;
    }
  }
  return best;
}

/**
 * Politique « réaliste » : chaque joueur simulé raisonne comme le bot moyen, à partir de ce
 * qu'il sait vraiment (sa main et les cartes déjà jouées), sans regarder les autres mains.
 */
function rolloutCardMedium(s: GameState, rng: Rng): Card {
  const seat = s.turn;
  const hand = s.hands[seat];
  if (hand.length === 1) return hand[0];
  const candidates = distinctRanks(hand);
  if (candidates.length === 1) return candidates[0];
  const scores = mediumScores(
    {
      rules: s.rules,
      seat,
      hand,
      played: s.played,
      table: s.table,
      pending: s.pending,
      lastPlayed: s.lastPlayed,
      deckCount: s.deck.length,
      handCounts: s.hands.map((h) => h.length),
      dealNo: s.dealNo,
      turn: seat,
      dealer: s.dealer,
    },
    candidates,
  );
  let best = candidates[0];
  let bestScore = -Infinity;
  for (let i = 0; i < candidates.length; i++) {
    const score = scores[i] + rng() * 0.1;
    if (score > bestScore) {
      bestScore = score;
      best = candidates[i];
    }
  }
  return best;
}

export interface HardOptions {
  /** Politique des joueurs simulés. */
  rollout: 'blind' | 'peek' | 'medium';
  /** Simuler jusqu'à la fin de la manche ou seulement de la donne en cours. */
  horizon: 'round' | 'deal';
  /** Tenir compte des annonces pour deviner les mains adverses. */
  announcements: boolean;
}

// Mesuré en 41 points contre l'ancienne politique « peek » : nettement plus fort en 1v1, égal en 2v2.
const DEFAULT_HARD: HardOptions = { rollout: 'medium', horizon: 'deal', announcements: true };

function hardChoice(view: PlayerView, candidates: Card[], rng: Rng, samples: number, opts: HardOptions = DEFAULT_HARD): Card {
  const myTeam = teamOf(view.seat);
  const other = (1 - myTeam) as 0 | 1;
  const baseDiff = view.scores[myTeam] - view.scores[other];
  const basePiles = view.pileCounts[myTeam] - view.pileCounts[other];
  const totals = new Array<number>(candidates.length).fill(0);
  const policy = opts.rollout === 'peek' ? rolloutCardPeek : opts.rollout === 'medium' ? rolloutCardMedium : rolloutCardBlind;
  // Léger a priori du bot moyen pour départager les mondes trop proches.
  const prior = mediumScores(view, candidates);

  for (let i = 0; i < samples; i++) {
    const world = determinize(view, rng, opts.announcements);
    const seed = Math.floor(rng() * 2 ** 32);
    candidates.forEach((card, ci) => {
      const s = cloneForSim(world);
      const simRng = createRng(seed);
      const dealNo = s.dealNo;
      playMut(s, s.turn, card, NO_RECORD);
      let guard = 0;
      while (isPlaying(s) && guard++ < 60) {
        if (opts.horizon === 'deal' && s.dealNo !== dealNo) break;
        playMut(s, s.turn, policy(s, simRng), NO_RECORD);
      }
      let value = s.scores[myTeam] - s.scores[other] - baseDiff;
      if (isPlaying(s)) {
        let piles = s.piles[myTeam].length - s.piles[other].length;
        if (s.pending) piles += (teamOf(s.pending.owner) === myTeam ? 1 : -1) * s.pending.cards.length;
        value += CARD_VALUE * (piles - basePiles);
      }
      if (s.winner !== null) value += s.winner === myTeam ? 100 : -100;
      totals[ci] += value;
    });
  }
  return bestOf(
    candidates,
    totals.map((t, i) => t / samples + prior[i] * 0.1),
    rng,
  );
}

function isPlaying(s: GameState): boolean {
  return s.phase === 'play';
}
