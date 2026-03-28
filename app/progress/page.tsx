"use client";

import { useMemo } from "react";
import { format, subDays, startOfWeek, isWithinInterval } from "date-fns";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { SystemPanel } from "@/components/ui/system-panel";
import { SystemFrame } from "@/components/ui/system-frame";
import {
  Swords,
  TrendingDown,
  Flame,
  Dumbbell,
  Trophy,
  Zap,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { useCachedFetch } from "@/lib/use-cached-fetch";
import type { DailyLog } from "@/lib/types";
import {
  type ComebackStatus,
  type WeeklyGrade,
  BOSS_FIGHTS,
  getWeeklyGrade,
} from "@/lib/gamification";

const START_WEIGHT = 128;
const START_DATE = new Date(2026, 2, 28);

interface GamificationData {
  profile: {
    totalXp: number;
    level: number;
    xpIntoLevel: number;
    xpNeeded: number;
    levelProgress: number;
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
}

const GRADE_COLORS: Record<WeeklyGrade, string> = {
  S: "text-[var(--warning)]",
  A: "text-[var(--accent-blue)]",
  B: "text-teal-400",
  C: "text-[var(--text-muted)]",
  F: "text-[var(--danger)]",
};

interface HistoryResponse {
  data?: DailyLog[];
  days?: DailyLog[];
}

interface ProgressResponse {
  data?: { weight_history: { date: string; weight_kg: number }[] };
  weight_history?: { date: string; weight_kg: number }[];
}

export default function DungeonPage() {
  const today = useMemo(() => new Date(), []);
  const historyUrl = useMemo(() => {
    const start = format(subDays(today, 89), "yyyy-MM-dd");
    const end = format(today, "yyyy-MM-dd");
    return `/api/history?start=${start}&end=${end}`;
  }, [today]);

  const { data: gData, loading: gLoading } = useCachedFetch<GamificationData>(
    "/api/gamification",
    { maxAge: 30000 }
  );
  const { data: histRaw, loading: hLoading } = useCachedFetch<HistoryResponse | DailyLog[]>(
    historyUrl,
    { maxAge: 30000 }
  );
  const { data: progRaw, loading: pLoading } = useCachedFetch<ProgressResponse>(
    "/api/progress",
    { maxAge: 30000 }
  );

  const loading = gLoading || hLoading || pLoading;
  const history: DailyLog[] = Array.isArray(histRaw)
    ? histRaw
    : (histRaw as HistoryResponse)?.data ?? (histRaw as HistoryResponse)?.days ?? [];
  const weights: { date: string; weight_kg: number }[] =
    (progRaw as ProgressResponse)?.weight_history ??
    (progRaw as ProgressResponse)?.data?.weight_history ?? [];

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-8 space-y-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-36 rounded-xl animate-pulse bg-[var(--surface-1)]"
          />
        ))}
      </div>
    );
  }

  if (!gData) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-8">
        <p className="text-[var(--text-muted)] text-sm text-center py-12 font-[family-name:var(--font-geist-mono)]">
          No data. Run schema first.
        </p>
      </div>
    );
  }

  const { profile, boss } = gData;
  const latestWeight =
    weights.length > 0
      ? weights[weights.length - 1].weight_kg
      : boss?.currentWeight ?? START_WEIGHT;

  // Heatmap data
  type DayStatus = "good" | "ok" | "missed" | "future" | "rest";
  const heatmapDays: { date: Date; status: DayStatus }[] = [];
  for (let i = 89; i >= 0; i--) {
    const d = subDays(today, i);
    const dateStr = format(d, "yyyy-MM-dd");
    const log = history.find((h) => h.date === dateStr);

    if (d < START_DATE) {
      heatmapDays.push({ date: d, status: "future" });
    } else if (i === 0 && !log) {
      heatmapDays.push({ date: d, status: "future" });
    } else if (!log) {
      heatmapDays.push({
        date: d,
        status: d.getDay() === 0 ? "rest" : "missed",
      });
    } else if (log.meals_logged && log.workout_done) {
      heatmapDays.push({ date: d, status: "good" });
    } else if (log.meals_logged) {
      heatmapDays.push({ date: d, status: "ok" });
    } else {
      heatmapDays.push({ date: d, status: "missed" });
    }
  }

  // Weekly grade
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekActiveDays = history.filter((h) => {
    const d = new Date(h.date);
    return (
      isWithinInterval(d, { start: weekStart, end: today }) &&
      (h.meals_logged || h.workout_done)
    );
  }).length;
  const weekGrade = getWeeklyGrade(weekActiveDays);
  const weekScore = Math.round((weekActiveDays / 7) * 100);

  const allBossesDefeated = BOSS_FIGHTS.every(
    (b) => latestWeight <= b.targetWeight
  );

  return (
    <div className="max-w-lg mx-auto px-4 pt-8 pb-24 space-y-6">
      {/* Header */}
      <h1 className="font-[family-name:var(--font-rajdhani)] text-[11px] font-semibold tracking-[0.15em] uppercase text-center text-[var(--text-muted)]">
        DUNGEON
      </h1>

      {/* Active Boss Fight — SystemFrame */}
      {allBossesDefeated ? (
        <SystemFrame>
          <div className="text-center space-y-2">
            <div className="font-[family-name:var(--font-rajdhani)] text-xl font-bold text-[var(--warning)]">
              ALL BOSSES DEFEATED.
            </div>
            <div className="font-[family-name:var(--font-rajdhani)] text-sm text-[var(--warning)]/60">
              THE DUNGEON IS CLEAR.
            </div>
          </div>
        </SystemFrame>
      ) : boss ? (
        <SystemFrame>
          <div className="relative">
            {/* Boss tier badge */}
            <div className="absolute top-0 right-0 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-[var(--danger)]/20 text-[var(--danger)]/50 bg-[var(--danger)]/5">
              {boss.tier}
            </div>

            <div className="font-[family-name:var(--font-rajdhani)] text-2xl font-bold text-[var(--text-primary)] uppercase tracking-wide mb-1">
              {boss.name}
            </div>
            <div className="text-sm italic text-[var(--text-muted)] mb-4">
              &ldquo;{boss.taunt}&rdquo;
            </div>

            {/* HP Bar with shimmer */}
            <div className="space-y-1.5">
              <div className="relative h-1.5 w-full rounded-full bg-[var(--surface-0)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--danger)] to-[#ff6666] transition-all duration-700 hp-shimmer"
                  style={{ width: `${boss.hpPercent}%` }}
                />
              </div>
              <div className="font-[family-name:var(--font-geist-mono)] text-xs text-[var(--danger)]/60">
                HP: {boss.kgRemaining.toFixed(1)} kg remaining
              </div>
            </div>
          </div>
        </SystemFrame>
      ) : null}

      {/* Boss Progression Timeline */}
      <SystemPanel className="p-5">
        <div className="flex items-center justify-between">
          {BOSS_FIGHTS.map((b, i) => {
            const defeated = latestWeight <= b.targetWeight;
            const isActive = boss?.targetWeight === b.targetWeight;

            return (
              <div key={b.targetWeight} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                      defeated
                        ? "border-[var(--success)] bg-[var(--success)]/10"
                        : isActive
                          ? "border-[var(--danger)] bg-[var(--danger)]/10 animate-pulse"
                          : "border-[var(--text-muted)]/20 bg-[var(--surface-0)]"
                    }`}
                  >
                    {defeated ? (
                      <CheckCircle2 size={18} className="text-[var(--success)]" />
                    ) : isActive ? (
                      <Swords size={18} className="text-[var(--danger)]" />
                    ) : (
                      <Lock size={14} className="text-[var(--text-muted)]/40" />
                    )}
                  </div>
                  <div
                    className={`mt-1.5 text-[9px] font-[family-name:var(--font-rajdhani)] font-bold uppercase leading-tight text-center max-w-[60px] ${
                      defeated
                        ? "text-[var(--success)]/70"
                        : isActive
                          ? "text-[var(--text-primary)]/80"
                          : "text-[var(--text-muted)]/40"
                    }`}
                  >
                    {b.name.replace("The ", "")}
                  </div>
                  <div
                    className={`text-[9px] font-[family-name:var(--font-geist-mono)] ${
                      defeated
                        ? "text-[var(--success)]/40 line-through"
                        : "text-[var(--text-muted)]/30"
                    }`}
                  >
                    {b.targetWeight}kg
                  </div>
                </div>
                {i < BOSS_FIGHTS.length - 1 && (
                  <div
                    className={`h-0.5 w-6 mx-1 mt-[-20px] ${
                      defeated ? "bg-[var(--success)]/30" : "bg-[var(--text-muted)]/15"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </SystemPanel>

      {/* Weight Chart */}
      <WeightChart data={weights} />

      {/* 90-Day Heatmap */}
      <HeatmapCard days={heatmapDays} />

      {/* Weekly Grade — SystemFrame */}
      <SystemFrame>
        <div className="text-center space-y-1">
          <div className="font-[family-name:var(--font-rajdhani)] text-[11px] font-semibold tracking-[0.15em] uppercase text-[var(--text-muted)]">
            WEEK GRADE
          </div>
          <div
            className={`font-[family-name:var(--font-rajdhani)] text-[72px] leading-none font-black ${GRADE_COLORS[weekGrade]}`}
          >
            {weekGrade}
          </div>
          <div className="font-[family-name:var(--font-geist-mono)] text-sm text-[var(--text-muted)]">
            {weekScore}/100
          </div>
        </div>
      </SystemFrame>

      {/* Stats Grid — ONE container, divided by thin lines */}
      <div className="rounded-lg bg-[var(--surface-1)] grid grid-cols-2">
        <StatCell
          label="Total Workouts"
          value={profile.totalWorkouts}
          icon={<Dumbbell size={14} className="text-[var(--accent-blue)]" />}
          className="border-r border-b border-[var(--border-subtle)]"
        />
        <StatCell
          label="Personal Records"
          value={profile.totalPrs}
          icon={<Trophy size={14} className="text-[var(--warning)]" />}
          className="border-b border-[var(--border-subtle)]"
        />
        <StatCell
          label="Best Streak"
          value={profile.bestExerciseStreak}
          icon={<Flame size={14} className="text-[var(--danger)]" />}
          className="border-r border-[var(--border-subtle)]"
        />
        <StatCell
          label="Best Combo"
          value={profile.bestCombo}
          icon={<Zap size={14} className="text-[var(--purple)]" />}
        />
      </div>
    </div>
  );
}

function StatCell({
  label,
  value,
  icon,
  className = "",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`p-4 ${className}`}>
      <div className="flex items-center gap-1.5 mb-1">{icon}</div>
      <div className="font-[family-name:var(--font-geist-mono)] text-2xl font-bold text-[var(--text-primary)] tabular-nums">
        {value}
      </div>
      <div className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold tracking-widest uppercase text-[var(--text-muted)] mt-0.5">
        {label}
      </div>
    </div>
  );
}

function WeightChart({
  data,
}: {
  data: { date: string; weight_kg: number }[];
}) {
  if (data.length === 0) {
    return (
      <SystemPanel className="p-5">
        <div className="font-[family-name:var(--font-rajdhani)] text-[11px] font-semibold tracking-[0.15em] uppercase text-[var(--text-muted)] mb-4 flex items-center gap-2">
          <TrendingDown size={16} className="text-[var(--accent-blue)]" />
          WEIGHT DATA
        </div>
        <div className="h-36 flex items-center justify-center">
          <p className="font-[family-name:var(--font-geist-mono)] text-xs text-[var(--text-muted)]/40">
            No weigh-ins recorded.
          </p>
        </div>
      </SystemPanel>
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
    <SystemPanel className="p-5">
      <div className="font-[family-name:var(--font-rajdhani)] text-[11px] font-semibold tracking-[0.15em] uppercase text-[var(--text-muted)] mb-4 flex items-center gap-2">
        <TrendingDown size={16} className="text-[var(--accent-blue)]" />
        WEIGHT DATA
      </div>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="wGradBlue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity={0.15} />
                <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--surface-2)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fill: "var(--text-muted)", fontSize: 10, fontFamily: "var(--font-geist-mono)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[minW, maxW]}
              tick={{ fill: "var(--text-muted)", fontSize: 10, fontFamily: "var(--font-geist-mono)" }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip
              contentStyle={{
                background: "var(--surface-2)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "8px",
                fontSize: "12px",
                fontFamily: "var(--font-geist-mono)",
                color: "var(--text-primary)",
              }}
            />
            <Area
              type="monotone"
              dataKey="weight"
              stroke="var(--accent-blue)"
              strokeWidth={1.5}
              fill="url(#wGradBlue)"
              dot={{ fill: "var(--accent-blue)", r: 2, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#5b8cff", stroke: "var(--accent-blue)", strokeWidth: 1.5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </SystemPanel>
  );
}

function HeatmapCard({
  days,
}: {
  days: { date: Date; status: string }[];
}) {
  const statusColors: Record<string, string> = {
    good: "bg-[var(--accent-blue)]",
    ok: "bg-[var(--surface-3)]",
    rest: "bg-[var(--text-muted)]/10",
    missed: "bg-[var(--danger)]/20",
    future: "bg-transparent border border-[var(--text-muted)]/10",
  };

  const firstDayOfWeek = (days[0].date.getDay() + 6) % 7;
  const padded = Array.from({ length: firstDayOfWeek }, () => null);

  return (
    <SystemPanel className="p-5">
      <div className="font-[family-name:var(--font-rajdhani)] text-[11px] font-semibold tracking-[0.15em] uppercase text-[var(--text-muted)] mb-3 flex items-center gap-2">
        <Flame size={16} className="text-[var(--accent-blue)]" />
        ACTIVITY LOG — 90 DAYS
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
      <div className="flex gap-4 mt-3 text-[9px] font-[family-name:var(--font-geist-mono)] text-[var(--text-muted)]/60">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-[var(--accent-blue)]" /> logged + workout
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-[var(--surface-3)]" /> logged
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-[var(--danger)]/20" /> missed
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-[var(--text-muted)]/10" /> rest
        </span>
      </div>
    </SystemPanel>
  );
}
