import { useEffect, useState } from 'react'
import { RefreshCw, Save, Server, DollarSign, Zap } from 'lucide-react'
import AdminLayout, { StatCard } from '../components/admin/AdminLayout'
import { adminApi, type PricingRow } from '../lib/adminApi'

interface HealthData {
  latencyMs?: number
  checkedAt?: string
  active_provider?: { provider: string; model?: string }
  provider?: string
  [key: string]: unknown
}

interface CostsData {
  totalCost: number
  byProvider: Record<string, { tokens: number; cost: number }>
  byModel: Record<string, { tokens: number; cost: number }>
}

export default function AdminProvidersPage() {
  const [health, setHealth] = useState<HealthData | null>(null)
  const [costs, setCosts] = useState<CostsData | null>(null)
  const [pricing, setPricing] = useState<PricingRow[]>([])
  const [period, setPeriod] = useState('30d')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editRow, setEditRow] = useState<PricingRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const refresh = () => {
    setLoading(true)
    setError('')
    setReloadKey((k) => k + 1)
  }

  useEffect(() => {
    let alive = true
    Promise.all([adminApi.providerHealth(), adminApi.providerCosts(period), adminApi.pricing()])
      .then(([h, c, p]) => {
        if (!alive) return
        setHealth(h as HealthData)
        setCosts(c as CostsData)
        setPricing(p)
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
  }, [period, reloadKey])

  const savePricing = async () => {
    if (!editRow) return
    setSaving(true)
    try {
      await adminApi.updatePricing(
        editRow.provider,
        editRow.model,
        Number(editRow.input_price_per_1k_tokens),
        Number(editRow.output_price_per_1k_tokens)
      )
      setEditRow(null)
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

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
        <button
          onClick={refresh}
          className="h-9 px-4 rounded-full bg-white border border-[#EDE7E1] text-xs font-bold flex items-center gap-1.5 hover:bg-[#FAF6F2]"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>
      {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-10 h-10 border-3 border-[#E8845F] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard icon={DollarSign} label="Total API Cost" value={`$${Number(costs?.totalCost || 0).toFixed(2)}`} sub={`last ${period}`} tone="#D97706" />
            <StatCard
              icon={Server}
              label="Active Provider"
              value={health?.active_provider?.provider || (health?.provider as string) || '—'}
              sub={health?.active_provider?.model || ''}
              tone="#0D9488"
            />
            <StatCard
              icon={Zap}
              label="Health Latency"
              value={health?.latencyMs ? `${health.latencyMs}ms` : '—'}
              sub={health?.checkedAt ? new Date(health.checkedAt).toLocaleTimeString() : ''}
              tone="#E8845F"
            />
          </div>

          <div className="p-5 rounded-3xl bg-white border border-[#EDE7E1] shadow-xs">
            <h2 className="font-bold text-[#1E1B16] mb-3">Cost by Provider / Model</h2>
            <div className="space-y-2">
              {Object.entries(costs?.byModel || {}).map(([model, v]) => (
                <div key={model} className="flex items-center justify-between p-3 rounded-xl bg-[#FAF6F2] border border-[#EDE7E1] text-sm">
                  <span className="font-bold text-[#1E1B16]">{model}</span>
                  <span className="tabular-nums text-[#5B544E]">
                    {Number(v.tokens).toLocaleString()} tok · <strong className="text-[#1E1B16]">${Number(v.cost).toFixed(4)}</strong>
                  </span>
                </div>
              ))}
              {!Object.keys(costs?.byModel || {}).length && <p className="text-sm text-[#7C726A]">No cost data in this period.</p>}
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-[#EDE7E1] shadow-xs">
            <h2 className="font-bold text-[#1E1B16] mb-1">Provider Pricing (per 1K tokens)</h2>
            <p className="text-xs text-[#7C726A] mb-3">Used for cost estimation. Editing creates a new effective pricing row.</p>
            <div className="space-y-2">
              {pricing.map((p, i) => {
                const editing = editRow && editRow.provider === p.provider && editRow.model === p.model
                return (
                  <div key={i} className="p-3 rounded-xl border border-[#EDE7E1] bg-white flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                    <div className="text-sm">
                      <p className="font-bold">
                        {p.provider} · {p.model}
                      </p>
                    </div>
                    {editing && editRow ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.000001"
                          value={editRow.input_price_per_1k_tokens}
                          onChange={(e) => setEditRow({ ...editRow, input_price_per_1k_tokens: Number(e.target.value) })}
                          className="w-28 h-9 px-2 rounded-lg border border-[#EDE7E1] text-xs"
                          placeholder="input $/1k"
                        />
                        <input
                          type="number"
                          step="0.000001"
                          value={editRow.output_price_per_1k_tokens}
                          onChange={(e) => setEditRow({ ...editRow, output_price_per_1k_tokens: Number(e.target.value) })}
                          className="w-28 h-9 px-2 rounded-lg border border-[#EDE7E1] text-xs"
                          placeholder="output $/1k"
                        />
                        <button
                          onClick={savePricing}
                          disabled={saving}
                          className="h-9 px-4 rounded-full bg-[#E8845F] text-white text-xs font-bold flex items-center gap-1"
                        >
                          <Save className="w-3.5 h-3.5" />
                          {saving ? '...' : 'Save'}
                        </button>
                        <button onClick={() => setEditRow(null)} className="h-9 px-3 rounded-full border border-[#EDE7E1] text-xs font-bold">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-xs">
                        <span className="tabular-nums">
                          in ${Number(p.input_price_per_1k_tokens).toFixed(6)} / out ${Number(p.output_price_per_1k_tokens).toFixed(6)}
                        </span>
                        <button
                          onClick={() => setEditRow({ ...p })}
                          className="h-8 px-3 rounded-full bg-[#F0EAE4] font-bold hover:bg-[#E8845F] hover:text-white transition-all"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  )
}
