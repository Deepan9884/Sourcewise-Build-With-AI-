import { ParticleBackground } from '../ui/particle-background'
import { AmbientLight } from '../ui/ambient-light'

const AmbientEffects = ({ 
  particles = true,
  lights = true,
  vignette = true,
  className 
}) => {
  return (
    <div className={`fixed inset-0 pointer-events-none overflow-hidden z-0 ${className}`}>
      {/* Floating dust particles */}
      {particles && (
        <ParticleBackground 
          particleCount={25} 
          color="amber" 
        />
      )}

      {/* Warm light rays from corners */}
      {lights && (
        <>
          <AmbientLight 
            position="top-left" 
            intensity="lg" 
            color="warm" 
          />
          <AmbientLight 
            position="top-right" 
            intensity="md" 
            color="soft" 
          />
          <AmbientLight 
            position="bottom-left" 
            intensity="md" 
            color="amber" 
          />
        </>
      )}

      {/* Subtle vignette effect */}
      {vignette && (
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 50%, rgba(92, 61, 46, 0.08) 100%)',
          }}
        />
      )}
    </div>
  )
}

export { AmbientEffects }
