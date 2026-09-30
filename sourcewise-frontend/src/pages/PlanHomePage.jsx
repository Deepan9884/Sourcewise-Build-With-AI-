import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Flame, Target, BookOpen, Zap, CalendarDays } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { usePlannerStore } from '../store/plannerStore'
import PlannerPageV2 from './PlannerPageV2'
import InsightsPage from './InsightsPage'
import PacingBar from '../components/plan/PacingBar'
import TaskHybridList from '../components/plan/TaskHybridList'
import StudyCalendar from '../components/plan/StudyCalendar'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const ADAPT_KEY = () => `sw_adapt_${new Date().toDateString()}`
const PAUSE_KEY = 'sw_adaptive_paused'

/**
 * PlanHomePage — the unified study command center (/plan).
 * Combines Plan, Today's Schedule & Insights seamlessly into one page.
 * Fully-adaptive mood: significant negative shifts auto-adjust the plan
 * (bounded server-side), at most once per day, pausable, always undoable.
 */
export default function PlanHomePage() {
  const navigate = useNavigate()
  const { planId } = useParams()
  const { accessToken } = useAuthStore()
  const store = usePlannerStore()
  const { currentPlan, todaySlots, moodState, pacing, notification, isAdapting } = store

  // Deep link: /plan/:planId loads that plan into the workspace.
  useEffect(() => {
    if (planId && planId !== currentPlan?.id) store.loadPlan(planId).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId])

  const [overview, setOverview] = useState(null)
  const [paused, setPaused] = useState(() => { try { return localStorage.getItem(PAUSE_KEY) === '1' } catch { return false } })

  useEffect(() => {
    if (!accessToken) return
    fetch(`${API_URL}/dashboard/overview`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then(setOverview)
      .catch(() => {})
  }, [accessToken])

  useEffect(() => {
    store.fetchPacing().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlan?.id])

  // Fully-adaptive: auto-adjust once per day on significant negative shifts.
  useEffect(() => {
    if (paused || !currentPlan?.id || !moodState?.dominantMood) return
    const bad = ['tired', 'stressed', 'anxious']
    if (!bad.includes(moodState.dominantMood)) return
    try {
      if (localStorage.getItem(ADAPT_KEY())) return // already adapted today
    } catch { return }
    store.adaptToMood().then((r) => {
      try { if (r && r.adjustedSlots > 0) localStorage.setItem(ADAPT_KEY(), '1') } catch { /* ignore */ }
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moodState?.dominantMood, currentPlan?.id, paused])

  const togglePaused = () => {
    setPaused((p) => {
      try { localStorage.setItem(PAUSE_KEY, p ? '0' : '1') } catch { /* ignore */ }
      return !p
    })
  }

  const undoAdaptive = () => {
    const token = notification?.undoToken
    if (token) store.undoAdaptation(token).catch(() => {})
    else store.clearNotification()
  }

  const kpis = [
    { icon: Flame, label: 'Day streak', value: overview?.streak ?? '—', tint: 'text-coral-deep bg-coral-soft' },
    { icon: Target, label: 'Pace', value: pacing ? `${pacing.pacePct}%` : '—', tint: 'text-teal bg-teal-soft' },
    { icon: BookOpen, label: 'Mastery', value: overview ? `${overview.masteryPercentage ?? 0}%` : '—', tint: 'text-amberbrand bg-amberbrand-soft' },
    { icon: Zap, label: "Today's tasks", value: todaySlots.length || '—', tint: 'text-subject-phys bg-subject-phys-soft' },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12" data-testid="plan-home">
      {/* Header with Title & Adaptive Toggle */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-teal">My Plan</p>
          <h1 className="text-[26px] font-display font-bold text-ink tracking-tight">Your study heart</h1>
        </div>

        <button
          onClick={togglePaused}
          className={`h-9 px-4 rounded-full text-xs font-bold border transition-colors ${
            paused ? 'bg-[#F1ECE6] text-body border-line' : 'bg-teal-soft text-teal border-teal/20'
          }`}
          title={paused ? 'Adaptive mood adjustments are paused' : 'Adaptive mood adjustments are on'}
        >
          {paused ? '⏸ Adaptive paused' : '◉ Adaptive on'}
        </button>
      </div>

      {/* Top KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="p-4 rounded-2xl bg-white border border-line shadow-xs flex items-center gap-3">
            <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${k.tint}`}>
              <k.icon className="w-4 h-4" />
            </span>
            <span>
              <span className="block text-lg font-extrabold text-ink leading-none">{k.value}</span>
              <span className="block text-xs text-faint mt-0.5">{k.label}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Adaptive banner with undo */}
      {notification?.kind === 'adaptive' && (
        <div className="p-3 rounded-xl bg-teal-soft border border-teal/20 text-sm text-ink flex flex-wrap items-center gap-2" data-testid="adaptive-banner">
          <span className="font-bold">🧠 {notification.title}</span>
          <span className="text-body">{notification.body}</span>
          <span className="flex-1" />
          {isAdapting && <span className="text-xs text-faint">Adapting…</span>}
          {notification.undoToken && (
            <button onClick={undoAdaptive} className="h-8 px-3 rounded-full bg-white text-xs font-bold text-teal border border-teal/30 hover:bg-teal hover:text-white transition-colors">
              Undo
            </button>
          )}
          <button onClick={store.clearNotification} className="text-xs font-bold text-faint hover:text-ink">Dismiss</button>
        </div>
      )}

      {/* ── My Plan: calendar ── */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-[#F1ECE6] flex items-center justify-center">
            <CalendarDays className="w-4 h-4 text-[#5B544E]" />
          </div>
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#8A817B]">My Plan</p>
            <p className="text-[13px] font-bold text-[#1E1B16] leading-tight">Study Calendar</p>
          </div>
        </div>
        <StudyCalendar planId={currentPlan?.id} />
      </div>

      {/* ── Quick pacing summary ── */}
      <div className="pt-2 border-t border-[#F1ECE6]">
        <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#8A817B] mb-3 px-0.5">Pace &amp; Bonus</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PacingBar planId={currentPlan?.id} />
          <TaskHybridList
            slots={todaySlots}
            onCompleteSlot={(s) => store.completeSlot(s.id, {}).catch(() => {})}
            onStartSlot={(s) => navigate('/knowledge', { state: { subject: s.plan_subjects?.subject_name, topic: s.topic } })}
            onBonusAction={(action) => {
              if (action === 'source') navigate('/knowledge')
              else navigate('/knowledge', { state: { aiAction: action } })
            }}
          />
        </div>
      </div>

      {/* ── Full Plan Workspace (The Study Codex) ── */}
      <PlannerPageV2 />

      {/* 3. Performance & Insights Section */}
      <div className="pt-6 border-t border-line/60">
        <InsightsPage embedded={true} />
      </div>
    </div>
  )
}
