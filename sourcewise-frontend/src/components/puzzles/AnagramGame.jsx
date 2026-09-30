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
    setHintText(`Hint: Starts with "${anagram.term.slice(0, 2).toUpperCase()}"`)
  }

  if (!anagram) return null

  const scrambledLetters = anagram.scrambled.split('')

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-6 font-sans">
      <div className="flex items-center justify-between border-b border-[#EDE7E1] pb-3">
        <div className="flex items-center gap-2">
          <Shuffle className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-semibold text-[#7A7167]">
            Word {current + 1} of {anagrams.length}
          </span>
        </div>
        <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">{score} pts</span>
      </div>

      <div className="h-2 bg-[#EAE4DC] border border-[#DFD6CD] rounded-full overflow-hidden shadow-inner">
        <motion.div
          className="h-full bg-gradient-to-r from-amber-500 to-yellow-500 shadow-sm"
          animate={{ width: `${((current) / anagrams.length) * 100}%` }}
        />
      </div>

      {/* Definition clue */}
      <div className="bg-white border-2 border-amber-200 rounded-2xl p-6 text-center shadow-xs relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400" />
        <p className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-2">Definition Clue</p>
        <p className="text-sm text-[#2D2A26] font-normal leading-relaxed">"{anagram.definition}"</p>
        {hintText && (
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-xs text-amber-800 font-semibold mt-2.5"
          >{hintText}</motion.p>
        )}
      </div>

      {/* Scrambled letter tiles */}
      <div>
        <div className="flex flex-wrap gap-2.5 justify-center">
          {scrambledLetters.map((letter, idx) => {
            const used = letterPick.includes(idx)
            return (
              <motion.button
                key={idx}
                onClick={() => handleLetterClick(letter, idx)}
                disabled={used || !!feedback}
                whileHover={!used ? { scale: 1.05 } : {}}
                whileTap={!used ? { scale: 0.95 } : {}}
                className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-lg font-bold transition-all ${
                  used
                    ? 'border-[#EDE7E1] bg-[#F5F0E8] text-[#A69E94] cursor-default shadow-none'
                    : 'border-[#D0C5B8] bg-white text-[#1E1B16] hover:border-amber-500 hover:bg-amber-50 hover:text-amber-800 cursor-pointer shadow-[0_4px_0_#C5B9AC] active:shadow-none active:translate-y-1'
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
        <div className={`min-h-[64px] w-full flex items-center justify-center px-4 rounded-2xl border-2 text-2xl font-bold tracking-wider uppercase transition-colors shadow-inner ${
          feedback === 'correct' ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
          : feedback === 'wrong'   ? 'border-rose-500 bg-rose-50 text-rose-700'
          : 'border-[#E0D7CE] bg-white text-[#1E1B16]'
        }`}>
          <AnimatePresence mode="wait">
            {feedback === 'correct' ? (
              <motion.div key="correct" initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <span className="text-emerald-800">{anagram.term}</span>
              </motion.div>
            ) : feedback === 'wrong' ? (
              <motion.div key="wrong" initial={{ x: -5 }} animate={{ x: [-5, 5, -5, 5, 0] }} className="flex items-center gap-3">
                <XCircle className="w-6 h-6 text-rose-600" />
                <span>{input || '?'}</span>
              </motion.div>
            ) : (
              <motion.span key="input">{input || <span className="text-[#B5A898] animate-pulse">_</span>}</motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full">
          <button
            onClick={handleBackspace}
            disabled={!input || !!feedback}
            className="h-12 rounded-xl border border-[#DFD6CD] bg-white text-xs font-semibold text-[#6B635B] hover:bg-[#F5F0EB] hover:text-[#1E1B16] disabled:opacity-40 transition-colors shadow-xs"
          >
            Backspace
          </button>
          <button
            onClick={handleSubmit}
            disabled={!input || !!feedback}
            className="h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold hover:from-amber-400 hover:to-orange-400 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5 shadow-xs active:scale-98"
          >
            Submit Answer <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Hint + Reset row */}
        <div className="grid grid-cols-2 gap-3 w-full">
          <button
            onClick={() => { setInput(''); setLetterPick([]) }}
            disabled={!input || !!feedback}
            className="h-10 rounded-xl border border-[#EDE7E1] bg-[#FAF8F5] text-xs font-medium text-[#7A7167] hover:bg-[#F3EFEA] hover:text-[#1E1B16] disabled:opacity-40 transition-colors"
          >
            Clear Letters
          </button>
          <button
            onClick={handleHint}
            disabled={hintUsed || !!feedback}
            className="h-10 rounded-xl border border-amber-300 bg-amber-50 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-600" /> Get a Hint (-10 pts)
          </button>
        </div>
      </div>
    </div>
  )
}
