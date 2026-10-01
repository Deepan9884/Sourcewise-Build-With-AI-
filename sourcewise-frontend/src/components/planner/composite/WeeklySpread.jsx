import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import ParchmentTexture from '../primitives/ParchmentTexture'
import InkSplash from '../primitives/InkSplash'
import { subjectStyle } from '../utils/subjectPalette'
import { prettyDay, hhmm, weekDatesISO } from '../utils/dateHelpers'
import { useInkSplash } from '../hooks/useInkSplash'
import { useStudentEvents, getCategoryStyle } from '../../../lib/studentEvents'

const ACT_ICON = { read: '📖', practice: '✍️', flashcards: '🃏', explain: '💡', quiz: '❓', summarize: '📝' }

/**
 * WeeklySpread — two-page parchment spread (Mon–Wed | Thu–Sun).
 * Slots lift on drag (HTML5 DnD + ink splash), conflicts get red wax drip.
 */
export default function WeeklySpread({ slots = [], weekStart, onSlotClick, onSlotDrop, conflicts = [] }) {
  const { bursts, splash, clear } = useInkSplash()
  const [dragId, setDragId] = useState(null)
  const dates = useMemo(() => weekDatesISO(weekStart), [weekStart])
  const left = dates.slice(0, 3)
  const right = dates.slice(3)
  const conflictKeys = useMemo(
    () => new Set(conflicts.map((c) => `${c.slot?.date}|${c.slot?.start_time}`)),
    [conflicts]
  )
  const byDate = useMemo(() => {
    const m = {}
    for (const s of slots) {
      if (s.slot_type === 'break') continue
      ;(m[s.date] = m[s.date] || []).push(s)
    }
    for (const k of Object.keys(m)) m[k].sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)))
    return m
  }, [slots])

  const { events: studentEvents } = useStudentEvents()

  const eventsByDate = useMemo(() => {
    const map = {}
    for (const ev of studentEvents) {
      if (!ev.startDate) continue
      const start = ev.startDate
      const end = ev.endDate && ev.endDate >= start ? ev.endDate : start
      let cur = new Date(`${start}T00:00:00`)
      const stop = new Date(`${end}T00:00:00`)
      let safety = 0
      while (cur <= stop && safety < 60) {
        const y = cur.getFullYear()
        const m = String(cur.getMonth() + 1).padStart(2, '0')
        const d = String(cur.getDate()).padStart(2, '0')
        const dStr = `${y}-${m}-${d}`
        if (!map[dStr]) map[dStr] = []
        map[dStr].push(ev)
        cur.setDate(cur.getDate() + 1)
        safety++
      }
    }
    return map
  }, [studentEvents])

  const renderDay = (date) => (
    <div
      key={date}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        const id = e.dataTransfer.getData('text/slot-id')
        if (id && onSlotDrop) onSlotDrop(id, date)
      }}
      className="rounded-xl bg-white/70 border border-[#E7DCCB] p-2 min-h-[150px]"
    >
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#6B625C]">{prettyDay(date)}</p>
        {(eventsByDate[date] || []).length > 0 && (
          <span className="text-[9px] font-extrabold text-emerald-800 bg-emerald-100 px-1 py-0.2 rounded">
            📅 {(eventsByDate[date] || []).length}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {/* Student portfolio events */}
        {(eventsByDate[date] || []).map((ev) => {
          const st = getCategoryStyle(ev.category)
          return (
            <div
              key={ev.id}
              className={`p-1.5 rounded-lg border text-[10px] font-bold shadow-2xs flex items-center justify-between gap-1 ${st.bg} ${st.border} ${st.text}`}
              title={`${ev.category}: ${ev.title}`}
            >
              <div className="flex items-center gap-1 min-w-0">
                <span>🏆</span>
                <span className="truncate">{ev.title}</span>
              </div>
              <span className="text-[8px] uppercase tracking-wider px-1 py-0.2 rounded bg-white/80 shrink-0">
                {ev.category}
              </span>
            </div>
          )
        })}

        {(byDate[date] || []).slice(0, 6).map((s) => {
          const sub = s.plan_subjects || {}
          const st = subjectStyle(sub.subject_name || s.topic || '')
          const color = sub.color || st.primary
          const conflict = conflictKeys.has(`${s.date}|${s.start_time}`)
          return (
            <motion.button
              key={s.id}
              layout
              draggable={s.status === 'pending'}
              onDragStart={(e) => { e.dataTransfer.setData('text/slot-id', s.id); setDragId(s.id) }}
              onDragEnd={(e) => { setDragId(null); splash(e.clientX % 400, 0, color) }}
              onClick={() => onSlotClick?.(s)}
              whileHover={{ y: -2 }}
              className={`w-full text-left p-2 rounded-lg border text-[11px] transition-shadow ${dragId === s.id ? 'opacity-60 shadow-lg' : 'shadow-xs'} ${s.status === 'completed' ? 'opacity-70' : ''}`}
              style={{ borderColor: `${color}55`, background: `linear-gradient(135deg, #ffffff, ${color}14)` }}
              aria-label={`${sub.subject_name || s.topic} ${hhmm(s.start_time)} to ${hhmm(s.end_time)}${conflict ? ', calendar conflict' : ''}`}
            >
              <span className="flex items-center gap-1.5">
                <span>{ACT_ICON[s.activity_type] || '📚'}</span>
                <span className="font-bold text-[#1E1B16] truncate">{sub.subject_name || s.topic}</span>
                {s.status === 'completed' && <span>✅</span>}
                {conflict && <span title="Calendar conflict" className="text-red-600">🩸</span>}
              </span>
              <span className="block text-[#5B544E] mt-0.5 tabular-nums">
                {hhmm(s.start_time)}–{hhmm(s.end_time)} · {s.duration_minutes}m
              </span>
            </motion.button>
          )
        })}
        {!(byDate[date] || []).length && (
          <p className="text-[11px] italic text-[#A8A099] text-center py-3">— rest —</p>
        )}
      </div>
    </div>
  )

  return (
    <ParchmentTexture intensity="subtle" className="shadow-xs">
      <div className="relative p-3 sm:p-4">
        {bursts.map((b) => (
          <InkSplash key={b.id} x={b.x} y={b.y} color={b.color} onDone={() => clear(b.id)} />
        ))}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#8A817B] mb-2">Left folio · Mon–Wed</p>
            <div className="space-y-2">{left.map(renderDay)}</div>
          </div>
          <div className="md:border-l md:border-[#E0D3BE] md:pl-3">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#8A817B] mb-2">Right folio · Thu–Sun</p>
            <div className="space-y-2">{right.map(renderDay)}</div>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-[#8A817B]">Drag a pending session onto another day to reschedule · 🩸 marks calendar conflicts</p>
      </div>
    </ParchmentTexture>
  )
}
