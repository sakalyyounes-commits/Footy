import { describe, expect, it } from 'vitest';
import {
  applyPlay,
  capturePreview,
  cardCode,
  cloneState,
  combosOf,
  compareCards,
  countCards,
  createRng,
  DECK_SIZE,
  drawForDealer,
  legalCards,
  makeRules,
  newDeck,
  newGame,
  nextRound,
  parseCard,
  parseCards,
  pick,
  rankIndex,
  rankOf,
  RondaError,
  stackDeck,
  suitOf,
  viewFor,
  type Card,
  type GameEvent,
  type GameState,
  type Rules,
  type Step,
} from '../index';

const c = parseCard;
const cs = parseCards;

/** Joue une suite de cartes (codes) en partant de l'état donné, en suivant l'ordre des tours. */
function playAll(state: GameState, codes: string): { state: GameState; steps: Step[] } {
  let s = state;
  const steps: Step[] = [];
  for (const code of codes.split(/\s+/).filter(Boolean)) {
    const t = applyPlay(s, s.turn, c(code));
    steps.push(...t.steps);
    s = t.state;
  }
  return { state: s, steps };
}

function eventsOf(steps: Step[], type: GameEvent['type']): GameEvent[] {
  return steps.map((st) => st.event).filter((e) => e.type === type);
}

function pointsOf(steps: Step[]) {
  return steps.flatMap((st) => (st.event.type === 'points' ? [st.event] : []));
}

/** Partie 1v1 : le donneur est la place 1, la place 0 commence. */
function duel(hand0: string, hand1: string, rules: Partial<Rules> = {}, rest: Card[] = []): GameState {
  const deck = stackDeck(2, 1, [[cs(hand0), cs(hand1)]], rest);
  return newGame(makeRules(2, rules), { dealer: 1, deck }).state;
}

/** Partie 2v2 : le donneur est la place 3, la place 0 commence. */
function quad(hands: [string, string, string, string], rules: Partial<Rules> = {}): GameState {
  const deck = stackDeck(4, 3, [hands.map((h) => cs(h))]);
  return newGame(makeRules(4, rules), { dealer: 3, deck }).state;
}

/**
 * 2v2 à la dernière levée de la manche : chaque joueur n'a plus qu'une carte et le donneur
 * (place 3) joue la toute dernière.
 */
function lastTrick(hands: [string, string, string, string], table: string, rules: Partial<Rules> = {}): GameState {
  const s = cloneState(quad(['1o 2o 3o 4o', '5o 6o 7o 10o', '11o 12o 1c 2c', '3c 4c 5c 6c'], rules));
  s.deck = [];
  s.hands = hands.map((h) => cs(h));
  s.table = cs(table).sort(compareCards);
  s.lastCapturer = 0;
  s.turn = 0;
  return s;
}

describe('cartes', () => {
  it('forme un jeu espagnol de 40 cartes sans 8 ni 9', () => {
    const deck = newDeck();
    expect(deck).toHaveLength(DECK_SIZE);
    expect(new Set(deck.map(cardCode)).size).toBe(40);
    const ranks = new Set(deck.map(rankOf));
    expect([...ranks].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 10, 11, 12]);
    expect(deck.filter((x) => suitOf(x) === 'oros')).toHaveLength(10);
  });

  it('lit et écrit les codes de cartes', () => {
    for (const card of newDeck()) expect(parseCard(cardCode(card))).toBe(card);
    expect(rankOf(c('12e'))).toBe(12);
    expect(suitOf(c('12e'))).toBe('espadas');
    expect(rankIndex(c('10b'))).toBe(7);
    expect(() => parseCard('8o')).toThrow();
    expect(() => parseCard('5x')).toThrow();
  });
});

describe('distribution', () => {
  it('1v1 : 4 cartes chacun, 5 donnes, tapis vide', () => {
    const { state } = newGame(makeRules(2), { dealer: 1, rng: createRng(1) });
    expect(state.hands.map((h) => h.length)).toEqual([4, 4]);
    expect(state.deck).toHaveLength(32);
    expect(state.table).toEqual([]);
    expect(state.turn).toBe(0);
    expect(viewFor(state, 0).dealsPerRound).toBe(5);
    expect(countCards(state)).toBe(40);
  });

  it('2v2 : 4 cartes à la première donne puis 3 et 3', () => {
    const rng = createRng(7);
    let { state } = newGame(makeRules(4), { dealer: 3, rng });
    expect(state.hands.map((h) => h.length)).toEqual([4, 4, 4, 4]);
    expect(state.deck).toHaveLength(24);
    const dealCounts: number[] = [];
    while (state.phase === 'play') {
      const t = applyPlay(state, state.turn, pick(state.hands[state.turn], rng));
      for (const st of t.steps) if (st.event.type === 'deal') dealCounts.push(st.event.count);
      state = t.state;
    }
    expect(dealCounts).toEqual([3, 3]);
  });

  it('le joueur à droite du donneur commence et le donneur tourne à chaque manche', () => {
    const rng = createRng(3);
    let { state } = newGame(makeRules(4), { dealer: 2, rng });
    expect(state.turn).toBe(3);
    while (state.phase === 'play') state = applyPlay(state, state.turn, state.hands[state.turn][0]).state;
    if (state.phase === 'roundEnd') {
      const next = nextRound(state, { rng }).state;
      expect(next.dealer).toBe(3);
      expect(next.turn).toBe(0);
      expect(next.round).toBe(2);
      expect(next.piles).toEqual([[], []]);
      expect(countCards(next)).toBe(40);
    }
  });

  it('refuse un paquet incomplet', () => {
    expect(() => newGame(makeRules(2), { deck: newDeck().slice(1) })).toThrow(RondaError);
  });
});

describe('tirage du donneur', () => {
  it('la plus petite carte donne ; en cas d’égalité, seuls les ex æquo retirent', () => {
    const rng = createRng(12);
    let ties = 0;
    for (let g = 0; g < 400; g++) {
      const players = g % 2 ? 4 : 2;
      const { rounds, dealer } = drawForDealer(players, rng);
      expect(rounds[0].map((d) => d.seat)).toEqual(Array.from({ length: players }, (_, i) => i));
      rounds.forEach((round, k) => {
        const lowest = Math.min(...round.map((d) => rankIndex(d.card)));
        const tied = round.filter((d) => rankIndex(d.card) === lowest).map((d) => d.seat);
        if (k < rounds.length - 1) {
          expect(tied.length).toBeGreaterThan(1);
          expect(rounds[k + 1].map((d) => d.seat)).toEqual(tied);
        } else {
          expect(tied).toEqual([dealer]);
        }
      });
      if (rounds.length > 1) ties++;
      const cards = rounds.flat().map((d) => d.card);
      expect(new Set(cards).size).toBe(cards.length);
    }
    expect(ties).toBeGreaterThan(20);
  });

  it('une nouvelle partie commence par le tirage, puis le donneur distribue', () => {
    for (const players of [2, 4] as const) {
      const { state, steps } = newGame(makeRules(players), { rng: createRng(players) });
      const draw = steps[0].event;
      if (draw.type !== 'dealerDraw') throw new Error('tirage attendu');
      expect(draw.dealer).toBe(state.dealer);
      expect(steps[0].state.hands.every((h) => h.length === 0)).toBe(true);
      expect(steps[1].event).toEqual({ type: 'roundStart', round: 1, dealer: state.dealer });
      // Le joueur à droite du donneur (place suivante) reçoit en premier et commence.
      expect(state.turn).toBe((state.dealer + 1) % players);
    }
    // Donneur imposé (tests, tutoriel) : pas de tirage.
    expect(newGame(makeRules(4), { dealer: 2, rng: createRng(1) }).steps[0].event.type).toBe('roundStart');
  });

  it('chaque place a sa chance d’être donneur', () => {
    const rng = createRng(77);
    const counts = [0, 0, 0, 0];
    for (let g = 0; g < 800; g++) counts[drawForDealer(4, rng).dealer]++;
    for (const n of counts) expect(n).toBeGreaterThan(150);
  });
});

describe('prises', () => {
  it('pose la carte si rien ne correspond, prend la carte de même valeur sinon', () => {
    let s = duel('3o 5c 7e 12b', '3c 6o 10e 11b');
    s = applyPlay(s, 0, c('3o')).state;
    expect(s.table).toEqual([c('3o')]);
    const t = applyPlay(s, 1, c('3c'));
    expect(t.state.table).toEqual([]);
    expect(t.state.piles[1].sort()).toEqual([c('3o'), c('3c')].sort());
  });

  it('ramasse la suite ascendante après la carte prise (7 puis 10, 11, 12)', () => {
    // Joueur 0 pose 6, 10, 11 ; joueur 1 pose 7, 12 puis 2 ; enfin 0 prend avec l'autre 6.
    let s = duel('6o 10o 11o 6c', '7b 12b 2b 1e');
    s = playAll(s, '10o 7b 11o 12b').state;
    expect(s.table.map(cardCode)).toEqual(['7b', '10o', '11o', '12b']);
    s = playAll(s, '6o 2b').state;
    const t = applyPlay(s, 0, c('6c'));
    const capture = eventsOf(t.steps, 'capture')[0];
    expect(capture).toMatchObject({ type: 'capture', seat: 0, pending: false });
    expect((capture as { cards: Card[] }).cards.map(cardCode).sort()).toEqual(['10o', '11o', '12b', '6c', '6o', '7b'].sort());
    expect(t.state.table.map(cardCode)).toEqual(['2b']);
  });

  it('la suite s’arrête au premier trou', () => {
    let s = duel('4o 6o 1e 1c', '4c 7o 2e 2c');
    // 0: 4o, 1: 7o, 0: 6o -> tapis 4o 6o 7o ; 1 prend le 4 : pas de 5, donc seulement le 4.
    s = playAll(s, '4o 7o 6o').state;
    const t = applyPlay(s, 1, c('4c'));
    expect(t.state.table.map(cardCode)).toEqual(['6o', '7o']);
    expect(t.state.piles[1].map(cardCode).sort()).toEqual(['4c', '4o']);
  });

  it('le tapis ne contient jamais deux cartes de même valeur', () => {
    const rng = createRng(11);
    for (let g = 0; g < 30; g++) {
      let { state } = newGame(makeRules(g % 2 ? 4 : 2), { rng });
      while (state.phase === 'play') {
        state = applyPlay(state, state.turn, pick(state.hands[state.turn], rng)).state;
        const ranks = state.table.map(rankIndex);
        expect(new Set(ranks).size).toBe(ranks.length);
      }
    }
  });
});

describe('darba et missa', () => {
  it('darba b’wahed en 1v1 : 1 point, carte ramassée', () => {
    let s = duel('3o 5c 7e 12b', '3c 6o 10e 11b');
    s = playAll(s, '5c 6o 7e 10e').state;
    expect(s.table.map(cardCode)).toEqual(['5c', '6o', '7e', '10e']);
    s = applyPlay(s, 0, c('3o')).state;
    const d = applyPlay(s, 1, c('3c'));
    expect(eventsOf(d.steps, 'darba')).toEqual([{ type: 'darba', seat: 1, victim: 0, level: 1, rank: 3 }]);
    expect(pointsOf(d.steps)).toEqual([{ type: 'points', team: 1, seat: 1, points: 1, reason: 'darba' }]);
    expect(d.state.scores).toEqual([0, 1]);
  });

  it('prendre une carte qui n’a pas été posée juste avant n’est pas une darba', () => {
    let s = duel('3o 5c 7e 12b', '3c 6o 10e 11b');
    s = playAll(s, '3o 6o 5c').state; // le 3o a été posé deux coups avant
    const t = applyPlay(s, 1, c('3c'));
    expect(eventsOf(t.steps, 'darba')).toEqual([]);
    expect(eventsOf(t.steps, 'capture')).toHaveLength(1);
  });

  it('darba + missa quand la prise vide le tapis : 2 points', () => {
    const s = duel('5o 1c 2c 3c', '5c 10e 11e 12e');
    const t = playAll(s, '5o 5c');
    expect(pointsOf(t.steps).map((p) => [p.reason, p.points])).toEqual([
      ['darba', 1],
      ['missa', 1],
    ]);
    expect(t.state.scores).toEqual([0, 2]);
  });

  it('missa sans darba : vider le tapis grâce à la suite', () => {
    // Tapis 6c 7b 10o : le 6 a été posé deux coups avant, ce n'est donc pas une darba.
    let s = duel('6c 10o 1e 2e', '7b 6e 3c 4c');
    s = playAll(s, '6c 7b 10o').state;
    const t = applyPlay(s, 1, c('6e'));
    expect(t.state.table).toEqual([]);
    expect(eventsOf(t.steps, 'darba')).toEqual([]);
    expect(pointsOf(t.steps)).toEqual([{ type: 'points', team: 1, seat: 1, points: 1, reason: 'missa' }]);
  });

  it('pas de missa quand il reste des cartes sur le tapis', () => {
    let s = duel('1o 2c 12o 11o', '10e 6o 6e 7c');
    s = playAll(s, '1o 6o 2c 10e 12o 7c 11o').state;
    const t = applyPlay(s, 1, c('6e'));
    expect(t.state.table.map(cardCode)).toEqual(['1o', '2c']);
    expect(eventsOf(t.steps, 'missa')).toEqual([]);
  });

  it('pas de missa avec la toute dernière carte de la manche', () => {
    const rng = createRng(5);
    let missaOnLast = 0;
    for (let g = 0; g < 200; g++) {
      let { state } = newGame(makeRules(2), { rng });
      while (state.phase === 'play') {
        const lastCard = state.deck.length === 0 && state.hands.reduce((n, h) => n + h.length, 0) === 1;
        const t = applyPlay(state, state.turn, pick(state.hands[state.turn], rng));
        if (lastCard && t.steps.some((st) => st.event.type === 'missa')) missaOnLast++;
        state = t.state;
      }
    }
    expect(missaOnLast).toBe(0);
  });

  it('2v2 : b’wahed, b’khamsa puis b’achra, le dernier emporte tout', () => {
    let s = quad(['5o 1c 1e 2o', '5c 2c 3c 4c', '5e 6o 6c 7o', '5b 10o 10c 11o']);
    s = applyPlay(s, 0, c('5o')).state;
    let t = applyPlay(s, 1, c('5c'));
    expect(eventsOf(t.steps, 'capture')[0]).toMatchObject({ pending: true });
    expect(t.state.pending).toMatchObject({ owner: 1, level: 1 });
    expect(t.state.scores).toEqual([0, 0]);
    t = applyPlay(t.state, 2, c('5e'));
    expect(eventsOf(t.steps, 'darba')).toEqual([{ type: 'darba', seat: 2, victim: 1, level: 2, rank: 5 }]);
    expect(t.state.pending).toMatchObject({ owner: 2, level: 2 });
    t = applyPlay(t.state, 3, c('5b'));
    expect(eventsOf(t.steps, 'darba')).toEqual([{ type: 'darba', seat: 3, victim: 2, level: 3, rank: 5 }]);
    expect(t.state.pending).toBeNull();
    // b'achra (10) + missa (1) pour l'équipe 1 ; rien pour les autres.
    expect(pointsOf(t.steps).map((p) => [p.team, p.reason, p.points])).toEqual([
      [1, 'achra', 10],
      [1, 'missa', 1],
    ]);
    expect(t.state.scores).toEqual([0, 11]);
    expect(t.state.piles[1].map(cardCode).sort()).toEqual(['5b', '5c', '5e', '5o'].sort());
  });

  it('2v2 : b’khamsa validée quand le joueur suivant ne rebondit pas', () => {
    let s = quad(['5o 1c 1e 2o', '5c 2c 3c 4c', '5e 6o 6c 7o', '10b 10o 10c 11o']);
    s = playAll(s, '5o 5c 5e').state;
    expect(s.pending).toMatchObject({ owner: 2, level: 2 });
    const t = applyPlay(s, 3, c('11o'));
    expect(pointsOf(t.steps).map((p) => [p.team, p.reason, p.points])).toEqual([
      [0, 'khamsa', 5],
      [0, 'missa', 1],
    ]);
    expect(t.state.table.map(cardCode)).toEqual(['11o']);
    expect(t.state.piles[0]).toHaveLength(3);
  });

  it('2v2 : b’wahed validée si personne ne rebondit, puis la prise suivante est normale', () => {
    let s = quad(['6o 1c 1e 2o', '6c 2c 3c 4c', '7e 5o 5c 7o', '10b 10o 10c 11o']);
    s = playAll(s, '1c 2c').state; // 2c prend... non : pas de 2 sur le tapis -> tapis 1c 2c
    s = applyPlay(s, 2, c('7e')).state;
    s = applyPlay(s, 3, c('10b')).state;
    s = applyPlay(s, 0, c('6o')).state; // tapis 1c 2c 6o 7e 10b
    let t = applyPlay(s, 1, c('6c')); // darba sur 6o : prend 6o 7e 10b
    expect(t.state.pending).toMatchObject({ owner: 1, level: 1, missa: false });
    t = applyPlay(t.state, 2, c('5o'));
    expect(pointsOf(t.steps)).toEqual([{ type: 'points', team: 1, seat: 1, points: 1, reason: 'darba' }]);
    expect(t.state.piles[1].map(cardCode).sort()).toEqual(['10b', '6c', '6o', '7e'].sort());
  });

  it('sans enchaînement (1v1 par défaut), la troisième carte se pose simplement', () => {
    const s = duel('5o 5e 1c 2c', '5c 10e 11e 12e');
    expect(s.scores).toEqual([1, 0]); // ronda de 5
    const t = playAll(s, '5o 5c 5e');
    expect(t.state.pending).toBeNull();
    expect(t.state.scores).toEqual([1, 2]);
    expect(t.state.table.map(cardCode)).toEqual(['5e']);
  });

  it('en 1v1 avec enchaînement activé, le premier joueur peut rebondir', () => {
    const s = duel('5o 5e 1c 2c', '5c 10e 11e 12e', { darbaChain: true });
    const t = playAll(s, '5o 5c 5e 10e');
    expect(pointsOf(t.steps).map((p) => [p.team, p.reason, p.points])).toEqual([
      [0, 'khamsa', 5],
      [0, 'missa', 1],
    ]);
  });
});

describe('annonces', () => {
  it('reconnaît ronda, double ronda, tringa et carré', () => {
    expect(combosOf(cs('3o 3c 5e 7b')).map((x) => [x.kind, x.rank])).toEqual([['ronda', 3]]);
    expect(combosOf(cs('3o 3c 7e 7b')).map((x) => [x.kind, x.rank])).toEqual([
      ['ronda', 7],
      ['ronda', 3],
    ]);
    expect(combosOf(cs('12o 12c 12e 1b')).map((x) => [x.kind, x.rank])).toEqual([['tringa', 12]]);
    expect(combosOf(cs('2o 2c 2e 2b')).map((x) => x.kind)).toEqual(['tringa']);
    expect(combosOf(cs('1o 2c 3e 4b'))).toEqual([]);
  });

  it('ronda seule : 1 point tout de suite', () => {
    const { state, steps } = newGame(makeRules(2), { dealer: 1, deck: stackDeck(2, 1, [[cs('3o 3c 5e 7b'), cs('1o 2c 4e 6b')]]) });
    expect(eventsOf(steps, 'announce')).toEqual([{ type: 'announce', seat: 0, kinds: ['ronda'] }]);
    expect(state.scores).toEqual([1, 0]);
    expect(state.announcements).toEqual([]);
  });

  it('tringa seule : 5 points, double ronda : 2 points', () => {
    expect(duel('12o 12c 12e 1b', '1o 2c 4e 6b').scores).toEqual([5, 0]);
    expect(duel('3o 3c 7e 7b', '1o 2c 4e 6b').scores).toEqual([2, 0]);
  });

  it('annonces adverses : la plus forte rafle tout à la fin de la donne', () => {
    let s = duel('3o 3c 5e 7b', '6o 6c 4e 1b');
    expect(s.scores).toEqual([0, 0]);
    expect(s.announcements.map((a) => a.seat)).toEqual([0, 1]);
    s = playAll(s, '5e 4e 7b 1b 3o 6o 3c').state;
    expect(s.scores).toEqual([0, 0]);
    const last = applyPlay(s, 1, c('6c'));
    const result = eventsOf(last.steps, 'announceResult')[0] as Extract<GameEvent, { type: 'announceResult' }>;
    expect(result.winners).toEqual([1]);
    expect(result.points).toEqual([0, 2]);
    expect(result.entries.map((e) => e.combos[0].rank)).toEqual([3, 6]);
  });

  it('la tringa bat toute ronda', () => {
    let s = duel('2o 2c 2e 7b', '12o 12c 4e 1b');
    s = playAll(s, '7b 4e 2o 1b 2c 12o 2e').state;
    const t = applyPlay(s, 1, c('12c'));
    const result = eventsOf(t.steps, 'announceResult')[0] as Extract<GameEvent, { type: 'announceResult' }>;
    expect(result.winners).toEqual([0]);
    expect(result.points).toEqual([6, 0]);
  });

  it('égalité en 1v1 : chacun marque 1 point', () => {
    let s = duel('4o 4c 1e 7b', '4e 4b 2e 6b');
    s = playAll(s, '1e 2e 7b 6b 4o 4e 4c').state;
    const t = applyPlay(s, 1, c('4b'));
    const result = eventsOf(t.steps, 'announceResult')[0] as Extract<GameEvent, { type: 'announceResult' }>;
    expect(result.points).toEqual([1, 1]);
  });

  it('2v2 : égalité au sommet entre adversaires, trois rondas -> 1 point chacun', () => {
    const s = quad(['7o 7c 1e 2e', '7e 7b 1c 2c', '3o 3c 4e 5e', '6o 10c 11e 12e']);
    expect(s.announcements.map((a) => a.seat)).toEqual([0, 1, 2]);
    let st = s;
    const steps: Step[] = [];
    while (st.dealNo === 1 && st.phase === 'play') {
      const t = applyPlay(st, st.turn, st.hands[st.turn][st.hands[st.turn].length - 1]);
      steps.push(...t.steps);
      st = t.state;
    }
    const result = eventsOf(steps, 'announceResult')[0] as Extract<GameEvent, { type: 'announceResult' }>;
    expect(result.winners).toEqual([0, 1]);
    expect(result.points).toEqual([1, 1]);
  });

  /** Joue la première donne (chacun sa plus grosse carte) et renvoie le règlement des annonces. */
  function firstDealResult(s: GameState) {
    let st = s;
    const steps: Step[] = [];
    while (st.dealNo === 1 && st.phase === 'play') {
      const t = applyPlay(st, st.turn, st.hands[st.turn][st.hands[st.turn].length - 1]);
      steps.push(...t.steps);
      st = t.state;
    }
    return eventsOf(steps, 'announceResult')[0] as Extract<GameEvent, { type: 'announceResult' }>;
  }

  it('2v2 : les quatre joueurs ont une ronda -> la plus petite gagne les 4 points', () => {
    const s = quad(['7o 7c 1e 2e', '7e 7b 1c 2c', '3o 3c 4e 5e', '6o 6c 11e 12e']);
    const result = firstDealResult(s);
    expect(result.winners).toEqual([2]);
    expect(result.points).toEqual([4, 0]);
    expect(result.lowest).toBe(true);
  });

  it('2v2 : quatre rondas dont les deux plus petites à égalité -> pot partagé', () => {
    const s = quad(['3o 3c 1e 2e', '3e 3b 1c 2c', '7o 7c 4e 5e', '6o 6c 11e 12e']);
    const result = firstDealResult(s);
    expect(result.winners).toEqual([0, 1]);
    expect(result.points).toEqual([2, 2]);
  });

  it('2v2 : cinq rondas (un joueur en a deux) -> la plus grande gagne', () => {
    const s = quad(['7o 7c 2e 2b', '3o 3c 1e 5e', '4o 4c 6e 10e', '6o 6c 11e 12e']);
    const result = firstDealResult(s);
    expect(result.winners).toEqual([0]);
    expect(result.points).toEqual([5, 0]);
    expect(result.lowest).toBeUndefined();
  });

  it('2v2 : une tringa bat les rondas et rafle 5 points plus 1 par ronda', () => {
    const s = quad(['2o 2c 2e 7b', '3o 3c 1e 5e', '4o 4c 6e 10e', '6o 6c 11e 12e']);
    const result = firstDealResult(s);
    expect(result.winners).toEqual([0]);
    expect(result.points).toEqual([8, 0]);
    expect(result.lowest).toBeUndefined();
  });

  it('2v2 : deux tringas -> la plus grande gagne', () => {
    const s = quad(['2o 2c 2e 7b', '11o 11c 11e 5e', '4o 4c 6e 10e', '6o 3c 1e 12e']);
    const result = firstDealResult(s);
    expect(result.winners).toEqual([1]);
    expect(result.points).toEqual([0, 11]);
  });

  it('2v2 : annonces de deux partenaires seulement -> points immédiats', () => {
    const s = quad(['7o 7c 1e 2e', '1o 2c 3e 4b', '3o 3c 3b 5e', '6o 10c 11e 12e']);
    expect(s.scores).toEqual([6, 0]);
    expect(s.announcements).toEqual([]);
  });
});

describe('dernière carte du donneur', () => {
  function lastCardOf(steps: Step[]) {
    return steps.flatMap((st) => (st.event.type === 'lastCard' ? [st.event] : []));
  }

  it('le donneur prend avec un 12 : 5 points pour son équipe', () => {
    const s = lastTrick(['3o', '4c', '5e', '12b'], '12o 7c');
    const t = playAll(s, '3o 4c 5e 12b');
    expect(lastCardOf(t.steps)).toEqual([{ type: 'lastCard', seat: 3, card: c('12b'), outcome: 'king', team: 1, points: 5 }]);
    expect(pointsOf(t.steps).filter((p) => p.reason === 'lastCard')).toEqual([
      { type: 'points', team: 1, seat: 3, points: 5, reason: 'lastCard' },
    ]);
    expect(t.state.phase).toBe('roundEnd');
    expect(t.state.scores).toEqual([0, 5]);
  });

  it('le donneur prend avec un 1 : 5 points pour l’équipe adverse (et pas de missa)', () => {
    const s = lastTrick(['5o', '6c', '7e', '1b'], '1o 2c 3e');
    const t = playAll(s, '5o 6c 7e 1b');
    expect(lastCardOf(t.steps)).toEqual([{ type: 'lastCard', seat: 3, card: c('1b'), outcome: 'ace', team: 0, points: 5 }]);
    expect(pointsOf(t.steps).map((p) => [p.team, p.reason, p.points])).toEqual([[0, 'lastCard', 5]]);
    expect(eventsOf(t.steps, 'missa')).toEqual([]);
  });

  it('le donneur ne prend rien : 5 points pour l’équipe adverse, sa carte part avec le tapis', () => {
    const s = lastTrick(['5o', '6c', '7e', '11b'], '2o');
    const t = playAll(s, '5o 6c 7e 11b');
    expect(lastCardOf(t.steps)).toEqual([{ type: 'lastCard', seat: 3, card: c('11b'), outcome: 'miss', team: 0, points: 5 }]);
    expect(t.state.scores).toEqual([5, 0]);
    const sweep = eventsOf(t.steps, 'sweep')[0] as Extract<GameEvent, { type: 'sweep' }>;
    expect(sweep.seat).toBe(0);
    expect(sweep.cards).toContain(c('11b'));
  });

  it('le donneur prend avec une autre carte : rien de spécial', () => {
    const s = lastTrick(['1o', '2c', '3e', '5b'], '5c');
    const t = playAll(s, '1o 2c 3e 5b');
    expect(lastCardOf(t.steps)).toEqual([]);
    expect(t.state.scores).toEqual([0, 0]);
  });

  it('rebondir sur une darba avec un 12 compte comme une prise avec un 12', () => {
    const s = lastTrick(['', '', '', '12b'], '4o');
    s.pending = { owner: 2, victim: 1, rank: 12, cards: cs('12o 12c'), level: 1, missa: false };
    s.turn = 3;
    const t = applyPlay(s, 3, c('12b'));
    expect(pointsOf(t.steps).map((p) => [p.team, p.reason, p.points])).toEqual([
      [1, 'khamsa', 5],
      [1, 'lastCard', 5],
    ]);
  });

  it('la dernière carte peut faire gagner la partie', () => {
    const s = lastTrick(['5o', '6c', '7e', '11b'], '2o', { target: 41 });
    s.scores = [38, 20];
    const t = playAll(s, '5o 6c 7e 11b');
    expect(t.state.phase).toBe('gameOver');
    expect(t.state.winner).toBe(0);
    expect(t.state.scores).toEqual([43, 20]);
  });

  it('règle désactivée (0 point) : aucun effet', () => {
    const s = lastTrick(['5o', '6c', '7e', '11b'], '2o', { lastCardPoints: 0 });
    const t = playAll(s, '5o 6c 7e 11b');
    expect(lastCardOf(t.steps)).toEqual([]);
    expect(t.state.scores).toEqual([0, 0]);
  });

  it('en partie réelle, c’est toujours le donneur qui joue la dernière carte', () => {
    const rng = createRng(31);
    let seen = 0;
    for (let g = 0; g < 120; g++) {
      const players = g % 2 ? 4 : 2;
      let { state } = newGame(makeRules(players, { target: 1000 }), { rng });
      while (state.phase === 'play') {
        const last = state.deck.length === 0 && state.hands.reduce((n, h) => n + h.length, 0) === 1;
        if (last) expect(state.turn).toBe(state.dealer);
        const card = pick(state.hands[state.turn], rng);
        const t = applyPlay(state, state.turn, card);
        const events = lastCardOf(t.steps);
        if (!last) expect(events).toEqual([]);
        else if (events.length) {
          seen++;
          const e = events[0];
          expect(e.card).toBe(card);
          const took = t.steps.some((st) => (st.event.type === 'capture' || st.event.type === 'darba') && st.event.seat === state.dealer);
          expect(e.outcome).toBe(!took ? 'miss' : rankOf(card) === 12 ? 'king' : 'ace');
          expect(e.team).toBe(e.outcome === 'king' ? state.dealer % 2 : (state.dealer + 1) % 2);
        }
        state = t.state;
      }
    }
    expect(seen).toBeGreaterThan(30);
  });
});

describe('fin de manche et de partie', () => {
  it('le dernier preneur ramasse le tapis et chaque carte au-delà de 20 compte', () => {
    const rng = createRng(21);
    for (let g = 0; g < 20; g++) {
      let { state } = newGame(makeRules(g % 2 ? 4 : 2, { target: 1000 }), { rng });
      let steps: Step[] = [];
      while (state.phase === 'play') {
        const t = applyPlay(state, state.turn, pick(state.hands[state.turn], rng));
        steps = t.steps;
        state = t.state;
      }
      expect(state.phase).toBe('roundEnd');
      expect(state.table).toEqual([]);
      expect(state.piles[0].length + state.piles[1].length).toBe(40);
      const end = eventsOf(steps, 'roundEnd')[0] as Extract<GameEvent, { type: 'roundEnd' }>;
      expect(end.counts[0] + end.counts[1]).toBe(40);
      expect(end.points).toEqual([Math.max(0, end.counts[0] - 20), Math.max(0, end.counts[1] - 20)]);
      const sweep = eventsOf(steps, 'sweep')[0] as Extract<GameEvent, { type: 'sweep' }> | undefined;
      if (sweep) expect(sweep.seat).toBe(state.lastCapturer);
    }
  });

  it('la partie s’arrête dès qu’une équipe atteint l’objectif, même en pleine manche', () => {
    let s = duel('3o 5c 7e 12b', '3c 6o 10e 11b', { target: 41 });
    s = cloneState(s);
    s.scores = [0, 40];
    s = applyPlay(s, 0, c('3o')).state;
    const t = applyPlay(s, 1, c('3c'));
    expect(t.state.phase).toBe('gameOver');
    expect(t.state.winner).toBe(1);
    expect(t.steps.at(-1)!.event).toEqual({ type: 'gameOver', winner: 1, scores: [0, 42] });
    expect(() => applyPlay(t.state, 0, c('5c'))).toThrow(RondaError);
  });

  it('une annonce peut faire gagner dès la distribution', () => {
    const deck = stackDeck(2, 1, [[cs('12o 12c 12e 1b'), cs('1o 2c 4e 6b')]]);
    const { state } = newGame(makeRules(2, { target: 5 }), { dealer: 1, deck });
    expect(state.phase).toBe('gameOver');
    expect(state.winner).toBe(0);
  });

  it('refuse les coups illégaux', () => {
    const s = duel('3o 5c 7e 12b', '3c 6o 10e 11b');
    expect(() => applyPlay(s, 1, c('3c'))).toThrow(/not_your_turn/);
    expect(() => applyPlay(s, 0, c('3c'))).toThrow(/card_not_in_hand/);
    expect(legalCards(s, 0)).toHaveLength(4);
    expect(legalCards(s, 1)).toEqual([]);
  });
});

describe('parties complètes aléatoires', () => {
  it('conserve les 40 cartes, termine toujours et garde des scores cohérents', () => {
    const rng = createRng(2026);
    for (let g = 0; g < 150; g++) {
      const players = g % 3 === 0 ? 2 : 4;
      const rules = makeRules(players, { darbaChain: g % 2 === 0, target: g % 5 === 0 ? 21 : 41 });
      let t = newGame(rules, { rng, dealer: g % players });
      let state = t.state;
      let totalPoints: [number, number] = [0, 0];
      const addPoints = (steps: Step[]) => {
        for (const st of steps) {
          expect(countCards(st.state)).toBe(40);
          if (st.event.type === 'points') totalPoints[st.event.team] += st.event.points;
        }
      };
      addPoints(t.steps);
      let guard = 0;
      while (state.phase !== 'gameOver') {
        if (state.phase === 'roundEnd') {
          t = nextRound(state, { rng });
        } else {
          t = applyPlay(state, state.turn, pick(state.hands[state.turn], rng));
        }
        addPoints(t.steps);
        state = t.state;
        expect(state.scores).toEqual(totalPoints);
        expect(++guard).toBeLessThan(5000);
      }
      expect(state.winner).not.toBeNull();
      expect(state.scores[state.winner!]).toBeGreaterThanOrEqual(rules.target);
      expect(state.scores[state.winner!]).toBeGreaterThan(state.scores[1 - state.winner!]);
      totalPoints = [0, 0];
    }
  });

  it('l’aperçu de prise correspond exactement au résultat du coup', () => {
    const rng = createRng(99);
    let checked = 0;
    for (let g = 0; g < 60; g++) {
      let { state } = newGame(makeRules(g % 2 ? 4 : 2, { darbaChain: true, target: 1000 }), { rng });
      while (state.phase === 'play') {
        const view = viewFor(state, state.turn);
        for (const card of view.hand) {
          const preview = capturePreview(view, card);
          const t = applyPlay(state, state.turn, card);
          const events = t.steps.map((st) => st.event);
          const capture = events.find((e) => e.type === 'capture');
          const darba = events.find((e) => e.type === 'darba' && e.seat === state.turn);
          if (preview.zid) {
            expect(darba).toMatchObject({ level: preview.darba });
          } else if (preview.captures.length) {
            expect(capture).toBeDefined();
            const got = (capture as { cards: Card[] }).cards.filter((x) => x !== card).sort();
            expect(got).toEqual(preview.captures.slice().sort());
            expect(darba !== undefined).toBe(preview.darba === 1);
            expect(events.some((e) => e.type === 'missa' && e.seat === state.turn)).toBe(preview.missa);
          } else {
            expect(capture).toBeUndefined();
          }
          checked++;
        }
        state = applyPlay(state, state.turn, pick(state.hands[state.turn], rng)).state;
      }
    }
    expect(checked).toBeGreaterThan(1000);
  });
});
