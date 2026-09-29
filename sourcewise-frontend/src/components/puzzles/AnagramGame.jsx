import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, CheckCircle2, XCircle, ArrowRight, Shuffle } from 'lucide-react'

export default function AnagramGame({ puzzleData, onComplete, onHint }) {
  const { anagrams = [] } = puzzleData || {}

  const [current, setCurrent]       = useState(0)
  const [input, setInput]           = useState('')
  const [feedback, setFeedback]     = useState(null)
  const [score, setScore]           = useState(0)
  const [hintUsed, setHintUsed]     = useState(false)
  const [hintText, setHintText]     = useState(null)
  const [letterPick, setLetterPick] = useState([])

  const anagram = anagrams[current]
  const isLast  = current >= anagrams.length - 1

  const advance = useCallback(() => {
    if (isLast) {
      onComplete?.(score, anagrams.length * 20)
    } else {
      setCurrent(c => c + 1)
      setInput('')
      setFeedback(null)
      setHintUsed(false)
      setHintText(null)
      setLetterPick([])
    }
  }, [isLast, score, anagrams.length, onComplete])

  const handleSubmit = () => {
    if (!input.trim() || feedback) return
    const correct = input.trim().toUpperCase() === anagram.term.toUpperCase()
    setFeedback(correct ? 'correct' : 'wrong')
    if (correct) setScore(s => s + (hintUsed ? 10 : 20))
    setTimeout(advance, 1200)
  }

  const handleLetterClick = (letter, idx) => {
    if (letterPick.includes(idx)) return
    setLetterPick(p => [...p, idx])
    setInput(v => v + letter)
  }

  const handleBackspace = () => {
    if (!input.length) return
    setInput(v => v.slice(0, -1))
    setLetterPick(p => p.slice(0, -1))
  }

  const handleHint = async () => {
    if (hintUsed) return
    setHintUsed(true)
    onHint?.()
    setHintText(`KEY_INIT: ${anagram.term.slice(0, 2)}...`)
  }

  if (!anagram) return null

  const scrambledLetters = anagram.scrambled.split('')

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <Shuffle className="w-4 h-4 text-amber-500" />
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] font-mono">
            DECRYPT: {current + 1}/{anagrams.length}
          </span>
        </div>
        <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] font-mono">PTS: {score}</span>
      </div>

      <div className="h-1 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
        <motion.div
          className="h-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]"
          animate={{ width: `${((current) / anagrams.length) * 100}%` }}
        />
      </div>

      {/* Definition clue */}
      <div className="bg-[#0c0a09] border border-amber-900/30 rounded-xl p-6 text-center shadow-[0_0_20px_rgba(245,158,11,0.05)] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500/0 via-amber-500/30 to-amber-500/0" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500/70 mb-3 font-mono">Signature Match</p>
        <p className="text-sm font-mono text-zinc-300">"{anagram.definition}"</p>
        {hintText && (
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-xs text-amber-400 font-bold mt-4 font-mono uppercase tracking-widest"
          >{hintText}</motion.p>
        )}
      </div>

      {/* Scrambled letter tiles */}
      <div>
        <div className="flex flex-wrap gap-2 justify-center">
          {scrambledLetters.map((letter, idx) => {
            const used = letterPick.includes(idx)
            return (
              <motion.button
                key={idx}
                onClick={() => handleLetterClick(letter, idx)}
                disabled={used || !!feedback}
                whileHover={!used ? { scale: 1.05 } : {}}
                whileTap={!used ? { scale: 0.95 } : {}}
                className={`w-12 h-12 rounded-lg border flex items-center justify-center text-lg font-black font-mono transition-all ${
                  used
                    ? 'border-zinc-800 bg-zinc-950/50 text-zinc-700 cursor-default shadow-none'
                    : 'border-zinc-700 bg-zinc-900 text-amber-100 hover:border-amber-500/50 hover:bg-zinc-800 hover:text-amber-400 cursor-pointer shadow-[0_4px_0_rgb(63,63,70)] active:shadow-[0_0px_0_rgb(63,63,70)] active:translate-y-1'
                }`}
              >
                {letter}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Answer input display */}
      <div className="flex flex-col items-center gap-4 mt-2">
        <div className={`min-h-[60px] w-full flex items-center justify-center px-4 rounded-xl border font-mono text-2xl font-black tracking-[0.3em] uppercase transition-colors shadow-inner ${
          feedback === 'correct' ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
          : feedback === 'wrong'   ? 'border-red-500 bg-red-500/10 text-red-500'
          : 'border-zinc-800 bg-[#09090b] text-zinc-100'
        }`}>
          <AnimatePresence mode="wait">
            {feedback === 'correct' ? (
              <motion.div key="correct" initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-amber-400" />
                <span className="shadow-amber-400 drop-shadow-md">{anagram.term}</span>
              </motion.div>
            ) : feedback === 'wrong' ? (
              <motion.div key="wrong" initial={{ x: -5 }} animate={{ x: [-5, 5, -5, 5, 0] }} className="flex items-center gap-3">
                <XCircle className="w-6 h-6 text-red-500" />
                <span>{input || '?'}</span>
              </motion.div>
            ) : (
              <motion.span key="input">{input || <span className="text-zinc-700 animate-pulse">_</span>}</motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full">
          <button
            onClick={handleBackspace}
            disabled={!input || !!feedback}
            className="h-12 rounded-lg border border-zinc-800 bg-zinc-900 text-[10px] font-black tracking-widest uppercase font-mono text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-40 transition-colors"
          >
            ← BACKSPACE
          </button>
          <button
            onClick={handleSubmit}
            disabled={!input || !!feedback}
            className="h-12 rounded-lg bg-zinc-100 text-zinc-900 text-[10px] font-black tracking-widest uppercase font-mono hover:bg-white disabled:opacity-40 transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
          >
            EXECUTE <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Hint + Reset row */}
        <div className="grid grid-cols-2 gap-3 w-full">
          <button
            onClick={() => { setInput(''); setLetterPick([]) }}
            disabled={!input || !!feedback}
            className="h-10 rounded-lg border border-zinc-800 bg-zinc-950 text-[10px] font-black tracking-widest uppercase font-mono text-zinc-500 hover:bg-zinc-900 disabled:opacity-40 transition-colors"
          >
            CLEAR BUFFER
          </button>
          <button
            onClick={handleHint}
            disabled={hintUsed || !!feedback}
            className="h-10 rounded-lg border border-amber-900/50 bg-amber-950/20 text-[10px] font-black tracking-widest uppercase font-mono text-amber-500 hover:bg-amber-900/40 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
          >
            <Lightbulb className="w-3.5 h-3.5" /> OVERRIDE (-10 PTS)
          </button>
        </div>
      </div>
    </div>
  )
}
