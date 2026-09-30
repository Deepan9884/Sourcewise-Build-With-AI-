import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Link2, Zap } from 'lucide-react'

export default function MatchPairsGame({ puzzleData, onComplete }) {
  const { terms = [], definitions = [] } = puzzleData || {}

  const [selectedTerm, setSelectedTerm] = useState(null)
  const [matched, setMatched] = useState(new Set())
  const [wrongPair, setWrongPair] = useState(null)
  const [score, setScore] = useState(0)

  const handleTermClick = (termId) => {
    if (matched.has(termId)) return
    setSelectedTerm(termId === selectedTerm ? null : termId)
  }

  const handleDefClick = (def) => {
    if (!selectedTerm || matched.has(def.term_id)) return

    if (def.term_id === selectedTerm) {
      const newMatched = new Set(matched)
      newMatched.add(selectedTerm)
      setMatched(newMatched)
      setScore(s => s + 10)
      setSelectedTerm(null)

      if (newMatched.size === terms.length) {
        setTimeout(() => onComplete?.(newMatched.size * 10, terms.length * 10), 600)
      }
    } else {
      setWrongPair({ termId: selectedTerm, defId: def.id })
      setTimeout(() => {
        setWrongPair(null)
        setSelectedTerm(null)
      }, 800)
      setScore(s => Math.max(0, s - 3))
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center font-sans">
      <div className="w-full flex items-center justify-between mb-6 bg-white border border-[#EDE7E1] p-4 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <Link2 className="w-5 h-5 text-fuchsia-600" />
          <span className="text-xs uppercase tracking-wider text-[#6B635B] font-semibold">Match Concepts & Definitions</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-fuchsia-700 bg-fuchsia-50 px-3 py-1 rounded-lg border border-fuchsia-200">
            Matched: {matched.size}/{terms.length}
          </span>
          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
            Score: {score} pts
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {/* Terms Column */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-bold uppercase tracking-wider text-[#7A7167] mb-1 pl-1">Key Terms</p>
          {terms.map((t) => {
            const isMatched = matched.has(t.id)
            const isSelected = selectedTerm === t.id
            const isWrong = wrongPair?.termId === t.id

            return (
              <motion.button
                key={t.id}
                onClick={() => handleTermClick(t.id)}
                animate={isWrong ? { x: [-8, 8, -8, 8, 0] } : {}}
                transition={{ duration: 0.3 }}
                disabled={isMatched}
                className={`px-4 py-3.5 rounded-xl border text-sm font-semibold text-left transition-all w-full relative overflow-hidden ${
                  isMatched
                    ? 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800 line-through opacity-70 cursor-default'
                    : isSelected
                    ? 'border-2 border-fuchsia-500 bg-fuchsia-50/90 text-fuchsia-900 shadow-sm ring-2 ring-fuchsia-200'
                    : isWrong
                    ? 'border-2 border-rose-500 bg-rose-50 text-rose-700'
                    : 'border-[#EDE7E1] bg-white text-[#1E1B16] hover:border-fuchsia-300 hover:bg-fuchsia-50/30 shadow-xs'
                }`}
              >
                {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-fuchsia-500" />}
                <div className="flex items-center gap-3">
                  {isMatched && <CheckCircle2 className="w-4 h-4 shrink-0 text-fuchsia-600" />}
                  <span>{t.term}</span>
                </div>
              </motion.button>
            )
          })}
        </div>

        {/* Definitions Column */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-bold uppercase tracking-wider text-[#7A7167] mb-1 pl-1">Definitions</p>
          {definitions.map((d) => {
            const isMatched = matched.has(d.term_id)
            const isWrong = wrongPair?.defId === d.id

            return (
              <motion.button
                key={d.id}
                onClick={() => handleDefClick(d)}
                animate={isWrong ? { x: [-8, 8, -8, 8, 0] } : {}}
                transition={{ duration: 0.3 }}
                disabled={!selectedTerm || isMatched}
                className={`px-4 py-3.5 rounded-xl border text-sm leading-relaxed text-left transition-all w-full relative ${
                  isMatched
                    ? 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800/80 opacity-70 cursor-default'
                    : isWrong
                    ? 'border-2 border-rose-500 bg-rose-50 text-rose-700'
                    : selectedTerm
                    ? 'border-[#DFD6CD] bg-white text-[#1E1B16] hover:border-fuchsia-400 hover:bg-fuchsia-50/20 hover:shadow-sm cursor-pointer'
                    : 'border-[#EDE7E1] bg-[#FAF8F5] text-[#8A8177] cursor-default'
                }`}
              >
                <div className="flex items-start gap-3">
                  {isMatched && <CheckCircle2 className="w-4 h-4 shrink-0 text-fuchsia-600 mt-0.5" />}
                  <span>{d.definition}</span>
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full mt-8">
        <div className="h-2 bg-[#EAE4DC] border border-[#DFD6CD] rounded-full overflow-hidden shadow-inner">
          <motion.div
            className="h-full bg-gradient-to-r from-fuchsia-600 to-purple-600 shadow-sm"
            animate={{ width: `${(matched.size / Math.max(terms.length, 1)) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      <div className="h-8 mt-4 flex items-center justify-center">
        {!selectedTerm && matched.size < terms.length && (
          <p className="text-xs font-medium text-[#7A7167] flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-500" /> Select a term on the left to begin
          </p>
        )}
        {selectedTerm && (
          <p className="text-xs font-semibold text-fuchsia-700 animate-pulse">
            Select the matching definition on the right →
          </p>
        )}
      </div>
    </div>
  )
}
