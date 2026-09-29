import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, ChevronDown, Type } from 'lucide-react'

export default function ClozeGame({ puzzleData, onComplete }) {
  const { passage = '', blanks = [] } = puzzleData || {}

  const [answers, setAnswers]         = useState({})
  const [openDropdown, setOpenDropdown] = useState(null)
  const [submitted, setSubmitted]     = useState(false)

  const segments = useMemo(() => {
    const segs = []
    const regex = /\{\{(\d+)\}\}/g
    let last = 0
    let m
    while ((m = regex.exec(passage)) !== null) {
      if (m.index > last) segs.push({ type: 'text', content: passage.slice(last, m.index) })
      segs.push({ type: 'blank', index: parseInt(m[1]) })
      last = m.index + m[0].length
    }
    if (last < passage.length) segs.push({ type: 'text', content: passage.slice(last) })
    return segs
  }, [passage])

  const handleSelect = (blankIndex, option) => {
    if (submitted) return
    setAnswers(a => ({ ...a, [blankIndex]: option }))
    setOpenDropdown(null)
  }

  const handleSubmit = () => {
    setSubmitted(true)
    setOpenDropdown(null)
    const correct = blanks.filter(b => (answers[b.index] || '').toLowerCase() === b.answer.toLowerCase()).length
    setTimeout(() => onComplete?.(correct, blanks.length), 1200)
  }

  const allFilled = blanks.every(b => answers[b.index] !== undefined)

  const getBlankStyle = (blank) => {
    if (!submitted) return answers[blank.index]
      ? 'border-rose-500/50 text-rose-400 bg-rose-500/10 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
      : 'border-dashed border-zinc-700 text-zinc-500 bg-zinc-900/50 hover:bg-zinc-800'
    const correct = (answers[blank.index] || '').toLowerCase() === blank.answer.toLowerCase()
    return correct
      ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10'
      : 'border-red-500/50 text-red-500 bg-red-500/10 line-through'
  }

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-6 font-mono">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-rose-500" />
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
            DATA RESTORATION PROTOCOL
          </span>
        </div>
        <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em]">
          CORRUPTED NODES: {blanks.length}
        </span>
      </div>

      {/* Passage with interactive blanks */}
      <div className="text-zinc-300 text-sm leading-8 bg-[#0c0a09] border border-rose-900/30 rounded-xl p-8 shadow-[0_0_20px_rgba(244,63,94,0.05)] relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500/0 via-rose-500/30 to-rose-500/0" />
        
        {segments.map((seg, i) => {
          if (seg.type === 'text') {
            return <span key={i}>{seg.content}</span>
          }
          const blank = blanks.find(b => b.index === seg.index)
          if (!blank) return null
          const chosen = answers[seg.index]

          return (
            <span key={i} className="relative inline-block mx-1">
              <button
                onClick={() => !submitted && setOpenDropdown(openDropdown === seg.index ? null : seg.index)}
                disabled={submitted}
                className={`inline-flex items-center justify-center gap-2 px-3 py-1 rounded border min-w-[90px] text-xs font-black tracking-widest uppercase transition-all ${getBlankStyle(blank)}`}
              >
                {submitted && (answers[seg.index] || '').toLowerCase() !== blank.answer.toLowerCase() && (
                  <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                )}
                {submitted && (answers[seg.index] || '').toLowerCase() === blank.answer.toLowerCase() && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                )}
                <span>{chosen || `[NODE ${seg.index + 1}]`}</span>
                {!submitted && <ChevronDown className="w-3 h-3 shrink-0 opacity-50" />}
              </button>

              {/* Show correct answer after wrong submission */}
              {submitted && (answers[seg.index] || '').toLowerCase() !== blank.answer.toLowerCase() && (
                <span className="absolute -bottom-6 left-0 text-[10px] font-black tracking-widest text-emerald-400 whitespace-nowrap bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-900/50">
                  {blank.answer}
                </span>
              )}

              {/* Dropdown options */}
              <AnimatePresence>
                {openDropdown === seg.index && !submitted && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.95 }}
                    transition={{ duration: 0.12 }}
                    className="absolute top-full left-0 mt-2 z-20 bg-zinc-900 border border-zinc-700 rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.8)] overflow-hidden min-w-[180px]"
                  >
                    <div className="bg-zinc-950 px-3 py-1.5 border-b border-zinc-800 text-[9px] uppercase tracking-widest text-zinc-500 font-black">
                      Select replacement data
                    </div>
                    {(blank.options || [blank.answer]).map((opt, oi) => (
                      <button
                        key={oi}
                        onClick={() => handleSelect(seg.index, opt)}
                        className="w-full px-4 py-3 text-left text-xs font-bold text-zinc-300 hover:bg-rose-500/10 hover:text-rose-400 transition-colors border-b border-zinc-800/50 last:border-0"
                      >
                        {opt}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </span>
          )
        })}
      </div>

      {/* Score summary after submit */}
      {submitted && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-3 py-4 px-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl mt-4"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="font-black text-emerald-400 uppercase tracking-widest text-sm">
            DATA RESTORED: {blanks.filter(b => (answers[b.index] || '').toLowerCase() === b.answer.toLowerCase()).length} / {blanks.length}
          </span>
        </motion.div>
      )}

      {/* Submit button */}
      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={!allFilled}
          className={`w-full h-12 rounded-lg font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 mt-4 ${
            allFilled
              ? 'bg-zinc-100 text-zinc-900 shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:bg-white'
              : 'border border-zinc-800 bg-zinc-900 text-zinc-600 cursor-not-allowed'
          }`}
        >
          {allFilled ? 'EXECUTE RESTORATION' : `REQUIRES ${blanks.filter(b => !answers[b.index]).length} MORE INPUTS`}
        </button>
      )}
    </div>
  )
}
