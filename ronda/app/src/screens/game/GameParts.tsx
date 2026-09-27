import { AnimatePresence, motion } from 'motion/react';
import { Bot, WifiOff } from 'lucide-react';
import { useEffect, useState, type CSSProperties } from 'react';
import { rankIndex, teamOf, type Card, type GameEvent, type Seat, type Team } from '@ronda/core';
import { FramedAvatar } from '../../components/Avatar';
import { useT } from '../../i18n';
import type { Bubble, GameDisplay, SeatDisplay } from '../../game/types';
import { PlayingCard } from './PlayingCard';

export type SeatPos = 'bottom' | 'right' | 'top' | 'left';

export function seatPosition(seat: Seat, me: Seat, players: number): SeatPos {
  const rel = (seat - me + players) % players;
  if (players === 2) return rel === 0 ? 'bottom' : 'top';
  return (['bottom', 'right', 'top', 'left'] as const)[rel];
}

/** Décalage de départ d'une carte jouée depuis une place (animation d'arrivée sur le tapis). */
export function entryFrom(pos: SeatPos) {
  switch (pos) {
    case 'top':
      return { y: -230, x: 0, rotate: 160, scale: 0.6, opacity: 0.4 };
    case 'left':
      return { x: -210, y: -20, rotate: -110, scale: 0.6, opacity: 0.4 };
    case 'right':
      return { x: 210, y: -20, rotate: 110, scale: 0.6, opacity: 0.4 };
    default:
      return { y: 260, x: 0, rotate: 0, scale: 0.8, opacity: 0.4 };
  }
}

/** Anneau de compte à rebours autour de l'avatar du joueur actif (vert, puis orange, puis rouge). */
export function TimerRing({ deadline, total, size }: { deadline: number | null; total: number; size: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadline) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [deadline]);
  if (!deadline || total <= 0) return null;
  const remaining = Math.max(0, deadline - now);
  const ratio = Math.min(1, remaining / total);
  const box = size + 14;
  const r = size / 2 + 3;
  const c = 2 * Math.PI * r;
  const color = ratio > 0.5 ? '#48e27a' : ratio > 0.25 ? '#ffc53d' : '#ff4d4d';
  return (
    <svg className="seat-ring" viewBox={`0 0 ${box} ${box}`} width={box} height={box}>
      <circle cx={box / 2} cy={box / 2} r={r} stroke="rgba(0,0,0,.45)" />
      <circle
        cx={box / 2}
        cy={box / 2}
        r={r}
        stroke={color}
        strokeDasharray={c}
        strokeDashoffset={c * (1 - ratio)}
        strokeLinecap="round"
        transform={`rotate(-90 ${box / 2} ${box / 2})`}
        style={{ transition: 'stroke-dashoffset .2s linear, stroke .3s', filter: `drop-shadow(0 0 4px ${color})` }}
      />
    </svg>
  );
}

export function SpeechBubble({ bubble, pos }: { bubble: Bubble | undefined; pos: SeatPos }) {
  return (
    <AnimatePresence>
      {bubble && (
        <motion.div
          key={bubble.id}
          className={`bubble pos-${pos} ${bubble.announce ? 'announce' : ''}`}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 500, damping: 26 }}
        >
          {bubble.text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface SeatProps {
  info: SeatDisplay;
  pos: SeatPos;
  active: boolean;
  deadline: number | null;
  turnMs: number;
  count: number;
  back: string;
  bubble: Bubble | undefined;
  dealing: boolean;
  dealer: boolean;
  style?: CSSProperties;
}

/**
 * Place d'un autre joueur, posée sur le bourrelet de la table : avatar cerclé d'or, plaque avec le
 * nom, bouton « donneur » et cartes cachées devant lui, côté tapis.
 */
export function SeatView({ info, pos, active, deadline, turnMs, count, back, bubble, dealing, dealer, style }: SeatProps) {
  const t = useT();
  const side = pos === 'left' || pos === 'right';
  const avatarSize = side ? 46 : 52;
  const cw = side ? 22 : 24;
  const backs = Array.from({ length: count }, (_, i) => i);
  const from = pos === 'left' ? { x: 90, y: 0 } : pos === 'right' ? { x: -90, y: 0 } : { x: 0, y: 90 };
  return (
    <div className={`pseat pos-${pos} ${active ? 'active' : ''}`} style={style}>
      <div className="pseat-avatar">
        <FramedAvatar index={info.avatar} size={avatarSize} frame={info.frame} />
        {active && <TimerRing deadline={deadline} total={turnMs} size={avatarSize} />}
        {dealer && (
          <span className="dealer-puck" title={t('game.dealer')}>
            D
          </span>
        )}
        {!info.connected && (
          <span className="offline-dot">
            <WifiOff size={11} />
          </span>
        )}
        <SpeechBubble bubble={bubble} pos={pos} />
      </div>
      <div className="pseat-plate">
        <span className="pseat-name">{info.name}</span>
        <span className="pseat-sub">
          <span className="level-badge">{info.level}</span>
          {info.bot && (
            <span className="bot-tag">
              <Bot size={10} /> {t('common.bot')}
            </span>
          )}
          {info.auto && !info.bot && <span className="bot-tag auto-tag">AUTO</span>}
        </span>
      </div>
      <div className={`opp-hand ${side ? 'vertical' : ''}`}>
        {backs.map((i) => (
          <PlayingCard
            key={i}
            faceUp={false}
            back={back}
            width={cw}
            shared={false}
            initial={dealing ? { opacity: 0, scale: 0.4, ...from } : false}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0, rotate: side ? 90 : (i - (count - 1) / 2) * 7 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30, delay: dealing ? i * 0.06 : 0 }}
          />
        ))}
      </div>
    </div>
  );
}

/** Cartes qui volent vers un tas pendant une prise. */
export function flyingToTeam(event: GameEvent | null, team: Team): Card[] {
  if (!event) return [];
  if (event.type === 'capture' && !event.pending && teamOf(event.seat) === team) return event.cards;
  if (event.type === 'collect' && teamOf(event.seat) === team) return event.cards;
  if (event.type === 'sweep' && teamOf(event.seat) === team) return event.cards;
  return [];
}

/** Épaisseur d'une pile vue en 3D : quelques cartes décalées d'un pixel. */
function Thickness({ count, back, width }: { count: number; back: string; width: number }) {
  const layers = Math.min(5, Math.ceil(count / 5));
  return (
    <>
      {Array.from({ length: layers }, (_, i) => (
        <PlayingCard
          key={i}
          faceUp={false}
          back={back}
          width={width}
          shared={false}
          initial={false}
          style={{ top: -i * 1.6, left: i * 0.6 }}
        />
      ))}
    </>
  );
}

export function PileStack({
  count,
  team,
  cls,
  back,
  label,
  flying,
  width,
  style,
}: {
  count: number;
  team: Team;
  cls: 'us' | 'them';
  back: string;
  label: string;
  flying: Card[];
  width: number;
  style?: CSSProperties;
}) {
  return (
    <div className="felt-item" style={style} data-team={team}>
      <div className={`stack ${cls}`} style={{ width, height: width * 1.5556 }}>
        {count > 0 ? <Thickness count={count} back={back} width={width} /> : <div className="stack-slot" />}
        {flying.map((c, i) => (
          <PlayingCard key={c} card={c} width={width} style={{ position: 'absolute', top: -i * 1.5, left: i * 1.5 }} />
        ))}
        {count > 0 && <span className="stack-count">{count}</span>}
      </div>
      <span className="stack-label">{label}</span>
    </div>
  );
}

export function DeckStack({
  count,
  back,
  label,
  width,
  style,
}: {
  count: number;
  back: string;
  label: string;
  width: number;
  style?: CSSProperties;
}) {
  return (
    <div className="felt-item" style={style}>
      <div className="stack deck" style={{ width, height: width * 1.5556 }}>
        {count > 0 ? <Thickness count={count} back={back} width={width} /> : <div className="stack-slot" />}
        <span className="stack-count">{count}</span>
      </div>
      <span className="stack-label">{label}</span>
    </div>
  );
}

/** Cartes du tapis, rangées par valeur (une suite se lit de gauche à droite). */
export function TableCards({
  d,
  width,
  targets,
  entry,
  style,
}: {
  d: GameDisplay;
  width: number;
  targets: Set<Card>;
  entry: (card: Card) => ReturnType<typeof entryFrom> | false;
  style?: CSSProperties;
}) {
  const cards = d.view.table;
  return (
    <div className="table-cards" style={style}>
      {cards.map((c, i) => {
        const duo = i > 0 && rankIndex(cards[i - 1]) === rankIndex(c);
        return (
          <PlayingCard
            key={c}
            card={c}
            width={width}
            className={`on-felt ${targets.has(c) ? 'target' : ''} ${duo ? 'duo' : ''}`}
            initial={entry(c)}
            flipIn={entry(c) ? 0.05 : false}
            back={d.cardBack}
          />
        );
      })}
    </div>
  );
}
