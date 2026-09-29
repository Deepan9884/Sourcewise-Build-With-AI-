/**
 * Admin Routes — creator dashboard API.
 * All routes require authenticate + requireAdmin.
 *
 * GET  /admin/stats               → overview aggregates (?period=24h|7d|30d)
 * GET  /admin/users               → paginated users (?page&limit&tier&search)
 * GET  /admin/users/:id           → user detail + credit history + usage
 * POST /admin/users/:id/credits   → grant/adjust credits {amount, reason, description}
 * GET  /admin/usage               → timeseries + breakdown (?period&groupBy&provider)
 * GET  /admin/providers/health    → live python-ai provider health
 * GET  /admin/providers/costs     → cost breakdown (?period)
 * GET  /admin/system/uptime       → uptime + latency stats
 * GET  /admin/pricing             → list provider pricing
 * POST /admin/pricing             → upsert pricing row
 * GET  /admin/activity            → SSE real-time activity feed (usage, credits, replans)
 * GET  /admin/plans               → all user plans w/ progress (?page&limit&status)
 * GET  /admin/content             → source/content aggregate stats
 * GET  /admin/mood                → mood aggregate stats (?days=30)
 */
const express = require('express');
const axios = require('axios');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/adminAuth');
const metrics = require('../services/adminMetricsService');
const creditService = require('../services/creditService');
const { getPricing, DEFAULT_PRICING } = require('../services/tokenService');
const supabase = require('../utils/supabase');

const PYTHON_AI_URL = process.env.PYTHON_AI_URL || 'http://localhost:8000';
const aiHeaders = () => (process.env.INTERNAL_API_KEY ? { 'X-Internal-Key': process.env.INTERNAL_API_KEY } : {});

router.use(authenticate, requireAdmin);

router.get('/stats', async (req, res) => {
  try {
    const data = await metrics.getOverview(req.query.period || '24h');
    // Attach live provider health (best effort)
    let providerHealth = [];
    try {
      const r = await axios.get(`${PYTHON_AI_URL}/chat/health`, { headers: aiHeaders(), timeout: 8000 });
      const h = r.data || {};
      if (h.active_provider) providerHealth.push({ ...h.active_provider, role: 'active' });
      if (h.fallback_provider) providerHealth.push({ ...h.fallback_provider, role: 'fallback' });
    } catch (e) {
      providerHealth = [{ provider: 'unknown', available: false, error: 'AI service unreachable' }];
    }
    res.json({ ...data, providerHealth });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/users', async (req, res) => {
  try {
    const result = await metrics.listUsers({
      page: parseInt(req.query.page, 10) || 1,
      limit: Math.min(parseInt(req.query.limit, 10) || 20, 100),
      tier: req.query.tier || null,
      search: req.query.search || '',
    });
    res.json({ data: result.data, pagination: { total: result.total, page: result.page, limit: result.limit, hasMore: result.page * result.limit < result.total } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const detail = await metrics.getUserDetail(req.params.id);
    if (!detail) return res.status(404).json({ error: 'User not found' });
    res.json(detail);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/users/:id/credits', async (req, res) => {
  try {
    const { amount, reason = 'grant', description = '' } = req.body;
    if (!Number.isInteger(amount)) return res.status(400).json({ error: 'amount must be an integer (positive to grant, negative to deduct)' });
    const adminId = req.user.userId || req.user.id;
    const updated = await creditService.grantCredits(req.params.id, amount, { reason, description, adminId });
    res.json({
      userId: req.params.id,
      totalCredits: updated.total_credits,
      usedCredits: updated.used_credits,
      remainingCredits: creditService.remaining(updated),
      tier: updated.credit_tier,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/usage', async (req, res) => {
  try {
    const { period = '24h', groupBy = 'day', provider = null } = req.query;
    const [timeseries, breakdown] = await Promise.all([
      metrics.getUsageTimeseries({ period, groupBy, provider: provider || undefined }),
      metrics.getBreakdown({ period }),
    ]);
    res.json({ timeseries, breakdown });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/providers/health', async (req, res) => {
  try {
    const started = Date.now();
    const r = await axios.get(`${PYTHON_AI_URL}/chat/health`, { headers: aiHeaders(), timeout: 10000 });
    res.json({ latencyMs: Date.now() - started, checkedAt: new Date().toISOString(), ...(r.data || {}) });
  } catch (e) {
    res.status(502).json({ available: false, error: e.message });
  }
});

router.get('/providers/costs', async (req, res) => {
  try {
    const breakdown = await metrics.getBreakdown({ period: req.query.period || '30d' });
    const totalCost = Object.values(breakdown.byProvider).reduce((s, p) => s + (p.cost || 0), 0);
    res.json({ totalCost: Number(totalCost.toFixed(4)), byProvider: breakdown.byProvider, byModel: breakdown.byModel });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/system/uptime', async (req, res) => {
  try {
    const period = req.query.period || '30d';
    const overview = await metrics.getOverview(period);
    const total = overview.requestCount || 0;
    const failed = overview.errorCount || 0;
    res.json({
      uptimePercent: total ? Number((((total - failed) / total) * 100).toFixed(2)) : 100,
      totalRequests: total, successfulRequests: total - failed, failedRequests: failed,
      nodeUptimeSecs: Math.round(process.uptime()),
      nodeMemory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/pricing', async (req, res) => {
  try {
    const { data } = await supabase.from('provider_pricing').select('*').eq('is_active', true).order('provider');
    res.json(data && data.length ? data : Object.entries(DEFAULT_PRICING).map(([k, v]) => {
      const [provider, model] = k.split(':');
      return { provider, model, input_price_per_1k_tokens: v.input, output_price_per_1k_tokens: v.output, is_active: true };
    }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/pricing', async (req, res) => {
  try {
    const { provider, model, inputPrice, outputPrice } = req.body;
    if (!provider || !model || inputPrice == null || outputPrice == null) {
      return res.status(400).json({ error: 'provider, model, inputPrice, outputPrice are required' });
    }
    // Close previous active row, insert new effective row
    await supabase.from('provider_pricing').update({ is_active: false, effective_until: new Date().toISOString() }).eq('provider', provider).eq('model', model).eq('is_active', true);
    const { data, error } = await supabase.from('provider_pricing').insert({
      provider, model, input_price_per_1k_tokens: inputPrice, output_price_per_1k_tokens: outputPrice, is_active: true,
    }).select().single();
    if (error) throw error;
    try { await getPricing(provider, model); } catch (e) { /* cache refresh best effort */ }
    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /admin/activity — SSE feed: recent usage, credit grants, replan events.
// Sends the last ~30 items on connect, then polls for new ones every 15s.
// Event types: 'activity' (initial burst + new items), ':ping' heartbeat.
router.get('/activity', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  const send = (event, data) => {
    try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch (e) { /* client gone */ }
  };

  async function fetchRecent(since) {
    const items = [];
    try {
      let q = supabase.from('token_usage_logs')
        .select('id,user_id,endpoint,provider,model,total_tokens,success,created_at')
        .order('created_at', { ascending: false }).limit(15);
      if (since) q = q.gt('created_at', since);
      const { data } = await q;
      for (const r of data || []) {
        items.push({ id: `u-${r.id}`, kind: r.success ? 'usage' : 'error', at: r.created_at,
          summary: `${r.endpoint} · ${r.provider}/${r.model} · ${r.total_tokens} tok`,
          meta: { userId: r.user_id } });
      }
    } catch (e) { /* tables may be missing */ }
    try {
      let q = supabase.from('credit_transactions')
        .select('id,user_id,type,amount,description,created_at')
        .order('created_at', { ascending: false }).limit(10);
      if (since) q = q.gt('created_at', since);
      const { data } = await q;
      for (const r of data || []) {
        items.push({ id: `c-${r.id}`, kind: 'credit', at: r.created_at,
          summary: `${r.type} ${r.amount > 0 ? '+' : ''}${r.amount} — ${r.description || ''}`.trim(),
          meta: { userId: r.user_id } });
      }
    } catch (e) { /* ignore */ }
    try {
      let q = supabase.from('replan_events')
        .select('id,plan_id,trigger_type,slots_rescheduled,created_at')
        .order('created_at', { ascending: false }).limit(10);
      if (since) q = q.gt('created_at', since);
      const { data } = await q;
      for (const r of data || []) {
        items.push({ id: `r-${r.id}`, kind: 'replan', at: r.created_at,
          summary: `replan (${r.trigger_type}) · ${r.slots_rescheduled || 0} slots`,
          meta: { planId: r.plan_id } });
      }
    } catch (e) { /* ignore */ }
    return items.sort((a, b) => (a.at < b.at ? 1 : -1));
  }

  let lastAt = null;
  try {
    const initial = await fetchRecent(null);
    if (initial.length) lastAt = initial[0].at;
    send('activity', { items: initial });
  } catch (e) { send('activity', { items: [], error: 'feed unavailable' }); }

  const timer = setInterval(async () => {
    try {
      if (res.writableEnded) { clearInterval(timer); return; }
      const fresh = await fetchRecent(lastAt);
      if (fresh.length) {
        lastAt = fresh[0].at;
        send('activity', { items: fresh });
      } else {
        res.write(':ping\n\n');
      }
    } catch (e) { /* keep alive */ }
  }, 15000);

  req.on('close', () => clearInterval(timer));
});

// GET /admin/plans — cross-user plan listing with progress aggregates.
router.get('/plans', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
    const offset = (page - 1) * limit;
    let q = supabase.from('study_plans')
      .select('id,user_id,name,status,daily_study_budget_minutes,created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (req.query.status) q = q.eq('status', req.query.status);
    const { data: plans, count, error } = await q;
    if (error) throw error;
    const ids = (plans || []).map((p) => p.id);
    let subjectsByPlan = {}, slotsByPlan = {};
    try {
      if (ids.length) {
        const { data: subs } = await supabase.from('plan_subjects').select('plan_id,subject_name,exam_date').in('plan_id', ids);
        for (const s of subs || []) (subjectsByPlan[s.plan_id] = subjectsByPlan[s.plan_id] || []).push(s);
        const { data: slots } = await supabase.from('schedule_slots')
          .select('plan_id,status,slot_type').in('plan_id', ids).limit(10000);
        for (const s of slots || []) {
          if (s.slot_type === 'break') continue;
          const e = (slotsByPlan[s.plan_id] = slotsByPlan[s.plan_id] || { total: 0, done: 0 });
          e.total += 1;
          if (s.status === 'completed') e.done += 1;
        }
      }
    } catch (e) { /* tables missing → zeros */ }
    const data = (plans || []).map((p) => {
      const agg = slotsByPlan[p.id] || { total: 0, done: 0 };
      return {
        id: p.id, userId: p.user_id, name: p.name, status: p.status,
        dailyBudgetMinutes: p.daily_study_budget_minutes,
        subjects: (subjectsByPlan[p.id] || []).length,
        subjectNames: (subjectsByPlan[p.id] || []).map((s) => s.subject_name),
        totalSlots: agg.total, completedSlots: agg.done,
        pacePct: agg.total ? Math.round((agg.done / agg.total) * 100) : 0,
        createdAt: p.created_at,
      };
    });
    res.json({ data, pagination: { total: count || 0, page, limit, hasMore: page * limit < (count || 0) } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /admin/content — source + analysis aggregate stats.
router.get('/content', async (req, res) => {
  try {
    const out = { totalSources: 0, totalChunks: 0, analyzedCount: 0, analysisRate: 0, difficultyBreakdown: {}, byType: {} };
    try {
      const { data: sources, count } = await supabase.from('sources')
        .select('type,status,chunks_indexed,difficulty', { count: 'exact' }).limit(10000);
      out.totalSources = count || (sources || []).length;
      for (const s of sources || []) {
        out.totalChunks += s.chunks_indexed || 0;
        out.byType[s.type || 'unknown'] = (out.byType[s.type || 'unknown'] || 0) + 1;
        if (s.difficulty) out.difficultyBreakdown[s.difficulty] = (out.difficultyBreakdown[s.difficulty] || 0) + 1;
      }
    } catch (e) { /* ignore */ }
    try {
      const { count } = await supabase.from('source_analysis').select('id', { count: 'exact', head: true });
      out.analyzedCount = count || 0;
    } catch (e) { /* ignore */ }
    out.analysisRate = out.totalSources ? Math.round((out.analyzedCount / out.totalSources) * 100) : 0;
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /admin/mood — mood aggregate stats (?days=30).
router.get('/mood', async (req, res) => {
  try {
    const days = Math.min(90, Math.max(1, parseInt(req.query.days, 10) || 30));
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const out = { checkins: 0, distribution: {}, avgEnergy: null, avgFocus: null, avgStress: null, trend: 'unknown' };
    try {
      const { data } = await supabase.from('mood_checkins')
        .select('mood,energy_level,focus_level,stress_level,created_at')
        .gte('created_at', since).order('created_at', { ascending: true }).limit(5000);
      const rows = data || [];
      out.checkins = rows.length;
      let e = 0, f = 0, s = 0, n = 0;
      for (const r of rows) {
        out.distribution[r.mood] = (out.distribution[r.mood] || 0) + 1;
        if (r.energy_level != null) { e += r.energy_level; n += 1; }
        if (r.focus_level != null) f += r.focus_level;
        if (r.stress_level != null) s += r.stress_level;
      }
      if (n) {
        out.avgEnergy = Math.round((e / n) * 10) / 10;
        out.avgFocus = Math.round((f / n) * 10) / 10;
        out.avgStress = Math.round((s / n) * 10) / 10;
      }
      if (rows.length >= 4) {
        const score = { energized: 2, focused: 1, neutral: 0, tired: -1, stressed: -2, anxious: -2 };
        const half = Math.floor(rows.length / 2);
        const avg = (arr) => arr.reduce((a, r) => a + (score[r.mood] ?? 0), 0) / arr.length;
        const d = avg(rows.slice(half)) - avg(rows.slice(0, half));
        out.trend = d > 0.3 ? 'improving' : d < -0.3 ? 'worsening' : 'stable';
      }
    } catch (e) { /* ignore */ }
    res.json({ days, ...out });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
