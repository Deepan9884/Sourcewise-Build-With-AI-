import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Search } from 'lucide-react'

export default function WordSearchGame({ puzzleData, onComplete }) {
  const { grid = [], words = [], grid_size = 15 } = puzzleData || {}

  const [foundWords, setFoundWords] = useState(new Set())
  const [selecting, setSelecting] = useState(false)
  const [selStart, setSelStart] = useState(null)
  const [selCurrent, setSelCurrent] = useState(null)
  const [flash, setFlash] = useState(null)
  const [popup, setPopup] = useState(null)
  const [highlightedCells, setHighlightedCells] = useState(new Map())

  const containerRef = useRef(null)
  const popupTimer = useRef(null)

  const getSelectedCells = useCallback((start, end) => {
    if (!start || !end) return []
    const dr = Math.sign(end.r - start.r)
    const dc = Math.sign(end.c - start.c)
    const cells = []
    let r = start.r, c = start.c
    while (true) {
      cells.push({ r, c })
      if (r === end.r && c === end.c) break
      r += dr
      c += dc
      if (cells.length > grid_size * 2) break
    }
    return cells
  }, [grid_size])

  const checkWordMatch = useCallback((cells) => {
    if (!cells.length) return null
    const selected = cells.map(({ r, c }) => grid[r]?.[c] || '').join('')
    const reversed = selected.split('').reverse().join('')
    return words.find(w => !foundWords.has(w.word) && (w.word === selected || w.word === reversed)) || null
  }, [grid, words, foundWords])

  const handleMouseDown = (r, c) => {
    setSelecting(true)
    setSelStart({ r, c })
    setSelCurrent({ r, c })
  }

  const handleMouseEnter = (r, c) => {
    if (selecting) setSelCurrent({ r, c })
  }

  const handleMouseUp = () => {
    if (!selecting) return
    setSelecting(false)
    const cells = getSelectedCells(selStart, selCurrent)
    const match = checkWordMatch(cells)

    if (match) {
      const newFound = new Set(foundWords)
      newFound.add(match.word)
      setFoundWords(newFound)

      const newHighlights = new Map(highlightedCells)
      cells.forEach(({ r, c }) => newHighlights.set(`${r},${c}`, 'cyan'))
      setHighlightedCells(newHighlights)

      if (popupTimer.current) clearTimeout(popupTimer.current)
      setPopup({ word: match.word, definition: match.definition })
      popupTimer.current = setTimeout(() => setPopup(null), 4000)

      setFlash({ cells, word: match.word })
      setTimeout(() => setFlash(null), 600)

      if (newFound.size === words.length) {
        setTimeout(() => onComplete?.(newFound.size * 10, words.length * 10), 1000)
      }
    }
    setSelStart(null)
    setSelCurrent(null)
  }

  const activeCells = selecting ? getSelectedCells(selStart, selCurrent) : []
  const isActive = (r, c) => activeCells.some(cell => cell.r === r && cell.c === c)
  const isFlashed = (r, c) => flash?.cells.some(cell => cell.r === r && cell.c === c)
  const highlightColor = (r, c) => highlightedCells.get(`${r},${c}`)

  const getCellStyle = (r, c) => {
    if (isFlashed(r, c)) return 'bg-cyan-500 text-white font-black scale-110 shadow-lg z-10'
    if (isActive(r, c)) return 'bg-cyan-100 text-cyan-900 border-2 border-cyan-500 shadow-sm scale-105 z-10 font-bold'
    if (highlightColor(r, c)) return 'bg-cyan-600 text-white font-black'
    return 'bg-[#FAF7F2] text-[#2D2A26] hover:bg-cyan-50 hover:text-cyan-800'
  }

  const cellPx = Math.max(20, Math.min(32, 400 / grid_size))
  const fontSize = cellPx < 24 ? 'text-[10px]' : (cellPx < 28 ? 'text-xs' : 'text-sm')

  return (
    <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl mx-auto items-start">
      <div
        ref={containerRef}
        onMouseLeave={handleMouseUp}
        className="mx-auto bg-white p-3 md:p-5 rounded-2xl border-2 border-[#E0D7CE] shadow-sm touch-none flex-shrink-0"
      >
        <div className="flex flex-col border border-[#E5DDD3] rounded-xl overflow-hidden font-mono">
          {grid.map((row, r) => (
            <div key={r} className="flex">
              {row.map((letter, c) => (
                <div
                  key={c}
                  onMouseDown={() => handleMouseDown(r, c)}
                  onMouseEnter={() => handleMouseEnter(r, c)}
                  onMouseUp={handleMouseUp}
                  className={`flex items-center justify-center cursor-crosshair font-bold border-r border-b border-[#EDE6DC] transition-all duration-100 ${getCellStyle(r, c)} ${fontSize}`}
                  style={{ width: cellPx, height: cellPx, userSelect: 'none' }}
                >
                  {letter}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 min-w-[200px] w-full flex flex-col h-full bg-white rounded-2xl border border-[#EDE7E1] p-5 shadow-xs font-sans">
        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-[#EDE7E1]">
          <Search className="w-4 h-4 text-cyan-600" />
          <span className="text-xs font-semibold text-[#1E1B16] uppercase tracking-wider">Words to Find ({words.length})</span>
          <span className="ml-auto text-xs font-bold text-cyan-800 bg-cyan-50 px-2.5 py-1 rounded-md border border-cyan-200">
            {foundWords.size}/{words.length}
          </span>
        </div>
        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
          {words.map((w) => {
            const found = foundWords.has(w.word)
            return (
              <motion.div
                key={w.word}
                animate={{ opacity: found ? 0.6 : 1, scale: found ? 0.98 : 1 }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all text-xs font-semibold ${found ? 'border-cyan-200 bg-cyan-50 text-cyan-800 line-through' : 'border-[#EDE7E1] bg-[#FAF8F5] text-[#2D2A26] hover:border-cyan-300'}`}
              >
                {found && <CheckCircle2 className="w-4 h-4 text-cyan-600 shrink-0" />}
                <span className={`tracking-wide ${found ? 'text-cyan-800' : 'text-[#2D2A26]'}`}>{w.word}</span>
              </motion.div>
            )
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-[#EDE7E1]">
          <div className="h-2 bg-[#EAE4DC] border border-[#DFD6CD] rounded-full overflow-hidden shadow-inner">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-600 to-teal-500 shadow-sm"
              animate={{ width: `${(foundWords.size / Math.max(words.length, 1)) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <p className="text-xs text-[#7A7167] mt-2.5 text-center font-medium font-sans">
            {foundWords.size === words.length ? 'All words found!' : `${words.length - foundWords.size} remaining`}
          </p>
        </div>
      </div>

      <AnimatePresence>
        {popup && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white border-2 border-cyan-500 text-[#1E1B16] px-5 py-4 rounded-2xl shadow-2xl max-w-sm w-full text-center z-[110]"
          >
            <p className="font-bold text-cyan-800 text-sm mb-1 font-sans">Word Found: {popup.word}</p>
            <p className="text-xs text-[#554E46] font-sans leading-relaxed">{popup.definition}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
