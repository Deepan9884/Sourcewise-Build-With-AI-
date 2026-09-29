import { create } from 'zustand'
import { generatePuzzle, completePuzzle, getPuzzleStats } from '../lib/puzzleApi'

export const usePuzzleStore = create((set, get) => ({
  activePuzzle: null,
  activePuzzleType: null,
  isGenerating: false,
  generateError: null,
  isComplete: false,
  score: 0,
  maxScore: 0,
  hintsUsed: 0,
  startTime: null,
  xpEarned: 0,
  stats: null,

  async generate({ type, sourceIds, topic, difficulty }, token) {
    set({ isGenerating: true, activePuzzle: null, isComplete: false, score: 0, hintsUsed: 0, generateError: null, startTime: Date.now() })
    try {
      const result = await generatePuzzle({ type, sourceIds, topic, difficulty }, token)
      set({ activePuzzle: result.data || result, activePuzzleType: type, isGenerating: false })
    } catch (e) {
      set({ isGenerating: false, generateError: e.message })
      throw e
    }
  },

  async complete({ sourceIds, topic, score, maxScore, completed = true }, token) {
    const { activePuzzleType, hintsUsed, startTime } = get()
    const timeSecs = startTime ? Math.round((Date.now() - startTime) / 1000) : 0
    try {
      const result = await completePuzzle({
        puzzle_type: activePuzzleType,
        source_ids: sourceIds || [],
        topic,
        score,
        max_score: maxScore,
        time_seconds: timeSecs,
        hints_used: hintsUsed,
        completed,
      }, token)
      set({ isComplete: true, score, maxScore, xpEarned: result.xp_earned || 0 })
      return result
    } catch {
      set({ isComplete: true, score, maxScore })
    }
  },

  addHint() { set(s => ({ hintsUsed: s.hintsUsed + 1 })) },

  reset() {
    set({
      activePuzzle: null,
      activePuzzleType: null,
      isComplete: false,
      score: 0,
      maxScore: 0,
      hintsUsed: 0,
      startTime: null,
      xpEarned: 0,
      generateError: null,
    })
  },

  async fetchStats(token) {
    try {
      const stats = await getPuzzleStats(token)
      set({ stats })
    } catch { /* non-critical */ }
  },
}))
