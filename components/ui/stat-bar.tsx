"use client";

import { motion } from "framer-motion";

interface StatBarProps {
  label: string;
  value: number;
  max: number;
  color?: string;
}

export function StatBar({ label, value, max, color = "#3b6cf6" }: StatBarProps) {
  const pct = Math.min((value / max) * 100, 100);

  return (
    <div className="flex items-center gap-3">
      <span className="w-10 shrink-0 font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase tracking-widest text-[var(--text-primary)]">
        {label}
      </span>
      <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${color}66, ${color})`,
          }}
        />
      </div>
      <span className="w-10 shrink-0 text-right font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-[var(--text-primary)]">
        {value}
      </span>
    </div>
  );
}
