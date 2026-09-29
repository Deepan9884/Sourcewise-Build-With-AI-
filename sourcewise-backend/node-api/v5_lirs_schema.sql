-- SourceWise V5.0 LIRS Database Schema
-- Learning Intelligence Reinforcement System

-- =====================================================
-- REINFORCEMENT EVENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS reinforcement_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  event_type text NOT NULL,  -- quiz, flashcard, plan, tutor, recommendation
  content_data jsonb DEFAULT '{}',
  outcome_data jsonb DEFAULT '{}',
  success_score float DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- LEARNING OUTCOMES
-- =====================================================

CREATE TABLE IF NOT EXISTS learning_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  outcome_type text NOT NULL,  -- knowledge_gain, retention, mastery
  pre_score float,
  post_score float,
  gain_percentage float,
  concept text,
  source_id uuid REFERENCES sources(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- KNOWLEDGE GAIN
-- =====================================================

CREATE TABLE IF NOT EXISTS knowledge_gain (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  concept text NOT NULL,
  pre_score float DEFAULT 0,
  post_score float DEFAULT 0,
  gain_percentage float DEFAULT 0,
  learning_velocity float DEFAULT 0,
  session_type text,  -- quiz, revision, tutor
  duration_minutes integer,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- PROMPT PERFORMANCE
-- =====================================================

CREATE TABLE IF NOT EXISTS prompt_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_type text NOT NULL,  -- flashcard, quiz, plan, summary
  prompt_version text,
  quality_score float DEFAULT 0,
  user_feedback float,
  retention_impact float,
  completion_rate float,
  usage_count integer DEFAULT 0,
  success_count integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- AGENT REFLECTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  agent_name text NOT NULL,
  decision text NOT NULL,
  reason text,
  outcome text,  -- positive, negative, neutral
  confidence float DEFAULT 0.5,
  lessons_learned jsonb DEFAULT '[]',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- PATTERN DISCOVERIES
-- =====================================================

CREATE TABLE IF NOT EXISTS pattern_discoveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type text NOT NULL,  -- strategy, failure, retention, accelerator
  description text NOT NULL,
  success_rate float DEFAULT 0,
  sample_size integer DEFAULT 0,
  confidence float DEFAULT 0,
  examples jsonb DEFAULT '[]',
  discovered_at timestamptz DEFAULT now(),
  last_validated timestamptz
);

-- =====================================================
-- TEACHING EFFECTIVENESS
-- =====================================================

CREATE TABLE IF NOT EXISTS teaching_effectiveness (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_session_id uuid,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  satisfaction_score float,
  knowledge_gain float,
  retention_impact float,
  teaching_style text,
  concept text,
  duration_minutes integer,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- RECOMMENDATION PERFORMANCE
-- =====================================================

CREATE TABLE IF NOT EXISTS recommendation_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  recommendation_type text NOT NULL,
  accepted boolean DEFAULT false,
  completed boolean DEFAULT false,
  educational_impact float DEFAULT 0,
  retention_impact float DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- ARTIFACT QUALITY HISTORY
-- =====================================================

CREATE TABLE IF NOT EXISTS artifact_quality_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_type text NOT NULL,  -- flashcard, quiz, plan, summary
  artifact_id text,
  quality_score float DEFAULT 0,
  clarity_score float DEFAULT 0,
  learning_value_score float DEFAULT 0,
  exam_relevance_score float DEFAULT 0,
  user_feedback float,
  retention_impact float,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- AGENT KNOWLEDGE BASE
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name text NOT NULL,
  knowledge_type text NOT NULL,  -- success_pattern, failure_pattern, strategy, optimization
  description text NOT NULL,
  data jsonb DEFAULT '{}',
  confidence float DEFAULT 0.5,
  usage_count integer DEFAULT 0,
  success_rate float DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  last_used timestamptz
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_reinforcement_events_user ON reinforcement_events(user_id);
CREATE INDEX IF NOT EXISTS idx_reinforcement_events_type ON reinforcement_events(event_type);
CREATE INDEX IF NOT EXISTS idx_reinforcement_events_date ON reinforcement_events(created_at);

CREATE INDEX IF NOT EXISTS idx_learning_outcomes_user ON learning_outcomes(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_outcomes_concept ON learning_outcomes(concept);

CREATE INDEX IF NOT EXISTS idx_knowledge_gain_user ON knowledge_gain(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_gain_concept ON knowledge_gain(concept);

CREATE INDEX IF NOT EXISTS idx_prompt_performance_type ON prompt_performance(prompt_type);

CREATE INDEX IF NOT EXISTS idx_agent_reflections_user ON agent_reflections(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_reflections_agent ON agent_reflections(agent_name);

CREATE INDEX IF NOT EXISTS idx_pattern_discoveries_type ON pattern_discoveries(pattern_type);

CREATE INDEX IF NOT EXISTS idx_teaching_effectiveness_user ON teaching_effectiveness(user_id);

CREATE INDEX IF NOT EXISTS idx_recommendation_performance_user ON recommendation_performance(user_id);

CREATE INDEX IF NOT EXISTS idx_artifact_quality_type ON artifact_quality_history(artifact_type);

CREATE INDEX IF NOT EXISTS idx_agent_knowledge_agent ON agent_knowledge_base(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_type ON agent_knowledge_base(knowledge_type);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE reinforcement_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_gain ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE teaching_effectiveness ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reinforcement_events" ON reinforcement_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reinforcement_events" ON reinforcement_events FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own learning_outcomes" ON learning_outcomes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own learning_outcomes" ON learning_outcomes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own knowledge_gain" ON knowledge_gain FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own knowledge_gain" ON knowledge_gain FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own agent_reflections" ON agent_reflections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own agent_reflections" ON agent_reflections FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own teaching_effectiveness" ON teaching_effectiveness FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own teaching_effectiveness" ON teaching_effectiveness FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own recommendation_performance" ON recommendation_performance FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recommendation_performance" ON recommendation_performance FOR INSERT WITH CHECK (auth.uid() = user_id);
