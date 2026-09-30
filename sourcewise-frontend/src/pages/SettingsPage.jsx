import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Brain, Bell, Palette, Shield, Save, CheckCircle2,
  Key, Download, Volume2, Clock, Target, RotateCcw,
  Eye, EyeOff, Laptop, Moon, Sun, Check, AlertCircle, Trash2
} from 'lucide-react'
import { GlowCard } from '../components/ui/glow-card'
import { useAuthStore } from '../store/authStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const AI_MODES = [
  {
    id: 'friendly',
    name: 'Friendly',
    role: 'Warm & Encouraging Companion',
    desc: 'Celebrates your progress, explains concepts in clear everyday language, and keeps learning engaging and stress-free.',
    icon: '😊',
  },
  {
    id: 'tutor',
    name: 'Tutor',
    role: 'Structured & Direct Instruction',
    desc: 'Provides structured explanations, worked examples, and comprehensive breakdowns to help you master core concepts.',
    icon: '🎓',
  },
  {
    id: 'mentor',
    name: 'Mentor',
    role: 'Socratic Inquiry & Deep Thinking',
    desc: 'Guides you with probing questions instead of immediate answers, helping you deduce solutions from first principles.',
    icon: '💡',
  },
]

export default function SettingsPage() {
  const { user, accessToken } = useAuthStore()
  const [activeTab, setActiveTab] = useState('profile')
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveToast, setSaveToast] = useState(false)
  const [saveMessage, setSaveMessage] = useState('Settings saved successfully!')

  // --- 1. Profile State ---
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [bio, setBio] = useState('')
  const [academicLevel, setAcademicLevel] = useState('undergraduate')
  const [fieldOfStudy, setFieldOfStudy] = useState('Computer Science')
  const [weeklyHours, setWeeklyHours] = useState(14)
  const [studyRhythm, setStudyRhythm] = useState('night_owl')

  // --- 2. AI Companion State ---
  const [aiPersona, setAiPersona] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('sw_ai_persona') : null
    if (saved && ['friendly', 'tutor', 'mentor'].includes(saved)) return saved
    return 'tutor'
  })
  const [responseDepth, setResponseDepth] = useState('balanced')
  const [autoFlashcards, setAutoFlashcards] = useState(true)
  const [quizRigor, setQuizRigor] = useState('balanced')

  // --- 3. Notification & Study Habits State ---
  const [dailyReminders, setDailyReminders] = useState(true)
  const [reminderTime, setReminderTime] = useState('20:00')
  const [reminderDays, setReminderDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
  const [dueCardsAlert, setDueCardsAlert] = useState(true)
  const [targetRetention, setTargetRetention] = useState('90')
  const [sessionChime, setSessionChime] = useState(true)
  const [breakChime, setBreakChime] = useState(true)
  const [streakLossAlert, setStreakLossAlert] = useState(true)

  // --- 4. Appearance & Accessibility State ---
  const [themeMode, setThemeMode] = useState('light')
  const [accentColor, setAccentColor] = useState('coral')
  const [fontSize, setFontSize] = useState('medium')
  const [animations, setAnimations] = useState(true)
  const [soundEffects, setSoundEffects] = useState(true)
  const [soundVolume, setSoundVolume] = useState(80)

  // --- 5. Security & Password State ---
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)

  // Load settings from backend on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_URL}/settings`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
        if (res.ok) {
          const data = await res.json()
          
          if (data.profile) {
            if (data.profile.academicLevel) setAcademicLevel(data.profile.academicLevel)
            if (data.profile.fieldOfStudy) setFieldOfStudy(data.profile.fieldOfStudy)
            if (data.profile.weeklyHours) setWeeklyHours(data.profile.weeklyHours)
            if (data.profile.studyRhythm) setStudyRhythm(data.profile.studyRhythm)
          }
          if (data.bio) setBio(data.bio)

          if (data.ai) {
            if (data.ai.persona) {
              const p = String(data.ai.persona).toLowerCase()
              if (['friendly', 'tutor', 'mentor'].includes(p)) {
                setAiPersona(p)
              } else if (p === 'kitsune' || p === 'feynman') {
                setAiPersona('friendly')
              } else if (p === 'coach') {
                setAiPersona('tutor')
              } else if (p === 'socratic') {
                setAiPersona('mentor')
              } else {
                setAiPersona('tutor')
              }
            }
            if (data.ai.responseDepth) setResponseDepth(data.ai.responseDepth)
            if (data.ai.autoFlashcards !== undefined) setAutoFlashcards(data.ai.autoFlashcards)
            if (data.ai.quizRigor) setQuizRigor(data.ai.quizRigor)
          }

          if (data.notifications) {
            if (data.notifications.dailyReminders !== undefined) setDailyReminders(data.notifications.dailyReminders)
            if (data.notifications.reminderTime) setReminderTime(data.notifications.reminderTime)
            if (data.notifications.reminderDays) setReminderDays(data.notifications.reminderDays)
            if (data.notifications.dueCardsAlert !== undefined) setDueCardsAlert(data.notifications.dueCardsAlert)
            if (data.notifications.targetRetention) setTargetRetention(data.notifications.targetRetention)
            if (data.notifications.sessionChime !== undefined) setSessionChime(data.notifications.sessionChime)
            if (data.notifications.breakChime !== undefined) setBreakChime(data.notifications.breakChime)
            if (data.notifications.streakLossAlert !== undefined) setStreakLossAlert(data.notifications.streakLossAlert)
          }

          if (data.appearance) {
            if (data.appearance.themeMode) setThemeMode(data.appearance.themeMode)
            if (data.appearance.accentColor) setAccentColor(data.appearance.accentColor)
            if (data.appearance.fontSize) {
              setFontSize(data.appearance.fontSize)
              applyFontSize(data.appearance.fontSize)
            }
            if (data.appearance.animations !== undefined) {
              setAnimations(data.appearance.animations)
              applyAnimations(data.appearance.animations)
            }
            if (data.appearance.soundEffects !== undefined) setSoundEffects(data.appearance.soundEffects)
            if (data.appearance.soundVolume !== undefined) setSoundVolume(data.appearance.soundVolume)
          }
        }
      } catch (err) {
        console.error('[Settings] Fetch error:', err)
      }
    }

    if (user) {
      setName(user.name || '')
      setEmail(user.email || '')
    }
    fetchSettings()
  }, [accessToken, user])

  // Apply font size live
  const applyFontSize = (size) => {
    document.documentElement.style.fontSize = size === 'small' ? '14px' : size === 'large' ? '18px' : '16px'
  }

  // Apply motion reduction live
  const applyAnimations = (enabled) => {
    if (!enabled) {
      document.documentElement.classList.add('reduce-motion')
    } else {
      document.documentElement.classList.remove('reduce-motion')
    }
  }

  // Web Audio Chime Preview
  const playTestChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      const ctx = new AudioCtx()
      if (ctx.state === 'suspended') ctx.resume()

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const vol = (soundVolume / 100) * 0.15

      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12) // A5
      osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.3) // D6

      gain.gain.setValueAtTime(vol, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.85)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start()
      osc.stop(ctx.currentTime + 0.85)
    } catch (e) {
      console.warn('Audio chime test error:', e)
    }
  }

  // Save Settings Handler
  const handleSaveAll = async () => {
    setSaveLoading(true)
    try {
      // 1. Update Profile Information in Supabase
      const profileRes = await fetch(`${API_URL}/settings/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name, email, bio }),
      })

      if (profileRes.ok) {
        // Sync auth store live so header and sidebar update instantly
        useAuthStore.setState((state) => ({
          user: { ...state.user, name, email },
        }))
      }

      // 2. Update Comprehensive Preferences Object
      const settingsPayload = {
        bio,
        profile: {
          academicLevel,
          fieldOfStudy,
          weeklyHours,
          studyRhythm,
        },
        ai: {
          persona: aiPersona,
          responseDepth,
          autoFlashcards,
          quizRigor,
        },
        notifications: {
          dailyReminders,
          reminderTime,
          reminderDays,
          dueCardsAlert,
          targetRetention,
          sessionChime,
          breakChime,
          streakLossAlert,
        },
        appearance: {
          themeMode,
          accentColor,
          fontSize,
          animations,
          soundEffects,
          soundVolume,
        },
      }

      const settingsRes = await fetch(`${API_URL}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(settingsPayload),
      })

      // Apply live UI adjustments
      applyFontSize(fontSize)
      applyAnimations(animations)
      localStorage.setItem('sw_ai_persona', aiPersona)

      if (settingsRes.ok) {
        setSaveMessage('All preferences saved and synchronized!')
        setSaveToast(true)
        setTimeout(() => setSaveToast(false), 3500)
      }
    } catch (err) {
      console.error('[Settings] Save error:', err)
      setSaveMessage('Failed to save settings. Please try again.')
      setSaveToast(true)
      setTimeout(() => setSaveToast(false), 3500)
    } finally {
      setSaveLoading(false)
    }
  }

  // Password Change Handler
  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (!currentPassword || !newPassword) {
      setPasswordError('Please enter both current and new password.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.')
      return
    }

    setPasswordLoading(true)
    try {
      const res = await fetch(`${API_URL}/settings/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()

      if (!res.ok) {
        setPasswordError(data.error || 'Failed to update password.')
      } else {
        setPasswordSuccess('Password successfully updated!')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch (err) {
      setPasswordError('Network error while updating password.')
    } finally {
      setPasswordLoading(false)
    }
  }

  // Data Export Handler
  const handleExportData = async () => {
    setExporting(true)
    try {
      const res = await fetch(`${API_URL}/settings/export`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error('Data export failed')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sourcewise-study-archive-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      setExportSuccess(true)
      setTimeout(() => setExportSuccess(false), 4000)
    } catch (err) {
      console.error('[Settings] Export error:', err)
      alert('Could not export study data. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const toggleDay = (day) => {
    setReminderDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  const tabs = [
    { id: 'profile', label: 'Profile & Academic', icon: User, note: 'Identity & Goals' },
    { id: 'ai', label: 'AI Study Companion', icon: Brain, note: 'Friendly, Tutor, Mentor' },
    { id: 'notifications', label: 'Habits & Alerts', icon: Bell, note: 'Schedule & Chimes' },
    // ARCHIVED:
    // { id: 'appearance', label: 'Appearance & Sound', icon: Palette, note: 'Theme & Font' },
    { id: 'security', label: 'Security & Data', icon: Shield, note: 'Password & Export' },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-7 pb-16">
      
      {/* Page Header with Save Button & Toast */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest border border-outline-variant/30 rounded-3xl p-6 shadow-xs relative overflow-hidden"
      >
        <div className="pointer-events-none absolute -right-12 -top-12 w-64 h-64 bg-primary-fixed/25 rounded-full blur-3xl -z-10" />

        <div>
          <h1 className="text-2xl font-bold font-headline-md tracking-tight text-[#1E1B16]">
            Settings & Study Preferences
          </h1>
          <p className="text-sm text-[#5B544E] mt-0.5">
            Personalize your AI companion, schedule alerts, and manage account security.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <AnimatePresence>
            {saveToast && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{saveMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={handleSaveAll}
            disabled={saveLoading}
            className="h-11 px-6 rounded-full bg-[#E8845F] hover:bg-[#C05A35] text-white font-bold text-sm shadow-[0_4px_14px_-2px_rgba(232,132,95,0.4)] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-70"
          >
            {saveLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Save All Changes</span>
          </button>
        </div>
      </motion.div>

      {/* Main Grid: Navigation Tabs & Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">

        {/* Sidebar Nav Tabs */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-4 space-y-1.5"
        >
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl p-3 shadow-xs space-y-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full min-h-[50px] flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-left transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-[#FDEEE6] text-[#C05A35] font-bold shadow-xs'
                      : 'text-[#2C2520] hover:bg-[#F5EFEA] hover:text-[#1E1B16] font-medium'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-[#E8845F] text-white' : 'bg-surface-container-high text-[#5B544E]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm leading-snug">{tab.label}</p>
                      <p className="text-[11px] font-normal text-[#7C726A]">{tab.note}</p>
                    </div>
                  </div>

                  {isActive && (
                    <div className="w-1.5 h-5 rounded-full bg-[#E8845F]" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Persistent Scholar Growth Badge */}
          <div className="p-4 rounded-3xl bg-white border border-[#EDE7E1] shadow-xs flex items-center gap-3 mt-4">
            <div className="w-11 h-11 rounded-2xl bg-[#FDEEE6] border border-[#F5C7B5] flex items-center justify-center shrink-0">
              <img src="/logo-mark.png" alt="Fox companion" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#1E1B16]">Companion Linked</p>
              <p className="text-[11px] font-medium text-[#10B981] flex items-center gap-1">
                Level 2 Scholar • Online
              </p>
            </div>
          </div>
        </motion.div>

        {/* Tab Content Panels */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-8"
        >
          
          {/* TAB 1: PROFILE & ACADEMIC */}
          {activeTab === 'profile' && (
            <GlowCard className="p-6 space-y-6" glowColor="amber" intensity="sm">
              <div className="border-b border-[#EDE7E1] pb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#FDEEE6] flex items-center justify-center text-[#E8845F]">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base text-[#1E1B16]">Academic Profile & Identity</h2>
                    <p className="text-xs text-[#6B625C]">Information used to tailor study plans and recommendations</p>
                  </div>
                </div>
              </div>


              {/* Basic Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1E1B16] mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Deepan D"
                    className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#EDE7E1] focus:border-[#E8845F] focus:ring-2 focus:ring-[#E8845F]/20 text-sm font-medium text-[#1E1B16] outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1E1B16] mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@university.edu"
                    className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#EDE7E1] focus:border-[#E8845F] focus:ring-2 focus:ring-[#E8845F]/20 text-sm font-medium text-[#1E1B16] outline-none transition-all"
                  />
                </div>
              </div>

              {/* Academic Level & Field */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1E1B16] mb-1.5">
                    Academic Stage
                  </label>
                  <select
                    value={academicLevel}
                    onChange={(e) => setAcademicLevel(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#EDE7E1] focus:border-[#E8845F] focus:ring-2 focus:ring-[#E8845F]/20 text-sm font-medium text-[#1E1B16] outline-none transition-all cursor-pointer"
                  >
                    <option value="highschool">High School (AP / IB)</option>
                    <option value="undergraduate">Undergraduate / College</option>
                    <option value="graduate">Graduate / Master's Degree</option>
                    <option value="medical_law">Medical / Law School</option>
                    <option value="phd">PhD / Doctoral Candidate</option>
                    <option value="professional">Lifelong Professional</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1E1B16] mb-1.5">
                    Field of Study / Discipline
                  </label>
                  <input
                    type="text"
                    value={fieldOfStudy}
                    onChange={(e) => setFieldOfStudy(e.target.value)}
                    placeholder="e.g. Cognitive Science, Engineering, Medicine"
                    className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#EDE7E1] focus:border-[#E8845F] focus:ring-2 focus:ring-[#E8845F]/20 text-sm font-medium text-[#1E1B16] outline-none transition-all"
                  />
                </div>
              </div>

              {/* Target Weekly Study Hours & Rhythm */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-[#1E1B16]">
                      Target Weekly Study Hours
                    </label>
                    <span className="text-xs font-bold text-[#E8845F]">{weeklyHours} hrs/week</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="50"
                    step="1"
                    value={weeklyHours}
                    onChange={(e) => setWeeklyHours(parseInt(e.target.value, 10))}
                    className="w-full accent-[#E8845F] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[#7C726A] mt-1">
                    <span>Casual (5h)</span>
                    <span>Standard (15h)</span>
                    <span>Intensive (35h+)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1E1B16] mb-1.5">
                    Peak Study Rhythm
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'early_bird', label: '🌅 Early Bird', sub: 'Morning Focus' },
                      { id: 'night_owl', label: '🌙 Night Owl', sub: 'Late Focus' },
                    ].map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setStudyRhythm(r.id)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          studyRhythm === r.id
                            ? 'bg-[#FDEEE6] border-[#E8845F] text-[#C05A35] font-bold'
                            : 'bg-white border-[#EDE7E1] text-[#5B544E] hover:bg-[#FAF6F2]'
                        }`}
                      >
                        <p className="text-xs">{r.label}</p>
                        <p className="text-[10px] font-normal text-[#7C726A]">{r.sub}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bio / Study Philosophy */}
              <div>
                <label className="block text-xs font-bold text-[#1E1B16] mb-1.5">
                  Bio / Study Philosophy
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder="Tell us about your learning journey or primary academic goals..."
                  className="w-full p-3 rounded-xl bg-white border border-[#EDE7E1] focus:border-[#E8845F] focus:ring-2 focus:ring-[#E8845F]/20 text-sm font-medium text-[#1E1B16] outline-none transition-all resize-none"
                />
              </div>
            </GlowCard>
          )}

          {/* TAB 2: AI STUDY COMPANION */}
          {activeTab === 'ai' && (
            <GlowCard className="p-6 space-y-6" glowColor="amber" intensity="sm">
              <div className="border-b border-[#EDE7E1] pb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#FDEEE6] flex items-center justify-center text-[#E8845F]">
                    <Brain className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base text-[#1E1B16]">AI Companion Mode</h2>
                    <p className="text-xs text-[#6B625C]">Choose your preferred AI interaction mode</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>AI Ready</span>
                </div>
              </div>

              {/* Mode Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6B625C] mb-3">
                  Select Mode
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {AI_MODES.map((m) => {
                    const isSelected = aiPersona === m.id
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setAiPersona(m.id)}
                        className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between relative ${
                          isSelected
                            ? 'bg-[#FDEEE6] border-[#E8845F] ring-2 ring-[#E8845F]/30 shadow-xs'
                            : 'bg-white border-[#EDE7E1] hover:bg-[#FAF6F2] hover:border-[#D1C7BD]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2.5">
                              <span className="text-2xl">{m.icon}</span>
                              <h3 className={`text-base font-bold ${isSelected ? 'text-[#C05A35]' : 'text-[#1E1B16]'}`}>
                                {m.name}
                              </h3>
                            </div>
                            {isSelected && (
                              <span className="w-6 h-6 rounded-full bg-[#E8845F] text-white flex items-center justify-center text-xs shadow-xs">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-[#E8845F] mb-2">{m.role}</p>
                          <p className="text-xs text-[#5B544E] leading-relaxed">{m.desc}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </GlowCard>
          )}

          {/* TAB 3: STUDY HABITS & NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <GlowCard className="p-6 space-y-6" glowColor="amber" intensity="sm">
              <div className="border-b border-[#EDE7E1] pb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#FDEEE6] flex items-center justify-center text-[#E8845F]">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base text-[#1E1B16]">Study Habits & Notification Triggers</h2>
                    <p className="text-xs text-[#6B625C]">Keep your study streak protected and configure flow chimes</p>
                  </div>
                </div>
              </div>

              {/* Daily Reminder Master & Time Picker */}
              <div className="p-4 bg-white rounded-2xl border border-[#EDE7E1] space-y-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-[#1E1B16]">Daily Study Session Reminders</p>
                    <p className="text-xs text-[#6B625C] mt-0.5">Receive gentle daily prompt notifications to start your session</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDailyReminders(!dailyReminders)}
                    className={`w-12 h-6.5 rounded-full transition-all cursor-pointer relative p-0.5 ${
                      dailyReminders ? 'bg-[#E8845F]' : 'bg-[#E5DFD9]'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                        dailyReminders ? 'translate-x-5.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {dailyReminders && (
                  <div className="pt-3 border-t border-[#F5EFEA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#E8845F]" />
                      <span className="text-xs font-semibold text-[#1E1B16]">Preferred Notification Time:</span>
                      <input
                        type="time"
                        value={reminderTime}
                        onChange={(e) => setReminderTime(e.target.value)}
                        className="px-2.5 py-1 rounded-lg border border-[#EDE7E1] bg-[#FAF6F2] text-xs font-bold text-[#1E1B16] outline-none"
                      />
                    </div>

                    {/* Active Days Pills */}
                    <div className="flex items-center gap-1">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                        const isSelected = reminderDays.includes(day)
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleDay(day)}
                            className={`w-7 h-7 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center ${
                              isSelected
                                ? 'bg-[#E8845F] text-white shadow-xs'
                                : 'bg-[#FAF6F2] text-[#7C726A] hover:bg-[#F0EAE4]'
                            }`}
                          >
                            {day.charAt(0)}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Spaced Repetition Retention Target */}
              <div className="p-4 bg-white rounded-2xl border border-[#EDE7E1] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-[#1E1B16]">FSRS Spaced Repetition Target Retention</p>
                    <p className="text-xs text-[#6B625C] mt-0.5">Controls the memory decay curve calculation for review scheduling</p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#CCFBF1] text-[#0F766E]">
                    {targetRetention}% Retention
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  {[
                    { val: '85', label: '85% Balanced', sub: 'Longer intervals, fewer reviews' },
                    { val: '90', label: '90% Recommended', sub: 'Optimal study-to-recall ratio' },
                    { val: '95', label: '95% High Mastery', sub: 'Frequent checkpoints, top exam prep' },
                  ].map((ret) => (
                    <button
                      key={ret.val}
                      type="button"
                      onClick={() => setTargetRetention(ret.val)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        targetRetention === ret.val
                          ? 'bg-[#CCFBF1] border-[#0D9488] text-[#0F766E] font-bold'
                          : 'bg-white border-[#EDE7E1] text-[#5B544E] hover:bg-[#FAF6F2]'
                      }`}
                    >
                      <p className="text-xs">{ret.label}</p>
                      <p className="text-[10px] font-normal text-[#7C726A] mt-0.5">{ret.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Audio Chimes & Pomodoro Signals */}
              <div className="p-4 bg-white rounded-2xl border border-[#EDE7E1] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-[#1E1B16]">Focus Flow & Pomodoro Chimes</p>
                    <p className="text-xs text-[#6B625C] mt-0.5">Auditory cues signaling the end of flow sprints and recovery breaks</p>
                  </div>
                  <button
                    type="button"
                    onClick={playTestChime}
                    className="px-3 py-1.5 rounded-xl bg-[#FAF6F2] hover:bg-[#F0EAE4] border border-[#EDE7E1] text-xs font-bold text-[#E8845F] flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                    title="Play ascending harmonic chime"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Test Chime</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF6F2] border border-[#EDE7E1]">
                    <span className="text-xs font-semibold text-[#1E1B16]">Flow sprint complete sound</span>
                    <button
                      type="button"
                      onClick={() => setSessionChime(!sessionChime)}
                      className={`w-10 h-5.5 rounded-full transition-all cursor-pointer relative p-0.5 ${
                        sessionChime ? 'bg-[#E8845F]' : 'bg-[#E5DFD9]'
                      }`}
                    >
                      <div
                        className={`w-4.5 h-4.5 rounded-full bg-white shadow-sm transform transition-transform ${
                          sessionChime ? 'translate-x-4.5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF6F2] border border-[#EDE7E1]">
                    <span className="text-xs font-semibold text-[#1E1B16]">Break finish alert sound</span>
                    <button
                      type="button"
                      onClick={() => setBreakChime(!breakChime)}
                      className={`w-10 h-5.5 rounded-full transition-all cursor-pointer relative p-0.5 ${
                        breakChime ? 'bg-[#E8845F]' : 'bg-[#E5DFD9]'
                      }`}
                    >
                      <div
                        className={`w-4.5 h-4.5 rounded-full bg-white shadow-sm transform transition-transform ${
                          breakChime ? 'translate-x-4.5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Streak Protection Warning */}
              <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#EDE7E1]">
                <div>
                  <p className="text-sm font-bold text-[#1E1B16]">Streak Loss Prevention Alert</p>
                  <p className="text-xs text-[#6B625C] mt-0.5">Notify 2 hours prior to midnight if daily study goals are incomplete</p>
                </div>
                <button
                  type="button"
                  onClick={() => setStreakLossAlert(!streakLossAlert)}
                  className={`w-12 h-6.5 rounded-full transition-all cursor-pointer relative p-0.5 ${
                    streakLossAlert ? 'bg-[#E8845F]' : 'bg-[#E5DFD9]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                      streakLossAlert ? 'translate-x-5.5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </GlowCard>
          )}

          {/* TAB 4: APPEARANCE & DISPLAY (ARCHIVED) */}
          {false && activeTab === 'appearance' && (
            <GlowCard className="p-6 space-y-6" glowColor="amber" intensity="sm">
              <div className="border-b border-[#EDE7E1] pb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#FDEEE6] flex items-center justify-center text-[#E8845F]">
                    <Palette className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base text-[#1E1B16]">Appearance & Display Styling</h2>
                    <p className="text-xs text-[#6B625C]">Tailor font sizing, themes, and motion effects to your study environment</p>
                  </div>
                </div>
              </div>

              {/* Theme Canvas Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6B625C] mb-3">
                  Theme Canvas
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'light', label: 'Warm Light', icon: Sun, desc: 'Warm paper tint' },
                    { id: 'dark', label: 'Midnight Dark', icon: Moon, desc: 'Low-light study' },
                    { id: 'system', label: 'System Auto', icon: Laptop, desc: 'Match device OS' },
                  ].map((t) => {
                    const Icon = t.icon
                    const isSelected = themeMode === t.id
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setThemeMode(t.id)}
                        className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                          isSelected
                            ? 'bg-[#FDEEE6] border-[#E8845F] text-[#C05A35] font-bold shadow-xs'
                            : 'bg-white border-[#EDE7E1] text-[#5B544E] hover:bg-[#FAF6F2]'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-xs font-bold mt-1">{t.label}</span>
                        <span className="text-[10px] text-[#7C726A]">{t.desc}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Accent Color Palette */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6B625C] mb-3">
                  Signature Accent Palette
                </label>
                <div className="grid grid-cols-5 gap-2.5">
                  {[
                    { id: 'coral', name: 'Coral Fox', hex: '#E8845F' },
                    { id: 'amber', name: 'Amber Scholar', hex: '#D97706' },
                    { id: 'emerald', name: 'Emerald Grove', hex: '#10B981' },
                    { id: 'teal', name: 'Teal Focus', hex: '#0D9488' },
                    { id: 'violet', name: 'Royal Violet', hex: '#8B5CF6' },
                  ].map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => setAccentColor(col.id)}
                      className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        accentColor === col.id
                          ? 'border-[#1E1B16] bg-white shadow-xs ring-2 ring-[#E8845F]/30'
                          : 'border-[#EDE7E1] bg-white hover:bg-[#FAF6F2]'
                      }`}
                    >
                      <div
                        className="w-7 h-7 rounded-full shadow-inner flex items-center justify-center text-white"
                        style={{ backgroundColor: col.hex }}
                      >
                        {accentColor === col.id && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <span className="text-[11px] font-bold text-[#1E1B16]">{col.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size Scaling */}
              <div>
                <label className="block text-xs font-bold text-[#1E1B16] mb-2">
                  Interface Font Size
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'small', label: 'Compact (14px)', desc: 'High density information' },
                    { id: 'medium', label: 'Standard (16px)', desc: 'Default comfortable reading' },
                    { id: 'large', label: 'Spacious (18px)', desc: 'Relaxed viewing' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        setFontSize(f.id)
                        applyFontSize(f.id)
                      }}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        fontSize === f.id
                          ? 'bg-[#FDEEE6] border-[#E8845F] text-[#C05A35] font-bold'
                          : 'bg-white border-[#EDE7E1] text-[#5B544E] hover:bg-[#FAF6F2]'
                      }`}
                    >
                      <p className="text-xs">{f.label}</p>
                      <p className="text-[10px] font-normal text-[#7C726A] mt-0.5">{f.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Animations & Motion Toggle */}
              <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#EDE7E1]">
                <div>
                  <p className="text-sm font-bold text-[#1E1B16]">Micro-Animations & Visual Effects</p>
                  <p className="text-xs text-[#6B625C] mt-0.5">Smooth page transitions, study card flips, and celebratory confetti</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !animations
                    setAnimations(nextVal)
                    applyAnimations(nextVal)
                  }}
                  className={`w-12 h-6.5 rounded-full transition-all cursor-pointer relative p-0.5 ${
                    animations ? 'bg-[#E8845F]' : 'bg-[#E5DFD9]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                      animations ? 'translate-x-5.5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Sound Effects Volume */}
              <div className="p-4 bg-white rounded-2xl border border-[#EDE7E1] space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-[#E8845F]" />
                    <span className="text-xs font-bold text-[#1E1B16]">Sound Effects Volume</span>
                  </div>
                  <span className="text-xs font-bold text-[#E8845F]">{soundVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={soundVolume}
                  onChange={(e) => setSoundVolume(parseInt(e.target.value, 10))}
                  className="w-full accent-[#E8845F] cursor-pointer"
                />
              </div>
            </GlowCard>
          )}

          {/* TAB 5: SECURITY, PRIVACY & DATA MANAGEMENT */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              
              {/* Change Password Card */}
              <GlowCard className="p-6 space-y-5" glowColor="amber" intensity="sm">
                <div className="border-b border-[#EDE7E1] pb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#FDEEE6] flex items-center justify-center text-[#E8845F]">
                      <Key className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="font-bold text-base text-[#1E1B16]">Password & Authentication</h2>
                      <p className="text-xs text-[#6B625C]">Update your login credentials securely</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-xs font-bold text-[#1E1B16] mb-1.5">
                      Current Password
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="w-full h-11 pl-3.5 pr-10 rounded-xl bg-white border border-[#EDE7E1] focus:border-[#E8845F] focus:ring-2 focus:ring-[#E8845F]/20 text-sm font-medium text-[#1E1B16] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 text-[#7C726A] hover:text-[#1E1B16]"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#1E1B16] mb-1.5">
                        New Password
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 chars"
                        className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#EDE7E1] focus:border-[#E8845F] focus:ring-2 focus:ring-[#E8845F]/20 text-sm font-medium text-[#1E1B16] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#1E1B16] mb-1.5">
                        Confirm Password
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-type new password"
                        className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#EDE7E1] focus:border-[#E8845F] focus:ring-2 focus:ring-[#E8845F]/20 text-sm font-medium text-[#1E1B16] outline-none"
                      />
                    </div>
                  </div>

                  {passwordError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{passwordError}</span>
                    </div>
                  )}

                  {passwordSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{passwordSuccess}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="h-10 px-5 rounded-full bg-[#1E1B16] hover:bg-[#2C2520] text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-xs disabled:opacity-60"
                  >
                    {passwordLoading ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Key className="w-3.5 h-3.5" />
                    )}
                    <span>Update Password</span>
                  </button>
                </form>
              </GlowCard>

              {/* Data Portability & Active Sessions */}
              <GlowCard className="p-6 space-y-5" glowColor="amber" intensity="sm">
                <div className="border-b border-[#EDE7E1] pb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#FDEEE6] flex items-center justify-center text-[#E8845F]">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="font-bold text-base text-[#1E1B16]">Data Ownership & Export</h2>
                      <p className="text-xs text-[#6B625C]">Download your complete study history, flashcards, and notes</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-[#EDE7E1]">
                  <div>
                    <p className="text-sm font-bold text-[#1E1B16]">Export All Study Data</p>
                    <p className="text-xs text-[#6B625C] mt-0.5">
                      Download a verified JSON archive containing your indexed sources, planners, quiz logs, and learning profiles.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportData}
                    disabled={exporting}
                    className="h-10 px-5 rounded-full bg-[#E8845F] hover:bg-[#C05A35] text-white text-xs font-bold flex items-center gap-2 shrink-0 cursor-pointer transition-all shadow-xs disabled:opacity-70"
                  >
                    {exporting ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span>{exportSuccess ? 'Downloaded!' : 'Export Data (JSON)'}</span>
                  </button>
                </div>

              </GlowCard>

            </div>
          )}

        </motion.div>
      </div>
    </div>
  )
}
