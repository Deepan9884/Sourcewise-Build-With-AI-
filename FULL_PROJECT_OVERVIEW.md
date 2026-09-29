# Full Project Overview — SourceWise Study Planner

## 1) Repository layout

This repository contains 3 main services + a mobile client:

```
Study Planner/
├─ sourcewise-frontend/          # React 19 / Vite SPA (web)
├─ sourcewise-backend/
│  ├─ node-api/                 # Express REST API (port 4000)
│  └─ python-ai/               # FastAPI AI service (port 8000)
├─ sourcewise-mobile/           # Expo / React Native app
├─ docker-compose.yml           # Orchestrates node-api + python-ai
└─ .github/workflows/          # CI workflows
```

Top-level supporting files:

- `AGENTS.md` — “v11 hardening release” ground truth describing current architecture, gaps, and cleanup scope.
- `PROJECT_DOCUMENTATION.md` — comprehensive architecture & feature inventory (already detailed).
- `BACKEND_TESTING_REPORT.md` — backend test results summary.
- `CICD_HARDENING_REPORT.md` — CI/CD hardening findings.
- `SourceWise_Backend.pdf`, `SourceWise_Frontend.pdf`, `SourceWise_Mobile.pdf` — exported documentation artifacts.
- `test_backend.py`, `test_imports.py`, `test.txt` — test/utility files for repository checks.

---

## 2) Tech stack summary

### Web frontend (sourcewise-frontend)
- React 19, Vite 8
- TailwindCSS
- React Router
- Zustand for state
- axios for API calls
- Framer Motion for UI effects
- React Hook Form (forms)
- Radix UI primitives & utility styling libs

### Mobile (sourcewise-mobile)
- Expo (~54)
- React Native (~0.81)
- Expo Router
- Zustand stores
- axios for API calls
- React Native Paper / navigation libraries

### Backend: Node.js API (sourcewise-backend/node-api)
- Express 4.x
- Helmet (security headers), CORS
- Rate limiting
- JWT auth
- Supabase client (PostgreSQL)
- Optional Redis caching (declared)
- Axios used to proxy requests to Python AI service
- Jest test suite (4 test files)

### Backend: Python AI service (sourcewise-backend/python-ai)
- FastAPI + Uvicorn
- ChromaDB (local vector store persisted on disk)
- sentence-transformers (embeddings: `all-MiniLM-L6-v2`)
- Ollama (LLM inference via local HTTP endpoint)
- Routers for ingest/chat/tutor/agent/source-analysis
- Test suite for core AI components + service tests

---

## 3) End-to-end architecture

### High-level request flow

1. **Mobile/Web → Node API (port 4000)**
   - Uses REST calls.
   - Uses JWT Bearer token for protected endpoints.
   - Node API acts as the “auth gateway” and orchestrates access to AI functionality.

2. **Node API → Python AI service (port 8000)**
   - Node forwards authenticated user context to AI endpoints.
   - AI endpoints handle RAG, tutoring, quiz/practice generation, evaluation, etc.

3. **Python AI service → Ollama (port 11434 by default)**
   - Local LLM inference (no external API keys required after model download).

4. **Python AI service → ChromaDB (local disk)**
   - Vector embeddings are stored in and queried from ChromaDB.
   - ChromaDB is persisted via docker volume in `docker-compose.yml`.

5. **Node API → Supabase**
   - Relational data persistence: users, sources, planners, progress, learning profiles, tutoring sessions, practice attempts, etc.

---

## 4) Docker / local orchestration

### `docker-compose.yml`
Two containers + one volume:

- `python-ai`
  - Builds from `sourcewise-backend/python-ai/Dockerfile`
  - Exposes `8000:8000`
  - Mounts `chroma_data` to `/app/chroma_db`
  - Uses `host.docker.internal:11434` to reach Ollama on host machine
  - Healthcheck: `GET /health`

- `node-api`
  - Builds from `sourcewise-backend/node-api/Dockerfile`
  - Exposes `4000:4000`
  - Depends on `python-ai` health
  - Healthcheck: `GET /health`

Volume:
- `chroma_data` for persistent embeddings and Chroma index state.

---

## 5) Authentication & authorization model (Node API)

### JWT-based flow
- Client registers/logs in through `/auth/*` endpoints.
- Node issues JWT containing user identity (and relevant claims).
- Protected routes validate JWT through `middleware/auth.js`.
- Node also looks up the authenticated user (Supabase) and attaches the user context to the request.

### Supabase RLS / migrations
SQL migrations live in:
- `sourcewise-backend/node-api/`
  - `fix_rls.sql`
  - `v2_schema.sql`
  - `v2_users_fix.sql`
  - `v5_lirs_schema.sql` (v5 LIRS additions)

`AGENTS.md` asserts that v2/v5 tables have RLS enabled.

---

## 6) Database schema overview (Supabase PostgreSQL)

The system uses Supabase PostgreSQL with a table set that includes:

Base tables (referenced in v2/v5 migrations):
- `users`
- `sources`
- `planners`
- `progress`
- `quiz_results`
- `learning_profiles`
- `tutoring_sessions`
- `practice_attempts`
- `study_analytics`

V2 additions (6 tables):
- `source_analysis`
- `concept_mastery`
- `knowledge_gaps`
- `progress_events`
- `review_schedule`
- `analytics_snapshots`

V5 LIRS additions (10 tables):
- `reinforcement_events`
- `learning_outcomes`
- `knowledge_gain`
- `prompt_performance`
- `agent_reflections`
- `pattern_discoveries`
- `teaching_effectiveness`
- `recommendation_performance`
- `artifact_quality_history`
- `agent_knowledge_base`

---

## 7) Node API (Express) — structure & routing

### Entry point
- `sourcewise-backend/node-api/src/index.js`
  - Express server on port **4000**
  - Security middleware (Helmet), CORS, rate limiting
  - JSON body parsing
  - Morgan logging (dev)
  - Health endpoint: `GET /health`
  - Mounts route groups such as `/auth`, `/sources`, `/planner`, `/progress`, `/dashboard`, `/tutor`, `/learning-profile`, `/analytics`, etc.

### Route groups (as documented)
- `/auth`
- `/sources`
- `/planner`
- `/progress`
- `/dashboard`
- `/tutor`
- `/learning-profile`
- `/analytics`
- `/revision`
- `/mastery`
- `/settings`

### Middleware
- `middleware/auth.js` — JWT verification and Supabase user lookup
- `middleware/errorHandler.js` — global JSON error response

### Important routing note (dead/duplicate code)
- `dashboard.routes.js` exists but is **not imported** in `index.js` (only `dashboard-v2.routes.js` is used).
- This is called out explicitly in `AGENTS.md` and test notes.

---

## 8) Python AI service (FastAPI) — structure & capabilities

### Entry point
- `sourcewise-backend/python-ai/app/main.py`
  - FastAPI app on port **8000**
  - Registers routers:
    - ingest
    - chat
    - tutor
    - agent
    - source_analysis
    - orchestrator (and internal orchestration)

### Core production services (conceptual)
- LLM interface (Ollama calls, system prompts, streaming)
- Embedder (sentence-transformers embeddings)
- Vector store (ChromaDB add/query/delete)
- RAG chain (query expansion, retrieval, rerank, context assembly)
- Extractor (PDF/DOCX/TXT parsing)
- Chunker (langchain splitting logic)
- Tutor chains/engines (socratic explanations, practice generation, evaluation)
- Orchestration layer for agent intent routing

### Router capabilities (documented inventory)
- `/ingest`
- `/chat` (including streaming)
- `/tutor` (explain/practice/evaluate plus concept/graph/synthesis endpoints)
- `/agent` (intent-based unified agent; some endpoints are STUBs)
- `/sources` (analysis and concept extraction)

### RAG pipeline (high-level)
- Upload → extract → chunk → embed → store in ChromaDB
- Query → query expansion → similarity search → dedup/rerank → confidence/context gating → LLM generation

---

## 9) Frontend — key features and integration surfaces

### Web app pages (documented)
- Landing
- Login / Signup
- Dashboard
- Sources
- Summary
- Flashcards
- Quiz
- Audio
- Studio
- Tutor
- Analytics
- Planner
- Settings

### Zustand stores (web)
- `authStore` (persistent)
- `sourceStore` (client-side source metadata; may not sync)
- `chatStore` (conversation management; may have dual systems)
- `tutorStore` (session state & practice problems)
- `analyticsStore` (documented as not used by pages)

### API modules (web)
- `lib/chatApi.js` (chat, ingest helper calls, health)
- `lib/agentApi.js` (agent-based actions: quizzes, flashcards, summaries, planner, audio, etc.)

### Documented integration gaps in v11
`PROJECT_DOCUMENTATION.md` and `AGENTS.md` list the known issues:
- Source metadata not reliably persisted to Supabase (client-side storage instead)
- Planner generation not persisted to backend
- Progress tracking routes exist but writes are incomplete
- Learning profile mastery not fully updated beyond initial creation
- Analytics endpoints may return stubs/zeros
- Audio TTS exists but may not be wired to AI flow
- Several UI bugs/stubs (e.g., tutor panel issues, missing click handlers)

---

## 10) Mobile app — integration and navigation

- Uses Expo Router file-based navigation.
- Screens correspond closely to a subset of the web flows:
  - Auth: login
  - Tabs: dashboard/sources/planner/chat (depending on app routing group)
- Uses an `api.ts` utility for base URL configuration.

---

## 11) CI/CD and testing

### CI workflows (2 workflows)
- `main.yml` — main-branch build and test actions (including backend tests)
- `pr-check.yml` — PR validation: install/build/test steps

### Testing reality (from reports)
- Backend node-api has Jest tests (4 files)
- Python AI has multiple test files (8 service tests plus example/integration scripts)
- Frontend has limited/no automated tests noted in v11 documentation

### CI hardening findings
`CICD_HARDENING_REPORT.md` highlights:
- Jest discovery/skip logic is designed to auto-discover tests without stale patterns.
- Some deployment concerns are TODO/commented out (no deploy pipeline in v11).
- No major caching optimization improvements documented.

---

## 12) Known dead code and cleanup scope (v11)

### Node API dead/unused components (documented)
- Mongoose-based database layer and related models: **dead code**
- Redis client utility and S3 utilities: **dead code**
- Some route files exist but are not imported/used (dashboard duplicate)

### Python AI dead/unused components (documented)
- Several agents in `_archive/` are candidates for removal.
- Some dependencies are installed/declared but unused (e.g., gTTS, pymongo, motor, redis, tiktoken).

---

## 13) Full project documentation sources

This “Full Project Overview” intentionally consolidates the project’s canonical docs:
- `PROJECT_DOCUMENTATION.md` — detailed architecture, routes inventory, env vars, known issues, database schema, and feature inventory.
- `AGENTS.md` — v11 hardening ground truth, service interaction diagrams, cleanup/dead code guidance.
- `docker-compose.yml` — runtime orchestration and healthchecks.

---

## 14) Key artifacts to consult directly

- `PROJECT_DOCUMENTATION.md` (most complete single narrative document)
- `AGENTS.md` (v11 ground truth & cleanup scope)
- `BACKEND_TESTING_REPORT.md` (test status)
- `CICD_HARDENING_REPORT.md` (CI/CD findings)
- `sourcewise-backend/node-api/` and `sourcewise-backend/python-ai/` for code-level details
- `sourcewise-frontend/` for UI pages, stores, and API modules

---
