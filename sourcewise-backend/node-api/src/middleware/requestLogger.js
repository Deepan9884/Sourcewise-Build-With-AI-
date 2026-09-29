/**
 * Request correlation + structured access logging.
 * - Assigns req.id (X-Request-Id passthrough or random)
 * - Logs start (debug) and finish (info) with method/route/status/duration
 * - Exposes counters for /metrics (in-memory, no deps)
 */
const crypto = require('crypto');
const logger = require('../utils/logger');

const stats = {
  startedAt: Date.now(),
  totalRequests: 0,
  byRoute: {}, // "GET /dashboard" -> { count, errors, totalMs }
};

function requestLogger(req, res, next) {
  const id = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = id;
  res.setHeader('X-Request-Id', id);
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durMs = Number(process.hrtime.bigint() - start) / 1e6;
    const route = `${req.method} ${req.baseUrl || ''}${req.route?.path || req.path}`;
    stats.totalRequests += 1;
    const e = stats.byRoute[route] || (stats.byRoute[route] = { count: 0, errors: 0, totalMs: 0 });
    e.count += 1;
    e.totalMs += durMs;
    if (res.statusCode >= 500) e.errors += 1;

    logger.info('http.request', {
      requestId: id,
      method: req.method,
      path: req.originalUrl,
      route,
      status: res.statusCode,
      durationMs: Math.round(durMs * 100) / 100,
      userId: req.user?.userId || req.user?.id,
    });
  });
  next();
}

function getStats() {
  const routes = Object.fromEntries(
    Object.entries(stats.byRoute).map(([k, v]) => [k, { ...v, avgMs: v.count ? Math.round((v.totalMs / v.count) * 100) / 100 : 0 }])
  );
  return {
    uptimeSecs: Math.round((Date.now() - stats.startedAt) / 1000),
    totalRequests: stats.totalRequests,
    routes,
    memory: process.memoryUsage(),
  };
}

module.exports = { requestLogger, getStats };
