"use client";

import { motion } from "framer-motion";

interface RadarChartProps {
  stats: { label: string; value: number; max: number }[];
  size?: number;
}

export function RadarChart({ stats, size = 220 }: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 30; // leave space for labels
  const n = stats.length;

  // angle for each stat vertex (starting from top, clockwise)
  function angle(i: number) {
    return (Math.PI * 2 * i) / n - Math.PI / 2;
  }

  // point at given radius fraction for vertex i
  function point(i: number, fraction: number) {
    const a = angle(i);
    return {
      x: cx + radius * fraction * Math.cos(a),
      y: cy + radius * fraction * Math.sin(a),
    };
  }

  // generate polygon path for a given fraction (0-1)
  function polygonPath(fraction: number) {
    return stats
      .map((_, i) => {
        const p = point(i, fraction);
        return `${p.x},${p.y}`;
      })
      .join(" ");
  }

  // data polygon — each stat at its own fraction
  const dataPath = stats
    .map((s, i) => {
      const frac = s.max > 0 ? Math.min(s.value / s.max, 1) : 0;
      const p = point(i, frac);
      return `${p.x},${p.y}`;
    })
    .join(" ");

  // grid levels
  const gridLevels = [0.33, 0.66, 1];

  // label positions with offset
  const labelOffset = 16;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="overflow-visible"
    >
      {/* Grid pentagons */}
      {gridLevels.map((level) => (
        <polygon
          key={level}
          points={polygonPath(level)}
          fill="none"
          stroke="var(--surface-3)"
          strokeWidth={1}
        />
      ))}

      {/* Lines from center to vertices */}
      {stats.map((_, i) => {
        const p = point(i, 1);
        return (
          <line
            key={`axis-${i}`}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="var(--surface-3)"
            strokeWidth={1}
          />
        );
      })}

      {/* Data polygon — animated */}
      <motion.polygon
        points={dataPath}
        fill="var(--accent-blue)"
        fillOpacity={0.15}
        stroke="var(--accent-blue)"
        strokeOpacity={0.6}
        strokeWidth={1.5}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      />

      {/* Labels + values at vertices */}
      {stats.map((s, i) => {
        const a = angle(i);
        const lx = cx + (radius + labelOffset) * Math.cos(a);
        const ly = cy + (radius + labelOffset) * Math.sin(a);
        const textAnchor =
          Math.abs(Math.cos(a)) < 0.1
            ? "middle"
            : Math.cos(a) > 0
              ? "start"
              : "end";
        const dy = Math.sin(a) > 0.3 ? 14 : Math.sin(a) < -0.3 ? -4 : 4;

        return (
          <g key={s.label}>
            <text
              x={lx}
              y={ly + dy - 5}
              textAnchor={textAnchor}
              className="fill-[var(--text-muted)]"
              style={{
                fontSize: "10px",
                fontFamily: "var(--font-rajdhani)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {s.label}
            </text>
            <text
              x={lx}
              y={ly + dy + 8}
              textAnchor={textAnchor}
              className="fill-[var(--text-secondary)]"
              style={{
                fontSize: "11px",
                fontFamily: "var(--font-geist-mono)",
                fontWeight: 600,
              }}
            >
              {s.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
