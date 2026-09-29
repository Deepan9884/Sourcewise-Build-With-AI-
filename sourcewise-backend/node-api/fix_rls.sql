-- SourceWise RLS hardening (v11) — run this in Supabase SQL Editor.
--
-- THREAT MODEL (read before changing):
-- - Authentication is enforced SERVER-SIDE by the Node API's JWT middleware
--   (sourcewise-backend/node-api/src/middleware/auth.js) using a custom
--   bcrypt + JWT scheme — NOT Supabase Auth.
-- - The API server MUST run with SUPABASE_SERVICE_ROLE_KEY
--   (see src/utils/supabase.js), which bypasses RLS. The server refuses to
--   start in production without it.
-- - These policies therefore exist to DENY *direct* anon-key access to the
--   database (defense in depth). They do not authorize end users.
--
-- CONSEQUENCES:
-- - `users` keeps a public INSERT so registration works.
-- - Every other direct anon/authenticated-key access is DENIED (RLS stays
--   ENABLED, no permissive policies). The API server is unaffected because
--   it uses the service-role key.
-- - The V2/V5 migration files (v2_schema.sql, v5_lirs_schema.sql) use
--   auth.uid() policies. Those only take effect for Supabase-Auth JWTs and
--   are likewise bypassed by the service-role key. If the project ever
--   migrates to Supabase Auth, revisit this file.
--
-- NOTE: the pre-v11 version of this file set USING (true) / WITH CHECK (true)
-- on every table, which exposed all rows (including users.password_hash) to
-- anyone holding the anon key. Do NOT restore open policies.

-- Ensure RLS is enabled everywhere (idempotent)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE planners ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutoring_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_analytics ENABLE ROW LEVEL SECURITY;

-- Drop the old permissive (pre-v11) policies
DROP POLICY IF EXISTS "Allow public inserts" ON users;
DROP POLICY IF EXISTS "Allow authenticated reads" ON users;
DROP POLICY IF EXISTS "Allow authenticated updates" ON users;
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable insert for anonymous users" ON users;
DROP POLICY IF EXISTS "Enable update for users based on id" ON users;
DROP POLICY IF EXISTS "sources_policy" ON sources;
DROP POLICY IF EXISTS "planners_policy" ON planners;
DROP POLICY IF EXISTS "progress_policy" ON progress;
DROP POLICY IF EXISTS "quiz_results_policy" ON quiz_results;
DROP POLICY IF EXISTS "learning_profiles_policy" ON learning_profiles;
DROP POLICY IF EXISTS "tutoring_sessions_policy" ON tutoring_sessions;
DROP POLICY IF EXISTS "practice_attempts_policy" ON practice_attempts;
DROP POLICY IF EXISTS "study_analytics_policy" ON study_analytics;

-- Registration must work: allow public inserts on users ONLY.
-- No SELECT/UPDATE/DELETE policies: direct key access to user rows
-- (which contain password_hash) is denied. All reads/writes go through
-- the API server's service-role key + JWT middleware.
CREATE POLICY "Allow public inserts" ON users
  FOR INSERT
  WITH CHECK (true);

-- Intentionally NO policies on sources, planners, progress, quiz_results,
-- learning_profiles, tutoring_sessions, practice_attempts, study_analytics:
-- with RLS enabled and zero policies, direct anon-key access is denied.
