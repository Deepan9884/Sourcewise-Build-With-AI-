import { useEffect, useState, useRef } from 'react'

const generateParticles = (count) => {
  const colors = ['#FFB347', '#DAA520', '#B87333', '#FFF8DC', '#F5E6C8', '#8FBC8F']
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: Math.random() * 8 + 4,
    delay: Math.random() * 0.5,
    duration: Math.random() * 1 + 1.5,
    rotation: Math.random() * 360,
    shape: Math.random() > 0.5 ? 'circle' : 'rect',
  }))
}

const CelebrationEffect = ({ 
  trigger = false, 
  particleCount = 50,
  duration = 3000,
  onComplete 
}) => {
  const [isActive, setIsActive] = useState(false)
  const [particles, setParticles] = useState(() => generateParticles(particleCount))
  const triggerRef = useRef(trigger)

  useEffect(() => {
    if (trigger && !triggerRef.current) {
      setParticles(generateParticles(particleCount))
      setIsActive(true)
      const timer = setTimeout(() => {
        setIsActive(false)
        onComplete?.()
      }, duration)
      triggerRef.current = trigger
      return () => clearTimeout(timer)
    }
    triggerRef.current = trigger
  }, [trigger, duration, onComplete, particleCount])

  if (!isActive) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-[9998] overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute animate-bounce"
          style={{
            left: `${particle.x}%`,
            top: '-20px',
            width: `${particle.size}px`,
            height: particle.shape === 'rect' ? `${particle.size * 0.6}px` : `${particle.size}px`,
            backgroundColor: particle.color,
            borderRadius: particle.shape === 'circle' ? '50%' : '2px',
            animation: `confetti-fall ${particle.duration}s ease-in forwards`,
            animationDelay: `${particle.delay}s`,
            transform: `rotate(${particle.rotation}deg)`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}

export { CelebrationEffect }
