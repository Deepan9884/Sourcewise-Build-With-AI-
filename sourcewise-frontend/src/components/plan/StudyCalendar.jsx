import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { subjectStyle } from '../planner/utils/subjectPalette'
import { studyPlansApi } from '../../lib/studyPlansApi'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function fmt(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseTime(dt) {
  if (!dt) return ''
  try { return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  catch { return '' }
}

/**
 * StudyCalendar — elegant full monthly calendar.
 * Shows colored subject dots per day, hover popover lists every task.
 */
export default function StudyCalendar({ planId }) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [hoverDate, setHoverDate] = useState(null)
  const [popoverStyle, setPopoverStyle] = useState({})
  const [scheduleData, setScheduleData] = useState([])
  const [loading, setLoading] = useState(false)
  const hoverTimer = useRef(null)
  const rootRef = useRef(null)

  // Build calendar grid: cells[] of YYYY-MM-DD strings
  const { from, to, cells, todayStr } = useMemo(() => {
    const todayStr = fmt(today)
    const firstDay = new Date(viewYear, viewMonth, 1)
    const lastDay = new Date(viewYear, viewMonth + 1, 0)
    const startPad = firstDay.getDay()          // Sunday = 0
    const endPad = 6 - lastDay.getDay()

    const start = new Date(firstDay)
    start.setDate(start.getDate() - startPad)
    const end = new Date(lastDay)
    end.setDate(end.getDate() + endPad)

    const cells = []
    const cur = new Date(start)
    while (cur <= end) { cells.push(fmt(cur)); cur.setDate(cur.getDate() + 1) }

    return {
      from: fmt(firstDay),
      to: fmt(lastDay),
      cells,
      todayStr,
    }
  }, [viewYear, viewMonth])

  // Fetch schedule for the visible month
  useEffect(() => {
    if (!planId) return
    let cancelled = false
    setLoading(true)
    studyPlansApi.schedule(planId, from, to)
      .then(data => {
        if (cancelled) return
        // API may return array directly or { slots: [] }
        const arr = Array.isArray(data) ? data : (data?.slots || [])
        setScheduleData(arr)
      })
      .catch(() => { if (!cancelled) setScheduleData([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [planId, from, to])

  // Index slots by date
  const slotsByDate = useMemo(() => {
    const map = {}
    for (const slot of scheduleData) {
      if (slot.slot_type === 'break') continue
      const d = slot.date || slot.start_time?.slice(0, 10) || slot.scheduled_start?.slice(0, 10)
      if (!d) continue
      if (!map[d]) map[d] = []
      map[d].push(slot)
    }
    return map
  }, [scheduleData])

  // Unique subject dots per date
  const subjectsByDate = useMemo(() => {
    const map = {}
    for (const [date, slots] of Object.entries(slotsByDate)) {
      const seen = new Set()
      const arr = []
      for (const s of slots) {
        const name = s.plan_subjects?.subject_name || s.subject_name || ''
        if (name && !seen.has(name)) { seen.add(name); arr.push({ name, style: subjectStyle(name) }) }
      }
      map[date] = arr
    }
    return map
  }, [slotsByDate])

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }
  const goToday = () => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()) }

  // Popover hover handling
  const showPopover = useCallback((date, e) => {
    clearTimeout(hoverTimer.current)
    if (!slotsByDate[date]?.length) return
    if (!rootRef.current) return

    const cellRect = e.currentTarget.getBoundingClientRect()
    const rootRect = rootRef.current.getBoundingClientRect()

    let left = cellRect.left - rootRect.left
    let top = cellRect.bottom - rootRect.top + 8

    // Keep popover inside container
    const pWidth = 288
    if (left + pWidth > rootRect.width) left = rootRect.width - pWidth - 4
    if (left < 0) left = 4

    setPopoverStyle({ top, left })
    setHoverDate(date)
  }, [slotsByDate])

  const hidePopover = useCallback(() => {
    hoverTimer.current = setTimeout(() => setHoverDate(null), 120)
  }, [])

  const hoveredSlots = hoverDate ? (slotsByDate[hoverDate] || []) : []
  const studyDays = Object.keys(slotsByDate).filter(d => d >= from && d <= to).length

  return (
    <div ref={rootRef} className="relative bg-white rounded-2xl border border-[#EDE7E1] shadow-sm" data-calendar-root>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1ECE6]">
        <div>
          <h2 className="font-bold text-[#1E1B16] text-[15px]">
            {MONTHS[viewMonth]} {viewYear}
          </h2>
          <p className="text-xs text-[#8A817B] mt-0.5">
            {loading
              ? 'Loading schedule…'
              : planId
                ? `${studyDays} study day${studyDays !== 1 ? 's' : ''} this month`
                : 'Load a plan to see your schedule'}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={goToday}
            className="h-8 px-3 rounded-full text-xs font-bold bg-[#F1ECE6] text-[#5B544E] hover:bg-[#EDE7E1] transition-colors"
          >
            Today
          </button>
          {[{ fn: prevMonth, icon: ChevronLeft }, { fn: nextMonth, icon: ChevronRight }].map(({ fn, icon: Icon }, i) => (
            <button
              key={i}
              onClick={fn}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#8A817B] hover:bg-[#F1ECE6] hover:text-[#1E1B16] transition-colors"
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* ── Day-of-week header ── */}
      <div className="grid grid-cols-7 px-3 pt-3 pb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-[#8A817B] uppercase tracking-widest py-1">
            {d}
          </div>
        ))}
      </div>

      {/* ── Grid ── */}
      <div className="grid grid-cols-7 gap-px bg-[#F1ECE6] border border-[#F1ECE6] mx-3 mb-3 rounded-xl overflow-hidden">
        {cells.map(date => {
          const isToday = date === todayStr
          const currentMonthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`
          const isCurrentMonth = date.startsWith(currentMonthStr)
          const subjects = subjectsByDate[date] || []
          const slots = slotsByDate[date] || []
          const doneCount = slots.filter(s => s.status === 'completed').length
          const allDone = slots.length > 0 && doneCount === slots.length
          const hasSlots = slots.length > 0
          const dayNum = parseInt(date.slice(8), 10)

          return (
            <div
              key={date}
              className={`relative bg-white min-h-[72px] p-2 select-none transition-colors
                ${isCurrentMonth ? 'hover:bg-[#FDFAF8]' : 'opacity-35 pointer-events-none'}
                ${hasSlots ? 'cursor-default' : ''}
              `}
              onMouseEnter={e => showPopover(date, e)}
              onMouseLeave={hidePopover}
            >
              {/* Day number */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold
                ${isToday
                  ? 'bg-[#E8845F] text-white shadow-sm'
                  : 'text-[#1E1B16]'}
              `}>
                {dayNum}
              </div>

              {/* Subject colour dots */}
              {subjects.length > 0 && (
                <div className="flex flex-wrap gap-[3px] mt-1.5 px-0.5">
                  {subjects.slice(0, 5).map(({ name, style }) => (
                    <span
                      key={name}
                      className="w-[7px] h-[7px] rounded-full flex-shrink-0 ring-1 ring-white"
                      style={{ background: style.primary }}
                    />
                  ))}
                  {subjects.length > 5 && (
                    <span className="text-[9px] font-bold text-[#8A817B] leading-[7px]">
                      +{subjects.length - 5}
                    </span>
                  )}
                </div>
              )}

              {/* All-done green check */}
              {allDone && (
                <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-[#0D9488] flex items-center justify-center shadow-sm">
                  <svg viewBox="0 0 10 10" className="w-2 h-2 stroke-white fill-none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 5.5l2 2L8 3.5" />
                  </svg>
                </div>
              )}

              {/* Progress fraction badge */}
              {hasSlots && !allDone && (
                <div className="absolute bottom-1.5 right-1.5">
                  <span className="text-[9px] font-bold text-[#8A817B] tabular-nums">
                    {doneCount}/{slots.length}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Hover Popover ── */}
      <AnimatePresence>
        {hoverDate && hoveredSlots.length > 0 && (
          <motion.div
            key={hoverDate}
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onMouseEnter={() => clearTimeout(hoverTimer.current)}
            onMouseLeave={hidePopover}
            className="absolute z-50 w-72 bg-white rounded-2xl shadow-2xl border border-[#EDE7E1] overflow-hidden"
            style={popoverStyle}
          >
            {/* Popover header */}
            <div className="px-4 py-3 bg-[#FDFAF8] border-b border-[#F1ECE6]">
              <p className="text-[11px] font-extrabold text-[#1E1B16] uppercase tracking-widest">
                {new Date(`${hoverDate}T12:00:00`).toLocaleDateString(undefined, {
                  weekday: 'long', month: 'long', day: 'numeric',
                })}
              </p>
              <p className="text-[11px] text-[#8A817B] mt-0.5">
                {hoveredSlots.length} session{hoveredSlots.length !== 1 ? 's' : ''} ·{' '}
                {hoveredSlots.filter(s => s.status === 'completed').length} done
              </p>
            </div>

            {/* Task list */}
            <div className="max-h-60 overflow-y-auto divide-y divide-[#F1ECE6]">
              {hoveredSlots.map(slot => {
                const subjectName = slot.plan_subjects?.subject_name || slot.subject_name || 'Study'
                const st = subjectStyle(subjectName)
                const done = slot.status === 'completed'
                const startT = parseTime(slot.start_time || slot.scheduled_start)
                const endT = parseTime(slot.end_time || slot.scheduled_end)

                return (
                  <div key={slot.id} className={`flex items-start gap-3 px-4 py-2.5 ${done ? 'opacity-60' : ''}`}>
                    {/* Subject colour bar */}
                    <div
                      className="w-[3px] rounded-full self-stretch min-h-[32px] flex-shrink-0 mt-0.5"
                      style={{ background: done ? '#0D9488' : st.primary }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold text-[#1E1B16] truncate ${done ? 'line-through' : ''}`}>
                        {slot.topic || 'Study session'}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: st.tint, color: st.primary }}
                        >
                          {subjectName}
                        </span>
                        {startT && (
                          <span className="text-[10px] text-[#8A817B]">
                            {startT}{endT ? ` – ${endT}` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    {done && (
                      <div className="w-5 h-5 rounded-full bg-[#0D9488] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg viewBox="0 0 10 10" className="w-3 h-3 stroke-white fill-none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 5.5l2 2L8 3.5" />
                        </svg>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
