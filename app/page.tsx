"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { differenceInDays, format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Flame,
  Trophy,
  Target,
  AlertTriangle,
  UtensilsCrossed,
  Dumbbell,
  Moon,
  ChevronRight,
  Zap,
  TrendingDown,
} from "lucide-react";

const START_DATE = new Date(2026, 2, 25);
const START_WEIGHT = 128;
const CALORIE_TARGET = 2000;
const PROTEIN_TARGET = 150;

interface DailyLog {
  date: string;
  weight_kg: number | null;
  calories_total: number;
  protein_g: number;
  workout_done: boolean;
  workout_type: string | null;
  workout_minutes: number | null;
  ate_after_10pm: boolean;
  meals_logged: boolean;
}

interface Streaks {
  exercise: number;
  logging: number;
  noLateEating: number;
  missedYesterday: boolean;
  exerciseDanger: boolean;
  loggingDanger: boolean;
  noLateEatingDanger: boolean;
  message: string | null;
}

interface Meal {
  id: string;
  calories: number;
  protein_g: number;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  type: string;
  target_value: number;
  current_value: number;
  achieved: boolean;
}

export default function Dashboard() {
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null);
  const [streaks, setStreaks] = useState<Streaks | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const dayNumber = differenceInDays(today, START_DATE) + 1;
  const todayStr = format(today, "yyyy-MM-dd");

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/dashboard");
        if (res.ok) {
          const json = await res.json();
          const { dailyLog: log, streaks: s, meals: m, milestones: ms } = json.data;
          setDailyLog(log ?? null);
          setStreaks(s ?? null);
          setMeals(Array.isArray(m) ? m : []);
          setMilestones(Array.isArray(ms) ? ms : []);
        }
      } catch {
        // Dashboard shows zeroes on failure
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [todayStr]);

  const caloriesFromMeals = meals.reduce(
    (sum, m) => sum + (m.calories || 0),
    0
  );
  const proteinFromMeals = meals.reduce(
    (sum, m) => sum + (m.protein_g || 0),
    0
  );
  const calories = dailyLog?.calories_total ?? caloriesFromMeals;
  const protein = dailyLog?.protein_g ?? proteinFromMeals;
  const weight = dailyLog?.weight_kg ?? null;
  const weightChange = weight !== null ? weight - START_WEIGHT : null;
  const workoutDone = dailyLog?.workout_done ?? false;
  const ateAfter10pm = dailyLog?.ate_after_10pm ?? false;

  const caloriePct = Math.min((calories / CALORIE_TARGET) * 100, 100);
  const proteinPct = Math.min((protein / PROTEIN_TARGET) * 100, 100);

  const exerciseStreak = streaks?.exercise ?? 0;
  const loggingStreak = streaks?.logging ?? 0;
  const noLateEatingStreak = streaks?.noLateEating ?? 0;
  const missedYesterday = streaks?.missedYesterday ?? false;

  const nextMilestone = milestones.find((m) => !m.achieved) ?? null;
  const milestoneProgress = nextMilestone
    ? nextMilestone.type === "weight"
      ? Math.min(
          ((START_WEIGHT - (nextMilestone.current_value || START_WEIGHT)) /
            (START_WEIGHT - nextMilestone.target_value)) *
            100,
          100
        )
      : Math.min(
          ((nextMilestone.current_value || 0) / nextMilestone.target_value) *
            100,
          100
        )
    : 0;

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4 space-y-4">
      {/* Header */}
      <div className="animate-slide-up stagger-1 flex items-end justify-between">
        <div>
          <div className="text-xs font-medium tracking-widest uppercase text-amber-400/60 mb-1">
            Day
          </div>
          <h1 className="text-5xl font-black tabular-nums text-amber-400 glow-amber">
            {dayNumber}
          </h1>
        </div>
        <div className="text-right pb-1">
          {weight !== null ? (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums text-white">
                {weight}
              </span>
              <span className="text-sm text-muted-foreground">kg</span>
              {weightChange !== null && (
                <span
                  className={`text-sm font-semibold flex items-center gap-0.5 ${
                    weightChange <= 0
                      ? "text-emerald-400 glow-green"
                      : "text-red-400 glow-red"
                  }`}
                >
                  <TrendingDown
                    size={14}
                    className={weightChange > 0 ? "rotate-180" : ""}
                  />
                  {Math.abs(weightChange).toFixed(1)}
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground/50">
              No weigh-in
            </span>
          )}
        </div>
      </div>

      {/* Danger Banner */}
      {missedYesterday && (
        <div className="animate-slide-up">
          <Card className="border-amber-500/30 bg-amber-500/5 animate-pulse-glow overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-amber-500/10 to-amber-500/5" />
            <CardContent className="relative py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle
                  size={20}
                  className="text-amber-400 mt-0.5 shrink-0 animate-streak-fire"
                />
                <div>
                  <p className="text-amber-400 font-semibold text-sm">
                    Don&apos;t miss twice.
                  </p>
                  <p className="text-amber-400/60 text-xs mt-0.5">
                    You missed yesterday. Today saves the streak.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Link href="/log/meal" className="flex-1">
                  <Button className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
                    <UtensilsCrossed size={16} className="mr-1.5" />
                    Log Meal
                  </Button>
                </Link>
                <Link href="/log/workout" className="flex-1">
                  <Button className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
                    <Dumbbell size={16} className="mr-1.5" />
                    Log Workout
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Today Card */}
      <Card className="animate-slide-up stagger-2 card-glow border-[rgba(245,158,11,0.06)]">
        <CardContent className="pt-5 pb-4 space-y-5">
          {/* Calories */}
          <div>
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
                Calories
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold tabular-nums text-white">
                  {calories}
                </span>
                <span className="text-xs text-muted-foreground">
                  / {CALORIE_TARGET}
                </span>
              </div>
            </div>
            <ProgressBar
              value={caloriePct}
              gradient={
                calories > CALORIE_TARGET ? "progress-red" : "progress-amber"
              }
            />
          </div>

          {/* Protein */}
          <div>
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
                Protein
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold tabular-nums text-white">
                  {protein}
                  <span className="text-sm">g</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  / {PROTEIN_TARGET}g
                </span>
              </div>
            </div>
            <ProgressBar
              value={proteinPct}
              gradient={
                protein >= PROTEIN_TARGET ? "progress-green" : "progress-amber"
              }
            />
          </div>

          {/* Status chips */}
          <div className="flex gap-2 pt-1">
            <StatusChip
              active={workoutDone}
              icon={<Dumbbell size={12} />}
              label={
                workoutDone
                  ? `${dailyLog?.workout_minutes ?? ""}min workout`
                  : "No workout"
              }
              activeColor="emerald"
            />
            <StatusChip
              active={!ateAfter10pm}
              icon={<Moon size={12} />}
              label={ateAfter10pm ? "Ate late" : "Clean night"}
              activeColor={ateAfter10pm ? "red" : "emerald"}
            />
          </div>
        </CardContent>
      </Card>

      {/* Streaks */}
      <Card className="animate-slide-up stagger-3 card-glow border-[rgba(245,158,11,0.06)]">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-2 mb-4">
            <Flame size={16} className="text-amber-400" />
            <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
              Streaks
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <StreakItem
              label="Exercise"
              count={exerciseStreak}
              danger={streaks?.exerciseDanger}
            />
            <StreakItem
              label="Logging"
              count={loggingStreak}
              danger={streaks?.loggingDanger}
            />
            <StreakItem
              label="No Late Eat"
              count={noLateEatingStreak}
              danger={streaks?.noLateEatingDanger}
            />
          </div>
        </CardContent>
      </Card>

      {/* Next Milestone */}
      {nextMilestone && (
        <Card className="animate-slide-up stagger-4 card-glow border-[rgba(245,158,11,0.06)] overflow-hidden">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={16} className="text-amber-400" />
              <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                Next Milestone
              </span>
            </div>
            <div className="flex justify-between items-baseline mb-3">
              <span className="font-bold text-white">
                {nextMilestone.title}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {nextMilestone.type === "weight"
                  ? `${(nextMilestone.current_value || START_WEIGHT).toFixed(0)}kg → ${nextMilestone.target_value}kg`
                  : `${nextMilestone.current_value || 0} / ${nextMilestone.target_value}`}
              </span>
            </div>
            <ProgressBar value={milestoneProgress} gradient="progress-amber" />
            {nextMilestone.type === "weight" && weight !== null && (
              <p className="text-xs text-amber-400/60 mt-2 tabular-nums">
                {(weight - nextMilestone.target_value).toFixed(1)} kg to go
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="animate-slide-up stagger-5 grid grid-cols-3 gap-2.5 pt-1">
        <QuickAction
          href="/log/meal"
          icon={<UtensilsCrossed size={20} />}
          label="Log Meal"
        />
        <QuickAction
          href="/log/workout"
          icon={<Dumbbell size={20} />}
          label="Log Workout"
        />
        <QuickAction
          href="/checkin"
          icon={<Zap size={20} />}
          label="Check-in"
        />
      </div>
    </div>
  );
}

function ProgressBar({
  value,
  gradient,
}: {
  value: number;
  gradient: string;
}) {
  return (
    <div className="relative h-2.5 w-full rounded-full bg-[#111827] overflow-hidden">
      <div
        className={`h-full rounded-full ${gradient} transition-all duration-500 ease-out`}
        style={{ width: `${Math.max(value, 0)}%` }}
      />
      {value > 0 && (
        <div
          className="absolute top-0 h-full w-3 rounded-full bg-white/20 blur-sm"
          style={{ left: `${Math.max(value - 2, 0)}%` }}
        />
      )}
    </div>
  );
}

function StatusChip({
  active,
  icon,
  label,
  activeColor,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  activeColor: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors duration-200 ${
        active && colorMap[activeColor]
          ? colorMap[activeColor]
          : "bg-[#111827] text-muted-foreground border-transparent"
      }`}
    >
      {icon}
      {label}
    </div>
  );
}

function StreakItem({
  label,
  count,
  danger,
}: {
  label: string;
  count: number;
  danger?: boolean;
}) {
  const active = count > 0;
  return (
    <div className="text-center py-2 rounded-xl bg-[#0A0F1A] border border-[rgba(245,158,11,0.04)]">
      <div className="flex items-center justify-center gap-1">
        <span
          className={`text-3xl font-black tabular-nums ${
            active
              ? "text-amber-400 glow-amber"
              : danger
                ? "text-red-400 glow-red"
                : "text-[#374151]"
          }`}
        >
          {count}
        </span>
        {active && (
          <Flame
            size={18}
            className="text-amber-400 animate-streak-fire"
          />
        )}
        {danger && !active && (
          <AlertTriangle size={14} className="text-red-400" />
        )}
      </div>
      <div className="text-[10px] text-muted-foreground mt-1 font-medium">
        {label}
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link href={href}>
      <Button
        variant="outline"
        className="w-full h-16 flex flex-col gap-1 border-[rgba(245,158,11,0.1)] bg-[#0A0F1A] hover:bg-[#111827] hover:border-amber-500/30 text-muted-foreground hover:text-amber-400 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
      >
        {icon}
        <span className="text-[11px] font-semibold">{label}</span>
      </Button>
    </Link>
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4 space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <div className="h-3 w-8 bg-[#111827] rounded mb-2" />
          <div className="h-12 w-16 bg-[#111827] rounded-lg animate-pulse" />
        </div>
        <div className="h-8 w-24 bg-[#111827] rounded animate-pulse" />
      </div>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-36 bg-[#0A0F1A] rounded-xl border border-[rgba(245,158,11,0.04)] animate-pulse"
        />
      ))}
      <div className="grid grid-cols-3 gap-2.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 bg-[#0A0F1A] rounded-xl border border-[rgba(245,158,11,0.04)] animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
