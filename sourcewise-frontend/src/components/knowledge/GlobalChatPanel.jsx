import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Send, Loader2, RotateCcw, Zap, ArrowRight,
  Calendar, Trophy, Trash2, ExternalLink, Undo2,
  Sparkles, Folder, ListTodo
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { streamChat } from '../../lib/chatApi'
import { RichMessageContent } from '../ui/RichMessageContent'
import { processSuperCompanionCommand } from '../../lib/superCompanionEngine'
import { addStudentEvent, deleteStudentEvent } from '../../lib/studentEvents'

const QUICK_SPRINTS = [
  { label: '📅 Add Event to Calendar', q: "Add an event in the calendar: Smart India Hackathon on 2026-10-15" },
  { label: '🗓️ What Events Do I Have?', q: "What events do I have scheduled in my calendar?" },
  { label: '📚 List All My Sources', q: "What sources and documents do I have uploaded?" },
  { label: '📋 Pending Tasks Today', q: "What are all the study tasks pending today? Please list them clearly with priorities." },
  { label: '🎯 What to Study Next?', q: 'What should I study right now based on my schedule and active sources?' },
  { label: '⚡ 3-Question Diagnostic', q: 'Give me a 3-question diagnostic quiz on my active sources to test my understanding.' },
  { label: '🧭 Open My Plan', q: 'Take me to my plan' },
]

/**
 * GlobalChatPanel — Super AI Companion with omni-access across the entire app.
 * Can autonomously add events to the calendar, delete events, list sources, inspect tasks, and navigate.
 */
export default function GlobalChatPanel({ open, onClose, sourceIds = [], contextLabel = '', seed }) {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const [actionToast, setActionToast] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const showToast = (msg) => {
    setActionToast(msg)
    setTimeout(() => setActionToast(null), 3000)
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  // Focus input automatically when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [open])

  const lastSeedRef = useRef(null)
  // Seed message when opened with context
  useEffect(() => {
    if (typeof seed === 'string' && seed.trim() && open && lastSeedRef.current !== seed) {
      lastSeedRef.current = seed
      const timer = setTimeout(() => {
        setMessages((m) => [...m, { role: 'assistant', content: seed.trim() }])
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [seed, open])

  const sendQuery = async (queryText) => {
    const question = (queryText || input).trim()
    if (!question || streaming) return
    setError('')
    setInput('')

    // Add user message
    setMessages((m) => [...m, { role: 'user', content: question }])

    // ── Check Super Companion Autonomous Command Processor ──
    try {
      const commandResult = await processSuperCompanionCommand(question, {
        navigate,
        onToast: showToast
      })

      if (commandResult.handled) {
        // Command executed successfully!
        setMessages((m) => [
          ...m,
          {
            role: 'assistant',
            content: commandResult.content,
            actionCard: commandResult.actionCard
          }
        ])
        return
      }
    } catch (cmdErr) {
      console.warn('[GlobalChat] Command processing fallback to LLM:', cmdErr)
    }

    setMessages((m) => [...m, { role: 'assistant', content: '', streaming: true }])
    setStreaming(true)
    let acc = ''

    await streamChat({
      question,
      sourceIds,
      userId: user?.id || 'anonymous',
      history: messages
        .filter((m) => !m.streaming)
        .map((m) => ({ role: m.role, content: m.content }))
        .slice(-6),
      onToken: (tok) => {
        acc += tok
        setMessages((m) => {
          const c = [...m]
          c[c.length - 1] = { role: 'assistant', content: acc, streaming: true }
          return c
        })
      },
      onDone: () => {
        setStreaming(false)
        setMessages((m) => {
          const c = [...m]
          c[c.length - 1] = { role: 'assistant', content: acc }
          return c
        })
      },
      onError: (msg) => {
        setStreaming(false)
        setError(msg || 'Chat response failed. Please try again.')
        setMessages((m) => m.filter((x) => !x.streaming))
      },
    })
  }

  const clearChat = () => {
    setMessages([])
    setError('')
  }

  const handleCardDeleteEvent = (eventId, eventTitle) => {
    deleteStudentEvent(eventId)
    showToast(`Deleted "${eventTitle}" from calendar`)
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: `🗑️ **"${eventTitle}"** has been deleted from your calendar and portfolio.`,
        actionCard: {
          type: 'EVENT_DELETED',
          event: { id: eventId, title: eventTitle }
        }
      }
    ])
  }

  const handleCardRestoreEvent = (event) => {
    addStudentEvent(event)
    showToast(`Restored "${event.title}" to calendar!`)
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: `✅ Restored **"${event.title}"** back to your calendar.`,
        actionCard: {
          type: 'EVENT_ADDED',
          event
        }
      }
    ])
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto"
            aria-hidden="true"
          />

          {/* Slide-over Drawer Panel */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed inset-y-0 right-0 w-full sm:w-[440px] max-w-[100vw] bg-white border-l border-[#EDE7E1] shadow-[0_20px_60px_-15px_rgba(30,27,22,0.3)] flex flex-col z-50 pointer-events-auto select-text"
            data-testid="global-chat"
          >
            {/* Action Toast Alert */}
            <AnimatePresence>
              {actionToast && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-16 left-4 right-4 z-50 px-3.5 py-2 bg-[#1E1B16] text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-2 border border-white/10"
                >
                  <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                  <span>{actionToast}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Header: Super AI Companion Title + Omnipresent Badge */}
            <div className="flex items-center justify-between p-4 border-b border-[#EDE7E1] bg-white select-none">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FFF5F0] via-[#FFEFE6] to-[#FDEEE6] border border-[#FCD8CB] flex items-center justify-center p-1.5 shadow-2xs shrink-0 relative">
                  <img src="/logo-mark.png" alt="Super Fox" className="w-7 h-7 object-contain drop-shadow-xs" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white animate-pulse" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-ink text-sm tracking-tight">Super AI Companion</h3>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-teal-50 text-teal-800 border border-teal-200">
                      Omni-App Control
                    </span>
                  </div>
                  <p className="text-xs text-faint truncate">
                    {contextLabel || 'Full command over events, calendar, sources & tasks'}
                  </p>
                </div>
              </div>

              {/* Header Right Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {messages.length > 0 && (
                  <button
                    onClick={clearChat}
                    title="Restart conversation"
                    aria-label="Restart conversation"
                    className="p-1.5 text-stone-400 hover:text-ink hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  aria-label="Close chat"
                  title="Close chat"
                  className="p-1.5 text-stone-400 hover:text-ink hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Messages Body Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 overscroll-contain">
              {messages.length === 0 ? (
                <div className="space-y-4 pt-2">
                  {/* Super Companion Intro Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-gradient-to-br from-[#FFF9F6] via-white to-[#FDF5F0] border border-[#F2DFD5] shadow-xs relative overflow-hidden"
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <span className="text-2xl select-none">🦊</span>
                      <div>
                        <p className="text-xs font-bold text-ink">I am your Super AI Companion</p>
                        <p className="text-[11px] text-teal-800 font-semibold">Ready to execute any app command</p>
                      </div>
                    </div>
                    <p className="text-xs text-body leading-relaxed">
                      I have <strong>complete command and access across the entire app</strong>. You can tell me to:
                    </p>
                    <ul className="text-xs text-body space-y-1 mt-2 list-disc list-inside">
                      <li><strong>Add or delete events</strong> in your calendar and portfolio</li>
                      <li><strong>Query, analyze or summarize</strong> any of your uploaded sources</li>
                      <li><strong>Check today&apos;s schedule</strong> and pending study tasks</li>
                      <li><strong>Navigate</strong> directly to any section of the app</li>
                    </ul>
                  </motion.div>

                  {/* Quick Sprints / Commands Section */}
                  <div className="space-y-2 pt-1">
                    <p className="text-[11px] font-bold text-faint uppercase tracking-wider flex items-center gap-1.5 px-1 select-none">
                      <Zap className="w-3.5 h-3.5 text-coral" /> Quick Commands
                    </p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {QUICK_SPRINTS.map((chip) => (
                        <motion.button
                          key={chip.label}
                          whileHover={{ scale: 1.01, x: 2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => sendQuery(chip.q)}
                          className="w-full text-left px-3 py-2 rounded-xl bg-stone-50 hover:bg-coral-soft/50 text-ink hover:text-coral-deep border border-stone-200/80 hover:border-coral/30 text-xs font-medium transition-all shadow-2xs cursor-pointer flex items-center justify-between group"
                        >
                          <span className="truncate pr-2">{chip.label}</span>
                          <ArrowRight className="w-3 h-3 text-stone-300 group-hover:text-coral group-hover:translate-x-0.5 transition-all shrink-0" />
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className={`max-w-[92%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-2xs ${
                      m.role === 'user'
                        ? 'ml-auto bg-coral text-white font-medium rounded-tr-xs'
                        : 'bg-[#FAFAFA] border border-[#EDE7E1] text-[#1E1B16] rounded-tl-xs'
                    }`}
                  >
                    <RichMessageContent content={m.content} isUser={m.role === 'user'} />
                    {m.streaming && <Loader2 className="w-3.5 h-3.5 animate-spin inline ml-1.5 text-coral" />}

                    {/* ── Dynamic Action Cards ── */}
                    {m.actionCard && (
                      <div className="mt-3 select-none">
                        {/* 1. EVENT ADDED CARD */}
                        {m.actionCard.type === 'EVENT_ADDED' && m.actionCard.event && (
                          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/90 shadow-2xs">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                {m.actionCard.event.category || 'Event'}
                              </span>
                              <span className="text-[11px] font-bold text-emerald-800">
                                📅 {m.actionCard.event.startDate}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-[#1E1B16] truncate mb-1">
                              {m.actionCard.event.title}
                            </p>
                            {m.actionCard.event.venue && (
                              <p className="text-[11px] text-[#5B544E] mb-2.5 truncate">
                                📍 {m.actionCard.event.venue}
                              </p>
                            )}

                            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-emerald-200/60">
                              <button
                                type="button"
                                onClick={() => {
                                  navigate('/plan')
                                  onClose?.()
                                }}
                                className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                              >
                                <Calendar className="w-3 h-3" />
                                <span>View in Calendar</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  navigate('/events')
                                  onClose?.()
                                }}
                                className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                              >
                                <Trophy className="w-3 h-3" />
                                <span>Portfolio</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleCardDeleteEvent(m.actionCard.event.id, m.actionCard.event.title)}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ml-auto"
                                title="Delete this event"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* 2. EVENT DELETED CARD */}
                        {m.actionCard.type === 'EVENT_DELETED' && m.actionCard.event && (
                          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-rose-800 block truncate">
                                Removed: {m.actionCard.event.title}
                              </span>
                              <span className="text-[10px] text-rose-600">
                                Click undo to restore back to calendar
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCardRestoreEvent(m.actionCard.event)}
                              className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg font-bold text-xs transition-colors shrink-0 flex items-center gap-1"
                            >
                              <Undo2 className="w-3 h-3" />
                              <span>Undo</span>
                            </button>
                          </div>
                        )}

                        {/* 3. EVENTS LIST CARD */}
                        {m.actionCard.type === 'EVENTS_LIST' && m.actionCard.events && (
                          <div className="mt-2 space-y-1.5 max-h-56 overflow-y-auto">
                            {m.actionCard.events.map((ev) => (
                              <div
                                key={ev.id}
                                className="p-2 rounded-xl bg-white border border-[#EDE7E1] flex items-center justify-between gap-2 shadow-2xs"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                      {ev.category}
                                    </span>
                                    <span className="text-[10px] text-[#8A817B]">
                                      {ev.startDate}
                                    </span>
                                  </div>
                                  <p className="text-xs font-bold text-[#1E1B16] truncate mt-0.5">
                                    {ev.title}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleCardDeleteEvent(ev.id, ev.title)}
                                  className="p-1 rounded-lg text-rose-500 hover:text-white hover:bg-rose-500 transition-colors shrink-0"
                                  title="Delete event"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 4. SOURCES LIST CARD */}
                        {m.actionCard.type === 'SOURCES_LIST' && (
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                navigate('/knowledge')
                                onClose?.()
                              }}
                              className="px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold hover:bg-teal-100 flex items-center gap-1.5 transition-colors"
                            >
                              <Folder className="w-3.5 h-3.5" />
                              <span>Open Knowledge Hub</span>
                              <ExternalLink className="w-3 h-3 ml-0.5" />
                            </button>
                          </div>
                        )}

                        {/* 5. TASKS LIST CARD */}
                        {m.actionCard.type === 'TASKS_LIST' && (
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                navigate('/plan')
                                onClose?.()
                              }}
                              className="px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold hover:bg-teal-100 flex items-center gap-1.5 transition-colors"
                            >
                              <ListTodo className="w-3.5 h-3.5" />
                              <span>Open Plan &amp; Tasks</span>
                              <ExternalLink className="w-3 h-3 ml-0.5" />
                            </button>
                          </div>
                        )}

                        {/* 6. NAVIGATE CARD */}
                        {m.actionCard.type === 'NAVIGATE' && (
                          <div className="mt-2">
                            <button
                              type="button"
                              onClick={() => {
                                navigate(m.actionCard.path)
                                onClose?.()
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-coral text-white text-xs font-bold hover:bg-coral-dark flex items-center gap-1.5 transition-colors shadow-2xs"
                            >
                              <span>Open {m.actionCard.name}</span>
                              <ExternalLink className="w-3 h-3 ml-0.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            {/* Error Message Toast */}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-4 mb-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 shadow-2xs"
              >
                {error}
              </motion.p>
            )}

            {/* Footer Input Bar */}
            <div className="p-3.5 border-t border-[#EDE7E1] bg-white select-none">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  sendQuery()
                }}
                className="flex items-center gap-2"
              >
                <div className="flex-1 relative flex items-center">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Tell me to add/delete events, query sources, or tasks…"
                    aria-label="Chat message"
                    className="w-full h-10 pl-3.5 pr-3 rounded-full bg-[#FAF8F6] border border-[#EDE7E1] focus:border-teal focus:bg-white text-xs sm:text-sm text-ink placeholder:text-stone-400 outline-none transition-all shadow-2xs"
                  />
                </div>
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={streaming || !input.trim()}
                  aria-label="Send message"
                  className="w-10 h-10 rounded-full bg-teal hover:bg-teal-hover disabled:opacity-40 text-white flex items-center justify-center shrink-0 shadow-2xs transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </motion.button>
              </form>
              <p className="text-[10px] text-stone-400 text-center mt-1.5 font-medium">
                Super Companion Active • Autonomous Event &amp; Source Commands
              </p>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}
