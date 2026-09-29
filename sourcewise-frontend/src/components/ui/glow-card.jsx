import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

// Unified card — white/near-white, 1px line border, soft shadow, 16px radius.
// glowColor / intensity props are kept for backwards-compat but intentionally
// ignored so every page renders the same card. Icon color variety should be
// handled with .sw-icon-badge-coral / -teal / -amber on the icon itself.
const GlowCard = forwardRef(({
  children,
  className,
  glowColor, // eslint-disable-line no-unused-vars
  intensity, // eslint-disable-line no-unused-vars
  hover = false,
  ...props
}, ref) => {
  return (
    <motion.div
      ref={ref}
      whileHover={hover ? { y: -3 } : {}}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn('sw-card', hover && 'sw-card-hover', className)}
      {...props}
    >
      {children}
    </motion.div>
  )
})

GlowCard.displayName = 'GlowCard'

export { GlowCard }
