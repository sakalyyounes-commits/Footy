import { AnimatePresence, motion } from 'motion/react';
import { Bot, Layers, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
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

/** Anneau de compte à rebours autour de l'avatar du joueur actif. */
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
  const r = size / 2 + 1;
  const c = 2 * Math.PI * r;
  const color = ratio > 0.5 ? '#f2c75c' : ratio > 0.25 ? '#ff9f43' : '#ff5e4d';
  return (
    <svg className="seat-ring" viewBox={`0 0 ${size + 10} ${size + 10}`} width={size + 10} height={size + 10}>
      <circle cx={(size + 10) / 2} cy={(size + 10) / 2} r={r} stroke="rgba(0,0,0,.35)" />
      <circle
        cx={(size + 10) / 2}
        cy={(size + 10) / 2}
        r={r}
        stroke={color}
        strokeDasharray={c}
        strokeDashoffset={c * (1 - ratio)}
        strokeLinecap="round"
        transform={`rotate(-90 ${(size + 10) / 2} ${(size + 10) / 2})`}
        style={{ transition: 'stroke-dashoffset .2s linear, stroke .3s' }}
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
}

/** Place d'un autre joueur : avatar, nom, niveau et cartes cachées. */
export function SeatView({ info, pos, active, deadline, turnMs, count, back, bubble, dealing, dealer }: SeatProps) {
  const t = useT();
  const side = pos === 'left' || pos === 'right';
  const avatarSize = side ? 42 : 50;
  const cw = side ? 28 : 34;
  const backs = Array.from({ length: count }, (_, i) => i);
  return (
    <div className={`seat ${side ? 'side' : 'top'} ${active ? 'active' : ''}`}>
      <div className="seat-avatar">
        <FramedAvatar index={info.avatar} size={avatarSize} frame={info.frame} />
        {active && <TimerRing deadline={deadline} total={turnMs} size={avatarSize} />}
        {!info.connected && (
          <span style={{ position: 'absolute', bottom: -4, right: -4, background: '#c0392b', borderRadius: 8, padding: 2 }}>
            <WifiOff size={12} />
          </span>
        )}
        <SpeechBubble bubble={bubble} pos={pos} />
      </div>
      <div className="seat-meta">
        <span className="seat-name">
          {dealer && <Layers size={11} color="var(--gold-2)" style={{ display: 'inline', marginInlineEnd: 3, verticalAlign: '-1px' }} />}
          {info.name}
        </span>
        <span className="seat-sub">
          <span className="level-badge">{info.level}</span>
          {info.bot && (
            <span className="bot-tag">
              <Bot size={11} /> {t('common.bot')}
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
            initial={dealing ? { opacity: 0, scale: 0.4, y: side ? 0 : 120, x: side ? (pos === 'left' ? 120 : -120) : 0 } : false}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0, rotate: side ? 90 : 0 }}
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

export function PileStack({
  count,
  team,
  cls,
  back,
  label,
  flying,
}: {
  count: number;
  team: Team;
  cls: 'us' | 'them';
  back: string;
  label: string;
  flying: Card[];
}) {
  return (
    <div className="col" style={{ gap: 2, alignItems: 'center' }} data-team={team}>
      <div className={`stack ${cls}`}>
        {count > 0 && <PlayingCard faceUp={false} back={back} width={34} shared={false} initial={false} />}
        {count > 3 && (
          <PlayingCard faceUp={false} back={back} width={34} shared={false} initial={false} style={{ top: -2, left: 2 }} />
        )}
        {flying.map((c, i) => (
          <PlayingCard key={c} card={c} width={34} style={{ position: 'absolute', top: -i * 1.5, left: i * 1.5 }} />
        ))}
        {count > 0 && <span className="stack-count">{count}</span>}
      </div>
      <span className="stack-label">{label}</span>
    </div>
  );
}

export function DeckStack({ count, back, label }: { count: number; back: string; label: string }) {
  return (
    <div className="col" style={{ gap: 2, alignItems: 'center' }}>
      <div className="stack">
        {count > 0 && <PlayingCard faceUp={false} back={back} width={34} shared={false} initial={false} />}
        {count > 8 && (
          <PlayingCard faceUp={false} back={back} width={34} shared={false} initial={false} style={{ top: -2, left: -2 }} />
        )}
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
}: {
  d: GameDisplay;
  width: number;
  targets: Set<Card>;
  entry: (card: Card) => ReturnType<typeof entryFrom> | false;
}) {
  const cards = d.view.table;
  return (
    <div className="table-cards">
      {cards.map((c, i) => {
        const duo = i > 0 && rankIndex(cards[i - 1]) === rankIndex(c);
        return (
          <PlayingCard
            key={c}
            card={c}
            width={width}
            className={`${targets.has(c) ? 'target' : ''} ${duo ? 'duo' : ''}`}
            initial={entry(c)}
          />
        );
      })}
    </div>
  );
}
