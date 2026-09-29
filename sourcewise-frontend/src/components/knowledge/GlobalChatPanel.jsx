import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Loader2 } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { streamChat } from '../../lib/chatApi'

/**
 * GlobalChatPanel — persistent RAG side panel. Survives route changes
 * (mount it once in MainLayout). Context: sourceIds + optional subject/topic
 * seed from wherever it was opened.
 */
export default function GlobalChatPanel({ open, onClose, sourceIds = [], contextLabel = '', seed }) {
  const { user } = useAuthStore()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  // Seed message when opened with context (plan slots, source panels).
  useEffect(() => {
    if (seed && open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessages((m) => [...m, { role: 'assistant', content: seed }])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed])

  const send = async () => {
    const question = input.trim()
    if (!question || streaming) return
    if (!sourceIds.length) {
      setError('Select at least one source (or open chat from a source panel) to give the AI context.')
      return
    }
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

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="absolute inset-y-0 right-0 w-full sm:w-[390px] bg-white border-l border-line shadow-2xl flex flex-col z-10"
            data-testid="global-chat"
          >
            <div className="flex items-center gap-2.5 p-4 border-b border-line bg-white">
              <span className="text-xl">💬</span>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-ink text-sm">Study chat</h3>
                {contextLabel && <p className="text-xs text-faint truncate">{contextLabel}</p>}
              </div>
              <button
                onClick={onClose}
                aria-label="Close chat"
                className="p-2 text-faint hover:text-ink rounded-xl hover:bg-[#F5EFEA] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-faint leading-relaxed"
                >
                  Ask anything about {sourceIds.length ? `${sourceIds.length} selected source${sourceIds.length === 1 ? '' : 's'}` : 'your sources'}. Answers cite your uploads.
                </motion.p>
              )}
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className={`max-w-[88%] p-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed shadow-2xs ${
                    m.role === 'user'
                      ? 'ml-auto bg-coral text-white font-medium rounded-br-xs'
                      : 'bg-[#FAFAFA] border border-line text-body rounded-bl-xs'
                  }`}
                >
                  {m.content}
                  {m.streaming && <Loader2 className="w-3.5 h-3.5 animate-spin inline ml-1.5 text-coral" />}
                </motion.div>
              ))}
              <div ref={bottomRef} />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-4 mb-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2"
              >
                {error}
              </motion.p>
            )}

            <div className="p-3 border-t border-line flex gap-2 bg-white">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder="Ask about your sources…"
                aria-label="Chat message"
                className="sw-input flex-1 !h-10 text-sm"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={send}
                disabled={streaming || !input.trim()}
                aria-label="Send"
                className="sw-btn-primary !h-10 !px-3.5 shadow-2xs"
              >
                <Send className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}

