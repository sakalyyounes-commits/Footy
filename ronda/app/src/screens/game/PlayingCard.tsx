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
  /** La carte arrive face cachée puis se retourne en 3D (délai en secondes). */
  flipIn?: number | false;
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
  flipIn = false,
}: Props) {
  const visible = faceUp && card !== undefined;
  const flipping = visible && flipIn !== false;
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
      {flipping ? (
        <motion.div
          className="pcard-flip"
          initial={{ rotateY: 180 }}
          animate={{ rotateY: 0 }}
          transition={{ delay: flipIn || 0, duration: 0.5, ease: [0.3, 0.7, 0.2, 1] }}
        >
          <div className="pcard-face">
            <CardFace card={card} />
          </div>
          <div className="pcard-face back">
            <CardBack back={back} />
          </div>
        </motion.div>
      ) : visible ? (
        <CardFace card={card} />
      ) : (
        <CardBack back={back} />
      )}
    </motion.div>
  );
}
