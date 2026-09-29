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
