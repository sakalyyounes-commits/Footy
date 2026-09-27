/**
 * Définitions SVG partagées (dégradés, motifs, symboles des couleurs), injectées une seule fois
 * dans la page : chaque carte y fait référence avec <use href="#…">, ce qui garde le DOM léger.
 */

const GOLD_STROKE = '#7a5310';

/** Points d'une étoile à 8 branches (khatam) centrée en (cx, cy). */
export function starPoints(cx: number, cy: number, outer: number, inner: number, branches = 8): string {
  const pts: string[] = [];
  for (let i = 0; i < branches * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / branches) * i - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
}

function Oros() {
  const dots = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    return <circle key={i} cx={50 + 39 * Math.cos(a)} cy={50 + 39 * Math.sin(a)} r={1.8} fill={GOLD_STROKE} />;
  });
  return (
    <symbol id="s-oros" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="45" fill="url(#g-gold)" stroke={GOLD_STROKE} strokeWidth="3" />
      {dots}
      <circle cx="50" cy="50" r="33" fill="url(#g-gold-in)" stroke={GOLD_STROKE} strokeWidth="2" />
      <polygon points={starPoints(50, 50, 27, 17)} fill="#c0392b" stroke={GOLD_STROKE} strokeWidth="1.6" strokeLinejoin="round" />
      <polygon points={starPoints(50, 50, 15, 9)} fill="url(#g-gold)" stroke={GOLD_STROKE} strokeWidth="1.2" />
      <circle cx="50" cy="50" r="4.5" fill="#1d4f91" />
    </symbol>
  );
}

function Copas() {
  return (
    <symbol id="s-copas" viewBox="0 0 100 100">
      <path d="M20 16 H80 C80 45 67 59 50 61 C33 59 20 45 20 16 Z" fill="url(#g-red)" stroke="#6e1a12" strokeWidth="3" strokeLinejoin="round" />
      <path d="M26 31 C40 35 60 35 74 31" fill="none" stroke="url(#g-gold)" strokeWidth="5" strokeLinecap="round" />
      <circle cx="50" cy="45" r="5" fill="url(#g-gold)" stroke={GOLD_STROKE} strokeWidth="1.5" />
      <rect x="14" y="8" width="72" height="11" rx="5" fill="url(#g-gold)" stroke={GOLD_STROKE} strokeWidth="2.5" />
      <path d="M43 60 H57 L55 78 H45 Z" fill="url(#g-gold)" stroke={GOLD_STROKE} strokeWidth="2.5" strokeLinejoin="round" />
      <ellipse cx="50" cy="69" rx="8" ry="4.5" fill="url(#g-gold)" stroke={GOLD_STROKE} strokeWidth="2" />
      <path d="M27 93 C30 83 41 78 50 78 C59 78 70 83 73 93 Z" fill="url(#g-gold)" stroke={GOLD_STROKE} strokeWidth="2.5" strokeLinejoin="round" />
    </symbol>
  );
}

function Espadas() {
  return (
    <symbol id="s-espadas" viewBox="0 0 100 100">
      <path d="M50 2 L58.5 14 V64 H41.5 V14 Z" fill="url(#g-steel)" stroke="#16264a" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M50 9 V62" stroke="#eaf2ff" strokeWidth="2.2" opacity="0.85" />
      <path
        d="M20 67 C27 61 37 63 50 63 C63 63 73 61 80 67 C74 73 64 72 50 72 C36 72 26 73 20 67 Z"
        fill="url(#g-gold)"
        stroke={GOLD_STROKE}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="19" cy="67" r="4.5" fill="url(#g-gold)" stroke={GOLD_STROKE} strokeWidth="2" />
      <circle cx="81" cy="67" r="4.5" fill="url(#g-gold)" stroke={GOLD_STROKE} strokeWidth="2" />
      <rect x="43.5" y="72" width="13" height="16" rx="3" fill="#2c5aa0" stroke="#16264a" strokeWidth="2" />
      <path d="M44 77 H56 M44 82 H56" stroke="#9fc0ff" strokeWidth="1.4" />
      <circle cx="50" cy="92" r="6.5" fill="url(#g-gold)" stroke={GOLD_STROKE} strokeWidth="2.5" />
    </symbol>
  );
}

function Bastos() {
  return (
    <symbol id="s-bastos" viewBox="0 0 100 100">
      <path d="M63 29 C74 21 82 26 88 17 C78 14 69 19 63 29 Z" fill="#3f9142" stroke="#1d4a20" strokeWidth="1.6" />
      <path d="M37 55 C25 50 18 55 12 46 C22 43 31 47 37 55 Z" fill="#3f9142" stroke="#1d4a20" strokeWidth="1.6" />
      <path
        d="M41 95 C39 72 35 42 31 18 C29.5 8 39 2 50 2 C61 2 70.5 8 69 18 C65 42 61 72 59 95 Z"
        fill="url(#g-wood)"
        stroke="#4a2a0c"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <ellipse cx="43" cy="24" rx="5" ry="3.4" fill="#5e3515" />
      <ellipse cx="58" cy="41" rx="4.6" ry="3.1" fill="#5e3515" />
      <ellipse cx="45" cy="60" rx="4.2" ry="2.9" fill="#5e3515" />
      <path d="M37 12 C42 8 50 7 56 8" stroke="#e0b27a" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.8" />
      <path d="M40 84 H60" stroke="#e3c27d" strokeWidth="4.5" strokeLinecap="round" />
    </symbol>
  );
}

/** Couronne (rey), cheval (caballo) et tarbouche (sota) pour les figures. */
function Emblems() {
  return (
    <>
      <symbol id="e-crown" viewBox="0 0 100 70">
        <path
          d="M10 58 L6 18 L28 38 L50 8 L72 38 L94 18 L90 58 Z"
          fill="url(#g-gold)"
          stroke={GOLD_STROKE}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <rect x="9" y="54" width="82" height="12" rx="3" fill="url(#g-gold)" stroke={GOLD_STROKE} strokeWidth="3" />
        <circle cx="6" cy="16" r="5" fill="#c0392b" stroke={GOLD_STROKE} strokeWidth="2" />
        <circle cx="50" cy="7" r="6" fill="#1d4f91" stroke={GOLD_STROKE} strokeWidth="2" />
        <circle cx="94" cy="16" r="5" fill="#c0392b" stroke={GOLD_STROKE} strokeWidth="2" />
        <circle cx="30" cy="60" r="3.2" fill="#c0392b" />
        <circle cx="50" cy="60" r="3.2" fill="#1d4f91" />
        <circle cx="70" cy="60" r="3.2" fill="#c0392b" />
      </symbol>
      <symbol id="e-horse" viewBox="0 0 100 100">
        <path
          d="M57 8 L50 2 L47 16 C35 20 24 32 17 46 C13 53 15 60 22 61 C28 62 33 57 40 56 C44 62 42 72 36 84 L33 96 H83 C87 76 86 54 80 38 C76 26 68 16 57 8 Z"
          fill="url(#g-horse)"
          stroke="#2b1a0b"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="M60 12 C72 22 80 36 82 56 C83 70 82 84 80 96" fill="none" stroke="#2b1a0b" strokeWidth="5" strokeLinecap="round" opacity="0.55" />
        <circle cx="41" cy="31" r="3.4" fill="#fdf6e3" stroke="#2b1a0b" strokeWidth="1.5" />
        <circle cx="21" cy="52" r="2" fill="#2b1a0b" />
        <path d="M30 46 C38 42 48 42 56 44" fill="none" stroke="#c0392b" strokeWidth="3" strokeLinecap="round" />
        <path d="M52 44 C55 54 52 66 46 74" fill="none" stroke="#c0392b" strokeWidth="3" strokeLinecap="round" />
      </symbol>
      <symbol id="e-fez" viewBox="0 0 100 80">
        <path d="M22 72 L30 14 C44 8 56 8 70 14 L78 72 Z" fill="url(#g-red)" stroke="#6e1a12" strokeWidth="3" strokeLinejoin="round" />
        <ellipse cx="50" cy="13" rx="20" ry="5" fill="#a52a1f" stroke="#6e1a12" strokeWidth="2" />
        <path d="M50 12 C58 16 64 28 66 44" fill="none" stroke="#1d140a" strokeWidth="3" strokeLinecap="round" />
        <path d="M63 42 L66 54 L70 42 Z" fill="#1d140a" />
        <rect x="21" y="62" width="58" height="10" rx="2" fill="url(#g-gold)" stroke={GOLD_STROKE} strokeWidth="2" />
      </symbol>
    </>
  );
}

/** Motifs des dos de cartes (tous originaux, inspirés des arts marocains). */
function BackPatterns() {
  return (
    <>
      {/* Zellige vert : étoiles à 8 branches blanches et bleues. */}
      <pattern id="p-back-zellige" width="36" height="36" patternUnits="userSpaceOnUse">
        <rect width="36" height="36" fill="#0b5d45" />
        <polygon points={starPoints(18, 18, 15, 10.5)} fill="#f6f0e1" />
        <polygon points={starPoints(18, 18, 10, 6.5)} fill="#1d4f91" />
        <circle cx="18" cy="18" r="2.6" fill="#e8b84a" />
        <path d="M0 0 L5 0 L0 5 Z M36 0 L31 0 L36 5 Z M0 36 L5 36 L0 31 Z M36 36 L31 36 L36 31 Z" fill="#e8b84a" />
      </pattern>
      {/* Majorelle : bleu profond et jaune citron. */}
      <pattern id="p-back-majorelle" width="30" height="30" patternUnits="userSpaceOnUse">
        <rect width="30" height="30" fill="#2436b8" />
        <polygon points={starPoints(15, 15, 12, 5, 4)} fill="#f4d03f" />
        <circle cx="15" cy="15" r="2.4" fill="#2436b8" />
        <circle cx="0" cy="0" r="3" fill="#8fa4ff" />
        <circle cx="30" cy="0" r="3" fill="#8fa4ff" />
        <circle cx="0" cy="30" r="3" fill="#8fa4ff" />
        <circle cx="30" cy="30" r="3" fill="#8fa4ff" />
      </pattern>
      {/* Tapis berbère : losanges rouges, noirs et crème. */}
      <pattern id="p-back-berbere" width="32" height="40" patternUnits="userSpaceOnUse">
        <rect width="32" height="40" fill="#9b2318" />
        <path d="M16 2 L30 20 L16 38 L2 20 Z" fill="#f3e3c3" />
        <path d="M16 9 L25 20 L16 31 L7 20 Z" fill="#1d140a" />
        <path d="M16 15 L20 20 L16 25 L12 20 Z" fill="#e8b84a" />
        <path d="M0 0 L4 0 L0 5 Z M32 0 L28 0 L32 5 Z M0 40 L4 40 L0 35 Z M32 40 L28 40 L32 35 Z" fill="#1d140a" />
      </pattern>
      {/* Chefchaouen : bleu ciel et blanc chaulé. */}
      <pattern id="p-back-chaouen" width="28" height="28" patternUnits="userSpaceOnUse">
        <rect width="28" height="28" fill="#5b9bd5" />
        <path d="M14 0 C14 8 20 14 28 14 C20 14 14 20 14 28 C14 20 8 14 0 14 C8 14 14 8 14 0 Z" fill="#eef6ff" />
        <circle cx="14" cy="14" r="3" fill="#2f6db3" />
      </pattern>
      {/* Royal : rouge et or. */}
      <pattern id="p-back-royal" width="34" height="34" patternUnits="userSpaceOnUse">
        <rect width="34" height="34" fill="#7d1a12" />
        <polygon points={starPoints(17, 17, 14, 9)} fill="none" stroke="#e8b84a" strokeWidth="1.6" />
        <polygon points={starPoints(17, 17, 6, 3)} fill="#e8b84a" />
        <circle cx="0" cy="0" r="2.5" fill="#e8b84a" />
        <circle cx="34" cy="34" r="2.5" fill="#e8b84a" />
        <circle cx="34" cy="0" r="2.5" fill="#e8b84a" />
        <circle cx="0" cy="34" r="2.5" fill="#e8b84a" />
      </pattern>
      {/* Or : feuille d'or martelée. */}
      <pattern id="p-back-or" width="26" height="26" patternUnits="userSpaceOnUse">
        <rect width="26" height="26" fill="#c8962f" />
        <polygon points={starPoints(13, 13, 11, 7)} fill="#f7dc94" />
        <polygon points={starPoints(13, 13, 5, 3)} fill="#a8791e" />
      </pattern>
      {/* VIP : noir et or. */}
      <pattern id="p-back-vip" width="30" height="30" patternUnits="userSpaceOnUse">
        <rect width="30" height="30" fill="#141414" />
        <polygon points={starPoints(15, 15, 13, 8)} fill="none" stroke="#e8b84a" strokeWidth="1.3" />
        <polygon points={starPoints(15, 15, 4, 2)} fill="#f7dc94" />
      </pattern>
    </>
  );
}

export function CardDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="g-card" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#fffbf1" />
          <stop offset="1" stopColor="#f4e6c8" />
        </linearGradient>
        <linearGradient id="g-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff0b8" />
          <stop offset="0.45" stopColor="#ebbb4c" />
          <stop offset="1" stopColor="#b17f16" />
        </linearGradient>
        <radialGradient id="g-gold-in" cx="0.45" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#fff3c4" />
          <stop offset="1" stopColor="#dca33a" />
        </radialGradient>
        <linearGradient id="g-red" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ea6254" />
          <stop offset="0.5" stopColor="#bf2f22" />
          <stop offset="1" stopColor="#7d1a12" />
        </linearGradient>
        <linearGradient id="g-steel" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1f3f82" />
          <stop offset="0.5" stopColor="#7fb0ff" />
          <stop offset="1" stopColor="#1f3f82" />
        </linearGradient>
        <linearGradient id="g-wood" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6b3d16" />
          <stop offset="0.45" stopColor="#c08445" />
          <stop offset="1" stopColor="#5e3515" />
        </linearGradient>
        <linearGradient id="g-horse" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f3e3c3" />
          <stop offset="1" stopColor="#c9a877" />
        </linearGradient>
        <linearGradient id="g-arch-10" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1f8a66" />
          <stop offset="1" stopColor="#0b4d39" />
        </linearGradient>
        <linearGradient id="g-arch-11" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3657c9" />
          <stop offset="1" stopColor="#1b2f7a" />
        </linearGradient>
        <linearGradient id="g-arch-12" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c23a2b" />
          <stop offset="1" stopColor="#6e1a12" />
        </linearGradient>
        <pattern id="p-arch" width="12" height="12" patternUnits="userSpaceOnUse">
          <polygon points={starPoints(6, 6, 5, 3)} fill="rgba(255,255,255,0.12)" />
        </pattern>
        <Oros />
        <Copas />
        <Espadas />
        <Bastos />
        <Emblems />
        <BackPatterns />
      </defs>
    </svg>
  );
}
