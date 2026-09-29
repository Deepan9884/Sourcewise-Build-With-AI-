const request = require('supertest');
// index.js listens on require — pin a test-only port so the suite passes
// even when a dev server holds :4000.
process.env.PORT = '14000';
const app = require('../index');

describe('Metrics + observability', () => {
  it('GET /metrics returns JSON with counters', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('sourcewise-node-api');
    expect(typeof res.body.totalRequests).toBe('number');
    expect(res.body.memory).toBeDefined();
  });

  it('GET /metrics/prom returns Prometheus text', async () => {
    const res = await request(app).get('/metrics/prom');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(res.text).toMatch(/http_requests_total/);
  });

  it('sets X-Request-Id on responses', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('404 handler still works with request id', async () => {
    const res = await request(app).get('/nope-missing-route-xyz');
    expect(res.status).toBe(404);
    expect(res.headers['x-request-id']).toBeDefined();
  });
});
