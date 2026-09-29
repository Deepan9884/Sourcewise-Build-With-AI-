/**
 * MultiSubjectPlanner — constraint-based interleaved scheduler for N subjects.
 * Priority = f(days until exam, mastery gap, exam weight, difficulty).
 * Mood-aware load adjustments + calendar-aware free windows + buffers.
 */
const calendarService = require('./calendarService');
const moodService = require('./moodService');

const SUBJECT_COLORS = ['#E8845F', '#0D9488', '#7C3AED', '#D97706', '#2563EB', '#DB2777', '#059669', '#EA580C'];

function daysUntil(dateStr, from = new Date()) {
  if (!dateStr) return 30;
  const diff = new Date(`${dateStr}T00:00:00Z`).getTime() - new Date(from.toISOString().slice(0, 10)).getTime();
  return Math.max(0, Math.round(diff / (24 * 3600 * 1000)));
}

function computePriority(subject) {
  const d = daysUntil(subject.exam_date);
  const urgency = d <= 0 ? 5 : d <= 3 ? 4 : d <= 7 ? 3 : d <= 14 ? 2 : 1;
  const gap = Math.max(0, (subject.target_mastery ?? 80) - (subject.current_mastery ?? 0)) / 20; // 0..5
  const weight = Math.min(3, Math.max(0.5, subject.exam_weight ?? 1));
  const diffBoost = subject.difficulty_estimate === 'hard' ? 1.2 : subject.difficulty_estimate === 'easy' ? 0.85 : 1.0;
  const score = (urgency * 0.45 + gap * 0.3 + weight * 0.25) * diffBoost;
  return Number(score.toFixed(2));
}

function enumerateDates(start, end) {
  const out = [];
  const cur = new Date(`${start}T00:00:00Z`);
  const stop = new Date(`${end}T00:00:00Z`);
  while (cur <= stop) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out.slice(0, 60); // cap 60 days
}

function toMinutes(t) {
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + m;
}
function toHHMM(mins) {
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

/**
 * Generate full schedule.
 * input: { subjects: [{subject_name, exam_date, exam_weight, current_mastery, target_mastery, difficulty_estimate, source_ids?}],
 *          exam_period_start, exam_period_end, daily_budget_minutes, preferred_start_time, preferred_end_time,
 *          break_preferences, calendarEvents, moodAdjustments, generated_by }
 */
async function generateSchedule(input) {
  const subjects = (input.subjects || []).map((s, i) => ({
    ...s,
    priority_score: computePriority(s),
    color: s.color || SUBJECT_COLORS[i % SUBJECT_COLORS.length],
  })).sort((a, b) => b.priority_score - a.priority_score);

  if (!subjects.length) throw new Error('At least one subject is required');

  const totalPriority = subjects.reduce((s, x) => s + x.priority_score, 0) || 1;
  const start = input.exam_period_start || new Date().toISOString().slice(0, 10);
  const fallbackEnd = new Date(Date.now() + 13 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const latestExam = subjects.map((s) => s.exam_date).filter(Boolean).sort().pop();
  const end = input.exam_period_end || latestExam || fallbackEnd;
  const dates = enumerateDates(start, end);

  const dailyBudget = Math.min(480, Math.max(30, input.daily_budget_minutes || 120));
  const dayStart = input.preferred_start_time || '09:00';
  const dayEnd = input.preferred_end_time || '21:00';
  const moodAdj = input.moodAdjustments || { loadMultiplier: 1.0, preferDifficulty: 'medium', breakMinutes: 10 };
  const effectiveBudget = Math.round(dailyBudget * (moodAdj.loadMultiplier || 1));

  const eventsByDate = {};
  for (const ev of input.calendarEvents || []) {
    const d = new Date(ev.start_time).toISOString().slice(0, 10);
    (eventsByDate[d] = eventsByDate[d] || []).push(ev);
  }

  const sideExams = input.sideExams || [];
  const slots = [];
  let subjectCursor = 0;
  for (const date of dates) {
    const booked = eventsByDate[date] || [];
    // Skip if exam day for a subject → light review only
    const examToday = subjects.filter((s) => s.exam_date === date);
    const activeSideExam = sideExams.find((se) => se.date === date);
    const upcomingSideExam = !activeSideExam ? sideExams.find((se) => {
      const diff = daysUntil(se.date, new Date(date));
      return diff > 0 && diff <= 2;
    }) : null;
    const sideExamInfo = activeSideExam
      ? { isToday: true, name: activeSideExam.name, type: activeSideExam.type || 'Side Exam' }
      : upcomingSideExam
        ? { isPrep: true, name: upcomingSideExam.name, type: upcomingSideExam.type || 'Side Exam' }
        : null;

    const windows = calendarService.getAvailableWindows(booked, date, { dayStart, dayEnd, minSlotMinutes: 30 });
    let remaining = examToday.length || activeSideExam ? Math.min(60, effectiveBudget) : effectiveBudget;
    let cursor = null;

    // Flatten windows into a cursor walk
    const flatWindows = windows.map((w) => ({ start: toMinutes(w.start), end: toMinutes(w.end) }));
    let wi = 0;
    if (!flatWindows.length) continue;
    cursor = flatWindows[0].start;

    const advanceCursor = (mins) => {
      cursor += mins;
      while (wi < flatWindows.length && cursor >= flatWindows[wi].end) {
        wi += 1;
        if (wi < flatWindows.length) cursor = Math.max(cursor, flatWindows[wi].start);
      }
      return wi < flatWindows.length;
    };

    let guard = 0;
    while (remaining >= 30 && wi < flatWindows.length && guard < 20) {
      guard += 1;
      // Round-robin by priority (weighted): pick next subject with remaining need
      const subject = subjects[subjectCursor % subjects.length];
      subjectCursor += 1;
      // Skip subjects whose exam already passed
      if (subject.exam_date && subject.exam_date < date) continue;

      const share = subject.priority_score / totalPriority;
      let want = Math.max(30, Math.min(90, Math.round(effectiveBudget * share)));
      want = Math.min(want, remaining);
      const winLeft = flatWindows[wi].end - cursor;
      const dur = Math.min(want, winLeft, remaining);
      if (dur < 30) { // move to next window
        wi += 1;
        if (wi < flatWindows.length) cursor = flatWindows[wi].start;
        continue;
      }
      const startHHMM = toHHMM(cursor);
      const endHHMM = toHHMM(cursor + dur);
      const activity = pickActivity(subject, moodAdj, slots.length, sideExamInfo);
      slots.push({
        date,
        start_time: startHHMM,
        end_time: endHHMM,
        duration_minutes: dur,
        slot_type: activity.slot_type,
        topic: activity.topic,
        activity_type: activity.activity_type,
        status: 'pending',
        mood_context: { expected_load: moodAdj.loadMultiplier, prefer_difficulty: moodAdj.preferDifficulty },
        is_fixed: false,
        generated_by: input.generated_by || 'ai_initial',
        _subject_name: subject.subject_name,
        _subject_color: subject.color,
        _priority: subject.priority_score,
      });
      remaining -= dur;
      // short break buffer
      const breakMin = Math.min(moodAdj.breakMinutes || 10, remaining, 15);
      if (breakMin >= 5 && remaining - breakMin >= 0) {
        const bStart = toHHMM(cursor + dur);
        const bEnd = toHHMM(cursor + dur + breakMin);
        if (cursor + dur + breakMin <= flatWindows[wi].end) {
          slots.push({
            date, start_time: bStart, end_time: bEnd, duration_minutes: breakMin,
            slot_type: 'break', topic: 'Break', activity_type: null, status: 'pending',
            mood_context: {}, is_fixed: false, generated_by: input.generated_by || 'ai_initial',
            _subject_name: subject.subject_name, _subject_color: subject.color, _priority: 0,
          });
          remaining -= breakMin;
        }
      }
      if (!advanceCursor(dur + (breakMin >= 5 ? breakMin : 0))) break;
    }
  }
  return { subjects, slots, meta: { start, end, dailyBudget, effectiveBudget, totalSlots: slots.length } };
}

function pickActivity(subject, moodAdj, idx, sideExamInfo = null) {
  if (sideExamInfo?.isToday) {
    return { slot_type: 'quiz', activity_type: 'quiz', topic: `📝 Exam Milestone: ${sideExamInfo.name} (${subject.subject_name})` };
  }
  if (sideExamInfo?.isPrep) {
    return { slot_type: 'review', activity_type: 'practice', topic: `⚡ Targeted Prep: ${sideExamInfo.name} (${subject.subject_name})` };
  }
  // Alternate study/review/quiz for spacing; mood tired → flashcards/review
  const cycle = idx % 4;
  if ((moodAdj.preferDifficulty || 'medium') === 'easy') {
    return cycle === 2
      ? { slot_type: 'quiz', activity_type: 'quiz', topic: `Quick recall: ${subject.subject_name}` }
      : { slot_type: 'review', activity_type: 'flashcards', topic: `Review: ${subject.subject_name}` };
  }
  if (cycle === 0) return { slot_type: 'study', activity_type: 'read', topic: `Study: ${subject.subject_name}` };
  if (cycle === 1) return { slot_type: 'study', activity_type: 'practice', topic: `Practice: ${subject.subject_name}` };
  if (cycle === 2) return { slot_type: 'quiz', activity_type: 'quiz', topic: `Quiz: ${subject.subject_name}` };
  return { slot_type: 'review', activity_type: 'summarize', topic: `Review: ${subject.subject_name}` };
}

/** Incremental replan: drop future pending slots from a date, regenerate with new constraints. */
async function replanSchedule({ existingSlots, subjects, fromDate, calendarEvents, moodAdjustments, constraints = {} }) {
  const kept = (existingSlots || []).filter((s) => s.date < fromDate || ['completed', 'in_progress'].includes(s.status));
  const futurePending = (existingSlots || []).filter((s) => s.date >= fromDate && !['completed'].includes(s.status));
  const gen = await generateSchedule({
    subjects,
    exam_period_start: fromDate,
    exam_period_end: constraints.exam_period_end,
    daily_budget_minutes: constraints.daily_budget_minutes || 120,
    preferred_start_time: constraints.preferred_start_time,
    preferred_end_time: constraints.preferred_end_time,
    break_preferences: constraints.break_preferences,
    calendarEvents,
    moodAdjustments,
    generated_by: 'ai_replan',
  });
  return { kept, regenerated: gen.slots, droppedCount: futurePending.length, subjects: gen.subjects, meta: gen.meta };
}

module.exports = { computePriority, generateSchedule, replanSchedule, daysUntil, SUBJECT_COLORS, getMoodAdjustments: async (userId) => {
  try {
    const state = await moodService.getCurrentMoodState(userId);
    return state.recommendedAdjustments;
  } catch (e) {
    return { loadMultiplier: 1.0, preferDifficulty: 'medium', breakMinutes: 10 };
  }
} };
