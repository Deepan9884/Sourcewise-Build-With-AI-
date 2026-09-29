import { motion } from 'framer-motion'
import WaxSeal from './primitives/WaxSeal'
import SubjectSigil from './primitives/SubjectSigil'
import { subjectStyle } from './utils/subjectPalette'
import { hhmm } from './utils/dateHelpers'

/**
 * TodayFocusPanel — illuminated daily focus with wax-seal actions.
 */
export default function TodayFocusPanel({ slots = [], mood, onComplete, onReschedule, onStartSession }) {
  const next = slots.find((s) => s.status === 'pending' || s.status === 'in_progress') || slots[0]
  if (!next) {
    return (
      <div className="p-6 rounded-2xl bg-white border border-[#EDE7E1] text-center shadow-xs">
        <div className="text-3xl mb-1">🍃</div>
        <p className="text-sm font-bold text-[#1E1B16]">A clear page today</p>
        <p className="text-xs text-[#5B544E] mt-0.5">Nothing scheduled — rest, or replan to pull work forward.</p>
      </div>
    )
  }
  const sub = next.plan_subjects || {}
  const st = subjectStyle(sub.subject_name || next.topic || '')
  const color = sub.color || st.primary
  const done = slots.filter((s) => s.status === 'completed').length
  const pct = Math.round((done / Math.max(slots.length, 1)) * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden p-5 rounded-2xl bg-white border border-[#EDE7E1] shadow-xs"
    >
      <div aria-hidden className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-50" style={{ background: `radial-gradient(circle, ${color}26, transparent 70%)` }} />
      <div className="relative">
        <div className="flex items-start gap-3">
          <SubjectSigil sigil={st.sigil} tint={st.tint} ring={color} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#8A817B]">Today&apos;s illumination</p>
            <h3 className="text-lg font-display font-bold text-[#1E1B16] leading-snug truncate">{next.topic || sub.subject_name}</h3>
            <p className="text-xs text-[#5B544E] mt-0.5 tabular-nums">
              ⏰ {hhmm(next.start_time)}–{hhmm(next.end_time)} · {next.duration_minutes} min
              {mood?.dominantMood ? ` · ${mood.dominantMood}` : ''}
            </p>
          </div>
          <WaxSeal color={next.status === 'completed' ? 'teal' : 'coral'} size="md" onPress={() => onComplete?.(next)} label={next.status === 'completed' ? 'Session sealed' : 'Seal session complete'}>
            <span>{next.status === 'completed' ? '✓' : '✔'}</span>
          </WaxSeal>
        </div>
        <div className="mt-3 h-2 rounded-full bg-[#F1ECE6] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#E8845F] to-[#0F766E]"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.7 }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-[#8A817B]">
          <span>{done} of {slots.length} sessions sealed</span>
          <span className="tabular-nums font-bold text-[#1E1B16]">{pct}%</span>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <button onClick={() => onStartSession?.(next)} className="sw-btn-primary !h-9 !px-4 !text-xs">
            Begin the rite →
          </button>
          <button onClick={() => onReschedule?.(next)} className="sw-btn-secondary !h-9 !px-4 !text-xs">
            Reschedule
          </button>
        </div>
      </div>
    </motion.div>
  )
}
