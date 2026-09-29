import { motion, AnimatePresence } from 'framer-motion'

const FOX_BY_MOOD = {
  energized: { face: '🦊', glow: '#E8845F', note: 'Ready to hunt big topics!' },
  focused: { face: '🦊', glow: '#0D9488', note: 'Locked in. Deep work mode.' },
  neutral: { face: '🦊', glow: '#D97706', note: 'Steady paws, steady mind.' },
  tired: { face: '🦊', glow: '#8A817B', note: 'Easy does it — short trails today.' },
  stressed: { face: '🦊', glow: '#DC2626', note: 'One small den at a time. You’ve got this.' },
  anxious: { face: '🦊', glow: '#7C3AED', note: 'Here’s the map. Step by step.' },
}

/**
 * FoxCompanion — animated mascot with mood aura, XP bar, streak flame.
 */
export default function FoxCompanion({ mood = 'neutral', xp = 0, maxXp = 500, streak = 0, celebrating = false, compact = false }) {
  const f = FOX_BY_MOOD[mood] || FOX_BY_MOOD.neutral
  const pct = Math.min(100, Math.round((xp / Math.max(maxXp, 1)) * 100))
  return (
    <div className="p-4 rounded-2xl bg-white border border-[#EDE7E1] shadow-xs relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full blur-3xl opacity-40"
        style={{ background: `radial-gradient(circle, ${f.glow}44, transparent 70%)` }}
      />
      <div className="flex items-center gap-3">
        <motion.div
          animate={celebrating ? { scale: [1, 1.18, 1], rotate: [0, -8, 6, 0] } : { y: [0, -3, 0] }}
          transition={celebrating ? { duration: 0.8 } : { duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          className="w-14 h-14 rounded-2xl bg-[#FFF7F0] border border-[#F3D9C8] flex items-center justify-center text-3xl shrink-0 overflow-hidden"
          style={{ boxShadow: `0 8px 20px -8px ${f.glow}88` }}
          role="img"
          aria-label={`Fox companion feeling ${mood}`}
        >
          {f.face}
        </motion.div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#1E1B16] capitalize">{mood} companion</p>
          <p className="text-xs text-[#5B544E] truncate">{f.note}</p>
          {!compact && (
            <div className="mt-2">
              <div className="flex justify-between text-[10px] font-semibold text-[#6B625C] mb-1">
                <span>Companion XP</span>
                <span className="tabular-nums">{xp} / {maxXp}</span>
              </div>
              <div className="h-1.5 rounded-full bg-[#F0EAE4] overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[#E8845F] to-[#10B981]"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </div>
          )}
        </div>
        {streak > 0 && (
          <div className="text-center shrink-0" title={`${streak} day streak`}>
            <div className="text-xl">🔥</div>
            <div className="text-[11px] font-extrabold tabular-nums text-[#1E1B16]">{streak}</div>
          </div>
        )}
      </div>
      <AnimatePresence>
        {celebrating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            {['✨', '🎉', '⭐', '🌟'].map((p, i) => (
              <motion.span
                key={i}
                initial={{ x: 0, y: 0, opacity: 1 }}
                animate={{ x: (i - 1.5) * 44, y: -52, opacity: 0 }}
                transition={{ duration: 0.9, delay: i * 0.06 }}
                className="absolute text-lg"
              >
                {p}
              </motion.span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
