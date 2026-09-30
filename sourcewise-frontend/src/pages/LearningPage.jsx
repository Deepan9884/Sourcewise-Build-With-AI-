import { useEffect } from 'react'
import { GraduationCap, CalendarCheck2, LayoutGrid } from 'lucide-react'
import { usePlannerStore } from '../store/plannerStore'
import LearningSection from '../components/plan/LearningSection'

/**
 * LearningPage — standalone route at /learning.
 *
 * Shows:
 *  1. Page header with live session count
 *  2. Today's Learning Schedule — time-sorted timeline of sessions
 *  3. Subjects enrolled today — panel grid with inline task completion
 */
export default function LearningPage() {
  const store = usePlannerStore()
  const { todaySlots, currentPlan, isLoading } = store

  // Ensure today's slots are loaded when navigating directly to /learning
  useEffect(() => {
    if (currentPlan?.id && todaySlots.length === 0 && !isLoading) {
      store.loadPlan(currentPlan.id).catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlan?.id])

  const total = todaySlots.length
  const done = todaySlots.filter(s => s.status === 'completed').length
  const pct = total ? Math.round((done / total) * 100) : 0

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16" data-testid="learning-page">

      {/* ── Page header ── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#0D9488]">Learning</p>
          <h1 className="text-[26px] font-display font-bold text-[#1E1B16] tracking-tight">
            Today's Study Sessions
          </h1>
          <p className="text-sm text-[#8A817B] mt-1">
            {currentPlan
              ? `Plan: ${currentPlan.title || 'Current plan'}`
              : 'Load a study plan from My Plan to see your schedule here.'}
          </p>
        </div>

        {/* Today's progress pill */}
        {total > 0 && (
          <div className="flex items-center gap-3 bg-white border border-[#EDE7E1] rounded-2xl px-4 py-3 shadow-xs">
            <div className="relative w-11 h-11">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#F1ECE6" strokeWidth="4" />
                <circle
                  cx="18" cy="18" r="14" fill="none"
                  stroke={pct === 100 ? '#0D9488' : '#E8845F'}
                  strokeWidth="4"
                  strokeDasharray={`${pct * 0.8796} 87.96`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold text-[#1E1B16]">
                {pct}%
              </span>
            </div>
            <div>
              <p className="text-sm font-bold text-[#1E1B16]">{done}/{total} done</p>
              <p className="text-[11px] text-[#8A817B]">Today's sessions</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Stat bar (only when a plan is loaded) ── */}
      {total > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              icon: LayoutGrid,
              label: 'Total sessions',
              value: total,
              tint: 'bg-[#F1ECE6] text-[#5B544E]',
            },
            {
              icon: CalendarCheck2,
              label: 'Completed',
              value: done,
              tint: 'bg-[#D1FAE5] text-[#065F46]',
            },
            {
              icon: GraduationCap,
              label: 'Remaining',
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

      {/* ── Core learning content ── */}
      <LearningSection />
    </div>
  )
}
