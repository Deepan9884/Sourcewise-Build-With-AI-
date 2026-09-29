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
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
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

const sourceRoutes = require('../routes/source.routes');

describe('Sources Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/sources', sourceRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    singleResolve = { data: null, error: null };
    chainResolve = { data: null, error: null };
    // Restore chain methods that may have been replaced by tests
    mockChain.insert = jest.fn().mockReturnThis();
    mockChain.select = jest.fn().mockReturnThis();
    mockChain.upsert = jest.fn().mockReturnThis();
    mockChain.update = jest.fn().mockReturnThis();
  });

  describe('GET /sources', () => {
    it('should return 200 with empty array when no sources', async () => {
      chainResolve = { data: [], error: null };

      const res = await request(app).get('/sources').set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });

    it('should return 200 with sources array', async () => {
      const sources = [
        { id: 's1', name: 'doc1.pdf', type: 'pdf', user_id: 'test-user-id' },
        { id: 's2', name: 'doc2.pdf', type: 'pdf', user_id: 'test-user-id' },
      ];
      chainResolve = { data: sources, error: null };

      const res = await request(app).get('/sources').set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].name).toBe('doc1.pdf');
    });

    it('should return 500 on Supabase error', async () => {
      mockChain.select = jest.fn().mockImplementation(() => {
        throw new Error('DB connection failed');
      });

      const res = await request(app).get('/sources').set('Authorization', 'Bearer token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('POST /sources', () => {
    beforeEach(() => {
      axios.post.mockResolvedValue({ data: { overview: 'test', key_concepts: [] } });
    });

    it('should create a source with valid input', async () => {
      chainResolve = { data: { id: 'source-id', name: 'test.pdf', type: 'pdf', user_id: 'test-user-id' }, error: null };
      singleResolve = { data: { id: 'source-id', name: 'test.pdf', type: 'pdf', user_id: 'test-user-id' }, error: null };

      const res = await request(app)
        .post('/sources')
        .set('Authorization', 'Bearer token')
        .send({ name: 'test.pdf', type: 'pdf', size: 2048 });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id', 'source-id');
      expect(res.body).toHaveProperty('name', 'test.pdf');
      expect(res.body).toHaveProperty('type', 'pdf');
    });

    it('should create a source with defaults for missing fields', async () => {
      chainResolve = { data: { id: 'source-id', name: 'Untitled', type: 'pdf', user_id: 'test-user-id' }, error: null };
      singleResolve = { data: { id: 'source-id', name: 'Untitled', type: 'pdf', user_id: 'test-user-id' }, error: null };

      const res = await request(app)
        .post('/sources')
        .set('Authorization', 'Bearer token')
        .send({});

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id', 'source-id');
    });

    it('should return 500 on Supabase insert error', async () => {
      mockChain.insert = jest.fn().mockImplementation(() => {
        throw new Error('Insert failed');
      });

      const res = await request(app)
        .post('/sources')
        .set('Authorization', 'Bearer token')
        .send({ name: 'test.pdf' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('GET /sources/:id', () => {
    it('should return source when found', async () => {
      const source = { id: 'source-1', name: 'report.pdf', type: 'pdf', user_id: 'test-user-id' };
      singleResolve = { data: source, error: null };

      const res = await request(app)
        .get('/sources/source-1')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', 'source-1');
      expect(res.body).toHaveProperty('name', 'report.pdf');
    });

    it('should return 404 when source not found', async () => {
      singleResolve = { data: null, error: { message: 'Not found' } };

      const res = await request(app)
        .get('/sources/nonexistent')
        .set('Authorization', 'Bearer token');

      if (res.status !== 404) console.log('GET /sources/nonexistent error body:', JSON.stringify(res.body));

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Source not found');
    });

    it('should return 404 when source belongs to another user', async () => {
      singleResolve = { data: null, error: { message: 'Not found' } };

      const res = await request(app)
        .get('/sources/other-user-source')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Source not found');
    });
  });

  describe('POST /sources/:id/analyze', () => {
    const analysisPayload = {
      overview: 'A document about ML',
      key_concepts: [{ name: 'neural networks' }, { name: 'supervised learning' }],
      difficulty_assessment: 'intermediate',
      estimated_study_time: 45,
      chapter_structure: [{ title: 'Intro' }],
      key_takeaways: ['ML is important'],
      recommendations: ['Start with basics'],
    };

    beforeEach(() => {
      axios.post.mockResolvedValue({ data: analysisPayload });
    });

    it('should return analysis on success', async () => {
      singleResolve = { data: { id: 'source-id', name: 'test.pdf', user_id: 'test-user-id' }, error: null };

      const res = await request(app)
        .post('/sources/source-id/analyze')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('overview', 'A document about ML');
      expect(res.body).toHaveProperty('key_concepts');
      expect(res.body.key_concepts).toHaveLength(2);
    });

    it('should return 404 if source does not exist', async () => {
      singleResolve = { data: null, error: { message: 'Not found' } };

      const res = await request(app)
        .post('/sources/ghost-id/analyze')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Source not found');
    });

    it('should return 200 (with null body) when AI service fails — triggerSourceAnalysis swallows the error', async () => {
      singleResolve = { data: { id: 'source-id', name: 'test.pdf', user_id: 'test-user-id' }, error: null };
      axios.post.mockRejectedValue(new Error('AI service unreachable'));

      const res = await request(app)
        .post('/sources/source-id/analyze')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body).toBeNull();
    });
  });
});

describe('Sources Routes — AI internal key forwarding', () => {
  const ORIGINAL_KEY = process.env.INTERNAL_API_KEY;
  let keyApp;

  beforeAll(() => {
    keyApp = express();
    keyApp.use(express.json());
    keyApp.use('/sources', sourceRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    singleResolve = { data: null, error: null };
    chainResolve = { data: null, error: null };
    // Restore chain methods that earlier suites may have replaced
    mockChain.insert = jest.fn().mockReturnThis();
    mockChain.select = jest.fn().mockReturnThis();
    mockChain.upsert = jest.fn().mockReturnThis();
    mockChain.update = jest.fn().mockReturnThis();
    axios.post.mockResolvedValue({ data: { overview: 'x', key_concepts: [] } });
  });

  afterEach(() => {
    if (ORIGINAL_KEY === undefined) delete process.env.INTERNAL_API_KEY;
    else process.env.INTERNAL_API_KEY = ORIGINAL_KEY;
  });

  it('forwards X-Internal-Key to the AI service when INTERNAL_API_KEY is configured', async () => {
    process.env.INTERNAL_API_KEY = 'test-internal-key';
    singleResolve = { data: { id: 'source-id', name: 'test.pdf', user_id: 'test-user-id' }, error: null };

    const res = await request(keyApp)
      .post('/sources/source-id/analyze')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/sources/analyze'),
      expect.anything(),
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Internal-Key': 'test-internal-key' }),
      })
    );
  });

  it('omits the internal key header when INTERNAL_API_KEY is not configured', async () => {
    delete process.env.INTERNAL_API_KEY;
    singleResolve = { data: { id: 'source-id', name: 'test.pdf', user_id: 'test-user-id' }, error: null };

    const res = await request(keyApp)
      .post('/sources/source-id/analyze')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/sources/analyze'),
      expect.anything(),
      expect.objectContaining({ headers: {} })
    );
  });
});
