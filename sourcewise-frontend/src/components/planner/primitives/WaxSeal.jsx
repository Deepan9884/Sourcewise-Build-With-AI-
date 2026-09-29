import { motion } from 'framer-motion'

const COLORS = {
  coral: { bg: '#E8845F', ring: 'rgba(232,132,95,0.45)', text: '#fff' },
  amber: { bg: '#D97706', ring: 'rgba(217,119,6,0.4)', text: '#fff' },
  teal: { bg: '#0F766E', ring: 'rgba(15,118,110,0.4)', text: '#fff' },
}

const SIZES = { sm: 'w-9 h-9 text-sm', md: 'w-12 h-12 text-base', lg: 'w-16 h-16 text-xl' }

/**
 * WaxSeal — pressable wax stamp with embossed ring.
 */
export default function WaxSeal({ color = 'coral', size = 'md', onPress, children, label, disabled = false }) {
  const c = COLORS[color] || COLORS.coral
  return (
    <motion.button
      type="button"
      whileTap={disabled ? {} : { scale: 0.9 }}
      whileHover={disabled ? {} : { y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      onClick={onPress}
      disabled={disabled}
      aria-label={label || 'wax seal action'}
      className={`${SIZES[size] || SIZES.md} relative rounded-full flex items-center justify-center font-bold shrink-0 disabled:opacity-50`}
      style={{
        background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.5), transparent 42%), radial-gradient(circle at 50% 55%, ${c.bg}, #00000022 130%)`,
        color: c.text,
        boxShadow: `0 6px 18px -6px ${c.ring}, inset 0 2px 3px rgba(255,255,255,0.55), inset 0 -3px 6px rgba(0,0,0,0.22)`,
      }}
    >
      <span
        aria-hidden
        className="absolute inset-[5px] rounded-full border-2 border-dashed"
        style={{ borderColor: 'rgba(255,255,255,0.55)' }}
      />
      <span className="relative">{children}</span>
    </motion.button>
  )
}
