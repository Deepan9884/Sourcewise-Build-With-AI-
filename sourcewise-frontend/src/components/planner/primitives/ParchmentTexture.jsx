import { motion } from 'framer-motion'

const INTENSITY = {
  subtle: 'opacity-[0.35]',
  normal: 'opacity-60',
  rich: 'opacity-100',
}

/**
 * ParchmentTexture — warm paper grain + soft vignette + faint ruling.
 * Pure CSS/SVG, zero 3D. Wraps children with elegant paper feel.
 */
export default function ParchmentTexture({ intensity = 'normal', className = '', children, rounded = 'rounded-2xl' }) {
  return (
    <div className={`relative overflow-hidden ${rounded} ${className}`}>
      {/* base parchment gradient */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 ${INTENSITY[intensity] || INTENSITY.normal}`}
        style={{
          background:
            'radial-gradient(1200px 400px at 20% -10%, rgba(232,132,95,0.10), transparent 60%), radial-gradient(900px 380px at 95% 0%, rgba(13,148,136,0.08), transparent 60%), linear-gradient(135deg, #FFFDF8 0%, #FAF4E8 45%, #FFF9F0 100%)',
        }}
      />
      {/* grain dots */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage: 'radial-gradient(rgba(139,94,60,0.10) 0.7px, transparent 0.7px)',
          backgroundSize: '22px 22px',
        }}
      />
      {/* vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ boxShadow: 'inset 0 0 60px rgba(139,94,60,0.08), inset 0 1px 0 rgba(255,255,255,0.7)' }}
      />
      {/* content */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
      >
        {children}
      </motion.div>
    </div>
  )
}
