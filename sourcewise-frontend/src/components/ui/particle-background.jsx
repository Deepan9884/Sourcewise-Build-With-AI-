import { useState } from 'react'
import { cn } from '../../lib/utils'

const generateParticles = (count) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    size: Math.random() * 4 + 2,
    left: Math.random() * 100,
    delay: Math.random() * 20,
    duration: Math.random() * 15 + 15,
    opacity: Math.random() * 0.4 + 0.2,
  }))
}

const ParticleBackground = ({ 
  particleCount = 30, 
  color = 'amber',
  className 
}) => {
  const [particles] = useState(() => generateParticles(particleCount))
  
  const colors = {
    amber: 'rgba(255, 179, 71, 0.4)',
    gold: 'rgba(218, 165, 32, 0.3)',
    copper: 'rgba(184, 115, 51, 0.3)',
    cream: 'rgba(255, 248, 220, 0.5)',
    parchment: 'rgba(245, 230, 200, 0.4)',
  }

  return (
    <div className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)}>
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full animate-dust-float"
          style={{
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            left: `${particle.left}%`,
            bottom: '-10px',
            backgroundColor: colors[color],
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
            opacity: particle.opacity,
          }}
        />
      ))}
    </div>
  )
}

export { ParticleBackground }
