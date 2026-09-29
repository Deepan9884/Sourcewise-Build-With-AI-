/**
 * Token tier budgets — per-request and daily token limits + monthly credit grants.
 * Credits: 1 credit = 1 token (prompt + completion combined).
 */
const TIERS = {
  free: {
    maxTokensPerRequest: 5000,
    maxTokensPerDay: 50000,
    monthlyCredits: 100000,
    maxSources: 5,
    maxConcurrentRequests: 2,
  },
  basic: {
    maxTokensPerRequest: 15000,
    maxTokensPerDay: 200000,
    monthlyCredits: 500000,
    maxSources: 25,
    maxConcurrentRequests: 5,
  },
  pro: {
    maxTokensPerRequest: 50000,
    maxTokensPerDay: 1000000,
    monthlyCredits: 2000000,
    maxSources: 100,
    maxConcurrentRequests: 10,
  },
  enterprise: {
    maxTokensPerRequest: 200000,
    maxTokensPerDay: 10000000,
    monthlyCredits: 20000000,
    maxSources: 1000,
    maxConcurrentRequests: 50,
  },
};

function getTier(name) {
  return TIERS[name] || TIERS.free;
}

module.exports = { TIERS, getTier };
