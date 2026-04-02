"use client";

import { SystemFrame } from "@/components/ui/system-frame";
import { XPRing } from "@/components/ui/xp-ring";
import type { LootRarity } from "@/lib/gamification";
import { LOOT_COLORS } from "@/lib/gamification";
import { getComboTheme, getConsistencyTitle } from "@/lib/consistency";

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
  const lootColor = lootRarity ? LOOT_COLORS[lootRarity] : "text-[var(--text-muted)]";
  const lootLabel = lootRarity
    ? lootRarity.charAt(0).toUpperCase() + lootRarity.slice(1)
    : "None";
  const comboTheme = getComboTheme(comboDay);
  const consistencyTitle = getConsistencyTitle(comboDay);

  return (
    <SystemFrame>
      <div className="flex flex-col items-center gap-5">
        {/* XP Ring */}
        <XPRing
          level={level}
          xpProgress={levelProgress / 100}
          rank={rank}
          size={140}
        />

        {/* Stats row — monospace readout */}
        <div className="flex w-full justify-around text-center">
          <div>
            <p
              className="font-[family-name:var(--font-geist-mono)] text-lg font-semibold"
              style={{
                color: comboTheme.accent,
                textShadow: comboDay >= 7 ? `0 0 20px ${comboTheme.accent}60` : undefined,
              }}
            >
              {comboDay}
            </p>
            <p className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
              COMBO
            </p>
            {consistencyTitle && (
              <p
                className="font-[family-name:var(--font-rajdhani)] text-[8px] font-bold uppercase tracking-widest mt-0.5"
                style={{ color: consistencyTitle.color }}
              >
                {consistencyTitle.title}
              </p>
            )}
            {comboMultiplier > 1 && (
              <p className="font-[family-name:var(--font-geist-mono)] text-[10px] text-[var(--warning)]">
                {comboMultiplier.toFixed(1)}x
              </p>
            )}
          </div>

          <div>
            <p className={`font-[family-name:var(--font-geist-mono)] text-lg font-semibold ${lootColor}`}>
              {lootMultiplier.toFixed(1)}x
            </p>
            <p className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
              LOOT
            </p>
            <p className={`text-[10px] ${lootColor}`}>{lootLabel}</p>
          </div>

          <div>
            <p className="font-[family-name:var(--font-geist-mono)] text-lg font-semibold text-[var(--text-primary)]">
              {questsCompleted}/{questsTotal}
            </p>
            <p className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
              PROTOCOLS
            </p>
          </div>
        </div>

        {/* Today's XP */}
        <div className="text-center">
          <span className="font-[family-name:var(--font-geist-mono)] text-4xl font-bold text-[var(--text-primary)]">
            {todayXp}
          </span>
          <span className="ml-1.5 font-[family-name:var(--font-rajdhani)] text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">
            XP TODAY
          </span>
        </div>
      </div>
    </SystemFrame>
  );
}
