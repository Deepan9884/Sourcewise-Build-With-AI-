const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export async function generatePuzzle({ type, sourceIds, topic, difficulty = 'study', count = 10 }, token) {
  const res = await fetch(`${API_URL}/puzzles/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ puzzle_type: type, source_ids: sourceIds || [], topic, difficulty, count }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to generate puzzle')
  }
  return res.json()
}

export async function completePuzzle(data, token) {
  const res = await fetch(`${API_URL}/puzzles/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to record puzzle completion')
  return res.json()
}

export async function getPuzzleStats(token) {
  const res = await fetch(`${API_URL}/puzzles/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  return res.json()
}

export async function getPuzzleSessions(token) {
  const res = await fetch(`${API_URL}/puzzles/sessions`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return []
  return res.json()
}
