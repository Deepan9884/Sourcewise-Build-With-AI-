/**
 * PersonalContextService — aggregates real-time user state (tasks, schedule,
 * plans, subjects, pacing, mood) into an actionable context package for the AI.
 * Also provides task execution capabilities (complete, reschedule, create).
 */
const supabase = require('../utils/supabase');
const moodService = require('./moodService');
const pacingService = require('./pacingService');

/**
 * Gather full personal context for a user.
 * Defensive against missing tables/records so it always resolves safely.
 */
async function getUserPersonalContext(userId) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const next7DaysStr = new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  let userProfile = { id: userId, name: 'Student', email: '', streak: 1 };
  let activePlans = [];
  let subjects = [];
  let todaySlots = [];
  let overdueSlots = [];
  let upcomingSlots = [];
  let latestMood = null;
  let pacingInfo = null;

  // 1. User profile
  try {
    const { data: user } = await supabase
      .from('users')
      .select('id, name, email, streak, credit_tier')
      .eq('id', userId)
      .single();
    if (user) {
      userProfile = {
        id: user.id,
        name: user.name || (user.email ? user.email.split('@')[0] : 'Student'),
        email: user.email || '',
        streak: user.streak || 1,
        tier: user.credit_tier || 'free',
      };
    }
  } catch (err) {
    // continue with defaults
  }

  // 2. Active study plans
  try {
    const { data: plans } = await supabase
      .from('study_plans')
      .select('id, name, exam_period_start, exam_period_end, daily_study_budget_minutes, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    activePlans = plans || [];
  } catch (err) {
    activePlans = [];
  }

  const activePlanIds = activePlans.map((p) => p.id);

  // 3. Subjects under active plans
  if (activePlanIds.length > 0) {
    try {
      const { data: subjs } = await supabase
        .from('plan_subjects')
        .select('id, plan_id, subject_name, exam_date, current_mastery, target_mastery, difficulty_estimate, priority_score, color')
        .in('plan_id', activePlanIds);
      subjects = subjs || [];
    } catch (err) {
      subjects = [];
    }
  }

  const subjectMap = new Map();
  subjects.forEach((s) => subjectMap.set(s.id, s));

  // 4. Schedule slots (Tasks)
  try {
    let query = supabase
      .from('schedule_slots')
      .select('id, plan_id, subject_id, date, start_time, end_time, duration_minutes, slot_type, topic, activity_type, status, completion_data')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (activePlanIds.length > 0) {
      query = query.in('plan_id', activePlanIds);
    }

    const { data: allSlots } = await query;
    const slots = allSlots || [];

    for (const slot of slots) {
      const subj = subjectMap.get(slot.subject_id);
      const enhancedSlot = {
        id: slot.id,
        plan_id: slot.plan_id,
        subject: subj ? subj.subject_name : 'General Study',
        subject_color: subj ? subj.color : '#E8845F',
        topic: slot.topic || 'Focused Study Session',
        date: slot.date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        duration_minutes: slot.duration_minutes || 45,
        slot_type: slot.slot_type || 'study',
        activity_type: slot.activity_type || 'practice',
        status: slot.status || 'pending',
        is_completed: slot.status === 'completed',
        completion_data: slot.completion_data || {},
      };

      if (slot.date === todayStr) {
        todaySlots.push(enhancedSlot);
      } else if (slot.date < todayStr && slot.status !== 'completed') {
        overdueSlots.push(enhancedSlot);
      } else if (slot.date > todayStr && slot.date <= next7DaysStr) {
        upcomingSlots.push(enhancedSlot);
      }
    }
  } catch (err) {
    // schedule slots unavailable
  }

  // 5. Fallback to legacy planners table if no slots found
  if (todaySlots.length === 0 && overdueSlots.length === 0) {
    try {
      const { data: legacyPlanners } = await supabase
        .from('planners')
        .select('id, title, plan_data, target_date, status')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3);

      if (legacyPlanners && legacyPlanners.length > 0) {
        const legacy = legacyPlanners[0];
        const days = Array.isArray(legacy.plan_data?.days) ? legacy.plan_data.days : [];
        days.forEach((day, dIdx) => {
          (day.tasks || []).forEach((t, tIdx) => {
            const taskObj = {
              id: `legacy-${legacy.id}-${dIdx}-${tIdx}`,
              subject: legacy.title || 'Study Plan',
              subject_color: '#E8845F',
              topic: typeof t === 'string' ? t : t.topic || t.title || 'Review',
              date: todayStr,
              start_time: t.time || '10:00',
              end_time: t.endTime || '11:00',
              duration_minutes: t.duration || 45,
              slot_type: 'study',
              activity_type: 'practice',
              status: t.completed ? 'completed' : 'pending',
              is_completed: Boolean(t.completed),
            };
            if (taskObj.is_completed) {
              todaySlots.push(taskObj);
            } else {
              todaySlots.push(taskObj);
            }
          });
        });
      }
    } catch (_) {}
  }

  // 6. Recent mood
  try {
    const moods = await moodService.getRecentMoods(userId, 24, 1);
    if (moods && moods.length > 0) {
      latestMood = {
        mood: moods[0].mood,
        energy_level: moods[0].energy_level,
        focus_level: moods[0].focus_level,
        stress_level: moods[0].stress_level,
      };
    }
  } catch (_) {}

  // 7. Pacing info for active plan
  if (activePlans.length > 0) {
    try {
      pacingInfo = await pacingService.calculatePlanPacing(activePlans[0].id);
    } catch (_) {}
  }

  const pendingToday = todaySlots.filter((s) => s.status !== 'completed');
  const completedToday = todaySlots.filter((s) => s.status === 'completed');

  return {
    user: userProfile,
    today_date: todayStr,
    current_time: now.toTimeString().slice(0, 5),
    day_of_week: now.toLocaleDateString('en-US', { weekday: 'long' }),
    tasks_summary: {
      today_total: todaySlots.length,
      pending_count: pendingToday.length,
      completed_count: completedToday.length,
      overdue_count: overdueSlots.length,
      next_task: pendingToday[0] || null,
    },
    today_tasks: todaySlots,
    pending_tasks: [...pendingToday, ...overdueSlots],
    overdue_tasks: overdueSlots,
    completed_tasks: completedToday,
    upcoming_tasks: upcomingSlots.slice(0, 10),
    active_plans: activePlans,
    subjects: subjects.map((s) => ({
      name: s.subject_name,
      exam_date: s.exam_date,
      mastery: s.current_mastery,
      target_mastery: s.target_mastery,
      color: s.color,
    })),
    pacing: pacingInfo ? {
      pacePct: pacingInfo.pacePct,
      completedMinutes: pacingInfo.completedMinutes,
      expectedMinutes: pacingInfo.expectedMinutes,
      status: pacingInfo.status,
    } : null,
    mood: latestMood,
  };
}

/**
 * Complete a schedule slot task and log progress
 */
async function completeTask(userId, slotId, { actualDuration, score, notes } = {}) {
  const patch = {
    status: 'completed',
    completion_data: {
      actualDuration: actualDuration ?? null,
      score: score ?? null,
      notes: notes || null,
      completedAt: new Date().toISOString(),
    },
    updated_at: new Date().toISOString(),
  };

  const { data: slot, error } = await supabase
    .from('schedule_slots')
    .update(patch)
    .eq('id', slotId)
    .select()
    .single();

  if (error) throw error;

  // Track progress event
  try {
    await supabase.from('progress_events').insert({
      user_id: userId,
      event_type: 'task_completed',
      concept: slot.topic,
      duration_minutes: actualDuration || slot.duration_minutes,
      score: score ?? null,
      metadata: { slot_id: slotId, plan_id: slot.plan_id },
    });
  } catch (_) {}

  return slot;
}

module.exports = {
  getUserPersonalContext,
  completeTask,
};
