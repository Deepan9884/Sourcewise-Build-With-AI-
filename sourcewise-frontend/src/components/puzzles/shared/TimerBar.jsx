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
  // Vibrant game colors: teal -> amber -> rose
  const barColor = pct > 50 ? '#0D9488' : pct > 25 ? '#D97706' : '#E11D48'
  const glow = pct > 50 ? 'rgba(13,148,136,0.3)' : pct > 25 ? 'rgba(217,119,6,0.3)' : 'rgba(225,29,72,0.4)'
  
  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60

  return (
    <div className="flex items-center gap-3 w-full">
      <span
        className={`text-sm font-black tabular-nums font-mono w-12 text-right transition-colors ${pct <= 25 ? 'text-rose-600 animate-pulse font-extrabold' : 'text-[#1E1B16]'}`}
      >
        {mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `0:${String(remaining).padStart(2, '0')}`}
      </span>
      <div className="flex-1 h-2 bg-[#EAE4DC] border border-[#DFD6CD] rounded-full overflow-hidden shadow-inner">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: barColor, boxShadow: `0 0 8px ${glow}` }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'linear' }}
        />
      </div>
    </div>
  )
}
