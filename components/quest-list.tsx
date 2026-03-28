"use client";

import type { Quest } from "@/lib/quests";
import { QuestCard } from "./quest-card";

interface QuestListProps {
  quests: Quest[];
}

export function QuestList({ quests }: QuestListProps) {
  const daily = quests.filter((q) => q.category === "daily");
  const bonus = quests.filter((q) => q.category === "bonus");
  const completedCount = daily.filter((q) => q.completed).length;

  // Track the first incomplete quest across both lists
  let firstIncompleteFound = false;

  function isFirstIncomplete(quest: Quest): boolean {
    if (!quest.completed && !firstIncompleteFound) {
      firstIncompleteFound = true;
      return true;
    }
    return false;
  }

  return (
    <div className="space-y-4">
      {/* Daily quests */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between px-1">
          <h2 className="font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase tracking-widest text-[#4A5568]">
            DAILY PROTOCOLS
          </h2>
          <span className="font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-[#4A5568]">
            {completedCount}/{daily.length} COMPLETE
          </span>
        </div>
        {daily.map((quest, i) => (
          <QuestCard
            key={quest.id}
            quest={quest}
            index={i}
            isFirstIncomplete={isFirstIncomplete(quest)}
          />
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-[#1B45D7]/10" />

      {/* Bonus quests */}
      <div className="space-y-2">
        <h2 className="px-1 font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase tracking-widest text-[#4A5568]">
          BONUS OBJECTIVES
        </h2>
        {bonus.map((quest, i) => (
          <QuestCard
            key={quest.id}
            quest={quest}
            index={daily.length + i}
            isFirstIncomplete={isFirstIncomplete(quest)}
          />
        ))}
      </div>
    </div>
  );
}
