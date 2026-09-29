import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

export default function TimerBar({ duration = 60, onExpire, paused = false }) {
  const [remaining, setRemaining] = useState(duration)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (paused) {
      clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          onExpire?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [paused, onExpire])

  const pct = (remaining / duration) * 100
  // Neon colors: cyan -> amber -> red
  const barColor = pct > 50 ? '#06b6d4' : pct > 25 ? '#f59e0b' : '#ef4444'
  const glow = pct > 50 ? 'rgba(6,182,212,0.8)' : pct > 25 ? 'rgba(245,158,11,0.8)' : 'rgba(239,68,68,1)'
  
  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60

  return (
    <div className="flex items-center gap-3 w-full">
      <span
        className={`text-sm font-black tabular-nums font-mono w-12 text-right transition-colors ${pct <= 25 ? 'text-red-500 animate-pulse' : 'text-zinc-300'}`}
      >
        {mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `0:${String(remaining).padStart(2, '0')}`}
      </span>
      <div className="flex-1 h-1.5 bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: barColor, boxShadow: `0 0 10px ${glow}` }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'linear' }}
        />
      </div>
    </div>
  )
}
