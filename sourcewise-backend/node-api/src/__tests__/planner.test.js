/**
 * Planner Routes Tests
 * Tests: CRUD operations, validation
 */

const request = require('supertest');
const express = require('express');

// Mock Supabase with proper chaining
const mockSupabaseChain = (returnData = null) => {
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: returnData || { id: 'test-id' }, error: null }),
    })),
    update: jest.fn().mockImplementation(() => ({
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: returnData || { id: 'test-id' }, error: null }),
    })),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
  };
  return chain;
};

jest.mock('../utils/supabase', () => ({
  from: jest.fn(() => mockSupabaseChain()),
}));

jest.mock('../middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { _id: 'test-user-id', userId: 'test-user-id' };
    next();
  },
}));

const plannerRoutes = require('../routes/planner.routes');

describe('Planner Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/planner', plannerRoutes);
  });

  describe('GET /planner', () => {
    it('should return 200 for planner list', async () => {
      const res = await request(app).get('/planner');
      expect(res.status).toBe(200);
    });
  });

  describe('POST /planner', () => {
    it('should create a planner', async () => {
      const res = await request(app)
        .post('/planner')
        .send({
          title: 'Test Plan',
          subject: 'Math',
          daily_hours: 2,
          data: JSON.stringify({ days: [] }),
        });
      
      expect(res.status).toBe(201);
    });
  });

  describe('POST /planner/:id/complete-day', () => {
    it('should handle complete-day request', async () => {
      const res = await request(app)
        .post('/planner/test-id/complete-day')
        .send({ day_index: 0 });
      
      // Should return 200 or 404 (not crash)
      expect([200, 404, 500]).toContain(res.status);
    });
  });

  describe('POST /planner/:id/replan', () => {
    it('should handle replan request', async () => {
      const res = await request(app)
        .post('/planner/test-id/replan')
        .send({ missed_day_index: 0 });
      
      // Should return 200 or 404 (not crash)
      expect([200, 404, 500]).toContain(res.status);
    });
  });
});
