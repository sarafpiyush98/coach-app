/**
 * WORKOUT ENGINE
 *
 * Prescribes workouts, tracks progression, handles auto-deload.
 * Zero decisions for the user — the System tells them what to lift.
 */

import { db as supabase } from "@/lib/supabase-untyped";
import { differenceInCalendarDays, getDay } from "date-fns";

const START_DATE = new Date(2026, 2, 29); // March 29, 2026

// Exercises that skip warm-up sets
const SKIP_WARMUP = ["Dead Bug", "Dumbbell Rows"];

// Round to nearest increment (2.5 for barbell, 2 for dumbbell)
function roundToIncrement(weight: number, increment: number): number {
  return Math.round(weight / increment) * increment;
}

// ============================================================
// Types
// ============================================================

export interface WarmupSet {
  weight: number;
  reps: number;
}

export interface PrescribedExercise {
  name: string;
  targetSets: number;
  targetReps: number;
  targetWeight: number;
  restSeconds: number;
  formCues: string[];
  warmupSets: WarmupSet[];
  increment: number;
  lastSession: {
    date: string;
    weight: number;
    completedAllSets: boolean;
  } | null;
  progression: string;
}

export interface PrescribedWorkout {
  date: string;
  type: "strength" | "cardio" | "rest" | "deload_strength";
  isDeload: boolean;
  weekNumber: number;
  exercises?: PrescribedExercise[];
  cardioTarget?: { duration: number; incline: number; speed: number };
  message?: string;
}

interface ProgramExercise {
  name: string;
  sets: number;
  reps: number;
  increment: number;
}

// ============================================================
// Core Functions
// ============================================================

export function isDeloadWeek(date: string): boolean {
  const d = new Date(date);
  const daysSinceStart = differenceInCalendarDays(d, START_DATE);
  if (daysSinceStart < 0) return false;
  const weekNumber = Math.floor(daysSinceStart / 7) + 1;
  return weekNumber % 8 === 0;
}

export function getWeekNumber(date: string): number {
  const d = new Date(date);
  const daysSinceStart = differenceInCalendarDays(d, START_DATE);
  if (daysSinceStart < 0) return 0;
  return Math.floor(daysSinceStart / 7) + 1;
}

export function getCardioTargets(date: string): {
  duration: number;
  incline: number;
  speed: number;
} {
  const week = getWeekNumber(date);
  if (week <= 2) return { duration: 20, incline: 10, speed: 4.5 };
  if (week <= 4) return { duration: 25, incline: 11, speed: 4.5 };
  return { duration: 30, incline: 12, speed: 4.8 };
}

function getDayType(
  date: string
): "strength" | "cardio" | "rest" {
  const d = new Date(date);
  const dow = getDay(d); // 0=Sun
  if (dow === 0) return "rest";
  if (dow === 1 || dow === 3 || dow === 5) return "strength";
  return "cardio"; // Tue, Thu, Sat
}

export async function prescribeWorkout(
  date: string
): Promise<PrescribedWorkout> {
  const weekNumber = getWeekNumber(date);
  const deload = isDeloadWeek(date);

  // Check if already prescribed
  const { data: existing } = await supabase
    .from("prescribed_workouts")
    .select("*")
    .eq("date", date)
    .maybeSingle();

  if (existing) {
    // Reconstruct the full prescription from stored data
    return await buildPrescriptionFromRow(existing, weekNumber, deload);
  }

  const dayType = getDayType(date);

  if (dayType === "rest") {
    await supabase.from("prescribed_workouts").upsert({
      date,
      type: "rest",
      exercises: null,
      is_deload: false,
      completed: false,
    }, { onConflict: "date" });

    return {
      date,
      type: "rest",
      isDeload: false,
      weekNumber,
      message: "RECOVERY DAY. THE SYSTEM DOES NOT ASSIGN MOVEMENT TODAY.",
    };
  }

  if (dayType === "cardio") {
    const target = getCardioTargets(date);
    await supabase.from("prescribed_workouts").upsert({
      date,
      type: "cardio",
      exercises: target as unknown as Record<string, unknown>,
      is_deload: false,
      completed: false,
    }, { onConflict: "date" });

    return {
      date,
      type: "cardio",
      isDeload: false,
      weekNumber,
      cardioTarget: target,
    };
  }

  // Strength day
  const { data: program } = await supabase
    .from("workout_program")
    .select("*")
    .eq("is_active", true)
    .limit(1)
    .single();

  if (!program) {
    return {
      date,
      type: "rest",
      isDeload: false,
      weekNumber,
      message: "NO ACTIVE PROGRAM. SEED THE DATABASE.",
    };
  }

  const programExercises = program.exercises as unknown as ProgramExercise[];

  // Get progression state for all exercises
  const { data: progressionRows } = await supabase
    .from("exercise_progression")
    .select("*");

  const progressionMap = new Map(
    (progressionRows ?? []).map((r: { exercise_name: string; current_weight: number }) => [
      r.exercise_name,
      r.current_weight,
    ])
  );

  // Get exercise library for form cues and rest times
  const { data: libraryRows } = await supabase
    .from("exercise_library")
    .select("*");

  const libraryMap = new Map(
    (libraryRows ?? []).map((r: { name: string; form_cues: string[]; rest_seconds: number }) => [
      r.name,
      { formCues: r.form_cues ?? [], restSeconds: r.rest_seconds ?? 120 },
    ])
  );

  // Get last session data for each exercise
  const exercises: PrescribedExercise[] = [];

  for (const pe of programExercises) {
    const currentWeight = progressionMap.get(pe.name) ?? 0;
    const lib = libraryMap.get(pe.name) ?? { formCues: [], restSeconds: 120 };
    const targetSets = deload ? 2 : pe.sets;

    // Warm-up sets
    const warmupSets: WarmupSet[] = [];
    if (!SKIP_WARMUP.includes(pe.name) && currentWeight > 0) {
      const w1 = roundToIncrement(currentWeight * 0.5, pe.increment);
      const w2 = roundToIncrement(currentWeight * 0.75, pe.increment);
      if (w1 > 0) warmupSets.push({ weight: w1, reps: 10 });
      if (w2 > 0 && w2 !== w1) warmupSets.push({ weight: w2, reps: 5 });
    }

    // Last session lookup
    const { data: lastSets } = await supabase
      .from("logged_sets")
      .select("*")
      .eq("exercise_name", pe.name)
      .eq("set_type", "working")
      .order("date", { ascending: false })
      .order("set_number", { ascending: true })
      .limit(pe.sets);

    let lastSession: PrescribedExercise["lastSession"] = null;
    let progression = "";

    if (lastSets && lastSets.length > 0) {
      const lastDate = lastSets[0].date;
      const lastWeight = lastSets[0].target_weight ?? lastSets[0].actual_weight ?? 0;
      const allHit = lastSets.every(
        (s: { actual_reps: number; target_reps: number }) => s.actual_reps >= s.target_reps
      );

      lastSession = {
        date: lastDate,
        weight: lastWeight,
        completedAllSets: allHit,
      };

      if (currentWeight > lastWeight) {
        progression = `+${currentWeight - lastWeight} kg from last session`;
      } else if (currentWeight === lastWeight) {
        progression = "Same weight — hit all reps to progress";
      } else {
        progression = `Deloaded to ${currentWeight} kg`;
      }
    } else {
      progression = "First session — starting weight";
    }

    exercises.push({
      name: pe.name,
      targetSets,
      targetReps: pe.reps,
      targetWeight: currentWeight,
      restSeconds: lib.restSeconds,
      formCues: lib.formCues,
      warmupSets,
      increment: pe.increment,
      lastSession,
      progression,
    });
  }

  // Store prescription
  const storedExercises = exercises.map((e) => ({
    name: e.name,
    targetSets: e.targetSets,
    targetReps: e.targetReps,
    targetWeight: e.targetWeight,
    restSeconds: e.restSeconds,
    warmupSets: e.warmupSets,
    increment: e.increment,
  }));

  await supabase.from("prescribed_workouts").upsert({
    date,
    type: deload ? "deload_strength" : "strength",
    exercises: storedExercises as unknown as Record<string, unknown>,
    is_deload: deload,
    completed: false,
  }, { onConflict: "date" });

  return {
    date,
    type: deload ? "deload_strength" : "strength",
    isDeload: deload,
    weekNumber,
    exercises,
  };
}

async function buildPrescriptionFromRow(
  row: Record<string, unknown>,
  weekNumber: number,
  deload: boolean
): Promise<PrescribedWorkout> {
  const type = row.type as string;
  const date = row.date as string;

  if (type === "rest") {
    return {
      date,
      type: "rest",
      isDeload: false,
      weekNumber,
      message: "RECOVERY DAY. THE SYSTEM DOES NOT ASSIGN MOVEMENT TODAY.",
    };
  }

  if (type === "cardio") {
    const target = row.exercises as unknown as { duration: number; incline: number; speed: number };
    return {
      date,
      type: "cardio",
      isDeload: false,
      weekNumber,
      cardioTarget: target,
    };
  }

  // Strength — rebuild full exercise data
  const storedExercises = row.exercises as unknown as Array<{
    name: string;
    targetSets: number;
    targetReps: number;
    targetWeight: number;
    restSeconds: number;
    warmupSets: WarmupSet[];
    increment: number;
  }>;

  const { data: libraryRows } = await supabase
    .from("exercise_library")
    .select("*");

  const libraryMap = new Map(
    (libraryRows ?? []).map((r: { name: string; form_cues: string[]; rest_seconds: number }) => [
      r.name,
      { formCues: r.form_cues ?? [], restSeconds: r.rest_seconds ?? 120 },
    ])
  );

  const exercises: PrescribedExercise[] = [];
  for (const se of storedExercises) {
    const lib = libraryMap.get(se.name) ?? { formCues: [], restSeconds: se.restSeconds };

    // Get last session for context
    const { data: lastSets } = await supabase
      .from("logged_sets")
      .select("*")
      .eq("exercise_name", se.name)
      .eq("set_type", "working")
      .order("date", { ascending: false })
      .limit(se.targetSets);

    let lastSession: PrescribedExercise["lastSession"] = null;
    let progression = "First session — starting weight";

    if (lastSets && lastSets.length > 0) {
      const lastDate = lastSets[0].date;
      const lastWeight = lastSets[0].target_weight ?? lastSets[0].actual_weight ?? 0;
      const allHit = lastSets.every(
        (s: { actual_reps: number; target_reps: number }) => s.actual_reps >= s.target_reps
      );
      lastSession = { date: lastDate, weight: lastWeight, completedAllSets: allHit };
      if (se.targetWeight > lastWeight) {
        progression = `+${se.targetWeight - lastWeight} kg from last session`;
      } else if (se.targetWeight === lastWeight) {
        progression = "Same weight — hit all reps to progress";
      } else {
        progression = `Deloaded to ${se.targetWeight} kg`;
      }
    }

    exercises.push({
      ...se,
      formCues: lib.formCues,
      lastSession,
      progression,
    });
  }

  return {
    date,
    type: type as "strength" | "deload_strength",
    isDeload: deload,
    weekNumber,
    exercises,
  };
}

// ============================================================
// Set Logging & Progression
// ============================================================

export async function recordSet(data: {
  date: string;
  exerciseName: string;
  setNumber: number;
  setType: "warmup" | "working";
  targetReps: number;
  targetWeight: number;
  actualReps: number;
  actualWeight: number;
}): Promise<{ isPR: boolean }> {
  // Check PR before insert (only for working sets)
  let isPR = false;
  if (data.setType === "working" && data.actualWeight > 0) {
    const { data: maxRow } = await supabase
      .from("logged_sets")
      .select("actual_weight")
      .eq("exercise_name", data.exerciseName)
      .eq("set_type", "working")
      .gte("actual_reps", data.actualReps)
      .order("actual_weight", { ascending: false })
      .limit(1)
      .maybeSingle();

    const prevMax = (maxRow as { actual_weight: number } | null)?.actual_weight ?? 0;
    isPR = data.actualWeight > prevMax;
  }

  await supabase.from("logged_sets").insert({
    date: data.date,
    exercise_name: data.exerciseName,
    set_number: data.setNumber,
    set_type: data.setType,
    target_reps: data.targetReps,
    target_weight: data.targetWeight,
    actual_reps: data.actualReps,
    actual_weight: data.actualWeight,
    is_pr: isPR,
  });

  // Mark workout as started
  await supabase
    .from("prescribed_workouts")
    .update({ started_at: new Date().toISOString() })
    .eq("date", data.date)
    .is("started_at", null);

  return { isPR };
}

export async function completeExercise(
  exerciseName: string,
  date: string
): Promise<void> {
  // Get all working sets for this exercise today
  const { data: sets } = await supabase
    .from("logged_sets")
    .select("*")
    .eq("exercise_name", exerciseName)
    .eq("date", date)
    .eq("set_type", "working")
    .order("set_number");

  if (!sets || sets.length === 0) return;

  // Get the program exercise config for increment
  const { data: program } = await supabase
    .from("workout_program")
    .select("exercises")
    .eq("is_active", true)
    .limit(1)
    .single();

  const programExercises = (program?.exercises as unknown as ProgramExercise[]) ?? [];
  const config = programExercises.find((e) => e.name === exerciseName);
  const increment = config?.increment ?? 2.5;

  // Check results
  const missedSets = sets.filter(
    (s: { actual_reps: number; target_reps: number }) => s.actual_reps < s.target_reps
  );

  // Get current progression
  const { data: prog } = await supabase
    .from("exercise_progression")
    .select("*")
    .eq("exercise_name", exerciseName)
    .single();

  if (!prog) return;

  let newWeight = prog.current_weight;
  let successes = prog.consecutive_successes ?? 0;
  let failures = prog.consecutive_failures ?? 0;

  if (missedSets.length === 0) {
    // All sets hit target — progress!
    successes += 1;
    failures = 0;
    newWeight = prog.current_weight + increment;
  } else if (missedSets.length === 1 && missedSets[0].set_number === sets.length) {
    // Only last set missed — repeat weight
    successes = 0;
    // weight stays the same
  } else {
    // Missed 2+ sets — increment failure counter
    successes = 0;
    failures += 1;

    if (failures >= 3) {
      // Auto-deload: -10%
      newWeight = roundToIncrement(prog.current_weight * 0.9, increment);
      failures = 0;
    }
  }

  await supabase
    .from("exercise_progression")
    .update({
      current_weight: newWeight,
      consecutive_successes: successes,
      consecutive_failures: failures,
      last_updated: date,
    })
    .eq("exercise_name", exerciseName);
}

export async function completeWorkout(date: string): Promise<void> {
  // Get the prescribed workout to calculate duration
  const { data: prescription } = await supabase
    .from("prescribed_workouts")
    .select("*")
    .eq("date", date)
    .single();

  const startedAt = prescription?.started_at
    ? new Date(prescription.started_at as string)
    : null;
  const now = new Date();
  const durationMinutes = startedAt
    ? Math.round((now.getTime() - startedAt.getTime()) / 60000)
    : null;

  // Mark prescribed workout as complete
  await supabase
    .from("prescribed_workouts")
    .update({ completed: true, completed_at: now.toISOString() })
    .eq("date", date);

  // Determine workout type
  const type = (prescription?.type as string) ?? "strength";
  const workoutType = type.includes("strength") ? "strength" : type;

  // Upsert daily_log with workout data
  const { data: existingLog } = await supabase
    .from("daily_log")
    .select("*")
    .eq("date", date)
    .maybeSingle();

  if (existingLog) {
    await supabase
      .from("daily_log")
      .update({
        workout_done: true,
        workout_type: workoutType,
        workout_minutes: durationMinutes,
      })
      .eq("date", date);
  } else {
    await supabase.from("daily_log").insert({
      date,
      workout_done: true,
      workout_type: workoutType,
      workout_minutes: durationMinutes,
    });
  }
}
