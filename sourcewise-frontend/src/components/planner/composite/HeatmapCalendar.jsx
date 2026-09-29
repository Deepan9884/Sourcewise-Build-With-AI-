import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import ParchmentTexture from '../primitives/ParchmentTexture'

/** Mastery intensity → cell color (coral → amber → teal). */
function cellColor(intensity) {
  if (intensity == null) return '#F3EDE6'
  if (intensity >= 80) return '#0F766E'
  if (intensity >= 60) return '#3AA79D'
  if (intensity >= 40) return '#D97706'
  if (intensity >= 20) return '#E8845F'
  return '#F0B9A2'
}

/**
 * HeatmapCalendar — 12-week mastery map. Cells from schedule completion +
 * optional mastery lookup. Hover reveals day detail.
 */
export default function HeatmapCalendar({ slots = [], subjects = [], weeks = 12 }) {
  const [hover, setHover] = useState(null)
  const grid = useMemo(() => {
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    // align to Monday
    const dow = (today.getUTCDay() + 6) % 7
    today.setUTCDate(today.getUTCDate() - dow - (weeks - 1) * 7)
    const days = []
    for (let i = 0; i < weeks * 7; i++) {
      const d = new Date(today)
      d.setUTCDate(d.getUTCDate() + i)
      days.push(d.toISOString().slice(0, 10))
    }
    const doneByDate = {}
    const totalByDate = {}
    for (const s of slots) {
      if (s.slot_type === 'break') continue
      totalByDate[s.date] = (totalByDate[s.date] || 0) + 1
      if (s.status === 'completed') doneByDate[s.date] = (doneByDate[s.date] || 0) + 1
    }
    return days.map((date) => {
      const total = totalByDate[date] || 0
      const done = doneByDate[date] || 0
      const intensity = total ? Math.round((done / total) * 100) : null
      return { date, total, done, intensity }
    })
  }, [slots, weeks])

  const monthLabels = useMemo(() => {
    const labels = []
    let last = ''
    grid.forEach((cell, i) => {
      const m = new Date(`${cell.date}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' })
      if (m !== last && i % 7 === 0) { labels.push({ i, m }); last = m }
    })
    return labels
  }, [grid])

  return (
    <ParchmentTexture intensity="subtle" className="shadow-xs">
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-[#1E1B16]">Mastery map</h3>
            <p className="text-xs text-[#5B544E]">Completion intensity · last {weeks} weeks · {subjects.length} chapters</p>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-[#8A817B]">
            <span>Less</span>
            {['#F3EDE6', '#F0B9A2', '#E8845F', '#D97706', '#0F766E'].map((c) => (
              <span key={c} className="w-3 h-3 rounded-[4px]" style={{ background: c }} />
            ))}
            <span>More</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="inline-block">
            <div className="flex gap-[3px] mb-1 ml-8">
              {monthLabels.map((l) => (
                <span key={l.i} className="text-[10px] text-[#8A817B] w-[76px] shrink-0">{l.m}</span>
              ))}
            </div>
            <div className="flex gap-[3px]">
              {Array.from({ length: weeks }).map((_, w) => (
                <div key={w} className="flex flex-col gap-[3px]">
                  {grid.slice(w * 7, w * 7 + 7).map((cell) => (
                    <motion.button
                      key={cell.date}
                      whileHover={{ scale: 1.25 }}
                      onMouseEnter={() => setHover(cell)}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover(cell)}
                      onBlur={() => setHover(null)}
                      className="w-[13px] h-[13px] rounded-[4px] border border-black/5"
                      style={{ background: cellColor(cell.intensity) }}
                      aria-label={`${cell.date}, ${cell.done} of ${cell.total} sessions complete`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 min-h-[28px] text-xs text-[#5B544E]" aria-live="polite">
          {hover ? (
            <span><strong className="text-[#1E1B16]">{hover.date}</strong> · {hover.done}/{hover.total} sessions complete{hover.intensity != null ? ` · ${hover.intensity}%` : ' · no sessions'}</span>
          ) : (
            <span>Hover a cell to inspect the day.</span>
          )}
        </div>
      </div>
    </ParchmentTexture>
  )
}
