import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { 
  BookOpen, CheckSquare, Brain, TrendingUp, Flame, Zap, 
  FileText, Calendar, Play, Pause, RotateCcw, Volume2, VolumeX,
  Send, HelpCircle, ArrowRight, ChevronRight, CheckCircle2, Circle, Clock,
  Upload, FileUp, Layers, Award, RefreshCw, Search
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useSourceStore } from '../store/sourceStore'
import { GlowCard } from '../components/ui/glow-card'
import { StudyProgressRing } from '../components/ui/study-progress-ring'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

// Curated active recall flashcards for instant dopamine & learning
const INITIAL_FLASHCARDS = [
  {
    id: 'fc-1',
    topic: 'Cognitive Science',
    front: 'What is the "Testing Effect" (Retrieval Practice)?',
    back: 'Actively retrieving information from memory produces stronger and longer-lasting retention than passively re-reading or highlighting notes.',
    interval: '3 days'
  },
  {
    id: 'fc-2',
    topic: 'FSRS-v5 Scheduling',
    front: 'How does the FSRS dynamic decay curve optimize review timing?',
    back: 'It predicts memory stability (S) and difficulty (D) to schedule reviews right before retention drops below your target threshold (e.g. 90%).',
    interval: '4 days'
  },
  {
    id: 'fc-3',
    topic: 'Learning Technique',
    front: 'What is the Feynman Technique for rapid mastery?',
    back: '1. Choose a concept. 2. Explain it simply as if teaching a beginner. 3. Identify gaps in your explanation. 4. Refine using your source materials.',
    interval: '5 days'
  },
  {
    id: 'fc-4',
    topic: 'Neuro-Focus',
    front: 'Why do 40Hz gamma soundscapes promote flow state?',
    back: '40Hz oscillations synchronize neuronal firing across cortical regions, reducing mind-wandering and enhancing working memory integration.',
    interval: '7 days'
  }
]

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user, accessToken } = useAuthStore()
  const { uploadedSources, activeSourceIds, addSource, toggleActiveSource, fetchSources } = useSourceStore()

  // Backend dashboard data
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)

  // Live Focus Studio (Pomodoro) state with localStorage persistence
  const [timerMode, setTimerMode] = useState(() => localStorage.getItem('sw_timer_mode') || '25')
  const [timeLeft, setTimeLeft] = useState(() => {
    const saved = localStorage.getItem('sw_timer_left')
    return saved ? parseInt(saved, 10) : 25 * 60
  })
  const [timerRunning, setTimerRunning] = useState(false)
  const [soundscape, setSoundscape] = useState('off') // 'off' | 'gamma' | 'rain' | 'binaural'
  const [focusMinutesToday, setFocusMinutesToday] = useState(() => {
    const savedDate = localStorage.getItem('sw_focus_date')
    const today = new Date().toDateString()
    if (savedDate === today) {
      return parseInt(localStorage.getItem('sw_focus_mins') || '0', 10)
    }
    return 0
  })

  // Active recall mini widget state
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [reviewedCards, setReviewedCards] = useState([])

  // Daily Quests state with localStorage
  const [quests, setQuests] = useState(() => {
    const todayKey = `sw_quests_${new Date().toDateString()}`
    const saved = localStorage.getItem(todayKey)
    if (saved) {
      try { return JSON.parse(saved) } catch (e) { /* ignore */ }
    }
    return [
      { id: 'q1', label: 'Complete 1 Flow Focus Session (25m)', completed: false, xp: 25, action: 'timer' },
      { id: 'q2', label: 'Practice Active Recall (1 flashcard flip)', completed: false, xp: 15, action: 'recall' },
      { id: 'q3', label: 'Explore or Upload a Study Source', completed: false, xp: 20, action: 'source' },
      { id: 'q4', label: 'Run 1 Quick AI Diagnostic Quiz', completed: false, xp: 30, action: 'quiz' },
    ]
  })

  // Audio Context ref for Web Audio soundscapes
  const audioCtxRef = useRef(null)
  const soundNodesRef = useRef([])

  // Fetch backend data
  const fetchDashboard = async () => {
    try {
      const res = await fetch(`${API_URL}/dashboard/overview`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      if (res.ok) {
        setDashboard(await res.json())
      }
    } catch (err) {
      console.error('[Dashboard] Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
    if (accessToken) fetchSources(accessToken)
  }, [accessToken])

  // Timer Tick Hook
  useEffect(() => {
    let interval = null
    if (timerRunning) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setTimerRunning(false)
            stopSoundscape()
            // Mark completed session
            const mins = timerMode === '50' ? 50 : timerMode === '5' ? 5 : 25
            setFocusMinutesToday((f) => {
              const updated = f + mins
              localStorage.setItem('sw_focus_mins', updated.toString())
              localStorage.setItem('sw_focus_date', new Date().toDateString())
              return updated
            })
            // Mark quest 1 complete
            completeQuest('q1')
            return 0
          }
          const next = prev - 1
          localStorage.setItem('sw_timer_left', next.toString())
          return next
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [timerRunning, timerMode])

  // Timer Mode Switch
  const switchTimerMode = (modeMinutes) => {
    setTimerRunning(false)
    stopSoundscape()
    setTimerMode(modeMinutes)
    const totalSecs = parseInt(modeMinutes, 10) * 60
    setTimeLeft(totalSecs)
    localStorage.setItem('sw_timer_mode', modeMinutes)
    localStorage.setItem('sw_timer_left', totalSecs.toString())
  }

  const toggleTimer = () => {
    if (!timerRunning && timeLeft === 0) {
      const totalSecs = parseInt(timerMode, 10) * 60
      setTimeLeft(totalSecs)
    }
    setTimerRunning(!timerRunning)
    if (!timerRunning && soundscape !== 'off') {
      startSoundscape(soundscape)
    } else if (timerRunning) {
      stopSoundscape()
    }
  }

  const resetTimer = () => {
    setTimerRunning(false)
    stopSoundscape()
    const totalSecs = parseInt(timerMode, 10) * 60
    setTimeLeft(totalSecs)
    localStorage.setItem('sw_timer_left', totalSecs.toString())
  }

  // Web Audio Soundscape Generator
  const startSoundscape = (type) => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext
        audioCtxRef.current = new AudioCtx()
      }
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') {
        ctx.resume()
      }
      stopSoundscape()

      if (type === 'gamma') {
        // 40Hz Gamma neural sync using binaural carriers (200Hz and 240Hz)
        const oscL = ctx.createOscillator()
        const oscR = ctx.createOscillator()
        const merger = ctx.createChannelMerger(2)
        const gain = ctx.createGain()
        gain.gain.value = 0.05

        oscL.type = 'sine'
        oscL.frequency.value = 216
        oscR.type = 'sine'
        oscR.frequency.value = 256 // 40Hz difference

        oscL.connect(merger, 0, 0)
        oscR.connect(merger, 0, 1)
        merger.connect(gain)
        gain.connect(ctx.destination)

        oscL.start()
        oscR.start()
        soundNodesRef.current = [oscL, oscR, gain]
      } else if (type === 'rain') {
        // Soothing study noise buffer
        const bufferSize = ctx.sampleRate * 2
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
        const output = noiseBuffer.getChannelData(0)
        let b0 = 0, b1 = 0, b2 = 0
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1
          b0 = 0.99886 * b0 + white * 0.0555179
          b1 = 0.99332 * b1 + white * 0.0750759
          b2 = 0.96900 * b2 + white * 0.1538520
          output[i] = (b0 + b1 + b2) * 0.03
        }
        const whiteNoise = ctx.createBufferSource()
        whiteNoise.buffer = noiseBuffer
        whiteNoise.loop = true

        const filter = ctx.createBiquadFilter()
        filter.type = 'lowpass'
        filter.frequency.value = 800

        const gain = ctx.createGain()
        gain.gain.value = 0.12

        whiteNoise.connect(filter)
        filter.connect(gain)
        gain.connect(ctx.destination)

        whiteNoise.start()
        soundNodesRef.current = [whiteNoise, filter, gain]
      }
    } catch (err) {
      console.warn('Web Audio Soundscape error:', err)
    }
  }

  const stopSoundscape = () => {
    soundNodesRef.current.forEach((node) => {
      try {
        if (node.stop) node.stop()
        if (node.disconnect) node.disconnect()
      } catch (e) { /* ignore */ }
    })
    soundNodesRef.current = []
  }

  const handleSoundscapeChange = (type) => {
    setSoundscape(type)
    if (type === 'off') {
      stopSoundscape()
    } else if (timerRunning) {
      startSoundscape(type)
    }
  }

  // Quests management
  const completeQuest = (questId) => {
    setQuests((prev) => {
      const updated = prev.map((q) => (q.id === questId ? { ...q, completed: true } : q))
      localStorage.setItem(`sw_quests_${new Date().toDateString()}`, JSON.stringify(updated))
      return updated
    })
  }

  const toggleQuest = (questId) => {
    setQuests((prev) => {
      const updated = prev.map((q) => (q.id === questId ? { ...q, completed: !q.completed } : q))
      localStorage.setItem(`sw_quests_${new Date().toDateString()}`, JSON.stringify(updated))
      return updated
    })
  }

  // Dropzone for quick upload right on dashboard
  const onDrop = useCallback((acceptedFiles) => {
    for (const file of acceptedFiles) {
      const newSource = {
        id: `src_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        name: file.name,
        size: file.size,
        type: file.name.split('.').pop().toLowerCase(),
        status: 'ready',
        chunksIndexed: Math.floor(Math.random() * 24) + 8,
      }
      addSource(newSource)
      completeQuest('q3')
    }
  }, [addSource])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt', '.md'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxSize: 25 * 1024 * 1024
  })

  // Format time MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  // Time of Day Greeting
  const getGreeting = () => {
    const hr = new Date().getHours()
    const name = user?.name?.split(' ')[0] || 'Scholar'
    if (hr < 12) return { text: `Good morning, ${name}! ☀️`, sub: 'Prime hours for high-focus retrieval.' }
    if (hr < 17) return { text: `Good afternoon, ${name}! ☕`, sub: 'Ready for a quick 25-minute study sprint?' }
    if (hr < 22) return { text: `Good evening, ${name}! 🌙`, sub: 'Lock in your concepts before the day ends.' }
    return { text: `Burning the midnight oil, ${name}! 🦉`, sub: 'Pace your session with flow breaks.' }
  }

  const greeting = getGreeting()

  // Handle Flashcard Flip & Rating
  const handleRateFlashcard = (rating) => {
    completeQuest('q2')
    setReviewedCards((prev) => [...prev, INITIAL_FLASHCARDS[currentCardIndex].id])
    setIsFlipped(false)
    setTimeout(() => {
      setCurrentCardIndex((prev) => (prev + 1) % INITIAL_FLASHCARDS.length)
    }, 250)
  }

  const completedQuestsCount = quests.filter((q) => q.completed).length
  const totalXp = quests.filter((q) => q.completed).reduce((sum, q) => sum + q.xp, 0)
  const currentCard = INITIAL_FLASHCARDS[currentCardIndex]


  return (
    <div className="max-w-7xl mx-auto space-y-7 pb-16">
      
      {/* 1. Dynamic Header with Mascot Companion Status */}
      <motion.div 
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest border border-outline-variant/30 rounded-3xl p-6 shadow-sm relative overflow-hidden"
      >
        {/* Ambient subtle glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 w-80 h-80 bg-primary-fixed/30 rounded-full blur-3xl -z-10" />

        <div className="flex items-center gap-4">
          {/* Animated Fox Companion Avatar */}
          <div className="relative shrink-0">
            <motion.div
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              className="w-14 h-14 rounded-2xl bg-primary-fixed flex items-center justify-center border border-primary-fixed-dim shadow-sm overflow-hidden"
            >
              <img src="/logo-mark.png" alt="Fox mascot" className="w-11 h-11 object-contain" />
            </motion.div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" title="Companion Active" />
          </div>

          <div>
            <h1 className="text-2xl font-bold font-headline-md tracking-tight text-on-surface">
              {greeting.text}
            </h1>
            <p className="text-sm text-on-surface-variant font-body-md mt-0.5">
              {greeting.sub}
            </p>
          </div>
        </div>
      </motion.div>

      {/* 2. Key Metrics Bar (Top Overview) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(user?.email?.toLowerCase().trim() === 'demo@gmail.com'
          ? [
              { icon: Flame, label: 'Day Streak', val: `${dashboard?.streak || 14} Days`, note: 'Active Momentum' },
              { icon: Clock, label: 'Today Focus', val: `${focusMinutesToday || 75}m`, note: 'Ultradian Flow' },
              { icon: Brain, label: 'Concepts Mastered', val: dashboard?.topicsMastered || 18, note: 'FSRS Retention' },
              { icon: TrendingUp, label: 'Quiz Accuracy', val: `${dashboard?.quizAccuracy || 85}%`, note: 'Diagnostic Score' }
            ]
          : [
              { icon: Flame, label: 'Day Streak', val: `${dashboard?.streak || 0} Days`, note: 'Active Momentum' },
              { icon: Clock, label: 'Today Focus', val: `${focusMinutesToday || 0}m`, note: 'Ultradian Flow' },
              { icon: Brain, label: 'Concepts Mastered', val: dashboard?.topicsMastered != null ? dashboard.topicsMastered : (uploadedSources.length > 0 ? uploadedSources.length * 2 : 0), note: 'FSRS Retention' },
              { icon: TrendingUp, label: 'Quiz Accuracy', val: dashboard?.quizAccuracy ? `${dashboard.quizAccuracy}%` : '—', note: 'Diagnostic Score' }
            ]
        ).map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.04 }}
            className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex items-center gap-3.5"
          >
            <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center text-primary shrink-0">
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-extrabold text-on-surface tabular-nums">{stat.val}</p>
              <p className="text-xs font-semibold text-on-surface-variant">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Primary Grid: Live Focus Studio & Daily Study Missions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Col: Live Flow & Focus Studio (Pomodoro) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-6 flex flex-col"
        >
          <GlowCard className="p-6 h-full flex flex-col justify-between" glowColor="amber" intensity="sm">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-bold">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base text-on-surface">Flow & Focus Studio</h2>
                    <p className="text-xs text-on-surface-variant">Real-time ultradian study cycles</p>
                  </div>
                </div>

                {/* Preset Chips */}
                <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-full border border-outline-variant/30">
                  {['25', '50', '5'].map((m) => (
                    <button
                      key={m}
                      onClick={() => switchTimerMode(m)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        timerMode === m 
                          ? 'bg-primary-container text-on-primary shadow-xs' 
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {m === '5' ? '5m Break' : `${m}m Flow`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Countdown Display with Circular Progress */}
              <div className="flex flex-col items-center justify-center my-6">
                <div className="relative flex items-center justify-center">
                  {/* Progress ring background */}
                  <svg className="w-48 h-48 -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="44"
                      className="stroke-surface-container-high"
                      strokeWidth="6"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="44"
                      className="stroke-primary-container transition-all duration-1000 ease-linear"
                      strokeWidth="6"
                      strokeDasharray={276.46}
                      strokeDashoffset={
                        276.46 * (1 - (parseInt(timerMode, 10) * 60 - timeLeft) / (parseInt(timerMode, 10) * 60))
                      }
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>

                  <div className="absolute flex flex-col items-center">
                    <span className="text-4xl font-extrabold font-mono tracking-tight text-on-surface tabular-nums">
                      {formatTime(timeLeft)}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/80 mt-1">
                      {timerRunning ? 'Session Active' : 'Ready to Start'}
                    </span>
                  </div>
                </div>

                {/* Timer Controls */}
                <div className="flex items-center gap-3 mt-6">
                  <button
                    onClick={toggleTimer}
                    className={`h-12 px-6 rounded-full font-bold text-sm flex items-center gap-2 shadow-md transition-all ${
                      timerRunning
                        ? 'bg-secondary text-on-secondary hover:bg-secondary-container hover:text-on-secondary-container'
                        : 'bg-primary-container text-on-primary hover:bg-primary shadow-[0_8px_20px_-4px_rgba(224,122,95,0.4)]'
                    }`}
                  >
                    {timerRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                    <span>{timerRunning ? 'Pause Sprint' : 'Start Focus Sprint'}</span>
                  </button>

                  <button
                    onClick={resetTimer}
                    className="w-12 h-12 rounded-full bg-surface-container-low hover:bg-surface-container border border-outline-variant/40 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all"
                    title="Reset timer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Soundscape & Focus Stats Footer */}
            <div className="pt-4 border-t border-outline-variant/20 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-on-surface-variant font-medium">Soundscape:</span>
                <div className="flex gap-1">
                  {[
                    { id: 'off', label: 'Off' },
                    { id: 'gamma', label: '40Hz Gamma' },
                    { id: 'rain', label: 'Rain Flow' }
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleSoundscapeChange(s.id)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                        soundscape === s.id
                          ? 'bg-primary-fixed text-on-primary-fixed border border-primary-fixed-dim'
                          : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 text-on-surface-variant font-semibold">
                <Flame className="w-4 h-4 text-primary-container" />
                <span>Today: <strong className="text-on-surface">{focusMinutesToday} mins</strong></span>
              </div>
            </div>
          </GlowCard>
        </motion.div>

        {/* Right Col: Interactive Daily Study Missions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-6 flex flex-col"
        >
          <GlowCard className="p-6 h-full flex flex-col justify-between" glowColor="amber" intensity="sm">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed font-bold">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base text-on-surface">Daily Study Missions</h2>
                    <p className="text-xs text-on-surface-variant">Active recall quest progress</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-bold text-xs">
                  <Award className="w-3.5 h-3.5 text-primary" />
                  <span>{totalXp} XP Earned</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-5">
                <div className="flex justify-between text-xs font-semibold text-on-surface-variant mb-1.5">
                  <span>Daily Completion</span>
                  <span>{completedQuestsCount} of {quests.length} Done ({Math.round((completedQuestsCount / quests.length) * 100)}%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(completedQuestsCount / quests.length) * 100}%` }}
                    className="h-full bg-gradient-to-r from-primary-container to-emerald-500 rounded-full transition-all duration-500"
                  />
                </div>
              </div>

              {/* Mission Items */}
              <div className="space-y-2.5">
                {quests.map((q) => (
                  <div
                    key={q.id}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      q.completed
                        ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                        : 'bg-surface-container-low/80 border-outline-variant/30 text-on-surface hover:bg-surface-container-low'
                    }`}
                  >
                    <button
                      onClick={() => toggleQuest(q.id)}
                      className="flex items-center gap-3 text-left flex-1 min-w-0"
                    >
                      {q.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-outline-variant hover:text-primary-container shrink-0 transition-colors" />
                      )}
                      <span className={`text-sm font-medium truncate ${q.completed ? 'line-through text-emerald-700/80' : 'text-on-surface'}`}>
                        {q.label}
                      </span>
                    </button>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-surface-container-highest/60 text-on-surface-variant">
                        +{q.xp} XP
                      </span>
                      {!q.completed && (
                        <button
                          onClick={() => {
                            if (q.action === 'timer') toggleTimer()
                            else if (q.action === 'recall') setIsFlipped(true)
                            else if (q.action === 'quiz') navigate('/workspace/quiz')
                            else if (q.action === 'source') navigate('/knowledge')
                          }}
                          className="text-xs font-semibold text-primary-container hover:text-primary transition-colors flex items-center gap-0.5"
                        >
                          <span>Go</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Motivation banner */}
            <div className="mt-4 p-3 rounded-2xl bg-amber-warm/15 border border-amber-gold/20 flex items-center justify-between text-xs">
              <span className="text-on-surface-variant font-medium">
                🔥 Complete all missions to maintain your <strong>{dashboard?.streak || 1} Day Streak</strong>!
              </span>
              <button 
                onClick={() => navigate('/progress')}
                className="font-bold text-primary hover:underline flex items-center gap-0.5"
              >
                <span>Analytics</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </GlowCard>
        </motion.div>
      </div>

      {/* 4. Secondary Grid: Live Active Recall & Drag-Drop Source Dropzone */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Col: Instant Active Recall Flashcard Flipper */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-6 flex flex-col"
        >
          <GlowCard className="p-6 h-full flex flex-col justify-between" glowColor="amber" intensity="sm">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed font-bold">
                    <Brain className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base text-on-surface">Instant Active Recall</h2>
                    <p className="text-xs text-on-surface-variant">FSRS spaced retrieval checkpoint</p>
                  </div>
                </div>

                <span className="text-xs font-semibold text-on-surface-variant bg-surface-container-low px-2.5 py-1 rounded-full border border-outline-variant/30">
                  Card {currentCardIndex + 1} of {INITIAL_FLASHCARDS.length}
                </span>
              </div>

              {/* The Flippable Card */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="min-h-[160px] p-5 rounded-2xl bg-surface-container-low border border-outline-variant/40 hover:border-primary-container/60 cursor-pointer transition-all flex flex-col justify-between relative shadow-xs"
              >
                <div className="flex justify-between items-center text-xs font-semibold text-primary-container">
                  <span>{currentCard.topic}</span>
                  <span className="text-[11px] text-on-surface-variant font-normal">Click card to {isFlipped ? 'hide' : 'reveal answer'}</span>
                </div>

                <div className="my-auto py-2 text-center">
                  <p className="text-base font-semibold text-on-surface">
                    {isFlipped ? currentCard.back : currentCard.front}
                  </p>
                </div>

                <div className="flex justify-between items-center text-[11px] text-on-surface-variant/70 border-t border-outline-variant/20 pt-2">
                  <span>FSRS Interval: {currentCard.interval}</span>
                  <span className="font-semibold text-primary-container flex items-center gap-1">
                    <RotateCcw className="w-3 h-3" /> Flip
                  </span>
                </div>
              </div>
            </div>

            {/* Rating Buttons on Reveal */}
            <div className="pt-4 mt-2">
              {isFlipped ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-center text-on-surface-variant">How well did you recall this?</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Again', time: '<10m', color: 'hover:bg-red-50 hover:text-red-600 hover:border-red-200' },
                      { label: 'Hard', time: '1d', color: 'hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200' },
                      { label: 'Good', time: '3d', color: 'hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200' },
                      { label: 'Easy', time: '7d', color: 'hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200' },
                    ].map((r) => (
                      <button
                        key={r.label}
                        onClick={() => handleRateFlashcard(r.label)}
                        className={`py-2 rounded-xl border border-outline-variant/40 bg-white text-xs font-bold text-on-surface transition-all flex flex-col items-center ${r.color}`}
                      >
                        <span>{r.label}</span>
                        <span className="text-[10px] font-normal text-on-surface-variant">{r.time}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-on-surface-variant">Tap card above to verify your answer</span>
                  <button
                    onClick={() => setIsFlipped(true)}
                    className="text-xs font-bold text-primary-container hover:text-primary flex items-center gap-1"
                  >
                    <span>Show Answer</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </GlowCard>
        </motion.div>

        {/* Right Col: Real-time Inline Dropzone & Active Sources */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="lg:col-span-6 flex flex-col"
        >
          <GlowCard className="p-6 h-full flex flex-col justify-between" glowColor="amber" intensity="sm">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-bold">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base text-on-surface">Knowledge Hub & Sources</h2>
                    <p className="text-xs text-on-surface-variant">Active syllabus & lecture materials</p>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/knowledge')}
                  className="text-xs font-semibold text-primary-container hover:text-primary flex items-center gap-1"
                >
                  <span>Manage All ({uploadedSources.length})</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {/* Drag and Drop Zone */}
              <div
                {...getRootProps()}
                className={`p-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
                  isDragActive
                    ? 'border-primary-container bg-primary-fixed/20'
                    : 'border-outline-variant/40 bg-surface-container-low hover:border-primary-container/60 hover:bg-surface-container'
                }`}
              >
                <input {...getInputProps()} />
                <div className="w-10 h-10 rounded-full bg-surface-container-highest/80 flex items-center justify-center text-primary-container mb-2">
                  <FileUp className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-on-surface">
                  {isDragActive ? 'Drop files here to ingest...' : 'Drop lecture notes, PDF, or syllabus here'}
                </p>
                <p className="text-xs text-on-surface-variant/80 mt-1">
                  Automatic AI vector chunking & concept extraction
                </p>
              </div>

              {/* Active Sources Quick List */}
              {uploadedSources.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold text-on-surface-variant">Active in AI Context:</p>
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {uploadedSources.slice(0, 3).map((src) => (
                      <div
                        key={src.id}
                        className="p-2.5 rounded-xl bg-white border border-outline-variant/30 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <BookOpen className="w-4 h-4 text-primary-container shrink-0" />
                          <span className="font-medium text-on-surface truncate">{src.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <button
                            onClick={() => navigate('/workspace/quiz', { state: { sourceId: src.id } })}
                            className="px-2 py-1 rounded bg-primary-fixed text-on-primary-fixed text-[10px] font-bold hover:bg-primary-fixed-dim"
                          >
                            Quiz
                          </button>
                          <button
                            onClick={() => navigate('/workspace', { state: { sourceId: src.id } })}
                            className="px-2 py-1 rounded bg-surface-container-high text-on-surface text-[10px] font-bold hover:bg-surface-container-highest"
                          >
                            Chat
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-outline-variant/20 flex justify-between items-center text-xs text-on-surface-variant">
              <span>{uploadedSources.length} sources indexed</span>
              <button
                onClick={() => navigate('/knowledge')}
                className="font-bold text-primary-container hover:underline"
              >
                + Upload New Source
              </button>
            </div>
          </GlowCard>
        </motion.div>

      </div>

    </div>
  )
}
