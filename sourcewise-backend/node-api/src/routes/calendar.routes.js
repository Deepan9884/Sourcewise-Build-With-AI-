/**
 * Calendar Routes — Google Calendar OAuth + sync + conflicts.
 * GET /calendar/auth | GET /calendar/callback | POST /calendar/sync
 * GET /calendar/events | POST /calendar/conflicts | GET /calendar/status
 */
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const calendarService = require('../services/calendarService');

router.get('/auth', authenticate, async (req, res) => {
  try {
    if (!calendarService.isConfigured()) {
      return res.status(503).json({ error: 'Google Calendar not configured. Set GOOGLE_CLIENT_ID/SECRET (see .env.example).' });
    }
    const userId = req.user.userId || req.user.id || req.user._id;
    const url = calendarService.getAuthUrl(userId);
    res.json({ authUrl: url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// OAuth redirect (Google calls this; user must be logged in via state, so we
// accept state=userId and skip JWT here — then redirect to frontend).
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) return res.status(400).send('Missing code');
    // state carries userId from /auth; validate by attempting connect
    await calendarService.connectGoogleCalendar(state, code);
    const origin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
    res.redirect(`${origin}/planner-v2?calendar=connected`);
  } catch (error) {
    const origin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
    res.redirect(`${origin}/planner-v2?calendar=error&msg=${encodeURIComponent(error.message)}`);
  }
});

router.use(authenticate);

router.post('/sync', async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id || req.user._id;
    const result = await calendarService.syncCalendarEvents(userId, req.body || {});
    res.json(result);
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

const demoService = require('../services/demoAccountService');

router.get('/events', async (req, res) => {
  try {
    if (demoService.isDemoUser(req)) {
      return res.json(demoService.getCalendarEvents());
    }
    const userId = req.user.userId || req.user.id || req.user._id;
    const data = await calendarService.getEvents(userId, { from: req.query.from, to: req.query.to });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/conflicts', async (req, res) => {
  try {
    if (demoService.isDemoUser(req)) {
      return res.json({ conflicts: [], count: 0 });
    }
    const userId = req.user.userId || req.user.id || req.user._id;
    const conflicts = await calendarService.getConflicts(userId, req.body.slots || []);
    res.json({ conflicts, count: conflicts.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/status', async (req, res) => {
  try {
    if (demoService.isDemoUser(req)) {
      return res.json(demoService.getCalendarStatus());
    }
    const userId = req.user.userId || req.user.id || req.user._id;
    const integ = await calendarService.getIntegration(userId);
    res.json({
      connected: !!integ?.is_active,
      lastSync: integ?.last_sync || null,
      configured: calendarService.isConfigured(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
