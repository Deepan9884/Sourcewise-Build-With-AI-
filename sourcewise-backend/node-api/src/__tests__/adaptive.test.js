/**
 * Study-plan analytics + adaptive tests (spec §2/§4).
 * Covers: GET pacing, GET subject trend, POST adaptive (balanced / frozen /
 * applied), POST adaptive undo.
 */
const request = require('supertest');
const express = require('express');

const mockListRows = {}; // table -> rows for awaited list queries
const mockSingleRows = {}; // table -> row for .single()

function mockChainFor(table) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn(async () => ({ data: mockSingleRows[table] ?? null, error: null })),
  };
  chain.then = (resolve) => resolve({ data: mockListRows[table] ?? [], error: null });
  return chain;
}

jest.mock('../utils/supabase', () => ({
  from: jest.fn((table) => mockChainFor(table)),
}));

jest.mock('../middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { _id: 'u1', userId: 'u1', id: 'u1' };
    next();
  },
}));

const moodState = { value: null };
jest.mock('../services/moodService', () => ({
  getCurrentMoodState: jest.fn(async () => moodState.value),
}));

const studyPlanRoutes = require('../routes/study-plans.routes');

const PLAN = { id: 'p1', user_id: 'u1' };
const SLOTS = [
  { id: 's1', plan_id: 'p1', subject_id: 'sub1', date: '2026-09-20', status: 'completed', slot_type: 'study', duration_minutes: 60, start_time: '09:00:00', end_time: '10:00:00', is_fixed: false, mood_context: {} },
  { id: 's2', plan_id: 'p1', subject_id: 'sub1', date: '2026-09-21', status: 'pending', slot_type: 'study', duration_minutes: 60, start_time: '09:00:00', end_time: '10:00:00', is_fixed: false, mood_context: {} },
  { id: 's3', plan_id: 'p1', subject_id: 'sub1', date: '2099-01-05', status: 'pending', slot_type: 'study', duration_minutes: 60, start_time: '09:00:00', end_time: '10:00:00', is_fixed: false, mood_context: {} },
  { id: 's4', plan_id: 'p1', subject_id: 'sub1', date: '2099-01-06', status: 'pending', slot_type: 'study', duration_minutes: 90, start_time: '09:00:00', end_time: '10:30:00', is_fixed: false, mood_context: {} },
];
const SUBJECTS = [{ id: 'sub1', subject_name: 'Biology', exam_date: '2099-02-01', current_mastery: 60, target_mastery: 80 }];

describe('study-plan analytics + adaptive', () => {
  let app;
  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/study-plans', studyPlanRoutes);
  });
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockListRows).forEach((k) => delete mockListRows[k]);
    Object.keys(mockSingleRows).forEach((k) => delete mockSingleRows[k]);
    mockSingleRows.study_plans = PLAN;
    moodState.value = null;
  });

  it('GET /:id/pacing returns pace + deviation + milestones', async () => {
    mockListRows.schedule_slots = SLOTS;
    mockListRows.plan_subjects = SUBJECTS;
    const res = await request(app).get('/study-plans/p1/pacing').set('Authorization', 'Bearer t');
    expect(res.status).toBe(200);
    expect(res.body.totalSlots).toBe(4);
    expect(res.body).toHaveProperty('pacePct');
    expect(res.body).toHaveProperty('deviationDays');
    expect(res.body.milestones).toHaveLength(1);
  });

  it('GET /:id/subjects/:sid/trend returns curve', async () => {
    mockSingleRows.plan_subjects = SUBJECTS[0];
    mockListRows.schedule_slots = SLOTS;
    const res = await request(app).get('/study-plans/p1/subjects/sub1/trend').set('Authorization', 'Bearer t');
    expect(res.status).toBe(200);
    expect(res.body.subjectName).toBe('Biology');
    expect(res.body.points.length).toBeGreaterThan(0);
  });

  it('GET trend 404s for foreign subject', async () => {
    mockSingleRows.plan_subjects = null;
    const res = await request(app).get('/study-plans/p1/subjects/nope/trend').set('Authorization', 'Bearer t');
    expect(res.status).toBe(404);
  });

  it('POST adaptive is a no-op when mood is balanced', async () => {
    moodState.value = { dominantMood: 'focused', recommendedAdjustments: { loadMultiplier: 1.0, preferDifficulty: 'medium', breakMinutes: 10 } };
    const res = await request(app).post('/study-plans/p1/adaptive').set('Authorization', 'Bearer t').send({});
    expect(res.status).toBe(200);
    expect(res.body.adjustedSlots).toBe(0);
  });

  it('POST adaptive refuses to shrink during exam-week freeze', async () => {
    moodState.value = { dominantMood: 'tired', recommendedAdjustments: { loadMultiplier: 0.6, preferDifficulty: 'easy', breakMinutes: 15 } };
    const today = new Date().toISOString().slice(0, 10);
    const soon = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
    void today;
    mockListRows.plan_subjects = [{ subject_name: 'Bio', exam_date: soon }];
    const res = await request(app).post('/study-plans/p1/adaptive').set('Authorization', 'Bearer t').send({});
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/Exam-week freeze/);
  });

  it('POST adaptive scales future slots + undo restores them', async () => {
    moodState.value = { dominantMood: 'tired', recommendedAdjustments: { loadMultiplier: 0.6, preferDifficulty: 'easy', breakMinutes: 15 } };
    mockListRows.plan_subjects = SUBJECTS; // exam far away
    mockListRows.schedule_slots = SLOTS.filter((s) => s.status === 'pending');
    const res = await request(app).post('/study-plans/p1/adaptive').set('Authorization', 'Bearer t').send({});
    expect(res.status).toBe(200);
    expect(res.body.adjustedSlots).toBe(2); // s3 (60→40), s4 (90→65); s2 is past
    expect(res.body.multiplier).toBe(0.7); // clamped from 0.6
    expect(res.body.undoToken).toBeDefined();

    // Undo
    const token = res.body.undoToken;
    mockListRows.replan_events = [{ id: 'e1', trigger_data: { undoToken: token, undone: false, snapshot: [
      { id: 's3', end_time: '10:00:00', duration_minutes: 60, mood_context: {}, status: 'pending' },
    ] } }];
    mockSingleRows.schedule_slots = { status: 'pending' };
    const undo = await request(app).post('/study-plans/p1/adaptive/undo').set('Authorization', 'Bearer t').send({ undoToken: token });
    expect(undo.status).toBe(200);
    expect(undo.body.restored).toBe(1);
  });

  it('POST adaptive/undo 404s on unknown token', async () => {
    mockListRows.replan_events = [];
    const res = await request(app).post('/study-plans/p1/adaptive/undo').set('Authorization', 'Bearer t').send({ undoToken: 'nope' });
    expect(res.status).toBe(404);
  });
});
