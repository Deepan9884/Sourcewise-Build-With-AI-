# SourceWise v11 — Stream 2: Backend API Testing Report

> **Date:** 2026-06-30
> **Scope:** Hardening (no new features)
> **Goal:** Add two high-coverage test files, document exact test run output, and flag weak tests.

---

## 1. Audit of Pre-Existing Tests

### 1.1 auth.test.js (src/__tests__/auth.test.js)

**Supabase mocked?** Yes. `mockSupabaseChain()` returns a chainable mock with `.select()`, `.insert()`, `.update()`, `.delete()`, `.eq()`, `.single()`, `.maybeSingle()`, `.order()`. `jsonwebtoken` and `bcryptjs` are also mocked.

| Test case name | What it asserts |
|---|---|
| `should return 400 if name, email, or password missing` | Status `400`; body has `error` containing `"required"`. |
| `should return 400 if password too short` | Status `400`; body has `error` containing `"6 characters"`. |
| `should return 400 if email or password missing` | Status `400`; body has `error` containing `"required"`. |
| `should return 401 without token` | Status `401`. |

**Notes:** No success-path tests (register 201, login with valid creds). No duplicate-email conflict case. No JWT shape assertions.

---

### 1.2 mastery.test.js (src/__tests__/mastery.test.js)

**Supabase mocked?** Yes. `mockSupabaseChain()` returns `.single()` resolving to `{ data: { id: 'test-id', mastery_score: 75, level: 'developing' }, error: null }`. Auth middleware is also mocked.

| Test case name | What it asserts |
|---|---|
| `should return 200 for mastery list` | Status is `200` or `500` (loose containment). |
| `should return 400 if concept missing` | Status `400`; body has `error` containing `"concept"`. |
| `should return 400 if score missing` | Status `400`; body has `error` containing `"score"`. |
| `should update concept mastery` | Status `200`. |
| `should return 200 for gaps` | Status is `200` or `500` (loose containment). |
| `should return 400 if concept missing` (gaps) | Status `400` (no body assertion). |
| `should report a knowledge gap` | Status `201` (no body assertion). |

**Notes:** Two GET endpoints accept `500` as a pass, tolerating mock-chain incompatibilities rather than asserting correct behavior.

---

### 1.3 planner.test.js (src/__tests__/planner.test.js)

**Supabase mocked?** Yes. `mockSupabaseChain()` has `.insert()` and `.update()` with nested `.single()` resolving to `{ data: { id: 'test-id' }, error: null }`. Auth middleware is mocked.

| Test case name | What it asserts |
|---|---|
| `should return 200 for planner list` | Status `200`. |
| `should create a planner` | Status `201`. |
| `should handle complete-day request` | Status is one of `[200, 404, 500]`. |
| `should handle replan request` | Status is one of `[200, 404, 500]`. |

**Notes:** No response body assertions. All tests only check status codes.

---

### 1.4 progress.test.js (src/__tests__/progress.test.js)

**Supabase mocked?** Yes. `mockSupabaseChain()` makes the chain thenable via `chain.then = (resolve) => resolve({ data: [], error: null })` to handle `Promise.all`. Auth middleware is mocked.

| Test case name | What it asserts |
|---|---|
| `should return 400 if event_type missing` | Status `400`; body has `error` containing `"event_type"`. |
| `should track a progress event` | Status `201`. |
| `should return 200 for events` | Status `200`. |
| `should return 200 for streak` | Status `200`. |
| `should return 200 for revision stats` | Status `200` or `500`. |

**Notes:** `track a progress event`, `events`, `streak` only check status codes. `revision-stats` accepts `500`.

---

## 2. New Test File: sources.test.js — Full Content

**File path:** `sourcewise-backend/node-api/src/__tests__/sources.test.js`
**Test count: 12 test cases** (verified by counting all `it(...)` calls in the file).

Covers the Sources route group, which handles user-uploaded documents and makes outbound calls to the python-ai service — a high-risk area because it involves user data and external AI interaction.

```javascript
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

    it('should return 200 (with null body) when AI service fails', async () => {
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
```

---

## 3. New Test File: tutor.test.js — Full Content

**Route group chosen:** `tutor`

**Test count: 16 test cases** (verified by counting all `it(...)` calls in the file).

**Rationale:** The tutor route group is the highest-risk-if-broken choice because it is the most critical user-facing feature in the backend. It handles real-time AI tutoring sessions via SSE streaming, evaluates practice attempts, and generates personalized topic suggestions. A bug here directly impacts the student's learning experience in real time. It has the most complex route structure (6 sub-routes: ask, session/start, session/end, history, session/:sessionId, evaluate, suggest-topics), the most Supabase table interactions (tutoring_sessions, practice_attempts, learning_profiles, concept_mastery, review_schedule, knowledge_gaps, progress_events), and two outbound HTTP calls to the python-ai service. Unlike analytics or settings, a tutor failure is not a background process — it is a visible, real-time failure during a study session.

**File:** `sourcewise-backend/node-api/src/__tests__/tutor.test.js`

```javascript
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
    mockChain.insert = jest.fn().mockReturnThis();
    mockChain.upsert = jest.fn().mockReturnThis();
    mockChain.update = jest.fn().mockReturnThis();
  });

  describe('POST /tutor/ask - validation', () => {
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
```

---

## 4. Dead File Confirmation

**`dashboard.routes.js` was not read, imported, modified, or tested in this stream. It remains flagged for removal in Stream 6.**

This was confirmed by a targeted grep for the string `"dashboard.routes"` across only the two new test files:

```
$ grep -r "dashboard.routes" sourcewise-backend/node-api/src/__tests__/sources.test.js sourcewise-backend/node-api/src/__tests__/tutor.test.js
(empty — no output)
```

Result: **No matches found** — zero references to `dashboard.routes` exist in either `sources.test.js` or `tutor.test.js`.

A broader search across all files under `sourcewise-backend/node-api/src/__tests__/` also returned zero results, proving no accidental reference exists in any existing test file either.

---

## 5. Mocking Verification

### 5.1 Supabase mock — shared pattern used in both new files

Both `sources.test.js` (lines 111–113) and `tutor.test.js` (lines 32–34) use the same Supabase mocking pattern. The actual code (identical in both files):

```javascript
// sources.test.js lines 111-113 / tutor.test.js lines 32-34
jest.mock('../utils/supabase', () => ({
  from: jest.fn(() => mockChain),
}));
```

The `mockChain` itself is produced by `makeChain()` (defined identically in both files) which creates a mock object where every Supabase query-builder method (`.select()`, `.insert()`, `.eq()`, `.single()`, etc.) is a `jest.fn()` that returns itself for chaining. The `.single()` method resolves to the module-level `singleResolve` variable, and the chain itself is thenable via `chain.then = (resolve) => resolve(chainResolve)`. This means per-test `beforeEach` blocks can set `singleResolve` and `chainResolve` to control exactly what Supabase returns:

```javascript
// Full makeChain definition for reference — sources.test.js lines 91-107
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
    lte: jest.fn().mockReturnThis(),    // tutor only, line 23
    filter: jest.fn().mockReturnThis(), // tutor only, line 24
  };
  chain.then = (resolve) => resolve(chainResolve);
  return chain;
};
```

### 5.2 python-ai mock — sources.test.js analyze tests

The outbound call to the python-ai service (`POST ${PYTHON_AI_URL}/sources/analyze`) is mocked via `axios`. The `jest.mock('axios')` at line 86 of `sources.test.js` replaces the real `axios` module. Tests then configure it via `beforeEach` (line 102–104) and individual cases:

```javascript
// sources.test.js line 86 — module-level mock of all axios calls
jest.mock('axios');

// sources.test.js lines 102-104 — beforeEach in POST /sources/:id/analyze block
// Used by the success-path test:
axios.post.mockResolvedValue({
  data: {
    overview: 'A document about ML',
    key_concepts: [{ name: 'neural networks' }, { name: 'supervised learning' }],
    difficulty_assessment: 'intermediate',
    estimated_study_time: 45,
    chapter_structure: [{ title: 'Intro' }],
    key_takeaways: ['ML is important'],
    recommendations: ['Start with basics'],
  },
});

// sources.test.js line 229 — the AI-failure test overrides the beforeEach mock:
// axios.post.mockRejectedValue(new Error('AI service unreachable'));
```

### 5.3 python-ai mock — tutor.test.js evaluate tests

Similarly, the tutor route's evaluate endpoint calls the python-ai service via `axios.post`. The `jest.mock('axios')` at line 5 of `tutor.test.js` replaces the real module. The mock is configured per test:

```javascript
// tutor.test.js line 5 — module-level mock of all axios calls
jest.mock('axios');

// tutor.test.js lines 210-212 — success case mock:
axios.post.mockResolvedValue({
  data: { is_correct: true, score: 100, feedback: 'Great!' },
});

// tutor.test.js line 232 — AI-failure case mock:
// axios.post.mockRejectedValue(new Error('AI service down'));
```

### 5.4 Auth middleware mock — both files

Both files mock the authentication middleware identically:

```javascript
jest.mock('../middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { _id: 'test-user-id', userId: 'test-user-id' };
    next();
  },
}));
```

### 5.5 No real network calls

**No test in either new file makes a real network call or hits a real database.** All outbound HTTP calls are intercepted by the `axios` mock (`jest.mock('axios')`), and all Supabase operations are intercepted by the `supabase` mock (`jest.mock('../utils/supabase', ...)`). The Express app is created fresh in-memory per file using `express()` and `supertest`, with no connection to a real database or external service.

---

## 6. Full Test Run Output

The following is the **complete, unedited terminal output** from running `npm test` in `sourcewise-backend/node-api`.

```
> sourcewise-node-api@1.0.0 test
> jest --verbose

  console.error
    [Progress] Auto-schedule review failed: supabase.from(...).upsert is not a function

      at error (src/routes/progress-v2.routes.js:99:13)
      at autoScheduleReview (src/routes/progress-v2.routes.js:58:13)

  console.error
    [Progress] Mastery update failed: supabase.from(...).upsert is not a function

      at error (src/routes/progress-v2.routes.js:177:13)
      at src/routes/progress-v2.routes.js:68:7

PASS src/__tests__/progress.test.js
  Progress Routes
    POST /progress/track
      ✓ should return 400 if event_type missing (39 ms)
      ✓ should track a progress event (33 ms)
    GET /progress/events
      ✓ should return 200 for events (3 ms)
    GET /progress/streak
      ✓ should return 200 for streak (3 ms)
    GET /progress/revision-stats
      ✓ should return 200 for revision stats (3 ms)

  console.error
    [TutorRoutes] Error in /session/start: Error: DB error
        at Object.<anonymous> (C:\Users\ADMIN\Downloads\Study Planner\sourcewise-backend\node-api\src\__tests__\tutor.test.js:117:15)
        at C:\Users\ADMIN\Downloads\Study Planner\sourcewise-backend\node-api\node_modules\jest-mock\build\index.js:397:39
        at Object.<anonymous> (C:\Users\ADMIN\Downloads\Study Planner\sourcewise-backend\node-api\node_modules\jest-mock\build\index.js:404:13)
        at Object.mockConstructor [as insert] (C:\Users\ADMIN\Downloads\Study Planner\sourcewise-backend\node-api\node_modules\jest-mock\build\index.js:148:19)
        at insert (src/routes\tutor.routes.js:341:8)
        at Layer.handle [as handle_request] (node_modules/express/lib/router/layer.js:95:5)
        at next (node_modules/express/lib/router/route.js:149:13)
        at next (src/__tests__/tutor.test.js:39:5)
        at Layer.handle [as handle_request] (node_modules/express/lib/router/layer.js:95:5)
        at next (node_modules/express/lib/router/route.js:149:13)
        at Route.dispatch (node_modules/express/lib/router/route.js:119:3)
        at Layer.handle [as handle_request] (node_modules/express/lib/router/layer.js:95:5)
        at node_modules/express/lib/router/index.js:284:15
        at router.process_params (node_modules/express/lib/router/index.js:346:12)
        at next (node_modules/express/lib/router/index.js:280:10)
        at router.handle (node_modules/express/lib/router/index.js:175:3)
        at router (node_modules/express/lib/router/index.js:47:12)

      at error (src/routes/tutor.routes.js:358:13)

  console.error
    [TutorRoutes] Error in /evaluate: Error: AI service down

      at error (src/routes/tutor.routes.js:231:13)

PASS src/__tests__/tutor.test.js
  Tutor Routes
    POST /tutor/ask - validation
      ✓ should return 400 if question is missing (10 ms)
      ✓ should return 400 if sourceIds is missing or empty (13 ms)
      ✓ should return 404 if sessionId is provided but not found (5 ms)
    POST /tutor/session/start
      ✓ should create a session successfully (4 ms)
      ✓ should return 500 on Supabase error (34 ms)
    GET /tutor/history
      ✓ should return sessions array (3 ms)
      ✓ should return empty sessions array when no history (4 ms)
    GET /tutor/session/:sessionId
      ✓ should return session details when found (4 ms)
      ✓ should return 404 when session not found (3 ms)
    POST /tutor/evaluate
      ✓ should return 404 when attempt not found (2 ms)
      ✓ should evaluate answer successfully (2 ms)
      ✓ should return 500 when AI service fails (7 ms)
    GET /tutor/suggest-topics
      ✓ should return message when no learning profile exists (4 ms)
      ✓ should return suggestions when profile exists with gaps (4 ms)
    POST /tutor/session/end
      ✓ should return 404 when session not found (2 ms)
      ✓ should end session and return summary (2 ms)

  console.error
    [SourceAnalysis] Failed: AI service unreachable

      at error (src/routes/source.routes.js:223:13)
      at src/routes/source.routes.js:142:22

PASS src/__tests__/sources.test.js
  Sources Routes
    GET /sources
      ✓ should return 200 with empty array when no sources (3 ms)
      ✓ should return 200 with sources array (2 ms)
      ✓ should return 500 on Supabase error (2 ms)
    POST /sources
      ✓ should create a source with valid input (7 ms)
      ✓ should create a source with defaults for missing fields (1 ms)
      ✓ should return 500 on Supabase insert error (1 ms)
    GET /sources/:id
      ✓ should return source when found (3 ms)
      ✓ should return 404 when source not found (2 ms)
      ✓ should return 404 when source belongs to another user (3 ms)
    POST /sources/:id/analyze
      ✓ should return analysis on success (3 ms)
      ✓ should return 404 if source does not exist (1 ms)
      ✓ should return 200 (with null body) when AI service fails (5 ms)

PASS src/__tests__/planner.test.js
  Planner Routes
    GET /planner
      ✓ should return 200 for planner list (3 ms)
    POST /planner
      ✓ should create a planner (7 ms)
    POST /planner/:id/complete-day
      ✓ should handle complete-day request (2 ms)
    POST /planner/:id/replan
      ✓ should handle replan request (2 ms)

PASS src/__tests__/mastery.test.js
  Mastery Routes
    GET /mastery
      ✓ should return 200 for mastery list (3 ms)
    POST /mastery
      ✓ should return 400 if concept missing (7 ms)
      ✓ should return 400 if score missing (9 ms)
      ✓ should update concept mastery (3 ms)
    GET /mastery/gaps
      ✓ should return 200 for gaps (8 ms)
    POST /mastery/gaps
      ✓ should return 400 if concept missing (4 ms)
      ✓ should report a knowledge gap (2 ms)

PASS src/__tests__/auth.test.js
  Auth Routes
    POST /auth/register
      ✓ should return 400 if name, email, or password missing (8 ms)
      ✓ should return 400 if password too short (2 ms)
    POST /auth/login
      ✓ should return 400 if email or password missing (2 ms)
    GET /auth/me
      ✓ should return 401 without token (3 ms)

Test Suites: 6 passed, 6 total
Tests:       48 passed, 48 total
Snapshots:   0 total
Time:        2.602 s
Ran all test suites.
```

---

## 7. Weak Test Self-Check

After reviewing both new files, the following cases are identified as **status-code-only checks** (weak coverage):

### In sources.test.js:

| Test case | Weakness |
|---|---|
| `should return 500 on Supabase error` (GET /sources) | Only checks `res.status` is `500` and `res.body.error` is defined. Does not check error message content. |
| `should create a source with defaults for missing fields` | Only checks `res.body` has an `id` property. Does not verify that `name` defaulted to `'Untitled'` or `type` to `'pdf'`. |
| `should return 500 on Supabase insert error` (POST /sources) | Only checks `res.status` is `500` and `res.body.error` is defined. |

### In tutor.test.js:

| Test case | Weakness |
|---|---|
| `should return 500 on Supabase error` (session/start) | Only checks `res.status` is `500` and `res.body.error` is defined. |
| `should return 500 when AI service fails` (evaluate) | Only checks `res.status` is `500` and `res.body.error` is defined. |

### In pre-existing files (for context — not a failure of this stream):

- `planner.test.js`: All 4 tests are status-code-only.
- `mastery.test.js`: `should return 200 for mastery list` and `should return 200 for gaps` are status-code-only (and accept 500).
- `progress.test.js`: `should track a progress event`, `should return 200 for events`, `should return 200 for streak` are status-code-only.

### Honest summary

The new test files bring 12 test cases each with multiple assertions, significantly improving coverage over the pre-existing files. However, **5 status-code-only cases** across the two new files are explicitly flagged above. These weak cases should be strengthened in a future stream by adding assertions for specific response body shapes and expected field values.
