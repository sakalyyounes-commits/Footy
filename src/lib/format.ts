const nfCache = new Map<string, Intl.NumberFormat>();

function nf(min: number, max: number): Intl.NumberFormat {
  const key = `${min}-${max}`;
  let f = nfCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: min, maximumFractionDigits: max });
    nfCache.set(key, f);
  }
  return f;
}

/** 1234.5 → « 1 234,5 » */
export function formatNumber(n: number, maxDigits = 0, minDigits = 0): string {
  return nf(minDigits, maxDigits).format(n);
}

export interface Currency {
  code: string;
  label: string;
  symbol: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'MAD', label: 'Dirham marocain', symbol: 'DH' },
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'USD', label: 'Dollar américain', symbol: '$' },
  { code: 'GBP', label: 'Livre sterling', symbol: '£' },
  { code: 'CAD', label: 'Dollar canadien', symbol: '$ CA' },
  { code: 'CHF', label: 'Franc suisse', symbol: 'CHF' },
  { code: 'AED', label: 'Dirham émirati', symbol: 'AED' },
  { code: 'SAR', label: 'Riyal saoudien', symbol: 'SAR' },
  { code: 'TND', label: 'Dinar tunisien', symbol: 'DT' },
  { code: 'DZD', label: 'Dinar algérien', symbol: 'DA' },
  { code: 'XOF', label: 'Franc CFA', symbol: 'FCFA' },
];

export function currencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}

/** 1234.5 → « 1 234,50 DH » ; les centimes n'apparaissent que s'ils existent. */
export function formatMoney(n: number, code: string, opts: { signed?: boolean } = {}): string {
  const abs = Math.abs(n);
  const hasCents = Math.round(abs * 100) % 100 !== 0;
  const body = hasCents ? formatNumber(abs, 2, 2) : formatNumber(abs, 0);
  const sign = n < 0 ? '−' : opts.signed && n > 0 ? '+' : '';
  return `${sign}${body} ${currencySymbol(code)}`;
}

/** Montant compact pour les axes : 12 500 → « 12,5 k ». */
export function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${formatNumber(n / 1_000_000, 1)} M`;
  if (abs >= 10_000) return `${formatNumber(n / 1000, 0)} k`;
  if (abs >= 1000) return `${formatNumber(n / 1000, 1)} k`;
  return formatNumber(n, 0);
}

/** 250 → « 250 ml », 1500 → « 1,5 L » */
export function formatMl(ml: number): string {
  if (Math.abs(ml) >= 1000) return `${formatNumber(ml / 1000, 2)} L`;
  return `${formatNumber(ml, 0)} ml`;
}

/** 95 → « 1 h 35 », 45 → « 45 min » */
export function formatDuration(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h} h` : `${h} h ${String(r).padStart(2, '0')}`;
}

/** Compte à rebours lisible : « 1 h 05 », « 12 min », « < 1 min ». */
export function formatCountdown(ms: number): string {
  const totalMin = Math.floor(ms / 60_000);
  if (totalMin < 1) return '< 1 min';
  return formatDuration(totalMin);
}

export function formatKcal(n: number): string {
  return `${formatNumber(Math.round(n))} kcal`;
}

export function formatPercent(ratio: number, digits = 0): string {
  return `${formatNumber(ratio * 100, digits)} %`;
}

/** Pluriel simple : plural(3, 'séance') → « 3 séances ». */
export function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return `${formatNumber(n)} ${Math.abs(n) >= 2 ? pluralForm : singular}`;
}

/** Lit un nombre saisi à la française (« 12,5 ») ; renvoie null si invalide. */
export function parseDecimal(input: string): number | null {
  const cleaned = input.replace(/\s/g, '').replace(',', '.');
  if (cleaned === '' || !/^-?\d*\.?\d*$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
