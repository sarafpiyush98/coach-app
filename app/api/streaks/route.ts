import { supabase } from "@/lib/supabase";
import { format, subDays } from "date-fns";
import { calculateStreaks, getStreakMessage } from "@/lib/streaks";

export async function GET() {
  const today = format(new Date(), "yyyy-MM-dd");
  const ninetyDaysAgo = format(subDays(new Date(), 90), "yyyy-MM-dd");

  const { data: logs, error } = await supabase
    .from("daily_log")
    .select("*")
    .gte("date", ninetyDaysAgo)
    .lte("date", today)
    .order("date", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const status = calculateStreaks(logs ?? [], today);
  const message = getStreakMessage(status);

  return Response.json({ data: { ...status, message } });
}
