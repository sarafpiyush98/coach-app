"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { SystemPanel } from "@/components/ui/system-panel";
import { XPRing } from "@/components/ui/xp-ring";
import { StatBar } from "@/components/ui/stat-bar";
import { STAT_COLORS } from "@/lib/stats";
import type { PlayerStats } from "@/lib/stats";
import type { HunterRank } from "@/lib/ranks";

interface ShadowSoldier {
  id: string;
  name: string;
  unlockCondition: string;
  benefit: string;
  unlocked: boolean;
}

interface StatusData {
  profile: {
    totalXp: number;
    level: number;
    xpIntoLevel: number;
    xpNeeded: number;
    levelProgress: number;
    rank: { title: string };
  };
  hunterRank: HunterRank;
  nextHunterRank: { rank: HunterRank; levelsRemaining: number } | null;
  stats: PlayerStats;
  statTotal: number;
  distributablePoints: number;
  shadows: ShadowSoldier[];
  unlockedCount: number;
  totalAchievements: number;
}

function HunterRankBadge({ rank }: { rank: HunterRank }) {
  return (
    <div
      className="flex items-center justify-center w-16 h-18"
      style={{
        filter:
          rank.glow !== "none"
            ? `drop-shadow(0 0 8px ${rank.color}80) drop-shadow(0 0 16px ${rank.color}40)`
            : undefined,
      }}
    >
      <div
        className="w-14 h-16 flex items-center justify-center"
        style={{
          clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
          background: `linear-gradient(135deg, ${rank.color}33, ${rank.color}88)`,
          border: `1px solid ${rank.color}`,
        }}
      >
        <span
          className="font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase tracking-wide"
          style={{ color: rank.color }}
        >
          {rank.title.split("-")[0] || rank.title.split(" ")[0]}
        </span>
      </div>
    </div>
  );
}

function ShadowCard({
  shadow,
  index,
}: {
  shadow: ShadowSoldier;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 * index, duration: 0.3 }}
      className={`flex flex-col items-center gap-1 p-3 rounded-lg border ${
        shadow.unlocked
          ? "border-[#463671]/50 bg-[#463671]/10"
          : "border-[#1A1A2E] bg-[#0A1543]/30 opacity-50"
      }`}
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center ${
          shadow.unlocked
            ? "bg-[#463671]/30 shadow-[0_0_12px_rgba(70,54,113,0.5)]"
            : "bg-[#0A1543]"
        }`}
      >
        <span className="text-lg">{shadow.unlocked ? "⚔" : "?"}</span>
      </div>
      <span className="font-[family-name:var(--font-rajdhani)] text-[11px] font-bold uppercase tracking-wider text-[#FBEFFA]">
        {shadow.unlocked ? shadow.name : "???"}
      </span>
      <span className="text-[9px] text-[#4A5568] text-center leading-tight">
        {shadow.unlocked ? shadow.benefit : shadow.unlockCondition}
      </span>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto pt-6 pb-24 animate-pulse">
      <div className="h-5 w-40 mx-auto bg-[#0A1543] rounded" />
      <div className="h-48 bg-[#0A1543] rounded-lg" />
      <div className="h-40 bg-[#0A1543] rounded-lg" />
      <div className="h-32 bg-[#0A1543] rounded-lg" />
      <div className="h-10 bg-[#0A1543] rounded-lg" />
    </div>
  );
}

export default function StatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/gamification")
      .then((r) => r.json())
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading || !data) return <LoadingSkeleton />;

  const { profile, hunterRank, nextHunterRank, stats, statTotal, distributablePoints, shadows, unlockedCount, totalAchievements } = data;
  const statMax = Math.max(profile.level * 5, 20);

  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto pt-6 pb-24">
      {/* Header */}
      <h1 className="font-[family-name:var(--font-rajdhani)] text-lg font-bold uppercase tracking-[0.2em] text-center text-[#4A5568]">
        Status Window
      </h1>

      {/* Player Card */}
      <SystemPanel className="p-5">
        <div className="flex items-center gap-5">
          <HunterRankBadge rank={hunterRank} />
          <div className="flex-1 flex flex-col items-center">
            <XPRing
              level={profile.level}
              xpProgress={profile.levelProgress / 100}
              rank={hunterRank.title}
              size={120}
            />
          </div>
        </div>
        {nextHunterRank && (
          <p className="mt-3 text-center font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase tracking-widest text-[#4A5568]">
            Next: {nextHunterRank.rank.title} — {nextHunterRank.levelsRemaining} levels
          </p>
        )}
      </SystemPanel>

      {/* Stat Panel */}
      <SystemPanel className="p-5">
        <div className="flex flex-col gap-3">
          {(Object.keys(stats) as (keyof PlayerStats)[]).map((stat) => (
            <StatBar
              key={stat}
              label={stat}
              value={stats[stat]}
              max={statMax}
              color={STAT_COLORS[stat]}
            />
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase tracking-widest text-[#4A5568]">
            Power
          </span>
          <span className="font-[family-name:var(--font-geist-mono)] text-lg font-semibold text-[#FBEFFA]">
            {statTotal}
          </span>
        </div>
        {distributablePoints > 0 && (
          <div className="mt-2 text-center">
            <span
              className="inline-block font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase tracking-widest text-[#FFC107]"
              style={{ textShadow: "0 0 8px rgba(255,193,7,0.5)" }}
            >
              Unallocated: {distributablePoints}
            </span>
          </div>
        )}
      </SystemPanel>

      {/* Shadow Army */}
      <SystemPanel variant="purple" className="p-5">
        <h2 className="font-[family-name:var(--font-rajdhani)] text-sm font-bold uppercase tracking-[0.15em] text-[#FBEFFA] mb-3">
          Shadow Army
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {shadows.map((s, i) => (
            <ShadowCard key={s.id} shadow={s} index={i} />
          ))}
        </div>
      </SystemPanel>

      {/* Achievements summary */}
      <SystemPanel className="p-4">
        <div className="flex items-center justify-between">
          <span className="font-[family-name:var(--font-rajdhani)] text-sm font-bold uppercase tracking-[0.15em] text-[#FBEFFA]">
            Achievements
          </span>
          <span className="font-[family-name:var(--font-geist-mono)] text-sm text-[#4A5568]">
            {unlockedCount}/{totalAchievements} unlocked
          </span>
        </div>
      </SystemPanel>
    </div>
  );
}
