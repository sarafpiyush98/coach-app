import { supabase } from "@/lib/supabase";
import { db } from "@/lib/supabase-untyped";
import { format, subDays } from "date-fns";
import { calculateStreaks, getStreakMessage } from "@/lib/streaks";
import { getDailyQuests, getQuestCompletionPercent } from "@/lib/quests";
import { levelFromTotalXp, getRank, LOOT_TABLE } from "@/lib/gamification";

function rollLootForDate(dateStr: string) {
  const hash = Array.from(dateStr).reduce(
    (acc, ch) => (acc * 31 + ch.charCodeAt(0)) & 0xffffffff,
    0
  );
  const roll = (hash % 1000) / 1000;
  let cumulative = 0;
  for (const loot of LOOT_TABLE) {
    cumulative += loot.chance;
    if (roll < cumulative) {
      return { multiplier: loot.multiplier, rarity: loot.rarity, label: loot.label };
    }
  }
  return { multiplier: 1.0, rarity: "common" as const, label: "Standard Day" };
}

export async function GET() {
  const today = format(new Date(), "yyyy-MM-dd");
  const ninetyDaysAgo = format(subDays(new Date(), 90), "yyyy-MM-dd");

  const [dailyLogResult, mealsResult, milestonesResult, streakLogsResult, profileRes, prescriptionRes] =
    await Promise.all([
      supabase
        .from("daily_log")
        .select("*")
        .eq("date", today)
        .maybeSingle(),
      supabase
        .from("meals")
        .select("*")
        .eq("date", today)
        .order("meal_number"),
      supabase
        .from("milestones")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("daily_log")
        .select("*")
        .gte("date", ninetyDaysAgo)
        .lte("date", today)
        .order("date", { ascending: false }),
      supabase.from("player_profile").select("*").limit(1).single(),
      db
        .from("prescribed_workouts")
        .select("type, is_deload, completed")
        .eq("date", today)
        .maybeSingle(),
    ]);

  const errors = [
    dailyLogResult.error,
    mealsResult.error,
    milestonesResult.error,
    streakLogsResult.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    return Response.json(
      { error: errors.map((e) => e!.message).join("; ") },
      { status: 500 }
    );
  }

  const dailyLog = dailyLogResult.data ?? null;
  const meals = mealsResult.data ?? [];

  // Streaks
  const streakStatus = calculateStreaks(streakLogsResult.data ?? [], today);
  const streakMessage = getStreakMessage(streakStatus);

  // Quests
  const quests = getDailyQuests(dailyLog, meals);
  const questCompletionPercent = getQuestCompletionPercent(quests);

  // Gamification data from profile
  const profile = profileRes.data ?? {
    total_xp: 0,
    level: 1,
    last_active_date: null,
    best_combo: 0,
  };

  const totalXp = profile.total_xp ?? 0;
  const levelInfo = levelFromTotalXp(totalXp);
  const rank = getRank(levelInfo.level);

  // Rewards
  const { parseRewardsState, getUnclaimedRewards } = await import("@/lib/rewards");
  const rewardsState = parseRewardsState((profile as Record<string, unknown>).rewards);
  const unclaimedRewards = getUnclaimedRewards(rewardsState);

  // Combo day — use logging streak as proxy for consecutive active days
  const comboDay = streakStatus.logging;
  const comboMultiplier = Math.min(1 + comboDay * 0.1, 2.5);

  // Today's loot
  const loot = rollLootForDate(today);

  // Today's XP from completed quests (base, before multipliers)
  const todayBaseXp = quests
    .filter((q) => q.completed)
    .reduce((sum, q) => sum + q.xpReward, 0);
  const todayXp = Math.round(todayBaseXp * comboMultiplier * loot.multiplier);

  // Workout prescription
  const todayPrescription = prescriptionRes.data;
  const workoutPrescription = todayPrescription
    ? {
        type: todayPrescription.type as string,
        isDeload: todayPrescription.is_deload as boolean,
        completed: todayPrescription.completed as boolean,
      }
    : null;

  return Response.json({
    data: {
      dailyLog,
      streaks: { ...streakStatus, message: streakMessage },
      meals,
      milestones: milestonesResult.data ?? [],
      quests,
      questCompletionPercent,
      workoutPrescription,
      gamification: {
        level: levelInfo.level,
        levelProgress: levelInfo.progress,
        rank: rank.title,
        totalXp,
        todayXp,
        comboDay,
        comboMultiplier,
        lootRarity: loot.rarity,
        lootMultiplier: loot.multiplier,
      },
      rewards: unclaimedRewards,
    },
  });
}
