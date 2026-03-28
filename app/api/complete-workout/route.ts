import { completeWorkout } from "@/lib/workout-engine";
import { recalculateAndWriteXP } from "@/lib/xp-engine";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date } = body;

    if (!date) {
      return Response.json({ error: "Missing date" }, { status: 400 });
    }

    await completeWorkout(date);
    await recalculateAndWriteXP(date);

    return Response.json({ data: { success: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
