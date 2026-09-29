# Journey — Source-wise-Build-Fast-with-AI--AI-Build-Challenge-2026

Owner: desumidhun2006
Origin: https://github.com/desumidhun2006/Source-wise-Build-Fast-with-AI--AI-Build-Challenge-2026.git
Old-origin: https://github.com/Deepan9884/Source-wise (kept as old-origin)
Branch: main (tracks origin/main)
Date: 2026-09-29

## Rules
- Update this file after each task.
- Commit after each task, meaningful msg, report msg to user.
- Push only on user ask.
- Re-read journey.md often — another AI edits simultaneously. Merge, don't overwrite.
- Style: ultra-token-efficient, telegram-style, diffs only.

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
