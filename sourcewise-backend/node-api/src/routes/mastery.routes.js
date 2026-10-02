const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const supabase = require('../utils/supabase');

const demoService = require('../services/demoAccountService');

router.use(authenticate);

// GET /mastery - Get all concept mastery
router.get('/', async (req, res) => {
  try {
    if (demoService.isDemoUser(req)) {
      return res.json(demoService.getMastery());
    }
    const { data, error } = await supabase
      .from('concept_mastery')
      .select('*')
      .eq('user_id', req.user._id)
      .order('mastery_score', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /mastery - Update or create concept mastery
router.post('/', async (req, res) => {
  try {
    const { concept, score, source_id, correct } = req.body;
    const userId = req.user._id;

    if (!concept || score === undefined) {
      return res.status(400).json({ error: 'concept and score are required' });
    }

    // Get existing mastery
    const { data: existing } = await supabase
      .from('concept_mastery')
      .select('*')
      .eq('user_id', userId)
      .eq('concept', concept)
      .single();

    const totalAttempts = (existing?.total_attempts || 0) + 1;
    const correctAttempts = (existing?.correct_attempts || 0) + (correct ? 1 : 0);
    const masteryScore = Math.round((correctAttempts / totalAttempts) * 100);

    // Calculate level
    let level = 'novice';
    if (masteryScore >= 90 && totalAttempts >= 5) level = 'mastery';
    else if (masteryScore >= 75 && totalAttempts >= 3) level = 'proficient';
    else if (masteryScore >= 50) level = 'developing';

    // Calculate next review date (spaced repetition)
    let intervalDays = 1;
    if (masteryScore > 90) intervalDays = 7;
    else if (masteryScore > 75) intervalDays = 3;
    else intervalDays = 1;

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + intervalDays);

    const { data, error } = await supabase
      .from('concept_mastery')
      .upsert({
        user_id: userId,
        concept,
        source_id: source_id || existing?.source_id,
        mastery_score: masteryScore,
        confidence_score: Math.min(100, totalAttempts * 10),
        total_attempts: totalAttempts,
        correct_attempts: correctAttempts,
        last_assessed: new Date().toISOString(),
        next_review_date: nextReview.toISOString(),
        interval_days: intervalDays,
        level,
      }, { onConflict: 'user_id,concept' })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /mastery/gaps - Get knowledge gaps
router.get('/gaps', async (req, res) => {
  try {
    if (demoService.isDemoUser(req)) {
      return res.json(demoService.getKnowledgeGaps().filter(g => g.status === 'open'));
    }
    const { data, error } = await supabase
      .from('knowledge_gaps')
      .select('*')
      .eq('user_id', req.user._id)
      .eq('status', 'open')
      .order('severity', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /mastery/gaps - Report a knowledge gap
router.post('/gaps', async (req, res) => {
  try {
    const { concept, severity, source_id } = req.body;
    const userId = req.user._id;

    if (!concept) {
      return res.status(400).json({ error: 'concept is required' });
    }

    const { data, error } = await supabase
      .from('knowledge_gaps')
      .insert({
        user_id: userId,
        concept,
        severity: severity || 3,
        source_id: source_id || null,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /mastery/gaps/:id - Resolve a knowledge gap
router.patch('/gaps/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const { data, error } = await supabase
      .from('knowledge_gaps')
      .update({
        status: status || 'resolved',
        resolved_at: status === 'resolved' ? new Date().toISOString() : null,
      })
      .eq('id', req.params.id)
      .eq('user_id', req.user._id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
