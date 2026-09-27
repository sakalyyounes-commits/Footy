import { motion, type TargetAndTransition, type Transition } from 'motion/react';
import type { CSSProperties, PointerEventHandler } from 'react';
import type { Card } from '@ronda/core';
import { CardBack, CardFace } from '../../cards/CardFace';

export const CARD_SPRING: Transition = { type: 'spring', stiffness: 430, damping: 34, mass: 0.75 };

interface Props {
  card?: Card;
  faceUp?: boolean;
  width: number;
  back?: string;
  className?: string;
  style?: CSSProperties;
  initial?: TargetAndTransition | false;
  animate?: TargetAndTransition;
  transition?: Transition;
  onClick?: () => void;
  onPointerDown?: PointerEventHandler<HTMLDivElement>;
  drag?: boolean;
  onDragUp?: () => void;
  /** Identifiant d'animation partagée : une carte « voyage » d'une zone à l'autre. */
  shared?: boolean;
}

/** Une carte animée. Les cartes visibles partagent un layoutId : elles glissent de la main au tapis puis au tas. */
export function PlayingCard({
  card,
  faceUp = true,
  width,
  back,
  className = '',
  style,
  initial,
  animate,
  transition = CARD_SPRING,
  onClick,
  onPointerDown,
  drag,
  onDragUp,
  shared = true,
}: Props) {
  const visible = faceUp && card !== undefined;
  return (
    <motion.div
      layoutId={visible && shared ? `c${card}` : undefined}
      layout={visible && shared ? true : undefined}
      className={`pcard ${className}`}
      style={{ ['--cw' as string]: `${width}px`, ...style }}
      initial={initial}
      animate={animate ?? { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
      transition={transition}
      onClick={onClick}
      onPointerDown={onPointerDown}
      drag={drag ? 'y' : false}
      dragSnapToOrigin
      dragElastic={0.6}
      dragConstraints={{ top: -160, bottom: 0 }}
      onDragEnd={(_, info) => {
        if (onDragUp && info.offset.y < -55) onDragUp();
      }}
      whileTap={onClick ? { scale: 0.97 } : undefined}
    >
      {visible ? <CardFace card={card} /> : <CardBack back={back} />}
    </motion.div>
  );
}
