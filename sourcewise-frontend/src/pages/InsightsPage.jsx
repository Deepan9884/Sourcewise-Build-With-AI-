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
        setPlanRows([])
      }
    })()
    return () => { cancelled = true }
  }, [accessToken])

  // Streak calendar: last year of event days.
  const weeks = (() => {
    const byDay = new Map()
    for (const ev of events) {
      const k = dayKey(ev.created_at || ev.date)
      if (k) byDay.set(k, (byDay.get(k) || 0) + 1)
    }
    const today = new Date()
    const start = new Date(today); start.setDate(start.getDate() - 364)
    // align to Monday
    while (start.getDay() !== 1) start.setDate(start.getDate() - 1)
    const cells = []
    for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
      const k = d.toISOString().slice(0, 10)
      cells.push({ date: k, count: byDay.get(k) || 0, future: false })
    }
    return cells
  })()

  // LeetCode-style streak & consistency stats
  const totalActiveDays = weeks.filter((c) => c.count > 0).length
  const totalEventsCount = weeks.reduce((sum, c) => sum + c.count, 0)
  let maxStreak = 0
  let currentRun = 0
  for (const c of weeks) {
    if (c.count > 0) {
      currentRun++
      if (currentRun > maxStreak) maxStreak = currentRun
    } else {
      currentRun = 0
    }
  }
  const currentStreak = overview?.streak ?? currentRun

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
        {planRows.length === 0 ? (
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

      {/* Streak calendar (LeetCode style) */}
      <div className="p-5 rounded-2xl bg-white border border-line shadow-xs overflow-hidden">
        <div className="flex flex-col xl:flex-row items-stretch justify-between gap-6">
          
          {/* Left / Heatmap Section */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                Study Consistency
                <span className="text-xs font-normal text-faint">· Past 52 weeks</span>
              </h3>
            </div>

            {/* Heatmap with day-of-week labels */}
            <div className="overflow-x-auto pb-2 pt-1 px-1 scrollbar-hide">
              <div className="flex gap-2 min-w-max pr-6">
                <div className="flex flex-col justify-between text-[10px] text-faint font-medium py-0.5 select-none pr-1">
                  <span>Mon</span>
                  <span className="opacity-0">Tue</span>
                  <span>Wed</span>
                  <span className="opacity-0">Thu</span>
                  <span>Fri</span>
                  <span className="opacity-0">Sat</span>
                  <span>Sun</span>
                </div>

                <div className="grid grid-rows-7 grid-flow-col gap-[3px] w-max pr-2" data-testid="streak-calendar">
                  {weeks.map((c) => (
                    <span
                      key={c.date}
                      title={`${c.date}: ${c.count} study activities`}
                      className={`w-3 h-3 rounded-full ${intensity(c)} transition-all hover:scale-125 hover:ring-2 hover:ring-teal/40 cursor-pointer`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between mt-3 text-[11px] text-faint">
              <div className="flex items-center gap-1.5 font-medium">
                <span>Less</span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#F1ECE6]" />
                <span className="w-2.5 h-2.5 rounded-full bg-teal/30" />
                <span className="w-2.5 h-2.5 rounded-full bg-teal/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-teal" />
                <span>More</span>
              </div>
              <span className="text-faint text-[10px] hidden sm:inline">
                Hover circle to view details
              </span>
            </div>
          </div>

          {/* Right / LeetCode-style Stats Panel (Clean sans-serif typography) */}
          <div className="xl:w-72 shrink-0 flex flex-col justify-between pt-1 xl:border-l xl:border-line/70 xl:pl-6 space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl bg-stone-50 border border-line/70 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-faint block uppercase tracking-wider">Total Active</span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-ink font-sans tracking-tight">{totalActiveDays}</span>
                  <span className="text-xs font-semibold text-faint font-sans">days</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-teal-soft/50 border border-teal/20 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-teal block uppercase tracking-wider">Current Streak</span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-teal font-sans tracking-tight">{currentStreak}</span>
                  <span className="text-xs font-semibold text-teal/70 font-sans">days</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-amberbrand-soft/50 border border-amberbrand/20 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-amber-800 block uppercase tracking-wider">Max Streak</span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-amber-900 font-sans tracking-tight">{Math.max(maxStreak, currentStreak)}</span>
                  <span className="text-xs font-semibold text-amber-800/70 font-sans">days</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-stone-50 border border-line/70 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-faint block uppercase tracking-wider">Activities</span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-ink font-sans tracking-tight">{totalEventsCount}</span>
                  <span className="text-xs font-semibold text-faint font-sans">total</span>
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-stone-50/70 border border-line/60 text-xs text-body font-sans flex items-center justify-between">
              <span className="text-faint font-medium">Past 365 days coverage</span>
              <span className="font-bold text-ink font-sans">{Math.round((totalActiveDays / 365) * 100)}%</span>
            </div>
          </div>

        </div>
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
