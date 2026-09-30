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
      ? 'border-2 border-rose-400 text-rose-800 bg-rose-50 shadow-xs font-bold'
      : 'border-dashed border-2 border-[#D0C5B8] text-[#7A7167] bg-[#FAF7F2] hover:bg-[#F3EDE5] hover:border-[#B5A898]'
    const correct = (answers[blank.index] || '').toLowerCase() === blank.answer.toLowerCase()
    return correct
      ? 'border-2 border-emerald-500 text-emerald-800 bg-emerald-50 font-bold'
      : 'border-2 border-rose-500 text-rose-700 bg-rose-50 line-through font-bold'
  }

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-6 font-sans">
      <div className="flex items-center justify-between border-b border-[#EDE7E1] pb-3">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-rose-600" />
          <span className="text-xs font-semibold text-[#7A7167] uppercase tracking-wider">
            Fill in the Blanks
          </span>
        </div>
        <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
          {blanks.length} Blanks to Complete
        </span>
      </div>

      {/* Passage with interactive blanks */}
      <div className="text-[#2D2A26] text-sm leading-8 bg-white border-2 border-rose-200 rounded-2xl p-6 md:p-8 shadow-xs relative overflow-hidden font-sans">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-400 via-pink-400 to-rose-400" />
        
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
                className={`inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-xl border min-w-[90px] text-xs font-semibold transition-all shadow-xs ${getBlankStyle(blank)}`}
              >
                {submitted && (answers[seg.index] || '').toLowerCase() !== blank.answer.toLowerCase() && (
                  <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                )}
                {submitted && (answers[seg.index] || '').toLowerCase() === blank.answer.toLowerCase() && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                )}
                <span>{chosen || `[Blank ${seg.index + 1}]`}</span>
                {!submitted && <ChevronDown className="w-3 h-3 shrink-0 opacity-60" />}
              </button>

              {/* Show correct answer after wrong submission */}
              {submitted && (answers[seg.index] || '').toLowerCase() !== blank.answer.toLowerCase() && (
                <span className="absolute -bottom-6 left-0 text-[11px] font-semibold text-emerald-800 whitespace-nowrap bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-300 shadow-xs">
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
                    className="absolute top-full left-0 mt-2 z-30 bg-white border border-[#DFD6CD] rounded-2xl shadow-xl overflow-hidden min-w-[200px]"
                  >
                    <div className="bg-[#FAF8F5] px-3.5 py-2 border-b border-[#EDE7E1] text-[10px] uppercase tracking-wider text-[#7A7167] font-bold">
                      Select the correct term
                    </div>
                    {(blank.options || [blank.answer]).map((opt, oi) => (
                      <button
                        key={oi}
                        onClick={() => handleSelect(seg.index, opt)}
                        className="w-full px-4 py-2.5 text-left text-xs font-medium text-[#2D2A26] hover:bg-rose-50 hover:text-rose-700 transition-colors border-b border-[#EDE7E1] last:border-0"
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
          className="flex items-center justify-center gap-3 py-4 px-6 bg-emerald-50 border border-emerald-300 rounded-2xl mt-4 shadow-xs"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span className="font-bold text-emerald-800 text-sm">
            Correct: {blanks.filter(b => (answers[b.index] || '').toLowerCase() === b.answer.toLowerCase()).length} of {blanks.length}
          </span>
        </motion.div>
      )}

      {/* Submit button */}
      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={!allFilled}
          className={`w-full h-12 rounded-xl font-semibold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 mt-4 ${
            allFilled
              ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-xs hover:from-rose-400 hover:to-pink-500 active:scale-98'
              : 'border border-[#EDE7E1] bg-[#FAF8F5] text-[#A69E94] cursor-not-allowed'
          }`}
        >
          {allFilled ? 'Check Answers' : `Select remaining ${blanks.filter(b => !answers[b.index]).length} blanks`}
        </button>
      )}
    </div>
  )
}
