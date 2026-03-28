import { db as supabase } from "@/lib/supabase-untyped";
import { recalculateAndWriteXP } from "@/lib/xp-engine";
import { completeWorkout } from "@/lib/workout-engine";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, type, durationMinutes, inclinePercent, speedKmh } = body;

    if (!date || !type) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Insert cardio session
    await supabase.from("cardio_sessions").insert({
      date,
      type,
      duration_minutes: durationMinutes ?? null,
      incline_percent: inclinePercent ?? null,
      speed_kmh: speedKmh ?? null,
    });

    // Update daily_log and prescribed_workouts
    await completeWorkout(date);

    // Recalculate XP
    await recalculateAndWriteXP(date);

    return Response.json({ data: { success: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
