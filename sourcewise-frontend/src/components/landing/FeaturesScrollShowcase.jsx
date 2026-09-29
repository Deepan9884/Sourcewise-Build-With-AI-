import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const FEATURES = [
  {
    id: 1,
    num: '01',
    shortTitle: 'Flashcards',
    title: 'Smart FSRS Flashcards',
    subtitle: 'Beat the forgetting curve with millisecond-accurate neuro-scheduling',
    category: 'Cognitive Science · FSRS-v5',
    icon: 'style',
    accentColor: '#e07a5f',
    desc: 'Engineered on the next-gen Free Spaced Repetition Scheduler (FSRS-v5). It calculates your unique personal memory decay curve and schedules review sessions at the exact moment before cognitive fading—guaranteeing over 98% retention while cutting study time by a third.',
    highlights: [
      'FSRS-v5 dynamic neuro-decay modeling',
      'Context-aware distractor & question generation',
      'One-tap conversion from lecture slides & PDFs',
    ],
    metric: '98.4% Retention Guarantee',
    metricNote: '30% Less Review Time',
    image: '/workspace-flashcards.png',
    imageAlt: 'Smart flashcards with fox study companion',
    imageBadge: 'FSRS-5 Engine',
  },
  {
    id: 2,
    num: '02',
    shortTitle: 'Pomodoro',
    title: 'Binaural Flow Pomodoro',
    subtitle: 'Lock into deep focus in under 4 minutes with neuro-acoustic soundscapes',
    category: 'Neuro-Focus · 40Hz Gamma',
    icon: 'timer',
    accentColor: '#fe8e8b',
    desc: 'Synchronize your cognitive work cycles with natural ultradian rhythms. Embedded 40Hz gamma binaural wave audio stimulates neuro-synchrony, washing away academic anxiety and inducing unbroken flow state during tough problem sets and heavy reading sessions.',
    highlights: [
      '40Hz Gamma wave neuro-entrainment audio',
      'Adaptive ultradian interval pacing (25m / 50m)',
      'Automated recovery breaks & mental recharge',
    ],
    metric: '2.4x Faster Flow Induction',
    metricNote: 'Zero Academic Anxiety',
    image: '/modality-pomodoro.jpg',
    imageAlt: 'Student in flow state studying with fox and Pomodoro timer',
    imageBadge: '40Hz Gamma Sync',
  },
  {
    id: 3,
    num: '03',
    shortTitle: 'Notes',
    title: 'Neural Concept Notes',
    subtitle: 'Weave lectures, formulas, and proofs into an interactive knowledge canvas',
    category: 'Knowledge Graph · Second Brain',
    icon: 'edit_note',
    accentColor: '#e07a5f',
    desc: 'A multi-dimensional second brain for ambitious scholars. Automatically extracts critical concepts from textbooks and lecture recordings, links them bidirectionally into an interactive KaTeX-rendered graph, and enables real-time peer co-editing.',
    highlights: [
      'Bidirectional concept linking & backlink graph',
      'Native KaTeX equation & theorem rendering',
      'Real-time collaborative peer workspace',
    ],
    metric: '100% Interconnected Syllabus',
    metricNote: 'KaTeX & Graph Native',
    image: '/workspace-notes.png',
    imageAlt: 'Neural concept notes and knowledge graph',
    imageBadge: 'Bidirectional Graph',
  },
  {
    id: 4,
    num: '04',
    shortTitle: 'Socratic AI',
    title: 'Socratic AI Mentor',
    subtitle: 'Contextual Socratic sparring that teaches you how to think, not what to memorize',
    category: 'Socratic Pedagogy · First Principles',
    icon: 'psychology',
    accentColor: '#e07a5f',
    desc: 'Rather than passively feeding you fragile answers, your kitsune mentor asks probing Socratic questions. It challenges flawed assumptions, helps you prove mathematical and physical theorems from first principles, and cements unbreakable comprehension.',
    highlights: [
      'First-principles Socratic sparring dialogue',
      'Step-by-step rigorous proof validation',
      'Strict zero-hallucination verification',
    ],
    metric: 'Zero-Hallucination Guard',
    metricNote: 'First-Principles Proofs',
    image: '/workspace-tutor.png',
    imageAlt: 'Socratic AI tutor dialogue with fox companion',
    imageBadge: 'Socratic AI Sparring',
  },
  {
    id: 5,
    num: '05',
    shortTitle: 'Habits',
    title: 'Gamified Mastery Architecture',
    subtitle: 'Transform grueling study quotas into an addictive, rewarding adventure',
    category: 'Behavioral Psychology · Habit Loops',
    icon: 'military_tech',
    accentColor: '#f4a261',
    desc: 'Harness behavioral psychology to build unbroken study habits. Watch your kitsune companion evolve from a playful pup into a nine-tailed master as you complete study streaks, conquer milestone quests, and turn daily coursework into an inspiring journey.',
    highlights: [
      '9-stage kitsune companion evolution path',
      'Loss-aversion streak preservation shields',
      'Daily quest milestones & mastery XP multipliers',
    ],
    metric: '89% Higher Study Consistency',
    metricNote: 'Level 9 Familiar Evolution',
    image: '/modality-gamified.jpg',
    imageAlt: 'Student high-fiving the nine-tailed fox with streak flame',
    imageBadge: 'Streak & Familiar XP',
  },
  {
    id: 6,
    num: '06',
    shortTitle: 'Quizzes',
    title: 'Adaptive Diagnostic Question Banks',
    subtitle: 'Exam-caliber questions tailored dynamically across Bloom’s Taxonomy',
    category: "Bloom's Taxonomy · Diagnostics",
    icon: 'quiz',
    accentColor: '#8f9994',
    desc: 'Instantly turn raw lecture decks, PDFs, and syllabi into rigorous practice banks. Scaled from foundational recall (Level 1) to complex multi-step synthesis (Level 6), complete with deep distractor rationale explaining exactly why wrong choices are incorrect.',
    highlights: [
      "Bloom's taxonomy tiered difficulty (L1–L6)",
      'In-depth diagnostic distractor rationale',
      'Instant knowledge gap pinpointing & remediation',
    ],
    metric: 'Full Distractor Analytics',
    metricNote: 'Scaled Across Bloom L1-6',
    image: '/workspace-quiz.png',
    imageAlt: 'Adaptive question bank and diagnostic quiz',
    imageBadge: "Bloom's L1-6 Engine",
  },
  {
    id: 7,
    num: '07',
    shortTitle: 'Synthesizer',
    title: 'Dense Document Synthesizer',
    subtitle: 'Digest 300-page medical treatises and legal casebooks in 60 seconds',
    category: 'Semantic Extraction · 300+ Pages',
    icon: 'summarize',
    accentColor: '#8f9994',
    desc: 'Never get overwhelmed by dense 40-page journal articles or 300-page textbooks again. The synthesizer extracts critical domain taxonomies, core mathematical formulas, key arguments, and actionable executive summaries while preserving vital nuance.',
    highlights: [
      '300+ page multi-document semantic ingestion',
      'Hierarchical executive summaries & key takeaways',
      'Direct mathematical formula & citation extraction',
    ],
    metric: '60-Sec High-Yield Digest',
    metricNote: '300+ Page Context Window',
    image: '/workspace-chat.png',
    imageAlt: 'Dense document synthesizer and chat',
    imageBadge: 'Semantic Synthesizer',
  },
  {
    id: 8,
    num: '08',
    shortTitle: 'Exam Sim',
    title: 'Proctored Exam Simulator',
    subtitle: 'Inoculate yourself against exam-hall anxiety with realistic timed simulations',
    category: 'Stress Inoculation · High Stakes',
    icon: 'hourglass_top',
    accentColor: '#fe8e8b',
    desc: 'Replicate authentic high-pressure exam environments with strict countdown clocks, blind problem delivery, and step-level rubric grading. Train your brain to operate calmly under pressure so finals day feels like familiar routine.',
    highlights: [
      'Customizable strict countdown thresholds',
      'Blind question delivery & stress conditioning',
      'Step-level partial credit rubric scoring',
    ],
    metric: 'Stress Inoculation Protocol',
    metricNote: 'Rubric-Level Scoring',
    image: '/modality-examsim.jpg',
    imageAlt: 'Student writing timed exam with stopwatch and fox companion',
    imageBadge: 'Timed Exam Simulation',
  },
  {
    id: 9,
    num: '09',
    shortTitle: 'Telemetry',
    title: 'Cognitive Mastery Telemetry',
    subtitle: 'Pinpoint blind spots and predict your exact exam performance before test day',
    category: 'Predictive Analytics · Exam Readiness',
    icon: 'monitoring',
    accentColor: '#e07a5f',
    desc: 'Continuous intellectual telemetry tracks your recall velocity, memory decay rates, and syllabus coverage in real time. Accurate predictive modeling projects your final exam score with 94% calibration so you know exactly where to focus.',
    highlights: [
      'Real-time syllabus mastery heatmaps',
      'Predictive final grade calibration (+18% lift)',
      'Recall velocity & memory decay telemetry',
    ],
    metric: '+18% Average Score Lift',
    metricNote: '94% Predictive Calibration',
    image: '/modality-telemetry.jpg',
    imageAlt: 'Student and fox companion reviewing mastery curves and exam readiness charts',
    imageBadge: 'Mastery Calibration',
  },
];

const TOTAL_FEATURES = FEATURES.length;
const ANGLE_STEP = 360 / TOTAL_FEATURES; // 40 degrees per node

export default function FeaturesScrollShowcase() {
  const containerRef = useRef(null);
  const targetProgressRef = useRef(0);
  const smoothProgressRef = useRef(0);
  const [wheelAngle, setWheelAngle] = useState(0);
  const [active, setActive] = useState(0);

  // Smooth scroll progress tracking
  const updateScrollProgress = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const scrollable = el.offsetHeight - window.innerHeight;
    if (scrollable <= 0) return;
    const p = Math.min(1, Math.max(0, -rect.top / scrollable));
    targetProgressRef.current = p;
  }, []);

  // Butter-smooth RAF physics lerp loop (60/120fps GPU accelerated)
  useEffect(() => {
    let animId;
    let lastTime = performance.now();

    const tick = (now) => {
      const dt = Math.min(48, now - lastTime) / 1000;
      lastTime = now;

      const diff = targetProgressRef.current - smoothProgressRef.current;
      if (Math.abs(diff) > 0.00005) {
        // High-precision organic damping for ultra-smooth fluid motion
        smoothProgressRef.current += diff * Math.min(1, dt * 10);

        // Compute smooth rotation angle (active node rotates to 0° on the right)
        const angle = -smoothProgressRef.current * (TOTAL_FEATURES - 1) * ANGLE_STEP;
        setWheelAngle(angle);

        // Update active index smoothly
        const rawIndex = smoothProgressRef.current * (TOTAL_FEATURES - 1);
        const nextActive = Math.min(TOTAL_FEATURES - 1, Math.max(0, Math.round(rawIndex)));
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

  const jumpToFeature = (index) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const scrollable = el.offsetHeight - window.innerHeight;
    const top = window.scrollY + rect.top + (index / (TOTAL_FEATURES - 1)) * scrollable;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  const activeFeature = FEATURES[active];

  return (
    <section
      id="features-briefing"
      ref={containerRef}
      className="relative w-full"
      style={{ height: `${TOTAL_FEATURES * 90}vh` }}
      aria-label="SourceWise 9 Modalities Celestial Showcase"
    >
      {/* ── STICKY PINNED STAGE (Butter-smooth, No Boxy Card, Grand Scale) ── */}
      <div className="sticky top-0 h-screen max-h-screen overflow-hidden flex flex-col justify-between pt-16 sm:pt-20 pb-4 md:pb-6 px-4 md:px-8 max-w-[1440px] mx-auto z-20">
        {/* Grand Atmospheric Ambient Light */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1100px] h-[800px] bg-gradient-to-tr from-primary-fixed/25 via-secondary-fixed/15 to-transparent blur-3xl opacity-75 -z-10" />

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto shrink-0 mb-1 sm:mb-2">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-primary-fixed/90 text-on-primary-fixed font-label-sm text-xs font-bold uppercase tracking-widest mb-1 shadow-xs border border-primary/20">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            The Ninefold Spectrum · Circular Modalities
          </div>
          <h2 className="font-display-hero text-2xl sm:text-3xl md:text-4xl lg:text-[40px] text-on-surface font-extrabold tracking-tight leading-tight">
            Every Tool You Need to Master Your Studies
          </h2>
          <p className="hidden sm:block font-body-md text-xs sm:text-sm text-on-surface-variant mt-0.5">
            Scroll to rotate the celestial spectrum — 9 synchronized modalities engineered for academic momentum.
          </p>
        </div>

        {/* ── MAIN STAGE: GRAND CELESTIAL DIAL (LEFT) + SEAMLESS SHOWCASE (RIGHT) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center flex-1 min-h-0 w-full">
          {/* ────────────────────────────────────────────────────────── */}
          {/* LEFT: GRAND CELESTIAL ORBITAL DIAL                         */}
          {/* ────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-5 flex items-center justify-center relative w-full h-[340px] sm:h-[400px] md:h-[480px] lg:h-[520px] select-none">
            {/* Multi-layered Glowing Cosmic Rays */}
            <div className="absolute w-[320px] sm:w-[420px] md:w-[480px] h-[320px] sm:h-[420px] md:h-[480px] rounded-full bg-gradient-to-br from-primary-fixed/30 via-secondary-fixed/20 to-transparent blur-3xl pointer-events-none" />

            {/* SVG Astrolabe Graduation Rings with Degree Ticks */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
              viewBox="-260 -260 520 520"
              style={{ overflow: 'visible' }}
            >
              <defs>
                <linearGradient id="astrolabe-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#E07A5F" stopOpacity="0.5" />
                  <stop offset="50%" stopColor="#F4A261" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#2D2F44" stopOpacity="0.1" />
                </linearGradient>
              </defs>

              {/* Outer Graduation Ring */}
              <circle cx="0" cy="0" r="215" fill="none" stroke="url(#astrolabe-grad)" strokeWidth="1.5" opacity="0.6" />
              <circle cx="0" cy="0" r="205" fill="none" stroke="#E07A5F" strokeWidth="1" strokeDasharray="3 6" opacity="0.4" />
              <circle cx="0" cy="0" r="145" fill="none" stroke="#DDBEA9" strokeWidth="1" strokeDasharray="4 8" opacity="0.35" />

              {/* 72 Graduation Ticks around the dial */}
              {Array.from({ length: 72 }).map((_, idx) => {
                const angle = (idx * 360) / 72;
                const isMajor = idx % 8 === 0;
                const rInner = isMajor ? 200 : 208;
                const rOuter = 215;
                const rad = (angle * Math.PI) / 180;
                const x1 = rInner * Math.cos(rad);
                const y1 = rInner * Math.sin(rad);
                const x2 = rOuter * Math.cos(rad);
                const y2 = rOuter * Math.sin(rad);

                return (
                  <line
                    key={idx}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#E07A5F"
                    strokeWidth={isMajor ? 2 : 1}
                    opacity={isMajor ? 0.6 : 0.25}
                  />
                );
              })}

              {/* Glowing Dynamic Connector Guide Line (Points towards active node at 0°) */}
              <line
                x1="0"
                y1="0"
                x2="215"
                y2="0"
                stroke="#E07A5F"
                strokeWidth="2.5"
                strokeDasharray="4 4"
                opacity="0.6"
              />
            </svg>

            {/* Center Astrolabe Spirit Core */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full bg-gradient-to-tr from-white/95 via-white/85 to-primary-fixed/40 border-2 border-primary-container/30 shadow-[0_12px_40px_rgba(224,122,95,0.25)] flex flex-col items-center justify-center p-2 z-10 pointer-events-none">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary-container/10 flex items-center justify-center mb-1">
                <span
                  className="material-symbols-outlined text-2xl sm:text-3xl text-primary animate-pulse"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {activeFeature.icon}
                </span>
              </div>
              <span className="font-mono text-xs sm:text-sm font-bold text-on-surface">
                {activeFeature.num} <span className="text-on-surface-variant/50 font-normal">/ 09</span>
              </span>
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-primary truncate max-w-[100px] text-center">
                {activeFeature.shortTitle}
              </span>
            </div>

            {/* ROTATING ORBIT CONTAINER (120FPS GPU Transform) */}
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{
                transform: `rotate(${wheelAngle}deg)`,
                willChange: 'transform',
              }}
            >
              {FEATURES.map((item, i) => {
                const nodeAngle = i * ANGLE_STEP;
                const isActive = i === active;
                const radius = 'clamp(145px, 16vw, 215px)';

                return (
                  <div
                    key={item.id}
                    className="absolute left-1/2 top-1/2 pointer-events-auto"
                    style={{
                      transform: `rotate(${nodeAngle}deg) translate(${radius})`,
                    }}
                  >
                    {/* Counter-rotate button so icons & text stay perfectly upright */}
                    <button
                      type="button"
                      onClick={() => jumpToFeature(i)}
                      aria-label={`Jump to modality ${item.num}: ${item.title}`}
                      aria-current={isActive ? 'true' : undefined}
                      className={`-translate-x-1/2 -translate-y-1/2 rounded-full cursor-pointer flex items-center justify-center group ${
                        isActive
                          ? 'w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 bg-gradient-to-tr from-primary to-primary-container text-white ring-4 ring-primary-fixed shadow-[0_0_35px_rgba(224,122,95,0.85),0_0_70px_rgba(224,122,95,0.4)] z-30'
                          : 'w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-surface-container-lowest/95 text-on-surface-variant border border-outline-variant/40 shadow-sm hover:text-primary z-10 opacity-80 hover:opacity-100'
                      }`}
                      style={{
                        transform: `rotate(${-nodeAngle - wheelAngle}deg) scale(${isActive ? 1.25 : 0.95})`,
                        transition: 'opacity 0.25s ease, filter 0.25s ease, box-shadow 0.25s ease, ring-color 0.25s ease',
                      }}
                    >
                      <div className="flex flex-col items-center justify-center">
                        <span
                          className={`material-symbols-outlined text-[19px] sm:text-[22px] md:text-[24px] ${
                            isActive ? 'text-white' : ''
                          }`}
                        >
                          {item.icon}
                        </span>
                        <span
                          className={`text-[9px] sm:text-[10px] font-mono font-bold leading-none mt-0.5 ${
                            isActive ? 'text-white/95' : 'text-on-surface-variant/70'
                          }`}
                        >
                          {item.num}
                        </span>
                      </div>

                      {/* Floating Tooltip Label on Hover/Active */}
                      <span
                        className={`pointer-events-none absolute whitespace-nowrap px-2.5 py-0.5 rounded-full text-[10.5px] font-bold shadow-lg transition-opacity duration-200 ${
                          isActive
                            ? 'opacity-100 -bottom-7 bg-on-surface text-surface border border-outline-variant/30 scale-105'
                            : 'opacity-0 group-hover:opacity-100 -bottom-6 bg-on-surface/90 text-white scale-95'
                        }`}
                      >
                        {item.shortTitle}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────── */}
          {/* RIGHT: SEAMLESS BLENDED SHOWCASE (Zero DOM Recreation)     */}
          {/* ────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-7 flex flex-col justify-center relative min-h-0 pl-0 lg:pl-2">
            <div className="relative w-full min-h-[380px] sm:min-h-[420px] flex items-center">
              {FEATURES.map((f, i) => {
                const isActive = active === i;
                return (
                  <div
                    key={f.id}
                    className={`w-full transition-all duration-500 ease-out ${
                      isActive
                        ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto relative z-10'
                        : 'opacity-0 translate-y-3 scale-98 pointer-events-none absolute inset-0 -z-10'
                    }`}
                  >
                    {/* Top Row: Category Kicker + Modality Index */}
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-[11px] font-bold uppercase tracking-wider shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        {f.category}
                      </span>
                      <span className="text-xs font-bold text-on-surface-variant/70 font-mono tracking-wide">
                        MODALITY {f.num} OF 09
                      </span>
                    </div>

                    {/* Feature Headline */}
                    <h3 className="font-display-hero text-2xl sm:text-3xl md:text-4xl text-on-surface font-extrabold tracking-tight leading-tight mb-1">
                      {f.title}
                    </h3>

                    {/* Subheadline */}
                    <p className="font-body-lg text-sm sm:text-base font-semibold text-primary-container mb-3 leading-snug">
                      {f.subtitle}
                    </p>

                    {/* ── TWO-COLUMN CONTENT: Narrative on Left, Seamless Blended Picture on Right ── */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6 items-center">
                      {/* Left: Deep Pedagogical Narrative & Highlights */}
                      <div className="md:col-span-7 flex flex-col">
                        <p className="font-body-md text-xs sm:text-[13.5px] text-on-surface-variant leading-relaxed mb-3.5">
                          {f.desc}
                        </p>

                        {/* 3 Key Capabilities with Checkmarks */}
                        <div className="flex flex-col gap-2 mb-4">
                          {f.highlights.map((h, hIdx) => (
                            <div key={hIdx} className="flex items-start gap-2.5 text-xs sm:text-[13px] text-on-surface font-medium">
                              <span className="material-symbols-outlined text-[18px] text-primary shrink-0 mt-0.5">
                                check_circle
                              </span>
                              <span className="leading-snug">{h}</span>
                            </div>
                          ))}
                        </div>

                        {/* Guaranteed Outcome Pill + CTA */}
                        <div className="flex flex-wrap items-center gap-3 pt-2">
                          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary-fixed/70 border border-primary/20 text-xs">
                            <span className="font-bold text-primary">{f.metric}</span>
                            <span className="text-on-surface-variant/80 text-[11.5px]">· {f.metricNote}</span>
                          </div>

                          <Link
                            to="/signup"
                            className="inline-flex items-center gap-1 font-label-md text-xs font-bold text-primary hover:text-primary-container hover:translate-x-0.5 transition-all cursor-pointer"
                          >
                            <span>Experience this modality</span>
                            <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                          </Link>
                        </div>
                      </div>

                      {/* Right: The Grand Blended Picture (Feathered Radial Mask, 100% Seamless) */}
                      <div className="md:col-span-5 flex flex-col items-center justify-center relative group">
                        {/* Radiant Warm Light Halo Behind Artwork */}
                        <div className="absolute w-56 sm:w-64 md:w-72 h-56 sm:h-64 md:h-72 rounded-full bg-gradient-to-tr from-primary-fixed/45 via-secondary-fixed/25 to-transparent blur-3xl pointer-events-none -z-10" />

                        {/* The Seamlessly Blended Picture with Feathered Edges */}
                        <div className="relative w-full max-w-[280px] sm:max-w-[320px] md:max-w-[340px] aspect-[4/3] flex items-center justify-center">
                          <img
                            src={f.image}
                            alt={f.imageAlt}
                            className="w-full h-full object-contain mix-blend-multiply select-none pointer-events-none transition-transform duration-700 group-hover:scale-105"
                            style={{
                              maskImage: 'radial-gradient(ellipse 90% 90% at 50% 50%, black 72%, transparent 100%)',
                              WebkitMaskImage: 'radial-gradient(ellipse 90% 90% at 50% 50%, black 72%, transparent 100%)',
                            }}
                          />

                          {/* Floating Glass Badge */}
                          <div className="absolute -bottom-2 right-1 sm:right-2 px-3 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur-md border border-outline-variant/30 text-[11px] font-bold text-on-surface shadow-md flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            <span>{f.imageBadge}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── BOTTOM NAVIGATION DOTS & STEP CONTROLS ── */}
        <div className="flex items-center justify-between max-w-6xl mx-auto w-full pt-1 shrink-0 text-xs text-on-surface-variant font-label-sm">
          <div className="flex items-center gap-2">
            <span className="font-bold text-primary">{activeFeature.num}</span>
            <span className="text-on-surface-variant/60">of 09</span>
            <span className="hidden sm:inline text-on-surface font-semibold">· {activeFeature.title}</span>
          </div>

          {/* 9 Dots Tracker */}
          <div className="flex items-center gap-1.5">
            {FEATURES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => jumpToFeature(i)}
                aria-label={`Jump to modality ${i + 1}`}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  active === i ? 'w-8 bg-primary shadow-sm' : 'w-2 bg-outline-variant/40 hover:bg-outline-variant'
                }`}
              />
            ))}
          </div>

          {/* Prev / Next Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => jumpToFeature(Math.max(0, active - 1))}
              disabled={active === 0}
              className="p-1.5 rounded-full hover:bg-surface-container-high disabled:opacity-30 transition-colors cursor-pointer"
              title="Previous modality"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            </button>
            <button
              type="button"
              onClick={() => jumpToFeature(Math.min(TOTAL_FEATURES - 1, active + 1))}
              disabled={active === TOTAL_FEATURES - 1}
              className="p-1.5 rounded-full hover:bg-surface-container-high disabled:opacity-30 transition-colors cursor-pointer"
              title="Next modality"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
