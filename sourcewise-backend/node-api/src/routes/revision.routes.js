const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const supabase = require('../utils/supabase');

const demoService = require('../services/demoAccountService');

router.use(authenticate);

// GET /revision/today - Get today's review items
router.get('/today', async (req, res) => {
  try {
    if (demoService.isDemoUser(req)) {
      return res.json(demoService.getReviewsToday());
    }
    const userId = req.user._id;
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('review_schedule')
      .select('*')
      .eq('user_id', userId)
      .lte('next_review_date', today)
      .order('next_review_date', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /revision/schedule - Schedule a concept for review
router.post('/schedule', async (req, res) => {
  try {
    const { concept, source_id, mastery_score } = req.body;
    const userId = req.user._id;

    if (!concept) {
      return res.status(400).json({ error: 'concept is required' });
    }

    // Calculate initial interval based on mastery
    let intervalDays = 1;
    if (mastery_score > 90) intervalDays = 7;
    else if (mastery_score > 75) intervalDays = 3;
    else intervalDays = 1;

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + intervalDays);

    // Upsert review schedule
    const { data, error } = await supabase
      .from('review_schedule')
      .upsert({
        user_id: userId,
        concept,
        source_id: source_id || null,
        mastery_score: mastery_score || 0,
        next_review_date: nextReview.toISOString(),
        interval_days: intervalDays,
        last_reviewed: new Date().toISOString(),
        review_count: 1,
      }, { onConflict: 'user_id,concept' })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /revision/complete - Mark a review as complete
router.post('/complete', async (req, res) => {
  try {
    const { concept, score } = req.body;
    const userId = req.user._id;

    if (!concept) {
      return res.status(400).json({ error: 'concept is required' });
    }

    if (demoService.isDemoUser(req)) {
      return res.json(demoService.completeReview(concept, score || 90));
    }

    // Get current review schedule
    const { data: current, error: fetchError } = await supabase
      .from('review_schedule')
      .select('*')
      .eq('user_id', userId)
      .eq('concept', concept)
      .single();

    if (fetchError || !current) {
      return res.status(404).json({ error: 'Review schedule not found' });
    }

    // Calculate new interval based on score (spaced repetition algorithm)
    let newInterval = current.interval_days;
    if (score > 90) {
      newInterval = Math.min(current.interval_days * 2, 30); // Double, max 30 days
    } else if (score > 75) {
      newInterval = Math.min(current.interval_days + 1, 14); // Add 1, max 14 days
    } else {
      newInterval = 1; // Reset to 1 day
    }

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + newInterval);

    const { data, error } = await supabase
      .from('review_schedule')
      .update({
        mastery_score: score,
        next_review_date: nextReview.toISOString(),
        interval_days: newInterval,
        last_reviewed: new Date().toISOString(),
        review_count: current.review_count + 1,
      })
      .eq('id', current.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /revision/upcoming - Get upcoming reviews
router.get('/upcoming', async (req, res) => {
  try {
    if (demoService.isDemoUser(req)) {
      const today = new Date().toISOString().split('T')[0];
      return res.json(demoService.getReviewSchedule().filter(r => r.next_review_date > today));
    }
    const userId = req.user._id;
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('review_schedule')
      .select('*')
      .eq('user_id', userId)
      .gt('next_review_date', today)
      .lte('next_review_date', nextWeek)
      .order('next_review_date', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
