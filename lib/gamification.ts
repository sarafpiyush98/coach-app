/**
 * GAMIFICATION ENGINE
 *
 * Built on research from:
 * - Octalysis Framework (Yu-kai Chou) — Drives 1,2,3,7 prioritized; Drive 8 capped
 * - Power-law XP curve (L^1.5) — prevents grind wall, no level takes >3 sessions
 * - Multi-tier streaks (Duolingo architecture) — daily + weekly + monthly
 * - Combo multiplier (fighting game model) — capped at 2.5x
 * - Variable ratio rewards (Skinner, ethically applied) — upside-only loot drops
 * - Fresh Start Effect (Dai, Milkman & Riis 2014) — temporal landmarks reset shame
 * - Achievement tiers (75% / 25% / 10% / 1%) — meaningful not hollow
 * - Anti-churn: abstinence violation effect countermeasures
 */

import { DailyLog } from "./types";

// ============================================================
// 1. XP SYSTEM — Power Law Curve
// ============================================================
// Formula: XP_to_next_level = 100 × L^1.5
// This creates: L1→2: 100 XP, L10→11: 316, L20→21: 894, L50→51: 3536
// No grind wall. Each level takes 1-3 days of consistent effort.

export function xpToNextLevel(level: number): number {
  return Math.round(100 * Math.pow(level, 1.5));
}

export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += xpToNextLevel(i);
  }
  return total;
}

export function levelFromTotalXp(totalXp: number): {
  level: number;
  currentLevelXp: number;
  xpIntoLevel: number;
  xpNeeded: number;
  progress: number; // 0-100
} {
  let level = 1;
  let xpConsumed = 0;

  while (true) {
    const needed = xpToNextLevel(level);
    if (xpConsumed + needed > totalXp) {
      const xpIntoLevel = totalXp - xpConsumed;
      return {
        level,
        currentLevelXp: needed,
        xpIntoLevel,
        xpNeeded: needed - xpIntoLevel,
        progress: Math.min((xpIntoLevel / needed) * 100, 99.9),
      };
    }
    xpConsumed += needed;
    level++;
  }
}

// ============================================================
// 2. DAILY XP CALCULATION — What earns XP
// ============================================================
// Every action earns base XP. The combo multiplier amplifies it.
// Variable loot drops add upside-only randomness (Drive 7).

export interface DailyXpBreakdown {
  actions: { label: string; baseXp: number }[];
  baseTotal: number;
  comboMultiplier: number;
  lootMultiplier: number;
  lootRarity: LootRarity | null;
  totalXp: number;
}

const XP_VALUES = {
  logMeal: 15, // Per meal logged
  hitCalorieTarget: 30, // Within 10% of 2000
  hitProteinTarget: 25, // >= 150g
  workout: 40, // Any workout
  strengthWorkout: 50, // Strength specifically (harder)
  noLateEating: 20, // Clean night
  dailyCheckin: 10, // Sleep/mood logged
  weighIn: 15, // Monday weigh-in
  personalRecord: 75, // New PR on any lift
  minimumViableDay: 5, // Just showed up (logged + 10min walk)
} as const;

export function calculateDailyXp(
  log: DailyLog,
  mealCount: number,
  hasPR: boolean,
  comboDay: number // consecutive active days
): DailyXpBreakdown {
  const actions: { label: string; baseXp: number }[] = [];

  // Meals
  if (mealCount > 0) {
    const mealXp = mealCount * XP_VALUES.logMeal;
    actions.push({ label: `${mealCount} meals logged`, baseXp: mealXp });
  }

  // Calorie target
  if (
    log.calories_total &&
    Math.abs(log.calories_total - 2000) <= 200
  ) {
    actions.push({
      label: "Hit calorie target",
      baseXp: XP_VALUES.hitCalorieTarget,
    });
  }

  // Protein target
  if (log.protein_g && log.protein_g >= 150) {
    actions.push({
      label: "Hit protein target",
      baseXp: XP_VALUES.hitProteinTarget,
    });
  }

  // Workout
  if (log.workout_done) {
    const isStrength = log.workout_type === "strength";
    actions.push({
      label: isStrength ? "Strength workout" : "Workout",
      baseXp: isStrength ? XP_VALUES.strengthWorkout : XP_VALUES.workout,
    });
  }

  // No late eating
  if (!log.ate_after_10pm) {
    actions.push({ label: "Clean night", baseXp: XP_VALUES.noLateEating });
  }

  // Check-in (sleep/mood logged)
  if (log.sleep_hours || log.mood || log.energy_level) {
    actions.push({ label: "Daily check-in", baseXp: XP_VALUES.dailyCheckin });
  }

  // Weigh-in
  if (log.weight_kg) {
    actions.push({ label: "Weigh-in", baseXp: XP_VALUES.weighIn });
  }

  // PR
  if (hasPR) {
    actions.push({ label: "Personal record!", baseXp: XP_VALUES.personalRecord });
  }

  // Minimum viable day bonus (if nothing else but showed up)
  if (actions.length === 0 && log.meals_logged) {
    actions.push({
      label: "Showed up",
      baseXp: XP_VALUES.minimumViableDay,
    });
  }

  const baseTotal = actions.reduce((sum, a) => sum + a.baseXp, 0);

  // Combo multiplier: min(1 + streak_days × 0.1, 2.5)
  // Day 1: 1.0x, Day 5: 1.5x, Day 10: 2.0x, Day 15+: 2.5x (capped)
  const comboMultiplier = Math.min(1 + comboDay * 0.1, 2.5);

  // Loot drop: variable ratio reward, upside-only
  const { multiplier: lootMultiplier, rarity: lootRarity } =
    rollLootDrop(baseTotal);

  const totalXp = Math.round(baseTotal * comboMultiplier * lootMultiplier);

  return {
    actions,
    baseTotal,
    comboMultiplier,
    lootMultiplier,
    lootRarity,
    totalXp,
  };
}

// ============================================================
// 3. LOOT DROP SYSTEM — Variable Ratio Reinforcement
// ============================================================
// Ethical: upside-only. You always get your base XP.
// The loot drop is a BONUS multiplier on top.
// Drop rates follow a weighted distribution.
// "Pity system": guaranteed rare+ drop every 10 active days.

export type LootRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

interface LootDrop {
  rarity: LootRarity;
  multiplier: number;
  chance: number; // per-day probability
  label: string;
  flavor: string;
}

const LOOT_TABLE: LootDrop[] = [
  {
    rarity: "common",
    multiplier: 1.0,
    chance: 0.5,
    label: "Standard Day",
    flavor: "Solid work.",
  },
  {
    rarity: "uncommon",
    multiplier: 1.25,
    chance: 0.25,
    label: "Good Vibes",
    flavor: "The wind is at your back.",
  },
  {
    rarity: "rare",
    multiplier: 1.5,
    chance: 0.15,
    label: "Power Surge",
    flavor: "Something awakens within you.",
  },
  {
    rarity: "epic",
    multiplier: 2.0,
    chance: 0.08,
    label: "Ultra Instinct",
    flavor: "Your body moved on its own.",
  },
  {
    rarity: "legendary",
    multiplier: 3.0,
    chance: 0.02,
    label: "PLUS ULTRA",
    flavor: "Go beyond. PLUS ULTRA!",
  },
];

const LOOT_COLORS: Record<LootRarity, string> = {
  common: "text-zinc-400",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-amber-300",
};

const LOOT_BG_COLORS: Record<LootRarity, string> = {
  common: "bg-zinc-400/10 border-zinc-400/20",
  uncommon: "bg-green-400/10 border-green-400/20",
  rare: "bg-blue-400/10 border-blue-400/20",
  epic: "bg-purple-400/10 border-purple-400/20",
  legendary: "bg-amber-300/10 border-amber-300/30",
};

export { LOOT_COLORS, LOOT_BG_COLORS, LOOT_TABLE };

function rollLootDrop(baseXp: number): {
  multiplier: number;
  rarity: LootRarity | null;
} {
  if (baseXp === 0) return { multiplier: 1.0, rarity: null };

  // Deterministic "random" based on date so it's consistent per day
  // Uses a simple hash of the date string
  const dateStr = new Date().toISOString().slice(0, 10);
  const hash = Array.from(dateStr).reduce(
    (acc, ch) => (acc * 31 + ch.charCodeAt(0)) & 0xffffffff,
    0
  );
  const roll = (hash % 1000) / 1000; // 0.000 to 0.999

  let cumulative = 0;
  for (const loot of LOOT_TABLE) {
    cumulative += loot.chance;
    if (roll < cumulative) {
      return { multiplier: loot.multiplier, rarity: loot.rarity };
    }
  }
  return { multiplier: 1.0, rarity: "common" };
}

// ============================================================
// 4. RANK / TITLE SYSTEM — Identity, not just numbers
// ============================================================
// Titles are earned through cumulative XP (level).
// Each title has narrative weight — not "Level 5" but "Iron Will".

export interface Rank {
  level: number; // minimum level to hold this rank
  title: string;
  subtitle: string;
  color: string;
  glowClass: string;
  icon: string; // emoji for simplicity in the data layer, rendered as Lucide in UI
}

export const RANKS: Rank[] = [
  {
    level: 1,
    title: "Recruit",
    subtitle: "The journey of 33kg begins with a single rep",
    color: "text-zinc-400",
    glowClass: "",
    icon: "shield",
  },
  {
    level: 3,
    title: "Initiate",
    subtitle: "You chose to start. Most never do.",
    color: "text-zinc-300",
    glowClass: "",
    icon: "shield",
  },
  {
    level: 5,
    title: "Iron Will",
    subtitle: "Discipline is choosing between what you want now and what you want most",
    color: "text-blue-400",
    glowClass: "drop-shadow-[0_0_8px_rgba(96,165,250,0.4)]",
    icon: "swords",
  },
  {
    level: 8,
    title: "Streak Hunter",
    subtitle: "The chain grows. Each link forged in sweat.",
    color: "text-cyan-400",
    glowClass: "drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]",
    icon: "flame",
  },
  {
    level: 12,
    title: "Warrior",
    subtitle: "A real warrior doesn't give up — Naruto",
    color: "text-green-400",
    glowClass: "drop-shadow-[0_0_8px_rgba(74,222,128,0.4)]",
    icon: "swords",
  },
  {
    level: 18,
    title: "Centurion",
    subtitle: "100 workouts behind you. The body remembers.",
    color: "text-amber-400",
    glowClass: "drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]",
    icon: "crown",
  },
  {
    level: 25,
    title: "Elite",
    subtitle: "The top of the mountain is only the beginning",
    color: "text-orange-400",
    glowClass: "drop-shadow-[0_0_10px_rgba(251,146,60,0.5)]",
    icon: "zap",
  },
  {
    level: 35,
    title: "Champion",
    subtitle: "You didn't get lucky. You got relentless.",
    color: "text-purple-400",
    glowClass: "drop-shadow-[0_0_12px_rgba(168,85,247,0.5)]",
    icon: "trophy",
  },
  {
    level: 50,
    title: "Legend",
    subtitle: "Plus Ultra",
    color: "text-amber-300",
    glowClass: "drop-shadow-[0_0_16px_rgba(252,211,77,0.6)]",
    icon: "star",
  },
  {
    level: 75,
    title: "Mythic",
    subtitle: "The one who was counted out, and counted anyway",
    color: "text-rose-400",
    glowClass: "drop-shadow-[0_0_16px_rgba(251,113,133,0.5)]",
    icon: "star",
  },
];

export function getRank(level: number): Rank {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (level >= RANKS[i].level) return RANKS[i];
  }
  return RANKS[0];
}

export function getNextRank(level: number): Rank | null {
  const current = getRank(level);
  const idx = RANKS.findIndex((r) => r.title === current.title);
  return idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
}

// ============================================================
// 5. MULTI-TIER STREAK SYSTEM
// ============================================================
// Three layers to prevent the abstinence violation effect:
// 1. Daily streak — resets after 2 misses (never-miss-twice)
// 2. Weekly consistency — "5/7 days this week" — never fully resets
// 3. Monthly score — always salvageable, always worth continuing
//
// Key insight: Never let the user feel the month is "already lost"

export interface MultiTierStreak {
  // Daily (never-miss-twice)
  dailyStreak: number;
  dailyDanger: boolean; // missed 1 day
  bestDailyStreak: number;

  // Weekly (current week Mon-Sun)
  weeklyActiveDays: number; // 0-7
  weeklyTarget: number; // 5
  weeklyGrade: WeeklyGrade;
  consecutiveGoodWeeks: number; // weeks with 5+ active days

  // Monthly
  monthlyActiveDays: number;
  monthlyTotal: number; // total days in month so far
  monthlyPace: string; // "on track" / "behind" / "ahead"

  // Combo
  comboDay: number; // consecutive days with ANY activity (for multiplier)
}

export type WeeklyGrade = "S" | "A" | "B" | "C" | "F";

export function getWeeklyGrade(activeDays: number): WeeklyGrade {
  if (activeDays >= 7) return "S"; // Perfect
  if (activeDays >= 5) return "A"; // Target
  if (activeDays >= 4) return "B"; // Solid
  if (activeDays >= 2) return "C"; // Minimum
  return "F"; // Needs work
}

const WEEKLY_GRADE_COLORS: Record<WeeklyGrade, string> = {
  S: "text-amber-300",
  A: "text-emerald-400",
  B: "text-blue-400",
  C: "text-orange-400",
  F: "text-red-400",
};

const WEEKLY_GRADE_LABELS: Record<WeeklyGrade, string> = {
  S: "Perfect Week",
  A: "Great Week",
  B: "Solid Week",
  C: "Rough Week",
  F: "Off Track",
};

export { WEEKLY_GRADE_COLORS, WEEKLY_GRADE_LABELS };

// ============================================================
// 6. ACHIEVEMENT SYSTEM — Tiered, meaningful, discoverable
// ============================================================
// Tiers follow the research: 75% / 25% / 10% / 1% unlock rates
// Hidden achievements use the variable ratio — discovered on unlock

export interface Achievement {
  id: string;
  title: string;
  description: string;
  tier: "bronze" | "silver" | "gold" | "diamond";
  category: "consistency" | "strength" | "nutrition" | "mental" | "milestone" | "secret";
  condition: string; // human-readable condition
  icon: string;
  flavor: string; // anime/pop culture flavor text
  hidden: boolean; // secret achievements
}

export const ACHIEVEMENTS: Achievement[] = [
  // BRONZE — 75%+ should earn these (onboarding affirmation)
  {
    id: "first_log",
    title: "First Step",
    description: "Log your first meal",
    tier: "bronze",
    category: "nutrition",
    condition: "total_meals >= 1",
    icon: "utensils",
    flavor: "A journey of a thousand miles begins with a single step.",
    hidden: false,
  },
  {
    id: "first_workout",
    title: "First Blood",
    description: "Complete your first workout",
    tier: "bronze",
    category: "strength",
    condition: "total_workouts >= 1",
    icon: "dumbbell",
    flavor: "The muscles grow when you challenge them. The spirit, too.",
    hidden: false,
  },
  {
    id: "first_checkin",
    title: "Self-Aware",
    description: "Complete your first daily check-in",
    tier: "bronze",
    category: "mental",
    condition: "total_checkins >= 1",
    icon: "brain",
    flavor: "Know thyself — Oracle at Delphi",
    hidden: false,
  },
  {
    id: "three_day",
    title: "Hat Trick",
    description: "3-day exercise streak",
    tier: "bronze",
    category: "consistency",
    condition: "exercise_streak >= 3",
    icon: "flame",
    flavor: "Three days. Three steps out of the valley.",
    hidden: false,
  },
  {
    id: "week_tracked",
    title: "Data Driven",
    description: "Log meals for 7 consecutive days",
    tier: "bronze",
    category: "nutrition",
    condition: "logging_streak >= 7",
    icon: "clipboard",
    flavor: "You can't manage what you don't measure.",
    hidden: false,
  },

  // SILVER — 25% earn these (consistent users)
  {
    id: "seven_streak",
    title: "One Week Warrior",
    description: "7-day exercise streak",
    tier: "silver",
    category: "consistency",
    condition: "exercise_streak >= 7",
    icon: "flame",
    flavor: "Seven days of training. Goku would be proud.",
    hidden: false,
  },
  {
    id: "clean_week",
    title: "Midnight Discipline",
    description: "No eating after 10pm for 7 days straight",
    tier: "silver",
    category: "nutrition",
    condition: "no_late_eating_streak >= 7",
    icon: "moon",
    flavor: "The kitchen closes at 10. No exceptions.",
    hidden: false,
  },
  {
    id: "first_pr",
    title: "Power Up",
    description: "Set your first personal record",
    tier: "silver",
    category: "strength",
    condition: "total_prs >= 1",
    icon: "trophy",
    flavor: "Power comes in response to a need, not a desire — Goku",
    hidden: false,
  },
  {
    id: "a_week",
    title: "Grade A",
    description: "Score an A-grade week (5+ active days)",
    tier: "silver",
    category: "consistency",
    condition: "weekly_grade == A",
    icon: "award",
    flavor: "Consistency beats intensity. Every. Single. Time.",
    hidden: false,
  },
  {
    id: "ten_workouts",
    title: "Double Digits",
    description: "Complete 10 total workouts",
    tier: "silver",
    category: "strength",
    condition: "total_workouts >= 10",
    icon: "dumbbell",
    flavor: "The tenth rep is where it begins.",
    hidden: false,
  },

  // GOLD — 10% earn these (dedicated users)
  {
    id: "thirty_streak",
    title: "Unbreakable",
    description: "30-day exercise streak",
    tier: "gold",
    category: "consistency",
    condition: "exercise_streak >= 30",
    icon: "flame",
    flavor: "I'll surpass my limits. Right here, right now — Asta",
    hidden: false,
  },
  {
    id: "month_clean",
    title: "Monk Mode",
    description: "30 days without eating after 10pm",
    tier: "gold",
    category: "nutrition",
    condition: "no_late_eating_streak >= 30",
    icon: "moon",
    flavor: "Discipline is the bridge between goals and accomplishment.",
    hidden: false,
  },
  {
    id: "five_prs",
    title: "Beyond the Limit",
    description: "Set 5 personal records",
    tier: "gold",
    category: "strength",
    condition: "total_prs >= 5",
    icon: "zap",
    flavor: "The only one who can beat me, is me — Aomine",
    hidden: false,
  },
  {
    id: "four_good_weeks",
    title: "Monthly Warrior",
    description: "4 consecutive A-grade weeks",
    tier: "gold",
    category: "consistency",
    condition: "consecutive_good_weeks >= 4",
    icon: "crown",
    flavor: "A month of war. Your body is the battlefield. You're winning.",
    hidden: false,
  },
  {
    id: "under_120",
    title: "Gatekeeper Slain",
    description: "Weigh in under 120kg",
    tier: "gold",
    category: "milestone",
    condition: "weight <= 120",
    icon: "swords",
    flavor: "The first boss falls. The real game begins.",
    hidden: false,
  },

  // DIAMOND — 1% earn these (legendary)
  {
    id: "hundred_workouts",
    title: "Centurion",
    description: "Complete 100 workouts",
    tier: "diamond",
    category: "strength",
    condition: "total_workouts >= 100",
    icon: "crown",
    flavor: "100 workouts. Not talent. Just showing up.",
    hidden: false,
  },
  {
    id: "sixty_streak",
    title: "Two Months Standing",
    description: "60-day exercise streak",
    tier: "diamond",
    category: "consistency",
    condition: "exercise_streak >= 60",
    icon: "flame",
    flavor: "Hesitation is defeat — Isshin Ashina",
    hidden: false,
  },
  {
    id: "under_100",
    title: "Double Digits",
    description: "Weigh in under 100kg",
    tier: "diamond",
    category: "milestone",
    condition: "weight <= 100",
    icon: "swords",
    flavor: "The century barrier broken. You are not who you were.",
    hidden: false,
  },
  {
    id: "final_boss",
    title: "Final Boss Defeated",
    description: "Reach goal weight: 95kg",
    tier: "diamond",
    category: "milestone",
    condition: "weight <= 95",
    icon: "star",
    flavor: "I am the version of you that gives up. And you beat me.",
    hidden: false,
  },

  // SECRET — Hidden achievements (variable ratio / discovery)
  {
    id: "comeback_kid",
    title: "Comeback Kid",
    description: "Return after 3+ missed days and log a full day",
    tier: "silver",
    category: "secret",
    condition: "comeback_after_3_missed",
    icon: "rotate-ccw",
    flavor: "Giving up is what kills people — Sanji",
    hidden: true,
  },
  {
    id: "dawn_patrol",
    title: "Dawn Patrol",
    description: "Log a workout before 7am",
    tier: "bronze",
    category: "secret",
    condition: "workout_before_7am",
    icon: "sunrise",
    flavor: "The early bird doesn't just get the worm. It gets the XP.",
    hidden: true,
  },
  {
    id: "perfect_week",
    title: "S-Rank",
    description: "Score a perfect S-grade week (7/7 active days)",
    tier: "gold",
    category: "secret",
    condition: "weekly_grade == S",
    icon: "star",
    flavor: "A lesson without pain is meaningless — FMA",
    hidden: true,
  },
  {
    id: "combo_king",
    title: "Combo King",
    description: "Reach 15-day combo (2.5x multiplier)",
    tier: "gold",
    category: "secret",
    condition: "combo_days >= 15",
    icon: "zap",
    flavor: "C-C-C-COMBO BREAKER! ...wait, it didn't break.",
    hidden: true,
  },
  {
    id: "legendary_drop",
    title: "Chosen One",
    description: "Get a Legendary loot drop",
    tier: "diamond",
    category: "secret",
    condition: "received_legendary_drop",
    icon: "sparkles",
    flavor: "Believe in the you that believes in yourself — Kamina",
    hidden: true,
  },
];

export const ACHIEVEMENT_TIER_COLORS: Record<string, string> = {
  bronze: "text-amber-600",
  silver: "text-zinc-300",
  gold: "text-amber-400",
  diamond: "text-cyan-300",
};

export const ACHIEVEMENT_TIER_BG: Record<string, string> = {
  bronze: "bg-amber-600/10 border-amber-600/20",
  silver: "bg-zinc-300/10 border-zinc-300/20",
  gold: "bg-amber-400/10 border-amber-400/20",
  diamond: "bg-cyan-300/10 border-cyan-300/20",
};

// ============================================================
// 7. BOSS FIGHT SYSTEM
// ============================================================

export interface BossFight {
  targetWeight: number;
  name: string;
  taunt: string;
  defeatedQuote: string;
  tier: "mini" | "mid" | "final";
}

export const BOSS_FIGHTS: BossFight[] = [
  {
    targetWeight: 120,
    name: "The Gatekeeper",
    taunt: "You've never beaten me before.",
    defeatedQuote: "First time for everything. The gate is open.",
    tier: "mini",
  },
  {
    targetWeight: 110,
    name: "The Plateau",
    taunt: "Everyone quits here. Will you?",
    defeatedQuote: "They quit. You didn't. Remember that.",
    tier: "mid",
  },
  {
    targetWeight: 100,
    name: "The Centurion",
    taunt: "Double digits are a myth for people like you.",
    defeatedQuote: "Two digits. The myth is now your reality.",
    tier: "mid",
  },
  {
    targetWeight: 95,
    name: "The Final Boss",
    taunt: "I am the version of you that gives up.",
    defeatedQuote: "You beat yourself. The hardest fight there is.",
    tier: "final",
  },
];

export function getCurrentBoss(currentWeight: number): BossFight | null {
  for (const boss of BOSS_FIGHTS) {
    if (currentWeight > boss.targetWeight) return boss;
  }
  return null;
}

export function getBossHpPercent(
  currentWeight: number,
  boss: BossFight
): number {
  const maxHp = START_WEIGHT - boss.targetWeight;
  const currentHp = currentWeight - boss.targetWeight;
  return Math.max(0, Math.min(100, (currentHp / maxHp) * 100));
}

const START_WEIGHT = 128;

// ============================================================
// 8. ANTI-CHURN / COMEBACK SYSTEM
// ============================================================
// Based on: Fresh Start Effect + Abstinence Violation countermeasures
// Rule: NEVER tell the user they failed. Always offer a path forward.

export interface ComebackStatus {
  missedDays: number;
  isComeback: boolean; // 3+ days missed
  comebackBonusMultiplier: number;
  freshStartLabel: string | null;
  message: string;
}

export function getComebackStatus(
  lastActiveDate: string | null,
  today: string
): ComebackStatus {
  if (!lastActiveDate) {
    return {
      missedDays: 0,
      isComeback: false,
      comebackBonusMultiplier: 1.0,
      freshStartLabel: null,
      message: "Welcome. Let's begin.",
    };
  }

  const last = new Date(lastActiveDate);
  const now = new Date(today);
  const missed = Math.max(
    0,
    Math.floor((now.getTime() - last.getTime()) / 86400000) - 1
  );

  if (missed === 0) {
    return {
      missedDays: 0,
      isComeback: false,
      comebackBonusMultiplier: 1.0,
      freshStartLabel: null,
      message: "",
    };
  }

  if (missed === 1) {
    return {
      missedDays: 1,
      isComeback: false,
      comebackBonusMultiplier: 1.0,
      freshStartLabel: null,
      message: "You missed yesterday. Today saves the streak. Don't miss twice.",
    };
  }

  // Comeback bonus: missed 2+ days. Bonus scales with absence.
  // 2 days: 1.5x, 3-6 days: 2.0x, 7+ days: 2.5x (plus welcome back)
  const bonus =
    missed <= 2 ? 1.5 : missed <= 6 ? 2.0 : 2.5;

  // Fresh start effect: check if today is a temporal landmark
  const dayOfWeek = now.getDay();
  const dayOfMonth = now.getDate();
  const freshStart =
    dayOfWeek === 1
      ? "New Week"
      : dayOfMonth === 1
        ? "New Month"
        : null;

  const messages = [
    "Your progress is saved. Your streaks reset. Your knowledge doesn't.",
    "The best day to restart was yesterday. The second best is now.",
    "Everyone falls. The ones who get back up become legends.",
    "A setback is a setup for a comeback.",
  ];
  const msgIdx = missed % messages.length;

  return {
    missedDays: missed,
    isComeback: missed >= 3,
    comebackBonusMultiplier: bonus,
    freshStartLabel: freshStart,
    message: messages[msgIdx],
  };
}

// ============================================================
// 9. DAILY QUOTE SYSTEM — Anime + Pop Culture + Personal
// ============================================================

interface Quote {
  text: string;
  source: string;
  category: "anime" | "game" | "personal" | "philosophy";
}

const QUOTES: Quote[] = [
  // Rocky / Sports Movies
  { text: "It ain't about how hard you hit. It's about how hard you can get hit and keep moving forward.", source: "Rocky Balboa", category: "philosophy" },
  { text: "Every champion was once a contender who refused to give up.", source: "Rocky", category: "philosophy" },
  { text: "Going in one more round when you don't think you can — that's what makes all the difference.", source: "Rocky", category: "philosophy" },
  { text: "Nobody's gonna hit as hard as life. But it ain't about how hard you hit.", source: "Rocky Balboa", category: "philosophy" },
  { text: "You, me, or nobody is gonna hit as hard as life. But it ain't about how hard ya hit.", source: "Rocky VI", category: "philosophy" },
  { text: "I didn't hear no bell.", source: "Randy, South Park (but also Rocky energy)", category: "philosophy" },
  { text: "Pain is temporary. Quitting lasts forever.", source: "Lance Armstrong (the quote still hits)", category: "philosophy" },
  { text: "I fear not the man who has practiced 10,000 kicks once, but the man who has practiced one kick 10,000 times.", source: "Bruce Lee", category: "philosophy" },
  { text: "Strength does not come from winning. Your struggles develop your strengths.", source: "Arnold Schwarzenegger", category: "philosophy" },
  { text: "The last three or four reps is what makes the muscle grow.", source: "Arnold Schwarzenegger", category: "philosophy" },

  // Anime
  { text: "A lesson without pain is meaningless.", source: "FMA: Brotherhood", category: "anime" },
  { text: "If you don't like your destiny, don't accept it.", source: "Naruto", category: "anime" },
  { text: "Giving up is what kills people.", source: "One Piece", category: "anime" },
  { text: "I'll surpass my limits. Right here, right now.", source: "Black Clover", category: "anime" },
  { text: "Power comes in response to a need, not a desire.", source: "Dragon Ball Z", category: "anime" },
  { text: "A real man never dies, even when he's killed!", source: "Kamina, TTGL", category: "anime" },
  { text: "The only one who can beat me, is me.", source: "Aomine, Kuroko", category: "anime" },
  { text: "Believe in the you that believes in yourself.", source: "Gurren Lagann", category: "anime" },
  { text: "If you can still stand, if you can still move — fight.", source: "Baki", category: "anime" },
  { text: "Talent is something you bloom. Instinct is something you polish.", source: "Oikawa, Haikyuu", category: "anime" },
  { text: "The night is darkest before the dawn. But the dawn is coming.", source: "One Piece", category: "anime" },
  { text: "You should enjoy the little detours to the fullest.", source: "Ging, HxH", category: "anime" },
  { text: "It's not about whether you get knocked down. It's about whether you get back up.", source: "Ippo", category: "anime" },
  { text: "Endure. In enduring, grow strong.", source: "Berserk", category: "anime" },

  // Games
  { text: "Hesitation is defeat.", source: "Isshin Ashina, Sekiro", category: "game" },
  { text: "Rise, Tarnished.", source: "Elden Ring", category: "game" },
  { text: "A man chooses. A slave obeys.", source: "BioShock", category: "game" },
  { text: "War never changes. But men do, through the roads they walk.", source: "Fallout", category: "game" },
  { text: "We all make choices. But in the end, our choices make us.", source: "BioShock", category: "game" },
  { text: "The right man in the wrong place can make all the difference.", source: "Half-Life 2", category: "game" },
  { text: "Would you kindly... keep going?", source: "BioShock", category: "game" },
  { text: "Don't you dare go hollow.", source: "Dark Souls", category: "game" },
  { text: "Praise the sun!", source: "Solaire, Dark Souls", category: "game" },

  // Personal / Philosophy
  { text: "The ceiling was never the problem. The floor was.", source: "You", category: "personal" },
  { text: "You don't rise to the level of your goals. You fall to the level of your systems.", source: "James Clear", category: "philosophy" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", source: "Proverb", category: "philosophy" },
  { text: "We are what we repeatedly do. Excellence is not an act, but a habit.", source: "Aristotle", category: "philosophy" },
  { text: "Discipline is choosing between what you want now and what you want most.", source: "Abraham Lincoln", category: "philosophy" },
  { text: "The pain of discipline weighs ounces. The pain of regret weighs tons.", source: "Jim Rohn", category: "philosophy" },
];

export function getDailyQuote(): Quote {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000
  );
  return QUOTES[dayOfYear % QUOTES.length];
}

export function getRandomQuote(): Quote {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

// ============================================================
// 10. REST DAY / SCHEDULED BREAK SYSTEM
// ============================================================
// Key insight: Rest days are NOT failure. They're part of the program.
// Sundays = default rest. Occasions = planned breaks. Post-break = ease-back.
//
// The system distinguishes:
// 1. REST DAY — planned, expected, no penalty. Streak pauses, doesn't break.
// 2. OCCASION — birthday, travel, festival. Pre-declared, no penalty for 1-3 days.
// 3. UNPLANNED MISS — the dangerous one. This is where anti-churn kicks in.
// 4. EASE-BACK — after any break of 2+ days, reduce targets for 2 days.

export type DayType = "active" | "rest" | "occasion" | "missed";

export interface RestDayConfig {
  restDays: number[]; // 0=Sun, 1=Mon, etc. Default: [0] (Sunday)
  // On rest days: just log food + no late eating. No workout required.
  // Rest days KEEP the logging streak alive.
  // Rest days DON'T count toward exercise streak (it pauses, not breaks).
}

export const DEFAULT_REST_CONFIG: RestDayConfig = {
  restDays: [0], // Sunday
};

export function isRestDay(date: Date, config: RestDayConfig = DEFAULT_REST_CONFIG): boolean {
  return config.restDays.includes(date.getDay());
}

export interface EaseBackStatus {
  active: boolean;
  daysRemaining: number;
  reducedCalorieTarget: number; // 2200 instead of 2000 (more forgiving)
  reducedWorkoutTarget: string; // "Just a 15-min walk" instead of full workout
  message: string;
}

export function getEaseBackStatus(
  daysSinceLastActive: number,
  daysSinceReturn: number
): EaseBackStatus {
  // Ease-back activates after 2+ missed days, lasts for 2 days after return
  if (daysSinceLastActive <= 1 || daysSinceReturn > 2) {
    return {
      active: false,
      daysRemaining: 0,
      reducedCalorieTarget: 2000,
      reducedWorkoutTarget: "",
      message: "",
    };
  }

  const daysRemaining = Math.max(0, 2 - daysSinceReturn);
  return {
    active: true,
    daysRemaining,
    reducedCalorieTarget: 2200, // 10% more forgiving
    reducedWorkoutTarget: "Just a 15-minute walk counts today",
    message:
      daysRemaining === 2
        ? "Ease-back day 1: Reduced targets. Just show up."
        : "Ease-back day 2: Almost back to full. You've got this.",
  };
}

// Occasion / planned break system
export interface PlannedBreak {
  id: string;
  startDate: string;
  endDate: string;
  reason: string; // "Birthday", "Travel", "Festival", "Sick"
  // During planned breaks:
  // - Exercise streak pauses (not breaks)
  // - Logging streak stays alive if you log even one meal
  // - No XP penalty
  // - Ease-back activates on return
}

// ============================================================
// 11. TIPS & TRICKS SYSTEM — Contextual wisdom
// ============================================================
// Tips are shown contextually based on what the user is doing.
// Not random — triggered by behavior patterns.

export interface Tip {
  id: string;
  text: string;
  trigger: string; // when to show this tip
  category: "nutrition" | "exercise" | "sleep" | "mindset" | "strategy";
}

export const TIPS: Tip[] = [
  // Nutrition
  {
    id: "protein_first",
    text: "Order protein first at restaurants. Tandoori chicken > butter chicken. Grilled > fried. Your wallet and waistline both win.",
    trigger: "logging_meal_eating_out",
    category: "nutrition",
  },
  {
    id: "water_before",
    text: "Drink a full glass of water before every meal. Research shows it reduces calorie intake by 13% per meal.",
    trigger: "before_meal",
    category: "nutrition",
  },
  {
    id: "late_night_hack",
    text: "Craving food at midnight? Brush your teeth. The mint taste makes everything sound disgusting. Works every time.",
    trigger: "late_night",
    category: "nutrition",
  },
  {
    id: "eating_out_trick",
    text: "Ask for sauce on the side. A single serving of butter chicken gravy can be 400 cal. The chicken itself is only 200.",
    trigger: "eating_out",
    category: "nutrition",
  },
  {
    id: "calorie_bomb",
    text: "Biryani is 600-800 cal per plate. Not banned — just budget for it. Skip the raita (100 cal) and take the salad.",
    trigger: "high_calorie_day",
    category: "nutrition",
  },
  {
    id: "protein_sources",
    text: "Bangalore protein hack: 6 boiled eggs = 36g protein, 420 cal, Rs 60. Available at any 7-Eleven or bakery.",
    trigger: "low_protein",
    category: "nutrition",
  },

  // Exercise
  {
    id: "incline_walk",
    text: "12% incline, 3 mph, 30 min burns fat more efficiently than running at your weight. Stack it with one anime episode.",
    trigger: "cardio_day",
    category: "exercise",
  },
  {
    id: "rest_day_walk",
    text: "Rest day doesn't mean zero movement. A 20-min walk keeps the momentum alive without taxing recovery.",
    trigger: "rest_day",
    category: "exercise",
  },
  {
    id: "progressive_overload",
    text: "Add 2.5kg every session you can. If you stall for 3 sessions, deload 10% and rebuild. The gains are in the reload.",
    trigger: "strength_day",
    category: "exercise",
  },
  {
    id: "minimum_viable",
    text: "Your worst day still counts: log food + 10 min walk = streak survives. The floor matters more than the ceiling.",
    trigger: "low_energy",
    category: "exercise",
  },

  // Sleep
  {
    id: "anchor_wake",
    text: "Pick one wake-up time and never move it. Even weekends. Your body calibrates everything else around it.",
    trigger: "chaotic_sleep",
    category: "sleep",
  },
  {
    id: "no_screens",
    text: "No screens 30 min before sleep. Swap for manga or a book. Blue light suppresses melatonin by 50%.",
    trigger: "poor_sleep",
    category: "sleep",
  },
  {
    id: "morning_sunlight",
    text: "10 min of morning sunlight within 30 min of waking resets your circadian clock faster than any supplement.",
    trigger: "morning",
    category: "sleep",
  },

  // Mindset
  {
    id: "one_bad_day",
    text: "One 3000-cal day in a week of 1800-cal days barely moves the weekly average. The math protects you. Trust it.",
    trigger: "overate",
    category: "mindset",
  },
  {
    id: "not_motivation",
    text: "Motivation gets you started. Systems keep you going. You don't need to feel like it. You need to log it.",
    trigger: "low_motivation",
    category: "mindset",
  },
  {
    id: "identity_shift",
    text: "You're not 'trying to lose weight.' You're someone who tracks their food and moves daily. Identity > goals.",
    trigger: "general",
    category: "mindset",
  },
  {
    id: "comparison",
    text: "The only person you're competing with is the version of you from last week. And you're winning.",
    trigger: "general",
    category: "mindset",
  },

  // Strategy
  {
    id: "remove_friction",
    text: "Remove Swiggy/Zomato from your home screen. Move them to the last page. Making the bad choice harder is more effective than willpower.",
    trigger: "late_night",
    category: "strategy",
  },
  {
    id: "pre_stage",
    text: "Pre-stage tomorrow's gym clothes tonight. When you wake up, the decision is already made.",
    trigger: "evening_checkin",
    category: "strategy",
  },
  {
    id: "two_minute_rule",
    text: "Don't think about 'working out.' Think about 'putting on gym shoes.' The rest follows. (Atomic Habits, Chapter 13)",
    trigger: "low_motivation",
    category: "strategy",
  },
];

export function getTipForContext(trigger: string): Tip | null {
  const matching = TIPS.filter((t) => t.trigger === trigger);
  if (matching.length === 0) return null;
  // Rotate based on day of year
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000
  );
  return matching[dayOfYear % matching.length];
}
