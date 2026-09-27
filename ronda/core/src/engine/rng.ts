/** Générateur pseudo-aléatoire : renvoie un nombre dans [0, 1). */
export type Rng = () => number;

/** Mulberry32 : rapide et reproductible (tests, bots, parties hors ligne). */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Graine aléatoire à partir de la source cryptographique disponible. */
export function randomSeed(): number {
  const c = (globalThis as { crypto?: { getRandomValues?: (a: Uint32Array) => Uint32Array } }).crypto;
  if (c?.getRandomValues) return c.getRandomValues(new Uint32Array(1))[0];
  return Math.floor(Math.random() * 2 ** 32);
}

/**
 * Générateur non prédictible pour le serveur : chaque tirage vient de la source
 * cryptographique (un adversaire ne peut pas retrouver l'ordre du paquet à partir d'une graine).
 */
export function cryptoRng(): Rng {
  const c = (globalThis as { crypto?: { getRandomValues?: (a: Uint32Array) => Uint32Array } }).crypto;
  if (!c?.getRandomValues) return Math.random;
  const buf = new Uint32Array(64);
  let i = buf.length;
  return () => {
    if (i >= buf.length) {
      c.getRandomValues!(buf);
      i = 0;
    }
    return buf[i++] / 4294967296;
  };
}

/** Mélange de Fisher-Yates (renvoie une copie). */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

export function pick<T>(items: readonly T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)];
}
