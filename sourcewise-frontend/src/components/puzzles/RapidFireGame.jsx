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
    if (selected === null && !expired) return 'border-[#EDE7E1] bg-white text-[#1E1B16] hover:border-orange-400 hover:bg-orange-50/40 cursor-pointer shadow-xs'
    if (idx === q.correct_index) return 'border-2 border-emerald-500 bg-emerald-50 text-emerald-900 font-bold shadow-md ring-2 ring-emerald-200'
    if (idx === selected && !isCorrect) return 'border-2 border-rose-500 bg-rose-50 text-rose-700 font-bold'
    return 'border-[#EDE7E1] bg-[#FAF8F5] text-[#8A8177]'
  }

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-6 font-sans">
      {/* Header: progress + combo */}
      <div className="flex items-center justify-between border-b border-[#EDE7E1] pb-3">
        <span className="text-xs font-semibold text-[#7A7167]">
          Question {current + 1} of {questions.length}
        </span>
        <div className="flex items-center gap-3">
          <AnimatePresence>
            {combo >= 3 && (
              <motion.div
                key={combo}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-100 border border-orange-300 rounded-lg shadow-xs"
              >
                <Flame className="w-3.5 h-3.5 text-orange-600 animate-pulse" />
                <span className="text-xs font-bold text-orange-800">{comboMultiplier}x Streak</span>
              </motion.div>
            )}
          </AnimatePresence>
          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">{score} pts</span>
        </div>
      </div>

      {/* Timer */}
      <TimerBar key={timerKey} duration={6} onExpire={handleExpire} paused={selected !== null || expired} />

      {/* Question card */}
      <motion.div
        key={current}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border-2 border-orange-200 text-[#1E1B16] rounded-2xl px-8 py-8 text-center shadow-xs relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-400 via-amber-400 to-orange-400" />
        <div className="flex items-center justify-center gap-1.5 mb-3">
          <Zap className="w-4 h-4 text-orange-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-orange-700">Speed Recall</span>
        </div>
        <p className="text-2xl md:text-3xl font-bold text-[#1E1B16] leading-snug">
          {q.term}
        </p>
        <p className="text-xs text-[#7A7167] mt-2 font-medium">{q.concept}</p>
      </motion.div>

      {expired && selected === -1 && (
        <p className="text-rose-600 text-xs text-center font-semibold flex items-center justify-center gap-2">
          <ShieldAlert className="w-4 h-4" /> Time's up!
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
            className={`px-5 py-4 rounded-xl border text-sm font-medium text-left transition-all relative overflow-hidden ${getOptionStyle(idx)}`}
          >
            {idx === selected && isCorrect && <div className="absolute inset-0 bg-emerald-500/10" />}
            <span className="text-[11px] font-semibold text-[#8A8177] mb-1.5 block">
              Option {String.fromCharCode(65 + idx)}
            </span>
            <span className="relative z-10 block text-sm text-[#1E1B16] leading-relaxed">{opt}</span>
          </motion.button>
        ))}
      </div>

      {/* Mini dots */}
      <div className="flex justify-center mt-2">
        <div className="flex gap-2">
          {results.map((r, i) => (
            <div key={i} className={`w-2 h-2 rounded-full ${r ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-rose-500 ring-2 ring-rose-200'}`} />
          ))}
        </div>
      </div>
    </div>
  )
}
