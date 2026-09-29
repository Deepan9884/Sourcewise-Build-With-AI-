import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, RotateCcw, ArrowLeft, Trophy, Clock, Lightbulb } from 'lucide-react'

const GRADES = [
  { min: 95, letter: 'S', label: 'FLAWLESS EXECUTION', color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', ring: 'border-fuchsia-500/50', glow: 'shadow-[0_0_30px_rgba(217,70,239,0.3)]' },
  { min: 80, letter: 'A', label: 'OPTIMAL RUN',       color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    ring: 'border-cyan-500/50',    glow: 'shadow-[0_0_30px_rgba(6,182,212,0.3)]' },
  { min: 60, letter: 'B', label: 'SIMULATION PASSED',  color: 'text-emerald-400', bg: 'bg-emerald-500/10', ring: 'border-emerald-500/50', glow: 'shadow-[0_0_30px_rgba(16,185,129,0.3)]' },
  { min: 0,  letter: 'C', label: 'NEURAL DRIFT DETECTED', color: 'text-rose-400',    bg: 'bg-rose-500/10',    ring: 'border-rose-500/50',    glow: 'shadow-[0_0_30px_rgba(244,63,94,0.3)]' },
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
        className={`w-32 h-32 rounded-none rotate-45 border-2 ${grade.ring} ${grade.bg} flex items-center justify-center ${grade.glow}`}
      >
        <div className="-rotate-45 flex flex-col items-center">
          <span className={`text-5xl font-black ${grade.color}`}>{grade.letter}</span>
        </div>
      </motion.div>

      {/* Label */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="flex flex-col items-center gap-1">
        <p className="text-[10px] text-zinc-500 font-bold tracking-[0.3em] uppercase">Simulation Result</p>
        <p className={`text-2xl font-black tracking-widest uppercase ${grade.color}`}>{grade.label}</p>
        <p className="text-sm font-mono text-zinc-400 mt-1">Accuracy: {pct}%</p>
      </motion.div>

      {/* Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="w-full max-w-md grid grid-cols-3 gap-4"
      >
        {[
          { icon: Trophy,    label: 'Score',    value: `${score}/${maxScore}`,  color: 'text-amber-400', border: 'border-amber-500/30' },
          { icon: Clock,     label: 'Time',     value: fmtTime(timeSeconds),    color: 'text-cyan-400',  border: 'border-cyan-500/30' },
          { icon: Lightbulb, label: 'Assists',  value: hintsUsed,               color: 'text-rose-400',  border: 'border-rose-500/30' },
        ].map((stat) => (
          <div key={stat.label} className={`bg-zinc-900/50 border ${stat.border} rounded-xl p-4 flex flex-col items-center gap-2`}>
            <stat.icon className={`w-5 h-5 ${stat.color} opacity-80`} />
            <p className={`text-xl font-black ${stat.color} font-mono tracking-wider`}>{stat.value}</p>
            <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* XP Banner */}
      {xpEarned > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.45, type: 'spring', stiffness: 300 }}
          className="flex items-center gap-3 px-6 py-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.2)] mt-2"
        >
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <span className="text-xl font-black tracking-widest text-indigo-400 font-mono">+{xpDisplay} XP</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400/70">Extracted</span>
        </motion.div>
      )}

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
        className="flex gap-4 w-full max-w-md mt-4"
      >
        <button
          onClick={onBack}
          className="flex-1 flex items-center justify-center gap-2 h-12 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-400 font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-zinc-800 hover:text-white transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Hub
        </button>
        <button
          onClick={onPlayAgain}
          className="flex-1 flex items-center justify-center gap-2 h-12 rounded-lg bg-zinc-100 text-zinc-900 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)]"
        >
          <RotateCcw className="w-4 h-4" />
          Reboot
        </button>
      </motion.div>
    </motion.div>
  )
}
