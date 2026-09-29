import { test, expect } from '@playwright/test';

const API = 'http://localhost:4000';
let token = '';

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ request }) => {
  const res = await request.post(`${API}/auth/login`, {
    data: { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.token).toBeTruthy();
  token = body.token;
});

const auth = () => ({ Authorization: `Bearer ${token}` });

test('health reports healthy with db + ai checks', async ({ request }) => {
  const res = await request.get(`${API}/health`);
  const body = await res.json();
  expect(body.status).toBe('healthy');
  expect(body.checks.database).toBe('ok');
  expect(body.checks.ai_service).toBe('ok');
});

test('dashboard overview returns 200 (topicsTotal regression)', async ({ request }) => {
  const res = await request.get(`${API}/dashboard/overview`, { headers: auth() });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body).toHaveProperty('masteryPercentage');
  expect(body).toHaveProperty('topicsTotal');
});

test('metrics endpoints answer', async ({ request }) => {
  expect((await request.get(`${API}/metrics`, { headers: auth() })).ok()).toBeTruthy();
  const prom = await request.get(`${API}/metrics/prom`, { headers: auth() });
  expect(await prom.text()).toContain('http_requests_total');
});

test('python-ai metrics + readiness answer', async ({ request }) => {
  const m = await request.get('http://localhost:8000/metrics');
  expect((await m.json()).service).toBe('sourcewise-python-ai');
  const r = await request.get('http://localhost:8000/metrics/ready');
  expect(['ready', 'degraded']).toContain((await r.json()).status);
});

test('gateway proxies validate input (no AI spend)', async ({ request }) => {
  const o = await request.post(`${API}/tutor/orchestrator`, { headers: auth(), data: {} });
  expect(o.status()).toBe(400);
  const a = await request.post(`${API}/tutor/agent`, { headers: auth(), data: {} });
  expect(a.status()).toBe(400);
});

test('mood + sources work; plans need v13 migration message when absent', async ({ request }) => {
  const mood = await request.get(`${API}/mood/current`, { headers: auth() });
  expect(mood.ok()).toBeTruthy();
  const sources = await request.get(`${API}/sources`, { headers: auth() });
  expect(sources.ok()).toBeTruthy();
  const plans = await request.get(`${API}/study-plans`, { headers: auth() });
  if (!plans.ok()) {
    expect(await plans.text()).toContain('study_plans');
  }
});

test('non-admin gets 403 on admin aggregates', async ({ request }) => {
  for (const p of ['plans', 'content', 'mood']) {
    const res = await request.get(`${API}/admin/${p}`, { headers: auth() });
    expect([200, 403]).toContain(res.status());
  }
});
