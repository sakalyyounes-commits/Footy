import { barPath, ChartTable, niceTicks, useElementWidth, useTooltip } from './shared';

export interface BarDatum {
  key: string;
  /** Libellé court sous la colonne (ex. « L », « 12 »). */
  label: string;
  /** Libellé complet pour l'infobulle et le tableau. */
  fullLabel: string;
  value: number;
  /** Met en valeur le libellé (ex. aujourd'hui). */
  current?: boolean;
}

interface BarChartProps {
  title: string;
  data: BarDatum[];
  /** Couleur de la série (variable CSS). */
  color: string;
  formatValue: (v: number) => string;
  formatTick?: (v: number) => string;
  goal?: number | null;
  goalLabel?: string;
  height?: number;
  valueHeader?: string;
}

const M = { top: 18, right: 6, bottom: 24, left: 40 };

/** Histogramme d'une série temporelle, avec ligne d'objectif optionnelle. */
export function BarChart({
  title,
  data,
  color,
  formatValue,
  formatTick = formatValue,
  goal,
  goalLabel = 'Objectif',
  height = 170,
  valueHeader = 'Valeur',
}: BarChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const { show, hide, node } = useTooltip();

  const maxValue = Math.max(0, ...data.map((d) => d.value), goal ?? 0);
  const ticks = niceTicks(maxValue, 3);
  const top = ticks[ticks.length - 1];
  const plotW = width - M.left - M.right;
  const plotH = height - M.top - M.bottom;
  const band = plotW / Math.max(1, data.length);
  const barW = Math.max(3, Math.min(24, band * 0.62));
  const y = (v: number) => M.top + plotH - (v / top) * plotH;
  const labelEvery = data.length > 16 ? Math.ceil(data.length / 8) : 1;

  return (
    <div className="chart" ref={ref}>
      <svg width={width} height={height} role="img" aria-label={title}>
        {ticks.map((t) => (
          <g key={t}>
            <line className={t === 0 ? 'axis-line' : 'grid-line'} x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} />
            <text className="tick" x={M.left - 6} y={y(t)} dy="0.32em" textAnchor="end">
              {formatTick(t)}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const x = M.left + i * band + (band - barW) / 2;
          const h = Math.max(0, y(0) - y(d.value));
          const describe = `${d.fullLabel} : ${formatValue(d.value)}`;
          const showTip = () =>
            show({
              x: M.left + i * band + band / 2,
              y: y(d.value),
              content: (
                <>
                  <span className="tt-value">{formatValue(d.value)}</span>
                  <span className="tt-label">{d.fullLabel}</span>
                </>
              ),
            });
          return (
            <g
              key={d.key}
              className="hit-group"
              tabIndex={0}
              aria-label={describe}
              onPointerEnter={showTip}
              onPointerLeave={hide}
              onFocus={showTip}
              onBlur={hide}
            >
              <rect className="hit" x={M.left + i * band} y={M.top} width={band} height={plotH} />
              <path className="mark" d={barPath(x, y(d.value), barW, h)} fill={color} />
              {(i % labelEvery === 0 || d.current) && (
                <text
                  className={d.current ? 'tick strong' : 'tick'}
                  x={M.left + i * band + band / 2}
                  y={height - 6}
                  textAnchor="middle"
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}

        {goal ? (
          <g aria-hidden>
            <line className="goal-line" x1={M.left} x2={width - M.right} y1={y(goal)} y2={y(goal)} />
            <text className="goal-label" x={width - M.right} y={y(goal) - 5} textAnchor="end">
              {goalLabel} · {formatValue(goal)}
            </text>
          </g>
        ) : null}
      </svg>
      {node}
      <ChartTable caption={title} columns={['Date', valueHeader]} rows={data.map((d) => [d.fullLabel, formatValue(d.value)])} />
    </div>
  );
}
