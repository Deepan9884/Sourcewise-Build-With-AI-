import { useEffect, useRef } from 'react'

/**
 * useKeyboardShortcuts — global planner shortcuts.
 * handlers: { newSubject?, generate?, replan?, startSession?, prevWeek?, nextWeek?, mood? }
 */
export function useKeyboardShortcuts(handlers = {}) {
  const ref = useRef(handlers)
  useEffect(() => {
    ref.current = handlers
  })
  useEffect(() => {
    const onKey = (e) => {
      const h = ref.current
      const tag = (e.target?.tagName || '').toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (k === 'n' && h.newSubject) { e.preventDefault(); h.newSubject() }
      else if (k === 'g' && h.generate) { e.preventDefault(); h.generate() }
      else if (k === 'r' && h.replan) { e.preventDefault(); h.replan() }
      else if (k === ' ' && h.startSession) { e.preventDefault(); h.startSession() }
      else if (k === 'arrowleft' && h.prevWeek) { e.preventDefault(); h.prevWeek() }
      else if (k === 'arrowright' && h.nextWeek) { e.preventDefault(); h.nextWeek() }
      else if (k === 'm' && h.mood) { e.preventDefault(); h.mood() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
