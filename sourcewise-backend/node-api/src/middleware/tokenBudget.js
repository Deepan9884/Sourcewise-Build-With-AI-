/**
 * TokenBudgetMiddleware — enforce per-tier token budgets before AI calls.
 * - Estimates request tokens from question + history + sources
 * - Checks per-request limit, daily limit, and credit balance
 * - Reserves estimated credits; handlers commit actual usage afterwards
 */
const { getTier } = require('../config/tokenTiers');
const creditService = require('../services/creditService');
const { estimateTokensFor } = require('../services/tokenService');
const supabase = require('../utils/supabase');

function estimateRequestTokens(body) {
  let tokens = 0;
  tokens += estimateTokensFor(body.question || body.concept || body.topic || '');
  const history = body.history || body.conversation_history || [];
  for (const m of history.slice(-12)) tokens += estimateTokensFor(m.content || '');
  // RAG context estimate: TOP_K(10) x CHUNK(800 chars) ≈ 2000 tokens baseline
  const sourceCount = (body.sourceIds || body.source_ids || []).length;
  tokens += Math.min(sourceCount, 5) * 1600 + 1500; // system prompt overhead
  return tokens;
}

async function getUserTier(userId) {
  try {
    const { data } = await supabase.from('users').select('credit_tier').eq('id', userId).maybeSingle();
    if (data?.credit_tier) return data.credit_tier;
    const credits = await creditService.getOrCreateCredits(userId);
    return credits.credit_tier || 'free';
  } catch (e) {
    return 'free';
  }
}

function tokenBudget({ endpoint = 'ai' } = {}) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.userId || req.user?.id || req.user?._id;
      if (!userId) return next();

      const tierName = await getUserTier(userId);
      const tier = getTier(tierName);
      const estimated = estimateRequestTokens(req.body || {});

      if (estimated > tier.maxTokensPerRequest) {
        return res.status(429).json({
          error: `Estimated request (${estimated} tokens) exceeds per-request budget of ${tier.maxTokensPerRequest} for '${tierName}' tier. Try fewer sources or a shorter question.`,
          type: 'https://api.sourcewise.com/errors/token-budget-exceeded',
          tier: tierName, estimated, budget: tier.maxTokensPerRequest,
        });
      }

      const usedToday = await creditService.dailyUsage(userId);
      if (usedToday + estimated > tier.maxTokensPerDay) {
        return res.status(429).json({
          error: `Daily token budget exceeded for '${tierName}' tier (${usedToday}/${tier.maxTokensPerDay} used). Resets in 24h.`,
          type: 'https://api.sourcewise.com/errors/daily-budget-exceeded',
          tier: tierName, usedToday, dailyBudget: tier.maxTokensPerDay,
        });
      }

      const reserve = await creditService.reserveCredits(userId, estimated);
      if (!reserve.ok) {
        return res.status(402).json({
          error: `Insufficient credits (${reserve.remaining} remaining, ~${estimated} needed). Contact admin or upgrade your tier.`,
          type: 'https://api.sourcewise.com/errors/insufficient-credits',
          remaining: reserve.remaining, estimated,
        });
      }

      req.tokenBudget = { tier: tierName, estimated, endpoint, reserved: estimated };
      next();
    } catch (e) {
      console.error('[TokenBudget] error:', e.message);
      next(); // fail-open so AI keeps working if credit tables missing
    }
  };
}

module.exports = { tokenBudget, estimateRequestTokens, getUserTier };
