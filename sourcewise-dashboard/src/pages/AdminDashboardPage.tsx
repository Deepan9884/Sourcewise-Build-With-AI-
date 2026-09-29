import { useEffect, useState } from 'react'
import { Users, Zap, DollarSign, Activity, AlertTriangle } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import AdminLayout, { StatCard } from '../components/admin/AdminLayout'
import ActivityFeed from '../components/admin/ActivityFeed'
import { adminApi, type UsageResponse } from '../lib/adminApi'
import { useAdminStore, type ProviderHealth } from '../store/adminStore'

interface StatsData {
  totalUsers: number
  activeUsers: number
  totalTokens: number
  promptTokens: number
  completionTokens: number
  estimatedCost: number
  requestCount: number
  errorCount: number
  tokensByProvider: Record<string, number>
  providerHealth: ProviderHealth[]
}

export default function AdminDashboardPage() {
  const { stats, setStats, statsPeriod, setStatsPeriod } = useAdminStore()
  const [usage, setUsage] = useState<UsageResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    Promise.all([adminApi.stats(statsPeriod), adminApi.usage({ period: statsPeriod, groupBy: 'day' })])
      .then(([s, u]) => {
        if (!alive) return
        setStats(s as StatsData)
        setUsage(u)
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
  }, [statsPeriod, setStats])

  return (
    <AdminLayout>
      <div className="flex items-center gap-2">
        {['24h', '7d', '30d'].map((p) => (
          <button
            key={p}
            onClick={() => {
              if (p === statsPeriod) return
              setLoading(true)
              setError('')
              setStatsPeriod(p)
            }}
            className={`px-4 h-9 rounded-full text-xs font-bold transition-all ${statsPeriod === p ? 'bg-[#1E1B16] text-white' : 'bg-white border border-[#EDE7E1] text-[#5B544E] hover:bg-[#FAF6F2]'}`}
          >
            {p}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error} — is your account admin? (users.is_admin must be true)
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-10 h-10 border-3 border-[#E8845F] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        stats && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Users} label="Total Users" value={stats.totalUsers} sub={`${stats.activeUsers} active in period`} tone="#0D9488" />
              <StatCard icon={Zap} label="Tokens Used" value={(stats.totalTokens || 0).toLocaleString()} sub={`${stats.requestCount} requests`} tone="#E8845F" />
              <StatCard icon={DollarSign} label="Est. Cost" value={`$${Number(stats.estimatedCost || 0).toFixed(2)}`} sub="provider API spend" tone="#D97706" />
              <StatCard
                icon={Activity}
                label="Errors"
                value={stats.errorCount}
                sub={`${stats.requestCount ? Math.round(((stats.requestCount - stats.errorCount) / stats.requestCount) * 100) : 100}% success`}
                tone={stats.errorCount ? '#DC2626' : '#10B981'}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="p-5 rounded-3xl bg-white border border-[#EDE7E1] shadow-xs">
                <h2 className="font-bold text-[#1E1B16] mb-1">Token Throughput</h2>
                <p className="text-xs text-[#7C726A] mb-4">Prompt + completion tokens per period bucket</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={usage?.timeseries || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EDE7E1" />
                      <XAxis dataKey="period" tick={{ fontSize: 11 }} tickFormatter={(v: string) => String(v).slice(5, 13)} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="promptTokens" name="Prompt" stackId="1" stroke="#E8845F" fill="#FDEEE6" />
                      <Area type="monotone" dataKey="completionTokens" name="Completion" stackId="1" stroke="#0D9488" fill="#CCFBF1" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-[#EDE7E1] shadow-xs space-y-4">
                <div>
                  <h2 className="font-bold text-[#1E1B16] mb-1">Provider Health</h2>
                  <p className="text-xs text-[#7C726A]">Live Gemini / Grok status from python-ai</p>
                </div>
                {(stats.providerHealth || []).map((p, i) => (
                  <div key={i} className="p-3.5 rounded-2xl bg-[#FAF6F2] border border-[#EDE7E1] flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-[#1E1B16]">
                        {p.provider} · {p.model}
                      </p>
                      <p className="text-xs text-[#7C726A]">
                        {p.role || 'active'}
                        {p.error ? ` — ${p.error}` : ''}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${p.available ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}
                    >
                      {p.available ? '● Healthy' : '● Down'}
                    </span>
                  </div>
                ))}
                {(!stats.providerHealth || !stats.providerHealth.length) && (
                  <p className="text-sm text-[#7C726A]">No provider data — is python-ai running?</p>
                )}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-[#7C726A] mb-2">Tokens by provider</h3>
                  {Object.entries(stats.tokensByProvider || {}).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between text-sm py-1 border-b border-[#F5EFEA] last:border-0">
                      <span className="font-semibold text-[#2C2520]">{k}</span>
                      <span className="tabular-nums text-[#5B544E]">{Number(v).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <ActivityFeed />
          </>
        )
      )}
    </AdminLayout>
  )
}
