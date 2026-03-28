"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { differenceInDays } from "date-fns";
import { motion } from "framer-motion";
import {
  Flame,
  AlertTriangle,
  UtensilsCrossed,
  Dumbbell,
  Zap,
} from "lucide-react";
import { SystemPanel } from "@/components/ui/system-panel";
import { DailyProgress } from "@/components/daily-progress";
import { QuestList } from "@/components/quest-list";
import { useToastStore } from "@/components/ui/system-toast";
import type { Quest } from "@/lib/quests";
import type { LootRarity } from "@/lib/gamification";

const START_DATE = new Date(2026, 2, 28); // March 28, 2026

interface Streaks {
  exercise: number;
  logging: number;
  noLateEating: number;
  exerciseDanger: boolean;
  loggingDanger: boolean;
  noLateEatingDanger: boolean;
  missedYesterday: boolean;
  message: string | null;
}

interface Gamification {
  level: number;
  levelProgress: number;
  rank: string;
  totalXp: number;
  todayXp: number;
  comboDay: number;
  comboMultiplier: number;
  lootRarity: LootRarity | null;
  lootMultiplier: number;
}

interface DashboardData {
  streaks: Streaks;
  quests: Quest[];
  questCompletionPercent: number;
  gamification: Gamification;
}

export default function CommandCenter() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const addToast = useToastStore((s) => s.add);

  const today = new Date();
  const dayNumber = differenceInDays(today, START_DATE) + 1;

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/dashboard");
        if (res.ok) {
          const json = await res.json();
          setData(json.data);
        }
      } catch {
        // Shows skeleton on failure
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Fire toasts for completed quests on load
  useEffect(() => {
    if (!data?.quests) return;
    const completed = data.quests.filter((q) => q.completed);
    // Only toast if there are completions (debounce: only once)
    if (completed.length > 0 && completed.length === data.quests.filter((q) => q.completed).length) {
      // Don't spam — just show a summary if multiple
      const last = completed[completed.length - 1];
      if (completed.length === 1) {
        addToast({
          title: `${last.name} — COMPLETE`,
          message: `+${last.xpReward} XP · ${last.stat} +2`,
          variant: "success",
        });
      }
    }
  // Only run once on data load
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.questCompletionPercent]);

  if (loading) return <LoadingSkeleton />;
  if (!data) return <LoadingSkeleton />;

  const { streaks, quests, gamification } = data;
  const dailyQuests = quests.filter((q) => q.category === "daily");
  const completedDaily = dailyQuests.filter((q) => q.completed).length;

  return (
    <div className="mx-auto max-w-lg px-4 pb-4 pt-6 space-y-4">
      {/* System Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center"
      >
        <p className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-[0.3em] text-[#4A5568]">
          THE SYSTEM
        </p>
        <p className="font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-[#4A5568]">
          DAY {dayNumber}
        </p>
      </motion.div>

      {/* Daily Progress */}
      <DailyProgress
        questsCompleted={completedDaily}
        questsTotal={dailyQuests.length}
        comboDay={gamification.comboDay}
        comboMultiplier={gamification.comboMultiplier}
        lootRarity={gamification.lootRarity}
        lootMultiplier={gamification.lootMultiplier}
        todayXp={gamification.todayXp}
        level={gamification.level}
        levelProgress={gamification.levelProgress}
        rank={gamification.rank}
      />

      {/* Active Quests */}
      <QuestList quests={quests} />

      {/* Streak Row */}
      <SystemPanel className="p-4">
        <div className="grid grid-cols-3 gap-3">
          <StreakIndicator
            label="EXERCISE"
            count={streaks.exercise}
            danger={streaks.exerciseDanger}
          />
          <StreakIndicator
            label="LOGGING"
            count={streaks.logging}
            danger={streaks.loggingDanger}
          />
          <StreakIndicator
            label="FASTING"
            count={streaks.noLateEating}
            danger={streaks.noLateEatingDanger}
          />
        </div>
      </SystemPanel>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-2.5">
        <QuickAction href="/log/meal" icon={<UtensilsCrossed size={20} />} label="LOG MEAL" />
        <QuickAction href="/log/workout" icon={<Dumbbell size={20} />} label="LOG WORKOUT" />
        <QuickAction href="/checkin" icon={<Zap size={20} />} label="CHECK IN" />
      </div>
    </div>
  );
}

function StreakIndicator({
  label,
  count,
  danger,
}: {
  label: string;
  count: number;
  danger: boolean;
}) {
  const active = count > 0;

  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1">
        <span
          className={`font-[family-name:var(--font-geist-mono)] text-2xl font-semibold tabular-nums ${
            active
              ? "text-[#FBEFFA]"
              : danger
                ? "text-[#D50000]"
                : "text-[#4A5568]"
          }`}
        >
          {count}
        </span>
        {active && (
          <Flame size={14} className="text-[#FFC107]" />
        )}
        {danger && !active && (
          <AlertTriangle size={12} className="text-[#D50000]" />
        )}
      </div>
      <p className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[#4A5568]">
        {label}
      </p>
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
      <SystemPanel className="flex h-16 cursor-pointer flex-col items-center justify-center gap-1 transition-all hover:scale-[1.02] active:scale-[0.98]">
        <span className="text-[#1B45D7]">{icon}</span>
        <span className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-wider text-[#4A5568]">
          {label}
        </span>
      </SystemPanel>
    </Link>
  );
}

function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-lg px-4 pb-4 pt-6 space-y-4">
      {/* Header skeleton */}
      <div className="flex flex-col items-center gap-1">
        <div className="h-3 w-20 rounded bg-[#0D1117] animate-pulse" />
        <div className="h-3 w-12 rounded bg-[#0D1117] animate-pulse" />
      </div>
      {/* Progress ring skeleton */}
      <div className="h-48 rounded-lg border border-[#1B45D7]/10 bg-[rgba(10,20,60,0.85)] animate-pulse" />
      {/* Quest skeletons */}
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="h-16 rounded-lg border border-[#1B45D7]/10 bg-[rgba(10,20,60,0.85)] animate-pulse"
        />
      ))}
      {/* Streak skeleton */}
      <div className="h-20 rounded-lg border border-[#1B45D7]/10 bg-[rgba(10,20,60,0.85)] animate-pulse" />
      {/* Quick actions skeleton */}
      <div className="grid grid-cols-3 gap-2.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 rounded-lg border border-[#1B45D7]/10 bg-[rgba(10,20,60,0.85)] animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
