# SourceWise - AI-Powered Study Assistant
## Complete Project Documentation

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Backend - Node.js API](#backend---nodejs-api)
5. [Backend - Python AI Service](#backend---python-ai-service)
6. [Frontend - React Web App](#frontend---react-web-app)
7. [Mobile - React Native App](#mobile---react-native-app)
8. [Database Schema](#database-schema)
9. [Authentication Flow](#authentication-flow)
10. [Feature Inventory](#feature-inventory)
11. [API Endpoints Reference](#api-endpoints-reference)
12. [Environment Variables](#environment-variables)
13. [Setup and Running](#setup-and-running)
14. [Known Issues and Bugs](#known-issues-and-bugs)
15. [Dead Code](#dead-code)
16. [Implementation Gaps](#implementation-gaps)
17. [File Structure](#file-structure)

---

## Project Overview

SourceWise is an AI-powered study assistant that lets students upload study materials (PDF, DOCX, TXT), then uses local AI (Ollama + ChromaDB) to provide RAG-based chat, tutoring, quiz generation, flashcards, study planning, audio summaries, and learning analytics.

**Core Value Proposition**: All AI runs locally on the user machine via Ollama. No cloud API keys needed after initial model download. Documents are processed locally via ChromaDB vector store.

**Current Status**: ~80% functional. Auth, source upload, RAG chat, AI agent, tutoring, and practice questions work end-to-end. Analytics, planner persistence, progress tracking, and audio generation are incomplete.

---

## Tech Stack

### Backend - Node.js API (Port 4000)
| Package | Version | Purpose |
|---------|---------|---------|
| express | 4.18.2 | HTTP framework |
| @supabase/supabase-js | 2.108.2 | Database client |
| bcryptjs | 2.4.3 | Password hashing |
| jsonwebtoken | 9.0.2 | JWT auth tokens |
| cors | 2.8.5 | Cross-origin requests |
| helmet | 7.1.0 | Security headers |
| morgan | 1.10.0 | Request logging |
| express-rate-limit | 7.1.5 | Rate limiting |
| express-async-errors | 3.1.1 | Async error handling |
| dotenv | 16.3.1 | Environment variables |
| axios | 1.6.2 | HTTP client (proxy to Python AI) |
| multer | 1.4.5-lts.1 | File upload (declared, unused) |
| joi | 17.11.0 | Validation (declared, unused) |
| mongoose | 8.0.3 | MongoDB ORM (DEAD CODE) |
| redis | 4.6.11 | Caching (DEAD CODE) |
| aws-sdk | 2.1519.0 | S3 storage (DEAD CODE) |
| bullmq | 5.1.1 | Job queue (DEAD CODE) |
| node-cron | 3.0.3 | Scheduled tasks (DEAD CODE) |
| uuid | 9.0.1 | UUID generation (DEAD CODE) |

### Backend - Python AI Service (Port 8000)
| Package | Version | Purpose |
|---------|---------|---------|
| fastapi | 0.109.0 | Async HTTP framework |
| uvicorn | 0.27.0 | ASGI server |
| httpx | 0.26.0 | Ollama HTTP client |
| sentence-transformers | 2.7.0 | HuggingFace embeddings |
| torch | 2.2.0 | CPU-only inference for embeddings |
| chromadb | 0.4.22 | Local vector database |
| pdfplumber | 0.10.3 | PDF text extraction |
| python-docx | 1.1.0 | DOCX text extraction |
| langchain | 0.1.4 | Text splitting |
| langchain-community | 0.0.16 | Community integrations |
| pydantic | 2.5.3 | Data validation |
| gTTS | 2.5.0 | Text-to-speech (declared, unused) |
| pymongo | 4.6.1 | MongoDB (DEAD CODE) |
| motor | 3.3.2 | Async MongoDB (DEAD CODE) |
| redis | 5.0.1 | Caching (DEAD CODE) |
| tiktoken | 0.5.2 | Token counting (DEAD CODE) |

### Frontend - React Web App (Port 5173)
| Package | Version | Purpose |
|---------|---------|---------|
| react | 19.2.5 | UI framework |
| react-dom | 19.2.5 | DOM rendering |
| react-router-dom | 7.14.2 | Client-side routing |
| zustand | 5.0.12 | State management |
| axios | 1.15.2 | HTTP client |
| framer-motion | 12.38.0 | Animations |
| react-dropzone | 15.0.0 | File upload drag-and-drop |
| react-hook-form | 7.74.0 | Form management |
| lucide-react | 1.11.0 | Icons |
| tailwindcss | 3.4.19 | CSS framework |
| @radix-ui/react-slot | 1.2.4 | UI primitives |
| class-variance-authority | 0.7.1 | Component variants |
| clsx | 2.1.1 | Class name utility |
| tailwind-merge | 3.5.0 | Tailwind class merging |

### Mobile - React Native (Expo)
| Package | Version | Purpose |
|---------|---------|---------|
| expo | ~54.0.33 | React Native framework |
| expo-router | ~6.0.23 | File-based routing |
| react-native | 0.81.5 | Mobile framework |
| react-native-paper | 5.15.1 | Material Design components |
| @react-navigation/native | 7.1.8 | Navigation |
| zustand | 5.0.12 | State management |
| axios | 1.15.2 | HTTP client |
| lucide-react-native | 1.11.0 | Icons |

### AI Models (Local)
| Model | Source | Size | Purpose |
|-------|--------|------|---------|
| llama3.2:3b | Ollama | ~2GB | All LLM tasks |
| all-MiniLM-L6-v2 | HuggingFace | ~90MB | Document embeddings |

### Infrastructure
| Service | Technology | Purpose |
|---------|-----------|---------|
| Primary Database | Supabase (PostgreSQL) | User data, sources, sessions, progress |
| Vector Store | ChromaDB (local disk) | Document embeddings for RAG |
| LLM Runtime | Ollama (local) | LLM inference |
| Embeddings | sentence-transformers (local) | Text embeddings |

---

## Architecture

`
+---------------------+     +---------------------+
|   React Frontend    |     |  React Native Mobile |
|   (Port 5173)       |     |  (Expo)              |
+----------+----------+     +----------+----------+
           |                           |
           |  HTTP/SSE                 |  HTTP/SSE
           |                           |
           v                           v
+--------------------------------------------------+
|              Node.js API (Port 4000)              |
|  Express + Supabase + JWT Auth + Rate Limiting    |
+----------+------------------------+----------+
           |                        |
           |  HTTP/SSE              |  HTTP
           |                        |
           v                        v
+---------------------+  +---------------------+
|  Python AI Service  |  |  Supabase (Postgres) |
|  (Port 8000)        |  |  Users, Sources,     |
|  FastAPI + Ollama   |  |  Progress, Sessions, |
|  + ChromaDB         |  |  Learning Profiles   |
+----------+----------+  +---------------------+
           |
           |  HTTP (localhost:11434)
           v
+---------------------+
|  Ollama (Local LLM) |
|  llama3.2:3b         |
+---------------------+
`

**Data Flow**:
1. Frontend to Node API: Auth, CRUD operations, tutor proxying
2. Frontend to Python AI: Document upload (ingest), RAG chat (streaming SSE)
3. Node API to Python AI: Tutor explain (streaming SSE), practice generation, answer evaluation
4. Node API to Supabase: All persistent data storage
5. Python AI to ChromaDB: Vector storage and retrieval
6. Python AI to Ollama: All LLM inference

---

## Backend - Node.js API

### Entry Point: src/index.js
- Express server on port 4000
- Security: Helmet, CORS (localhost:5173, 5174), Rate limiting (auth: 100/15min, data: 1000/15min)
- JSON body parsing (10MB limit)
- Morgan logging in development
- Health check at GET /health

### Route Mounting
`
/auth         -> auth.routes.js (authLimiter)
/sources      -> source.routes.js (dataLimiter)
/planner      -> planner.routes.js (dataLimiter)
/progress     -> progress.routes.js (dataLimiter)
/dashboard    -> dashboard.routes.js (dataLimiter)
/tutor        -> tutor.routes.js (dataLimiter)
/learning-profile -> learning-profile.routes.js (dataLimiter)
/analytics    -> analytics.routes.js (dataLimiter)
`

### Middleware

**auth.js** - JWT Authentication
- Extracts Bearer token from Authorization header
- Verifies JWT using JWT_SECRET
- Looks up user from Supabase users table
- Sets req.user with id, userId, name, email

**errorHandler.js** - Global Error Handler
- Catches unhandled errors, returns JSON error message
- Stack traces in development mode

### Route Details

#### Auth Routes (/auth)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/register | No | Register user with email, password, name. Creates user + learning_profile. Returns JWT. |
| POST | /auth/login | No | Login with email, password. Bcrypt compare. Returns JWT. |
| GET | /auth/me | Yes | Validate token. Returns user object. |

#### Source Routes (/sources)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /sources | Yes | List all user sources |
| POST | /sources | Yes | Create source metadata |
| GET | /sources/:id | Yes | Get single source |
| PATCH | /sources/:id | Yes | Update source fields |
| DELETE | /sources/:id | Yes | Delete source (does NOT delete ChromaDB vectors) |

#### Planner Routes (/planner)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /planner | Yes | List all user plans |
| POST | /planner | Yes | Create plan |
| GET | /planner/:id | Yes | Get single plan |
| PATCH | /planner/:id | Yes | Update plan |
| DELETE | /planner/:id | Yes | Delete plan |

#### Progress Routes (/progress)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /progress | Yes | List all progress events |
| POST | /progress | Yes | Create progress event |
| GET | /progress/:id | Yes | Get single event |
| PATCH | /progress/:id | Yes | Update event |

#### Dashboard Routes (/dashboard)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /dashboard/stats | Yes | Returns source, progress, planner counts |

#### Tutor Routes (/tutor)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /tutor/ask | Yes | Main tutoring: streams SSE from Python |
| POST | /tutor/practice | Yes | Generate practice questions |
| POST | /tutor/evaluate | Yes | Evaluate answers with feedback |
| GET | /tutor/suggest-topics | Yes | Suggest topics from learning profile |
| POST | /tutor/session/start | Yes | Create tutoring session |
| POST | /tutor/session/end | Yes | End session, calculate stats |
| GET | /tutor/history | Yes | List past sessions |
| GET | /tutor/session/:id | Yes | Get session details |

#### Learning Profile Routes (/learning-profile)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /learning-profile/me | Yes | Get or create profile |
| PATCH | /learning-profile/me | Yes | Update profile |
| GET | /learning-profile/me/knowledge-map | Yes | Get concepts and gaps |
| GET | /learning-profile/me/analytics | Yes | Get study analytics |

#### Analytics Routes (/analytics)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /analytics/study-patterns/:userId | Yes | STUB - returns zeros |
| GET | /analytics/knowledge-growth/:userId | Yes | STUB - returns empty |
| GET | /analytics/recommendations/:userId | Yes | STUB - returns empty |

---

## Backend - Python AI Service

### Entry Point: app/main.py
- FastAPI server on port 8000
- CORS configured for localhost:4000 and localhost:5173
- Registers 5 routers: ingest, chat, tutor, agent, source_analysis

### Configuration: app/config.py
| Setting | Default | Description |
|---------|---------|-------------|
| OLLAMA_BASE_URL | http://localhost:11434 | Ollama API endpoint |
| OLLAMA_MODEL | llama3.2:3b | LLM model name |
| CHROMA_PATH | ./chroma_db | ChromaDB storage path |
| CHROMA_COLLECTION | sourcewise | Collection name |
| EMBEDDING_MODEL | all-MiniLM-L6-v2 | HuggingFace model |
| TOP_K_CHUNKS | 10 | Retrieval count |
| CHUNK_SIZE | 800 | Text chunk size |
| CHUNK_OVERLAP | 120 | Chunk overlap |
| QUERY_EXPANSION_ENABLED | true | Enable query expansion |
| MIN_RELEVANCE_THRESHOLD | 0.25 | Minimum relevance score |
| RERANK_TOP_K | 8 | Re-ranking count |

### Service Layer

#### Core Infrastructure
| Service | File | Purpose |
|---------|------|---------|
| LLM | services/llm.py | Ollama interface, system prompts, streaming |
| Embedder | services/embedder.py | HuggingFace embeddings (lazy singleton) |
| Vector Store | services/vector_store.py | ChromaDB add/query/delete |
| RAG Chain | services/rag_chain.py | Query expansion, retrieval, dedup, rerank, LLM |
| Text Extractor | services/extractor.py | PDF, DOCX, TXT extraction |
| Text Chunker | services/chunker.py | LangChain text splitting |

#### AI Tutoring Services
| Service | File | Purpose |
|---------|------|---------|
| Tutor Chain | services/tutor_chain.py | Orchestrator (1229 lines) |
| Explanation Engine | services/explanation_engine.py | Multi-strategy explanations |
| Socratic Engine | services/socratic_engine.py | Guiding questions, hints |
| Practice Generator | services/practice_generator.py | MCQ/short_answer/application |
| Concept Extractor | services/concept_extractor.py | LLM-based concept extraction |
| Knowledge Graph Builder | services/knowledge_graph_builder.py | Concept graphs, BFS paths |
| Personality Engine | services/personality_engine.py | Adaptive communication |
| Conversation Memory | services/conversation_memory.py | Multi-turn context |
| Source Synthesizer | services/source_synthesizer.py | Cross-source synthesis |
| Intent Parser | services/intent_parser.py | LLM intent parsing |
| Action Executor | services/action_executor.py | Routes intents to services |

### Python Endpoints

#### Ingest Router (/ingest)
| Method | Path | Description |
|--------|------|-------------|
| POST | /ingest | Upload file, extract, chunk, embed, store in ChromaDB |
| DELETE | /ingest/{source_id} | Remove vectors for a source |
| GET | /ingest/{source_id}/count | Count stored chunks |

#### Chat Router (/chat)
| Method | Path | Description |
|--------|------|-------------|
| POST | /chat | Blocking RAG chat with citations |
| POST | /chat/stream | Streaming RAG chat via SSE |
| GET | /chat/health | Check Ollama status |

**RAG Pipeline**: Query expansion -> Vector retrieval -> Dedup -> Re-ranking -> Confidence check -> Context building -> LLM generation

#### Tutor Router (/tutor)
| Method | Path | Description |
|--------|------|-------------|
| POST | /tutor/explain | Streaming tutoring with 4 modes |
| POST | /tutor/practice | Generate practice questions |
| POST | /tutor/evaluate | Evaluate answers |
| POST | /tutor/concepts/extract | Extract concepts from text |
| POST | /tutor/concepts/graph | Build concept graph |
| POST | /tutor/synthesis | Cross-source synthesis |
| POST | /tutor/teaching-material | Generate teaching materials |
| POST | /tutor/source-map | Map topics across sources |

**Tutoring Modes**: direct, socratic, exploratory, exam_prep

#### Agent Router (/agent)
| Method | Path | Description |
|--------|------|-------------|
| POST | /agent | Unified agent with intent parsing |
| POST | /agent/confirm | Confirm actions (STUB) |
| GET | /agent/suggestions | Get suggestions (STUB) |
| GET | /agent/health | Health check |

**12 Intent Actions**: chat, create_quiz, create_flashcards, summarize, create_planner, tutor, generate_audio, create_study_guide, create_notes, explain_concept, find_connections, analyze_source

#### Source Analysis Router (/sources)
| Method | Path | Description |
|--------|------|-------------|
| POST | /sources/analyze | Deep analysis (partial) |
| POST | /sources/synthesize | Cross-source synthesis |
| GET | /sources/{id}/concepts | Extract concepts |

---

## Frontend - React Web App

### Router Configuration
| Route | Page | Auth |
|-------|------|------|
| / | LandingPage | No |
| /signup | SignupPage | No |
| /login | LoginPage | No |
| /ai-hub | AIHubPage | Yes |
| /dashboard | DashboardPage | Yes |
| /sources | SourcesPage | Yes |
| /summary/:sourceId | SummaryPage | Yes |
| /flashcards | FlashcardsPage | Yes |
| /quiz | QuizPage | Yes |
| /audio | AudioPage | Yes |
| /studio | StudioPage | Yes |
| /tutor | TutorPage | Yes |
| /analytics | AnalyticsPage | Yes |
| /planner | PlannerPage | Yes |
| /settings | SettingsPage | Yes |

### State Management (Zustand Stores)

#### authStore.js
- Persisted: sourcewise-auth
- State: user, accessToken, isAuthenticated, _hasHydrated
- Actions: login(), logout(), hydrateFromToken()

#### sourceStore.js
- Persisted: sourcewise-sources
- State: uploadedSources[], activeSourceIds[]
- Actions: addSource(), removeSource(), toggleActiveSource(), updateSourceStatus()
- Issue: Client-side only, never syncs with backend

#### chatStore.js
- Persisted: sourcewise-chat
- State: conversations (map), activeConversationId, isOpen, legacy messages[]
- Actions: newConversation(), switchConversation(), deleteConversation(), addMessage()
- Issue: Dual message system

#### aiHubStore.js
- Persisted: sourcewise-ai-hub
- State: selectedSources, messages, generatedQuizzes[], generatedFlashcards[], generatedSummaries[]
- Actions: sendMessage(), analyzeSelectedSources(), loadSuggestions()

#### tutorStore.js
- State: currentSession, tutoringMode, explanationHistory[], practiceProblems[]
- Actions: startSession(), endSession(), askQuestion(), generatePractice(), submitAnswer()

#### analyticsStore.js
- State: learningProfile, knowledgeMap, studyPatterns, recommendations[]
- Actions: 7 fetch methods for backend endpoints
- Issue: NEVER used by any page

### API Libraries

#### lib/chatApi.js
- Functions: ingestDocument(), deleteSourceVectors(), streamChat(), checkAIHealth()
- Used by: SourcesPage, ChatPage, StudioPage, ChatPanel

#### lib/agentApi.js
- Functions: sendAgentMessage(), streamAgentMessage(), confirmAction(), getSuggestions(), analyzeSources(), synthesizeCrossSource(), checkAgentHealth()
- Used by: aiHubStore, SummaryPage, FlashcardsPage, QuizPage, PlannerPage, AudioPage

### Page Details

#### LandingPage (/)
- Static marketing page with particle background, floating cards, ambient effects

#### LoginPage (/login)
- Split layout with react-hook-form validation
- POST /auth/login, redirects to /dashboard

#### SignupPage (/signup)
- Registration form with password matching
- POST /auth/register, redirects to /dashboard

#### DashboardPage (/dashboard)
- Stats cards, Quick Actions grid, Study Progress ring, Recent Activity
- Data from Zustand stores (client-side only)

#### SourcesPage (/sources)
- Drag-and-drop upload, file list, active sources sidebar
- Upload: file -> Python AI /ingest -> Node API /sources (metadata)

#### AIHubPage (/ai-hub)
- Three-panel: source selector | chat | generated content
- Calls Python AI /agent endpoint

#### ChatPage (/chat)
- Multi-conversation sidebar, streaming RAG chat with citations

#### FlashcardsPage (/flashcards)
- 3D flip cards, progress ring, navigation

#### QuizPage (/quiz)
- Timer, MCQ, scoring, retry

#### AudioPage (/audio)
- Script generation, TTS (falls back to browser SpeechSynthesis)

#### StudioPage (/studio)
- NotebookLM-inspired three-panel layout

#### TutorPage (/tutor)
- AI Tutor, Practice, Knowledge Map tabs
- SSE streaming tutoring, practice evaluation

#### AnalyticsPage (/analytics)
- Stats grid, progress ring, activity, recommendations
- Issue: Uses localStorage counters, ignores analyticsStore

#### PlannerPage (/planner)
- AI generates weekly study plans
- Issue: Never saves plan to backend

#### SettingsPage (/settings)
- Profile, Notifications, Privacy, Appearance tabs
- Issue: Saves to authStore in-memory only

### Components

#### Layout: MainLayout (sidebar, user section, logout, chat FAB)
#### Chat: ChatPanel (slide-over panel)
#### Dashboard: InsightsPanel, StatsCard, QuickActionCard, etc.
#### Tutor: TutorPanel, PracticeInterface
#### Analytics: KnowledgeMap (canvas-based concept graph)
#### UI: GlowCard, StudyProgressRing, Button, Input
#### Effects: AmbientEffects, CursorGlow, CelebrationEffect

---

## Mobile - React Native App

### Screens
| Screen | Path | Status |
|--------|------|--------|
| Login | app/(auth)/login.tsx | Calls real API |
| Dashboard | app/(tabs)/index.tsx | Fetches real data |
| Sources | app/(tabs)/sources.tsx | Fetches real data |
| Planner | app/(tabs)/planner.tsx | Fetches real data |

### Stores: authStore.ts (full auth flow)
### API Config: utils/api.ts (API_URL port 4000, AI_URL port 8000)

---

## Database Schema

### Supabase Tables

#### users
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| email | text | Unique |
| name | text | Display name |
| password_hash | text | bcrypt hash |

#### sources
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| user_id | uuid | FK to users |
| name | text | File name |
| type | text | File extension |
| size | integer | File size in bytes |
| status | text | uploading/processing/ready/error |
| chunks_indexed | integer | Chunks in ChromaDB |
| created_at | timestamptz | Auto |

#### planners
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| user_id | uuid | FK to users |
| title | text | Plan title |
| data | jsonb | Full plan structure |
| source_ids | uuid[] | Related sources |
| exam_date | text | Target exam date |
| subject | text | Subject name |
| created_at | timestamptz | Auto |

#### progress
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| user_id | uuid | FK to users |
| type | text | source_upload/practice/quiz/tutoring_session |
| concept | text | Topic |
| correct | boolean | Correct answer |
| score | float | Score value |
| duration_minutes | integer | Session duration |
| created_at | timestamptz | Auto |

#### learning_profiles
| Column | Type | Notes |
|--------|------|-------|
| user_id | uuid | FK to users (unique) |
| concept_mastery | jsonb | Array of mastery objects |
| knowledge_gaps | jsonb | Array of gap objects |
| preferences | jsonb | Learning preferences |
| study_patterns | jsonb | Study pattern data |

#### tutoring_sessions
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| user_id | uuid | FK to users |
| source_ids | uuid[] | Sources used |
| mode | text | direct/socratic/exploratory/exam_prep |
| conversation_history | jsonb | Message array |
| created_at | timestamptz | Auto |
| ended_at | timestamptz | Session end |
| duration_minutes | integer | Duration |
| questions_asked | integer | Count |
| concepts_covered | jsonb | Concept strings |

#### practice_attempts
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| user_id | uuid | FK to users |
| concept | text | Topic |
| question_type | text | mcq/short_answer/application |
| question_text | text | The question |
| options | jsonb | Answer options |
| correct_answer | text | Correct answer |
| difficulty | text | easy/medium/hard |
| answer | text | User answer |
| correct | boolean | Correct |
| score | float | Score |
| feedback | text | AI feedback |
| created_at | timestamptz | Auto |

---

## Authentication Flow

1. Register: POST /auth/register -> bcrypt hash -> insert users + learning_profiles -> return JWT
2. Login: POST /auth/login -> lookup user -> bcrypt compare -> return JWT
3. Token: JWT contains userId, expires 7 days, signed with JWT_SECRET
4. Hydration: On page load, authStore calls GET /auth/me -> validates -> updates state
5. Logout: Clear JWT from localStorage -> set isAuthenticated=false

---

## Feature Inventory

### Fully Working End-to-End
| Feature | Status |
|---------|--------|
| User Registration | Working |
| User Login | Working |
| Token Validation | Working |
| Source Upload | Working |
| Source Deletion | Working |
| RAG Chat | Working |
| AI Agent | Working |
| Quiz Generation | Working |
| Flashcard Generation | Working |
| Summary Generation | Working |
| Study Plan Generation | Working |
| Study Guide Generation | Working |
| Notes Generation | Working |

### Working but Backend-Disconnected
| Feature | Issue |
|---------|-------|
| Source Metadata | Saved to localStorage, not Supabase |
| Study Plans | Generated but never saved |
| Dashboard Stats | Shows local session counts only |
| Analytics | Uses localStorage counters |
| Settings | Profile saved in-memory only |

### Backend Exists but Not Connected
| Feature | Status |
|---------|--------|
| Study Patterns | STUB - returns zeros |
| Knowledge Growth | STUB - returns empty |
| Recommendations | STUB - returns empty |
| Audio TTS | gTTS installed, never called |
| Agent Confirm | Returns hardcoded response |
| Agent Suggestions | Returns static list |
| Source Analysis | Partial - overview works only |

---

## Environment Variables

### Node.js API (.env)
`
PORT=4000
NODE_ENV=development
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=sb_publishable_xxx
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx
JWT_SECRET=dev_jwt_secret
REFRESH_TOKEN_SECRET=dev_refresh_token_secret
PYTHON_SERVICE_URL=http://localhost:8000
FRONTEND_ORIGIN=http://localhost:5173
`

### Python AI (.env)
`
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
CHROMA_PATH=./chroma_db
CHROMA_COLLECTION=sourcewise
EMBEDDING_MODEL=all-MiniLM-L6-v2
TOP_K_CHUNKS=6
CHUNK_SIZE=800
CHUNK_OVERLAP=120
NODE_API_ORIGIN=http://localhost:4000
FRONTEND_ORIGIN=http://localhost:5173
`

### Frontend (.env)
`
VITE_API_URL=http://localhost:4000
VITE_AI_URL=http://localhost:8000
`

---

## Setup and Running

### Prerequisites
1. Node.js 18+
2. Python 3.10+
3. Ollama installed with llama3.2:3b model
4. Supabase project

### Start Services
`ash
# 1. Start Ollama
ollama serve
ollama pull llama3.2:3b

# 2. Start Python AI Service
cd sourcewise-backend/python-ai
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python run.py

# 3. Start Node.js API
cd sourcewise-backend/node-api
npm install
npm run dev

# 4. Start Frontend
cd sourcewise-frontend
npm install
npm run dev
`

---

## Known Issues and Bugs

### Critical Bugs
1. TutorPanel calls nonexistent fetchSources() from sourceStore
2. PracticeInterface generate buttons have no onClick handlers
3. ChatPanel and ChatPage use different message systems

### Data Flow Gaps
4. Source metadata never saved to Supabase
5. Study plans never persisted to backend
6. Progress events never recorded
7. Learning profile never updated after practice
8. Analytics return zeros (stubs)
9. Dashboard shows only 3 counts

### UI Issues
10. Studio Quick Insights are hardcoded static data
11. Analytics timestamps all show "Just now"
12. Settings not persisted to backend

### Code Quality
13. No input validation on POST/PATCH routes
14. RLS wide open (USING true WITH CHECK true)
15. Delete source does not clean ChromaDB

---

## Dead Code

### Backend - Node.js
- All 9 Mongoose model files (User, Source, Planner, Progress, etc.)
- utils/database.js (MongoDB connection)
- utils/redis.js (Redis client)
- utils/s3.js (S3 upload/delete)
- jobs/analytics-aggregation.js (Cron jobs)
- test-db-connection.js

### Backend - Python AI
- pymongo, motor, redis, tiktoken, gTTS (declared, never imported)

### Frontend
- analyticsStore (fully coded, never used)
- @tanstack/react-query, recharts, wavesurfer.js (declared, unused)

---

## Implementation Gaps

### Priority 1: Source Pipeline
- Frontend sends files to Python AI directly
- Node API POST /sources exists but is never called
- No source metadata in Supabase

### Priority 2: Planner Persistence
- AI generates study plans but never saves them

### Priority 3: Progress Tracking
- /progress routes exist but nothing writes to them

### Priority 4: Learning Profile Updates
- concept_mastery created on register, never updated

### Priority 5: Dashboard Real Data
- Only returns 3 count numbers

### Priority 6: Analytics
- Three endpoints return zeros
- analyticsStore unused

### Priority 7: Audio TTS
- gTTS installed but never called

### Priority 8: Dead Code Cleanup
- 9 Mongoose models + unused utils

### Priority 9: Settings Backend
- Profile saved in-memory only

### Priority 10: Bug Fixes
- TutorPanel fetchSources
- PracticeInterface button wiring
- ChatPanel/ChatPage message unification
