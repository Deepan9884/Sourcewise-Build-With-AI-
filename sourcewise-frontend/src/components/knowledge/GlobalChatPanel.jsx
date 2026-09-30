import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Loader2, RotateCcw, Zap, ArrowRight } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { streamChat } from '../../lib/chatApi'

const QUICK_SPRINTS = [
  { label: '📋 Pending Tasks Today', q: "What are all the study tasks pending today? Please list them clearly with priorities." },
  { label: '🎯 What to Study Next?', q: 'What should I study right now based on my schedule and active sources?' },
  { label: '⚡ 3-Question Diagnostic', q: 'Give me a 3-question diagnostic quiz on my active sources to test my understanding.' },
  { label: '💡 Explain Tough Concept', q: 'Explain a key concept from my study material using the Feynman technique (simple language and clear analogies).' },
  { label: '🗂️ Flashcard Review', q: 'Generate 3 quick active recall flashcards with answers based on my sources.' },
  { label: '📝 Extract Key Equations', q: 'Extract all the key formulas, definitions, and essential summary points from my active sources.' },
]

/**
 * GlobalChatPanel — Pure overlay study companion chat drawer.
 * Positioned on top of the entire screen without shifting, pushing, or overflowing page layouts.
 */
export default function GlobalChatPanel({ open, onClose, sourceIds = [], contextLabel = '', seed }) {
  const { user } = useAuthStore()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  // Focus input automatically when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [open])

  // Seed message when opened with context (plan slots, source panels).
  useEffect(() => {
    if (typeof seed === 'string' && seed.trim() && open) {
      setMessages((m) => [...m, { role: 'assistant', content: seed.trim() }])
    }
  }, [seed, open])

  const sendQuery = async (queryText) => {
    const question = (queryText || input).trim()
    if (!question || streaming) return
    setError('')
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: question }, { role: 'assistant', content: '', streaming: true }])
    setStreaming(true)
    let acc = ''
    await streamChat({
      question,
      sourceIds,
      userId: user?.id || 'anonymous',
      history: messages.filter((m) => !m.streaming).map((m) => ({ role: m.role, content: m.content })).slice(-6),
      onToken: (tok) => {
        acc += tok
        setMessages((m) => { const c = [...m]; c[c.length - 1] = { role: 'assistant', content: acc, streaming: true }; return c })
      },
      onDone: () => {
        setStreaming(false)
        setMessages((m) => { const c = [...m]; c[c.length - 1] = { role: 'assistant', content: acc }; return c })
      },
      onError: (msg) => {
        setStreaming(false)
        setError(msg || 'Chat failed. Check that python-ai (:8000) is running.')
        setMessages((m) => m.filter((x) => !x.streaming))
      },
    })
  }

  const clearChat = () => {
    setMessages([])
    setError('')
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
          {/* Pure Backdrop overlay */}
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
            className="fixed inset-y-0 right-0 w-full sm:w-[420px] max-w-[100vw] bg-white border-l border-[#EDE7E1] shadow-[0_20px_60px_-15px_rgba(30,27,22,0.3)] flex flex-col z-50 pointer-events-auto select-text"
            data-testid="global-chat"
          >
            {/* Header: Fox Mascot Avatar + Title + Status + Actions */}
            <div className="flex items-center justify-between p-4 border-b border-[#EDE7E1] bg-white select-none">
              <div className="flex items-center gap-3 min-w-0">
                {/* Fox Mascot Icon Badge */}
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FFF5F0] to-[#FFEFE6] border border-[#FCD8CB] flex items-center justify-center p-1.5 shadow-2xs shrink-0">
                  <img src="/logo-mark.png" alt="Fox Mascot" className="w-7 h-7 object-contain drop-shadow-xs" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-ink text-sm tracking-tight">Study chat</h3>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Companion Ready" />
                  </div>
                  <p className="text-xs text-faint truncate">
                    {contextLabel || (sourceIds.length ? `${sourceIds.length} source${sourceIds.length === 1 ? '' : 's'} in context` : 'Personal study companion')}
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
                  {/* Fox Companion Intro Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-gradient-to-br from-[#FFF9F6] via-white to-[#FDF5F0] border border-[#F2DFD5] shadow-xs relative overflow-hidden"
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <span className="text-2xl select-none">🦊</span>
                      <div>
                        <p className="text-xs font-bold text-ink">SourceWise Fox Companion</p>
                        <p className="text-[11px] text-faint">Smart AI retrieval & tutoring</p>
                      </div>
                    </div>
                    <p className="text-xs text-body leading-relaxed">
                      Ask anything about {sourceIds.length ? `${sourceIds.length} active source${sourceIds.length === 1 ? '' : 's'}` : 'your study tasks, topics, or schedule'}. I'll explain tough concepts, create quizzes, and provide source-grounded answers.
                    </p>
                  </motion.div>

                  {/* Quick Sprints Section (from top dashboard bar) */}
                  <div className="space-y-2 pt-1">
                    <p className="text-[11px] font-bold text-faint uppercase tracking-wider flex items-center gap-1.5 px-1 select-none">
                      <Zap className="w-3.5 h-3.5 text-coral" /> Quick Sprints
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
                          <span>{chip.label}</span>
                          <ArrowRight className="w-3 h-3 text-stone-300 group-hover:text-coral group-hover:translate-x-0.5 transition-all" />
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
                    className={`max-w-[88%] p-3.5 rounded-2xl text-xs sm:text-sm whitespace-pre-wrap leading-relaxed shadow-2xs ${
                      m.role === 'user'
                        ? 'ml-auto bg-coral text-white font-medium rounded-tr-xs'
                        : 'bg-[#FAFAFA] border border-[#EDE7E1] text-[#1E1B16] rounded-tl-xs'
                    }`}
                  >
                    {typeof m.content === 'string' ? m.content : ''}
                    {m.streaming && <Loader2 className="w-3.5 h-3.5 animate-spin inline ml-1.5 text-coral" />}
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
                    placeholder={sourceIds.length ? "Ask about your sources…" : "Ask about tasks, topics, or concepts…"}
                    aria-label="Chat message"
                    className="w-full h-10 pl-3.5 pr-3 rounded-full bg-[#FAF8F6] border border-[#EDE7E1] focus:border-coral focus:bg-white text-xs sm:text-sm text-ink placeholder:text-stone-400 outline-none transition-all shadow-2xs"
                  />
                </div>
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={streaming || !input.trim()}
                  aria-label="Send message"
                  className="w-10 h-10 rounded-full bg-coral hover:bg-coral-dark disabled:opacity-40 text-white flex items-center justify-center shrink-0 shadow-2xs transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </motion.button>
              </form>
              <p className="text-[10px] text-stone-400 text-center mt-1.5 font-medium">
                Enter to send • RAG enabled
              </p>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}
