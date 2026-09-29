const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const supabase = require('../utils/supabase');

router.use(authenticate);

// GET /dashboard/overview - Get comprehensive dashboard data
router.get('/overview', async (req, res) => {
  try {
    const userId = req.user._id;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const today = new Date().toISOString().split('T')[0];

    const [sourcesResult, progressResult, quizResult, tutorResult, masteryResult, gapsResult, reviewsResult] = await Promise.all([
      supabase.from('sources').select('id, name, status, created_at').eq('user_id', userId),
      supabase.from('progress_events').select('event_type, score, correct, created_at, concept').eq('user_id', userId).gte('created_at', thirtyDaysAgo),
      supabase.from('practice_attempts').select('correct, score, concept, created_at').eq('user_id', userId).gte('created_at', thirtyDaysAgo),
      supabase.from('tutoring_sessions').select('duration_minutes, questions_asked, created_at').eq('user_id', userId).gte('created_at', thirtyDaysAgo),
      supabase.from('concept_mastery').select('concept, mastery_score, level').eq('user_id', userId),
      supabase.from('knowledge_gaps').select('concept, severity').eq('user_id', userId).eq('status', 'open'),
      supabase.from('review_schedule').select('*').eq('user_id', userId).lte('next_review_date', today),
    ]);

    const sources = sourcesResult.data || [];
    const events = progressResult.data || [];
    const quizzes = quizResult.data || [];
    const tutorSessions = tutorResult.data || [];
    const mastery = masteryResult.data || [];
    const gaps = gapsResult.data || [];
    const dueReviews = reviewsResult.data || [];

    // Calculate streak
    const daysWithActivity = new Set();
    events.forEach(e => daysWithActivity.add(new Date(e.created_at).toDateString()));
    quizzes.forEach(q => daysWithActivity.add(new Date(q.created_at).toDateString()));
    tutorSessions.forEach(t => daysWithActivity.add(new Date(t.created_at).toDateString()));

    let streak = 0;
    const currentDate = new Date();
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(currentDate);
      checkDate.setDate(checkDate.getDate() - i);
      if (daysWithActivity.has(checkDate.toDateString())) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    // Quiz stats
    const totalQuizzes = quizzes.length;
    const correctQuizzes = quizzes.filter(q => q.correct).length;
    const quizAccuracy = totalQuizzes > 0 ? Math.round((correctQuizzes / totalQuizzes) * 100) : 0;

    // Study time
    const totalStudyMinutes = tutorSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

    // Topic stats
    const topicsMastered = mastery.filter(m => m.level === 'mastery' || m.level === 'proficient').length;
    const topicsTotal = mastery.length;

    // Subject breakdown
    const subjectStats = {};
    quizzes.forEach(q => {
      if (!subjectStats[q.concept]) {
        subjectStats[q.concept] = { total: 0, correct: 0 };
      }
      subjectStats[q.concept].total++;
      if (q.correct) subjectStats[q.concept].correct++;
    });

    const subjectBreakdown = Object.entries(subjectStats).map(([concept, stats]) => ({
      concept,
      accuracy: Math.round((stats.correct / stats.total) * 100),
      attempts: stats.total,
    })).sort((a, b) => b.attempts - a.attempts).slice(0, 5);

    // Recent activity
    const recentActivity = [
      ...events.slice(0, 5).map(e => ({ type: e.event_type, concept: e.concept, date: e.created_at })),
      ...quizzes.slice(0, 3).map(q => ({ type: 'quiz', concept: q.concept, score: q.score, date: q.created_at })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);

    // AI Recommendations
    const recommendations = [];
    if (gaps.length > 0) {
      recommendations.push({ title: `Review ${gaps[0].concept}`, priority: 'high' });
    }
    if (dueReviews.length > 0) {
      recommendations.push({ title: `${dueReviews.length} concepts due for review`, priority: 'medium' });
    }
    if (totalQuizzes < 5 && sources.length > 0) {
      recommendations.push({ title: 'Take a practice quiz', priority: 'medium' });
    }

    // Today's tasks
    const todayTasks = dueReviews.slice(0, 5).map(r => ({
      concept: r.concept,
      type: 'review',
      dueDate: r.next_review_date,
    }));

    // Upcoming reviews (next 7 days)
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { data: upcomingReviews } = await supabase
      .from('review_schedule')
      .select('concept, next_review_date, interval_days')
      .eq('user_id', userId)
      .gt('next_review_date', today)
      .lte('next_review_date', nextWeek)
      .order('next_review_date', { ascending: true })
      .limit(5);

    // Weak topics
    const weakTopics = mastery
      .filter(m => m.mastery_score < 50 && m.total_attempts > 0)
      .sort((a, b) => a.mastery_score - b.mastery_score)
      .slice(0, 5)
      .map(m => m.concept);

    // Upcoming exams from planner
    const { data: planners } = await supabase
      .from('planners')
      .select('title, exam_date, subject')
      .eq('user_id', userId)
      .eq('status', 'active')
      .not('exam_date', 'is', null)
      .order('exam_date', { ascending: true })
      .limit(3);

    const upcomingExams = (planners || [])
      .filter(p => p.exam_date && new Date(p.exam_date) > new Date())
      .map(p => ({
        title: p.title,
        subject: p.subject,
        examDate: p.exam_date,
        daysLeft: Math.ceil((new Date(p.exam_date) - new Date()) / (1000 * 60 * 60 * 24)),
      }));

    // Enhanced recommendations
    const enhancedRecommendations = [...recommendations];
    if (mastery.length > 0) {
      const avgMastery = mastery.reduce((sum, m) => sum + m.mastery_score, 0) / mastery.length;
      if (avgMastery < 50) {
        enhancedRecommendations.push({ title: 'Focus on fundamentals - many concepts need practice', priority: 'high', action: 'study' });
      }
    }
    if (totalStudyMinutes === 0 && sources.length > 0) {
      enhancedRecommendations.push({ title: 'Start a tutoring session to begin learning', priority: 'high', action: 'tutor' });
    }
    if (upcomingExams.length > 0 && dueReviews.length === 0) {
      enhancedRecommendations.push({ title: `Exam in ${upcomingExams[0].daysLeft} days - create a study plan`, priority: 'high', action: 'planner' });
    }
    if (gaps.length > 3) {
      enhancedRecommendations.push({ title: 'Many knowledge gaps detected - take a diagnostic quiz', priority: 'medium', action: 'quiz' });
    }
    if (topicsMastered > 0 && topicsMastered === topicsTotal) {
      enhancedRecommendations.push({ title: 'All topics mastered! Time for advanced practice', priority: 'low', action: 'quiz' });
    }

    // "What to study now" - smart recommendation
    let whatToStudy = null;
    if (dueReviews.length > 0) {
      whatToStudy = { type: 'review', concept: dueReviews[0].concept, reason: 'Review is due today' };
    } else if (gaps.length > 0) {
      whatToStudy = { type: 'study', concept: gaps[0].concept, reason: 'Knowledge gap detected' };
    } else if (weakTopics.length > 0) {
      whatToStudy = { type: 'practice', concept: weakTopics[0], reason: 'Weak topic needs practice' };
    } else if (sources.length > 0 && topicsTotal === 0) {
      whatToStudy = { type: 'quiz', concept: null, reason: 'Take a quiz to assess your knowledge' };
    }

    // Learning velocity (concepts mastered this week)
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: newMasteryCount } = await supabase
      .from('concept_mastery')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('last_assessed', lastWeek);

    res.json({
      streak,
      totalSources: sources.length,
      totalQuizzes,
      quizAccuracy,
      totalStudyMinutes,
      topicsMastered,
      topicsTotal,
      knowledgeGaps: gaps.length,
      subjectBreakdown,
      recentActivity,
      recommendations: enhancedRecommendations,
      todayTasks,
      upcomingReviews: upcomingReviews || [],
      weakTopics,
      upcomingExams,
      activeSources: sources.filter(s => s.status === 'ready').length,
      learningVelocity: newMasteryCount || 0,
      masteryPercentage: topicsTotal > 0 ? Math.round((topicsMastered / topicsTotal) * 100) : 0,
      whatToStudy,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Keep the old stats endpoint for backward compatibility
router.get('/stats', async (req, res) => {
  const userId = req.user._id;

  const [sourcesResult, progressResult, plannersResult] = await Promise.all([
    supabase.from('sources').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('progress_events').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('planners').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);

  res.json({
    sources: sourcesResult.count || 0,
    progress: progressResult.count || 0,
    planners: plannersResult.count || 0,
  });
});

module.exports = router;
