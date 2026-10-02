const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const supabase = require('../utils/supabase');

const demoService = require('../services/demoAccountService');

router.use(authenticate);

// GET /analytics/overview - Get analytics overview
router.get('/overview', async (req, res) => {
  try {
    if (demoService.isDemoUser(req)) {
      return res.json(demoService.getAnalyticsOverview());
    }
    const userId = req.user._id;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [progressResult, quizResult, tutorResult, masteryResult, gapsResult] = await Promise.all([
      supabase
        .from('progress_events')
        .select('event_type, score, correct, duration_minutes, created_at')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo),
      supabase
        .from('practice_attempts')
        .select('concept, correct, score, created_at')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo),
      supabase
        .from('tutoring_sessions')
        .select('duration_minutes, questions_asked, concepts_covered, created_at')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo),
      supabase
        .from('concept_mastery')
        .select('concept, mastery_score, level, total_attempts, correct_attempts')
        .eq('user_id', userId),
      supabase
        .from('knowledge_gaps')
        .select('concept, severity')
        .eq('user_id', userId)
        .eq('status', 'open'),
    ]);

    const progress = progressResult.data || [];
    const quizzes = quizResult.data || [];
    const tutorSessions = tutorResult.data || [];
    const mastery = masteryResult.data || [];
    const gaps = gapsResult.data || [];

    // Study hours
    const totalStudyMinutes = tutorSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    const studyHours = Math.round(totalStudyMinutes / 60 * 10) / 10;

    // Quiz accuracy
    const totalQuizzes = quizzes.length;
    const correctQuizzes = quizzes.filter(q => q.correct).length;
    const quizAccuracy = totalQuizzes > 0 ? Math.round((correctQuizzes / totalQuizzes) * 100) : 0;

    // Topic mastery
    const topicsMastered = mastery.filter(m => m.level === 'mastery' || m.level === 'proficient').length;
    const topicsTotal = mastery.length;
    const masteryPercentage = topicsTotal > 0 ? Math.round((topicsMastered / topicsTotal) * 100) : 0;

    // Learning velocity (concepts mastered per week)
    const recentMastery = mastery.filter(m => {
      const lastAssessed = m.last_assessed || m.created_at;
      return new Date(lastAssessed) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    });
    const learningVelocity = recentMastery.length;

    // Subject performance (group by concept)
    const conceptStats = {};
    quizzes.forEach(q => {
      if (!conceptStats[q.concept]) {
        conceptStats[q.concept] = { total: 0, correct: 0 };
      }
      conceptStats[q.concept].total++;
      if (q.correct) conceptStats[q.concept].correct++;
    });

    const subjectPerformance = Object.entries(conceptStats).map(([concept, stats]) => ({
      concept,
      accuracy: Math.round((stats.correct / stats.total) * 100),
      attempts: stats.total,
    })).sort((a, b) => b.attempts - a.attempts).slice(0, 10);

    // Weekly activity
    const weeklyActivity = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayEvents = progress.filter(e => e.created_at.startsWith(dateStr));
      weeklyActivity.push({
        date: dateStr,
        events: dayEvents.length,
        studyMinutes: dayEvents.reduce((sum, e) => sum + (e.duration_minutes || 0), 0),
      });
    }

    res.json({
      studyHours,
      quizAccuracy,
      totalQuizzes,
      topicsMastered,
      topicsTotal,
      masteryPercentage,
      learningVelocity,
      knowledgeGaps: gaps.length,
      subjectPerformance,
      weeklyActivity,
      weakTopics: gaps.slice(0, 5).map(g => g.concept),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /analytics/study-patterns - Get study patterns
router.get('/study-patterns', async (req, res) => {
  try {
    const userId = req.user._id;

    const { data: events, error } = await supabase
      .from('progress_events')
      .select('created_at, event_type, duration_minutes')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) throw error;

    // Analyze activity by hour of day
    const hourActivity = Array(24).fill(0);
    (events || []).forEach(e => {
      const hour = new Date(e.created_at).getHours();
      hourActivity[hour]++;
    });

    // Find optimal study times (top 3 hours)
    const optimalTimes = hourActivity
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(t => t.hour);

    // Average session length
    const sessionsWithDuration = (events || []).filter(e => e.duration_minutes);
    const avgSessionLength = sessionsWithDuration.length > 0
      ? Math.round(sessionsWithDuration.reduce((sum, e) => sum + e.duration_minutes, 0) / sessionsWithDuration.length)
      : 0;

    // Consistency (days active in last 30 days)
    const daysActive = new Set((events || []).map(e => new Date(e.created_at).toDateString())).size;
    const consistency = Math.round((daysActive / 30) * 100);

    res.json({
      optimalTimes,
      averageSessionLength: avgSessionLength,
      consistency,
      totalSessions: (events || []).length,
      recommendations: generateStudyRecommendations(optimalTimes, avgSessionLength, consistency),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /analytics/knowledge-growth - Get knowledge growth over time
router.get('/knowledge-growth', async (req, res) => {
  try {
    const userId = req.user._id;

    const { data: mastery, error } = await supabase
      .from('concept_mastery')
      .select('concept, mastery_score, level, last_assessed, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Build timeline
    const timeline = (mastery || []).map(m => ({
      concept: m.concept,
      score: m.mastery_score,
      level: m.level,
      date: m.last_assessed || m.created_at,
    }));

    // Mastery distribution
    const distribution = { novice: 0, developing: 0, proficient: 0, mastery: 0 };
    (mastery || []).forEach(m => {
      distribution[m.level] = (distribution[m.level] || 0) + 1;
    });

    // Summary
    const totalConcepts = (mastery || []).length;
    const avgScore = totalConcepts > 0
      ? Math.round((mastery.reduce((sum, m) => sum + m.mastery_score, 0) / totalConcepts) * 10)
      / 10
      : 0;

    res.json({
      timeline,
      summary: {
        totalConcepts,
        averageScore: avgScore,
        masteredCount: distribution.mastery,
        proficientCount: distribution.proficient,
      },
      masteryDistribution: distribution,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /analytics/recommendations - Get AI recommendations
router.get('/recommendations', async (req, res) => {
  try {
    const userId = req.user._id;

    const [gapsResult, masteryResult, quizResult] = await Promise.all([
      supabase
        .from('knowledge_gaps')
        .select('concept, severity')
        .eq('user_id', userId)
        .eq('status', 'open')
        .order('severity', { ascending: false }),
      supabase
        .from('concept_mastery')
        .select('concept, mastery_score, level')
        .eq('user_id', userId)
        .order('mastery_score', { ascending: true }),
      supabase
        .from('practice_attempts')
        .select('concept, correct')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    const gaps = gapsResult.data || [];
    const mastery = masteryResult.data || [];
    const recentQuizzes = quizResult.data || [];

    const recommendations = [];

    // Knowledge gap recommendations
    gaps.slice(0, 3).forEach(gap => {
      recommendations.push({
        type: 'knowledge_gap',
        priority: gap.severity >= 4 ? 'high' : 'medium',
        title: `Review: ${gap.concept}`,
        description: `You have a knowledge gap in "${gap.concept}". Consider reviewing this topic.`,
        action: 'Study this concept',
      });
    });

    // Weak topic recommendations
    const weakTopics = mastery.filter(m => m.mastery_score < 50).slice(0, 3);
    weakTopics.forEach(topic => {
      recommendations.push({
        type: 'weak_topic',
        priority: 'medium',
        title: `Practice: ${topic.concept}`,
        description: `Your mastery score is ${topic.mastery_score}%. More practice will help.`,
        action: 'Generate practice questions',
      });
    });

    // Review recommendations
    const dueForReview = mastery.filter(m => m.level !== 'mastery').slice(0, 2);
    dueForReview.forEach(topic => {
      recommendations.push({
        type: 'review',
        priority: 'low',
        title: `Revisit: ${topic.concept}`,
        description: `Spaced repetition suggests reviewing "${topic.concept}" soon.`,
        action: 'Start review session',
      });
    });

    // General recommendations
    if (mastery.length === 0) {
      recommendations.push({
        type: 'getting_started',
        priority: 'high',
        title: 'Upload your first source',
        description: 'Start by uploading study materials to begin your learning journey.',
        action: 'Go to Knowledge Hub',
      });
    }

    if (recentQuizzes.length === 0 && mastery.length > 0) {
      recommendations.push({
        type: 'quiz_suggestion',
        priority: 'medium',
        title: 'Take a practice quiz',
        description: 'Test your knowledge with a quiz based on your uploaded materials.',
        action: 'Go to AI Workspace',
      });
    }

    res.json({ recommendations: recommendations.slice(0, 6) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function
function generateStudyRecommendations(optimalTimes, avgSessionLength, consistency) {
  const recommendations = [];

  if (consistency < 50) {
    recommendations.push('Try to study more consistently - aim for daily sessions');
  }
  if (avgSessionLength < 20) {
    recommendations.push('Consider longer study sessions for better retention');
  }
  if (optimalTimes.length > 0) {
    const bestHour = optimalTimes[0];
    recommendations.push(`Your most productive hour is ${bestHour}:00 - schedule study time then`);
  }

  return recommendations;
}

module.exports = router;
