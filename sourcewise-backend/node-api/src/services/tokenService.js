/**
 * TokenService — token usage logging + cost estimation.
 * Cost = prompt_tokens/1000 * input_price + completion_tokens/1000 * output_price
 * Pricing looked up from provider_pricing (fallback to built-in defaults).
 */
const supabase = require('../utils/supabase');

const DEFAULT_PRICING = {
  'gemini:gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
  'gemini:gemini-1.5-pro': { input: 0.00125, output: 0.005 },
  'gemini:gemini-2.0-flash': { input: 0.0001, output: 0.0004 },
  'grok:grok-beta': { input: 0.005, output: 0.015 },
  'grok:grok-2': { input: 0.002, output: 0.01 },
};

let pricingCache = null;
let pricingCacheAt = 0;

async function getPricing(provider, model) {
  try {
    if (!pricingCache || Date.now() - pricingCacheAt > 5 * 60 * 1000) {
      const { data } = await supabase.from('provider_pricing').select('*').eq('is_active', true);
      pricingCache = data || [];
      pricingCacheAt = Date.now();
    }
    const row = (pricingCache || []).find(
      (p) => p.provider === provider && p.model === model && !p.effective_until
    ) || (pricingCache || []).find((p) => p.provider === provider && p.model === model);
    if (row) {
      return { input: Number(row.input_price_per_1k_tokens), output: Number(row.output_price_per_1k_tokens) };
    }
  } catch (e) { /* fall through to defaults */ }
  return DEFAULT_PRICING[`${provider}:${model}`] || { input: 0.0001, output: 0.0004 };
}

function estimateCost(promptTokens, completionTokens, pricing) {
  return Number((((promptTokens / 1000) * pricing.input) + ((completionTokens / 1000) * pricing.output)).toFixed(6));
}

/** Rough client-side estimate (~4 chars/token) for pre-flight budget checks. */
function estimateTokensFor(text) {
  if (!text) return 0;
  return Math.max(1, Math.ceil(String(text).length / 4));
}

/** Resolve active provider/model from env (mirrors python-ai config). */
function currentProvider() {
  const provider = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();
  const model = provider === 'grok'
    ? (process.env.GROK_MODEL || 'grok-beta')
    : (process.env.GEMINI_MODEL || process.env.LLM_MODEL || 'gemini-1.5-flash');
  return { provider, model };
}

async function logUsage(entry) {
  const pricing = await getPricing(entry.provider || 'gemini', entry.model || 'gemini-1.5-flash');
  const cost = estimateCost(entry.promptTokens || 0, entry.completionTokens || 0, pricing);
  const row = {
    user_id: entry.userId,
    session_id: entry.sessionId || null,
    source_id: entry.sourceId || null,
    request_id: entry.requestId,
    endpoint: entry.endpoint,
    provider: entry.provider || 'gemini',
    model: entry.model || 'gemini-1.5-flash',
    prompt_tokens: entry.promptTokens || 0,
    completion_tokens: entry.completionTokens || 0,
    total_tokens: (entry.promptTokens || 0) + (entry.completionTokens || 0),
    estimated_cost_usd: cost,
    context_chunks_count: entry.contextChunks || 0,
    context_tokens_estimate: entry.contextTokens || 0,
    compression_applied: !!entry.compressionApplied,
    compression_ratio: entry.compressionRatio || 1.0,
    success: entry.success !== false,
    error_message: entry.errorMessage || null,
    latency_ms: entry.latencyMs || null,
  };
  try {
    await supabase.from('token_usage_logs').insert(row);
  } catch (e) {
    console.error('[TokenService] logUsage failed:', e.message);
  }
  try {
    await supabase.from('system_metrics').insert([
      { metric_name: 'tokens_total', metric_value: row.total_tokens, metric_unit: 'tokens', tags: { provider: row.provider, model: row.model, endpoint: row.endpoint } },
      { metric_name: 'cost_usd', metric_value: cost, metric_unit: 'usd', tags: { provider: row.provider, model: row.model } },
    ]);
  } catch (e) { /* best effort */ }
  return { ...row, estimatedCost: cost };
}

module.exports = { getPricing, estimateCost, estimateTokensFor, logUsage, currentProvider, DEFAULT_PRICING };
