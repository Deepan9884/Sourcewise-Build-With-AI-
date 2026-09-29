import { useEffect, useState } from 'react'
import { Radio } from 'lucide-react'
import { adminApi, type ActivityItem } from '../../lib/adminApi'

const KIND_STYLE: Record<string, string> = {
  usage: 'bg-[#FDEEE6] text-[#C05A35]',
  error: 'bg-red-100 text-red-800',
  credit: 'bg-emerald-100 text-emerald-800',
  replan: 'bg-[#E0F2F0] text-[#0F766E]',
}

/** ActivityFeed — live SSE feed of usage, credits, replans. */
export default function ActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>([])
  const [live, setLive] = useState(false)

  useEffect(() => {
    const seen = new Set<string>()
    const stop = adminApi.activityStream((fresh) => {
      setLive(true)
      setItems((prev) => {
        const merged = [...fresh.filter((i) => !seen.has(i.id)), ...prev].slice(0, 30)
        fresh.forEach((i) => seen.add(i.id))
        return merged
      })
    })
    return stop
  }, [])

  return (
    <div className="p-5 rounded-3xl bg-white border border-[#EDE7E1] shadow-xs">
      <div className="flex items-center gap-2 mb-3">
        <Radio className={`w-4 h-4 ${live ? 'text-emerald-600' : 'text-[#7C726A]'}`} />
        <h2 className="font-bold text-[#1E1B16]">Live activity</h2>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${live ? 'bg-emerald-100 text-emerald-800' : 'bg-[#F5EFEA] text-[#7C726A]'}`}>
          {live ? '● streaming' : '○ connecting…'}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-[#7C726A]">Waiting for platform events — usage, credit grants and replans appear here.</p>
      ) : (
        <ul className="space-y-1.5 max-h-72 overflow-y-auto">
          {items.map((i) => (
            <li key={i.id} className="flex items-center gap-2 text-sm">
              <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${KIND_STYLE[i.kind] || 'bg-[#F5EFEA] text-[#5B544E]'}`}>
                {i.kind}
              </span>
              <span className="flex-1 truncate text-[#2C2520]">{i.summary}</span>
              <span className="text-[11px] text-[#7C726A] tabular-nums whitespace-nowrap">
                {new Date(i.at).toLocaleTimeString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
