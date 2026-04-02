"use client";

import type { Quest } from "@/lib/quests";
import { QuestCard } from "./quest-card";
import { useLevelStore } from "@/lib/level-store";

interface QuestListProps {
  quests: Quest[];
}

export function QuestList({ quests }: QuestListProps) {
  const level = useLevelStore((s) => s.level);
  const visibleQuests = level >= 8 ? quests : quests.filter((q) => q.category === "daily");
  const daily = visibleQuests.filter((q) => q.category === "daily");
  const bonus = visibleQuests.filter((q) => q.category === "bonus");
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
    <div className="space-y-6">
      {/* Daily quests */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between px-1">
          <h2 className="font-[family-name:var(--font-rajdhani)] text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
            DAILY PROTOCOLS
          </h2>
          <span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--text-muted)]">
            {completedCount}/{daily.length}
          </span>
        </div>
        <div className="space-y-2">
          {daily.map((quest, i) => (
            <QuestCard
              key={quest.id}
              quest={quest}
              index={i}
              isFirstIncomplete={isFirstIncomplete(quest)}
            />
          ))}
        </div>
      </div>

      {/* Bonus quests — unlocked at level 8 */}
      {bonus.length > 0 && (
        <>
          {/* Divider */}
          <div className="border-t border-[var(--border-subtle)]" />

          <div className="space-y-2">
            <h2 className="px-1 font-[family-name:var(--font-rajdhani)] text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
              BONUS OBJECTIVES
            </h2>
            <div className="space-y-2">
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
        </>
      )}
    </div>
  );
}
