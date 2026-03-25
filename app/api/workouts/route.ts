import { supabase } from "@/lib/supabase";
import type { Workout } from "@/lib/types";

interface ExerciseInput {
  exercise_name: string;
  sets?: number;
  reps?: number;
  weight_kg?: number;
  is_pr?: boolean;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (!date) {
    return Response.json(
      { error: "date query param is required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("workouts")
    .select("*, exercises(*)")
    .eq("date", date)
    .order("created_at", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data });
}

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.date || !body.type) {
    return Response.json(
      { error: "date and type are required" },
      { status: 400 }
    );
  }

  // Ensure daily_log row exists for this date
  const { error: logError } = await supabase
    .from("daily_log")
    .upsert({ date: body.date } as never, { onConflict: "date" })
    .select()
    .single();

  if (logError) {
    return Response.json({ error: logError.message }, { status: 500 });
  }

  // Insert the workout
  const workoutRow: Omit<Workout, "id" | "created_at"> = {
    date: body.date,
    type: body.type,
    duration_minutes: body.duration_minutes ?? null,
    notes: body.notes ?? null,
  };

  const { data: workout, error: workoutError } = await supabase
    .from("workouts")
    .insert(workoutRow as never)
    .select()
    .single();

  if (workoutError) {
    return Response.json({ error: workoutError.message }, { status: 500 });
  }

  // Insert exercises if provided
  const exercises = body.exercises as ExerciseInput[] | undefined;
  let insertedExercises = null;

  if (exercises && exercises.length > 0) {
    const typedWorkout = workout as Workout;
    const rows = exercises.map((ex) => ({
      workout_id: typedWorkout.id,
      exercise_name: ex.exercise_name,
      sets: ex.sets ?? null,
      reps: ex.reps ?? null,
      weight_kg: ex.weight_kg ?? null,
      is_pr: ex.is_pr ?? false,
    }));

    const { data: exData, error: exError } = await supabase
      .from("exercises")
      .insert(rows as never)
      .select();

    if (exError) {
      return Response.json({ error: exError.message }, { status: 500 });
    }

    insertedExercises = exData;
  }

  // Update daily_log with workout info
  const { error: updateError } = await supabase
    .from("daily_log")
    .update({
      workout_done: true,
      workout_type: body.type,
      workout_minutes: body.duration_minutes ?? null,
    } as never)
    .eq("date", body.date);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  const typedWorkout = workout as Workout;
  return Response.json(
    { data: { ...typedWorkout, exercises: insertedExercises } },
    { status: 201 }
  );
}
