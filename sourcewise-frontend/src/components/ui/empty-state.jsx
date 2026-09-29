import { motion } from 'framer-motion'

/**
 * Unified empty state — small fox mascot, warm copy, prominent coral CTA.
 * Used identically by Study Planner, Knowledge Hub and AI Workspace chat.
 */
export default function EmptyState({
  title,
  copy,
  actionLabel,
  onAction,
  actionIcon: ActionIcon,
  compact = false,
}) {
  return (
    <div className={`text-center ${compact ? 'py-6' : 'py-10'}`}>
      <motion.img
        src="/cta-fox-companion.png"
        alt="SourceWise fox companion"
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className={`${compact ? 'w-20 h-20' : 'w-28 h-28'} object-contain mx-auto mb-4 drop-shadow-sm mix-blend-multiply`}
      />
      <p className="text-lg font-bold text-[#1E1B16]">{title}</p>
      <p className="text-sm text-[#5B544E] mt-1 max-w-sm mx-auto leading-relaxed">{copy}</p>
      {actionLabel && (
        <button onClick={onAction} className="sw-btn-primary mt-5 mx-auto">
          {ActionIcon && <ActionIcon className="w-4 h-4" />}
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  )
}
