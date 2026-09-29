import { cn } from '../../lib/utils'

const AmbientLight = ({ 
  position = 'top-left',
  intensity = 'md',
  color = 'amber',
  className 
}) => {
  const positions = {
    'top-left': 'top-0 left-0',
    'top-right': 'top-0 right-0',
    'bottom-left': 'bottom-0 left-0',
    'bottom-right': 'bottom-0 right-0',
    'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  }

  const intensities = {
    sm: 'w-64 h-64 opacity-20',
    md: 'w-96 h-96 opacity-25',
    lg: 'w-[500px] h-[500px] opacity-30',
    xl: 'w-[700px] h-[700px] opacity-35',
  }

  const colors = {
    amber: 'from-amber-warm/40 via-amber-gold/20 to-transparent',
    candle: 'from-amber-warm/50 via-amber-gold/30 to-transparent',
    warm: 'from-amber-warm/30 via-copper/20 to-transparent',
    soft: 'from-parchment/40 via-cream/20 to-transparent',
  }

  return (
    <div
      className={cn(
        'absolute rounded-full blur-[100px] pointer-events-none animate-breathe',
        positions[position],
        intensities[intensity],
        `bg-gradient-radial ${colors[color]}`,
        className
      )}
    />
  )
}

export { AmbientLight }
