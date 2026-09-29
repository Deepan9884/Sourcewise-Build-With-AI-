import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const CHAPTERS = [
  {
    id: 1,
    num: '01',
    leftPageNum: '14',
    rightPageNum: '15',
    shortTitle: 'Flashcards',
    title: 'Smart FSRS Flashcards',
    subtitle: 'Beat the forgetting curve with millisecond-accurate neuro-scheduling',
    category: 'Cognitive Science · FSRS-v5',
    icon: 'style',
    tagClass: 'bg-primary-fixed text-on-primary-fixed',
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
    quote: '"Knowledge reviewed at the point of decay is knowledge cemented for life."',
  },
  {
    id: 2,
    num: '02',
    leftPageNum: '16',
    rightPageNum: '17',
    shortTitle: 'Pomodoro',
    title: 'Binaural Flow Pomodoro',
    subtitle: 'Lock into deep focus in under 4 minutes with neuro-acoustic soundscapes',
    category: 'Neuro-Focus · 40Hz Gamma',
    icon: 'timer',
    tagClass: 'bg-secondary-fixed text-on-secondary-fixed',
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
    quote: '"Flow is not luck; it is a neurological frequency you tune into."',
  },
  {
    id: 3,
    num: '03',
    leftPageNum: '18',
    rightPageNum: '19',
    shortTitle: 'Notes',
    title: 'Neural Concept Notes',
    subtitle: 'Weave lectures, formulas, and proofs into an interactive knowledge canvas',
    category: 'Knowledge Graph · Second Brain',
    icon: 'edit_note',
    tagClass: 'bg-surface-container-highest text-on-surface-variant',
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
    quote: '"Isolated facts fade; interconnected conceptual webs endure."',
  },
  {
    id: 4,
    num: '04',
    leftPageNum: '20',
    rightPageNum: '21',
    shortTitle: 'Socratic AI',
    title: 'Socratic AI Mentor',
    subtitle: 'Contextual Socratic sparring that teaches you how to think, not what to memorize',
    category: 'Socratic Pedagogy · First Principles',
    icon: 'psychology',
    tagClass: 'bg-primary-container text-on-primary',
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
    quote: '"True understanding begins when your assumptions are challenged."',
  },
  {
    id: 5,
    num: '05',
    leftPageNum: '22',
    rightPageNum: '23',
    shortTitle: 'Habits',
    title: 'Gamified Mastery Architecture',
    subtitle: 'Transform grueling study quotas into an addictive, rewarding adventure',
    category: 'Behavioral Psychology · Habit Loops',
    icon: 'military_tech',
    tagClass: 'bg-primary-container text-on-primary',
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
    quote: '"Habits forged in joyful momentum outlast willpower alone."',
  },
  {
    id: 6,
    num: '06',
    leftPageNum: '24',
    rightPageNum: '25',
    shortTitle: 'Quizzes',
    title: 'Adaptive Diagnostic Question Banks',
    subtitle: 'Exam-caliber questions tailored dynamically across Bloom’s Taxonomy',
    category: "Bloom's Taxonomy · Diagnostics",
    icon: 'quiz',
    tagClass: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
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
    quote: '"Diagnostic testing is not judgment; it is a precise map of opportunity."',
  },
  {
    id: 7,
    num: '07',
    leftPageNum: '26',
    rightPageNum: '27',
    shortTitle: 'Synthesizer',
    title: 'Dense Document Synthesizer',
    subtitle: 'Digest 300-page medical treatises and legal casebooks in 60 seconds',
    category: 'Semantic Extraction · 300+ Pages',
    icon: 'summarize',
    tagClass: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
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
    quote: '"Extracting the essence of volume is the hallmark of mastery."',
  },
  {
    id: 8,
    num: '08',
    leftPageNum: '28',
    rightPageNum: '29',
    shortTitle: 'Exam Sim',
    title: 'Proctored Exam Simulator',
    subtitle: 'Inoculate yourself against exam-hall anxiety with realistic timed simulations',
    category: 'Stress Inoculation · High Stakes',
    icon: 'hourglass_top',
    tagClass: 'bg-secondary-fixed text-on-secondary-fixed',
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
    quote: '"We do not rise to the occasion; we sink to the level of our training."',
  },
  {
    id: 9,
    num: '09',
    leftPageNum: '30',
    rightPageNum: '31',
    shortTitle: 'Telemetry',
    title: 'Cognitive Mastery Telemetry',
    subtitle: 'Pinpoint blind spots and predict your exact exam performance before test day',
    category: 'Predictive Analytics · Exam Readiness',
    icon: 'monitoring',
    tagClass: 'bg-primary-fixed text-on-primary-fixed',
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
    quote: '"What is calibrated with precision is conquered with certainty."',
  },
];

const TOTAL_CHAPTERS = CHAPTERS.length;

export default function SourceWiseBookShowcase() {
  const containerRef = useRef(null);
  const targetProgressRef = useRef(0);
  const smoothProgressRef = useRef(0);

  // Smooth scroll tracking state
  const [currentBaseChapter, setCurrentBaseChapter] = useState(0);
  const [turnFraction, setTurnFraction] = useState(0);

  const updateScrollProgress = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const scrollable = el.offsetHeight - window.innerHeight;
    if (scrollable <= 0) return;
    const p = Math.min(1, Math.max(0, -rect.top / scrollable));
    targetProgressRef.current = p;
  }, []);

  // RAF physics loop for 60/120fps continuous 3D page flip
  useEffect(() => {
    let animId;
    let lastTime = performance.now();

    const tick = (now) => {
      const dt = Math.min(48, now - lastTime) / 1000;
      lastTime = now;

      const diff = targetProgressRef.current - smoothProgressRef.current;
      if (Math.abs(diff) > 0.00005) {
        smoothProgressRef.current += diff * Math.min(1, dt * 10);

        const totalSteps = TOTAL_CHAPTERS - 1;
        const rawChapter = smoothProgressRef.current * totalSteps;

        // Base chapter is integer part, fraction is 0..1 representing flip angle
        const base = Math.min(totalSteps - 1, Math.floor(rawChapter));
        const frac = Math.min(1, Math.max(0, rawChapter - base));

        setCurrentBaseChapter(base);
        setTurnFraction(frac);
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

  const jumpToChapter = (index) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const scrollable = el.offsetHeight - window.innerHeight;
    const top = window.scrollY + rect.top + (index / (TOTAL_CHAPTERS - 1)) * scrollable;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  // The active chapter based on the turn fraction (crosses over at 50% / 90deg)
  const activeChapterIndex =
    turnFraction > 0.5 ? Math.min(TOTAL_CHAPTERS - 1, currentBaseChapter + 1) : currentBaseChapter;

  const leftChapter = CHAPTERS[currentBaseChapter];
  const nextChapter = CHAPTERS[Math.min(TOTAL_CHAPTERS - 1, currentBaseChapter + 1)];
  const displayChapter = CHAPTERS[activeChapterIndex];

  // 3D rotation angle of the flipping leaf: 0deg (flat on right) to -180deg (flat on left)
  const flipAngle = -turnFraction * 180;
  // Shadow depth during flip (peaks at 90 degrees)
  const shadowIntensity = Math.sin(turnFraction * Math.PI) * 0.45;

  return (
    <section
      id="features-briefing"
      ref={containerRef}
      className="relative w-full"
      style={{ height: `${TOTAL_CHAPTERS * 100}vh` }}
      aria-label="SourceWise 3D Open Book Showcase"
    >
      {/* ── STICKY PINNED STAGE (The Open Tome) ── */}
      <div className="sticky top-0 h-screen max-h-screen overflow-hidden flex flex-col justify-between pt-16 sm:pt-20 pb-4 md:pb-6 px-3 sm:px-6 md:px-10 max-w-[1440px] mx-auto z-20">
        {/* Ambient atmospheric warm glow */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1100px] h-[750px] bg-gradient-to-tr from-primary-fixed/25 via-secondary-fixed/15 to-transparent blur-3xl opacity-70 -z-10" />

        {/* Section Top Eyebrow & Headline */}
        <div className="text-center max-w-3xl mx-auto shrink-0 mb-1 sm:mb-2">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-primary-fixed/90 text-on-primary-fixed font-label-sm text-xs font-bold uppercase tracking-widest mb-1 shadow-xs border border-primary/20">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            The Ninefold Codex · 3D Interactive Tome
          </div>
          <h2 className="font-display-hero text-2xl sm:text-3xl md:text-4xl lg:text-[38px] text-on-surface font-extrabold tracking-tight leading-tight">
            The SourceWise Volume of Intelligence
          </h2>
          <p className="hidden sm:block font-body-md text-xs sm:text-sm text-on-surface-variant mt-0.5">
            Scroll to turn the physical pages — 9 synchronized modalities engineered for academic momentum.
          </p>
        </div>

        {/* ── INTERACTIVE 3D OPEN BOOK CONTAINER ── */}
        <div
          className="relative w-full max-w-5xl mx-auto flex-1 min-h-0 flex items-center justify-center my-auto"
          style={{ perspective: '2200px' }}
        >
          {/* ── THE 3D LEATHER BINDING & GILDED EDGES ── */}
          <div
            className="relative w-full h-[430px] sm:h-[480px] md:h-[510px] lg:h-[530px] rounded-2xl md:rounded-3xl p-3 sm:p-4 shadow-[0_28px_80px_-15px_rgba(45,47,68,0.35)] flex items-stretch select-none"
            style={{
              background: 'linear-gradient(145deg, #4d1c10 0%, #7c3523 45%, #94402a 70%, #46180c 100%)',
              border: '2px solid rgba(255, 235, 215, 0.35)',
            }}
          >
            {/* Gilded Book Page Thickness (Left & Right outer edges) */}
            <div className="absolute left-1.5 top-3.5 bottom-3.5 w-2 rounded-l-sm bg-gradient-to-r from-[#c5b08c] via-[#f7ecd5] to-[#d8c29d] opacity-95 shadow-inner" />
            <div className="absolute right-1.5 top-3.5 bottom-3.5 w-2 rounded-r-sm bg-gradient-to-l from-[#c5b08c] via-[#f7ecd5] to-[#d8c29d] opacity-95 shadow-inner" />

            {/* Leather Cover Trim & Stitching Detail */}
            <div className="absolute inset-2 rounded-xl md:rounded-2xl border border-dashed border-amber-200/25 pointer-events-none" />

            {/* Embossed Gold Spine Plaque at the top */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-5 py-1 rounded-full bg-gradient-to-r from-[#4d1c10] via-[#7c3523] to-[#4d1c10] border border-amber-300/40 shadow-md text-amber-200 font-mono text-[10.5px] font-bold uppercase tracking-widest flex items-center gap-2 z-30 pointer-events-none">
              <span className="text-amber-300">⚜</span>
              <span>SOURCEWISE CODEX</span>
              <span className="text-amber-300">⚜</span>
            </div>

            {/* ── THE TWO-PAGE PARCHMENT SPREAD ── */}
            <div
              className="relative w-full h-full rounded-xl md:rounded-2xl overflow-hidden shadow-2xl flex"
              style={{
                backgroundColor: '#FAF7F0',
                backgroundImage: 'radial-gradient(#e4dac8 0.75px, transparent 0.75px)',
                backgroundSize: '24px 24px',
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Central Spine Gutter & Optical Depth Shadow */}
              <div
                className="hidden md:block absolute left-1/2 top-0 bottom-0 w-20 -translate-x-1/2 pointer-events-none z-30"
                style={{
                  background:
                    'linear-gradient(to right, transparent 0%, rgba(60,30,15,0.08) 25%, rgba(40,15,5,0.25) 50%, rgba(60,30,15,0.08) 75%, transparent 100%)',
                }}
              />
              <div
                className="hidden md:block absolute left-1/2 top-0 bottom-0 w-[2px] -translate-x-1/2 pointer-events-none z-30"
                style={{ background: 'rgba(50,20,10,0.35)' }}
              />

              {/* ──────────────────────────────────────────────────────── */}
              {/* 1. LEFT STATIC BASE PAGE                                 */}
              {/* Shows Left Chapter (or incoming left chapter after flip) */}
              {/* ──────────────────────────────────────────────────────── */}
              <div className="w-full md:w-1/2 h-full flex flex-col justify-between p-5 sm:p-7 md:p-8 md:pr-10 border-b md:border-b-0 md:border-r border-amber-900/10 relative z-10">
                {/* Running Header */}
                <div className="flex items-center justify-between pb-2 border-b border-amber-900/15 text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-amber-900/60 font-semibold">
                  <span>SOURCEWISE · THE NINEFOLD CODEX</span>
                  <span className="font-serif italic capitalize text-amber-900/70">
                    Chapter {turnFraction > 0.5 ? nextChapter.num : leftChapter.num}
                  </span>
                </div>

                {/* Chapter Story & Pedagogy */}
                <div className="pt-2">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-label-sm text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider ${
                        (turnFraction > 0.5 ? nextChapter : leftChapter).tagClass
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {(turnFraction > 0.5 ? nextChapter : leftChapter).icon}
                      </span>
                      {(turnFraction > 0.5 ? nextChapter : leftChapter).category}
                    </span>
                  </div>

                  <h3 className="font-display-hero text-xl sm:text-2xl md:text-[28px] text-on-surface font-extrabold tracking-tight leading-tight mb-1">
                    {(turnFraction > 0.5 ? nextChapter : leftChapter).title}
                  </h3>

                  <p className="font-body-md text-xs sm:text-[13px] font-semibold text-primary-container mb-2.5 leading-snug">
                    {(turnFraction > 0.5 ? nextChapter : leftChapter).subtitle}
                  </p>

                  <p className="font-body-md text-xs sm:text-[13px] text-on-surface-variant leading-relaxed mb-3 line-clamp-4">
                    {(turnFraction > 0.5 ? nextChapter : leftChapter).desc}
                  </p>

                  {/* 3 Capability Checklist Points */}
                  <div className="flex flex-col gap-1.5 mb-2">
                    {(turnFraction > 0.5 ? nextChapter : leftChapter).highlights.map((h, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs sm:text-[12.5px] text-on-surface font-medium">
                        <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">
                          check_circle
                        </span>
                        <span className="leading-snug">{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Row: Outcome Seal & Page Number */}
                <div className="flex items-center justify-between pt-2 border-t border-amber-900/15">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-900/5 border border-amber-900/15 text-[11px] font-semibold text-amber-950">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="font-bold text-primary">
                      {(turnFraction > 0.5 ? nextChapter : leftChapter).metric}
                    </span>
                  </div>

                  <span className="font-serif italic text-xs text-amber-900/50">
                    — Page {(turnFraction > 0.5 ? nextChapter : leftChapter).leftPageNum} —
                  </span>
                </div>
              </div>

              {/* ──────────────────────────────────────────────────────── */}
              {/* 2. RIGHT STATIC BASE PAGE                                */}
              {/* Underneath the flipping leaf; reveals incoming right page */}
              {/* ──────────────────────────────────────────────────────── */}
              <div className="hidden md:flex w-1/2 h-full flex-col justify-between p-5 sm:p-7 md:p-8 md:pl-10 relative z-0">
                {/* Running Header */}
                <div className="flex items-center justify-between pb-2 border-b border-amber-900/15 text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-amber-900/60 font-semibold">
                  <span className="font-serif italic capitalize text-amber-900/70">Field Notes &amp; Demonstration</span>
                  <span>MODALITY {nextChapter.num} / 09</span>
                </div>

                {/* Blended Character Illustration */}
                <div className="relative flex-1 flex flex-col items-center justify-center my-2 group">
                  <div className="absolute w-44 sm:w-56 h-44 sm:h-56 rounded-full bg-gradient-to-tr from-primary-fixed/30 to-transparent blur-2xl pointer-events-none -z-10" />

                  <div className="relative w-full max-w-[260px] sm:max-w-[300px] md:max-w-[330px] aspect-[4/3] flex items-center justify-center">
                    <img
                      src={nextChapter.image}
                      alt={nextChapter.imageAlt}
                      className="w-full h-full object-contain mix-blend-multiply select-none pointer-events-none"
                      style={{
                        maskImage: 'radial-gradient(ellipse 90% 90% at 50% 50%, black 75%, transparent 100%)',
                        WebkitMaskImage: 'radial-gradient(ellipse 90% 90% at 50% 50%, black 75%, transparent 100%)',
                      }}
                    />

                    <div className="absolute -bottom-1 right-1 px-3 py-1 rounded-full bg-amber-50 border border-amber-900/20 text-[10.5px] font-bold text-amber-950 shadow-sm flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span>{nextChapter.imageBadge}</span>
                    </div>
                  </div>

                  <p className="font-serif italic text-center text-xs sm:text-[12.5px] text-amber-900/75 max-w-xs mt-3">
                    {nextChapter.quote}
                  </p>
                </div>

                {/* Bottom Row */}
                <div className="flex items-center justify-between pt-2 border-t border-amber-900/15">
                  <Link
                    to="/signup"
                    className="inline-flex items-center gap-1 font-label-md text-xs font-bold text-primary hover:text-primary-container transition-all cursor-pointer"
                  >
                    <span>Open this modality in workspace</span>
                    <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                  </Link>

                  <span className="font-serif italic text-xs text-amber-900/50">
                    — Page {nextChapter.rightPageNum} —
                  </span>
                </div>
              </div>

              {/* ──────────────────────────────────────────────────────── */}
              {/* 3. THE 3D FLIPPING LEAF (Peels from Right to Left)       */}
              {/* ──────────────────────────────────────────────────────── */}
              <div
                className="hidden md:block absolute left-1/2 top-0 bottom-0 w-1/2 h-full z-20 pointer-events-none"
                style={{
                  transformOrigin: 'left center',
                  transformStyle: 'preserve-3d',
                  transform: `rotateY(${flipAngle}deg)`,
                  willChange: 'transform',
                }}
              >
                {/* ── FRONT FACE OF FLIPPING LEAF (Current Right Page) ── */}
                <div
                  className="absolute inset-0 w-full h-full flex flex-col justify-between p-5 sm:p-7 md:p-8 md:pl-10 bg-[#FAF7F0]"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    backgroundImage: 'radial-gradient(#e4dac8 0.75px, transparent 0.75px)',
                    backgroundSize: '24px 24px',
                    boxShadow: turnFraction > 0.05 ? '0 10px 35px rgba(0,0,0,0.2)' : 'none',
                  }}
                >
                  {/* Dynamic Curled Paper Shadow on Front Face */}
                  <div
                    className="absolute inset-0 pointer-events-none transition-opacity duration-150"
                    style={{
                      background:
                        'linear-gradient(to right, rgba(0,0,0,0.25) 0%, transparent 20%, rgba(0,0,0,0.15) 100%)',
                      opacity: shadowIntensity,
                    }}
                  />

                  {/* Running Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-amber-900/15 text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-amber-900/60 font-semibold">
                    <span className="font-serif italic capitalize text-amber-900/70">Field Notes &amp; Demonstration</span>
                    <span>MODALITY {leftChapter.num} / 09</span>
                  </div>

                  {/* Current Character Artwork */}
                  <div className="relative flex-1 flex flex-col items-center justify-center my-2">
                    <div className="absolute w-44 sm:w-56 h-44 sm:h-56 rounded-full bg-gradient-to-tr from-primary-fixed/30 to-transparent blur-2xl pointer-events-none -z-10" />

                    <div className="relative w-full max-w-[260px] sm:max-w-[300px] md:max-w-[330px] aspect-[4/3] flex items-center justify-center">
                      <img
                        src={leftChapter.image}
                        alt={leftChapter.imageAlt}
                        className="w-full h-full object-contain mix-blend-multiply select-none pointer-events-none"
                        style={{
                          maskImage: 'radial-gradient(ellipse 90% 90% at 50% 50%, black 75%, transparent 100%)',
                          WebkitMaskImage: 'radial-gradient(ellipse 90% 90% at 50% 50%, black 75%, transparent 100%)',
                        }}
                      />

                      <div className="absolute -bottom-1 right-1 px-3 py-1 rounded-full bg-amber-50 border border-amber-900/20 text-[10.5px] font-bold text-amber-950 shadow-sm flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span>{leftChapter.imageBadge}</span>
                      </div>
                    </div>

                    <p className="font-serif italic text-center text-xs sm:text-[12.5px] text-amber-900/75 max-w-xs mt-3">
                      {leftChapter.quote}
                    </p>
                  </div>

                  {/* Bottom Row */}
                  <div className="flex items-center justify-between pt-2 border-t border-amber-900/15">
                    <span className="text-xs font-bold text-primary">Open this modality in workspace →</span>
                    <span className="font-serif italic text-xs text-amber-900/50">— Page {leftChapter.rightPageNum} —</span>
                  </div>
                </div>

                {/* ── BACK FACE OF FLIPPING LEAF (Incoming Left Page) ── */}
                <div
                  className="absolute inset-0 w-full h-full flex flex-col justify-between p-5 sm:p-7 md:p-8 md:pr-10 bg-[#FAF7F0]"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    backgroundImage: 'radial-gradient(#e4dac8 0.75px, transparent 0.75px)',
                    backgroundSize: '24px 24px',
                    boxShadow: turnFraction > 0.05 ? '0 10px 35px rgba(0,0,0,0.2)' : 'none',
                  }}
                >
                  {/* Dynamic Curled Paper Shadow on Back Face */}
                  <div
                    className="absolute inset-0 pointer-events-none transition-opacity duration-150"
                    style={{
                      background:
                        'linear-gradient(to left, rgba(0,0,0,0.25) 0%, transparent 20%, rgba(0,0,0,0.15) 100%)',
                      opacity: shadowIntensity,
                    }}
                  />

                  {/* Running Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-amber-900/15 text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-amber-900/60 font-semibold">
                    <span>SOURCEWISE · THE NINEFOLD CODEX</span>
                    <span className="font-serif italic capitalize text-amber-900/70">Chapter {nextChapter.num}</span>
                  </div>

                  {/* Incoming Story */}
                  <div className="pt-2">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-label-sm text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider ${nextChapter.tagClass}`}
                      >
                        <span className="material-symbols-outlined text-[14px]">{nextChapter.icon}</span>
                        {nextChapter.category}
                      </span>
                    </div>

                    <h3 className="font-display-hero text-xl sm:text-2xl md:text-[28px] text-on-surface font-extrabold tracking-tight leading-tight mb-1">
                      {nextChapter.title}
                    </h3>

                    <p className="font-body-md text-xs sm:text-[13px] font-semibold text-primary-container mb-2.5 leading-snug">
                      {nextChapter.subtitle}
                    </p>

                    <p className="font-body-md text-xs sm:text-[13px] text-on-surface-variant leading-relaxed mb-3 line-clamp-4">
                      {nextChapter.desc}
                    </p>

                    <div className="flex flex-col gap-1.5 mb-2">
                      {nextChapter.highlights.map((h, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs sm:text-[12.5px] text-on-surface font-medium">
                          <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">
                            check_circle
                          </span>
                          <span className="leading-snug">{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Row */}
                  <div className="flex items-center justify-between pt-2 border-t border-amber-900/15">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-900/5 border border-amber-900/15 text-[11px] font-semibold text-amber-950">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span className="font-bold text-primary">{nextChapter.metric}</span>
                    </div>

                    <span className="font-serif italic text-xs text-amber-900/50">— Page {nextChapter.leftPageNum} —</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
