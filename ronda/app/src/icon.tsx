import { createRoot } from 'react-dom/client';
import '@fontsource-variable/el-messiri/wght.css';
import '@fontsource/aref-ruqaa/arabic-700.css';
import './styles/global.css';
import { parseCard } from '@ronda/core';
import { CardDefs, starPoints } from './cards/CardDefs';
import { CardFace } from './cards/CardFace';

/**
 * Compositions graphiques rendues dans Chromium pour produire les icônes et visuels des stores
 * (voir scripts/icons.mjs) : ?art=icon|maskable|splash|og|feature.
 */
const art = new URLSearchParams(location.search).get('art') ?? 'icon';

const BG = 'radial-gradient(circle at 50% 42%, #1b9168 0%, #0b4a37 45%, #041f18 100%)';

function Pattern({ size }: { size: number }) {
  return <div style={{ position: 'absolute', inset: 0, backgroundImage: 'var(--zellige)', backgroundSize: `${size}px ${size}px`, opacity: 0.9 }} />;
}

function Star({ size, x, y }: { size: number; x: number; y: number }) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} style={{ position: 'absolute', left: x - size / 2, top: y - size / 2 }}>
      <polygon points={starPoints(100, 100, 98, 72)} fill="url(#g-gold)" stroke="#7a5310" strokeWidth="2.5" />
      <polygon points={starPoints(100, 100, 76, 56)} fill="#0a3d2f" stroke="#f2c75c" strokeWidth="2" />
      <polygon points={starPoints(100, 100, 46, 32)} fill="#c0392b" stroke="#f2c75c" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="12" fill="url(#g-gold)" />
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
          fontFamily: 'var(--font-callig)',
          fontSize: 190 * scale,
          lineHeight: 1.1,
          fontWeight: 700,
          background: 'linear-gradient(180deg,#fff6d0,#f2c75c 50%,#b8861d)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          filter: 'drop-shadow(0 6px 0 rgba(0,0,0,.35))',
        }}
      >
        روندا
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 44 * scale,
          letterSpacing: '0.42em',
          color: '#fdf6e3',
          marginTop: -10 * scale,
          paddingLeft: '0.42em',
        }}
      >
        RONDA DYALNA
      </div>
    </div>
  );
}

function Splash() {
  const size = 2732;
  return (
    <div style={{ position: 'relative', width: size, height: size, background: '#062b21', overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
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
        <div style={{ fontFamily: 'var(--font-display)', color: '#fdf6e3', fontSize: 40, fontWeight: 700, textAlign: 'center' }}>
          Le jeu de cartes marocain en ligne
        </div>
        <div style={{ fontFamily: 'var(--font-ui)', color: '#f2c75c', fontSize: 30, fontWeight: 800, textAlign: 'center' }}>
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
