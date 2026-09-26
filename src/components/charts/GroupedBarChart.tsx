import { barPath, ChartTable, niceTicks, useElementWidth, useTooltip } from './shared';

export interface GroupDatum {
  key: string;
  label: string;
  fullLabel: string;
  values: number[];
}

interface GroupedBarChartProps {
  title: string;
  series: Array<{ name: string; color: string }>;
  data: GroupDatum[];
  formatValue: (v: number) => string;
  formatTick: (v: number) => string;
  height?: number;
}

const M = { top: 12, right: 6, bottom: 24, left: 44 };

/** Colonnes groupées (ex. revenus / dépenses par mois) avec légende. */
export function GroupedBarChart({ title, series, data, formatValue, formatTick, height = 190 }: GroupedBarChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const { show, hide, node } = useTooltip();

  const maxValue = Math.max(0, ...data.flatMap((d) => d.values));
  const ticks = niceTicks(maxValue, 3);
  const top = ticks[ticks.length - 1];
  const plotW = width - M.left - M.right;
  const plotH = height - M.top - M.bottom;
  const band = plotW / Math.max(1, data.length);
  const gap = 2;
  const barW = Math.max(3, Math.min(22, (band * 0.7 - gap * (series.length - 1)) / series.length));
  const groupW = barW * series.length + gap * (series.length - 1);
  const y = (v: number) => M.top + plotH - (v / top) * plotH;

  return (
    <div className="chart" ref={ref}>
      <div className="chart-legend">
        {series.map((s) => (
          <span key={s.name}>
            <span className="legend-key" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
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
          const x0 = M.left + i * band + (band - groupW) / 2;
          const describe = `${d.fullLabel} : ${series.map((s, j) => `${s.name} ${formatValue(d.values[j] ?? 0)}`).join(', ')}`;
          const showTip = () =>
            show({
              x: M.left + i * band + band / 2,
              y: y(Math.max(...d.values)),
              content: (
                <>
                  <span className="tt-label">{d.fullLabel}</span>
                  {series.map((s, j) => (
                    <span key={s.name} className="tt-row">
                      <span className="tt-key" style={{ background: s.color }} />
                      <strong>{formatValue(d.values[j] ?? 0)}</strong> {s.name}
                    </span>
                  ))}
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
              {series.map((s, j) => {
                const v = d.values[j] ?? 0;
                return (
                  <path
                    key={s.name}
                    className="mark"
                    d={barPath(x0 + j * (barW + gap), y(v), barW, y(0) - y(v))}
                    fill={s.color}
                  />
                );
              })}
              <text className="tick" x={M.left + i * band + band / 2} y={height - 6} textAnchor="middle">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      {node}
      <ChartTable
        caption={title}
        columns={['Période', ...series.map((s) => s.name)]}
        rows={data.map((d) => [d.fullLabel, ...series.map((_, j) => formatValue(d.values[j] ?? 0))])}
      />
    </div>
  );
}
