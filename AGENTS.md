# AGENTS.md — SourceWise Study Agent

> **v13 — Gap-closure release.** Closes v11 monitoring/CI gaps, wires the
> Creator Console as a standalone app, and documents v13 Study Organizer
> drift. Treat these numbers as ground truth.

---

## Repository layout (four web services + mobile)

```
Study Planner/
├── sourcewise-frontend/          # React 19 / Vite 8 SPA (port 5173)
├── sourcewise-dashboard/         # React 19 / Vite 8 Creator Console (port 5174, standalone admin SPA)
├── sourcewise-backend/
│   ├── node-api/                 # Express 4 / Node 20 REST API (port 4000)
│   └── python-ai/                # FastAPI / Python 3.11 AI service (port 8000)
├── sourcewise-mobile/            # Expo 54 / React Native 0.81 mobile client
├── monitoring/                   # Prometheus alert rules
├── docker-compose.yml            # Orchestrates node-api + python-ai + dashboard
└── .github/workflows/            # 3 CI workflows (main.yml, pr-check.yml, deploy.yml)
```

The main frontend is NOT containerised — it runs standalone via `vite dev` or
produces a static `dist/` build. The Creator Dashboard IS containerised
(nginx, port 5174). The mobile app is not containerised.

---

## How the services talk to each other

```
┌─────────────────┐       HTTP        ┌──────────────────┐
│  sourcewise-     │ ──────────────── │   node-api       │
│  frontend :5173  │  (REST, JWT)     │  Express :4000   │
└─────────────────┘                  └────────┬─────────┘
┌─────────────────┐       HTTP               │
│  dashboard :5174│ ────────────────          │ HTTP (internal Docker network)
│  (admin SPA)    │  (REST, JWT, is_admin)    │ forwards JWT, calls AI
└─────────────────┘                           │
                                      ┌───────▼──────────┐
                                      │   python-ai       │
                                      │  FastAPI :8000    │
                                      │                   │
                                      │  Gemini / Grok    │ ← cloud LLM (LLM_PROVIDER selects primary, other is fallback)
                                      │  ChromaDB (disk)  │ ← vector store
                                      └───────────────────┘
```

- **Frontend → Node API**: REST calls with JWT Bearer token. CORS allows
  `localhost:5173`, `localhost:5174`, and the configured `FRONTEND_ORIGIN`.
- **Dashboard → Node API**: Same REST + JWT, plus `is_admin` gate on `/admin/*`.
- **Node API → Python AI**: Internal HTTP calls (e.g. `/chat`, `/tutor`,
  `/sources/analysis`). The `PYTHON_AI_URL` env var points to the FastAPI
  service. Node API is the auth gateway — it validates JWTs and passes
  `user_id` to the AI service, forwarding the `INTERNAL_API_KEY` shared
  secret as `X-Internal-Key` (required by python-ai when configured;
  `/`, `*/health`, `/metrics/*` stay open).
- **Python AI → Gemini/Grok**: Cloud LLM inference (no Ollama; legacy Ollama
  refs removed). No local GPU needed.
- **Python AI → ChromaDB**: Local on-disk vector store for RAG embeddings
  (path configured via `CHROMA_PERSIST_DIR`).
- **Node API → Supabase**: PostgreSQL (via Supabase JS client) for all
  relational data. Auth is a CUSTOM bcrypt + JWT scheme (not Supabase Auth);
  the server runs with `SUPABASE_SERVICE_ROLE_KEY` (required in production)
  and enforces auth in `middleware/auth.js`. RLS is deny-by-default for
  direct key access (see `fix_rls.sql`); it is not the authorization boundary.
- **Redis**: REMOVED — `redis`/`bullmq` deps pruned, no queue/cache code remains.

---

## Database: 37 tables (Supabase PostgreSQL)

### Base tables (pre-existing, referenced in fix_rls.sql)
1. `users`
2. `sources`
3. `planners`
4. `progress`
5. `quiz_results`
6. `learning_profiles`
7. `tutoring_sessions`
8. `practice_attempts`
9. `study_analytics`

### V2 schema additions (v2_schema.sql) — 6 tables
10. `source_analysis`
11. `concept_mastery`
12. `knowledge_gaps`
13. `progress_events`
14. `review_schedule`
15. `analytics_snapshots`

### V5 LIRS schema additions (v5_lirs_schema.sql) — 10 tables
16. `reinforcement_events`
17. `learning_outcomes`
18. `knowledge_gain`
19. `prompt_performance`
20. `agent_reflections`
21. `pattern_discoveries`
22. `teaching_effectiveness`
23. `recommendation_performance`
24. `artifact_quality_history`
25. `agent_knowledge_base`

All V2 and V5 tables have RLS enabled (auth.uid() policies, bypassed by the
service-role key). Base tables are deny-by-default for direct key access —
see `fix_rls.sql` header for the threat model. SQL migration files live in
`sourcewise-backend/node-api/`.

### V12 token-economy additions (token_tracking_schema.sql) — 5 tables
26. `user_credits` — per-user credit balance (total/used/reserved + tier)
27. `token_usage_logs` — immutable per-request ledger (provider, model,
    prompt/completion tokens, cost, compression stats, latency)
28. `credit_transactions` — purchases, grants, refunds, usage debits
29. `system_metrics` — aggregate time-series (tokens, cost, requests)
30. `provider_pricing` — admin-configurable $/1k-token pricing per model
Plus `users.is_admin` + `users.credit_tier` columns.

### V13 study-organizer additions (v13_study_organizer_schema.sql) — 7 tables
31. `mood_checkins` — manual/inferred mood + energy/focus/stress
32. `calendar_events` — Google Calendar sync (exam/class/work blockers)
33. `study_plans` — multi-subject plans with exam windows + budgets
34. `plan_subjects` — N subjects per plan with mastery targets
35. `schedule_slots` — scheduled study blocks
36. `replan_events` — auto-replan history
37. `user_integrations` — OAuth tokens (AES-256-GCM via `ENCRYPTION_KEY`)

---

## Frontend (sourcewise-frontend)

**Stack:** React 19, Vite 8, TailwindCSS 3, Zustand 5, React Router 7, Recharts 2
(no React Query — pruned; no frontend test framework per v11 scope)

| Area | Count | Details |
|------|-------|---------|
| Pages | 10 | Landing, Login, Signup, Dashboard, Sources, AIWorkspace, Planner, PlannerV2, ProgressCenter, Settings |
| Pages (reorg) | +3 | PlanHomePage (`/plan`, the heart — KPIs, PacingBar, TaskHybridList, embedded codex), KnowledgeHubPage (`/knowledge` — panel grid, slide-over, global chat), InsightsPage (`/insights` — trends, deviation, streaks, mood) |
| Components (reorg) | +6 | plan/ (3): PacingBar, MoodPulse, TaskHybridList. knowledge/ (3): SourceSlideOver, GlobalChatPanel (+ page-level grid). Tailwind `subject.*` tokens mirror the palette |
| E2E | Playwright | `e2e/` (LoginPage POM, app.spec 8 UI, api.spec 7 backend) — `npm run test:e2e` with `E2E_EMAIL`/`E2E_PASSWORD` env (never committed); local services required |
| Components | 13 core + 32 extras | ui/ (8): button, input, glow-card, ambient-light, study-progress-ring, particle-background, knowledge-graph, empty-state. layout/ (2): MainLayout, PageTransition. effects/ (3): AmbientEffects, CursorGlow, CelebrationEffect. Plus landing/ (4) and planner/ (28) design-system extras |
| Zustand stores | 5 | authStore, chatStore, sourceStore, tutorStore, plannerStore |
| API modules | 5 | agentApi, chatApi, orchestratorApi, studyPlansApi, utils |
| Router | 1 | AppRouter — 14 protected entries under MainLayout (`/plan` heart + `/plan/:planId`, `/knowledge`, `/insights`, plus legacy dashboard, sources, workspace ×2, planner, planner-v2, study-plans/:id, progress, arena, settings), 3 public (landing, login, signup) |
Key patterns: lazy-loaded pages via `React.lazy`, token hydration on mount,
ProtectedRoute guard redirects to `/` when unauthenticated.
Admin UI does NOT live here — it lives in `sourcewise-dashboard/`.
Post-login landing is `/plan` (Plan heart); `/dashboard` (legacy widgets) still mounted.

---

## Creator Dashboard (sourcewise-dashboard, standalone)

**Stack:** React 19, Vite 8, TailwindCSS 3, Zustand 5, React Router 7, Recharts 2, Vitest 2

| Area | Count | Details |
|------|-------|---------|
| Pages | 7 | Login + 6 admin: AdminDashboard (overview), AdminUsers (users & credits), AdminUserDetail, AdminUsage (token usage), AdminProviders (providers & costs), AdminSystem (uptime & system) |
| Pages (reorg) | +3 | AdminPlans (cross-user plans + pace), AdminContent (sources/chunks/analysis rate), AdminMood (check-ins, distribution, trend) + ActivityFeed (live SSE) on overview |
| Components | 1 admin | admin/AdminLayout (+StatCard) |
| Stores | 2 | authStore, adminStore |
| API | 2 | adminApi, utils |
| Router | 1 | App.tsx — public `/login`, protected `/`, `/dashboard`, `/users`, `/users/:id`, `/usage`, `/providers`, `/system`, `/plans`, `/content`, `/mood` |
| Tests | Vitest | `npm test -- --run` (wired in CI) |
| Dockerfile | 1 | Multi-stage node build → nginx:1.27-alpine, SPA fallback, `GET /health` → 200, port 80 (mapped to 5174 in compose) |

Talks to `VITE_API_URL` (default `http://localhost:4000`). Requires
`users.is_admin = true`.

---

## Node API (sourcewise-backend/node-api)

**Stack:** Express 4, Node 20, Supabase JS, Helmet, Morgan
(no Joi/BullMQ/Redis/multer — all pruned; validation is inline per-route)

| Area | Count | Details |
|------|-------|---------|
| Route files | 18 | auth, source, planner, tutor, learning-profile, progress-v2, dashboard-v2, analytics-v2, revision, mastery, settings, admin, mood, calendar, study-plans, schedule-slots, events, metrics (no duplicates). study-plans adds `/pacing`, `/subjects/:sid/trend`, `/adaptive`, `/adaptive/undo`; admin adds `/activity` (SSE), `/plans`, `/content`, `/mood` |
| Mounted route groups | 18 | `/auth`, `/sources`, `/planner`, `/tutor`, `/learning-profile`, `/progress`, `/dashboard`, `/analytics`, `/revision`, `/mastery`, `/settings`, `/admin` (admin requires `is_admin`), `/mood`, `/calendar`, `/study-plans`, `/schedule`, `/events` (SSE, no rate-limit), `/metrics` (JSON + `/prom`) |
| Middleware | 5 | auth.js (custom JWT verification; accepts `?token=` for SSE clients), errorHandler.js (structured via logger), tokenBudget.js (per-tier token budgets + credit reservation), adminAuth.js (is_admin gate), requestLogger.js (X-Request-Id correlation + per-route timing counters) |
| Services | 8 | creditService.js, tokenService.js, adminMetricsService.js, pacingService.js (pure pacing/trend/adaptive math), calendarService.js (v13), moodService.js (v13), multiSubjectPlanner.js (v13), replanningService.js (hourly cron) |
| Config | 1 | tokenTiers.js (free/basic/pro/enterprise budgets + monthly grants) |
| Utils | 3 | supabase.js (service-role singleton + resilientFetch), logger.js (JSON structured, LOG_LEVEL), encryption.js (AES-256-GCM, ENCRYPTION_KEY) |
| Controllers dir | 0 | Empty — route logic lives in route files |
| Test files | 15 | auth, mastery, planner, progress, sources, studyOrganizer, supabase, tokenBudget, tutor, metrics, gateway, pacing, adaptive, dashboard, adminAggregates (110 cases) |
| SQL migrations | 6 | v2_schema.sql, v5_lirs_schema.sql, v2_users_fix.sql, fix_rls.sql, token_tracking_schema.sql, v13_study_organizer_schema.sql |
| Dockerfile | 1 | node:20-slim, `npm ci --only=production`, exposes 4000 |

Auth flow: CUSTOM bcrypt + JWT issued on login/signup (7-day expiry, NOT
Supabase Auth). Protected routes verify via `middleware/auth.js`. Rate
limiting: 100 req/15min on auth, 1000 req/15min on data endpoints. Health
check at `GET /health` returns status of API, database, and AI service.
`GET /metrics` returns JSON counters; `GET /metrics/prom` returns
Prometheus exposition. Every response carries `X-Request-Id`.
Node→AI calls forward `INTERNAL_API_KEY` as `X-Internal-Key`.
Browser clients must call the AI via the Node gateway (`POST /tutor/orchestrator`,
`POST /tutor/agent` — JWT + budgets + metering) and NEVER call python-ai
directly; direct keyless calls get 401 when `INTERNAL_API_KEY` is set.

---

## Python AI Service (sourcewise-backend/python-ai)

**Stack:** FastAPI 0.109, Uvicorn, ChromaDB, sentence-transformers (all-MiniLM-L6-v2), Gemini/Grok cloud LLMs

| Area | Count | Details |
|------|-------|---------|
| FastAPI routers | 9 | ingest, chat, tutor, agent, source_analysis, orchestrator, tokens, mood_tutor, metrics (all non-health/non-metrics endpoints gated by `verify_internal_key` when `INTERNAL_API_KEY` is set) |
| Agent files (active) | 22 | 19 domain agents + base.py, registry.py, __init__.py |
| Agent files (removed) | 8 | Dead unreferenced modules deleted in hardening: confidence, educational_corpus, learning_science, memory_evolution, quality, quality_v2, reinforcement, reinforcement_scoring. No `_archive/` exists. |
| Agents registered in main.py | 11 | source_intelligence, knowledge, tutor, assessment, flashcard, learning_profile, study_planner, revision, analytics, recommendation, mood_aware_tutor (orchestrator chain additionally uses memory, self_improvement, specifications, educational_validation, trust_engine, golden_dataset, educational_dataset) |
| Service files (production) | 19 | llm, embedder, vector_store, rag_chain, chunker, extractor, concept_extractor, knowledge_graph_builder, explanation_engine, practice_generator, socratic_engine, tutor_chain, conversation_memory, personality_engine, intent_parser, action_executor, source_synthesizer, token_counter, context_compressor |
| Service test files | 14 | 10 in services/ (incl. chunker, embedder, + 2 integration suites that self-skip without keys) + root test_specifications.py + root test_internal_auth.py + tests/test_token_counter.py + tests/test_metrics.py |
| Service example files | 6 | *_example.py for concept_extractor, explanation_engine, knowledge_graph_builder, practice_generator, socratic_engine, tutor_chain |
| Utility files | 5 | production.py (CircuitBreaker/PerformanceMonitor — partially wired via /metrics), retry.py, security.py, internal_auth.py, logging.py (JSON structured, LOG_LEVEL) |
| Models | 1 | schemas.py (Pydantic models) |
| Dockerfile | 1 | python:3.11-slim, exposes 8000 |

RAG pipeline: Document upload → text extraction (PDF/DOCX) → chunking →
embedding via sentence-transformers → ChromaDB storage. Query → embedding →
ChromaDB similarity search → rerank → Gemini/Grok LLM generation with context.
Observability: JSON logs via `app/utils/logging.py`, request timing middleware
in `main.py`, `GET /metrics`, `GET /metrics/prom`, `GET /metrics/ready`
(embedder + chroma + LLM-key checks).

---

## Mobile (sourcewise-mobile)

**Stack:** Expo 54, React Native 0.81, Expo Router 6, Zustand 5, React Query 5

| Area | Count | Details |
|------|-------|---------|
| App screens | 10 | tabs/ (6): index, sources, planner, chat, _layout + _layout root. auth/ (1): login. Root: _layout, modal, +not-found, +html |
| Zustand stores | 3 | authStore, analyticsStore, tutorStore |
| Components | 9 | EditScreenInfo, ExternalLink, StyledText, Themed, useClientOnlyValue (×2), useColorScheme (×2), __tests__/ |

Shares the same backend as the web frontend. Not containerised. Backend
URLs come from `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_AI_URL` (see mobile
`.env.example`); on physical devices these must be LAN IPs, not localhost.

---

## Docker Compose (3 services + 1 volume)

| Service | Image | Port | Healthcheck |
|---------|-------|------|-------------|
| python-ai | python:3.11-slim | 8000 | `curl -f http://localhost:8000/health` |
| node-api | node:20-slim | 4000 | `curl -f http://localhost:4000/health` |
| dashboard | nginx:1.27-alpine | 5174→80 | `wget -qO- http://localhost/health` |

- node-api depends on python-ai (condition: service_healthy)
- dashboard depends on node-api (condition: service_healthy)
- Volume: `chroma_data` mounted at `/app/chroma_db`
- `SUPABASE_SERVICE_ROLE_KEY` is passed through (required in production);
  `LOG_LEVEL` controls JSON log verbosity in both APIs.

---

## Local dev — one command (backend)

```powershell
cd sourcewise-backend
npm run setup   # once: installs node deps + pip deps
npm run dev     # boots Node API (:4000, Supabase-connected) + Python AI (:8000)
```

`scripts/dev.js` (zero deps) preflights runtimes, `node_modules`, `.env`
presence, and free ports, then spawns both services with prefixed logs
(`[api]` / `[ai]`) and health-gates (`/health` on both before printing
READY). Variants: `npm run dev:api`, `npm run dev:ai`, `npm start`
(production, no reload). Override the interpreter with `PYTHON_BIN`.
Press Ctrl+C to stop everything. The Generate-roadmap flow needs BOTH up:
browser → `:4000` → `:8000` → Gemini/Grok.

---

## CI/CD (3 GitHub Actions workflows)

| Workflow | Trigger | Jobs |
|----------|---------|------|
| `main.yml` | push to main, manual | build (frontend build, dashboard build + test, backend tests, AI tests incl. `tests/`) + docker-build (verifies all 3 images + `compose config`) |
| `pr-check.yml` | PR to main/develop | lint (frontend + dashboard + backend deps), build (frontend + dashboard + `dist/` artifacts), test-backend, test-dashboard (vitest), test-ai |
| `deploy.yml` | tags `v*`, releases, manual (staging/production) | publish (build + push node-api, python-ai, dashboard to GHCR with sha/tag/latest) + deploy-staging + deploy-production (compose-validated, health-gated, rollback documented) |

Test steps fail closed (`exit 1`) when no test files are found — no silent
skips. Images publish to GHCR; `latest` only on default branch.

---

## Key env vars

| Variable | Service | Purpose |
|----------|---------|---------|
| `JWT_SECRET` | node-api | JWT signing |
| `SUPABASE_URL` | node-api | PostgreSQL connection |
| `SUPABASE_ANON_KEY` | node-api | Supabase client auth (fallback only) |
| `SUPABASE_SERVICE_ROLE_KEY` | node-api | REQUIRED in production — server refuses to start without it |
| `PYTHON_AI_URL` | node-api | Internal URL to python-ai (canonical name; `PYTHON_SERVICE_URL` removed) |
| `INTERNAL_API_KEY` | node-api, python-ai | Shared secret, sent as `X-Internal-Key`; empty = local-dev open mode |
| `FRONTEND_ORIGIN` | node-api, python-ai | CORS origin |
| `LOG_LEVEL` | node-api, python-ai | JSON log verbosity (`info` / `INFO`) |
| `OLLAMA_BASE_URL` | python-ai | Legacy — unused (Grok/Gemini are cloud APIs) |
| `EMBEDDING_MODEL` | python-ai | HuggingFace model (default: all-MiniLM-L6-v2) |
| `CHROMA_PERSIST_DIR` | python-ai | ChromaDB disk path (canonical name; `CHROMA_PATH` removed) |
| `MAX_CONTEXT_CHUNKS` / `MAX_CHUNK_TOKENS` / `MAX_HISTORY_TURNS` | python-ai | Token-reduction budgets for Gemini/Grok calls |
| `RESERVE_COMPLETION_TOKENS` / `MAX_OUTPUT_TOKENS` | python-ai | Context headroom + output cap per LLM call |
| `LLM_PROVIDER` / `GEMINI_MODEL` / `GROK_MODEL` | node-api, python-ai | Provider labels mirrored to node-api for usage logging |
| `ENCRYPTION_KEY` | node-api | 32-byte base64 AES-256-GCM key for OAuth tokens (v13) |
| `ENABLE_REPLAN_CRON` | node-api | `true` to run hourly auto-replan locally (prod always on) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` | node-api | Google Calendar OAuth (v13) |
| `VITE_API_URL` | dashboard | Node API base URL (default `http://localhost:4000`) |
| `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_AI_URL` | mobile | Backend URLs (LAN IP on physical devices) |

---

## v11 scope (hardening, not features) — CLOSED

1. **Testing gaps** — Backend: 10 Jest suites (~85 cases); AI: 14 pytest files
   (incl. `tests/test_metrics.py` + self-skipping integration suites).
   Dashboard: Vitest wired in CI. No frontend test framework (intentional).
2. **CI/CD gaps** — CLOSED: `deploy.yml` publishes 3 images to GHCR with
   staging/production environments; `compose config` validated in CI.
3. **Monitoring gaps** — CLOSED: JSON structured logs (`LOG_LEVEL`) in both
   APIs, `X-Request-Id` correlation, `/metrics` + `/metrics/prom` on both,
   `/metrics/ready` on python-ai, Prometheus alerts in `monitoring/`.
4. **Agent cleanup** — DONE (v11): 8 dead modules deleted. No `_archive/`.
5. **Duplicate route file** — DONE (v11): only `dashboard-v2.routes.js` mounted.

---

## v12 scope (token economy + creator console) — CLOSED

1. **Token tracking** — Every AI call is metered: `token_usage_logs` ledger
   + per-user `user_credits` with reserve → commit/refund semantics.
2. **Token reduction** — python-ai compresses RAG context, bounds history,
   truncates prompts, caps output. node-api enforces per-tier budgets (429)
   and credit balances (402) before proxying.
3. **Creator console** — `/admin/*` API + standalone `sourcewise-dashboard/`
   (7 pages: login + overview, users & credits, user detail, usage, providers,
   system). Uses `recharts` (already installed). Containerised + CI-wired.
4. **Setup required** — Run `token_tracking_schema.sql` in Supabase; set
   `users.is_admin = true` for the first admin manually; provide
   `GEMINI_API_KEY` and/or `GROK_API_KEY`.

---

## v13 scope (study organizer + mood-aware tutor)

1. **DB** — Run `v13_study_organizer_schema.sql` (7 tables: mood, calendar,
   plans, subjects, slots, replan history, integrations).
2. **Node API** — `/mood`, `/calendar` (Google OAuth), `/study-plans`,
   `/schedule`, `/events` (SSE) + `replanningService` hourly cron.
3. **Python AI** — `mood_tutor` router + `mood_aware_tutor` agent.
4. **Frontend** — `PlannerPageV2` + `planner/` design system (28 files),
   `plannerStore`, `studyPlansApi`.
5. **Env** — Set `ENCRYPTION_KEY` (`openssl rand -base64 32`),
   Google OAuth vars, `ENABLE_REPLAN_CRON=true` for local cron.
