const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('express-async-errors');

// Environment validation
const requiredEnvVars = ['JWT_SECRET', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingEnvVars.length > 0) {
  console.warn(`⚠️  Missing environment variables: ${missingEnvVars.join(', ')}`);
  console.warn('   Server will start but some features may not work.');
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const { requestLogger } = require('./middleware/requestLogger');

// Route imports
const authRoutes = require('./routes/auth.routes');
const sourceRoutes = require('./routes/source.routes');
const plannerRoutes = require('./routes/planner.routes');
const tutorRoutes = require('./routes/tutor.routes');
const learningProfileRoutes = require('./routes/learning-profile.routes');
const progressV2Routes = require('./routes/progress-v2.routes');
const dashboardV2Routes = require('./routes/dashboard-v2.routes');
const analyticsV2Routes = require('./routes/analytics-v2.routes');
const revisionRoutes = require('./routes/revision.routes');
const masteryRoutes = require('./routes/mastery.routes');
const settingsRoutes = require('./routes/settings.routes');
const adminRoutes = require('./routes/admin.routes');
const moodRoutes = require('./routes/mood.routes');
const calendarRoutes = require('./routes/calendar.routes');
const studyPlanRoutes = require('./routes/study-plans.routes');
const scheduleSlotRoutes = require('./routes/schedule-slots.routes');
const eventRoutes = require('./routes/events.routes');
const puzzleRoutes = require('./routes/puzzles.routes');
const compilerRoutes = require('./routes/compiler.routes');
const notesRoutes = require('./routes/notes.routes');

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet());

const staticAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:3000',
];

if (process.env.FRONTEND_ORIGIN) {
  const customOrigins = process.env.FRONTEND_ORIGIN.split(',').map(o => o.trim()).filter(Boolean);
  staticAllowedOrigins.push(...customOrigins);
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    // Exact matches
    if (staticAllowedOrigins.includes(origin)) return callback(null, true);

    // Match *.vercel.app preview and deployment domains
    try {
      const url = new URL(origin);
      if (url.hostname.endsWith('.vercel.app')) {
        return callback(null, true);
      }
    } catch (e) {
      // invalid URL format
    }

    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Internal-Key'],
}));

// ─── Rate Limiting ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const dataLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Rate limit exceeded. Please slow down.' },
});

// ─── Parsing Middleware ────────────────────────────────────────────────────────
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// ─── Logging ──────────────────────────────────────────────────────────────────
app.use(requestLogger);
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  const checks = { api: 'ok', database: 'unknown', ai_service: 'unknown' };

  try {
    const supabase = require('./utils/supabase');
    const { error } = await supabase.from('users').select('id', { count: 'exact', head: true });
    checks.database = error ? 'error' : 'ok';
  } catch (e) { checks.database = 'error'; }

  if (process.env.GEMINI_API_KEY) {
    checks.ai_service = 'ok (Gemini Cloud LLM)';
  } else {
    try {
      const axios = require('axios');
      const aiUrl = process.env.PYTHON_AI_URL;
      if (aiUrl && !aiUrl.includes('localhost')) {
        const response = await axios.get(`${aiUrl}/health`, { timeout: 3000 });
        checks.ai_service = response.data?.status === 'ok' ? 'ok' : 'degraded';
      } else {
        checks.ai_service = 'ready';
      }
    } catch (e) { checks.ai_service = 'unavailable'; }
  }

  const overallStatus = checks.api === 'ok' && checks.database === 'ok' ? 'healthy' : 'degraded';

  res.status(overallStatus === 'healthy' ? 200 : 503).json({
    status: overallStatus,
    service: 'SourceWise Node.js API',
    timestamp: new Date().toISOString(),
    version: '11.0.0',
    uptime: Math.round(process.uptime()),
    features: ['auth', 'sources', 'planner', 'tutor', 'progress', 'analytics', 'revision', 'mastery', 'dashboard', 'admin', 'credits', 'metrics', 'mood', 'calendar', 'study-plans', 'schedule', 'events', 'puzzles', 'compiler', 'notes'],
    checks,
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
const metricsRoutes = require('./routes/metrics.routes');
app.use('/metrics', metricsRoutes);
app.use('/auth', authLimiter, authRoutes);
app.use('/sources', dataLimiter, sourceRoutes);
app.use('/planner', dataLimiter, plannerRoutes);
app.use('/tutor', dataLimiter, tutorRoutes);
app.use('/learning-profile', dataLimiter, learningProfileRoutes);
app.use('/progress', dataLimiter, progressV2Routes);
app.use('/dashboard', dataLimiter, dashboardV2Routes);
app.use('/analytics', dataLimiter, analyticsV2Routes);
app.use('/revision', dataLimiter, revisionRoutes);
app.use('/mastery', dataLimiter, masteryRoutes);
app.use('/settings', dataLimiter, settingsRoutes);
app.use('/admin', dataLimiter, adminRoutes);
app.use('/mood', dataLimiter, moodRoutes);
app.use('/calendar', dataLimiter, calendarRoutes);
app.use('/study-plans', dataLimiter, studyPlanRoutes);
app.use('/schedule', dataLimiter, scheduleSlotRoutes);
app.use('/events', eventRoutes);
app.use('/puzzles', dataLimiter, puzzleRoutes);
app.use('/compiler', dataLimiter, compilerRoutes);
app.use('/notes', dataLimiter, notesRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info('server.start', { port: PORT, env: process.env.NODE_ENV || 'development', version: '11.0.0', missingEnvVars });
    if (missingEnvVars.length > 0) {
      logger.warn('server.missing_env', { missing: missingEnvVars });
    }
    
    // Start replan evaluator (hourly) — pg_cron preferred in production DB,
    // Node fallback here keeps single-instance deployments working.
    const REPLAN_INTERVAL = 60 * 60 * 1000; // 1 hour
    const runReplanEval = async () => {
      try {
        const replanning = require('./services/replanningService');
        const results = await replanning.evaluateAllPlans();
        if (results.length) {
          logger.info('cron.replan', { actions: results.length });
          try {
            const push = require('./routes/events.routes').pushToUser;
            for (const r of results) {
              if (r.userId && !r.error) push(r.userId, { type: 'replan', data: r });
            }
          } catch (e) { /* SSE optional */ }
        }
      } catch (err) {
        logger.error('cron.replan_failed', { err });
      }
    };
    if (process.env.NODE_ENV === 'production' || process.env.ENABLE_REPLAN_CRON === 'true') {
      setInterval(runReplanEval, REPLAN_INTERVAL);
      logger.info('cron.replan_started', { intervalMs: REPLAN_INTERVAL });
    }

    // Start snapshot cron (every 6 hours in production)
    if (process.env.NODE_ENV === 'production') {
      const SNAPSHOT_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours
      setInterval(async () => {
        try {
          const supabase = require('./utils/supabase');
          const { data: users } = await supabase.from('users').select('id');
          if (users) {
            for (const user of users) {
              // Generate weekly snapshot
              await generateSnapshot(user.id, 'weekly');
            }
            console.log(`[Cron] Generated snapshots for ${users.length} users`);
          }
        } catch (err) {
          logger.error('cron.snapshot_failed', { err });
        }
      }, SNAPSHOT_INTERVAL);
      logger.info('cron.snapshot_started', { intervalMs: SNAPSHOT_INTERVAL });
    }
  });
}

async function generateSnapshot(userId, period) {
  const supabase = require('./utils/supabase');
  const periodDays = period === 'daily' ? 1 : period === 'monthly' ? 30 : 7;
  const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();

  const [eventsResult, quizResult, masteryResult, tutorResult] = await Promise.all([
    supabase.from('progress_events').select('event_type, score, duration_minutes, correct, created_at').eq('user_id', userId).gte('created_at', startDate),
    supabase.from('practice_attempts').select('correct, score, concept, created_at').eq('user_id', userId).gte('created_at', startDate),
    supabase.from('concept_mastery').select('concept, mastery_score, level').eq('user_id', userId),
    supabase.from('tutoring_sessions').select('duration_minutes, created_at').eq('user_id', userId).gte('created_at', startDate),
  ]);

  const events = eventsResult.data || [];
  const quizzes = quizResult.data || [];
  const mastery = masteryResult.data || [];
  const tutorSessions = tutorResult.data || [];

  const studyHours = Math.round(tutorSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / 60 * 10) / 10;
  const quizAccuracy = quizzes.length > 0 ? Math.round(quizzes.filter(q => q.correct).length / quizzes.length * 100) : 0;
  const topicsMastered = mastery.filter(m => m.level === 'mastery' || m.level === 'proficient').length;

  await supabase.from('analytics_snapshots').insert({
    user_id: userId,
    period,
    study_hours: studyHours,
    quiz_accuracy: quizAccuracy,
    revision_consistency: Math.round((events.filter(e => e.event_type === 'revision_completed').length / Math.max(periodDays, 1)) * 100),
    topics_mastered: topicsMastered,
    topics_total: mastery.length,
    learning_velocity: mastery.filter(m => {
      const lastAssessed = m.last_assessed || m.created_at;
      return new Date(lastAssessed) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }).length,
    data: { events: events.length, quizzes: quizzes.length, tutorSessions: tutorSessions.length },
  });
}

module.exports = app;
