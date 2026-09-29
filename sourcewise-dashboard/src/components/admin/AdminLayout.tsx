import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, BarChart3, Server, Activity, CalendarDays, Library, HeartHandshake, LogOut, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

const LINKS = [
  { path: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { path: '/users', label: 'Users & Credits', icon: Users },
  { path: '/usage', label: 'Token Usage', icon: BarChart3 },
  { path: '/providers', label: 'Providers & Costs', icon: Server },
  { path: '/system', label: 'Uptime & System', icon: Activity },
  { path: '/plans', label: 'Plans', icon: CalendarDays },
  { path: '/content', label: 'Content', icon: Library },
  { path: '/mood', label: 'Mood', icon: HeartHandshake },
]

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen sw-page">
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-[#EDE7E1]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1E1B16] text-white flex items-center justify-center">
              <ShieldCheck className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-[#1E1B16] leading-tight">SourceWise Creator Dashboard</p>
              <p className="text-[11px] text-[#7C726A] leading-tight">{user?.email || 'Admin console'}</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1.5">
            {LINKS.map((l) => {
              const active = l.exact ? pathname === l.path : pathname.startsWith(l.path)
              const Icon = l.icon
              return (
                <Link
                  key={l.path}
                  to={l.path}
                  className={`h-9 px-3.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
                    active ? 'bg-[#1E1B16] text-white' : 'text-[#5B544E] hover:bg-[#FAF6F2] hover:text-[#1E1B16]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{l.label}</span>
                </Link>
              )
            })}
          </nav>
          <button
            onClick={handleLogout}
            className="h-9 px-3.5 rounded-full border border-[#EDE7E1] text-xs font-bold text-[#5B544E] hover:text-red-600 hover:border-red-200 flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
        <div className="md:hidden border-t border-[#F1ECE6]">
          <div className="max-w-7xl mx-auto px-4 py-2 flex gap-1.5 overflow-x-auto">
            {LINKS.map((l) => {
              const active = l.exact ? pathname === l.path : pathname.startsWith(l.path)
              const Icon = l.icon
              return (
                <Link
                  key={l.path}
                  to={l.path}
                  className={`h-8 px-3 rounded-full text-xs font-bold flex items-center gap-1.5 whitespace-nowrap ${
                    active ? 'bg-[#1E1B16] text-white' : 'bg-white border border-[#EDE7E1] text-[#5B544E]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{l.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white border border-[#EDE7E1] rounded-3xl p-5 shadow-xs">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#E8845F]">Creator Console</p>
            <h1 className="text-xl font-bold tracking-tight text-[#1E1B16]">Admin & Token Operations</h1>
            <p className="text-sm text-[#5B544E] mt-0.5">Monitor users, credits, token usage, provider health and uptime.</p>
          </div>
        </div>
        {children}
      </main>
    </div>
  )
}

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = '#E8845F',
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
  sub?: string
  tone?: string
}) {
  return (
    <div className="p-5 rounded-3xl bg-white border border-[#EDE7E1] shadow-xs">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${tone}1A`, color: tone }}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[#7C726A] uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-extrabold text-[#1E1B16] tabular-nums truncate">{value}</p>
          {sub && <p className="text-xs text-[#5B544E] mt-0.5 truncate">{sub}</p>}
        </div>
      </div>
    </div>
  )
}
