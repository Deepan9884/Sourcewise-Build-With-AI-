import { motion } from 'framer-motion'

const SIZES = { sm: 'w-8 h-8 text-base', md: 'w-11 h-11 text-xl', lg: 'w-14 h-14 text-2xl' }

/**
 * SubjectSigil — subject emblem in a soft tinted medallion with breathing glow.
 * Uses emoji/symbol glyphs (zero deps) inside elegant ring.
 */
export default function SubjectSigil({ sigil = '📚', tint = '#FDEEE6', ring = '#E8845F', size = 'md', animated = true }) {
  const motionProps = animated
    ? { animate: { scale: [1, 1.04, 1] }, transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' } }
    : {}
  return (
    <motion.span
      {...motionProps}
      aria-hidden
      className={`${SIZES[size] || SIZES.md} rounded-2xl flex items-center justify-center shrink-0`}
      style={{
        background: `linear-gradient(135deg, #ffffff, ${tint})`,
        border: `1.5px solid ${ring}44`,
        boxShadow: `0 4px 14px -6px ${ring}66, inset 0 1px 0 #fff`,
      }}
    >
      <span>{sigil}</span>
    </motion.span>
  )
}
