import { useState, useEffect, useMemo, useRef } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, Trophy, BookOpen, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { subjectStyle } from '../planner/utils/subjectPalette'
import { studyPlansApi } from '../../lib/studyPlansApi'
import { useStudentEvents, getCategoryStyle } from '../../lib/studentEvents'
import { usePlannerStore } from '../../store/plannerStore'
import CalendarActionMenu from './CalendarActionMenu'
import AddEventModal from './AddEventModal'

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
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(dt)) {
    const [h, m] = dt.split(':')
    const d = new Date()
    d.setHours(Number(h), Number(m), 0, 0)
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }
  try {
    const d = new Date(dt)
    if (isNaN(d.getTime())) return dt
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return dt
  }
}

/**
 * StudyCalendar — full monthly calendar in My Plan.
 * Reflects study plan sessions AND student events (hackathons, workshops, symposiums, etc.)
 * Supports tapping calendar icon to add/delete events, and quick delete/add right on any date.
 */
export default function StudyCalendar({ planId }) {
  const store = usePlannerStore()
  const effectivePlanId = planId || store.currentPlan?.id || store.plans?.[0]?.id || 'plan-demo-ml-2026'

  const today = useMemo(() => new Date(), [])
  const [viewYear, setViewYear] = useState(() => today.getFullYear())
  const [viewMonth, setViewMonth] = useState(() => today.getMonth())
  const [hoverDate, setHoverDate] = useState(null)
  const [pinnedDate, setPinnedDate] = useState(null)
  const [popoverStyle, setPopoverStyle] = useState({})
  const [scheduleData, setScheduleData] = useState([])
  const [loading, setLoading] = useState(false)
  const [quickAddDate, setQuickAddDate] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)

  const hoverTimer = useRef(null)
  const rootRef = useRef(null)

  // Real-time student events hook
  const { events: studentEvents, deleteEvent: removeEvent } = useStudentEvents()

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Build calendar grid: cells[] of YYYY-MM-DD strings
  const { from, to, cells, todayStr } = useMemo(() => {
    const todayStr = fmt(today)
    const firstDay = new Date(viewYear, viewMonth, 1)
    const lastDay = new Date(viewYear, viewMonth + 1, 0)
    const startPad = firstDay.getDay() // Sunday = 0
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
  }, [viewYear, viewMonth, today])

  // Fetch schedule for the visible month
  useEffect(() => {
    if (!effectivePlanId) return
    let cancelled = false
    const fetchSchedule = async () => {
      setLoading(true)
      try {
        const data = await studyPlansApi.schedule(effectivePlanId, from, to)
        if (!cancelled) {
          const arr = Array.isArray(data) ? data : (data?.slots || [])
          setScheduleData(arr)
        }
      } catch {
        if (!cancelled) setScheduleData([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchSchedule()
    return () => { cancelled = true }
  }, [effectivePlanId, from, to])

  // Index study slots by date
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

  // Index student events by date (supports multi-day spans)
  const eventsByDate = useMemo(() => {
    const map = {}
    for (const ev of studentEvents) {
      if (!ev.startDate) continue
      const start = ev.startDate
      const end = ev.endDate && ev.endDate >= start ? ev.endDate : start

      // Spread multi-day event across days (capped at 60 to prevent accidental runaways)
      let cur = new Date(`${start}T00:00:00`)
      const stop = new Date(`${end}T00:00:00`)
      let safety = 0
      while (cur <= stop && safety < 60) {
        const dStr = fmt(cur)
        if (!map[dStr]) map[dStr] = []
        map[dStr].push(ev)
        cur.setDate(cur.getDate() + 1)
        safety++
      }
    }
    return map
  }, [studentEvents])

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

  // Popover positioning & display
  const showPopover = (date, e, isClick = false) => {
    clearTimeout(hoverTimer.current)
    const hasSlots = (slotsByDate[date]?.length || 0) > 0
    const hasEvents = (eventsByDate[date]?.length || 0) > 0
    if (!hasSlots && !hasEvents && !isClick) return
    if (!rootRef.current) return

    const cellRect = e.currentTarget.getBoundingClientRect()
    const rootRect = rootRef.current.getBoundingClientRect()

    let left = cellRect.left - rootRect.left
    let top = cellRect.bottom - rootRect.top + 8

    // Keep popover inside container width
    const pWidth = 320
    if (left + pWidth > rootRect.width) left = rootRect.width - pWidth - 8
    if (left < 0) left = 8

    setPopoverStyle({ top, left })
    setHoverDate(date)
    if (isClick) {
      setPinnedDate(date)
    }
  }

  const hidePopover = () => {
    if (pinnedDate) return // Keep open if pinned by user click
    hoverTimer.current = setTimeout(() => setHoverDate(null), 180)
  }

  const activeDate = pinnedDate || hoverDate
  const hoveredSlots = activeDate ? (slotsByDate[activeDate] || []) : []
  const hoveredEvents = activeDate ? (eventsByDate[activeDate] || []) : []

  const studyDays = Object.keys(slotsByDate).filter(d => d >= from && d <= to).length
  const eventsThisMonth = Object.entries(eventsByDate)
    .filter(([d]) => d >= from && d <= to)
    .reduce((acc, [, evts]) => acc + evts.length, 0)

  const handleDeleteEvent = (id, title) => {
    removeEvent(id)
    showToast(`Removed "${title}" from calendar`)
  }

  return (
    <div ref={rootRef} className="relative bg-white rounded-2xl border border-[#EDE7E1] shadow-sm" data-calendar-root>
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-3 right-5 z-[80] px-3.5 py-1.5 rounded-full bg-[#1E1B16] text-white text-xs font-bold shadow-lg flex items-center gap-1.5"
          >
            <span>✨</span>
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between px-5 py-4 border-b border-[#F1ECE6] gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-[#1E1B16] text-[15px]">
              {MONTHS[viewMonth]} {viewYear}
            </h2>
            {eventsThisMonth > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-extrabold flex items-center gap-1">
                <span>📅</span>
                <span>{eventsThisMonth} event{eventsThisMonth !== 1 ? 's' : ''}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-[#8A817B] mt-0.5">
            {loading
              ? 'Loading schedule…'
              : planId
                ? `${studyDays} study day${studyDays !== 1 ? 's' : ''} this month`
                : 'Study plan sessions & student portfolio events combined'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Calendar Actions Menu (Add Event / Delete Event) */}
          <CalendarActionMenu
            variant="button"
            onEventChanged={() => {}}
          />

          <button
            onClick={goToday}
            className="h-8 px-3 rounded-full text-xs font-bold bg-[#F1ECE6] text-[#5B544E] hover:bg-[#EDE7E1] hover:text-[#1E1B16] transition-colors"
          >
            Today
          </button>

          <div className="flex items-center gap-0.5">
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
          const dayEvents = eventsByDate[date] || []
          const doneCount = slots.filter(s => s.status === 'completed').length
          const allDone = slots.length > 0 && doneCount === slots.length
          const hasSlots = slots.length > 0
          const hasEvents = dayEvents.length > 0
          const dayNum = parseInt(date.slice(8), 10)
          const isPinned = pinnedDate === date

          return (
            <div
              key={date}
              className={`relative bg-white min-h-[82px] sm:min-h-[88px] p-2 select-none transition-all cursor-pointer
                ${isCurrentMonth ? 'hover:bg-[#FDFAF8]' : 'opacity-40 hover:opacity-75'}
                ${isPinned ? 'ring-2 ring-teal bg-[#F0FDFA]' : ''}
              `}
              onMouseEnter={e => showPopover(date, e, false)}
              onMouseLeave={hidePopover}
              onClick={e => showPopover(date, e, true)}
              title={`${date}: ${dayEvents.length} events, ${slots.length} study sessions`}
            >
              {/* Day number & Quick Event indicator */}
              <div className="flex items-center justify-between">
                <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold
                  ${isToday
                    ? 'bg-[#E8845F] text-white shadow-xs'
                    : 'text-[#1E1B16]'}
                `}>
                  {dayNum}
                </div>

                {/* Event count tag if events exist */}
                {hasEvents && (
                  <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100/90 border border-emerald-300/80 px-1.5 py-0.2 rounded-md shadow-2xs">
                    📅 {dayEvents.length}
                  </span>
                )}
              </div>

              {/* Events chips / badges */}
              {hasEvents && (
                <div className="mt-1 space-y-0.5">
                  {dayEvents.slice(0, 1).map((ev) => {
                    const st = getCategoryStyle(ev.category)
                    return (
                      <div
                        key={ev.id}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border truncate flex items-center gap-1 shadow-2xs ${st.bg} ${st.border} ${st.text}`}
                        title={`${ev.category}: ${ev.title}`}
                      >
                        <Trophy className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{ev.title}</span>
                      </div>
                    )
                  })}
                  {dayEvents.length > 1 && (
                    <span className="text-[9px] font-bold text-emerald-700 block px-0.5 leading-none">
                      +{dayEvents.length - 1} more event{dayEvents.length - 1 !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )}

              {/* Study session chips when no event */}
              {!hasEvents && slots.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {slots.slice(0, 1).map((s) => {
                    const subjName = s.plan_subjects?.subject_name || s.subject_name || 'Study'
                    const st = subjectStyle(subjName)
                    return (
                      <div
                        key={s.id}
                        className="px-1.5 py-0.5 rounded text-[10px] font-semibold border truncate flex items-center gap-1 shadow-2xs"
                        style={{ background: st.bg, borderColor: st.border, color: st.primary }}
                        title={`${subjName}: ${s.topic}`}
                      >
                        <BookOpen className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{s.topic || subjName}</span>
                      </div>
                    )
                  })}
                  {slots.length > 1 && (
                    <span className="text-[9px] font-medium text-[#8A817B] block px-0.5 leading-none">
                      +{slots.length - 1} more session{slots.length - 1 !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )}

              {/* Subject study colour dots */}
              {subjects.length > 0 && (
                <div className="flex flex-wrap gap-[3px] mt-1.5 px-0.5">
                  {subjects.slice(0, 5).map(({ name, style }) => (
                    <span
                      key={name}
                      className="w-[7px] h-[7px] rounded-full flex-shrink-0 ring-1 ring-white"
                      style={{ background: style.primary }}
                      title={name}
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
                <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-[#0D9488] flex items-center justify-center shadow-xs">
                  <svg viewBox="0 0 10 10" className="w-2 h-2 stroke-white fill-none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 5.5l2 2L8 3.5" />
                  </svg>
                </div>
              )}

              {/* Progress fraction badge */}
              {hasSlots && !allDone && !hasEvents && (
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

      {/* ── Hover / Click Day Popover ── */}
      <AnimatePresence>
        {activeDate && (hoveredSlots.length > 0 || hoveredEvents.length > 0 || pinnedDate) && (
          <motion.div
            key={activeDate}
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onMouseEnter={() => clearTimeout(hoverTimer.current)}
            onMouseLeave={hidePopover}
            className="absolute z-50 w-80 bg-white rounded-2xl shadow-2xl border border-[#EDE7E1] overflow-hidden"
            style={popoverStyle}
          >
            {/* Popover header */}
            <div className="px-4 py-3 bg-[#FDFAF8] border-b border-[#F1ECE6] flex items-center justify-between">
              <div>
                <p className="text-[11px] font-extrabold text-[#1E1B16] uppercase tracking-widest">
                  {new Date(`${activeDate}T12:00:00`).toLocaleDateString(undefined, {
                    weekday: 'short', month: 'short', day: 'numeric',
                  })}
                </p>
                <p className="text-[11px] text-[#8A817B] mt-0.5">
                  {hoveredEvents.length} event{hoveredEvents.length !== 1 ? 's' : ''} ·{' '}
                  {hoveredSlots.length} study session{hoveredSlots.length !== 1 ? 's' : ''}
                </p>
              </div>

              {pinnedDate ? (
                <button
                  onClick={() => setPinnedDate(null)}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[#8A817B] hover:text-[#1E1B16] hover:bg-[#F1ECE6]"
                  title="Close inspector"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <span className="text-[10px] text-[#A89F91] font-medium">Click to pin</span>
              )}
            </div>

            {/* Content Area */}
            <div className="max-h-72 overflow-y-auto divide-y divide-[#F1ECE6]">
              {/* 1. Student Events Section */}
              {hoveredEvents.length > 0 && (
                <div className="p-3 bg-emerald-50/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-emerald-600" />
                      <span>Events &amp; Competitions</span>
                    </span>
                    <button
                      onClick={() => setQuickAddDate(activeDate)}
                      className="text-[10px] font-bold text-teal hover:underline flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" /> Add Event
                    </button>
                  </div>

                  <div className="space-y-2">
                    {hoveredEvents.map((ev) => {
                      const st = getCategoryStyle(ev.category)
                      return (
                        <div
                          key={ev.id}
                          className="p-2.5 rounded-xl bg-white border border-emerald-200/80 shadow-2xs flex items-start justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span
                                className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${st.bg} ${st.border} ${st.text}`}
                              >
                                {ev.category}
                              </span>
                              {ev.mode && (
                                <span className="text-[9px] text-[#8A817B]">
                                  • {ev.mode}
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-bold text-[#1E1B16] truncate">
                              {ev.title}
                            </p>
                            {(ev.venue || ev.organizer) && (
                              <p className="text-[10px] text-[#8A817B] truncate mt-0.5">
                                {ev.venue ? `📍 ${ev.venue}` : ev.organizer}
                              </p>
                            )}
                          </div>

                          {/* Quick Delete Button */}
                          <button
                            onClick={() => handleDeleteEvent(ev.id, ev.title)}
                            className="p-1 rounded-lg text-rose-500 hover:text-white hover:bg-rose-500 transition-colors shrink-0"
                            title="Delete this event"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 2. Study Plan Slots Section */}
              {hoveredSlots.length > 0 && (
                <div className="divide-y divide-[#F1ECE6]">
                  {hoveredSlots.map(slot => {
                    const subjectName = slot.plan_subjects?.subject_name || slot.subject_name || 'Study'
                    const st = subjectStyle(subjectName)
                    const done = slot.status === 'completed'
                    const startT = parseTime(slot.start_time || slot.scheduled_start)
                    const endT = parseTime(slot.end_time || slot.scheduled_end)

                    return (
                      <div key={slot.id} className={`flex items-start gap-3 px-4 py-2.5 ${done ? 'opacity-60' : ''}`}>
                        <div
                          className="w-[3px] rounded-full self-stretch min-h-[32px] flex-shrink-0 mt-0.5"
                          style={{ background: done ? '#0D9488' : st.primary }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold text-[#1E1B16] truncate ${done ? 'line-through' : ''}`}>
                            {slot.topic || 'Study session'}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
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
                          <div className="w-4 h-4 rounded-full bg-[#0D9488] flex items-center justify-center flex-shrink-0 mt-0.5">
                            <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 stroke-white fill-none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M2 5.5l2 2L8 3.5" />
                            </svg>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Empty state in inspector */}
              {hoveredEvents.length === 0 && hoveredSlots.length === 0 && (
                <div className="p-4 text-center">
                  <p className="text-xs text-[#8A817B]">No events or study blocks scheduled for this date.</p>
                </div>
              )}
            </div>

            {/* Quick Actions Footer */}
            <div className="p-2.5 bg-[#FDFAF8] border-t border-[#F1ECE6] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setQuickAddDate(activeDate)}
                className="w-full py-1.5 px-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 hover:bg-teal-100 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Event on this day</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Add Event Modal when triggered from Day Popover */}
      <AddEventModal
        isOpen={!!quickAddDate}
        onClose={() => setQuickAddDate(null)}
        initialDate={quickAddDate}
        onEventAdded={(newEvent) => {
          showToast(`Added "${newEvent.title}" on ${newEvent.startDate}!`)
        }}
      />
    </div>
  )
}
