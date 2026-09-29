/**
 * ReplanningService — evaluate auto-replan triggers and execute incremental replans.
 * Designed to run hourly (pg_cron) and on-demand from routes.
 */
const supabase = require('../utils/supabase');
const moodService = require('./moodService');
const calendarService = require('./calendarService');
const planner = require('./multiSubjectPlanner');

const TRIGGER_COOLDOWN = {
  missed_day: 4, low_score: 12, mood_shift: 24, calendar_conflict: 1,
  exam_date_change: 0, streak_break: 24, mastery_declining: 24,
};

async function getActivePlans(limit = 100) {
  try {
    const { data, error } = await supabase.from('study_plans').select('*').eq('status', 'active').limit(limit);
    if (error) throw error;
    return data || [];
  } catch (e) {
    return [];
  }
}

async function lastTriggerAt(planId, triggerType) {
  try {
    const { data } = await supabase.from('replan_events').select('created_at')
      .eq('plan_id', planId).eq('trigger_type', triggerType)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    return data ? new Date(data.created_at).getTime() : 0;
  } catch (e) {
    return 0;
  }
}

function cooledDown(planId, triggerType) {
  // Returns promise<boolean>
  return lastTriggerAt(planId, triggerType).then((t) => {
    const hours = TRIGGER_COOLDOWN[triggerType] ?? 12;
    return Date.now() - t >= hours * 3600 * 1000;
  });
}

async function getPlanContext(plan) {
  const [subjectsRes, slotsRes] = await Promise.all([
    supabase.from('plan_subjects').select('*').eq('plan_id', plan.id),
    supabase.from('schedule_slots').select('*').eq('plan_id', plan.id).order('date', { ascending: true }).order('start_time', { ascending: true }).limit(2000),
  ]);
  return { subjects: subjectsRes.data || [], slots: slotsRes.data || [] };
}

async function detectTriggers(plan) {
  const triggers = [];
  const today = new Date().toISOString().slice(0, 10);
  const { subjects, slots } = await getPlanContext(plan);

  // 1. missed_day: any past date with all pending/skipped slots
  const byDate = {};
  for (const s of slots) (byDate[s.date] = byDate[s.date] || []).push(s);
  for (const [date, daySlots] of Object.entries(byDate)) {
    if (date < today && daySlots.length && daySlots.every((s) => ['pending', 'skipped'].includes(s.status))) {
      if (await cooledDown(plan.id, 'missed_day')) {
        triggers.push({ type: 'missed_day', data: { date, slots: daySlots.length } });
      }
      break;
    }
  }

  // 2. low_score: last 2 practice attempts < 50
  try {
    const { data: attempts } = await supabase.from('practice_attempts').select('score, correct, created_at')
      .eq('user_id', plan.user_id).order('created_at', { ascending: false }).limit(2);
    if ((attempts || []).length === 2 && attempts.every((a) => (a.score ?? (a.correct ? 100 : 0)) < 50)) {
      if (await cooledDown(plan.id, 'low_score')) triggers.push({ type: 'low_score', data: { attempts: attempts.length } });
    }
  } catch (e) { /* ignore */ }

  // 3. mood_shift: dominant negative mood 2+ days
  try {
    const recent = await moodService.getRecentMoods(plan.user_id, 72, 20);
    const neg = new Set(['tired', 'stressed', 'anxious']);
    const negDays = new Set(recent.filter((r) => neg.has(r.mood)).map((r) => new Date(r.created_at).toDateString()));
    if (negDays.size >= 2 && await cooledDown(plan.id, 'mood_shift')) {
      triggers.push({ type: 'mood_shift', data: { negativeDays: negDays.size } });
    }
  } catch (e) { /* ignore */ }

  // 4. calendar_conflict: next 3 days slots overlap events
  try {
    const from = today;
    const to = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const futureSlots = slots.filter((s) => s.date >= from && s.date <= to && s.slot_type !== 'break' && s.status === 'pending')
      .map((s) => ({ date: s.date, start_time: s.start_time, end_time: s.end_time }));
    const conflicts = await calendarService.getConflicts(plan.user_id, futureSlots);
    if (conflicts.length && await cooledDown(plan.id, 'calendar_conflict')) {
      triggers.push({ type: 'calendar_conflict', data: { conflicts: conflicts.length } });
    }
  } catch (e) { /* ignore */ }

  // 5. streak_break: no progress events in last 48h while plan active
  try {
    const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const { data } = await supabase.from('progress_events').select('id').eq('user_id', plan.user_id).gte('created_at', since).limit(1);
    if ((!data || !data.length) && await cooledDown(plan.id, 'streak_break')) {
      triggers.push({ type: 'streak_break', data: {} });
    }
  } catch (e) { /* ignore */ }

  return { triggers, subjects, slots };
}

async function executeReplan(planId, triggerType, triggerData = {}, { userApproved = false } = {}) {
  const { data: plan, error } = await supabase.from('study_plans').select('*').eq('id', planId).single();
  if (error || !plan) throw new Error('Study plan not found');
  const { subjects, slots } = await getPlanContext(plan);
  const today = new Date().toISOString().slice(0, 10);
  const moodAdj = await planner.getMoodAdjustments(plan.user_id);
  let events = [];
  try {
    events = await calendarService.getEvents(plan.user_id, { from: new Date(`${today}T00:00:00Z`).toISOString() });
  } catch (e) { events = []; }

  const oldSnapshot = { slots: slots.length, subjects: subjects.length };
  const result = await planner.replanSchedule({
    existingSlots: slots, subjects, fromDate: today,
    calendarEvents: events, moodAdjustments: moodAdj,
    constraints: { exam_period_end: plan.exam_period_end, daily_budget_minutes: plan.daily_study_budget_minutes },
  });

  // Delete future pending slots, insert regenerated
  const futureIds = slots.filter((s) => s.date >= today && s.status === 'pending').map((s) => s.id);
  if (futureIds.length) {
    await supabase.from('schedule_slots').delete().in('id', futureIds);
  }
  const subjectByName = Object.fromEntries(subjects.map((s) => [s.subject_name, s.id]));
  const rows = result.regenerated.map((s) => ({
    plan_id: planId,
    subject_id: subjectByName[s._subject_name] || subjects[0]?.id,
    date: s.date, start_time: s.start_time, end_time: s.end_time,
    duration_minutes: s.duration_minutes, slot_type: s.slot_type, topic: s.topic,
    activity_type: s.activity_type, status: 'pending', mood_context: s.mood_context || {},
    is_fixed: false, generated_by: 'ai_replan',
  }));
  let inserted = 0;
  if (rows.length) {
    // insert in chunks
    for (let i = 0; i < rows.length; i += 100) {
      const { error: insErr } = await supabase.from('schedule_slots').insert(rows.slice(i, i + 100));
      if (!insErr) inserted += Math.min(100, rows.length - i);
    }
  }
  const newSnapshot = { slots: result.kept.length + inserted, regenerated: result.regenerated.length };
  let replanRow = null;
  try {
    const { data } = await supabase.from('replan_events').insert({
      plan_id: planId, trigger_type: triggerType, trigger_data: triggerData,
      slots_affected: result.droppedCount, slots_rescheduled: inserted,
      old_plan_snapshot: oldSnapshot, new_plan_snapshot: newSnapshot, user_approved: userApproved,
    }).select().single();
    replanRow = data;
  } catch (e) { /* ignore */ }

  await supabase.from('study_plans').update({ updated_at: new Date().toISOString() }).eq('id', planId);
  return { planId, triggerType, dropped: result.droppedCount, inserted, replan: replanRow };
}

async function evaluateAllPlans() {
  const plans = await getActivePlans();
  const results = [];
  for (const plan of plans) {
    try {
      const { triggers } = await detectTriggers(plan);
      for (const t of triggers) {
        const r = await executeReplan(plan.id, t.type, t.data);
        results.push({ planId: plan.id, userId: plan.user_id, ...r });
      }
    } catch (e) {
      results.push({ planId: plan.id, error: e.message });
    }
  }
  return results;
}

module.exports = { detectTriggers, executeReplan, evaluateAllPlans, TRIGGER_COOLDOWN };
