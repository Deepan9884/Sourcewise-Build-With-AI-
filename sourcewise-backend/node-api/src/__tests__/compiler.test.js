const request = require('supertest');
const express = require('express');
const axios = require('axios');

jest.mock('axios');

const compilerRoutes = require('../routes/compiler.routes');
const compilerService = require('../services/compilerService');

describe('Compiler Service & Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/compiler', compilerRoutes);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('compilerService helper functions', () => {
    it('should resolve language aliases correctly', () => {
      expect(compilerService.resolveLanguage('python')).toBe('python');
      expect(compilerService.resolveLanguage('py')).toBe('python');
      expect(compilerService.resolveLanguage('js')).toBe('javascript');
      expect(compilerService.resolveLanguage('c++')).toBe('cpp');
      expect(compilerService.resolveLanguage('rs')).toBe('rust');
      expect(compilerService.resolveLanguage('golang')).toBe('go');
      expect(compilerService.resolveLanguage('unknown_xyz')).toBeNull();
    });

    it('should execute JS fallback locally when needed', async () => {
      axios.post.mockRejectedValueOnce(new Error('Network error'));
      const res = await compilerService.executeCode({
        language: 'javascript',
        code: 'console.log("fallback test");',
      });
      expect(res.success).toBe(true);
      expect(res.stdout).toContain('fallback test');
      expect(res.engine).toBe('local-sandbox');
    });
  });

  describe('GET /compiler/languages', () => {
    it('should return all supported languages and templates', async () => {
      const res = await request(app).get('/compiler/languages');
      expect(res.status).toBe(200);
      expect(res.body.languages).toBeDefined();
      expect(res.body.languages.python).toBeDefined();
      expect(res.body.languages.cpp).toBeDefined();
      expect(res.body.languages.javascript).toBeDefined();
      expect(res.body.templates).toBeDefined();
    });
  });

  describe('POST /compiler/execute', () => {
    it('should return 400 if language is missing', async () => {
      const res = await request(app).post('/compiler/execute').send({ code: 'print(1)' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Language is required');
    });

    it('should return 400 if code is empty', async () => {
      const res = await request(app).post('/compiler/execute').send({ language: 'python', code: '   ' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Code cannot be empty');
    });

    it('should return 400 for unsupported language', async () => {
      const res = await request(app).post('/compiler/execute').send({ language: 'brainfuck99', code: '+++' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Unsupported language');
    });

    it('should successfully execute code and return formatted response', async () => {
      axios.post.mockResolvedValueOnce({
        data: {
          status: '0',
          program_output: 'Hello DeepCode!\n',
          program_error: '',
          compiler_error: '',
        },
      });

      const res = await request(app).post('/compiler/execute').send({
        language: 'python',
        code: 'print("Hello DeepCode!")',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe(0);
      expect(res.body.stdout).toBe('Hello DeepCode!\n');
      expect(res.body.language).toBe('python');
    });

    it('should handle compiler errors accurately', async () => {
      axios.post.mockResolvedValueOnce({
        data: {
          status: '1',
          program_output: '',
          program_error: '',
          compiler_error: 'prog.cc:2:1: error: expected semicolon\n',
        },
      });

      const res = await request(app).post('/compiler/execute').send({
        language: 'cpp',
        code: 'int main() { error }',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(false);
      expect(res.body.status).toBe(1);
      expect(res.body.compiler_error).toContain('expected semicolon');
    });
  });

  describe('POST /compiler/ai-assist', () => {
    it('should return 400 for invalid action', async () => {
      const res = await request(app).post('/compiler/ai-assist').send({
        action: 'hack_the_planet',
        language: 'python',
        code: 'x = 1',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid action');
    });

    it('should return analysis from AI or fallback', async () => {
      axios.post.mockResolvedValueOnce({
        data: { reply: 'Here is how your algorithm runs in O(N) time.' },
      });

      const res = await request(app).post('/compiler/ai-assist').send({
        action: 'explain',
        language: 'python',
        code: 'for i in range(10): print(i)',
      });

      expect(res.status).toBe(200);
      expect(res.body.analysis).toContain('O(N)');
    });
  });
});
