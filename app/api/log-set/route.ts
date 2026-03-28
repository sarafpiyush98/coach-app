import { recordSet, completeExercise } from "@/lib/workout-engine";
import { db as supabase } from "@/lib/supabase-untyped";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      date,
      exerciseName,
      setNumber,
      setType,
      targetReps,
      targetWeight,
      actualReps,
      actualWeight,
    } = body;

    if (!date || !exerciseName || setNumber == null || actualReps == null) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await recordSet({
      date,
      exerciseName,
      setNumber,
      setType: setType ?? "working",
      targetReps: targetReps ?? 0,
      targetWeight: targetWeight ?? 0,
      actualReps,
      actualWeight: actualWeight ?? 0,
    });

    // Check if this was the last working set for the exercise
    // by looking at the prescribed workout
    if (setType !== "warmup") {
      const { data: prescription } = await supabase
        .from("prescribed_workouts")
        .select("exercises")
        .eq("date", date)
        .single();

      if (prescription?.exercises) {
        const exercises = prescription.exercises as unknown as Array<{
          name: string;
          targetSets: number;
        }>;
        const exerciseConfig = exercises.find((e) => e.name === exerciseName);

        if (exerciseConfig && setNumber >= exerciseConfig.targetSets) {
          await completeExercise(exerciseName, date);
        }
      }
    }

    return Response.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
