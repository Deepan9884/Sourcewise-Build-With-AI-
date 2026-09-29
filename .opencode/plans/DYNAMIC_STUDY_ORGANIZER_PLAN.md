# Dynamic Mood-Aware Multi-Subject Study Organizer — Implementation Plan

**Status:** Planning Phase (Read-Only)  
**Version:** 1.0  
**Date:** 2025-09-24

---

## Executive Summary

Transform the current single-subject, static planner into a **multi-subject, mood-aware, event-responsive intelligent scheduler** that:
- Accepts N subjects + exam dates → generates interleaved optimal schedule
- Adapts in real-time to mood (hybrid manual + passive), calendar conflicts, performance
- Provides best-in-class tutoring dynamically adjusted to cognitive state
- Integrates Google Calendar for external event awareness
- Maintains backward compatibility with existing `/planner` routes

---

## User Decisions (Confirmed)

| Decision | Choice | Notes |
|----------|--------|-------|
| Mood Input | Hybrid (manual + passive inference) | 5 mood buttons + behavioral signals |
| Calendar | Google Calendar API | Need Google Cloud project setup |
| Subjects | Unlimited (N) | Flexible priority-based scheduling |
| Auto Replan | All triggers + calendar conflicts | Missed days, low scores, mood shifts, calendar conflicts, exam changes, streak breaks |
| SSE Endpoint | Yes | `/events` stream for real-time replan notifications |
| Backward Compat | Yes | Keep `/planner` routes, add new `/study-plans` |

---

## Phase 1: Database Schema Extensions (Week 1)

### 1.1 New Tables (Run in Supabase SQL Editor)

```sql
-- Mood & Context Tracking (hybrid: manual + inferred)
CREATE TABLE mood_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  mood text NOT NULL CHECK (mood IN ('energized','focused','neutral','tired','stressed','anxious')),
  energy_level int CHECK (energy_level BETWEEN 1 AND 10),
  focus_level int CHECK (focus_level BETWEEN 1 AND 10),
  stress_level int CHECK (stress_level BETWEEN 1 AND 10),
  source text NOT NULL CHECK (source IN ('manual','inferred','hybrid')),
  inferred_signals jsonb DEFAULT '{}',
  context_tags text[],
  notes text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_mood_checkins_user_time ON mood_checkins(user_id, created_at DESC);

-- External Calendar Events (Google Calendar sync)
CREATE TABLE calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  google_event_id text UNIQUE,
  title text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  is_all_day boolean DEFAULT false,
  event_type text CHECK (event_type IN ('exam','class','work','personal','appointment','blocker')),
  source_calendar_id text,
  recurrence_rule text,
  metadata jsonb DEFAULT '{}',
  last_synced timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_calendar_events_user_timerange ON calendar_events(user_id, start_time, end_time);
CREATE INDEX idx_calendar_events_google_id ON calendar_events(google_event_id);

-- Multi-Subject Study Plans (replaces single-subject planners)
CREATE TABLE study_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  exam_period_start date,
  exam_period_end date,
  daily_study_budget_minutes int DEFAULT 120,
  preferred_start_time time,
  preferred_end_time time,
  break_preferences jsonb DEFAULT '{}',
  status text DEFAULT 'active' CHECK (status IN ('active','completed','archived','paused')),
  plan_data jsonb NOT NULL,
  generation_context jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_study_plans_user_status ON study_plans(user_id, status);

-- Subject Definitions (N subjects per plan)
CREATE TABLE plan_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES study_plans(id) ON DELETE CASCADE,
  subject_name text NOT NULL,
  exam_date date,
  exam_weight float DEFAULT 1.0,
  current_mastery float DEFAULT 0,
  target_mastery float DEFAULT 80,
  source_ids uuid[],
  difficulty_estimate text CHECK (difficulty_estimate IN ('easy','medium','hard','unknown')),
  priority_score float,
  color text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_plan_subjects_plan ON plan_subjects(plan_id);

-- Daily Schedule Slots (granular timetable)
CREATE TABLE schedule_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES study_plans(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES plan_subjects(id) ON DELETE CASCADE,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  duration_minutes int NOT NULL,
  slot_type text NOT NULL CHECK (slot_type IN ('study','review','quiz','break','buffer','tutoring')),
  topic text,
  activity_type text CHECK (activity_type IN ('read','practice','flashcards','explain','quiz','summarize')),
  status text DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','skipped','rescheduled')),
  completion_data jsonb,
  mood_context jsonb,
  is_fixed boolean DEFAULT false,
  generated_by text CHECK (generated_by IN ('ai_initial','ai_replan','user_manual')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_schedule_slots_plan_date ON schedule_slots(plan_id, date);
CREATE INDEX idx_schedule_slots_subject_date ON schedule_slots(subject_id, date);

-- Replan History & Triggers
CREATE TABLE replan_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES study_plans(id) ON DELETE CASCADE,
  trigger_type text NOT NULL CHECK (trigger_type IN ('missed_day','low_score','mood_shift','calendar_conflict','exam_date_change','streak_break','manual')),
  trigger_data jsonb,
  slots_affected int,
  slots_rescheduled int,
  old_plan_snapshot jsonb,
  new_plan_snapshot jsonb,
  user_approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_replan_events_plan ON replan_events(plan_id, created_at DESC);

-- Google OAuth Tokens (encrypted storage)
CREATE TABLE user_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  access_token_encrypted text NOT NULL,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  scopes text[],
  calendar_ids text[],
  is_active boolean DEFAULT true,
  last_sync timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Extend existing tables
ALTER TABLE progress_events ADD COLUMN IF NOT EXISTS mood_before text;
ALTER TABLE progress_events ADD COLUMN IF NOT EXISTS mood_after text;
ALTER TABLE progress_events ADD COLUMN IF NOT EXISTS session_context jsonb;
ALTER TABLE tutoring_sessions ADD COLUMN IF NOT EXISTS subject_id uuid REFERENCES plan_subjects(id);
ALTER TABLE tutoring_sessions ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES study_plans(id);

-- Enable RLS on all new tables (deny direct access, server uses service role)
ALTER TABLE mood_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE replan_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;
```

### 1.2 Migration Notes
- Run AFTER existing `v2_schema.sql`, `v5_lirs_schema.sql`, `token_tracking_schema.sql`
- No permissive RLS policies — all access via API server with service role
- Existing `planners` table preserved for backward compatibility

---

## Phase 2: Backend Services (Week 2-3)

### 2.1 Mood Service (`src/services/moodService.js`)

```javascript
// Core API:
- recordCheckin(userId, {mood, energy, focus, stress, source, contextTags, notes})
- getRecentMoods(userId, hours=24) → mood trend analysis
- inferMoodFromBehavior(userId, sessionData) → passive inference
- getCurrentMoodState(userId) → {dominantMood, trend, confidence, recommendedAdjustments}
- correlateMoodWithPerformance(userId, period) → insights for replanning
```

**Passive Inference Signals (weighted):**
| Signal | Weight | Maps To |
|--------|--------|---------|
| Quiz score < 50% | 0.30 | stressed/anxious |
| Session duration < 50% planned | 0.20 | tired/distracted |
| Pause frequency > 3/hr | 0.15 | low focus |
| Streak broken | 0.15 | discouraged |
| Late night sessions | 0.10 | tired |
| Consistent high scores | 0.20 | energized/focused |

### 2.2 Calendar Integration Service (`src/services/calendarService.js`)

```javascript
// Google Calendar API integration:
- connectGoogleCalendar(userId, authCode) → store encrypted tokens (AES-GCM using existing ENCRYPTION_KEY)
- syncCalendarEvents(userId, timeMin, timeMax) → fetch & upsert calendar_events
- getConflicts(userId, dateRange, proposedSlots) → conflicting events
- getAvailableWindows(userId, date, preferences) → free time blocks
- classifyEventType(title, description) → exam/class/work/personal/blocker
- webhookHandler(notification) → incremental sync on changes
- scheduleRecurringSync(userId) → pg_cron job every 15 min
```

**OAuth Flow:** Frontend → `GET /calendar/auth` → Google consent → `GET /calendar/callback` → store tokens → background sync

### 2.3 Multi-Subject Planner Engine (`src/services/multiSubjectPlanner.js`)

```javascript
class MultiSubjectPlanner {
  // Input: { subjects[], dailyBudget, preferences, calendarEvents, moodProfile }
  // Output: schedule_slots[] for entire exam period
  
  async generatePlan(input) {
    // 1. Calculate priority scores per subject
    //    priority = f(daysUntilExam, masteryGap, examWeight, difficulty)
    
    // 2. Get available time windows (exclude calendar events, sleep, fixed commitments)
    
    // 3. Allocate time proportionally to priority scores
    //    - Minimum 30min per active subject per day
    //    - Interleave subjects (spacing effect)
    //    - Hard topics → morning/high-energy slots
    //    - Review slots → spaced repetition intervals
    
    // 4. Apply mood-aware adjustments
    //    - stressed/anxious: reduce load, add breaks, simpler tasks
    //    - energized/focused: increase load, harder topics
    //    - tired: passive review, flashcards, audio
    
    // 5. Build daily schedule with 10% buffers
    // 6. Validate feasibility (no overlaps, respects max daily hours)
    // 7. Return structured plan_data JSON
  }
  
  async replan(planId, trigger) {
    // Incremental replanning: only reschedule affected future slots
    // Preserve completed work, redistribute pending
    // Log to replan_events with full snapshots for diff/rollback
  }
}
```

### 2.4 Dynamic Replanning Service (`src/services/replanningService.js`)

```javascript
// Automatic replanning triggers (evaluated hourly via pg_cron)
const REPLAN_TRIGGERS = {
  missed_day: { threshold: 1, cooldownHours: 4 },
  low_quiz_score: { threshold: 50, consecutive: 2, cooldownHours: 12 },
  mood_shift: { 
    from: ['energized','focused'], 
    to: ['stressed','anxious','tired'], 
    consecutiveDays: 2, 
    cooldownHours: 24 
  },
  calendar_conflict: { lookaheadDays: 3, cooldownHours: 1 },
  exam_date_change: { cooldownHours: 0 }, // immediate
  streak_break: { threshold: 1, cooldownHours: 24 },
  mastery_declining: { windowDays: 7, minDrop: 10, cooldownHours: 24 }
};

// pg_cron job (every hour):
// SELECT cron.schedule('evaluate-replan-triggers', '0 * * * *', 
//   'SELECT evaluate_replan_triggers()'); -- SQL function calling RPC
```

**Recommendation:** Use **Supabase pg_cron** for reliability (runs in DB, survives API restarts). Fallback: Node cron in separate worker process if pg_cron unavailable.

### 2.5 Files to Create/Modify

| File | Type | Description |
|------|------|-------------|
| `src/services/moodService.js` | New | Mood tracking + inference |
| `src/services/calendarService.js` | New | Google Calendar integration |
| `src/services/multiSubjectPlanner.js` | New | Core scheduling algorithm |
| `src/services/replanningService.js` | New | Auto-replan evaluation + execution |
| `src/utils/encryption.js` | New | AES-GCM helpers for token storage |
| `src/middleware/validatePlanAccess.js` | New | Ensure user owns plan/subject/slot |

---

## Phase 3: API Routes (Week 3)

### 3.1 New Route Files

| File | Endpoints | Purpose |
|------|-----------|---------|
| `mood.routes.js` | `POST /mood/checkin`, `GET /mood/history`, `GET /mood/current`, `GET /mood/insights` | Mood tracking |
| `calendar.routes.js` | `GET /calendar/auth`, `GET /calendar/callback`, `POST /calendar/sync`, `GET /calendar/events`, `GET /calendar/conflicts` | Google Calendar |
| `study-plans.routes.js` | `POST /study-plans`, `GET /study-plans`, `GET /study-plans/:id`, `PATCH /study-plans/:id`, `DELETE /study-plans/:id`, `POST /study-plans/:id/generate`, `POST /study-plans/:id/replan`, `GET /study-plans/:id/schedule`, `GET /study-plans/:id/today` | Multi-subject plans |
| `schedule-slots.routes.js` | `PATCH /schedule/:id`, `POST /schedule/:id/complete`, `POST /schedule/:id/reschedule`, `GET /schedule/day/:date` | Granular slot management |
| `events.routes.js` | `GET /events` (SSE) | Real-time replan notifications |

### 3.2 Mount in `index.js`

```javascript
// Add after existing routes (around line 116)
app.use('/mood', dataLimiter, moodRoutes);
app.use('/calendar', dataLimiter, calendarRoutes);
app.use('/study-plans', dataLimiter, studyPlanRoutes);
app.use('/schedule', dataLimiter, scheduleSlotRoutes);
app.use('/events', authenticate, eventRoutes); // SSE stream
```

### 3.3 SSE Events Stream (`events.routes.js`)

```javascript
router.get('/', authenticate, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  
  const userId = req.user.userId;
  const channel = `replan:${userId}`;
  
  // Subscribe to pg_notify or Redis pub/sub
  // On replan event: res.write(`data: ${JSON.stringify(event)}\n\n`);
  
  req.on('close', () => { /* unsubscribe */ });
});
```

---

## Phase 4: Python AI Enhancements (Week 3-4)

### 4.1 Enhanced Study Planner Agent (`app/agents/study_planner.py`)

**Changes:**
- Accept multi-subject input: `subjects: [{name, exam_date, weight, mastery, source_ids}]`
- Generate interleaved `schedule_slots[]` output (not just daily topics)
- Mood-aware prompt variants per mood state
- Include spacing effect, difficulty ordering, buffer time

### 4.2 New Agent: Mood-Aware Tutor (`app/agents/mood_aware_tutor.py`)

```python
class MoodAwareTutorAgent(BaseAgent):
    MOOD_STRATEGIES = {
        'energized': {'style': 'challenging', 'depth': 'deep', 'pace': 'fast', 
                      'activities': ['socratic', 'problem_solving', 'connections']},
        'focused': {'style': 'structured', 'depth': 'moderate_deep', 'pace': 'steady',
                    'activities': ['guided_practice', 'elaboration', 'summarization']},
        'neutral': {'style': 'balanced', 'depth': 'moderate', 'pace': 'moderate',
                    'activities': ['explanation', 'examples', 'quiz']},
        'tired': {'style': 'gentle', 'depth': 'surface', 'pace': 'slow',
                  'activities': ['flashcards', 'recognition', 'audio_summary']},
        'stressed': {'style': 'supportive', 'depth': 'targeted', 'pace': 'slow',
                     'activities': ['breakdown', 'one_thing_at_time', 'breathing']},
        'anxious': {'style': 'reassuring', 'depth': 'structured', 'pace': 'very_slow',
                    'activities': ['roadmap', 'chunking', 'confidence_building']}
    }
    
    async def execute(self, context, **kwargs):
        mood = await self._get_current_mood(context.user_id)
        strategy = self.MOOD_STRATEGIES.get(mood, self.MOOD_STRATEGIES['neutral'])
        # Inject strategy into system prompt, adapt response format
```

### 4.3 New Router: `/mood-tutor` (`app/routers/mood_tutor.py`)

```python
@router.post("/explain")
async def mood_aware_explain(req: MoodTutorRequest):
    # Fetch current mood from node-api or context
    # Adapt prompt using MOOD_STRATEGIES
    # Stream response with citations + mood-adapted next actions
```

### 4.4 Register in `main.py`

```python
from app.agents.mood_aware_tutor import mood_aware_tutor_agent
from app.routers import mood_tutor

registry.register(mood_aware_tutor_agent, intents=["tutor", "explain", "study"])
app.include_router(mood_tutor.router, prefix="/mood-tutor", tags=["Mood-Aware Tutor"], dependencies=[Depends(verify_internal_key)])
```

---

## Phase 5: Frontend — Planner Redesign (Week 4-5)

### 5.1 New Planner Page: `PlannerPageV2.jsx`

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Plan Name | Exam Countdown | Mood Check-in (5 buttons)    │
├──────────────────────┬──────────────────────────────────────┤
│  SUBJECTS (Left)     │  WEEKLY CALENDAR (Right)             │
│  ┌────────────────┐  │  Mon  Tue  Wed  Thu  Fri  Sat  Sun   │
│  │ 📚 Biology     │  │  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ │
│  │   Exam: 5 days │  │  │B │ │C │ │M │ │B │ │P │ │R │ │R │ │
│  │   ████░░ 60%   │  │  └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ │
│  ├────────────────┤  │  Color-coded by subject              │
│  │ 📚 Chemistry   │  │  Drag-drop to reschedule             │
│  │   Exam: 12 days│  │  Conflict indicators (⚠️)            │
│  │   ██████░ 85%  │  │                                     │
│  ├────────────────┤  │  TODAY'S FOCUS (Bottom)              │
│  │ 📚 Math        │  │  ┌────────────────────────────────┐  │
│  │   Exam: 3 days │  │  │ 🎯 Next: Biology - Cell Div    │  │
│  │   ██░░░░ 40%   │  │  │ ⏰ 09:00-10:30 | 😊 Energized  │  │
│  └────────────────┘  │  │  ████████░░ 65% complete       │  │
│  [+ Add Subject]     │  │  [Start Session] [Reschedule]  │  │
│                      │  └────────────────────────────────┘  │
│  Mood: 😊 😐 😞 😰 🎯  │                                     │
└──────────────────────┴──────────────────────────────────────┘
```

### 5.2 Key Components

| Component | File | Purpose |
|-----------|------|---------|
| `MoodCheckinWidget` | `components/planner/MoodCheckinWidget.jsx` | 5-button mood selector + optional note |
| `SubjectCard` | `components/planner/SubjectCard.jsx` | Progress ring, exam countdown, priority badge |
| `WeeklyCalendarView` | `components/planner/WeeklyCalendarView.jsx` | Drag-drop schedule, color-coded, conflicts |
| `TodayFocusPanel` | `components/planner/TodayFocusPanel.jsx` | Current slot, mood-adapted recs, start session |
| `ReplanNotification` | `components/planner/ReplanNotification.jsx` | Toast with "Review Changes" action |
| `CalendarSyncBanner` | `components/planner/CalendarSyncBanner.jsx` | Google Calendar connection status |

### 5.3 State Management (Zustand — `store/plannerStore.js`)

```javascript
{
  currentPlan: null,
  subjects: [],
  schedule: [],           // schedule_slots for current week
  todaySlots: [],
  moodState: null,
  calendarEvents: [],
  conflicts: [],
  isGenerating: false,
  isReplanning: false,
  
  // Actions
  fetchPlan, generatePlan, replan, 
  updateSlot, completeSlot, rescheduleSlot,
  checkinMood, fetchMoodInsights,
  connectCalendar, syncCalendar,
  subscribeToReplanEvents  // SSE connection
}
```

### 5.4 Routing

```javascript
// AppRouter.jsx - Add new routes (keep old /planner for backward compat)
{
  path: '/planner-v2',
  element: <SuspenseWrapper><PlannerPageV2 /></SuspenseWrapper>,
},
{
  path: '/study-plans/:id',
  element: <SuspenseWrapper><StudyPlanDetailPage /></SuspenseWrapper>,
}
```

---

## Phase 6: Mobile App (Week 5-6)

### 6.1 New Screens

| Screen | File | Purpose |
|--------|------|---------|
| `PlannerHomeScreen` | `app/(tabs)/planner.tsx` (replace) | Subject overview + today's schedule |
| `WeeklyCalendarScreen` | `app/planner/week.tsx` | Horizontal week scroll, tap for details |
| `MoodCheckinModal` | `components/MoodCheckinModal.tsx` | Bottom sheet with 5 mood buttons |
| `SlotDetailScreen` | `app/planner/slot/[id].tsx` | Topic, activity, timer, mood before/after |
| `CalendarConnectScreen` | `app/settings/calendar.tsx` | OAuth flow for Google Calendar |

### 6.2 Background Sync

- `expo-background-fetch` for calendar sync every 15 min
- Push notifications via Expo: upcoming slots, replan events, mood check-in reminders

---

## Phase 7: Intelligence & Polish (Week 6-7)

### 7.1 Predictive Features
- **Optimal Study Time Prediction**: Analyze historical performance by time-of-day → suggest best slots
- **Burnout Risk Score**: Combine mood trend + workload + streak → proactive break suggestions
- **Exam Readiness Index**: Per-subject mastery trajectory → probability of target score

### 7.2 Tutoring Integration
- Pre-session: Fetch mood, adapt tutor personality via `MoodAwareTutorAgent`
- In-session: Track mood shifts via interaction patterns (pause freq, response length)
- Post-session: Record `mood_after`, correlate with learning gain

### 7.3 Analytics Dashboard (Admin + User)
- Mood ↔ Performance correlation charts (Recharts)
- Schedule adherence heatmap (calendar view)
- Replan frequency & triggers breakdown
- Subject balance visualization

---

## API Contract Summary

### Mood
```
POST   /mood/checkin           {mood, energy, focus, stress, source, contextTags, notes}
GET    /mood/current           → {dominantMood, trend, confidence, recommendations}
GET    /mood/history           → mood_checkins[]
GET    /mood/insights          → {moodPerformanceCorrelation, optimalHours, burnoutRisk}
```

### Calendar
```
GET    /calendar/auth          → {authUrl}
GET    /calendar/callback      (handles OAuth redirect)
POST   /calendar/sync          → {synced: n, conflicts: m}
GET    /calendar/events        → calendar_events[]
GET    /calendar/conflicts     {date, proposedSlots} → conflicts[]
```

### Study Plans
```
POST   /study-plans            {name, examPeriod, dailyBudget, preferences, subjects[]}
GET    /study-plans            → study_plans[]
GET    /study-plans/:id        → full plan with subjects + schedule
POST   /study-plans/:id/generate  → triggers AI generation
POST   /study-plans/:id/replan    {trigger, triggerData} → manual replan
GET    /study-plans/:id/today   → today's slots with mood context
GET    /study-plans/:id/schedule?week=2025-01-13 → weekly slots
```

### Schedule Slots
```
PATCH  /schedule/:id           {status, completionData, moodBefore, moodAfter}
POST   /schedule/:id/complete  {actualDuration, score, notes}
POST   /schedule/:id/reschedule {newDate, newStartTime, reason}
```

### Events (SSE)
```
GET    /events                 → Stream: {type: 'replan', data: {...}}, {type: 'conflict', data: {...}}
```

---

## Implementation Priority Order

| Priority | Component | Dependencies | Est. Days |
|----------|-----------|--------------|-----------|
| **P0** | Database schema (7 new tables + extensions) | — | 2 |
| **P0** | Mood Service + Routes | Schema | 2 |
| **P0** | Calendar Service + Google OAuth + Routes | Schema, Google Cloud | 3 |
| **P1** | Multi-Subject Planner Engine | Schema, Mood, Calendar | 3 |
| **P1** | Replanning Service (pg_cron + triggers) | Planner Engine | 2 |
| **P1** | Study Plans Routes + Schedule Slots Routes | Planner Engine | 2 |
| **P1** | Enhanced Study Planner Agent (Python) | Planner Engine | 2 |
| **P2** | Mood-Aware Tutor Agent + Router | Mood Service | 2 |
| **P2** | Frontend PlannerPageV2 (calendar, mood, subjects) | All APIs | 5 |
| **P2** | SSE `/events` endpoint + frontend subscription | Replanning Service | 1 |
| **P3** | Mobile Planner Screens | Frontend patterns | 4 |
| **P3** | Predictive analytics (optimal time, burnout) | Historical data | 3 |
| **P3** | Advanced tutoring integration | Mood-Aware Tutor | 2 |

**Total Estimated:** ~33 working days (~6-7 weeks)

---

## Technical Decisions (Confirmed/Recommended)

| Decision | Recommendation | Rationale |
|----------|----------------|-----------|
| Cron Infrastructure | **Supabase pg_cron** (primary) + Node worker fallback | Runs in DB, survives restarts, no extra infra |
| Token Encryption | AES-GCM using existing `ENCRYPTION_KEY` | Already in env, standard |
| Timezone Handling | Store UTC, convert in frontend via `Intl.DateTimeFormat` | IANA tz support, no DST bugs |
| Real-time Updates | SSE (`/events`) | Simpler than WebSocket, works with Express |
| Plan Versioning | Full snapshots in `replan_events` | Enables diff UI, rollback, audit |
| Google Calendar | OAuth 2.0 + webhook notifications | Incremental sync, near real-time |
| Backward Compat | Keep `/planner` routes, add `/study-plans` | Zero breaking changes for existing users |

---

## Google Cloud Setup Required (User Action)

Since you don't have a project yet:

1. **Create Google Cloud Project**
   - Console → New Project → "SourceWise Calendar"
   - Enable **Google Calendar API**

2. **OAuth Consent Screen**
   - External user type
   - Scopes: `https://www.googleapis.com/auth/calendar.events.readonly`
   - Add test users (your email)

3. **Credentials**
   - Create OAuth 2.0 Client ID (Web application)
   - Authorized redirect URI: `http://localhost:4000/calendar/callback` (dev) / `https://api.sourcewise.com/calendar/callback` (prod)
   - Save Client ID + Secret → add to `.env`:
     ```
     GOOGLE_CLIENT_ID=xxx
     GOOGLE_CLIENT_SECRET=xxx
     GOOGLE_REDIRECT_URI=http://localhost:4000/calendar/callback
     ```

4. **Optional: Push Notifications**
   - Create service account for webhook endpoint
   - Enable Calendar API push notifications

---

## Open Questions for Implementation Start

1. **pg_cron Availability**: Confirm Supabase project supports pg_cron (Pro plan or self-hosted). If not, we'll use Node worker process.
2. **Encryption Key Format**: Confirm `ENCRYPTION_KEY` is 32-byte base64 (256-bit). If not, generate: `openssl rand -base64 32`
3. **Frontend State Sync**: Should `PlannerPageV2` replace `PlannerPage` entirely, or coexist behind feature flag?
4. **Mobile OAuth**: Expo `expo-auth-session` for Google OAuth — need iOS/Android bundle IDs for production.
5. **Test Data**: Need seed script for multi-subject plans with mood history for development?

---

## Next Steps

When ready to proceed:
1. **Phase 1**: Run schema SQL in Supabase → verify tables + RLS
2. **Phase 2**: Implement Mood Service + Calendar Service (parallel)
3. **Phase 3**: Add routes, mount in Express, test APIs
4. **Phase 4**: Enhance Python agents, deploy AI service
5. **Phase 5**: Build PlannerPageV2 components incrementally
6. **Phase 6**: Mobile screens
7. **Phase 7**: Polish, analytics, predictive features

---

**Ready to begin Phase 1 (Schema) when you confirm.** The plan is complete and accounts for all your decisions.