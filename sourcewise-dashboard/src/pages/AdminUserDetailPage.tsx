import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Coins, CheckCircle2, Zap, DollarSign } from 'lucide-react'
import AdminLayout, { StatCard } from '../components/admin/AdminLayout'
import { adminApi } from '../lib/adminApi'

interface UsageEntry {
  id: string
  endpoint: string
  provider: string
  model: string
  total_tokens: number
  estimated_cost_usd: number
  success: boolean
  error_message?: string
  created_at: string
}

interface CreditTx {
  id: string
  type: string
  amount: number
  description?: string
  created_at: string
}

interface UserDetail {
  name: string
  email: string
  tier: string
  createdAt: string
  creditsRemaining: number
  creditsTotal: number
  recentUsage: UsageEntry[]
  creditTransactions: CreditTx[]
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [detail, setDetail] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [amount, setAmount] = useState('50000')
  const [reason, setReason] = useState('grant')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!id) return
    let alive = true
    adminApi
      .userDetail(id)
      .then((d) => {
        if (alive) setDetail(d as UserDetail)
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
  }, [id, reloadKey])

  const submitGrant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    setSaving(true)
    try {
      await adminApi.grantCredits(id, parseInt(amount, 10), reason, note)
      setToast('Credits updated successfully')
      setTimeout(() => setToast(''), 3000)
      setLoading(true)
      setReloadKey((k) => k + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout>
      <Link to="/users" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#C05A35] hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to users
      </Link>
      {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-10 h-10 border-3 border-[#E8845F] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        detail && (
          <>
            <div className="p-5 rounded-3xl bg-white border border-[#EDE7E1] shadow-xs">
              <h2 className="text-lg font-bold text-[#1E1B16]">
                {detail.name} <span className="text-sm font-normal text-[#7C726A]">{detail.email}</span>
              </h2>
              <p className="text-xs text-[#7C726A]">
                Tier: <strong>{detail.tier}</strong> · Joined {new Date(detail.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard icon={Coins} label="Credits Remaining" value={Number(detail.creditsRemaining).toLocaleString()} tone="#10B981" />
              <StatCard
                icon={Zap}
                label="Credits Used"
                value={Number(detail.creditsTotal - detail.creditsRemaining).toLocaleString()}
                sub={`of ${Number(detail.creditsTotal).toLocaleString()} total`}
                tone="#E8845F"
              />
              <StatCard icon={DollarSign} label="AI Requests" value={(detail.recentUsage || []).length} sub="last 50 tracked" tone="#D97706" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <form onSubmit={submitGrant} className="p-5 rounded-3xl bg-white border border-[#EDE7E1] shadow-xs space-y-3">
                <h3 className="font-bold text-[#1E1B16]">Grant / Adjust Credits</h3>
                {toast && (
                  <p className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    {toast}
                  </p>
                )}
                <div>
                  <label className="text-xs font-bold text-[#1E1B16]">Amount (negative deducts)</label>
                  <input
                    type="number"
                    step="1000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1 w-full h-11 px-3.5 rounded-xl border border-[#EDE7E1] text-sm outline-none focus:border-[#E8845F]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#1E1B16]">Reason</label>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="mt-1 w-full h-11 px-3 rounded-xl border border-[#EDE7E1] text-sm cursor-pointer"
                    >
                      <option value="grant">Grant</option>
                      <option value="bonus">Bonus</option>
                      <option value="refund">Refund</option>
                      <option value="adjustment">Adjustment</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#1E1B16]">Note</label>
                    <input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. launch bonus"
                      className="mt-1 w-full h-11 px-3.5 rounded-xl border border-[#EDE7E1] text-sm outline-none focus:border-[#E8845F]"
                    />
                  </div>
                </div>
                <button
                  disabled={saving}
                  className="h-11 px-6 rounded-full bg-[#E8845F] hover:bg-[#C05A35] text-white text-sm font-bold disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Apply Credit Change'}
                </button>
              </form>

              <div className="p-5 rounded-3xl bg-white border border-[#EDE7E1] shadow-xs">
                <h3 className="font-bold text-[#1E1B16] mb-3">Recent Token Usage</h3>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {(detail.recentUsage || []).map((u) => (
                    <div key={u.id} className="p-3 rounded-xl bg-[#FAF6F2] border border-[#EDE7E1] text-xs flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-[#1E1B16] truncate">
                          {u.endpoint} · {u.provider}/{u.model}
                        </p>
                        <p className="text-[#7C726A]">
                          {new Date(u.created_at).toLocaleString()} · {u.success ? 'ok' : `failed: ${u.error_message || ''}`}
                        </p>
                      </div>
                      <div className="text-right shrink-0 tabular-nums">
                        <p className="font-bold">{Number(u.total_tokens).toLocaleString()} tok</p>
                        <p className="text-[#7C726A]">${Number(u.estimated_cost_usd || 0).toFixed(4)}</p>
                      </div>
                    </div>
                  ))}
                  {!(detail.recentUsage || []).length && <p className="text-sm text-[#7C726A]">No tracked usage yet.</p>}
                </div>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-[#EDE7E1] shadow-xs">
              <h3 className="font-bold text-[#1E1B16] mb-3">Credit Transactions</h3>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {(detail.creditTransactions || []).map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-sm py-2 border-b border-[#F5EFEA] last:border-0">
                    <div>
                      <p className="font-bold text-[#1E1B16]">
                        {t.type} <span className="font-normal text-[#7C726A]">— {t.description || ''}</span>
                      </p>
                      <p className="text-xs text-[#7C726A]">{new Date(t.created_at).toLocaleString()}</p>
                    </div>
                    <p className={`font-extrabold tabular-nums ${t.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {t.amount >= 0 ? '+' : ''}
                      {Number(t.amount).toLocaleString()}
                    </p>
                  </div>
                ))}
                {!(detail.creditTransactions || []).length && <p className="text-sm text-[#7C726A]">No transactions yet.</p>}
              </div>
            </div>
          </>
        )
      )}
    </AdminLayout>
  )
}
