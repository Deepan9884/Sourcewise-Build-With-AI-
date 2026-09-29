/**
 * Events Routes — SSE stream for real-time notifications (replans, conflicts).
 * GET /events — requires JWT (query ?token= or Authorization header).
 */
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Lightweight in-memory pub/sub. For multi-instance deployments, replace
// with Redis/pg_notify. Exported emitter lets services push events.
const clients = new Map(); // userId -> Set(res)

function pushToUser(userId, payload) {
  const set = clients.get(userId);
  if (!set) return 0;
  let n = 0;
  for (const res of set) {
    try {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
      n += 1;
    } catch (e) { /* dead client */ }
  }
  return n;
}

function resolveUserId(req) {
  const token = (req.headers.authorization || '').split(' ')[1] || req.query.token;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.userId || decoded.id || null;
  } catch (e) {
    return null;
  }
}

router.get('/', (req, res) => {
  const userId = resolveUserId(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write(`data: ${JSON.stringify({ type: 'connected', userId })}\n\n`);

  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId).add(res);

  const heartbeat = setInterval(() => {
    try { res.write(': ping\n\n'); } catch (e) { /* ignore */ }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    const set = clients.get(userId);
    if (set) {
      set.delete(res);
      if (!set.size) clients.delete(userId);
    }
  });
});

module.exports = router;
module.exports.pushToUser = pushToUser;
