import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileUp, Trash2, Loader2, AlertCircle, MessageCircle,
  FlaskConical, Link2, Database, Layers, Brain,
  FileText, Check, Plus, Sparkles
} from 'lucide-react'
import { useSourceStore } from '../store/sourceStore'
import { useAuthStore } from '../store/authStore'
import { ingestDocument, deleteSourceVectors } from '../lib/chatApi'
import { synthesizeCrossSource } from '../lib/agentApi'
import SourceSlideOver from '../components/knowledge/SourceSlideOver'
import GlobalChatPanel from '../components/knowledge/GlobalChatPanel'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return null
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function getFileTypeMeta(type) {
  const ext = (type || 'pdf').toLowerCase()
  if (ext === 'pdf') {
    return {
      label: 'PDF',
      badgeClass: 'bg-rose-50 text-rose-600 border-rose-200/80',
      iconClass: 'text-rose-600',
    }
  }
  if (ext === 'docx' || ext === 'doc') {
    return {
      label: 'DOCX',
      badgeClass: 'bg-blue-50 text-blue-600 border-blue-200/80',
      iconClass: 'text-blue-600',
    }
  }
  return {
    label: ext.toUpperCase() || 'TXT',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80',
    iconClass: 'text-amber-700',
  }
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 360, damping: 25 },
  },
}

/**
 * KnowledgeHubPage (/knowledge) — merged Sources + AI Workspace.
 * Default: minimal source panels. Click → slide-over with all AI actions.
 * Global chat persists with selected sources as context.
 */
export default function KnowledgeHubPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { uploadedSources, activeSourceIds, addSource, removeSource, toggleActiveSource, updateSourceStatus } = useSourceStore()
  const { user, accessToken } = useAuthStore()

  const [uploadError, setUploadError] = useState(null)
  const [openSource, setOpenSource] = useState(null)
  const [selected, setSelected] = useState([])
  const [chatOpen, setChatOpen] = useState(false)
  const [chatSeed, setChatSeed] = useState('')
  const [synthResult, setSynthResult] = useState(null)
  const [synthWorking, setSynthWorking] = useState(false)

  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/sources`, { headers: { Authorization: `Bearer ${accessToken}` } })
      if (res.ok) {
        const data = await res.json()
        const localIds = useSourceStore.getState().uploadedSources.map((s) => s.id)
        const fresh = data.filter((s) => !localIds.includes(s.id)).map((s) => ({
          id: s.id, name: s.name, size: s.size || 0, type: s.type || 'pdf',
          status: s.status || 'ready', chunksIndexed: s.chunks_indexed || 0,
        }))
        if (fresh.length) useSourceStore.setState((st) => ({ uploadedSources: [...fresh, ...st.uploadedSources] }))
      }
    } catch { /* offline — local store stands */ }
  }, [accessToken])

  useEffect(() => { fetchSources() }, [fetchSources])

  // Deep actions from Plan home (e.g. bonus missions, slot start).
  useEffect(() => {
    const st = location.state
    if (st?.subject || st?.topic) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChatSeed(`Let's study ${st.topic || st.subject}${st.subject && st.topic ? ` (${st.subject})` : ''}.`)
      setChatOpen(true)
      navigate(location.pathname, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onDrop = useCallback(async (acceptedFiles) => {
    setUploadError(null)
    for (const file of acceptedFiles) {
      const sourceId = `src_${Date.now()}_${Math.random().toString(36).substring(7)}`
      addSource({ id: sourceId, name: file.name, size: file.size, type: file.name.split('.').pop().toLowerCase(), status: 'uploading', file })
      try {
        updateSourceStatus(sourceId, 'processing')
        const result = await ingestDocument(file, sourceId, user?.id || 'anonymous', file.name)
        const res = await fetch(`${API_URL}/sources`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ id: sourceId, name: file.name, type: file.name.split('.').pop().toLowerCase(), size: file.size, status: 'ready', chunks_indexed: result.chunks_indexed }),
        })
        let realId = sourceId
        if (res.ok) {
          const saved = await res.json()
          if (saved?.id) realId = saved.id
        }
        updateSourceStatus(sourceId, 'ready')
        useSourceStore.setState((st) => ({
          uploadedSources: st.uploadedSources.map((s) => (s.id === sourceId ? { ...s, id: realId, chunksIndexed: result.chunks_indexed, status: 'ready' } : s)),
          activeSourceIds: st.activeSourceIds.map((id) => (id === sourceId ? realId : id)),
        }))
      } catch (error) {
        updateSourceStatus(sourceId, 'error')
        setUploadError(`Failed to upload ${file.name}: ${error?.message || 'unknown error'}`)
        setTimeout(() => setUploadError(null), 5000)
      }
    }
  }, [addSource, updateSourceStatus, user, accessToken])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 'text/plain': ['.txt'] },
    multiple: true,
  })

  const handleDelete = (source, e) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    if (!source?.id) return
    const targetId = source.id

    // 1. Immediately remove from local state so UI updates instantly
    removeSource(targetId)
    setSelected((prev) => prev.filter((id) => id !== targetId))
    if (openSource?.id === targetId) {
      setOpenSource(null)
    }

    // 2. Best-effort async cleanup (AI vector store + backend DB)
    deleteSourceVectors(targetId).catch(() => {})
    if (accessToken) {
      fetch(`${API_URL}/sources/${targetId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      }).catch((err) => {
        console.warn('Backend delete skipped:', err)
      })
    }
  }

  const toggleSelect = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const runSynthesis = async () => {
    const ids = selected.length ? selected : activeSourceIds
    if (!ids.length) return
    setSynthWorking(true); setSynthResult(null)
    try {
      const data = await synthesizeCrossSource(ids)
      setSynthResult(data.synthesis || data.message || JSON.stringify(data))
    } catch (e) {
      setSynthResult(`Synthesis failed: ${e.message}`)
    } finally {
      setSynthWorking(false)
    }
  }

  const chatIds = selected.length ? selected : activeSourceIds
  const totalChunks = uploadedSources.reduce((acc, s) => acc + (s.chunksIndexed ?? s.chunks_indexed ?? 0), 0)

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-12" data-testid="knowledge-hub">
      {/* Header with Live Indicator & Action Controls */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-coral-deep">
              Knowledge Hub
            </span>
          </div>

          <h1 className="text-[28px] sm:text-[32px] font-display font-bold text-ink tracking-tight">
            Your sources, alive
          </h1>
          <p className="text-sm text-body mt-1 max-w-2xl">
            Click any panel for analysis + every AI action. Chat works across selections.
          </p>

          {/* Quick stats badges */}
          {uploadedSources.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-wrap items-center gap-2 mt-3"
            >
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white border border-line text-body shadow-2xs">
                <Database className="w-3.5 h-3.5 text-coral" />
                <strong className="text-ink font-bold">{uploadedSources.length}</strong> source{uploadedSources.length === 1 ? '' : 's'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white border border-line text-body shadow-2xs">
                <Layers className="w-3.5 h-3.5 text-teal" />
                <strong className="text-ink font-bold">{totalChunks.toLocaleString()}</strong> indexed chunks
              </span>
              {activeSourceIds.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-teal-soft text-teal border border-teal/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal" />
                  <strong className="font-bold">{activeSourceIds.length}</strong> active in context
                </span>
              )}
            </motion.div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ y: -2, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setChatOpen(true)}
            className="sw-btn-secondary !h-10 !text-[13px] relative shadow-2xs"
          >
            <MessageCircle className="w-3.5 h-3.5 text-coral" /> Chat {chatIds.length ? `(${chatIds.length})` : ''}
            {chatIds.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-coral opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-coral" />
              </span>
            )}
          </motion.button>
          <motion.button
            whileHover={!synthWorking && chatIds.length ? { y: -2, scale: 1.02 } : {}}
            whileTap={!synthWorking && chatIds.length ? { scale: 0.98 } : {}}
            onClick={runSynthesis}
            disabled={synthWorking || !chatIds.length}
            className="sw-btn-secondary !h-10 !text-[13px] disabled:opacity-40 shadow-2xs"
          >
            <Link2 className="w-3.5 h-3.5" /> {synthWorking ? 'Synthesizing…' : 'Synthesize'}
          </motion.button>
        </div>
      </div>

      {/* Synthesis Result Banner */}
      <AnimatePresence>
        {synthResult && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.99 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="p-5 rounded-2xl bg-gradient-to-br from-white to-coral-soft/30 border border-coral/30 shadow-card relative overflow-hidden"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-coral-soft text-coral-deep">
                  <Brain className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-ink">Cross-source synthesis</h3>
              </div>
              <button
                onClick={() => setSynthResult(null)}
                className="text-xs font-bold text-faint hover:text-ink px-2.5 py-1 rounded-lg hover:bg-white/80 transition-colors"
              >
                Dismiss
              </button>
            </div>
            <p className="text-sm text-body whitespace-pre-wrap leading-relaxed pl-8">{synthResult}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Dropzone */}
      <motion.div
        {...getRootProps()}
        whileHover={{ scale: 1.006, borderColor: '#E8845F' }}
        whileTap={{ scale: 0.994 }}
        animate={isDragActive ? { scale: 1.015, borderColor: '#E8845F' } : {}}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className={`relative overflow-hidden p-6 sm:p-7 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-colors shadow-2xs group ${
          isDragActive
            ? 'border-coral bg-coral-soft/70 shadow-warm'
            : 'border-line bg-white/90 hover:bg-white hover:border-coral/50'
        }`}
      >
        <input {...getInputProps()} />
        <motion.div
          animate={isDragActive ? { y: [-4, 4, -4], scale: [1, 1.1, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
          className="w-11 h-11 rounded-2xl bg-coral-soft text-coral-deep flex items-center justify-center mx-auto mb-2 shadow-2xs group-hover:scale-110 transition-transform duration-200"
        >
          <FileUp className="w-5 h-5 text-coral-deep" />
        </motion.div>
        <p className="text-sm font-bold text-ink">
          {isDragActive ? 'Drop files here to start indexing' : 'Drag PDFs/DOCX/TXT here, or click to browse'}
        </p>
        <p className="text-xs text-faint mt-1 flex items-center justify-center gap-2">
          <span>Supported: PDF, DOCX, TXT</span>
          <span className="w-1 h-1 rounded-full bg-line" />
          <span>Auto-chunked & embedded for AI context</span>
        </p>
      </motion.div>

      <AnimatePresence>
        {uploadError && (
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {uploadError}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Panel grid */}
      {uploadedSources.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-12 text-center rounded-3xl bg-white border border-line shadow-2xs flex flex-col items-center"
        >
          <motion.div
            animate={{ y: [-4, 4, -4] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
            className="w-14 h-14 rounded-2xl bg-coral-soft flex items-center justify-center text-2xl mb-3 shadow-2xs"
          >
            📚
          </motion.div>
          <p className="font-bold text-ink text-base">No sources yet</p>
          <p className="text-sm text-faint mt-1 max-w-md">
            Upload your first document above — panels appear here with Chat, Quiz, Notes and more.
          </p>
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {uploadedSources.map((s) => {
            const isSel = selected.includes(s.id)
            const isActive = activeSourceIds.includes(s.id)
            const typeMeta = getFileTypeMeta(s.type)
            const fileSize = formatFileSize(s.size)

            return (
              <motion.div
                key={s.id}
                layout
                variants={cardVariants}
                initial="hidden"
                animate="show"
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                data-testid={`source-panel-${s.id}`}
                className={`relative flex flex-col justify-between p-4.5 rounded-2xl bg-white border transition-all duration-200 group overflow-hidden ${
                  isSel
                    ? 'border-coral ring-2 ring-coral/25 shadow-card bg-gradient-to-b from-white via-white to-coral-soft/10'
                    : isActive
                      ? 'border-teal/50 shadow-xs ring-1 ring-teal/20'
                      : 'border-line shadow-xs hover:border-coral/40 hover:shadow-card'
                }`}
              >
                {/* Subtle top indicator for active AI context or selection */}
                {isActive && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal via-teal/70 to-teal/20" />
                )}

                {/* Card Top Section: Selection + Icon + Title + Delete */}
                <div>
                  <div className="flex items-start gap-3">
                    {/* Custom Accessible Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleSelect(s.id)
                      }}
                      aria-label={`Select ${s.name}`}
                      title={isSel ? 'Deselect source' : 'Select for multi-source actions'}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer shrink-0 mt-0.5 ${
                        isSel
                          ? 'bg-coral border-coral text-white shadow-2xs'
                          : 'border-stone-300 hover:border-coral bg-white group-hover:border-stone-400'
                      }`}
                    >
                      {isSel && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    {/* Document Header & Details Clickable Target */}
                    <div
                      onClick={() => setOpenSource(s)}
                      className="flex-1 min-w-0 cursor-pointer group/title"
                    >
                      <div className="flex items-start gap-2.5">
                        {/* File Format Badge */}
                        <div
                          className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs transition-transform duration-200 group-hover/title:scale-105 ${typeMeta.badgeClass}`}
                        >
                          <FileText className={`w-4 h-4 ${typeMeta.iconClass}`} />
                        </div>

                        {/* Title & Metadata */}
                        <div className="min-w-0 flex-1">
                          <h3
                            className="font-bold text-ink text-sm leading-snug line-clamp-2 group-hover/title:text-coral transition-colors"
                            title={s.name}
                          >
                            {s.name}
                          </h3>

                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide bg-stone-100 text-stone-600">
                              {typeMeta.label}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] text-faint">
                              <Layers className="w-3 h-3 text-stone-400" />
                              {s.chunksIndexed ?? s.chunks_indexed ?? 0} chunks
                            </span>
                            {fileSize && (
                              <>
                                <span className="text-stone-300 text-xs">·</span>
                                <span className="text-[11px] text-faint">{fileSize}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status Tag */}
                      <div className="mt-3">
                        {s.status === 'ready' ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-teal bg-teal-soft/80 border border-teal/20 px-2.5 py-0.5 rounded-full shadow-2xs">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal opacity-75" />
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-teal" />
                            </span>
                            Ready for AI
                          </span>
                        ) : s.status === 'error' ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200/70 px-2.5 py-0.5 rounded-full shadow-2xs">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                            Indexing failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amberbrand bg-amberbrand-soft border border-amberbrand/20 px-2.5 py-0.5 rounded-full shadow-2xs">
                            <Loader2 className="w-3 h-3 animate-spin text-amberbrand" />
                            {s.status === 'uploading' ? 'Uploading…' : 'Processing…'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Delete action */}
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={(e) => handleDelete(s, e)}
                      aria-label={`Delete ${s.name}`}
                      title={`Delete ${s.name}`}
                      className="p-1.5 text-stone-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 pointer-events-none" />
                    </motion.button>
                  </div>
                </div>

                {/* Bottom Action Toolbar */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-line/70">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setOpenSource(s)}
                    className="flex-1 h-9 px-3 rounded-xl bg-ink hover:bg-stone-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-coral" />
                    <span>Open Studio</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toggleActiveSource(s.id)}
                    aria-label={`${isActive ? 'Remove from' : 'Add to'} AI context`}
                    title={isActive ? 'Active in AI Chat context (click to remove)' : 'Include in AI Chat context'}
                    className={`h-9 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer ${
                      isActive
                        ? 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100'
                        : 'border-line text-body bg-white hover:border-teal/50 hover:text-teal'
                    }`}
                  >
                    {isActive ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
                        <span>In AI</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5 text-faint" />
                        <span>Add to AI</span>
                      </>
                    )}
                  </motion.button>

                  <motion.button
                    whileHover={{ rotate: 8, scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setOpenSource(s)}
                    aria-label={`Quiz and study on ${s.name}`}
                    title="Practice & Quiz (in detail panel)"
                    className="h-9 w-9 rounded-xl border border-line bg-stone-50/80 hover:bg-coral-soft hover:border-coral/40 text-faint hover:text-coral-deep flex items-center justify-center transition-colors shadow-2xs shrink-0 cursor-pointer"
                  >
                    <FlaskConical className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* Slide-over detail panel with AnimatePresence */}
      <AnimatePresence>
        {openSource && (
          <SourceSlideOver
            source={openSource}
            onClose={() => setOpenSource(null)}
            onOpenChat={(src) => {
              if (!activeSourceIds.includes(src.id)) toggleActiveSource(src.id)
              setChatSeed(`Let's work on "${src.name}".`)
              setChatOpen(true)
            }}
          />
        )}
      </AnimatePresence>

      <GlobalChatPanel
        open={chatOpen}
        onClose={() => { setChatOpen(false); setChatSeed('') }}
        sourceIds={chatIds}
        contextLabel={chatIds.length ? `${chatIds.length} source${chatIds.length === 1 ? '' : 's'} in context` : 'No sources selected'}
        seed={chatSeed}
      />
    </div>
  )
}
