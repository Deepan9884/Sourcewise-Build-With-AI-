import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Circle, ChevronDown, BookOpen, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { subjectStyle } from '../planner/utils/subjectPalette'
import { usePlannerStore } from '../../store/plannerStore'

function parseTime(dt) {
  if (!dt) return ''
  try { return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  catch { return '' }
}

function isNow(slot) {
  try {
    const now = Date.now()
    const start = new Date(slot.start_time || slot.scheduled_start).getTime()
    const end = new Date(slot.end_time || slot.scheduled_end).getTime()
    return Number.isFinite(start) && Number.isFinite(end) && now >= start && now <= end
  } catch { return false }
}

function sortByTime(slots) {
  return [...slots].sort((a, b) => {
    const ta = a.start_time || a.scheduled_start || ''
    const tb = b.start_time || b.scheduled_start || ''
    return ta.localeCompare(tb)
  })
}

/**
 * LearningSection — Today's schedule timeline + per-subject task panels.
 *
 * Top: vertical timeline of today's sessions (sorted by start_time).
 * Bottom: subject panel grid — click to expand tasks, tap circle to complete.
 */
export default function LearningSection() {
  const navigate = useNavigate()
  const store = usePlannerStore()
  const { todaySlots } = store

  const [completingIds, setCompletingIds] = useState(new Set())
  const [expandedSubject, setExpandedSubject] = useState(null)

  const sorted = useMemo(() => sortByTime(todaySlots), [todaySlots])

  // Group by subject for the bottom panel grid
  const subjectGroups = useMemo(() => {
    const map = new Map()
    for (const slot of sorted) {
      const name = slot.plan_subjects?.subject_name || slot.subject_name || 'General'
      if (!map.has(name)) map.set(name, [])
      map.get(name).push(slot)
    }
    return [...map.entries()].map(([name, slots]) => ({
      name,
      slots,
      style: subjectStyle(name),
      done: slots.filter(s => s.status === 'completed').length,
      total: slots.length,
    }))
  }, [sorted])

  const handleComplete = async (slot) => {
    if (slot.status === 'completed' || completingIds.has(slot.id)) return
    setCompletingIds(prev => new Set(prev).add(slot.id))
    try { await store.completeSlot(slot.id, {}) }
    catch { /* silent */ }
    finally { setCompletingIds(prev => { const n = new Set(prev); n.delete(slot.id); return n }) }
  }

  const handleStart = (slot) => {
    navigate('/knowledge', {
      state: {
        subject: slot.plan_subjects?.subject_name || slot.subject_name,
        topic: slot.topic,
      },
    })
  }

  // ── Empty state ──
  if (todaySlots.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#EDE7E1] shadow-sm p-10 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#F1ECE6] flex items-center justify-center mx-auto mb-3">
          <BookOpen className="w-5 h-5 text-[#8A817B]" />
        </div>
        <p className="font-bold text-[#1E1B16]">No sessions scheduled today</p>
        <p className="text-sm text-[#8A817B] mt-1">
          Create a study plan to populate your daily schedule.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* ══ Today's Learning Schedule ══ */}
      <div className="bg-white rounded-2xl border border-[#EDE7E1] shadow-sm overflow-hidden">
        {/* Section header */}
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#F1ECE6]">
          <div className="w-8 h-8 rounded-xl bg-[#F1ECE6] flex items-center justify-center flex-shrink-0">
            <Clock className="w-4 h-4 text-[#5B544E]" />
          </div>
          <div>
            <h3 className="font-bold text-[#1E1B16] text-[15px]">Today's Learning Schedule</h3>
            <p className="text-xs text-[#8A817B] mt-0.5">
              {sorted.filter(s => s.status === 'completed').length} of {sorted.length} sessions complete
            </p>
          </div>
        </div>

        {/* Timeline rows */}
        <div className="divide-y divide-[#F1ECE6]">
          {sorted.map((slot, i) => {
            const subjectName = slot.plan_subjects?.subject_name || slot.subject_name || 'Study'
            const st = subjectStyle(subjectName)
            const done = slot.status === 'completed'
            const active = !done && isNow(slot)
            const completing = completingIds.has(slot.id)
            const startT = parseTime(slot.start_time || slot.scheduled_start)
            const endT = parseTime(slot.end_time || slot.scheduled_end)

            return (
              <motion.div
                key={slot.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.035, ease: [0.16, 1, 0.3, 1] }}
                className={`flex items-center gap-4 px-5 py-3.5 transition-colors
                  ${active ? 'bg-[#FDFAF8]' : ''}
                  ${done ? 'opacity-55' : ''}
                `}
              >
                {/* Time label */}
                <div className="w-12 flex-shrink-0 text-right">
                  <span className="text-[11px] font-semibold text-[#5B544E] tabular-nums leading-tight">
                    {startT || '—'}
                  </span>
                </div>

                {/* Subject colour bar */}
                <div
                  className="w-[3px] self-stretch rounded-full flex-shrink-0"
                  style={{ background: done ? '#0D9488' : st.primary, minHeight: 36 }}
                />

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-semibold text-sm text-[#1E1B16] truncate ${done ? 'line-through' : ''}`}>
                      {slot.topic || 'Study session'}
                    </p>
                    {active && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8845F] text-white shrink-0 animate-pulse">
                        Now
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                      style={{ background: st.tint, color: st.primary }}
                    >
                      {subjectName}
                    </span>
                    {endT && (
                      <span className="text-[11px] text-[#8A817B]">
                        until {endT}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {done ? (
                    <div className="w-8 h-8 rounded-full bg-[#0D9488] flex items-center justify-center shadow-sm">
                      <svg viewBox="0 0 10 10" className="w-4 h-4 stroke-white fill-none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 5.5l2 2L8 3.5" />
                      </svg>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleStart(slot)}
                        className="h-8 px-3 rounded-full bg-[#F1ECE6] text-[#1E1B16] text-xs font-bold hover:bg-[#EDE7E1] transition-colors flex items-center gap-1.5"
                      >
                        <Play className="w-3 h-3" />
                        Start
                      </button>
                      <button
                        onClick={() => handleComplete(slot)}
                        disabled={completing}
                        title="Mark complete"
                        className="w-8 h-8 rounded-full border-2 border-[#D1D5DB] hover:border-[#0D9488] hover:text-[#0D9488] text-[#8A817B] flex items-center justify-center transition-all disabled:opacity-50"
                      >
                        {completing
                          ? <div className="w-3.5 h-3.5 rounded-full border-2 border-[#0D9488] border-t-transparent animate-spin" />
                          : <Circle className="w-4 h-4" />
                        }
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* ══ Subject Panels Grid ══ */}
      <div>
        <h3 className="text-[11px] font-extrabold text-[#8A817B] uppercase tracking-widest mb-3 px-1">
          Subjects enrolled today
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {subjectGroups.map(({ name, slots, style, done, total }) => {
            const expanded = expandedSubject === name
            const allDone = total > 0 && done === total
            const pct = total ? Math.round((done / total) * 100) : 0

            return (
              <div
                key={name}
                className="rounded-2xl border-2 bg-white overflow-hidden transition-all duration-200"
                style={{
                  borderColor: expanded ? style.primary : '#EDE7E1',
                  boxShadow: expanded ? `0 8px 24px -12px ${style.primary}55` : undefined,
                }}
              >
                {/* Card header button */}
                <button
                  className="w-full flex items-center gap-3 p-4 text-left group"
                  onClick={() => setExpandedSubject(expanded ? null : name)}
                  aria-expanded={expanded}
                >
                  {/* Sigil */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 transition-transform group-hover:scale-105"
                    style={{ background: style.tint }}
                  >
                    {style.sigil}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#1E1B16] text-sm truncate">{name}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {/* Progress bar */}
                      <div className="flex-1 h-1.5 rounded-full bg-[#F1ECE6] overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: allDone ? '#0D9488' : style.primary }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-[#5B544E] shrink-0 tabular-nums">
                        {done}/{total}
                      </span>
                    </div>
                  </div>

                  {/* Right icon */}
                  {allDone ? (
                    <div className="w-6 h-6 rounded-full bg-[#0D9488] flex items-center justify-center flex-shrink-0">
                      <svg viewBox="0 0 10 10" className="w-3.5 h-3.5 stroke-white fill-none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 5.5l2 2L8 3.5" />
                      </svg>
                    </div>
                  ) : (
                    <ChevronDown
                      className="w-4 h-4 text-[#8A817B] flex-shrink-0 transition-transform duration-200"
                      style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    />
                  )}
                </button>

                {/* Expandable task list */}
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div
                      key="tasks"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-[#F1ECE6] divide-y divide-[#F1ECE6]">
                        {slots.map((slot) => {
                          const taskDone = slot.status === 'completed'
                          const completing = completingIds.has(slot.id)
                          const startT = parseTime(slot.start_time || slot.scheduled_start)
                          const endT = parseTime(slot.end_time || slot.scheduled_end)

                          return (
                            <div
                              key={slot.id}
                              className={`flex items-center gap-3 px-4 py-3 transition-colors ${taskDone ? 'bg-[#FDFAF8]' : ''}`}
                            >
                              {/* Completion button */}
                              <button
                                onClick={() => handleComplete(slot)}
                                disabled={taskDone || completing}
                                title={taskDone ? 'Completed' : 'Mark as complete'}
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                                  ${taskDone
                                    ? 'border-[#0D9488] bg-[#0D9488] cursor-default'
                                    : 'border-[#D1D5DB] hover:border-[#0D9488] hover:shadow-[0_0_0_3px_#0D948815]'
                                  }
                                `}
                              >
                                {completing
                                  ? <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                  : taskDone
                                    ? (
                                      <svg viewBox="0 0 10 10" className="w-3.5 h-3.5 stroke-white fill-none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M2 5.5l2 2L8 3.5" />
                                      </svg>
                                    )
                                    : null
                                }
                              </button>

                              {/* Task info */}
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate ${taskDone ? 'text-[#8A817B] line-through' : 'text-[#1E1B16]'}`}>
                                  {slot.topic || 'Study session'}
                                </p>
                                {(startT || endT) && (
                                  <p className="text-[11px] text-[#8A817B] mt-0.5">
                                    {startT}{endT ? ` – ${endT}` : ''}
                                  </p>
                                )}
                              </div>

                              {/* Status pill or Start button */}
                              {taskDone ? (
                                <motion.span
                                  initial={{ scale: 0.8, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D1FAE5] text-[#065F46] shrink-0"
                                >
                                  ✓ Completed
                                </motion.span>
                              ) : (
                                <button
                                  onClick={() => handleStart(slot)}
                                  className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#F1ECE6] text-[#5B544E] hover:bg-[#EDE7E1] shrink-0 flex items-center gap-1 transition-colors"
                                >
                                  <Play className="w-2.5 h-2.5" />
                                  Start
                                </button>
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
          })}
        </div>
      </div>
    </div>
  )
}
