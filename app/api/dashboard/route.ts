import { supabase } from "@/lib/supabase";
import { format, subDays } from "date-fns";
import { calculateStreaks, getStreakMessage } from "@/lib/streaks";

export async function GET() {
  const today = format(new Date(), "yyyy-MM-dd");
  const ninetyDaysAgo = format(subDays(new Date(), 90), "yyyy-MM-dd");

  const [dailyLogResult, mealsResult, milestonesResult, streakLogsResult] =
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

  const streakStatus = calculateStreaks(streakLogsResult.data ?? [], today);
  const streakMessage = getStreakMessage(streakStatus);

  return Response.json({
    data: {
      dailyLog: dailyLogResult.data ?? null,
      streaks: { ...streakStatus, message: streakMessage },
      meals: mealsResult.data ?? [],
      milestones: milestonesResult.data ?? [],
    },
  });
}
