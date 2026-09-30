import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  X, Zap, Trophy, AlertCircle, Loader2, Maximize2, Minimize2,
  Gamepad2, ScanText, Waypoints, Flame, Layers, Shuffle, Type, Play, Crosshair, Target,
  UploadCloud, ExternalLink, Check, Plus, FileText, BookOpen
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { usePuzzleStore } from '../store/puzzleStore'
import { useSourceStore } from '../store/sourceStore'
import { ingestDocument } from '../lib/chatApi'
import PuzzleResult from '../components/puzzles/shared/PuzzleResult'

// Lazy-load game components for code splitting
const WordSearchGame  = lazy(() => import('../components/puzzles/WordSearchGame'))
const MatchPairsGame  = lazy(() => import('../components/puzzles/MatchPairsGame'))
const RapidFireGame   = lazy(() => import('../components/puzzles/RapidFireGame'))
const MemoryFlipGame  = lazy(() => import('../components/puzzles/MemoryFlipGame'))
const AnagramGame     = lazy(() => import('../components/puzzles/AnagramGame'))
const ClozeGame       = lazy(() => import('../components/puzzles/ClozeGame'))

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

// ─── Game catalogue (Professional Active Recall Challenges) ───────────────────
const PUZZLE_GAMES = [
  {
    id: 'word_search',
    name: 'Word Search',
    icon: ScanText,
    desc: 'Discover key vocabulary, definitions, and foundational concepts embedded within an interactive letter grid.',
    xp: 30,
    difficulty: 'Easy',
    themeColor: 'cyan',
    iconColor: 'text-cyan-700',
    iconBg: 'bg-cyan-50 border border-cyan-200/80',
    badgeBg: 'bg-cyan-50 text-cyan-800 border-cyan-200/80',
    btnBg: 'bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white shadow-sm hover:shadow-md hover:shadow-cyan-100 active:scale-98',
    gradientBar: 'from-cyan-500 to-teal-500',
    actionText: 'Play Word Search',
  },
  {
    id: 'match_pairs',
    name: 'Concept Match',
    icon: Waypoints,
    desc: 'Pair core terms, formulas, and principles with their correct definitions to solidify associative memory.',
    xp: 40,
    difficulty: 'Medium',
    themeColor: 'fuchsia',
    iconColor: 'text-fuchsia-700',
    iconBg: 'bg-fuchsia-50 border border-fuchsia-200/80',
    badgeBg: 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200/80',
    btnBg: 'bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white shadow-sm hover:shadow-md hover:shadow-fuchsia-100 active:scale-98',
    gradientBar: 'from-fuchsia-500 to-purple-500',
    actionText: 'Start Matching',
  },
  {
    id: 'rapid_fire',
    name: 'Speed Recall',
    icon: Flame,
    desc: 'Fast-paced timed multiple choice challenges designed to strengthen quick, high-accuracy memory retrieval.',
    xp: 80,
    difficulty: 'Challenging',
    themeColor: 'orange',
    iconColor: 'text-orange-700',
    iconBg: 'bg-orange-50 border border-orange-200/80',
    badgeBg: 'bg-orange-50 text-orange-800 border-orange-200/80',
    btnBg: 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white shadow-sm hover:shadow-md hover:shadow-orange-100 active:scale-98',
    gradientBar: 'from-orange-500 to-amber-500',
    actionText: 'Start Speed Recall',
  },
  {
    id: 'memory_flip',
    name: 'Memory Flip',
    icon: Layers,
    desc: 'Train spatial memory and concept retention by revealing and pairing matching flash cards in fewer moves.',
    xp: 35,
    difficulty: 'Easy',
    themeColor: 'emerald',
    iconColor: 'text-emerald-700',
    iconBg: 'bg-emerald-50 border border-emerald-200/80',
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    btnBg: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-sm hover:shadow-md hover:shadow-emerald-100 active:scale-98',
    gradientBar: 'from-emerald-500 to-teal-500',
    actionText: 'Play Memory Flip',
  },
  {
    id: 'anagram',
    name: 'Word Scramble',
    icon: Shuffle,
    desc: 'Unscramble jumbled key terms and subject vocabulary using contextual definitions and strategic hints.',
    xp: 20,
    difficulty: 'Medium',
    themeColor: 'amber',
    iconColor: 'text-amber-800',
    iconBg: 'bg-amber-50 border border-amber-200/80',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-200/80',
    btnBg: 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white shadow-sm hover:shadow-md hover:shadow-amber-100 active:scale-98',
    gradientBar: 'from-amber-500 to-yellow-500',
    actionText: 'Unscramble Words',
  },
  {
    id: 'cloze',
    name: 'Fill in the Blank',
    icon: Type,
    desc: 'Reinforce deep comprehension by selecting missing terms to complete key excerpts from your study materials.',
    xp: 50,
    difficulty: 'Challenging',
    themeColor: 'rose',
    iconColor: 'text-rose-700',
    iconBg: 'bg-rose-50 border border-rose-200/80',
    badgeBg: 'bg-rose-50 text-rose-800 border-rose-200/80',
    btnBg: 'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white shadow-sm hover:shadow-md hover:shadow-rose-100 active:scale-98',
    gradientBar: 'from-rose-500 to-pink-500',
    actionText: 'Fill Passages',
  },
]

const GAME_COMPONENTS = {
  word_search:  WordSearchGame,
  match_pairs:  MatchPairsGame,
  rapid_fire:   RapidFireGame,
  memory_flip:  MemoryFlipGame,
  anagram:      AnagramGame,
  cloze:        ClozeGame,
}

const DIFFICULTIES = ['Casual', 'Standard', 'Challenging', 'Exam Prep']
const DIFF_MAP = {
  Casual: 'chill',
  Standard: 'study',
  Challenging: 'challenge',
  'Exam Prep': 'exam',
  // Backward compatibility:
  Chill: 'chill',
  Study: 'study',
  Challenge: 'challenge',
  'Exam Sim': 'exam',
}

const stagger = {
  container: { animate: { transition: { staggerChildren: 0.05 } } },
  item: { initial: { opacity: 0, scale: 0.95, y: 15 }, animate: { opacity: 1, scale: 1, y: 0 } },
}

export default function PuzzleArenePage() {
  const { type: routeType } = useParams()
  const navigate            = useNavigate()
  const accessToken         = useAuthStore(s => s.accessToken)
  const user                = useAuthStore(s => s.user)
  const store               = usePuzzleStore()

  const {
    uploadedSources: sources,
    activeSourceIds,
    toggleActiveSource,
    addSource,
    updateSourceStatus,
    fetchSources,
  } = useSourceStore()

  const [selectedSources, setSelectedSources] = useState([])
  const [topic, setTopic]           = useState('')
  const [difficulty, setDifficulty] = useState('Study')
  const [activeGame, setActiveGame] = useState(null)
  const [toast, setToast]           = useState(null)
  const [loadingSources, setLoadingSources] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && activeGame) {
        handleBack()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeGame]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (accessToken) {
      setLoadingSources(true)
      fetchSources(accessToken).finally(() => setLoadingSources(false))
    }
    store.fetchStats(accessToken)
  }, [accessToken, fetchSources]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-sync selectedSources with active sources or first 3
  useEffect(() => {
    if (sources.length > 0 && selectedSources.length === 0) {
      const validActive = activeSourceIds.filter(id => sources.some(s => s.id === id))
      if (validActive.length > 0) {
        setSelectedSources(validActive)
      } else {
        setSelectedSources(sources.slice(0, 3).map(s => s.id))
      }
    }
  }, [sources, activeSourceIds, selectedSources.length])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const toggleSource = (id) => {
    setSelectedSources(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
    toggleActiveSource(id)
  }

  const handleUploadFiles = async (files) => {
    if (!files || files.length === 0) return
    setIsUploading(true)
    for (const file of Array.from(files)) {
      const sourceId = `src_${Date.now()}_${Math.random().toString(36).substring(7)}`
      addSource({
        id: sourceId,
        name: file.name,
        size: file.size,
        type: file.name.split('.').pop().toLowerCase(),
        status: 'uploading',
        file,
      })
      try {
        updateSourceStatus(sourceId, 'processing')
        const result = await ingestDocument(file, sourceId, user?.id || 'anonymous', file.name)
        let realId = sourceId
        if (accessToken) {
          const res = await fetch(`${API_URL}/sources`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({
              id: sourceId,
              name: file.name,
              type: file.name.split('.').pop().toLowerCase(),
              size: file.size,
              status: 'ready',
              chunks_indexed: result?.chunks_indexed || 0,
            }),
          })
          if (res.ok) {
            const saved = await res.json()
            if (saved?.id) realId = saved.id
          }
        }
        updateSourceStatus(sourceId, 'ready')
        useSourceStore.setState((st) => ({
          uploadedSources: st.uploadedSources.map((s) =>
            s.id === sourceId ? { ...s, id: realId, chunksIndexed: result?.chunks_indexed || 0, status: 'ready' } : s
          ),
          activeSourceIds: st.activeSourceIds.map((id) => (id === sourceId ? realId : id)),
        }))
        setSelectedSources((prev) => (prev.includes(realId) ? prev : [...prev, realId]))
        showToast(`Indexed "${file.name}" for challenges!`)
      } catch (err) {
        updateSourceStatus(sourceId, 'error')
        showToast(`Failed to upload ${file.name}: ${err.message}`)
      }
    }
    setIsUploading(false)
  }

  const handlePlay = async (game) => {
    if (selectedSources.length === 0 && sources.length > 0) {
      showToast('Select at least one source first to begin.')
      return
    }
    setActiveGame(game)
    store.reset()
    try {
      await store.generate(
        { type: game.id, sourceIds: selectedSources, topic: topic || game.name, difficulty: DIFF_MAP[difficulty] },
        accessToken
      )
    } catch {
      showToast('Offline Mode: Using backup simulation data.')
    }
  }

  useEffect(() => {
    if (routeType) {
      const game = PUZZLE_GAMES.find(g => g.id === routeType)
      if (game) handlePlay(game)
    }
  }, [routeType]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleComplete = async (score, maxScore) => {
    try {
      await store.complete({ sourceIds: selectedSources, topic: topic || activeGame?.name, score, maxScore }, accessToken)
    } catch { /* non-critical */ }
  }

  const handleBack = () => {
    setActiveGame(null)
    store.reset()
    navigate('/puzzles', { replace: true })
  }

  const handlePlayAgain = async () => {
    store.reset()
    await handlePlay(activeGame)
  }

  // ── Game Modal Data ──────────────────────────────────────────────────────────
  const GameComponent = activeGame ? GAME_COMPONENTS[activeGame.id] : null
  const { isGenerating, generateError, activePuzzle, isComplete, score, maxScore, xpEarned, hintsUsed, stats } = store
  const timeSecs = 0

  // ── Hub page (Professional Light Theme with Game Accent) ───────────────────

  return (
    <div className="bg-gradient-to-b from-[#FFFDF9] via-[#FAF7F2] to-[#F5F0E8] text-[#1E1B16] min-h-[calc(100vh-4rem)] rounded-3xl p-6 lg:p-10 relative overflow-hidden shadow-sm border border-[#EDE7E1] -mt-2">
      {/* Background warm gaming ambient glows */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[300px] bg-gradient-to-b from-[#FFE8DC]/40 to-transparent blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[300px] bg-gradient-to-t from-[#FEF3C7]/30 to-transparent blur-[100px] rounded-full pointer-events-none" />
      {/* Subtle clean grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-gradient-to-br from-[#FFF5EE] to-[#FFE5D6] border border-[#F3C5A8] rounded-2xl shadow-sm text-[#C05A35]">
            <Gamepad2 className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#1E1B16] tracking-tight">
              Study Arena
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active Recall Ready
              </span>
              <span className="text-xs sm:text-sm text-[#7A7167] font-medium">
                Interactive retrieval challenges powered by your course documents
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats strip */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-5 mb-8 relative z-10"
        >
          {[
            { icon: Target, label: 'Total Sessions', value: stats.total_sessions || 0, color: 'text-cyan-700', bg: 'bg-cyan-50 border-cyan-200/80', iconColor: 'text-cyan-600' },
            { icon: Trophy, label: 'Completed Today', value: stats.today_count || 0, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200/80', iconColor: 'text-emerald-600' },
            { icon: Zap, label: 'Total XP Earned', value: `+${stats.total_xp || 0} XP`, color: 'text-[#C05A35]', bg: 'bg-amber-50 border-amber-200/80', iconColor: 'text-[#C05A35]' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl p-4 md:p-5 border border-[#EDE7E1] shadow-xs flex items-center gap-4 hover:shadow-sm transition-all">
              <div className={`p-2.5 rounded-xl border ${stat.bg} ${stat.iconColor} shrink-0`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className={`font-extrabold text-xl md:text-2xl leading-none ${stat.color} tabular-nums`}>{stat.value}</p>
                <p className="text-xs font-medium text-[#7A7167] mt-1.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8 relative z-10">
        {/* Left: Config panel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
          className="lg:col-span-1 flex flex-col gap-5"
        >
          {/* Source Selector & Library Panel */}
          <div className="bg-white p-4 rounded-2xl border border-[#EDE7E1] flex flex-col shadow-xs">
            {/* Header */}
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <BookOpen className="w-3.5 h-3.5 text-[#C05A35] shrink-0" />
                <span className="text-xs font-bold text-[#1E1B16] tracking-tight">Source Material</span>
              </div>
              {sources.length > 0 && (
                <span className="text-[10px] font-semibold text-[#8C827A] bg-[#F5EFEA] px-2 py-0.5 rounded-full tabular-nums">
                  {selectedSources.length}/{sources.length} active
                </span>
              )}
            </div>

            {/* Hidden file input for quick upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              multiple
              onChange={(e) => {
                if (e.target.files) handleUploadFiles(e.target.files)
                e.target.value = ''
              }}
              className="hidden"
            />

            {loadingSources && sources.length === 0 ? (
              <div className="flex items-center justify-center gap-2 text-xs text-[#7A7167] py-4 bg-[#FAF8F5] rounded-xl border border-[#EDE7E1]">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C05A35]" />
                <span>Loading sources...</span>
              </div>
            ) : sources.length === 0 ? (
              /* Minimal, clean upload dropzone when empty */
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setIsDragOver(false)
                  if (e.dataTransfer.files) handleUploadFiles(e.dataTransfer.files)
                }}
                className={`border border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 ${
                  isDragOver
                    ? 'border-[#C05A35] bg-[#FFF2EB]'
                    : 'border-[#E2D8CE] bg-[#FAF8F5]/80 hover:border-[#C05A35] hover:bg-[#FDF7F3]'
                }`}
              >
                {isUploading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[#C05A35]" />
                ) : (
                  <UploadCloud className="w-5 h-5 text-[#C05A35]" />
                )}
                <p className="text-xs font-semibold text-[#1E1B16]">
                  {isUploading ? 'Indexing material...' : 'Upload PDF or Notes'}
                </p>
                <p className="text-[10px] text-[#8C827A]">Click or drop file to start</p>
              </div>
            ) : (
              /* Clean, spacious source list */
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto pr-0.5 custom-scrollbar">
                  {sources.map((src) => {
                    const sel = selectedSources.includes(src.id)
                    const title = src.title || src.name || 'Untitled Document'

                    return (
                      <button
                        key={src.id}
                        type="button"
                        onClick={() => toggleSource(src.id)}
                        title={title}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-xs transition-all ${
                          sel
                            ? 'bg-[#FDEEE6] border border-[#F5C7B5] text-[#1E1B16] font-semibold'
                            : 'bg-[#FAF8F5] border border-[#EDE7E1] text-[#554E46] hover:bg-[#F3EFEA]'
                        }`}
                      >
                        <span className="truncate flex-1 text-xs font-medium">{title}</span>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                            sel ? 'bg-[#C05A35] border-[#C05A35] text-white' : 'border-[#D5CCC1] bg-white'
                          }`}
                        >
                          {sel && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Minimal Add Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full mt-1 py-1.5 px-3 border border-dashed border-[#DED7CE] hover:border-[#C05A35] rounded-xl text-xs font-semibold text-[#7A7167] hover:text-[#C05A35] hover:bg-[#FFF8F5] transition-all flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C05A35]" />
                      <span>Indexing...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5 text-[#C05A35]" />
                      <span>Add document</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Options */}
          <div className="bg-white p-5 rounded-2xl border border-[#EDE7E1] flex flex-col shadow-xs">
            <p className="text-xs font-bold uppercase tracking-wider text-[#6B635B] mb-3 flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-[#C05A35]" /> Challenge Settings
            </p>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium text-[#7A7167] block mb-1.5">Topic Focus (Optional)</label>
                <input
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="e.g. Operating Systems"
                  className="w-full h-10 px-3.5 text-sm rounded-xl border border-[#EDE7E1] bg-[#FAF8F5] text-[#1E1B16] placeholder:text-[#A69E94] focus:outline-none focus:border-[#E8845F] focus:ring-2 focus:ring-[#E8845F]/20 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#7A7167] block mb-1.5">Difficulty Level</label>
                <div className="grid grid-cols-2 gap-2">
                  {DIFFICULTIES.map(d => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`py-2 px-1 rounded-xl text-xs font-medium border text-center transition-all truncate ${
                        difficulty === d
                          ? 'bg-gradient-to-r from-[#E8845F] to-[#C05A35] text-white border-transparent shadow-xs font-semibold'
                          : 'border-[#EDE7E1] bg-[#FAF8F5] text-[#6B635B] hover:border-[#DFD6CD] hover:bg-[#F3EFEA]'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right: Game grid (generous 2-col on desktop, 3-col on 2xl ultra-wide) */}
        <motion.div
          variants={stagger.container}
          initial="initial"
          animate="animate"
          className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-5"
        >
          {PUZZLE_GAMES.map((game) => {
            const bestScore = stats?.by_type?.[game.id]?.best_score
            const played    = stats?.by_type?.[game.id]?.count || 0

            return (
              <motion.div key={game.id} variants={stagger.item}>
                <div className="group bg-white hover:bg-[#FFFDFB] border border-[#EDE7E1] hover:border-[#DFD6CD] rounded-2xl overflow-hidden transition-all duration-300 relative flex flex-col h-full shadow-xs hover:shadow-xl hover:-translate-y-1">
                  
                  {/* Top colored accent bar */}
                  <div className={`h-1.5 w-full bg-gradient-to-r ${game.gradientBar}`} />

                  <div className="p-5 md:p-6 flex flex-col flex-1">
                    {/* Top row with icon & neatly aligned badges */}
                    <div className="flex items-start justify-between gap-2.5 mb-3.5">
                      <div className={`p-2.5 rounded-xl ${game.iconBg} ${game.iconColor} group-hover:scale-105 transition-transform duration-300 shadow-xs shrink-0`}>
                        <game.icon className="w-5 h-5" />
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0 max-w-[calc(100%-48px)]">
                        <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border shrink-0 whitespace-nowrap ${game.badgeBg}`}>
                          {game.difficulty}
                        </span>
                        <span className="text-[11px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/80 flex items-center gap-1 shrink-0 whitespace-nowrap shadow-2xs">
                          <Zap className="w-3 h-3 text-amber-600 shrink-0" /> +{game.xp} XP
                        </span>
                      </div>
                    </div>

                    <h3 className="font-bold text-base md:text-lg text-[#1E1B16] tracking-tight mb-1.5">{game.name}</h3>
                    <p className="text-xs text-[#6B635B] leading-relaxed mb-4 flex-1 line-clamp-3">{game.desc}</p>

                    {/* Stats */}
                    <div className="h-6 flex items-center gap-3 mb-4 text-xs font-medium text-[#8A8177]">
                      {played > 0 && <span>{played} {played === 1 ? 'play' : 'plays'}</span>}
                      {bestScore != null && <span>Best: <strong className={game.iconColor}>{bestScore}%</strong></span>}
                      {played === 0 && <span className="text-[#A69E94]">Ready to play</span>}
                    </div>

                    {/* Play button */}
                    <button
                      onClick={() => handlePlay(game)}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md ${game.btnBg}`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      {game.actionText || 'Play Now'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>

      {/* Custom styles for the scrollbar inside light panels */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(237, 231, 225, 0.4); 
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(197, 189, 179, 0.6);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(160, 150, 138, 0.9);
        }
      `}</style>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#1E1B16] text-white px-6 py-3.5 rounded-2xl shadow-2xl text-xs font-semibold z-50 flex items-center gap-3 border border-white/10"
          >
            <AlertCircle className="w-4 h-4 text-[#E8845F]" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Simulation Terminal Game Modal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {activeGame && (
            <motion.div
              key="game-modal"
              initial={{ opacity: 0, scale: isFullScreen ? 1 : 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: isFullScreen ? 1 : 0.98 }}
              className={
                isFullScreen
                  ? "fixed inset-0 z-[100] bg-[#FAF8F5] flex flex-col overflow-hidden w-screen h-screen"
                  : "fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6"
              }
            >
              <div
                className={
                  isFullScreen
                    ? "w-full h-full flex flex-col overflow-hidden bg-[#FAF8F5]"
                    : "bg-[#FAF8F5] w-full max-w-5xl max-h-[95vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative border border-[#EDE7E1]"
                }
              >
                {/* Modal Header */}
                <div className="bg-white text-[#1E1B16] px-6 py-4 flex items-center justify-between border-b border-[#EDE7E1] shrink-0 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${activeGame.iconBg}`}>
                      <activeGame.icon className={`w-5 h-5 ${activeGame.iconColor}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-base leading-tight text-[#1E1B16]">{activeGame.name}</p>
                        {isFullScreen && (
                          <span className="hidden sm:inline-block text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Full Screen
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#7A7167] font-medium mt-0.5">
                        Topic: {topic || activeGame.name} • Level: {difficulty}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsFullScreen(!isFullScreen)}
                      className="p-2 rounded-xl hover:bg-[#F3EFEA] text-[#7A7167] hover:text-[#1E1B16] transition-colors border border-transparent hover:border-[#EDE7E1]"
                      title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                      aria-label={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                    >
                      {isFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={handleBack}
                      className="p-2 rounded-xl hover:bg-[#F3EFEA] text-[#7A7167] hover:text-[#1E1B16] transition-colors border border-transparent hover:border-[#EDE7E1]"
                      title="Close (Esc)"
                      aria-label="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Game Body */}
                <div className={`flex-1 overflow-auto bg-[#FDFBF9] flex flex-col text-[#1E1B16] custom-scrollbar ${isFullScreen ? 'p-6 md:p-10' : 'p-4 md:p-8'}`}>
                  {isGenerating && (
                    <div className="flex-1 flex flex-col items-center justify-center py-24 gap-4">
                      <div className="relative">
                        <Loader2 className="w-12 h-12 text-[#E8845F] animate-spin" />
                        <Crosshair className={`w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${activeGame.iconColor} animate-pulse`} />
                      </div>
                      <p className="text-[#1E1B16] font-bold text-base mt-2">Preparing Your Challenge...</p>
                      <p className="text-xs text-[#7A7167]">Synthesizing interactive questions from your study materials</p>
                    </div>
                  )}
                  {generateError && !isGenerating && !activePuzzle && (
                    <div className="flex-1 flex flex-col items-center justify-center py-24 gap-4">
                      <AlertCircle className="w-12 h-12 text-rose-500" />
                      <p className="text-[#1E1B16] font-bold text-base">Unable to Generate Challenge</p>
                      <p className="text-sm text-[#7A7167] max-w-md text-center">{generateError}</p>
                      <button onClick={handleBack} className="mt-4 px-6 py-2.5 rounded-xl bg-[#1E1B16] text-white text-xs font-semibold hover:bg-black transition-colors">
                        Return to Arena
                      </button>
                    </div>
                  )}
                  {activePuzzle && !isComplete && !isGenerating && GameComponent && (
                    <Suspense fallback={<div className="py-24 text-center text-[#7A7167]"><Loader2 className="w-8 h-8 animate-spin mx-auto text-[#E8845F]" /></div>}>
                      <GameComponent puzzleData={activePuzzle} onComplete={handleComplete} onHint={store.addHint} />
                    </Suspense>
                  )}
                  {isComplete && (
                    <div className="flex-1 flex items-center justify-center">
                      <PuzzleResult
                        score={score}
                        maxScore={maxScore}
                        xpEarned={xpEarned}
                        hintsUsed={hintsUsed}
                        timeSeconds={timeSecs}
                        puzzleType={activeGame.id}
                        onPlayAgain={handlePlayAgain}
                        onBack={handleBack}
                      />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}
