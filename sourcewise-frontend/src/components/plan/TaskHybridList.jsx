import { useState } from 'react'
import { CheckCircle2, Circle, Play, Plus } from 'lucide-react'

const QUEST_KEY = () => `sw_quests_${new Date().toDateString()}`
const BONUS_QUESTS = [
  { id: 'q1', label: 'Complete 1 Flow Focus Session (25m)', xp: 25, action: 'timer' },
  { id: 'q2', label: 'Practice Active Recall (1 flashcard flip)', xp: 15, action: 'recall' },
  { id: 'q3', label: 'Explore or Upload a Study Source', xp: 20, action: 'source' },
  { id: 'q4', label: 'Run 1 Quick AI Diagnostic Quiz', xp: 30, action: 'quiz' },
]

function loadBonus() {
  try {
    const saved = localStorage.getItem(QUEST_KEY())
    if (saved) return JSON.parse(saved)
  } catch { /* fresh day */ }
  return BONUS_QUESTS.map((q) => ({ ...q, completed: false }))
}

/**
 * TaskHybridList — today's plan slots (from DB) + bonus XP missions
 * (localStorage, same shape as DashboardPage quests). Completing a slot
 * calls back to the store; bonus missions toggle locally.
 */
export default function TaskHybridList({ slots = [], onCompleteSlot, onStartSlot, onBonusAction }) {
  const [bonus, setBonus] = useState(loadBonus)
  const [showAll, setShowAll] = useState(false)

  const toggleBonus = (id) => {
    setBonus((prev) => {
      const updated = prev.map((q) => (q.id === id ? { ...q, completed: !q.completed } : q))
      try { localStorage.setItem(QUEST_KEY(), JSON.stringify(updated)) } catch { /* ignore */ }
      return updated
    })
  }

  const open = slots.filter((s) => s.status !== 'completed')
  const done = slots.filter((s) => s.status === 'completed')
  const visible = showAll ? [...open, ...done] : open.slice(0, 5)
  const xp = bonus.filter((q) => q.completed).reduce((s, q) => s + q.xp, 0)

  return (
    <div className="p-4 rounded-2xl bg-white border border-line shadow-xs" data-testid="task-hybrid-list">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-extrabold uppercase tracking-widest text-faint">Today&apos;s tasks</h3>
        <span className="text-xs font-bold text-teal">+{xp} XP bonus</span>
      </div>

      {visible.length === 0 && (
        <p className="text-sm text-faint py-2">No scheduled slots today — enjoy the breather, or add a bonus mission below.</p>
      )}
      <div className="space-y-1.5">
        {visible.map((s) => (
          <div key={s.id} className="flex items-center gap-2 p-2 rounded-xl bg-[#FAFAFA] border border-line">
            <button
              onClick={() => onCompleteSlot?.(s)}
              aria-label={s.status === 'completed' ? 'Mark incomplete' : 'Mark complete'}
              className={s.status === 'completed' ? 'text-teal' : 'text-faint hover:text-coral-deep'}
            >
              {s.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm truncate ${s.status === 'completed' ? 'line-through text-faint' : 'text-ink font-medium'}`}>
                {s.topic || s.slot_type}
              </p>
              <p className="text-xs text-faint">
                {String(s.start_time).slice(0, 5)}–{String(s.end_time).slice(0, 5)} · {s.plan_subjects?.subject_name || ''}
              </p>
            </div>
            {s.status !== 'completed' && (
              <button
                onClick={() => onStartSlot?.(s)}
                className="p-1.5 rounded-full bg-coral-soft text-coral-deep hover:bg-coral hover:text-white transition-colors"
                aria-label="Start session"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
      {slots.length > 5 && (
        <button onClick={() => setShowAll((v) => !v)} className="text-xs font-bold text-coral-deep mt-2 hover:underline">
          {showAll ? 'Show less' : `Show all ${slots.length} (${done.length} done)`}
        </button>
      )}

      <div className="mt-3 pt-3 border-t border-line">
        <p className="text-[11px] font-extrabold uppercase tracking-widest text-faint mb-1.5">Bonus missions</p>
        <div className="space-y-1.5">
          {bonus.map((q) => (
            <div key={q.id} className="flex items-center gap-2 text-sm">
              <button onClick={() => toggleBonus(q.id)} aria-label={`Toggle ${q.label}`} className={q.completed ? 'text-teal' : 'text-faint hover:text-coral-deep'}>
                {q.completed ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
              </button>
              <span className={`flex-1 ${q.completed ? 'line-through text-faint' : 'text-body'}`}>{q.label}</span>
              <span className="text-xs font-bold text-coral-deep">+{q.xp}</span>
              {!q.completed && onBonusAction && (
                <button onClick={() => onBonusAction(q.action)} className="text-faint hover:text-ink" aria-label={`Do ${q.label}`}>
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
