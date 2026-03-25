-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New query)

-- Daily log: ONE row per day. The core table.
CREATE TABLE daily_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg DECIMAL(5,1),
  calories_total INT,
  protein_g INT,
  meals_logged BOOLEAN DEFAULT false,
  ate_after_10pm BOOLEAN DEFAULT false,
  workout_done BOOLEAN DEFAULT false,
  workout_type TEXT,
  workout_minutes INT,
  steps INT,
  sleep_hours DECIMAL(3,1),
  sleep_quality INT CHECK (sleep_quality BETWEEN 1 AND 5),
  wake_time TIME,
  exercise_streak INT DEFAULT 0,
  logging_streak INT DEFAULT 0,
  no_late_eating_streak INT DEFAULT 0,
  energy_level INT CHECK (energy_level BETWEEN 1 AND 5),
  mood INT CHECK (mood BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meals
CREATE TABLE meals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL REFERENCES daily_log(date),
  meal_number INT NOT NULL,
  time TIME,
  description TEXT NOT NULL,
  calories INT,
  protein_g INT,
  photo_url TEXT,
  is_eating_out BOOLEAN DEFAULT true,
  restaurant TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workouts
CREATE TABLE workouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL REFERENCES daily_log(date),
  type TEXT NOT NULL CHECK (type IN ('strength', 'incline_walk', 'walk', 'badminton', 'swim', 'other')),
  duration_minutes INT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercises (sets within a strength workout)
CREATE TABLE exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  sets INT,
  reps INT,
  weight_kg DECIMAL(5,1),
  is_pr BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weekly summary
CREATE TABLE weekly_summary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start DATE UNIQUE NOT NULL,
  week_end DATE NOT NULL,
  start_weight DECIMAL(5,1),
  end_weight DECIMAL(5,1),
  weight_change DECIMAL(4,1),
  avg_calories INT,
  avg_protein INT,
  days_tracked INT,
  days_exercised INT,
  days_ate_late INT,
  longest_exercise_streak INT,
  longest_logging_streak INT,
  week_score INT,
  coach_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Personal records
CREATE TABLE personal_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exercise_name TEXT NOT NULL,
  weight_kg DECIMAL(5,1) NOT NULL,
  reps INT NOT NULL,
  date DATE NOT NULL,
  previous_best_kg DECIMAL(5,1),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Milestones
CREATE TABLE milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK (type IN ('weight', 'streak', 'strength', 'habit', 'custom')),
  target_value DECIMAL(8,1),
  current_value DECIMAL(8,1) DEFAULT 0,
  achieved BOOLEAN DEFAULT false,
  achieved_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS but allow all access (single user, no auth)
ALTER TABLE daily_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON daily_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON meals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON workouts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON exercises FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON weekly_summary FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON personal_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON milestones FOR ALL USING (true) WITH CHECK (true);

-- Seed milestones
INSERT INTO milestones (title, description, type, target_value) VALUES
('Under 120kg', 'First major milestone', 'weight', 120),
('Under 110kg', 'Onederland equivalent', 'weight', 110),
('Under 100kg', 'Double digits', 'weight', 100),
('Goal: 95kg', 'Target weight', 'weight', 95),
('7-day exercise streak', 'Full week of movement', 'streak', 7),
('30-day exercise streak', 'One month consistent', 'streak', 30),
('7-day no late eating', 'Week without eating after 10pm', 'streak', 7),
('30-day logging streak', 'Month of tracking', 'streak', 30),
('First PR', 'Beat a personal record on any lift', 'strength', 1),
('Bodyweight bench press', 'Bench your bodyweight', 'strength', 1);

-- Auto-update updated_at on daily_log
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER daily_log_updated_at
  BEFORE UPDATE ON daily_log
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
