import { memo } from 'react';

type Head = 'fez' | 'hood' | 'hijab' | 'turban' | 'cap' | 'hair' | 'curly' | 'bun' | 'long';

interface AvatarSpec {
  bg: string;
  skin: number;
  head: Head;
  color: string;
  cloth: string;
  beard?: boolean;
  mustache?: boolean;
  glasses?: boolean;
}

const SKINS = ['#f3cfae', '#e3b07c', '#c68642', '#8d5524'];

/** 16 avatars dessinés en SVG : tarbouche, capuche de djellaba, foulard, turban… */
export const AVATARS: AvatarSpec[] = [
  { bg: '#1f8a66', skin: 1, head: 'fez', color: '#c0392b', cloth: '#f3e7c9', mustache: true },
  { bg: '#c0392b', skin: 0, head: 'hijab', color: '#7d1a12', cloth: '#7d1a12' },
  { bg: '#2436b8', skin: 2, head: 'hood', color: '#8a5a2b', cloth: '#8a5a2b', beard: true },
  { bg: '#e8b84a', skin: 1, head: 'cap', color: '#2436b8', cloth: '#1d4f91' },
  { bg: '#8e44ad', skin: 2, head: 'hijab', color: '#1f8a66', cloth: '#1f8a66' },
  { bg: '#0e7490', skin: 3, head: 'turban', color: '#f6f0e1', cloth: '#f6f0e1', beard: true },
  { bg: '#d35400', skin: 0, head: 'hair', color: '#2b1a0b', cloth: '#2c3e50', glasses: true },
  { bg: '#16a085', skin: 3, head: 'curly', color: '#1d140a', cloth: '#e8b84a' },
  { bg: '#7d1a12', skin: 2, head: 'fez', color: '#c0392b', cloth: '#f6f0e1', beard: true },
  { bg: '#5b9bd5', skin: 1, head: 'hijab', color: '#2436b8', cloth: '#2436b8', glasses: true },
  { bg: '#4a5d23', skin: 0, head: 'hood', color: '#f3e7c9', cloth: '#f3e7c9' },
  { bg: '#b83280', skin: 1, head: 'bun', color: '#3b2314', cloth: '#f2c75c' },
  { bg: '#2c3e50', skin: 3, head: 'cap', color: '#c0392b', cloth: '#c0392b' },
  { bg: '#9a6a0f', skin: 2, head: 'turban', color: '#1d4f91', cloth: '#1d4f91' },
  { bg: '#3b4fd8', skin: 2, head: 'long', color: '#2b1a0b', cloth: '#c0392b' },
  { bg: '#27ae60', skin: 1, head: 'hair', color: '#3b2314', cloth: '#f6f0e1', mustache: true },
];

function Headwear({ head, color }: { head: Head; color: string }) {
  switch (head) {
    case 'fez':
      return (
        <g>
          <path d="M33 31 L37 11 Q50 6 63 11 L67 31 Z" fill={color} stroke="rgba(0,0,0,.25)" strokeWidth="1.5" />
          <ellipse cx="50" cy="11" rx="13" ry="3.5" fill="#8e2419" />
          <path d="M50 10 C57 13 61 20 62 29" fill="none" stroke="#1d140a" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M60 28 L62 35 L65 28 Z" fill="#1d140a" />
        </g>
      );
    case 'hood':
      return (
        <path
          d="M50 4 C31 14 24 38 25 62 L32 70 C30 52 33 30 50 26 C67 30 70 52 68 70 L75 62 C76 38 69 14 50 4 Z"
          fill={color}
          stroke="rgba(0,0,0,.25)"
          strokeWidth="1.5"
        />
      );
    case 'turban':
      return (
        <g>
          <ellipse cx="50" cy="27" rx="25" ry="14" fill={color} stroke="rgba(0,0,0,.2)" strokeWidth="1.5" />
          <path d="M27 29 C38 22 62 22 73 29 M29 23 C40 17 60 17 71 23" fill="none" stroke="rgba(0,0,0,.18)" strokeWidth="2" />
        </g>
      );
    case 'cap':
      return (
        <g>
          <path d="M29 36 Q31 14 50 14 Q69 14 71 36 Z" fill={color} />
          <path d="M29 35 L83 38 Q74 44 30 40 Z" fill={color} stroke="rgba(0,0,0,.25)" strokeWidth="1.2" />
          <circle cx="50" cy="15" r="2.5" fill="rgba(255,255,255,.6)" />
        </g>
      );
    case 'hair':
      return <path d="M29 45 C26 24 39 15 52 16 C67 17 75 28 71 45 C67 34 59 29 50 29 C41 29 33 34 29 45 Z" fill={color} />;
    case 'curly':
      return (
        <g fill={color}>
          {[
            [34, 30],
            [42, 22],
            [52, 19],
            [62, 23],
            [68, 32],
            [30, 40],
            [70, 42],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="9" />
          ))}
        </g>
      );
    case 'bun':
      return (
        <g fill={color}>
          <circle cx="50" cy="13" r="9" />
          <path d="M29 45 C26 24 39 18 50 18 C61 18 74 24 71 45 C67 34 59 30 50 30 C41 30 33 34 29 45 Z" />
        </g>
      );
    case 'long':
      return (
        <path
          d="M28 70 C22 50 24 22 50 17 C76 22 78 50 72 70 L66 72 C68 56 67 36 50 30 C33 36 32 56 34 72 Z"
          fill={color}
        />
      );
    default:
      return null;
  }
}

export const Avatar = memo(function Avatar({ index, size = 48 }: { index: number; size?: number }) {
  const a = AVATARS[((index % AVATARS.length) + AVATARS.length) % AVATARS.length];
  const skin = SKINS[a.skin];
  const hijab = a.head === 'hijab';
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" style={{ borderRadius: '50%', overflow: 'hidden' }}>
      <g>
        <rect width="100" height="100" fill={a.bg} />
        <circle cx="50" cy="50" r="46" fill="rgba(255,255,255,.08)" />
        <path d="M12 102 C16 80 32 71 50 71 C68 71 84 80 88 102 Z" fill={a.cloth} />
        {a.head === 'long' && <Headwear head="long" color={a.color} />}
        {hijab && (
          <path d="M50 16 C29 16 22 36 24 58 C26 74 36 84 50 86 C64 84 74 74 76 58 C78 36 71 16 50 16 Z" fill={a.color} />
        )}
        {!hijab && <rect x="44" y="60" width="12" height="14" rx="4" fill={skin} />}
        <ellipse cx="50" cy={hijab ? 50 : 46} rx={hijab ? 16.5 : 20} ry={hijab ? 19 : 23} fill={skin} />
        {a.beard && (
          <path d="M30.5 48 C31 67 41 74 50 74 C59 74 69 67 69.5 48 C65 59 58 63 50 63 C42 63 35 59 30.5 48 Z" fill="#2b1a0b" />
        )}
        <ellipse cx="42.5" cy={hijab ? 49 : 45} rx="2.6" ry="3" fill="#2b1a0b" />
        <ellipse cx="57.5" cy={hijab ? 49 : 45} rx="2.6" ry="3" fill="#2b1a0b" />
        {a.glasses && (
          <g fill="none" stroke="#1d140a" strokeWidth="2">
            <circle cx="42.5" cy={hijab ? 49 : 45} r="6" />
            <circle cx="57.5" cy={hijab ? 49 : 45} r="6" />
            <path d={`M48.5 ${hijab ? 49 : 45} H51.5`} />
          </g>
        )}
        {a.mustache && <path d="M42 55.5 Q50 50.5 58 55.5 Q50 53.5 42 55.5 Z" fill="#2b1a0b" />}
        <path
          d={hijab ? 'M44 58 Q50 62.5 56 58' : 'M43.5 55.5 Q50 60.5 56.5 55.5'}
          fill="none"
          stroke={a.beard ? '#f3e7c9' : '#7a3b1d'}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {!hijab && a.head !== 'long' && <Headwear head={a.head} color={a.color} />}
      </g>
    </svg>
  );
});

const FRAME_STYLES: Record<string, { ring: string; glow?: string }> = {
  'frame-none': { ring: 'linear-gradient(150deg,#fff3b0 0%,#e7ad2c 35%,#8a5a00 65%,#ffd96b 100%)' },
  'frame-bronze': { ring: 'linear-gradient(135deg,#f0b27a,#a0522d,#e59866)' },
  'frame-argent': { ring: 'linear-gradient(135deg,#ffffff,#9aa5b1,#e5e8e8)' },
  'frame-or': { ring: 'linear-gradient(135deg,#fff0b8,#e8b84a,#b8861d,#fff0b8)', glow: '0 0 12px rgba(242,199,92,.7)' },
  'frame-vip': { ring: 'linear-gradient(135deg,#1d140a,#f2c75c,#1d140a,#f2c75c)', glow: '0 0 14px rgba(242,199,92,.8)' },
};

/** Avatar dans son cadre (bronze, argent, or, VIP). */
export function FramedAvatar({ index, size = 48, frame = 'frame-none' }: { index: number; size?: number; frame?: string }) {
  const f = FRAME_STYLES[frame] ?? FRAME_STYLES['frame-none'];
  // Anneau métallique épais, comme les portraits des tables de poker.
  const pad = Math.max(2.5, Math.round(size * 0.07 * 10) / 10);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        padding: pad,
        background: f.ring,
        boxShadow: `${f.glow ? `${f.glow}, ` : ''}0 2px 0 rgba(0,0,0,.35), 0 4px 7px rgba(0,0,0,.35)`,
        flex: 'none',
      }}
    >
      <div style={{ borderRadius: '50%', overflow: 'hidden', width: '100%', height: '100%', boxShadow: 'inset 0 0 0 1.5px rgba(0,0,0,.45)' }}>
        <Avatar index={index} size={size - pad * 2} />
      </div>
    </div>
  );
}
