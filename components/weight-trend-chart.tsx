"use client";

import type { WeightSeriesPoint } from "@/lib/weight-engine";

interface WeightTrendChartProps {
  series: WeightSeriesPoint[];
  height?: number;
  compact?: boolean;
}

export function WeightTrendChart({
  series,
  height = 148,
  compact = false,
}: WeightTrendChartProps) {
  if (!series || series.length === 0) return null;

  const width = 360;
  const padL = compact ? 10 : 34;
  const padR = 12;
  const padT = 14;
  const padB = compact ? 14 : 24;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const vals: number[] = [];
  for (const pt of series) {
    vals.push(pt.ema);
    if (pt.raw !== null) vals.push(pt.raw);
  }
  const rawMin = Math.min(...vals);
  const rawMax = Math.max(...vals);
  const span = Math.max(rawMax - rawMin, 2.0);
  const minY = Math.floor((rawMin - span * 0.18) * 10) / 10;
  const maxY = Math.ceil((rawMax + span * 0.18) * 10) / 10;
  const yRange = Math.max(maxY - minY, 1);

  const xForIdx = (i: number) =>
    series.length === 1
      ? padL + plotW / 2
      : padL + (i / (series.length - 1)) * plotW;

  const yForVal = (v: number) =>
    padT + plotH - ((v - minY) / yRange) * plotH;

  const emaPoints = series
    .map((pt, i) => `${xForIdx(i).toFixed(1)},${yForVal(pt.ema).toFixed(1)}`)
    .join(" ");

  const midY = Math.round(((minY + maxY) / 2) * 10) / 10;
  const gridVals = [maxY, midY, minY];

  const firstLabel = series[0]?.date.slice(5) ?? "";
  const midLabel = series[Math.floor(series.length / 2)]?.date.slice(5) ?? "";
  const lastLabel = series[series.length - 1]?.date.slice(5) ?? "";

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto block"
        role="img"
        aria-label="14-day raw vs trend weight chart"
      >
        <defs>
          <linearGradient id="emaArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b6cf6" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#3b6cf6" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {gridVals.map((gv, i) => {
          const y = yForVal(gv);
          return (
            <g key={i}>
              <line
                x1={padL}
                y1={y}
                x2={width - padR}
                y2={y}
                stroke="rgba(255,255,255,0.06)"
                strokeDasharray="3 3"
              />
              {!compact && (
                <text
                  x={padL - 5}
                  y={y + 3}
                  textAnchor="end"
                  fill="#78829a"
                  fontSize="9"
                  fontFamily="var(--font-geist-mono)"
                >
                  {gv.toFixed(1)}
                </text>
              )}
            </g>
          );
        })}

        {/* Subtle area fill under EMA */}
        {series.length > 1 && (
          <polygon
            points={`${xForIdx(0).toFixed(1)},${(padT + plotH).toFixed(1)} ${emaPoints} ${xForIdx(
              series.length - 1
            ).toFixed(1)},${(padT + plotH).toFixed(1)}`}
            fill="url(#emaArea)"
          />
        )}

        {/* Continuous EMA Trend Line */}
        <polyline
          fill="none"
          stroke="#3b6cf6"
          strokeWidth={2.2}
          strokeLinejoin="round"
          strokeLinecap="round"
          points={emaPoints}
        />

        {/* Raw weigh-in dots (highlighting swings vs trend) */}
        {series.map((pt, i) => {
          if (pt.raw === null) return null;
          const x = xForIdx(i);
          const y = yForVal(pt.raw);
          const diff = pt.raw - pt.ema;
          const dotColor =
            diff >= 1.2 ? "#f59e0b" : diff <= -1.0 ? "#22c55e" : "#cbd5e1";
          return (
            <g key={pt.date}>
              <line
                x1={x}
                y1={y}
                x2={x}
                y2={yForVal(pt.ema)}
                stroke="rgba(255,255,255,0.12)"
                strokeWidth={1}
              />
              <circle
                cx={x}
                cy={y}
                r={compact ? 3 : 3.5}
                fill={dotColor}
                stroke="#0b0c10"
                strokeWidth={1.2}
              />
            </g>
          );
        })}

        {!compact && (
          <>
            <text
              x={padL}
              y={height - 5}
              textAnchor="start"
              fill="#78829a"
              fontSize="9"
              fontFamily="var(--font-geist-mono)"
            >
              {firstLabel}
            </text>
            <text
              x={padL + plotW / 2}
              y={height - 5}
              textAnchor="middle"
              fill="#78829a"
              fontSize="9"
              fontFamily="var(--font-geist-mono)"
            >
              {midLabel}
            </text>
            <text
              x={width - padR}
              y={height - 5}
              textAnchor="end"
              fill="#78829a"
              fontSize="9"
              fontFamily="var(--font-geist-mono)"
            >
              {lastLabel}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}
