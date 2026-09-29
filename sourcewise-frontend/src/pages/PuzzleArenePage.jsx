import { useState, useEffect, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import {
  X, Sparkles, Trophy, AlertCircle, Loader2,
  Gamepad2, ScanText, Waypoints, Flame, Layers, Shuffle, Type, Play, Crosshair, Target
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { usePuzzleStore } from '../store/puzzleStore'
import PuzzleResult from '../components/puzzles/shared/PuzzleResult'

// Lazy-load game components for code splitting
const WordSearchGame  = lazy(() => import('../components/puzzles/WordSearchGame'))
const MatchPairsGame  = lazy(() => import('../components/puzzles/MatchPairsGame'))
const RapidFireGame   = lazy(() => import('../components/puzzles/RapidFireGame'))
const MemoryFlipGame  = lazy(() => import('../components/puzzles/MemoryFlipGame'))
const AnagramGame     = lazy(() => import('../components/puzzles/AnagramGame'))
const ClozeGame       = lazy(() => import('../components/puzzles/ClozeGame'))

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

// ─── Game catalogue (Gamer Aesthetic) ─────────────────────────────────────────
const PUZZLE_GAMES = [
  {
    id: 'word_search',
    name: 'Word Search',
    icon: ScanText,
    desc: 'Scan the data grid to extract hidden terminology.',
    xp: 30,
    difficulty: 'EASY',
    themeColor: 'cyan',
    borderGlow: 'group-hover:border-cyan-500/50',
    shadowGlow: 'hover:shadow-[0_0_30px_-5px_rgba(6,182,212,0.3)]',
    iconColor: 'text-cyan-400',
    btnBg: 'bg-cyan-500 hover:bg-cyan-400 text-cyan-950',
    tagBorder: 'border-cyan-500/30',
  },
  {
    id: 'match_pairs',
    name: 'Match Pairs',
    icon: Waypoints,
    desc: 'Forge neural links between concepts and meanings.',
    xp: 40,
    difficulty: 'MEDIUM',
    themeColor: 'fuchsia',
    borderGlow: 'group-hover:border-fuchsia-500/50',
    shadowGlow: 'hover:shadow-[0_0_30px_-5px_rgba(217,70,239,0.3)]',
    iconColor: 'text-fuchsia-400',
    btnBg: 'bg-fuchsia-500 hover:bg-fuchsia-400 text-fuchsia-950',
    tagBorder: 'border-fuchsia-500/30',
  },
  {
    id: 'rapid_fire',
    name: 'Rapid Fire',
    icon: Flame,
    desc: 'High-stakes 6-second timer. Maintain the combo streak.',
    xp: 80,
    difficulty: 'HARD',
    themeColor: 'orange',
    borderGlow: 'group-hover:border-orange-500/50',
    shadowGlow: 'hover:shadow-[0_0_30px_-5px_rgba(249,115,22,0.3)]',
    iconColor: 'text-orange-400',
    btnBg: 'bg-orange-500 hover:bg-orange-400 text-orange-950',
    tagBorder: 'border-orange-500/30',
  },
  {
    id: 'memory_flip',
    name: 'Memory Flip',
    icon: Layers,
    desc: 'Test your spatial recall with face-down data nodes.',
    xp: 35,
    difficulty: 'EASY',
    themeColor: 'emerald',
    borderGlow: 'group-hover:border-emerald-500/50',
    shadowGlow: 'hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)]',
    iconColor: 'text-emerald-400',
    btnBg: 'bg-emerald-500 hover:bg-emerald-400 text-emerald-950',
    tagBorder: 'border-emerald-500/30',
  },
  {
    id: 'anagram',
    name: 'Anagram',
    icon: Shuffle,
    desc: 'Decrypt scrambled concepts using definition clues.',
    xp: 20,
    difficulty: 'MEDIUM',
    themeColor: 'amber',
    borderGlow: 'group-hover:border-amber-500/50',
    shadowGlow: 'hover:shadow-[0_0_30px_-5px_rgba(251,191,36,0.3)]',
    iconColor: 'text-amber-400',
    btnBg: 'bg-amber-500 hover:bg-amber-400 text-amber-950',
    tagBorder: 'border-amber-500/30',
  },
  {
    id: 'cloze',
    name: 'Fill the Blank',
    icon: Type,
    desc: 'Restore corrupted source passages with missing terms.',
    xp: 50,
    difficulty: 'HARD',
    themeColor: 'rose',
    borderGlow: 'group-hover:border-rose-500/50',
    shadowGlow: 'hover:shadow-[0_0_30px_-5px_rgba(244,63,94,0.3)]',
    iconColor: 'text-rose-400',
    btnBg: 'bg-rose-500 hover:bg-rose-400 text-rose-950',
    tagBorder: 'border-rose-500/30',
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

const DIFFICULTIES = ['Chill', 'Study', 'Challenge', 'Exam Sim']
const DIFF_MAP = { Chill: 'chill', Study: 'study', Challenge: 'challenge', 'Exam Sim': 'exam' }

const stagger = {
  container: { animate: { transition: { staggerChildren: 0.05 } } },
  item: { initial: { opacity: 0, scale: 0.95, y: 15 }, animate: { opacity: 1, scale: 1, y: 0 } },
}

export default function PuzzleArenePage() {
  const { type: routeType } = useParams()
  const navigate            = useNavigate()
  const accessToken         = useAuthStore(s => s.accessToken)
  const store               = usePuzzleStore()

  const [sources, setSources]       = useState([])
  const [selectedSources, setSelectedSources] = useState([])
  const [topic, setTopic]           = useState('')
  const [difficulty, setDifficulty] = useState('Study')
  const [activeGame, setActiveGame] = useState(null)
  const [toast, setToast]           = useState(null)
  const [loadingSources, setLoadingSources] = useState(true)

  useEffect(() => {
    if (!accessToken) return
    fetch(`${API_URL}/sources`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const list = Array.isArray(data) ? data : (data.sources || data.data || [])
        setSources(list)
        if (list.length <= 3) setSelectedSources(list.map(s => s.id))
      })
      .catch(() => {})
      .finally(() => setLoadingSources(false))
    store.fetchStats(accessToken)
  }, [accessToken]) // eslint-disable-line react-hooks/exhaustive-deps

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
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

  const toggleSource = (id) => {
    setSelectedSources(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  // ── Game Modal (Simulation Terminal) ──────────────────────────────────────────
  if (activeGame) {
    const GameComponent = GAME_COMPONENTS[activeGame.id]
    const { isGenerating, generateError, activePuzzle, isComplete, score, maxScore, xpEarned, hintsUsed } = store
    const timeSecs = 0

    return (
      <AnimatePresence>
        <motion.div
          key="game-modal"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
        >
          <div className="bg-[#09090B] w-full max-w-5xl max-h-[95vh] rounded-xl shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden relative border border-zinc-800">
            {/* Terminal Header */}
            <div className="bg-zinc-950 text-zinc-100 px-6 py-4 flex items-center justify-between border-b border-zinc-800 shrink-0">
              <div className="flex items-center gap-4">
                <activeGame.icon className={`w-5 h-5 ${activeGame.iconColor}`} />
                <div>
                  <p className="font-bold uppercase tracking-[0.2em] text-sm leading-tight text-white">{activeGame.name}</p>
                  <p className="text-[10px] text-zinc-500 font-mono tracking-widest mt-1 uppercase">
                    TARGET: {topic || activeGame.name} // TIER: {difficulty}
                  </p>
                </div>
              </div>
              <button
                onClick={handleBack}
                className="p-2 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors border border-transparent hover:border-zinc-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Game Body */}
            <div className="flex-1 overflow-auto p-4 md:p-8 bg-[#09090B] flex flex-col text-zinc-100 custom-scrollbar">
              {isGenerating && (
                <div className="flex-1 flex flex-col items-center justify-center py-24 gap-4">
                  <div className="relative">
                    <Loader2 className="w-12 h-12 text-zinc-300 animate-spin" />
                    <Crosshair className={`w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${activeGame.iconColor} animate-pulse`} />
                  </div>
                  <p className="text-zinc-800 font-bold uppercase tracking-widest mt-2">Initializing Simulation</p>
                  <p className="text-xs font-mono text-zinc-500 uppercase">Extracting vectors from source material...</p>
                </div>
              )}
              {generateError && !isGenerating && !activePuzzle && (
                <div className="flex-1 flex flex-col items-center justify-center py-24 gap-4">
                  <AlertCircle className="w-12 h-12 text-red-500" />
                  <p className="text-zinc-900 font-bold uppercase tracking-widest">Simulation Failed</p>
                  <p className="text-sm font-mono text-zinc-500">{generateError}</p>
                  <button onClick={handleBack} className="mt-4 px-6 py-3 rounded-xl bg-zinc-900 text-white text-sm font-bold tracking-widest uppercase hover:bg-zinc-800">
                    Abort
                  </button>
                </div>
              )}
              {activePuzzle && !isComplete && !isGenerating && (
                <Suspense fallback={<div className="py-24 text-center text-zinc-500"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>}>
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
      </AnimatePresence>
    )
  }

  // ── Hub page (Dark Gamer Arena) ─────────────────────────────────────────────
  const { stats } = store

  return (
    <div className="bg-[#09090B] text-zinc-100 min-h-[calc(100vh-4rem)] rounded-[2rem] p-6 lg:p-10 relative overflow-hidden shadow-2xl border border-zinc-800/80 -mt-2">
      {/* Background ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 mb-10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-zinc-900 border border-zinc-700/50 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.5)]">
            <Gamepad2 className="w-8 h-8 text-fuchsia-400" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-400">
              Game Arena
            </h1>
            <p className="text-xs md:text-sm font-mono tracking-widest text-zinc-500 uppercase mt-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Neural Simulation Active
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats strip */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3 md:gap-4 mb-8 relative z-10"
        >
          {[
            { icon: Target, label: 'Simulations', value: stats.total_sessions || 0, color: 'text-cyan-400', border: 'border-cyan-500/20' },
            { icon: Trophy, label: 'Today', value: stats.today_count || 0, color: 'text-emerald-400', border: 'border-emerald-500/20' },
            { icon: Sparkles, label: 'XP Gained', value: `+${stats.total_xp || 0}`, color: 'text-fuchsia-400', border: 'border-fuchsia-500/20' },
          ].map(stat => (
            <div key={stat.label} className={`bg-zinc-900/60 backdrop-blur-md rounded-2xl p-4 border ${stat.border} flex items-center gap-4`}>
              <stat.icon className={`w-6 h-6 ${stat.color} shrink-0 opacity-80`} />
              <div>
                <p className={`font-black text-xl leading-none ${stat.color} tabular-nums`}>{stat.value}</p>
                <p className="text-[10px] font-bold tracking-wider uppercase text-zinc-500 mt-1">{stat.label}</p>
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
          {/* Source selector */}
          <div className="bg-zinc-900/60 backdrop-blur-md p-5 rounded-2xl border border-zinc-800 flex flex-col shadow-lg">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
              <ScanText className="w-3.5 h-3.5" /> Data Sources
            </p>
            {loadingSources ? (
              <div className="flex items-center gap-2 text-sm text-zinc-500 font-mono">
                <Loader2 className="w-4 h-4 animate-spin" /> Fetching...
              </div>
            ) : sources.length === 0 ? (
              <div className="text-xs text-zinc-500 bg-zinc-950/50 rounded-xl p-4 text-center font-mono">
                <p>No nodes available.</p>
                <a href="/sources" className="text-cyan-400 font-bold mt-2 block hover:underline">Upload PDF →</a>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                {sources.map(src => {
                  const sel = selectedSources.includes(src.id)
                  return (
                    <button
                      key={src.id}
                      onClick={() => toggleSource(src.id)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left text-sm transition-all ${
                        sel ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300 font-semibold shadow-[0_0_10px_rgba(99,102,241,0.2)]' 
                            : 'border-zinc-800 bg-zinc-950/50 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 transition-all ${sel ? 'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]' : 'bg-zinc-700'}`} />
                      <span className="truncate">{src.title || src.name || 'Untitled_Node'}</span>
                    </button>
                  )
                })}
              </div>
            )}
            {sources.length > 0 && (
              <button
                onClick={() => setSelectedSources(selectedSources.length === sources.length ? [] : sources.map(s => s.id))}
                className="mt-4 text-[10px] uppercase font-bold tracking-wider text-zinc-500 hover:text-zinc-300 self-start transition-colors"
              >
                {selectedSources.length === sources.length ? '[ Deselect All ]' : '[ Select All ]'}
              </button>
            )}
          </div>

          {/* Options */}
          <div className="bg-zinc-900/60 backdrop-blur-md p-5 rounded-2xl border border-zinc-800 flex flex-col shadow-lg">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
              <Gamepad2 className="w-3.5 h-3.5" /> Parameters
            </p>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-2">Subject Target</label>
                <input
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="e.g. Algorithms..."
                  className="w-full h-10 px-3 text-sm font-mono rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-2">Difficulty Tier</label>
                <div className="grid grid-cols-2 gap-2">
                  {DIFFICULTIES.map(d => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                        difficulty === d
                          ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                          : 'border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:bg-zinc-800'
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

        {/* Right: Game grid */}
        <motion.div
          variants={stagger.container}
          initial="initial"
          animate="animate"
          className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
        >
          {PUZZLE_GAMES.map((game) => {
            const bestScore = stats?.by_type?.[game.id]?.best_score
            const played    = stats?.by_type?.[game.id]?.count || 0

            return (
              <motion.div key={game.id} variants={stagger.item}>
                <div className={`group bg-zinc-900/40 backdrop-blur-sm border border-zinc-800 rounded-2xl overflow-hidden transition-all duration-300 relative flex flex-col h-full ${game.borderGlow} ${game.shadowGlow} hover:bg-zinc-900/80`}>
                  
                  {/* Subtle top gradient line */}
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${game.iconColor.replace('text-', 'from-')} to-transparent opacity-50`} />

                  <div className="p-6 flex flex-col flex-1">
                    {/* Top row */}
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-xl bg-zinc-950 border border-zinc-800 ${game.iconColor} group-hover:scale-110 transition-transform duration-300`}>
                        <game.icon className="w-7 h-7" />
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`text-[9px] font-black tracking-widest uppercase px-2.5 py-1 rounded-sm border ${game.tagBorder} ${game.iconColor} bg-zinc-950/50`}>
                          {game.difficulty}
                        </span>
                        <span className="text-[9px] font-black tracking-widest text-zinc-300 bg-zinc-800 px-2.5 py-1 rounded-sm border border-zinc-700">
                          +{game.xp} XP
                        </span>
                      </div>
                    </div>

                    <h3 className="font-bold text-lg text-zinc-100 tracking-wide mb-2">{game.name}</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed font-mono mb-6 flex-1">{game.desc}</p>

                    {/* Stats */}
                    <div className="h-6 flex items-center gap-3 mb-4 text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                      {played > 0 && <span>Runs: <strong className="text-zinc-300">{played}</strong></span>}
                      {bestScore != null && <span>Best: <strong className={game.iconColor}>{bestScore}%</strong></span>}
                    </div>

                    {/* Play button */}
                    <button
                      onClick={() => handlePlay(game)}
                      className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all ${game.btnBg}`}
                    >
                      <Play className="w-4 h-4" />
                      Initiate
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>

      {/* Custom styles for the scrollbar inside the dark panel */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(24, 24, 27, 0.5); 
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(82, 82, 91, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(113, 113, 122, 0.8);
        }
      `}</style>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-700 text-zinc-100 px-6 py-4 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.8)] text-sm font-bold tracking-wider uppercase z-50 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-indigo-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
