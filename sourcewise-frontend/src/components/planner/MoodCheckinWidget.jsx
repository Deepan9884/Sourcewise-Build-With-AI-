import { motion } from 'framer-motion'
import { Brain, Sparkles, Activity, ShieldCheck, Zap, BatteryCharging } from 'lucide-react'

const MOOD_PROFILES = {
  energized: {
    label: 'High Velocity',
    emoji: '⚡',
    badge: 'Peak Performance',
    tint: 'from-amber-500/10 to-orange-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-700',
    iconColor: '#D97706',
    advice: 'Ride the cognitive peak: schedule heavy problem solving and complex chapters now.',
  },
  focused: {
    label: 'Deep Flow',
    emoji: '🎯',
    badge: 'Optimal Receptivity',
    tint: 'from-teal/10 to-emerald-500/10',
    border: 'border-teal/30',
    text: 'text-teal',
    iconColor: '#0F766E',
    advice: 'Steady cognitive rhythm. Excellent window for uninterrupted deep work.',
  },
  neutral: {
    label: 'Equilibrium',
    emoji: '🍃',
    badge: 'Balanced Pace',
    tint: 'from-stone-500/10 to-amber-500/5',
    border: 'border-[#E7DCCB]',
    text: 'text-[#1E1B16]',
    iconColor: '#8A817B',
    advice: 'Balanced pace. Spaced repetition intervals calibrated for steady retention.',
  },
  tired: {
    label: 'Cognitive Recovery',
    emoji: '🌙',
    badge: 'Reduced Load',
    tint: 'from-purple-500/10 to-indigo-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-700',
    iconColor: '#7C3AED',
    advice: 'Light load mode active: short flashcards, quick summaries, and extended rest buffers.',
  },
  stressed: {
    label: 'Chunked Focus',
    emoji: '🌊',
    badge: 'Decompressed',
    tint: 'from-rose-500/10 to-red-500/10',
    border: 'border-rose-500/30',
    text: 'text-rose-700',
    iconColor: '#E11D48',
    advice: 'Decompressed schedule: focusing on single low-friction milestones to build momentum.',
  },
  anxious: {
    label: 'Structured Clarity',
    emoji: '🕯️',
    badge: 'Step-by-Step',
    tint: 'from-amber-600/10 to-yellow-600/10',
    border: 'border-amber-600/30',
    text: 'text-amber-800',
    iconColor: '#B45309',
    advice: 'Clear bite-sized roadmaps with active reassurance and frequent review checkpoints.',
  },
}

/**
 * MoodCheckinWidget — Automated AI Cognitive State Display.
 * No manual mood swing entry required: the AI continuously infers cognitive state
 * from user velocity, completion consistency, and quiz performance.
 */
export default function MoodCheckinWidget({ currentMood, compact = false }) {
  const dominant = (currentMood?.dominantMood || 'neutral').toLowerCase()
  const profile = MOOD_PROFILES[dominant] || MOOD_PROFILES.neutral
  const multiplier = currentMood?.recommendedAdjustments?.loadMultiplier ?? 1.0
  const note = currentMood?.recommendedAdjustments?.note || profile.advice

  return (
    <div className={`rounded-2xl bg-white border border-[#EDE7E1] shadow-xs overflow-hidden transition-all ${compact ? 'p-3.5' : 'p-4 sm:p-5'}`}>
      {/* Top Header with live AI auto-prediction badge */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-[#FAF6F2] border border-[#E7DCCB] flex items-center justify-center text-[#C05A35]">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#1E1B16] flex items-center gap-1.5">
              AI Cognitive State
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Auto-Predicted
              </span>
            </h3>
            {!compact && (
              <p className="text-[11px] text-[#8A817B]">Inferred passively from your study pace & retention</p>
            )}
          </div>
        </div>

        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-[#FAF6F2] border border-[#EDE7E1] text-[#5B544E]">
          {multiplier}x pace
        </span>
      </div>

      {/* Main State Card */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-3 rounded-xl border bg-gradient-to-r ${profile.tint} ${profile.border} space-y-2`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl leading-none">{profile.emoji}</span>
            <div>
              <span className={`text-sm font-bold block ${profile.text}`}>
                {profile.label}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6B625C]">
                {profile.badge}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-[#8A817B] block">AI Confidence</span>
            <span className="text-xs font-mono font-extrabold text-[#1E1B16]">
              {Math.round((currentMood?.confidence ?? 0.88) * 100)}%
            </span>
          </div>
        </div>

        {/* Dynamic AI Advice */}
        <p className="text-xs text-[#443D37] leading-relaxed pt-1 border-t border-black/5">
          {note}
        </p>
      </motion.div>

      {/* Subtle indicator footnote */}
      {!compact && (
        <div className="flex items-center justify-between text-[11px] text-[#8A817B] mt-2.5 pt-2 border-t border-[#F5EFEA]">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-teal" />
            Zero manual entry required
          </span>
          <span className="flex items-center gap-1 font-medium">
            <Activity className="w-3 h-3 text-[#C05A35]" />
            Continuous calibration
          </span>
        </div>
      )}
    </div>
  )
}
