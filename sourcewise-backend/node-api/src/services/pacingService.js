/**
 * PacingService — pure schedule analytics for the Plan heart.
 * All functions are pure (slots/subjects/today in, numbers out) so they
 * are unit-testable without Supabase. Route files handle I/O.
 */

function isWorkSlot(s) {
  return s && s.slot_type !== 'break';
}

function distinctDates(slots) {
  return new Set(slots.map((s) => s.date).filter(Boolean));
}

/**
 * Pacing: completed-vs-expected slots to date.
 * expected = work slots with date <= today (should be done by now).
 */
function computePacing(slots, subjects = [], today = new Date().toISOString().slice(0, 10)) {
  const work = (slots || []).filter(isWorkSlot);
  const expected = work.filter((s) => s.date && s.date <= today);
  const completedToDate = expected.filter((s) => s.status === 'completed');
  const completedTotal = work.filter((s) => s.status === 'completed').length;

  const pacePct = expected.length
    ? Math.round((completedToDate.length / expected.length) * 100)
    : (completedTotal > 0 ? 100 : 0);

  const days = distinctDates(work).size || 1;
  const slotsPerDay = work.length / days;
  const deviationSlots = completedToDate.length - expected.length;
  const deviationDays = slotsPerDay > 0
    ? Math.round((deviationSlots / slotsPerDay) * 10) / 10
    : 0;

  const milestones = (subjects || [])
    .filter((s) => s.exam_date)
    .map((s) => ({
      label: `${s.subject_name} exam`,
      date: s.exam_date,
      reached: s.exam_date < today,
    }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  return {
    totalSlots: work.length,
    expectedSlots: expected.length,
    completedSlots: completedToDate.length,
    completedTotal,
    pacePct,
    deviationDays,
    onTrack: deviationDays >= 0,
    milestones,
  };
}

/**
 * Subject mastery trend: cumulative completion % per date for one subject.
 * Honest curve derived from slot completions — no invented data.
 */
function computeTrend(slots, subject) {
  const work = (slots || []).filter(isWorkSlot).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const total = work.length;
  let done = 0;
  const byDate = new Map();
  for (const s of work) {
    if (s.status === 'completed') done += 1;
    byDate.set(s.date, total ? Math.round((done / total) * 100) : 0);
  }
  return {
    subjectId: subject?.id || null,
    subjectName: subject?.subject_name || null,
    currentMastery: subject?.current_mastery ?? 0,
    targetMastery: subject?.target_mastery ?? 80,
    points: [...byDate.entries()].map(([date, pct]) => ({ date, pct })),
  };
}

function toMinutes(t) {
  const [h = 0, m = 0, s = 0] = String(t).split(':').map(Number);
  return h * 60 + m + Math.floor(s / 60);
}

function toHHMMSS(mins) {
  const v = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}:00`;
}

function addMinutesToTime(t, mins) {
  return toHHMMSS(toMinutes(t) + mins);
}

/** Clamp mood load multiplier to the ±30% adaptive bound. */
function clampMultiplier(m) {
  if (!Number.isFinite(m)) return 1.0;
  return Math.min(1.3, Math.max(0.7, m));
}

/** True when any subject exam falls within `windowDays` from today (inclusive). */
function examImminent(subjects, today, windowDays = 3) {
  const t = new Date(`${today}T00:00:00Z`).getTime();
  return (subjects || []).some((s) => {
    if (!s.exam_date) return false;
    const d = (new Date(`${s.exam_date}T00:00:00Z`).getTime() - t) / 86400000;
    return d >= 0 && d <= windowDays;
  });
}

/**
 * Bounded adaptive transform for future pending slots.
 * Returns { scaled, skipped } where scaled = [{...slot, start_time, end_time, duration_minutes, mood_context}]
 * Never touches: past slots, completed/in_progress, fixed, breaks.
 */
function scaleSlotsForMood(slots, multiplier, today, undoToken) {
  const scaled = [];
  let skipped = 0;
  for (const s of slots || []) {
    if (!s || s.date < today || s.status !== 'pending' || s.is_fixed || s.slot_type === 'break') {
      skipped += 1;
      continue;
    }
    if (s.mood_context && s.mood_context.adaptive === true) { skipped += 1; continue; }
    const orig = s.duration_minutes || 0;
    const next = Math.max(15, Math.round((orig * multiplier) / 5) * 5);
    if (next === orig) { skipped += 1; continue; }
    const delta = next - orig;
    scaled.push({
      ...s,
      end_time: addMinutesToTime(s.start_time, next),
      duration_minutes: next,
      mood_context: { ...(s.mood_context || {}), adaptive: true, undoToken, multiplier },
      _deltaMinutes: delta,
    });
  }
  return { scaled, skipped };
}

module.exports = {
  computePacing,
  computeTrend,
  addMinutesToTime,
  clampMultiplier,
  examImminent,
  scaleSlotsForMood,
};
