import { supabase } from "@/lib/supabase";
import type { DailyLog } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.date) {
    return Response.json({ error: "date is required" }, { status: 400 });
  }

  // Build the upsert payload from allowed checkin fields
  const payload: Partial<DailyLog> & { date: string } = { date: body.date };

  if (body.sleep_hours != null) payload.sleep_hours = body.sleep_hours;
  if (body.sleep_quality != null) payload.sleep_quality = body.sleep_quality;
  if (body.wake_time != null) payload.wake_time = body.wake_time;
  if (body.mood != null) payload.mood = body.mood;
  if (body.energy_level != null) payload.energy_level = body.energy_level;
  if (body.ate_after_10pm != null) payload.ate_after_10pm = body.ate_after_10pm;
  if (body.notes != null) payload.notes = body.notes;
  if (body.steps != null) payload.steps = body.steps;
  if (body.weight_kg != null) payload.weight_kg = body.weight_kg;

  const { data, error } = await supabase
    .from("daily_log")
    .upsert(payload as never, { onConflict: "date" })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data });
}
