import { useState } from 'react'

/**
 * useInkSplash — manage transient ink splash bursts (drag/drop/complete).
 */
export function useInkSplash() {
  const [bursts, setBursts] = useState([])
  const splash = (x = 0, y = 0, color = '#E8845F') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setBursts((b) => [...b.slice(-4), { id, x, y, color }])
  }
  const clear = (id) => setBursts((b) => b.filter((x) => x.id !== id))
  return { bursts, splash, clear }
}
