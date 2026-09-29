/**
 * Auth Routes Tests
 * Tests: register, login, /me endpoint
 */

const request = require('supertest');
const express = require('express');

// Mock Supabase with proper chaining
const mockSupabaseChain = () => {
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    order: jest.fn().mockReturnThis(),
  };
  return chain;
};

jest.mock('../utils/supabase', () => ({
  from: jest.fn(() => mockSupabaseChain()),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mock-token'),
  verify: jest.fn(() => ({ userId: 'test-user-id' })),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(() => 'hashed-password'),
  compare: jest.fn(() => true),
}));

const authRoutes = require('../routes/auth.routes');

describe('Auth Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/auth', authRoutes);
  });

  describe('POST /auth/register', () => {
    it('should return 400 if name, email, or password missing', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ email: 'test@example.com' });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });

    it('should return 400 if password too short', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ name: 'Test', email: 'test@example.com', password: '123' });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('6 characters');
    });
  });

  describe('POST /auth/login', () => {
    it('should return 400 if email or password missing', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com' });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });
  });

  describe('GET /auth/me', () => {
    it('should return 401 without token', async () => {
      const res = await request(app)
        .get('/auth/me');
      
      expect(res.status).toBe(401);
    });
  });
});
