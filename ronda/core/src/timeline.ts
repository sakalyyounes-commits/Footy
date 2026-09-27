import type { GameEvent, GameEventType } from './engine/types';

/**
 * Durée d'animation de chaque événement côté application (en millisecondes). Le serveur
 * s'en sert pour caler le temps de réflexion des bots et les chronos sur ce que voient
 * réellement les joueurs.
 */
export const STEP_MS: Record<GameEventType, number> = {
  /** Par tirage (les égalités font retirer) ; voir DRAW_REVEAL_MS pour l'annonce du donneur. */
  dealerDraw: 1_500,
  roundStart: 500,
  deal: 1_000,
  announce: 700,
  announceResult: 1_600,
  play: 420,
  capture: 620,
  darba: 1_100,
  missa: 900,
  lastCard: 1_600,
  collect: 520,
  points: 260,
  sweep: 900,
  roundEnd: 400,
  gameOver: 0,
  turn: 0,
};

/** Temps laissé, après le dernier tirage, pour montrer qui distribue. */
export const DRAW_REVEAL_MS = 1_400;

export function stepDuration(event: GameEvent): number {
  if (event.type === 'dealerDraw') return STEP_MS.dealerDraw * event.rounds.length + DRAW_REVEAL_MS;
  return STEP_MS[event.type];
}

export function stepsDuration(events: readonly GameEvent[]): number {
  return events.reduce((sum, e) => sum + stepDuration(e), 0);
}
