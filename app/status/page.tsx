"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Lock, Sword, ChevronRight } from "lucide-react";
import { SystemPanel } from "@/components/ui/system-panel";
import { XPRing } from "@/components/ui/xp-ring";
import { StatBar } from "@/components/ui/stat-bar";
import { STAT_COLORS } from "@/lib/stats";
import { useCachedFetch } from "@/lib/use-cached-fetch";
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
      className="flex items-center justify-center w-20 h-24"
      style={{
        filter:
          rank.glow !== "none"
            ? `drop-shadow(0 0 8px ${rank.color}80) drop-shadow(0 0 16px ${rank.color}40)`
            : undefined,
      }}
    >
      <div
        className="w-18 h-20 flex items-center justify-center"
        style={{
          clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
          background: `linear-gradient(135deg, ${rank.color}33, ${rank.color}88)`,
          border: `1px solid ${rank.color}`,
          width: "4.5rem",
          height: "5.5rem",
        }}
      >
        <span
          className="font-[family-name:var(--font-rajdhani)] text-sm font-bold uppercase tracking-wide"
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
      className={`flex flex-col items-center gap-1 p-3 rounded-lg ${
        shadow.unlocked
          ? "bg-[var(--surface-1)] border-l-4 border-l-[var(--purple)]"
          : "bg-[var(--surface-1)] opacity-50"
      }`}
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center ${
          shadow.unlocked
            ? "bg-[var(--purple)]/15"
            : "bg-[var(--surface-2)]"
        }`}
      >
        {shadow.unlocked ? (
          <Sword size={18} className="text-[var(--purple)]" />
        ) : (
          <Lock size={14} className="text-[var(--text-muted)]" />
        )}
      </div>
      <span className="font-[family-name:var(--font-rajdhani)] text-[11px] font-bold uppercase tracking-wider text-[var(--text-primary)]">
        {shadow.unlocked ? shadow.name : "???"}
      </span>
      <span className="text-[9px] text-[var(--text-muted)] text-center leading-tight">
        {shadow.unlocked ? shadow.benefit : shadow.unlockCondition}
      </span>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto pt-6 pb-24 animate-pulse">
      <div className="h-5 w-40 mx-auto bg-[var(--surface-1)] rounded" />
      <div className="h-48 bg-[var(--surface-1)] rounded-lg" />
      <div className="h-40 bg-[var(--surface-1)] rounded-lg" />
      <div className="h-32 bg-[var(--surface-1)] rounded-lg" />
      <div className="h-10 bg-[var(--surface-1)] rounded-lg" />
    </div>
  );
}

export default function StatusPage() {
  const { data, loading, refresh } = useCachedFetch<StatusData>(
    "/api/gamification",
    { maxAge: 30000 }
  );
  const [allocating, setAllocating] = useState<string | null>(null);

  const allocateStat = async (stat: keyof PlayerStats) => {
    if (allocating) return;
    setAllocating(stat);
    try {
      const res = await fetch("/api/allocate-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stat, points: 1 }),
      });
      if (res.ok) {
        refresh();
      }
    } finally {
      setAllocating(null);
    }
  };

  if (loading || !data) return <LoadingSkeleton />;

  const { profile, hunterRank, nextHunterRank, stats, statTotal, distributablePoints, shadows, unlockedCount, totalAchievements } = data;
  const statMax = Math.max(profile.level * 5, 20);

  return (
    <div className="flex flex-col gap-6 p-4 max-w-lg mx-auto pt-8 pb-24">
      {/* Header */}
      <h1 className="font-[family-name:var(--font-rajdhani)] text-[11px] font-semibold uppercase tracking-[0.15em] text-center text-[var(--text-muted)]">
        Status Window
      </h1>

      {/* Player Card */}
      <SystemPanel variant="hero" className="p-5">
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
          <p className="mt-3 text-center font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
            Next: {nextHunterRank.rank.title} — {nextHunterRank.levelsRemaining} levels
          </p>
        )}
      </SystemPanel>

      {/* Stat Panel */}
      <SystemPanel className="p-5">
        <div className="flex flex-col gap-3">
          {(Object.keys(stats) as (keyof PlayerStats)[]).map((stat) => (
            <div key={stat} className="flex items-center gap-2">
              <div className="flex-1">
                <StatBar
                  label={stat}
                  value={stats[stat]}
                  max={statMax}
                  color={STAT_COLORS[stat]}
                />
              </div>
              {distributablePoints > 0 && (
                <button
                  onClick={() => allocateStat(stat)}
                  disabled={allocating !== null}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-3)] text-[var(--accent-blue)] text-xs font-bold transition-all hover:bg-[var(--accent-blue)]/20 active:scale-90 disabled:opacity-40"
                >
                  +
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="font-[family-name:var(--font-rajdhani)] text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
            Power
          </span>
          <span className="font-[family-name:var(--font-geist-mono)] text-lg font-semibold text-[var(--text-primary)]">
            {statTotal}
          </span>
        </div>
        {distributablePoints > 0 && (
          <div className="mt-2 text-center">
            <span className="inline-block font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase tracking-widest text-[var(--warning)]">
              Unallocated: {distributablePoints}
            </span>
          </div>
        )}
      </SystemPanel>

      {/* Shadow Army */}
      <div>
        <h2 className="px-1 mb-3 font-[family-name:var(--font-rajdhani)] text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
          Shadow Army
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {shadows.map((s, i) => (
            <ShadowCard key={s.id} shadow={s} index={i} />
          ))}
        </div>
      </div>

      {/* Achievements summary */}
      <SystemPanel className="p-4">
        <div className="flex items-center justify-between">
          <span className="font-[family-name:var(--font-rajdhani)] text-sm font-bold uppercase tracking-[0.15em] text-[var(--text-primary)]">
            Achievements
          </span>
          <div className="flex items-center gap-2">
            <span className="font-[family-name:var(--font-geist-mono)] text-sm text-[var(--text-muted)]">
              {unlockedCount}/{totalAchievements}
            </span>
            <ChevronRight size={14} className="text-[var(--text-muted)]" />
          </div>
        </div>
      </SystemPanel>
    </div>
  );
}
