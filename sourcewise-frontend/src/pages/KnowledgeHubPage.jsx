import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileUp, Trash2, Loader2, AlertCircle, MessageCircle,
  FlaskConical, Link2, Database, Layers, Brain,
  FileText, Check, Plus, BookOpen
} from 'lucide-react'
import { useSourceStore } from '../store/sourceStore'
import { useAuthStore } from '../store/authStore'
import { useChatStore } from '../store/chatStore'
import { ingestDocument, deleteSourceVectors } from '../lib/chatApi'
import { readFilePayload } from '../lib/fileReader'
import { synthesizeCrossSource } from '../lib/agentApi'
import SourceSlideOver from '../components/knowledge/SourceSlideOver'
import { RichMessageContent } from '../components/ui/RichMessageContent'

const API_URL = import.meta.env.VITE_API_URL || 'https://node-api-nine-flame.vercel.app'

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
  const { openChat } = useChatStore()

  const [uploadError, setUploadError] = useState(null)
  const [openSource, setOpenSource] = useState(null)
  const [selected, setSelected] = useState([])
  const [synthResult, setSynthResult] = useState(null)
  const [synthWorking, setSynthWorking] = useState(false)

  useEffect(() => {
    if (accessToken) {
      useSourceStore.getState().fetchSources(accessToken)
    }
  }, [accessToken])

  // Deep actions from Plan home (e.g. bonus missions, slot start).
  useEffect(() => {
    const st = location.state
    if (st?.subject || st?.topic) {
      openChat(`Let's study ${st.topic || st.subject}${st.subject && st.topic ? ` (${st.subject})` : ''}.`)
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
        let chunksCount = Math.max(1, Math.ceil(file.size / 1800))
        try {
          const result = await ingestDocument(file, sourceId, user?.id || 'anonymous', file.name)
          if (result && typeof result.chunks_indexed === 'number') {
            chunksCount = result.chunks_indexed
          }
        } catch (aiErr) {
          console.warn('[KnowledgeHub] Python AI vectorization skipped/offline:', aiErr)
        }

        let realId = sourceId
        const filePayload = await readFilePayload(file)
        const summaryPreview = filePayload.text_content ? filePayload.text_content.slice(0, 2000) : ''

        if (accessToken) {
          try {
            const res = await fetch(`${API_URL}/sources`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
              body: JSON.stringify({
                name: file.name,
                type: file.name.split('.').pop().toLowerCase(),
                size: file.size,
                status: 'ready',
                chunks_count: chunksCount,
                chunks_indexed: chunksCount,
                summary: summaryPreview,
                text_content: filePayload.text_content,
                file_base64: filePayload.file_base64,
                mime_type: filePayload.mime_type,
              }),
            })
            if (res.ok) {
              const saved = await res.json()
              if (saved?.id) realId = saved.id
            }
          } catch (apiErr) {
            console.warn('[KnowledgeHub] Backend source registration note:', apiErr)
          }
        }
        updateSourceStatus(sourceId, 'ready')
        useSourceStore.setState((st) => ({
          uploadedSources: st.uploadedSources.map((s) => (s.id === sourceId ? { ...s, id: realId, chunksIndexed: chunksCount, status: 'ready' } : s)),
          activeSourceIds: st.activeSourceIds.map((id) => (id === sourceId ? realId : id)),
        }))
      } catch (error) {
        console.error('[KnowledgeHub] Unexpected upload error:', error)
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
            onClick={() => openChat()}
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
            <div className="text-sm text-body pl-8">
              <RichMessageContent content={synthResult} />
            </div>
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
                className={`relative flex flex-col justify-between p-5 rounded-2xl transition-all duration-200 group overflow-hidden border ${
                  isSel
                    ? 'border-coral ring-2 ring-coral/20 bg-gradient-to-b from-white via-white to-coral-soft/20 shadow-card'
                    : isActive
                      ? 'border-teal/40 ring-1 ring-teal/20 bg-gradient-to-b from-white via-white to-teal-soft/10 shadow-[0_4px_16px_-4px_rgba(15,118,110,0.1)]'
                      : 'bg-white border-line/90 shadow-2xs hover:border-stone-300 hover:shadow-card'
                }`}
              >
                {/* Active in AI top glowing indicator bar */}
                {isActive && (
                  <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-teal via-teal/70 to-teal/20" />
                )}

                {/* Top Section */}
                <div>
                  {/* Top Bar: Icon on Left | Status Pill & Actions on Right */}
                  <div className="flex items-center justify-between gap-2.5">
                    {/* File Icon Badge */}
                    <div
                      onClick={() => setOpenSource(s)}
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs cursor-pointer transition-transform duration-200 group-hover:scale-105 ${typeMeta.badgeClass}`}
                    >
                      <FileText className={`w-5 h-5 ${typeMeta.iconClass}`} />
                    </div>

                    {/* Header Controls Cluster: Status Tag + Checkbox + Delete */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Status Tag */}
                      {s.status === 'ready' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal bg-teal-soft/70 border border-teal/20 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
                          Ready
                        </span>
                      ) : s.status === 'error' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-full">
                          <AlertCircle className="w-3 h-3 text-rose-500" />
                          Failed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amberbrand bg-amberbrand-soft border border-amberbrand/20 px-2.5 py-0.5 rounded-full animate-pulse">
                          <Loader2 className="w-3 h-3 animate-spin text-amberbrand" />
                          {s.status === 'uploading' ? 'Uploading…' : 'Processing…'}
                        </span>
                      )}

                      {/* Custom Accessible Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleSelect(s.id)
                        }}
                        aria-label={`Select ${s.name}`}
                        title={isSel ? 'Deselect source' : 'Select for multi-source actions'}
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                          isSel
                            ? 'bg-coral border-coral text-white shadow-2xs'
                            : 'border-stone-200 hover:border-coral bg-stone-50/70 hover:bg-white text-transparent'
                        }`}
                      >
                        <Check className={`w-3.5 h-3.5 stroke-[2.5] transition-opacity ${isSel ? 'opacity-100' : 'opacity-0'}`} />
                      </button>

                      {/* Delete action */}
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={(e) => handleDelete(s, e)}
                        aria-label={`Delete ${s.name}`}
                        title={`Delete ${s.name}`}
                        className="p-1 text-stone-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 pointer-events-none" />
                      </motion.button>
                    </div>
                  </div>

                  {/* Document Title & Metadata */}
                  <div
                    onClick={() => setOpenSource(s)}
                    className="mt-3.5 cursor-pointer group/title"
                  >
                    <h3
                      className="font-semibold text-ink text-sm leading-snug line-clamp-2 group-hover/title:text-coral transition-colors tracking-tight"
                      title={s.name}
                    >
                      {s.name}
                    </h3>

                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-stone-100 text-stone-600 border border-stone-200/50">
                        {typeMeta.label}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-faint font-medium">
                        <Layers className="w-3 h-3 text-stone-400" />
                        {s.chunksIndexed ?? s.chunks_indexed ?? 0} chunks
                      </span>
                      {fileSize && (
                        <>
                          <span className="text-stone-300 text-xs">·</span>
                          <span className="text-[11px] text-faint font-medium">{fileSize}</span>
                        </>
                      )}
                    </div>
                  </div>
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
              openChat(`Let's work on "${src.name}".`)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
