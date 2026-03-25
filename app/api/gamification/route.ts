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
  getWeeklyGrade,
  WEEKLY_GRADE_COLORS,
  WEEKLY_GRADE_LABELS,
  ACHIEVEMENTS,
  BOSS_FIGHTS,
} from "@/lib/gamification";

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
  };

  const totalXp = profile.total_xp ?? 0;
  const levelInfo = levelFromTotalXp(totalXp);
  const rank = getRank(levelInfo.level);
  const nextRank = getNextRank(levelInfo.level);

  // Comeback status
  const comeback = getComebackStatus(profile.last_active_date, today);

  // Boss fight
  // Get latest weight from daily_log
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
    // Don't reveal hidden achievements that aren't unlocked
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
