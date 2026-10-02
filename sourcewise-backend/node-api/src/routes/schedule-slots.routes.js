/**
 * Schedule Slots Routes — granular timetable management.
 * PATCH /schedule/:id | POST /schedule/:id/complete
 * POST /schedule/:id/reschedule | GET /schedule/day/:date?plan_id=
 */
const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');
const { authenticate } = require('../middleware/auth');
const { requireSlotOwner } = require('../middleware/validatePlanAccess');

const demoService = require('../services/demoAccountService');

router.use(authenticate);

function userIdOf(req) {
  return req.user.userId || req.user.id || req.user._id;
}

router.patch('/:id', requireSlotOwner(), async (req, res) => {
  try {
    if (demoService.isDemoUser(req)) {
      const slot = demoService.completeSlot(req.params.id);
      return res.json(slot || { id: req.params.id, status: req.body?.status || 'completed' });
    }
    const allowed = ['status', 'topic', 'activity_type', 'completion_data', 'mood_context'];
    const patch = {};
    for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];
    patch.updated_at = new Date().toISOString();
    const { data, error } = await supabase.from('schedule_slots').update(patch).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/complete', requireSlotOwner(), async (req, res) => {
  try {
    if (demoService.isDemoUser(req)) {
      const slot = demoService.completeSlot(req.params.id);
      return res.json(slot || { id: req.params.id, status: 'completed' });
    }
    const { actualDuration, score, notes, moodAfter } = req.body || {};
    const patch = {
      status: 'completed',
      completion_data: { actualDuration: actualDuration ?? null, score: score ?? null, notes: notes || null, completedAt: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    };
    const { data: slot, error } = await supabase.from('schedule_slots').update(patch).eq('id', req.params.id).select().single();
    if (error) throw error;
    // Track progress event (best effort)
    try {
      const { data: full } = await supabase.from('schedule_slots').select('plan_id, subject_id, topic, mood_context').eq('id', req.params.id).single();
      const { data: plan } = await supabase.from('study_plans').select('user_id').eq('id', full.plan_id).single();
      await supabase.from('progress_events').insert({
        user_id: plan.user_id, event_type: 'task_completed', concept: full.topic,
        score: score ?? null, duration_minutes: actualDuration ?? null,
        mood_after: moodAfter || null, metadata: { slot_id: req.params.id, plan_id: full.plan_id },
      });
    } catch (e) { /* ignore */ }
    res.json(slot);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/reschedule', requireSlotOwner(), async (req, res) => {
  try {
    const { newDate, newStartTime, newEndTime, reason } = req.body || {};
    if (!newDate) return res.status(400).json({ error: 'newDate is required (YYYY-MM-DD)' });
    const patch = { date: newDate, status: 'rescheduled', updated_at: new Date().toISOString() };
    if (newStartTime) patch.start_time = newStartTime;
    if (newEndTime) patch.end_time = newEndTime;
    const { data, error } = await supabase.from('schedule_slots').update(patch).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ ...data, rescheduleReason: reason || null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/day/:date', async (req, res) => {
  try {
    const userId = userIdOf(req);
    const { plan_id } = req.query;
    let q = supabase.from('schedule_slots').select('*, plan_subjects!inner(subject_name, color), study_plans!inner(user_id)')
      .eq('date', req.params.date).order('start_time', { ascending: true }).limit(200);
    // Filter by user's plans: use plan_id if given, else all user plans
    if (plan_id) q = q.eq('plan_id', plan_id);
    const { data, error } = await q;
    if (error) throw error;
    const mine = (data || []).filter((s) => !plan_id || s.study_plans?.user_id === userId);
    res.json(mine);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
