import type { DailyLog, Meal } from "./types";

// ============================================================
// QUEST ENGINE — Wraps existing gamification actions as quests
// ============================================================

export type QuestId =
  | "wake_protocol"
  | "movement_protocol"
  | "fuel_vessel_1"
  | "fuel_vessel_2"
  | "fuel_vessel_3"
  | "system_diagnostic"
  | "fasting_seal"
  | "protein_synthesis"
  | "energy_calibration";

export interface QuestTemplate {
  id: QuestId;
  name: string;
  objective: string;
  icon: string;
  stat: "STR" | "AGI" | "VIT" | "INT" | "DSC";
  xpReward: number;
  category: "daily" | "bonus";
}

export interface Quest extends QuestTemplate {
  completed: boolean;
}

const QUEST_TEMPLATES: QuestTemplate[] = [
  // Daily quests (required — core loop)
  {
    id: "fuel_vessel_1",
    name: "FUEL THE VESSEL I",
    objective: "Log meal 1",
    icon: "Utensils",
    stat: "INT",
    xpReward: 15,
    category: "daily",
  },
  {
    id: "fuel_vessel_2",
    name: "FUEL THE VESSEL II",
    objective: "Log meal 2",
    icon: "Utensils",
    stat: "INT",
    xpReward: 15,
    category: "daily",
  },
  {
    id: "fuel_vessel_3",
    name: "FUEL THE VESSEL III",
    objective: "Log meal 3",
    icon: "Utensils",
    stat: "INT",
    xpReward: 15,
    category: "daily",
  },
  {
    id: "movement_protocol",
    name: "MOVEMENT PROTOCOL",
    objective: "Complete a workout of any type",
    icon: "Dumbbell",
    stat: "STR",
    xpReward: 40,
    category: "daily",
  },
  {
    id: "system_diagnostic",
    name: "SYSTEM DIAGNOSTIC",
    objective: "Log sleep, mood, or energy",
    icon: "Activity",
    stat: "VIT",
    xpReward: 10,
    category: "daily",
  },
  {
    id: "fasting_seal",
    name: "FASTING SEAL",
    objective: "No eating after 10 PM",
    icon: "Moon",
    stat: "DSC",
    xpReward: 20,
    category: "daily",
  },

  // Bonus quests
  {
    id: "protein_synthesis",
    name: "PROTEIN SYNTHESIS",
    objective: "Hit 150g protein target",
    icon: "Beef",
    stat: "INT",
    xpReward: 25,
    category: "bonus",
  },
  {
    id: "energy_calibration",
    name: "ENERGY CALIBRATION",
    objective: "Hit calorie target within 10%",
    icon: "Gauge",
    stat: "INT",
    xpReward: 30,
    category: "bonus",
  },
  {
    id: "wake_protocol",
    name: "WAKE PROTOCOL",
    objective: "Log wake time before 07:30",
    icon: "Sunrise",
    stat: "VIT",
    xpReward: 15,
    category: "bonus",
  },
];

function isQuestComplete(
  id: QuestId,
  dailyLog: DailyLog | null,
  meals: Meal[]
): boolean {
  if (!dailyLog && meals.length === 0) return false;

  switch (id) {
    case "fuel_vessel_1":
      return meals.some((m) => m.meal_number === 1);
    case "fuel_vessel_2":
      return meals.some((m) => m.meal_number === 2);
    case "fuel_vessel_3":
      return meals.some((m) => m.meal_number === 3);
    case "movement_protocol":
      return dailyLog?.workout_done === true;
    case "system_diagnostic":
      return dailyLog?.sleep_hours != null;
    case "fasting_seal":
      return dailyLog?.ate_after_10pm === false;
    case "protein_synthesis":
      return (dailyLog?.protein_g ?? 0) >= 150;
    case "energy_calibration": {
      const cal = dailyLog?.calories_total ?? 0;
      return cal >= 1800 && cal <= 2200;
    }
    case "wake_protocol": {
      const wt = dailyLog?.wake_time;
      if (!wt) return false;
      return wt <= "07:30";
    }
    default:
      return false;
  }
}

export function getDailyQuests(
  dailyLog: DailyLog | null,
  meals: Meal[]
): Quest[] {
  return QUEST_TEMPLATES.map((template) => ({
    ...template,
    // Strength workout gets 50 XP instead of 40
    xpReward:
      template.id === "movement_protocol" &&
      dailyLog?.workout_type === "strength"
        ? 50
        : template.xpReward,
    completed: isQuestComplete(template.id, dailyLog, meals),
  }));
}

export function getQuestCompletionPercent(quests: Quest[]): number {
  const daily = quests.filter((q) => q.category === "daily");
  if (daily.length === 0) return 0;
  const completed = daily.filter((q) => q.completed).length;
  return Math.round((completed / daily.length) * 100);
}
