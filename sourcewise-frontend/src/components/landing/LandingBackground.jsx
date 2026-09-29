/* ─────────────────────────────────────────────────────────────
   LandingBackground
   Layers (bottom → top):
   1  Warm cream base
   2  SVG topographic contour wave pattern
   3  Dot-grid texture
   4  Diagonal animated gradient light bands
   5  Top spotlight beam
   6  SVG grain noise
   7  Edge vignette
─────────────────────────────────────────────────────────────── */
export default function LandingBackground() {
  const bands = [
    { color: 'hsla(14 72% 63% / 0.13)',  top: '-5%',  height: '18%', dur: '28s', delay: '0s'   },
    { color: 'hsla(38 85% 67% / 0.10)',  top: '12%',  height: '14%', dur: '34s', delay: '-9s'  },
    { color: 'hsla(270 52% 68% / 0.09)', top: '28%',  height: '22%', dur: '40s', delay: '-18s' },
    { color: 'hsla(350 65% 70% / 0.09)', top: '44%',  height: '16%', dur: '30s', delay: '-4s'  },
    { color: 'hsla(170 52% 62% / 0.08)', top: '58%',  height: '20%', dur: '36s', delay: '-13s' },
    { color: 'hsla(38 80% 66% / 0.07)',  top: '74%',  height: '18%', dur: '44s', delay: '-22s' },
  ];

  return (
    <>
      <style>{`
        @keyframes sw-band-slide {
          0%   { transform: rotate(-34deg) translateY(0px)   scaleX(1.6); }
          50%  { transform: rotate(-34deg) translateY(-80px) scaleX(1.65); }
          100% { transform: rotate(-34deg) translateY(0px)   scaleX(1.6); }
        }
        @keyframes sw-band-slide-r {
          0%   { transform: rotate(-34deg) translateY(0px)   scaleX(1.6); }
          50%  { transform: rotate(-34deg) translateY(70px)  scaleX(1.55); }
          100% { transform: rotate(-34deg) translateY(0px)   scaleX(1.6); }
        }
        @keyframes sw-beam-pulse {
          0%, 100% { opacity: 0.48; }
          50%       { opacity: 0.72; }
        }
        @keyframes sw-topo-drift {
          0%   { transform: translateX(0px)  translateY(0px); }
          50%  { transform: translateX(18px) translateY(-12px); }
          100% { transform: translateX(0px)  translateY(0px); }
        }
      `}</style>

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        {/* 1. Base — clean warm cream */}
        <div className="absolute inset-0" style={{ background: 'hsl(28 30% 96%)' }} />

        {/* 2. SVG topographic contour pattern */}
        <svg
          className="absolute inset-0 w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
          style={{ opacity: 0.038, animation: 'sw-topo-drift 30s ease-in-out infinite' }}
        >
          <defs>
            <pattern id="sw-topo" x="0" y="0" width="500" height="340" patternUnits="userSpaceOnUse">
              {[0, 68, 136, 204, 272, 340].map((yOff, i) => (
                <path
                  key={i}
                  d={`M-50,${yOff} C80,${yOff - 55} 160,${yOff + 55} 250,${yOff} S420,${yOff - 45} 550,${yOff}`}
                  fill="none"
                  stroke="hsl(20 58% 42%)"
                  strokeWidth={i % 3 === 0 ? 1.4 : 0.9}
                />
              ))}
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#sw-topo)" />
        </svg>

        {/* 3. Dot-grid texture */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, hsl(25 42% 42%) 1.1px, transparent 1.1px)',
            backgroundSize: '30px 30px',
            opacity: 0.048,
          }}
        />

        {/* 4. Diagonal animated gradient bands */}
        {bands.map(({ color, top, height, dur, delay }, i) => (
          <div
            key={i}
            className="absolute left-[-30%] w-[160%]"
            style={{
              top,
              height,
              background: `linear-gradient(90deg, transparent 0%, ${color} 35%, ${color} 65%, transparent 100%)`,
              animation: `${i % 2 === 0 ? 'sw-band-slide' : 'sw-band-slide-r'} ${dur} ease-in-out infinite ${delay}`,
              willChange: 'transform',
            }}
          />
        ))}

        {/* 5. Top spotlight beam */}
        <div
          className="absolute inset-x-0 top-0"
          style={{
            height: '75vh',
            background:
              'radial-gradient(ellipse 70% 60% at 50% -10%, hsla(14 80% 68% / 0.34) 0%, hsla(32 72% 74% / 0.14) 42%, transparent 68%)',
            animation: 'sw-beam-pulse 9s ease-in-out infinite',
          }}
        />

        {/* 6. SVG grain noise */}
        <svg
          className="absolute inset-0 w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
          style={{ opacity: 0.04 }}
        >
          <filter id="sw-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.68" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#sw-grain)" />
        </svg>

        {/* 7. Edge vignette */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 110% 90% at 50% 0%, transparent 50%, hsla(28 22% 93% / 0.48) 100%)',
          }}
        />
      </div>
    </>
  );
}
