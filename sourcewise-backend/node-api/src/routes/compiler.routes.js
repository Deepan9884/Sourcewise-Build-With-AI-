const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const compilerService = require('../services/compilerService');
const logger = require('../utils/logger');

// Optional authentication middleware: attaches req.user if token is valid, but allows guest access
const optionalAuthenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.query.token;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded?.userId) {
        req.user = { id: decoded.userId, _id: decoded.userId };
      }
    }
  } catch (e) {
    // Guest fallback
  }
  next();
};

router.use(optionalAuthenticate);

/**
 * GET /compiler/languages
 * Returns list of supported languages, versions, compilers, and algorithmic starter templates
 */
router.get('/languages', (req, res) => {
  res.json({
    languages: compilerService.SUPPORTED_LANGUAGES,
    templates: compilerService.CODE_TEMPLATES,
  });
});

/**
 * POST /compiler/execute
 * Compiles and executes code in the requested language
 */
router.post('/execute', async (req, res) => {
  const { language, code, stdin, compiler } = req.body;

  if (!language) {
    return res.status(400).json({ error: 'Language is required.' });
  }

  if (typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ error: 'Code cannot be empty.' });
  }

  if (code.length > 50000) {
    return res.status(400).json({ error: 'Code length exceeds maximum allowed limit (50KB).' });
  }

  try {
    const result = await compilerService.executeCode({
      language,
      code,
      stdin: stdin || '',
      compiler: compiler || null,
    });

    logger.info('compiler.execute_success', {
      language: result.language,
      status: result.status,
      timeMs: result.execution_time_ms,
      userId: req.user?.id || 'guest',
    });

    res.json(result);
  } catch (err) {
    logger.error('compiler.execute_error', {
      error: err.message,
      language,
      userId: req.user?.id || 'guest',
    });

    const status = err.message.includes('Unsupported language') ? 400 : 500;
    res.status(status).json({
      error: err.message,
      success: false,
      status: 1,
    });
  }
});

/**
 * POST /compiler/ai-assist
 * Explains code, diagnoses errors, optimizes code, or generates test cases
 */
router.post('/ai-assist', async (req, res) => {
  const { action = 'explain', language, code, error_output = '' } = req.body;

  if (!language) {
    return res.status(400).json({ error: 'Language is required.' });
  }

  if (typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ error: 'Code cannot be empty.' });
  }

  const validActions = ['explain', 'fix', 'optimize', 'test_cases'];
  if (!validActions.includes(action)) {
    return res.status(400).json({
      error: `Invalid action '${action}'. Must be one of: ${validActions.join(', ')}`,
    });
  }

  try {
    const result = await compilerService.aiAssist({
      action,
      language,
      code,
      error_output,
      user_id: req.user?.id,
    });

    res.json(result);
  } catch (err) {
    logger.error('compiler.ai_assist_error', { error: err.message, action });
    res.status(500).json({ error: err.message || 'AI assistance failed.' });
  }
});

module.exports = router;
