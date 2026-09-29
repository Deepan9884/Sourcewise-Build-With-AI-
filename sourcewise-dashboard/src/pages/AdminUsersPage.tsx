import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import AdminLayout from '../components/admin/AdminLayout'
import { adminApi, type AdminUserRow } from '../lib/adminApi'

export default function AdminUsersPage() {
  const [rows, setRows] = useState<AdminUserRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [tier, setTier] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const limit = 20

  useEffect(() => {
    let alive = true
    adminApi
      .users({ page, limit, tier, search })
      .then((d) => {
        if (alive) {
          setRows(d.data)
          setTotal(d.pagination.total)
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
  }, [page, tier, search])

  const pages = Math.max(1, Math.ceil(total / limit))

  return (
    <AdminLayout>
      <div className="p-5 rounded-3xl bg-white border border-[#EDE7E1] shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C726A]" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setLoading(true)
                  setError('')
                  setPage(1)
                  setSearch(searchInput)
                }
              }}
              placeholder="Search by email..."
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-[#EDE7E1] focus:border-[#E8845F] text-sm outline-none"
            />
          </div>
          <select
            value={tier}
            onChange={(e) => {
              setLoading(true)
              setError('')
              setPage(1)
              setTier(e.target.value)
            }}
            className="h-11 px-4 rounded-xl border border-[#EDE7E1] text-sm font-semibold cursor-pointer"
          >
            <option value="">All tiers</option>
            <option value="free">Free</option>
            <option value="basic">Basic</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>

        {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>}

        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[#7C726A] border-b border-[#EDE7E1]">
                <th className="py-2.5 pr-3">User</th>
                <th className="py-2.5 pr-3">Tier</th>
                <th className="py-2.5 pr-3 text-right">Credits left</th>
                <th className="py-2.5 pr-3 text-right">Used</th>
                <th className="py-2.5 pr-3 text-right">Sessions</th>
                <th className="py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-b border-[#F5EFEA] last:border-0 hover:bg-[#FAF6F2]">
                  <td className="py-3 pr-3">
                    <p className="font-bold text-[#1E1B16]">
                      {u.name || '—'}
                      {u.isAdmin && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-[#1E1B16] text-white font-bold">ADMIN</span>}
                    </p>
                    <p className="text-xs text-[#7C726A]">{u.email}</p>
                  </td>
                  <td className="py-3 pr-3">
                    <span className="px-2 py-1 rounded-full bg-[#F0EAE4] text-xs font-bold">{u.tier}</span>
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums font-bold">{Number(u.creditsRemaining).toLocaleString()}</td>
                  <td className="py-3 pr-3 text-right tabular-nums text-[#7C726A]">{Number(u.creditsUsed).toLocaleString()}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">{u.sessionsCount}</td>
                  <td className="py-3 text-right">
                    <Link
                      to={`/users/${u.id}`}
                      className="inline-flex items-center gap-1 px-3 h-8 rounded-full bg-[#FDEEE6] text-[#C05A35] text-xs font-bold hover:bg-[#E8845F] hover:text-white transition-all"
                    >
                      <Plus className="w-3 h-3" /> Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !rows.length && <p className="text-sm text-[#7C726A] py-8 text-center">No users found.</p>}
        </div>

        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-[#7C726A]">{total} users total</p>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => {
                setLoading(true)
                setPage((p) => p - 1)
              }}
              className="w-9 h-9 rounded-full border border-[#EDE7E1] flex items-center justify-center disabled:opacity-40 hover:bg-[#FAF6F2]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold">
              Page {page} / {pages}
            </span>
            <button
              disabled={page >= pages}
              onClick={() => {
                setLoading(true)
                setPage((p) => p + 1)
              }}
              className="w-9 h-9 rounded-full border border-[#EDE7E1] flex items-center justify-center disabled:opacity-40 hover:bg-[#FAF6F2]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
