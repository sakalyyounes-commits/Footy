import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/** Largeur réelle d'un conteneur (les graphiques sont dessinés au pixel près, sans mise à l'échelle du texte). */
export function useElementWidth<T extends HTMLElement>(fallback = 320) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(200, Math.floor(el.getBoundingClientRect().width)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

function niceStep(raw: number): number {
  const exp = Math.floor(Math.log10(raw));
  const f = raw / 10 ** exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * 10 ** exp;
}

/** Graduations « rondes » de 0 jusqu'au-dessus de `max`. */
export function niceTicks(max: number, count = 3): number[] {
  if (!(max > 0)) return [0, 1];
  const step = niceStep(max / count);
  const top = Math.ceil(max / step - 1e-9) * step;
  const out: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

/** Graduations « rondes » couvrant [min, max] (axes ne partant pas de zéro). */
export function niceRangeTicks(min: number, max: number, count = 4): number[] {
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const step = niceStep((max - min) / count);
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = start; v <= end + step / 2; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

/** Colonne avec extrémité arrondie (4 px) et base carrée, ancrée sur la ligne de base. */
export function barPath(x: number, y: number, w: number, h: number): string {
  if (h <= 0) return '';
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

interface TooltipState {
  x: number;
  y: number;
  content: ReactNode;
}

export function useTooltip() {
  const [tip, setTip] = useState<TooltipState | null>(null);
  const node = tip ? (
    <div className="chart-tooltip" style={{ left: tip.x, top: tip.y }} role="presentation">
      {tip.content}
    </div>
  ) : null;
  return { show: setTip, hide: () => setTip(null), node };
}

/** Vue tableau d'un graphique (accessibilité : aucune valeur réservée au survol). */
export function ChartTable({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: string[];
  rows: Array<Array<string | number>>;
}) {
  return (
    <details className="chart-table">
      <summary>Voir les données</summary>
      <table>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={c} className={i > 0 ? 'num' : undefined} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((cell, j) => (
                <td key={j} className={j > 0 ? 'num' : undefined}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
