-- SourceWise V2 Database Schema
-- Run this in Supabase SQL Editor

-- =====================================================
-- EXISTING TABLES (keep as-is, add missing columns)
-- =====================================================

-- Add missing columns to sources table
ALTER TABLE sources ADD COLUMN IF NOT EXISTS analysis jsonb;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS concepts jsonb;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS summary text;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS difficulty text;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS estimated_reading_time integer;

-- Add missing columns to planners table
ALTER TABLE planners ADD COLUMN IF NOT EXISTS tasks jsonb DEFAULT '[]';
ALTER TABLE planners ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE planners ADD COLUMN IF NOT EXISTS daily_hours integer DEFAULT 2;
ALTER TABLE planners ADD COLUMN IF NOT EXISTS subject text;

-- =====================================================
-- NEW TABLES
-- =====================================================

-- Source analysis results
CREATE TABLE IF NOT EXISTS source_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES sources(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  summary text,
  key_concepts jsonb DEFAULT '[]',
  difficulty text DEFAULT 'medium',
  estimated_reading_time integer DEFAULT 30,
  chapter_structure jsonb DEFAULT '[]',
  key_takeaways jsonb DEFAULT '[]',
  recommendations jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

-- Concept mastery tracking
CREATE TABLE IF NOT EXISTS concept_mastery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  concept text NOT NULL,
  source_id uuid REFERENCES sources(id) ON DELETE SET NULL,
  mastery_score float DEFAULT 0,
  confidence_score float DEFAULT 0,
  total_attempts integer DEFAULT 0,
  correct_attempts integer DEFAULT 0,
  last_assessed timestamptz,
  next_review_date timestamptz,
  interval_days integer DEFAULT 1,
  level text DEFAULT 'novice',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, concept)
);

-- Knowledge gaps
CREATE TABLE IF NOT EXISTS knowledge_gaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  concept text NOT NULL,
  severity integer DEFAULT 3,
  source_id uuid REFERENCES sources(id) ON DELETE SET NULL,
  identified_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  status text DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);

-- Progress events
CREATE TABLE IF NOT EXISTS progress_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  concept text,
  source_id uuid REFERENCES sources(id) ON DELETE SET NULL,
  score float,
  duration_minutes integer,
  correct boolean,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Review schedule (spaced repetition)
CREATE TABLE IF NOT EXISTS review_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  concept text NOT NULL,
  source_id uuid REFERENCES sources(id) ON DELETE SET NULL,
  mastery_score float DEFAULT 0,
  next_review_date timestamptz NOT NULL,
  interval_days integer DEFAULT 1,
  last_reviewed timestamptz,
  review_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Analytics snapshots
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  period text NOT NULL,
  study_hours float DEFAULT 0,
  quiz_accuracy float DEFAULT 0,
  revision_consistency float DEFAULT 0,
  topics_mastered integer DEFAULT 0,
  topics_total integer DEFAULT 0,
  learning_velocity float DEFAULT 0,
  snapshot_date date DEFAULT CURRENT_DATE,
  data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_source_analysis_source ON source_analysis(source_id);
CREATE INDEX IF NOT EXISTS idx_source_analysis_user ON source_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_concept_mastery_user ON concept_mastery(user_id);
CREATE INDEX IF NOT EXISTS idx_concept_mastery_concept ON concept_mastery(user_id, concept);
CREATE INDEX IF NOT EXISTS idx_concept_mastery_review ON concept_mastery(user_id, next_review_date);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_user ON knowledge_gaps(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_status ON knowledge_gaps(user_id, status);
CREATE INDEX IF NOT EXISTS idx_progress_events_user ON progress_events(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_events_type ON progress_events(user_id, event_type);
CREATE INDEX IF NOT EXISTS idx_progress_events_date ON progress_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_review_schedule_user ON review_schedule(user_id);
CREATE INDEX IF NOT EXISTS idx_review_schedule_date ON review_schedule(user_id, next_review_date);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics_snapshots(user_id, snapshot_date);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE source_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;

-- Policies (service role key bypasses RLS, but these are for safety)
CREATE POLICY "Users can view own source_analysis" ON source_analysis FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own source_analysis" ON source_analysis FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own source_analysis" ON source_analysis FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own source_analysis" ON source_analysis FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own concept_mastery" ON concept_mastery FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own concept_mastery" ON concept_mastery FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own concept_mastery" ON concept_mastery FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own concept_mastery" ON concept_mastery FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own knowledge_gaps" ON knowledge_gaps FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own knowledge_gaps" ON knowledge_gaps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own knowledge_gaps" ON knowledge_gaps FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own knowledge_gaps" ON knowledge_gaps FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own progress_events" ON progress_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress_events" ON progress_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress_events" ON progress_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own progress_events" ON progress_events FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own review_schedule" ON review_schedule FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own review_schedule" ON review_schedule FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own review_schedule" ON review_schedule FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own review_schedule" ON review_schedule FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own analytics_snapshots" ON analytics_snapshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own analytics_snapshots" ON analytics_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own analytics_snapshots" ON analytics_snapshots FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own analytics_snapshots" ON analytics_snapshots FOR DELETE USING (auth.uid() = user_id);
