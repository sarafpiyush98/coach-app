"use client";

import { useEffect, useState } from "react";
import { format, subDays, differenceInDays } from "date-fns";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import {
  Flame,
  Trophy,
  Swords,
  Shield,
  Crown,
  Zap,
  Target,
  TrendingDown,
  Award,
  Lock,
  CheckCircle2,
  Star,
  Dumbbell,
  Moon,
  Brain,
  Sparkles,
  RotateCcw,
  Sunrise,
  ChevronRight,
} from "lucide-react";
import type { DailyLog } from "@/lib/types";
import {
  type Rank,
  type BossFight,
  type ComebackStatus,
  type LootRarity,
  LOOT_COLORS,
  LOOT_BG_COLORS,
  WEEKLY_GRADE_COLORS,
  WEEKLY_GRADE_LABELS,
  type WeeklyGrade,
  ACHIEVEMENT_TIER_COLORS,
  ACHIEVEMENT_TIER_BG,
  BOSS_FIGHTS,
} from "@/lib/gamification";

const START_DATE = new Date(2026, 2, 28); // March 28, 2026
const START_WEIGHT = 128;
const TARGET_WEIGHT = 95;

// Icon map for achievement icons
const ICON_MAP: Record<string, typeof Flame> = {
  flame: Flame,
  swords: Swords,
  shield: Shield,
  crown: Crown,
  zap: Zap,
  trophy: Trophy,
  star: Star,
  award: Award,
  dumbbell: Dumbbell,
  moon: Moon,
  brain: Brain,
  utensils: Target,
  clipboard: CheckCircle2,
  "rotate-ccw": RotateCcw,
  sunrise: Sunrise,
  sparkles: Sparkles,
};

const RANK_ICON_MAP: Record<string, typeof Flame> = {
  shield: Shield,
  swords: Swords,
  flame: Flame,
  crown: Crown,
  zap: Zap,
  trophy: Trophy,
  star: Star,
};

// --- Interfaces matching API response ---
interface GamificationData {
  profile: {
    totalXp: number;
    level: number;
    xpIntoLevel: number;
    xpNeeded: number;
    levelProgress: number;
    rank: Rank;
    nextRank: Rank | null;
    totalWorkouts: number;
    totalMealsLogged: number;
    totalPrs: number;
    bestExerciseStreak: number;
    bestLoggingStreak: number;
    bestCombo: number;
    consecutiveGoodWeeks: number;
  };
  boss: {
    targetWeight: number;
    name: string;
    taunt: string;
    defeatedQuote: string;
    tier: string;
    currentWeight: number;
    hpPercent: number;
    kgRemaining: number;
  } | null;
  comeback: ComebackStatus;
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    tier: string;
    category: string;
    icon: string;
    flavor: string;
    hidden: boolean;
    unlocked: boolean;
  }>;
  unlockedCount: number;
  totalAchievements: number;
  recentXp: Array<{
    date: string;
    base_xp: number;
    combo_multiplier: number;
    loot_multiplier: number;
    loot_rarity: string | null;
    total_xp: number;
  }>;
  quote: { text: string; source: string; category: string };
}

// --- MAIN PAGE ---

export default function ProgressPage() {
  const [gData, setGData] = useState<GamificationData | null>(null);
  const [history, setHistory] = useState<DailyLog[]>([]);
  const [weights, setWeights] = useState<{ date: string; weight_kg: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date();
    const start = format(subDays(today, 89), "yyyy-MM-dd");
    const end = format(today, "yyyy-MM-dd");

    Promise.all([
      fetch("/api/gamification").then((r) => r.json()),
      fetch(`/api/history?start=${start}&end=${end}`).then((r) => r.json()),
      fetch("/api/progress").then((r) => r.json()),
    ])
      .then(([gam, hist, prog]) => {
        setGData(gam.data ?? gam);
        const histData = hist.data ?? hist;
        setHistory(Array.isArray(histData) ? histData : []);
        const progData = prog.data ?? prog;
        setWeights(progData?.weight_history ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-36 bg-[#0A0F1A] rounded-xl border border-[rgba(245,158,11,0.04)] animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!gData) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-6">
        <p className="text-muted-foreground text-sm text-center py-12">
          Run the gamification SQL schema first.
        </p>
      </div>
    );
  }

  const { profile, boss, comeback, achievements, quote, recentXp } = gData;
  const dayNumber = differenceInDays(new Date(), START_DATE) + 1;
  const latestWeight =
    weights.length > 0
      ? weights[weights.length - 1].weight_kg
      : boss?.currentWeight ?? START_WEIGHT;
  const totalLost = START_WEIGHT - latestWeight;
  const totalToGo = latestWeight - TARGET_WEIGHT;
  const journeyPct = Math.max(
    0,
    Math.min((totalLost / (START_WEIGHT - TARGET_WEIGHT)) * 100, 100)
  );

  // Heatmap data
  const today = new Date();
  type DayStatus = "good" | "ok" | "missed" | "future" | "rest";
  const heatmapDays: { date: Date; status: DayStatus }[] = [];
  for (let i = 89; i >= 0; i--) {
    const d = subDays(today, i);
    const dateStr = format(d, "yyyy-MM-dd");
    const log = history.find((h) => h.date === dateStr);
    if (i === 0 && !log) {
      heatmapDays.push({ date: d, status: "future" });
    } else if (!log) {
      // Check if Sunday (rest day)
      heatmapDays.push({ date: d, status: d.getDay() === 0 ? "rest" : "missed" });
    } else if (log.meals_logged && log.workout_done) {
      heatmapDays.push({ date: d, status: "good" });
    } else if (log.meals_logged) {
      heatmapDays.push({ date: d, status: "ok" });
    } else {
      heatmapDays.push({ date: d, status: "missed" });
    }
  }

  const RankIcon = RANK_ICON_MAP[profile.rank.icon] ?? Shield;

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4 space-y-4">
      {/* Daily Quote */}
      <div className="animate-slide-up stagger-1 text-center py-2">
        <p className="text-xs italic text-muted-foreground/70 leading-relaxed">
          &ldquo;{quote.text}&rdquo;
        </p>
        <p className="text-[10px] text-amber-400/40 mt-1">{quote.source}</p>
      </div>

      {/* Comeback Banner */}
      {comeback.isComeback && (
        <Card className="animate-slide-up border-amber-500/20 bg-amber-500/[0.03]">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <RotateCcw size={18} className="text-amber-400 mt-0.5 shrink-0" />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-amber-400">
                    Welcome Back
                  </span>
                  {comeback.comebackBonusMultiplier > 1 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {comeback.comebackBonusMultiplier}x XP bonus
                    </span>
                  )}
                  {comeback.freshStartLabel && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {comeback.freshStartLabel}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{comeback.message}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rank + Level Card */}
      <Card className="animate-slide-up stagger-1 card-glow border-[rgba(245,158,11,0.06)] overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.02] via-transparent to-purple-500/[0.02]" />
        <CardContent className="relative pt-5 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl bg-[#111827] ${profile.rank.glowClass}`}
              >
                <RankIcon size={26} className={profile.rank.color} />
              </div>
              <div>
                <div className="text-[10px] tracking-widest uppercase text-muted-foreground/50">
                  Rank
                </div>
                <div className={`text-xl font-black ${profile.rank.color}`}>
                  {profile.rank.title}
                </div>
                <div className="text-[10px] text-muted-foreground/40 italic mt-0.5 max-w-[200px]">
                  {profile.rank.subtitle}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] tracking-widest uppercase text-muted-foreground/50">
                Level
              </div>
              <div className="text-4xl font-black tabular-nums text-white glow-amber">
                {profile.level}
              </div>
            </div>
          </div>

          {/* XP bar */}
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground/60 mb-1.5 tabular-nums">
              <span>{profile.totalXp.toLocaleString()} XP total</span>
              <span>
                {profile.xpIntoLevel} / {profile.xpNeeded} to Level{" "}
                {profile.level + 1}
              </span>
            </div>
            <div className="relative h-2.5 w-full rounded-full bg-[#111827] overflow-hidden">
              <div
                className="h-full rounded-full progress-amber transition-all duration-700 ease-out"
                style={{ width: `${profile.levelProgress}%` }}
              />
              {profile.levelProgress > 3 && (
                <div
                  className="absolute top-0 h-full w-4 rounded-full bg-white/20 blur-sm"
                  style={{
                    left: `${Math.max(profile.levelProgress - 3, 0)}%`,
                  }}
                />
              )}
            </div>
            {profile.nextRank && (
              <div className="text-[10px] text-muted-foreground/40 mt-1.5">
                Next rank:{" "}
                <span className={profile.nextRank.color}>
                  {profile.nextRank.title}
                </span>{" "}
                at Level {profile.nextRank.level}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* The Journey */}
      <Card className="animate-slide-up stagger-2 card-glow border-[rgba(245,158,11,0.06)]">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <Target size={16} className="text-amber-400" />
            <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
              The Journey
            </span>
            <span className="ml-auto text-xs tabular-nums text-muted-foreground">
              Day {dayNumber}
            </span>
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>{START_WEIGHT}kg</span>
            <span className="tabular-nums">
              {totalLost > 0
                ? `${totalLost.toFixed(1)}kg slain`
                : "Starting out"}{" "}
              &middot; {totalToGo.toFixed(1)}kg to go
            </span>
            <span className="text-amber-400 font-bold">{TARGET_WEIGHT}kg</span>
          </div>
          {/* Journey progress bar with boss markers */}
          <div className="relative h-4 w-full rounded-full bg-[#111827] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 transition-all duration-1000 ease-out"
              style={{ width: `${Math.max(journeyPct, 0.5)}%` }}
            />
            {BOSS_FIGHTS.map((b) => {
              const pct =
                ((START_WEIGHT - b.targetWeight) /
                  (START_WEIGHT - TARGET_WEIGHT)) *
                100;
              const beaten = latestWeight <= b.targetWeight;
              return (
                <div
                  key={b.targetWeight}
                  className="absolute top-0 h-full"
                  style={{ left: `${pct}%` }}
                >
                  <div
                    className={`w-0.5 h-full ${beaten ? "bg-emerald-400/50" : "bg-red-500/30"}`}
                  />
                </div>
              );
            })}
            {journeyPct > 0 && (
              <div
                className="absolute top-0 h-full w-6 bg-amber-400/30 blur-md"
                style={{ left: `${Math.max(journeyPct - 4, 0)}%` }}
              />
            )}
          </div>
          <div className="relative h-4 mt-0.5">
            {BOSS_FIGHTS.map((b) => {
              const pct =
                ((START_WEIGHT - b.targetWeight) /
                  (START_WEIGHT - TARGET_WEIGHT)) *
                100;
              const beaten = latestWeight <= b.targetWeight;
              return (
                <div
                  key={b.targetWeight}
                  className="absolute text-[8px] -translate-x-1/2"
                  style={{ left: `${pct}%` }}
                >
                  <span
                    className={
                      beaten
                        ? "text-emerald-400/50 line-through"
                        : "text-muted-foreground/30"
                    }
                  >
                    {b.targetWeight}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Boss Fight */}
      {boss && (
        <Card className="animate-slide-up stagger-2 border-red-500/10 bg-gradient-to-br from-[#0A0F1A] to-[#100A18] overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/[0.03] rounded-full blur-3xl" />
          <CardContent className="relative pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Swords size={16} className="text-red-400" />
              <span className="text-[10px] font-semibold tracking-wider uppercase text-red-400/50">
                {boss.tier === "final" ? "Final Boss" : "Boss Fight"}
              </span>
            </div>
            <div className="flex justify-between items-baseline mb-1">
              <div className="text-lg font-black text-red-400">{boss.name}</div>
              <div className="text-xs text-muted-foreground tabular-nums">
                {boss.currentWeight.toFixed(1)}kg → {boss.targetWeight}kg
              </div>
            </div>
            <div className="text-[10px] text-red-400/30 italic mb-3">
              &ldquo;{boss.taunt}&rdquo;
            </div>
            {/* Boss HP */}
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-red-400/50">Boss HP</span>
              <span className="text-red-400/50 tabular-nums">
                {boss.kgRemaining.toFixed(1)}kg remaining
              </span>
            </div>
            <div className="relative h-3 w-full rounded-full bg-[#111827] overflow-hidden">
              <div
                className="h-full rounded-full progress-red transition-all duration-700"
                style={{ width: `${boss.hpPercent}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent XP Log */}
      {recentXp.length > 0 && (
        <Card className="animate-slide-up stagger-3 card-glow border-[rgba(245,158,11,0.06)]">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={16} className="text-amber-400" />
              <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                Recent XP
              </span>
            </div>
            <div className="space-y-1.5">
              {recentXp.map((xp, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-[#0A0F1A]"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {format(new Date(xp.date), "MMM d")}
                    </span>
                    {xp.loot_rarity && xp.loot_rarity !== "common" && (
                      <span
                        className={`text-[9px] px-1 py-0.5 rounded border ${LOOT_BG_COLORS[xp.loot_rarity as LootRarity] ?? ""} ${LOOT_COLORS[xp.loot_rarity as LootRarity] ?? ""}`}
                      >
                        {xp.loot_rarity}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {xp.combo_multiplier > 1 && (
                      <span className="text-[9px] text-orange-400 tabular-nums">
                        {xp.combo_multiplier}x combo
                      </span>
                    )}
                    <span className="text-sm font-bold tabular-nums text-amber-400">
                      +{xp.total_xp}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weight Chart */}
      <WeightChart data={weights} />

      {/* Streak Heatmap */}
      <HeatmapCard days={heatmapDays} />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <StatCard
          label="Total Workouts"
          value={profile.totalWorkouts}
          icon={<Dumbbell size={14} className="text-amber-400" />}
        />
        <StatCard
          label="Personal Records"
          value={profile.totalPrs}
          icon={<Trophy size={14} className="text-amber-400" />}
        />
        <StatCard
          label="Best Streak"
          value={profile.bestExerciseStreak}
          sub="days"
          icon={<Flame size={14} className="text-orange-400" />}
        />
        <StatCard
          label="Best Combo"
          value={profile.bestCombo}
          sub="days"
          icon={<Zap size={14} className="text-purple-400" />}
        />
      </div>

      {/* Achievements */}
      <AchievementsCard
        achievements={achievements}
        unlockedCount={gData.unlockedCount}
        total={gData.totalAchievements}
      />
    </div>
  );
}

// --- SUB-COMPONENTS ---

function WeightChart({
  data,
}: {
  data: { date: string; weight_kg: number }[];
}) {
  if (data.length === 0) {
    return (
      <Card className="animate-slide-up stagger-3 card-glow border-[rgba(245,158,11,0.06)]">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown size={16} className="text-amber-400" />
            <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
              Weight
            </span>
          </div>
          <div className="h-36 flex items-center justify-center">
            <p className="text-xs text-muted-foreground/40">
              Weigh in on Monday to start the chart
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    date: format(new Date(d.date), "MMM d"),
    weight: d.weight_kg,
  }));
  const allW = data.map((d) => d.weight_kg);
  const minW = Math.floor(Math.min(...allW) - 2);
  const maxW = Math.ceil(Math.max(...allW) + 2);

  return (
    <Card className="animate-slide-up stagger-3 card-glow border-[rgba(245,158,11,0.06)]">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown size={16} className="text-amber-400" />
          <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
            Weight
          </span>
          {data.length >= 2 && (
            <span className="ml-auto text-xs tabular-nums text-emerald-400 glow-green">
              {(data[0].weight_kg - data[data.length - 1].weight_kg).toFixed(1)}
              kg lost
            </span>
          )}
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fill: "#4B5563", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[minW, maxW]}
                tick={{ fill: "#4B5563", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip
                contentStyle={{
                  background: "#0A0F1A",
                  border: "1px solid rgba(245,158,11,0.15)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#F8FAFC",
                }}
              />
              <Area
                type="monotone"
                dataKey="weight"
                stroke="#F59E0B"
                strokeWidth={2}
                fill="url(#wGrad)"
                dot={{ fill: "#F59E0B", r: 3, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "#FBBF24", stroke: "#F59E0B", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function HeatmapCard({
  days,
}: {
  days: { date: Date; status: string }[];
}) {
  const statusColors: Record<string, string> = {
    good: "bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.4)]",
    ok: "bg-amber-500/80",
    rest: "bg-blue-500/20",
    missed: "bg-red-500/25",
    future: "bg-[#111827]",
  };

  const goodCount = days.filter((d) => d.status === "good").length;
  const okCount = days.filter((d) => d.status === "ok").length;
  const restCount = days.filter((d) => d.status === "rest").length;

  const firstDayOfWeek = (days[0].date.getDay() + 6) % 7;
  const padded = Array.from({ length: firstDayOfWeek }, () => null);

  return (
    <Card className="animate-slide-up stagger-4 card-glow border-[rgba(245,158,11,0.06)]">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame size={16} className="text-amber-400" />
            <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
              90-Day Map
            </span>
          </div>
          <div className="flex gap-2.5 text-[9px] text-muted-foreground/60">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-emerald-500" />
              {goodCount}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-amber-500/80" />
              {okCount}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-blue-500/20" />
              {restCount} rest
            </span>
          </div>
        </div>
        <div className="grid grid-flow-col grid-rows-7 gap-[3px]">
          {padded.map((_, i) => (
            <div key={`p-${i}`} className="w-[10px] h-[10px]" />
          ))}
          {days.map((day, i) => (
            <div
              key={i}
              className={`w-[10px] h-[10px] rounded-[2px] ${statusColors[day.status] ?? statusColors.missed}`}
              title={`${format(day.date, "MMM d")}: ${day.status}`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: number;
  sub?: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="card-glow border-[rgba(245,158,11,0.06)]">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-1.5 mb-2">
          {icon}
          <span className="text-[10px] tracking-wider uppercase text-muted-foreground font-medium">
            {label}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black tabular-nums text-white">
            {value}
          </span>
          {sub && (
            <span className="text-xs text-muted-foreground">{sub}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AchievementsCard({
  achievements,
  unlockedCount,
  total,
}: {
  achievements: GamificationData["achievements"];
  unlockedCount: number;
  total: number;
}) {
  // Group by tier
  const tiers = ["diamond", "gold", "silver", "bronze"] as const;

  return (
    <Card className="animate-slide-up stagger-5 card-glow border-[rgba(245,158,11,0.06)]">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={16} className="text-amber-400" />
          <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
            Achievements
          </span>
          <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
            {unlockedCount} / {total}
          </span>
        </div>

        <div className="space-y-3">
          {tiers.map((tier) => {
            const tierAchievements = achievements.filter(
              (a) => a.tier === tier
            );
            if (tierAchievements.length === 0) return null;

            return (
              <div key={tier}>
                <div
                  className={`text-[10px] font-semibold tracking-wider uppercase mb-1.5 ${ACHIEVEMENT_TIER_COLORS[tier]}`}
                >
                  {tier}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {tierAchievements.map((a) => {
                    const IconComp = ICON_MAP[a.icon] ?? Star;
                    return (
                      <div
                        key={a.id}
                        className={`rounded-lg border p-2.5 transition-all duration-200 ${
                          a.unlocked
                            ? `${ACHIEVEMENT_TIER_BG[a.tier]}`
                            : "border-[rgba(245,158,11,0.04)] bg-[#0A0F1A] opacity-50"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {a.unlocked ? (
                            <IconComp
                              size={14}
                              className={`${ACHIEVEMENT_TIER_COLORS[a.tier]} mt-0.5 shrink-0`}
                            />
                          ) : (
                            <Lock
                              size={14}
                              className="text-[#374151] mt-0.5 shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <div
                              className={`text-[11px] font-semibold truncate ${a.unlocked ? ACHIEVEMENT_TIER_COLORS[a.tier] : "text-muted-foreground/50"}`}
                            >
                              {a.title}
                            </div>
                            <div className="text-[9px] text-muted-foreground/40 truncate">
                              {a.description}
                            </div>
                          </div>
                        </div>
                        {a.unlocked && a.flavor && (
                          <div className="text-[9px] text-muted-foreground/30 italic mt-1.5 leading-relaxed">
                            {a.flavor}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
