function dayLabel(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`)
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric', timeZone: 'UTC' })
}

export default function WeeklyCalendarView({ slots = [], onSlotClick, conflicts = [] }) {
  const byDate = {}
  for (const s of slots) {
    if (s.slot_type === 'break') continue
    ;(byDate[s.date] = byDate[s.date] || []).push(s)
  }
  const dates = Object.keys(byDate).sort().slice(0, 7)
  const conflictKeys = new Set(conflicts.map((c) => `${c.slot?.date}|${c.slot?.start_time}`))

  if (!dates.length) {
    return (
      <div className="p-6 rounded-2xl bg-white border border-[#EDE7E1] text-sm text-[#7C726A] text-center">
        No scheduled study blocks yet — generate a plan to fill your week.
      </div>
    )
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
      {dates.map((date) => (
        <div key={date} className="p-2 rounded-2xl bg-white border border-[#EDE7E1]">
          <p className="text-[11px] font-bold text-[#5B544E] mb-1.5">{dayLabel(date)}</p>
          <div className="space-y-1.5">
            {byDate[date].slice(0, 5).map((s) => {
              const sub = s.plan_subjects || {}
              const hasConflict = conflictKeys.has(`${s.date}|${s.start_time}`)
              return (
                <button
                  key={s.id}
                  onClick={() => onSlotClick?.(s)}
                  className="w-full text-left p-1.5 rounded-lg border text-[11px] hover:shadow-xs transition-all"
                  style={{ borderColor: `${sub.color || '#E8845F'}55`, background: `${sub.color || '#E8845F'}14` }}
                >
                  <span className="font-bold text-[#1E1B16] block truncate">{sub.subject_name || s.topic}</span>
                  <span className="text-[#5B544E]">
                    {s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)}
                  </span>
                  {s.status === 'completed' && <span className="ml-1">✅</span>}
                  {hasConflict && <span className="ml-1" title="Calendar conflict">⚠️</span>}
                </button>
              )
            })}
            {byDate[date].length > 5 && (
              <p className="text-[10px] text-[#8A817B]">+{byDate[date].length - 5} more</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
