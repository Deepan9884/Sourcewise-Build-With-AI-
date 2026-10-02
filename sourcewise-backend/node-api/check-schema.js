require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

const tables = ['concept_mastery', 'knowledge_gaps', 'review_schedule', 'tutoring_sessions', 'practice_attempts', 'quiz_results', 'token_usage_logs', 'progress', 'study_analytics', 'source_analysis', 'progress_events', 'planners', 'learning_profiles', 'user_credits'];

async function check() {
  for (const t of tables) {
    try {
      const {data: d2, error} = await sb.from(t).select('*').limit(1);
      if (error) {
        console.log(t + ': ERROR -', error.message.slice(0, 100));
      } else if (d2 && d2[0]) {
        console.log(t + ': COLS:', Object.keys(d2[0]).join(', '));
      } else {
        console.log(t + ': OK (empty - no columns visible)');
      }
    } catch(e) {
      console.log(t + ': EXCEPTION -', e.message.slice(0, 80));
    }
  }
}
check();
