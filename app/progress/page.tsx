"use client";

import { useEffect, useState } from "react";
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
import type { DailyLog } from "@/lib/types";
import {
  type BossFight,
  type ComebackStatus,
  type WeeklyGrade,
  BOSS_FIGHTS,
  getWeeklyGrade,
} from "@/lib/gamification";

const START_WEIGHT = 128;

// --- Interfaces matching API response ---
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
  S: "text-[#FFC107]",
  A: "text-[#1B45D7]",
  B: "text-teal-400",
  C: "text-[#4A5568]",
  F: "text-[#D50000]",
};

const GRADE_GLOW: Record<WeeklyGrade, string> = {
  S: "drop-shadow-[0_0_12px_rgba(255,193,7,0.6)]",
  A: "drop-shadow-[0_0_12px_rgba(27,69,215,0.6)]",
  B: "drop-shadow-[0_0_8px_rgba(45,212,191,0.4)]",
  C: "",
  F: "drop-shadow-[0_0_8px_rgba(213,0,0,0.4)]",
};

export default function DungeonPage() {
  const [gData, setGData] = useState<GamificationData | null>(null);
  const [history, setHistory] = useState<DailyLog[]>([]);
  const [weights, setWeights] = useState<{ date: string; weight_kg: number }[]>(
    []
  );
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
            className="h-36 rounded-xl animate-pulse"
            style={{ background: "rgba(10,20,60,0.85)" }}
          />
        ))}
      </div>
    );
  }

  if (!gData) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-6">
        <p className="text-[#4A5568] text-sm text-center py-12 font-[family-name:var(--font-geist-mono)]">
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

  // Weekly grade — count active days this week from history
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekActiveDays = history.filter((h) => {
    const d = new Date(h.date);
    return (
      isWithinInterval(d, { start: weekStart, end: today }) &&
      (h.meals_logged || h.workout_done)
    );
  }).length;
  const weekGrade = getWeeklyGrade(weekActiveDays);
  // Rough score: (activeDays / 7) * 100
  const weekScore = Math.round((weekActiveDays / 7) * 100);

  // Check which bosses are defeated
  const allBossesDefeated = BOSS_FIGHTS.every(
    (b) => latestWeight <= b.targetWeight
  );

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24 space-y-4">
      {/* Header */}
      <h1 className="font-[family-name:var(--font-rajdhani)] text-lg font-bold tracking-widest uppercase text-center text-[#4A5568]">
        DUNGEON
      </h1>

      {/* Active Boss Fight */}
      {allBossesDefeated ? (
        <SystemPanel variant="gold" className="p-5">
          <div className="text-center space-y-2">
            <div className="font-[family-name:var(--font-rajdhani)] text-xl font-bold text-[#FFC107]">
              ALL BOSSES DEFEATED.
            </div>
            <div className="font-[family-name:var(--font-rajdhani)] text-sm text-[#FFC107]/60">
              THE DUNGEON IS CLEAR.
            </div>
          </div>
        </SystemPanel>
      ) : boss ? (
        <SystemPanel variant="danger" className="p-5 overflow-hidden relative">
          {/* Boss tier badge */}
          <div className="absolute top-3 right-3 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-[#D50000]/20 text-[#D50000]/50 bg-[#D50000]/5">
            {boss.tier}
          </div>

          <div className="font-[family-name:var(--font-rajdhani)] text-2xl font-bold text-[#FBEFFA] uppercase tracking-wide mb-1">
            {boss.name}
          </div>
          <div className="text-sm italic text-[#4A5568] mb-4">
            &ldquo;{boss.taunt}&rdquo;
          </div>

          {/* HP Bar */}
          <div className="space-y-1.5">
            <div className="relative h-4 w-full rounded-full bg-[#0C0C0F] overflow-hidden border border-[#D50000]/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#D50000] to-[#ff3333] transition-all duration-700"
                style={{ width: `${boss.hpPercent}%` }}
              />
            </div>
            <div className="font-[family-name:var(--font-geist-mono)] text-xs text-[#D50000]/60">
              HP: {boss.kgRemaining.toFixed(1)} kg remaining
            </div>
          </div>
        </SystemPanel>
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
                        ? "border-[#059669] bg-[#059669]/20"
                        : isActive
                          ? "border-[#D50000] bg-[#D50000]/10 animate-pulse"
                          : "border-[#4A5568]/30 bg-[#0C0C0F]"
                    }`}
                  >
                    {defeated ? (
                      <CheckCircle2 size={18} className="text-[#059669]" />
                    ) : isActive ? (
                      <Swords size={18} className="text-[#D50000]" />
                    ) : (
                      <Lock size={14} className="text-[#4A5568]/40" />
                    )}
                  </div>
                  <div
                    className={`mt-1.5 text-[9px] font-[family-name:var(--font-rajdhani)] font-bold uppercase leading-tight text-center max-w-[60px] ${
                      defeated
                        ? "text-[#059669]/70"
                        : isActive
                          ? "text-[#FBEFFA]/80"
                          : "text-[#4A5568]/40"
                    }`}
                  >
                    {b.name.replace("The ", "")}
                  </div>
                  <div
                    className={`text-[9px] font-[family-name:var(--font-geist-mono)] ${
                      defeated
                        ? "text-[#059669]/40 line-through"
                        : "text-[#4A5568]/30"
                    }`}
                  >
                    {b.targetWeight}kg
                  </div>
                </div>
                {/* Connecting line */}
                {i < BOSS_FIGHTS.length - 1 && (
                  <div
                    className={`h-0.5 w-6 mx-1 mt-[-20px] ${
                      defeated ? "bg-[#059669]/30" : "bg-[#4A5568]/15"
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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Total Workouts"
          value={profile.totalWorkouts}
          icon={<Dumbbell size={16} className="text-[#1B45D7]" />}
        />
        <StatCard
          label="Personal Records"
          value={profile.totalPrs}
          icon={<Trophy size={16} className="text-[#FFC107]" />}
        />
        <StatCard
          label="Best Streak"
          value={profile.bestExerciseStreak}
          icon={<Flame size={16} className="text-[#D50000]" />}
        />
        <StatCard
          label="Best Combo"
          value={profile.bestCombo}
          icon={<Zap size={16} className="text-[#463671]" />}
        />
      </div>

      {/* Weekly Grade */}
      <SystemPanel className="p-5">
        <div className="text-center space-y-1">
          <div className="font-[family-name:var(--font-rajdhani)] text-xs font-bold tracking-widest uppercase text-[#4A5568]">
            WEEK GRADE
          </div>
          <div
            className={`font-[family-name:var(--font-rajdhani)] text-6xl font-black ${GRADE_COLORS[weekGrade]} ${GRADE_GLOW[weekGrade]}`}
          >
            {weekGrade}
          </div>
          <div className="font-[family-name:var(--font-geist-mono)] text-sm text-[#4A5568]">
            {weekScore}/100
          </div>
        </div>
      </SystemPanel>
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
      <SystemPanel className="p-5">
        <div className="font-[family-name:var(--font-rajdhani)] text-xs font-bold tracking-widest uppercase text-[#4A5568] mb-4 flex items-center gap-2">
          <TrendingDown size={16} className="text-[#1B45D7]" />
          WEIGHT DATA
        </div>
        <div className="h-36 flex items-center justify-center">
          <p className="font-[family-name:var(--font-geist-mono)] text-xs text-[#4A5568]/40">
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
      <div className="font-[family-name:var(--font-rajdhani)] text-xs font-bold tracking-widest uppercase text-[#4A5568] mb-4 flex items-center gap-2">
        <TrendingDown size={16} className="text-[#1B45D7]" />
        WEIGHT DATA
      </div>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="wGradBlue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1B45D7" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#1B45D7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#0A1543"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{
                fill: "#4A5568",
                fontSize: 10,
                fontFamily: "var(--font-geist-mono)",
              }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[minW, maxW]}
              tick={{
                fill: "#4A5568",
                fontSize: 10,
                fontFamily: "var(--font-geist-mono)",
              }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(10,20,60,0.95)",
                border: "1px solid rgba(27,69,215,0.3)",
                borderRadius: "8px",
                fontSize: "12px",
                fontFamily: "var(--font-geist-mono)",
                color: "#FBEFFA",
              }}
            />
            <Area
              type="monotone"
              dataKey="weight"
              stroke="#1B45D7"
              strokeWidth={2}
              fill="url(#wGradBlue)"
              dot={{ fill: "#1B45D7", r: 3, strokeWidth: 0 }}
              activeDot={{
                r: 6,
                fill: "#3B65F7",
                stroke: "#1B45D7",
                strokeWidth: 2,
              }}
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
    good: "bg-[#1B45D7] shadow-[0_0_4px_rgba(27,69,215,0.4)]",
    ok: "bg-[#0A1543]",
    rest: "bg-[#4A5568]/20",
    missed: "bg-[#D50000]/25",
    future: "bg-transparent border border-[#4A5568]/10",
  };

  const firstDayOfWeek = (days[0].date.getDay() + 6) % 7;
  const padded = Array.from({ length: firstDayOfWeek }, () => null);

  return (
    <SystemPanel className="p-5">
      <div className="font-[family-name:var(--font-rajdhani)] text-xs font-bold tracking-widest uppercase text-[#4A5568] mb-3 flex items-center gap-2">
        <Flame size={16} className="text-[#1B45D7]" />
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
      {/* Legend */}
      <div className="flex gap-4 mt-3 text-[9px] font-[family-name:var(--font-geist-mono)] text-[#4A5568]/60">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-[#1B45D7]" /> logged + workout
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-[#0A1543]" /> logged
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-[#D50000]/25" /> missed
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-[#4A5568]/20" /> rest
        </span>
      </div>
    </SystemPanel>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <SystemPanel className="p-4">
      <div className="flex items-center gap-1.5 mb-2">{icon}</div>
      <div className="font-[family-name:var(--font-geist-mono)] text-3xl font-bold text-[#FBEFFA] tabular-nums">
        {value}
      </div>
      <div className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold tracking-widest uppercase text-[#4A5568] mt-1">
        {label}
      </div>
    </SystemPanel>
  );
}
