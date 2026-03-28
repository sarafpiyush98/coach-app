import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import {
  levelFromTotalXp,
  getRank,
  getNextRank,
  getCurrentBoss,
  getBossHpPercent,
  getDailyQuote,
  getComebackStatus,
  ACHIEVEMENTS,
} from "@/lib/gamification";
import { calculateStats, getStatTotal, getDistributablePoints, type PlayerStats } from "@/lib/stats";
import { getHunterRank, getNextHunterRank } from "@/lib/ranks";

interface ShadowSoldier {
  id: string;
  name: string;
  unlockCondition: string;
  benefit: string;
  unlocked: boolean;
}

function getShadows(profile: {
  total_workouts: number;
  best_exercise_streak: number;
  best_logging_streak: number;
  total_checkins: number;
  level: number;
}): ShadowSoldier[] {
  const level = profile.level ?? 1;
  const hunterRank = getHunterRank(level);

  return [
    {
      id: "iron",
      name: "Iron",
      unlockCondition: "Complete 50 movement protocols",
      benefit: "The soldier who never tires. Workout insights unlocked.",
      unlocked: (profile.total_workouts ?? 0) >= 50,
    },
    {
      id: "igris",
      name: "Igris",
      unlockCondition: "Maintain 14-day exercise streak",
      benefit: "The Red Knight's loyalty. One free streak miss per week.",
      unlocked: (profile.best_exercise_streak ?? 0) >= 14,
    },
    {
      id: "tank",
      name: "Tank",
      unlockCondition: "Hit protein target 21 consecutive days",
      benefit: "The wall that feeds the army. Meal patterns revealed.",
      unlocked: (profile.best_logging_streak ?? 0) >= 21,
    },
    {
      id: "beru",
      name: "Beru",
      unlockCondition: "Complete 30 full daily quest sets",
      benefit: "The servant who absorbs punishment. Penalty difficulty reduced.",
      unlocked: (profile.total_checkins ?? 0) >= 30,
    },
    {
      id: "tusk",
      name: "Tusk",
      unlockCondition: "Reach B-Rank",
      benefit: "The shaman who sees further. Side quest variety expanded.",
      unlocked: hunterRank.minLevel >= 18,
    },
    {
      id: "bellion",
      name: "Bellion",
      unlockCondition: "Reach S-Rank",
      benefit: "The marshal's battlefield instinct. Emergency quest XP doubled.",
      unlocked: hunterRank.minLevel >= 40,
    },
  ];
}

export async function GET() {
  const today = format(new Date(), "yyyy-MM-dd");

  const [profileRes, xpLogRes, achievementsRes, breaksRes] = await Promise.all([
    supabase.from("player_profile").select("*").limit(1).single(),
    supabase
      .from("xp_log")
      .select("*")
      .order("date", { ascending: false })
      .limit(30),
    supabase.from("unlocked_achievements").select("*"),
    supabase
      .from("planned_breaks")
      .select("*")
      .gte("end_date", today)
      .order("start_date", { ascending: true }),
  ]);

  // Handle missing profile gracefully
  const profile = profileRes.data ?? {
    total_xp: 0,
    level: 1,
    total_workouts: 0,
    total_meals_logged: 0,
    total_checkins: 0,
    total_prs: 0,
    best_exercise_streak: 0,
    best_logging_streak: 0,
    best_no_late_eating_streak: 0,
    best_combo: 0,
    consecutive_good_weeks: 0,
    last_active_date: null,
    allocated_stat_points: 0,
  };

  const totalXp = profile.total_xp ?? 0;
  const levelInfo = levelFromTotalXp(totalXp);
  const rank = getRank(levelInfo.level);
  const nextRank = getNextRank(levelInfo.level);

  // Hunter rank system
  const hunterRank = getHunterRank(levelInfo.level);
  const nextHunterRank = getNextHunterRank(levelInfo.level);

  // 5-stat system (includes manual allocations)
  const statAllocations = (
    (profile as Record<string, unknown>).stat_allocations as Record<string, number> | null
  ) ?? {};
  const stats: PlayerStats = calculateStats({
    totalWorkouts: profile.total_workouts ?? 0,
    totalPrs: profile.total_prs ?? 0,
    totalCheckins: profile.total_checkins ?? 0,
    totalMealsLogged: profile.total_meals_logged ?? 0,
    bestExerciseStreak: profile.best_exercise_streak ?? 0,
    bestLoggingStreak: profile.best_logging_streak ?? 0,
    bestNoLateEatingStreak: profile.best_no_late_eating_streak ?? 0,
    bestCombo: profile.best_combo ?? 0,
    consecutiveGoodWeeks: profile.consecutive_good_weeks ?? 0,
    level: levelInfo.level,
    allocations: statAllocations,
  });

  const distributablePoints = getDistributablePoints(
    levelInfo.level,
    profile.allocated_stat_points ?? 0
  );

  // Shadow army
  const shadows = getShadows({
    total_workouts: profile.total_workouts ?? 0,
    best_exercise_streak: profile.best_exercise_streak ?? 0,
    best_logging_streak: profile.best_logging_streak ?? 0,
    total_checkins: profile.total_checkins ?? 0,
    level: levelInfo.level,
  });

  // Comeback status
  const comeback = getComebackStatus(profile.last_active_date, today);

  // Boss fight
  const { data: latestWeightRow } = await supabase
    .from("daily_log")
    .select("weight_kg")
    .not("weight_kg", "is", null)
    .order("date", { ascending: false })
    .limit(1)
    .single();

  const currentWeight = (latestWeightRow as { weight_kg: number } | null)?.weight_kg ?? 128;
  const boss = getCurrentBoss(currentWeight);
  const bossHp = boss ? getBossHpPercent(currentWeight, boss) : null;

  // Unlocked achievement IDs
  const unlockedIds = (achievementsRes.data ?? []).map(
    (a: { achievement_id: string }) => a.achievement_id
  );

  // Build full achievement list with unlock status
  const achievements = ACHIEVEMENTS.map((a) => ({
    ...a,
    unlocked: unlockedIds.includes(a.id),
    title: a.hidden && !unlockedIds.includes(a.id) ? "???" : a.title,
    description:
      a.hidden && !unlockedIds.includes(a.id)
        ? "Secret achievement"
        : a.description,
    flavor:
      a.hidden && !unlockedIds.includes(a.id) ? "" : a.flavor,
  }));

  // Today's quote
  const quote = getDailyQuote();

  // Recent XP log
  const recentXp = (xpLogRes.data ?? []).slice(0, 7);

  return Response.json({
    data: {
      profile: {
        totalXp,
        level: levelInfo.level,
        xpIntoLevel: levelInfo.xpIntoLevel,
        xpNeeded: levelInfo.currentLevelXp,
        levelProgress: levelInfo.progress,
        rank,
        nextRank,
        totalWorkouts: profile.total_workouts ?? 0,
        totalMealsLogged: profile.total_meals_logged ?? 0,
        totalPrs: profile.total_prs ?? 0,
        bestExerciseStreak: profile.best_exercise_streak ?? 0,
        bestLoggingStreak: profile.best_logging_streak ?? 0,
        bestCombo: profile.best_combo ?? 0,
        consecutiveGoodWeeks: profile.consecutive_good_weeks ?? 0,
      },
      hunterRank,
      nextHunterRank,
      stats,
      statTotal: getStatTotal(stats),
      distributablePoints,
      shadows,
      boss: boss
        ? {
            ...boss,
            currentWeight,
            hpPercent: bossHp,
            kgRemaining: currentWeight - boss.targetWeight,
          }
        : null,
      comeback,
      achievements,
      unlockedCount: unlockedIds.length,
      totalAchievements: ACHIEVEMENTS.filter((a) => !a.hidden).length,
      recentXp,
      quote,
      plannedBreaks: breaksRes.data ?? [],
    },
  });
}
