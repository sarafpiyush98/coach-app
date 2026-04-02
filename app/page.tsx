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
  ChevronRight,
} from "lucide-react";
import { SystemPanel } from "@/components/ui/system-panel";
import { DailyProgress } from "@/components/daily-progress";
import { QuestList } from "@/components/quest-list";
import { ComboMilestone } from "@/components/combo-milestone";
import { ShadowGreeting } from "@/components/shadow-greeting";
import { useToastStore } from "@/components/ui/system-toast";
import { useCacheStore } from "@/lib/cache";
import { useCachedFetch } from "@/lib/use-cached-fetch";
import { isComboMilestone, getShadowGreeting, getStreakIntensity } from "@/lib/consistency";
import type { Quest } from "@/lib/quests";
import type { LootRarity } from "@/lib/gamification";
import { useLevelStore } from "@/lib/level-store";

const START_DATE = new Date(2026, 3, 6); // April 6, 2026

const UNLOCK_THRESHOLDS = [
  { level: 3, message: "The System now tracks your consistency." },
  { level: 5, message: "A new window has opened. The System reveals your attributes." },
  { level: 8, message: "Additional protocols detected. Bonus objectives unlocked." },
  { level: 10, message: "The gates have opened. Your first adversary awaits." },
  { level: 15, message: "Shadows stir in the darkness. The army awaits its commander." },
  { level: 18, message: "The System grants you power. Distribute wisely." },
  { level: 28, message: "Command review authorized. Analyze your operations." },
];

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
  unlockedShadows?: string[];
  rewards?: Array<{
    id: string;
    type: string;
    earned_at: string;
    claimed: boolean;
  }>;
}

function getSystemMessage(data: DashboardData, dayNumber: number): string | null {
  if (dayNumber === 1) return "SYSTEM INITIALIZED. FIRST QUEST AWAITS. BEGIN.";
  if (data.questCompletionPercent === 100) return "ALL PROTOCOLS COMPLETE. THE SYSTEM IS SATISFIED.";
  if (data.gamification.comboDay >= 15) return "MAXIMUM COMBO ACHIEVED. YOU ARE OPERATING AT PEAK PROTOCOL.";
  if (data.gamification.comboDay === 7) return "SEVEN DAYS. THE SYSTEM HAS TAKEN NOTICE.";
  if (data.gamification.lootRarity === "legendary") return "ANOMALY DETECTED. LEGENDARY MULTIPLIER ACTIVE.";
  if (data.gamification.lootRarity === "epic") return "ENHANCED PROTOCOLS DETECTED. EPIC MULTIPLIER ACTIVE.";
  if (data.gamification.level === 40) return "S-RANK. ARISE.";
  if (data.gamification.level === 28) return "A-RANK. FEW HUNTERS REACH THIS FLOOR.";
  if (data.gamification.level === 18) return "B-RANK. THE SHADOWS BEGIN TO STIR.";
  if (data.gamification.level === 10) return "C-RANK ACHIEVED. THE DUNGEON DEEPENS.";
  if (data.gamification.level === 5) return "D-RANK THRESHOLD APPROACHING.";
  if (data.gamification.comboDay === 1 && dayNumber > 2) return "THE SYSTEM CONTINUES. REGARDLESS.";
  return null;
}

function RewardBanner({ reward, onClaim }: { reward: { id: string; type: string; earned_at: string }; onClaim: () => void }) {
  const [claiming, setClaiming] = useState(false);

  const def = {
    ration_upgrade: { name: "RATION UPGRADE", description: "Guilt-free indulgence meal — earned, not stolen" },
    rest_permit: { name: "REST PERMIT", description: "Extra rest day mid-week — System-approved" },
    cheat_code: { name: "CHEAT CODE", description: "24-hour fasting seal suspension — rank promotion reward" },
    boss_loot: { name: "BOSS LOOT", description: "Real-world reward from your wishlist — boss defeated" },
  }[reward.type] ?? { name: "REWARD", description: "Earned." };

  async function handleClaim() {
    setClaiming(true);
    try {
      const res = await fetch("/api/rewards/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reward_id: reward.id }),
      });
      if (res.ok) {
        const { data } = await res.json();
        useToastStore.getState().add({
          title: `${def.name} — CLAIMED`,
          message: data.message,
          variant: "success",
        });
        useCacheStore.getState().invalidateAll();
        onClaim();
      }
    } catch {
      // silent
    }
    setClaiming(false);
  }

  return (
    <SystemPanel className="p-3 border border-[#FFC107]/40">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <p className="font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase tracking-[0.15em] text-[#FFC107]">
            {def.name}
          </p>
          <p className="font-[family-name:var(--font-rajdhani)] text-[9px] uppercase tracking-widest text-[var(--text-muted)]">
            {def.description}
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleClaim}
          disabled={claiming}
          className="px-3 py-1.5 rounded bg-[#FFC107]/20 border border-[#FFC107]/40 font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[#FFC107] hover:bg-[#FFC107]/30 transition-colors disabled:opacity-50"
        >
          {claiming ? "..." : "CLAIM"}
        </motion.button>
      </div>
    </SystemPanel>
  );
}

export default function CommandCenter() {
  const { data, loading, revalidating, refresh } = useCachedFetch<DashboardData>(
    "/api/dashboard",
    { maxAge: 15000 }
  );
  const addToast = useToastStore((s) => s.add);
  const [showMilestone, setShowMilestone] = useState(false);
  const [showShadow, setShowShadow] = useState(false);
  const [shadowMsg, setShadowMsg] = useState<{ name: string; message: string } | null>(null);

  const today = new Date();
  const dayNumber = differenceInDays(today, START_DATE) + 1;

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

  // Unlock toasts for progressive disclosure
  useEffect(() => {
    if (!data) return;
    const level = data.gamification.level;
    const shownRaw = localStorage.getItem("shown_unlocks");
    const shown: number[] = shownRaw ? JSON.parse(shownRaw) : [];
    const newUnlocks = UNLOCK_THRESHOLDS.filter(
      (t) => level >= t.level && !shown.includes(t.level)
    );
    if (newUnlocks.length > 0) {
      for (const unlock of newUnlocks) {
        addToast({ title: "SYSTEM UPGRADE", message: unlock.message, variant: "success" });
        shown.push(unlock.level);
      }
      localStorage.setItem("shown_unlocks", JSON.stringify(shown));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.gamification?.level]);

  // Combo milestone overlay + shadow greeting
  useEffect(() => {
    if (!data) return;
    const combo = data.gamification.comboDay;
    const milestoneKey = `combo_milestone_${combo}`;
    if (isComboMilestone(combo) && !localStorage.getItem(milestoneKey)) {
      localStorage.setItem(milestoneKey, "1");
      setShowMilestone(true);
      // Check for shadow greeting after milestone
      const shadows = data.unlockedShadows ?? [];
      const greeting = getShadowGreeting(shadows, combo);
      if (greeting) {
        setShadowMsg(greeting);
        setTimeout(() => setShowShadow(true), 3800); // After milestone overlay
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.gamification?.comboDay]);

  if (loading || !data) return <LoadingSkeleton />;

  useLevelStore.getState().setLevel(data.gamification.level);

  const { streaks, quests, gamification } = data;
  const dailyQuests = quests.filter((q) => q.category === "daily");
  const completedDaily = dailyQuests.filter((q) => q.completed).length;
  const systemMessage = getSystemMessage(data, dayNumber);

  return (
    <div className="mx-auto max-w-lg px-4 pb-6 pt-8 space-y-6">
      {/* System Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center relative"
      >
        <h1 className="font-[family-name:var(--font-rajdhani)] text-[28px] font-bold tracking-[0.1em] text-[var(--text-primary)]">
          THE SYSTEM
        </h1>
        <p className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums text-[var(--accent-blue)]">
          DAY {dayNumber}
        </p>
        {/* Revalidation indicator */}
        {revalidating && (
          <span className="absolute top-1 right-0 w-1.5 h-1.5 rounded-full bg-[var(--accent-blue)] animate-pulse" />
        )}
      </motion.div>

      {/* System Message — context-sensitive */}
      {systemMessage ? (
        <div className="border-l-2 border-l-[var(--accent-blue)] pl-4 py-2">
          <p className="font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase tracking-wider text-[var(--accent-blue)]">
            {systemMessage}
          </p>
        </div>
      ) : streaks.missedYesterday && dayNumber > 1 ? (
        <SystemPanel variant="danger" className="px-4 py-3" animate={false}>
          <p className="font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase tracking-wider text-[var(--danger)]">
            Yesterday: Protocol incomplete. Today determines the streak.
          </p>
        </SystemPanel>
      ) : null}

      {/* Reward Banner — unclaimed rewards */}
      {data.rewards && data.rewards.length > 0 && (
        <RewardBanner
          reward={data.rewards[0]}
          onClaim={() => refresh()}
        />
      )}

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

      {/* Streak Row — single-line readout (unlocks at level 3) */}
      {data.gamification.level >= 3 && (
        <div className="flex items-center justify-center gap-4 py-2">
          <StreakReadout label="EXERCISE" count={streaks.exercise} danger={streaks.exerciseDanger} />
          <span className="text-[var(--text-muted)]/30 font-[family-name:var(--font-geist-mono)] text-xs">|</span>
          <StreakReadout label="LOGGING" count={streaks.logging} danger={streaks.loggingDanger} />
          <span className="text-[var(--text-muted)]/30 font-[family-name:var(--font-geist-mono)] text-xs">|</span>
          <StreakReadout label="FASTING" count={streaks.noLateEating} danger={streaks.noLateEatingDanger} />
        </div>
      )}

      {/* Quick Actions — surface-2, functional */}
      <div className="grid grid-cols-3 gap-2.5">
        <QuickAction href="/log/meal" icon={<UtensilsCrossed size={20} />} label="LOG MEAL" />
        <QuickAction href="/log/workout" icon={<Dumbbell size={20} />} label="LOG WORKOUT" />
        <QuickAction href="/checkin" icon={<Zap size={20} />} label="CHECK IN" />
      </div>

      {/* Weekly Debrief — Sun/Mon only, level 28+ */}
      {data.gamification.level >= 28 && (new Date().getDay() === 0 || new Date().getDay() === 1) && (
        <Link href="/review">
          <SystemPanel className="p-3 border border-[var(--accent-blue)]/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase tracking-[0.15em] text-[var(--accent-blue)]">
                  Weekly Debrief Available
                </p>
                <p className="font-[family-name:var(--font-rajdhani)] text-[9px] uppercase tracking-widest text-[var(--text-muted)]">
                  Review your week. The System has notes.
                </p>
              </div>
              <ChevronRight size={16} className="text-[var(--text-muted)]" />
            </div>
          </SystemPanel>
        </Link>
      )}

      <ComboMilestone
        comboDay={data.gamification.comboDay}
        show={showMilestone}
        onDone={() => setShowMilestone(false)}
      />
      <ShadowGreeting
        show={showShadow}
        shadow={shadowMsg}
        onDone={() => setShowShadow(false)}
      />
    </div>
  );
}

function StreakReadout({
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
    <div className="flex items-center gap-1.5">
      <span className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </span>
      <span
        className={`font-[family-name:var(--font-geist-mono)] text-sm font-semibold tabular-nums ${
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
        <Flame
          size={11}
          className="text-[var(--warning)]"
          style={{
            filter: getStreakIntensity(count) > 0.3 ? `drop-shadow(0 0 ${getStreakIntensity(count) * 8}px #f59e0b)` : undefined,
            animation: getStreakIntensity(count) > 0.5 ? "pulse 2s infinite" : undefined,
          }}
        />
      )}
      {danger && !active && <AlertTriangle size={10} className="text-[var(--danger)]" />}
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
