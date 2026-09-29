const MOOD_COLORS = {
  energized: '#10B981',
  focused: '#0D9488',
  neutral: '#8A817B',
  tired: '#D97706',
  stressed: '#E8845F',
  anxious: '#9C4141',
}

/**
 * MoodPulse — breathing ring in the rail footer. Color = dominant mood,
 * diameter scales with energy. Pure display; never mutates the plan.
 */
export default function MoodPulse({ mood, energy = 5, compact = false }) {
  const color = MOOD_COLORS[mood] || MOOD_COLORS.neutral
  const size = compact ? 28 : 36 + Math.min(10, Math.max(1, energy)) * 1.2

  return (
    <div className="flex items-center gap-2" title={mood ? `Mood: ${mood}` : 'Mood: unknown'} data-testid="mood-pulse">
      <span className="relative inline-flex" style={{ width: size, height: size }}>
        <span
          className="absolute inset-0 rounded-full animate-ping opacity-20"
          style={{ background: color, animationDuration: '2.4s' }}
        />
        <span
          className="absolute inset-[4px] rounded-full border-2"
          style={{ borderColor: color, background: `${color}18` }}
        />
      </span>
      {!compact && (
        <span className="text-xs font-semibold text-body capitalize">{mood || 'neutral'}</span>
      )}
    </div>
  )
}
