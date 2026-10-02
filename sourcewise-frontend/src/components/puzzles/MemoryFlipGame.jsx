import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Layers } from 'lucide-react'

function getCardTextClass(text, cardType) {
  if (cardType === 'term') {
    return 'text-xs sm:text-sm font-bold tracking-tight'
  }
  const len = (text || '').length
  if (len > 80) return 'text-[10px] sm:text-[10.5px] leading-tight font-medium'
  if (len > 45) return 'text-[11px] sm:text-xs leading-snug font-medium'
  return 'text-xs sm:text-sm leading-snug font-medium'
}

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
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center font-sans">
      <div className="w-full flex items-center justify-between mb-6 bg-white border border-[#EDE7E1] p-4 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-emerald-600" />
          <span className="text-xs uppercase tracking-wider text-[#6B635B] font-semibold">Memory Match</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
            Pairs: {matched.size}/{pair_count}
          </span>
          <span className="text-xs font-bold text-cyan-800 bg-cyan-50 px-3 py-1 rounded-lg border border-cyan-200">
            Flips: {totalFlips}
          </span>
        </div>
      </div>

      <div
        className="grid gap-3 mx-auto w-full"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, maxWidth: cols * 155 }}
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
                style={{ transformStyle: 'preserve-3d', position: 'relative', height: 145 }}
              >
                {/* Card Back (Tactile Arcade Tile) */}
                <div
                  className="absolute inset-0 rounded-2xl border-2 border-[#DCD3C7] bg-gradient-to-br from-[#FAF7F2] to-[#EAE3D9] flex items-center justify-center shadow-xs hover:border-emerald-500 hover:shadow-md hover:bg-[#F3ECE2] transition-all"
                  style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                >
                  <div className="w-9 h-9 rounded-xl border border-[#D5CCC0] bg-white flex items-center justify-center shadow-xs">
                    <Layers className="w-4 h-4 text-[#8A8177]" />
                  </div>
                </div>

                {/* Card Front */}
                <div
                  className={`absolute inset-0 rounded-2xl border-2 flex items-center justify-center p-2.5 text-center shadow-xs overflow-hidden select-none bg-white ${
                    isMatch
                      ? 'border-emerald-500 bg-emerald-50'
                      : isWrong
                      ? 'border-rose-500 bg-rose-50'
                      : card.card_type === 'term'
                      ? 'border-indigo-400 bg-white'
                      : 'border-cyan-400 bg-white'
                  }`}
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  {isMatch && <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none" />}
                  <div className="w-full max-h-full overflow-y-auto scrollbar-hide flex items-center justify-center px-1">
                    <span
                      className={`break-words z-10 ${getCardTextClass(card.content, card.card_type)} ${
                        isMatch
                          ? 'text-emerald-800 font-semibold opacity-90'
                          : isWrong
                          ? 'text-rose-700 font-semibold'
                          : card.card_type === 'term'
                          ? 'text-indigo-950'
                          : 'text-cyan-950'
                      }`}
                    >
                      {card.content}
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Match glow ring */}
              <AnimatePresence>
                {isMatch && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 rounded-2xl ring-4 ring-emerald-300 pointer-events-none shadow-md"
                  />
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-sm mt-8">
        <div className="h-2 bg-[#EAE4DC] border border-[#DFD6CD] rounded-full overflow-hidden shadow-inner">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-sm"
            animate={{ width: `${(matched.size / Math.max(pair_count, 1)) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>
    </div>
  )
}
