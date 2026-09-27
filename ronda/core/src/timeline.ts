import type { GameEvent, GameEventType } from './engine/types';

/**
 * Durée d'animation de chaque événement côté application (en millisecondes). Le serveur
 * s'en sert pour caler le temps de réflexion des bots et les chronos sur ce que voient
 * réellement les joueurs.
 */
export const STEP_MS: Record<GameEventType, number> = {
  roundStart: 500,
  deal: 1_000,
  announce: 700,
  announceResult: 1_600,
  play: 420,
  capture: 620,
  darba: 1_100,
  missa: 900,
  collect: 520,
  points: 260,
  sweep: 900,
  roundEnd: 400,
  gameOver: 0,
  turn: 0,
};

export function stepDuration(event: GameEvent): number {
  return STEP_MS[event.type];
}

export function stepsDuration(events: readonly GameEvent[]): number {
  return events.reduce((sum, e) => sum + stepDuration(e), 0);
}
