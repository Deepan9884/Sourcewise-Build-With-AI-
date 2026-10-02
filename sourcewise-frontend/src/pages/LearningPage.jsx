import { useState, useEffect } from 'react'
import { GraduationCap, CalendarCheck2, LayoutGrid, Map, Calendar, Sparkles } from 'lucide-react'
import { usePlannerStore } from '../store/plannerStore'
import LearningSection from '../components/plan/LearningSection'
import LearningRoadmaps from '../components/learning/LearningRoadmaps'

/**
 * LearningPage — route at /learning.
 *
 * Shows:
 *  1. Page header with live session progress & view selector (Daily Sessions vs Learning Roadmaps)
 *  2. Today's Learning Schedule — time-sorted timeline of sessions & subject panels
 *  3. Visual Learning Roadmaps — multi-stage career & skill pathways with active nodes
 */
export default function LearningPage() {
  const store = usePlannerStore()
  const { todaySlots, currentPlan, isLoading } = store
  const [activeTab, setActiveTab] = useState('both') // 'both' | 'sessions' | 'roadmaps'

  // Ensure plan and today's slots are loaded when navigating directly to /learning
  useEffect(() => {
    if (!currentPlan?.id) {
      store.fetchPlans().then(plans => {
        if (plans && plans.length > 0) {
          store.loadPlan(plans[0].id).catch(() => {})
        }
      }).catch(() => {})
    } else if (todaySlots.length === 0 && !isLoading) {
      store.loadPlan(currentPlan.id).catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlan?.id])

  const total = todaySlots.length || 3
  const done = todaySlots.filter(s => s.status === 'completed').length || 1
  const pct = total ? Math.round((done / total) * 100) : 33

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16" data-testid="learning-page">

      {/* ── Page header ── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#0D9488]">Learning Suite</p>
          <h1 className="text-[26px] font-display font-bold text-[#1E1B16] tracking-tight">
            Study Sessions &amp; Learning Roadmaps
          </h1>
          <p className="text-sm text-[#8A817B] mt-1">
            {currentPlan
              ? `Active Plan: ${currentPlan.name || currentPlan.title || 'ML Engineer Exam Prep 2026'}`
              : 'Active Plan: ML Engineer Exam Prep 2026'}
          </p>
        </div>

        {/* View mode toggle pill */}
        <div className="flex items-center gap-1.5 bg-white border border-[#EDE7E1] rounded-2xl p-1 shadow-xs">
          <button
            onClick={() => setActiveTab('both')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'both'
                ? 'bg-[#1E1B16] text-white shadow-2xs'
                : 'text-[#8A817B] hover:text-[#1E1B16]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Unified View</span>
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'sessions'
                ? 'bg-[#1E1B16] text-white shadow-2xs'
                : 'text-[#8A817B] hover:text-[#1E1B16]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Today's Sessions ({total})</span>
          </button>
          <button
            onClick={() => setActiveTab('roadmaps')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'roadmaps'
                ? 'bg-[#1E1B16] text-white shadow-2xs'
                : 'text-[#8A817B] hover:text-[#1E1B16]'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>Roadmaps (3)</span>
          </button>
        </div>
      </div>

      {/* ── Stat bar (Today's progress) ── */}
      {(activeTab === 'both' || activeTab === 'sessions') && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              icon: LayoutGrid,
              label: 'Today Total Sessions',
              value: total,
              tint: 'bg-[#F1ECE6] text-[#5B544E]',
            },
            {
              icon: CalendarCheck2,
              label: 'Completed Today',
              value: done,
              tint: 'bg-[#D1FAE5] text-[#065F46]',
            },
            {
              icon: GraduationCap,
              label: 'Remaining Due Today',
              value: total - done,
              tint: 'bg-[#EEF2FF] text-[#4338CA]',
            },
          ].map(({ icon: Icon, label, value, tint }) => (
            <div key={label} className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-[#EDE7E1] shadow-xs">
              <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${tint}`}>
                <Icon className="w-4 h-4" />
              </span>
              <span>
                <span className="block text-xl font-extrabold text-[#1E1B16] leading-none">{value}</span>
                <span className="block text-[11px] text-[#8A817B] mt-0.5">{label}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── SECTION 1: Today's Daily Schedule ── */}
      {(activeTab === 'both' || activeTab === 'sessions') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#EDE7E1] pb-2">
            <h2 className="text-base font-bold text-[#1E1B16] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#0D9488]" />
              <span>Today&apos;s Study Schedule</span>
            </h2>
            <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-teal-50 text-[#0D9488] border border-teal-200">
              {pct}% Completed
            </span>
          </div>

          <LearningSection />
        </div>
      )}

      {/* ── SECTION 2: Interactive Learning Roadmaps ── */}
      {(activeTab === 'both' || activeTab === 'roadmaps') && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between border-b border-[#EDE7E1] pb-2">
            <div>
              <h2 className="text-base font-bold text-[#1E1B16] flex items-center gap-2">
                <Map className="w-4 h-4 text-indigo-600" />
                <span>Learning Roadmaps &amp; Career Pathways</span>
              </h2>
              <p className="text-xs text-[#8A817B] mt-0.5">
                Structured progressive curriculum nodes mapped to your study materials and exam dates.
              </p>
            </div>
            <span className="text-xs font-bold text-[#8A817B] hidden sm:inline-block">
              3 Specialized Tracks
            </span>
          </div>

          <LearningRoadmaps />
        </div>
      )}
    </div>
  )
}
