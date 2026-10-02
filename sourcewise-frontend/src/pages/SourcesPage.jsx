import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { FileUp, FileText, File, Trash2, CheckCircle2, Loader2, AlertCircle, Network } from 'lucide-react'
import { useSourceStore } from '../store/sourceStore'
import { useAuthStore } from '../store/authStore'
import { GlowCard } from '../components/ui/glow-card'
import EmptyState from '../components/ui/empty-state'
import { ingestDocument, deleteSourceVectors } from '../lib/chatApi'
import KnowledgeGraph from '../components/ui/knowledge-graph'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const AI_URL = import.meta.env.VITE_AI_URL || 'http://localhost:8000'

export default function SourcesPage() {
  const { uploadedSources, activeSourceIds, addSource, removeSource, toggleActiveSource, updateSourceStatus } = useSourceStore()
  const { user, accessToken } = useAuthStore()
  const [uploadError, setUploadError] = useState(null)
  const [selectedSourceAnalysis, setSelectedSourceAnalysis] = useState(null)
  const [knowledgeGraph, setKnowledgeGraph] = useState(null)
  const [loadingGraph, setLoadingGraph] = useState(false)

  // Load sources from backend on mount
  const fetchSources = async () => {
    try {
      const res = await fetch(`${API_URL}/sources`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      if (res.ok) {
        const data = await res.json()
        // Merge with local store
        const localIds = uploadedSources.map(s => s.id)
        const newSources = data.filter(s => !localIds.includes(s.id) && (s.type || '').toLowerCase() !== 'note').map(s => ({
          id: s.id,
          name: s.name,
          size: s.size || 0,
          type: s.type || 'pdf',
          status: s.status || 'ready',
          chunksIndexed: s.chunks_indexed || 0,
        }))
        if (newSources.length > 0) {
          useSourceStore.setState(state => ({
            uploadedSources: [...newSources, ...state.uploadedSources]
          }))
        }
      }
    } catch (err) {
      console.error('[Sources] Fetch error:', err)
    }
  }

  useEffect(() => {
    fetchSources()
  }, [])

  const onDrop = useCallback(async (acceptedFiles) => {
    setUploadError(null)
    
    for (const file of acceptedFiles) {
      const sourceId = `src_${Date.now()}_${Math.random().toString(36).substring(7)}`
      
      const newSource = {
        id: sourceId,
        name: file.name,
        size: file.size,
        type: file.name.split('.').pop().toLowerCase(),
        status: 'uploading',
        file: file,
      }
      addSource(newSource)
      
      try {
        updateSourceStatus(sourceId, 'processing')
        
        let chunksCount = Math.max(1, Math.ceil(file.size / 1800))
        try {
          const result = await ingestDocument(
            file,
            sourceId,
            user?.id || 'anonymous',
            file.name
          )
          if (result && typeof result.chunks_indexed === 'number') {
            chunksCount = result.chunks_indexed
          }
        } catch (aiErr) {
          console.warn('[SourcesPage] Python AI vectorization skipped/offline:', aiErr)
        }
        
        // Save metadata to Node API
        let realId = sourceId
        if (accessToken) {
          try {
            const res = await fetch(`${API_URL}/sources`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                id: sourceId,
                name: file.name,
                type: file.name.split('.').pop().toLowerCase(),
                size: file.size,
                status: 'ready',
                chunks_indexed: chunksCount,
              }),
            })
            if (res.ok) {
              const saved = await res.json()
              if (saved?.id) realId = saved.id
            }
          } catch (apiErr) {
            console.warn('[SourcesPage] Backend source registration note:', apiErr)
          }
        }
        
        // Update local store
        updateSourceStatus(sourceId, 'ready')
        useSourceStore.setState((state) => ({
          uploadedSources: state.uploadedSources.map(s => 
            s.id === sourceId 
              ? { ...s, id: realId, chunksIndexed: chunksCount, status: 'ready' }
              : s
          )
        }))
        
      } catch (error) {
        console.error('[Upload] Failed:', error)
        updateSourceStatus(sourceId, 'error')
        const errorMsg = error?.message || error?.detail || JSON.stringify(error) || 'Unknown error';
        setUploadError(`Failed to upload ${file.name}: ${errorMsg}`)
        setTimeout(() => setUploadError(null), 5000)
      }
    }
  }, [addSource, updateSourceStatus, user, accessToken])

  const handleDelete = (source, e) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    if (!source?.id) return
    const targetId = source.id

    // 1. Immediately remove from local state
    removeSource(targetId)
    if (selectedSourceAnalysis?.source_id === targetId) setSelectedSourceAnalysis(null)

    // 2. Best-effort async cleanup
    deleteSourceVectors(targetId).catch(() => {})
    if (accessToken) {
      fetch(`${API_URL}/sources/${targetId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      }).catch((error) => {
        console.warn('Delete failed:', error)
      })
    }
  }

  const fetchSourceAnalysis = async (sourceId) => {
    try {
      const res = await fetch(`${API_URL}/sources/${sourceId}/analyze`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (res.ok) {
        const data = await res.json()
        setSelectedSourceAnalysis(data)
      }
    } catch (err) {
      console.error('[Analysis] Error:', err)
    }
  }

  const fetchKnowledgeGraph = async () => {
    if (activeSourceIds.length === 0) return
    setLoadingGraph(true)
    try {
      const res = await fetch(`${AI_URL}/sources/knowledge-graph`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_ids: activeSourceIds }),
      })
      if (res.ok) {
        const data = await res.json()
        setKnowledgeGraph(data)
      }
    } catch (err) {
      console.error('[KnowledgeGraph] Error:', err)
    } finally {
      setLoadingGraph(false)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    multiple: true,
  })

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (type) => {
    switch(type) {
      case 'pdf': return <File className="w-5 h-5 text-red-500" />
      case 'docx': return <FileText className="w-5 h-5 text-[#5B544E]" />
      case 'txt': return <FileText className="w-5 h-5 text-[#5B544E]" />
      default: return <File className="w-5 h-5 text-[#5B544E]" />
    }
  }

  const getStatusIcon = (status) => {
    switch(status) {
      case 'uploading': return <Loader2 className="w-3 h-3 animate-spin text-[#E8845F]" />
      case 'processing': return <Loader2 className="w-3 h-3 animate-spin text-[#E8845F]" />
      case 'ready': return <CheckCircle2 className="w-3 h-3 text-[#0F766E]" />
      case 'error': return <AlertCircle className="w-3 h-3 text-red-500" />
      default: return null
    }
  }

  const getStatusText = (status) => {
    switch(status) {
      case 'uploading': return 'Uploading...'
      case 'processing': return 'Processing & indexing...'
      case 'ready': return 'Ready'
      case 'error': return 'Error'
      default: return 'Unknown'
    }
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'ready': return 'text-[#0F766E]'
      case 'uploading': return 'text-[#E8845F]'
      case 'processing': return 'text-[#E8845F]'
      case 'error': return 'text-red-600'
      default: return 'text-[#8A817B]'
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-[28px] font-display font-bold text-[#1E1B16] tracking-tight">Knowledge Hub</h1>
        <p className="text-[15px] text-[#5B544E] mt-1">Upload documents and the AI will learn from them.</p>
      </motion.div>

      {/* Error Banner */}
      <AnimatePresence>
        {uploadError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center space-x-2"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm">{uploadError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          {/* Dropzone */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div
              {...getRootProps()}
              className={`relative overflow-hidden border-2 border-dashed rounded-2xl p-10 sm:p-14 text-center cursor-pointer transition-all duration-200 bg-white border-[#E0D9D2] hover:border-[#E8845F] ${
                isDragActive ? 'border-[#E8845F] bg-[#FDEEE6]/40' : ''
              }`}
            >
              <input {...getInputProps()} />
              <div className="w-16 h-16 rounded-full bg-[#FDEEE6] text-[#E8845F] flex items-center justify-center mx-auto mb-4">
                <FileUp size={28} />
              </div>
              <h3 className="text-lg font-semibold text-[#1E1B16]">
                {isDragActive ? 'Drop your files here!' : 'Click or drag files to upload'}
              </h3>
              <p className="text-sm text-[#8A817B] mt-1">
                PDF, DOCX, or TXT files. Max 50MB per file.
              </p>
            </div>
          </motion.div>

          {/* Uploaded Files List */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <GlowCard className="overflow-hidden" glowColor="amber" intensity="sm">
              <div className="px-6 py-4 border-b border-[#EDE7E1] flex justify-between items-center">
                <span className="font-semibold text-[#1E1B16]">Uploaded Files</span>
                <span className="text-xs bg-[#FDEEE6] text-[#C05A35] px-3 py-1 rounded-full font-semibold">
                  {uploadedSources.length} files • {uploadedSources.filter(s => s.status === 'ready').length} ready
                </span>
              </div>

              <AnimatePresence>
                {uploadedSources.length === 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-6 py-4">
                    <EmptyState title="No files yet" copy="Drop your first PDF, DOCX or TXT above and your fox companion will start learning from it." />
                  </motion.div>
                ) : (
                  <ul className="divide-y divide-[#EDE7E1]">
                    {uploadedSources.map((file) => (
                      <motion.li
                        key={file.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="p-4 flex items-center justify-between hover:bg-[#FAFAFA] transition-colors group"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="p-3 bg-[#FAFAFA] rounded-xl border border-[#EDE7E1]">
                            {getFileIcon(file.type)}
                          </div>
                          <div>
                            <p className="font-medium text-sm text-[#1E1B16] line-clamp-1">{file.name}</p>
                            <div className="flex items-center text-xs text-[#8A817B] space-x-2 mt-1">
                              <span>{formatBytes(file.size)}</span>
                              <span>•</span>
                              <span className={`flex items-center space-x-1 ${getStatusColor(file.status)}`}>
                                {getStatusIcon(file.status)}
                                <span>{getStatusText(file.status)}</span>
                              </span>
                              {file.chunksIndexed && (
                                <>
                                  <span>•</span>
                                  <span className="text-[#0F766E]">{file.chunksIndexed} chunks</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          {file.status === 'ready' && (
                            <button
                              onClick={() => fetchSourceAnalysis(file.id)}
                              className="px-3 py-1 text-xs rounded-lg border border-[#EDE7E1] text-[#5B544E] hover:border-[rgba(232,132,95,0.4)] hover:text-[#C05A35] transition-all"
                            >
                              Analyze
                            </button>
                          )}
                          <button
                            onClick={() => toggleActiveSource(file.id)}
                            className={`px-3 py-1 text-xs rounded-lg border transition-all ${
                              activeSourceIds.includes(file.id)
                                ? 'bg-[rgba(232,132,95,0.11)] border-[rgba(232,132,95,0.4)] text-[#C05A35] font-semibold'
                                : 'border-[#EDE7E1] text-[#5B544E] hover:border-[rgba(232,132,95,0.4)] hover:text-[#C05A35]'
                            }`}
                          >
                            {activeSourceIds.includes(file.id) ? 'Active' : 'Select'}
                          </button>
                          {file.status !== 'uploading' && file.status !== 'processing' && (
                            <button
                              type="button"
                              onClick={(e) => handleDelete(file, e)}
                              className="p-2 text-[#8A817B] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-4 h-4 pointer-events-none" />
                            </button>
                          )}
                        </div>
                      </motion.li>
                    ))}
                  </ul>
                )}
              </AnimatePresence>
            </GlowCard>
          </motion.div>
        </div>

        {/* Active Sources Sidebar */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="space-y-6">
          <GlowCard className="overflow-hidden sticky top-6" glowColor="amber" intensity="sm">
            <div className="px-6 py-4 border-b border-[#EDE7E1]">
              <h3 className="font-semibold text-[#1E1B16] flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-[#E8845F]" />
                <span>Active Sources</span>
              </h3>
              <p className="text-xs text-[#8A817B] mt-1">Select sources for AI to use</p>
            </div>
            <div className="p-4 space-y-2">
              {uploadedSources.filter(s => s.status === 'ready').length === 0 ? (
                <p className="text-sm text-[#8A817B] text-center py-6">Upload documents first</p>
              ) : (
                uploadedSources.filter(s => s.status === 'ready').map((source) => (
                  <label
                    key={source.id}
                    className="flex items-center space-x-3 p-3 rounded-xl border border-[#EDE7E1] hover:border-[rgba(232,132,95,0.35)] cursor-pointer transition-all"
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded accent-[#E8845F]"
                      checked={activeSourceIds.includes(source.id)}
                      onChange={() => toggleActiveSource(source.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1E1B16] truncate">{source.name}</p>
                      <p className="text-xs text-[#8A817B]">{source.chunksIndexed || 0} chunks</p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </GlowCard>

          {/* Source Analysis Panel */}
          {selectedSourceAnalysis && (
            <GlowCard className="overflow-hidden" glowColor="amber" intensity="sm">
              <div className="px-6 py-4 border-b border-[#EDE7E1] flex justify-between items-center">
                <h3 className="font-semibold text-[#1E1B16] text-sm">Source Analysis</h3>
                <button onClick={() => setSelectedSourceAnalysis(null)} className="text-[#8A817B] hover:text-[#1E1B16] text-xs">✕</button>
              </div>
              <div className="p-4 space-y-3 text-sm">
                {selectedSourceAnalysis.overview && (
                  <div>
                    <p className="text-xs font-semibold text-[#8A817B] mb-1">Overview</p>
                    <p className="text-[#5B544E] text-xs leading-relaxed">{selectedSourceAnalysis.overview}</p>
                  </div>
                )}
                {selectedSourceAnalysis.difficulty_assessment && (
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-[#8A817B]">Difficulty:</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      selectedSourceAnalysis.difficulty_assessment === 'easy' ? 'bg-[#E0F2F0] text-[#0F766E]' :
                      selectedSourceAnalysis.difficulty_assessment === 'hard' ? 'bg-red-100 text-red-600' :
                      'bg-[#FDEEE6] text-[#E8845F]'
                    }`}>{selectedSourceAnalysis.difficulty_assessment}</span>
                  </div>
                )}
                {selectedSourceAnalysis.estimated_study_time && (
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-[#8A817B]">Study time:</span>
                    <span className="text-xs text-[#1E1B16] font-medium">{selectedSourceAnalysis.estimated_study_time}</span>
                  </div>
                )}
                {selectedSourceAnalysis.key_takeaways?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-[#8A817B] mb-1">Key Takeaways</p>
                    <ul className="space-y-1">
                      {selectedSourceAnalysis.key_takeaways.slice(0, 5).map((t, i) => (
                        <li key={i} className="text-xs text-[#5B544E] flex items-start space-x-1">
                          <span className="text-[#E8845F] mt-0.5">•</span>
                          <span>{typeof t === 'string' ? t : t.text || JSON.stringify(t)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {selectedSourceAnalysis.recommendations?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-[#8A817B] mb-1">Recommendations</p>
                    <ul className="space-y-1">
                      {selectedSourceAnalysis.recommendations.slice(0, 3).map((r, i) => (
                        <li key={i} className="text-xs text-[#5B544E] flex items-start space-x-1">
                          <span className="text-[#E8845F] mt-0.5">→</span>
                          <span>{typeof r === 'string' ? r : r.text || JSON.stringify(r)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </GlowCard>
          )}

          {/* Knowledge Graph */}
          <GlowCard className="overflow-hidden" glowColor="amber" intensity="sm">
            <div className="px-6 py-4 border-b border-[#EDE7E1] flex justify-between items-center">
              <h3 className="font-semibold text-[#1E1B16] text-sm flex items-center space-x-2">
                <Network className="w-4 h-4 text-[#E8845F]" />
                <span>Knowledge Graph</span>
              </h3>
              <button
                onClick={fetchKnowledgeGraph}
                disabled={activeSourceIds.length === 0 || loadingGraph}
                className="sw-btn-secondary !h-8 !px-3 !text-xs disabled:opacity-50"
              >
                {loadingGraph ? 'Loading...' : 'Generate'}
              </button>
            </div>
            <div className="p-4">
              <KnowledgeGraph data={knowledgeGraph} loading={loadingGraph} />
            </div>
          </GlowCard>
        </motion.div>
      </div>
    </div>
  )
}
