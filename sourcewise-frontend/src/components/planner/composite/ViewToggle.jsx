/**
 * ViewToggle — segmented control: Spread | Heatmap | Timeline.
 */
const VIEWS = [
  { id: 'spread', label: 'Weekly spread', icon: '📖' },
  { id: 'heatmap', label: 'Mastery map', icon: '🗺️' },
  { id: 'timeline', label: 'Timeline', icon: '⏳' },
]

export default function ViewToggle({ value = 'spread', onChange }) {
  return (
    <div className="inline-flex p-1 rounded-full bg-[#F4EFE8] border border-[#EDE7E1]" role="tablist" aria-label="Schedule view">
      {VIEWS.map((v) => {
        const active = value === v.id
        return (
          <button
            key={v.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(v.id)}
            className={`h-9 px-4 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${active ? 'bg-[#1E1B16] text-white shadow' : 'text-[#5B544E] hover:text-[#1E1B16]'}`}
          >
            <span>{v.icon}</span>
            <span className="hidden sm:inline">{v.label}</span>
          </button>
        )
      })}
    </div>
  )
}
