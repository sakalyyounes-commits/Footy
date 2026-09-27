import { memo } from 'react';
import { rankOf, suitOf, type Card, type Suit } from '@ronda/core';
import { starPoints } from './CardDefs';

const W = 180;
const H = 280;

const SUIT_INK: Record<Suit, string> = {
  oros: '#9a6a0f',
  copas: '#b1281d',
  espadas: '#1f3f82',
  bastos: '#2e6a2e',
};

/** « Pintas » : coupures du cadre qui indiquent la couleur (tradition des cartes espagnoles). */
const PINTA_GAPS: Record<Suit, number> = { oros: 0, copas: 1, espadas: 2, bastos: 3 };

/** `max` : taille maximale d'une forme étroite agrandie, pour ne pas chevaucher sa voisine. */
type Layout = { pts: [number, number][]; size: number; max: number };

const PIPS: Record<number, Layout> = {
  1: { pts: [[90, 142]], size: 104, max: 124 },
  2: {
    pts: [
      [90, 86],
      [90, 198],
    ],
    size: 66,
    max: 100,
  },
  3: {
    pts: [
      [90, 76],
      [90, 142],
      [90, 208],
    ],
    size: 56,
    max: 62,
  },
  4: {
    pts: [
      [60, 94],
      [120, 94],
      [60, 190],
      [120, 190],
    ],
    size: 54,
    max: 90,
  },
  5: {
    pts: [
      [60, 84],
      [120, 84],
      [90, 142],
      [60, 200],
      [120, 200],
    ],
    size: 50,
    max: 74,
  },
  6: {
    pts: [
      [60, 80],
      [120, 80],
      [60, 142],
      [120, 142],
      [60, 204],
      [120, 204],
    ],
    size: 48,
    max: 60,
  },
  7: {
    pts: [
      [60, 78],
      [120, 78],
      [90, 110],
      [60, 142],
      [120, 142],
      [60, 206],
      [120, 206],
    ],
    size: 44,
    max: 58,
  },
};

/** Les épées et les bâtons sont des formes étroites : on les agrandit pour garder le même poids visuel. */
const SUIT_SCALE: Record<Suit, number> = { oros: 1, copas: 1.05, espadas: 1.32, bastos: 1.22 };

function Pip({ suit, x, y, size, max = Infinity }: { suit: Suit; x: number; y: number; size: number; max?: number }) {
  const s = Math.max(size, Math.min(size * SUIT_SCALE[suit], max));
  return <use href={`#s-${suit}`} x={x - s / 2} y={y - s / 2} width={s} height={s} />;
}

/** Cadre intérieur avec les coupures qui signalent la couleur. */
function Frame({ suit }: { suit: Suit }) {
  const gaps = PINTA_GAPS[suit];
  const x0 = 12;
  const x1 = W - 12;
  const color = SUIT_INK[suit];
  const segments: [number, number][] = [];
  if (gaps === 0) segments.push([x0, x1]);
  else {
    const gapW = 9;
    const span = x1 - x0;
    const starts = Array.from({ length: gaps }, (_, i) => x0 + (span * (i + 1)) / (gaps + 1) - gapW / 2);
    let from = x0;
    for (const g of starts) {
      segments.push([from, g]);
      from = g + gapW;
    }
    segments.push([from, x1]);
  }
  return (
    <g stroke={color} strokeWidth="2.2" fill="none" opacity="0.75">
      {segments.map(([a, b], i) => (
        <g key={i}>
          <line x1={a} y1={12} x2={b} y2={12} />
          <line x1={a} y1={H - 12} x2={b} y2={H - 12} />
        </g>
      ))}
      <line x1={x0} y1={12} x2={x0} y2={H - 12} />
      <line x1={x1} y1={12} x2={x1} y2={H - 12} />
    </g>
  );
}

// Arc outrepassé (en fer à cheval), typique de l'architecture marocaine.
const ARCH = 'M49.7 226 V118 A48 48 0 1 1 130.3 118 V226 Z';
const ARCH_INNER = 'M55.2 220 V119 A42.5 42.5 0 1 1 124.8 119 V220 Z';

function Figure({ suit, rank }: { suit: Suit; rank: 10 | 11 | 12 }) {
  return (
    <g>
      <path d={ARCH} fill={`url(#g-arch-${rank})`} stroke="#7a5310" strokeWidth="3" />
      <path d={ARCH} fill="url(#p-arch)" />
      <path d={ARCH_INNER} fill="none" stroke="#f2c75c" strokeWidth="1.6" opacity="0.9" />
      <polygon points={starPoints(90, 60, 8, 4.5)} fill="#f2c75c" opacity="0.9" />
      {rank === 12 && (
        <>
          <use href="#e-crown" x={60} y={74} width={60} height={42} />
          <Pip suit={suit} x={90} y={166} size={56} max={66} />
        </>
      )}
      {rank === 11 && (
        <>
          <use href="#e-horse" x={54} y={70} width={72} height={72} />
          <Pip suit={suit} x={90} y={188} size={42} max={52} />
        </>
      )}
      {rank === 10 && (
        <>
          <use href="#e-fez" x={64} y={74} width={52} height={42} />
          <Pip suit={suit} x={90} y={166} size={56} max={66} />
        </>
      )}
    </g>
  );
}

function Index({ rank, color }: { rank: number; color: string }) {
  const style = { fontFamily: "'El Messiri Variable', 'Cairo Variable', Georgia, serif", fontWeight: 800 } as const;
  const size = rank >= 10 ? 36 : 42;
  return (
    <g fill={color} style={style} fontSize={size} textAnchor="middle">
      <text x={31} y={52}>
        {rank}
      </text>
      <text x={31} y={52} transform={`rotate(180 ${W / 2} ${H / 2})`}>
        {rank}
      </text>
    </g>
  );
}

export const CardFace = memo(function CardFace({ card }: { card: Card }) {
  const suit = suitOf(card);
  const rank = rankOf(card);
  const ink = SUIT_INK[suit];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="card-svg" aria-label={`${rank} ${suit}`} role="img">
      <rect x="1" y="1" width={W - 2} height={H - 2} rx="14" fill="url(#g-card)" stroke="#c9c2b0" strokeWidth="2" />
      <Frame suit={suit} />
      {rank >= 10 ? (
        <Figure suit={suit} rank={rank as 10 | 11 | 12} />
      ) : (
        PIPS[rank].pts.map(([x, y], i) => <Pip key={i} suit={suit} x={x} y={y} size={PIPS[rank].size} max={PIPS[rank].max} />)
      )}
      <Index rank={rank} color={ink} />
    </svg>
  );
});

export interface BackStyle {
  pattern: string;
  frame: string;
  medallion: string;
  accent: string;
}

export const BACKS: Record<string, BackStyle> = {
  'back-zellige': { pattern: 'p-back-zellige', frame: '#f5c542', medallion: '#6e0710', accent: '#ffe08a' },
  'back-majorelle': { pattern: 'p-back-majorelle', frame: '#f4d03f', medallion: '#18248a', accent: '#f4d03f' },
  'back-berbere': { pattern: 'p-back-berbere', frame: '#f3e3c3', medallion: '#1d140a', accent: '#e8b84a' },
  'back-chaouen': { pattern: 'p-back-chaouen', frame: '#ffffff', medallion: '#2f6db3', accent: '#eef6ff' },
  'back-royal': { pattern: 'p-back-royal', frame: '#e8b84a', medallion: '#4a0f0a', accent: '#f7dc94' },
  'back-or': { pattern: 'p-back-or', frame: '#fff0b8', medallion: '#7a5310', accent: '#fff0b8' },
  'back-vip': { pattern: 'p-back-vip', frame: '#e8b84a', medallion: '#000000', accent: '#f7dc94' },
};

export const CardBack = memo(function CardBack({ back = 'back-zellige' }: { back?: string }) {
  const b = BACKS[back] ?? BACKS['back-zellige'];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="card-svg" aria-hidden="true">
      <rect x="1" y="1" width={W - 2} height={H - 2} rx="14" fill="#fdfbf6" stroke="#c9c2b0" strokeWidth="2" />
      <rect x="9" y="9" width={W - 18} height={H - 18} rx="9" fill={`url(#${b.pattern})`} stroke={b.frame} strokeWidth="3.5" />
      <rect x="17" y="17" width={W - 34} height={H - 34} rx="6" fill="none" stroke={b.accent} strokeWidth="1.4" opacity="0.7" />
      <circle cx={W / 2} cy={H / 2} r="36" fill={b.medallion} stroke={b.frame} strokeWidth="3.5" />
      <polygon points={starPoints(W / 2, H / 2, 30, 21)} fill={b.accent} opacity="0.95" />
      <polygon points={starPoints(W / 2, H / 2, 19, 13)} fill={b.medallion} />
      <polygon points={starPoints(W / 2, H / 2, 11, 7)} fill={b.frame} />
      <circle cx={W / 2} cy={H / 2} r="3.5" fill={b.medallion} />
    </svg>
  );
});
