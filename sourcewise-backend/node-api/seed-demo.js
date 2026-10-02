/**
 * SourceWise Demo Account Seeder v2
 * Uses Node API's own internal logic (bypassing RLS via the Express routes)
 * OR directly generates a SQL file to run in Supabase.
 * 
 * Since the SUPABASE_SERVICE_ROLE_KEY = ANON_KEY (same key in .env),
 * this script uses a two-pass approach:
 * 1. Insert user row directly (uses the public INSERT policy)
 * 2. Generate SQL for all other data (to paste in Supabase SQL editor)
 * 
 * OR: Run with BYPASS_RLS=true to use direct Supabase REST admin endpoint.
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

// Use anon key (only way we have)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

const DEMO_EMAIL = 'demo@gmail.com';
const DEMO_PASSWORD = '123456';
const DEMO_NAME = 'Alex Morgan';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

function dateStrDaysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function dateStrDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function sqlStr(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') return val.toString();
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

async function upsertUser() {
  console.log('👤 Creating/updating demo user…');
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', DEMO_EMAIL)
    .maybeSingle();

  if (existing) {
    // Update via upsert won't work without service role, try direct insert-on-conflict
    console.log('  ✓ Demo user already exists — ID:', existing.id);
    return existing.id;
  }

  const { data: user, error } = await supabase
    .from('users')
    .insert({
      email: DEMO_EMAIL,
      password_hash: passwordHash,
      name: DEMO_NAME,
    })
    .select('id')
    .single();

  if (error) throw new Error('Failed to create user: ' + error.message);
  console.log('  ✓ Demo user created:', user.id);
  return user.id;
}

// ─── SQL Generator ─────────────────────────────────────────────────────────
function generateSQL(userId, sources) {
  const sourceIds = sources.map((_, i) => `'source_${i}_id'`);
  
  const lines = [];
  lines.push(`-- SourceWise Demo Data Seed`);
  lines.push(`-- Run this in Supabase SQL Editor`);
  lines.push(`-- User ID: ${userId}`);
  lines.push(`-- Email: demo@gmail.com / Password: 123456`);
  lines.push('');
  lines.push(`DO $$ DECLARE uid uuid := '${userId}';`);

  // Source IDs
  for (let i = 0; i < sources.length; i++) {
    lines.push(`  sid${i} uuid := '${sources[i].id}';`);
  }

  lines.push('BEGIN');
  lines.push('');
  lines.push('-- Learning profile update');
  lines.push(`INSERT INTO learning_profiles (user_id, concept_mastery, knowledge_gaps, study_patterns, preferences)`);
  lines.push(`VALUES (uid, '{}', '{}', '{"daily_goal_minutes": 120}', '{"style": "visual", "difficulty": "medium"}')`);
  lines.push(`ON CONFLICT (user_id) DO UPDATE SET preferences = EXCLUDED.preferences;`);
  lines.push('');

  lines.push('-- User credits update');
  lines.push(`INSERT INTO user_credits (user_id, total_credits, used_credits, reserved_credits, credit_tier)`);
  lines.push(`VALUES (uid, 10000, 3247, 0, 'pro')`);
  lines.push(`ON CONFLICT (user_id) DO UPDATE SET total_credits=10000, used_credits=3247, credit_tier='pro';`);
  lines.push('');

  // Sources
  lines.push('-- Sources (uploaded study materials)');
  lines.push(`DELETE FROM sources WHERE user_id = uid;`);
  for (const s of sources) {
    lines.push(`INSERT INTO sources (id, user_id, name, type, status, chunks_count, summary, difficulty, estimated_reading_time, concepts, analysis, created_at)`);
    lines.push(`VALUES ('${s.id}', uid, ${sqlStr(s.name)}, 'pdf', 'ready', ${s.chunks_count}, ${sqlStr(s.summary)}, ${sqlStr(s.difficulty)}, ${s.estimated_reading_time}, ${sqlStr(s.concepts)}, ${sqlStr(s.analysis)}, ${sqlStr(s.created_at)});`);
  }
  lines.push('');

  // Source analysis
  lines.push('-- Source analysis');
  lines.push(`DELETE FROM source_analysis WHERE user_id = uid;`);
  for (const s of sources) {
    const kc = s.analysis?.key_concepts || [];
    lines.push(`INSERT INTO source_analysis (source_id, user_id, summary, key_concepts, difficulty, estimated_reading_time)`);
    lines.push(`VALUES ('${s.id}', uid, ${sqlStr(s.summary)}, ${sqlStr(kc)}, ${sqlStr(s.difficulty)}, ${s.estimated_reading_time});`);
  }
  lines.push('');

  // Concept mastery
  lines.push('-- Concept mastery');
  lines.push(`DELETE FROM concept_mastery WHERE user_id = uid;`);
  const masteryRows = [
    { concept: 'Linear Regression', sid: sources[0].id, score: 92, level: 'mastery', confidence: 95, total: 18, correct: 16, dayAgo: 2, nextDay: 7 },
    { concept: 'Logistic Regression', sid: sources[0].id, score: 88, level: 'proficient', confidence: 85, total: 12, correct: 10, dayAgo: 3, nextDay: 5 },
    { concept: 'Neural Networks', sid: sources[0].id, score: 74, level: 'developing', confidence: 70, total: 15, correct: 11, dayAgo: 1, nextDay: 3 },
    { concept: 'Support Vector Machines', sid: sources[0].id, score: 61, level: 'developing', confidence: 55, total: 9, correct: 5, dayAgo: 4, nextDay: 1 },
    { concept: 'K-Means Clustering', sid: sources[0].id, score: 85, level: 'proficient', confidence: 80, total: 10, correct: 8, dayAgo: 5, nextDay: 3 },
    { concept: 'PCA', sid: sources[0].id, score: 45, level: 'novice', confidence: 40, total: 6, correct: 2, dayAgo: 6, nextDay: 0 },
    { concept: 'Reinforcement Learning', sid: sources[0].id, score: 38, level: 'novice', confidence: 30, total: 5, correct: 1, dayAgo: 8, nextDay: 0 },
    { concept: 'Big-O Notation', sid: sources[1].id, score: 96, level: 'mastery', confidence: 99, total: 22, correct: 21, dayAgo: 1, nextDay: 10 },
    { concept: 'Dynamic Programming', sid: sources[1].id, score: 71, level: 'developing', confidence: 65, total: 14, correct: 10, dayAgo: 2, nextDay: 2 },
    { concept: 'Graph Algorithms', sid: sources[1].id, score: 79, level: 'proficient', confidence: 75, total: 11, correct: 8, dayAgo: 3, nextDay: 3 },
    { concept: 'Red-Black Trees', sid: sources[1].id, score: 52, level: 'developing', confidence: 45, total: 7, correct: 3, dayAgo: 7, nextDay: 0 },
    { concept: 'Hash Tables', sid: sources[1].id, score: 91, level: 'mastery', confidence: 90, total: 16, correct: 14, dayAgo: 2, nextDay: 7 },
    { concept: 'Load Balancing', sid: sources[2].id, score: 83, level: 'proficient', confidence: 80, total: 8, correct: 6, dayAgo: 4, nextDay: 3 },
    { concept: 'Database Sharding', sid: sources[2].id, score: 67, level: 'developing', confidence: 60, total: 6, correct: 4, dayAgo: 5, nextDay: 1 },
    { concept: 'CAP Theorem', sid: sources[2].id, score: 75, level: 'proficient', confidence: 70, total: 8, correct: 6, dayAgo: 6, nextDay: 3 },
    { concept: 'Vector Spaces', sid: sources[3].id, score: 88, level: 'proficient', confidence: 85, total: 10, correct: 9, dayAgo: 3, nextDay: 5 },
    { concept: 'Eigenvalues', sid: sources[3].id, score: 72, level: 'developing', confidence: 65, total: 8, correct: 5, dayAgo: 5, nextDay: 1 },
    { concept: 'Spectral Theorem', sid: sources[3].id, score: 48, level: 'novice', confidence: 40, total: 5, correct: 2, dayAgo: 8, nextDay: 0 },
  ];
  for (const m of masteryRows) {
    const lastAssessed = daysAgo(m.dayAgo);
    const nextReview = daysFromNow(m.nextDay);
    lines.push(`INSERT INTO concept_mastery (user_id, concept, source_id, mastery_score, confidence_score, total_attempts, correct_attempts, last_assessed, next_review_date, interval_days, level)`);
    lines.push(`VALUES (uid, ${sqlStr(m.concept)}, '${m.sid}', ${m.score}, ${m.confidence}, ${m.total}, ${m.correct}, ${sqlStr(lastAssessed)}, ${sqlStr(nextReview)}, ${m.nextDay || 1}, ${sqlStr(m.level)});`);
  }
  lines.push('');

  // Knowledge gaps
  lines.push('-- Knowledge gaps');
  lines.push(`DELETE FROM knowledge_gaps WHERE user_id = uid;`);
  const gaps = [
    { concept: 'PCA', sid: sources[0].id, severity: 5, status: 'open', resolved: null },
    { concept: 'Reinforcement Learning', sid: sources[0].id, severity: 4, status: 'open', resolved: null },
    { concept: 'Red-Black Trees', sid: sources[1].id, severity: 4, status: 'open', resolved: null },
    { concept: 'Spectral Theorem', sid: sources[3].id, severity: 3, status: 'open', resolved: null },
    { concept: 'EM Algorithm', sid: sources[4].id, severity: 5, status: 'open', resolved: null },
    { concept: 'MCMC', sid: sources[4].id, severity: 4, status: 'open', resolved: null },
    { concept: 'Linear Regression', sid: sources[0].id, severity: 2, status: 'resolved', resolved: daysAgo(5) },
    { concept: 'Big-O Notation', sid: sources[1].id, severity: 3, status: 'resolved', resolved: daysAgo(10) },
  ];
  for (const g of gaps) {
    lines.push(`INSERT INTO knowledge_gaps (user_id, concept, source_id, severity, status${g.resolved ? ', resolved_at' : ''})`);
    lines.push(`VALUES (uid, ${sqlStr(g.concept)}, '${g.sid}', ${g.severity}, ${sqlStr(g.status)}${g.resolved ? ', ' + sqlStr(g.resolved) : ''});`);
  }
  lines.push('');

  // Review schedule
  lines.push('-- Review schedule (spaced repetition)');
  lines.push(`DELETE FROM review_schedule WHERE user_id = uid;`);
  const reviews = [
    { concept: 'PCA', sid: sources[0].id, score: 45, nextDay: 0, interval: 1, lastDay: 1, count: 3 },
    { concept: 'Reinforcement Learning', sid: sources[0].id, score: 38, nextDay: 0, interval: 1, lastDay: 2, count: 2 },
    { concept: 'Red-Black Trees', sid: sources[1].id, score: 52, nextDay: 0, interval: 1, lastDay: 1, count: 4 },
    { concept: 'Support Vector Machines', sid: sources[0].id, score: 61, nextDay: 1, interval: 1, lastDay: 1, count: 6 },
    { concept: 'Database Sharding', sid: sources[2].id, score: 67, nextDay: 1, interval: 1, lastDay: 2, count: 3 },
    { concept: 'Eigenvalues', sid: sources[3].id, score: 72, nextDay: 1, interval: 1, lastDay: 2, count: 5 },
    { concept: 'Dynamic Programming', sid: sources[1].id, score: 71, nextDay: 2, interval: 2, lastDay: 2, count: 7 },
    { concept: 'Neural Networks', sid: sources[0].id, score: 74, nextDay: 3, interval: 3, lastDay: 1, count: 8 },
    { concept: 'Graph Algorithms', sid: sources[1].id, score: 79, nextDay: 3, interval: 3, lastDay: 3, count: 6 },
    { concept: 'Load Balancing', sid: sources[2].id, score: 83, nextDay: 3, interval: 3, lastDay: 4, count: 5 },
    { concept: 'K-Means Clustering', sid: sources[0].id, score: 85, nextDay: 3, interval: 3, lastDay: 5, count: 9 },
    { concept: 'Logistic Regression', sid: sources[0].id, score: 88, nextDay: 5, interval: 5, lastDay: 3, count: 12 },
    { concept: 'Linear Regression', sid: sources[0].id, score: 92, nextDay: 7, interval: 7, lastDay: 2, count: 18 },
    { concept: 'Hash Tables', sid: sources[1].id, score: 91, nextDay: 7, interval: 7, lastDay: 2, count: 16 },
    { concept: 'Big-O Notation', sid: sources[1].id, score: 96, nextDay: 10, interval: 10, lastDay: 1, count: 22 },
  ];
  for (const r of reviews) {
    lines.push(`INSERT INTO review_schedule (user_id, concept, source_id, mastery_score, next_review_date, interval_days, last_reviewed, review_count)`);
    lines.push(`VALUES (uid, ${sqlStr(r.concept)}, '${r.sid}', ${r.score}, ${sqlStr(daysFromNow(r.nextDay))}, ${r.interval}, ${sqlStr(daysAgo(r.lastDay))}, ${r.count});`);
  }
  lines.push('');

  // Progress events (25 days worth)
  lines.push('-- Progress events (study history)');
  lines.push(`DELETE FROM progress_events WHERE user_id = uid;`);
  const concepts = ['Linear Regression', 'Neural Networks', 'Dynamic Programming', 'Graph Algorithms', 'K-Means Clustering', 'Support Vector Machines', 'Hash Tables', 'Load Balancing', 'Vector Spaces', 'Eigenvalues'];
  const eventTypes = ['quiz', 'practice', 'flashcard_review', 'revision_completed'];
  // Source uploads
  for (const s of sources) {
    lines.push(`INSERT INTO progress_events (user_id, event_type, source_id, metadata, created_at) VALUES (uid, 'source_upload', '${s.id}', ${sqlStr({ source_name: s.name })}, ${sqlStr(s.created_at)});`);
    lines.push(`INSERT INTO progress_events (user_id, event_type, source_id, metadata, created_at) VALUES (uid, 'source_analyzed', '${s.id}', ${sqlStr({ concepts_extracted: 6 })}, ${sqlStr(s.created_at)});`);
  }
  // Daily study events
  for (let day = 1; day <= 25; day++) {
    const n = Math.floor(Math.random() * 3) + 2;
    for (let a = 0; a < n; a++) {
      const concept = concepts[(day + a) % concepts.length];
      const score = Math.floor(Math.random() * 35) + 58;
      const correct = score >= 70;
      const sid = sources[(day + a) % sources.length].id;
      const evType = eventTypes[(day + a) % eventTypes.length];
      lines.push(`INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, ${sqlStr(evType)}, ${sqlStr(concept)}, '${sid}', ${score}, ${correct}, ${Math.floor(Math.random() * 20) + 10}, '{}', ${sqlStr(daysAgo(day))});`);
    }
  }
  // Today
  lines.push(`INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata) VALUES (uid, 'quiz', 'Neural Networks', '${sources[0].id}', 78, true, 15, '{}');`);
  lines.push(`INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata) VALUES (uid, 'flashcard_review', 'Big-O Notation', '${sources[1].id}', 95, true, 8, '{}');`);
  lines.push(`INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata) VALUES (uid, 'practice', 'Dynamic Programming', '${sources[1].id}', 65, false, 25, '{}');`);
  lines.push('');

  // Tutoring sessions
  lines.push('-- Tutoring sessions');
  lines.push(`DELETE FROM tutoring_sessions WHERE user_id = uid;`);
  const topics = [
    'Understanding backpropagation in neural networks',
    'Dynamic programming problem-solving strategies',
    'Graph traversal algorithms comparison',
    'Support vector machine kernel tricks',
    'Matrix factorization for recommendation systems',
    'Load balancing strategies for distributed systems',
    'Eigenvalue decomposition applications',
    'SQL query optimization techniques',
    'Probability distributions in machine learning',
    'Greedy algorithm design patterns',
  ];
  for (let i = 0; i < 20; i++) {
    const dayBack = Math.floor(Math.random() * 18) + 1;
    const dur = Math.floor(Math.random() * 35) + 15;
    const q = Math.floor(Math.random() * 7) + 2;
    const sat = Math.floor(Math.random() * 3) + 7;
    const sid = sources[i % sources.length].id;
    lines.push(`INSERT INTO tutoring_sessions (user_id, source_id, topic, duration_minutes, questions_asked, satisfaction_score, created_at) VALUES (uid, '${sid}', ${sqlStr(topics[i % topics.length])}, ${dur}, ${q}, ${sat}, ${sqlStr(daysAgo(dayBack))});`);
  }
  lines.push('');

  // Practice attempts
  lines.push('-- Practice attempts');
  lines.push(`DELETE FROM practice_attempts WHERE user_id = uid;`);
  const pracConcepts = ['Linear Regression', 'Neural Networks', 'Dynamic Programming', 'Graph Algorithms', 'Hash Tables', 'Support Vector Machines', 'Eigenvalues', 'Load Balancing'];
  for (let i = 0; i < 45; i++) {
    const dayBack = Math.floor(Math.random() * 16) + 1;
    const score = Math.floor(Math.random() * 42) + 52;
    const sid = sources[i % Math.min(3, sources.length)].id;
    lines.push(`INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, ${sqlStr(pracConcepts[i % pracConcepts.length])}, '${sid}', ${score}, ${score >= 70}, ${Math.floor(Math.random() * 90) + 30}, ${sqlStr(daysAgo(dayBack))});`);
  }
  lines.push('');

  // Quiz results
  lines.push('-- Quiz results');
  lines.push(`DELETE FROM quiz_results WHERE user_id = uid;`);
  const quizTopics = ['Machine Learning Fundamentals', 'Algorithm Analysis', 'System Design Patterns', 'Linear Algebra', 'Probability Theory', 'Operating Systems', 'Database Design'];
  for (let i = 0; i < 15; i++) {
    const dayBack = Math.floor(Math.random() * 18) + 1;
    const score = Math.floor(Math.random() * 38) + 57;
    const correct = Math.round((score / 100) * 10);
    const sid = sources[i % sources.length].id;
    lines.push(`INSERT INTO quiz_results (user_id, source_id, topic, score, total_questions, correct_answers, time_taken, created_at) VALUES (uid, '${sid}', ${sqlStr(quizTopics[i % quizTopics.length])}, ${score}, 10, ${correct}, ${Math.floor(Math.random() * 12) + 5}, ${sqlStr(daysAgo(dayBack))});`);
  }
  lines.push('');

  // Analytics snapshots
  lines.push('-- Analytics snapshots (8 weekly)');
  lines.push(`DELETE FROM analytics_snapshots WHERE user_id = uid;`);
  for (let w = 7; w >= 0; w--) {
    const base = 55 + (7 - w) * 4;
    const mastery = Math.min(12, 3 + (7 - w));
    lines.push(`INSERT INTO analytics_snapshots (user_id, period, snapshot_date, study_hours, quiz_accuracy, revision_consistency, topics_mastered, topics_total, learning_velocity, data, created_at)`);
    lines.push(`VALUES (uid, 'weekly', ${sqlStr(dateStrDaysAgo(w * 7))}, ${(7 + w * 0.5).toFixed(1)}, ${Math.min(92, base)}, ${Math.min(88, 45 + (7 - w) * 6)}, ${mastery}, 18, ${2 + (7-w)%3}, '{"events":20,"quizzes":6,"tutorSessions":3}', ${sqlStr(daysAgo(w * 7))});`);
  }
  lines.push('');

  // Progress table
  lines.push('-- Progress table');
  lines.push(`DELETE FROM progress WHERE user_id = uid;`);
  const progRows = [
    { subject: 'Machine Learning', pct: 68, day: 1 },
    { subject: 'Data Structures & Algorithms', pct: 75, day: 2 },
    { subject: 'System Design', pct: 72, day: 3 },
    { subject: 'Mathematics', pct: 70, day: 1 },
  ];
  for (const p of progRows) {
    lines.push(`INSERT INTO progress (user_id, subject, completion_percentage, last_updated) VALUES (uid, ${sqlStr(p.subject)}, ${p.pct}, ${sqlStr(daysAgo(p.day))});`);
  }
  lines.push('');

  // Study analytics (30 days)
  lines.push('-- Study analytics (30 days)');
  lines.push(`DELETE FROM study_analytics WHERE user_id = uid;`);
  for (let day = 0; day < 30; day++) {
    const mins = Math.floor(Math.random() * 85) + 35;
    const sessions = Math.floor(Math.random() * 3) + 1;
    const topics_c = Math.floor(Math.random() * 3) + 1;
    const qscore = Math.floor(Math.random() * 28) + 67;
    lines.push(`INSERT INTO study_analytics (user_id, date, study_minutes, sessions, topics_covered, quiz_score) VALUES (uid, ${sqlStr(dateStrDaysAgo(day))}, ${mins}, ${sessions}, ${topics_c}, ${qscore});`);
  }
  lines.push('');

  // Token usage logs
  lines.push('-- Token usage logs');
  lines.push(`DELETE FROM token_usage_logs WHERE user_id = uid;`);
  const tokenModels = ['gemini-1.5-flash', 'gemini-1.5-pro'];
  const tokenEndpoints = ['/tutor/agent', '/tutor/orchestrator', '/chat', '/sources/analyze'];
  for (let i = 0; i < 30; i++) {
    const dayBack = Math.floor(Math.random() * 14);
    const pt = Math.floor(Math.random() * 750) + 200;
    const ct = Math.floor(Math.random() * 550) + 100;
    const cost = ((pt + ct) / 1000 * 0.0015).toFixed(6);
    const lat = Math.floor(Math.random() * 1800) + 500;
    const model = tokenModels[i % 2];
    const endpoint = tokenEndpoints[i % 4];
    lines.push(`INSERT INTO token_usage_logs (user_id, request_id, provider, model, endpoint, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, latency_ms, compression_applied, compression_ratio, success, created_at) VALUES (uid, ${sqlStr('demo-req-' + i)}, 'gemini', ${sqlStr(model)}, ${sqlStr(endpoint)}, ${pt}, ${ct}, ${pt+ct}, ${cost}, ${lat}, ${i%2===0}, 0.75, true, ${sqlStr(daysAgo(dayBack))});`);
  }
  lines.push('');

  // V13: mood_checkins (if table exists)
  lines.push('-- Mood check-ins (V13 — skip if table not present)');
  lines.push(`DELETE FROM mood_checkins WHERE user_id = uid;`);
  const moodVals = ['energized', 'focused', 'neutral', 'tired', 'stressed', 'anxious'];
  for (let day = 14; day >= 0; day--) {
    const mood = moodVals[day % moodVals.length];
    const energy = Math.floor(Math.random() * 4) + 2;
    const focus = Math.floor(Math.random() * 4) + 2;
    const stress = Math.floor(Math.random() * 4) + 1;
    lines.push(`INSERT INTO mood_checkins (user_id, mood, energy_level, focus_level, stress_level, source, created_at) VALUES (uid, ${sqlStr(mood)}, ${energy}, ${focus}, ${stress}, 'manual', ${sqlStr(daysAgo(day))});`);
  }
  lines.push(`INSERT INTO mood_checkins (user_id, mood, energy_level, focus_level, stress_level, source, notes) VALUES (uid, 'focused', 4, 5, 2, 'manual', 'Feeling great for the hackathon demo!');`);
  lines.push('');

  // ─── V13 STUDY PLANS (requires v13_study_organizer_schema.sql) ───────────────
  lines.push('-- ═══════════════════════════════════════════════════════════════════');
  lines.push('-- V13 STUDY PLANS (requires v13_study_organizer_schema.sql to be run first)');
  lines.push('-- ═══════════════════════════════════════════════════════════════════');
  lines.push('');

  // Generate plan and subject UUIDs
  const planId = genUUID();
  const oldPlanId = genUUID();
  const subjectIds = [genUUID(), genUUID(), genUUID(), genUUID()];
  const oldSubjId = genUUID();

  lines.push(`-- Declare V13 UUIDs`);
  lines.push(`DO $v13$ DECLARE`);
  lines.push(`  uid uuid := '${userId}';`);
  lines.push(`  plan_id uuid := '${planId}';`);
  lines.push(`  old_plan_id uuid := '${oldPlanId}';`);
  lines.push(`  subj0 uuid := '${subjectIds[0]}';`);
  lines.push(`  subj1 uuid := '${subjectIds[1]}';`);
  lines.push(`  subj2 uuid := '${subjectIds[2]}';`);
  lines.push(`  subj3 uuid := '${subjectIds[3]}';`);
  lines.push(`  old_subj uuid := '${oldSubjId}';`);
  for (let i = 0; i < sources.length; i++) {
    lines.push(`  src${i} uuid := '${sources[i].id}';`);
  }
  lines.push('BEGIN');
  lines.push('');

  lines.push('-- Clear existing V13 data');
  lines.push(`DELETE FROM schedule_slots WHERE plan_id IN (SELECT id FROM study_plans WHERE user_id = uid);`);
  lines.push(`DELETE FROM plan_subjects WHERE plan_id IN (SELECT id FROM study_plans WHERE user_id = uid);`);
  lines.push(`DELETE FROM replan_events WHERE plan_id IN (SELECT id FROM study_plans WHERE user_id = uid);`);
  lines.push(`DELETE FROM study_plans WHERE user_id = uid;`);
  lines.push(`DELETE FROM calendar_events WHERE user_id = uid;`);
  lines.push('');

  // Active study plan
  lines.push('-- Active study plan: ML Engineer Exam Prep 2026');
  lines.push(`INSERT INTO study_plans (id, user_id, name, exam_period_start, exam_period_end, daily_study_budget_minutes, preferred_start_time, preferred_end_time, break_preferences, status, plan_data, generation_context)`);
  lines.push(`VALUES (plan_id, uid, 'ML Engineer Exam Prep 2026', ${sqlStr(dateStrDaysAgo(5))}, ${sqlStr(dateStrDaysFromNow(45))}, 150, '09:00', '22:00', '{"shortBreak":10,"longBreak":30,"sessionsBeforeLong":4}', 'active', '{"totalSlots":127,"generatedAt":"${daysAgo(4)}"}', '{"subjectCount":4}');`);
  lines.push('');

  // Plan subjects
  const subjectDefs = [
    { name: 'Machine Learning', exam: dateStrDaysFromNow(30), weight: 1.5, mastery: 68, target: 85, sid: `ARRAY[src0, src4]`, diff: 'hard', priority: 1.8, color: '#6366f1' },
    { name: 'Data Structures & Algorithms', exam: dateStrDaysFromNow(22), weight: 1.2, mastery: 75, target: 90, sid: 'ARRAY[src1]', diff: 'hard', priority: 1.5, color: '#8b5cf6' },
    { name: 'System Design', exam: dateStrDaysFromNow(38), weight: 1.0, mastery: 72, target: 80, sid: 'ARRAY[src2]', diff: 'medium', priority: 1.2, color: '#a78bfa' },
    { name: 'Mathematics', exam: dateStrDaysFromNow(12), weight: 0.8, mastery: 70, target: 80, sid: 'ARRAY[src3]', diff: 'medium', priority: 1.0, color: '#c4b5fd' },
  ];
  for (let i = 0; i < subjectDefs.length; i++) {
    const s = subjectDefs[i];
    lines.push(`INSERT INTO plan_subjects (id, plan_id, subject_name, exam_date, exam_weight, current_mastery, target_mastery, source_ids, difficulty_estimate, priority_score, color)`);
    lines.push(`VALUES (subj${i}, plan_id, ${sqlStr(s.name)}, ${sqlStr(s.exam)}, ${s.weight}, ${s.mastery}, ${s.target}, ${s.sid}, ${sqlStr(s.diff)}, ${s.priority}, ${sqlStr(s.color)});`);
  }
  lines.push('');

  // Old completed plan
  lines.push('-- Completed plan: Python Fundamentals Sprint');
  lines.push(`INSERT INTO study_plans (id, user_id, name, exam_period_start, exam_period_end, daily_study_budget_minutes, preferred_start_time, preferred_end_time, break_preferences, status, plan_data, generation_context)`);
  lines.push(`VALUES (old_plan_id, uid, 'Python Fundamentals Sprint', ${sqlStr(dateStrDaysAgo(60))}, ${sqlStr(dateStrDaysAgo(30))}, 90, '18:00', '22:00', '{}', 'completed', '{"totalSlots":54}', '{}');`);
  lines.push(`INSERT INTO plan_subjects (id, plan_id, subject_name, exam_date, exam_weight, current_mastery, target_mastery, difficulty_estimate, priority_score, color)`);
  lines.push(`VALUES (old_subj, old_plan_id, 'Python Basics', ${sqlStr(dateStrDaysAgo(30))}, 1.0, 95, 90, 'easy', 1.0, '#10b981');`);
  lines.push('');

  // Schedule slots
  lines.push('-- Schedule slots (past 5 days + today + 40 days future)');
  const slotTopics = {
    subj0: ['Gradient Descent Deep Dive', 'Regularization Techniques', 'CNN Architecture', 'Transformer Models', 'Loss Functions', 'Model Evaluation', 'Feature Engineering', 'Cross-Validation'],
    subj1: ['Binary Search Tree Operations', 'Graph BFS/DFS', 'DP on Intervals', 'Sliding Window Pattern', 'Heap Problems', 'Trie Implementation', 'Union Find', 'Segment Trees'],
    subj2: ['URL Shortener Design', 'Chat System Architecture', 'News Feed Design', 'Rate Limiter', 'Distributed Cache', 'Search Autocomplete'],
    subj3: ['Linear Transformations', 'Gram-Schmidt Process', 'Probability Axioms', 'Bayes Theorem Practice', 'Matrix Decomposition'],
  };
  const timeSlots = [['09:00','10:30'],['10:45','12:15'],['14:00','15:30'],['16:00','17:00'],['19:00','20:30']];
  const slotTypes = ['study','review','quiz','study','study'];
  const actTypes = ['read','practice','flashcards','quiz','summarize'];
  const subjKeys = ['subj0','subj1','subj2','subj3'];

  // Past slots
  for (let day = 5; day >= 1; day--) {
    const dateStr = dateStrDaysAgo(day);
    const subjKey = subjKeys[(day - 1) % 4];
    const topicList = slotTopics[subjKey];
    const ts = timeSlots[day % timeSlots.length];
    const status = day <= 2 ? 'completed' : (day === 3 ? 'skipped' : 'completed');
    lines.push(`INSERT INTO schedule_slots (plan_id, subject_id, date, start_time, end_time, duration_minutes, slot_type, topic, activity_type, status, is_fixed, generated_by)`);
    lines.push(`VALUES (plan_id, ${subjKey}, '${dateStr}', '${ts[0]}', '${ts[1]}', 90, ${sqlStr(slotTypes[day % slotTypes.length])}, ${sqlStr(topicList[day % topicList.length])}, ${sqlStr(actTypes[day % actTypes.length])}, ${sqlStr(status)}, false, 'ai_initial');`);
  }

  // Today
  const todayStr = new Date().toISOString().slice(0, 10);
  for (let i = 0; i < 3; i++) {
    const subjKey = subjKeys[i % 4];
    const topicList = slotTopics[subjKey];
    const ts = timeSlots[i];
    const st = i === 0 ? 'completed' : 'pending';
    lines.push(`INSERT INTO schedule_slots (plan_id, subject_id, date, start_time, end_time, duration_minutes, slot_type, topic, activity_type, status, is_fixed, generated_by)`);
    lines.push(`VALUES (plan_id, ${subjKey}, '${todayStr}', '${ts[0]}', '${ts[1]}', 90, ${sqlStr(slotTypes[i])}, ${sqlStr(topicList[0])}, ${sqlStr(actTypes[i % actTypes.length])}, '${st}', false, 'ai_initial');`);
  }

  // Future slots (40 days)
  for (let day = 1; day <= 40; day++) {
    const dateStr = dateStrDaysFromNow(day);
    const n = day % 5 === 0 ? 1 : 2; // Rest day every 5 days
    for (let s = 0; s < n; s++) {
      const subjKey = subjKeys[(day + s) % 4];
      const topicList = slotTopics[subjKey];
      const ts = timeSlots[(day + s) % timeSlots.length];
      lines.push(`INSERT INTO schedule_slots (plan_id, subject_id, date, start_time, end_time, duration_minutes, slot_type, topic, activity_type, status, is_fixed, generated_by)`);
      lines.push(`VALUES (plan_id, ${subjKey}, '${dateStr}', '${ts[0]}', '${ts[1]}', 90, ${sqlStr(slotTypes[(day+s) % slotTypes.length])}, ${sqlStr(topicList[(day+s) % topicList.length])}, ${sqlStr(actTypes[(day+s) % actTypes.length])}, 'pending', false, 'ai_initial');`);
    }
  }
  lines.push('');

  // Replan events
  lines.push('-- Replan events');
  lines.push(`INSERT INTO replan_events (plan_id, trigger_type, trigger_data, slots_affected, slots_rescheduled, user_approved, created_at)`);
  lines.push(`VALUES (plan_id, 'mood_shift', '{"mood":"tired","multiplier":0.8}', 3, 3, false, ${sqlStr(daysAgo(3))});`);
  lines.push(`INSERT INTO replan_events (plan_id, trigger_type, trigger_data, slots_affected, slots_rescheduled, user_approved, created_at)`);
  lines.push(`VALUES (plan_id, 'manual', '{"reason":"Extra DS practice"}', 5, 5, true, ${sqlStr(daysAgo(6))});`);
  lines.push(`INSERT INTO replan_events (plan_id, trigger_type, trigger_data, slots_affected, slots_rescheduled, user_approved, created_at)`);
  lines.push(`VALUES (plan_id, 'missed_day', '{"missedCount":2}', 8, 6, false, ${sqlStr(daysAgo(10))});`);
  lines.push('');

  // Calendar events
  lines.push('-- Calendar events');
  lines.push(`INSERT INTO calendar_events (user_id, title, event_type, start_time, end_time, description, metadata) VALUES (uid, 'ML Final Exam', 'exam', ${sqlStr(daysFromNow(30))}, ${sqlStr(daysFromNow(30))}, 'CS229 Machine Learning Final', '{"is_blocker":true}');`);
  lines.push(`INSERT INTO calendar_events (user_id, title, event_type, start_time, end_time, description, metadata) VALUES (uid, 'DSA Final Exam', 'exam', ${sqlStr(daysFromNow(22))}, ${sqlStr(daysFromNow(22))}, 'Data Structures Final', '{"is_blocker":true}');`);
  lines.push(`INSERT INTO calendar_events (user_id, title, event_type, start_time, end_time, description, metadata) VALUES (uid, 'Linear Algebra Midterm', 'exam', ${sqlStr(daysFromNow(12))}, ${sqlStr(daysFromNow(12))}, 'Midterm for Linear Algebra', '{"is_blocker":true}');`);
  lines.push(`INSERT INTO calendar_events (user_id, title, event_type, start_time, end_time, description) VALUES (uid, 'Study Group - ML', 'class', ${sqlStr(daysFromNow(3))}, ${sqlStr(daysFromNow(3))}, 'Weekly ML study group');`);
  lines.push(`INSERT INTO calendar_events (user_id, title, event_type, start_time, end_time, description, metadata) VALUES (uid, 'Hackathon Demo Day', 'work', ${sqlStr(daysFromNow(7))}, ${sqlStr(daysFromNow(7))}, 'SourceWise hackathon presentation', '{"is_blocker":true}');`);
  lines.push('');

  lines.push('END $v13$;');
  lines.push('');

  lines.push('END $$;');
  return lines.join('\n');
}

async function getUserIdOnly() {
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', DEMO_EMAIL)
    .maybeSingle();
  return existing?.id || null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 SourceWise Hackathon Demo Seeder v2');
  console.log('════════════════════════════════════════\n');

  try {
    const userId = await upsertUser();
    if (!userId) throw new Error('Could not get user ID');

    // Build source objects with generated UUIDs (we'll create them via SQL)
    const { v4: uuidv4 } = require('crypto');
    const genUUID = () => {
      const bytes = require('crypto').randomBytes(16);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = bytes.toString('hex');
      return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
    };

    const sourceDefinitions = [
      { name: 'Introduction to Machine Learning - Stanford CS229.pdf', chunks: 342, diff: 'hard', readTime: 480, dayAgo: 18, concepts: ['Linear Regression', 'Logistic Regression', 'Neural Networks', 'Support Vector Machines', 'K-Means Clustering', 'PCA', 'Reinforcement Learning'], summary: 'Comprehensive introduction to ML covering supervised learning, neural networks, SVMs, and unsupervised methods.' },
      { name: 'Data Structures and Algorithms - CLRS 4th Edition.pdf', chunks: 891, diff: 'hard', readTime: 960, dayAgo: 15, concepts: ['Big-O Notation', 'Sorting Algorithms', 'Dynamic Programming', 'Graph Algorithms', 'Red-Black Trees', 'Hash Tables', 'Greedy Algorithms', 'NP-Completeness'], summary: 'The definitive textbook on algorithms covering sorting, graph theory, dynamic programming, and advanced data structures.' },
      { name: 'System Design Interview - Alex Xu Volume 2.pdf', chunks: 278, diff: 'medium', readTime: 360, dayAgo: 12, concepts: ['Load Balancing', 'Database Sharding', 'Caching Strategies', 'Message Queues', 'CDN', 'Microservices', 'CAP Theorem'], summary: 'Practical guide to designing large-scale distributed systems with case studies.' },
      { name: 'Linear Algebra Done Right - Axler.pdf', chunks: 198, diff: 'medium', readTime: 300, dayAgo: 10, concepts: ['Vector Spaces', 'Linear Maps', 'Eigenvalues', 'Inner Products', 'Spectral Theorem', 'Operators'], summary: 'Mathematically rigorous approach to linear algebra focusing on vector spaces and linear maps.' },
      { name: 'Probability and Statistics for ML - Murphy.pdf', chunks: 423, diff: 'hard', readTime: 540, dayAgo: 7, concepts: ['Bayes Theorem', 'Gaussian Distributions', 'Maximum Likelihood', 'EM Algorithm', 'Graphical Models', 'MCMC'], summary: 'Statistical foundations for machine learning including Bayesian inference and graphical models.' },
      { name: 'Operating Systems - Three Easy Pieces.pdf', chunks: 312, diff: 'medium', readTime: 420, dayAgo: 5, concepts: ['Process Scheduling', 'Virtual Memory', 'File Systems', 'Threads & Locks', 'Deadlock', 'I/O Systems'], summary: 'Modern approach to operating systems covering virtualization, concurrency, and persistence.' },
      { name: 'Week 3 Lecture Notes - Neural Architecture Search.pdf', chunks: 47, diff: 'hard', readTime: 60, dayAgo: 3, concepts: ['DARTS', 'Efficient NAS', 'Hardware-aware NAS', 'Once-for-All Networks', 'Proxy Tasks'], summary: 'Lecture notes on Neural Architecture Search covering differentiable architecture search.' },
      { name: 'Database Systems - Ramakrishnan & Gehrke.pdf', chunks: 612, diff: 'medium', readTime: 600, dayAgo: 2, concepts: ['SQL', 'Query Optimization', 'ACID Transactions', 'B+ Trees', 'Concurrency Control', 'Recovery'], summary: 'Comprehensive coverage of relational database systems including SQL and query optimization.' },
    ];

    const sources = sourceDefinitions.map(def => ({
      id: genUUID(),
      name: def.name,
      chunks_count: def.chunks,
      difficulty: def.diff,
      estimated_reading_time: def.readTime,
      created_at: daysAgo(def.dayAgo),
      concepts: def.concepts,
      summary: def.summary,
      analysis: { overview: def.summary, key_concepts: def.concepts, difficulty_assessment: def.diff, estimated_study_time: def.readTime },
    }));

    console.log('📝 Generating SQL seed file…');
    const sql = generateSQL(userId, sources);

    const outputPath = path.join(__dirname, 'demo-seed.sql');
    fs.writeFileSync(outputPath, sql);

    console.log('\n════════════════════════════════════════');
    console.log('✅ STEP 1 COMPLETE — User created!\n');
    console.log('  📧 Email:    demo@gmail.com');
    console.log('  🔑 Password: 123456');
    console.log('  🆔 User ID: ', userId);
    console.log('\n════════════════════════════════════════');
    console.log('⚠️  STEP 2 REQUIRED — Run SQL in Supabase:\n');
    console.log(`  SQL file generated: demo-seed.sql`);
    console.log(`  Full path: ${outputPath}`);
    console.log('\n  HOW TO SEED THE DATA:');
    console.log('  1. Open: https://supabase.com/dashboard');
    console.log('  2. Select your project');
    console.log('  3. Go to: SQL Editor');
    console.log('  4. Click "New query"');
    console.log('  5. Paste the contents of demo-seed.sql');
    console.log('  6. Click "Run"');
    console.log('\n  The SQL file seeds:');
    console.log('  📚 8 study material sources');
    console.log('  🎯 18 concept mastery records');
    console.log('  🕳️  8 knowledge gaps (6 open, 2 resolved)');
    console.log('  📅 15 review schedule entries');
    console.log('  📊 ~150 progress events (25 days)');
    console.log('  💬 20 tutoring sessions');
    console.log('  🏋️  45 practice attempts');
    console.log('  📝 15 quiz results');
    console.log('  📈 8 weekly analytics snapshots + 30-day study data');
    console.log('  🪙 30 token usage logs');
    console.log('  😊 16 mood check-ins');
    console.log('  🏆 Progress tracking per subject\n');
    console.log('  NOTE: Study plans (V13) require v13_study_organizer_schema.sql first.');
    console.log('  If applied, the SQL also includes study plans + schedule slots.\n');

  } catch (err) {
    console.error('\n❌ Failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
