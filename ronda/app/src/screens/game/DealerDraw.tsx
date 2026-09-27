import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { rankIndex, STEP_MS, type Card, type Seat } from '@ronda/core';
import { sfx } from '../../audio/audio';
import { useT } from '../../i18n';
import type { DrawDisplay, SeatDisplay } from '../../game/types';
import { seatPosition, type SeatPos } from './GameParts';
import { PlayingCard } from './PlayingCard';
import type { Pt, TableGeometry } from './Table3D';

/** Où chaque joueur pose sa carte tirée : sur le tapis, devant sa place, sans toucher sa plaque. */
function spotOf(pos: SeatPos, g: TableGeometry): Pt {
  const L = g.length;
  switch (pos) {
    case 'top':
      return g.at(0, L * 0.64);
    case 'left':
      return g.at(-0.2, L * 0.45);
    case 'right':
      return g.at(0.2, L * 0.45);
    default:
      return g.at(0, L * 0.25);
  }
}

/**
 * Avancement du tirage : deux étapes par tirage (les cartes arrivent et se retournent, puis le
 * verdict s'affiche), au rythme du moteur (STEP_MS.dealerDraw par tirage).
 */
export function useDrawStage(draw: DrawDisplay | null, speed: number): number {
  const [state, setState] = useState({ id: -1, stage: 0 });
  const stage = draw && state.id === draw.id ? state.stage : 0;
  useEffect(() => {
    if (!draw || stage >= draw.rounds.length * 2 - 1) return;
    const roundMs = STEP_MS.dealerDraw * speed;
    const id = setTimeout(() => setState({ id: draw.id, stage: stage + 1 }), (stage % 2 === 0 ? 0.62 : 0.38) * roundMs);
    return () => clearTimeout(id);
  }, [draw, stage, speed]);
  return stage;
}

function drawInfo(draw: DrawDisplay, stage: number) {
  const round = Math.min(Math.floor(stage / 2), draw.rounds.length - 1);
  const current = draw.rounds[round];
  const lowest = Math.min(...current.map((d) => rankIndex(d.card)));
  return {
    round,
    verdict: stage % 2 === 1,
    final: round === draw.rounds.length - 1,
    tied: current.filter((d) => rankIndex(d.card) === lowest).map((d) => d.seat),
  };
}

/**
 * Tirage du donneur en début de partie : chaque joueur retourne une carte devant lui ; en cas
 * d'égalité sur la plus petite, les ex æquo retirent ; la plus petite carte désigne le donneur.
 */
export function DealerDrawView({
  draw,
  stage,
  g,
  me,
  players,
  seats,
  back,
  cardW,
}: {
  draw: DrawDisplay;
  stage: number;
  g: TableGeometry;
  me: Seat;
  players: number;
  seats: SeatDisplay[];
  back: string;
  cardW: number;
}) {
  const { round, verdict, final, tied } = drawInfo(draw, stage);
  useEffect(() => {
    if (verdict && final) sfx('bell');
    else if (!verdict && round > 0) sfx('deal');
  }, [verdict, final, round]);

  // Dernière carte tirée par chaque joueur (les éliminés gardent la leur, en retrait).
  const latest = new Map<Seat, { card: Card; round: number; order: number }>();
  draw.rounds.slice(0, round + 1).forEach((r, k) => r.forEach((d, i) => latest.set(d.seat, { card: d.card, round: k, order: i })));
  const nameOf = (seat: Seat) => seats[seat]?.name ?? '';
  const deck = g.at(-0.26, g.length - 0.32);

  return (
    <>
      {seats.map((s) => {
        const got = latest.get(s.seat);
        if (!got) return null;
        const p = spotOf(seatPosition(s.seat, me, players), g);
        const fresh = got.round === round && !verdict;
        const inPlay = got.round === round;
        const dealer = verdict && final && s.seat === draw.dealer;
        const tie = verdict && !final && tied.includes(s.seat);
        const out = !inPlay || (verdict && !tied.includes(s.seat));
        return (
          <div key={s.seat} className="draw-spot" style={{ left: p.x, top: p.y }}>
            <PlayingCard
              key={got.card}
              card={got.card}
              width={cardW}
              back={back}
              shared={false}
              className={`on-felt ${dealer ? 'glow' : ''} ${tie ? 'tie' : ''}`}
              initial={{ x: deck.x - p.x, y: deck.y - p.y, scale: 0.45, opacity: 0, rotate: -25 }}
              animate={{ x: 0, y: 0, scale: dealer ? 1.15 : 1, opacity: out ? 0.4 : 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 240, damping: 24, delay: fresh ? got.order * 0.1 : 0 }}
              flipIn={fresh ? 0.3 + got.order * 0.1 : false}
            />
            <span className={`draw-name ${dealer ? 'dealer' : ''}`}>{nameOf(s.seat)}</span>
          </div>
        );
      })}
    </>
  );
}

/** Légende du tirage, affichée à la place de la main (encore vide) du joueur. */
export function DrawCaption({ draw, stage, seats }: { draw: DrawDisplay; stage: number; seats: SeatDisplay[] }) {
  const t = useT();
  const { verdict, final, tied } = drawInfo(draw, stage);
  const nameOf = (seat: Seat) => seats[seat]?.name ?? '';
  const caption = !verdict
    ? t('game.draw_sub')
    : final
      ? t('game.draw_dealer', { name: nameOf(draw.dealer) })
      : t('game.draw_tie', { names: tied.map(nameOf).join(' & ') });
  return (
    <div className="draw-caption">
      <div className="draw-title">{t('game.draw_title')}</div>
      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          className={`draw-text ${verdict ? (final ? 'final' : 'tie') : ''}`}
          initial={{ opacity: 0, y: 8, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {caption}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
