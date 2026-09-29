-- SourceWise Dynamic Study Organizer Schema (v13)
-- Run this in Supabase SQL Editor AFTER v2_schema.sql, v5_lirs_schema.sql and token_tracking_schema.sql
-- Adds: mood tracking, calendar events, multi-subject plans, schedule slots, replan history, integrations

-- =====================================================
-- MOOD & CONTEXT TRACKING (hybrid manual + inferred)
-- =====================================================
CREATE TABLE IF NOT EXISTS mood_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  mood text NOT NULL CHECK (mood IN ('energized','focused','neutral','tired','stressed','anxious')),
  energy_level int CHECK (energy_level BETWEEN 1 AND 10),
  focus_level int CHECK (focus_level BETWEEN 1 AND 10),
  stress_level int CHECK (stress_level BETWEEN 1 AND 10),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','inferred','hybrid')),
  inferred_signals jsonb DEFAULT '{}',
  context_tags text[] DEFAULT '{}',
  notes text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mood_checkins_user_time ON mood_checkins(user_id, created_at DESC);

-- =====================================================
-- EXTERNAL CALENDAR EVENTS (Google Calendar sync)
-- =====================================================
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  google_event_id text UNIQUE,
  title text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  is_all_day boolean DEFAULT false,
  event_type text CHECK (event_type IN ('exam','class','work','personal','appointment','blocker')),
  source_calendar_id text,
  recurrence_rule text,
  metadata jsonb DEFAULT '{}',
  last_synced timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_timerange ON calendar_events(user_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_google_id ON calendar_events(google_event_id);

-- =====================================================
-- MULTI-SUBJECT STUDY PLANS
-- =====================================================
CREATE TABLE IF NOT EXISTS study_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  exam_period_start date,
  exam_period_end date,
  daily_study_budget_minutes int DEFAULT 120,
  preferred_start_time time,
  preferred_end_time time,
  break_preferences jsonb DEFAULT '{}',
  status text DEFAULT 'active' CHECK (status IN ('active','completed','archived','paused')),
  plan_data jsonb NOT NULL DEFAULT '{}',
  generation_context jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_study_plans_user_status ON study_plans(user_id, status);

-- =====================================================
-- SUBJECT DEFINITIONS (N subjects per plan)
-- =====================================================
CREATE TABLE IF NOT EXISTS plan_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES study_plans(id) ON DELETE CASCADE,
  subject_name text NOT NULL,
  exam_date date,
  exam_weight float DEFAULT 1.0,
  current_mastery float DEFAULT 0,
  target_mastery float DEFAULT 80,
  source_ids uuid[] DEFAULT '{}',
  difficulty_estimate text DEFAULT 'unknown' CHECK (difficulty_estimate IN ('easy','medium','hard','unknown')),
  priority_score float DEFAULT 1.0,
  color text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plan_subjects_plan ON plan_subjects(plan_id);

-- =====================================================
-- DAILY SCHEDULE SLOTS (granular timetable)
-- =====================================================
CREATE TABLE IF NOT EXISTS schedule_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES study_plans(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES plan_subjects(id) ON DELETE CASCADE,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  duration_minutes int NOT NULL,
  slot_type text NOT NULL DEFAULT 'study' CHECK (slot_type IN ('study','review','quiz','break','buffer','tutoring')),
  topic text,
  activity_type text CHECK (activity_type IN ('read','practice','flashcards','explain','quiz','summarize')),
  status text DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','skipped','rescheduled')),
  completion_data jsonb DEFAULT '{}',
  mood_context jsonb DEFAULT '{}',
  is_fixed boolean DEFAULT false,
  generated_by text CHECK (generated_by IN ('ai_initial','ai_replan','user_manual')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_plan_date ON schedule_slots(plan_id, date);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_subject_date ON schedule_slots(subject_id, date);

-- =====================================================
-- REPLAN HISTORY & TRIGGERS
-- =====================================================
CREATE TABLE IF NOT EXISTS replan_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES study_plans(id) ON DELETE CASCADE,
  trigger_type text NOT NULL CHECK (trigger_type IN ('missed_day','low_score','mood_shift','calendar_conflict','exam_date_change','streak_break','manual')),
  trigger_data jsonb DEFAULT '{}',
  slots_affected int DEFAULT 0,
  slots_rescheduled int DEFAULT 0,
  old_plan_snapshot jsonb DEFAULT '{}',
  new_plan_snapshot jsonb DEFAULT '{}',
  user_approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_replan_events_plan ON replan_events(plan_id, created_at DESC);

-- =====================================================
-- USER INTEGRATIONS (Google OAuth tokens, encrypted)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  access_token_encrypted text NOT NULL,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  scopes text[] DEFAULT '{}',
  calendar_ids text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  last_sync timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- =====================================================
-- EXTEND EXISTING TABLES
-- =====================================================
ALTER TABLE progress_events ADD COLUMN IF NOT EXISTS mood_before text;
ALTER TABLE progress_events ADD COLUMN IF NOT EXISTS mood_after text;
ALTER TABLE progress_events ADD COLUMN IF NOT EXISTS session_context jsonb DEFAULT '{}';
ALTER TABLE tutoring_sessions ADD COLUMN IF NOT EXISTS subject_id uuid REFERENCES plan_subjects(id);
ALTER TABLE tutoring_sessions ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES study_plans(id);

-- =====================================================
-- RLS (service-role key bypasses; deny direct anon access)
-- =====================================================
ALTER TABLE mood_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE replan_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;
-- No permissive policies: direct key access denied, API server uses service role.
