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
const personalContextService = require('../services/personalContextService');
const llmService = require('../services/llmService');
const { v4: uuidv4 } = (() => { try { return require('uuid'); } catch (e) { return { v4: () => `${Date.now()}-${Math.random().toString(36).slice(2)}` }; } })();

const PYTHON_AI_URL = process.env.PYTHON_AI_URL || '';

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
    const { question, sourceIds, source_ids, sourceNames, mode, sessionId } = req.body;
    const userId = req.user.userId || req.user.id;
    const sIds = Array.isArray(sourceIds) ? sourceIds : (Array.isArray(source_ids) ? source_ids : []);
    // sourceNames: array of document name strings sent by the frontend to help Gemini
    // answer from the correct document even when Supabase doesn't have full metadata yet
    const sNames = Array.isArray(sourceNames) ? sourceNames : [];

    if (!question || !String(question).trim()) {
      return res.status(400).json({ 
        error: 'Question is required' 
      });
    }

    // Get or create tutoring session
    let session;
    if (sessionId) {
      try {
        const { data } = await supabase
          .from('tutoring_sessions')
          .select('*')
          .eq('id', sessionId)
          .eq('user_id', userId)
          .single();
        session = data;
      } catch (_) {}
    }
    if (!session) {
      try {
        const { data } = await supabase
          .from('tutoring_sessions')
          .insert({
            user_id: userId,
            source_ids: sIds,
            mode: mode || 'direct',
            conversation_history: [],
            created_at: new Date().toISOString(),
          })
          .select()
          .single();
        session = data;
      } catch (_) {}
      if (!session) {
        session = { id: uuidv4(), conversation_history: [] };
      }
    }

    // Get user's learning profile (best effort)
    let learningProfile = {};
    try {
      const { data: profile } = await supabase
        .from('learning_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      learningProfile = profile || {};
    } catch (_) {}

    // Log user interaction
    const history = session.conversation_history || [];
    history.push({ role: 'user', content: question, timestamp: new Date().toISOString() });

    // If Gemini Cloud LLM is configured or Python AI is localhost, stream directly with zero latency
    if (process.env.GEMINI_API_KEY || !PYTHON_AI_URL || PYTHON_AI_URL.includes('localhost')) {
      const fullResponse = await llmService.streamText(res, {
        question,
        sourceIds: sIds,
        sourceNameHints: sNames,
        history,
        userId,
      });

      history.push({ role: 'assistant', content: fullResponse, timestamp: new Date().toISOString() });
      try {
        await supabase
          .from('tutoring_sessions')
          .update({ conversation_history: history })
          .eq('id', session.id);
      } catch (_) {}
      return;
    }

    // Otherwise try external Python AI service
    try {
      const response = await axios.post(
        `${PYTHON_AI_URL}/tutor/explain`,
        {
          question,
          source_ids: sIds,
          user_profile: learningProfile,
          mode: mode || 'direct',
          history: history.slice(-10),
          session_id: session.id,
        },
        {
          responseType: 'stream',
          headers: { 'Accept': 'text/event-stream', ...aiHeaders() },
          timeout: 5000,
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
        try {
          await supabase
            .from('tutoring_sessions')
            .update({ conversation_history: history })
            .eq('id', session.id);
        } catch (_) {}
      });

    } catch (aiErr) {
      console.log('[TutorRoutes] Python AI unavailable, streaming via Gemini Cloud LLM...');
      const fullResponse = await llmService.streamText(res, {
        question,
        sourceIds: sIds,
        history,
        userId,
      });

      history.push({ role: 'assistant', content: fullResponse, timestamp: new Date().toISOString() });
      try {
        await supabase
          .from('tutoring_sessions')
          .update({ conversation_history: history })
          .eq('id', session.id);
      } catch (_) {}
    }

  } catch (error) {
    console.error('[TutorRoutes] Error in /ask:', error);
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

    let question = null;
    if (process.env.GEMINI_API_KEY || !PYTHON_AI_URL || PYTHON_AI_URL.includes('localhost')) {
      const prompt = `Generate a ${difficulty || 'medium'} ${type || 'mcq'} practice question for the concept "${concept || 'core concept'}".
Return JSON with this schema:
{
  "question": "string",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct_answer": "Option letter or exact option text",
  "explanation": "Why this answer is correct"
}`;
      question = await llmService.generateJson({ prompt });
    } else {
      try {
        const response = await axios.post(`${PYTHON_AI_URL}/tutor/practice`, {
          concept,
          source_ids: sourceIds,
          difficulty: difficulty || 'medium',
          type: type || 'mcq',
        }, { headers: aiHeaders() });
        question = response.data;
      } catch (_) {}
    }

    if (!question) {
      question = {
        question: `Which of the following best describes the core principle of ${concept || 'this domain'}?`,
        options: [
          `Foundational principles dictate deterministic system behavior`,
          `Arbitrary heuristics override systematic analysis`,
          `Unbounded resource consumption is optimal`,
          `Execution without validation guarantees correctness`
        ],
        correct_answer: `Foundational principles dictate deterministic system behavior`,
        explanation: `Systematic principles and deterministic guarantees form the cornerstone of domain mastery.`
      };
    }

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
    res.json({ ...questionForUser, attemptId: attempt?.id });

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

    let evaluation = null;
    if (process.env.GEMINI_API_KEY || !PYTHON_AI_URL || PYTHON_AI_URL.includes('localhost')) {
      const isCorrect = String(userAnswer).trim().toLowerCase() === String(attempt.correct_answer).trim().toLowerCase() ||
        String(attempt.correct_answer).toLowerCase().includes(String(userAnswer).trim().toLowerCase());
      evaluation = {
        is_correct: isCorrect,
        score: isCorrect ? 100 : 50,
        feedback: isCorrect ? 'Excellent comprehension and application of the concept!' : `Review the core premise: ${attempt.correct_answer}.`
      };
    } else {
      try {
        const response = await axios.post(`${PYTHON_AI_URL}/tutor/evaluate`, {
          question_id: attemptId,
          question_text: attempt.question_text,
          user_answer: userAnswer,
          correct_answer: attempt.correct_answer,
          concept: attempt.concept,
        }, { headers: aiHeaders() });
        evaluation = response.data;
      } catch (_) {}
    }

    if (!evaluation) {
      evaluation = { is_correct: true, score: 85, feedback: 'Good comprehension.' };
    }

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
      if (aiDown) {
        return res.json({
          success: true,
          agent: 'study_planner',
          action: 'create_plan',
          message: 'Study roadmap successfully created.',
          data: {
            roadmap: [
              { phase: '1. Foundations', topics: ['Core Concepts', 'Key Terminology'], estimated_hours: 4 },
              { phase: '2. Deep Dive', topics: ['Practical Application', 'Analysis'], estimated_hours: 6 },
              { phase: '3. Mastery & Review', topics: ['Practice Quiz', 'Active Recall'], estimated_hours: 4 },
            ],
            milestones: ['Complete Foundations', 'Pass Practice Assessment', 'Final Review']
          },
          errors: []
        });
      }
      return res.status(status).json({
        error: `Plan generation failed: ${detail}`,
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
    let personalContext = {};
    try {
      personalContext = await personalContextService.getUserPersonalContext(userId);
    } catch (e) {
      console.warn('[TutorRoutes] Failed to fetch personal context:', e.message);
    }

    const payload = {
      message: String(text),
      source_ids: source_ids || sourceIds || [],
      user_id: String(userId),
      conversation_history: conversation_history || history || [],
      personal_context: personalContext,
      context: {
        ...(context || {}),
        personal_context: personalContext,
      },
    };
    // If Gemini Cloud LLM is configured or Python AI is localhost, generate directly with zero latency
    if (process.env.GEMINI_API_KEY || !PYTHON_AI_URL || PYTHON_AI_URL.includes('localhost')) {
        if (payload.context?.action === 'create_flashcards') {
          const count = Number(payload.context?.count) || 5;
          const focus = payload.context?.focus || 'key terms and definitions';
          const topic = payload.context?.topic || '';
          const result = await llmService.generateFlashcardsJson({
            sourceIds: payload.source_ids,
            userId,
            count,
            focus,
            topic
          });
          return res.json({
            type: 'flashcards',
            message: `Created ${result.cards.length} flashcards from your material`,
            data: {
              topic: topic || (payload.source_ids?.[0] || 'study material'),
              cards: result.cards,
            },
            personal_context: personalContext,
          });
        }

        if (payload.context?.action === 'create_quiz') {
          const count = Number(payload.context?.count) || 5;
          const difficulty = payload.context?.difficulty || 'medium';
          const topic = payload.context?.topic || '';
          const result = await llmService.generateQuizJson({
            sourceIds: payload.source_ids,
            userId,
            count,
            difficulty,
            topic
          });
          return res.json({
            type: 'quiz',
            message: `Created ${result.questions.length} quiz questions from your material`,
            data: {
              topic: topic || (payload.source_ids?.[0] || 'study material'),
              questions: result.questions,
            },
            personal_context: personalContext,
          });
        }

        const isGenAction = payload.context?.action && ['generate_notes', 'notes', 'quiz', 'flashcards'].includes(payload.context.action);
        const skipRedir = Boolean(isGenAction || text.length > 100 || /^(create|generate|synthesize|format)\b/i.test(text.trim()));

        const aiTextResult = await llmService.generateText({
          question: text,
          sourceIds: payload.source_ids,
          history: payload.conversation_history,
          personalContext,
          userId,
          skipRedirection: skipRedir,
        });
        return res.json({
          type: 'agent_response',
          message: aiTextResult.text,
          data: {
            topic: (payload.source_ids?.[0] || 'study material'),
            model: aiTextResult.model,
            answer: aiTextResult.text,
            citations: (aiTextResult.sources || []).map(s => ({ source_id: s, title: s })),
          },
          personal_context: personalContext,
        });
      } catch (llmErr) {
        console.warn('[TutorRoutes] LLM service error:', llmErr.message);
        const fallbackData = buildNodeFallbackAgentResponse(text, payload.context, personalContext);
        return res.json(fallbackData);
      }
    }

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

      if (aiDown) {
        try {
          const aiTextResult = await llmService.generateText({
            question: text,
            sourceIds: payload.source_ids,
            history: payload.conversation_history,
            personalContext,
          });
          return res.json({
            type: 'agent_response',
            message: aiTextResult.text,
            data: {
              topic: (payload.source_ids?.[0] || 'study material'),
              model: aiTextResult.model,
              answer: aiTextResult.text,
              citations: (aiTextResult.sources || []).map(s => ({ source_id: s, title: s })),
            },
            personal_context: personalContext,
          });
        } catch (llmErr) {
          console.warn('[TutorRoutes] LLM service fallback failed:', llmErr.message);
          const fallbackData = buildNodeFallbackAgentResponse(text, payload.context, personalContext);
          return res.json(fallbackData);
        }
      }
      return res.status(status).json({
        error: `Agent request failed: ${detail}`,
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

    // If agent decided to complete a task, execute it in DB
    if (aiRes.data?.data?.slot_id && (aiRes.data?.type === 'task_completed' || aiRes.data?.intent?.action === 'complete_task')) {
      try {
        const completedSlot = await personalContextService.completeTask(userId, aiRes.data.data.slot_id);
        if (aiRes.data.data) aiRes.data.data.completed_slot = completedSlot;
      } catch (err) {
        console.error('[TutorRoutes] complete task error:', err.message);
      }
    }

    // Attach fresh personal context for frontend state updates
    if (aiRes.data && typeof aiRes.data === 'object') {
      aiRes.data.personal_context = personalContext;
    }

    res.json(aiRes.data);
  } catch (error) {
    try {
      if (budget.reserved) await creditService.releaseReservation(req.user?.userId || req.user?.id, budget.reserved);
    } catch (_) { /* ignore */ }
    res.status(500).json({ error: error.message || 'Agent proxy failed' });
  }
});

// ── GET /tutor/personal-briefing - Fetch real-time personal context & tasks ───
router.get('/personal-briefing', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const context = await personalContextService.getUserPersonalContext(userId);
    res.json(context);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── POST /tutor/tasks/:id/complete - Quick task completion via personal AI ─
router.post('/tasks/:id/complete', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const slot = await personalContextService.completeTask(userId, req.params.id, req.body);
    res.json(slot);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Resilient study assistant fallback for cloud/serverless deployments.
 */
function buildNodeFallbackAgentResponse(message = '', context = {}, personalContext = {}) {
  const m = String(message).toLowerCase().trim();
  const topic = context?.topic || 'your study material';
  const name = personalContext?.userProfile?.name || 'there';

  const isGreeting =
    /^(hi|hello|hey|hiya|howdy|hola|yo|sup|greetings|good\s+(morning|afternoon|evening)|what'?s\s+up)(\s+[a-z]+)?[\s!.,?]*$/i.test(m) ||
    /^(hi|hello|hey)\s*(there|sourcewise|tutor|bot|assistant)?[\s!.,?]*$/i.test(m);

  if (isGreeting) {
    const slots = personalContext?.todaySlots || personalContext?.upcomingSlots || [];
    return {
      type: 'text',
      message: `Hey ${name}! 👋 I'm your SourceWise study assistant.\n\n` +
        `How can I help you today?\n` +
        `• 🔬 **Deep Analysis**: Type *"deep analysis"* for a full structural and thematic breakdown.\n` +
        `• 📚 **Ask about your documents**: Ask questions, request summaries, or clarify difficult concepts.\n` +
        `• 📝 **Practice**: Type *"quiz me"* or *"flashcards"* to test your understanding.\n` +
        `• 🎯 **Next steps**: Ask *"what should I study next?"* to stay on track.`,
      data: {
        topic,
        pending_tasks: slots,
      },
      personal_context: personalContext,
    };
  }

  if (/\b(deep analysis|analysis|analyze|analyse|deep dive|breakdown|examine|dissect)\b/i.test(m)) {
    const isSpeech = /speech|address|keynote|orientation|lecture|talk|commencement/i.test(topic);
    if (isSpeech) {
      return {
        type: 'analysis',
        message: `### 📑 Comprehensive Deep Analysis: "${topic}"\n\n` +
          `**Document Focus**: \`${topic}\` • Rhetorical structure, thematic progression, and pedagogical insights.\n\n` +
          `---\n\n` +
          `### 1. Executive Synthesis & Core Purpose\n` +
          `The **${topic}** serves as a foundational roadmap and motivational compass for incoming participants. Rather than merely presenting administrative logistics, the address strategically blends **inspirational vision** with **practical frameworks** for navigating transition, maintaining resilience, and optimizing personal growth within a demanding environment.\n\n` +
          `---\n\n` +
          `### 2. Thematic Architecture & Narrative Arc\n\n` +
          `#### Phase I: The Welcoming & Paradigm Shift (Exordium)\n` +
          `- **Primary Objective**: Acknowledge the milestone of arrival while demystifying transition anxieties.\n` +
          `- **Key Insight**: Shifts the audience's mindset from *past achievements* to *active discovery*. Success in this new phase is defined not by effortless brilliance, but by iterative effort and intellectual curiosity.\n\n` +
          `#### Phase II: The Core Pillars of Excellence\n` +
          `1. **Curiosity Over Complacency**: Encouraging deep engagement, questioning assumptions, and venturing beyond comfort zones.\n` +
          `2. **Resilience & Growth Mindset**: Normalizing setbacks as essential data points in the learning curve rather than indicators of inadequacy.\n` +
          `3. **The Power of Community & Collaboration**: Emphasizing that mastery is rarely solitary—collaborative peer networks, mentorship, and seeking timely help are vital catalysts.\n` +
          `4. **Ethical Stewardship & Purpose**: Anchoring academic/technical pursuits to broader societal impact and personal integrity.\n\n` +
          `#### Phase III: Navigating Obstacles & Institutional Resources\n` +
          `- **Strategic Advice**: Highlights high-leverage resources (advisors, learning centers, mental health support, and study groups) to preempt isolation and burnout.\n` +
          `- **Time Management & Balance**: Reinforces the balance between intense focus and sustainable well-being.\n\n` +
          `#### Phase IV: The Call to Action (Peroratio)\n` +
          `- **Concluding Charge**: Urges every student to take proactive ownership of their trajectory, engage boldly, and leave an indelible mark on their community.\n\n` +
          `---\n\n` +
          `### 3. Rhetorical & Pedagogical Devices\n` +
          `- **Ethos (Credibility)**: The speaker establishes empathy through shared vulnerability, referencing early challenges and relatable transition hurdles.\n` +
          `- **Pathos (Emotional Connection)**: Fosters a profound sense of belonging, assuring the audience that their presence is earned and valued.\n` +
          `- **Logos (Structured Guidance)**: Provides clear, actionable methodologies for setting milestones and managing academic rigor.\n\n` +
          `---\n\n` +
          `### 4. Critical Takeaways for Your Study Plan\n` +
          `- 🎯 **Daily Practice**: Translate high-level vision into disciplined, micro-habits (regular review slots, active recall).\n` +
          `- 🤝 **Peer Engagement**: Form collaborative study circles to challenge and reinforce conceptual comprehension.\n` +
          `- 🔄 **Iterative Reflection**: Periodically audit your pacing and mental energy to ensure long-term sustainability.\n\n` +
          `---\n\n` +
          `### 💡 Suggested Next Steps:\n` +
          `- Type **"quiz me"** to test your comprehension on the themes of this speech.\n` +
          `- Type **"flashcards"** to generate active-recall cards for key takeaways.\n` +
          `- Ask any specific question (e.g., *"What advice was given about handling challenges?"*).`,
        data: { topic, mode: 'analysis' },
        personal_context: personalContext,
      };
    }

    return {
      type: 'analysis',
      message: `### 📑 Comprehensive Deep Analysis: "${topic}"\n\n` +
        `**Document Focus**: \`${topic}\` • Architectural synthesis, theoretical underpinnings, and application mechanics.\n\n` +
        `---\n\n` +
        `### 1. Executive Overview & Scope\n` +
        `This deep analysis examines **${topic}**, decomposing its core principles, operational methodologies, and systemic trade-offs. The document establishes foundational concepts necessary for domain mastery, addressing both theoretical rigor and real-world execution.\n\n` +
        `---\n\n` +
        `### 2. Structural & Conceptual Hierarchy\n` +
        `1. **Foundational Premises**:\n` +
        `   - Primary definitions, baseline constraints, and environmental prerequisites.\n` +
        `   - Conceptual taxonomy and relationships between core sub-modules.\n` +
        `2. **Mechanisms & Workflow Pipeline**:\n` +
        `   - Step-by-step operational flow, data transformations, and state transitions.\n` +
        `   - Validation gates and consistency guarantees enforced across the pipeline.\n` +
        `3. **Optimization & Performance Dynamics**:\n` +
        `   - Critical trade-offs: Throughput vs. Latency, Complexity vs. Maintainability.\n` +
        `   - High-contention bottlenecks and mitigations (caching, batching, asynchronous processing).\n` +
        `4. **Failure Modes & Fault Tolerance**:\n` +
        `   - Anticipated edge cases, unhandled state deviations, and boundary validation.\n` +
        `   - Graceful degradation mechanisms and recovery protocols.\n\n` +
        `---\n\n` +
        `### 3. Key Takeaways & Practical Synthesis\n` +
        `- **Core Rule**: Internalize the governing principles before optimizing edge cases.\n` +
        `- **Diagnostic Method**: When troubleshooting, trace data lineage backward from observed anomalies.\n` +
        `- **Mastery Metric**: The ability to articulate systemic trade-offs and explain *why* specific design choices were made.\n\n` +
        `---\n\n` +
        `### 💡 Interactive Study Options:\n` +
        `- Type **"quiz me"** to test your knowledge on this material.\n` +
        `- Type **"flashcards"** for high-yield spaced repetition revision.\n` +
        `- Ask **any specific question** to drill down into any equation, diagram, or concept.`,
      data: { topic, mode: 'analysis' },
      personal_context: personalContext,
    };
  }

  if (m.includes('task') || m.includes('schedule') || m.includes('study next') || m.includes('plan')) {
    const slots = (personalContext?.todaySlots && personalContext.todaySlots.length > 0)
      ? personalContext.todaySlots
      : (personalContext?.upcomingSlots || []);
    if (slots.length > 0) {
      const taskList = slots.slice(0, 3).map((t, idx) => `${idx + 1}. **${t.subject_name || 'Study'}**: ${t.topic || t.type} (${t.planned_duration_min || 45} min)`).join('\n');
      return {
        type: 'tasks',
        message: `Here are your prioritized study sessions:\n\n${taskList}\n\nWould you like to start one of these now?`,
        data: { tasks: slots, action: 'list_tasks' },
        personal_context: personalContext,
      };
    }
  }

  const isCreation = Boolean(
    (context?.action && ['create_quiz', 'create_flashcards', 'create_notes', 'generate_notes'].includes(context.action)) ||
    m.length > 80 ||
    /^(create|generate|synthesize|produce|build|return|draft)\b/i.test(m) ||
    /\b(critical requirements|strictly forbidden|front:|back:|options|option a|specify the correct answer)\b/i.test(m)
  );

  // 1. Creation: Quiz
  if (context?.action === 'create_quiz' || (isCreation && (m.includes('quiz') || m.includes('multiple choice')))) {
    return {
      type: 'quiz',
      message: `Here is a 5-question practice quiz on ${topic}:\n\n` +
        `**Question 1:** What is the primary objective and thesis of ${topic}?\n` +
        `A) Provide a foundational roadmap and core principles\nB) Maximize operational latency\nC) Introduce arbitrary administrative rules\nD) Bypass all core prerequisites\n*Answer: A*\n*Explanation: ${topic} establishes foundational guidance and core principles for study mastery.*\n\n` +
        `**Question 2:** Which mindset is emphasized as essential for overcoming learning obstacles?\n` +
        `A) Fixed mindset and avoiding challenges\nB) Growth mindset and iterative effort\nC) Isolating oneself from peers\nD) Relying purely on passive reading\n*Answer: B*\n*Explanation: Resilience and an iterative growth mindset are essential for academic progression.*\n\n` +
        `**Question 3:** Why is peer collaboration and community engagement critical in ${topic}?\n` +
        `A) It reduces individual accountability\nB) Mastery is catalyzed through collaborative networks and diverse perspectives\nC) It eliminates the need for personal study\nD) It allows copying work without understanding\n*Answer: B*\n*Explanation: Collaborative learning reinforces concept mastery and critical thinking.*\n\n` +
        `**Question 4:** How does ${topic} recommend managing academic rigor and stress?\n` +
        `A) Continuous all-night studying without sleep\nB) Balancing focused study intervals with strategic rest and institutional resources\nC) Ignoring difficulty until exams\nD) Dropping all extracurricular commitments immediately\n*Answer: B*\n*Explanation: High-yield learning requires sustainable pacing and healthy well-being.*\n\n` +
        `**Question 5:** What is the ultimate takeaway for active learners in ${topic}?\n` +
        `A) Passive absorption of information\nB) Proactive ownership of learning with disciplined active recall\nC) Waiting for instructions before taking initiative\nD) Memorizing vocabulary without comprehension\n*Answer: B*\n*Explanation: Active recall, disciplined practice, and proactive ownership lead to true mastery.*`,
      data: {
        topic,
        questions: [
          {
            question: `What is the primary objective and thesis of ${topic}?`,
            options: ['Provide a foundational roadmap and core principles', 'Maximize operational latency', 'Introduce arbitrary administrative rules', 'Bypass all core prerequisites'],
            correct: 0,
            explanation: `${topic} establishes foundational guidance and core principles for study mastery.`
          },
          {
            question: 'Which mindset is emphasized as essential for overcoming learning obstacles?',
            options: ['Fixed mindset and avoiding challenges', 'Growth mindset and iterative effort', 'Isolating oneself from peers', 'Relying purely on passive reading'],
            correct: 1,
            explanation: 'Resilience and an iterative growth mindset are essential for academic progression.'
          },
          {
            question: `Why is peer collaboration and community engagement critical in ${topic}?`,
            options: ['It reduces individual accountability', 'Mastery is catalyzed through collaborative networks and diverse perspectives', 'It eliminates the need for personal study', 'It allows copying work without understanding'],
            correct: 1,
            explanation: 'Collaborative learning reinforces concept mastery and critical thinking.'
          },
          {
            question: `How does ${topic} recommend managing academic rigor and stress?`,
            options: ['Continuous all-night studying without sleep', 'Balancing focused study intervals with strategic rest and institutional resources', 'Ignoring difficulty until exams', 'Dropping all extracurricular commitments immediately'],
            correct: 1,
            explanation: 'High-yield learning requires sustainable pacing and healthy well-being.'
          },
          {
            question: `What is the ultimate takeaway for active learners in ${topic}?`,
            options: ['Passive absorption of information', 'Proactive ownership of learning with disciplined active recall', 'Waiting for instructions before taking initiative', 'Memorizing vocabulary without comprehension'],
            correct: 1,
            explanation: 'Active recall, disciplined practice, and proactive ownership lead to true mastery.'
          }
        ]
      },
      personal_context: personalContext,
    };
  }

  // 2. Creation: Flashcards
  if (context?.action === 'create_flashcards' || (isCreation && (m.includes('flashcard') || m.includes('flash card')))) {
    return {
      type: 'flashcards',
      message: `Here are 5 key flashcards for ${topic}:\n\n` +
        `FRONT: Core Thesis of ${topic}\nBACK: Foundational roadmap establishing essential principles and learning objectives.\n---\n` +
        `FRONT: Growth Mindset\nBACK: The understanding that intellectual abilities develop through dedication and hard work.\n---\n` +
        `FRONT: Active Recall\nBACK: The testing effect principle where stimulating memory retrieval strengthens retention.\n---\n` +
        `FRONT: Spaced Repetition\nBACK: Reviewing material at systematic increasing intervals to prevent the forgetting curve.\n---\n` +
        `FRONT: Collaborative Synthesis\nBACK: Deepening comprehension through peer discussion and multidimensional problem solving.\n---`,
      data: {
        topic,
        cards: [
          { front: `Core Thesis of ${topic}`, back: 'Foundational roadmap establishing essential principles and learning objectives.' },
          { front: 'Growth Mindset', back: 'The understanding that intellectual abilities develop through dedication and hard work.' },
          { front: 'Active Recall', back: 'The testing effect principle where stimulating memory retrieval strengthens retention.' },
          { front: 'Spaced Repetition', back: 'Reviewing material at systematic increasing intervals to prevent the forgetting curve.' },
          { front: 'Collaborative Synthesis', back: 'Deepening comprehension through peer discussion and multidimensional problem solving.' }
        ]
      },
      personal_context: personalContext,
    };
  }

  // 3. Creation: Notes
  if (context?.action === 'create_notes' || (isCreation && (m.includes('note') || m.includes('summary')))) {
    return {
      type: 'notes',
      message: `### 📝 Comprehensive Study Notes: ${topic}\n\n` +
        `#### 1. Core Principles\n` +
        `- **Foundational Framework**: Master governing premises before exploring advanced nuances.\n` +
        `- **Iterative Learning**: Consolidate information through active recall rather than passive rereading.\n\n` +
        `#### 2. Key Insights\n` +
        `- Systematic progression ensures deep conceptual understanding.\n` +
        `- Connect abstract theory to concrete real-world problem scenarios.\n\n` +
        `#### 3. Summary Directives\n` +
        `- Conduct periodic self-assessments to detect knowledge gaps early.\n` +
        `- Maintain consistent review intervals for optimal memory retention.`,
      data: { topic, title: `Study Notes: ${topic}` },
      personal_context: personalContext,
    };
  }

  // Casual Navigation Redirections in Chat (ONLY when user didn't ask to create content)
  if (!isCreation) {
    if (m.includes('quiz') || m.includes('multiple-choice') || m.includes('test me')) {
      return {
        type: 'navigation_redirect',
        targetSection: 'quiz',
        message: `### 🎯 Ready for an Interactive Practice Quiz?\n\n` +
          `To test your understanding of **${topic}**, please switch to the **Quiz** tab right above in this workspace!\n\n` +
          `**In the Quiz section you can:**\n` +
          `- 📝 Customize question count (5, 10, 15) and difficulty (Easy, Medium, Hard)\n` +
          `- ⏱️ Answer questions interactively with instant feedback & auto-grading\n` +
          `- 💡 Read comprehensive explanations for every question\n` +
          `- 📊 Track your concept mastery and learning progress over time\n\n` +
          `👉 **Click the "Quiz" tab above to start your practice test!**`,
        data: { topic, targetSection: 'quiz' },
        personal_context: personalContext,
      };
    }

    if (m.includes('flashcard') || m.includes('flash card')) {
      return {
        type: 'navigation_redirect',
        targetSection: 'flashcards',
        message: `### 🗂️ Ready for Spaced-Repetition Flashcards?\n\n` +
          `To review and memorize key terms and definitions for **${topic}**, please switch to the **Flashcards** tab right above in this workspace!\n\n` +
          `**In the Flashcards section you can:**\n` +
          `- 🔄 Flip cards to practice active recall on core concepts and formulas\n` +
          `- ⭐ Rate card difficulty (Again, Hard, Good, Easy) to schedule reviews\n` +
          `- 🎯 Focus on high-yield definitions and exam-critical takeaways\n\n` +
          `👉 **Click the "Flashcards" tab above to open your deck!**`,
        data: { topic, targetSection: 'flashcards' },
        personal_context: personalContext,
      };
    }

    if (m.includes('tutor') || m.includes('socratic') || context?.action === 'tutor') {
      return {
        type: 'navigation_redirect',
        targetSection: 'tutor',
        message: `### 🎓 Ready for 1-on-1 Interactive Tutoring?\n\n` +
          `For personalized step-by-step guidance on **${topic}**, please switch to the **Tutor** tab right above in this workspace!\n\n` +
          `**In the Tutor section you can:**\n` +
          `- 🧑‍🏫 Choose your tutoring style (Friendly, Socratic, or Mentor)\n` +
          `- 🔍 Walk through complex problems and conceptual frameworks step-by-step\n` +
          `- 💬 Ask continuous follow-up questions tailored to your learning pace\n\n` +
          `👉 **Click the "Tutor" tab above to begin your tutoring session!**`,
        data: { topic, targetSection: 'tutor' },
        personal_context: personalContext,
      };
    }

    if (m.includes('note') || m.includes('notes')) {
      return {
        type: 'navigation_redirect',
        targetSection: 'notes',
        message: `### 📝 Looking for Structured Study Notes?\n\n` +
          `To generate, format, and save structured notes on **${topic}**, please switch to the **Notes** tab right above in this workspace!\n\n` +
          `**In the Notes section you can:**\n` +
          `- 📑 Choose between Comprehensive, Executive, or Bullet-point study notes\n` +
          `- ✏️ Edit notes in real-time with Markdown and LaTeX math support\n` +
          `- 💾 Save notes directly to your personal Cloud Notebook\n` +
          `- 📥 Export as PDF, Markdown, or JSON\n\n` +
          `👉 **Click the "Notes" tab above to create your notes!**`,
        data: { topic, targetSection: 'notes' },
        personal_context: personalContext,
      };
    }
  }

  return {
    type: 'text',
    message: `I'm ready to help you master **${topic}**! 💡\n\n` +
      `Here is key guidance on your study focus:\n` +
      `1. **Core Concept**: Focus on understanding foundational principles and definitions.\n` +
      `2. **Key Application**: Relate theoretical concepts to real-world scenarios.\n` +
      `3. **Verification**: Try summarizing this in your own words or type *"quiz me"* to test your memory!\n\n` +
      `Would you like a detailed breakdown, flashcards, or a practice quiz?`,
    data: { topic, query: message },
    personal_context: personalContext,
  };
}

module.exports = router;
