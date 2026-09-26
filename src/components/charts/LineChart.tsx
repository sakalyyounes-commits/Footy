import { useState } from 'react';
import { ChartTable, niceRangeTicks, useElementWidth } from './shared';

export interface LinePoint {
  /** Position horizontale (ex. numéro de jour). */
  x: number;
  label: string;
  value: number;
}

interface LineChartProps {
  title: string;
  points: LinePoint[];
  color: string;
  formatValue: (v: number) => string;
  formatX: (x: number) => string;
  goal?: number | null;
  goalLabel?: string;
  yDomain?: [number, number];
  yTicks?: number[];
  formatTick?: (v: number) => string;
  height?: number;
  area?: boolean;
  valueHeader?: string;
}

const M = { top: 16, right: 14, bottom: 24, left: 40 };

/** Courbe d'évolution avec réticule de survol, marqueur final et ligne d'objectif. */
export function LineChart({
  title,
  points,
  color,
  formatValue,
  formatX,
  goal,
  goalLabel = 'Objectif',
  yDomain,
  yTicks,
  formatTick = formatValue,
  height = 190,
  area = true,
  valueHeader = 'Valeur',
}: LineChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  if (points.length === 0) return null;

  const values = points.map((p) => p.value);
  const ticks =
    yTicks ?? niceRangeTicks(Math.min(...values, goal ?? Infinity), Math.max(...values, goal ?? -Infinity), 3);
  const [yMin, yMax] = yDomain ?? [ticks[0], ticks[ticks.length - 1]];
  const xMin = points[0].x;
  const xMax = points[points.length - 1].x;
  const plotW = width - M.left - M.right;
  const plotH = height - M.top - M.bottom;
  const sx = (x: number) => M.left + (xMax === xMin ? plotW / 2 : ((x - xMin) / (xMax - xMin)) * plotW);
  const sy = (v: number) => M.top + plotH - ((v - yMin) / (yMax - yMin || 1)) * plotH;

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x)},${sy(p.value)}`).join('');
  const areaPath = `${line}L${sx(xMax)},${sy(yMin)}L${sx(xMin)},${sy(yMin)}Z`;
  const last = points[points.length - 1];
  const xTicks = xMax === xMin ? [xMin] : [xMin, Math.round((xMin + xMax) / 2), xMax];

  const nearest = (clientX: number, rect: DOMRect) => {
    const px = clientX - rect.left;
    let best = 0;
    for (let i = 1; i < points.length; i++) {
      if (Math.abs(sx(points[i].x) - px) < Math.abs(sx(points[best].x) - px)) best = i;
    }
    return best;
  };

  const activePoint = active !== null ? points[active] : null;

  return (
    <div className="chart" ref={ref}>
      <svg width={width} height={height} role="img" aria-label={title}>
        {ticks.map((t) => (
          <g key={t}>
            <line className={t === yMin ? 'axis-line' : 'grid-line'} x1={M.left} x2={width - M.right} y1={sy(t)} y2={sy(t)} />
            <text className="tick" x={M.left - 6} y={sy(t)} dy="0.32em" textAnchor="end">
              {formatTick(t)}
            </text>
          </g>
        ))}
        {xTicks.map((x, i) => (
          <text
            key={`${x}-${i}`}
            className="tick"
            x={sx(x)}
            y={height - 6}
            textAnchor={i === 0 && xTicks.length > 1 ? 'start' : i === xTicks.length - 1 && xTicks.length > 1 ? 'end' : 'middle'}
          >
            {formatX(x)}
          </text>
        ))}
        {goal != null && (
          <g aria-hidden>
            <line className="goal-line" x1={M.left} x2={width - M.right} y1={sy(goal)} y2={sy(goal)} />
            <text className="goal-label" x={M.left + 4} y={sy(goal) - 5}>
              {goalLabel} · {formatValue(goal)}
            </text>
          </g>
        )}
        {area && points.length > 1 && <path d={areaPath} fill={color} opacity={0.1} />}
        {points.length > 1 && (
          <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        )}
        <circle cx={sx(last.x)} cy={sy(last.value)} r={4} fill={color} stroke="var(--surface)" strokeWidth={2} />

        {activePoint && (
          <g aria-hidden>
            <line className="crosshair" x1={sx(activePoint.x)} x2={sx(activePoint.x)} y1={M.top} y2={M.top + plotH} />
            <circle cx={sx(activePoint.x)} cy={sy(activePoint.value)} r={5} fill={color} stroke="var(--surface)" strokeWidth={2} />
          </g>
        )}

        <rect
          className="hit"
          x={M.left}
          y={M.top}
          width={plotW}
          height={plotH}
          tabIndex={0}
          aria-label={`${title}. Dernière valeur : ${formatValue(last.value)} (${last.label}). Flèches gauche/droite pour parcourir.`}
          onPointerMove={(e) => setActive(nearest(e.clientX, e.currentTarget.ownerSVGElement!.getBoundingClientRect()))}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive(points.length - 1)}
          onBlur={() => setActive(null)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') setActive((a) => Math.max(0, (a ?? points.length - 1) - 1));
            if (e.key === 'ArrowRight') setActive((a) => Math.min(points.length - 1, (a ?? 0) + 1));
          }}
        />
      </svg>
      {activePoint && (
        <div
          className="chart-tooltip"
          style={{ left: Math.min(Math.max(sx(activePoint.x), 60), width - 60), top: sy(activePoint.value) }}
          role="presentation"
        >
          <span className="tt-value">{formatValue(activePoint.value)}</span>
          <span className="tt-label">{activePoint.label}</span>
        </div>
      )}
      <ChartTable caption={title} columns={['Date', valueHeader]} rows={points.map((p) => [p.label, formatValue(p.value)])} />
    </div>
  );
}
