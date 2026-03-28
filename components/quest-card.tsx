"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { SystemPanel } from "@/components/ui/system-panel";
import { Check, ChevronRight } from "lucide-react";
import {
  Utensils,
  Dumbbell,
  Activity,
  Moon,
  Beef,
  Gauge,
  Sunrise,
  Circle,
} from "lucide-react";
import type { Quest } from "@/lib/quests";

const QUEST_ROUTES: Record<string, string> = {
  fuel_vessel_1: "/log/meal?meal=1",
  fuel_vessel_2: "/log/meal?meal=2",
  fuel_vessel_3: "/log/meal?meal=3",
  movement_protocol: "/log/workout",
  system_diagnostic: "/checkin",
  fasting_seal: "/checkin",
  protein_synthesis: "/log/meal",
  energy_calibration: "/log/meal",
  wake_protocol: "/checkin",
};

const STAT_ICON_COLORS: Record<string, string> = {
  STR: "text-red-400",
  AGI: "text-cyan-400",
  VIT: "text-green-400",
  INT: "text-blue-400",
  DSC: "text-purple-400",
};

const STAT_BADGE_COLORS: Record<string, string> = {
  STR: "bg-red-500/10 text-red-400 border-red-500/20",
  AGI: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  VIT: "bg-green-500/10 text-green-400 border-green-500/20",
  INT: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  DSC: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

const ICON_MAP: Record<string, typeof Circle> = {
  Utensils,
  Dumbbell,
  Activity,
  Moon,
  Beef,
  Gauge,
  Sunrise,
};

interface QuestCardProps {
  quest: Quest;
  index: number;
  isFirstIncomplete?: boolean;
}

function getIcon(name: string) {
  return ICON_MAP[name] ?? Circle;
}

function QuestCardInner({ quest, isFirstIncomplete = false }: { quest: Quest; isFirstIncomplete?: boolean }) {
  const Icon = getIcon(quest.icon);
  const route = QUEST_ROUTES[quest.id];
  const tappable = !quest.completed && !!route;

  const variant = quest.completed
    ? "success"
    : isFirstIncomplete
      ? "interactive"
      : "default";

  return (
    <SystemPanel
      variant={variant}
      animate={false}
      className={`p-3 ${
        isFirstIncomplete && !quest.completed
          ? "border-l-[3px] !border-l-[var(--accent-blue)]"
          : ""
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            quest.completed
              ? "bg-[var(--success)]/10 text-[var(--success)]"
              : `bg-[var(--surface-2)] ${STAT_ICON_COLORS[quest.stat] ?? "text-[var(--accent-blue)]"}`
          }`}
        >
          {quest.completed ? <Check size={18} /> : <Icon size={18} />}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p
            className={`font-[family-name:var(--font-rajdhani)] text-sm font-bold uppercase tracking-wider ${
              quest.completed
                ? "text-[var(--success)] line-through decoration-[var(--success)]/30"
                : "text-[var(--text-primary)]"
            }`}
          >
            {quest.name}
          </p>
          <p
            className={`text-[13px] ${
              quest.completed
                ? "text-[var(--text-muted)] line-through decoration-[var(--text-muted)]/30"
                : "text-[var(--text-muted)]"
            }`}
          >
            {quest.objective}
          </p>
        </div>

        {/* Stat badge + XP + nav hint */}
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`rounded border px-1.5 py-0.5 font-[family-name:var(--font-rajdhani)] text-[10px] font-bold ${
              STAT_BADGE_COLORS[quest.stat] ?? ""
            }`}
          >
            {quest.stat}
          </span>
          <span
            className={`font-[family-name:var(--font-geist-mono)] text-xs tabular-nums ${
              quest.completed ? "text-[var(--success)]" : "text-[var(--text-muted)]"
            }`}
          >
            +{quest.xpReward}
          </span>
          {tappable && (
            <ChevronRight size={14} className="text-[var(--text-muted)]" />
          )}
        </div>
      </div>
    </SystemPanel>
  );
}

export function QuestCard({ quest, index, isFirstIncomplete = false }: QuestCardProps) {
  const route = QUEST_ROUTES[quest.id];
  const tappable = !quest.completed && !!route;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      {tappable ? (
        <Link href={route} className="block cursor-pointer">
          <QuestCardInner quest={quest} isFirstIncomplete={isFirstIncomplete} />
        </Link>
      ) : (
        <QuestCardInner quest={quest} isFirstIncomplete={isFirstIncomplete} />
      )}
    </motion.div>
  );
}
