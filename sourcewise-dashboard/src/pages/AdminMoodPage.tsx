import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { StatCard } from '../components/admin/AdminLayout'
import { adminApi, type MoodStats } from '../lib/adminApi'
import { HeartHandshake, Zap, Focus, AlertTriangle } from 'lucide-react'

const MOOD_COLORS: Record<string, string> = {
  energized: '#10B981',
  focused: '#0F766E',
  neutral: '#8A817B',
  tired: '#D97706',
  stressed: '#E8845F',
  anxious: '#9C4141',
}

/** AdminMoodPage — aggregate mood trends across users. */
export default function AdminMoodPage() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<MoodStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true)
    adminApi
      .mood(days)
      .then((d) => alive && setData(d))
      .catch((e: Error) => alive && setError(e.message))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [days])

  const dist = data ? Object.entries(data.distribution).map(([name, value]) => ({ name, value })) : []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-extrabold text-[#1E1B16]">Mood aggregates</h2>
        <span className="flex-1" />
        {[7, 14, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`h-8 px-3 rounded-full text-xs font-bold ${days === d ? 'bg-[#1E1B16] text-white' : 'bg-white border border-[#EDE7E1] text-[#5B544E]'}`}
          >
            {d}d
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-10 h-10 border-3 border-[#E8845F] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        data && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard icon={HeartHandshake} label="Check-ins" value={data.checkins} sub={`last ${data.days} days`} tone="#E8845F" />
              <StatCard icon={Zap} label="Avg energy" value={data.avgEnergy ?? '—'} sub="/ 10" tone="#D97706" />
              <StatCard icon={Focus} label="Avg focus" value={data.avgFocus ?? '—'} sub="/ 10" tone="#0F766E" />
              <StatCard icon={AlertTriangle} label="Avg stress" value={data.avgStress ?? '—'} sub={`/ 10 · trend ${data.trend}`} tone="#9C4141" />
            </div>
            <div className="p-5 rounded-3xl bg-white border border-[#EDE7E1]">
              <h3 className="text-sm font-bold text-[#1E1B16] mb-2">Mood distribution</h3>
              {dist.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dist} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, textTransform: 'capitalize' } as object} width={90} />
                    <Tooltip />
                    <Bar dataKey="value" name="Check-ins">
                      {dist.map((d, i) => (
                        <Cell key={i} fill={MOOD_COLORS[d.name] || '#8A817B'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-[#7C726A] py-8 text-center">No check-ins in this window.</p>
              )}
            </div>
          </>
        )
      )}
    </div>
  )
}
