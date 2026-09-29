/**
 * Metrics Routes — lightweight observability without external deps.
 * GET /metrics        → JSON: uptime, memory, request counters, per-route stats
 * GET /metrics/prom   → Prometheus text exposition (http_requests_total, http_errors_total, http_duration_avg_ms)
 */
const express = require('express');

const router = express.Router();
const { getStats } = require('../middleware/requestLogger');

router.get('/', (req, res) => {
  res.json({
    service: 'sourcewise-node-api',
    version: '11.0.0',
    timestamp: new Date().toISOString(),
    ...getStats(),
  });
});

router.get('/prom', (req, res) => {
  const s = getStats();
  const lines = [
    '# HELP http_requests_total Total HTTP requests',
    '# TYPE http_requests_total counter',
    `http_requests_total ${s.totalRequests}`,
  ];
  for (const [route, v] of Object.entries(s.routes)) {
    const safe = route.replace(/[^a-zA-Z0-9_:\/]/g, '_');
    lines.push(`http_requests_total{route="${safe}"} ${v.count}`);
    lines.push(`http_errors_total{route="${safe}"} ${v.errors}`);
    lines.push(`http_duration_avg_ms{route="${safe}"} ${v.avgMs}`);
  }
  lines.push('# HELP process_uptime_seconds Node uptime');
  lines.push('# TYPE process_uptime_seconds gauge');
  lines.push(`process_uptime_seconds ${Math.round(process.uptime())}`);
  res.set('Content-Type', 'text/plain; version=0.0.4');
  res.send(lines.join('\n') + '\n');
});

module.exports = router;
