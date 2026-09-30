const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const supabase = require('../utils/supabase');
const axios = require('axios');
const logger = require('../utils/logger');

router.use(authenticate);

const AI_URL = process.env.PYTHON_AI_URL || 'http://localhost:8000';
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || '';
const aiHeaders = () => ({
  'X-Internal-Key': INTERNAL_KEY,
  'Content-Type': 'application/json',
});

const VALID_TYPES = ['word_search', 'match_pairs', 'rapid_fire', 'memory_flip', 'anagram', 'cloze'];

function calcXP(puzzle_type, score, max_score, hints_used) {
  const baseXP = { word_search: 30, match_pairs: 40, rapid_fire: 80, memory_flip: 35, anagram: 20, cloze: 50 };
  const base = baseXP[puzzle_type] || 30;
  const pct = max_score > 0 ? score / max_score : 0;
  const raw = Math.round(base * pct);
  const hintPenalty = (hints_used || 0) * 5;
  return Math.max(0, raw - hintPenalty);
}

// POST /puzzles/generate — proxy to python-ai
router.post('/generate', async (req, res) => {
  const { puzzle_type, source_ids, topic, difficulty, count } = req.body;

  if (!puzzle_type || !VALID_TYPES.includes(puzzle_type)) {
    return res.status(400).json({
      error: `Invalid puzzle_type. Must be one of: ${VALID_TYPES.join(', ')}`,
    });
  }

  try {
    const response = await axios.post(
      `${AI_URL}/puzzles/generate`,
      {
        puzzle_type,
        source_ids: source_ids || [],
        topic: topic || 'key concepts',
        difficulty: difficulty || 'study',
        count: count || 10,
        user_id: req.user._id,
      },
      { headers: aiHeaders(), timeout: 60000 }
    );

    logger.info('puzzles.generate', { puzzle_type, topic, user_id: req.user._id });
    res.json(response.data);
  } catch (err) {
    logger.error('puzzles.generate_failed', { err: err.message, puzzle_type });
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.response?.data?.detail || err.message });
  }
});

// POST /puzzles/verify — proxy to python-ai
router.post('/verify', async (req, res) => {
  try {
    const response = await axios.post(
      `${AI_URL}/puzzles/verify`,
      req.body,
      { headers: aiHeaders(), timeout: 10000 }
    );
    res.json(response.data);
  } catch (err) {
    logger.error('puzzles.verify_failed', { err: err.message });
    res.status(err.response?.status || 500).json({ error: err.message });
  }
});

// POST /puzzles/hint — proxy to python-ai
router.post('/hint', async (req, res) => {
  try {
    const response = await axios.post(
      `${AI_URL}/puzzles/hint`,
      req.body,
      { headers: aiHeaders(), timeout: 10000 }
    );
    res.json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: err.message });
  }
});

// POST /puzzles/complete — record a completed puzzle session
router.post('/complete', async (req, res) => {
  const {
    puzzle_type, source_ids, topic,
    score, max_score, time_seconds, hints_used, completed,
  } = req.body;
  const userId = req.user._id;

  if (!puzzle_type || !VALID_TYPES.includes(puzzle_type)) {
    return res.status(400).json({ error: 'Invalid puzzle_type' });
  }

  const xpEarned = calcXP(puzzle_type, score || 0, max_score || 100, hints_used || 0);

  try {
    // Record puzzle session
    const { data: session, error: sessionErr } = await supabase
      .from('puzzle_sessions')
      .insert({
        user_id: userId,
        puzzle_type,
        source_ids: source_ids || [],
        topic: topic || null,
        score: score || 0,
        max_score: max_score || 100,
        time_seconds: time_seconds || 0,
        hints_used: hints_used || 0,
        completed: completed !== false,
        xp_earned: xpEarned,
      })
      .select()
      .single();

    if (sessionErr) {
      logger.warn('puzzles.session_insert_failed', { err: sessionErr.message });
    }

    // Track progress event
    await supabase.from('progress_events').insert({
      user_id: userId,
      event_type: 'puzzle_complete',
      concept: topic || null,
      score: max_score > 0 ? Math.round((score / max_score) * 100) : 0,
      duration_minutes: time_seconds ? Math.ceil(time_seconds / 60) : 1,
      metadata: { puzzle_type, time_seconds, hints_used, xp_earned: xpEarned },
    }).catch((e) => logger.warn('puzzles.progress_track_failed', { err: e.message }));

    // Update concept mastery if score is good
    if (topic && max_score > 0 && score / max_score >= 0.7) {
      const masteryScore = Math.round((score / max_score) * 100);
      const { data: existing } = await supabase
        .from('concept_mastery')
        .select('*')
        .eq('user_id', userId)
        .eq('concept', topic)
        .single();

      const totalAttempts = (existing?.total_attempts || 0) + 1;
      const correctAttempts = (existing?.correct_attempts || 0) + (score / max_score >= 0.7 ? 1 : 0);
      const newMastery = Math.round((correctAttempts / totalAttempts) * 100);
      let level = 'novice';
      if (newMastery >= 90 && totalAttempts >= 5) level = 'mastery';
      else if (newMastery >= 75 && totalAttempts >= 3) level = 'proficient';
      else if (newMastery >= 50) level = 'developing';

      await supabase.from('concept_mastery').upsert({
        user_id: userId,
        concept: topic,
        mastery_score: newMastery,
        confidence_score: Math.min(100, totalAttempts * 10),
        total_attempts: totalAttempts,
        correct_attempts: correctAttempts,
        last_assessed: new Date().toISOString(),
        level,
      }, { onConflict: 'user_id,concept' })
        .catch((e) => logger.warn('puzzles.mastery_update_failed', { err: e.message }));
    }

    logger.info('puzzles.complete', { puzzle_type, score, max_score, xp_earned: xpEarned, user_id: userId });

    res.json({
      success: true,
      session_id: session?.id || null,
      xp_earned: xpEarned,
      message: `Puzzle complete! +${xpEarned} XP`,
    });
  } catch (err) {
    logger.error('puzzles.complete_failed', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// GET /puzzles/sessions — recent puzzle sessions
router.get('/sessions', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('puzzle_sessions')
      .select('*')
      .eq('user_id', req.user._id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /puzzles/stats — aggregate stats per puzzle type
router.get('/stats', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('puzzle_sessions')
      .select('puzzle_type, score, max_score, completed, xp_earned, created_at')
      .eq('user_id', req.user._id)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      logger.warn('puzzles.stats_query_failed', { err: error.message });
      return res.json({
        total_sessions: 0,
        today_count: 0,
        total_xp: 0,
        favorite_type: null,
        by_type: {},
      });
    }

    const sessions = data || [];
    const today = new Date().toDateString();
    const todayCount = sessions.filter(s => new Date(s.created_at).toDateString() === today).length;
    const totalXP = sessions.reduce((sum, s) => sum + (s.xp_earned || 0), 0);

    const byType = {};
    for (const type of VALID_TYPES) {
      const typeSessions = sessions.filter(s => s.puzzle_type === type);
      const avgScore = typeSessions.length > 0
        ? Math.round(typeSessions.reduce((sum, s) => sum + (s.max_score > 0 ? (s.score / s.max_score) * 100 : 0), 0) / typeSessions.length)
        : 0;
      byType[type] = {
        count: typeSessions.length,
        avg_score: avgScore,
        best_score: typeSessions.length > 0 ? Math.max(...typeSessions.map(s => s.max_score > 0 ? Math.round((s.score / s.max_score) * 100) : 0)) : 0,
      };
    }

    const favoriteType = Object.entries(byType).sort((a, b) => b[1].count - a[1].count)[0]?.[0] || null;

    res.json({
      total_sessions: sessions.length,
      today_count: todayCount,
      total_xp: totalXP,
      favorite_type: favoriteType,
      by_type: byType,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
