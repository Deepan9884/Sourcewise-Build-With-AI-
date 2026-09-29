/**
 * Subject palette — elegant tint + ring + sigil per subject family.
 * Keyword matching keeps it dependency-free and predictable.
 */
const PALETTE = [
  { keys: ['bio', 'anatomy', 'botany', 'zoo'], primary: '#0F766E', tint: '#E0F2F0', sigil: '🧬' },
  { keys: ['chem', 'organic'], primary: '#D97706', tint: '#FEF3E2', sigil: '⚗️' },
  { keys: ['phys', 'mech', 'quantum', 'thermo'], primary: '#7C3AED', tint: '#F1E9FF', sigil: '⚛️' },
  { keys: ['math', 'calc', 'algebra', 'stat', 'geom'], primary: '#E8845F', tint: '#FDEEE6', sigil: 'π' },
  { keys: ['hist', 'civic', 'social'], primary: '#8B5E3C', tint: '#F5E6C8', sigil: '📜' },
  { keys: ['lit', 'english', 'poet', 'novel'], primary: '#9C4141', tint: '#FFDAD8', sigil: '📖' },
  { keys: ['lang', 'french', 'spanish', 'german', 'hindi'], primary: '#57615C', tint: '#DBE5DF', sigil: '💬' },
  { keys: ['cs', 'comput', 'program', 'code', 'data', 'ai', 'ml'], primary: '#1E1B16', tint: '#EDE7E1', sigil: '💻' },
  { keys: ['econ', 'business', 'account'], primary: '#047857', tint: '#D1FAE5', sigil: '📈' },
  { keys: ['art', 'music', 'design'], primary: '#DB2777', tint: '#FCE7F3', sigil: '🎨' },
]

export const DEFAULT_SUBJECT_STYLE = { primary: '#E8845F', tint: '#FDEEE6', sigil: '📚' }

export function subjectStyle(name = '') {
  const lower = String(name).toLowerCase()
  const hit = PALETTE.find((p) => p.keys.some((k) => lower.includes(k)))
  if (hit) return { primary: hit.primary, tint: hit.tint, sigil: hit.sigil }
  return DEFAULT_SUBJECT_STYLE
}

export const SUBJECT_COLORS = ['#E8845F', '#0D9488', '#7C3AED', '#D97706', '#2563EB', '#DB2777', '#059669', '#EA580C']
