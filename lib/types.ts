export interface DailyLog {
  id: string;
  date: string;
  weight_kg: number | null;
  calories_total: number | null;
  protein_g: number | null;
  meals_logged: boolean;
  ate_after_10pm: boolean;
  workout_done: boolean;
  workout_type: string | null;
  workout_minutes: number | null;
  steps: number | null;
  sleep_hours: number | null;
  sleep_quality: number | null;
  wake_time: string | null;
  exercise_streak: number;
  logging_streak: number;
  no_late_eating_streak: number;
  energy_level: number | null;
  mood: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Meal {
  id: string;
  date: string;
  meal_number: number;
  time: string | null;
  description: string;
  calories: number | null;
  protein_g: number | null;
  photo_url: string | null;
  is_eating_out: boolean;
  restaurant: string | null;
  created_at: string;
}

export interface Workout {
  id: string;
  date: string;
  type: "strength" | "incline_walk" | "walk" | "badminton" | "swim" | "other";
  duration_minutes: number | null;
  notes: string | null;
  created_at: string;
}

export interface Exercise {
  id: string;
  workout_id: string;
  exercise_name: string;
  sets: number | null;
  reps: number | null;
  weight_kg: number | null;
  is_pr: boolean;
  created_at: string;
}

export interface WeeklySummary {
  id: string;
  week_start: string;
  week_end: string;
  start_weight: number | null;
  end_weight: number | null;
  weight_change: number | null;
  avg_calories: number | null;
  avg_protein: number | null;
  days_tracked: number | null;
  days_exercised: number | null;
  days_ate_late: number | null;
  longest_exercise_streak: number | null;
  longest_logging_streak: number | null;
  week_score: number | null;
  coach_notes: string | null;
  created_at: string;
}

export interface PersonalRecord {
  id: string;
  exercise_name: string;
  weight_kg: number;
  reps: number;
  date: string;
  previous_best_kg: number | null;
  created_at: string;
}

export interface Milestone {
  id: string;
  title: string;
  description: string | null;
  type: "weight" | "streak" | "strength" | "habit" | "custom";
  target_value: number | null;
  current_value: number;
  achieved: boolean;
  achieved_date: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      daily_log: {
        Row: DailyLog;
        Insert: Partial<DailyLog> & { date: string };
        Update: Partial<DailyLog>;
      };
      meals: {
        Row: Meal;
        Insert: Partial<Meal> & { date: string; description: string; meal_number: number };
        Update: Partial<Meal>;
      };
      workouts: {
        Row: Workout;
        Insert: Partial<Workout> & { date: string; type: string };
        Update: Partial<Workout>;
      };
      exercises: {
        Row: Exercise;
        Insert: Partial<Exercise> & { workout_id: string; exercise_name: string };
        Update: Partial<Exercise>;
      };
      weekly_summary: {
        Row: WeeklySummary;
        Insert: Partial<WeeklySummary> & { week_start: string; week_end: string };
        Update: Partial<WeeklySummary>;
      };
      personal_records: {
        Row: PersonalRecord;
        Insert: Partial<PersonalRecord> & { exercise_name: string; weight_kg: number; reps: number; date: string };
        Update: Partial<PersonalRecord>;
      };
      milestones: {
        Row: Milestone;
        Insert: Partial<Milestone> & { title: string };
        Update: Partial<Milestone>;
      };
    };
  };
}
