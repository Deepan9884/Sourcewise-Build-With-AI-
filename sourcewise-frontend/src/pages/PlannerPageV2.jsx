import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { RefreshCw, ChevronLeft, ChevronRight, ScrollText } from 'lucide-react'
import { GlowCard } from '../components/ui/glow-card'
import { useAuthStore } from '../store/authStore'
import { usePlannerStore } from '../store/plannerStore'
import MoodCheckinWidget from '../components/planner/MoodCheckinWidget'
import SubjectCard from '../components/planner/SubjectCard'
import TodayFocusPanel from '../components/planner/TodayFocusPanel'
import ReplanNotification from '../components/planner/ReplanNotification'
import CalendarSyncBanner from '../components/planner/CalendarSyncBanner'
import FoxCompanion from '../components/planner/composite/FoxCompanion'
import PlanCreationWizard from '../components/planner/composite/PlanCreationWizard'
import ViewToggle from '../components/planner/composite/ViewToggle'
import WeeklySpread from '../components/planner/composite/WeeklySpread'
import HeatmapCalendar from '../components/planner/composite/HeatmapCalendar'
import TimelineView from '../components/planner/composite/TimelineView'
import AmbientGlow from '../components/planner/primitives/AmbientGlow'
import ParchmentTexture from '../components/planner/primitives/ParchmentTexture'
import { useKeyboardShortcuts } from '../components/planner/hooks/useKeyboardShortcuts'
import { startOfWeekISO, addDaysISO } from '../components/planner/utils/dateHelpers'

export default function PlannerPageV2() {
  const navigate = useNavigate()
  const { accessToken, user } = useAuthStore()
  const store = usePlannerStore()
  const {
    plans, currentPlan, subjects, schedule, todaySlots, moodState,
    calendarStatus, conflicts, notification, isGenerating, isReplanning, isLoading, error,
    currentView, weekStart, celebrating,
  } = store

  const [selectedSubject, setSelectedSubject] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [showShortcuts, setShowShortcuts] = useState(false)

  useEffect(() => {
    if (!accessToken) return
    store.fetchPlans().catch(() => {})
    store.fetchMood().catch(() => {})
    store.fetchCalendarStatus().catch(() => {})
    const unsub = store.subscribeToReplanEvents()
    const params = new URLSearchParams(window.location.search)
    if (params.get('calendar') === 'connected') {
      store.syncCalendar().catch(() => {})
      window.history.replaceState({}, '', '/planner-v2')
    }
    return () => { try { unsub() } catch { /* ignore */ } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  useEffect(() => {
    store.setWeekStart(startOfWeekISO(new Date().toISOString().slice(0, 10)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const weekLabel = useMemo(() => {
    const end = addDaysISO(weekStart, 6)
    const fmt = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
    return `${fmt(weekStart)} – ${fmt(end)}`
  }, [weekStart])

  useKeyboardShortcuts({
    replan: () => currentPlan?.id && store.replan('manual', {}).catch(() => {}),
    prevWeek: () => store.setWeekStart(addDaysISO(weekStart, -7)),
    nextWeek: () => store.setWeekStart(addDaysISO(weekStart, 7)),
    startSession: () => {
      const next = todaySlots.find((s) => s.status !== 'completed') || todaySlots[0]
      if (next) navigate('/workspace', { state: { slotId: next.id, subject: next.plan_subjects?.subject_name } })
    },
  })

  const handleDropReschedule = async (slotId, newDate) => {
    try {
      await store.rescheduleSlot(slotId, { newDate, reason: 'drag_drop' })
    } catch { /* error in store */ }
  }

  // ── Empty state: codex creation ──────────────────────────────
  if (!currentPlan) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 pb-12 relative">
        <AmbientGlow position="top-right" size="lg" tint="amber" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#C05A35]">The Study Codex · Vol. II</p>
          <h1 className="text-[30px] font-display font-bold text-[#1E1B16] tracking-tight mt-1">Open a new chapter of study</h1>
          <p className="text-[15px] text-[#5B544E] mt-1 max-w-2xl">
            Name your subject, attach study files, and set your grand exam date — the AI codex inscribes a living timetable
            that dynamically adapts to your cognitive velocity, your calendar, and your milestones.
          </p>
        </motion.div>

        {error && (
          <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200/80 text-sm text-amber-900 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>{error}</span>
            </div>
            <button
              onClick={() => store.setError('')}
              className="text-xs font-bold text-amber-800 hover:text-amber-950 px-2 py-1 rounded bg-amber-100/60"
            >
              Dismiss
            </button>
          </div>
        )}

        <PlanCreationWizard
          isGenerating={isGenerating}
          onComplete={(payload) => store.createPlan(payload).catch(() => {})}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <MoodCheckinWidget currentMood={moodState} />
          <div className="space-y-4">
            {plans.length > 0 && (
              <ParchmentTexture intensity="subtle" className="shadow-xs">
                <div className="p-4">
                  <h3 className="font-bold text-sm text-[#1E1B16] mb-2">Your codices</h3>
                  <div className="space-y-1.5">
                    {plans.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => store.loadPlan(p.id)}
                        className="w-full text-left p-2.5 rounded-xl bg-white/80 border border-[#E7DCCB] hover:border-[#E8845F] transition-colors text-sm"
                      >
                        <span className="font-semibold text-[#1E1B16]">{p.name}</span>
                        <span className="block text-xs text-[#8A817B]">{p.status} · {p.daily_study_budget_minutes} min/day</span>
                      </button>
                    ))}
                  </div>
                </div>
              </ParchmentTexture>
            )}
          </div>
        </div>
      </div>
    )
  }

  const sessionCount = schedule.filter((s) => s.slot_type !== 'break').length

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-12 relative">
      <AmbientGlow position="top-right" size="lg" tint="amber" />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-3 relative">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#C05A35]">The Study Codex</p>
          <h1 className="text-[26px] font-display font-bold text-[#1E1B16] tracking-tight">{currentPlan.name}</h1>
          <p className="text-sm text-[#5B544E]">
            {subjects.length} chapter{subjects.length === 1 ? '' : 's'} · {sessionCount} sessions inked
            {user?.name ? ` · scribed for ${user.name.split(' ')[0]}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowShortcuts((s) => !s)}
            className="sw-btn-secondary !h-10 !text-[13px]"
            title="Keyboard shortcuts"
          >
            <ScrollText className="w-3.5 h-3.5" /> Keys
          </button>
          <button
            onClick={() => store.replan('manual', {}).catch(() => {})}
            disabled={isReplanning}
            className="sw-btn-secondary !h-10 !text-[13px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReplanning ? 'animate-spin' : ''}`} />
            <span>{isReplanning ? 'Rewriting…' : 'Replan now'}</span>
          </button>
          <button onClick={() => navigate('/planner')} className="sw-btn-secondary !h-10 !text-[13px]">Legacy planner</button>
        </div>
      </motion.div>

      {showShortcuts && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-xl bg-[#1E1B16] text-white text-xs flex flex-wrap gap-x-4 gap-y-1">
          {[
            ['R', 'replan'], ['Space', 'start session'], ['←/→', 'prev/next week'],
            ['M', 'mood (in focus panel)'], ['N', 'new chapter (creation)'], ['G', 'generate (creation)'],
          ].map(([k, v]) => (
            <span key={k}><kbd className="px-1.5 py-0.5 rounded bg-white/15 font-mono font-bold">{k}</kbd> {v}</span>
          ))}
        </motion.div>
      )}

      <ReplanNotification
        notification={notification}
        onDismiss={store.clearNotification}
        onReview={() => store.loadPlan(currentPlan.id).catch(() => {})}
      />
      {error && (
        <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200/80 text-sm text-amber-900 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span>{error}</span>
          </div>
          <button
            onClick={() => store.setError('')}
            className="text-xs font-bold text-amber-800 hover:text-amber-950 px-2 py-1 rounded bg-amber-100/60"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-3">
          <FoxCompanion
            mood={moodState?.dominantMood || 'neutral'}
            xp={340}
            maxXp={500}
            streak={todaySlots.length ? 1 : 0}
            celebrating={celebrating}
          />
          <MoodCheckinWidget currentMood={moodState} compact />
          <div className="space-y-2">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#8A817B] px-1">Chapters</p>
            {subjects.map((s) => (
              <SubjectCard key={s.id} subject={s} selected={selectedSubject?.id === s.id} onSelect={setSelectedSubject} />
            ))}
          </div>
        </div>

        {/* Main */}
        <div className="lg:col-span-8 space-y-4">
          <TodayFocusPanel
            slots={todaySlots}
            mood={moodState}
            onComplete={(slot) => store.completeSlot(slot.id, {}).catch(() => {})}
            onReschedule={(slot) => {
              const next = window.prompt('New date (YYYY-MM-DD)?', slot.date)
              if (next) store.rescheduleSlot(slot.id, { newDate: next, reason: 'user_requested' }).catch(() => {})
            }}
            onStartSession={(slot) => navigate('/workspace', { state: { slotId: slot.id, subject: slot.plan_subjects?.subject_name } })}
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <ViewToggle value={currentView} onChange={store.setView} />
            {currentView !== 'heatmap' && (
              <div className="flex items-center gap-1.5 text-sm">
                <button onClick={() => store.setWeekStart(addDaysISO(weekStart, -7))} className="w-8 h-8 rounded-full bg-white border border-[#EDE7E1] flex items-center justify-center hover:border-[#E8845F]" aria-label="Previous week">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-[#1E1B16] tabular-nums px-1">{weekLabel}</span>
                <button onClick={() => store.setWeekStart(addDaysISO(weekStart, 7))} className="w-8 h-8 rounded-full bg-white border border-[#EDE7E1] flex items-center justify-center hover:border-[#E8845F]" aria-label="Next week">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {currentView === 'spread' && (
            <WeeklySpread
              slots={schedule}
              weekStart={weekStart}
              conflicts={conflicts}
              onSlotClick={setSelectedSlot}
              onSlotDrop={handleDropReschedule}
            />
          )}
          {currentView === 'heatmap' && (
            <HeatmapCalendar slots={schedule} subjects={subjects} weeks={12} />
          )}
          {currentView === 'timeline' && (
            <TimelineView slots={schedule} weekStart={weekStart} onSlotClick={setSelectedSlot} />
          )}

          {selectedSlot && (
            <GlowCard className="p-5" glowColor="amber" intensity="sm">
              <h3 className="font-bold text-[#1E1B16]">{selectedSlot.topic}</h3>
              <p className="text-xs text-[#5B544E] mt-1">
                {selectedSlot.date} · {String(selectedSlot.start_time).slice(0, 5)}–{String(selectedSlot.end_time).slice(0, 5)} ·{' '}
                {selectedSlot.plan_subjects?.subject_name} · {selectedSlot.activity_type}
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => { store.completeSlot(selectedSlot.id, {}).catch(() => {}); setSelectedSlot(null) }}
                  className="h-9 px-4 rounded-full bg-[#E0F2F0] text-[#0F766E] text-xs font-bold"
                >
                  Seal complete
                </button>
                <button
                  onClick={() => setSelectedSlot(null)}
                  className="h-9 px-4 rounded-full bg-[#F1ECE6] text-xs font-bold text-[#5B544E]"
                >
                  Close
                </button>
              </div>
            </GlowCard>
          )}
          {isLoading && <p className="text-xs text-[#8A817B]">Refreshing the folios…</p>}
        </div>
      </div>
    </div>
  )
}
