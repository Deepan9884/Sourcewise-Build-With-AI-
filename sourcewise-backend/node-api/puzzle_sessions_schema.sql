-- SourceWise v14: Study Puzzle Sessions
-- Run this in Supabase SQL editor

CREATE TABLE IF NOT EXISTS puzzle_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES users(id) ON DELETE CASCADE,
  puzzle_type  text NOT NULL CHECK (puzzle_type IN ('word_search','match_pairs','rapid_fire','memory_flip','anagram','cloze')),
  source_ids   text[] DEFAULT '{}',
  topic        text,
  score        integer DEFAULT 0,
  max_score    integer DEFAULT 100,
  time_seconds integer,
  hints_used   integer DEFAULT 0,
  completed    boolean DEFAULT false,
  xp_earned    integer DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE puzzle_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own puzzle sessions"
  ON puzzle_sessions FOR ALL
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

-- Service role bypasses RLS
CREATE INDEX IF NOT EXISTS idx_puzzle_sessions_user
  ON puzzle_sessions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_puzzle_sessions_type
  ON puzzle_sessions(user_id, puzzle_type);
