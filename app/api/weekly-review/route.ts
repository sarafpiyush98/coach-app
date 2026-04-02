import { supabase } from "@/lib/supabase";
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { getWeeklyGrade } from "@/lib/gamification";
import { calculateStreaks } from "@/lib/streaks";

export async function GET() {
  const today = new Date();
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const lastWeekStart = format(startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const lastWeekEnd = format(endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }), "yyyy-MM-dd");

  const [thisWeekLogs, lastWeekLogs, thisWeekXp, profileRes, streakLogs] = await Promise.all([
    supabase.from("daily_log").select("*").gte("date", weekStart).lte("date", weekEnd).order("date"),
    supabase.from("daily_log").select("*").gte("date", lastWeekStart).lte("date", lastWeekEnd).order("date"),
    supabase.from("xp_log").select("*").gte("date", weekStart).lte("date", weekEnd).order("date"),
    supabase.from("player_profile").select("*").limit(1).single(),
    supabase.from("daily_log").select("date, workout_done, meals_logged, ate_after_10pm").order("date", { ascending: false }).limit(90),
  ]);

  const thisLogs = thisWeekLogs.data ?? [];
  const lastLogs = lastWeekLogs.data ?? [];
  const xpLogs = thisWeekXp.data ?? [];
  const profile = profileRes.data as any;

  // This week metrics
  const daysTracked = thisLogs.filter((d: any) => d.meals_logged || d.workout_done).length;
  const daysExercised = thisLogs.filter((d: any) => d.workout_done).length;
  const calsThisWeek = thisLogs.filter((d: any) => d.calories_total > 0);
  const avgCalories = calsThisWeek.length > 0
    ? Math.round(calsThisWeek.reduce((s: number, d: any) => s + (d.calories_total || 0), 0) / calsThisWeek.length)
    : null;
  const protThisWeek = thisLogs.filter((d: any) => d.protein_g > 0);
  const avgProtein = protThisWeek.length > 0
    ? Math.round(protThisWeek.reduce((s: number, d: any) => s + (d.protein_g || 0), 0) / protThisWeek.length)
    : null;
  const totalXp = xpLogs.reduce((s: number, x: any) => s + (x.total_xp || 0), 0);
  const bestDay = xpLogs.length > 0
    ? xpLogs.reduce((best: any, x: any) => (x.total_xp || 0) > (best.total_xp || 0) ? x : best, xpLogs[0])
    : null;

  // Weight delta
  const weighIns = thisLogs.filter((d: any) => d.weight_kg != null) as any[];
  const weightDelta = weighIns.length >= 2
    ? Math.round((weighIns[weighIns.length - 1].weight_kg - weighIns[0].weight_kg) * 10) / 10
    : null;

  // Last week metrics (for comparison)
  const lastDaysTracked = lastLogs.filter((d: any) => d.meals_logged || d.workout_done).length;
  const lastDaysExercised = lastLogs.filter((d: any) => d.workout_done).length;
  const lastCals = lastLogs.filter((d: any) => d.calories_total > 0);
  const lastAvgCalories = lastCals.length > 0
    ? Math.round(lastCals.reduce((s: number, d: any) => s + (d.calories_total || 0), 0) / lastCals.length)
    : null;
  const lastProt = lastLogs.filter((d: any) => d.protein_g > 0);
  const lastAvgProtein = lastProt.length > 0
    ? Math.round(lastProt.reduce((s: number, d: any) => s + (d.protein_g || 0), 0) / lastProt.length)
    : null;

  // Grade
  const grade = getWeeklyGrade(daysTracked);
  const gradeScore = Math.round((daysTracked / 7) * 100);

  // Streaks
  const todayStr = format(today, "yyyy-MM-dd");
  const streaks = calculateStreaks(streakLogs.data ?? [], todayStr);

  // Consecutive good weeks
  const consecutiveGoodWeeks = profile?.consecutive_good_weeks ?? 0;

  // System verdict
  let verdict = "";
  if (daysTracked === 7) verdict = "7/7 days tracked. Perfect execution. The System has nothing to add.";
  else if (daysTracked > lastDaysTracked) verdict = `${daysTracked}/7 days tracked. The System notes improvement.`;
  else if (daysTracked < lastDaysTracked) verdict = `${daysTracked}/7 days tracked. Below previous week performance.`;
  else verdict = `${daysTracked}/7 days tracked. Holding steady.`;

  if (consecutiveGoodWeeks >= 3) {
    verdict += ` ${consecutiveGoodWeeks} consecutive qualifying weeks. Promotion trajectory confirmed.`;
  }

  return Response.json({
    data: {
      weekStart,
      weekEnd,
      grade,
      gradeScore,
      thisWeek: { daysTracked, daysExercised, avgCalories, avgProtein, totalXp },
      lastWeek: { daysTracked: lastDaysTracked, daysExercised: lastDaysExercised, avgCalories: lastAvgCalories, avgProtein: lastAvgProtein },
      weightDelta,
      bestDay: bestDay ? { date: bestDay.date, totalXp: bestDay.total_xp } : null,
      streaks,
      consecutiveGoodWeeks,
      verdict,
    },
  });
}
