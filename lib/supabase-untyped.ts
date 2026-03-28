/**
 * Untyped Supabase client for tables not yet in generated types.
 * Used for workout v2 tables (exercise_library, workout_program,
 * prescribed_workouts, logged_sets, cardio_sessions, exercise_progression).
 *
 * Once you regenerate types with `supabase gen types typescript`,
 * migrate these calls back to the typed client and delete this file.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// No Database generic — all tables return `any`
export const db = createClient(supabaseUrl, supabaseAnonKey);
