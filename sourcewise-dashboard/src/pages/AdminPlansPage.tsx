import { useEffect, useState } from 'react'
import { adminApi, type PlanRow } from '../lib/adminApi'

/** AdminPlansPage — cross-user study plans with pace aggregates. */
export default function AdminPlansPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [rows, setRows] = useState<PlanRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true)
    adminApi
      .plans({ page, limit: 20, status })
      .then((d) => {
        if (!alive) return
        setRows(d.data)
        setTotal(d.pagination.total)
      })
      .catch((e: Error) => alive && setError(e.message))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [page, status])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-extrabold text-[#1E1B16]">Study plans</h2>
        <span className="text-xs font-bold text-[#7C726A]">{total} total</span>
        <span className="flex-1" />
        <select
          value={status}
          onChange={(e) => {
            setPage(1)
            setStatus(e.target.value)
          }}
          className="h-9 px-3 rounded-full border border-[#EDE7E1] text-xs font-bold bg-white"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-10 h-10 border-3 border-[#E8845F] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-[#7C726A] bg-white border border-[#EDE7E1] rounded-3xl p-6 text-center">
          No plans yet. Plans appear here once users create them (requires the v13 study-organizer tables in Supabase).
        </p>
      ) : (
        <div className="bg-white border border-[#EDE7E1] rounded-3xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[#7C726A] uppercase tracking-wide border-b border-[#EDE7E1]">
                <th className="px-4 py-2.5">Plan</th>
                <th className="px-4 py-2.5">Subjects</th>
                <th className="px-4 py-2.5">Slots</th>
                <th className="px-4 py-2.5">Pace</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-t border-[#F1ECE6]">
                  <td className="px-4 py-2.5">
                    <p className="font-bold text-[#1E1B16]">{p.name}</p>
                    <p className="text-xs text-[#7C726A] truncate max-w-[220px]">{p.subjectNames.join(', ') || '—'}</p>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">{p.subjects}</td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {p.completedSlots}/{p.totalSlots}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums font-bold">{p.pacePct}%</td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#FAF6F2] border border-[#EDE7E1]">{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#EDE7E1]">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-8 px-3 rounded-full text-xs font-bold border border-[#EDE7E1] disabled:opacity-40">
              Prev
            </button>
            <span className="text-xs text-[#7C726A]">Page {page}</span>
            <button disabled={rows.length < 20} onClick={() => setPage((p) => p + 1)} className="h-8 px-3 rounded-full text-xs font-bold border border-[#EDE7E1] disabled:opacity-40">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
