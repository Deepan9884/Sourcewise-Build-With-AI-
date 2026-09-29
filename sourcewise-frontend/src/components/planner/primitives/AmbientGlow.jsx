/**
 * AmbientGlow — soft radial light blobs (pure CSS, breathe via Tailwind animation).
 */
const POSITIONS = {
  'top-left': 'top-0 left-0',
  'top-right': 'top-0 right-0',
  center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
}

const SIZES = { sm: 'w-64 h-64', md: 'w-96 h-96', lg: 'w-[520px] h-[520px]' }

const TINTS = {
  amber: 'from-[#E8845F]/25 via-[#D97706]/10 to-transparent',
  teal: 'from-[#0F766E]/20 via-[#0F766E]/8 to-transparent',
  warm: 'from-[#E8845F]/20 via-[#8B5E3C]/10 to-transparent',
}

export default function AmbientGlow({ position = 'top-left', size = 'md', tint = 'amber', className = '' }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute rounded-full blur-3xl animate-breathe ${POSITIONS[position] || POSITIONS['top-left']} ${SIZES[size] || SIZES.md} bg-gradient-to-br ${TINTS[tint] || TINTS.amber} ${className}`}
    />
  )
}
