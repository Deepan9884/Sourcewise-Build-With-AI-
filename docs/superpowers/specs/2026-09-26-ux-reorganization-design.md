# UX Reorganization Design — Plan Heart, Knowledge Hub, Insights

- **Date:** 2026-09-26
- **Status:** Approved (all 5 sections reviewed section-by-section)
- **Scope:** Single spec covering 3 subsystems — My Plan heart, Knowledge Hub merge, Insights/Creator analytics
- **Approach:** A (new AppShell, reuse existing widgets, incremental flagged migration)
- **Visual direction:** Blend — clean minimal surfaces + playful accents (fox, ink, mood glow)
- **Related:** `AGENTS.md` v13 (ground truth for current routes, APIs, tables)

## Decisions log

| # | Decision | Choice |
|---|----------|--------|
| 1 | Spec scope | All three subsystems, one document |
| 2 | Roadmap visual metaphor | Blend: clean layout + playful accents |
| 3 | Mood engine depth | Fully adaptive (auto-adjust + notify), with guardrails (§4) |
| 4 | Daily tasks source | Hybrid: plan slots auto-become tasks + bonus XP missions |
| 5 | Source click pattern | Slide-over panel (bottom sheet on mobile) |
| 6 | Build approach | A: new shell, remount existing widgets, migrate behind flag |

## 1. AppShell & navigation (APPROVED)

Persistent shell replaces per-page layouts:

- **Left rail** (240px, collapses to 64px): Plan, Knowledge, Insights. Footer: fox mini, streak flame, mood pulse ring (color = dominant mood, diameter = energy level).
- **Top bar:** plan switcher, universal search (sources + topics), avatar.
- **Right drawer (contextual):** Today's Focus (Plan), AI actions (Knowledge), filters (Insights).
- **Global chat:** floating button → persistent RAG side panel surviving route changes; context set by origin (subject + topic, or active sources).
- **Mobile:** bottom tabs (Plan/Knowledge/Insights); all drawers become bottom sheets.
- **Redirects:** `/dashboard`→`/plan`, `/planner`→`/plan`, `/planner-v2`→`/plan/:id`, `/workspace`→`/knowledge`, `/sources`→`/knowledge`.
- **Rule:** playfulness accents clean surfaces, never structures them.

## 2. My Plan heart (APPROVED)

- **Plan header:** name, subject count, daily budget, exam window; Replan/Share/Duplicate/Archive.
- **Pacing bar:** completed-vs-expected slots to date, milestone flags, deviation badge (`+0.3d` green / `-1.2d` red + trend arrow). Backed by new `GET /study-plans/:id/pacing`.
- **Subject cards:** sigil, mastery ring, exam countdown, slot count, AI button → subject modal with 8 quick actions (quiz, flashcards, explain, tutor, notes, summary, practice, roadmap) + phased RoadmapTimeline (AI `generate_multi`) with per-topic mastery bars deep-linking into actions.
- **Weekly spread:** existing drag-drop + ink trails, plus mood-tinted borders and calendar-conflict striping.
- **Fully-adaptive mood guardrails:** max ±30% load shift per adjustment; exam-week freeze (no auto-shrink within 3 days of any exam); quiet hours respected (quiet hours = outside the plan's `preferred_start_time`–`preferred_end_time`); max 1 auto-adjust/day; Manual-mode toggle in the plan header pauses adaptation; every auto-change emits SSE with one-tap Undo (replan history). New `POST /study-plans/:id/adaptive` returns an undo token.
- **Hybrid daily tasks:** today's slots auto-list as tasks; bonus missions (upload, quiz, recall) stack XP. Study day = ≥1 completed slot OR ≥20 focus minutes (streak input).
- **Start on any slot** jumps into global chat with subject + topic context.

## 3. Knowledge Hub merge (APPROVED)

- **Panel grid (default):** minimal cards — type icon, name, size, status badge, chunk count, inline Chat/Quiz (+ Analyze when unanalyzed); hover reveals difficulty, reading time, takeaway preview.
- **Slide-over (click):** analysis block (summary, concept chips, chapters), 8 AI actions pre-scoped to the source, mini knowledge graph with fullscreen expand. Shared portal layer with right drawer (single z-index owner).
- **Multi-select** enables cross-source synthesis + combined quiz generation.
- **Uploads** appear optimistically as Processing cards via existing ingest flow.
- **Migration:** `activeSourceIds` semantics unchanged; AI pipeline untouched; old routes redirect.

## 4. Insights analytics (APPROVED)

- **KPI row:** pace %, subject count, streak + days, mastery %.
- **Trends:** quiz accuracy, study minutes, learning velocity (7/14/30-day ranges).
- **Deviation table:** per-subject planned vs completed, days ahead/behind, replan count (from `/study-plans/:id/replans`).
- **Streak calendar:** contribution-graph intensity from completed slots + focus minutes.
- **Mood↔performance:** best/worst mood, 14-day trend, correlation bars (`/mood/insights`).
- **Weak-topic heatmap** → always-current "study this next" card with one-tap actions.
- New endpoints: pacing (§5) + `GET /study-plans/:id/subjects/:sid/trend` (mastery time-series).

## 5. System, APIs, rollout (APPROVED)

- **Design tokens** (`tailwind.config.js` extension): 8-subject palette (light/dark/muted), display font for roadmap headers, activity icon set.
- **Creator Console:** new Plans, Content, Mood-aggregates pages + `GET /admin/activity` (SSE real-time feed).
- **New backend endpoints (4):**
  1. `GET /study-plans/:id/pacing` → `{ completedSlots, expectedSlots, deviationDays, pacePct, milestones[] }`
  2. `GET /study-plans/:id/subjects/:sid/trend` → `{ points: [{ date, mastery }] }`
  3. `GET /admin/activity` → SSE `{ type, userId, summary, at }`
  4. `POST /study-plans/:id/adaptive` → body `{ moodState }`, returns `{ adjustedSlots, undoToken }`; `POST /study-plans/:id/adaptive/undo` accepts the token.
- **Rollout (flagged, 3 milestones):** M1 shell + Plan home; M2 Knowledge merge; M3 Insights. Each shippable; old routes redirect; no big-bang.
- **Testing:** existing gateway tests stay green; new component tests for PacingBar, RoadmapTimeline, task-hybrid logic; Playwright visual checks for weekly spread + slide-over.

## Component inventory

**New:** AppShell, LeftRail, MoodPulse, TopBar (plan switcher + search), GlobalChatPanel, PacingBar, DeviationBadge, RoadmapTimeline, SubjectAIModal, SourcePanelGrid, SourceSlideOver, TaskHybridList, StreakCalendar, WeakTopicHeatmap, MoodCorrelationPanel.
**Reused (remounted):** WeeklySpread, SubjectCard, MoodCheckinWidget, TodayFocusPanel, ReplanNotification, CalendarSyncBanner, FoxCompanion, KnowledgeGraph, GlowCard, StudyProgressRing, planner primitives (ParchmentTexture, AmbientGlow, WaxSeal, InkSplash).
**Retired (redirected):** PlannerPage legacy, standalone AIWorkspacePage modes, SourcesPage list view.

## Risks & mitigations

- Deep-link breakage → 301 redirect map + flag per milestone.
- Plan-home data latency (3–4 calls) → `Promise.all` + caching layer.
- Drawer/slide-over z-conflicts → single portal root.
- Stale mood on plan load → `fetchMood()` in plan-load effect.
- Mobile drag-drop → tap-to-move modal fallback.
- Adaptive overreach → guardrails in §2 (bounds, freeze, quiet hours, undo, manual toggle).
