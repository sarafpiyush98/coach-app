-- Run this in Supabase SQL Editor AFTER the base schema

-- Player profile: single row, tracks cumulative stats
CREATE TABLE player_profile (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  total_xp INT DEFAULT 0,
  level INT DEFAULT 1,
  total_workouts INT DEFAULT 0,
  total_meals_logged INT DEFAULT 0,
  total_checkins INT DEFAULT 0,
  total_prs INT DEFAULT 0,
  best_exercise_streak INT DEFAULT 0,
  best_logging_streak INT DEFAULT 0,
  best_no_late_eating_streak INT DEFAULT 0,
  best_combo INT DEFAULT 0,
  consecutive_good_weeks INT DEFAULT 0,
  last_active_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- XP log: every XP transaction
CREATE TABLE xp_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  base_xp INT NOT NULL,
  combo_multiplier DECIMAL(3,1) DEFAULT 1.0,
  loot_multiplier DECIMAL(3,1) DEFAULT 1.0,
  loot_rarity TEXT,
  total_xp INT NOT NULL,
  breakdown JSONB, -- { actions: [...] }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unlocked achievements
CREATE TABLE unlocked_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  achievement_id TEXT UNIQUE NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  xp_at_unlock INT DEFAULT 0,
  level_at_unlock INT DEFAULT 1
);

-- Planned breaks (occasions, rest)
CREATE TABLE planned_breaks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE player_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE unlocked_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE planned_breaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON player_profile FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON xp_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON unlocked_achievements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON planned_breaks FOR ALL USING (true) WITH CHECK (true);

-- Seed player profile (single player)
INSERT INTO player_profile (total_xp, level) VALUES (0, 1);

-- Updated_at trigger
CREATE TRIGGER player_profile_updated_at
  BEFORE UPDATE ON player_profile
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
