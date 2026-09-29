import { motion } from 'framer-motion'
import SubjectSigil from './primitives/SubjectSigil'
import MasteryRing from './primitives/MasteryRing'
import { subjectStyle } from './utils/subjectPalette'
import { daysUntil } from './utils/dateHelpers'

/**
 * SubjectCard — elegant chapter tab: sigil, exam ribbon, mastery ring.
 */
export default function SubjectCard({ subject, onSelect, selected }) {
  const st = subjectStyle(subject.subject_name || '')
  const color = subject.color || st.primary
  const left = daysUntil(subject.exam_date)
  const mastery = Math.round(subject.current_mastery || 0)
  return (
    <motion.button
      layout
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onSelect?.(subject)}
      aria-pressed={!!selected}
      className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all bg-white ${selected ? 'shadow-md' : 'shadow-xs hover:shadow-sm'}`}
      style={selected ? { borderColor: color, boxShadow: `0 10px 24px -12px ${color}88` } : { borderColor: '#EDE7E1' }}
    >
      <div className="flex items-center gap-2.5">
        <SubjectSigil sigil={st.sigil} tint={st.tint} ring={color} size="md" />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm text-[#1E1B16] truncate">{subject.subject_name}</p>
          <p className="text-[11px] text-[#8A817B]">
            {left == null ? 'No exam date' : left === 0 ? 'Exam today 🔥' : left < 0 ? 'Exam passed' : `${left} day${left === 1 ? '' : 's'} to exam`}
            {subject.difficulty_estimate ? ` · ${subject.difficulty_estimate}` : ''}
          </p>
        </div>
        <MasteryRing value={mastery} size={52} stroke={6} color={color} />
      </div>
      <div className="mt-2.5 h-1.5 rounded-full bg-[#F1ECE6] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}, ${color}99)` }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, mastery)}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px]">
        <span className="font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}16`, color }}>
          Priority {Number(subject.priority_score || 1).toFixed(1)}
        </span>
        <span className="text-[#8A817B] tabular-nums">Target {Math.round(subject.target_mastery || 80)}%</span>
      </div>
    </motion.button>
  )
}
