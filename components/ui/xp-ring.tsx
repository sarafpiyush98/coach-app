"use client";

import { motion } from "framer-motion";

interface XPRingProps {
  level: number;
  xpProgress: number; // 0-1
  rank: string;
  size?: number;
}

export function XPRing({ level, xpProgress, rank, size = 140 }: XPRingProps) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - xpProgress);
  const center = size / 2;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        style={{
          filter: "drop-shadow(0 0 6px #1B45D7) drop-shadow(0 0 12px #021FA0)",
        }}
      >
        {/* Background ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#1A1A2E"
          strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#1B45D7"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-[family-name:var(--font-geist-mono)] text-2xl font-semibold text-[#FBEFFA]">
          {level}
        </span>
        <span className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[#4A5568]">
          {rank}
        </span>
      </div>
    </div>
  );
}
