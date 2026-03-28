import { format } from "date-fns";
import { prescribeWorkout } from "@/lib/workout-engine";

export async function GET() {
  const today = format(new Date(), "yyyy-MM-dd");

  try {
    const prescription = await prescribeWorkout(today);
    return Response.json({ data: prescription });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
