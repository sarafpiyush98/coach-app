/**
 * XP WRITE-BACK ENGINE
 *
 * Idempotent function that recalculates all gamification state for a given date
 * and writes it to xp_log, player_profile, and unlocked_achievements.
 *
 * Called at the end of every POST /api/meals, /api/workouts, /api/checkin.
 */

import { supabase } from "@/lib/supabase";
import { format, subDays, differenceInCalendarDays } from "date-fns";
import { getDailyQuests } from "@/lib/quests";
import { calculateStreaks } from "@/lib/streaks";
import {
  levelFromTotalXp,
  LOOT_TABLE,
  ACHIEVEMENTS,
} from "@/lib/gamification";
import type { LootRarity } from "@/lib/gamification";
import type { DailyLog, Meal } from "@/lib/types";

// Player profile row shape (not in Database type yet)
interface PlayerProfile {
  id: string;
  total_xp: number;
  level: number;
  total_workouts: number;
  total_meals_logged: number;
  total_checkins: number;
  total_prs: number;
  best_exercise_streak: number;
  best_logging_streak: number;
  best_no_late_eating_streak: number;
  best_combo: number;
  last_active_date: string | null;
  allocated_stat_points: number;
  consecutive_good_weeks: number;
}

// Deterministic loot roll from date string — same logic as dashboard route
function rollLootForDate(dateStr: string): {
  multiplier: number;
  rarity: LootRarity;
  label: string;
} {
  const hash = Array.from(dateStr).reduce(
    (acc, ch) => (acc * 31 + ch.charCodeAt(0)) & 0xffffffff,
    0
  );
  const roll = (hash % 1000) / 1000;
  let cumulative = 0;
  for (const loot of LOOT_TABLE) {
    cumulative += loot.chance;
    if (roll < cumulative) {
      return {
        multiplier: loot.multiplier,
        rarity: loot.rarity,
        label: loot.label,
      };
    }
  }
  return { multiplier: 1.0, rarity: "common" as const, label: "Standard Day" };
}

// Count consecutive days with ANY activity going backwards from date
function countComboDays(
  logMap: Map<string, DailyLog>,
  fromDate: string
): number {
  const start = new Date(fromDate);
  let combo = 0;

  for (let i = 0; i < 365; i++) {
    const d = format(subDays(start, i), "yyyy-MM-dd");
    const log = logMap.get(d);
    if (log && (log.meals_logged || log.workout_done)) {
      combo++;
    } else {
      break;
    }
  }

  return combo;
}

export async function recalculateAndWriteXP(date: string): Promise<void> {
  try {
    const ninetyDaysAgo = format(subDays(new Date(date), 90), "yyyy-MM-dd");

    // 1. Read all state in parallel
    const [
      dailyLogRes,
      mealsRes,
      prsRes,
      profileRes,
      streakLogsRes,
      allXpLogsRes,
      existingAchievementsRes,
    ] = await Promise.all([
      supabase
        .from("daily_log")
        .select("*")
        .eq("date", date)
        .maybeSingle(),
      supabase
        .from("meals")
        .select("*")
        .eq("date", date)
        .order("meal_number"),
      supabase
        .from("exercises")
        .select("*, workouts!inner(date)")
        .eq("is_pr", true)
        .eq("workouts.date" as never, date),
      supabase.from("player_profile").select("*").limit(1).single(),
      supabase
        .from("daily_log")
        .select("*")
        .gte("date", ninetyDaysAgo)
        .lte("date", date)
        .order("date", { ascending: false }),
      supabase
        .from("xp_log")
        .select("date, total_xp"),
      supabase
        .from("unlocked_achievements")
        .select("achievement_id"),
    ]);

    const dailyLog = (dailyLogRes.data as DailyLog | null) ?? null;
    const meals = (mealsRes.data as Meal[]) ?? [];
    const todayPrs = prsRes.data ?? [];
    const hasPR = todayPrs.length > 0;
    const profile = profileRes.data as unknown as PlayerProfile | null;
    const streakLogs = (streakLogsRes.data as DailyLog[]) ?? [];
    const allXpLogs = allXpLogsRes.data ?? [];
    const unlockedSet = new Set(
      (existingAchievementsRes.data ?? []).map(
        (a: { achievement_id: string }) => a.achievement_id
      )
    );

    // 2. Calculate quest completion
    const quests = getDailyQuests(dailyLog, meals);

    // 3. Calculate base XP from completed quests
    let baseXp = quests
      .filter((q) => q.completed)
      .reduce((sum, q) => sum + q.xpReward, 0);

    // PR bonus
    if (hasPR) {
      baseXp += 75;
    }

    // 4. Combo day calculation
    const logMap = new Map<string, DailyLog>();
    for (const log of streakLogs) {
      logMap.set(log.date, log);
    }
    const comboDay = countComboDays(logMap, date);
    const comboMultiplier = Math.min(1 + comboDay * 0.1, 2.5);

    // 5. Loot multiplier (deterministic from date)
    const loot = rollLootForDate(date);

    // 6. Total XP for today
    const todayXp = Math.round(baseXp * comboMultiplier * loot.multiplier);

    // 7. Build quest breakdown for the JSON column
    const breakdown = {
      quests: quests
        .filter((q) => q.completed)
        .map((q) => ({ id: q.id, name: q.name, xp: q.xpReward })),
      hasPR,
      prBonus: hasPR ? 75 : 0,
    };

    // 8. Upsert xp_log
    const { error: xpLogError } = await supabase
      .from("xp_log")
      .upsert(
        {
          date,
          base_xp: baseXp,
          combo_multiplier: comboMultiplier,
          loot_multiplier: loot.multiplier,
          loot_rarity: loot.rarity,
          total_xp: todayXp,
          breakdown,
        } as never,
        { onConflict: "date" }
      );

    if (xpLogError) {
      console.error("[xp-engine] Failed to upsert xp_log:", xpLogError.message);
      return;
    }

    // 9. Calculate total_xp from all xp_log entries
    // Replace today's entry in the in-memory list for accurate sum
    const otherDaysXp = allXpLogs
      .filter((row: { date: string; total_xp: number }) => row.date !== date)
      .reduce((sum: number, row: { total_xp: number }) => sum + (row.total_xp ?? 0), 0);
    const totalXp = otherDaysXp + todayXp;

    // 10. Level from total XP
    const levelInfo = levelFromTotalXp(totalXp);

    // 11. Aggregate counts for profile
    const [totalWorkoutsRes, totalMealsRes, totalCheckinsRes, totalPrsRes] =
      await Promise.all([
        supabase
          .from("daily_log")
          .select("date", { count: "exact", head: true })
          .eq("workout_done", true),
        supabase
          .from("meals")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("daily_log")
          .select("date", { count: "exact", head: true })
          .not("sleep_hours", "is", null),
        supabase
          .from("exercises")
          .select("id", { count: "exact", head: true })
          .eq("is_pr", true),
      ]);

    const totalWorkouts = totalWorkoutsRes.count ?? 0;
    const totalMealsLogged = totalMealsRes.count ?? 0;
    const totalCheckins = totalCheckinsRes.count ?? 0;
    const totalPrs = totalPrsRes.count ?? 0;

    // 12. Streak calculation
    const streaks = calculateStreaks(streakLogs, date);

    const bestExerciseStreak = Math.max(
      streaks.exercise,
      profile?.best_exercise_streak ?? 0
    );
    const bestLoggingStreak = Math.max(
      streaks.logging,
      profile?.best_logging_streak ?? 0
    );
    const bestNoLateEatingStreak = Math.max(
      streaks.noLateEating,
      profile?.best_no_late_eating_streak ?? 0
    );
    const bestCombo = Math.max(comboDay, profile?.best_combo ?? 0);

    // 13. Ensure player_profile row exists
    let profileId = profile?.id;
    if (!profileId) {
      const { data: newProfile, error: insertError } = await supabase
        .from("player_profile")
        .insert({ total_xp: 0, level: 1 } as never)
        .select("id")
        .single();
      if (insertError || !newProfile) {
        console.error("[xp-engine] Failed to create player_profile:", insertError?.message);
        return;
      }
      profileId = (newProfile as { id: string }).id;
    }

    // 14. Update player_profile
    const { error: profileError } = await supabase
      .from("player_profile")
      .update({
        total_xp: totalXp,
        level: levelInfo.level,
        total_workouts: totalWorkouts,
        total_meals_logged: totalMealsLogged,
        total_checkins: totalCheckins,
        total_prs: totalPrs,
        best_exercise_streak: bestExerciseStreak,
        best_logging_streak: bestLoggingStreak,
        best_no_late_eating_streak: bestNoLateEatingStreak,
        best_combo: bestCombo,
        last_active_date: date,
      } as never)
      .eq("id", profileId as never);

    if (profileError) {
      console.error(
        "[xp-engine] Failed to update player_profile:",
        profileError.message
      );
      return;
    }

    // 14. Check achievement unlocks
    const lastActiveDate = profile?.last_active_date ?? null;
    const daysSinceLastActive = lastActiveDate
      ? differenceInCalendarDays(new Date(date), new Date(lastActiveDate))
      : 0;

    // Check if any workout today was before 7am
    const { data: todayWorkouts } = await supabase
      .from("workouts")
      .select("created_at")
      .eq("date", date);

    const hasEarlyWorkout = (todayWorkouts ?? []).some(
      (w: { created_at: string }) => {
        const hour = new Date(w.created_at).getHours();
        return hour < 7;
      }
    );

    // Check perfect week: 7 consecutive active days ending today
    const perfectWeek = comboDay >= 7;

    // Weight from today's log
    const todayWeight = dailyLog?.weight_kg ?? null;

    // Map achievement IDs to conditions
    const conditionMap: Record<string, boolean> = {
      first_log: totalMealsLogged >= 1,
      first_workout: totalWorkouts >= 1,
      first_checkin: totalCheckins >= 1,
      three_day: streaks.exercise >= 3,
      week_tracked: streaks.logging >= 7,
      seven_streak: streaks.exercise >= 7,
      clean_week: streaks.noLateEating >= 7,
      first_pr: totalPrs >= 1,
      ten_workouts: totalWorkouts >= 10,
      thirty_streak: streaks.exercise >= 30,
      month_clean: streaks.noLateEating >= 30,
      five_prs: totalPrs >= 5,
      hundred_workouts: totalWorkouts >= 100,
      sixty_streak: streaks.exercise >= 60,
      comeback_kid: daysSinceLastActive >= 3,
      dawn_patrol: hasEarlyWorkout,
      perfect_week: perfectWeek,
      combo_king: comboDay >= 15,
      legendary_drop: loot.rarity === "legendary",
      under_120: todayWeight !== null && todayWeight <= 120,
      under_100: todayWeight !== null && todayWeight <= 100,
      final_boss: todayWeight !== null && todayWeight <= 95,
      // Skipped: a_week, four_good_weeks (require weekly scoring)
    };

    // Insert newly unlocked achievements
    const newUnlocks: { achievement_id: string; unlocked_at: string }[] = [];
    const now = new Date().toISOString();

    for (const achievement of ACHIEVEMENTS) {
      if (unlockedSet.has(achievement.id)) continue;
      const met = conditionMap[achievement.id];
      if (met) {
        newUnlocks.push({
          achievement_id: achievement.id,
          unlocked_at: now,
        });
      }
    }

    if (newUnlocks.length > 0) {
      const { error: achieveError } = await supabase
        .from("unlocked_achievements")
        .upsert(newUnlocks as never, { onConflict: "achievement_id" });

      if (achieveError) {
        console.error(
          "[xp-engine] Failed to insert achievements:",
          achieveError.message
        );
      }
    }

    // 16. Check reward conditions
    try {
      const { parseRewardsState, checkAndGrantRewards } = await import("@/lib/rewards");
      const { getHunterRank } = await import("@/lib/ranks");

      const rewardsRaw = (profile as unknown as Record<string, unknown>)?.rewards;
      const rewardsState = parseRewardsState(rewardsRaw);

      const currentRank = getHunterRank(levelInfo.level).title;

      // Determine defeated bosses (weight milestones where current weight is below target)
      const currentWeight = dailyLog?.weight_kg ?? null;
      const bossTargets = [120, 110, 105, 95]; // Gatekeeper, Plateau, Centurion, Final Boss
      const defeatedBossWeights = currentWeight
        ? bossTargets.filter((t) => currentWeight <= t)
        : [];

      const { newState, newRewards } = checkAndGrantRewards(rewardsState, {
        consecutiveGoodWeeks: profile?.consecutive_good_weeks ?? 0,
        exerciseStreak: bestExerciseStreak,
        currentRank,
        defeatedBossWeights,
      });

      if (newRewards.length > 0) {
        await supabase
          .from("player_profile")
          .update({ rewards: newState } as never)
          .eq("id", profileId as never);
      }
    } catch (rewardErr) {
      console.error("[xp-engine] Reward check failed:", rewardErr);
    }
  } catch (err) {
    console.error("[xp-engine] Unexpected error:", err);
    // Do NOT rethrow — parent API request must not fail
  }
}
