const request = require('supertest');
const express = require('express');
const axios = require('axios');

jest.mock('axios');

let singleResolve = { data: null, error: null };
let chainResolve = { data: null, error: null };

const makeChain = () => {
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockImplementation(() => Promise.resolve(singleResolve)),
    range: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
  };
  chain.then = (resolve) => resolve(chainResolve);
  return chain;
};

const mockChain = makeChain();

jest.mock('../utils/supabase', () => ({
  from: jest.fn(() => mockChain),
}));

jest.mock('../middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { _id: 'test-user-id', userId: 'test-user-id' };
    next();
  },
}));

const tutorRoutes = require('../routes/tutor.routes');

describe('Tutor Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/tutor', tutorRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    singleResolve = { data: null, error: null };
    chainResolve = { data: null, error: null };
    // Restore chain methods that may have been replaced by tests
    mockChain.insert = jest.fn().mockReturnThis();
    mockChain.upsert = jest.fn().mockReturnThis();
    mockChain.update = jest.fn().mockReturnThis();
  });

  describe('POST /tutor/ask — validation', () => {
    it('should return 400 if question is missing', async () => {
      const res = await request(app)
        .post('/tutor/ask')
        .set('Authorization', 'Bearer token')
        .send({ sourceIds: ['s1'] });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Question');
    });

    it('should return 400 if sourceIds is missing or empty', async () => {
      const res = await request(app)
        .post('/tutor/ask')
        .set('Authorization', 'Bearer token')
        .send({ question: 'What is ML?' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('source ID');
    });

    it('should return 404 if sessionId is provided but not found', async () => {
      singleResolve = { data: null, error: { message: 'Not found' } };

      const res = await request(app)
        .post('/tutor/ask')
        .set('Authorization', 'Bearer token')
        .send({ question: 'What is ML?', sourceIds: ['s1'], sessionId: 'ghost' });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Session not found');
    });
  });

  describe('POST /tutor/session/start', () => {
    beforeEach(() => {
      singleResolve = { data: { id: 'session-id' }, error: null };
    });

    it('should create a session successfully', async () => {
      const res = await request(app)
        .post('/tutor/session/start')
        .set('Authorization', 'Bearer token')
        .send({ sourceIds: ['s1', 's2'] });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('sessionId', 'session-id');
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('suggestedTopics');
    });

    it('should return 500 on Supabase error', async () => {
      mockChain.insert = jest.fn().mockImplementation(() => {
        throw new Error('DB error');
      });

      const res = await request(app)
        .post('/tutor/session/start')
        .set('Authorization', 'Bearer token')
        .send({ sourceIds: ['s1'] });

      expect(res.status).toBe(500);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('GET /tutor/history', () => {
    it('should return sessions array', async () => {
      const sessions = [
        { id: 's1', created_at: '2026-01-01', mode: 'direct', conversation_history: [{ role: 'user', content: 'hello' }] },
      ];
      chainResolve = { data: sessions, error: null };

      const res = await request(app)
        .get('/tutor/history')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('sessions');
      expect(res.body).toHaveProperty('total');
    });

    it('should return empty sessions array when no history', async () => {
      chainResolve = { data: [], error: null };

      const res = await request(app)
        .get('/tutor/history')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.sessions).toHaveLength(0);
      expect(res.body.total).toBe(0);
    });
  });

  describe('GET /tutor/session/:sessionId', () => {
    it('should return session details when found', async () => {
      const session = {
        id: 's1', created_at: '2026-01-01', mode: 'direct',
        source_ids: ['src1'], conversation_history: [],
      };
      singleResolve = { data: session, error: null };

      const res = await request(app)
        .get('/tutor/session/s1')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', 's1');
      expect(res.body).toHaveProperty('conversationHistory');
    });

    it('should return 404 when session not found', async () => {
      singleResolve = { data: null, error: { message: 'Not found' } };

      const res = await request(app)
        .get('/tutor/session/ghost')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Session not found');
    });
  });

  describe('POST /tutor/evaluate', () => {
    beforeEach(() => {
      singleResolve = { data: null, error: null };
    });

    it('should return 404 when attempt not found', async () => {
      const res = await request(app)
        .post('/tutor/evaluate')
        .set('Authorization', 'Bearer token')
        .send({ attemptId: 'ghost', userAnswer: 'test' });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Practice attempt not found');
    });

    it('should evaluate answer successfully', async () => {
      const attempt = {
        id: 'a1', concept: 'algebra', question_text: 'What is x?',
        correct_answer: '5', source_ids: ['s1'],
      };
      singleResolve = { data: attempt, error: null };

      axios.post.mockResolvedValue({
        data: { is_correct: true, score: 100, feedback: 'Great!' },
      });

      const res = await request(app)
        .post('/tutor/evaluate')
        .set('Authorization', 'Bearer token')
        .send({ attemptId: 'a1', userAnswer: '5' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('is_correct', true);
      expect(res.body).toHaveProperty('score', 100);
      expect(res.body).toHaveProperty('feedback', 'Great!');
    });

    it('should return 500 when AI service fails', async () => {
      const attempt = {
        id: 'a1', concept: 'algebra', question_text: 'What is x?',
        correct_answer: '5', source_ids: ['s1'],
      };
      singleResolve = { data: attempt, error: null };

      axios.post.mockRejectedValue(new Error('AI service down'));

      const res = await request(app)
        .post('/tutor/evaluate')
        .set('Authorization', 'Bearer token')
        .send({ attemptId: 'a1', userAnswer: '5' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('GET /tutor/suggest-topics', () => {
    it('should return message when no learning profile exists', async () => {
      singleResolve = { data: null, error: { message: 'Not found' } };

      const res = await request(app)
        .get('/tutor/suggest-topics')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('suggestions');
      expect(res.body).toHaveProperty('message');
    });

    it('should return suggestions when profile exists with gaps', async () => {
      const profile = {
        knowledge_gaps: [{ concept: 'calculus', severity: 4 }],
        concept_mastery: [
          { concept: 'algebra', level: 'developing', correct_attempts: 3, total_attempts: 5, last_assessed: '2026-01-01' },
        ],
      };
      singleResolve = { data: profile, error: null };
      chainResolve = { data: [{ id: 's1', name: 'book.pdf' }], error: null };

      const res = await request(app)
        .get('/tutor/suggest-topics')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.suggestions.length).toBeGreaterThanOrEqual(1);
      expect(res.body).toHaveProperty('totalSources', 1);
    });
  });

  describe('POST /tutor/session/end', () => {
    beforeEach(() => {
      chainResolve = { data: [], error: null };
    });

    it('should return 404 when session not found', async () => {
      singleResolve = { data: null, error: { message: 'Not found' } };

      const res = await request(app)
        .post('/tutor/session/end')
        .set('Authorization', 'Bearer token')
        .send({ sessionId: 'ghost' });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Session not found');
    });

    it('should end session and return summary', async () => {
      const session = {
        id: 's1', created_at: new Date().toISOString(),
        mode: 'direct', conversation_history: [],
      };
      singleResolve = { data: session, error: null };

      const res = await request(app)
        .post('/tutor/session/end')
        .set('Authorization', 'Bearer token')
        .send({ sessionId: 's1' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('summary');
      expect(res.body).toHaveProperty('achievements');
      expect(res.body).toHaveProperty('encouragement');
    });
  });
});

describe('Tutor Routes — AI internal key forwarding', () => {
  const ORIGINAL_KEY = process.env.INTERNAL_API_KEY;
  let keyApp;

  beforeAll(() => {
    keyApp = express();
    keyApp.use(express.json());
    keyApp.use('/tutor', tutorRoutes);
  });

  const attempt = {
    id: 'a1', concept: 'algebra', question_text: 'What is x?',
    correct_answer: '5', source_ids: ['s1'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    singleResolve = { data: attempt, error: null };
    chainResolve = { data: null, error: null };
    // Restore chain methods that earlier suites may have replaced
    mockChain.insert = jest.fn().mockReturnThis();
    mockChain.select = jest.fn().mockReturnThis();
    mockChain.upsert = jest.fn().mockReturnThis();
    mockChain.update = jest.fn().mockReturnThis();
    axios.post.mockResolvedValue({
      data: { is_correct: true, score: 100, feedback: 'Great!' },
    });
  });

  afterEach(() => {
    if (ORIGINAL_KEY === undefined) delete process.env.INTERNAL_API_KEY;
    else process.env.INTERNAL_API_KEY = ORIGINAL_KEY;
  });

  it('forwards X-Internal-Key to the AI service when INTERNAL_API_KEY is configured', async () => {
    process.env.INTERNAL_API_KEY = 'test-internal-key';

    const res = await request(keyApp)
      .post('/tutor/evaluate')
      .set('Authorization', 'Bearer token')
      .send({ attemptId: 'a1', userAnswer: '5' });

    expect(res.status).toBe(200);
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/tutor/evaluate'),
      expect.anything(),
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Internal-Key': 'test-internal-key' }),
      })
    );
  });

  it('omits the internal key header when INTERNAL_API_KEY is not configured', async () => {
    delete process.env.INTERNAL_API_KEY;

    const res = await request(keyApp)
      .post('/tutor/evaluate')
      .set('Authorization', 'Bearer token')
      .send({ attemptId: 'a1', userAnswer: '5' });

    expect(res.status).toBe(200);
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/tutor/evaluate'),
      expect.anything(),
      expect.objectContaining({ headers: {} })
    );
  });
});
