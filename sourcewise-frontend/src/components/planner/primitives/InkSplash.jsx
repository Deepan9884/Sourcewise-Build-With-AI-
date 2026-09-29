import { motion } from 'framer-motion'

/**
 * InkSplash — radial ink burst for drag-drop / completion feedback.
 */
export default function InkSplash({ x = 0, y = 0, color = '#E8845F', size = 120, onDone }) {
  return (
    <motion.span
      aria-hidden
      initial={{ scale: 0, opacity: 0.85, x, y }}
      animate={{ scale: 1, opacity: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      onAnimationComplete={onDone}
      className="pointer-events-none absolute rounded-full"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color}55 0%, ${color}22 45%, transparent 70%)`,
        filter: 'blur(1px)',
      }}
    />
  )
}
