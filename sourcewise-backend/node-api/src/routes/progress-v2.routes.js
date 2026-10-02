const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const supabase = require('../utils/supabase');

const demoService = require('../services/demoAccountService');

router.use(authenticate);

// GET /progress/events - Get progress events with filters
router.get('/events', async (req, res) => {
  try {
    const { type, limit = 50, offset = 0 } = req.query;
    if (demoService.isDemoUser(req)) {
      return res.json(demoService.getProgressEvents(parseInt(limit, 10) || 50, parseInt(offset, 10) || 0, type));
    }
    let query = supabase
      .from('progress_events')
      .select('*')
      .eq('user_id', req.user._id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type) query = query.eq('event_type', type);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /progress/track - Track a progress event
router.post('/track', async (req, res) => {
  try {
    const { event_type, concept, source_id, score, duration_minutes, correct, metadata } = req.body;
    const userId = req.user._id;

    if (!event_type) {
      return res.status(400).json({ error: 'event_type is required' });
    }

    const { data, error } = await supabase
      .from('progress_events')
      .insert({
        user_id: userId,
        event_type,
        concept: concept || null,
        source_id: source_id || null,
        score: score || null,
        duration_minutes: duration_minutes || null,
        correct: correct !== undefined ? correct : null,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) throw error;

    // Auto-schedule reviews for quiz/completion events
    if (event_type === 'quiz' && concept && score !== undefined) {
      await autoScheduleReview(userId, concept, score, source_id);
    }

    // Auto-detect knowledge gaps for low scores
    if (score !== undefined && score < 50 && concept) {
      await detectKnowledgeGap(userId, concept, source_id);
    }

    // Update mastery for quiz/practice events
    if (['quiz', 'practice', 'flashcard_review'].includes(event_type) && concept) {
      await updateMasteryFromEvent(userId, concept, correct, score, source_id);
    }

    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper: Auto-schedule review after quiz
async function autoScheduleReview(userId, concept, score, sourceId) {
  try {
    let intervalDays = 1;
    if (score > 90) intervalDays = 7;
    else if (score > 75) intervalDays = 3;
    else intervalDays = 1;

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + intervalDays);

    await supabase.from('review_schedule').upsert({
      user_id: userId,
      concept,
      source_id: sourceId || null,
      mastery_score: score,
      next_review_date: nextReview.toISOString(),
      interval_days: intervalDays,
      last_reviewed: new Date().toISOString(),
      review_count: 1,
    }, { onConflict: 'user_id,concept' });
  } catch (err) {
    console.error('[Progress] Auto-schedule review failed:', err.message);
  }
}

// Helper: Detect knowledge gaps
async function detectKnowledgeGap(userId, concept, sourceId) {
  try {
    const { data: existing } = await supabase
      .from('knowledge_gaps')
      .select('id')
      .eq('user_id', userId)
      .eq('concept', concept)
      .eq('status', 'open')
      .single();

    if (!existing) {
      await supabase.from('knowledge_gaps').insert({
        user_id: userId,
        concept,
        severity: 4,
        source_id: sourceId || null,
      });
    }
  } catch (err) {
    console.error('[Progress] Knowledge gap detection failed:', err.message);
  }
}

// Helper: Update mastery from progress event
async function updateMasteryFromEvent(userId, concept, correct, score, sourceId) {
  try {
    const { data: existing } = await supabase
      .from('concept_mastery')
      .select('*')
      .eq('user_id', userId)
      .eq('concept', concept)
      .single();

    const totalAttempts = (existing?.total_attempts || 0) + 1;
    const correctAttempts = (existing?.correct_attempts || 0) + (correct ? 1 : 0);
    const masteryScore = Math.round((correctAttempts / totalAttempts) * 100);

    let level = 'novice';
    if (masteryScore >= 90 && totalAttempts >= 5) level = 'mastery';
    else if (masteryScore >= 75 && totalAttempts >= 3) level = 'proficient';
    else if (masteryScore >= 50) level = 'developing';

    let intervalDays = 1;
    if (masteryScore > 90) intervalDays = 7;
    else if (masteryScore > 75) intervalDays = 3;

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + intervalDays);

    await supabase.from('concept_mastery').upsert({
      user_id: userId,
      concept,
      source_id: sourceId || existing?.source_id,
      mastery_score: masteryScore,
      confidence_score: Math.min(100, totalAttempts * 10),
      total_attempts: totalAttempts,
      correct_attempts: correctAttempts,
      last_assessed: new Date().toISOString(),
      next_review_date: nextReview.toISOString(),
      interval_days: intervalDays,
      level,
    }, { onConflict: 'user_id,concept' });

    // Resolve knowledge gap if mastery is high enough
    if (masteryScore >= 70) {
      await supabase
        .from('knowledge_gaps')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('concept', concept)
        .eq('status', 'open');
    }
  } catch (err) {
    console.error('[Progress] Mastery update failed:', err.message);
  }
}

// GET /progress/summary - Get progress summary for dashboard
router.get('/summary', async (req, res) => {
  try {
    if (demoService.isDemoUser(req)) {
      return res.json(demoService.getProgressSummary());
    }
    const userId = req.user._id;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [eventsResult, quizResult, tutorResult, sourceResult] = await Promise.all([
      supabase
        .from('progress_events')
        .select('created_at, event_type, score, correct')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false }),
      supabase
        .from('practice_attempts')
        .select('correct, score, created_at')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo),
      supabase
        .from('tutoring_sessions')
        .select('duration_minutes, questions_asked, created_at')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo),
      supabase
        .from('sources')
        .select('id, created_at')
        .eq('user_id', userId),
    ]);

    const events = eventsResult.data || [];
    const quizzes = quizResult.data || [];
    const tutorSessions = tutorResult.data || [];
    const sources = sourceResult.data || [];

    // Calculate streak
    const daysWithActivity = new Set();
    events.forEach(e => daysWithActivity.add(new Date(e.created_at).toDateString()));
    quizzes.forEach(q => daysWithActivity.add(new Date(q.created_at).toDateString()));
    tutorSessions.forEach(t => daysWithActivity.add(new Date(t.created_at).toDateString()));

    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      if (daysWithActivity.has(checkDate.toDateString())) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    // Calculate quiz accuracy
    const totalQuizzes = quizzes.length;
    const correctQuizzes = quizzes.filter(q => q.correct).length;
    const quizAccuracy = totalQuizzes > 0 ? Math.round((correctQuizzes / totalQuizzes) * 100) : 0;

    // Calculate study time
    const totalStudyMinutes = tutorSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

    // Recent activity (last 10 events)
    const recentActivity = events.slice(0, 10).map(e => ({
      type: e.event_type,
      concept: e.concept,
      score: e.score,
      date: e.created_at,
    }));

    res.json({
      streak,
      totalSources: sources.length,
      totalQuizzes,
      quizAccuracy,
      totalStudyMinutes,
      recentActivity,
      totalEvents: events.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /progress/streak - Get study streak
router.get('/streak', async (req, res) => {
  try {
    if (demoService.isDemoUser(req)) {
      return res.json(demoService.getProgressStreak());
    }
    const userId = req.user._id;

    const { data: events, error } = await supabase
      .from('progress_events')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(365);

    if (error) throw error;

    const daysWithActivity = new Set((events || []).map(e => new Date(e.created_at).toDateString()));

    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      if (daysWithActivity.has(checkDate.toDateString())) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    res.json({ streak });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /progress/revision-stats - Get revision statistics
router.get('/revision-stats', async (req, res) => {
  try {
    if (demoService.isDemoUser(req)) {
      return res.json(demoService.getReviewStats());
    }
    const userId = req.user._id;
    const today = new Date().toISOString().split('T')[0];

    const [dueResult, upcomingResult, completedResult] = await Promise.all([
      supabase
        .from('review_schedule')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .lte('next_review_date', today),
      supabase
        .from('review_schedule')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gt('next_review_date', today),
      supabase
        .from('review_schedule')
        .select('review_count')
        .eq('user_id', userId),
    ]);

    const totalReviews = (completedResult.data || []).reduce((sum, r) => sum + (r.review_count || 0), 0);
    const retentionRate = totalReviews > 0 ? Math.round((completedResult.data?.length || 0) / Math.max(totalReviews, 1) * 100) : 0;

    res.json({
      dueToday: dueResult.count || 0,
      upcoming: upcomingResult.count || 0,
      totalReviews,
      retentionRate: Math.min(retentionRate, 100),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /progress/snapshot - Generate analytics snapshot
router.post('/snapshot', async (req, res) => {
  try {
    const userId = req.user._id;
    const { period = 'weekly' } = req.body;

    const periodDays = period === 'daily' ? 1 : period === 'monthly' ? 30 : 7;
    const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();

    const [eventsResult, quizResult, masteryResult, tutorResult] = await Promise.all([
      supabase
        .from('progress_events')
        .select('event_type, score, duration_minutes, correct, created_at')
        .eq('user_id', userId)
        .gte('created_at', startDate),
      supabase
        .from('practice_attempts')
        .select('correct, score, concept, created_at')
        .eq('user_id', userId)
        .gte('created_at', startDate),
      supabase
        .from('concept_mastery')
        .select('concept, mastery_score, level')
        .eq('user_id', userId),
      supabase
        .from('tutoring_sessions')
        .select('duration_minutes, created_at')
        .eq('user_id', userId)
        .gte('created_at', startDate),
    ]);

    const events = eventsResult.data || [];
    const quizzes = quizResult.data || [];
    const mastery = masteryResult.data || [];
    const tutorSessions = tutorResult.data || [];

    // Calculate metrics
    const studyHours = Math.round(tutorSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / 60 * 10) / 10;
    const quizAccuracy = quizzes.length > 0 ? Math.round(quizzes.filter(q => q.correct).length / quizzes.length * 100) : 0;
    const topicsMastered = mastery.filter(m => m.level === 'mastery' || m.level === 'proficient').length;
    const topicsTotal = mastery.length;
    const learningVelocity = mastery.filter(m => {
      const lastAssessed = m.last_assessed || m.created_at;
      return new Date(lastAssessed) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }).length;

    // Save snapshot
    const { data, error } = await supabase
      .from('analytics_snapshots')
      .insert({
        user_id: userId,
        period,
        study_hours: studyHours,
        quiz_accuracy: quizAccuracy,
        revision_consistency: Math.round((events.filter(e => e.event_type === 'revision_completed').length / Math.max(periodDays, 1)) * 100),
        topics_mastered: topicsMastered,
        topics_total: topicsTotal,
        learning_velocity: learningVelocity,
        data: { events: events.length, quizzes: quizzes.length, tutorSessions: tutorSessions.length },
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /progress/trends - Get learning trends
router.get('/trends', async (req, res) => {
  try {
    if (demoService.isDemoUser(req)) {
      return res.json(demoService.getTrends());
    }
    const userId = req.user._id;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: snapshots } = await supabase
      .from('analytics_snapshots')
      .select('period, study_hours, quiz_accuracy, topics_mastered, learning_velocity, snapshot_date')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo)
      .order('snapshot_date', { ascending: true });

    const weeklySnapshots = (snapshots || []).filter(s => s.period === 'weekly');

    // Determine trend direction
    let quizTrend = 'stable';
    let masteryTrend = 'stable';
    if (weeklySnapshots.length >= 2) {
      const recent = weeklySnapshots[weeklySnapshots.length - 1];
      const previous = weeklySnapshots[weeklySnapshots.length - 2];
      if (recent.quiz_accuracy > previous.quiz_accuracy + 5) quizTrend = 'improving';
      else if (recent.quiz_accuracy < previous.quiz_accuracy - 5) quizTrend = 'declining';
      if (recent.topics_mastered > previous.topics_mastered) masteryTrend = 'improving';
      else if (recent.topics_mastered < previous.topics_mastered) masteryTrend = 'declining';
    }

    res.json({
      snapshots: weeklySnapshots,
      trends: { quiz: quizTrend, mastery: masteryTrend },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
