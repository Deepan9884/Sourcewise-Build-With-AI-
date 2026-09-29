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
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
      <div className="w-full flex items-center justify-between mb-6 bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <Link2 className="w-5 h-5 text-fuchsia-400" />
          <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">Establish Neural Links</span>
        </div>
        <div className="flex items-center gap-6 font-mono">
          <span className="text-sm font-bold text-fuchsia-400 uppercase tracking-widest">LINKS: {matched.size}/{terms.length}</span>
          <span className="text-sm font-black text-amber-400 uppercase tracking-widest">PTS: {score}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {/* Terms Column */}
        <div className="flex flex-col gap-3">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1 pl-1">Data Entities</p>
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
                className={`px-4 py-3.5 rounded-lg border text-sm font-bold tracking-wider text-left transition-all w-full relative overflow-hidden ${
                  isMatched
                    ? 'border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-500 cursor-default'
                    : isSelected
                    ? 'border-fuchsia-400 bg-zinc-900 text-fuchsia-300 shadow-[0_0_15px_rgba(217,70,239,0.3)]'
                    : isWrong
                    ? 'border-red-500 bg-red-500/10 text-red-400'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-fuchsia-500/40 hover:bg-zinc-900'
                }`}
              >
                {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-fuchsia-400 shadow-[0_0_10px_rgba(217,70,239,1)]" />}
                <div className="flex items-center gap-3">
                  {isMatched && <CheckCircle2 className="w-4 h-4 shrink-0 text-fuchsia-500" />}
                  <span>{t.term}</span>
                </div>
              </motion.button>
            )
          })}
        </div>

        {/* Definitions Column */}
        <div className="flex flex-col gap-3">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1 pl-1">Signatures</p>
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
                className={`px-4 py-3.5 rounded-lg border text-sm font-mono leading-relaxed text-left transition-all w-full relative ${
                  isMatched
                    ? 'border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-500/70 cursor-default'
                    : isWrong
                    ? 'border-red-500 bg-red-500/10 text-red-400'
                    : selectedTerm
                    ? 'border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-fuchsia-400/80 hover:shadow-[0_0_15px_rgba(217,70,239,0.2)] cursor-pointer'
                    : 'border-zinc-800 bg-zinc-950/50 text-zinc-500 cursor-default'
                }`}
              >
                <div className="flex items-start gap-3">
                  {isMatched && <CheckCircle2 className="w-4 h-4 shrink-0 text-fuchsia-500 mt-0.5" />}
                  <span>{d.definition}</span>
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full mt-8">
        <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-fuchsia-500 shadow-[0_0_10px_rgba(217,70,239,0.8)]"
            animate={{ width: `${(matched.size / Math.max(terms.length, 1)) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      <div className="h-8 mt-4 flex items-center justify-center">
        {!selectedTerm && matched.size < terms.length && (
          <p className="text-xs uppercase tracking-[0.2em] font-bold text-zinc-600 flex items-center gap-2">
            <Zap className="w-3 h-3" /> Select an entity to begin
          </p>
        )}
        {selectedTerm && (
          <p className="text-xs uppercase tracking-[0.2em] font-bold text-fuchsia-400 animate-pulse">
            Target acquired. Select matching signature →
          </p>
        )}
      </div>
    </div>
  )
}
