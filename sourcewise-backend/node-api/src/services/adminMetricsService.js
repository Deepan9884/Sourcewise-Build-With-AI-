/**
 * AdminMetricsService — aggregated stats for the creator dashboard.
 * All queries defensive: return zeros when token tables are absent.
 */
const supabase = require('../utils/supabase');

function periodToHours(period) {
  const map = { '1h': 1, '24h': 24, '7d': 168, '30d': 720, '90d': 2160 };
  return map[period] || 24;
}

async function getOverview(period = '24h') {
  const hours = periodToHours(period);
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
  const out = {
    totalUsers: 0, activeUsers: 0, totalTokens: 0, promptTokens: 0,
    completionTokens: 0, estimatedCost: 0, requestCount: 0,
    tokensByProvider: {}, errorCount: 0,
  };
  try {
    const { count } = await supabase.from('users').select('id', { count: 'exact', head: true });
    out.totalUsers = count || 0;
  } catch (e) { /* ignore */ }
  try {
    const { data: logs } = await supabase.from('token_usage_logs')
      .select('user_id, provider, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, success')
      .gte('created_at', since).limit(10000);
    const rows = logs || [];
    out.requestCount = rows.length;
    out.promptTokens = rows.reduce((s, r) => s + (r.prompt_tokens || 0), 0);
    out.completionTokens = rows.reduce((s, r) => s + (r.completion_tokens || 0), 0);
    out.totalTokens = rows.reduce((s, r) => s + (r.total_tokens || 0), 0);
    out.estimatedCost = Number(rows.reduce((s, r) => s + Number(r.estimated_cost_usd || 0), 0).toFixed(4));
    out.activeUsers = new Set(rows.map((r) => r.user_id)).size;
    out.errorCount = rows.filter((r) => !r.success).length;
    for (const r of rows) out.tokensByProvider[r.provider || 'unknown'] = (out.tokensByProvider[r.provider || 'unknown'] || 0) + (r.total_tokens || 0);
  } catch (e) { /* tables missing */ }
  return out;
}

async function getUsageTimeseries({ period = '24h', groupBy = 'day', provider = null } = {}) {
  const hours = periodToHours(period);
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
  try {
    let q = supabase.from('token_usage_logs')
      .select('prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, provider, created_at')
      .gte('created_at', since).order('created_at', { ascending: true }).limit(10000);
    if (provider) q = q.eq('provider', provider);
    const { data } = await q;
    const buckets = {};
    for (const r of data || []) {
      const d = new Date(r.created_at);
      let key;
      if (groupBy === 'hour' || (groupBy === 'day' && hours <= 48)) key = d.toISOString().slice(0, 13) + ':00';
      else key = d.toISOString().slice(0, 10);
      if (!buckets[key]) buckets[key] = { period: key, promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0, requestCount: 0 };
      buckets[key].promptTokens += r.prompt_tokens || 0;
      buckets[key].completionTokens += r.completion_tokens || 0;
      buckets[key].totalTokens += r.total_tokens || 0;
      buckets[key].estimatedCost += Number(r.estimated_cost_usd || 0);
      buckets[key].requestCount += 1;
    }
    return Object.values(buckets).map((b) => ({ ...b, estimatedCost: Number(b.estimatedCost.toFixed(4)) }));
  } catch (e) {
    return [];
  }
}

async function getBreakdown({ period = '30d' } = {}) {
  const hours = periodToHours(period);
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
  const out = { byProvider: {}, byModel: {}, byEndpoint: {}, topUsers: [] };
  try {
    const { data } = await supabase.from('token_usage_logs')
      .select('provider, model, endpoint, user_id, total_tokens, estimated_cost_usd')
      .gte('created_at', since).limit(10000);
    const perUser = {};
    for (const r of data || []) {
      const t = r.total_tokens || 0, c = Number(r.estimated_cost_usd || 0);
      out.byProvider[r.provider || '?'] = out.byProvider[r.provider || '?'] || { tokens: 0, cost: 0 };
      out.byProvider[r.provider || '?'].tokens += t; out.byProvider[r.provider || '?'].cost += c;
      out.byModel[r.model || '?'] = out.byModel[r.model || '?'] || { tokens: 0, cost: 0 };
      out.byModel[r.model || '?'].tokens += t; out.byModel[r.model || '?'].cost += c;
      out.byEndpoint[r.endpoint || '?'] = out.byEndpoint[r.endpoint || '?'] || { tokens: 0, requests: 0 };
      out.byEndpoint[r.endpoint || '?'].tokens += t; out.byEndpoint[r.endpoint || '?'].requests += 1;
      perUser[r.user_id] = perUser[r.user_id] || { userId: r.user_id, tokens: 0, cost: 0, requests: 0 };
      perUser[r.user_id].tokens += t; perUser[r.user_id].cost += c; perUser[r.user_id].requests += 1;
    }
    // Attach emails to top users
    const top = Object.values(perUser).sort((a, b) => b.tokens - a.tokens).slice(0, 10);
    if (top.length) {
      const { data: users } = await supabase.from('users').select('id, email, name').in('id', top.map((u) => u.userId));
      const map = Object.fromEntries((users || []).map((u) => [u.id, u]));
      out.topUsers = top.map((u) => ({ ...u, cost: Number(u.cost.toFixed(4)), email: map[u.userId]?.email, name: map[u.userId]?.name }));
    }
    for (const k of Object.keys(out.byProvider)) out.byProvider[k].cost = Number(out.byProvider[k].cost.toFixed(4));
    for (const k of Object.keys(out.byModel)) out.byModel[k].cost = Number(out.byModel[k].cost.toFixed(4));
  } catch (e) { /* ignore */ }
  return out;
}

async function listUsers({ page = 1, limit = 20, tier = null, search = '' } = {}) {
  const offset = (page - 1) * limit;
  let q = supabase.from('users').select('id, email, name, credit_tier, is_admin, created_at', { count: 'exact' }).order('created_at', { ascending: false });
  if (search) q = q.ilike('email', `%${search}%`);
  if (tier) q = q.eq('credit_tier', tier);
  const { data: users, count, error } = await q.range(offset, offset + limit - 1);
  if (error) throw error;
  const ids = (users || []).map((u) => u.id);
  let creditMap = {};
  try {
    if (ids.length) {
      const { data: credits } = await supabase.from('user_credits').select('*').in('user_id', ids);
      creditMap = Object.fromEntries((credits || []).map((c) => [c.user_id, c]));
    }
  } catch (e) { /* ignore */ }
  // Session/source counts (best effort)
  let activityMap = {};
  try {
    if (ids.length) {
      const { data: sess } = await supabase.from('tutoring_sessions').select('user_id').in('user_id', ids).limit(5000);
      for (const s of sess || []) activityMap[s.user_id] = activityMap[s.user_id] || { sessions: 0 }, activityMap[s.user_id].sessions++;
    }
  } catch (e) { /* ignore */ }
  const rows = (users || []).map((u) => {
    const c = creditMap[u.id] || {};
    const total = c.total_credits ?? 100000, used = c.used_credits ?? 0, reserved = c.reserved_credits ?? 0;
    return {
      id: u.id, email: u.email, name: u.name, tier: u.credit_tier || c.credit_tier || 'free',
      isAdmin: !!u.is_admin, creditsTotal: total, creditsUsed: used,
      creditsRemaining: Math.max(0, total - used - reserved),
      sessionsCount: activityMap[u.id]?.sessions || 0,
      createdAt: u.created_at,
    };
  });
  return { data: rows, total: count || 0, page, limit };
}

async function getUserDetail(userId) {
  const { data: user } = await supabase.from('users').select('id, email, name, credit_tier, is_admin, created_at').eq('id', userId).single();
  if (!user) return null;
  let credits = null, transactions = [], recentUsage = [];
  try {
    const { data } = await supabase.from('user_credits').select('*').eq('user_id', userId).maybeSingle();
    credits = data;
  } catch (e) { /* ignore */ }
  try {
    const { data } = await supabase.from('credit_transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
    transactions = data || [];
  } catch (e) { /* ignore */ }
  try {
    const { data } = await supabase.from('token_usage_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
    recentUsage = data || [];
  } catch (e) { /* ignore */ }
  const total = credits?.total_credits ?? 100000, used = credits?.used_credits ?? 0, reserved = credits?.reserved_credits ?? 0;
  return {
    id: user.id, email: user.email, name: user.name, tier: user.credit_tier || credits?.credit_tier || 'free',
    isAdmin: !!user.is_admin, createdAt: user.created_at,
    creditsTotal: total, creditsUsed: used, creditsRemaining: Math.max(0, total - used - reserved),
    creditTransactions: transactions, recentUsage,
  };
}

module.exports = { getOverview, getUsageTimeseries, getBreakdown, listUsers, getUserDetail };
