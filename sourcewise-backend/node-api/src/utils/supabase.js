const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables');
}

// Security posture (see fix_rls.sql): RLS denies direct anon-key access, so
// the server must use the service-role key. Refuse to start in production
// without it; warn loudly in other environments.
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const msg = 'SUPABASE_SERVICE_ROLE_KEY is not set — falling back to anon key. '
    + 'RLS will deny most queries. Set SUPABASE_SERVICE_ROLE_KEY for full server access.';
  if (process.env.NODE_ENV === 'production') {
    throw new Error(msg);
  }
  console.warn(`[Supabase] ${msg}`);
}

/**
 * Resilient fetch — long-lived server processes can hit stale keep-alive
 * sockets to Supabase ("TypeError: fetch failed"). Retry transient network
 * failures with backoff instead of failing the request outright.
 */
async function resilientFetch(url, options = {}) {
  const retries = 2;
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(url, options);
    } catch (e) {
      lastErr = e;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    }
  }
  throw lastErr;
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  global: { fetch: resilientFetch },
});

module.exports = supabase;
module.exports.resilientFetch = resilientFetch;
