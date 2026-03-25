import { supabase } from "@/lib/supabase";
import { format, subWeeks } from "date-fns";

export async function GET() {
  const twelveWeeksAgo = format(subWeeks(new Date(), 12), "yyyy-MM-dd");
  const today = format(new Date(), "yyyy-MM-dd");

  // Run all three queries in parallel
  const [weightResult, summariesResult, milestonesResult, prsResult] =
    await Promise.all([
      supabase
        .from("daily_log")
        .select("date, weight_kg")
        .gte("date", twelveWeeksAgo)
        .lte("date", today)
        .not("weight_kg", "is", null)
        .order("date", { ascending: true }),

      supabase
        .from("weekly_summary")
        .select("*")
        .order("week_start", { ascending: false }),

      supabase
        .from("milestones")
        .select("*")
        .order("created_at", { ascending: false }),

      supabase
        .from("personal_records")
        .select("*")
        .order("date", { ascending: false })
        .limit(10),
    ]);

  if (weightResult.error) {
    return Response.json(
      { error: weightResult.error.message },
      { status: 500 }
    );
  }
  if (summariesResult.error) {
    return Response.json(
      { error: summariesResult.error.message },
      { status: 500 }
    );
  }
  if (milestonesResult.error) {
    return Response.json(
      { error: milestonesResult.error.message },
      { status: 500 }
    );
  }
  if (prsResult.error) {
    return Response.json(
      { error: prsResult.error.message },
      { status: 500 }
    );
  }

  return Response.json({
    data: {
      weight_history: weightResult.data,
      weekly_summaries: summariesResult.data,
      milestones: milestonesResult.data,
      personal_records: prsResult.data,
    },
  });
}
