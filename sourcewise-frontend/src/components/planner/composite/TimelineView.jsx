import { useMemo } from 'react'
import ParchmentTexture from '../primitives/ParchmentTexture'
import { subjectStyle } from '../utils/subjectPalette'
import { hhmm } from '../utils/dateHelpers'

const HOURS = Array.from({ length: 15 }, (_, i) => i + 8) // 08→22

/**
 * TimelineView — hourly ruler with subject lanes for a single week.
 */
export default function TimelineView({ slots = [], weekStart, onSlotClick }) {
  const days = useMemo(() => {
    const start = new Date(`${weekStart}T00:00:00Z`)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setUTCDate(d.getUTCDate() + i)
      return d.toISOString().slice(0, 10)
    })
  }, [weekStart])

  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const topPct = Math.min(100, Math.max(0, ((nowMin - 8 * 60) / (15 * 60)) * 100))

  const place = (s) => {
    const [sh, sm] = String(s.start_time).split(':').map(Number)
    const [eh, em] = String(s.end_time).split(':').map(Number)
    const top = ((sh * 60 + sm - 8 * 60) / (15 * 60)) * 100
    const height = Math.max(4, (((eh * 60 + em) - (sh * 60 + sm)) / (15 * 60)) * 100)
    return { top: `${Math.max(0, top)}%`, height: `${height}%` }
  }

  return (
    <ParchmentTexture intensity="subtle" className="shadow-xs">
      <div className="p-3 sm:p-4 overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[52px_repeat(7,1fr)] gap-1 text-[10px] font-bold text-[#8A817B] mb-1">
            <span />
            {days.map((d) => (
              <span key={d} className="text-center truncate">
                {new Date(`${d}T00:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', timeZone: 'UTC' })}
              </span>
            ))}
          </div>
          <div className="relative grid grid-cols-[52px_repeat(7,1fr)] gap-1">
            <div className="relative h-[560px]">
              {HOURS.map((h) => (
                <span key={h} className="absolute text-[10px] tabular-nums text-[#8A817B]" style={{ top: `${((h - 8) / 15) * 100}%` }}>
                  {String(h).padStart(2, '0')}:00
                </span>
              ))}
            </div>
            {days.map((d) => (
              <div key={d} className="relative h-[560px] rounded-lg bg-white/60 border border-[#EDE3D2]">
                {HOURS.map((h) => (
                  <div key={h} className="absolute inset-x-0 border-t border-[#EFE7D8]" style={{ top: `${((h - 8) / 15) * 100}%` }} />
                ))}
                {(slots.filter((s) => s.date === d && s.slot_type !== 'break')).map((s) => {
                  const sub = s.plan_subjects || {}
                  const st = subjectStyle(sub.subject_name || s.topic || '')
                  const color = sub.color || st.primary
                  const pos = place(s)
                  return (
                    <button
                      key={s.id}
                      onClick={() => onSlotClick?.(s)}
                      className="absolute inset-x-1 rounded-md px-1.5 py-1 text-left text-[10px] overflow-hidden border"
                      style={{ ...pos, background: `${color}22`, borderColor: `${color}66` }}
                      aria-label={`${sub.subject_name || s.topic} ${hhmm(s.start_time)}`}
                    >
                      <span className="font-bold text-[#1E1B16] block truncate">{sub.subject_name || s.topic}</span>
                      <span className="text-[#5B544E] tabular-nums">{hhmm(s.start_time)} · {s.duration_minutes}m</span>
                    </button>
                  )
                })}
              </div>
            ))}
            {/* now-line */}
            <div className="pointer-events-none absolute inset-y-0 left-[52px] right-0">
              <div className="absolute inset-x-0 h-[2px] bg-[#DC2626]/70" style={{ top: `calc(${(topPct).toFixed(1)}% )` }} />
            </div>
          </div>
        </div>
      </div>
    </ParchmentTexture>
  )
}
