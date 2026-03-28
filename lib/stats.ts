// ============================================================
// 5-STAT ENGINE — Derived from tracked data, no new DB tables
// ============================================================

export interface PlayerStats {
  STR: number; // Strength workouts + PRs
  AGI: number; // Cardio + walks + active minutes
  VIT: number; // Sleep quality + wake consistency + no late eating
  INT: number; // Meal logging + macro accuracy
  DSC: number; // Streaks + combo + completion rate
}

export interface StatInput {
  totalWorkouts: number;
  totalPrs: number;
  totalCheckins: number;
  totalMealsLogged: number;
  bestExerciseStreak: number;
  bestLoggingStreak: number;
  bestNoLateEatingStreak: number;
  bestCombo: number;
  consecutiveGoodWeeks: number;
  level: number;
}

export function calculateStats(
  input: StatInput & { allocations?: Record<string, number> }
): PlayerStats {
  const {
    totalWorkouts,
    totalPrs,
    totalCheckins,
    totalMealsLogged,
    bestExerciseStreak,
    bestLoggingStreak,
    bestNoLateEatingStreak,
    bestCombo,
    consecutiveGoodWeeks,
    level,
    allocations,
  } = input;

  const stats: PlayerStats = {
    STR: Math.floor(totalWorkouts * 0.5 + totalPrs * 3),
    AGI: Math.floor(totalWorkouts * 0.3 + totalCheckins * 0.1),
    VIT: Math.floor(bestNoLateEatingStreak * 1.0 + bestLoggingStreak * 0.3),
    INT: Math.floor(totalMealsLogged * 0.2 + consecutiveGoodWeeks * 2),
    DSC: Math.floor(bestExerciseStreak * 0.8 + bestCombo * 0.5 + level * 0.3),
  };

  if (allocations) {
    stats.STR += allocations.STR ?? 0;
    stats.AGI += allocations.AGI ?? 0;
    stats.VIT += allocations.VIT ?? 0;
    stats.INT += allocations.INT ?? 0;
    stats.DSC += allocations.DSC ?? 0;
  }

  return stats;
}

export function getStatTotal(stats: PlayerStats): number {
  return stats.STR + stats.AGI + stats.VIT + stats.INT + stats.DSC;
}

export function getDistributablePoints(
  level: number,
  allocatedPoints: number
): number {
  return Math.max(level * 3 - allocatedPoints, 0);
}

export const STAT_COLORS: Record<keyof PlayerStats, string> = {
  STR: "#EF4444",
  AGI: "#06B6D4",
  VIT: "#22C55E",
  INT: "#1B45D7",
  DSC: "#A855F7",
};
