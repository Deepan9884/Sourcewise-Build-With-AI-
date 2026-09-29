import { useEffect, useState } from 'react'
import { studyPlansApi } from '../../lib/studyPlansApi'

/**
 * PacingBar — completed-vs-expected slots with milestone flags + deviation badge.
 * Data: GET /study-plans/:id/pacing. Renders nothing when no plan exists or
 * the v13 tables are missing (parent shows the migration hint instead).
 */
export default function PacingBar({ planId }) {
  const [pacing, setPacing] = useState(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!planId) { setPacing(null); return }
    let cancelled = false
    studyPlansApi.pacing(planId).then((p) => { if (!cancelled) setPacing(p) }).catch(() => { if (!cancelled) setPacing(null) })
    return () => { cancelled = true }
  }, [planId])

  if (!pacing) return null

  const behind = pacing.deviationDays < 0
  const ahead = pacing.deviationDays > 0

  return (
    <div className="p-4 rounded-2xl bg-white border border-line shadow-xs" data-testid="pacing-bar">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-ink">Pace {pacing.pacePct}%</span>
          <span className="text-xs text-faint">
            {pacing.completedSlots}/{pacing.expectedSlots} due slots done
          </span>
        </div>
        <span
          data-testid="deviation-badge"
          className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${
            behind ? 'bg-red-50 text-red-700 border border-red-200'
            : ahead ? 'bg-teal-soft text-teal border border-teal/20'
            : 'bg-coral-soft text-coral-deep border border-coral/20'
          }`}
        >
          {behind ? `▼ ${Math.abs(pacing.deviationDays)}d behind` : ahead ? `▲ +${pacing.deviationDays}d ahead` : '● On track'}
        </span>
      </div>
      <div className="h-2.5 bg-[#F1ECE6] rounded-full overflow-hidden mt-2" role="progressbar" aria-valuenow={pacing.pacePct} aria-valuemin="0" aria-valuemax="100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${behind ? 'bg-red-400' : 'bg-coral'}`}
          style={{ width: `${Math.min(100, pacing.pacePct)}%` }}
        />
      </div>
      {pacing.milestones?.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          {pacing.milestones.map((m, i) => (
            <span key={i} className={`text-xs ${m.reached ? 'text-teal font-semibold' : 'text-faint'}`}>
              {m.reached ? '🏁' : '🚩'} {m.label} · {m.date}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
