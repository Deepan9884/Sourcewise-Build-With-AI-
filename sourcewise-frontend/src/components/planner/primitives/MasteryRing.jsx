import { motion } from 'framer-motion'

/**
 * MasteryRing — animated SVG progress ring with subject-tinted gradient.
 */
export default function MasteryRing({ value = 0, size = 56, stroke = 6, color = '#E8845F', track = '#F1ECE6', label }) {
  const r = (size - stroke) / 2
  const circ = r * 2 * Math.PI
  const pct = Math.min(100, Math.max(0, value))
  const gid = `mr-${String(color).replace('#', '')}`
  return (
    <span className="relative inline-flex items-center justify-center" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label || `mastery ${Math.round(pct)} percent`}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={color} stopOpacity={0.55} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - (pct / 100) * circ }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.15 }}
          style={{ filter: `drop-shadow(0 2px 5px ${color}55)` }}
        />
      </svg>
      <span className="absolute text-[11px] font-extrabold tabular-nums text-[#1E1B16]">{Math.round(pct)}%</span>
    </span>
  )
}
