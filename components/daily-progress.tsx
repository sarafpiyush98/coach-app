"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { SystemPanel } from "@/components/ui/system-panel";
import { XPRing } from "@/components/ui/xp-ring";
import type { LootRarity } from "@/lib/gamification";
import { LOOT_COLORS } from "@/lib/gamification";

interface DailyProgressProps {
  questsCompleted: number;
  questsTotal: number;
  comboDay: number;
  comboMultiplier: number;
  lootRarity: LootRarity | null;
  lootMultiplier: number;
  todayXp: number;
  level: number;
  levelProgress: number;
  rank: string;
}

function CountUp({ target }: { target: number }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target === 0) return;
    const duration = 800;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [target]);

  return <>{value}</>;
}

export function DailyProgress({
  questsCompleted,
  questsTotal,
  comboDay,
  comboMultiplier,
  lootRarity,
  lootMultiplier,
  todayXp,
  level,
  levelProgress,
  rank,
}: DailyProgressProps) {
  const ringProgress = questsTotal > 0 ? questsCompleted / questsTotal : 0;
  const lootColor = lootRarity ? LOOT_COLORS[lootRarity] : "text-[#4A5568]";
  const lootLabel = lootRarity
    ? lootRarity.charAt(0).toUpperCase() + lootRarity.slice(1)
    : "None";

  return (
    <SystemPanel className="p-5">
      <div className="flex flex-col items-center gap-4">
        {/* XP Ring — shows daily quest completion */}
        <XPRing
          level={level}
          xpProgress={levelProgress / 100}
          rank={rank}
          size={120}
        />

        {/* Stats row */}
        <div className="flex w-full justify-around text-center">
          {/* Combo */}
          <div>
            <p className="font-[family-name:var(--font-geist-mono)] text-lg font-semibold text-[#FBEFFA]">
              <CountUp target={comboDay} />
            </p>
            <p className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[#4A5568]">
              COMBO
            </p>
            {comboMultiplier > 1 && (
              <p className="font-[family-name:var(--font-geist-mono)] text-[10px] text-[#FFC107]">
                {comboMultiplier.toFixed(1)}x
              </p>
            )}
          </div>

          {/* Loot */}
          <div>
            <p className={`font-[family-name:var(--font-geist-mono)] text-lg font-semibold ${lootColor}`}>
              {lootMultiplier.toFixed(1)}x
            </p>
            <p className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[#4A5568]">
              LOOT
            </p>
            <p className={`text-[10px] ${lootColor}`}>{lootLabel}</p>
          </div>

          {/* Quest completion */}
          <div>
            <p className="font-[family-name:var(--font-geist-mono)] text-lg font-semibold text-[#FBEFFA]">
              {questsCompleted}/{questsTotal}
            </p>
            <p className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[#4A5568]">
              PROTOCOLS
            </p>
          </div>
        </div>

        {/* Today's XP */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="text-center"
        >
          <span className="font-[family-name:var(--font-geist-mono)] text-3xl font-semibold text-[#FBEFFA]">
            <CountUp target={todayXp} />
          </span>
          <span className="ml-1 font-[family-name:var(--font-rajdhani)] text-sm font-bold uppercase tracking-wider text-[#4A5568]">
            XP TODAY
          </span>
        </motion.div>
      </div>
    </SystemPanel>
  );
}
