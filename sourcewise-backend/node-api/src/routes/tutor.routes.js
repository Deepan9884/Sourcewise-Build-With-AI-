/**
 * Tutor Routes - Advanced AI tutoring endpoints
 * Handles tutoring sessions, practice generation, and learning analytics
 */
const express = require('express');
const router = express.Router();
const axios = require('axios');
const supabase = require('../utils/supabase');
const { authenticate } = require('../middleware/auth');
const { tokenBudget } = require('../middleware/tokenBudget');
const creditService = require('../services/creditService');
const tokenService = require('../services/tokenService');
const { v4: uuidv4 } = (() => { try { return require('uuid'); } catch (e) { return { v4: () => `${Date.now()}-${Math.random().toString(36).slice(2)}` }; } })();

const PYTHON_AI_URL = process.env.PYTHON_AI_URL || 'http://localhost:8000';

// Shared secret forwarded to the Python AI service (see INTERNAL_API_KEY).
// Read per call (not at module load) so tests and env reloads are honoured.
// Omitted when unconfigured (plain local-dev mode).
const aiHeaders = () => (process.env.INTERNAL_API_KEY
  ? { 'X-Internal-Key': process.env.INTERNAL_API_KEY }
  : {});

// ── POST /tutor/ask - Main tutoring endpoint ──────────────────────────
router.post('/ask', authenticate, tokenBudget({ endpoint: 'tutor/ask' }), async (req, res) => {
  const requestId = uuidv4();
  const startedAt = Date.now();
  const budget = req.tokenBudget || {};
  const { provider: activeProvider, model: activeModel } = tokenService.currentProvider();
  try {
    const { question, sourceIds, mode, sessionId } = req.body;
    const userId = req.user.userId;

    if (!question || !sourceIds || sourceIds.length === 0) {
      return res.status(400).json({ 
        error: 'Question and at least one source ID are required' 
      });
    }

    // Get or create tutoring session
    let session;
    if (sessionId) {
      const { data } = await supabase
        .from('tutoring_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single();
      session = data;
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
    } else {
      const { data } = await supabase
        .from('tutoring_sessions')
        .insert({
          user_id: userId,
          source_ids: sourceIds,
          mode: mode || 'direct',
          conversation_history: [],
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      session = data;
    }

    // Get user's learning profile
    let { data: learningProfile } = await supabase
      .from('learning_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!learningProfile) {
      const { data } = await supabase
        .from('learning_profiles')
        .insert({ user_id: userId })
        .select()
        .single();
      learningProfile = data;
    }

    // Log user interaction
    const history = session.conversation_history || [];
    history.push({ role: 'user', content: question, timestamp: new Date().toISOString() });

    await supabase
      .from('tutoring_sessions')
      .update({ conversation_history: history })
      .eq('id', session.id);

    // Forward request to Python AI service with SSE
    const response = await axios.post(
      `${PYTHON_AI_URL}/tutor/explain`,
      {
        question,
        source_ids: sourceIds,
        user_profile: learningProfile,
        mode: mode || 'direct',
        history: history.slice(-10),
        session_id: session.id,
      },
      {
        responseType: 'stream',
        headers: { 'Accept': 'text/event-stream', ...aiHeaders() },
      }
    );

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let fullResponse = '';

    response.data.on('data', (chunk) => {
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          res.write(`data: ${data}\n\n`);
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'token') fullResponse += parsed.data;
          } catch (e) {}
        }
      }
    });

    response.data.on('end', async () => {
      res.end();
      history.push({ role: 'assistant', content: fullResponse, timestamp: new Date().toISOString() });
      await supabase
        .from('tutoring_sessions')
        .update({ conversation_history: history })
        .eq('id', session.id);
      // Token accounting (actual completion tokens from streamed response)
      try {
        const promptTokens = budget.estimated || tokenService.estimateTokensFor(question);
        const completionTokens = tokenService.estimateTokensFor(fullResponse);
        await tokenService.logUsage({
          userId, sessionId: session.id, requestId, endpoint: 'tutor/ask',
          provider: activeProvider, model: activeModel,
          promptTokens, completionTokens, contextChunks: sourceIds.length,
          success: true, latencyMs: Date.now() - startedAt,
        });
        await creditService.commitUsage(userId, promptTokens + completionTokens, {
          reserved: budget.reserved || 0, requestId, endpoint: 'tutor/ask',
          provider: activeProvider, promptTokens, completionTokens,
        });
      } catch (e) { console.error('[TutorRoutes] token accounting failed:', e.message); }
    });

    response.data.on('error', (error) => {
      console.error('[TutorRoutes] Stream error:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', data: 'Stream error' })}\n\n`);
      res.end();
    });

  } catch (error) {
    console.error('[TutorRoutes] Error in /ask:', error);
    try {
      const promptTokens = (req.tokenBudget && req.tokenBudget.estimated) || 0;
      await tokenService.logUsage({
        userId: req.user?.userId, requestId, endpoint: 'tutor/ask',
        provider: activeProvider, model: activeModel,
        promptTokens, completionTokens: 0, success: false,
        errorMessage: error.message, latencyMs: Date.now() - startedAt,
      });
      if (req.tokenBudget?.reserved) await creditService.releaseReservation(req.user.userId, req.tokenBudget.reserved);
    } catch (e) { /* ignore */ }
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process tutoring request' });
    }
  }
});

// ── POST /tutor/practice - Generate practice questions ────────────────
router.post('/practice', authenticate, tokenBudget({ endpoint: 'tutor/practice' }), async (req, res) => {
  try {
    const { concept, sourceIds, difficulty, type } = req.body;
    const userId = req.user.userId;
    const { provider: activeProvider, model: activeModel } = tokenService.currentProvider();

    const response = await axios.post(`${PYTHON_AI_URL}/tutor/practice`, {
      concept,
      source_ids: sourceIds,
      difficulty: difficulty || 'medium',
      type: type || 'mcq',
    }, { headers: aiHeaders() });

    const question = response.data;

    const { data: attempt } = await supabase
      .from('practice_attempts')
      .insert({
        user_id: userId,
        concept,
        question_type: type || 'mcq',
        question_text: question.question || question.problem,
        options: question.options || [],
        correct_answer: question.correct_answer || question.key_points,
        difficulty: difficulty || 'medium',
        source_ids: sourceIds,
      })
      .select()
      .single();

    const { correct_answer, key_points, ...questionForUser } = question;
    // Token accounting for practice generation
    try {
      const promptTokens = (req.tokenBudget && req.tokenBudget.estimated) || tokenService.estimateTokensFor(concept);
      const completionTokens = tokenService.estimateTokensFor(JSON.stringify(question));
      await tokenService.logUsage({
        userId, requestId: uuidv4(), endpoint: 'tutor/practice',
        provider: activeProvider, model: activeModel,
        promptTokens, completionTokens, success: true,
      });
      await creditService.commitUsage(userId, promptTokens + completionTokens, {
        reserved: (req.tokenBudget && req.tokenBudget.reserved) || 0,
        endpoint: 'tutor/practice', provider: activeProvider,
        promptTokens, completionTokens,
      });
    } catch (e) { console.error('[TutorRoutes] practice accounting failed:', e.message); }
    res.json({ ...questionForUser, attemptId: attempt.id });

  } catch (error) {
    console.error('[TutorRoutes] Error in /practice:', error);
    res.status(500).json({ error: 'Failed to generate practice question' });
  }
});

// ── POST /tutor/evaluate - Evaluate practice answers ──────────────────
router.post('/evaluate', authenticate, async (req, res) => {
  try {
    const { attemptId, userAnswer } = req.body;
    const userId = req.user.userId;

    const { data: attempt } = await supabase
      .from('practice_attempts')
      .select('*')
      .eq('id', attemptId)
      .eq('user_id', userId)
      .single();

    if (!attempt) return res.status(404).json({ error: 'Practice attempt not found' });

    const response = await axios.post(`${PYTHON_AI_URL}/tutor/evaluate`, {
      question_id: attemptId,
      question_text: attempt.question_text,
      user_answer: userAnswer,
      correct_answer: attempt.correct_answer,
      concept: attempt.concept,
    }, { headers: aiHeaders() });

    const evaluation = response.data;

    await supabase
      .from('practice_attempts')
      .update({
        answer: userAnswer,
        correct: evaluation.is_correct,
        score: evaluation.score,
        feedback: evaluation.feedback,
      })
      .eq('id', attemptId);

    // Track progress event
    await supabase.from('progress_events').insert({
      user_id: userId,
      event_type: 'practice',
      concept: attempt.concept,
      score: evaluation.score,
      correct: evaluation.is_correct,
      source_id: attempt.source_ids?.[0] || null,
    });

    // Update concept mastery
    await updateConceptMastery(userId, attempt.concept, evaluation.is_correct, evaluation.score);

    // Update review schedule
    await updateReviewSchedule(userId, attempt.concept, evaluation.score, attempt.source_ids?.[0]);

    res.json(evaluation);

  } catch (error) {
    console.error('[TutorRoutes] Error in /evaluate:', error);
    res.status(500).json({ error: 'Failed to evaluate answer' });
  }
});

// ── GET /tutor/suggest-topics ─────────────────────────────────────────
router.get('/suggest-topics', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user's learning profile
    const { data: learningProfile } = await supabase
      .from('learning_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!learningProfile) {
      return res.json({
        suggestions: [],
        message: 'Start a study session to get personalized suggestions!'
      });
    }

    // Get user's sources
    const { data: sources } = await supabase
      .from('sources')
      .select('*')
      .eq('user_id', userId);

    if (!sources || sources.length === 0) {
      return res.json({
        suggestions: [],
        message: 'Upload some study materials first to get topic suggestions!'
      });
    }

    // Build suggestions from knowledge gaps and concept mastery
    const suggestions = [];

    // Suggest topics with knowledge gaps
    if (learningProfile.knowledge_gaps && learningProfile.knowledge_gaps.length > 0) {
      for (const gap of learningProfile.knowledge_gaps.slice(0, 3)) {
        suggestions.push({
          concept: gap.concept,
          reason: `Knowledge gap identified - you may need to review this topic`,
          priority: gap.severity || 3,
          type: 'gap',
        });
      }
    }

    // Suggest topics at developing level (next to master)
    if (learningProfile.concept_mastery) {
      const developing = learningProfile.concept_mastery
        .filter(c => c.level === 'developing')
        .sort((a, b) => (b.correct_attempts / b.total_attempts) - (a.correct_attempts / a.total_attempts));

      for (const concept of developing.slice(0, 3)) {
        suggestions.push({
          concept: concept.concept,
          reason: `You are developing in this area - a bit more practice will help!`,
          priority: 2,
          type: 'developing',
        });
      }
    }

    // Suggest reviewing recently studied topics
    if (learningProfile.concept_mastery) {
      const recently_assessed = learningProfile.concept_mastery
        .filter(c => c.last_assessed)
        .sort((a, b) => new Date(b.last_assessed) - new Date(a.last_assessed))
        .slice(0, 2);

      for (const concept of recently_assessed) {
        if (concept.level !== 'mastery') {
          suggestions.push({
            concept: concept.concept,
            reason: `Recently studied - good time for spaced repetition`,
            priority: 1,
            type: 'review',
          });
        }
      }
    }

    // Sort by priority
    suggestions.sort((a, b) => b.priority - a.priority);

    res.json({
      suggestions: suggestions.slice(0, 5),
      totalSources: sources.length,
      profileLevel: learningProfile.concept_mastery?.length > 0 ? 'active' : 'new',
    });

  } catch (error) {
    console.error('[TutorRoutes] Error in /suggest-topics:', error);
    res.status(500).json({ error: 'Failed to generate topic suggestions' });
  }
});

// ── POST /tutor/session/start ─────────────────────────────────────────
router.post('/session/start', authenticate, async (req, res) => {
  try {
    const { sourceIds, goals } = req.body;
    const userId = req.user.userId;

    const { data: session } = await supabase
      .from('tutoring_sessions')
      .insert({
        user_id: userId,
        source_ids: sourceIds,
        mode: req.body.mode || 'direct',
        conversation_history: [],
      })
      .select()
      .single();

    res.json({
      sessionId: session.id,
      suggestedTopics: [],
      reviewTopics: [],
      message: 'Session started! What would you like to learn today?',
    });

  } catch (error) {
    console.error('[TutorRoutes] Error in /session/start:', error);
    res.status(500).json({ error: 'Failed to start tutoring session' });
  }
});

// ── POST /tutor/session/end ───────────────────────────────────────────
router.post('/session/end', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user.userId;

    // Get the session
    const { data: session } = await supabase
      .from('tutoring_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Calculate session duration
    const startTime = new Date(session.created_at);
    const endTime = new Date();
    const durationMs = endTime - startTime;
    const durationMinutes = Math.round(durationMs / 60000);

    // Count concepts from conversation history
    const history = session.conversation_history || [];
    const questionsAsked = history.filter(h => h.role === 'user').length;
    const conceptsCovered = new Set();

    // Extract potential concepts from messages (simple keyword extraction)
    for (const msg of history) {
      if (msg.content) {
        const words = msg.content.toLowerCase().split(' ');
        const contentWords = words.filter(w => w.length > 4 && ![
          'what', 'how', 'why', 'when', 'where', 'does', 'do', 'can',
          'could', 'would', 'should', 'tell', 'explain', 'about',
        ].includes(w));
        contentWords.slice(0, 3).forEach(w => conceptsCovered.add(w));
      }
    }

    // Update the session
    await supabase
      .from('tutoring_sessions')
      .update({
        ended_at: endTime.toISOString(),
        duration_minutes: durationMinutes,
        questions_asked: questionsAsked,
        concepts_covered: Array.from(conceptsCovered).slice(0, 10),
      })
      .eq('id', sessionId);

    // Track progress event for tutoring session
    await supabase.from('progress_events').insert({
      user_id: userId,
      event_type: 'tutoring_session',
      duration_minutes: durationMinutes,
      metadata: {
        session_id: sessionId,
        mode: session.mode,
        questions_asked: questionsAsked,
        concepts_covered: Array.from(conceptsCovered).slice(0, 10),
      },
    });

    // Update knowledge gaps for concepts that might need improvement
    for (const concept of Array.from(conceptsCovered).slice(0, 5)) {
      await supabase.from('knowledge_gaps').upsert({
        user_id: userId,
        concept,
        severity: 3,
      }, { onConflict: 'user_id,concept' });
    }

    // Generate summary
    const summary = {
      duration: durationMinutes < 1 ? 'Less than a minute' : `${durationMinutes} minutes`,
      questionsAsked,
      conceptsCovered: conceptsCovered.size,
      mode: session.mode || 'direct',
      topicsDiscussed: Array.from(conceptsCovered).slice(0, 5),
    };

    // Generate achievements based on activity
    const achievements = [];
    if (questionsAsked >= 5) {
      achievements.push({ title: 'Curious Mind', description: 'Asked 5+ questions in a session' });
    }
    if (questionsAsked >= 10) {
      achievements.push({ title: 'Deep Diver', description: 'Asked 10+ questions - impressive!' });
    }
    if (durationMinutes >= 30) {
      achievements.push({ title: 'Focused Learner', description: 'Studied for 30+ minutes' });
    }
    if (conceptsCovered.size >= 3) {
      achievements.push({ title: 'Knowledge Explorer', description: 'Covered 3+ different topics' });
    }

    // Send encouraging message
    let encouragement = '';
    if (questionsAsked === 0) {
      encouragement = 'Next time, try asking some questions - I am here to help!';
    } else if (questionsAsked < 3) {
      encouragement = 'Good start! Feel free to ask more questions next time.';
    } else if (questionsAsked < 7) {
      encouragement = 'Great session! You asked some really thoughtful questions.';
    } else {
      encouragement = 'Amazing session! Your curiosity is inspiring. Keep it up!';
    }

    res.json({
      summary,
      achievements,
      encouragement,
      nextSessionRecommendation: conceptsCovered.size > 0
        ? `Consider reviewing: ${Array.from(conceptsCovered).slice(0, 3).join(', ')}`
        : 'Upload more study materials to get started!',
    });

  } catch (error) {
    console.error('[TutorRoutes] Error in /session/end:', error);
    res.status(500).json({ error: 'Failed to end tutoring session' });
  }
});

// ── GET /tutor/history - Get conversation history ──────────────────────
router.get('/history', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 20, offset = 0 } = req.query;

    const { data: sessions, error } = await supabase
      .from('tutoring_sessions')
      .select('id, created_at, ended_at, mode, source_ids, conversation_history')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Format sessions for display
    const formattedSessions = (sessions || []).map(session => ({
      id: session.id,
      date: session.created_at,
      duration: session.ended_at
        ? Math.round((new Date(session.ended_at) - new Date(session.created_at)) / 60000)
        : null,
      mode: session.mode,
      messageCount: (session.conversation_history || []).length,
      preview: (session.conversation_history || [])
        .filter(h => h.role === 'user')
        .slice(-1)[0]?.content?.substring(0, 100) || 'New session',
    }));

    res.json({
      sessions: formattedSessions,
      total: formattedSessions.length,
    });

  } catch (error) {
    console.error('[TutorRoutes] Error in /history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// ── GET /tutor/session/:sessionId - Get specific session details ──────
router.get('/session/:sessionId', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;

    const { data: session, error } = await supabase
      .from('tutoring_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (error || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      id: session.id,
      date: session.created_at,
      mode: session.mode,
      sourceIds: session.source_ids,
      conversationHistory: session.conversation_history || [],
      endedAt: session.ended_at,
      duration: session.ended_at
        ? Math.round((new Date(session.ended_at) - new Date(session.created_at)) / 60000)
        : null,
    });

  } catch (error) {
    console.error('[TutorRoutes] Error in /session/:sessionId:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// ── Helper Functions ──────────────────────────────────────────────────

// Update concept mastery after practice/quiz
async function updateConceptMastery(userId, concept, isCorrect, score) {
  try {
    if (!concept) return;

    // Get existing mastery
    const { data: existing } = await supabase
      .from('concept_mastery')
      .select('*')
      .eq('user_id', userId)
      .eq('concept', concept)
      .single();

    const totalAttempts = (existing?.total_attempts || 0) + 1;
    const correctAttempts = (existing?.correct_attempts || 0) + (isCorrect ? 1 : 0);
    const masteryScore = Math.round((correctAttempts / totalAttempts) * 100);

    // Calculate level
    let level = 'novice';
    if (masteryScore >= 90 && totalAttempts >= 5) level = 'mastery';
    else if (masteryScore >= 75 && totalAttempts >= 3) level = 'proficient';
    else if (masteryScore >= 50) level = 'developing';

    // Calculate next review date
    let intervalDays = 1;
    if (masteryScore > 90) intervalDays = 7;
    else if (masteryScore > 75) intervalDays = 3;
    else intervalDays = 1;

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + intervalDays);

    await supabase.from('concept_mastery').upsert({
      user_id: userId,
      concept,
      mastery_score: masteryScore,
      confidence_score: Math.min(100, totalAttempts * 10),
      total_attempts: totalAttempts,
      correct_attempts: correctAttempts,
      last_assessed: new Date().toISOString(),
      next_review_date: nextReview.toISOString(),
      interval_days: intervalDays,
      level,
    }, { onConflict: 'user_id,concept' });
  } catch (error) {
    console.error('[TutorRoutes] Update concept mastery failed:', error.message);
  }
}

// Update review schedule for spaced repetition
async function updateReviewSchedule(userId, concept, score, sourceId) {
  try {
    if (!concept) return;

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
  } catch (error) {
    console.error('[TutorRoutes] Update review schedule failed:', error.message);
  }
}

// ── POST /tutor/orchestrator - AI gateway proxy ─────────────────────────
// The browser must NOT call python-ai directly: when INTERNAL_API_KEY is set,
// python rejects keyless callers with 401 (this broke the Generate-roadmap
// button in docker/prod). Route via Node so JWT is verified, per-tier budgets
// are enforced, and usage is metered — same pattern as /tutor/ask.
router.post('/orchestrator', authenticate, tokenBudget({ endpoint: 'tutor/orchestrator' }), async (req, res) => {
  const requestId = uuidv4();
  const startedAt = Date.now();
  const budget = req.tokenBudget || {};
  const { provider: activeProvider, model: activeModel } = tokenService.currentProvider();
  try {
    const userId = req.user.userId || req.user.id;
    const {
      message, sourceIds, source_ids, user_id,
      action, topic, count, difficulty, mode, examDate, exam_date, dailyHours, daily_hours, context,
    } = req.body || {};
    const text = message || topic || '';
    if (!text || !String(text).trim()) {
      if (budget.reserved) await creditService.releaseReservation(userId, budget.reserved);
      return res.status(400).json({ error: 'message (or topic) is required' });
    }
    const payload = {
      message: String(text),
      source_ids: source_ids || sourceIds || [],
      user_id: String(user_id || userId),
      context: context || {},
      ...(action ? { action } : {}),
      ...(topic ? { topic } : {}),
      ...(count ? { count } : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(mode ? { mode } : {}),
      ...(exam_date || examDate ? { exam_date: exam_date || examDate } : {}),
      ...(daily_hours || dailyHours ? { daily_hours: daily_hours || dailyHours } : {}),
    };
    let aiRes;
    try {
      aiRes = await axios.post(`${PYTHON_AI_URL}/orchestrator`, payload, { headers: aiHeaders(), timeout: 120000 });
    } catch (e) {
      const status = e.response?.status || 502;
      const detail = e.response?.data?.detail || e.response?.data?.error || e.message;
      const aiDown = status === 502 && !e.response;
      try {
        await tokenService.logUsage({
          userId, requestId, endpoint: 'tutor/orchestrator',
          provider: activeProvider, model: activeModel,
          promptTokens: budget.estimated || 0, completionTokens: 0, success: false,
          errorMessage: aiDown ? 'AI service unreachable' : String(detail),
          latencyMs: Date.now() - startedAt,
        });
        if (budget.reserved) await creditService.releaseReservation(userId, budget.reserved);
      } catch (_) { /* ignore */ }
      return res.status(aiDown ? 503 : status).json({
        error: aiDown ? 'AI service is unreachable. Start python-ai (port 8000) and retry.' : `Plan generation failed: ${detail}`,
      });
    }
    try {
      const promptTokens = budget.estimated || tokenService.estimateTokensFor(payload.message);
      const completionTokens = tokenService.estimateTokensFor(JSON.stringify(aiRes.data));
      await tokenService.logUsage({
        userId, requestId, endpoint: 'tutor/orchestrator',
        provider: activeProvider, model: activeModel,
        promptTokens, completionTokens, contextChunks: (payload.source_ids || []).length,
        success: true, latencyMs: Date.now() - startedAt,
      });
      await creditService.commitUsage(userId, promptTokens + completionTokens, {
        reserved: budget.reserved || 0, requestId, endpoint: 'tutor/orchestrator',
        provider: activeProvider, model: activeModel, promptTokens, completionTokens,
      });
    } catch (e) { console.error('[TutorRoutes] orchestrator accounting failed:', e.message); }
    res.json(aiRes.data);
  } catch (error) {
    try {
      if (budget.reserved) await creditService.releaseReservation(req.user?.userId || req.user?.id, budget.reserved);
    } catch (_) { /* ignore */ }
    res.status(500).json({ error: error.message || 'Orchestrator proxy failed' });
  }
});

// ── POST /tutor/agent - AI gateway proxy (fallback path for plan generation) ─
router.post('/agent', authenticate, tokenBudget({ endpoint: 'tutor/agent' }), async (req, res) => {
  const requestId = uuidv4();
  const startedAt = Date.now();
  const budget = req.tokenBudget || {};
  const { provider: activeProvider, model: activeModel } = tokenService.currentProvider();
  try {
    const userId = req.user.userId || req.user.id;
    const { message, sourceIds, source_ids, history, conversation_history, context } = req.body || {};
    const text = message || '';
    if (!text || !String(text).trim()) {
      if (budget.reserved) await creditService.releaseReservation(userId, budget.reserved);
      return res.status(400).json({ error: 'message is required' });
    }
    const payload = {
      message: String(text),
      source_ids: source_ids || sourceIds || [],
      user_id: String(userId),
      conversation_history: conversation_history || history || [],
      ...(context ? { context } : {}),
    };
    let aiRes;
    try {
      aiRes = await axios.post(`${PYTHON_AI_URL}/agent`, payload, { headers: aiHeaders(), timeout: 120000 });
    } catch (e) {
      const status = e.response?.status || 502;
      const detail = e.response?.data?.detail || e.response?.data?.error || e.message;
      const aiDown = status === 502 && !e.response;
      try {
        await tokenService.logUsage({
          userId, requestId, endpoint: 'tutor/agent',
          provider: activeProvider, model: activeModel,
          promptTokens: budget.estimated || 0, completionTokens: 0, success: false,
          errorMessage: aiDown ? 'AI service unreachable' : String(detail),
          latencyMs: Date.now() - startedAt,
        });
        if (budget.reserved) await creditService.releaseReservation(userId, budget.reserved);
      } catch (_) { /* ignore */ }
      return res.status(aiDown ? 503 : status).json({
        error: aiDown ? 'AI service is unreachable. Start python-ai (port 8000) and retry.' : `Agent request failed: ${detail}`,
      });
    }
    try {
      const promptTokens = budget.estimated || tokenService.estimateTokensFor(payload.message);
      const completionTokens = tokenService.estimateTokensFor(JSON.stringify(aiRes.data));
      await tokenService.logUsage({
        userId, requestId, endpoint: 'tutor/agent',
        provider: activeProvider, model: activeModel,
        promptTokens, completionTokens, success: true, latencyMs: Date.now() - startedAt,
      });
      await creditService.commitUsage(userId, promptTokens + completionTokens, {
        reserved: budget.reserved || 0, requestId, endpoint: 'tutor/agent',
        provider: activeProvider, model: activeModel, promptTokens, completionTokens,
      });
    } catch (e) { console.error('[TutorRoutes] agent accounting failed:', e.message); }
    res.json(aiRes.data);
  } catch (error) {
    try {
      if (budget.reserved) await creditService.releaseReservation(req.user?.userId || req.user?.id, budget.reserved);
    } catch (_) { /* ignore */ }
    res.status(500).json({ error: error.message || 'Agent proxy failed' });
  }
});

module.exports = router;
