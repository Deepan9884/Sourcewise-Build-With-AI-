/**
 * Structured JSON logger — no external deps.
 * Level via LOG_LEVEL (debug|info|warn|error). Defaults to info.
 * Never log secrets: callers must redact tokens/keys.
 */
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const currentLevelName = (process.env.LOG_LEVEL || 'info').toLowerCase();
const currentLevel = LEVELS[currentLevelName] ?? LEVELS.info;

function baseFields() {
  return {
    service: 'sourcewise-node-api',
    env: process.env.NODE_ENV || 'development',
    ts: new Date().toISOString(),
  };
}

function emit(level, msg, fields = {}) {
  if ((LEVELS[level] ?? 20) < currentLevel) return;
  const { req, res, ...safe } = fields;
  const line = { ...baseFields(), level, msg, ...safe };
  // eslint-disable-next-line no-console
  const out = level === 'error' || level === 'warn' ? console.error : console.log;
  out(JSON.stringify(line));
}

module.exports = {
  debug: (msg, fields) => emit('debug', msg, fields),
  info: (msg, fields) => emit('info', msg, fields),
  warn: (msg, fields) => emit('warn', msg, fields),
  error: (msg, fields) => {
    const f = { ...fields };
    if (f.err instanceof Error) {
      f.error = f.err.message;
      f.stack = process.env.NODE_ENV === 'development' ? f.err.stack : undefined;
      delete f.err;
    }
    emit('error', msg, f);
  },
};
