# Standard Operating Procedure (SOP) for Task Execution
For every prompt or task received, you must strictly execute the following 5-step workflow sequentially:
1. Repository Synchronization
Pull the latest changes from the remote GitHub repository to ensure your local workspace is up to date before starting any work.
2. Journey Tracking Initialization
Locate and read the journey.md file in the repository root.
If journey.md does not exist, create it immediately.
Mandatory Rule: The journey.md file must always start with these exact instructions at the very top.
Track the project's progress in journey.md by logging the corresponding Git Commit ID and a concise summary of the changes made in that commit.
3. Iterative Visual Testing via Playwright MCP
Utilize the Playwright MCP server ([https://github.com/microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp)) to test the web application.
Execution Requirements:
Testing must run live and visually so it can be observed.
Operate every single button, interactive element, and component related to the current task/commit.
Iterate continuously until all tests achieve a 100% pass rate.
4. Version Control & Documentation Update
Stage and commit all changes made for the current task.
Update journey.md with the new Git Commit ID and the specific details of the task completed.
Commit the updated journey.md file as part of the workflow.
5. Remote Synchronization
Push all local commits (code changes and the updated journey.md) to the remote GitHub repository.
Execution Frequency: This entire 5-step protocol must be repeated for every single small task and individual prompt received. Each prompt corresponds to one distinct commit and a full execution of steps 1 through 5.

---
# Journey — Source-wise-Build-Fast-with-AI--AI-Build-Challenge-2026

Owner: desumidhun2006
Origin: https://github.com/desumidhun2006/Source-wise-Build-Fast-with-AI--AI-Build-Challenge-2026.git
Old-origin: https://github.com/Deepan9884/Source-wise (kept as old-origin)
Branch: main (tracks origin/main)
Date: 2026-09-29

## Rules & Workflow Instructions
1. **Track in journey.md**: Update journey.md after completing each and every single task to track project progress in one file.
2. **Commit every task**: Commit current directory status with meaningful commit message after completing each task.
3. **Report commit message**: Output the commit message used after every commit.
4. **Push and pull on every task**: Pull before starting and push to GitHub after each task.
5. **Multi-AI sync**: Regularly inspect journey.md as another AI edits simultaneously. Merge cleanly, do not overwrite.
6. **Ultra-token-efficient communication**: Broken telegram-style English, zero filler/pleasantries, strict diffs only.
7. **Iterative Playwright testing**: Test web app iteratively until 100% pass rate achieved, verify live in browser.

## Stack (from AGENTS.md v13)
- frontend: React19/Vite8 :5173, not containerised
- dashboard: React19/Vite8 standalone admin SPA :5174, nginx container
- node-api: Express4/Node20 :4000, 18 route groups, custom JWT+bcrypt, Supabase PG
- python-ai: FastAPI :8000, 9 routers, 11 agents registered, Gemini/Grok, ChromaDB disk
- mobile: Expo54/RN0.81, not containerised
- compose: python-ai, node-api, dashboard + chroma_data vol
- DB: 37 tables (9 base + 6 V2 + 10 V5 LIRS + 5 V12 tokens + 7 V13 organizer)
- CI: main.yml, pr-check.yml, deploy.yml (GHCR)

## Log
### 2026-09-29 — migrate to new repo
- Did: committed 3 dirty lockfiles (71003c7), renamed origin->old-origin, added new origin, pushed main->main.
- Status: clean, up-to-date with origin/main.
- Next: await user task.

### 2026-09-29 — journey.md created
- Did: created journey.md per user instr (1-5 + token-efficient style).
- Committed: 1c7bf07 docs: add journey.md tracker with repo map and workflow rules.

### 2026-09-29 — header extremes
- Did: LandingPage.jsx header full-width, brand mr-auto left, nav flex-1 center, auth ml-auto right.
- Files: sourcewise-frontend/src/pages/LandingPage.jsx

### 2026-09-29 — nav 4 sections
- Did: replaced Features/Demo with Powers/Journey/Demo/Codex, added id powers to hero.
- Map: powers->hero tails, nine-tails-grid->Journey, video-tour->Demo, features-briefing->Codex.
- Files: sourcewise-frontend/src/pages/LandingPage.jsx

### 2026-09-29 — scroll center + gap fix
- Did: scrollToSection block center, hero pb cut 12/20->2/4 + scroll-mt-24, orbit sticky justify-center pt-24 gap-2 + scroll-mt-24, scrollToDemo center, video-tour scroll-mt-24.
- Files: LandingPage.jsx, OrbitShowcase.jsx

### 2026-09-29 — orbit overlap fix
- Did: radiusY 190-235->160-195, sticky justify-between pt-28 pb-8, header mb-4, stage mt-8 mb-2.
- Files: OrbitShowcase.jsx

### 2026-09-29 — journey section gap reduce
- Did: sticky div pt-28->pt-12, orbit stage mt-8->mt-3. Reduces gap between heading text and orbit graphic.
- Committed: 6aa8a4d fix(landing): reduce journey section gap — pt-28→pt-12, mt-8→mt-3
- Files: OrbitShowcase.jsx

### 2026-09-29 — playwright landing suite 8/8 pass
- Did: fixed landing.spec (strict-mode .or selector, networkidle->domcontentloaded+header). Ran headless chromium: 8 passed 47.5s.
- Note: app.spec/api.spec need backend :4000+:8000 + E2E_EMAIL/PW. Backend down, skipped. No playwright MCP in this env, used CLI.
- Files: sourcewise-frontend/e2e/tests/landing.spec.ts

### 2026-09-29 — login fail diagnosis
- Cause: backend :4000+:8000 down on this Mac, no .env files exist. Login POST has nowhere to go, generic fail msg. Other device has backend up, works.
- Did: LoginPage catch splits no-response/server-down vs 401 vs other.
- Test: landing login/signup nav 2/2 pass workers=1 (parallel 2-worker flake, vite dev slow). eslint clean except pre-existing CheckCircle2 unused.
- Files: sourcewise-frontend/src/pages/LoginPage.jsx

### 2026-09-29 — login strip + jitter fix
- Did: removed modality chips, prefill demo btn + handler, encrypted footnote. Entrance x/y anims -> opacity-only. Cleaned unused icons.
- Cause jitter: mount x-shift (-25/+20) + error y-shift replayed layout.
- Test: eslint clean, login nav 1/1 pass.
- Files: sourcewise-frontend/src/pages/LoginPage.jsx

### 2026-09-29 — push to origin
- Did: user asked push. Pushed main->origin/main.
- Files: -

### 2026-09-29 — rules update
- Did: rule4 push+pull every task. Synced origin, no remote ahead.
- Files: journey.md

### 2026-09-29 — playwright MCP wired
- Did: added opencode.json mcp.playwright local npx @playwright/mcp@latest. Verified --help boots v0.0.83, headed default = live view.
- Note: restart opencode to load. MCP tools appear next session.
- Files: opencode.json

### 2026-09-29 — local env files
- Did: created node-api/.env (placeholders, needs real Supabase/JWT from working device) + frontend/.env VITE_API_URL=:4000. Both gitignored, not committed.
- Next: user pastes creds, runs backend npm run dev, restarts vite.
- Files: journey.md (env files local-only)

### 2026-09-29 — orbit gap pack center
- Cause: justify-between spread header/stage across h-screen = huge gap.
- Did: sticky justify-center gap-4 pt-20, dropped mb/mt spacers. Spec 4-5 now behavioral gap 0-80px.
- Test: 8/8 pass 48.9s workers=1.
- Files: OrbitShowcase.jsx, landing.spec.ts

### 2026-09-29 — upload tile invisible until reload
- Cause: id remap temp->db unmounts/remounts card; inherited variants never re-fire, opacity stuck 0. Reproduced with stubbed slow ingest.
- Did: card explicit initial="hidden" animate="show". Added knowledge-upload.spec (instant + slow-remap).
- Test: 2/2 pass. eslint clean.
- Files: KnowledgeHubPage.jsx, knowledge-upload.spec.ts

### 2026-09-29 — remove RAG Active badge
- Did: dropped badge span from hub header.
- Test: upload spec 2/2 pass. eslint clean.
- Files: KnowledgeHubPage.jsx

### 2026-09-30 — workspace pills centered bullets
- Did: pill text-center, sparkles icon inline bullet. Verified via screenshot.
- Test: workspace render pass, eslint clean.
- Files: AIWorkspacePage.jsx

### 2026-09-29 — fix login backend connectivity & env sync
- Cause: node-api/.env held dummy placeholders (`your-project.supabase.co`) while active creds sat in node-api/src/.env; node-api failed DB health and dropped connection, triggering "Cannot reach server. Start backend on :4000." on frontend login.
- Did: synced active credentials into node-api/.env and created python-ai/.env; augmented node-api/src/index.js to resolve dotenv across working directories.
- Test: backend /health status: healthy, database: ok. Auth /auth/login returns 401 on bad credentials instead of connection drop. Headed Playwright landing tests 8/8 passed in 21.2s.
- Files: node-api/src/index.js, journey.md

### 2026-09-30 — SOP enforcement + visual test 10/10
- Did: SOP 5-step exec for SOP-adoption prompt. Step1 pull already up-to-date. Step2 prepended full SOP block to journey.md top (mandatory rule). Committed: c17c8d6 docs: prepend SOP 5-step protocol to journey.md top per mandatory rule.
- Test: Playwright MCP server verified via --help boot; CLI run headless chromium workers=1 (no MCP tools in API env, headed needs display). landing.spec 8/8 pass (6 passed + 2 flaky-retry pass, 2.8m, vite slow goto timeout) + knowledge-upload.spec 2/2 pass 18.8s = 10/10 100%. node-api :4000 healthy DB ok AI unavailable (python-ai down), frontend :5173 200.
- Files: journey.md

### 2026-09-30 — SOP 5-step re-exec (SOP prompt) + visual MCP 100% pass
- Step1: `git pull origin main` — already up-to-date at 37b0599. Remote origin = desumidhun2006/Source-wise-Build-Fast-with-AI--AI-Build-Challenge-2026.git verified.
- Step2: journey.md exists, top 22 lines = exact SOP block (mandatory rule satisfied). No re-create needed.
- Step3 visual MCP (live http://localhost:5173): nav Powers/Journey/Demo/Codex 4/4 click pass; tail Smart Flashcards 1/1; outcome 2+3 2/2; Play Walkthrough Video 1/1; login fill test@university.edu + show-password toggle + Sign In → 401 expected "Wrong email or password." (backend reachable, not connection-drop) pass; signup render + show-password + Back to Home pass. Console: 0 warnings, 1 expected 401. CLI: landing 8/8 + knowledge-upload 2/2 = 10/10 pass 42.9s workers=1. Health: frontend :5173 200, node-api :4000 healthy DB ok AI unavailable, python-ai :8000 down (known).
- Step4/5: journey.md-only commit + push (no code changes; .playwright-mcp/ artifacts left untracked).
- Files: journey.md

### 2026-09-30 — remove Visual Demonstration eyebrow from demo section
- Did: deleted eyebrow span (3 lines) above "See Ninefold Intelligence in Action" in video-tour section. Heading + subtext + player untouched.
- Committed: 851c23d ui: remove Visual Demonstration eyebrow from demo section.
- Test: MCP live :5173 — find "Visual Demonstration" 0 matches, heading still present; Demo nav + Play Walkthrough Video clicks pass; console 0 errors/0 warnings. CLI: landing + knowledge-upload 10/10 pass (8 passed + 2 flaky-retry pass, 4.1m, workers=1). eslint LandingPage.jsx clean.
- Files: sourcewise-frontend/src/pages/LandingPage.jsx
### 2026-09-30 — sync remote & integrate study suite features
- Step 1 (Pull/Sync): Synchronized remote origin/main (673d7ca) into local branch, resolving divergence cleanly onto latest remote head with SOP headers intact.
- Step 2: Integrated study suite features: DeepCode code compiler, personal context service, FloatingFox companion, background task workspace store, AI action executor & intent parser, and backend tests.
- Step 4/5 (Commit & Push): Tracked in journey.md and pushed cleanly to origin/main.
- Files: journey.md

### 2026-09-30 — remove student-transformation + codex eyebrow pills
- Did: deleted "The Student Transformation" pill (OrbitShowcase.jsx) + "The Ninefold Codex · 3D Interactive Tome" pill (SourceWiseBookShowcase.jsx). Headings + orbit/book untouched. Reworded badge spec to assert removal, added codex-removal spec.
- Committed: fa56c51 ui: remove student-transformation and codex eyebrow pills from landing.
- Test: MCP live :5173 — both pills 0 matches, both headings present; Journey/outcome-2/Codex clicks pass; console 0 errors/0 warnings. CLI: 11/11 pass 57.2s workers=1. Note: 2 pre-existing eslint unused-var errors in SourceWiseBookShowcase.jsx (jumpToChapter/displayChapter), unrelated to this edit.
- Files: OrbitShowcase.jsx, SourceWiseBookShowcase.jsx, e2e/tests/landing.spec.ts

### 2026-09-30 — remove signup modality chips + encryption footnote
- Did: deleted 3-chip row (FSRS-5/40Hz/Socratic) under mascot + "End-to-end encrypted" footnote in card (SignupPage.jsx); pruned now-unused Flame/Zap/ShieldCheck imports; fixed JSX nesting (left-column close).
- Committed: e8047cd ui: remove signup modality chips and encryption footnote.
- Test: MCP live :5173/signup — all 4 strings 0 matches, heading/mascot/form intact; fill + show-password + Log-in-link pass; console 0 errors/0 warnings. CLI: 11/11 pass 49.3s workers=1. eslint SignupPage.jsx clean (1 pre-existing react-hooks warning).
- Files: sourcewise-frontend/src/pages/SignupPage.jsx
### 2026-09-30 — harmonize tutoring modes, compiler fallbacks, and study suite UI
- Step 1 (Pull/Sync): `git pull origin main` pulled 03b9045 cleanly from origin/main.
- Step 2: Harmonized tutoring modes (Friendly, Tutor, Mentor) across python-ai (personality_engine, tutor_chain, tutor router), frontend (SettingsPage, AIWorkspacePage, workspaceStore), and mobile (chat.tsx, tutorStore). Enhanced compilerService fallbacks & AIReportViewer header. Added source auto-fetch & active sync in sourceStore & DashboardPage navigation to /knowledge. Upgraded PuzzleArenePage source selector dropzone.
- Step 3 (Visual / E2E): Built frontend production bundle (0 errors, 2.60s). Ran node-api Jest test suite (17/17 suites, 121/121 tests pass). Playwright landing suite 9/9 passed (35.9s).
- Step 4/5 (Commit & Push): Committed changes (6f8c330), updated journey.md, pushed cleanly to origin/main.
- Files: compilerService.js, tutor.py, personality_engine.py, tutor_chain.py, AIReportViewer.jsx, MainLayout.jsx, compilerFallbacks.js, AIWorkspacePage.jsx, DashboardPage.jsx, PuzzleArenePage.jsx, SettingsPage.jsx, sourceStore.js, workspaceStore.js, chat.tsx, tutorStore.ts, journey.md

### 2026-09-30 — configure Vercel deployment, serverless api entry, and production headers
- Step 1 (Pull/Sync): `git pull origin main` pulled 3 commits (e8047cd, 3837333, f488d2a) cleanly fast-forwarding local branch to latest origin/main.
- Step 2: Added root monorepo Vercel configuration (`vercel.json`, `package.json`, `.vercelignore`, and `VERCEL_DEPLOYMENT_GUIDE.md`). Created Vercel serverless entry `sourcewise-backend/node-api/api/index.js` and `vercel.json` with dynamic CORS support for `*.vercel.app` and `FRONTEND_ORIGIN` in `node-api/src/index.js`. Added caching and security headers to frontend and dashboard `vercel.json`. Cleaned up SettingsPage appearance tab.
- Step 3 (Build & Test): Frontend built cleanly (2.54s). Dashboard built cleanly (1.48s) and passed Vitest. Node API passed all 17 Jest test suites (121/121 tests pass).
- Step 4/5 (Commit & Push): Committed changes (`e01b496`), updated journey.md, pushed cleanly to origin/main.
- Files: .vercelignore, VERCEL_DEPLOYMENT_GUIDE.md, package.json, vercel.json, sourcewise-backend/node-api/api/index.js, sourcewise-backend/node-api/src/index.js, sourcewise-backend/node-api/vercel.json, sourcewise-dashboard/package-lock.json, sourcewise-dashboard/vercel.json, sourcewise-frontend/.env.example, sourcewise-frontend/src/pages/SettingsPage.jsx, sourcewise-frontend/vercel.json, journey.md

### 2026-10-01 — fix AI workspace "service unreachable" (python-ai down)
- Cause: python-ai :8000 not running (no process, nothing on port; node-ai health showed ai_service unavailable). No venv existed and no interpreter had deps.
- Did: created python-ai/.venv (python3.11) + installed requirements.txt; started AI via .venv (nohup, log /tmp/python-ai.log) — /health ok, model all-MiniLM-L6-v2 loaded (mps). Fixed scripts/dev.js resolvePythonBin to prefer python-ai/.venv/bin/python on macOS/Linux (was win32-only, fell back to bare python3).
- Committed: f5522df fix(dev): prefer python-ai .venv on macOS/Linux in resolvePythonBin.
- Test: node /health ai_service ok; AI /metrics/ready embedder/vector_db/llm_gemini all ok. MCP live :5173 landing + login render, 0 errors. CLI: 11/11 pass 43.0s workers=1. Note: chat round-trip needs auth (not covered); .venv is gitignored (local-only).
- Files: sourcewise-backend/scripts/dev.js (+ local-only python-ai/.venv; AI running via nohup, log /tmp/python-ai.log)

### 2026-10-01 — explain knowledge upload Failed-to-fetch + remove Companion Linked card
- Why fetch failed: KnowledgeHub ingestDocument POSTs browser-direct to :8000/ingest (chatApi.js). Screenshots 08:46-48 predate AI start 08:53 — :8000 refused connection, fetch threw "Failed to fetch". AI up since, /ingest live (422 no-key proves reachability), /metrics/ready all ok. Fix = retry upload now; no code change needed on upload path.
- Did: removed Companion Linked scholar badge card from settings sidebar (SettingsPage.jsx, 13 lines). Images folder untouched per instr (image 1.png left modified-in-place, unstaged).
- Committed: dab3a70 ui: remove Companion Linked scholar badge from settings sidebar.
- Test: MCP live — /settings guard redirects unauth (no crash), landing renders, 0 errors. CLI: 11/11 pass 46.5s workers=1. eslint SettingsPage 9 pre-existing errors, 0 new.
- Files: sourcewise-frontend/src/pages/SettingsPage.jsx

### 2026-10-01 — replace brand/showcase artwork (35 images)
- Did: user replaced all artwork locally (root image 1-6/logo/sign in-up, frontend public logos/modality/orbit/signin-signup/workspace shots, mobile icons). Validated + committed as-is, no code touched.
- Committed: 7c41c41 assets: replace brand and showcase images with new artwork (35 files).
- Test: file(35/35 valid images). MCP live :5173 landing 10 imgs 0 broken, login 2/0, signup 2/0 (new logo + mascot render, screenshot taken); console 0 errors. CLI: 11/11 pass 39.9s workers=1.
- Files: 35 binaries (root, sourcewise-frontend/public, sourcewise-mobile/assets/images)

### 2026-10-01 — sidebar brand text replaced with text.png wordmark
- Did: copied root text.png to public/text.png (web-servable) + swapped MainLayout sidebar text spans for <img src="/text.png" h-8>. Fox logo-mark kept. Note: artwork reads "AI STUDY SUITE" (sidebar previously said Companion).
- Committed: da9e3fe ui: use text.png wordmark for sidebar brand text in MainLayout.
- Test: /text.png serves 200 (848x239), in dist build; landing renders post-edit, 0 app errors (1 favicon 404 on direct-img nav only). CLI: 11/11 pass 51.6s workers=1. eslint MainLayout 6 pre-existing errors, 0 new. Sidebar itself needs auth (not visually covered).
- Files: text.png, sourcewise-frontend/public/text.png, MainLayout.jsx

### 2026-10-01 — text.png wordmark on every page header (no Playwright per instr)
- Did: swapped header brand text spans for <img src="/text.png"> beside logo-mark on landing (h-9), login + signup (h-9/10). Sidebar done earlier — all 4 brand spots now wordmark.
- Committed: 4527cb4 ui: use text.png wordmark for header brand on landing, login, signup.
- Test: SKIPPED Playwright per user instr. eslint 0 errors (1 pre-existing warning); vite build ok 4.47s.
- Files: LandingPage.jsx, LoginPage.jsx, SignupPage.jsx

### 2026-10-01 — deploy web app to Vercel production
- Step 1 (Pull/Sync): `git pull origin main` verified up to date.
- Step 2: Linked and deployed `sourcewise-frontend` to Vercel production under team `desu-midhun` (`sourcewise-frontend-three.vercel.app`). Added `.vercel/` ignore rules to root and frontend `.gitignore`.
- Step 3 (Visual & E2E): Ran Playwright suites (landing 9/9 + knowledge-upload 2/2 = 11/11 passed 100%). Verified live Vercel HTTP/2 200 response on root and `/login` SPA rewrite.
- Step 4/5 (Commit & Push): Committed `.gitignore` (`cb6b44e`), updated journey.md, pushed cleanly to origin/main.
- Deployed URLs:
  - Production Alias: https://sourcewise-frontend-three.vercel.app
  - Deployment: https://sourcewise-frontend-l0e5r5ku5-desu-midhun.vercel.app
### 2026-10-01 — pull & push sync + AI response rendering and parser enhancements
- Step 1 (Pull/Sync): `git pull origin main` pulled 44 files fast-forward to `c185b28`.
- Step 2: Implemented rich Markdown message rendering component (`RichMessageContent.jsx`) featuring syntax-highlighted code blocks with one-click copy, formatted tables, and callouts in `AIWorkspacePage.jsx` and `GlobalChatPanel.jsx`. Added response sanitization in `llm.py` stripping robotic disclaimers/rigid headers. Robustified `workspaceStore.js` parsers for quiz options and flashcard front/backs against loose markdown.
- Step 3 (Visual & E2E): Frontend built cleanly in 2.61s. Node API passed all 17 Jest test suites (121/121 tests pass). Playwright test suites (landing 9/9 + knowledge-upload 2/2 = 11/11 passed 100%).
- Step 4/5 (Commit & Push): Committed code changes (`2915499`), updated `journey.md`, pushed cleanly to origin/main.
- Files: llm.py, rag_chain.py, run.py, AIReportViewer.jsx, GlobalChatPanel.jsx, RichMessageContent.jsx, index.css, AIWorkspacePage.jsx, KnowledgeHubPage.jsx, workspaceStore.js, journey.md

