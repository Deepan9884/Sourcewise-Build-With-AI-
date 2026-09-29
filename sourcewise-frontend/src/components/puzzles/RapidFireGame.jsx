import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Flame, ShieldAlert } from 'lucide-react'
import TimerBar from './shared/TimerBar'

export default function RapidFireGame({ puzzleData, onComplete }) {
  const { questions = [] } = puzzleData || {}
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState(null)
  const [isCorrect, setIsCorrect] = useState(null)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [results, setResults] = useState([])
  const [timerKey, setTimerKey] = useState(0)
  const [expired, setExpired] = useState(false)
  const advanceTimer = useRef(null)

  const q = questions[current]
  const isLast = current >= questions.length - 1
  const comboMultiplier = combo >= 8 ? 4 : combo >= 5 ? 3 : combo >= 3 ? 2 : 1

  const advance = useCallback(() => {
    if (isLast) {
      const finalScore = results.filter(r => r).length + (isCorrect ? 1 : 0)
      setTimeout(() => onComplete?.(finalScore, questions.length), 400)
    } else {
      setCurrent(c => c + 1)
      setSelected(null)
      setIsCorrect(null)
      setExpired(false)
      setTimerKey(k => k + 1)
    }
  }, [isLast, isCorrect, results, questions.length, onComplete])

  const handleSelect = useCallback((optIdx) => {
    if (selected !== null || expired) return
    clearTimeout(advanceTimer.current)
    const correct = optIdx === q.correct_index
    setSelected(optIdx)
    setIsCorrect(correct)
    const xpGain = correct ? 5 * comboMultiplier : 0
    setScore(s => s + xpGain)
    setCombo(c => correct ? c + 1 : 0)
    setResults(r => [...r, correct])
    advanceTimer.current = setTimeout(advance, 1200)
  }, [selected, expired, q, comboMultiplier, advance])

  const handleExpire = useCallback(() => {
    if (selected !== null) return
    setExpired(true)
    setSelected(-1)
    setIsCorrect(false)
    setCombo(0)
    setResults(r => [...r, false])
    advanceTimer.current = setTimeout(advance, 1200)
  }, [selected, advance])

  useEffect(() => () => clearTimeout(advanceTimer.current), [])

  if (!q) return null

  const getOptionStyle = (idx) => {
    if (selected === null && !expired) return 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-orange-500/50 hover:bg-zinc-900 cursor-pointer shadow-none'
    if (idx === q.correct_index) return 'border-orange-500/50 bg-orange-500/20 text-orange-400 font-bold shadow-[0_0_15px_rgba(249,115,22,0.3)]'
    if (idx === selected && !isCorrect) return 'border-red-500 bg-red-500/10 text-red-400'
    return 'border-zinc-800 bg-zinc-950/50 text-zinc-600'
  }

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-6">
      {/* Header: progress + combo */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest font-mono">
          SEQUENCE {current + 1}/{questions.length}
        </span>
        <div className="flex items-center gap-4">
          <AnimatePresence>
            {combo >= 3 && (
              <motion.div
                key={combo}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/30 rounded shadow-[0_0_15px_rgba(249,115,22,0.2)]"
              >
                <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
                <span className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em] font-mono">x{comboMultiplier} COMBO</span>
              </motion.div>
            )}
          </AnimatePresence>
          <span className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em] font-mono">PTS: {score}</span>
        </div>
      </div>

      {/* Timer */}
      <TimerBar key={timerKey} duration={6} onExpire={handleExpire} paused={selected !== null || expired} />

      {/* Question card */}
      <motion.div
        key={current}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0c0a09] border border-orange-900/30 text-zinc-100 rounded-xl px-8 py-12 text-center shadow-[0_0_30px_rgba(249,115,22,0.05)] relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500/0 via-orange-500/30 to-orange-500/0" />
        <div className="flex items-center justify-center gap-2 mb-4 opacity-50">
          <Zap className="w-4 h-4 text-orange-500" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">Rapid Fire Protocol</span>
        </div>
        <p className="text-3xl font-black font-mono tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-400 leading-tight">
          {q.term}
        </p>
        <p className="text-[10px] text-zinc-500 mt-4 uppercase tracking-[0.2em] font-bold font-mono">{q.concept}</p>
      </motion.div>

      {expired && selected === -1 && (
        <p className="text-red-500 text-xs text-center font-bold uppercase tracking-widest flex items-center justify-center gap-2">
          <ShieldAlert className="w-4 h-4" /> TIMEOUT DETECTED
        </p>
      )}

      {/* Options grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {q.options.map((opt, idx) => (
          <motion.button
            key={idx}
            onClick={() => handleSelect(idx)}
            animate={selected === idx && !isCorrect ? { x: [-4, 4, -4, 4, 0] } : {}}
            transition={{ duration: 0.3 }}
            className={`px-5 py-5 rounded-lg border text-sm font-medium text-left transition-all relative overflow-hidden ${getOptionStyle(idx)}`}
          >
            {idx === selected && isCorrect && <div className="absolute inset-0 bg-orange-500/5" />}
            <span className="text-[10px] font-black text-zinc-600 mb-2 block uppercase tracking-widest font-mono">
              OPTION {String.fromCharCode(65 + idx)}
            </span>
            <span className="relative z-10 block font-mono">{opt}</span>
          </motion.button>
        ))}
      </div>

      {/* Mini dots */}
      <div className="flex justify-center mt-2">
        <div className="flex gap-2">
          {results.map((r, i) => (
            <div key={i} className={`w-1.5 h-1.5 rounded-full shadow-[0_0_5px_currentColor] ${r ? 'bg-orange-500 text-orange-500' : 'bg-red-500 text-red-500'}`} />
          ))}
        </div>
      </div>
    </div>
  )
}
