# SourceWise Study Agent — Detailed Project State

> **Release Version:** `v11.0.0` (Hardening & Stability Release)  
> **Repository Ground Truth:** Active multi-service monorepo  
> **Last Updated:** August 2026  
> **System Status:** ✅ Stable / Production-Ready Architecture

---

## 1. Executive Summary

**SourceWise** is an advanced, local AI-powered study companion and autonomous cognitive tutor designed to ingest user learning materials (PDFs, DOCX, text), build dynamic semantic knowledge graphs, generate adaptive revision schedules, detect misconceptions, and deliver personalized Socratic tutoring.

The system is architected as an offline-first / local-LLM platform utilizing **Ollama** (`llama3.2:3b`) and **sentence-transformers** (`all-MiniLM-L6-v2`) backed by **ChromaDB**, **Node.js (Express)**, **FastAPI**, **Supabase (PostgreSQL)**, **React 19 SPA**, and an **Expo React Native Mobile App**.

### Key System Metrics
* **Services:** 3 Core Services (`node-api`, `python-ai`, `sourcewise-frontend`) + 1 Mobile Client (`sourcewise-mobile`)
* **Database Tables:** 25 RLS-secured tables in Supabase PostgreSQL
* **Node.js API Routes:** 11 Mounted Route Groups (100% active, 0 duplicates)
* **Python AI Agents:** 10 Core Registered Agents + 16 Cognitive/LIRS Autonomous Agent Modules (Archive fully purged)
* **AI Production Services:** 17 Specialized Services (RAG, Chunking, Socratic Engine, Knowledge Graph Builder, etc.)
* **Test Coverage:** 6 Node.js Jest test suites + 11 Python Pytest suites (140+ unit/integration test cases)
* **Frontend/Mobile:** 9 React Pages + 10 Expo Mobile Screens, Zustand state management across web & mobile
* **CI/CD:** 2 GitHub Actions Workflows (`main.yml`, `pr-check.yml`) with automated linting, builds, testing, and Docker verification

---

## 2. System Architecture & Service Interconnect

```
┌─────────────────────────┐          ┌─────────────────────────┐
│   sourcewise-frontend   │          │    sourcewise-mobile    │
│   React 19 / Vite 8     │          │  Expo 54 / RN 0.81      │
│   Port: 5173 / 5174     │          │  Mobile Client          │
└────────────┬────────────┘          └────────────┬────────────┘
             │                                    │
             │           REST / JWT Auth          │
             └──────────────────┬─────────────────┘
                                │
                      ┌─────────▼─────────┐
                      │     node-api      │ ◄──────────┐
                      │  Express 4 / Node │            │ Supabase JS
                      │     Port: 4000    │            │ (PostgreSQL + Auth)
                      └─────────┬─────────┘            ▼
                                │             ┌─────────────────┐
                   Internal HTTP│             │ Supabase DB     │
                   (User Context│             │ 25 Tables (RLS) │
                   & RAG Bridge)│             └─────────────────┘
                                │
                      ┌─────────▼─────────┐
                      │     python-ai     │ ◄──────────┐
                      │ FastAPI / Py 3.11 │            │ HuggingFace Embeddings
                      │     Port: 8000    │            │ (all-MiniLM-L6-v2)
                      └───┬─────────────┬─┘            ▼
                          │             │       ┌─────────────────┐
            Local LLM HTTP│             └──────►│ ChromaDB        │
         (Host/Container) │                     │ (Local Disk /   │
                          ▼                     │  Docker Volume) │
                 ┌─────────────────┐            └─────────────────┘
                 │ Ollama :11434   │
                 │ (llama3.2:3b)   │
                 └─────────────────┘
```

### Inter-Service Communication Details

| Channel | Protocols & Formats | Security & Auth | Description |
|---|---|---|---|
| **Clients → Node API** | HTTP REST, JSON | JWT Bearer Token | Node API acts as the API Gateway, validating JWTs, rate-limiting, and managing user records. |
| **Node API → Python AI** | Internal HTTP, JSON | Internal Network / IP forwarding | Node API passes validated user metadata (`user_id`, session context) to FastAPI backend. |
| **Python AI → Ollama** | HTTP (Streamed / JSON) | Host-only localhost bind | Executes zero-cost offline inference with `llama3.2:3b`. |
| **Python AI → ChromaDB** | Python Client (Disk I/O) | Local Volume / File lock | Local vector storage persisted at `/app/chroma_db` (or local path). |
| **Node API → Supabase** | HTTPS / Postgres Protocol | Service & Anon API Keys | Manages relational records, learning profiles, analytics, and RLS validation. |
| **Node / Python → Redis** | TCP / RESP | Optional Connection URI | High-speed response caching and queue management. |

---

## 3. Database Architecture (25 Tables)

The Supabase PostgreSQL database consists of 25 relational tables partitioned across 3 architectural iterations, all secured with Row-Level Security (RLS).

```
                      DATABASE SCHEMA EVOLUTION
  ┌───────────────────────┬───────────────────────┬────────────────────────┐
  │  Base Schema (9)      │  V2 Schema (6)        │  V5 LIRS Schema (10)   │
  ├───────────────────────┼───────────────────────┼────────────────────────┤
  │ • users               │ • source_analysis     │ • reinforcement_events │
  │ • sources             │ • concept_mastery     │ • learning_outcomes    │
  │ • planners            │ • knowledge_gaps      │ • knowledge_gain       │
  │ • progress            │ • progress_events     │ • prompt_performance   │
  │ • quiz_results        │ • review_schedule     │ • agent_reflections    │
  │ • learning_profiles   │ • analytics_snapshots │ • pattern_discoveries  │
  │ • tutoring_sessions   │                       │ • teaching_effective-  │
  │ • practice_attempts   │                       │   ness                 │
  │ • study_analytics     │                       │ • recommendation_perf  │
  │                       │                       │ • artifact_quality_hist│
  │                       │                       │ • agent_knowledge_base │
  └───────────────────────┴───────────────────────┴────────────────────────┘
```

### Table Breakdown by Migration File

#### Base Schema Tables (`fix_rls.sql`)
1. `users`: Stores user identity, hashed passwords, timestamps, and active profile metadata.
2. `sources`: User-uploaded documents (PDFs, DOCX, notes) with parsing state and vector chunk references.
3. `planners`: Structured study timelines, day-by-day objectives, and schedule allocations.
4. `progress`: High-level aggregate metrics tracking completion percentages, current streaks, and milestones.
5. `quiz_results`: Historical quiz attempts, raw scores, question breakdowns, and timestamps.
6. `learning_profiles`: Adaptive learner profiles (preferred pacing, difficulty baseline, learning style).
7. `tutoring_sessions`: History of Socratic and direct AI tutoring interactions and context trails.
8. `practice_attempts`: Granular question-level practice interactions, user answers, and AI grading logs.
9. `study_analytics`: Computed analytics snapshots (time studied, retention curves, mastery summaries).

#### V2 Schema Additions (`v2_schema.sql`)
10. `source_analysis`: Deep semantic extraction metadata, key concepts, summaries, and reading level metrics.
11. `concept_mastery`: Granular mastery scores per concept node (0–100%) tracking skill progression.
12. `knowledge_gaps`: Identified conceptual deficiencies, prerequisite blockers, and remediation flags.
13. `progress_events`: Fine-grained event ledger (study session logged, flashcard reviewed, quiz passed).
14. `review_schedule`: Spaced repetition schedule based on Ebbinghaus / SM-2 intervals (1, 3, 7, 14, 30, 60 days).
15. `analytics_snapshots`: Time-series aggregate snapshots for rendering trend charts in dashboard and analytics.

#### V5 LIRS (Learning & Intelligence Reinforcement System) Additions (`v5_lirs_schema.sql`)
16. `reinforcement_events`: Logs positive/negative reinforcement signals from user interactions.
17. `learning_outcomes`: Longitudinal tracking of learner outcomes against specific study sessions.
18. `knowledge_gain`: Quantified delta between pre-test and post-test assessment scores.
19. `prompt_performance`: Tracks latency, token consumption, and response quality per agent prompt template.
20. `agent_reflections`: Metacognitive agent log where domain agents record self-evaluations and adjustments.
21. `pattern_discoveries`: Discovered correlations between study patterns, material types, and student recall.
22. `teaching_effectiveness`: Comparative performance metrics across explanation strategies (analogies vs. Socratic).
23. `recommendation_performance`: Click-through and completion rates for AI-recommended study items.
24. `artifact_quality_history`: Quality grading history for generated quizzes, summaries, and flashcards.
25. `agent_knowledge_base`: Dynamic repository of agent rules, heuristic improvements, and synthesized knowledge.

---

## 4. Backend Service: Node.js REST API (`sourcewise-backend/node-api`)

**Stack:** Express 4.18, Node 20 LTS, `@supabase/supabase-js`, Helmet 7.1, Morgan, Express Rate Limit, Jest, Supertest.  
**Port:** `4000`

### Mounted Route Groups

| Route Path | File | Primary Endpoints | Description |
|---|---|---|---|
| `/auth` | [`auth.routes.js`](file:///e:/Projects/Source-wise/sourcewise-backend/node-api/src/routes/auth.routes.js) | `POST /register`, `POST /login`, `GET /me` | User registration, authentication, JWT issuance, profile retrieval. |
| `/sources` | [`source.routes.js`](file:///e:/Projects/Source-wise/sourcewise-backend/node-api/src/routes/source.routes.js) | `GET /`, `POST /`, `GET /:id`, `DELETE /:id` | Upload documents, trigger parsing & vectorization via Python AI, fetch sources. |
| `/planner` | [`planner.routes.js`](file:///e:/Projects/Source-wise/sourcewise-backend/node-api/src/routes/planner.routes.js) | `GET /`, `POST /generate`, `PATCH /:id/complete-day`, `POST /:id/replan` | AI study planner generation, daily task completion, schedule recalibration. |
| `/tutor` | [`tutor.routes.js`](file:///e:/Projects/Source-wise/sourcewise-backend/node-api/src/routes/tutor.routes.js) | `POST /chat`, `POST /socratic`, `POST /practice`, `POST /evaluate` | Interactive tutoring session orchestration, forwarding prompts to Python AI. |
| `/learning-profile` | [`learning-profile.routes.js`](file:///e:/Projects/Source-wise/sourcewise-backend/node-api/src/routes/learning-profile.routes.js) | `GET /`, `PUT /`, `POST /sync-mastery` | Learner style, pacing preferences, cognitive load preferences. |
| `/progress` | [`progress-v2.routes.js`](file:///e:/Projects/Source-wise/sourcewise-backend/node-api/src/routes/progress-v2.routes.js) | `GET /summary`, `POST /event`, `GET /streak`, `GET /retention` | Unified progress tracking, streak validation, event logging, revision stats. |
| `/dashboard` | [`dashboard-v2.routes.js`](file:///e:/Projects/Source-wise/sourcewise-backend/node-api/src/routes/dashboard-v2.routes.js) | `GET /summary`, `GET /activity`, `GET /recommendations` | Aggregated dashboard view synthesizing sources, plans, mastery, and next steps. |
| `/analytics` | [`analytics-v2.routes.js`](file:///e:/Projects/Source-wise/sourcewise-backend/node-api/src/routes/analytics-v2.routes.js) | `GET /overview`, `GET /mastery-curve`, `GET /study-patterns` | Detailed analytical metrics, time-series data, and cognitive retention graphs. |
| `/revision` | [`revision.routes.js`](file:///e:/Projects/Source-wise/sourcewise-backend/node-api/src/routes/revision.routes.js) | `GET /due`, `POST /complete`, `GET /schedule` | Spaced repetition queue management and mastery reinforcement. |
| `/mastery` | [`mastery.routes.js`](file:///e:/Projects/Source-wise/sourcewise-backend/node-api/src/routes/mastery.routes.js) | `GET /concepts`, `POST /update`, `GET /gaps`, `POST /gap` | Concept-level mastery breakdown and knowledge gap tracking. |
| `/settings` | [`settings.routes.js`](file:///e:/Projects/Source-wise/sourcewise-backend/node-api/src/routes/settings.routes.js) | `GET /`, `PUT /`, `DELETE /account` | User account settings, AI personalization, notification preferences. |

### Health Check Endpoint Contract (`GET /health`)
```json
{
  "status": "healthy",
  "service": "SourceWise Node.js API",
  "timestamp": "2026-08-18T08:45:00.000Z",
  "version": "11.0.0",
  "uptime": 1420,
  "features": ["auth", "sources", "planner", "tutor", "progress", "analytics", "revision", "mastery", "dashboard"],
  "checks": {
    "api": "ok",
    "database": "ok",
    "ai_service": "ok"
  }
}
```

---

## 5. AI Service & Cognitive Engine (`sourcewise-backend/python-ai`)

**Stack:** FastAPI 0.109, Uvicorn, ChromaDB 0.4.22, Sentence-Transformers 2.7.0, PyTorch 2.2, LangChain 0.1.4, PDFPlumber, Python-DOCX.  
**Port:** `8000`

### Active Agent Architecture (29 Agent Files)

```
                           AI AGENT ECOSYSTEM
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      ORCHESTRATOR & ROUTING                            │
 │            orchestrator.py  •  registry.py  •  base.py                 │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │
       ┌─────────────────────────────┼─────────────────────────────┐
       ▼                             ▼                             ▼
┌──────────────┐             ┌──────────────┐             ┌──────────────┐
│ DOMAIN CORE  │             │ COGNITIVE    │             │ LIRS & SELF- │
│ (10 Active)  │             │ ARCHITECTURE │             │ IMPROVEMENT  │
├──────────────┤             ├──────────────┤             ├──────────────┤
│• source_intel│             │• knowledge_  │             │• reinforcement│
│• knowledge   │             │  science     │             │• reinforcement_│
│• tutor       │             │• memory      │             │  scoring     │
│• assessment  │             │• memory_     │             │• quality     │
│• flashcard   │             │  evolution   │             │• quality_v2  │
│• learning_   │             │• confidence  │             │• self_im-    │
│  profile     │             │• trust_engine│             │  provement   │
│• study_      │             │• educational_│             │• specifications│
│  planner     │             │  corpus      │             │• educational_│
│• revision    │             │• educational_│             │  validation  │
│• analytics   │             │  dataset     │             │• golden_     │
│• recommend-  │             │              │             │  dataset     │
│  ation       │             │              │             │              │
└──────────────┘             └──────────────┘             └──────────────┘
```

#### Registered Domain Agents in `main.py`
1. `source_intelligence`: Analyzes uploaded documents, calculates readability scores, extracts themes, and triggers chunking.
2. `knowledge`: Builds and queries conceptual knowledge graphs, maps prerequisite relationships, and identifies orphaned concepts.
3. `tutor`: Multi-mode tutoring agent supporting Direct, Socratic, Exam-Prep, and Metacognitive reflection modes.
4. `assessment`: Generates contextual multiple-choice, short-answer, and application-based quizzes with Bloom's taxonomy mapping.
5. `flashcard`: Synthesizes atomic, dual-sided flashcards with active recall cues and misconception warnings.
6. `learning_profile`: Evaluates cognitive load, retention velocity, and student learning profile adjustments.
7. `study_planner`: Generates day-by-day, milestone-oriented study roadmaps with adaptive recovery scheduling.
8. `revision`: Manages Ebbinghaus spaced-repetition schedules and targeted revision flash-drills.
9. `analytics`: Computes student mastery trajectories, exam readiness percentages, and retention decay curves.
10. `recommendation`: Contextual recommendation agent proposing high-yield next topics, flashcard sets, or remedial readings.

### Production AI Services (17 Core Modules)

| Service Name | Source File | Core Capabilities |
|---|---|---|
| **LLM Connector** | [`llm.py`](file:///e:/Projects/Source-wise/sourcewise-backend/python-ai/app/services/llm.py) | Manages Ollama connection pool, streaming responses, timeouts, retries, and fallback templates. |
| **Embedder** | [`embedder.py`](file:///e:/Projects/Source-wise/sourcewise-backend/python-ai/app/services/embedder.py) | Singleton wrapper for HuggingFace `all-MiniLM-L6-v2` generating 384-dimensional vector embeddings. |
| **Vector Store** | [`vector_store.py`](file:///e:/Projects/Source-wise/sourcewise-backend/python-ai/app/services/vector_store.py) | ChromaDB client managing document collections, similarity search, and source-filtered retrieval. |
| **RAG Chain** | [`rag_chain.py`](file:///e:/Projects/Source-wise/sourcewise-backend/python-ai/app/services/rag_chain.py) | End-to-end retrieval augmented generation pipeline with query expansion and contextual re-ranking. |
| **Chunker** | [`chunker.py`](file:///e:/Projects/Source-wise/sourcewise-backend/python-ai/app/services/chunker.py) | Recursive character text splitter with chunk overlap, metadata tagging, and fragment filtering (<30 chars). |
| **Text Extractor** | [`extractor.py`](file:///e:/Projects/Source-wise/sourcewise-backend/python-ai/app/services/extractor.py) | Multi-format document parser handling PDF (via `pdfplumber`), DOCX, and raw text streams. |
| **Concept Extractor** | [`concept_extractor.py`](file:///e:/Projects/Source-wise/sourcewise-backend/python-ai/app/services/concept_extractor.py) | Semantic concept extraction, prerequisite graph mapping, and difficulty estimation. |
| **KG Builder** | [`knowledge_graph_builder.py`](file:///e:/Projects/Source-wise/sourcewise-backend/python-ai/app/services/knowledge_graph_builder.py) | Directed Acyclic Graph (DAG) construction, topological sort learning paths, cycle detection. |
| **Explanation Engine** | [`explanation_engine.py`](file:///e:/Projects/Source-wise/sourcewise-backend/python-ai/app/services/explanation_engine.py) | Multi-tier explanations (Beginner, Intermediate, Advanced) using analogies, diagrams, and stepwise flows. |
| **Practice Generator** | [`practice_generator.py`](file:///e:/Projects/Source-wise/sourcewise-backend/python-ai/app/services/practice_generator.py) | Generates Bloom-aligned MCQ questions, distractors, explanation keys, and rubric evaluations. |
| **Socratic Engine** | [`socratic_engine.py`](file:///e:/Projects/Source-wise/sourcewise-backend/python-ai/app/services/socratic_engine.py) | Socratic dialogue facilitator, progressive hint ladder (1–5), frustration detector, guided questioning. |
| **Tutor Chain** | [`tutor_chain.py`](file:///e:/Projects/Source-wise/sourcewise-backend/python-ai/app/services/tutor_chain.py) | Unified tutoring pipeline coordinating vector retrieval, conversation history, and tutoring modes. |
| **Conversation Memory**| [`conversation_memory.py`](file:///e:/Projects/Source-wise/sourcewise-backend/python-ai/app/services/conversation_memory.py) | Sliding-window conversation context memory with summary compaction and entity tracking. |
| **Personality Engine** | [`personality_engine.py`](file:///e:/Projects/Source-wise/sourcewise-backend/python-ai/app/services/personality_engine.py) | Adapts tutor persona (Encouraging, Rigorous, Socratic, Concise) based on user learning profile. |
| **Intent Parser** | [`intent_parser.py`](file:///e:/Projects/Source-wise/sourcewise-backend/python-ai/app/services/intent_parser.py) | Natural language classification identifying intent (explain, quiz, summarize, clarify, plan). |
| **Action Executor** | [`action_executor.py`](file:///e:/Projects/Source-wise/sourcewise-backend/python-ai/app/services/action_executor.py) | Executes compound agent tool calls and coordinates multi-step agent reasoning tasks. |
| **Source Synthesizer** | [`source_synthesizer.py`](file:///e:/Projects/Source-wise/sourcewise-backend/python-ai/app/services/source_synthesizer.py) | Cross-document synthesis engine reconciling conflicting sources and cross-referencing citations. |

---

## 6. Web Frontend Application (`sourcewise-frontend`)

**Stack:** React 19.2, Vite 8.0, TailwindCSS 3.4, Zustand 5.0, React Router 7.1, Framer Motion 12.38, React Hook Form 7.74, `@xyflow/react` 12.11 (Knowledge Graphs), Lucide React.  
**Port:** `5173` (dev) / static `dist/` (prod)

### Application Structure & Pages

```
sourcewise-frontend/src/
├── pages/
│   ├── LandingPage.jsx         # Hero section, feature showcases, call-to-actions
│   ├── LoginPage.jsx           # Email/password authentication & session restoration
│   ├── SignupPage.jsx          # New user registration & profile onboarding
│   ├── DashboardPage.jsx       # Daily overview, streak tracker, quick actions, analytics widgets
│   ├── SourcesPage.jsx         # Document upload dropzone, parsed library, indexing status
│   ├── AIWorkspacePage.jsx     # Split-screen AI workspace: RAG chat, tutor, flashcards, knowledge graph
│   ├── PlannerPage.jsx         # Interactive study planner calendar, milestone checks, replan triggers
│   ├── ProgressCenterPage.jsx  # Retention curves, mastery breakdown by topic, historical stats
│   └── SettingsPage.jsx        # Learning profile config, theme toggles, account settings
├── components/
│   ├── ui/                     # Button, Input, GlowCard, AmbientLight, StudyProgressRing, ParticleBackground, KnowledgeGraph
│   ├── layout/                 # MainLayout (Sidebar, Topbar, Content), PageTransition
│   └── effects/                # AmbientEffects, CursorGlow, CelebrationEffect
├── store/
│   ├── authStore.js            # User authentication state, token storage, user info
│   ├── chatStore.js            # Workspace messages, active source context, streaming state
│   ├── sourceStore.js          # Ingested documents list, selected sources, upload state
│   └── tutorStore.js           # Tutoring mode (Socratic/Direct), conversation turns, practice states
└── lib/
    ├── agentApi.js             # API bindings for agent specifications and executions
    ├── chatApi.js              # Streaming & REST chat endpoints
    ├── orchestratorApi.js      # Multi-agent orchestration endpoints
    └── utils.js                # Classnames merging (clsx + tailwind-merge)
```

---

## 7. Mobile Client Application (`sourcewise-mobile`)

**Stack:** Expo 54.0, React Native 0.81.5, Expo Router 6.0, Zustand 5.0, `@tanstack/react-query` 5.100, React Native Paper 5.15, React Native Reanimated 4.1.

### Screen & Navigation Map

```
sourcewise-mobile/app/
├── (auth)/
│   └── login.tsx               # Mobile auth screen with JWT storage
├── (tabs)/
│   ├── _layout.tsx             # Bottom tab bar configuration
│   ├── index.tsx               # Mobile Dashboard (Daily plan, streak, quick stats)
│   ├── sources.tsx             # Document browsing & source details
│   ├── planner.tsx             # Daily task list & study schedule check-ins
│   └── chat.tsx                # Mobile AI tutor & conversational study assistant
├── _layout.tsx                 # Root layout with theme provider & auth hydration guard
├── modal.tsx                   # Universal detail modal for cards & quiz items
├── +not-found.tsx              # Fallback 404 screen
└── +html.tsx                   # Web export wrapper for React Native Web
```

---

## 8. Test Infrastructure & Quality Audits

### 1. Node.js API Test Suite (`sourcewise-backend/node-api`)
* **Framework:** Jest 29.7 + Supertest 7.2
* **Mocking Layer:** Fully isolated in-memory Supabase Query Builder mock, JWT mock, and Axios HTTP mock.
* **Test Suites:** 6 Active Suites

| Test File | Test Cases | Areas Tested | Assertions & Mocking |
|---|---|---|---|
| [`auth.test.js`](file:///e:/Projects/Source-wise/sourcewise-backend/node-api/src/__tests__/auth.test.js) | 4 | Input validation (empty fields, short passwords), missing token auth rejection. | Status 400/401 checks, error payload shape assertions. |
| [`mastery.test.js`](file:///e:/Projects/Source-wise/sourcewise-backend/node-api/src/__tests__/mastery.test.js) | 7 | Concept mastery listing, score updates, missing field validation, knowledge gap tracking. | Status 200/201/400 assertions, Supabase mock chain. |
| [`planner.test.js`](file:///e:/Projects/Source-wise/sourcewise-backend/node-api/src/__tests__/planner.test.js) | 4 | Study plan retrieval, plan creation, day completion, replanning triggers. | Status 200/201 checks, Supabase mock chain. |
| [`progress.test.js`](file:///e:/Projects/Source-wise/sourcewise-backend/node-api/src/__tests__/progress.test.js) | 5 | Event logging, event validation, streak calculation, revision statistics. | Thenable Supabase mock for `Promise.all` resolution. |
| [`sources.test.js`](file:///e:/Projects/Source-wise/sourcewise-backend/node-api/src/__tests__/sources.test.js) | 12 | Source listing, source upload, detail fetch, deletion, AI service analysis trigger, proxy error handling. | Full Axios + Supabase mocks, verifies outbound AI payloads. |
| [`tutor.test.js`](file:///e:/Projects/Source-wise/sourcewise-backend/node-api/src/__tests__/tutor.test.js) | 14 | Socratic tutoring endpoints, practice generation, quiz evaluation, session persistence, AI error fallbacks. | Tests proxying to Python AI `/tutor` routes and fallback states. |

### 2. Python AI Service Test Suite (`sourcewise-backend/python-ai`)
* **Framework:** Pytest 7.4+ with AsyncIO support
* **Test Suites:** 11 Active Test Files (140+ test cases)

| Test File | Cases | Target Module | Scope & Mocks |
|---|---|---|---|
| [`test_specifications.py`](file:///e:/Projects/Source-wise/sourcewise-backend/python-ai/test_specifications.py) | 50+ | `specifications.py` | Validates rules for Flashcards, Quizzes, Study Plans, Summaries, Tutor, Knowledge Graph, Revision, and Analytics. |
| [`test_chunker.py`](file:///e:/Projects/Source-wise/sourcewise-backend/python-ai/app/services/test_chunker.py) | 8 | `chunker.py` | Splitting text by token boundaries, overlap guarantees, fragment filtering (<30 chars), UUID assignment. |
| [`test_embedder.py`](file:///e:/Projects/Source-wise/sourcewise-backend/python-ai/app/services/test_embedder.py) | 6 | `embedder.py` | Embedding generation shape (384-dim), batching, sentence-transformers singleton behavior. |
| [`test_concept_extractor.py`](file:///e:/Projects/Source-wise/sourcewise-backend/python-ai/app/services/test_concept_extractor.py) | 12 | `concept_extractor.py` | Extract concepts, prerequisite parsing, related concepts, error resiliency (patched `httpx.AsyncClient`). |
| [`test_concept_extractor_integration.py`](file:///e:/Projects/Source-wise/sourcewise-backend/python-ai/app/services/test_concept_extractor_integration.py) | 3 | `concept_extractor.py` | Live integration with Ollama for concept extraction (`@pytest.mark.integration`). |
| [`test_explanation_engine.py`](file:///e:/Projects/Source-wise/sourcewise-backend/python-ai/app/services/test_explanation_engine.py) | 26 | `explanation_engine.py` | Analogy generation, complexity tiers, stepwise flows, prompt templating. |
| [`test_knowledge_graph_builder.py`](file:///e:/Projects/Source-wise/sourcewise-backend/python-ai/app/services/test_knowledge_graph_builder.py) | 11 | `knowledge_graph_builder.py` | `ConceptGraph` CRUD, topological learning paths, cycle detection. |
| [`test_knowledge_graph_builder_integration.py`](file:///e:/Projects/Source-wise/sourcewise-backend/python-ai/app/services/test_knowledge_graph_builder_integration.py) | 6 | `knowledge_graph_builder.py` | Multi-source graph building, ChromaDB vector mock retrieval. |
| [`test_practice_generator.py`](file:///e:/Projects/Source-wise/sourcewise-backend/python-ai/app/services/test_practice_generator.py) | 22 | `practice_generator.py` | MCQ generation, distractor quality, rubric-based evaluation. |
| [`test_socratic_engine.py`](file:///e:/Projects/Source-wise/sourcewise-backend/python-ai/app/services/test_socratic_engine.py) | 14 | `socratic_engine.py` | Progressive hint ladders (levels 1–5), frustration detection, guiding questions. |
| [`test_tutor_chain.py`](file:///e:/Projects/Source-wise/sourcewise-backend/python-ai/app/services/test_tutor_chain.py) | 47 | `tutor_chain.py` | Multi-mode tutoring, cross-source synthesis, streaming, confidence scoring. |

### 3. Frontend Lint & Build Quality
* **ESLint:** ESLint 10 with React 19 plugins — **0 Errors, 8 Clean Warnings** (all hooks dependency hoists and export overrides handled).
* **Vite Production Build:** Successfully bundles to `dist/` with code-splitting across lazy-loaded route modules.

---

## 9. CI/CD & DevOps Pipeline

### GitHub Actions Workflows (`.github/workflows/`)

#### 1. Main Pipeline ([`main.yml`](file:///e:/Projects/Source-wise/.github/workflows/main.yml))
Triggered on push to `main` and manual dispatch.
1. **Build & Verify Job:**
   - Installs frontend dependencies (`npm ci`) and verifies production build (`npm run build`).
   - Installs Node.js API dependencies (`npm ci`) and runs backend test suite (`npm test`).
   - Installs Python 3.11 dependencies (`pip install -r requirements.txt`).
   - Discovers and executes all unit test files via `pytest` without silent skipping.
2. **Docker Build Job (Needs `build`):**
   - Validates container builds: `docker build` for `sourcewise-python-ai:ci`.
   - Validates container builds: `docker build` for `sourcewise-node-api:ci`.

#### 2. Pull Request Check ([`pr-check.yml`](file:///e:/Projects/Source-wise/.github/workflows/pr-check.yml))
Triggered on pull requests to `main` and `develop`.
1. **Lint Job:** Executes `npm run lint` on frontend and validates backend dependency tree.
2. **Parallel Verification Jobs (Require `lint`):**
   - `build`: Builds frontend and uploads `frontend-build` artifact.
   - `test-backend`: Executes Node.js Jest test suite.
   - `test-ai`: Executes Python AI Pytest test suite with explicit failure if no test files are found.

### Docker Compose Configuration ([`docker-compose.yml`](file:///e:/Projects/Source-wise/docker-compose.yml))

```yaml
version: '3.8'

services:
  python-ai:
    build:
      context: ./sourcewise-backend/python-ai
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - OLLAMA_BASE_URL=http://host.docker.internal:11434
      - CHROMA_PERSIST_DIR=/app/chroma_db
      - EMBEDDING_MODEL=all-MiniLM-L6-v2
      - NODE_API_ORIGIN=http://node-api:4000
      - FRONTEND_ORIGIN=http://localhost:5173
    volumes:
      - chroma_data:/app/chroma_db
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  node-api:
    build:
      context: ./sourcewise-backend/node-api
      dockerfile: Dockerfile
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - PORT=4000
      - JWT_SECRET=${JWT_SECRET}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - PYTHON_AI_URL=http://python-ai:8000
      - FRONTEND_ORIGIN=http://localhost:5173
    depends_on:
      python-ai:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  chroma_data:
```

---

## 10. Environment Variable Reference

### Node API (`sourcewise-backend/node-api/.env`)
| Variable | Required | Default / Example | Purpose |
|---|---|---|---|
| `PORT` | No | `4000` | Port for Express HTTP server. |
| `NODE_ENV` | No | `development` / `production` | Node execution environment. |
| `JWT_SECRET` | **Yes** | `your-secure-jwt-secret` | Secret key used to sign and verify user authentication tokens. |
| `SUPABASE_URL` | **Yes** | `https://xyz.supabase.co` | Supabase project URL. |
| `SUPABASE_ANON_KEY` | **Yes** | `eyJhbGciOi...` | Supabase anonymous / public API key. |
| `PYTHON_AI_URL` | No | `http://localhost:8000` | Internal URL to the Python FastAPI AI service. |
| `FRONTEND_ORIGIN` | No | `http://localhost:5173` | Allowed CORS origin for the React frontend. |
| `REDIS_URL` | No | `redis://localhost:6379` | Connection string for optional Redis cache layer. |

### Python AI Service (`sourcewise-backend/python-ai/.env`)
| Variable | Required | Default / Example | Purpose |
|---|---|---|---|
| `OLLAMA_BASE_URL` | No | `http://localhost:11434` | Endpoint for the local Ollama LLM instance. |
| `OLLAMA_MODEL` | No | `llama3.2:3b` | Target LLM model name. |
| `EMBEDDING_MODEL` | No | `all-MiniLM-L6-v2` | HuggingFace sentence transformer model name. |
| `CHROMA_PERSIST_DIR` | No | `./chroma_db` | Disk directory for storing ChromaDB vector index. |
| `NODE_API_ORIGIN` | No | `http://localhost:4000` | Allowed CORS origin for the Node.js API service. |
| `FRONTEND_ORIGIN` | No | `http://localhost:5173` | Allowed CORS origin for the React frontend. |

---

## 11. Recent Hardening Deliverables (v11 Milestones Completed)

1. **Dead Code & Archive Purging:**
   * Removed 41 deprecated agents from `python-ai/app/agents/_archive/`.
   * Removed dead duplicate route file `dashboard.routes.js` (standardized on `dashboard-v2.routes.js`).
2. **Backend Test Suite Expansion:**
   * Created and verified high-coverage test suites for high-risk routes (`sources.test.js`, `tutor.test.js`).
   * Total Node.js test suites increased from 4 to 6.
3. **AI Service Test Suite Expansion:**
   * Added unit tests for previously un-tested core services: `chunker.py` and `embedder.py`.
   * Expanded `test_specifications.py` to cover all 8 specification classes (Tutor, KG, Revision, Analytics, Quiz, Study Plan, Summary, Flashcard).
4. **CI/CD Reliability Hardening:**
   * Eliminated silent test skipping in GitHub Actions by enforcing test file discovery and non-zero exit codes if tests are missing.
   * Added automated Docker image build verification to `main.yml`.
5. **Frontend Lint & Code Hygiene:**
   * Hoisted state fetching hooks to resolve ESLint React Hook exhaustive-deps warnings.
   * Standardized component exports in `AppRouter.jsx` and `button.jsx`.

---

## 12. Maintenance & Operation Runbooks

### Starting the Full Local Development Environment

1. **Start Ollama LLM Service:**
   ```bash
   ollama run llama3.2:3b
   ```

2. **Start Python AI Service (Port 8000):**
   ```bash
   cd sourcewise-backend/python-ai
   # If using venv: .\venv\Scripts\activate
   pip install -r requirements.txt
   python run.py
   ```

3. **Start Node.js REST API (Port 4000):**
   ```bash
   cd sourcewise-backend/node-api
   npm install
   npm run dev
   ```

4. **Start Web Frontend (Port 5173):**
   ```bash
   cd sourcewise-frontend
   npm install
   npm run dev
   ```

5. **Start Mobile App (Expo):**
   ```bash
   cd sourcewise-mobile
   npm install
   npx expo start
   ```

### Running Test Suites

```bash
# Node.js API Tests
cd sourcewise-backend/node-api
npm test

# Python AI Service Unit Tests
cd sourcewise-backend/python-ai
python -m pytest test_specifications.py app/services/test_*.py -v

# Frontend Lint & Production Build
cd sourcewise-frontend
npm run lint
npm run build
```
