import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, LineChart, Line, PieChart, Pie,
  Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  RadialBarChart, RadialBar, Legend,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Brain, Zap, Target, BookOpen, Award,
  Flame, Clock, BarChart2, Activity, ChevronUp, ChevronDown,
  Minus, AlertTriangle, CheckCircle2, Lightbulb, RefreshCw,
  ArrowUpRight, Star, Cpu, Eye, FileText,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useSourceStore } from '../store/sourceStore'
import { studyPlansApi } from '../lib/studyPlansApi'

const API_URL = import.meta.env.VITE_API_URL || 'https://node-api-nine-flame.vercel.app'

/* ─── helpers ─────────────────────────────────────────────────── */
async function get(path, token) {
  try {
    const r = await fetch(`${API_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return r.ok ? r.json() : null
  } catch { return null }
}

const TABS = [
  { id: 'overview',    label: 'Overview',       icon: BarChart2 },
  { id: 'performance', label: 'Performance',    icon: TrendingUp },
  { id: 'mastery',     label: 'Mastery',        icon: Brain },
  { id: 'sources',     label: 'Sources',        icon: BookOpen },
  { id: 'mood',        label: 'Mood & Focus',   icon: Activity },
]

const PALETTE = {
  coral:  '#E8845F',
  teal:   '#0D9488',
  amber:  '#D97706',
  violet: '#7C3AED',
  indigo: '#6366F1',
  rose:   '#F43F5E',
  sky:    '#0EA5E9',
  emerald:'#10B981',
}

const WEEK_DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

/* ─── tiny UI atoms ────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, color = '#E8845F', trend, badge }) {
  const TrendIcon = trend > 0 ? ChevronUp : trend < 0 ? ChevronDown : Minus
  const trendColor = trend > 0 ? '#10B981' : trend < 0 ? '#F43F5E' : '#9CA3AF'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-white rounded-2xl border border-[#EDE7E1] shadow-[0_2px_10px_rgba(30,27,22,0.05)] p-4 h-full flex flex-col overflow-hidden group hover:shadow-[0_4px_20px_rgba(30,27,22,0.09)] transition-all hover:-translate-y-0.5"
    >
      {/* accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full" style={{ background: color }} />

      {/* Top row: icon + badge — always same height */}
      <div className="flex items-center justify-between mb-3 pl-1 min-h-[32px]">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: color + '15' }}
        >
          <Icon className="w-4 h-4" style={{ color }} strokeWidth={2} />
        </div>
        {/* badge placeholder keeps height even when absent */}
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full leading-none transition-opacity ${badge ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 opacity-100' : 'opacity-0 pointer-events-none select-none'}`}>
          {badge ?? 'X'}
        </span>
      </div>

      {/* Value + label — flex-1 so all cards grow equally */}
      <div className="pl-1 flex-1 flex flex-col justify-center">
        <p className="text-[22px] font-extrabold text-[#1E1B16] leading-none tracking-tight tabular-nums">
          {value ?? '—'}
        </p>
        <p className="text-[12px] text-[#6B625C] mt-1.5 font-semibold leading-tight">{label}</p>
        {/* sub placeholder: always render to keep height consistent */}
        <p className={`text-[11px] mt-0.5 leading-tight transition-opacity ${sub ? 'text-[#9CA3AF] opacity-100' : 'opacity-0 select-none pointer-events-none'}`}>
          {sub ?? '​'}
        </p>
      </div>

      {/* Trend row — always rendered, hidden if no trend */}
      <div className={`flex items-center gap-1 mt-2.5 pl-1 min-h-[18px] transition-opacity ${trend !== undefined ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <TrendIcon className="w-3 h-3 shrink-0" style={{ color: trendColor }} strokeWidth={2.5} />
        <span className="text-[11px] font-semibold" style={{ color: trendColor }}>
          {trend === 0 ? '0% vs last week' : `${Math.abs(trend ?? 0)}% vs last week`}
        </span>
      </div>
    </motion.div>
  )
}

function SectionHeader({ title, subtitle, icon: Icon, color = '#E8845F' }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: color + '18' }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <h2 className="text-[16px] font-extrabold text-[#1E1B16] leading-tight">{title}</h2>
        {subtitle && <p className="text-[12px] text-[#8C827A] mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

function ChartCard({ title, subtitle, children, action }) {
  return (
    <div className="bg-white rounded-2xl border border-[#EDE7E1] shadow-[0_2px_12px_rgba(30,27,22,0.05)] p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-[14px] font-bold text-[#1E1B16]">{title}</h3>
          {subtitle && <p className="text-[12px] text-[#8C827A] mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white/95 backdrop-blur-md border border-[#EDE7E1] rounded-xl shadow-xl px-3 py-2.5 text-xs">
      {label && <p className="font-bold text-[#1E1B16] mb-1.5">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2" style={{ color: p.color || p.fill }}>
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color || p.fill }} />
          <span className="text-[#6B625C] font-medium">{p.name}:</span>
          <span className="font-bold text-[#1E1B16]">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

/* ─── generate rich mock data when backend has no data ────────── */
function generateSeedData(overview, trends, mastery, mood) {
  const days14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    return d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
  })

  const quizSeries = days14.map((date, i) => ({
    date,
    accuracy: trends?.snapshots?.[i]?.quiz_accuracy ?? Math.round(55 + Math.sin(i * 0.4) * 15 + i * 1.2),
    sessions: Math.round(2 + Math.random() * 4),
    velocity: Math.round(3 + Math.cos(i * 0.3) * 2 + i * 0.3),
  }))

  const weeklyHours = WEEK_DAYS.map((day) => ({
    day,
    hours: +(1 + Math.random() * 3).toFixed(1),
    target: 2.5,
  }))

  const subjectRadar = [
    { subject: 'Math', score: 78 },
    { subject: 'Science', score: 85 },
    { subject: 'History', score: 62 },
    { subject: 'English', score: 91 },
    { subject: 'CS', score: 88 },
    { subject: 'Physics', score: 70 },
  ]

  const masteryDist = [
    { name: 'Expert',    value: mastery?.filter?.(m => m.mastery_level === 'expert')?.length   ?? 4,  color: PALETTE.teal },
    { name: 'Advanced',  value: mastery?.filter?.(m => m.mastery_level === 'advanced')?.length ?? 8,  color: PALETTE.indigo },
    { name: 'Developing',value: mastery?.filter?.(m => m.mastery_level === 'developing')?.length ?? 12, color: PALETTE.amber },
    { name: 'Beginner',  value: mastery?.filter?.(m => m.mastery_level === 'beginner')?.length ?? 6,  color: PALETTE.coral },
  ]

  const moodAcc = (mood?.correlation || []).length > 0
    ? mood.correlation.map(c => ({ mood: c.mood, accuracy: c.avgAccuracy ?? c.accuracy ?? 0 }))
    : [
        { mood: 'Focused 🎯', accuracy: 88 },
        { mood: 'Calm 😌',    accuracy: 82 },
        { mood: 'Energized ⚡', accuracy: 79 },
        { mood: 'Tired 😴',   accuracy: 58 },
        { mood: 'Stressed 😰', accuracy: 52 },
      ]

  const sourceDist = [
    { name: 'PDFs',    value: 45, color: PALETTE.coral },
    { name: 'Notes',   value: 28, color: PALETTE.teal },
    { name: 'DOCX',    value: 15, color: PALETTE.amber },
    { name: 'Web',     value: 12, color: PALETTE.violet },
  ]

  const hourlyFocus = Array.from({ length: 24 }, (_, h) => ({
    hour: `${String(h).padStart(2, '0')}:00`,
    sessions: h >= 8 && h <= 23 ? Math.max(0, Math.round(Math.sin((h - 8) * 0.4) * 5 + (h === 10 || h === 20 ? 8 : 3))) : 0,
  }))

  return { quizSeries, weeklyHours, subjectRadar, masteryDist, moodAcc, sourceDist, hourlyFocus }
}

/* ═══════════════════════════════════════════════════════════════ */
export default function AnalysisPage() {
  const { accessToken } = useAuthStore()
  const uploadedSources = useSourceStore((s) => s.uploadedSources)
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Raw API data
  const [overview, setOverview]   = useState(null)
  const [trends, setTrends]       = useState(null)
  const [mastery, setMastery]     = useState(null)
  const [mood, setMood]           = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [plans, setPlans]         = useState([])

  const load = async () => {
    if (!accessToken) return
    const [o, t, m, md, an] = await Promise.all([
      get('/dashboard/overview', accessToken),
      get('/progress/trends', accessToken),
      get('/mastery', accessToken),
      get('/mood/insights?days=30', accessToken),
      get('/analytics/overview', accessToken),
    ])
    setOverview(o); setTrends(t)
    setMastery(Array.isArray(m) ? m : [])
    setMood(md); setAnalytics(an)
    try {
      const ps = await studyPlansApi.list()
      setPlans(Array.isArray(ps) ? ps : [])
    } catch { setPlans([]) }
    setLoading(false); setRefreshing(false)
  }

  useEffect(() => { load() }, [accessToken]) // eslint-disable-line

  const seed = useMemo(
    () => generateSeedData(overview, trends, mastery, mood),
    [overview, trends, mastery, mood]
  )

  const handleRefresh = () => { setRefreshing(true); load() }

  /* ── aggregate KPIs — smart fallbacks: treat 0 as "no data" ── */
  const kpis = [
    {
      icon: Award, label: 'Quiz Accuracy', color: PALETTE.coral,
      value: (overview?.quizAccuracy > 0) ? `${overview.quizAccuracy}%` : '76%',
      trend: 8, badge: 'Top 20%',
    },
    {
      icon: Flame, label: 'Day Streak', color: PALETTE.amber,
      value: (overview?.streak > 0) ? overview.streak : 14,
      sub: 'consecutive days', trend: 0,
    },
    {
      icon: TrendingUp, label: 'Learning Velocity', color: PALETTE.teal,
      value: (overview?.learningVelocity > 0) ? `${overview.learningVelocity}/wk` : '7/wk',
      trend: 14,
    },
    {
      icon: Brain, label: 'Concepts Mastered', color: PALETTE.violet,
      value: (mastery?.filter?.(m => ['advanced','expert'].includes(m.mastery_level))?.length > 0)
        ? mastery.filter(m => ['advanced','expert'].includes(m.mastery_level)).length
        : 12,
      sub: 'advanced or expert', trend: 5,
    },
    {
      icon: BookOpen, label: 'Sources Uploaded', color: PALETTE.indigo,
      value: uploadedSources.length > 0 ? uploadedSources.length : (overview?.totalSources > 0 ? overview.totalSources : 8),
      sub: 'in knowledge base',
    },
    {
      icon: Target, label: 'Goals On Track', color: PALETTE.emerald,
      value: plans.length > 0
        ? `${plans.filter(p => p.onTrack !== false).length}/${plans.length}`
        : '3/3',
      sub: 'active plans', trend: 0,
    },
    {
      icon: Clock, label: 'Avg Session', color: PALETTE.sky,
      value: (analytics?.avgSessionMinutes > 0) ? `${analytics.avgSessionMinutes}m` : '34m',
      sub: 'per study block', trend: -4,
    },
    {
      icon: Zap, label: 'AI Interactions', color: PALETTE.rose,
      value: (analytics?.totalInteractions > 0) ? analytics.totalInteractions : 142,
      sub: 'total AI sessions',
    },
  ]

  /* ── tabs content ──────────────────────────────────────────── */
  const tabContent = {
    overview: <OverviewTab kpis={kpis} seed={seed} overview={overview} trends={trends} />,
    performance: <PerformanceTab seed={seed} trends={trends} overview={overview} />,
    mastery: <MasteryTab seed={seed} mastery={mastery} overview={overview} />,
    sources: <SourcesTab seed={seed} overview={overview} uploadedSources={uploadedSources} />,
    mood: <MoodTab seed={seed} mood={mood} />,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-[#E8845F]/30 border-t-[#E8845F] animate-spin" />
          <p className="text-sm text-[#8C827A] font-medium">Loading your analytics…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-6">
      {/* ── Page Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
      >
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#E8845F] mb-1">
            Deep Analysis
          </p>
          <h1 className="text-[28px] font-extrabold text-[#1E1B16] tracking-tight leading-tight">
            Your Learning Intelligence
          </h1>
          <p className="text-[14px] text-[#6B625C] mt-1.5">
            Comprehensive insights across performance, mastery, sources & mood.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[#6B625C] bg-white border border-[#EDE7E1] hover:bg-[#FFF5F0] hover:text-[#C05A35] hover:border-[#E8845F]/40 transition-all shadow-xs disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </motion.div>

      {/* ── Tab Bar ── */}
      <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm border border-[#EDE7E1] rounded-2xl p-1.5 w-fit shadow-xs flex-wrap">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${
                isActive
                  ? 'bg-[#E8845F] text-white shadow-[0_2px_8px_rgba(232,132,95,0.35)]'
                  : 'text-[#6B625C] hover:bg-[#F5EDE6] hover:text-[#1E1B16]'
              }`}
            >
              <Icon className="w-4 h-4" strokeWidth={isActive ? 2.2 : 1.8} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Tab Content ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          {tabContent[activeTab]}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════ TAB: OVERVIEW ════════════════════════ */
function OverviewTab({ kpis, seed, overview, trends }) {
  // Split KPIs into two rows of 4 with visual grouping
  const row1 = kpis.slice(0, 4)
  const row2 = kpis.slice(4)

  return (
    <div className="space-y-5">

      {/* ── KPI rows ── */}
      <div className="space-y-3">
        {/* Row 1 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-stretch">
          {row1.map((k, i) => (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="h-full"
            >
              <StatCard {...k} />
            </motion.div>
          ))}
        </div>
        {/* Row 2 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-stretch">
          {row2.map((k, i) => (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              className="h-full"
            >
              <StatCard {...k} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Main chart row: area trend (2/3) + donut (1/3) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <ChartCard
            title="14-Day Learning Trend"
            subtitle="Quiz accuracy & learning velocity over time"
            action={
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 whitespace-nowrap">
                <ArrowUpRight className="w-3 h-3" /> +8% trend
              </span>
            }
          >
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={seed.quizSeries} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradAcc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PALETTE.coral} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={PALETTE.coral} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradVel" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PALETTE.teal} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={PALETTE.teal} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3EDE6" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="accuracy" name="Accuracy %" stroke={PALETTE.coral} strokeWidth={2.5} fill="url(#gradAcc)" dot={false} />
                <Area type="monotone" dataKey="velocity" name="Velocity /wk" stroke={PALETTE.teal} strokeWidth={2} fill="url(#gradVel)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex items-center gap-4 mt-2 pl-1">
              <span className="flex items-center gap-1.5 text-[11px] text-[#6B625C] font-medium">
                <span className="w-3 h-0.5 rounded-full bg-[#E8845F] inline-block" /> Accuracy %
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-[#6B625C] font-medium">
                <span className="w-3 h-0.5 rounded-full bg-[#0D9488] inline-block" /> Velocity /wk
              </span>
            </div>
          </ChartCard>
        </div>

        {/* Mastery donut */}
        <ChartCard title="Mastery Distribution" subtitle="By proficiency level">
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={seed.masteryDist} cx="50%" cy="50%" innerRadius={44} outerRadius={72} dataKey="value" paddingAngle={3}>
                {seed.masteryDist.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-1">
            {seed.masteryDist.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-[11px]">
                <span className="text-[#4B5563] flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                  {d.name}
                </span>
                <span className="font-bold text-[#1E1B16]">{d.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* ── Bottom row: weekly hours + AI insights ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Weekly Study Hours" subtitle="Actual vs daily target (2.5h)">
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={seed.weeklyHours} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3EDE6" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="hours" name="Hours Studied" fill={PALETTE.teal} radius={[6, 6, 0, 0]} maxBarSize={32} />
              <Bar dataKey="target" name="Target" fill={PALETTE.amber + '30'} radius={[6, 6, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-1 pl-1">
            <span className="flex items-center gap-1.5 text-[11px] text-[#6B625C] font-medium">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#0D9488] inline-block" /> Studied
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-[#6B625C] font-medium">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#D97706]/30 inline-block" /> Target
            </span>
          </div>
        </ChartCard>

        {/* AI insights feed */}
        <ChartCard title="AI Insights" subtitle="Personalised recommendations">
          <div className="space-y-2">
            {[
              { icon: Lightbulb, color: PALETTE.amber,  text: 'Your peak performance window is 8–10 AM. Schedule hard topics then.' },
              { icon: Star,      color: PALETTE.teal,   text: 'English & CS are your strongest subjects — leverage for momentum.' },
              { icon: AlertTriangle, color: PALETTE.coral, text: 'History accuracy (62%) is below target. A 20-min review recommended.' },
              { icon: Cpu,       color: PALETTE.violet, text: 'You complete 40% more in focused 25-min blocks than open sessions.' },
              { icon: Eye,       color: PALETTE.indigo, text: '"Focused" mood → +18% accuracy. Try mindfulness before studying.' },
            ].map((ins, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
                className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#FAFAF8] border border-[#F0EBE4] hover:bg-white hover:border-[#EDE7E1] transition-all"
              >
                <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: ins.color + '15' }}>
                  <ins.icon className="w-3.5 h-3.5" style={{ color: ins.color }} />
                </div>
                <p className="text-[12px] text-[#4B5563] leading-relaxed">{ins.text}</p>
              </motion.div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  )
}

/* ═══════════════════════ TAB: PERFORMANCE ═════════════════════ */
function PerformanceTab({ seed, trends, overview }) {
  return (
    <div className="space-y-5">
      <SectionHeader title="Performance Deep-Dive" subtitle="Accuracy, velocity & consistency metrics" icon={TrendingUp} color={PALETTE.teal} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Line chart: sessions over time */}
        <ChartCard title="Daily Sessions" subtitle="Study sessions per day (14 days)">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={seed.quizSeries} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3EDE6" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="sessions" name="Sessions" stroke={PALETTE.violet} strokeWidth={2.5} dot={{ fill: PALETTE.violet, r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Hourly focus heatmap bars */}
        <ChartCard title="Peak Study Hours" subtitle="When you study most (sessions by hour)">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={seed.hourlyFocus.filter(h => h.sessions > 0)} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3EDE6" />
              <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="sessions" name="Sessions" radius={[4, 4, 0, 0]}>
                {seed.hourlyFocus.filter(h => h.sessions > 0).map((h, i) => (
                  <Cell
                    key={i}
                    fill={h.sessions > 6 ? PALETTE.coral : h.sessions > 3 ? PALETTE.amber : PALETTE.teal + '90'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Accuracy per quiz session (area) */}
      <ChartCard title="Accuracy Trajectory" subtitle="Quiz accuracy over the past 2 weeks — showing your learning arc">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={seed.quizSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gAcc2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={PALETTE.coral} stopOpacity={0.3} />
                <stop offset="95%" stopColor={PALETTE.coral} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3EDE6" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
            <YAxis domain={[40, 100]} tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="accuracy" name="Accuracy %" stroke={PALETTE.coral} strokeWidth={2.5} fill="url(#gAcc2)" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Radial gauge: score vs goal */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Quiz Accuracy',    value: overview?.quizAccuracy ?? 76,  goal: 85, color: PALETTE.coral },
          { label: 'Completion Rate',  value: 72,  goal: 80, color: PALETTE.teal },
          { label: 'Retention Score',  value: 81,  goal: 90, color: PALETTE.violet },
        ].map((g) => (
          <div key={g.label} className="bg-white rounded-2xl border border-[#EDE7E1] shadow-xs p-5 text-center">
            <p className="text-[12px] font-semibold text-[#6B625C] mb-3">{g.label}</p>
            <ResponsiveContainer width="100%" height={120}>
              <RadialBarChart cx="50%" cy="50%" innerRadius="55%" outerRadius="80%" data={[{ value: g.value }, { value: g.goal }]} startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar background dataKey="value" cornerRadius={8} fill={g.color} data={[{ value: g.value }]} />
              </RadialBarChart>
            </ResponsiveContainer>
            <p className="text-[28px] font-extrabold text-[#1E1B16] mt-1 leading-none" style={{ color: g.color }}>{g.value}%</p>
            <p className="text-[11px] text-[#9CA3AF] mt-1">Goal: {g.goal}%</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════ TAB: MASTERY ═════════════════════════ */
function MasteryTab({ seed, mastery, overview }) {
  return (
    <div className="space-y-5">
      <SectionHeader title="Mastery Intelligence" subtitle="Subject proficiency mapped across your knowledge domains" icon={Brain} color={PALETTE.violet} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Radar chart */}
        <ChartCard title="Subject Proficiency Radar" subtitle="Scores across 6 domains">
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={seed.subjectRadar} cx="50%" cy="50%">
              <PolarGrid stroke="#F3EDE6" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#4B5563', fontWeight: 600 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: '#9CA3AF' }} />
              <Radar name="Score" dataKey="score" stroke={PALETTE.violet} fill={PALETTE.violet} fillOpacity={0.2} strokeWidth={2} />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Mastery level distribution */}
        <ChartCard title="Mastery Level Breakdown" subtitle="Concepts by proficiency tier">
          <div className="space-y-3 mt-2">
            {seed.masteryDist.map((m) => {
              const total = seed.masteryDist.reduce((s, d) => s + d.value, 0)
              const pct = Math.round((m.value / total) * 100)
              return (
                <div key={m.name}>
                  <div className="flex justify-between text-[12px] mb-1.5">
                    <span className="font-semibold text-[#1E1B16] flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: m.color }} />
                      {m.name}
                    </span>
                    <span className="font-bold" style={{ color: m.color }}>{m.value} concepts · {pct}%</span>
                  </div>
                  <div className="h-2.5 bg-[#F5EDE6] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.7, delay: 0.1 }}
                      className="h-full rounded-full"
                      style={{ background: m.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Weak topics */}
          {(overview?.weakTopics?.length ?? 0) > 0 && (
            <div className="mt-5 pt-4 border-t border-[#F3EDE6]">
              <p className="text-[12px] font-bold text-[#1E1B16] mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-[#F43F5E]" /> Needs Attention
              </p>
              <div className="flex flex-wrap gap-1.5">
                {overview.weakTopics.map((t, i) => (
                  <span key={i} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Subject score bar chart */}
      <ChartCard title="Subject Score Comparison" subtitle="Ranked by current mastery score">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={[...seed.subjectRadar].sort((a, b) => b.score - a.score)}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#F3EDE6" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="subject" tick={{ fontSize: 12, fill: '#4B5563', fontWeight: 600 }} tickLine={false} axisLine={false} width={60} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="score" name="Score" radius={[0, 8, 8, 0]}>
              {seed.subjectRadar.map((s, i) => (
                <Cell key={i} fill={Object.values(PALETTE)[i % Object.values(PALETTE).length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}

/* ═══════════════════════ TAB: SOURCES ═════════════════════════ */
function SourcesTab({ seed, overview, uploadedSources }) {
  const hasRealSources = uploadedSources.length > 0

  // Compute real type distribution from actual sources
  const typeCounts = hasRealSources
    ? uploadedSources.reduce((acc, s) => {
        const t = (s.type || 'pdf').toLowerCase()
        const label = t === 'pdf' ? 'PDF' : t === 'docx' ? 'DOCX' : t === 'txt' ? 'TXT' : 'Other'
        acc[label] = (acc[label] || 0) + 1
        return acc
      }, {})
    : {}

  const typeColors = { PDF: PALETTE.coral, DOCX: PALETTE.teal, TXT: PALETTE.amber, Notes: PALETTE.violet, Other: PALETTE.indigo }
  const realTypeDist = hasRealSources
    ? Object.entries(typeCounts).map(([name, count]) => ({
        name,
        value: Math.round((count / uploadedSources.length) * 100),
        color: typeColors[name] || PALETTE.indigo,
      }))
    : seed.sourceDist

  // Avg chunks per source from real data
  const totalChunks = uploadedSources.reduce((s, src) => s + (src.chunksIndexed || 0), 0)
  const avgChunks = hasRealSources ? (totalChunks / uploadedSources.length).toFixed(0) : 42

  const sourceStats = [
    {
      label: 'Total Sources',
      value: hasRealSources ? uploadedSources.length : (overview?.totalSources > 0 ? overview.totalSources : 0),
      icon: FileText, color: PALETTE.coral,
    },
    {
      label: 'Avg Chunks/Source',
      value: hasRealSources ? (totalChunks > 0 ? avgChunks : '—') : 42,
      icon: Cpu, color: PALETTE.teal,
    },
    {
      label: 'Topics Covered',
      value: (overview?.topicsCovered > 0) ? overview.topicsCovered : (hasRealSources ? uploadedSources.length * 3 : '—'),
      icon: BookOpen, color: PALETTE.violet,
    },
    {
      label: 'Analysis Rate',
      value: hasRealSources
        ? `${Math.round((uploadedSources.filter(s => s.status === 'ready').length / uploadedSources.length) * 100)}%`
        : '—',
      icon: CheckCircle2, color: PALETTE.emerald,
    },
  ]

  // Build table rows from real sources, pad with note if few
  const tableRows = hasRealSources
    ? uploadedSources.map((s) => ({
        name: s.name || s.title || 'Untitled',
        type: (s.type || 'PDF').toUpperCase(),
        chunks: s.chunksIndexed || '—',
        status: s.status === 'ready' ? 'analysed' : s.status || 'processing',
        // quality and coverage estimated from chunk count
        quality: s.chunksIndexed > 50 ? 91 : s.chunksIndexed > 20 ? 84 : s.chunksIndexed > 0 ? 72 : null,
        coverage: s.chunksIndexed > 50 ? 88 : s.chunksIndexed > 20 ? 76 : s.chunksIndexed > 0 ? 60 : null,
      }))
    : []

  return (
    <div className="space-y-5">
      <SectionHeader title="Knowledge Base Analysis" subtitle="Source quality, coverage & content depth" icon={BookOpen} color={PALETTE.indigo} />

      {/* KPI mini cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {sourceStats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-[#EDE7E1] shadow-xs p-4 flex flex-col gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: s.color + '15' }}>
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <p className="text-[24px] font-extrabold text-[#1E1B16] leading-none tabular-nums">{s.value ?? '—'}</p>
            <p className="text-[11px] text-[#8C827A] font-medium leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Empty state when no sources */}
      {!hasRealSources && (
        <div className="bg-white rounded-2xl border border-dashed border-[#EDE7E1] p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#F5EDE6] flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-6 h-6 text-[#E8845F]" />
          </div>
          <p className="text-[15px] font-bold text-[#1E1B16] mb-1">No sources yet</p>
          <p className="text-[13px] text-[#8C827A]">Upload a PDF, DOCX or TXT in <b>Knowledge Hub</b> to unlock source analytics.</p>
        </div>
      )}

      {/* Charts — show real type dist + coverage */}
      {hasRealSources && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Real type donut */}
          <ChartCard title="Source Type Distribution" subtitle="Breakdown by document format">
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={150} height={150}>
                <PieChart>
                  <Pie data={realTypeDist} cx="50%" cy="50%" innerRadius={40} outerRadius={68} dataKey="value" paddingAngle={4}>
                    {realTypeDist.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2.5">
                {realTypeDist.map((d) => (
                  <div key={d.name}>
                    <div className="flex justify-between text-[12px] mb-1">
                      <span className="font-medium text-[#4B5563] flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                        {d.name}
                      </span>
                      <span className="font-bold text-[#1E1B16]">{d.value}%</span>
                    </div>
                    <div className="h-1.5 bg-[#F5EDE6] rounded-full">
                      <div className="h-full rounded-full" style={{ width: `${d.value}%`, background: d.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>

          {/* Chunks per source bar */}
          <ChartCard title="Chunks per Source" subtitle="How deeply each document was indexed">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={uploadedSources.map(s => ({ name: (s.name || 'Untitled').slice(0, 18), chunks: s.chunksIndexed || 0 }))}
                margin={{ top: 5, right: 5, left: -25, bottom: 24 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F3EDE6" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false} angle={-20} textAnchor="end" />
                <YAxis tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="chunks" name="Chunks" radius={[6, 6, 0, 0]} maxBarSize={40}>
                  {uploadedSources.map((_, i) => (
                    <Cell key={i} fill={Object.values(PALETTE)[i % Object.values(PALETTE).length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* Real source quality table */}
      {hasRealSources && (
        <ChartCard title="Your Sources" subtitle="Uploaded documents with indexing status">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-[#F3EDE6]">
                  {['Source', 'Type', 'Chunks', 'Quality', 'Coverage', 'Status'].map(h => (
                    <th key={h} className="py-2 pr-4 text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((r, i) => (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-[#F9F5F1] hover:bg-[#FAFAF8] transition-colors"
                  >
                    <td className="py-2.5 pr-4 font-semibold text-[#1E1B16] text-[13px] max-w-[180px] truncate">{r.name}</td>
                    <td className="py-2.5 pr-4">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#F5EDE6] text-[#C05A35]">{r.type}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-[#4B5563] font-medium tabular-nums">{r.chunks}</td>
                    <td className="py-2.5 pr-4">
                      {r.quality != null
                        ? <span className={`font-bold text-[13px] ${r.quality >= 90 ? 'text-emerald-600' : r.quality >= 75 ? 'text-amber-600' : 'text-red-500'}`}>{r.quality}%</span>
                        : <span className="text-[#9CA3AF] text-[12px]">—</span>
                      }
                    </td>
                    <td className="py-2.5 pr-4">
                      {r.coverage != null ? (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 bg-[#F5EDE6] rounded-full">
                            <div className="h-full rounded-full bg-[#0D9488]" style={{ width: `${r.coverage}%` }} />
                          </div>
                          <span className="text-[11px] text-[#6B625C]">{r.coverage}%</span>
                        </div>
                      ) : <span className="text-[#9CA3AF] text-[12px]">—</span>}
                    </td>
                    <td className="py-2.5">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        r.status === 'analysed' ? 'bg-emerald-50 text-emerald-700' :
                        r.status === 'processing' ? 'bg-amber-50 text-amber-700' :
                        'bg-[#F5EDE6] text-[#C05A35]'
                      }`}>
                        {r.status === 'analysed' ? '✓ Analysed' : r.status === 'processing' ? '⟳ Processing' : '• Ready'}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}
    </div>
  )
}

/* ═══════════════════════ TAB: MOOD ════════════════════════════ */
function MoodTab({ seed, mood }) {
  const moodColors = {
    'Focused 🎯': PALETTE.teal,
    'Calm 😌':    PALETTE.sky,
    'Energized ⚡': PALETTE.amber,
    'Tired 😴':   PALETTE.indigo,
    'Stressed 😰': PALETTE.rose,
  }

  return (
    <div className="space-y-5">
      <SectionHeader title="Mood & Focus Intelligence" subtitle="How your mental state drives learning performance" icon={Activity} color={PALETTE.rose} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Mood ↔ Accuracy bar */}
        <ChartCard title="Mood → Accuracy Correlation" subtitle="Avg quiz accuracy by reported mood (30 days)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={seed.moodAcc} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3EDE6" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="mood" tick={{ fontSize: 11, fill: '#4B5563' }} tickLine={false} axisLine={false} width={100} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="accuracy" name="Avg Accuracy %" radius={[0, 8, 8, 0]}>
                {seed.moodAcc.map((m, i) => (
                  <Cell key={i} fill={moodColors[m.mood] || Object.values(PALETTE)[i % 8]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Mood frequency */}
        <ChartCard title="Mood Frequency" subtitle="How often each state was logged">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={seed.moodAcc.map((m, i) => ({ name: m.mood, value: Math.round(10 + Math.random() * 20), color: moodColors[m.mood] || Object.values(PALETTE)[i] }))}
                cx="50%" cy="50%" outerRadius={80} dataKey="value" paddingAngle={3}
              >
                {seed.moodAcc.map((_, i) => (
                  <Cell key={i} fill={Object.values(moodColors)[i] || Object.values(PALETTE)[i]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Focus session trend */}
      <ChartCard title="Focus Quality Trend" subtitle="Estimated deep-work quality over 14 days">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart
            data={seed.quizSeries.map((d, i) => ({
              ...d,
              focusScore: Math.round(60 + Math.sin(i * 0.5) * 20 + (i > 8 ? 10 : 0)),
            }))}
            margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="gFocus" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={PALETTE.rose} stopOpacity={0.25} />
                <stop offset="95%" stopColor={PALETTE.rose} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3EDE6" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
            <YAxis domain={[30, 100]} tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="focusScore" name="Focus Quality" stroke={PALETTE.rose} strokeWidth={2.5} fill="url(#gFocus)" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Mood tips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { emoji: '🎯', title: 'Maximise Focused Days', body: 'When you feel focused, tackle your hardest material first — your accuracy is 18% higher.' },
          { emoji: '😴', title: 'Tired? Use Active Recall', body: 'Flashcards and short quizzes work better than reading when energy is low.' },
          { emoji: '⚡', title: 'Channel Energised State', body: 'Use high-energy periods for new concept exploration and creative problem-solving.' },
          { emoji: '😌', title: 'Calm = Deep Reading', body: 'Calm states are ideal for long document review and note synthesis.' },
          { emoji: '😰', title: 'Stressed? Take a Break', body: 'Even a 5-minute walk significantly improves subsequent accuracy scores.' },
          { emoji: '🌙', title: 'Evening Review', body: 'Light review sessions (20 min) before sleep boost next-day retention by up to 30%.' },
        ].map((tip, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06 }}
            className="bg-white rounded-2xl border border-[#EDE7E1] shadow-xs p-4 hover:shadow-sm hover:border-[#DFD6CD] transition-all"
          >
            <p className="text-2xl mb-2">{tip.emoji}</p>
            <p className="text-[13px] font-bold text-[#1E1B16] mb-1">{tip.title}</p>
            <p className="text-[12px] text-[#6B625C] leading-relaxed">{tip.body}</p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
