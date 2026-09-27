import { memo, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';

/**
 * Table de jeu en 3D façon table de poker : un « stade » (rectangle aux bouts arrondis) posé à plat,
 * vu en perspective depuis la place du joueur. La géométrie est projetée en JavaScript puis dessinée
 * en SVG : le rendu reste net à toutes les tailles et les places des joueurs tombent pile sur le
 * bourrelet, sans transformation 3D CSS qui gênerait les animations des cartes.
 */

export interface Pt {
  x: number;
  y: number;
}

export interface TableGeometry {
  w: number;
  h: number;
  outer: string;
  feltPath: string;
  railMid: string;
  line: string;
  /** Point de l'écran correspondant à un point de la table (u : -0.5 à 0.5, v : 0 près de moi à L au fond). */
  at(u: number, v: number): Pt;
  /** Facteur de perspective à la profondeur v (1 au bord le plus proche). */
  depth(v: number): number;
  length: number;
  rail: number;
  seats: { top: Pt; left: Pt; right: Pt; bottom: Pt };
  /** Zone du tapis réservée aux cartes posées. */
  cardsBox: { x: number; y: number; w: number; h: number };
  center: Pt;
  feltRx: number;
  feltRy: number;
}

const TILT = (27 * Math.PI) / 180;
const FOCAL = 3.1;
const RAIL = 0.1;

function rawProject(u: number, v: number): Pt {
  const z = v * Math.sin(TILT);
  const s = FOCAL / (FOCAL + z);
  return { x: u * s, y: -v * Math.cos(TILT) * s };
}

/** Contour d'un stade de demi-largeur `hw`, long de `len`, arrondi aux deux bouts. */
function stadium(hw: number, len: number, inset: number, steps = 36): [number, number][] {
  const r = 0.5 - inset;
  const near = 0.5;
  const far = len - 0.5;
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / steps; // bout proche, de gauche à droite (par le bas)
    pts.push([Math.sin(a) * r, near - Math.cos(a) * r]);
  }
  for (let i = 1; i < steps; i++) pts.push([hw - inset, near + ((far - near) * i) / steps]);
  for (let i = 0; i <= steps; i++) {
    const a = Math.PI / 2 - (Math.PI * i) / steps; // bout du fond, de droite à gauche (par le haut)
    pts.push([Math.sin(a) * r, far + Math.cos(a) * r]);
  }
  for (let i = 1; i < steps; i++) pts.push([-(hw - inset), far - ((far - near) * i) / steps]);
  return pts;
}

function projectedAspect(len: number): number {
  const pts = stadium(0.5, len, 0).map(([u, v]) => rawProject(u, v));
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return (Math.max(...ys) - Math.min(...ys)) / (Math.max(...xs) - Math.min(...xs));
}

export function tableGeometry(w: number, h: number, margins: { top: number; bottom: number; side: number }): TableGeometry {
  const availW = Math.max(40, w - margins.side * 2);
  const availH = Math.max(40, h - margins.top - margins.bottom);
  // Longueur de la table choisie pour remplir la zone disponible (plus l'écran est haut, plus elle est longue).
  let lo = 1.15;
  let hi = 2.6;
  const want = availH / availW;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (projectedAspect(mid) < want) lo = mid;
    else hi = mid;
  }
  const len = (lo + hi) / 2;

  const outerRaw = stadium(0.5, len, 0).map(([u, v]) => rawProject(u, v));
  const xs = outerRaw.map((p) => p.x);
  const ys = outerRaw.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const k = Math.min(availW / (maxX - minX), availH / (maxY - minY));
  const offX = margins.side + (availW - (maxX - minX) * k) / 2 - minX * k;
  const offY = margins.top + (availH - (maxY - minY) * k) / 2 - minY * k;

  const at = (u: number, v: number): Pt => {
    const p = rawProject(u, v);
    return { x: p.x * k + offX, y: p.y * k + offY };
  };
  const depth = (v: number) => FOCAL / (FOCAL + v * Math.sin(TILT));
  const path = (pts: [number, number][]) =>
    pts
      .map(([u, v], i) => {
        const p = at(u, v);
        return `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
      })
      .join('') + 'Z';

  const feltLeft = at(-0.5 + RAIL, len / 2);
  const feltRight = at(0.5 - RAIL, len / 2);
  const cardsTop = at(0, len * 0.72);
  const cardsBottom = at(0, len * 0.27);
  const midY = (cardsTop.y + cardsBottom.y) / 2;
  const feltTop = at(0, len - RAIL);
  const feltBottom = at(0, RAIL);

  return {
    w,
    h,
    length: len,
    rail: RAIL,
    outer: path(stadium(0.5, len, 0)),
    feltPath: path(stadium(0.5, len, RAIL)),
    railMid: path(stadium(0.5, len, RAIL / 2)),
    line: path(stadium(0.5, len, RAIL + 0.07)),
    at,
    depth,
    seats: {
      top: at(0, len - RAIL / 2),
      bottom: at(0, RAIL / 2),
      left: at(-0.5 + RAIL / 2, len * 0.47),
      right: at(0.5 - RAIL / 2, len * 0.47),
    },
    cardsBox: {
      x: feltLeft.x,
      y: cardsTop.y,
      w: feltRight.x - feltLeft.x,
      h: cardsBottom.y - cardsTop.y,
    },
    center: { x: (feltLeft.x + feltRight.x) / 2, y: midY },
    feltRx: (feltRight.x - feltLeft.x) / 2,
    feltRy: (feltBottom.y - feltTop.y) / 2,
  };
}

/** Grain de feutre : petite texture de bruit générée une fois. */
let feltNoise: string | null = null;
function noiseTexture(): string {
  if (feltNoise !== null) return feltNoise;
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 96;
    const ctx = c.getContext('2d');
    if (!ctx) return (feltNoise = '');
    const img = ctx.createImageData(96, 96);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = n;
      img.data[i + 3] = 26;
    }
    ctx.putImageData(img, 0, 0);
    feltNoise = c.toDataURL();
  } catch {
    feltNoise = '';
  }
  return feltNoise;
}

export const TableSurface = memo(function TableSurface({ g }: { g: TableGeometry }) {
  const noise = noiseTexture();
  const railPx = Math.abs(g.at(-0.5, g.length / 2).x - g.at(-0.5 + g.rail, g.length / 2).x);
  const logo = g.at(0, g.length * 0.5);
  const logoScale = g.depth(g.length * 0.5);
  return (
    <svg className="table3d-svg" width={g.w} height={g.h} viewBox={`0 0 ${g.w} ${g.h}`} aria-hidden="true">
      <defs>
        <linearGradient id="t-rail" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4b2f22" />
          <stop offset="0.55" stopColor="#2a1812" />
          <stop offset="1" stopColor="#140b07" />
        </linearGradient>
        <linearGradient id="t-trim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff1a8" />
          <stop offset="0.35" stopColor="#e9b53c" />
          <stop offset="0.7" stopColor="#a86c10" />
          <stop offset="1" stopColor="#f5cf62" />
        </linearGradient>
        <radialGradient id="t-felt" cx={logo.x} cy={logo.y} r={Math.max(g.feltRx, g.feltRy) * 1.15} gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: 'var(--felt-a)' }} />
          <stop offset="0.7" style={{ stopColor: 'var(--felt-b)' }} />
          <stop offset="1" style={{ stopColor: 'var(--felt-c)' }} />
        </radialGradient>
        <radialGradient id="t-spot" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <filter id="t-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
        <clipPath id="t-felt-clip">
          <path d={g.feltPath} />
        </clipPath>
        {noise && (
          <pattern id="t-noise" width="96" height="96" patternUnits="userSpaceOnUse">
            <image href={noise} width="96" height="96" />
          </pattern>
        )}
      </defs>
      {/* Ombre de la table sur le sol */}
      <path d={g.outer} fill="rgba(0,0,0,.7)" transform="translate(0 14)" filter="url(#t-shadow)" />
      {/* Bourrelet de cuir capitonné */}
      <path d={g.outer} fill="url(#t-rail)" />
      <path d={g.railMid} fill="none" stroke="rgba(255,236,200,.1)" strokeWidth={railPx * 0.55} />
      <path d={g.railMid} fill="none" stroke="rgba(255,214,150,.38)" strokeWidth="1.2" strokeDasharray="2.5 5" />
      <path d={g.outer} fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="1.2" />
      {/* Tapis de feutre éclairé par la lampe */}
      <path d={g.feltPath} fill="url(#t-felt)" />
      <g clipPath="url(#t-felt-clip)">
        {noise && <rect width={g.w} height={g.h} fill="url(#t-noise)" />}
        <ellipse cx={logo.x} cy={logo.y} rx={g.feltRx * 0.95} ry={g.feltRy * 0.7} fill="url(#t-spot)" />
        <path d={g.feltPath} fill="none" stroke="rgba(0,0,0,.45)" strokeWidth={railPx * 1.1} />
        <path d={g.line} fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="1.5" />
        <g transform={`translate(${logo.x} ${logo.y}) scale(${logoScale} ${logoScale * 0.8})`} className="felt-logo">
          <text textAnchor="middle" y="-2" fontSize="34">
            RONDA
          </text>
          <text textAnchor="middle" y="20" fontSize="13" letterSpacing="6">
            DYALNA
          </text>
        </g>
      </g>
      {/* Liseré doré entre le cuir et le feutre */}
      <path d={g.feltPath} fill="none" stroke="url(#t-trim)" strokeWidth="3.2" />
      <path d={g.feltPath} fill="none" stroke="rgba(0,0,0,.35)" strokeWidth="1" transform="translate(0 1.5)" />
    </svg>
  );
});

/** Mesure sa zone et fournit la géométrie de la table à ses enfants (places, cartes, tas). */
export function TableScene({
  margins,
  children,
}: {
  margins: { top: number; bottom: number; side: number };
  children: (g: TableGeometry) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const { top, bottom, side } = margins;
  const g = useMemo(
    () => (size.w > 0 && size.h > 0 ? tableGeometry(size.w, size.h, { top, bottom, side }) : null),
    [size.w, size.h, top, bottom, side],
  );
  return (
    <div ref={ref} className="arena">
      {g && (
        <>
          <TableSurface g={g} />
          {children(g)}
        </>
      )}
    </div>
  );
}
