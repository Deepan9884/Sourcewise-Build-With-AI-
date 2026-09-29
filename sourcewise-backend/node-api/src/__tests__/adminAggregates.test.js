/**
 * Admin aggregate endpoints (spec §5): /admin/plans, /admin/content, /admin/mood.
 * Defensive: missing tables → zeros, never 500 on empty DB.
 */
const request = require('supertest');
const express = require('express');

const mockListRows = {};
const mockSingleRows = {};
const mockCounts = {};

function mockChainFor(table) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    single: jest.fn(async () => ({ data: mockSingleRows[table] ?? null, error: null })),
    maybeSingle: jest.fn(async () => ({ data: mockSingleRows[table] ?? null, error: null })),
  };
  chain.then = (resolve) => resolve({ data: mockListRows[table] ?? [], count: mockCounts[table] ?? null, error: null });
  return chain;
}

jest.mock('../utils/supabase', () => ({
  from: jest.fn((table) => mockChainFor(table)),
}));

jest.mock('../middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { _id: 'admin1', userId: 'admin1', id: 'admin1' };
    next();
  },
}));

jest.mock('../middleware/adminAuth', () => ({
  requireAdmin: (req, res, next) => {
    req.admin = true;
    next();
  },
}));

const adminRoutes = require('../routes/admin.routes');

describe('admin aggregates', () => {
  let app;
  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/admin', adminRoutes);
  });
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockListRows).forEach((k) => delete mockListRows[k]);
    Object.keys(mockSingleRows).forEach((k) => delete mockSingleRows[k]);
    Object.keys(mockCounts).forEach((k) => delete mockCounts[k]);
  });

  it('GET /admin/plans aggregates subjects + slot progress', async () => {
    mockListRows.study_plans = [{ id: 'p1', user_id: 'u1', name: 'Finals', status: 'active', daily_study_budget_minutes: 120, created_at: '2026-09-01' }];
    mockCounts.study_plans = 1;
    mockListRows.plan_subjects = [{ plan_id: 'p1', subject_name: 'Bio', exam_date: '2026-10-01' }];
    mockListRows.schedule_slots = [
      { plan_id: 'p1', status: 'completed', slot_type: 'study' },
      { plan_id: 'p1', status: 'pending', slot_type: 'study' },
      { plan_id: 'p1', status: 'pending', slot_type: 'break' },
    ];
    const res = await request(app).get('/admin/plans').set('Authorization', 'Bearer t');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ name: 'Finals', subjects: 1, totalSlots: 2, completedSlots: 1, pacePct: 50 });
    expect(res.body.pagination.total).toBe(1);
  });

  it('GET /admin/plans returns empty list when tables missing', async () => {
    const res = await request(app).get('/admin/plans').set('Authorization', 'Bearer t');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('GET /admin/content aggregates sources + analysis rate', async () => {
    mockListRows.sources = [
      { type: 'pdf', status: 'ready', chunks_indexed: 40, difficulty: 'easy' },
      { type: 'pdf', status: 'ready', chunks_indexed: 60, difficulty: 'hard' },
    ];
    mockCounts.sources = 2;
    mockCounts.source_analysis = 1;
    const res = await request(app).get('/admin/content').set('Authorization', 'Bearer t');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ totalSources: 2, totalChunks: 100, analyzedCount: 1, analysisRate: 50 });
    expect(res.body.byType).toMatchObject({ pdf: 2 });
  });

  it('GET /admin/mood aggregates distribution + trend', async () => {
    const day = (n) => new Date(Date.now() - n * 86400000).toISOString();
    mockListRows.mood_checkins = [
      { mood: 'tired', energy_level: 3, focus_level: 4, stress_level: 7, created_at: day(6) },
      { mood: 'tired', energy_level: 4, focus_level: 4, stress_level: 6, created_at: day(5) },
      { mood: 'focused', energy_level: 7, focus_level: 8, stress_level: 3, created_at: day(2) },
      { mood: 'energized', energy_level: 9, focus_level: 8, stress_level: 2, created_at: day(1) },
    ];
    const res = await request(app).get('/admin/mood?days=7').set('Authorization', 'Bearer t');
    expect(res.status).toBe(200);
    expect(res.body.checkins).toBe(4);
    expect(res.body.distribution).toMatchObject({ tired: 2, focused: 1, energized: 1 });
    expect(res.body.trend).toBe('improving');
  });
});
