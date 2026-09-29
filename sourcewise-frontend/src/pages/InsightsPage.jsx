import { useEffect, useState } from 'react'
import { Flame, Target, TrendingUp, Brain } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'
import { useAuthStore } from '../store/authStore'
import { studyPlansApi } from '../lib/studyPlansApi'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

async function get(path, token) {
  try {
    const r = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } })
    return r.ok ? r.json() : null
  } catch { return null }
}

function dayKey(iso) {
  try { return new Date(iso).toISOString().slice(0, 10) } catch { return null }
}

/**
 * InsightsPage (/insights) — pace, trends, deviation, streaks, mood correlation.
 * Every section degrades to an empty state; nothing throws on fresh accounts.
 */
export default function InsightsPage({ embedded = false }) {
  const { accessToken } = useAuthStore()
  const [overview, setOverview] = useState(null)
  const [trends, setTrends] = useState(null)
  const [mood, setMood] = useState(null)
  const [events, setEvents] = useState([])
  const [planRows, setPlanRows] = useState([])
  const [tablesMissing, setTablesMissing] = useState(false)

  useEffect(() => {
    if (!accessToken) return
    let cancelled = false
    ;(async () => {
      const [o, t, m, e] = await Promise.all([
        get('/dashboard/overview', accessToken),
        get('/progress/trends', accessToken),
        get('/mood/insights?days=14', accessToken),
        get('/progress/events?limit=500', accessToken),
      ])
      if (cancelled) return
      setOverview(o); setTrends(t); setMood(m)
      setEvents(Array.isArray(e) ? e : e?.events || [])
      try {
        const plans = await studyPlansApi.list()
        const rows = await Promise.all((plans || []).map(async (p) => {
          try {
            const pacing = await studyPlansApi.pacing(p.id)
            return { id: p.id, name: p.name, ...pacing }
          } catch { return { id: p.id, name: p.name, pacePct: null } }
        }))
        setPlanRows(rows)
      } catch (err) {
        if (/missing|schema cache/i.test(err.message)) setTablesMissing(true)
      }
    })()
    return () => { cancelled = true }
  }, [accessToken])

  // Streak calendar: last 12 weeks of event days.
  const weeks = (() => {
    const byDay = new Map()
    for (const ev of events) {
      const k = dayKey(ev.created_at || ev.date)
      if (k) byDay.set(k, (byDay.get(k) || 0) + 1)
    }
    const today = new Date()
    const start = new Date(today); start.setDate(start.getDate() - 83)
    // align to Monday
    while (start.getDay() !== 1) start.setDate(start.getDate() - 1)
    const cells = []
    for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
      const k = d.toISOString().slice(0, 10)
      cells.push({ date: k, count: byDay.get(k) || 0, future: false })
    }
    return cells
  })()

  const intensity = (c) => !c.count ? 'bg-[#F1ECE6]' : c.count < 3 ? 'bg-teal/30' : c.count < 6 ? 'bg-teal/60' : 'bg-teal'

  const moodBars = (mood?.correlation || []).map((c) => ({ name: c.mood, accuracy: c.avgAccuracy ?? c.accuracy ?? 0 }))

  const kpis = [
    { icon: TrendingUp, label: 'Learning velocity', value: overview ? `${overview.learningVelocity ?? 0}/wk` : '—', tint: 'text-teal bg-teal-soft' },
    { icon: Target, label: 'Quiz accuracy', value: overview ? `${overview.quizAccuracy ?? 0}%` : '—', tint: 'text-amberbrand bg-amberbrand-soft' },
    { icon: Flame, label: 'Day streak', value: overview?.streak ?? '—', tint: 'text-coral-deep bg-coral-soft' },
    { icon: Brain, label: 'Dominant mood', value: mood?.currentMood ? `${mood.currentMood} (${mood.trend || 'stable'})` : '—', tint: 'text-subject-phys bg-subject-phys-soft' },
  ]

  return (
    <div className={`max-w-7xl mx-auto space-y-5 ${embedded ? 'pb-4' : 'pb-12'}`} data-testid="insights-page">
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-widest text-teal">Insights & Trends</p>
        <h2 className="text-[24px] font-display font-bold text-ink tracking-tight">How you&apos;re trending</h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="p-4 rounded-2xl bg-white border border-line shadow-xs flex items-center gap-3">
            <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${k.tint}`}>
              <k.icon className="w-4 h-4" />
            </span>
            <span>
              <span className="block text-lg font-extrabold text-ink leading-none capitalize">{k.value}</span>
              <span className="block text-xs text-faint mt-0.5">{k.label}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Accuracy / velocity trend */}
        <div className="p-4 rounded-2xl bg-white border border-line shadow-xs">
          <h3 className="text-sm font-bold text-ink mb-2">Progress snapshots</h3>
          {(trends?.snapshots?.length ?? 0) > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={trends.snapshots}>
                <XAxis dataKey="snapshot_date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="quiz_accuracy" stroke="#E8845F" fill="#FDEEE6" name="Quiz %" />
                <Area type="monotone" dataKey="topics_mastered" stroke="#0F766E" fill="#E0F2F0" name="Mastered" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-faint py-6 text-center">Snapshots appear after your first study sessions.</p>
          )}
          {trends?.trends && (
            <p className="text-xs text-faint mt-1">Quiz trend: <b>{trends.trends.quiz}</b> · Mastery trend: <b>{trends.trends.mastery}</b></p>
          )}
        </div>

        {/* Mood correlation */}
        <div className="p-4 rounded-2xl bg-white border border-line shadow-xs">
          <h3 className="text-sm font-bold text-ink mb-2">Mood ↔ accuracy (14d)</h3>
          {moodBars.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={moodBars} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="accuracy" name="Avg accuracy %">
                  {moodBars.map((b, i) => (
                    <Cell key={i} fill={b.name === mood?.bestMood ? '#0F766E' : b.name === mood?.worstMood ? '#E8845F' : '#D97706'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-faint py-6 text-center">Check in your mood a few days running to unlock this.</p>
          )}
          {mood?.bestMood && <p className="text-xs text-faint mt-1">Best: <b className="capitalize">{mood.bestMood}</b>{mood.worstMood ? <> · Watch out: <b className="capitalize">{mood.worstMood}</b></> : null}</p>}
        </div>
      </div>

      {/* Deviation table */}
      <div className="p-4 rounded-2xl bg-white border border-line shadow-xs">
        <h3 className="text-sm font-bold text-ink mb-2">Plan deviation</h3>
        {tablesMissing ? (
          <p className="text-sm text-amberbrand bg-amberbrand-soft border border-amberbrand/20 rounded-xl px-3 py-2">
            Study-plan tables are missing in Supabase. Run <code>sourcewise-backend/node-api/v13_study_organizer_schema.sql</code> in the SQL Editor, then reload.
          </p>
        ) : planRows.length === 0 ? (
          <p className="text-sm text-faint">No study plans yet — create one from <b>My Plan</b>.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-faint uppercase tracking-wider">
                  <th className="py-1.5 pr-3">Plan</th><th className="py-1.5 pr-3">Pace</th>
                  <th className="py-1.5 pr-3">Done</th><th className="py-1.5 pr-3">Deviation</th><th className="py-1.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {planRows.map((p) => (
                  <tr key={p.id} className="border-t border-line">
                    <td className="py-2 pr-3 font-semibold text-ink">{p.name}</td>
                    <td className="py-2 pr-3">{p.pacePct ?? '—'}{p.pacePct != null ? '%' : ''}</td>
                    <td className="py-2 pr-3 text-body">{p.completedSlots ?? '—'}/{p.expectedSlots ?? '—'}</td>
                    <td className={`py-2 pr-3 font-bold ${p.deviationDays < 0 ? 'text-red-600' : 'text-teal'}`}>
                      {p.deviationDays == null ? '—' : `${p.deviationDays > 0 ? '+' : ''}${p.deviationDays}d`}
                    </td>
                    <td className="py-2">{p.onTrack == null ? '—' : p.onTrack ? '✅ On track' : '⚠️ Behind'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Streak calendar */}
      <div className="p-4 rounded-2xl bg-white border border-line shadow-xs">
        <h3 className="text-sm font-bold text-ink mb-2">Consistency · last 12 weeks</h3>
        <div className="flex flex-wrap gap-1" data-testid="streak-calendar">
          {weeks.map((c) => (
            <span key={c.date} title={`${c.date}: ${c.count} events`} className={`w-3 h-3 rounded-[3px] ${intensity(c)}`} />
          ))}
        </div>
        <p className="text-xs text-faint mt-2">Darker = more study activity that day.</p>
      </div>

      {/* Weak topics + next */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-line shadow-xs">
          <h3 className="text-sm font-bold text-ink mb-2">Weak topics</h3>
          {(overview?.weakTopics?.length ?? 0) > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {overview.weakTopics.map((t, i) => (
                <span key={i} className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">{t}</span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-faint">No weak topics flagged — quizzes will surface them here.</p>
          )}
        </div>
        <div className="p-4 rounded-2xl bg-white border border-line shadow-xs">
          <h3 className="text-sm font-bold text-ink mb-2">Study this next</h3>
          {overview?.whatToStudy ? (
            <p className="text-sm text-body">
              <b className="capitalize">{overview.whatToStudy.type}</b>: {overview.whatToStudy.concept || 'general review'}
              <span className="block text-xs text-faint mt-0.5">{overview.whatToStudy.reason}</span>
            </p>
          ) : (
            <p className="text-sm text-faint">Upload a source and take a quiz to get a recommendation.</p>
          )}
        </div>
      </div>
    </div>
  )
}
