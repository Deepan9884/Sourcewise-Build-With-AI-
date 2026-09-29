import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import OrbitShowcase from '../components/landing/OrbitShowcase';
import SourceWiseBookShowcase from '../components/landing/SourceWiseBookShowcase';
import LandingBackground from '../components/landing/LandingBackground';

const tailsData = {
  1: {
    id: 1,
    title: 'Tail #1: Smart FSRS Flashcards',
    shortTitle: '1. Flashcards',
    desc: 'Cognitive spaced repetition powered by the Free Spaced Repetition Scheduler (FSRS-v5)',
    icon: 'style',
    angle: -80,
    category: 'Cognitive Science',
    tagClass: 'bg-primary-fixed text-on-primary-fixed',
    dotClass: 'bg-primary',
    iconColor: 'text-primary',
    fullDesc:
      'Engineered on the next-gen Free Spaced Repetition Scheduler (FSRS-5). Calculates your unique neuro-forgetting curve to schedule reviews at the exact millisecond before memory decay, guaranteeing 98%+ retention with 30% less review time.',
    featureNote: 'FSRS-5 Dynamic Decay Curve',
    metric: '98.4% Retention Guarantee',
    actionText: 'Explore spaced retrieval',
    svgLabel: { text: 'Smart Flashcards', width: 144, stroke: '#e07a5f' },
  },
  2: {
    id: 2,
    title: 'Tail #2: Binaural Flow Pomodoro',
    shortTitle: '2. Pomodoro',
    desc: 'Adaptive flow state cycles with 40Hz gamma binaural soundscapes',
    icon: 'timer',
    angle: -60,
    category: 'Neuro-Focus',
    tagClass: 'bg-secondary-fixed text-on-secondary-fixed',
    dotClass: 'bg-secondary',
    iconColor: 'text-secondary',
    fullDesc:
      'Sync your study sessions to natural ultradian brain rhythms. Embedded 40Hz gamma binaural waves stimulate neuro-synchrony and eliminate academic anxiety, locking you into unbroken flow in under 4 minutes.',
    featureNote: '40Hz Gamma Neural Sync',
    metric: 'Flow State Induction 2.4x',
    actionText: 'Tune focus soundscapes',
    svgLabel: { text: 'Pomodoro Timer', width: 136, stroke: '#fe8e8b' },
  },
  3: {
    id: 3,
    title: 'Tail #3: Neural Concept Notes',
    shortTitle: '3. Live Notes',
    desc: 'Live peer sync, KaTeX equations, and bidirectional backlink graphs',
    icon: 'edit_note',
    angle: -40,
    category: 'Knowledge Graph',
    tagClass: 'bg-surface-container-highest text-on-surface-variant',
    dotClass: 'bg-outline',
    iconColor: 'text-on-surface-variant',
    fullDesc:
      'A multi-dimensional second brain for scholars. Automatically weaves lecture transcripts, KaTeX equation proofs, and research citations into an interactive concept graph with real-time peer co-editing.',
    featureNote: 'Bidirectional Graph Links',
    metric: 'Live Peer Co-Sync',
    actionText: 'Open interactive canvas',
    svgLabel: { text: 'Collaborative Notes', width: 154, stroke: '#e07a5f' },
  },
  4: {
    id: 4,
    title: 'Tail #4: Socratic AI Mentor',
    shortTitle: '4. Socratic AI',
    desc: 'Contextual Socratic dialogue & first-principles proofs without hallucination',
    icon: 'psychology',
    angle: -20,
    category: 'Socratic Pedagogy',
    tagClass: 'bg-primary-container text-on-primary shadow-sm',
    dotClass: 'bg-on-primary',
    iconColor: 'text-primary',
    fullDesc:
      'A brilliant 24/7 intellectual sparring partner. Rather than feeding fragile answers, it asks probing Socratic questions to challenge flawed assumptions, prove theorems step-by-step, and solidify first-principles understanding.',
    featureNote: 'Zero-Hallucination Guard',
    metric: 'First-Principles Proofs',
    actionText: 'Start Socratic sparring',
    svgLabel: { text: 'AI Study Assistant', width: 150, stroke: '#e07a5f' },
  },
  5: {
    id: 5,
    title: 'Tail #5: Gamified Mastery Architecture',
    shortTitle: '5. Habits',
    desc: 'Behavioral commitment loops, study streaks, and kitsune familiar evolutions',
    icon: 'military_tech',
    angle: 0,
    category: 'Behavioral Psychology',
    tagClass: 'bg-primary-container text-on-primary shadow-sm',
    dotClass: 'bg-on-primary',
    iconColor: 'text-primary-container',
    fullDesc:
      'Turn relentless coursework into addictive academic momentum. Leverage loss-aversion loops and milestone evolutions to transform daily study quotas into lasting cognitive habits that feel rewarding.',
    featureNote: 'Dopamine-Optimized Habits',
    metric: 'Level 9 Kitsune Evolution',
    actionText: 'Build unbroken streaks',
    svgLabel: { text: 'Goal & Habit Tracker', width: 168, stroke: '#ffffff' },
  },
  6: {
    id: 6,
    title: 'Tail #6: Adaptive Diagnostic Question Banks',
    shortTitle: '6. Quizzes',
    desc: "Auto-generated test banks scaled across Bloom's Taxonomy with distractor rationale",
    icon: 'quiz',
    angle: 20,
    category: "Bloom's Taxonomy",
    tagClass: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
    dotClass: 'bg-tertiary',
    iconColor: 'text-tertiary',
    fullDesc:
      "Instantly converts raw syllabi and lecture slides into rigorous question banks. Scaled from foundational recall to complex multi-step synthesis, complete with exhaustive diagnostic distractor analysis.",
    featureNote: "Bloom's Taxonomy Level 1-6",
    metric: 'Full Distractor Analytics',
    actionText: 'Generate adaptive quiz',
    svgLabel: { text: 'Practice MCQs', width: 130, stroke: '#8f9994' },
  },
  7: {
    id: 7,
    title: 'Tail #7: Dense Document Synthesizer',
    shortTitle: '7. Summaries',
    desc: 'Instant semantic synthesis of 300+ page clinical papers, casebooks, and decks',
    icon: 'summarize',
    angle: 40,
    category: 'Semantic Extraction',
    tagClass: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
    dotClass: 'bg-tertiary',
    iconColor: 'text-tertiary',
    fullDesc:
      'Digest 300+ page medical treatises, legal briefs, and textbooks in 60 seconds. Extracts critical domain taxonomies, core mathematical formulas, and high-yield executive summaries without losing nuance.',
    featureNote: '300+ Page Context Engine',
    metric: '60-Sec High-Yield Digest',
    actionText: 'Synthesize research paper',
    svgLabel: { text: 'Document Summarizer', width: 160, stroke: '#8f9994' },
  },
  8: {
    id: 8,
    title: 'Tail #8: Proctored Exam Simulator',
    shortTitle: '8. Exam Sim',
    desc: 'Stress inoculation with authentic exam hall countdowns and rubric grading',
    icon: 'hourglass_top',
    angle: 60,
    category: 'Stress Inoculation',
    tagClass: 'bg-secondary-fixed text-on-secondary-fixed',
    dotClass: 'bg-secondary',
    iconColor: 'text-secondary',
    fullDesc:
      'Inoculate yourself against test-day cognitive freeze. Replicates high-stakes proctored exam conditions with strict countdown thresholds, blind problem delivery, and step-level partial credit rubric scoring.',
    featureNote: 'Proctored Pressure Simulation',
    metric: 'Step-Level Rubric Grading',
    actionText: 'Launch exam simulation',
    svgLabel: { text: 'Exam Simulator', width: 134, stroke: '#fe8e8b' },
  },
  9: {
    id: 9,
    title: 'Tail #9: Cognitive Mastery Telemetry',
    shortTitle: '9. Analytics',
    desc: 'Cognitive retention heatmaps, velocity tracking, and exam readiness scores',
    icon: 'monitoring',
    angle: 80,
    category: 'Predictive Analytics',
    tagClass: 'bg-primary-fixed text-on-primary-fixed',
    dotClass: 'bg-primary',
    iconColor: 'text-primary',
    fullDesc:
      'Deep intellectual telemetry on your memory decay, syllabus mastery, and recall velocity. Pinpoints precise blind spots and calculates predicted exam performance with 94% calibration before test day.',
    featureNote: 'Predictive Mastery Calibration',
    metric: 'Pre-Exam Score +18% Lift',
    actionText: 'Inspect mastery telemetry',
    svgLabel: { text: 'Analytics & Insights', width: 152, stroke: '#e07a5f' },
  },
};

const TAIL_BASE_ANGLES = {
  1: -80,
  2: -60,
  3: -40,
  4: -20,
  5: 0,
  6: 20,
  7: 40,
  8: 60,
  9: 80,
};

const getTailAngle = (tailId, selectedTailId) => {
  const baseAngle = TAIL_BASE_ANGLES[tailId];
  if (!selectedTailId) return baseAngle;
  if (tailId === selectedTailId) return baseAngle;

  const allIds     = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const leftTails  = allIds.filter((id) => id < selectedTailId);
  const rightTails = allIds.filter((id) => id > selectedTailId);

  // Full sweep range — slightly wider than the resting ±80 to give all
  // tails breathing room regardless of which one is selected.
  const OUTER_LIMIT = 88;
  // Minimum clear gap (degrees) between the selected tail and its nearest
  // non-selected neighbour — large enough so pill labels never overlap.
  const GAP = 28;

  if (tailId < selectedTailId) {
    const count = leftTails.length;
    const idx   = leftTails.indexOf(tailId);
    // innermost allowed position: just to the left of the selected tail
    const inner = TAIL_BASE_ANGLES[selectedTailId] - GAP;
    const outer = -OUTER_LIMIT;
    if (count === 1) return inner;
    // Distribute evenly from outer limit → inner across all left tails
    const step = (inner - outer) / (count - 1);
    return outer + idx * step;
  } else {
    const count = rightTails.length;
    const idx   = rightTails.indexOf(tailId);
    // innermost allowed position: just to the right of the selected tail
    const inner = TAIL_BASE_ANGLES[selectedTailId] + GAP;
    const outer = OUTER_LIMIT;
    if (count === 1) return inner;
    // Distribute evenly from inner → outer across all right tails
    const step = (outer - inner) / (count - 1);
    return inner + idx * step;
  }
};

export default function LandingPage() {
  const [activeTail, setActiveTail] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const sortedTailIds = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort((a, b) => {
    if (a === activeTail) return 1;
    if (b === activeTail) return -1;
    return a - b;
  });

  const handleTailClick = (id) => {
    setActiveTail((prev) => (prev === id ? null : id));
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative font-body-md text-body-md text-on-surface antialiased selection:bg-primary-fixed selection:text-on-primary-fixed min-h-screen overflow-x-clip">
      {/* ============================================================= */}
      {/* GLOBAL PAGE BACKGROUND — LandingBackground component          */}
      {/* ============================================================= */}
      <LandingBackground />
      {/* ================================================================= */}
      {/* HEADER / NAVIGATION                                               */}
      {/* ================================================================= */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-2xl border-b" style={{ background: 'hsla(28 30% 97% / 0.72)', borderColor: 'hsla(14 40% 70% / 0.18)', boxShadow: '0 1px 32px hsla(14 55% 60% / 0.07), inset 0 -1px 0 hsla(38 60% 85% / 0.30)' }}>
        <div className="h-20 w-full px-4 md:px-6 flex items-center justify-between gap-space-md">
          {/* Brand Logo */}
          <div className="flex items-center gap-space-sm shrink-0 mr-auto">
            <Link className="flex items-center gap-space-sm group" to="/">
              <img
                alt="SourceWise Circular Fox Logo"
                className="h-12 w-12 object-contain transition-transform group-hover:scale-105"
                src="/logo-mark.png"
              />
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-on-surface font-bold tracking-tight group-hover:text-primary transition-colors">
                  SourceWise
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold tracking-wider uppercase -mt-1">
                  AI Study Suite
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex flex-1 items-center justify-center gap-space-lg">
            <button
              onClick={() => scrollToSection('nine-tails-grid')}
              className="font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('video-tour')}
              className="font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              Demo
            </button>
          </nav>

          {/* Auth & CTA buttons */}
          <div className="flex items-center gap-space-sm shrink-0 ml-auto">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center font-label-lg text-label-lg text-on-primary bg-primary-container hover:bg-primary shadow-[0_8px_20px_-4px_rgba(224,122,95,0.4)] px-space-lg py-space-xs h-10 rounded-full transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden sm:inline-flex font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface px-space-sm py-space-xs transition-colors"
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center font-label-lg text-label-lg text-on-primary bg-primary-container hover:bg-primary shadow-[0_8px_20px_-4px_rgba(224,122,95,0.4)] px-space-lg py-space-xs h-10 rounded-full transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  Get Started Free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ================================================================= */}
      {/* MAIN CONTENT                                                      */}
      {/* ================================================================= */}
      <main className="relative z-10 w-full pt-20">
        <div className="flex flex-col w-full">
          {/* NOTE: must stay overflow-clip (NOT overflow-hidden) — a hidden/
             scroll/auto ancestor becomes the sticky scrollport and silently
             disables the pinned OrbitShowcase viewport below. `clip` keeps the
             same visual clipping without creating a scroll container. */}
          <div className="relative w-full overflow-clip">

            {/* ================================================================= */}
            {/* 1. HERO & INTERACTIVE 2D FOX CENTERPIECE                          */}
            {/* ================================================================= */}
            <section className="relative max-w-[1400px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin-desktop pt-8 sm:pt-12 md:pt-16 pb-12 sm:pb-20 flex flex-col items-center text-center">
              {/* Hero Header Block */}
              <div className="relative max-w-5xl mx-auto flex flex-col items-center mb-6 sm:mb-10">
                {/* Main Headline */}
                <h1 className="font-display-hero text-3xl sm:text-4xl md:text-5xl lg:text-[54px] xl:text-[58px] text-on-surface font-extrabold tracking-tight max-w-5xl mx-auto leading-[1.14] mb-4 sm:mb-6">
                  Unleash the Power of{' '}
                  <span className="text-primary-container relative inline-block">
                    Ninefold Intelligence
                    <svg className="absolute left-0 -bottom-2 w-full h-3 text-primary-fixed" fill="none" preserveAspectRatio="none" viewBox="0 0 260 12">
                      <path d="M4 8C70 2 190 2 256 9" stroke="currentColor" strokeLinecap="round" strokeWidth="4"></path>
                    </svg>
                  </span>{' '}
                  for Your Studies.
                </h1>

                {/* Subheadline */}
                <p className="font-body-lg text-base sm:text-lg md:text-xl text-on-surface-variant max-w-3xl mx-auto mb-6 sm:mb-8 leading-relaxed font-normal">
                  Transform lecture overload, dense textbooks, and relentless deadlines into effortless mastery. Experience nine synchronized study modalities powered by intuitive fox-smart AI.
                </p>

                {/* CTA Button */}
                <div className="flex items-center justify-center mb-2">
                  <Link
                    to="/signup"
                    className="inline-flex items-center justify-center gap-2.5 font-label-lg text-base sm:text-lg text-on-primary bg-primary-container hover:bg-primary shadow-[0_12px_28px_-6px_rgba(224,122,95,0.45)] px-8 py-3.5 h-12 sm:h-14 rounded-full transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <span>Start Free Journey</span>
                    <span className="material-symbols-outlined text-[22px]">arrow_forward</span>
                  </Link>
                </div>
              </div>

              {/* Fox Centerpiece Area */}
              <div className="relative w-full max-w-5xl mx-auto flex flex-col items-center justify-center">
                {/* Upper Side: Topic Explanation Card or Resting Prompt */}
                <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center mb-4 sm:mb-6 px-2 z-20">
                  {activeTail !== null && tailsData[activeTail] ? (
                    <div
                      key={activeTail}
                      className="w-full rounded-2xl p-4 sm:p-5 transition-all duration-400 animate-in fade-in slide-in-from-top-2"
                      style={{
                        background: 'linear-gradient(145deg, hsla(28 40% 100% / 0.82) 0%, hsla(14 35% 98% / 0.68) 100%)',
                        backdropFilter: 'blur(20px) saturate(1.5)',
                        WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
                        border: '1px solid hsla(14 50% 80% / 0.45)',
                        boxShadow: '0 12px 36px hsla(14 40% 50% / 0.14), 0 1px 0 hsla(38 80% 95% / 0.85) inset',
                      }}
                    >
                      {/* Top Row: Category Badge on left, Icon and Close on right */}
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full font-label-sm text-xs font-bold tracking-wide uppercase ${tailsData[activeTail].tagClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${tailsData[activeTail].dotClass}`}></span>
                          Tail {activeTail} · {tailsData[activeTail].category}
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`material-symbols-outlined ${tailsData[activeTail].iconColor} text-[22px]`}
                          >
                            {tailsData[activeTail].icon}
                          </span>
                          <button
                            onClick={() => setActiveTail(null)}
                            title="Reset tails (Show all 9)"
                            className="w-6 h-6 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant flex items-center justify-center transition-colors cursor-pointer text-xs font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="font-headline-sm text-base sm:text-lg font-bold text-primary-container mb-1.5 leading-snug tracking-tight">
                        {tailsData[activeTail].title.replace(/Tail #\d+:\s*/, '')}
                      </h3>

                      {/* Description - catchy, complete, and knowledgeable */}
                      <p className="font-body-md text-xs sm:text-sm text-on-surface-variant leading-relaxed mb-3">
                        {tailsData[activeTail].fullDesc}
                      </p>

                      {/* Sub Feature & Metric Bar */}
                      <div className="px-3 py-2 bg-surface-container-high/70 rounded-xl mb-3 flex items-center justify-between text-on-surface-variant font-label-sm text-xs border border-outline-variant/20 shadow-2xs">
                        <span className="flex items-center gap-2">
                          <span
                            className={`material-symbols-outlined text-[17px] ${tailsData[activeTail].iconColor}`}
                          >
                            {activeTail === 1
                              ? 'sync_alt'
                              : activeTail === 2
                              ? 'graphic_eq'
                              : activeTail === 3
                              ? 'hub'
                              : activeTail === 4
                              ? 'verified'
                              : activeTail === 5
                              ? 'local_fire_department'
                              : activeTail === 6
                              ? 'tune'
                              : activeTail === 7
                              ? 'picture_as_pdf'
                              : activeTail === 8
                              ? 'alarm_on'
                              : 'insights'}
                          </span>
                          <span className="font-semibold text-xs sm:text-sm text-on-surface">{tailsData[activeTail].featureNote}</span>
                        </span>
                        <span className={`font-bold text-xs sm:text-sm ${tailsData[activeTail].iconColor} bg-surface-container-lowest/80 px-2.5 py-0.5 rounded-md border border-outline-variant/20 shadow-2xs`}>
                          {tailsData[activeTail].metric}
                        </span>
                      </div>

                      {/* Bottom Controls: Tail Carousel Arrows + Action Link */}
                      <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleTailClick(activeTail === 1 ? 9 : activeTail - 1)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors cursor-pointer px-2.5 py-1 rounded-full bg-surface-container-high/60 hover:bg-surface-container-highest"
                          >
                            <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                            <span>Prev</span>
                          </button>
                          <span className="text-xs text-on-surface-variant/70 font-semibold px-1.5">
                            {activeTail} / 9
                          </span>
                          <button
                            onClick={() => handleTailClick(activeTail === 9 ? 1 : activeTail + 1)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors cursor-pointer px-2.5 py-1 rounded-full bg-surface-container-high/60 hover:bg-surface-container-highest"
                          >
                            <span>Next</span>
                            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                          </button>
                        </div>

                        <button
                          onClick={() => scrollToSection('video-tour')}
                          className={`inline-flex items-center gap-1 font-label-md text-xs sm:text-sm font-bold ${tailsData[activeTail].iconColor} hover:translate-x-0.5 transition-all cursor-pointer`}
                        >
                          <span>{tailsData[activeTail].actionText}</span>
                          <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Resting state hint */
                    <div className="flex flex-col items-center justify-center gap-1.5 text-center py-2 animate-in fade-in duration-300">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-lowest/90 border border-outline-variant/30 text-on-surface-variant font-label-sm text-xs sm:text-sm shadow-xs">
                        <span className="material-symbols-outlined text-primary text-[18px] animate-pulse">
                          touch_app
                        </span>
                        <span>Touch or click any tail to focus its power &amp; explore topic breakdown</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* SVG Stage — overflow visible + padded viewBox so end-tail pills never clip */}
                <div className="relative w-full max-w-5xl h-[360px] sm:h-[420px] md:h-[460px] lg:h-[480px] flex items-center justify-center">
                  <svg
                    className="w-full h-full select-none overflow-visible"
                    viewBox="-160 -160 1420 810"
                    preserveAspectRatio="xMidYMid meet"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ overflow: 'visible' }}
                  >
                    <defs>
                      {/* Unified Warm Terracotta Brand Palette Gradients */}
                      <linearGradient id="warm-tail-main" x1="0%" x2="0%" y1="100%" y2="0%">
                        <stop offset="0%" stopColor="#FFE8D6" />
                        <stop offset="45%" stopColor="#F28482" />
                        <stop offset="100%" stopColor="#E07A5F" />
                      </linearGradient>
                      <linearGradient id="warm-tail-edge" x1="0%" x2="100%" y1="0%" y2="100%">
                        <stop offset="0%" stopColor="#F4A261" />
                        <stop offset="60%" stopColor="#E07A5F" />
                        <stop offset="100%" stopColor="#C5684F" />
                      </linearGradient>
                      <linearGradient id="warm-tail-tip" x1="0%" x2="0%" y1="100%" y2="0%">
                        <stop offset="0%" stopColor="#FFF5EE" />
                        <stop offset="100%" stopColor="#FFFFFF" />
                      </linearGradient>

                      {/* Reusable Master Large Low-Poly Tail Unit */}
                      <g id="master-tail-unit">
                        <path
                          d="M -16,0 C -28,-70 -48,-190 -54,-330 C -56,-410 -40,-470 0,-510 C 40,-470 56,-410 54,-330 C 48,-190 28,-70 16,0 Z"
                          fill="url(#warm-tail-main)"
                          opacity="0.96"
                        />
                        <polygon fill="#F4A261" opacity="0.65" points="0,-510 -54,-330 -24,-260 0,-365" />
                        <polygon fill="#C9634A" opacity="0.55" points="0,-510 54,-330 24,-260 0,-365" />
                        <polygon fill="#E07A5F" opacity="0.85" points="0,-365 -24,-260 -36,-140 0,-165" />
                        <polygon fill="#D26E54" opacity="0.85" points="0,-365 24,-260 36,-140 0,-165" />
                        <polygon fill="#F28482" opacity="0.5" points="0,-165 -36,-140 -16,0 0,0" />
                        <polygon fill="#E07A5F" opacity="0.4" points="0,-165 36,-140 16,0 0,0" />
                        <polygon fill="url(#warm-tail-tip)" opacity="0.95" points="0,-510 -22,-445 0,-425 22,-445" />
                        <polygon fill="#FFFFFF" opacity="0.9" points="0,-510 0,-425 22,-445" />
                        <circle cx="0" cy="-504" fill="#FFFFFF" filter="drop-shadow(0px 2px 4px rgba(45,47,68,0.18))" r="9" />
                      </g>

                      {/* Ambient Glow Filter */}
                      <filter height="150%" id="soft-glow" width="150%" x="-25%" y="-25%">
                        <feGaussianBlur result="blur" stdDeviation="12" />
                        <feColorMatrix
                          in="blur"
                          result="coloredBlur"
                          type="matrix"
                          values="1 0 0 0 0.88  0 0.48 0 0 0.37  0 0 0.37 0 0.28  0 0 0 0.75 0"
                        />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {/* 180° Arc Guideline and Aura Rings */}
                    <path
                      d="M 50,525 A 500,500 0 0,1 1050,525"
                      fill="none"
                      opacity="0.5"
                      stroke="#FFE8D6"
                      strokeDasharray="5 7"
                      strokeWidth="2"
                    />
                    <circle cx="550" cy="525" fill="#FFE8D6" opacity="0.18" r="410" />
                    <circle cx="550" cy="525" fill="#F4A261" opacity="0.1" r="280" />

                    {/* THE 9 SYMMETRICAL TAILS WITH COLLISION ANIMATION */}
                    <g id="nine-symmetrical-tails-fan">
                      {sortedTailIds.map((id) => {
                        const tail = tailsData[id];
                        const isSelected = activeTail === id;
                        const hasSelection = activeTail !== null;
                        const targetAngle = getTailAngle(id, activeTail);
                        const currentScale = isSelected ? 1.12 : hasSelection ? 0.92 : 1;
                        const currentOpacity = isSelected ? 1 : hasSelection ? 0.6 : 0.95;
                        // Permanent two-tier stagger: neighbours always sit on
                        // different radii, so wide pills can never overlap —
                        // resting state included. Selected pill jumps outermost.
                        const labelRadius = isSelected ? -630 : id % 2 === 0 ? -580 : -525;
                        const labelScale = isSelected ? 1 : hasSelection ? 0.85 : 0.92;
                        const labelOpacity = isSelected ? 1 : hasSelection ? 0.9 : 1;

                        return (
                          <g
                            key={id}
                            className="tail-node cursor-pointer select-none"
                            data-tail={id}
                            onClick={() => handleTailClick(id)}
                            style={{
                              transform: `translate(550px, 525px) rotate(${targetAngle}deg) scale(${currentScale})`,
                              transformOrigin: '0 0',
                              transition:
                                'transform 0.65s cubic-bezier(0.34, 1.4, 0.64, 1), opacity 0.45s ease, filter 0.45s ease',
                              opacity: currentOpacity,
                              filter: isSelected
                                ? 'drop-shadow(0 0 18px rgba(224,122,95,0.65)) drop-shadow(0 6px 14px rgba(154,68,45,0.35))'
                                : 'none',
                            }}
                          >
                            <use href="#master-tail-unit" />
                            <g
                              style={{
                                transform: `translate(0px, ${labelRadius}px) rotate(${-targetAngle}deg) scale(${labelScale})`,
                                transformOrigin: '0 0',
                                transition:
                                  'transform 0.65s cubic-bezier(0.34, 1.4, 0.64, 1), opacity 0.35s ease',
                                opacity: labelOpacity,
                                pointerEvents: 'auto',
                              }}
                            >
                              <rect
                                fill={isSelected ? '#9a442d' : '#ffffff'}
                                filter="drop-shadow(0px 4px 12px rgba(45,47,68,0.28))"
                                height="32"
                                rx="16"
                                stroke={isSelected ? '#ffffff' : tail.svgLabel.stroke}
                                strokeOpacity="1"
                                strokeWidth="2"
                                width={tail.svgLabel.width + 24}
                                x={-(tail.svgLabel.width + 24) / 2}
                                y="-16"
                              />
                              <circle
                                cx={-(tail.svgLabel.width + 24) / 2 + 17}
                                cy="0"
                                fill={isSelected ? '#ffffff' : '#c14a2e'}
                                r="5"
                                stroke={isSelected ? '#9a442d' : '#ffffff'}
                                strokeWidth="1.5"
                              />
                              <text
                                fill={isSelected ? '#ffffff' : '#101223'}
                                fontFamily="Plus Jakarta Sans, Inter, system-ui, sans-serif"
                                fontSize="13.5"
                                fontWeight="800"
                                letterSpacing="0.02em"
                                textAnchor="middle"
                                x="8"
                                y="4.5"
                                style={{ paintOrder: 'stroke' }}
                                stroke={isSelected ? 'transparent' : '#ffffff'}
                                strokeWidth="3"
                              >
                                {tail.svgLabel.text}
                              </text>
                            </g>
                          </g>
                        );
                      })}
                    </g>

                    {/* FOX BODY & HEAD */}
                    <g id="fox-body-group" transform="translate(550, 532) scale(0.64) translate(-500, -450)">
                      <ellipse cx="500" cy="580" fill="#2d2f44" opacity="0.1" rx="150" ry="24" />
                      <polygon fill="#E07A5F" points="410,565 380,470 450,430 500,470" />
                      <polygon fill="#C9634A" points="590,565 620,470 550,430 500,470" />
                      <polygon fill="#F4A261" points="410,565 500,585 500,470" />
                      <polygon fill="#E07A5F" points="590,565 500,585 500,470" />
                      <polygon fill="#FFFFFF" points="450,585 475,585 470,555 445,555" />
                      <polygon fill="#F5F3EF" points="525,585 550,585 555,555 530,555" />
                      <polygon fill="#FFFFFF" points="500,390 450,450 500,500" />
                      <polygon fill="#F5F3EF" points="500,390 550,450 500,500" />
                      <polygon fill="#EDE9E3" points="450,450 430,490 500,530 500,500" />
                      <polygon fill="#E2DDD5" points="550,450 570,490 500,530 500,500" />
                      <polygon fill="#E07A5F" points="440,330 400,220 470,280" />
                      <polygon fill="#2D2F44" points="440,320 415,240 460,280" />
                      <polygon fill="#FFFFFF" points="445,310 425,255 458,282" />
                      <polygon fill="#C9634A" points="560,330 600,220 530,280" />
                      <polygon fill="#2D2F44" points="560,320 585,240 540,280" />
                      <polygon fill="#F5F3EF" points="555,310 575,255 542,282" />
                      <polygon fill="#F28482" points="500,280 440,330 470,370 500,390" />
                      <polygon fill="#E07A5F" points="500,280 560,330 530,370 500,390" />
                      <polygon fill="#F4A261" points="500,270 470,310 500,335 530,310" />
                      <polygon fill="#FFFFFF" opacity="0.95" points="500,295 492,308 500,322 508,308" />
                      <polygon fill="#FFFFFF" points="440,330 420,375 470,370" />
                      <polygon fill="#F5F3EF" points="560,330 580,375 530,370" />
                      <polygon fill="#EDE9E3" points="420,375 465,405 470,370" />
                      <polygon fill="#E2DDD5" points="580,375 535,405 530,370" />
                      <polygon fill="#FFFFFF" points="500,335 475,370 500,400" />
                      <polygon fill="#F5F3EF" points="500,335 525,370 500,400" />
                      <polygon fill="#2D2F44" points="500,394 494,387 506,387" />
                      <polygon fill="#2D2F44" points="465,342 485,347 470,352" />
                      <circle cx="475" cy="346" fill="#E07A5F" r="2" />
                      <circle cx="476" cy="345" fill="#FFFFFF" r="0.8" />
                      <polygon fill="#2D2F44" points="535,342 515,347 530,352" />
                      <circle cx="525" cy="346" fill="#E07A5F" r="2" />
                      <circle cx="524" cy="345" fill="#FFFFFF" r="0.8" />
                      <line stroke="#DDBEA9" strokeLinecap="round" strokeWidth="2" x1="435" x2="385" y1="375" y2="365" />
                      <line stroke="#DDBEA9" strokeLinecap="round" strokeWidth="2" x1="430" x2="380" y1="385" y2="388" />
                      <line stroke="#DDBEA9" strokeLinecap="round" strokeWidth="2" x1="565" x2="615" y1="375" y2="365" />
                      <line stroke="#DDBEA9" strokeLinecap="round" strokeWidth="2" x1="570" x2="620" y1="385" y2="388" />
                    </g>
                  </svg>
                </div>
              </div>
            </section>

            {/* ================================================================= */}
            {/* 3. SCROLL-PINNED ORBIT SHOWCASE (replaces 3×3 grid)              */}
            {/* Images orbit in a circle; the center story swaps as you scroll */}
            {/* and the viewport stays pinned until the last story is reached.  */}
            {/* ================================================================= */}
            <OrbitShowcase />

            {/* ================================================================= */}
            {/* 4. PRODUCT DEMO / INTERACTIVE VIDEO EXPLAINER SECTION             */}
            {/* ================================================================= */}
            <section
              className="max-w-[1320px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin-desktop py-space-2xl md:py-space-3xl"
              id="video-tour"
            >
              <div className="bg-transparent p-space-lg md:p-space-2xl">
                <div className="text-center max-w-2xl mx-auto mb-space-xl">
                  <span className="font-label-sm text-label-sm font-bold uppercase tracking-widest text-primary mb-space-2xs inline-block">
                    Visual Demonstration
                  </span>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">See Ninefold Intelligence in Action</h2>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Watch how the kitsune companion effortlessly orchestrates your entire semester curriculum.
                  </p>
                </div>

                {/* Video Player Window */}
                <div className="relative max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-[0_16px_40px_-8px_rgba(43,45,66,0.12)] bg-surface border border-outline-variant/30">
                  {/* Video Canvas / Interactive Screen Representation */}
                  <div className="relative aspect-video w-full overflow-hidden group">
                    <img
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      alt="SourceWise study suite UI"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDW_sf1rvvrf6Thd_CKATurcjPZKO1eubGpEVIilKIphwjMsKAy67tPM31rG9E6V6SeDFgf_wujb0xoEo8-04AWrzdyDUoMvHhvw9JAAEBx8BhCSPH7T-K1PAoS-8dyarUQAuX_iG1nMjLw0T5JGQxSnFwbBtu8VpU9c9oLss6VamaqH-mBnfME70Vcj7L4ZvXwxphEHsiSTrP83sMyuyjYrjSpSVeZF-sp7R5JBqLDSNQL_FdnMWJf"
                    />

                    {/* Dark Frosted Player Scrim Overlay */}
                    <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-[2px] flex flex-col justify-between p-space-md md:p-space-lg transition-opacity duration-300">
                      {/* Video Top Bar */}
                      <div className="flex items-center justify-between text-surface-container-lowest">
                        <div className="flex items-center gap-space-xs">
                          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary">
                            <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                          </div>
                          <div>
                            <h4 className="font-title-md text-title-md font-bold leading-tight text-white">
                              SourceWise Platform Walkthrough (2025)
                            </h4>
                            <p className="font-label-sm text-label-sm text-white/80">Full Syllabus Mastery in Under 4 Minutes</p>
                          </div>
                        </div>
                        <span className="font-label-md text-label-md px-space-xs py-0.5 rounded bg-on-surface/60 backdrop-blur-md text-white">
                          4K Ultra HD
                        </span>
                      </div>

                      {/* Centered Play Button */}
                      <div className="self-center">
                        <button
                          aria-label={isPlaying ? 'Pause Walkthrough Video' : 'Play Walkthrough Video'}
                          onClick={() => setIsPlaying(!isPlaying)}
                          className="w-20 h-20 rounded-full bg-primary-container hover:bg-primary text-on-primary flex items-center justify-center shadow-[0_0_40px_rgba(224,122,95,0.6)] transform hover:scale-110 active:scale-95 transition-all cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[44px] ml-1" style={{ fontVariationSettings: "'FILL' 1" }}>
                            {isPlaying ? 'pause' : 'play_arrow'}
                          </span>
                        </button>
                      </div>

                      {/* Video Bottom Controls */}
                      <div className="w-full bg-on-surface/75 backdrop-blur-md rounded-md p-space-xs md:p-space-sm text-surface-container-lowest flex flex-col gap-1.5">
                        {/* Interactive Timeline Bar */}
                        <div className="w-full h-1.5 bg-surface-container-highest/40 rounded-full cursor-pointer relative overflow-hidden">
                          <div className="w-1/3 h-full bg-primary-container rounded-full relative">
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-on-primary rounded-full shadow"></div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-label-sm font-label-sm text-white">
                          <div className="flex items-center gap-space-sm">
                            <button onClick={() => setIsPlaying(!isPlaying)} className="hover:text-primary-fixed transition-colors">
                              <span className="material-symbols-outlined text-[18px]">
                                {isPlaying ? 'pause' : 'play_arrow'}
                              </span>
                            </button>
                            <span className="material-symbols-outlined text-[18px]">volume_up</span>
                            <span>01:15 / 03:45</span>
                          </div>

                          {/* Timeline Chapters */}
                          <div className="hidden sm:flex items-center gap-space-md opacity-90 text-[11px]">
                            <span className="text-primary-fixed-dim font-bold">0:00 Intro</span>
                            <span className="text-on-primary font-bold">1:15 Flashcard Synthesis</span>
                            <span>2:40 Exam Sim</span>
                            <span>3:30 Analytics</span>
                          </div>

                          <div className="flex items-center gap-space-xs">
                            <span className="material-symbols-outlined text-[18px]">settings</span>
                            <span className="material-symbols-outlined text-[18px]">fullscreen</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </section>

            {/* ================================================================= */}
            {/* 5. THE SOURCEWISE TOME: 3D OPEN BOOK FEATURE SHOWCASE             */}
            {/* ================================================================= */}
            <SourceWiseBookShowcase />

          </div>
        </div>
      </main>

      {/* ================================================================= */}
      {/* FOOTER                                                            */}
      {/* ================================================================= */}
      <footer className="w-full text-on-surface relative overflow-hidden pt-space-3xl pb-space-xl border-t border-outline-variant/20" style={{ background: 'transparent' }}>
        <div className="relative max-w-[1320px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin-desktop">
          {/* Pre-Footer Callout Section: Panel on Left, Blended Fox Companion on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center mb-space-3xl">
            {/* Left Panel - transparent to match page bg */}
            <div className="lg:col-span-7 rounded-2xl p-space-xl md:p-space-2xl text-left relative bg-transparent border border-transparent shadow-none" style={{ background: 'transparent' }}>
              <h2 className="font-headline-lg text-headline-lg text-on-surface mb-space-sm font-semibold tracking-tight leading-tight">
                Ready to Outsmart Your Syllabus? Your Academic Breakthrough Starts Here.
              </h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl mb-space-xl">
                Join 85,000+ ambitious students leveling up with ninefold intelligence.
              </p>
              <div className="flex flex-wrap items-center justify-start gap-space-md">
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center font-label-lg text-label-lg text-on-primary bg-primary-container hover:bg-primary shadow-[0_8px_20px_-4px_rgba(224,122,95,0.4)] px-space-xl py-space-sm rounded-full transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  Start Your Free Journey Today
                </Link>
                <button
                  onClick={() => scrollToSection('video-tour')}
                  className="inline-flex items-center justify-center font-label-lg text-label-lg text-on-surface bg-surface hover:bg-surface-container-high px-space-xl py-space-sm rounded-full transition-all cursor-pointer shadow-sm border border-outline-variant/30"
                >
                  Book an Institutional Demo
                </button>
              </div>
            </div>

            {/* Right: Blended Fox & Student Companion Illustration */}
            <div className="lg:col-span-5 flex items-center justify-center lg:justify-end">
              <div className="relative w-full max-w-[500px]">
                <img
                  src="/cta-fox-companion.png"
                  alt="SourceWise Study Companion with Nine Tails"
                  className="w-full h-auto object-contain select-none pointer-events-none mix-blend-multiply"
                />
              </div>
            </div>
          </div>

          {/* Links & Socials Row */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-space-lg pb-space-lg border-b border-outline-variant/20">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-space-lg font-label-md text-label-md text-on-surface-variant">
              <span className="hover:text-on-surface transition-colors cursor-pointer">Privacy Policy</span>
              <span className="hover:text-on-surface transition-colors cursor-pointer">Terms of Service</span>
              <span className="hover:text-on-surface transition-colors cursor-pointer">Honor Code</span>
              <span className="hover:text-on-surface transition-colors cursor-pointer">Security</span>
              <span className="hover:text-on-surface transition-colors cursor-pointer">Contact Us</span>
            </div>
            <div className="flex items-center gap-space-md text-on-surface-variant">
              <span className="p-space-xs rounded-full hover:bg-surface-container-high hover:text-on-surface transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">forum</span>
              </span>
              <span className="p-space-xs rounded-full hover:bg-surface-container-high hover:text-on-surface transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">share</span>
              </span>
              <span className="p-space-xs rounded-full hover:bg-surface-container-high hover:text-on-surface transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">smart_display</span>
              </span>
              <span className="p-space-xs rounded-full hover:bg-surface-container-high hover:text-on-surface transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">terminal</span>
              </span>
              <span className="p-space-xs rounded-full hover:bg-surface-container-high hover:text-on-surface transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">hub</span>
              </span>
            </div>
          </div>

          {/* Copyright Row */}
          <div className="pt-space-md text-center md:text-left flex flex-col sm:flex-row items-center justify-between gap-space-xs font-body-sm text-body-sm text-on-surface-variant">
            <p>© 2025 SourceWise Inc. All rights reserved.</p>
            <p className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant/80">
              Wisdom Adaptability Mastery
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
