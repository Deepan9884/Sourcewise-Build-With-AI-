import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Layers } from 'lucide-react'

export default function MemoryFlipGame({ puzzleData, onComplete }) {
  const { cards = [], pair_count = 0 } = puzzleData || {}

  const [flipped, setFlipped]     = useState(new Set())
  const [matched, setMatched]     = useState(new Set())
  const [wrong, setWrong]         = useState(new Set())
  const [totalFlips, setTotalFlips] = useState(0)
  const [busy, setBusy]           = useState(false)
  const pendingTimer              = useRef(null)

  const handleFlip = (card) => {
    if (busy || matched.has(card.pair_id) || flipped.has(card.id)) return

    setTotalFlips(f => f + 1)
    const newFlipped = new Set(flipped)
    newFlipped.add(card.id)
    setFlipped(newFlipped)

    const openId = [...flipped].find(id => {
      const c = cards.find(c => c.id === id)
      return c && !matched.has(c.pair_id)
    })

    if (!openId) return

    const openCard = cards.find(c => c.id === openId)
    if (!openCard) return

    if (openCard.pair_id === card.pair_id) {
      const newMatched = new Set(matched)
      newMatched.add(card.pair_id)
      setMatched(newMatched)
      setFlipped(new Set())

      if (newMatched.size === pair_count) {
        const score = Math.max(10, 100 - Math.max(0, totalFlips + 1 - pair_count) * 5)
        setTimeout(() => onComplete?.(score, 100), 600)
      }
    } else {
      setBusy(true)
      setWrong(new Set([openId, card.id]))
      pendingTimer.current = setTimeout(() => {
        setFlipped(new Set())
        setWrong(new Set())
        setBusy(false)
      }, 1200)
    }
  }

  const cols = pair_count <= 6 ? 3 : 4
  const isFaceUp = (card) => flipped.has(card.id) || matched.has(card.pair_id)

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
      <div className="w-full flex items-center justify-between mb-6 bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">Spatial Recall Unit</span>
        </div>
        <div className="flex items-center gap-6 font-mono">
          <span className="text-sm font-bold text-emerald-400 uppercase tracking-widest">PAIRS: {matched.size}/{pair_count}</span>
          <span className="text-sm font-black text-cyan-400 uppercase tracking-widest">FLIPS: {totalFlips}</span>
        </div>
      </div>

      <div
        className="grid gap-3 mx-auto w-full"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, maxWidth: cols * 130 }}
      >
        {cards.map((card) => {
          const faceUp   = isFaceUp(card)
          const isWrong  = wrong.has(card.id)
          const isMatch  = matched.has(card.pair_id)

          return (
            <motion.div
              key={card.id}
              onClick={() => handleFlip(card)}
              animate={isWrong ? { x: [-4, 4, -4, 4, 0] } : {}}
              transition={{ duration: 0.3 }}
              className="relative cursor-pointer"
              style={{ perspective: 1000 }}
            >
              <motion.div
                animate={{ rotateY: faceUp ? 180 : 0 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                style={{ transformStyle: 'preserve-3d', position: 'relative', height: 120 }}
              >
                {/* Card Back (Dark/Gamer) */}
                <div
                  className="absolute inset-0 rounded-xl border border-zinc-700 bg-zinc-900 flex items-center justify-center shadow-[0_0_10px_rgba(0,0,0,0.5)] hover:border-emerald-500/50 hover:bg-zinc-800 transition-colors"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <div className="w-8 h-8 rounded-full border border-zinc-700 bg-zinc-950 flex items-center justify-center">
                    <Layers className="w-4 h-4 text-zinc-600" />
                  </div>
                </div>

                {/* Card Front */}
                <div
                  className={`absolute inset-0 rounded-xl border-2 flex items-center justify-center p-3 text-center shadow-[0_0_15px_rgba(0,0,0,0.5)] overflow-hidden ${
                    isMatch
                      ? 'border-emerald-500/50 bg-emerald-900/20'
                      : isWrong
                      ? 'border-red-500/50 bg-red-900/20'
                      : card.card_type === 'term'
                      ? 'border-indigo-500/50 bg-zinc-900'
                      : 'border-cyan-500/50 bg-zinc-900'
                  }`}
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  {isMatch && <div className="absolute inset-0 bg-emerald-500/5" />}
                  <span
                    className={`font-mono leading-tight z-10 ${
                      isMatch
                        ? 'text-emerald-400 font-bold opacity-70'
                        : card.card_type === 'term'
                        ? 'text-sm font-black tracking-wider text-indigo-400 uppercase'
                        : 'text-[11px] font-bold text-cyan-300'
                    }`}
                  >
                    {card.content}
                  </span>
                </div>
              </motion.div>

              {/* Match glow ring */}
              <AnimatePresence>
                {isMatch && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 rounded-xl ring-2 ring-emerald-500 pointer-events-none shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                  />
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-sm mt-8">
        <div className="h-1 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
          <motion.div
            className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"
            animate={{ width: `${(matched.size / Math.max(pair_count, 1)) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>
    </div>
  )
}
