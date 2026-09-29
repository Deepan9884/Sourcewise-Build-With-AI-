import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, MessageCircle, FlaskConical, Layers, StickyNote, GraduationCap, FileText, Share2, Link2, Brain } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { sendAgentMessage, synthesizeCrossSource } from '../../lib/agentApi'
import KnowledgeGraph from '../ui/knowledge-graph'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const AI_URL = import.meta.env.VITE_AI_URL || 'http://localhost:8000'

const ACTIONS = [
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'quiz', label: 'Quiz', icon: FlaskConical },
  { id: 'flashcards', label: 'Flash', icon: Layers },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'tutor', label: 'Tutor', icon: GraduationCap },
  { id: 'summary', label: 'Summary', icon: FileText },
  { id: 'map', label: 'Map', icon: Share2 },
  { id: 'synth', label: 'Synth', icon: Link2 },
]

const PROMPTS = {
  quiz: (n) => `Create a 5-question multiple-choice quiz on "${n}". Return each question with 4 options and mark the correct answer.`,
  flashcards: (n) => `Create 6 flashcards (front/back) covering the key concepts of "${n}".`,
  notes: (n) => `Generate organized study notes for "${n}" with headings and bullet key points.`,
  tutor: (n) => `Explain the most important concept in "${n}" like a patient tutor, with one worked example.`,
  summary: (n) => `Summarize "${n}" in 8-10 sentences, then list the 5 key takeaways.`,
}

/**
 * SourceSlideOver — click a source panel → detail + all AI actions.
 * Chat delegates to the global chat (keeps one conversation home).
 * Everything else runs inline via the Node AI gateway.
 */
export default function SourceSlideOver({ source, onClose, onOpenChat }) {
  const { user, accessToken } = useAuthStore()
  const [analysis, setAnalysis] = useState(null)
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  const [activeAction, setActiveAction] = useState(null)
  const [result, setResult] = useState(null)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')

  // Reset + load analysis whenever a different source opens.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnalysis(null); setResult(null); setActiveAction(null); setError('')
    if (!source) return
    let cancelled = false
    setLoadingAnalysis(true)
    fetch(`${API_URL}/sources/${source.id}/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((r) => (r.ok ? r.json() : null)).then((d) => { if (!cancelled && d) setAnalysis(d) })
      .catch(() => {}).finally(() => { if (!cancelled) setLoadingAnalysis(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source?.id])

  if (!source) return null

  const run = async (action) => {
    if (action === 'chat') { onOpenChat?.(source); return }
    setActiveAction(action); setResult(null); setError(''); setWorking(true)
    try {
      if (action === 'map') {
        const res = await fetch(`${AI_URL}/sources/knowledge-graph`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source_ids: [source.id] }),
        })
        if (!res.ok) throw new Error('Graph generation failed — is python-ai (:8000) running?')
        setResult({ kind: 'map', data: await res.json() })
      } else if (action === 'synth') {
        const data = await synthesizeCrossSource([source.id])
        setResult({ kind: 'text', title: 'Cross-source synthesis', body: data.synthesis || data.message || JSON.stringify(data) })
      } else {
        const data = await sendAgentMessage({
          message: PROMPTS[action](source.name),
          sourceIds: [source.id],
          userId: user?.id || 'anonymous',
          history: [],
        })
        setResult({ kind: 'text', title: ACTIONS.find((a) => a.id === action)?.label, body: data.message || JSON.stringify(data.data || data) })
      }
    } catch (e) {
      setError(e.message || `${action} failed.`)
    } finally {
      setWorking(false)
    }
  }

  const concepts = analysis?.key_concepts || analysis?.concepts || []

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" data-testid="source-slideover">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="absolute inset-y-0 right-0 w-full sm:w-[440px] bg-white shadow-2xl flex flex-col max-sm:top-16 max-sm:rounded-t-3xl overflow-hidden z-10"
      >
        <div className="flex items-start gap-2.5 p-4 border-b border-line bg-white">
          <span className="text-2xl shrink-0">📄</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-ink truncate text-sm sm:text-base">{source.name}</h3>
            <p className="text-xs text-faint flex items-center gap-1.5 mt-0.5">
              <span>{source.type?.toUpperCase()}</span>
              <span>·</span>
              <span>{source.chunksIndexed ?? source.chunks_indexed ?? 0} chunks</span>
              <span>·</span>
              <span className={`font-semibold ${source.status === 'ready' ? 'text-teal' : 'text-faint'}`}>{source.status}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close source detail"
            className="p-2 text-faint hover:text-ink rounded-xl hover:bg-[#F5EFEA] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Analysis */}
          <section className="p-3.5 rounded-2xl bg-[#FAFAFA] border border-line">
            <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-faint mb-1.5 flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-coral" /> AI analysis
            </h4>
            {loadingAnalysis && (
              <p className="text-xs text-faint flex items-center gap-1.5 py-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-coral" /> Analyzing document contents…
              </p>
            )}
            {!loadingAnalysis && !analysis && (
              <p className="text-xs text-faint">No analysis yet — it runs automatically after upload.</p>
            )}
            {analysis && (
              <div className="space-y-2 text-sm">
                {analysis.summary && <p className="text-body text-[13px] leading-relaxed">{analysis.summary}</p>}
                {concepts.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {concepts.slice(0, 8).map((c, i) => (
                      <span key={i} className="text-xs px-2.5 py-0.5 rounded-full bg-coral-soft text-coral-deep font-semibold">
                        {typeof c === 'string' ? c : c.concept || c.name}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-faint pt-1">
                  {analysis.difficulty ? `Difficulty: ${analysis.difficulty} · ` : ''}
                  {analysis.estimated_reading_time ? `~${analysis.estimated_reading_time} min read` : ''}
                </p>
              </div>
            )}
          </section>

          {/* Actions */}
          <section>
            <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-faint mb-2">AI actions</h4>
            <div className="grid grid-cols-4 gap-1.5">
              {ACTIONS.map((a) => (
                <motion.button
                  key={a.id}
                  whileHover={{ y: -2, scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => run(a.id)}
                  disabled={working}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    activeAction === a.id
                      ? 'border-coral bg-coral-soft text-coral-deep shadow-2xs'
                      : 'border-line bg-white text-body hover:border-coral/50 hover:bg-coral-soft/20'
                  }`}
                >
                  <a.icon className="w-4 h-4" />
                  {a.label}
                </motion.button>
              ))}
            </div>
          </section>

          {/* Result */}
          {working && (
            <div className="text-xs text-faint flex items-center justify-center gap-2 p-4 rounded-xl bg-coral-soft/40 border border-coral/20">
              <Loader2 className="w-4 h-4 animate-spin text-coral" />
              <span className="font-semibold text-coral-deep">Generating AI response…</span>
            </div>
          )}
          {error && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}
          <AnimatePresence mode="wait">
            {result?.kind === 'text' && (
              <motion.section
                key={result.title}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="p-3.5 rounded-2xl bg-white border border-line shadow-2xs"
              >
                <h4 className="text-xs font-bold text-ink mb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-coral inline-block" />
                  {result.title}
                </h4>
                <p className="text-sm text-body whitespace-pre-wrap leading-relaxed">{result.body}</p>
              </motion.section>
            )}
            {result?.kind === 'map' && (
              <motion.section
                key="map"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.2 }}
                className="p-3.5 rounded-2xl bg-white border border-line shadow-2xs"
              >
                <h4 className="text-xs font-bold text-ink mb-1">Knowledge map</h4>
                <KnowledgeGraph data={result.data} />
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>
    </div>
  )
}

