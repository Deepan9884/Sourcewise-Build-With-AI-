/**
 * Learning Profile Routes - User learning data and knowledge maps
 */
const express = require('express');
const router = express.Router();
const axios = require('axios');
const supabase = require('../utils/supabase');
const { authenticate } = require('../middleware/auth');

const PYTHON_AI_URL = process.env.PYTHON_AI_URL || 'http://localhost:8000';

const demoService = require('../services/demoAccountService');

// ── Helper: Get or create learning profile ────────────────────────────
async function getOrCreateProfile(userId) {
  if (userId === demoService.DEMO_USER_ID) {
    return {
      user_id: demoService.DEMO_USER_ID,
      concept_mastery: demoService.getMastery(),
      knowledge_gaps: demoService.getKnowledgeGaps(),
      preferences: {
        tutoring_mode: 'socratic',
        explanation_verbosity: 'detailed',
        preferred_explanation_styles: ['visual', 'worked-examples'],
        daily_goal_minutes: 120
      },
      study_patterns: {
        total_study_time: 3140,
        sessions_completed: 42,
        current_streak: 14,
      }
    };
  }

  let { data: profile, error: fetchError } = await supabase
    .from('learning_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  // If profile doesn't exist, create it
  if (fetchError || !profile) {
    const { data: newProfile, error: insertError } = await supabase
      .from('learning_profiles')
      .insert({ user_id: userId })
      .select()
      .single();

    if (insertError) {
      console.error('[LearningProfile] Error creating profile:', insertError.message);
      // Return a default profile if DB fails
      return {
        user_id: userId,
        concept_mastery: [],
        knowledge_gaps: [],
        preferences: {
          tutoring_mode: 'direct',
          explanation_verbosity: 'moderate',
          preferred_explanation_styles: [],
        },
        study_patterns: {
          total_study_time: 0,
          sessions_completed: 0,
          current_streak: 0,
        },
      };
    }
    profile = newProfile;
  }

  return profile;
}

// ── GET /learning-profile/me (must be before /:userId) ────────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const profile = await getOrCreateProfile(userId);
    res.json(profile);
  } catch (error) {
    console.error('[LearningProfileRoutes] Error in /me:', error);
    res.status(500).json({ error: 'Failed to fetch learning profile' });
  }
});

// ── PATCH /learning-profile/me (must be before /:userId) ──────────────
router.patch('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    const { data, error } = await supabase
      .from('learning_profiles')
      .update(req.body)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('[LearningProfileRoutes] Update error:', error.message);
      return res.status(500).json({ error: 'Failed to update learning profile' });
    }

    res.json(data);
  } catch (error) {
    console.error('[LearningProfileRoutes] Error in PATCH /me:', error);
    res.status(500).json({ error: 'Failed to update learning profile' });
  }
});

// ── GET /learning-profile/me/knowledge-map ────────────────────────────
router.get('/me/knowledge-map', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const profile = await getOrCreateProfile(userId);

    // Build knowledge map from profile
    const concepts = (profile.concept_mastery || []).map(c => ({
      id: c.concept,
      name: c.concept,
      level: c.level || 'novice',
      description: '',
    }));

    const knowledgeGaps = (profile.knowledge_gaps || []).map(g => ({
      concept: g.concept,
      severity: g.severity || 3,
    }));

    res.json({
      concepts,
      relationships: [],
      knowledgeGaps,
    });
  } catch (error) {
    console.error('[LearningProfileRoutes] Error in /me/knowledge-map:', error);
    res.status(500).json({ error: 'Failed to fetch knowledge map' });
  }
});

// ── GET /learning-profile/me/analytics ────────────────────────────────
router.get('/me/analytics', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    const { data: analytics } = await supabase
      .from('study_analytics')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);

    const profile = await getOrCreateProfile(userId);

    res.json({
      analytics: analytics || [],
      studyPatterns: profile.study_patterns || {
        total_study_time: 0,
        sessions_completed: 0,
        current_streak: 0,
      },
      summary: {
        totalStudyTime: profile.study_patterns?.total_study_time || 0,
        totalSessions: profile.study_patterns?.sessions_completed || 0,
        totalConcepts: (profile.concept_mastery || []).length,
        averageSessionLength: profile.study_patterns?.average_session_length || 0,
      },
    });
  } catch (error) {
    console.error('[LearningProfileRoutes] Error in /me/analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// ── GET /learning-profile/:userId ─────────────────────────────────────
router.get('/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const profile = await getOrCreateProfile(userId);
    res.json(profile);
  } catch (error) {
    console.error('[LearningProfileRoutes] Error:', error);
    res.status(500).json({ error: 'Failed to fetch learning profile' });
  }
});

// ── PATCH /learning-profile/:userId ───────────────────────────────────
router.patch('/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data, error } = await supabase
      .from('learning_profiles')
      .update(req.body)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('[LearningProfileRoutes] Error:', error);
    res.status(500).json({ error: 'Failed to update learning profile' });
  }
});

// ── GET /learning-profile/:userId/knowledge-map ───────────────────────
router.get('/:userId/knowledge-map', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const profile = await getOrCreateProfile(userId);
    const concepts = (profile.concept_mastery || []).map(c => ({
      id: c.concept,
      name: c.concept,
      level: c.level || 'novice',
    }));

    res.json({ concepts, relationships: [], knowledgeGaps: profile.knowledge_gaps || [] });
  } catch (error) {
    console.error('[LearningProfileRoutes] Error:', error);
    res.status(500).json({ error: 'Failed to fetch knowledge map' });
  }
});

// ── GET /learning-profile/:userId/analytics ───────────────────────────
router.get('/:userId/analytics', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data: analytics } = await supabase
      .from('study_analytics')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    res.json({
      analytics: analytics || [],
      summary: {
        totalStudyTime: 0,
        totalSessions: 0,
        totalConcepts: 0,
        averageSessionLength: 0,
      },
    });
  } catch (error) {
    console.error('[LearningProfileRoutes] Error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
