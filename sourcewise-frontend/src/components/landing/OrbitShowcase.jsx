import { useCallback, useEffect, useRef, useState } from 'react';

// Five student outcomes & help offered, directly matching the 5 visual illustrations:
// 1. Laptop companion -> Never struggle alone, immediate focus & momentum
// 2. Trophy & graduation -> Peak exam honors, top GPA & celebration
// 3. Blackboard concept web -> Deep synthesis, connecting formulas & intuition
// 4. Two students collaborating -> High-yield group study & peer breakthroughs
// 5. Whiteboard presenter -> Articulating knowledge, seminar & oral defense confidence
const ORBIT_STEPS = [
  {
    id: 1,
    image: '/orbit-1.jpg',
    alt: 'Student studying on laptop with the SourceWise fox companion',
    badge: 'Outcome 01 · Immediate Momentum',
    headline: 'Never Struggle Through Heavy Coursework Alone',
    helpText:
      'SourceWise sits directly beside you as a 24/7 intelligent study partner. When facing intimidating syllabi or cognitive overload, your companion breaks down dense tasks into clear first steps, banishing study paralysis and anchoring you in deep focus.',
    outcome: 'Zero study dread · 100% focused first sessions',
    actionText: 'Experience guided study',
  },
  {
    id: 2,
    image: '/orbit-2.jpg',
    alt: 'Student celebrating academic triumph with trophy, diploma, and fox companion',
    badge: 'Outcome 02 · Proven Academic Triumph',
    headline: 'Turn Strenuous Effort into Top Exam Honors',
    helpText:
      'We bridge the gap between exhausting study hours and peak exam grades. Through predictive exam simulations and automated spaced retention, SourceWise eliminates test-day surprises so you walk into finals confident and walk out holding top honors.',
    outcome: 'Fearless finals · Proven top-tier GPA performance',
    actionText: 'Explore exam readiness',
  },
  {
    id: 3,
    image: '/orbit-3.jpg',
    alt: 'Student studying with notebook while fox connects concepts on blackboard',
    badge: 'Outcome 03 · Deep Conceptual Synthesis',
    headline: 'Connect Complex Topics into Living Intuition',
    helpText:
      'Instead of forcing rote memorization of disconnected facts, SourceWise weaves your lecture slides, formulas, and textbook chapters into an interconnected mental web. You understand the foundational principles so deeply that unfamiliar exam questions feel second nature.',
    outcome: 'True conceptual mastery · Effortless recall under pressure',
    actionText: 'See knowledge synthesis',
  },
  {
    id: 4,
    image: '/orbit-4.jpg',
    alt: 'Two students studying together across table with fox companion guiding discussion',
    badge: 'Outcome 04 · High-Yield Collaboration',
    headline: 'Transform Study Groups into Rapid Breakthroughs',
    helpText:
      'Elevate group revision into energized problem-solving. The companion acts as an impartial, knowledgeable study facilitator—mediating tricky debates, verifying mathematical and conceptual proofs in real time, and keeping collaborative study sessions on track.',
    outcome: '3x more productive study groups · Shared breakthroughs',
    actionText: 'Discover group study mode',
  },
  {
    id: 5,
    image: '/orbit-5.jpg',
    alt: 'Student presenting structured knowledge at whiteboard with pointer and fox',
    badge: 'Outcome 05 · Articulation & Defense',
    headline: 'Articulate & Teach Your Domain with Authority',
    helpText:
      'Transition from a passive reader into an authoritative presenter. SourceWise trains you to explain, defend, and teach complex concepts aloud through interactive Socratic dialogue, preparing you to ace oral exams, seminar presentations, and tough professor questions with poise.',
    outcome: 'Feynman-level mastery · Unshakable presentation confidence',
    actionText: 'Practice oral defense',
  },
];

const STEP_COUNT = ORBIT_STEPS.length;
// Perfectly calibrated orbit radii giving comfortable breathing room around center text
const ORBIT_RADIUS_X = 'clamp(260px, 34vw, 360px)';
const ORBIT_RADIUS_Y = 'clamp(160px, 22vh, 195px)';

export default function OrbitShowcase() {
  const containerRef = useRef(null);
  const targetProgressRef = useRef(0);
  const smoothProgressRef = useRef(0);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [active, setActive] = useState(0);

  // Smooth scroll progress handler
  const updateScrollProgress = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const scrollable = el.offsetHeight - window.innerHeight;
    if (scrollable <= 0) return;
    const p = Math.min(1, Math.max(0, -rect.top / scrollable));
    targetProgressRef.current = p;
  }, []);

  // Butter-smooth RAF physics lerp loop (60/120fps continuous smoothness without CSS transition conflicts)
  useEffect(() => {
    let animId;
    let lastTime = performance.now();

    const tick = (now) => {
      const dt = Math.min(64, now - lastTime) / 1000;
      lastTime = now;

      // Organic lerp decay: tracks user scroll with silky momentum
      const diff = targetProgressRef.current - smoothProgressRef.current;
      if (Math.abs(diff) > 0.0001) {
        smoothProgressRef.current += diff * Math.min(1, dt * 14);
        setDisplayProgress(smoothProgressRef.current);

        // Active step aligns smoothly around each step node
        const rawStep = smoothProgressRef.current * (STEP_COUNT - 1);
        const nextActive = Math.min(STEP_COUNT - 1, Math.max(0, Math.round(rawStep)));
        setActive(nextActive);
      }

      animId = requestAnimationFrame(tick);
    };

    updateScrollProgress();
    window.addEventListener('scroll', updateScrollProgress, { passive: true });
    window.addEventListener('resize', updateScrollProgress);
    animId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('scroll', updateScrollProgress);
      window.removeEventListener('resize', updateScrollProgress);
      cancelAnimationFrame(animId);
    };
  }, [updateScrollProgress]);

  const jumpToStep = (index) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const scrollable = el.offsetHeight - window.innerHeight;
    const top = window.scrollY + rect.top + (index / (STEP_COUNT - 1)) * scrollable;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  const scrollToDemo = () => {
    document.getElementById('video-tour')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const step = ORBIT_STEPS[active];

  // Each image is separated by 72° (360° / 5).
  // Total rotation smoothly turns the active image into the prominent focal position.
  const angleStep = 360 / STEP_COUNT;
  const rotationOffset = -displayProgress * (STEP_COUNT - 1) * angleStep;

  return (
    <section
      id="nine-tails-grid"
      ref={containerRef}
      className="relative scroll-mt-24"
      style={{ height: `${STEP_COUNT * 100}vh` }}
      aria-label="SourceWise student outcomes orbit"
    >
      {/* Pinned viewport — stays fixed while user scrolls through the 5 outcomes */}
      <div className="sticky top-0 h-screen max-h-screen overflow-hidden flex flex-col justify-center items-center pt-20 pb-6 gap-4">
        {/* Ambient atmospheric glow */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[850px] max-w-none bg-gradient-to-b from-primary-fixed/25 via-secondary-fixed/15 to-transparent blur-3xl opacity-80" />

        {/* Section header */}
        <div className="relative text-center max-w-2xl mx-auto px-4 shrink-0">
          <h2 className="font-headline-xl text-xl sm:text-2xl md:text-3xl text-on-surface font-bold tracking-tight">
            How SourceWise Transforms Your Studies
          </h2>
          <p className="hidden sm:block font-body-md text-xs sm:text-sm text-on-surface-variant mt-0.5">
            Scroll to rotate through the journey — see the real-world help and outcomes you unlock.
          </p>
        </div>

        {/* Orbit stage — generous width with calibrated elliptical track */}
        <div className="relative mx-auto w-[min(98vw,920px)] h-[min(98vw,520px)] max-h-[530px] shrink-0 min-h-0 flex items-center justify-center">
          {/* Circular/Elliptical orbit tracks passing through image centers */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-primary-container/25 pointer-events-none"
            style={{
              width: `calc(${ORBIT_RADIUS_X} * 2)`,
              height: `calc(${ORBIT_RADIUS_Y} * 2)`,
            }}
            aria-hidden="true"
          />
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-outline-variant/30 pointer-events-none"
            style={{
              width: `calc(${ORBIT_RADIUS_X} * 1.45)`,
              height: `calc(${ORBIT_RADIUS_Y} * 1.45)`,
            }}
            aria-hidden="true"
          />
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-primary-fixed/30 via-secondary-fixed/20 to-transparent blur-2xl pointer-events-none"
            style={{
              width: `calc(${ORBIT_RADIUS_X} * 1.05)`,
              height: `calc(${ORBIT_RADIUS_Y} * 1.05)`,
            }}
            aria-hidden="true"
          />

          {/* Orbiting images — calibrated size so they never hide center words */}
          {ORBIT_STEPS.map((item, i) => {
            const baseAngle = angleStep * i;
            const currentAngle = baseAngle + rotationOffset;
            const isActive = i === active;
            const rad = (currentAngle * Math.PI) / 180;
            const sinVal = Math.sin(rad);
            const cosVal = Math.cos(rad);

            return (
              <button
                key={item.image}
                type="button"
                onClick={() => jumpToStep(i)}
                aria-label={`Show outcome ${i + 1}: ${item.headline}`}
                aria-current={isActive ? 'true' : undefined}
                className={`absolute left-1/2 top-1/2 w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-2xl overflow-hidden bg-surface-container-lowest cursor-pointer ${
                  isActive
                    ? 'z-20 ring-4 ring-primary-container shadow-[0_16px_40px_-6px_rgba(224,122,95,0.6)] opacity-100'
                    : 'z-10 ring-1 ring-outline-variant/40 shadow-sm opacity-65 hover:opacity-100 hover:scale-105'
                }`}
                style={{
                  transform: `translate(-50%, -50%) translate(calc(${ORBIT_RADIUS_X} * ${sinVal.toFixed(4)}), calc(${ORBIT_RADIUS_Y} * ${(-cosVal).toFixed(4)})) scale(${
                    isActive ? 1.16 : 0.9
                  })`,
                  transition: 'opacity 0.3s ease, box-shadow 0.3s ease, ring-color 0.3s ease, transform 0.25s ease',
                }}
              >
                <img src={item.image} alt={item.alt} className="w-full h-full object-contain p-1.5 mix-blend-multiply select-none" loading="eager" />
                <span
                  className={`absolute bottom-1.5 left-1.5 w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center transition-colors ${
                    isActive ? 'bg-primary-container text-on-primary shadow-sm' : 'bg-on-surface/70 text-white'
                  }`}
                >
                  {i + 1}
                </span>
              </button>
            );
          })}

          {/* Center Content: Pure clarity, zero overlap, no words hidden */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-[min(80vw,340px)] pointer-events-none text-center flex flex-col items-center justify-center px-2">
            <div
              key={active}
              className="animate-in fade-in zoom-in-95 duration-400 flex flex-col items-center justify-center"
            >
              {/* Category / Outcome Kicker */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-fixed/85 text-on-primary-fixed font-label-sm text-[10.5px] font-bold uppercase tracking-wider mb-1.5 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                {step.badge}
              </div>

              {/* Bold Human Outcome Headline - Clean wrap with clear margins */}
              <h3 className="font-headline-md text-base sm:text-lg md:text-[21px] font-bold text-on-surface leading-snug tracking-tight mb-1.5 max-w-[300px] mx-auto text-balance">
                {step.headline}
              </h3>

              {/* The Help We Offer (Story Description) */}
              <p className="font-body-md text-xs sm:text-[12.5px] text-on-surface-variant leading-relaxed mb-2.5 line-clamp-3 max-w-[310px] mx-auto">
                {step.helpText}
              </p>

              {/* Concrete Transformation Result Pill */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-container/10 border border-primary-container/20 text-primary-container font-label-sm text-[11px] font-semibold max-w-[310px] mx-auto shadow-2xs">
                <span className="material-symbols-outlined text-[14px] text-primary shrink-0">verified</span>
                <span className="truncate">{step.outcome}</span>
              </div>

              {/* Action Link */}
              <button
                type="button"
                onClick={scrollToDemo}
                className="mt-2 pointer-events-auto inline-flex items-center gap-1 font-label-md text-xs font-bold text-primary hover:text-primary-container hover:translate-x-0.5 transition-all cursor-pointer"
              >
                <span>{step.actionText}</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

