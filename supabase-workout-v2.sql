-- ============================================================
-- WORKOUT V2 — Adaptive Prescription System
-- Run this against your Supabase project ONCE.
-- ============================================================

-- Exercise library with form cues
CREATE TABLE IF NOT EXISTS exercise_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  muscle_group TEXT NOT NULL,
  equipment TEXT,
  form_cues TEXT[],
  rest_seconds INT DEFAULT 120,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- The active program template
CREATE TABLE IF NOT EXISTS workout_program (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phase INT DEFAULT 1,
  exercises JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- What the System prescribes for a given day
CREATE TABLE IF NOT EXISTS prescribed_workouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  type TEXT NOT NULL,
  exercises JSONB,
  is_deload BOOLEAN DEFAULT false,
  completed BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Individual logged sets (one row per set)
CREATE TABLE IF NOT EXISTS logged_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  exercise_name TEXT NOT NULL,
  set_number INT NOT NULL,
  set_type TEXT DEFAULT 'working',
  target_reps INT,
  target_weight DECIMAL(5,1),
  actual_reps INT,
  actual_weight DECIMAL(5,1),
  is_pr BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Cardio sessions
CREATE TABLE IF NOT EXISTS cardio_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  type TEXT NOT NULL,
  duration_minutes INT,
  incline_percent DECIMAL(3,1),
  speed_kmh DECIMAL(3,1),
  distance_km DECIMAL(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tracks progression state per exercise
CREATE TABLE IF NOT EXISTS exercise_progression (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exercise_name TEXT NOT NULL UNIQUE,
  current_weight DECIMAL(5,1) NOT NULL,
  consecutive_successes INT DEFAULT 0,
  consecutive_failures INT DEFAULT 0,
  last_updated DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE exercise_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_program ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescribed_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE logged_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE cardio_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_progression ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON exercise_library FOR ALL USING (true);
CREATE POLICY "Allow all" ON workout_program FOR ALL USING (true);
CREATE POLICY "Allow all" ON prescribed_workouts FOR ALL USING (true);
CREATE POLICY "Allow all" ON logged_sets FOR ALL USING (true);
CREATE POLICY "Allow all" ON cardio_sessions FOR ALL USING (true);
CREATE POLICY "Allow all" ON exercise_progression FOR ALL USING (true);

-- Seed exercise library
INSERT INTO exercise_library (name, muscle_group, equipment, form_cues, rest_seconds) VALUES
  ('Leg Press', 'legs', 'machine', ARRAY['Feet shoulder-width on plate', 'Push through heels', 'Stop at 90 degree knee angle', 'Do NOT lock knees at top'], 150),
  ('Incline Bench Press', 'chest', 'barbell', ARRAY['30 degree incline', 'Bar to upper chest', 'Control the descent (2 sec down)', 'Wrists straight, not bent back'], 120),
  ('Lat Pulldown', 'back', 'cable', ARRAY['Wide grip, pull to upper chest', 'Squeeze shoulder blades at bottom', 'No swinging or leaning back', 'Full extension at top'], 90),
  ('Rack Pulls', 'back', 'barbell', ARRAY['Pins at knee height', 'Back STRAIGHT — not rounded', 'Drive hips forward at top', 'Lower pins each week as mobility improves'], 180),
  ('Dumbbell Rows', 'back', 'dumbbell', ARRAY['One arm at a time', 'Elbow drives UP, not out', 'Full stretch at bottom', 'Squeeze at top for 1 sec'], 90),
  ('Dead Bug', 'core', 'bodyweight', ARRAY['Lower back pressed into floor', 'Opposite arm + leg extend', 'Breathe out as you extend', 'Slow and controlled — no rushing'], 60)
ON CONFLICT (name) DO NOTHING;

-- Seed starting progression state
INSERT INTO exercise_progression (exercise_name, current_weight) VALUES
  ('Leg Press', 60),
  ('Incline Bench Press', 30),
  ('Lat Pulldown', 35),
  ('Rack Pulls', 50),
  ('Dumbbell Rows', 12),
  ('Dead Bug', 0)
ON CONFLICT (exercise_name) DO NOTHING;

-- Seed the program
INSERT INTO workout_program (name, phase, exercises) VALUES
  ('Phase 1: Foundation', 1, '[
    {"name": "Leg Press", "sets": 3, "reps": 10, "increment": 2.5},
    {"name": "Incline Bench Press", "sets": 3, "reps": 8, "increment": 2.5},
    {"name": "Lat Pulldown", "sets": 3, "reps": 10, "increment": 2.5},
    {"name": "Rack Pulls", "sets": 3, "reps": 5, "increment": 5},
    {"name": "Dumbbell Rows", "sets": 3, "reps": 10, "increment": 2},
    {"name": "Dead Bug", "sets": 2, "reps": 10, "increment": 0}
  ]');
