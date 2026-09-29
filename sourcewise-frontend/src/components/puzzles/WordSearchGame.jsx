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
    if (isFlashed(r, c)) return 'bg-cyan-400 text-black scale-110 shadow-[0_0_15px_rgba(34,211,238,0.8)] z-10'
    if (isActive(r, c)) return 'bg-cyan-500/40 text-cyan-200 border-cyan-400/50 shadow-[0_0_10px_rgba(34,211,238,0.2)] scale-105 z-10'
    if (highlightColor(r, c)) return 'bg-cyan-900/50 text-cyan-300 font-black'
    return 'bg-zinc-950 text-zinc-600 hover:bg-zinc-800/80 hover:text-zinc-300'
  }

  const cellPx = Math.max(20, Math.min(32, 400 / grid_size))
  const fontSize = cellPx < 24 ? 'text-[10px]' : (cellPx < 28 ? 'text-xs' : 'text-sm')

  return (
    <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl mx-auto items-start font-mono">
      <div
        ref={containerRef}
        onMouseLeave={handleMouseUp}
        className="mx-auto bg-zinc-900 p-3 md:p-4 rounded-xl border border-zinc-800 shadow-[0_0_20px_rgba(0,0,0,0.5)] touch-none flex-shrink-0"
      >
        <div className="flex flex-col border border-zinc-800/50 rounded overflow-hidden">
          {grid.map((row, r) => (
            <div key={r} className="flex">
              {row.map((letter, c) => (
                <div
                  key={c}
                  onMouseDown={() => handleMouseDown(r, c)}
                  onMouseEnter={() => handleMouseEnter(r, c)}
                  onMouseUp={handleMouseUp}
                  className={`flex items-center justify-center cursor-crosshair font-bold border-r border-b border-zinc-800/40 transition-all duration-100 ${getCellStyle(r, c)} ${fontSize}`}
                  style={{ width: cellPx, height: cellPx, userSelect: 'none' }}
                >
                  {letter}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 min-w-[200px] w-full flex flex-col h-full bg-zinc-900/50 rounded-xl border border-zinc-800 p-4 shadow-lg">
        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-zinc-800">
          <Search className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Targets ({words.length})</span>
          <span className="ml-auto text-xs font-black text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
            {foundWords.size}/{words.length}
          </span>
        </div>
        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
          {words.map((w) => {
            const found = foundWords.has(w.word)
            return (
              <motion.div
                key={w.word}
                animate={{ opacity: found ? 0.4 : 1, scale: found ? 0.98 : 1 }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-xs ${found ? 'border-cyan-500/30 bg-cyan-900/20' : 'border-zinc-800 bg-zinc-950'}`}
              >
                {found && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500 shrink-0" />}
                <span className={`font-mono font-bold tracking-wider ${found ? 'line-through text-cyan-500' : 'text-zinc-300'}`}>{w.word}</span>
              </motion.div>
            )
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-zinc-800">
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]"
              animate={{ width: `${(foundWords.size / Math.max(words.length, 1)) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <p className="text-[10px] text-zinc-500 mt-2 text-center uppercase tracking-widest font-bold">
            {foundWords.size === words.length ? 'EXTRACTION COMPLETE' : `${words.length - foundWords.size} REMAINING`}
          </p>
        </div>
      </div>

      <AnimatePresence>
        {popup && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-700 text-zinc-100 px-5 py-4 rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.8)] max-w-sm w-full text-center z-[70]"
          >
            <p className="font-black tracking-widest uppercase text-cyan-400 text-sm mb-1">DATA EXTRACTED: {popup.word}</p>
            <p className="text-xs text-zinc-400 font-mono leading-relaxed">{popup.definition}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
