/**
 * Règles de la Ronda et variantes réglables.
 *
 * Règles de base (les plus répandues au Maroc) :
 * - En début de partie, chaque joueur tire une carte : la plus petite désigne le donneur (en cas
 *   d'égalité, les joueurs à égalité retirent). Le donneur distribue, le joueur à sa droite
 *   commence, et le donneur change d'une place vers la droite à chaque manche.
 * - 2 joueurs (1 contre 1) : 4 cartes chacun, 5 donnes par manche.
 * - 4 joueurs (2 contre 2, partenaires face à face) : 4 cartes à la première donne, puis 3 et 3.
 * - Le tapis est vide au départ. On prend la carte de même valeur et la suite qui la prolonge
 *   (1-2-3-4-5-6-7-10-11-12).
 * - Ronda (paire en main) : 1 point. Tringa (brelan) : 5 points. La meilleure annonce rafle
 *   les points de toutes les annonces (une tringa bat toute ronda, puis le rang le plus haut) ;
 *   une égalité au sommet partage le pot. Exception : quand les quatre joueurs ont chacun
 *   exactement une ronda, c'est la plus petite qui gagne.
 * - Darba : prendre la carte que vient de poser le joueur précédent. B'wahed = 1 point ;
 *   le suivant peut « zid » avec la 3e carte (b'khamsa, 5 points) puis la 4e (b'achra, 10 points) :
 *   le dernier qui rebondit emporte tout le paquet et les points.
 * - Missa : vider le tapis, 1 point (sauf avec la toute dernière carte de la manche).
 * - Dernière carte : le donneur joue la dernière carte de la manche. S'il prend avec un 12, son
 *   équipe marque 5 points ; s'il prend avec un 1, ou s'il ne prend rien, l'équipe adverse marque
 *   5 points.
 * - Fin de manche : le dernier à avoir pris ramasse le reste du tapis ; chaque carte au-delà
 *   de 20 vaut 1 point. La première équipe à 41 gagne immédiatement.
 */
export interface Rules {
  players: 2 | 4;
  /** Score à atteindre pour gagner (41 classique, 21 en partie rapide). */
  target: number;
  /** Autorise l'enchaînement b'khamsa / b'achra après une darba. */
  darbaChain: boolean;
  /** Points de darba : b'wahed, b'khamsa, b'achra. */
  darbaPoints: [number, number, number];
  missaPoints: number;
  rondaPoints: number;
  tringaPoints: number;
  /** Points de la dernière carte du donneur (12 pour lui, 1 ou rien pris pour l'adversaire) ; 0 : règle désactivée. */
  lastCardPoints: number;
}

export type RulesPreset = 'classic' | 'quick';

export function makeRules(players: 2 | 4, overrides: Partial<Omit<Rules, 'players'>> = {}): Rules {
  return {
    players,
    target: 41,
    darbaChain: players === 4,
    darbaPoints: [1, 5, 10],
    missaPoints: 1,
    rondaPoints: 1,
    tringaPoints: 5,
    lastCardPoints: 5,
    ...overrides,
  };
}

export function presetRules(players: 2 | 4, preset: RulesPreset): Rules {
  return makeRules(players, preset === 'quick' ? { target: 21 } : {});
}

/** Nombre de cartes distribuées à chaque joueur, donne par donne, sur une manche. */
export function dealPattern(players: 2 | 4): number[] {
  return players === 4 ? [4, 3, 3] : [4, 4, 4, 4, 4];
}

export const TARGET_CHOICES = [21, 31, 41, 61] as const;

/**
 * Valide et normalise des règles reçues du réseau (salons privés). Toute valeur invalide
 * est remplacée par la valeur par défaut.
 */
export function sanitizeRules(input: unknown, players: 2 | 4): Rules {
  const base = makeRules(players);
  if (typeof input !== 'object' || input === null) return base;
  const r = input as Record<string, unknown>;
  const int = (v: unknown, min: number, max: number, fallback: number) =>
    Number.isInteger(v) && (v as number) >= min && (v as number) <= max ? (v as number) : fallback;
  const target = (TARGET_CHOICES as readonly number[]).includes(r.target as number) ? (r.target as number) : base.target;
  const dp = Array.isArray(r.darbaPoints) && r.darbaPoints.length === 3 ? r.darbaPoints : base.darbaPoints;
  return {
    players,
    target,
    darbaChain: typeof r.darbaChain === 'boolean' ? r.darbaChain : base.darbaChain,
    darbaPoints: [int(dp[0], 0, 20, 1), int(dp[1], 0, 50, 5), int(dp[2], 0, 100, 10)],
    missaPoints: int(r.missaPoints, 0, 10, base.missaPoints),
    rondaPoints: int(r.rondaPoints, 0, 10, base.rondaPoints),
    tringaPoints: int(r.tringaPoints, 0, 20, base.tringaPoints),
    lastCardPoints: int(r.lastCardPoints, 0, 20, base.lastCardPoints),
  };
}
