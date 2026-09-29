/**
 * AI Gateway proxy tests — the Generate-roadmap button calls these.
 * Regression: frontend used to call python-ai directly and got 401 when
 * INTERNAL_API_KEY was set. The gateway forwards the internal key server-side.
 */
const request = require('supertest');
const express = require('express');
const axios = require('axios');

jest.mock('axios');

const makeChain = () => {
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  };
  chain.then = (resolve) => resolve({ data: [], error: null });
  return chain;
};
const mockChain = makeChain();

jest.mock('../utils/supabase', () => ({
  from: jest.fn(() => mockChain),
}));

jest.mock('../middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { _id: 'u1', userId: 'u1', id: 'u1' };
    next();
  },
}));

const tutorRoutes = require('../routes/tutor.routes');

describe('AI gateway (roadmap generation)', () => {
  let app;
  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/tutor', tutorRoutes);
  });
  beforeEach(() => jest.clearAllMocks());

  it('POST /tutor/orchestrator proxies to python-ai and returns its body', async () => {
    axios.post.mockResolvedValue({ data: { success: true, agent: 'StudyPlanner', data: { plan: { title: 'P' } }, message: 'ok' } });
    const res = await request(app).post('/tutor/orchestrator')
      .set('Authorization', 'Bearer t')
      .send({ message: 'Create a study plan for Biology', topic: 'Biology' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/orchestrator'),
      expect.objectContaining({ message: expect.any(String) }),
      expect.anything()
    );
  });

  it('POST /tutor/orchestrator 400s without a message', async () => {
    const res = await request(app).post('/tutor/orchestrator')
      .set('Authorization', 'Bearer t').send({});
    expect(res.status).toBe(400);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('POST /tutor/orchestrator returns 503 with guidance when AI is down', async () => {
    axios.post.mockRejectedValue(new Error('connect ECONNREFUSED'));
    const res = await request(app).post('/tutor/orchestrator')
      .set('Authorization', 'Bearer t').send({ message: 'plan please' });
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/AI service is unreachable/);
  });

  it('POST /tutor/agent proxies and returns its body', async () => {
    axios.post.mockResolvedValue({ data: { type: 'chat', message: 'hi' } });
    const res = await request(app).post('/tutor/agent')
      .set('Authorization', 'Bearer t').send({ message: 'hello' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('hi');
  });

  it('POST /tutor/agent 400s without a message', async () => {
    const res = await request(app).post('/tutor/agent')
      .set('Authorization', 'Bearer t').send({});
    expect(res.status).toBe(400);
  });
});
