/**
 * CreditService — manage user_credits + credit_transactions.
 * All functions are defensive: missing tables/rows resolve to safe defaults
 * so the API keeps working before the migration is applied.
 */
const supabase = require('../utils/supabase');
const { getTier } = require('../config/tokenTiers');

async function getOrCreateCredits(userId) {
  try {
    const { data, error } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (data) return data;
    if (error && error.code !== 'PGRST116') throw error;

    // Determine tier from users table when possible
    let tier = 'free';
    try {
      const { data: u } = await supabase.from('users').select('credit_tier').eq('id', userId).maybeSingle();
      if (u?.credit_tier) tier = u.credit_tier;
    } catch (e) { /* ignore */ }

    const tierCfg = getTier(tier);
    const { data: created } = await supabase
      .from('user_credits')
      .insert({ user_id: userId, total_credits: tierCfg.monthlyCredits, used_credits: 0, reserved_credits: 0, credit_tier: tier })
      .select()
      .single();
    return created || { user_id: userId, total_credits: tierCfg.monthlyCredits, used_credits: 0, reserved_credits: 0, credit_tier: tier };
  } catch (e) {
    // Table missing (migration not applied) — return in-memory default
    return { user_id: userId, total_credits: 100000, used_credits: 0, reserved_credits: 0, credit_tier: 'free', _fallback: true };
  }
}

function remaining(credits) {
  return Math.max(0, (credits.total_credits || 0) - (credits.used_credits || 0) - (credits.reserved_credits || 0));
}

async function reserveCredits(userId, tokens) {
  const credits = await getOrCreateCredits(userId);
  if (credits._fallback) return { ok: true, remaining: 100000 };
  if (remaining(credits) < tokens) {
    return { ok: false, remaining: remaining(credits), reason: 'insufficient_credits' };
  }
  try {
    await supabase.from('user_credits')
      .update({ reserved_credits: (credits.reserved_credits || 0) + tokens, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
  } catch (e) { /* best effort */ }
  return { ok: true, remaining: remaining(credits) - tokens };
}

async function commitUsage(userId, tokens, meta = {}) {
  try {
    const credits = await getOrCreateCredits(userId);
    if (credits._fallback) return credits;
    const newReserved = Math.max(0, (credits.reserved_credits || 0) - (meta.reserved || tokens));
    const newUsed = (credits.used_credits || 0) + tokens;
    const { data } = await supabase.from('user_credits')
      .update({ used_credits: newUsed, reserved_credits: newReserved, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single();
    await supabase.from('credit_transactions').insert({
      user_id: userId,
      type: 'usage',
      amount: -tokens,
      balance_after: remaining(data || { ...credits, used_credits: newUsed, reserved_credits: newReserved }),
      description: meta.description || `AI usage: ${meta.endpoint || 'unknown'} (${meta.provider || '?'}/${meta.model || '?'})`,
      reference_id: meta.requestId || null,
      metadata: { endpoint: meta.endpoint, provider: meta.provider, model: meta.model, promptTokens: meta.promptTokens, completionTokens: meta.completionTokens },
    });
    return data || credits;
  } catch (e) {
    console.error('[CreditService] commitUsage failed:', e.message);
    return null;
  }
}

async function releaseReservation(userId, tokens) {
  try {
    const credits = await getOrCreateCredits(userId);
    if (credits._fallback) return;
    await supabase.from('user_credits')
      .update({ reserved_credits: Math.max(0, (credits.reserved_credits || 0) - tokens), updated_at: new Date().toISOString() })
      .eq('user_id', userId);
  } catch (e) { /* best effort */ }
}

async function grantCredits(userId, amount, { reason = 'grant', description = '', adminId = null } = {}) {
  const credits = await getOrCreateCredits(userId);
  if (credits._fallback) throw new Error('Credit tables not available — run token_tracking_schema.sql');
  const newTotal = (credits.total_credits || 0) + amount;
  const { data } = await supabase.from('user_credits')
    .update({ total_credits: newTotal, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .single();
  await supabase.from('credit_transactions').insert({
    user_id: userId,
    type: reason,
    amount,
    balance_after: remaining(data || { ...credits, total_credits: newTotal }),
    description: description || `Admin ${reason}: ${amount} credits`,
    reference_id: adminId,
    metadata: { adminId, reason },
  });
  return data;
}

async function dailyUsage(userId) {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase.from('token_usage_logs')
      .select('total_tokens')
      .eq('user_id', userId)
      .gte('created_at', since);
    return (data || []).reduce((s, r) => s + (r.total_tokens || 0), 0);
  } catch (e) {
    return 0;
  }
}

module.exports = { getOrCreateCredits, remaining, reserveCredits, commitUsage, releaseReservation, grantCredits, dailyUsage };
