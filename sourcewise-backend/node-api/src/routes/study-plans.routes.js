/**
 * Study Plans Routes — multi-subject plans with AI generation + replanning.
 * Keeps legacy /planner routes untouched for backward compatibility.
 */
const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');
const { authenticate } = require('../middleware/auth');
const { requirePlanOwner } = require('../middleware/validatePlanAccess');
const planner = require('../services/multiSubjectPlanner');
const replanning = require('../services/replanningService');
const calendarService = require('../services/calendarService');
const moodService = require('../services/moodService');
const pacing = require('../services/pacingService');

router.use(authenticate);

function userIdOf(req) {
  return req.user.userId || req.user.id || req.user._id;
}

// POST /study-plans — create plan shell + subjects
router.post('/', async (req, res) => {
  try {
    const userId = userIdOf(req);
    const { name, exam_period_start, exam_period_end, daily_study_budget_minutes, preferred_start_time, preferred_end_time, break_preferences, subjects = [] } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    if (!subjects.length) return res.status(400).json({ error: 'At least one subject is required' });

    const planData = {
      ...(req.body.plan_data || {}),
      side_exams: req.body.side_exams || req.body.plan_data?.side_exams || [],
    };

    const { data: plan, error } = await supabase.from('study_plans').insert({
      user_id: userId, name, exam_period_start: exam_period_start || null,
      exam_period_end: exam_period_end || null,
      daily_study_budget_minutes: daily_study_budget_minutes || 120,
      preferred_start_time: preferred_start_time || '09:00',
      preferred_end_time: preferred_end_time || '21:00',
      break_preferences: break_preferences || {},
      status: 'active', plan_data: planData, generation_context: {},
    }).select().single();
    if (error) throw error;

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const subjectRows = subjects.map((s, i) => ({
      plan_id: plan.id,
      subject_name: s.subject_name || s.name,
      exam_date: s.exam_date || null,
      exam_weight: s.exam_weight ?? 1.0,
      current_mastery: s.current_mastery ?? 0,
      target_mastery: s.target_mastery ?? 80,
      source_ids: (s.source_ids || []).filter((id) => typeof id === 'string' && UUID_REGEX.test(id)),
      difficulty_estimate: s.difficulty_estimate || 'medium',
      priority_score: 1.0,
      color: s.color || planner.SUBJECT_COLORS[i % planner.SUBJECT_COLORS.length],
    }));
    const { data: createdSubjects, error: subjErr } = await supabase.from('plan_subjects').insert(subjectRows).select();
    if (subjErr) throw subjErr;

    res.status(201).json({ ...plan, subjects: createdSubjects });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const demoService = require('../services/demoAccountService');

// GET /study-plans — list
router.get('/', async (req, res) => {
  try {
    if (demoService.isDemoUser(req)) {
      return res.json(demoService.getPlans());
    }
    const userId = userIdOf(req);
    const { data, error } = await supabase.from('study_plans').select('*')
      .eq('user_id', userId).order('created_at', { ascending: false });
    if (error) {
      if (/schema cache|relation .* does not exist|not found/i.test(error.message)) {
        // Graceful fallback to legacy planners table
        const { data: legacy } = await supabase.from('planners').select('*')
          .eq('user_id', userId).order('created_at', { ascending: false });
        const mapped = (legacy || []).map((p) => ({
          id: p.id,
          name: p.title || p.subject || 'Study Plan',
          exam_period_start: p.created_at,
          exam_period_end: p.exam_date,
          status: p.status || 'active',
          completedSlots: 0,
          expectedSlots: 0,
          pacePct: 100,
          deviationDays: 0,
          onTrack: true,
          subjects: [{ subject_name: p.subject || 'General' }],
          _legacy: true,
        }));
        return res.json(mapped);
      }
      throw error;
    }
    res.json(data || []);
  } catch (error) {
    if (/schema cache|relation .* does not exist|not found/i.test(error.message)) {
      return res.json([]);
    }
    res.status(500).json({ error: error.message });
  }
});

// GET /study-plans/:id — full plan + subjects + upcoming slots
router.get('/:id', requirePlanOwner(), async (req, res) => {
  try {
    if (demoService.isDemoUser(req)) {
      return res.json(demoService.getPlanById(req.params.id));
    }
    const { data: plan } = await supabase.from('study_plans').select('*').eq('id', req.planId).single();
    const { data: subjects } = await supabase.from('plan_subjects').select('*').eq('plan_id', req.planId);
    const today = new Date().toISOString().slice(0, 10);
    const { data: upcoming } = await supabase.from('schedule_slots').select('*')
      .eq('plan_id', req.planId).gte('date', today).order('date', { ascending: true }).order('start_time', { ascending: true }).limit(200);
    res.json({ ...plan, subjects: subjects || [], upcomingSlots: upcoming || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /study-plans/:id
router.patch('/:id', requirePlanOwner(), async (req, res) => {
  try {
    const allowed = ['name', 'exam_period_start', 'exam_period_end', 'daily_study_budget_minutes', 'preferred_start_time', 'preferred_end_time', 'break_preferences', 'status'];
    const patch = {};
    for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];
    patch.updated_at = new Date().toISOString();
    const { data, error } = await supabase.from('study_plans').update(patch).eq('id', req.planId).select().single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /study-plans/:id
router.delete('/:id', requirePlanOwner(), async (req, res) => {
  try {
    await supabase.from('study_plans').delete().eq('id', req.planId);
    res.json({ message: 'Study plan deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /study-plans/:id/generate — build schedule for N subjects
router.post('/:id/generate', requirePlanOwner(), async (req, res) => {
  try {
    const { data: plan } = await supabase.from('study_plans').select('*').eq('id', req.planId).single();
    const { data: subjects } = await supabase.from('plan_subjects').select('*').eq('plan_id', req.planId);
    if (!subjects?.length) return res.status(400).json({ error: 'Plan has no subjects' });

    const today = new Date().toISOString().slice(0, 10);
    let events = [];
    try {
      events = await calendarService.getEvents(plan.user_id, { from: new Date().toISOString() });
    } catch (e) { events = []; }
    const moodAdj = await planner.getMoodAdjustments(plan.user_id);

    const sideExams = plan.plan_data?.side_exams || [];
    const gen = await planner.generateSchedule({
      subjects,
      sideExams,
      exam_period_start: plan.exam_period_start || today,
      exam_period_end: plan.exam_period_end || subjects.map((s) => s.exam_date).filter(Boolean).sort().pop(),
      daily_budget_minutes: plan.daily_study_budget_minutes,
      preferred_start_time: plan.preferred_start_time,
      preferred_end_time: plan.preferred_end_time,
      break_preferences: plan.break_preferences,
      calendarEvents: events,
      moodAdjustments: moodAdj,
      generated_by: 'ai_initial',
    });

    // Build rows first — never wipe pending slots unless we have replacements.
    const subjectByName = Object.fromEntries(subjects.map((s) => [s.subject_name, s.id]));
    const rows = gen.slots.map((s) => ({
      plan_id: req.planId,
      subject_id: subjectByName[s._subject_name],
      date: s.date, start_time: s.start_time, end_time: s.end_time,
      duration_minutes: s.duration_minutes, slot_type: s.slot_type, topic: s.topic,
      activity_type: s.activity_type, status: 'pending', mood_context: s.mood_context || {},
      is_fixed: false, generated_by: 'ai_initial',
    })).filter((r) => r.subject_id);
    if (!rows.length) {
      const examDates = subjects.map((s) => s.exam_date).filter(Boolean);
      const allPast = examDates.length && examDates.every((d) => d < today);
      return res.status(400).json({
        error: allPast
          ? 'All subject exam dates are in the past — update them to future dates, then generate again.'
          : 'No free study windows found — your calendar blocks every day in this period, or the exam window is empty. Free up time or extend the exam period, then try again.',
      });
    }
    // Replace pending slots
    await supabase.from('schedule_slots').delete().eq('plan_id', req.planId).eq('status', 'pending');
    for (let i = 0; i < rows.length; i += 100) {
      await supabase.from('schedule_slots').insert(rows.slice(i, i + 100));
    }
    // Update priority scores
    for (const s of gen.subjects) {
      const id = subjectByName[s.subject_name];
      if (id) await supabase.from('plan_subjects').update({ priority_score: s.priority_score }).eq('id', id);
    }
    await supabase.from('study_plans').update({
      plan_data: { totalSlots: gen.slots.length, generatedAt: new Date().toISOString() },
      generation_context: { moodAdjustments: moodAdj, subjectCount: subjects.length },
      updated_at: new Date().toISOString(),
    }).eq('id', req.planId);

    res.json({ generated: rows.length, meta: gen.meta, moodAdjustments: moodAdj });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /study-plans/:id/replan — manual or triggered replan
router.post('/:id/replan', requirePlanOwner(), async (req, res) => {
  try {
    const { trigger = 'manual', triggerData = {} } = req.body || {};
    const result = await replanning.executeReplan(req.planId, trigger, triggerData, { userApproved: true });
    // Emit SSE notification (best effort via pg_notify)
    try {
      const { data: plan } = await supabase.from('study_plans').select('user_id').eq('id', req.planId).single();
      await supabase.rpc('notify_replan', { p_user_id: plan.user_id, p_plan_id: req.planId, p_trigger: trigger }).catch(() => {});
    } catch (e) { /* notify function may not exist */ }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /study-plans/:id/schedule?from&to — range of slots
router.get('/:id/schedule', requirePlanOwner(), async (req, res) => {
  try {
    if (demoService.isDemoUser(req)) {
      return res.json(demoService.getSchedule(req.planId, req.query.from, req.query.to));
    }
    let q = supabase.from('schedule_slots').select('*, plan_subjects(subject_name, color, exam_date)')
      .eq('plan_id', req.planId).order('date', { ascending: true }).order('start_time', { ascending: true }).limit(1000);
    if (req.query.from) q = q.gte('date', req.query.from);
    if (req.query.to) q = q.lte('date', req.query.to);
    const { data, error } = await q;
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /study-plans/:id/today — today's slots + mood context
router.get('/:id/today', requirePlanOwner(), async (req, res) => {
  try {
    if (demoService.isDemoUser(req)) {
      return res.json(demoService.getTodaySlots(req.planId));
    }
    const today = new Date().toISOString().slice(0, 10);
    const { data: slots } = await supabase.from('schedule_slots').select('*, plan_subjects(subject_name, color)')
      .eq('plan_id', req.planId).eq('date', today).order('start_time', { ascending: true });
    const moodService = require('../services/moodService');
    const mood = await moodService.getCurrentMoodState(req.studyPlan.user_id);
    res.json({ date: today, slots: slots || [], mood });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /study-plans/:id/replans — history
router.get('/:id/replans', requirePlanOwner(), async (req, res) => {
  try {
    if (demoService.isDemoUser(req)) {
      return res.json(demoService.getReplans(req.planId));
    }
    const { data } = await supabase.from('replan_events').select('*')
      .eq('plan_id', req.planId).order('created_at', { ascending: false }).limit(50);
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /study-plans/:id/pacing — completed-vs-expected, deviation, milestones
router.get('/:id/pacing', requirePlanOwner(), async (req, res) => {
  try {
    if (demoService.isDemoUser(req)) {
      return res.json(demoService.getPacing(req.planId));
    }
    const today = new Date().toISOString().slice(0, 10);
    const [{ data: slots }, { data: subjects }] = await Promise.all([
      supabase.from('schedule_slots').select('id,date,status,duration_minutes,slot_type').eq('plan_id', req.planId),
      supabase.from('plan_subjects').select('subject_name,exam_date').eq('plan_id', req.planId),
    ]);
    res.json({ planId: req.planId, date: today, ...pacing.computePacing(slots || [], subjects || [], today) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /study-plans/:id/subjects/:sid/trend — cumulative completion curve
router.get('/:id/subjects/:sid/trend', requirePlanOwner(), async (req, res) => {
  try {
    const { data: subject } = await supabase.from('plan_subjects')
      .select('id,subject_name,current_mastery,target_mastery').eq('id', req.params.sid).eq('plan_id', req.planId).single();
    if (!subject) return res.status(404).json({ error: 'Subject not found in this plan' });
    const { data: slots } = await supabase.from('schedule_slots')
      .select('date,status,slot_type').eq('subject_id', req.params.sid).order('date', { ascending: true });
    res.json(pacing.computeTrend(slots || [], subject));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /study-plans/:id/adaptive — bounded mood auto-adjust with undo token
router.post('/:id/adaptive', requirePlanOwner(), async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    let moodState = req.body?.moodState || null;
    if (!moodState) {
      try {
        moodState = await moodService.getCurrentMoodState(req.studyPlan.user_id);
      } catch (e) { moodState = null; }
    }
    const raw = moodState?.recommendedAdjustments?.loadMultiplier ?? 1.0;
    const multiplier = pacing.clampMultiplier(raw);
    if (multiplier === 1.0) {
      return res.json({ adjustedSlots: 0, multiplier, reason: 'Mood is balanced — no adjustment needed.' });
    }
    const { data: subjects } = await supabase.from('plan_subjects').select('subject_name,exam_date').eq('plan_id', req.planId);
    if (multiplier < 1.0 && pacing.examImminent(subjects || [], today, 3)) {
      return res.status(409).json({ error: 'Exam-week freeze: an exam falls within 3 days, so load will not auto-shrink. Replan manually if needed.' });
    }
    const { data: slots } = await supabase.from('schedule_slots').select('*').eq('plan_id', req.planId).gte('date', today);
    const undoToken = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const { scaled } = pacing.scaleSlotsForMood(slots || [], multiplier, today, undoToken);
    if (!scaled.length) {
      return res.json({ adjustedSlots: 0, multiplier, reason: 'No eligible future slots to adjust.' });
    }
    // Snapshot PRE-update values from the original rows (scaled holds copies).
    const byId = Object.fromEntries((slots || []).map((s) => [s.id, s]));
    const snapshot = scaled.map((s) => {
      const o = byId[s.id] || {};
      return {
        id: s.id, date: o.date, start_time: o.start_time, end_time: o.end_time,
        duration_minutes: o.duration_minutes, status: o.status, mood_context: o.mood_context || {},
      };
    });
    for (const s of scaled) {
      await supabase.from('schedule_slots').update({
        end_time: s.end_time, duration_minutes: s.duration_minutes, mood_context: s.mood_context,
        updated_at: new Date().toISOString(),
      }).eq('id', s.id);
    }
    await supabase.from('replan_events').insert({
      plan_id: req.planId, trigger_type: 'mood_shift',
      trigger_data: { undoToken, snapshot, mood: moodState?.dominantMood || null, multiplier },
      slots_affected: scaled.length, slots_rescheduled: scaled.length,
      user_approved: false,
    });
    res.json({ adjustedSlots: scaled.length, multiplier, undoToken, mood: moodState?.dominantMood || null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /study-plans/:id/adaptive/undo — restore snapshot from an undo token
router.post('/:id/adaptive/undo', requirePlanOwner(), async (req, res) => {
  try {
    const { undoToken } = req.body || {};
    if (!undoToken) return res.status(400).json({ error: 'undoToken is required' });
    const { data: events } = await supabase.from('replan_events').select('id,trigger_data')
      .eq('plan_id', req.planId).eq('trigger_type', 'mood_shift').order('created_at', { ascending: false }).limit(20);
    const match = (events || []).find((e) => e.trigger_data && e.trigger_data.undoToken === undoToken && !e.trigger_data.undone);
    if (!match) return res.status(404).json({ error: 'Undo token not found or already used' });
    let restored = 0, skipped = 0;
    for (const snap of match.trigger_data.snapshot || []) {
      const { data: current } = await supabase.from('schedule_slots').select('status').eq('id', snap.id).single();
      if (!current || current.status === 'completed') { skipped += 1; continue; }
      await supabase.from('schedule_slots').update({
        end_time: snap.end_time, duration_minutes: snap.duration_minutes,
        mood_context: { ...(snap.mood_context || {}), adaptive: false },
        updated_at: new Date().toISOString(),
      }).eq('id', snap.id);
      restored += 1;
    }
    await supabase.from('replan_events').update({
      trigger_data: { ...match.trigger_data, undone: true, undoneAt: new Date().toISOString() },
    }).eq('id', match.id);
    res.json({ restored, skipped });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
