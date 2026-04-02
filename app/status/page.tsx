"use client";

import { useState } from "react";
import { Lock, Sword, ChevronRight } from "lucide-react";
import { SystemFrame } from "@/components/ui/system-frame";
import { SystemPanel } from "@/components/ui/system-panel";
import { RadarChart } from "@/components/ui/radar-chart";
import { XPRing } from "@/components/ui/xp-ring";
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

const STAT_DRIVERS: Record<string, string> = {
  STR: "Workouts + PRs",
  AGI: "Workouts + Check-ins",
  VIT: "Fasting Streaks + Logging",
  INT: "Meals Logged + Good Weeks",
  DSC: "Streaks + Combo + Level",
};

function HunterRankBadge({ rank }: { rank: HunterRank }) {
  return (
    <div
      className="flex items-center justify-center"
      style={{
        filter:
          rank.glow !== "none"
            ? `drop-shadow(0 0 6px ${rank.color}60)`
            : undefined,
      }}
    >
      <div
        className="w-14 h-16 flex items-center justify-center"
        style={{
          clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
          background: `linear-gradient(135deg, ${rank.color}33, ${rank.color}88)`,
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

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto pt-6 pb-24 animate-pulse">
      <div className="h-5 w-40 mx-auto bg-[var(--surface-1)] rounded" />
      <div className="h-[600px] bg-[var(--surface-1)] rounded-lg" />
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
  const statKeys = Object.keys(stats) as (keyof PlayerStats)[];

  const radarStats = statKeys.map((key) => ({
    label: key,
    value: stats[key],
    max: statMax,
  }));

  return (
    <div className="max-w-lg mx-auto px-4 pt-8 pb-24">
      {/* Level-up banner when distributable points are available */}
      {distributablePoints > 0 && (
        <SystemPanel className="p-3 border-[var(--accent-gold)] border mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase tracking-[0.15em] text-[#FFC107]">
                {distributablePoints} Stat Points Available
              </p>
              <p className="font-[family-name:var(--font-rajdhani)] text-[9px] uppercase tracking-widest text-[var(--text-muted)]">
                The System grants power. Distribute wisely.
              </p>
            </div>
            <span className="text-[#FFC107] text-lg">+</span>
          </div>
        </SystemPanel>
      )}

      {/* ONE SystemFrame containing the entire character sheet */}
      <SystemFrame>
        {/* Section 1: Identity Block */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="font-[family-name:var(--font-rajdhani)] text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
              STATUS WINDOW
            </h1>
            <div className="space-y-1">
              <div className="flex gap-6">
                <span className="font-[family-name:var(--font-rajdhani)] text-[11px] uppercase tracking-wider text-[var(--text-muted)] w-12">LV</span>
                <span className="font-[family-name:var(--font-geist-mono)] text-sm text-[var(--text-primary)]">{profile.level}</span>
              </div>
              <div className="flex gap-6">
                <span className="font-[family-name:var(--font-rajdhani)] text-[11px] uppercase tracking-wider text-[var(--text-muted)] w-12">CLASS</span>
                <span className="font-[family-name:var(--font-rajdhani)] text-sm font-bold uppercase text-[var(--text-primary)]">HUNTER</span>
              </div>
              <div className="flex gap-6">
                <span className="font-[family-name:var(--font-rajdhani)] text-[11px] uppercase tracking-wider text-[var(--text-muted)] w-12">RANK</span>
                <div>
                  <span className="font-[family-name:var(--font-rajdhani)] text-sm font-bold uppercase text-[var(--text-primary)]">{hunterRank.title}</span>
                  <p className="font-[family-name:var(--font-rajdhani)] text-[9px] uppercase tracking-widest text-[var(--text-muted)]/60">
                    {hunterRank.benefit}
                  </p>
                  {nextHunterRank && (
                    <p className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--text-muted)]">
                      NEXT: {nextHunterRank.rank.title} — {nextHunterRank.levelsRemaining} levels
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          <HunterRankBadge rank={hunterRank} />
        </div>

        {/* XP Bar */}
        <div className="mt-4">
          <div className="h-[3px] w-full rounded-full bg-[var(--surface-3)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--accent-blue)]"
              style={{ width: `${profile.levelProgress}%` }}
            />
          </div>
          <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-xs text-[var(--text-secondary)]">
            XP  {profile.xpIntoLevel} / {profile.xpNeeded}
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-[var(--border-subtle)] my-6" />

        {/* Section 2: Radar Chart */}
        <div className="flex flex-col items-center">
          <RadarChart stats={radarStats} size={220} />
          <div className="mt-3 text-center">
            <span className="font-[family-name:var(--font-rajdhani)] text-[11px] uppercase tracking-[0.15em] text-[var(--text-muted)]">POWER  </span>
            <span className="font-[family-name:var(--font-geist-mono)] text-base font-semibold text-[var(--text-primary)]">{statTotal}</span>
          </div>
          {distributablePoints > 0 && (
            <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-xs text-[var(--accent-blue)]">
              +{distributablePoints} AVAILABLE
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-[var(--border-subtle)] my-6" />

        {/* Section 3: Stat Readout */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          {statKeys.map((stat) => (
            <div key={stat} className="flex items-center gap-3">
              <div className="w-8">
                <span className="font-[family-name:var(--font-rajdhani)] text-[11px] uppercase tracking-wider text-[var(--text-muted)]">{stat}</span>
                <p className="font-[family-name:var(--font-rajdhani)] text-[8px] uppercase tracking-widest text-[var(--text-muted)]/60">
                  {STAT_DRIVERS[stat]}
                </p>
              </div>
              <span className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums text-[var(--text-primary)] w-6 text-right">{stats[stat]}</span>
              {distributablePoints > 0 && (
                <button
                  onClick={() => allocateStat(stat)}
                  disabled={allocating !== null}
                  className="font-[family-name:var(--font-geist-mono)] text-xs text-[var(--accent-blue)] hover:text-[var(--accent-blue)]/80 active:scale-90 disabled:opacity-40 transition-all"
                >
                  [+]
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-[var(--border-subtle)] my-6" />

        {/* Section 4: Shadow Army */}
        <div>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="font-[family-name:var(--font-rajdhani)] text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">SHADOW ARMY</span>
            <span className="font-[family-name:var(--font-geist-mono)] text-xs text-[var(--text-muted)]">
              {shadows.filter((s) => s.unlocked).length}/{shadows.length}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {shadows.map((s) => (
              <div key={s.id} className="flex flex-col items-center gap-1 text-center">
                {s.unlocked ? (
                  <Sword size={20} className="text-[var(--accent-blue)]" />
                ) : (
                  <Lock size={20} className="text-[var(--text-muted)]" />
                )}
                <span className={`font-[family-name:var(--font-rajdhani)] text-[11px] font-bold uppercase tracking-wider ${s.unlocked ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>
                  {s.unlocked ? s.name : "???"}
                </span>
                <span className="text-[9px] text-[var(--text-muted)] leading-tight">
                  {s.unlocked ? s.benefit : s.unlockCondition}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[var(--border-subtle)] my-6" />

        {/* Section 5: Achievements */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-[family-name:var(--font-rajdhani)] text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">ACHIEVEMENTS</span>
            <span className="font-[family-name:var(--font-geist-mono)] text-xs text-[var(--text-muted)]">
              {unlockedCount}/{totalAchievements}
            </span>
          </div>
          <ChevronRight size={14} className="text-[var(--text-muted)]" />
        </div>
      </SystemFrame>
    </div>
  );
}
