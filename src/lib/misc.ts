/** Identifiant unique (UUID quand disponible). */
export function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Concatène des classes CSS en ignorant les valeurs vides. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function round(n: number, digits = 0): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

export function average(values: number[]): number | null {
  return values.length ? sum(values) / values.length : null;
}

export function groupBy<T, K extends string>(items: T[], key: (item: T) => K): Record<K, T[]> {
  const out = {} as Record<K, T[]>;
  for (const item of items) (out[key(item)] ??= []).push(item);
  return out;
}

/** Normalise une chaîne pour la recherche (minuscules, sans accents). */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

/** Déclenche le téléchargement d'un fichier généré côté navigateur. */
export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Petite vibration haptique si l'appareil le permet. */
export function vibrate(pattern: number | number[] = 10): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* non supporté */
  }
}
