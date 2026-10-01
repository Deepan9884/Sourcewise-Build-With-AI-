import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../../store/authStore'
import { useChatStore } from '../../store/chatStore'
import { useSourceStore } from '../../store/sourceStore'
import { useWorkspaceStore } from '../../store/workspaceStore'
import FloatingFoxCompanion from './FloatingFoxCompanion'
import GlobalChatPanel from '../knowledge/GlobalChatPanel'
import {
  Home, BookCopy, MessageSquare, Calendar, Settings,
  LogOut, ChevronLeft, ChevronRight, Puzzle, CalendarDays, Code2,
  GraduationCap
} from 'lucide-react'
import { EVENTS_CHANGED_EVENT } from '../../lib/studentEvents'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

// Section Navigation Definitions
const NAV_SECTIONS = [
  // 1. Dashboard
  {
    name: 'Dashboard',
    path: '/dashboard',
    icon: Home,
    group: 'core',
    accent: {
      color: '#E8845F',
      activeBg: 'bg-[#FDEEE6]',
      activeText: 'text-[#C05A35]',
      activeBar: 'bg-[#E8845F]',
      hoverBg: 'hover:bg-[#FFF5F0]',
      iconActive: 'text-[#E8845F]',
    },
    badge: null,
    matcher: (pathname) => pathname === '/dashboard' || pathname === '/',
  },
  // 2. Knowledge Hub
  {
    name: 'Knowledge Hub',
    path: '/knowledge',
    icon: BookCopy,
    group: 'core',
    accent: {
      color: '#D97706',
      activeBg: 'bg-[#FEF3C7]',
      activeText: 'text-[#B45309]',
      activeBar: 'bg-[#D97706]',
      hoverBg: 'hover:bg-[#FFFBEB]',
      iconActive: 'text-[#D97706]',
    },
    badge: null,
    matcher: (pathname) => pathname.startsWith('/knowledge') || pathname.startsWith('/sources'),
  },
  // 3. AI Workspace
  {
    name: 'AI Workspace',
    path: '/workspace',
    icon: MessageSquare,
    group: 'core',
    accent: {
      color: '#E8845F',
      activeBg: 'bg-[#FDEEE6]',
      activeText: 'text-[#C05A35]',
      activeBar: 'bg-[#E8845F]',
      hoverBg: 'hover:bg-[#FFF5F0]',
      iconActive: 'text-[#E8845F]',
    },
    badge: 'ai_dot', // Live activity dot
    matcher: (pathname) => pathname.startsWith('/workspace'),
  },
  // 4. My Plan (Plan, Schedule & Insights)
  {
    name: 'My Plan',
    path: '/plan',
    icon: Calendar,
    group: 'core',
    accent: {
      color: '#0D9488',
      activeBg: 'bg-[#CCFBF1]',
      activeText: 'text-[#0F766E]',
      activeBar: 'bg-[#0D9488]',
      hoverBg: 'hover:bg-[#F0FDFA]',
      iconActive: 'text-[#0D9488]',
    },
    badge: null,
    matcher: (pathname) => pathname.startsWith('/plan') || pathname.startsWith('/planner') || pathname.startsWith('/insights'),
  },
  // 5. Learning
  {
    name: 'Learning',
    path: '/learning',
    icon: GraduationCap,
    group: 'core',
    accent: {
      color: '#7C3AED',
      activeBg: 'bg-[#F1E9FF]',
      activeText: 'text-[#5B21B6]',
      activeBar: 'bg-[#7C3AED]',
      hoverBg: 'hover:bg-[#F7F3FF]',
      iconActive: 'text-[#7C3AED]',
    },
    badge: null,
    matcher: (pathname) => pathname.startsWith('/learning'),
  },

  // Growth & Planning Group (Track the work)
  {
    name: 'Game Arena',
    path: '/puzzles',
    icon: Puzzle,
    group: 'growth',
    accent: {
      color: '#E8845F',
      activeBg: 'bg-[#FDEEE6]',
      activeText: 'text-[#C05A35]',
      activeBar: 'bg-[#E8845F]',
      hoverBg: 'hover:bg-[#FFF5F0]',
      iconActive: 'text-[#E8845F]',
    },
    badge: null,
    matcher: (pathname) => pathname.startsWith('/puzzles'),
  },
  {
    name: 'Events',
    path: '/events',
    icon: CalendarDays,
    group: 'growth',
    accent: {
      color: '#10B981',
      activeBg: 'bg-[#D1FAE5]',
      activeText: 'text-[#047857]',
      activeBar: 'bg-[#10B981]',
      hoverBg: 'hover:bg-[#ECFDF5]',
      iconActive: 'text-[#10B981]',
    },
    badge: 'events_count', // Live numbered badge of logged events
    matcher: (pathname) => pathname.startsWith('/events') || pathname.startsWith('/arena'),
  },
  {
    name: 'DeepCode',
    path: '/deepcode',
    icon: Code2,
    group: 'growth',
    accent: {
      color: '#6366F1',
      activeBg: 'bg-[#EEF2FF]',
      activeText: 'text-[#4338CA]',
      activeBar: 'bg-[#6366F1]',
      hoverBg: 'hover:bg-[#F5F7FF]',
      iconActive: 'text-[#6366F1]',
    },
    badge: 'deepcode_badge',
    matcher: (pathname) => pathname.startsWith('/deepcode') || pathname.startsWith('/compiler'),
  },

  // System Group
  {
    name: 'Settings',
    path: '/settings',
    icon: Settings,
    group: 'system',
    accent: {
      color: '#64748B',
      activeBg: 'bg-[#F1F5F9]',
      activeText: 'text-[#334155]',
      activeBar: 'bg-[#64748B]',
      hoverBg: 'hover:bg-[#F8FAFC]',
      iconActive: 'text-[#475569]',
    },
    badge: null,
    matcher: (pathname) => pathname.startsWith('/settings'),
  },
]

export default function MainLayout() {
  const logout = useAuthStore((state) => state.logout)
  const user = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.accessToken)
  const { isOpen, openChat, closeChat, chatSeed } = useChatStore()
  const activeSourceIds = useSourceStore((state) => state.activeSourceIds) || []
  const fetchSources = useSourceStore((state) => state.fetchSources)
  const location = useLocation()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [hoveredItem, setHoveredItem] = useState(null)
  const [activeQuestsCount, setActiveQuestsCount] = useState(() => {
    try {
      const todayKey = `sw_quests_${new Date().toDateString()}`
      const saved = localStorage.getItem(todayKey)
      if (saved) {
        const quests = JSON.parse(saved)
        return quests.filter((q) => !q.completed).length
      }
    } catch {
      return 4
    }
    return 4
  })
  const [eventsCount, setEventsCount] = useState(() => {
    try {
      const savedEvents = localStorage.getItem('sourcewise_student_events')
      if (savedEvents) {
        const evts = JSON.parse(savedEvents)
        if (Array.isArray(evts)) return evts.length
      }
    } catch {
      return 3
    }
    return 3
  })
  const [railStreak, setRailStreak] = useState(null)
  const workspaceTotalNotifs = useWorkspaceStore((state) => state.notifications.total) || 0
  const isAnyWorkspaceGenerating = useWorkspaceStore((state) => Object.values(state.isGenerating).some(Boolean))
  const lastToast = useWorkspaceStore((state) => state.lastCompletedToast)
  const dismissToast = useWorkspaceStore((state) => state.dismissToast)

  // Sync counts and real-time events
  useEffect(() => {
    const updateEvents = () => {
      try {
        const savedEvents = localStorage.getItem('sourcewise_student_events')
        if (savedEvents) {
          const evts = JSON.parse(savedEvents)
          if (Array.isArray(evts)) setEventsCount(evts.length)
        }
      } catch {
        // Default to 3
      }
    }

    const updateQuests = () => {
      try {
        const todayKey = `sw_quests_${new Date().toDateString()}`
        const saved = localStorage.getItem(todayKey)
        if (saved) {
          const quests = JSON.parse(saved)
          setActiveQuestsCount(quests.filter((q) => !q.completed).length)
        }
      } catch {
        // Default
      }
    }

    window.addEventListener(EVENTS_CHANGED_EVENT, updateEvents)
    window.addEventListener('storage', updateEvents)
    window.addEventListener('storage', updateQuests)

    return () => {
      window.removeEventListener(EVENTS_CHANGED_EVENT, updateEvents)
      window.removeEventListener('storage', updateEvents)
      window.removeEventListener('storage', updateQuests)
    }
  }, [])

  // Rail footer: live streak (best effort, never blocks nav)
  useEffect(() => {
    if (!accessToken) return
    const headers = { Authorization: `Bearer ${accessToken}` }
    fetch(`${API_URL}/dashboard/overview`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((o) => {
        if (o && typeof o.streak === 'number') setRailStreak(o.streak)
      })
      .catch(() => {})
  }, [accessToken, location.pathname])

  // Global source library hydration
  useEffect(() => {
    if (accessToken) {
      fetchSources(accessToken)
    }
  }, [accessToken, fetchSources])

  // Render a single high-contrast nav link
  const renderNavItem = (item) => {
    const isActive = item.matcher(location.pathname)
    const Icon = item.icon
    const { accent } = item

    return (
      <div key={item.name} className="relative">
        <Link
          to={item.path}
          onMouseEnter={() => setHoveredItem(item.name)}
          onMouseLeave={() => setHoveredItem(null)}
          className={`relative min-h-[40px] flex items-center rounded-xl transition-all duration-150 group outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            isSidebarCollapsed ? 'justify-center w-10 h-10 mx-auto' : 'px-3 py-2 space-x-2.5 w-full'
          } ${
            isActive
              ? `${accent.activeBg} font-bold shadow-[0_1px_3px_rgba(0,0,0,0.04)]`
              : `text-[#2C2520] ${accent.hoverBg} hover:text-[#1E1B16] font-medium`
          }`}
          aria-current={isActive ? 'page' : undefined}
          aria-label={item.name}
        >
          {/* Signal 3A: Physical Left Accent Bar Indicator */}
          {isActive && (
            <motion.div
              layoutId="nav-active-indicator"
              className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full ${accent.activeBar}`}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            />
          )}

          {/* Signal 1: Distinct Icon with Badges & Accent Color */}
          <div className="relative shrink-0 flex items-center justify-center">
            <Icon
              className={`w-5 h-5 transition-colors duration-150 ${
                isActive ? accent.iconActive : 'text-[#4B5563] group-hover:text-[#1E1B16]'
              }`}
              strokeWidth={isActive ? 2.3 : 1.9}
            />

            {/* Live Badge: Student Events Count */}
            {item.badge === 'events_count' && eventsCount > 0 && (
              <span 
                className="absolute -top-1.5 -right-2 min-w-[17px] h-[17px] px-1 bg-[#10B981] text-white text-[10px] font-extrabold rounded-full flex items-center justify-center ring-2 ring-white shadow-xs"
                title={`${eventsCount} events logged`}
              >
                {eventsCount}
              </span>
            )}

            {/* Live Badge: Arena Available Quests */}
            {item.badge === 'quests_count' && activeQuestsCount > 0 && (
              <span 
                className="absolute -top-1.5 -right-2 min-w-[17px] h-[17px] px-1 bg-[#10B981] text-white text-[10px] font-extrabold rounded-full flex items-center justify-center ring-2 ring-white shadow-xs"
                title={`${activeQuestsCount} quests available`}
              >
                {activeQuestsCount}
              </span>
            )}

            {/* Live Badge: AI Workspace Activity Dot & Completed Notification Count */}
            {item.badge === 'ai_dot' && (
              workspaceTotalNotifs > 0 ? (
                <span 
                  className="absolute -top-1.5 -right-2 min-w-[17px] h-[17px] px-1 bg-[#10B981] text-white text-[10px] font-extrabold rounded-full flex items-center justify-center ring-2 ring-white shadow-xs animate-bounce"
                  title={`${workspaceTotalNotifs} completed materials ready`}
                >
                  {workspaceTotalNotifs}
                </span>
              ) : isAnyWorkspaceGenerating ? (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5" title="AI generating in background...">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E8845F] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#E8845F] ring-2 ring-white" />
                </span>
              ) : null
            )}

            {/* Live Badge: DeepCode Live Pulse Dot */}
            {item.badge === 'deepcode_badge' && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6366F1] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#6366F1] ring-2 ring-white" />
              </span>
            )}
          </div>

          {/* Signal 2: High Contrast Label Text (always visible in expanded state) */}
          {!isSidebarCollapsed && (
            <span
              className={`text-[14px] leading-tight truncate tracking-tight transition-colors ${
                isActive ? accent.activeText : 'text-[#2C2520] group-hover:text-[#1A1410]'
              }`}
            >
              {item.name}
            </span>
          )}
        </Link>

        {/* Floating Tooltip in Collapsed Mode */}
        {isSidebarCollapsed && hoveredItem === item.name && (
          <div className="fixed left-[96px] px-3 py-1.5 bg-[#1E1B16] text-white text-xs font-semibold rounded-xl shadow-xl z-50 whitespace-nowrap pointer-events-none flex items-center gap-2 border border-white/10 backdrop-blur-md">
            <span>{item.name}</span>
            {item.badge === 'quests_count' && activeQuestsCount > 0 && (
              <span className="bg-[#10B981] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {activeQuestsCount} quests
              </span>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen sw-page flex flex-col md:flex-row font-sans relative">
      {/* Sidebar Navigation - Floating Island / Unattached Glassmorphic Rail */}
      <div className="sticky top-0 h-screen hidden md:flex items-center pl-4 py-3.5 z-30 shrink-0">
        <motion.aside
          animate={{ width: isSidebarCollapsed ? '76px' : '260px' }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="h-full bg-white/85 backdrop-blur-2xl border border-[#EDE7E1]/90 rounded-[28px] shadow-[0_16px_40px_-10px_rgba(30,27,22,0.07),0_4px_16px_-4px_rgba(30,27,22,0.03)] ring-1 ring-white/90 flex flex-col select-none overflow-hidden relative"
        >
          <div className="flex-1 flex flex-col justify-between p-3.5 overflow-y-auto overflow-x-hidden">
            
            {/* Top Section: Logo & Nav Links */}
            <div className="space-y-4">
              {/* Logo & Brand */}
              <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} px-1`}>
                <Link to="/dashboard" className="flex items-center space-x-3 group focus:outline-none">
                  <div className="w-9 h-9 rounded-xl bg-white border border-[#EDE7E1] shadow-xs flex items-center justify-center p-1 group-hover:border-[#E8845F]/40 transition-colors">
                    <img
                      src="/logo-mark.png"
                      alt="SourceWise Fox mascot"
                      className="w-7 h-7 object-contain"
                    />
                  </div>
                  {!isSidebarCollapsed && (
                    <motion.div
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex flex-col"
                    >
                      <img
                        src="/text.png"
                        alt="SourceWise"
                        className="h-8 w-auto object-contain object-left"
                      />
                    </motion.div>
                  )}
                </Link>
              </div>

              {/* Navigation Links */}
              <nav className="flex flex-col space-y-1.5">
                {NAV_SECTIONS.map(renderNavItem)}
              </nav>
            </div>

            {/* Profile Card & Bottom Controls */}
            <div className="pt-2 space-y-3">

              {/* Elegant User Profile Card */}
              <div className={`group relative bg-white/90 backdrop-blur-sm border border-[#EDE7E1] rounded-2xl shadow-[0_2px_8px_rgba(30,27,22,0.03),0_1px_2px_rgba(30,27,22,0.02)] hover:shadow-[0_4px_16px_rgba(30,27,22,0.06)] hover:border-[#DFD6CD] transition-all duration-200 ${
                isSidebarCollapsed ? 'p-2 flex flex-col items-center' : 'p-3'
              }`}>
                <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between gap-2.5'}`}>
                  
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Avatar with subtle warm gradient & glow */}
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FFF0E8] via-[#FDE6DA] to-[#F7D4C2] flex items-center justify-center border border-[#F3C5B1]/70 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_4px_rgba(192,90,53,0.1)]">
                        <span className="text-[13px] font-bold text-[#C05A35] select-none tracking-tight">
                          {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
                        </span>
                      </div>
                      {/* Active Presence Dot */}
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white shadow-xs"
                        title="Companion Active"
                      />
                    </div>

                    {/* Identity: Name & Email */}
                    {!isSidebarCollapsed && (
                      <div className="truncate min-w-0 flex-1">
                        <p className="text-[13px] font-bold text-[#1E1B16] truncate tracking-tight leading-snug">
                          {user?.name || 'Scholar'}
                        </p>
                        <p className="text-[11px] text-[#8C827A] truncate font-medium leading-tight mt-0.5">
                          {user?.email || 'scholar@sourcewise.ai'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Sign Out Action Button */}
                  {!isSidebarCollapsed && (
                    <button
                      onClick={logout}
                      className="p-1.5 text-[#9CA3AF] hover:text-[#C05A35] hover:bg-[#FDEEE6] rounded-xl transition-all duration-150 shrink-0 group/logout"
                      title="Sign Out"
                      aria-label="Sign Out"
                    >
                      <LogOut className="w-3.5 h-3.5 group-hover/logout:translate-x-0.5 transition-transform" />
                    </button>
                  )}
                </div>

                {/* Badge & Streak Footer Row */}
                {!isSidebarCollapsed && (
                  <div className="mt-2.5 pt-2 border-t border-[#F5EFEA] flex items-center justify-between gap-1.5">
                    {/* Badge */}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-[#F5F3FF] text-[#6D28D9] border border-[#DDD6FE]/70 rounded-full shrink-0">
                      <GraduationCap className="w-3 h-3 text-[#7C3AED]" />
                      Scholar
                    </span>

                    {/* Streak */}
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-[#FFF1EB] text-[#C05A35] border border-[#FCD8CB] rounded-full shrink-0 tabular-nums"
                      title={`${railStreak !== null && railStreak > 0 ? railStreak : 1} day study streak`}
                    >
                      <span>🔥</span>
                      <span>{railStreak !== null && railStreak > 0 ? `${railStreak}d streak` : '1d streak'}</span>
                    </span>
                  </div>
                )}

                {/* Collapsed Sidebar Hover Popover */}
                {isSidebarCollapsed && (
                  <div className="fixed left-[96px] bottom-14 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50">
                    <div className="bg-[#1E1B16] text-white rounded-2xl shadow-2xl p-3 min-w-[200px] border border-white/10 text-xs backdrop-blur-md">
                      <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
                        <div className="truncate pr-2">
                          <p className="font-bold truncate text-[13px]">{user?.name || 'Scholar'}</p>
                          <p className="text-[11px] text-gray-400 truncate mt-0.5">{user?.email || 'scholar@sourcewise.ai'}</p>
                        </div>
                        <button
                          onClick={logout}
                          className="p-1 hover:text-red-400 rounded-md transition-colors"
                          title="Sign Out"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-white/10 text-purple-200 rounded-full border border-white/10">
                          <GraduationCap className="w-3 h-3" />
                          Scholar
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-[#C05A35]/20 text-[#FFA07A] rounded-full border border-[#C05A35]/40">
                          🔥 {railStreak !== null && railStreak > 0 ? `${railStreak}d streak` : '1d streak'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Collapse / Expand Toggle Button */}
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="w-full h-8 flex items-center justify-center gap-2 rounded-xl text-xs font-semibold text-[#6B625C] hover:text-[#1E1B16] hover:bg-[#F0EAE4]/60 border border-transparent hover:border-[#EDE7E1] transition-all"
                title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse to icon rail'}
                aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse to icon rail'}
              >
                {isSidebarCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <>
                    <ChevronLeft className="w-4 h-4" />
                    <span className="text-[11px]">Collapse Sidebar</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </motion.aside>
      </div>

      {/* Main Page Content */}
      <main className="flex-1 p-6 lg:p-8 overflow-auto relative">
        <Outlet />
      </main>

      {/* Floating Fox Companion Mascot Trigger (Corner FAB) */}
      <FloatingFoxCompanion onClick={() => openChat()} activeCount={activeSourceIds.length} />

      {/* Pure Overlay Study Chat Panel */}
      <GlobalChatPanel
        open={isOpen}
        onClose={closeChat}
        sourceIds={activeSourceIds}
        contextLabel={activeSourceIds.length ? `${activeSourceIds.length} source${activeSourceIds.length === 1 ? '' : 's'} in context` : 'Personal study companion'}
        seed={chatSeed}
      />

      {/* Floating Background Task Completion Alert Toast */}
      {lastToast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-white/95 backdrop-blur-md border border-[#E8845F]/40 shadow-xl px-4 py-3 rounded-2xl max-w-sm animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="w-9 h-9 rounded-xl bg-[#FDEEE6] text-[#C05A35] flex items-center justify-center font-bold text-base shrink-0 ring-2 ring-[#E8845F]/20">
            ✨
          </div>
          <div className="flex-1 min-w-0">
            <h5 className="text-xs font-bold text-[#1E1B16] truncate">{lastToast.title}</h5>
            <p className="text-[11px] text-[#5B544E] line-clamp-2 leading-tight mt-0.5">{lastToast.message}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              to={`/workspace/${lastToast.mode}`}
              onClick={dismissToast}
              className="sw-btn-primary !h-7 !px-3 !text-[11px] font-semibold flex items-center shadow-xs"
            >
              Open
            </Link>
            <button
              type="button"
              onClick={dismissToast}
              className="text-[#8A817B] hover:text-[#1E1B16] p-1 text-xs rounded-md transition-colors"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
