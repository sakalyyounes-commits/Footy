import { useSettings } from '../store/settings';
import { ar } from './ar';
import { en } from './en';
import { fr, type Dictionary, type TranslationKey } from './fr';

export type Lang = 'fr' | 'ar' | 'en';
export const LANGS: { id: Lang; label: string }[] = [
  { id: 'fr', label: 'Français' },
  { id: 'ar', label: 'العربية' },
  { id: 'en', label: 'English' },
];

const DICTS: Record<Lang, Dictionary> = { fr, ar, en };

export function detectLang(): Lang {
  const langs = typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : [];
  for (const l of langs) {
    const code = l.slice(0, 2).toLowerCase();
    if (code === 'ar') return 'ar';
    if (code === 'fr') return 'fr';
    if (code === 'en') return 'en';
  }
  return 'fr';
}

export type Vars = Record<string, string | number>;

export function translate(lang: Lang, key: TranslationKey, vars?: Vars): string {
  let text = DICTS[lang][key] ?? fr[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v));
  }
  return text;
}

/** Traduction hors composant React (sons, notifications…). */
export function t(key: TranslationKey, vars?: Vars): string {
  return translate(useSettings.getState().lang, key, vars);
}

export function useT() {
  const lang = useSettings((s) => s.lang);
  return (key: TranslationKey, vars?: Vars) => translate(lang, key, vars);
}

export function isRtl(lang: Lang): boolean {
  return lang === 'ar';
}

export function formatNumber(n: number, lang: Lang): string {
  return new Intl.NumberFormat(lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-US' : 'fr-FR').format(n);
}

/** Montant compact : 2,5 k, 1 M. */
export function formatCoins(n: number, lang: Lang): string {
  const locale = lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-US' : 'fr-FR';
  if (Math.abs(n) >= 10_000) return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(n);
  return new Intl.NumberFormat(locale).format(n);
}

export type { TranslationKey };
