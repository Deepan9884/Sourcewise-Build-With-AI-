/**
 * Notes Routes Tests
 * Tests: Cloud storage CRUD operations, normalization, validation, title extraction
 */

const request = require('supertest');
const express = require('express');

const mockNoteRow = {
  id: 'note-123',
  user_id: 'test-user-id',
  name: 'Cell Biology Notes',
  type: 'note',
  summary: '# Cell Biology\n\n- Mitochondria is the powerhouse.\n- Nucleus stores DNA.',
  difficulty: 'Balanced',
  created_at: '2026-10-01T06:00:00.000Z',
  concepts: {
    style: 'Comprehensive Study Notes',
    depth: 'Balanced',
    topic: 'Biology',
  },
  analysis: {
    wordCount: 10,
    lastModified: '2026-10-01T06:30:00.000Z',
    sourceIds: ['source-1'],
  },
};

const mockSupabaseChain = (returnData = [mockNoteRow]) => {
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockNoteRow, error: null }),
    })),
    update: jest.fn().mockImplementation(() => ({
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { ...mockNoteRow, name: 'Updated Biology Notes', summary: '# Updated\n\nNew content' },
        error: null,
      }),
    })),
    delete: jest.fn().mockImplementation(() => ({
      eq: jest.fn().mockReturnThis(),
    })),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockImplementation(() => Promise.resolve({ data: Array.isArray(returnData) ? returnData : [returnData], error: null })),
    single: jest.fn().mockImplementation(() => Promise.resolve({ data: mockNoteRow, error: null })),
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

const notesRoutes = require('../routes/notes.routes');

describe('Notes Routes (Cloud Storage)', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/notes', notesRoutes);
  });

  describe('GET /notes', () => {
    it('should return list of user notes from cloud storage', async () => {
      const res = await request(app).get('/notes');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].title).toBe('Cell Biology Notes');
      expect(res.body[0].depth).toBe('Balanced');
      expect(res.body[0].style).toBe('Comprehensive Study Notes');
    });
  });

  describe('GET /notes/:id', () => {
    it('should return a single note by ID', async () => {
      const res = await request(app).get('/notes/note-123');
      expect(res.status).toBe(200);
      expect(res.body.id).toBe('note-123');
      expect(res.body.content).toContain('Cell Biology');
    });
  });

  describe('POST /notes', () => {
    it('should require note content', async () => {
      const res = await request(app)
        .post('/notes')
        .send({ title: 'Empty Note' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('content is required');
    });

    it('should save a new note to cloud storage', async () => {
      const res = await request(app)
        .post('/notes')
        .send({
          title: 'Cell Biology Notes',
          content: '# Cell Biology\n\n- Mitochondria is the powerhouse.',
          style: 'Comprehensive Study Notes',
          depth: 'Balanced',
          topic: 'Biology',
        });
      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Cell Biology Notes');
    });

    it('should auto-derive title from markdown heading if title is omitted', async () => {
      const res = await request(app)
        .post('/notes')
        .send({
          content: '# Photosynthesis & Respiration\n\nDetailed notes here.',
          depth: 'In-Depth',
        });
      expect(res.status).toBe(201);
    });
  });

  describe('PUT /notes/:id', () => {
    it('should update an existing note in cloud storage', async () => {
      const res = await request(app)
        .put('/notes/note-123')
        .send({
          title: 'Updated Biology Notes',
          content: '# Updated\n\nNew content',
        });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Biology Notes');
    });
  });

  describe('DELETE /notes/:id', () => {
    it('should delete a note from cloud storage', async () => {
      const res = await request(app).delete('/notes/note-123');
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('deleted');
    });
  });
});
