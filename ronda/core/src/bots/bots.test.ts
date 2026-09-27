import { describe, expect, it } from 'vitest';
import {
  applyPlay,
  chooseCard,
  combosOf,
  createRng,
  determinize,
  makeRules,
  newDeck,
  newGame,
  nextRound,
  parseCard,
  parseCards,
  pick,
  probAtLeastOne,
  rankIndex,
  unseenByRank,
  viewFor,
  type BotLevel,
  type PlayerView,
} from '../index';

const c = parseCard;
const cs = parseCards;

function baseView(overrides: Partial<PlayerView>): PlayerView {
  return {
    rules: makeRules(2),
    seat: 0,
    phase: 'play',
    round: 1,
    dealer: 1,
    dealNo: 3,
    dealsPerRound: 5,
    deckCount: 16,
    hand: [],
    handCounts: [2, 2],
    table: [],
    pending: null,
    pileCounts: [0, 0],
    scores: [0, 0],
    turn: 0,
    lastPlayed: null,
    lastCapturer: null,
    announcements: [],
    played: [],
    dealAnnounced: [],
    dealPlays: [],
    winner: null,
    moveCount: 0,
    ...overrides,
  };
}

function playGame(levels: BotLevel[], seed: number, target = 21) {
  const rng = createRng(seed);
  const players = levels.length as 2 | 4;
  let { state } = newGame(makeRules(players, { target }), { rng, dealer: seed % players });
  while (state.phase !== 'gameOver') {
    if (state.phase === 'roundEnd') {
      state = nextRound(state, { rng }).state;
      continue;
    }
    const seat = state.turn;
    const card = chooseCard(viewFor(state, seat), levels[seat], { rng, samples: 20 });
    expect(state.hands[seat]).toContain(card);
    state = applyPlay(state, seat, card).state;
  }
  return state.winner!;
}

describe('probabilités', () => {
  it('calcule la chance qu’une main contienne une carte donnée', () => {
    expect(probAtLeastOne(10, 0, 3)).toBe(0);
    expect(probAtLeastOne(10, 2, 0)).toBe(0);
    expect(probAtLeastOne(4, 1, 4)).toBe(1);
    // 1 carte cherchée parmi 10, main de 1 : 10 %.
    expect(probAtLeastOne(10, 1, 1)).toBeCloseTo(0.1);
    // 2 cartes parmi 4, main de 2 : 1 - C(2,2)/C(4,2) = 5/6.
    expect(probAtLeastOne(4, 2, 2)).toBeCloseTo(5 / 6);
  });

  it('compte les cartes encore invisibles par rang', () => {
    const unseen = unseenByRank({ hand: cs('5o 5c'), played: cs('5e 12b') });
    expect(unseen[rankIndex(c('5o'))]).toBe(1);
    expect(unseen[rankIndex(c('12b'))]).toBe(3);
    expect(unseen[rankIndex(c('1o'))]).toBe(4);
  });
});

describe('choix des bots', () => {
  it('jouent toujours une carte de leur main, quel que soit le niveau', () => {
    const rng = createRng(4);
    for (const level of ['easy', 'medium', 'hard'] as BotLevel[]) {
      for (let g = 0; g < 4; g++) {
        let { state } = newGame(makeRules(g % 2 ? 4 : 2, { target: 1000 }), { rng });
        while (state.phase === 'play') {
          const view = viewFor(state, state.turn);
          const card = chooseCard(view, level, { rng, samples: 8 });
          expect(view.hand).toContain(card);
          state = applyPlay(state, state.turn, card).state;
        }
      }
    }
  });

  it('le bot moyen fait la darba quand elle se présente', () => {
    const view = baseView({
      hand: cs('5o 3e'),
      table: cs('5c 11o'),
      lastPlayed: { seat: 1, card: c('5c'), onTable: true },
      played: cs('5c 11o'),
    });
    expect(chooseCard(view, 'medium')).toBe(c('5o'));
    expect(chooseCard(view, 'hard', { rng: createRng(1), samples: 30 })).toBe(c('5o'));
  });

  it('le bot moyen pose la carte « morte » plutôt qu’une carte que l’adversaire peut frapper', () => {
    // Les trois autres 7 sont déjà sortis : poser le 7 ne risque aucune darba.
    const view = baseView({
      hand: cs('7o 2c'),
      table: cs('12b'),
      played: cs('7c 7e 7b 12b'),
      lastPlayed: { seat: 1, card: c('12b'), onTable: true },
    });
    expect(chooseCard(view, 'medium')).toBe(c('7o'));
  });

  it('donneur à deux cartes de la fin : garde le 12 qui prendra, pas le 1', () => {
    // Dernière donne en 1v1 : le donneur (place 1) a 1o et 12c ; l'adversaire n'a plus que le 3e.
    const hand = cs('1o 12c');
    const hidden = cs('3e');
    const played = newDeck().filter((x) => !hand.includes(x) && !hidden.includes(x));
    const view = baseView({
      seat: 1,
      turn: 1,
      dealer: 1,
      dealNo: 5,
      deckCount: 0,
      hand,
      handCounts: [1, 2],
      table: cs('12b 4c'),
      played,
    });
    expect(chooseCard(view, 'medium')).toBe(c('1o'));
    expect(chooseCard(view, 'hard', { rng: createRng(2), samples: 20 })).toBe(c('1o'));
    // Sans la règle, prendre le 12 tout de suite reste le meilleur coup.
    expect(chooseCard({ ...view, rules: makeRules(2, { lastCardPoints: 0 }) }, 'medium')).toBe(c('12c'));
  });

  it('le bot expert reconstitue des mondes cohérents avec les annonces', () => {
    const rng = createRng(8);
    let { state } = newGame(makeRules(4), { rng });
    // Avance de quelques coups pour avoir des cartes jouées.
    for (let i = 0; i < 5 && state.phase === 'play'; i++) state = applyPlay(state, state.turn, pick(state.hands[state.turn], rng)).state;
    const view = viewFor(state, state.turn);
    for (let k = 0; k < 30; k++) {
      const world = determinize(view, rng);
      const all = [...world.deck, ...world.hands.flat(), ...world.table, ...(world.pending?.cards ?? []), ...world.piles.flat()];
      expect(new Set(all).size).toBe(40);
      expect(world.hands.map((h) => h.length)).toEqual(view.handCounts);
      expect(world.hands[view.seat]).toEqual(view.hand);
      for (let seat = 0; seat < 4; seat++) {
        if (seat === view.seat) continue;
        const plays = view.dealPlays.filter((p) => p.seat === seat).map((p) => p.card);
        const kinds = combosOf([...world.hands[seat], ...plays]).map((x) => x.kind).sort();
        const want = (view.dealAnnounced.find((a) => a.seat === seat)?.kinds ?? []).slice().sort();
        expect(kinds).toEqual(want);
      }
    }
  });
});

describe('force relative', () => {
  it('le bot moyen bat nettement le bot facile', () => {
    let wins = 0;
    const games = 60;
    for (let g = 0; g < games; g++) {
      const mediumFirst = g % 2 === 0;
      const winner = playGame(mediumFirst ? ['medium', 'easy'] : ['easy', 'medium'], 500 + g);
      if (winner === (mediumFirst ? 0 : 1)) wins++;
    }
    expect(wins / games).toBeGreaterThan(0.65);
  });
});
