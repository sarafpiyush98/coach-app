"use client";

import { motion } from "framer-motion";
import { SystemPanel } from "@/components/ui/system-panel";
import { playQuestComplete } from "@/lib/sounds";
import { Check } from "lucide-react";
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

const STAT_COLORS: Record<string, string> = {
  STR: "bg-red-500/20 text-red-400 border-red-500/30",
  AGI: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  VIT: "bg-green-500/20 text-green-400 border-green-500/30",
  INT: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  DSC: "bg-purple-500/20 text-purple-400 border-purple-500/30",
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

export function QuestCard({ quest, index, isFirstIncomplete = false }: QuestCardProps) {
  const Icon = getIcon(quest.icon);

  const handleTap = () => {
    if (quest.completed) {
      playQuestComplete();
    }
  };

  const variant = quest.completed ? "success" : "default";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      onClick={handleTap}
    >
      <SystemPanel
        variant={variant}
        className={`p-3 ${
          quest.completed
            ? "ring-1 ring-[#059669]/40"
            : isFirstIncomplete
              ? "animate-pulse-border"
              : ""
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
              quest.completed
                ? "bg-[#059669]/20 text-[#059669]"
                : "bg-[#1B45D7]/20 text-[#1B45D7]"
            }`}
          >
            {quest.completed ? <Check size={18} /> : <Icon size={18} />}
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p
              className={`font-[family-name:var(--font-rajdhani)] text-sm font-bold uppercase tracking-wider ${
                quest.completed
                  ? "text-[#059669] line-through decoration-[#059669]/50"
                  : "text-[#FBEFFA]"
              }`}
            >
              {quest.name}
            </p>
            <p
              className={`text-xs ${
                quest.completed
                  ? "text-[#4A5568] line-through decoration-[#4A5568]/50"
                  : "text-[#4A5568]"
              }`}
            >
              {quest.objective}
            </p>
          </div>

          {/* Stat badge + XP */}
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`rounded border px-1.5 py-0.5 font-[family-name:var(--font-rajdhani)] text-[10px] font-bold ${
                STAT_COLORS[quest.stat] ?? ""
              }`}
            >
              {quest.stat}
            </span>
            <span
              className={`font-[family-name:var(--font-geist-mono)] text-xs tabular-nums ${
                quest.completed ? "text-[#059669]" : "text-[#4A5568]"
              }`}
            >
              +{quest.xpReward}
            </span>
          </div>
        </div>
      </SystemPanel>
    </motion.div>
  );
}
