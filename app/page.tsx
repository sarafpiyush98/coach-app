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
    if (completed.length > 0 && completed.length === data.quests.filter((q) => q.completed).length) {
      const last = completed[completed.length - 1];
      if (completed.length === 1) {
        addToast({
          title: `${last.name} — COMPLETE`,
          message: `+${last.xpReward} XP · ${last.stat} +2`,
          variant: "success",
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.questCompletionPercent]);

  if (loading) return <LoadingSkeleton />;
  if (!data) return <LoadingSkeleton />;

  const { streaks, quests, gamification } = data;
  const dailyQuests = quests.filter((q) => q.category === "daily");
  const completedDaily = dailyQuests.filter((q) => q.completed).length;

  return (
    <div className="mx-auto max-w-lg px-4 pb-6 pt-8 space-y-6">
      {/* System Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center"
      >
        <h1 className="font-[family-name:var(--font-rajdhani)] text-[28px] font-bold tracking-[0.1em] text-[var(--text-primary)]">
          THE SYSTEM
        </h1>
        <p className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums text-[var(--accent-blue)]">
          DAY {dayNumber}
        </p>
      </motion.div>

      {/* Day 1 initialization or Missed Yesterday Warning */}
      {dayNumber === 1 && completedDaily === 0 ? (
        <div className="border-l-2 border-l-[var(--accent-blue)] pl-4 py-2">
          <p className="font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase tracking-wider text-[var(--accent-blue)]">
            SYSTEM INITIALIZED. FIRST QUEST AWAITS. BEGIN.
          </p>
        </div>
      ) : streaks.missedYesterday ? (
        <SystemPanel variant="danger" className="px-4 py-3">
          <p className="font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase tracking-wider text-[var(--danger)]">
            Yesterday: Protocol incomplete. Today determines the streak.
          </p>
        </SystemPanel>
      ) : null}

      {/* Daily Progress — hero card */}
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

      {/* Streak Row — no card, just inline data */}
      <div className="grid grid-cols-3 gap-3 py-2">
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

      {/* Quick Actions — surface-2, functional */}
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
              ? "text-[var(--text-primary)]"
              : danger
                ? "text-[var(--danger)]"
                : "text-[var(--text-muted)]"
          }`}
        >
          {count}
        </span>
        {active && (
          <Flame size={14} className="text-[var(--warning)]" />
        )}
        {danger && !active && (
          <AlertTriangle size={12} className="text-[var(--danger)]" />
        )}
      </div>
      <p className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
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
      <div className="flex h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg bg-[var(--surface-2)] transition-colors hover:bg-[var(--surface-3)] active:scale-[0.98]">
        <span className="text-[var(--text-secondary)]">{icon}</span>
        <span className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
          {label}
        </span>
      </div>
    </Link>
  );
}

function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-lg px-4 pb-6 pt-8 space-y-6">
      <div className="flex flex-col items-center gap-1">
        <div className="h-7 w-32 rounded bg-[var(--surface-1)] animate-pulse" />
        <div className="h-4 w-16 rounded bg-[var(--surface-1)] animate-pulse" />
      </div>
      <div className="h-52 rounded-lg bg-[var(--surface-1)] animate-pulse" />
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="h-16 rounded-lg bg-[var(--surface-1)] animate-pulse"
        />
      ))}
      <div className="h-20 rounded-lg bg-[var(--surface-1)] animate-pulse" />
      <div className="grid grid-cols-3 gap-2.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 rounded-lg bg-[var(--surface-1)] animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
