import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts'
import { StatCard } from '../components/admin/AdminLayout'
import { adminApi, type ContentStats } from '../lib/adminApi'
import { FileText, Database, Brain, Gauge } from 'lucide-react'

const COLORS = ['#E8845F', '#0F766E', '#D97706', '#7C3AED', '#2563EB', '#DB2777']

/** AdminContentPage — source/content aggregate stats. */
export default function AdminContentPage() {
  const [data, setData] = useState<ContentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    adminApi
      .content()
      .then((d) => alive && setData(d))
      .catch((e: Error) => alive && setError(e.message))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-10 h-10 border-3 border-[#E8845F] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (error) return <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>
  if (!data) return null

  const typeData = Object.entries(data.byType).map(([name, value]) => ({ name, value }))
  const diffData = Object.entries(data.difficultyBreakdown).map(([name, value]) => ({ name, value }))

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-extrabold text-[#1E1B16]">Content</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={FileText} label="Sources" value={data.totalSources} tone="#E8845F" />
        <StatCard icon={Database} label="Chunks indexed" value={data.totalChunks} tone="#0F766E" />
        <StatCard icon={Brain} label="Analyzed" value={data.analyzedCount} sub={`${data.analysisRate}% analysis rate`} tone="#7C3AED" />
        <StatCard icon={Gauge} label="Analysis rate" value={`${data.analysisRate}%`} tone="#D97706" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="p-5 rounded-3xl bg-white border border-[#EDE7E1]">
          <h3 className="text-sm font-bold text-[#1E1B16] mb-2">Sources by type</h3>
          {typeData.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={typeData} dataKey="value" nameKey="name" outerRadius={70} label>
                  {typeData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[#7C726A] py-8 text-center">No sources yet.</p>
          )}
        </div>
        <div className="p-5 rounded-3xl bg-white border border-[#EDE7E1]">
          <h3 className="text-sm font-bold text-[#1E1B16] mb-2">Difficulty mix</h3>
          {diffData.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={diffData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="value" fill="#E8845F" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[#7C726A] py-8 text-center">Difficulties appear once analyses run.</p>
          )}
        </div>
      </div>
    </div>
  )
}
