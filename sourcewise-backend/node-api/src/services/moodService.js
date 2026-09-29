/**
 * MoodService — hybrid mood tracking (manual check-ins + passive inference).
 * All functions defensive: missing tables resolve to safe defaults.
 */
const supabase = require('../utils/supabase');

const VALID_MOODS = ['energized', 'focused', 'neutral', 'tired', 'stressed', 'anxious'];

function clamp1to10(n, fallback = 5) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(10, Math.max(1, Math.round(v)));
}

async function recordCheckin(userId, { mood, energy_level, focus_level, stress_level, source = 'manual', inferred_signals = {}, context_tags = [], notes = null } = {}) {
  if (!VALID_MOODS.includes(mood)) {
    throw new Error(`Invalid mood. Must be one of: ${VALID_MOODS.join(', ')}`);
  }
  const row = {
    user_id: userId,
    mood,
    energy_level: clamp1to10(energy_level),
    focus_level: clamp1to10(focus_level),
    stress_level: clamp1to10(stress_level),
    source,
    inferred_signals: inferred_signals || {},
    context_tags: context_tags || [],
    notes,
  };
  try {
    const { data, error } = await supabase.from('mood_checkins').insert(row).select().single();
    if (error) throw error;
    return data;
  } catch (e) {
    if (e.message && /relation .* does not exist|table .* not found/i.test(e.message)) {
      return { ...row, id: `local-${Date.now()}`, created_at: new Date().toISOString(), _fallback: true };
    }
    throw e;
  }
}

async function getRecentMoods(userId, hours = 24, limit = 50) {
  try {
    const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
    const { data, error } = await supabase
      .from('mood_checkins')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  } catch (e) {
    return [];
  }
}

/**
 * Passive inference from behavior signals.
 * signals: { avgQuizScore, sessionCompletionRatio, pausesPerHour, streakBroken, hourOfDay, recentScores[] }
 * Returns { mood, confidence, reasons[] }
 */
function inferMoodFromBehavior(signals = {}) {
  const scores = { energized: 0, focused: 0, neutral: 0, tired: 0, stressed: 0, anxious: 0 };
  const reasons = [];

  const { avgQuizScore, sessionCompletionRatio, pausesPerHour, streakBroken, hourOfDay, recentScores = [] } = signals;

  if (avgQuizScore != null) {
    if (avgQuizScore < 50) { scores.stressed += 0.3; scores.anxious += 0.15; reasons.push(`low quiz avg ${avgQuizScore}%`); }
    else if (avgQuizScore >= 85) { scores.energized += 0.2; scores.focused += 0.1; reasons.push(`high quiz avg ${avgQuizScore}%`); }
  }
  if (sessionCompletionRatio != null) {
    if (sessionCompletionRatio < 0.5) { scores.tired += 0.2; reasons.push(`sessions cut short (${Math.round(sessionCompletionRatio * 100)}%)`); }
    else if (sessionCompletionRatio >= 0.9) { scores.focused += 0.15; reasons.push('sessions completed fully'); }
  }
  if (pausesPerHour != null && pausesPerHour > 3) { scores.tired += 0.1; scores.stressed += 0.05; reasons.push(`${pausesPerHour}/hr pauses`); }
  if (streakBroken) { scores.stressed += 0.1; scores.tired += 0.05; reasons.push('streak broken'); }
  if (hourOfDay != null && (hourOfDay >= 23 || hourOfDay < 6)) { scores.tired += 0.1; reasons.push('late-night activity'); }
  if (recentScores.length >= 3) {
    const declining = recentScores[recentScores.length - 1] < recentScores[0] - 15;
    if (declining) { scores.anxious += 0.15; reasons.push('scores declining'); }
  }

  scores.neutral += 0.05; // prior
  let best = 'neutral';
  let bestScore = -1;
  for (const [m, s] of Object.entries(scores)) {
    if (s > bestScore) { bestScore = s; best = m; }
  }
  const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
  const confidence = Math.min(0.95, Math.max(0.1, bestScore / total + 0.2));
  return { mood: best, confidence: Number(confidence.toFixed(2)), reasons };
}

async function getCurrentMoodState(userId) {
  const recent = await getRecentMoods(userId, 48, 10);
  if (!recent.length) {
    return { dominantMood: 'neutral', trend: 'unknown', confidence: 0.2, lastCheckin: null, recommendedAdjustments: defaultAdjustments('neutral') };
  }
  const counts = {};
  for (const r of recent) counts[r.mood] = (counts[r.mood] || 0) + 1;
  const dominantMood = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];

  // Trend: compare newest half vs oldest half
  const half = Math.max(1, Math.floor(recent.length / 2));
  const newest = recent.slice(0, half).map((r) => r.mood);
  const oldest = recent.slice(half).map((r) => r.mood);
  const neg = new Set(['tired', 'stressed', 'anxious']);
  const negNew = newest.filter((m) => neg.has(m)).length / Math.max(newest.length, 1);
  const negOld = oldest.filter((m) => neg.has(m)).length / Math.max(oldest.length, 1);
  let trend = 'stable';
  if (negNew > negOld + 0.3) trend = 'worsening';
  else if (negNew < negOld - 0.3) trend = 'improving';

  return {
    dominantMood,
    trend,
    confidence: recent[0].source === 'manual' ? 0.85 : 0.6,
    lastCheckin: recent[0],
    recentCount: recent.length,
    recommendedAdjustments: defaultAdjustments(dominantMood),
  };
}

function defaultAdjustments(mood) {
  const map = {
    energized: { loadMultiplier: 1.2, preferDifficulty: 'hard', breakMinutes: 5, note: 'Ride the wave — schedule hard topics now.' },
    focused: { loadMultiplier: 1.0, preferDifficulty: 'medium', breakMinutes: 10, note: 'Steady pace. Good time for deep work.' },
    neutral: { loadMultiplier: 1.0, preferDifficulty: 'medium', breakMinutes: 10, note: 'Balanced schedule.' },
    tired: { loadMultiplier: 0.6, preferDifficulty: 'easy', breakMinutes: 15, note: 'Light load: flashcards, review, short sessions.' },
    stressed: { loadMultiplier: 0.5, preferDifficulty: 'easy', breakMinutes: 15, note: 'Reduce load. One small win at a time.' },
    anxious: { loadMultiplier: 0.6, preferDifficulty: 'easy', breakMinutes: 15, note: 'Clear roadmap, chunked tasks, reassurance.' },
  };
  return map[mood] || map.neutral;
}

async function correlateMoodWithPerformance(userId, days = 14) {
  try {
    const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
    const [{ data: moods }, { data: attempts }] = await Promise.all([
      supabase.from('mood_checkins').select('mood, created_at').eq('user_id', userId).gte('created_at', since).order('created_at', { ascending: true }),
      supabase.from('practice_attempts').select('correct, score, created_at').eq('user_id', userId).gte('created_at', since),
    ]);
    const byMood = {};
    for (const m of moods || []) {
      const day = new Date(m.created_at).toDateString();
      const dayAttempts = (attempts || []).filter((a) => new Date(a.created_at).toDateString() === day);
      if (!dayAttempts.length) continue;
      const acc = dayAttempts.filter((a) => a.correct).length / dayAttempts.length;
      byMood[m.mood] = byMood[m.mood] || { days: 0, totalAcc: 0 };
      byMood[m.mood].days += 1;
      byMood[m.mood].totalAcc += acc;
    }
    const correlation = Object.entries(byMood).map(([mood, v]) => ({
      mood, days: v.days, avgAccuracy: Math.round((v.totalAcc / Math.max(v.days, 1)) * 100),
    })).sort((a, b) => b.avgAccuracy - a.avgAccuracy);
    return { correlation, bestMood: correlation[0]?.mood || null, worstMood: correlation[correlation.length - 1]?.mood || null };
  } catch (e) {
    return { correlation: [], bestMood: null, worstMood: null };
  }
}

module.exports = {
  VALID_MOODS,
  recordCheckin,
  getRecentMoods,
  inferMoodFromBehavior,
  getCurrentMoodState,
  defaultAdjustments,
  correlateMoodWithPerformance,
};
