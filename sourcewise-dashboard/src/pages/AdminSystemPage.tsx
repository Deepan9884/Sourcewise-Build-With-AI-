import { useEffect, useState } from 'react'
import { Gauge, Server, Timer } from 'lucide-react'
import AdminLayout, { StatCard } from '../components/admin/AdminLayout'
import { adminApi } from '../lib/adminApi'

const API_URL = import.meta.env.VITE_API_URL || 'https://node-api-nine-flame.vercel.app'

interface UptimeData {
  uptimePercent: number
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  nodeUptimeSecs?: number
  nodeMemory?: { rss: number; heapUsed: number }
}

export default function AdminSystemPage() {
  const [uptime, setUptime] = useState<UptimeData | null>(null)
  const [nodeHealth, setNodeHealth] = useState<unknown>(null)
  const [aiHealth, setAiHealth] = useState<unknown>(null)
  const [period, setPeriod] = useState('30d')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    Promise.all([
      adminApi.uptime(period),
      fetch(`${API_URL}/health`)
        .then((r) => r.json())
        .catch(() => null),
      adminApi.providerHealth().catch(() => null),
    ])
      .then(([u, n, a]) => {
        if (alive) {
          setUptime(u as UptimeData)
          setNodeHealth(n)
          setAiHealth(a)
        }
      })
      .catch((e: Error) => {
        if (alive) setError(e.message)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [period])

  return (
    <AdminLayout>
      <div className="flex items-center gap-2">
        {['24h', '7d', '30d'].map((p) => (
          <button
            key={p}
            onClick={() => {
              if (p === period) return
              setLoading(true)
              setError('')
              setPeriod(p)
            }}
            className={`px-4 h-9 rounded-full text-xs font-bold ${period === p ? 'bg-[#1E1B16] text-white' : 'bg-white border border-[#EDE7E1] text-[#5B544E]'}`}
          >
            {p}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-10 h-10 border-3 border-[#E8845F] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              icon={Gauge}
              label="Request Success"
              value={`${uptime?.uptimePercent ?? 100}%`}
              sub={`${uptime?.totalRequests ?? 0} requests in ${period}`}
              tone="#10B981"
            />
            <StatCard
              icon={Timer}
              label="Node Uptime"
              value={uptime?.nodeUptimeSecs ? `${Math.floor(uptime.nodeUptimeSecs / 3600)}h ${Math.floor((uptime.nodeUptimeSecs % 3600) / 60)}m` : '—'}
              sub="process.uptime()"
              tone="#0D9488"
            />
            <StatCard
              icon={Server}
              label="Failed Requests"
              value={uptime?.failedRequests ?? 0}
              sub={`${uptime?.successfulRequests ?? 0} succeeded`}
              tone={uptime?.failedRequests ? '#DC2626' : '#10B981'}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-5 rounded-3xl bg-white border border-[#EDE7E1] shadow-xs">
              <h2 className="font-bold text-[#1E1B16] mb-3">Node API Health (/health)</h2>
              <pre className="text-xs bg-[#1E1B16] text-emerald-200 rounded-2xl p-4 overflow-x-auto">{JSON.stringify(nodeHealth, null, 2)}</pre>
            </div>
            <div className="p-5 rounded-3xl bg-white border border-[#EDE7E1] shadow-xs">
              <h2 className="font-bold text-[#1E1B16] mb-3">Python AI Health</h2>
              <pre className="text-xs bg-[#1E1B16] text-amber-200 rounded-2xl p-4 overflow-x-auto">{JSON.stringify(aiHealth, null, 2)}</pre>
              {uptime?.nodeMemory && (
                <div className="mt-3 text-xs text-[#5B544E]">
                  <p className="font-bold text-[#1E1B16] mb-1">Node memory (bytes)</p>
                  <p className="tabular-nums">
                    rss {Number(uptime.nodeMemory.rss).toLocaleString()} · heapUsed {Number(uptime.nodeMemory.heapUsed).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  )
}
