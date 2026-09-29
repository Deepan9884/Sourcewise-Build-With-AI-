/**
 * Dashboard overview regression test.
 * Guards the topicsTotal ReferenceError that 500'd the endpoint
 * (every variable used in the handler must be defined).
 */
const request = require('supertest');
const express = require('express');

jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn() }));

const mockList = { data: [] };
// Generic thenable chain: any method returns the proxy; awaiting resolves rows.
const mockChain = () => {
  const target = {
    single: jest.fn(async () => ({ data: null, error: null })),
    maybeSingle: jest.fn(async () => ({ data: null, error: null })),
  };
  const proxy = new Proxy(target, {
    get: (t, p) => {
      if (p === 'then') return (resolve) => resolve(mockList);
      if (typeof p === 'symbol') return undefined;
      if (p in t) return t[p];
      return jest.fn(() => proxy);
    },
  });
  return proxy;
};

jest.mock('../utils/supabase', () => ({
  from: jest.fn(() => mockChain()),
}));

jest.mock('../middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { _id: 'u1', userId: 'u1', id: 'u1' };
    next();
  },
}));

const dashboardRoutes = require('../routes/dashboard-v2.routes');

describe('GET /dashboard/overview', () => {
  let app;
  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/dashboard', dashboardRoutes);
  });

  it('returns 200 with masteryPercentage (no ReferenceError)', async () => {
    const res = await request(app).get('/dashboard/overview').set('Authorization', 'Bearer t');
    if (res.status !== 200) console.log('OVERVIEW_ERROR_BODY:', JSON.stringify(res.body));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('masteryPercentage');
    expect(res.body).toHaveProperty('topicsTotal');
    expect(res.body).toHaveProperty('streak');
  });
});
