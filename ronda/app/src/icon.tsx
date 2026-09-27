import { createRoot } from 'react-dom/client';
import '@fontsource-variable/el-messiri/wght.css';
import '@fontsource-variable/cairo/wght.css';
import '@fontsource/aref-ruqaa/arabic-700.css';
import '@fontsource/lilita-one/400.css';
import './styles/global.css';
import { parseCard } from '@ronda/core';
import { CardDefs, starPoints } from './cards/CardDefs';
import { CardFace } from './cards/CardFace';

/**
 * Compositions graphiques rendues dans Chromium pour produire les icônes et visuels des stores
 * (voir scripts/icons.mjs) : ?art=icon|maskable|splash|og|feature.
 */
const art = new URLSearchParams(location.search).get('art') ?? 'icon';

const BG = 'radial-gradient(circle at 50% 38%, #6a3fe0 0%, #2a1670 46%, #0b0620 100%)';

function Pattern({ size }: { size: number }) {
  return <div style={{ position: 'absolute', inset: 0, backgroundImage: 'var(--wallpaper)', backgroundSize: `${size}px ${size}px`, opacity: 1 }} />;
}

/** Gros jeton de casino doré (liseré rayé, anneau intérieur, étoile au centre). */
function Star({ size, x, y }: { size: number; x: number; y: number }) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, filter: `drop-shadow(0 ${size * 0.03}px ${size * 0.04}px rgba(0,0,0,.55))` }}>
      <circle cx="100" cy="104" r="96" fill="#7a4a00" />
      <circle cx="100" cy="100" r="96" fill="url(#g-gold)" />
      <circle cx="100" cy="100" r="84" fill="none" stroke="#fffbe0" strokeWidth="22" strokeDasharray="24 29" opacity="0.95" />
      <circle cx="100" cy="100" r="66" fill="#d1241a" stroke="#7a4a00" strokeWidth="4" />
      <circle cx="100" cy="100" r="58" fill="none" stroke="#ffd54a" strokeWidth="3" strokeDasharray="6 7" />
      <polygon points={starPoints(100, 100, 40, 24)} fill="url(#g-gold)" stroke="#7a4a00" strokeWidth="2" />
      <ellipse cx="72" cy="58" rx="34" ry="16" fill="#fff" opacity="0.28" />
    </svg>
  );
}

function Fan({ width, x, y }: { width: number; x: number; y: number }) {
  const h = width * 1.5556;
  const cards: [string, number, number][] = [
    ['1o', -16, -0.42],
    ['12c', 14, 0.42],
  ];
  return (
    <>
      {cards.map(([code, rot, dx]) => (
        <div
          key={code}
          style={{
            position: 'absolute',
            width,
            height: h,
            left: x - width / 2 + dx * width,
            top: y - h / 2,
            transform: `rotate(${rot}deg)`,
            transformOrigin: '50% 100%',
            filter: `drop-shadow(0 ${width * 0.06}px ${width * 0.08}px rgba(0,0,0,.55))`,
          }}
        >
          <CardFace card={parseCard(code)} />
        </div>
      ))}
    </>
  );
}

function Square({ size, scale }: { size: number; scale: number }) {
  const c = size / 2;
  return (
    <div style={{ position: 'relative', width: size, height: size, background: BG, overflow: 'hidden' }}>
      <Pattern size={size / 9} />
      <Star size={size * 0.86 * scale} x={c} y={c - size * 0.06 * scale} />
      <Fan width={size * 0.3 * scale} x={c} y={c + size * 0.1 * scale} />
    </div>
  );
}

function Wordmark({ scale = 1 }: { scale?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div
        style={{
          fontFamily: "'Lilita One', sans-serif",
          fontSize: 170 * scale,
          lineHeight: 0.95,
          background: 'linear-gradient(180deg,#fffbe0 0%,#ffe680 30%,#ffc21c 55%,#e08a00 75%,#ffd54a 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          WebkitTextStroke: `${5 * scale}px #6a3500`,
          paintOrder: 'stroke fill',
          filter: `drop-shadow(0 ${7 * scale}px 0 #8a4a00) drop-shadow(0 ${14 * scale}px 0 #4a2100) drop-shadow(0 ${24 * scale}px ${30 * scale}px rgba(0,0,0,.6))`,
        }}
      >
        RONDA
      </div>
      <div
        style={{
          marginTop: 6 * scale,
          padding: `${4 * scale}px ${56 * scale}px ${8 * scale}px`,
          fontFamily: "'Lilita One', sans-serif",
          fontSize: 42 * scale,
          letterSpacing: '0.4em',
          paddingLeft: `calc(${56 * scale}px + 0.4em)`,
          color: '#fff',
          background: 'linear-gradient(180deg,#ff6b5e,#d1241a 60%,#a3160e)',
          clipPath: `polygon(0 0,100% 0,calc(100% - ${22 * scale}px) 50%,100% 100%,0 100%,${22 * scale}px 50%)`,
        }}
      >
        DYALNA
      </div>
      <div style={{ fontFamily: 'var(--font-callig)', fontSize: 64 * scale, color: '#ffd54a', marginTop: 10 * scale }}>روندا</div>
    </div>
  );
}

function Splash() {
  const size = 2732;
  return (
    <div style={{ position: 'relative', width: size, height: size, background: '#140b38', overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <div style={{ position: 'relative', width: 520, height: 520 }}>
          <Star size={520} x={260} y={260} />
        </div>
        <Wordmark scale={1.3} />
      </div>
    </div>
  );
}

function OgImage() {
  return (
    <div style={{ position: 'relative', width: 1200, height: 630, background: BG, overflow: 'hidden' }}>
      <Pattern size={90} />
      <div style={{ position: 'absolute', left: 70, top: 60, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Wordmark scale={0.95} />
        <div style={{ fontFamily: 'var(--font-ui)', color: '#fff8e6', fontSize: 40, fontWeight: 800, textAlign: 'center' }}>
          Le jeu de cartes marocain en ligne
        </div>
        <div style={{ fontFamily: 'var(--font-ui)', color: '#ffd54a', fontSize: 30, fontWeight: 800, textAlign: 'center' }}>
          1v1 · 2v2 · entre amis · hors ligne
        </div>
      </div>
      <Star size={380} x={930} y={300} />
      <Fan width={190} x={930} y={380} />
    </div>
  );
}

function App() {
  return (
    <>
      <CardDefs />
      {art === 'icon' && <Square size={1024} scale={1} />}
      {art === 'maskable' && <Square size={1024} scale={0.72} />}
      {art === 'splash' && <Splash />}
      {art === 'og' && <OgImage />}
    </>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
