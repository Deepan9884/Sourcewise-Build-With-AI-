/**
 * Mood Routes — hybrid mood tracking.
 * POST /mood/checkin | GET /mood/history | GET /mood/current | GET /mood/insights
 */
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const moodService = require('../services/moodService');

router.use(authenticate);

router.post('/checkin', async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id || req.user._id;
    const data = await moodService.recordCheckin(userId, req.body);
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/history', async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id || req.user._id;
    const hours = parseInt(req.query.hours, 10) || 24 * 7;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const data = await moodService.getRecentMoods(userId, hours, limit);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/current', async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id || req.user._id;
    const state = await moodService.getCurrentMoodState(userId);
    res.json(state);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/insights', async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id || req.user._id;
    const days = parseInt(req.query.days, 10) || 14;
    const [corr, current] = await Promise.all([
      moodService.correlateMoodWithPerformance(userId, days),
      moodService.getCurrentMoodState(userId),
    ]);
    res.json({ ...corr, currentMood: current.dominantMood, trend: current.trend });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/infer', async (req, res) => {
  try {
    const result = moodService.inferMoodFromBehavior(req.body || {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
