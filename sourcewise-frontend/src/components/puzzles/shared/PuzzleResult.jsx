import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, RotateCcw, ArrowLeft, Trophy, Clock, Lightbulb } from 'lucide-react'

const GRADES = [
  { min: 95, letter: 'S', label: 'Exceptional Mastery!', color: 'text-fuchsia-700', bg: 'bg-fuchsia-50', ring: 'border-fuchsia-400', glow: 'shadow-xl shadow-fuchsia-100 ring-4 ring-fuchsia-100' },
  { min: 80, letter: 'A', label: 'Great Performance!',   color: 'text-cyan-700',    bg: 'bg-cyan-50',    ring: 'border-cyan-400',    glow: 'shadow-xl shadow-cyan-100 ring-4 ring-cyan-100' },
  { min: 60, letter: 'B', label: 'Challenge Completed!',color: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'border-emerald-400', glow: 'shadow-xl shadow-emerald-100 ring-4 ring-emerald-100' },
  { min: 0,  letter: 'C', label: 'Keep Practicing!',    color: 'text-rose-700',    bg: 'bg-rose-50',    ring: 'border-rose-400',    glow: 'shadow-xl shadow-rose-100 ring-4 ring-rose-100' },
]

function getGrade(pct) {
  return GRADES.find(g => pct >= g.min) || GRADES[GRADES.length - 1]
}

function fmtTime(secs) {
  if (!secs) return '00:00'
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

/**
 * PuzzleResult — end screen shown after any puzzle is completed.
 * Props: score, maxScore, xpEarned, hintsUsed, timeSeconds, onPlayAgain, onBack
 */
export default function PuzzleResult({ score = 0, maxScore = 10, xpEarned = 0, hintsUsed = 0, timeSeconds = 0, onPlayAgain, onBack }) {
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
  const grade = getGrade(pct)
  const [xpDisplay, setXpDisplay] = useState(0)

  // Animate XP counter up
  useEffect(() => {
    if (xpEarned <= 0) return
    let current = 0
    const step = Math.ceil(xpEarned / 30)
    const iv = setInterval(() => {
      current = Math.min(current + step, xpEarned)
      setXpDisplay(current)
      if (current >= xpEarned) clearInterval(iv)
    }, 40)
    return () => clearInterval(iv)
  }, [xpEarned])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center gap-8 py-10 px-4 w-full h-full text-center"
    >
      {/* Grade Ring */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
        className={`w-32 h-32 rounded-3xl rotate-45 border-2 ${grade.ring} ${grade.bg} flex items-center justify-center ${grade.glow}`}
      >
        <div className="-rotate-45 flex flex-col items-center">
          <span className={`text-5xl font-black ${grade.color}`}>{grade.letter}</span>
        </div>
      </motion.div>

      {/* Label */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="flex flex-col items-center gap-1">
        <p className="text-xs text-[#7A7167] font-semibold tracking-wider uppercase font-sans">Session Complete</p>
        <p className={`text-2xl md:text-3xl font-bold font-sans ${grade.color}`}>{grade.label}</p>
        <p className="text-sm font-sans text-[#554E46] mt-1 font-medium">
          Accuracy: <span className="font-semibold text-[#1E1B16]">{pct}%</span>
        </p>
      </motion.div>

      {/* Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="w-full max-w-md grid grid-cols-3 gap-4"
      >
        {[
          { icon: Trophy,    label: 'Score',      value: `${score}/${maxScore}`, color: 'text-amber-700', border: 'border-amber-200' },
          { icon: Clock,     label: 'Time',       value: fmtTime(timeSeconds),   color: 'text-cyan-700',  border: 'border-cyan-200' },
          { icon: Lightbulb, label: 'Hints Used', value: hintsUsed,              color: 'text-rose-700',  border: 'border-rose-200' },
        ].map((stat) => (
          <div key={stat.label} className={`bg-white border ${stat.border} rounded-2xl p-4 flex flex-col items-center gap-1.5 shadow-xs`}>
            <stat.icon className={`w-5 h-5 ${stat.color} opacity-80`} />
            <p className={`text-xl font-bold ${stat.color} font-sans`}>{stat.value}</p>
            <p className="text-xs font-medium text-[#7A7167] font-sans">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* XP Banner */}
      {xpEarned > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.45, type: 'spring', stiffness: 300 }}
          className="flex items-center gap-3 px-6 py-3.5 bg-gradient-to-r from-[#FFF5EE] to-[#FFE6D8] border border-[#F3C5A8] rounded-2xl shadow-xs mt-2 text-[#C05A35]"
        >
          <Zap className="w-5 h-5 text-[#E8845F]" />
          <span className="text-lg font-bold text-[#C05A35] font-sans">+{xpDisplay} XP</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#C05A35]/80 font-sans">Earned</span>
        </motion.div>
      )}

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
        className="flex gap-4 w-full max-w-md mt-4"
      >
        <button
          onClick={onBack}
          className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl border border-[#DFD6CD] bg-white text-[#554E46] font-semibold text-xs uppercase tracking-wider font-sans hover:bg-[#F5F0EB] hover:text-[#1E1B16] transition-all shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Arena
        </button>
        <button
          onClick={onPlayAgain}
          className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl bg-gradient-to-r from-[#E8845F] to-[#C05A35] text-white font-semibold text-xs uppercase tracking-wider font-sans hover:from-[#ED926F] hover:to-[#D1643C] transition-all shadow-sm active:scale-98"
        >
          <RotateCcw className="w-4 h-4" />
          Play Again
        </button>
      </motion.div>
    </motion.div>
  )
}
