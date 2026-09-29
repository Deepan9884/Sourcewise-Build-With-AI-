import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts'
import AdminLayout from '../components/admin/AdminLayout'
import { adminApi, type UsageResponse } from '../lib/adminApi'

export default function AdminUsagePage() {
  const [period, setPeriod] = useState('7d')
  const [provider, setProvider] = useState('')
  const [data, setData] = useState<UsageResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    adminApi
      .usage({ period, groupBy: period === '24h' ? 'hour' : 'day', provider })
      .then((d) => {
        if (alive) setData(d)
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
  }, [period, provider])

  const breakdown = data?.breakdown || { byProvider: {}, byModel: {}, byEndpoint: {}, topUsers: [] }
  return (
    <AdminLayout>
      <div className="flex flex-wrap items-center gap-2">
        {['24h', '7d', '30d', '90d'].map((p) => (
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
        <select
          value={provider}
          onChange={(e) => {
            setLoading(true)
            setError('')
            setProvider(e.target.value)
          }}
          className="h-9 px-3 rounded-full border border-[#EDE7E1] text-xs font-bold cursor-pointer bg-white"
        >
          <option value="">All providers</option>
          <option value="gemini">Gemini</option>
          <option value="grok">Grok</option>
        </select>
      </div>
      {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-10 h-10 border-3 border-[#E8845F] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        data && (
          <>
            <div className="p-5 rounded-3xl bg-white border border-[#EDE7E1] shadow-xs">
              <h2 className="font-bold text-[#1E1B16] mb-1">Requests & Cost Over Time</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.timeseries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EDE7E1" />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} tickFormatter={(v: string) => String(v).slice(5)} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area yAxisId="left" type="monotone" dataKey="totalTokens" name="Tokens" stroke="#E8845F" fill="#FDEEE6" />
                    <Area yAxisId="right" type="monotone" dataKey="requestCount" name="Requests" stroke="#0D9488" fill="#CCFBF1" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {[
                { title: 'By Provider', rows: breakdown.byProvider, valueKey: 'tokens' as const },
                { title: 'By Model', rows: breakdown.byModel, valueKey: 'tokens' as const },
                { title: 'By Endpoint', rows: breakdown.byEndpoint, valueKey: 'requests' as const },
              ].map((panel) => (
                <div key={panel.title} className="p-5 rounded-3xl bg-white border border-[#EDE7E1] shadow-xs">
                  <h3 className="font-bold text-[#1E1B16] mb-3">{panel.title}</h3>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={Object.entries(panel.rows || {}).map(([name, v]) => ({
                          name,
                          value: (v as Record<string, number>)[panel.valueKey] ?? (v as { tokens: number }).tokens ?? 0,
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#EDE7E1" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} height={50} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#E8845F" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-5 rounded-3xl bg-white border border-[#EDE7E1] shadow-xs">
              <h3 className="font-bold text-[#1E1B16] mb-3">Top Users by Tokens</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr className="text-left text-xs uppercase text-[#7C726A] border-b border-[#EDE7E1]">
                      <th className="py-2 pr-3">User</th>
                      <th className="py-2 pr-3 text-right">Tokens</th>
                      <th className="py-2 pr-3 text-right">Cost</th>
                      <th className="py-2 text-right">Requests</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(breakdown.topUsers || []).map((u) => (
                      <tr key={u.userId} className="border-b border-[#F5EFEA] last:border-0">
                        <td className="py-2.5 pr-3 font-semibold">{u.name || u.email || u.userId.slice(0, 8)}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{Number(u.tokens).toLocaleString()}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">${Number(u.cost).toFixed(4)}</td>
                        <td className="py-2.5 text-right tabular-nums">{u.requests}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!(breakdown.topUsers || []).length && <p className="text-sm text-[#7C726A] py-6 text-center">No usage in this period.</p>}
              </div>
            </div>
          </>
        )
      )}
    </AdminLayout>
  )
}
