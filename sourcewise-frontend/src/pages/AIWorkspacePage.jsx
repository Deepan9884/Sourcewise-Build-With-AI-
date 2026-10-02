import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { 
  Send, Loader2, Brain, MessageSquare, FileText, 
  HelpCircle, BookOpen, Copy, Check, ChevronRight, ChevronLeft,
  Award, AlertCircle, RefreshCw, Download, 
  CheckCircle2, SlidersHorizontal, ArrowRight, RotateCcw,
  GraduationCap, Layers, Compass, CheckSquare, Square, Key, Sparkles,
  Cloud, CloudUpload, Folder, FolderOpen, Edit3, Eye, Trash2, Search, Code, ChevronDown, Pencil, FileDown
} from 'lucide-react'
import { useSourceStore } from '../store/sourceStore'
import { useAuthStore } from '../store/authStore'
import { useWorkspaceStore } from '../store/workspaceStore'
import { streamChat } from '../lib/chatApi'
import { sendAgentMessage } from '../lib/agentApi'
import { exportNotesAsJson, exportNotesAsPdf, exportNotesAsMarkdown } from '../lib/notesExport'
import { GlowCard } from '../components/ui/glow-card'
import { RichMessageContent } from '../components/ui/RichMessageContent'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const MODES = {
  chat: { id: 'chat', label: 'Chat', icon: MessageSquare, description: 'Personal study companion & task assistant' },
  quiz: { id: 'quiz', label: 'Quiz', icon: HelpCircle, description: 'Test your understanding with practice quizzes' },
  flashcards: { id: 'flashcards', label: 'Flashcards', icon: BookOpen, description: 'Memorize terms & concepts with flashcards' },
  tutor: { id: 'tutor', label: 'Tutor', icon: GraduationCap, description: 'Personalized interactive tutoring on your material' },
  notes: { id: 'notes', label: 'Notes', icon: FileText, description: 'Generate structured study notes and summaries' },
}

/**
 * Structured Notes Renderer — powered by RichMessageContent
 */
function FormattedNotesView({ text }) {
  if (!text) return null
  return <RichMessageContent content={text} />
}


/**
 * Reusable Material Selector Component
 * Allows selecting/deselecting materials uploaded in Knowledge Hub
 */
function MaterialSelector({
  uploadedSources = [],
  selectedMaterialIds = [],
  onToggle,
  onSelectAll,
  onClearAll,
  title = "Select Material from Knowledge Hub",
  subtitle = "Pick which documents to base this generation on:"
}) {
  const navigate = useNavigate()

  if (uploadedSources.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#E0D9D2] bg-[#FAF8F5] p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-[#FDEEE6] text-[#E8845F] flex items-center justify-center mx-auto mb-3">
          <BookOpen className="w-6 h-6" />
        </div>
        <h4 className="text-base font-bold text-[#1E1B16] mb-1">No Material Found in Knowledge Hub</h4>
        <p className="text-xs text-[#5B544E] max-w-md mx-auto mb-4">
          Upload your lecture notes, textbook chapters, or PDFs in the Knowledge Hub first. Then you can generate customized quizzes, flashcards, notes, and tutoring sessions directly from them.
        </p>
        <button
          type="button"
          onClick={() => navigate('/knowledge')}
          className="sw-btn-primary !h-9 !px-4 !text-xs inline-flex items-center space-x-1.5"
        >
          <span>Open Knowledge Hub</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  const allSelected = uploadedSources.length > 0 && selectedMaterialIds.length === uploadedSources.length

  return (
    <div className="rounded-2xl border border-[#EDE7E1] bg-white p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-[#F0EBE6]">
        <div>
          <div className="flex items-center space-x-2">
            <h4 className="text-sm font-bold text-[#1E1B16]">{title}</h4>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#FDEEE6] text-[#C05A35]">
              {selectedMaterialIds.length} of {uploadedSources.length} selected
            </span>
          </div>
          {subtitle && <p className="text-xs text-[#8A817B] mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center space-x-3 text-xs">
          <button
            type="button"
            onClick={allSelected ? onClearAll : onSelectAll}
            className="text-[#C05A35] hover:text-[#A74B2A] font-semibold transition-colors flex items-center space-x-1"
          >
            {allSelected ? <Square className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
            <span>{allSelected ? "Clear Selection" : "Select All"}</span>
          </button>
          <span className="text-[#D1C7BD]">•</span>
          <button
            type="button"
            onClick={() => navigate('/knowledge')}
            className="text-[#8A817B] hover:text-[#1E1B16] transition-colors inline-flex items-center space-x-1"
          >
            <span>+ Upload more</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
        {uploadedSources.map((source) => {
          const isSelected = selectedMaterialIds.includes(source.id)
          const ext = (source.type || source.name?.split('.').pop() || 'pdf').toLowerCase()
          
          return (
            <button
              key={source.id}
              type="button"
              onClick={() => onToggle(source.id)}
              className={`flex items-center space-x-3 p-2.5 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'border-[#E8845F] bg-[#FFF8F5] shadow-xs ring-1 ring-[#E8845F]/30'
                  : 'border-[#EDE7E1] bg-white hover:border-[#D1C7BD] hover:bg-[#FAF8F5]'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-[10px] uppercase tracking-wider ${
                ext === 'pdf' ? 'bg-red-50 text-red-600' :
                ext === 'docx' || ext === 'doc' ? 'bg-blue-50 text-blue-600' :
                'bg-amber-50 text-amber-700'
              }`}>
                {ext === 'pdf' ? 'PDF' : ext === 'docx' ? 'DOC' : 'TXT'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[#1E1B16] truncate" title={source.name}>
                  {source.name}
                </p>
                <div className="flex items-center space-x-2 text-[11px] text-[#8A817B]">
                  <span>{source.chunksIndexed ? `${source.chunksIndexed} chunks` : 'Indexed'}</span>
                  {source.size > 0 && (
                    <>
                      <span>•</span>
                      <span>{(source.size / (1024 * 1024)).toFixed(1)} MB</span>
                    </>
                  )}
                </div>
              </div>
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                isSelected ? 'border-[#E8845F] bg-[#E8845F] text-white' : 'border-[#D1C7BD] bg-white'
              }`}>
                {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function AIWorkspacePage() {
  const { mode: urlMode } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  
  const { uploadedSources, activeSourceIds, toggleActiveSource } = useSourceStore()
  const { user, accessToken } = useAuthStore()
  
  const workspaceStore = useWorkspaceStore()
  const {
    activeMode, setActiveMode,
    selectedMaterialIds, setSelectedMaterialIds,
    isGenerating: isGeneratingMap,
    notifications,
    clearNotification,
    quiz, setQuizOption, setQuizAnswer, setCurrentQuizIndex, submitQuiz, resetQuiz, startQuizGeneration,
    flashcards: flashcardsState, setFlashcardOption, setCurrentCardIndex, toggleCardFlip, setFlashcardRating, resetFlashcards, startFlashcardGeneration,
    notes: notesState, setNotesOption, setNotesTitle, setNotesContent, clearNotes, loadCloudNote, fetchCloudNotesList, saveCurrentNoteToCloud, deleteCloudNoteAction, startNotesGeneration,
    tutor: tutorState, setTutorOption,
    chatMessages, setChatMessages, addChatMessage,
  } = workspaceStore

  // Quiz aliases
  const quizQuestions = quiz.questions
  const currentQuizIndex = quiz.currentIndex
  const quizAnswers = quiz.answers
  const quizCompleted = quiz.completed
  const quizCount = quiz.count
  const setQuizCount = (v) => setQuizOption('count', v)
  const quizDifficulty = quiz.difficulty
  const setQuizDifficulty = (v) => setQuizOption('difficulty', v)
  const quizType = quiz.type
  const setQuizType = (v) => setQuizOption('type', v)
  const quizTopic = quiz.topic
  const setQuizTopic = (v) => setQuizOption('topic', v)
  const setQuizQuestions = (v) => setQuizOption('questions', typeof v === 'function' ? v(quiz.questions) : v)
  const setQuizAnswers = (v) => setQuizOption('answers', typeof v === 'function' ? v(quiz.answers) : v)
  const setQuizCompleted = (v) => setQuizOption('completed', !!v)

  // Flashcards aliases
  const flashcards = flashcardsState.cards
  const currentCardIndex = flashcardsState.currentIndex
  const isFlipped = flashcardsState.isFlipped
  const setIsFlipped = (v) => setFlashcardOption('isFlipped', typeof v === 'function' ? v(flashcardsState.isFlipped) : !!v)
  const flashcardRating = flashcardsState.rating
  const flashcardCount = flashcardsState.count
  const setFlashcardCount = (v) => setFlashcardOption('count', v)
  const flashcardFocus = flashcardsState.focus
  const setFlashcardFocus = (v) => setFlashcardOption('focus', v)
  const flashcardTopic = flashcardsState.topic
  const setFlashcardTopic = (v) => setFlashcardOption('topic', v)
  const setFlashcards = (v) => setFlashcardOption('cards', typeof v === 'function' ? v(flashcardsState.cards) : v)

  // Notes aliases & cloud state
  const generatedContent = notesState.content
  const setGeneratedContent = (v) => setNotesContent(v)
  const notesTitle = notesState.title || 'Untitled Study Notes'
  const notesStyle = notesState.style
  const setNotesStyle = (v) => setNotesOption('style', v)
  const notesDepth = notesState.depth
  const setNotesDepth = (v) => setNotesOption('depth', v)
  const notesTopic = notesState.topic
  const setNotesTopic = (v) => setNotesOption('topic', v)
  const isCloudSaved = notesState.isCloudSaved
  const isSavingCloud = notesState.isSavingCloud
  const isFetchingCloud = notesState.isFetchingCloud
  const cloudNotes = notesState.cloudNotes || []
  const activeNotesView = notesState.activeView || 'reader'
  const setActiveNotesView = (v) => setNotesOption('activeView', v)

  // Notes UI state
  const [showCloudDrawer, setShowCloudDrawer] = useState(false)
  const [cloudSearchQuery, setCloudSearchQuery] = useState('')
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')

  // Tutor aliases
  const isTutorSessionActive = tutorState.isSessionActive
  const setIsTutorSessionActive = (v) => setTutorOption('isSessionActive', typeof v === 'function' ? v(tutorState.isSessionActive) : v)
  const rawTutorStyle = tutorState.style || ''
  const tutorStyle = ['Friendly', 'Tutor', 'Mentor'].includes(rawTutorStyle)
    ? rawTutorStyle
    : (typeof window !== 'undefined' && localStorage.getItem('sw_ai_persona')
        ? (localStorage.getItem('sw_ai_persona').charAt(0).toUpperCase() + localStorage.getItem('sw_ai_persona').slice(1))
        : 'Tutor')
  const setTutorStyle = (v) => setTutorOption('style', v)
  const tutorTopic = tutorState.topic
  const setTutorTopic = (v) => setTutorOption('topic', v)

  // Chat local UI state
  const messages = chatMessages
  const setMessages = setChatMessages
  const [input, setInput] = useState('')
  const [showChatSourceSelector, setShowChatSourceSelector] = useState(false)
  const [chatGenerating, setChatGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(null)

  // Active generating indicator for UI buttons and spinners
  const isGenerating = Boolean(isGeneratingMap[activeMode]) || chatGenerating
  const setIsGenerating = (val) => {
    setChatGenerating(val)
  }

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Sync mode with URL
  useEffect(() => {
    if (urlMode && MODES[urlMode]) {
      setActiveMode(urlMode)
      clearNotification(urlMode)
    }
  }, [urlMode, setActiveMode, clearNotification])

  // Hydrate cloud notes when entering notes mode
  useEffect(() => {
    if (accessToken && activeMode === 'notes') {
      fetchCloudNotesList(accessToken)
    }
  }, [accessToken, activeMode, fetchCloudNotesList])

  // Hydrate sources from backend if store is empty
  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/sources`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (res.ok) {
        const data = await res.json()
        const localIds = useSourceStore.getState().uploadedSources.map((s) => s.id)
        const fresh = data.filter((s) => !localIds.includes(s.id) && (s.type || '').toLowerCase() !== 'note').map((s) => ({
          id: s.id,
          name: s.name,
          size: s.size || 0,
          type: s.type || 'pdf',
          status: s.status || 'ready',
          chunksIndexed: s.chunks_count ?? s.chunks_indexed ?? 0,
          chunksCount: s.chunks_count ?? s.chunks_indexed ?? 0,
        }))
        if (fresh.length) {
          useSourceStore.setState((st) => ({ uploadedSources: [...fresh, ...st.uploadedSources] }))
        }
      }
    } catch {
      // offline fallback
    }
  }, [accessToken])

  useEffect(() => {
    fetchSources()
  }, [fetchSources])

  // Initialize selected materials
  useEffect(() => {
    const preselectedId = location.state?.sourceId
    if (preselectedId) {
      setSelectedMaterialIds([preselectedId])
      return
    }

    if (activeSourceIds.length > 0) {
      setSelectedMaterialIds(activeSourceIds)
    } else if (uploadedSources.length > 0) {
      // Default to selecting all uploaded sources if none selected yet
      setSelectedMaterialIds(uploadedSources.map(s => s.id))
    }
  }, [activeSourceIds, uploadedSources, location.state])

  // Prepopulate initial prompts or topics from location state, with auto-send support
  useEffect(() => {
    if (location.state?.initialPrompt) {
      const prompt = location.state.initialPrompt
      setInput(prompt)
      setQuizTopic(prompt)
      setFlashcardTopic(prompt)
      setNotesTopic(prompt)
      setTutorTopic(prompt)

      if (location.state.autoSend) {
        const timer = setTimeout(() => {
          handleSendMessage(prompt)
        }, 120)
        return () => clearTimeout(timer)
      }
    }
  }, [location.state])

  // Auto-scroll chat / tutor messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle switching tabs
  const handleModeChange = (mode) => {
    setActiveMode(mode)
    clearNotification(mode)
    navigate(`/workspace/${mode}`, { replace: true })
    setError(null)
  }

  // Material selection helpers
  const handleToggleMaterial = (sourceId) => {
    setSelectedMaterialIds(prev => {
      const next = prev.includes(sourceId) ? prev.filter(id => id !== sourceId) : [...prev, sourceId]
      // Also update store's active source ids for system harmony
      toggleActiveSource(sourceId)
      return next
    })
  }

  const handleSelectAllMaterials = () => {
    const allIds = uploadedSources.map(s => s.id)
    setSelectedMaterialIds(allIds)
  }

  const handleClearAllMaterials = () => {
    setSelectedMaterialIds([])
  }

  // Track progress events
  const trackContentGeneration = async (eventType) => {
    if (!accessToken) return
    try {
      await fetch(`${API_URL}/progress/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          event_type: eventType,
          source_id: selectedMaterialIds[0] || null,
          metadata: { source_count: selectedMaterialIds.length },
        }),
      })
    } catch (err) {
      console.error('[Progress] Content generation tracking error:', err)
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // GENERATION HANDLERS (Quiz, Flashcards, Notes, Tutor)
  // ════════════════════════════════════════════════════════════════════════════



  // 1. Generate Quiz (Runs in background store, never stops when leaving)
  const handleGenerateQuiz = async () => {
    if (selectedMaterialIds.length === 0) {
      setError("Please select at least one material uploaded in Knowledge Hub.")
      return
    }

    setError(null)
    try {
      await startQuizGeneration({
        sourceIds: selectedMaterialIds,
        userId: user?.id || 'anonymous',
        count: quizCount,
        difficulty: quizDifficulty,
        type: quizType,
        topic: quizTopic,
        token: accessToken
      })
    } catch (err) {
      setError(err.message || "Failed to generate quiz. Please verify that your AI service is active.")
    }
  }

  // 2. Generate Flashcards (Runs in background store, never stops when leaving)
  const handleGenerateFlashcards = async () => {
    if (selectedMaterialIds.length === 0) {
      setError("Please select at least one material uploaded in Knowledge Hub.")
      return
    }

    setError(null)
    try {
      await startFlashcardGeneration({
        sourceIds: selectedMaterialIds,
        userId: user?.id || 'anonymous',
        count: flashcardCount,
        focus: flashcardFocus,
        topic: flashcardTopic,
        token: accessToken
      })
    } catch (err) {
      setError(err.message || "Failed to generate flashcards. Please check your backend connection.")
    }
  }

  // 3. Generate Notes (Runs in background store, never stops when leaving)
  const handleGenerateNotes = async () => {
    if (selectedMaterialIds.length === 0) {
      setError("Please select at least one material uploaded in Knowledge Hub.")
      return
    }

    setError(null)
    try {
      await startNotesGeneration({
        sourceIds: selectedMaterialIds,
        userId: user?.id || 'anonymous',
        style: notesStyle,
        depth: notesDepth,
        topic: notesTopic,
        token: accessToken
      })
    } catch (err) {
      setError(err.message || "Failed to generate notes. Please check that python-ai is running.")
    }
  }

  // 4. Start Tutoring Session on Selected Material
  const handleStartTutorSession = async () => {
    if (selectedMaterialIds.length === 0) {
      setError("Please select at least one material uploaded in Knowledge Hub to study with the tutor.")
      return
    }

    setIsGenerating(true)
    setError(null)
    const topicDesc = tutorTopic.trim() ? `topic "${tutorTopic.trim()}"` : "the core concepts in this document"
    const prompt = `Hello! I would like you to be my personal study tutor for my uploaded documents. We are focusing on ${topicDesc}.
Please use the "${tutorStyle}" method.
Begin our session by giving a warm 2-sentence welcome, introducing the first fundamental concept from the material, and asking me an engaging question to test what I know or walk me through it step-by-step.`

    try {
      const response = await sendAgentMessage({
        message: prompt,
        sourceIds: selectedMaterialIds,
        userId: user?.id || 'anonymous',
        history: [],
        context: { action: 'tutor', mode: 'tutor', style: tutorStyle, topic: tutorTopic }
      })

      const greeting = response.message || response.data?.explanation || "Welcome to your tutoring session! Let's explore your study material together."
      setMessages([
        { role: 'assistant', content: greeting, citations: response.data?.citations || [] }
      ])
      setIsTutorSessionActive(true)
    } catch (err) {
      setError(err.message || "Failed to start tutoring session.")
    } finally {
      setIsGenerating(false)
    }
  }

  // Inline task completion handler
  const handleCompleteTaskInline = async (slotId) => {
    if (!slotId || !accessToken) return
    try {
      await fetch(`${API_URL}/tutor/tasks/${slotId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ actualDuration: 45 }),
      })
      // Update local message tasks to completed
      setMessages(prev => prev.map(m => {
        if (!m.tasks) return m
        return {
          ...m,
          tasks: m.tasks.map(t => (t.id === slotId ? { ...t, status: 'completed', is_completed: true } : t))
        }
      }))
    } catch (err) {
      console.error('[AIWorkspace] Complete task error:', err)
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // INTERACTIVE CHAT & TUTOR MESSAGE SENDER
  // ════════════════════════════════════════════════════════════════════════════
  const handleSendMessage = async (textOverride = null) => {
    const rawText = textOverride !== null ? textOverride : input
    if (!rawText.trim() || isGenerating) return
    const userMessage = rawText.trim()
    if (textOverride === null) setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsGenerating(true)

    // Check if query is greeting, personal productivity / task inquiry or if no sources selected
    const isPersonalQuery = selectedMaterialIds.length === 0 || 
      /^\s*(hi|hello|hey|howdy|sup|hola|yo|good\s+(morning|afternoon|evening)|who\s+are\s+you|what\s+can\s+you\s+do|help)(\s*!|\s*\.|\s*\?|\s*$)/i.test(userMessage) ||
      /\b(task|tasks|pending|schedule|pace|pacing|what should i study|what to study|mark .* done|complete|today'?s?)\b/i.test(userMessage)

    if (isPersonalQuery || activeMode === 'tutor') {
      try {
        const response = await sendAgentMessage({
          message: userMessage,
          sourceIds: selectedMaterialIds,
          userId: user?.id || 'anonymous',
          history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
          context: { action: activeMode === 'tutor' ? 'tutor' : undefined, mode: activeMode, style: tutorStyle }
        })
        const reply = response.message || response.data?.explanation || response.data?.answer || JSON.stringify(response.data)
        const tasks = response.data?.tasks || (response.data?.action === 'list_tasks' ? response.data?.pending_tasks : null) || []
        
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: reply, 
          citations: response.data?.citations || [],
          tasks: tasks,
          actionType: response.type
        }])
      } catch (err) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }])
      } finally {
        setIsGenerating(false)
      }
    } else {
      // Document RAG chat with streaming
      let assistantMessage = { role: 'assistant', content: '', citations: [] }
      setMessages(prev => [...prev, assistantMessage])

      await streamChat({
        question: userMessage,
        sourceIds: selectedMaterialIds,
        userId: user?.id || 'anonymous',
        history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
        onCitations: (citations) => {
          setMessages(prev => {
            const next = [...prev]
            next[next.length - 1] = { ...next[next.length - 1], citations }
            return next
          })
        },
        onToken: (token) => {
          setMessages(prev => {
            const next = [...prev]
            const last = next[next.length - 1]
            next[next.length - 1] = { ...last, content: last.content + token }
            return next
          })
        },
        onDone: () => setIsGenerating(false),
        onError: (err) => {
          setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err}` }])
          setIsGenerating(false)
        }
      })
    }
  }

  // Quiz Interaction Handlers
  const handleQuizAnswer = (questionIndex, answerIndex) => {
    setQuizAnswer(questionIndex, answerIndex)
  }

  const handleQuizSubmit = () => {
    submitQuiz()
    trackQuizProgress()
  }

  const trackQuizProgress = async () => {
    if (!accessToken) return
    const total = quizQuestions.length
    const correct = quizQuestions.reduce((count, q, idx) => {
      return count + (quizAnswers[idx] === q.correct ? 1 : 0)
    }, 0)
    const score = total > 0 ? Math.round((correct / total) * 100) : 0

    try {
      await fetch(`${API_URL}/progress/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          event_type: 'quiz',
          score,
          correct: score >= 70,
          metadata: { total, correct, source_ids: selectedMaterialIds },
        }),
      })

      for (const q of quizQuestions) {
        const qCorrect = quizAnswers[quizQuestions.indexOf(q)] === q.correct
        await fetch(`${API_URL}/mastery`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            concept: q.concept || q.question?.slice(0, 50) || 'general',
            score: qCorrect ? 100 : 0,
            correct: qCorrect,
            source_id: selectedMaterialIds[0] || null,
          }),
        })
      }
    } catch (err) {
      console.error('[Quiz] Progress tracking error:', err)
    }
  }

  // Flashcard Rating Handler
  const handleFlashcardRating = async (rating) => {
    setFlashcardRating(rating)
    const scoreMap = { easy: 95, good: 80, hard: 50, again: 20 }
    const score = scoreMap[rating] || 50
    const correct = score >= 70

    if (accessToken) {
      try {
        const concept = flashcards[currentCardIndex]?.front?.slice(0, 100) || 'flashcard'
        await fetch(`${API_URL}/progress/track`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            event_type: 'flashcard_review',
            concept,
            score,
            correct,
            source_id: selectedMaterialIds[0] || null,
          }),
        })
      } catch (err) {
        console.error('[Flashcard] Progress tracking error:', err)
      }
    }

    setTimeout(() => {
      if (currentCardIndex < flashcards.length - 1) {
        setCurrentCardIndex(currentCardIndex + 1)
        setIsFlipped(false)
      }
      setFlashcardRating(null)
    }, 250)
  }

  const handleCopyNotes = () => {
    if (!generatedContent) return
    navigator.clipboard.writeText(generatedContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExportPdf = () => {
    if (!generatedContent) return
    exportNotesAsPdf({
      title: notesTitle,
      content: generatedContent,
      style: notesStyle,
      depth: notesDepth,
      topic: notesTopic,
    })
    setExportMenuOpen(false)
  }

  const handleExportJson = () => {
    if (!generatedContent) return
    exportNotesAsJson({
      id: notesState.id,
      title: notesTitle,
      content: generatedContent,
      style: notesStyle,
      depth: notesDepth,
      topic: notesTopic,
      createdAt: notesState.createdAt,
    })
    setExportMenuOpen(false)
  }

  const handleExportMarkdown = () => {
    if (!generatedContent) return
    exportNotesAsMarkdown({
      title: notesTitle,
      content: generatedContent,
    })
    setExportMenuOpen(false)
  }

  const handleSaveToCloud = async () => {
    if (!generatedContent || !accessToken) return
    try {
      await saveCurrentNoteToCloud(accessToken, notesTitle)
    } catch (err) {
      setError(err.message || 'Failed to save note to cloud storage.')
    }
  }

  const handleDeleteCloudNote = async (noteId, e) => {
    e?.stopPropagation()
    if (!accessToken || !window.confirm('Are you sure you want to remove this note from cloud storage?')) return
    try {
      await deleteCloudNoteAction(noteId, accessToken)
    } catch (err) {
      setError(err.message || 'Failed to delete note from cloud storage.')
    }
  }

  const handleSelectCloudNote = (note) => {
    loadCloudNote(note)
    setShowCloudDrawer(false)
  }

  const handleSaveTitle = () => {
    if (titleDraft.trim()) {
      setNotesTitle(titleDraft.trim())
    }
    setIsEditingTitle(false)
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: CHAT MODE
  // ════════════════════════════════════════════════════════════════════════════
  const renderChatMode = () => (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Top Banner with Material Selector Toggle */}
      <div className="px-6 py-3 bg-[#FAF8F5] border-b border-[#EDE7E1] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <BookOpen className="w-4 h-4 text-[#E8845F]" />
          <span className="text-xs font-semibold text-[#1E1B16]">
            Active Context: {selectedMaterialIds.length} of {uploadedSources.length} material(s)
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowChatSourceSelector(prev => !prev)}
          className="text-xs font-semibold text-[#C05A35] hover:text-[#A74B2A] transition-colors"
        >
          {showChatSourceSelector ? "Hide Material Selector" : "Change Material"}
        </button>
      </div>

      {showChatSourceSelector && (
        <div className="p-4 bg-[#FAF8F5] border-b border-[#EDE7E1]">
          <MaterialSelector
            uploadedSources={uploadedSources}
            selectedMaterialIds={selectedMaterialIds}
            onToggle={handleToggleMaterial}
            onSelectAll={handleSelectAllMaterials}
            onClearAll={handleClearAllMaterials}
            title="Chat Knowledge Sources"
            subtitle="The AI grounds every response strictly in these documents:"
          />
        </div>
      )}

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-8">
            <img 
              src="/workspace-chat.png" 
              alt="Student chatting with the fox companion" 
              className="w-48 h-32 object-contain mb-3 mix-blend-multiply" 
            />
            <h3 className="text-xl font-display font-bold text-[#1E1B16] mb-1.5">Chat with Your Material</h3>
            <p className="text-xs text-[#5B544E] max-w-md mb-6 leading-relaxed">
              Ask questions, request summaries, or clarify tricky points. Every answer is grounded in your uploaded documents with source page citations.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full text-left">
              {[
                "Summarize the core concepts of this material",
                "What are the most important terms and definitions?",
                "What exam questions might be asked on this?",
                "Explain the main framework step-by-step"
              ].map((suggestion, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setInput(suggestion); inputRef.current?.focus() }}
                  className="p-3 rounded-xl border border-[#EDE7E1] bg-white hover:border-[#E8845F] hover:bg-[#FFF8F5] text-xs text-[#1E1B16] text-center transition-all"
                >
                  <span className="font-medium line-clamp-2 text-center">
                    <Sparkles className="w-3.5 h-3.5 text-[#E8845F] inline-block mr-1.5 -mt-0.5" />
                    {suggestion}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-[#FDEEE6] flex items-center justify-center mr-3 shrink-0 mt-1">
                <Brain className="w-4 h-4 text-[#E8845F]" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-2xl px-5 py-4 ${
              msg.role === 'user'
                ? 'bg-[#E8845F] text-white shadow-xs'
                : 'bg-white border border-[#EDE7E1] text-[#1E1B16] shadow-xs'
            }`}>
              <RichMessageContent content={msg.content} isUser={msg.role === 'user'} />

              {/* Interactive Personal AI Task Cards */}
              {msg.tasks && msg.tasks.length > 0 && (
                <div className="mt-4 pt-3 border-t border-[#EDE7E1] space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#8A817B] uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5 text-[#E8845F]" />
                      Tasks ({msg.tasks.filter(t => t.status !== 'completed' && !t.is_completed).length} pending)
                    </span>
                    <span className="text-[10px] font-normal normal-case text-[#B0A8A0]">Click to mark complete</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {msg.tasks.map((task, tIdx) => {
                      const isDone = task.status === 'completed' || task.is_completed
                      return (
                        <div
                          key={task.id || tIdx}
                          className={`p-3 rounded-xl border transition-all text-left flex flex-col justify-between ${
                            isDone
                              ? 'bg-[#F9F7F5] border-[#E5DFD9] opacity-60'
                              : 'bg-white border-[#EDE7E1] hover:border-[#E8845F] hover:shadow-xs'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1.5 mb-1.5">
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F3EFEB] text-[#8A817B]">
                                {task.subject || 'General'}
                              </span>
                              <span className="text-[11px] text-[#A8A199]">
                                {task.duration ? `${task.duration}m` : ''} {task.time ? `• ${task.time}` : ''}
                              </span>
                            </div>
                            <h4 className={`text-xs font-semibold text-[#1E1B16] line-clamp-2 ${isDone ? 'line-through text-[#8A817B]' : ''}`}>
                              {task.title || task.topic || 'Study Session'}
                            </h4>
                          </div>
                          <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#F3EFEB]">
                            <button
                              type="button"
                              disabled={isDone}
                              onClick={() => handleCompleteTaskInline(task.id)}
                              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${
                                isDone
                                  ? 'text-[#2D9D78] bg-[#E8F7F0] cursor-default'
                                  : 'text-[#E8845F] bg-[#FFF8F5] hover:bg-[#FDEEE6]'
                              }`}
                            >
                              {isDone ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Completed</span>
                                </>
                              ) : (
                                <>
                                  <Square className="w-3.5 h-3.5" />
                                  <span>Mark Done</span>
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setInput(`Help me study ${task.title || task.topic || task.subject}`)
                                inputRef.current?.focus()
                              }}
                              className="text-[11px] text-[#8A817B] hover:text-[#E8845F] font-medium"
                            >
                              Study this &rarr;
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {msg.citations && msg.citations.length > 0 && (
                <div className="-mx-5 -mb-4 mt-4 px-5 py-3 bg-[#FAFAFA] border-t border-[#EDE7E1] rounded-b-2xl">
                  <p className="text-[11px] font-semibold text-[#8A817B] mb-1.5 uppercase tracking-wider">Source Grounding</p>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.citations.map((cite, i) => (
                      <span key={i} className="text-xs bg-white border border-[#EDE7E1] rounded-lg px-2.5 py-1 text-[#5B544E]">
                        <span className="font-semibold text-[#1E1B16]">{cite.source_name}</span> (p.{cite.page})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isGenerating && (
          <div className="flex items-start">
            <div className="w-8 h-8 rounded-lg bg-[#FDEEE6] flex items-center justify-center mr-3 shrink-0">
              <Brain className="w-4 h-4 text-[#E8845F] animate-pulse" />
            </div>
            <div className="bg-white border border-[#EDE7E1] rounded-2xl px-5 py-4 flex items-center space-x-2 shadow-xs">
              <Loader2 className="w-4 h-4 animate-spin text-[#E8845F]" />
              <span className="text-xs text-[#8A817B]">Grounding response in your documents...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: QUIZ MODE (Select material -> Customize -> Generate -> Take Quiz)
  // ════════════════════════════════════════════════════════════════════════════
  const renderQuizMode = () => {
    // 1. Quiz Completed View
    if (quizCompleted && quizQuestions.length > 0) {
      const total = quizQuestions.length
      const correct = quizQuestions.reduce((count, q, idx) => count + (quizAnswers[idx] === q.correct ? 1 : 0), 0)
      const score = total > 0 ? Math.round((correct / total) * 100) : 0

      return (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            <GlowCard className="p-8 text-center">
              <Award className="w-16 h-16 text-[#E8845F] mx-auto mb-3" />
              <h3 className="text-2xl font-display font-bold mb-1 text-[#1E1B16]">Quiz Results</h3>
              <p className="text-xs text-[#8A817B] mb-4">Generated from {selectedMaterialIds.length} source document(s)</p>
              
              <div className="text-5xl font-extrabold text-[#C05A35] mb-2">{score}%</div>
              <p className="text-sm font-medium text-[#5B544E] mb-6">You got {correct} out of {total} questions correct</p>

              <div className="text-left space-y-3 mb-6">
                {quizQuestions.map((q, idx) => {
                  const isCorrect = quizAnswers[idx] === q.correct
                  return (
                    <div key={idx} className={`p-4 rounded-xl border text-sm ${
                      isCorrect ? 'bg-green-50/70 border-green-200 text-green-900' : 'bg-red-50/70 border-red-200 text-red-900'
                    }`}>
                      <div className="flex items-start space-x-2.5">
                        {isCorrect ? <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />}
                        <div className="flex-1">
                          <p className="font-semibold">{idx + 1}. {q.question}</p>
                          <p className="text-xs mt-1 text-[#5B544E]">
                            Correct answer: <span className="font-bold">{String.fromCharCode(65 + q.correct)}. {q.options[q.correct]}</span>
                          </p>
                          {q.explanation && (
                            <p className="text-xs mt-1.5 pt-1.5 border-t border-black/5 text-[#5B544E] italic">
                              {q.explanation}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex justify-center space-x-3">
                <button
                  type="button"
                  onClick={() => resetQuiz()}
                  className="sw-btn-secondary !h-10 !px-5 !text-xs inline-flex items-center space-x-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retake This Quiz</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setQuizQuestions([]); resetQuiz(); }}
                  className="sw-btn-primary !h-10 !px-5 !text-xs inline-flex items-center space-x-1.5"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Generate New Quiz</span>
                </button>
              </div>
            </GlowCard>
          </div>
        </div>
      )
    }

    // 2. Active Quiz Taking View
    if (quizQuestions.length > 0) {
      const currentQ = quizQuestions[currentQuizIndex]
      const totalAnswered = Object.keys(quizAnswers).length

      return (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Header Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-[#EDE7E1]">
              <div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#FDEEE6] text-[#C05A35]">
                  Question {currentQuizIndex + 1} of {quizQuestions.length}
                </span>
                <span className="text-xs text-[#8A817B] ml-2">
                  ({totalAnswered}/{quizQuestions.length} answered)
                </span>
              </div>
              <button
                type="button"
                onClick={() => { setQuizQuestions([]); resetQuiz(); }}
                className="text-xs text-[#8A817B] hover:text-[#C05A35] transition-colors"
              >
                Quit / New Quiz
              </button>
            </div>

            {/* Question Card */}
            {currentQ && (
              <GlowCard className="p-6">
                <p className="text-base font-semibold text-[#1E1B16] mb-5 leading-snug">
                  {currentQuizIndex + 1}. {(currentQ.question || '')
                    .replace(/^(?:#+\s*)?(?:Question\s*\d*[\.:]?|\bQ\d*[\.:]?|\d+[\.:])\s*/i, '')
                    .replace(/\*\*/g, '')
                    .replace(/\*/g, '')
                    .trim()}
                </p>

                <div className="space-y-2.5">
                  {currentQ.options.map((option, idx) => {
                    const isSelected = quizAnswers[currentQuizIndex] === idx
                    const cleanOption = typeof option === 'string'
                      ? option.replace(/^(?:[-*•]\s*)?(?:[A-D][\)\.:])\s*/i, '').replace(/\*\*/g, '').replace(/\*/g, '').trim()
                      : option

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleQuizAnswer(currentQuizIndex, idx)}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all text-sm flex items-center justify-between ${
                          isSelected
                            ? 'border-[#E8845F] bg-[#FFF8F5] text-[#1E1B16] shadow-xs ring-1 ring-[#E8845F]/40'
                            : 'border-[#EDE7E1] bg-white text-[#5B544E] hover:border-[#D1C7BD] hover:bg-[#FAF8F5]'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                            isSelected ? 'bg-[#E8845F] text-white' : 'bg-[#F3EFEB] text-[#8A817B]'
                          }`}>
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span className="font-medium">{cleanOption}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#E8845F] shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              </GlowCard>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setCurrentQuizIndex(Math.max(0, currentQuizIndex - 1))}
                disabled={currentQuizIndex === 0}
                className="sw-btn-secondary !h-10 !px-4 !text-xs disabled:opacity-40"
              >
                Previous
              </button>
              {currentQuizIndex < quizQuestions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentQuizIndex(currentQuizIndex + 1)}
                  className="sw-btn-primary !h-10 !px-5 !text-xs inline-flex items-center space-x-1.5"
                >
                  <span>Next Question</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleQuizSubmit}
                  className="sw-btn-primary !h-10 !px-6 !text-xs inline-flex items-center space-x-1.5 shadow-warm"
                >
                  <Check className="w-4 h-4" />
                  <span>Submit Quiz</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )
    }

    // 3. Quiz Setup & Material Selection View
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center max-w-xl mx-auto pb-2">
            <div className="w-12 h-12 rounded-2xl bg-[#FDEEE6] text-[#E8845F] flex items-center justify-center mx-auto mb-2.5">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-display font-bold text-[#1E1B16] mb-1">Generate a Quiz from Your Material</h3>
            <p className="text-xs text-[#5B544E]">
              Select the documents uploaded in your Knowledge Hub, choose your questions, and test your knowledge instantly.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {isGeneratingMap.quiz && (
            <div className="p-4 rounded-xl bg-[#FFF8F5] border border-[#E8845F]/30 text-xs text-[#1E1B16] flex items-center justify-between shadow-xs">
              <div className="flex items-center space-x-3">
                <Loader2 className="w-5 h-5 text-[#E8845F] animate-spin shrink-0" />
                <div>
                  <p className="font-bold text-sm text-[#C05A35]">Generating your Quiz in the background...</p>
                  <p className="text-[11px] text-[#5B544E] mt-0.5">
                    You can safely switch tabs or leave this page. We will notify you with a badge the moment it's ready!
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-semibold uppercase px-2.5 py-1 rounded-full bg-[#FDEEE6] text-[#C05A35] shrink-0">
                In Progress
              </span>
            </div>
          )}

          {/* 1. Select Study Material from Knowledge Hub */}
          <MaterialSelector
            uploadedSources={uploadedSources}
            selectedMaterialIds={selectedMaterialIds}
            onToggle={handleToggleMaterial}
            onSelectAll={handleSelectAllMaterials}
            onClearAll={handleClearAllMaterials}
            title="1. Select Material to Quiz On"
            subtitle="The quiz questions will be generated directly from the content of these documents:"
          />

          {/* 2. Configure Quiz Options */}
          <div className="rounded-2xl border border-[#EDE7E1] bg-white p-5 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-[#1E1B16] flex items-center space-x-2">
              <SlidersHorizontal className="w-4 h-4 text-[#E8845F]" />
              <span>2. Quiz Settings</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Question Count */}
              <div>
                <label className="block text-xs font-semibold text-[#5B544E] mb-2">Number of Questions</label>
                <div className="flex rounded-xl border border-[#EDE7E1] p-1 bg-[#FAF8F5]">
                  {[5, 10, 15].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setQuizCount(cnt)}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        quizCount === cnt ? 'bg-white text-[#C05A35] shadow-xs' : 'text-[#8A817B] hover:text-[#1E1B16]'
                      }`}
                    >
                      {cnt} Qs
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-xs font-semibold text-[#5B544E] mb-2">Difficulty</label>
                <div className="flex rounded-xl border border-[#EDE7E1] p-1 bg-[#FAF8F5]">
                  {['easy', 'medium', 'hard'].map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setQuizDifficulty(diff)}
                      className={`flex-1 py-1.5 text-xs font-semibold capitalize rounded-lg transition-all ${
                        quizDifficulty === diff ? 'bg-white text-[#C05A35] shadow-xs' : 'text-[#8A817B] hover:text-[#1E1B16]'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              {/* Format */}
              <div>
                <label className="block text-xs font-semibold text-[#5B544E] mb-2">Question Type</label>
                <div className="flex rounded-xl border border-[#EDE7E1] p-1 bg-[#FAF8F5]">
                  {['multiple choice', 'mixed review'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setQuizType(type)}
                      className={`flex-1 py-1.5 text-xs font-semibold capitalize rounded-lg transition-all truncate px-2 ${
                        quizType === type ? 'bg-white text-[#C05A35] shadow-xs' : 'text-[#8A817B] hover:text-[#1E1B16]'
                      }`}
                    >
                      {type === 'multiple choice' ? 'MCQ (A-D)' : 'Mixed'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Optional Specific Focus / Topic */}
            <div>
              <label className="block text-xs font-semibold text-[#5B544E] mb-1.5">
                Specific Topic or Section Focus (Optional)
              </label>
              <input
                type="text"
                value={quizTopic}
                onChange={(e) => setQuizTopic(e.target.value)}
                placeholder="e.g. Chapter 3, key formulas, cell structure (leave blank to cover the whole document)"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#EDE7E1] focus:outline-none focus:border-[#E8845F] bg-[#FAF8F5]"
              />
            </div>
          </div>

          {/* Action Button */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={handleGenerateQuiz}
              disabled={isGenerating || selectedMaterialIds.length === 0}
              className="sw-btn-primary !h-12 !px-8 !text-sm inline-flex items-center space-x-2 shadow-warm disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Reading Material & Building Quiz...</span>
                </>
              ) : (
                <>
                  <HelpCircle className="w-4 h-4" />
                  <span>Generate Quiz from Selected Material</span>
                </>
              )}
            </button>
            {selectedMaterialIds.length === 0 && (
              <p className="text-[11px] text-red-500 mt-2">Please select at least one material above to enable generation.</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: FLASHCARDS MODE (Select material -> Customize -> Generate -> Flip)
  // ════════════════════════════════════════════════════════════════════════════
  const renderFlashcardsMode = () => {
    // Active Flashcards View
    if (flashcards.length > 0) {
      const card = flashcards[currentCardIndex]
      const progressPercent = Math.round(((currentCardIndex + 1) / flashcards.length) * 100)

      return (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-xl mx-auto space-y-6">
            {/* Header Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-[#EDE7E1]">
              <div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#FDEEE6] text-[#C05A35]">
                  Card {currentCardIndex + 1} of {flashcards.length}
                </span>
                <span className="text-xs text-[#8A817B] ml-2">({progressPercent}% reviewed)</span>
              </div>
              <button
                type="button"
                onClick={() => { setFlashcards([]); setCurrentCardIndex(0); setIsFlipped(false) }}
                className="text-xs text-[#8A817B] hover:text-[#C05A35] transition-colors"
              >
                Create New Deck / Change Material
              </button>
            </div>

            {/* 3D Interactive Flip Card */}
            {card && (() => {
              const cleanFront = (card.front || '')
                .replace(/^(?:#+\s*)?(?:Card\s*\d+[:\.]?\s*)?(?:Front\s*[:\.]?\s*)/i, '')
                .replace(/\*\*/g, '')
                .replace(/\*/g, '')
                .trim()
              const cleanBack = (card.back || '')
                .replace(/^(?:#+\s*)?(?:Back\s*[:\.]?\s*)/i, '')
                .replace(/\*\*/g, '')
                .replace(/\*/g, '')
                .trim()

              return (
                <div 
                  onClick={toggleCardFlip}
                  className="relative w-full h-72 cursor-pointer select-none group perspective-1000"
                  style={{ perspective: '1000px' }}
                >
                  <div
                    className={`relative w-full h-full rounded-2xl transform-style-3d shadow-md ${
                      isFlipped ? 'rotate-y-180' : ''
                    }`}
                    style={{
                      transformStyle: 'preserve-3d',
                      WebkitTransformStyle: 'preserve-3d',
                      transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                      transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    {/* Front Side */}
                    <div
                      className="absolute inset-0 rounded-2xl bg-white border-2 border-[#EDE7E1] p-8 flex flex-col items-center justify-center text-center backface-hidden group-hover:border-[#E8845F]/50 transition-colors"
                      style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                      }}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A817B] mb-3">Front • Question / Concept</span>
                      <p className="text-lg font-bold text-[#1E1B16] leading-relaxed">{cleanFront}</p>
                      <span className="text-xs text-[#8A817B] mt-6 flex items-center space-x-1">
                        <RotateCcw className="w-3 h-3 text-[#E8845F]" />
                        <span>Click to reveal answer</span>
                      </span>
                    </div>

                    {/* Back Side */}
                    <div
                      className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#E8845F] to-[#C05A35] text-white p-8 flex flex-col items-center justify-center text-center backface-hidden rotate-y-180 shadow-warm"
                      style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                      }}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/80 mb-3">Back • Explanation / Definition</span>
                      <p className="text-base font-medium leading-relaxed">{cleanBack}</p>
                      <span className="text-xs text-white/80 mt-6">Click to flip back</span>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Navigation & Spaced Repetition Rating */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentCardIndex(Math.max(0, currentCardIndex - 1))
                    setIsFlipped(false)
                  }}
                  disabled={currentCardIndex === 0}
                  className="p-2.5 rounded-xl border border-[#EDE7E1] bg-white text-[#5B544E] disabled:opacity-40 hover:border-[#E8845F]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={toggleCardFlip}
                  className="sw-btn-secondary !h-9 !px-4 !text-xs inline-flex items-center space-x-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isFlipped ? 'Show Front' : 'Flip Card'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCurrentCardIndex(Math.min(flashcards.length - 1, currentCardIndex + 1))
                    setIsFlipped(false)
                  }}
                  disabled={currentCardIndex === flashcards.length - 1}
                  className="p-2.5 rounded-xl border border-[#EDE7E1] bg-white text-[#5B544E] disabled:opacity-40 hover:border-[#E8845F]"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Spaced repetition memory confidence */}
              <div>
                <p className="text-center text-xs font-semibold text-[#8A817B] mb-2">How well did you know this?</p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Again', value: 'again', color: 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' },
                    { label: 'Hard', value: 'hard', color: 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100' },
                    { label: 'Good', value: 'good', color: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' },
                    { label: 'Easy', value: 'easy', color: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100' },
                  ].map(({ label, value, color }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleFlashcardRating(value)}
                      disabled={flashcardRating !== null}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${color} ${
                        flashcardRating === value ? 'ring-2 ring-[#E8845F]' : ''
                      } disabled:opacity-50`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // Flashcard Setup & Material Selection View
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center max-w-xl mx-auto pb-2">
            <div className="w-12 h-12 rounded-2xl bg-[#FDEEE6] text-[#E8845F] flex items-center justify-center mx-auto mb-2.5">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-display font-bold text-[#1E1B16] mb-1">Generate Flashcards from Material</h3>
            <p className="text-xs text-[#5B544E]">
              Select documents from Knowledge Hub to extract key terms, formulas, and concepts into interactive flashcards.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {isGeneratingMap.flashcards && (
            <div className="p-4 rounded-xl bg-[#FFF8F5] border border-[#E8845F]/30 text-xs text-[#1E1B16] flex items-center justify-between shadow-xs">
              <div className="flex items-center space-x-3">
                <Loader2 className="w-5 h-5 text-[#E8845F] animate-spin shrink-0" />
                <div>
                  <p className="font-bold text-sm text-[#C05A35]">Creating your Flashcard deck in the background...</p>
                  <p className="text-[11px] text-[#5B544E] mt-0.5">
                    Feel free to navigate anywhere in SourceWise. You'll see a notification badge here once the deck is ready.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-semibold uppercase px-2.5 py-1 rounded-full bg-[#FDEEE6] text-[#C05A35] shrink-0">
                In Progress
              </span>
            </div>
          )}

          {/* 1. Material Selector */}
          <MaterialSelector
            uploadedSources={uploadedSources}
            selectedMaterialIds={selectedMaterialIds}
            onToggle={handleToggleMaterial}
            onSelectAll={handleSelectAllMaterials}
            onClearAll={handleClearAllMaterials}
            title="1. Select Material for Flashcards"
            subtitle="Flashcards will be created directly from the content of these uploaded documents:"
          />

          {/* 2. Deck Settings */}
          <div className="rounded-2xl border border-[#EDE7E1] bg-white p-5 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-[#1E1B16] flex items-center space-x-2">
              <SlidersHorizontal className="w-4 h-4 text-[#E8845F]" />
              <span>2. Deck Settings</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Deck Size */}
              <div>
                <label className="block text-xs font-semibold text-[#5B544E] mb-2">Number of Cards</label>
                <div className="flex rounded-xl border border-[#EDE7E1] p-1 bg-[#FAF8F5]">
                  {[5, 10, 15, 20].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setFlashcardCount(count)}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        flashcardCount === count ? 'bg-white text-[#C05A35] shadow-xs' : 'text-[#8A817B] hover:text-[#1E1B16]'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              {/* Focus Area */}
              <div>
                <label className="block text-xs font-semibold text-[#5B544E] mb-2">Card Focus</label>
                <select
                  value={flashcardFocus}
                  onChange={(e) => setFlashcardFocus(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-[#EDE7E1] focus:outline-none focus:border-[#E8845F] bg-[#FAF8F5] font-medium text-[#1E1B16]"
                >
                  <option value="key terms and definitions">Key Terms & Definitions</option>
                  <option value="core principles and concepts">Core Concepts & Principles</option>
                  <option value="formulas, numbers and high-yield facts">Formulas & High-Yield Facts</option>
                  <option value="exam revision summary">Comprehensive Exam Review</option>
                </select>
              </div>
            </div>

            {/* Optional Topic */}
            <div>
              <label className="block text-xs font-semibold text-[#5B544E] mb-1.5">
                Specific Topic or Section (Optional)
              </label>
              <input
                type="text"
                value={flashcardTopic}
                onChange={(e) => setFlashcardTopic(e.target.value)}
                placeholder="e.g. Chapter 2 vocabulary, photosynthesis stages (or leave blank for whole document)"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#EDE7E1] focus:outline-none focus:border-[#E8845F] bg-[#FAF8F5]"
              />
            </div>
          </div>

          {/* Action Button */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={handleGenerateFlashcards}
              disabled={isGenerating || selectedMaterialIds.length === 0}
              className="sw-btn-primary !h-12 !px-8 !text-sm inline-flex items-center space-x-2 shadow-warm disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Extracting Concepts & Building Deck...</span>
                </>
              ) : (
                <>
                  <BookOpen className="w-4 h-4" />
                  <span>Generate Flashcards from Selected Material</span>
                </>
              )}
            </button>
            {selectedMaterialIds.length === 0 && (
              <p className="text-[11px] text-red-500 mt-2">Please select at least one material above to enable generation.</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: NOTES MODE (Select material -> Customize style -> Generate -> Read)
  // ════════════════════════════════════════════════════════════════════════════
  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: NOTES MODE (Select material -> Customize style -> Generate -> Read & Edit & Cloud Storage)
  // ════════════════════════════════════════════════════════════════════════════
  const renderNotesMode = () => {
    // Filtered cloud notes for drawer/search
    const filteredCloudNotes = (cloudNotes || []).filter((n) => {
      if (!cloudSearchQuery.trim()) return true
      const q = cloudSearchQuery.toLowerCase()
      return (
        (n.title && n.title.toLowerCase().includes(q)) ||
        (n.topic && n.topic.toLowerCase().includes(q)) ||
        (n.content && n.content.toLowerCase().includes(q))
      )
    })

    // Cloud Storage Drawer / Modal
    const renderCloudDrawer = () => {
      if (!showCloudDrawer) return null
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
          <div
            className="w-full max-w-md h-full bg-white shadow-2xl border-l border-[#EDE7E1] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#EDE7E1] bg-[#FAF8F5] flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FDEEE6] text-[#C05A35] flex items-center justify-center">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#1E1B16]">Cloud Notes Library</h3>
                  <p className="text-xs text-[#8A817B]">
                    {cloudNotes.length} saved note{cloudNotes.length === 1 ? '' : 's'} in cloud storage
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCloudDrawer(false)}
                className="p-2 text-[#8A817B] hover:text-[#1E1B16] rounded-xl hover:bg-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-[#EDE7E1] bg-white">
              <div className="relative">
                <Search className="w-4 h-4 text-[#8A817B] absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search saved cloud notes..."
                  value={cloudSearchQuery}
                  onChange={(e) => setCloudSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-[#EDE7E1] focus:outline-none focus:border-[#E8845F] bg-[#FAF8F5]"
                />
              </div>
            </div>

            {/* Notes List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isFetchingCloud && (
                <div className="flex items-center justify-center py-12 space-x-2 text-xs text-[#8A817B]">
                  <Loader2 className="w-4 h-4 animate-spin text-[#E8845F]" />
                  <span>Loading cloud storage...</span>
                </div>
              )}

              {!isFetchingCloud && filteredCloudNotes.length === 0 && (
                <div className="text-center py-12 px-4">
                  <Folder className="w-10 h-10 text-[#D1C7BD] mx-auto mb-2" />
                  <p className="text-xs font-semibold text-[#5B544E]">
                    {cloudSearchQuery ? 'No notes matched your search' : 'No notes saved in cloud yet'}
                  </p>
                  <p className="text-[11px] text-[#8A817B] mt-1 max-w-xs mx-auto">
                    Generate notes from your documents or click "Save to Cloud" to keep them permanently accessible.
                  </p>
                </div>
              )}

              {!isFetchingCloud &&
                filteredCloudNotes.map((note) => {
                  const isCurrent = notesState.id === note.id
                  const dateStr = note.createdAt
                    ? new Date(note.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Recent'

                  return (
                    <div
                      key={note.id}
                      onClick={() => handleSelectCloudNote(note)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer group text-left ${
                        isCurrent
                          ? 'border-[#E8845F] bg-[#FFF8F5] shadow-xs ring-1 ring-[#E8845F]/30'
                          : 'border-[#EDE7E1] bg-white hover:border-[#E8845F]/50 hover:bg-[#FAF8F5]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h4 className="font-bold text-sm text-[#1E1B16] line-clamp-1 group-hover:text-[#C05A35] transition-colors">
                          {note.title}
                        </h4>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteCloudNote(note.id, e)}
                          title="Delete from cloud"
                          className="p-1 text-[#8A817B] hover:text-red-500 rounded-md hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-xs text-[#5B544E] line-clamp-2 mb-2.5">
                        {note.preview || 'Structured study notes and takeaways.'}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-[#8A817B] pt-1 border-t border-[#EDE7E1]/50">
                        <div className="flex items-center space-x-1.5">
                          <span className="px-2 py-0.5 rounded-full bg-[#FAF8F5] border border-[#EDE7E1] font-medium text-[#5B544E]">
                            {note.depth || 'Balanced'}
                          </span>
                          <span>• {note.wordCount || 0} words</span>
                        </div>
                        <span>{dateStr}</span>
                      </div>
                    </div>
                  )
                })}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-[#EDE7E1] bg-[#FAF8F5] flex justify-between items-center text-xs">
              <span className="text-[#8A817B]">Click note to read & edit</span>
              <button
                type="button"
                onClick={() => setShowCloudDrawer(false)}
                className="sw-btn-secondary !h-8 !px-3 !text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )
    }

    // Generated / Loaded Notes View (Reader & Live Editor)
    if (generatedContent) {
      const wordCount = (generatedContent || '').split(/\s+/).filter(Boolean).length
      const charCount = (generatedContent || '').length

      return (
        <div className="flex-1 overflow-y-auto p-6 relative">
          {renderCloudDrawer()}

          <div className="max-w-4xl mx-auto space-y-4">
            {/* Header & Actions Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#EDE7E1]">
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setGeneratedContent(null)
                    clearNotes()
                  }}
                  className="p-1.5 rounded-xl border border-[#EDE7E1] text-[#5B544E] hover:text-[#1E1B16] hover:border-[#D1C7BD] transition-colors"
                  title="Back to Note Generator"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div>
                  {/* Editable Title */}
                  {isEditingTitle ? (
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="text"
                        value={titleDraft}
                        onChange={(e) => setTitleDraft(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                        autoFocus
                        className="text-sm font-bold px-2 py-1 rounded-lg border border-[#E8845F] focus:outline-none bg-white text-[#1E1B16]"
                      />
                      <button
                        type="button"
                        onClick={handleSaveTitle}
                        className="p-1 text-green-600 hover:bg-green-50 rounded-md"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingTitle(false)}
                        className="p-1 text-[#8A817B] hover:bg-[#FAF8F5] rounded-md"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => {
                        setTitleDraft(notesTitle)
                        setIsEditingTitle(true)
                      }}
                      className="group flex items-center space-x-1.5 cursor-pointer"
                      title="Click to rename note"
                    >
                      <h3 className="text-sm sm:text-base font-bold text-[#1E1B16] group-hover:text-[#C05A35] transition-colors">
                        {notesTitle}
                      </h3>
                      <Pencil className="w-3.5 h-3.5 text-[#8A817B] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}

                  {/* Metadata & Cloud Status */}
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#FDEEE6] text-[#C05A35]">
                      {notesStyle}
                    </span>
                    <span className="text-[11px] text-[#8A817B]">• {notesDepth}</span>
                    <span className="text-[11px] text-[#8A817B]">• {wordCount} words</span>

                    {/* Cloud status badge */}
                    {isSavingCloud ? (
                      <span className="inline-flex items-center text-[10px] font-medium text-[#C05A35] bg-[#FFF8F5] px-2 py-0.5 rounded-full border border-[#E8845F]/30 animate-pulse">
                        <Loader2 className="w-2.5 h-2.5 animate-spin mr-1" />
                        Saving...
                      </span>
                    ) : isCloudSaved ? (
                      <span className="inline-flex items-center text-[10px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                        <CheckCircle2 className="w-2.5 h-2.5 mr-1 text-green-600" />
                        Cloud Saved
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        <CloudUpload className="w-2.5 h-2.5 mr-1 text-amber-600" />
                        Unsaved
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center space-x-2">
                {/* Save to Cloud Button */}
                <button
                  type="button"
                  onClick={handleSaveToCloud}
                  disabled={isSavingCloud || (isCloudSaved && notesState.id)}
                  className={`sw-btn-secondary !h-9 !px-3 !text-xs inline-flex items-center space-x-1.5 transition-all ${
                    !isCloudSaved ? '!border-[#E8845F] !text-[#C05A35] bg-[#FFF8F5]' : ''
                  }`}
                  title="Save note to cloud storage"
                >
                  {isSavingCloud ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E8845F]" />
                      <span>Saving...</span>
                    </>
                  ) : isCloudSaved ? (
                    <>
                      <Cloud className="w-3.5 h-3.5 text-green-600" />
                      <span>Saved</span>
                    </>
                  ) : (
                    <>
                      <CloudUpload className="w-3.5 h-3.5 text-[#C05A35]" />
                      <span className="font-semibold">Save to Cloud</span>
                    </>
                  )}
                </button>

                {/* Cloud Library Drawer Trigger */}
                <button
                  type="button"
                  onClick={() => setShowCloudDrawer(true)}
                  className="sw-btn-secondary !h-9 !px-3 !text-xs inline-flex items-center space-x-1.5"
                  title="View your saved notes in cloud storage"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-[#E8845F]" />
                  <span>Cloud Notes ({cloudNotes.length})</span>
                </button>

                {/* View Mode Toggle: Reader vs Editor ("and change that") */}
                <div className="flex items-center rounded-xl border border-[#EDE7E1] p-0.5 bg-[#FAF8F5]">
                  <button
                    type="button"
                    onClick={() => setActiveNotesView('reader')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
                      activeNotesView === 'reader'
                        ? 'bg-white text-[#C05A35] shadow-xs'
                        : 'text-[#8A817B] hover:text-[#1E1B16]'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Reader</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveNotesView('editor')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
                      activeNotesView === 'editor'
                        ? 'bg-white text-[#C05A35] shadow-xs'
                        : 'text-[#8A817B] hover:text-[#1E1B16]'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Note</span>
                  </button>
                </div>

                {/* Copy Button */}
                <button
                  type="button"
                  onClick={handleCopyNotes}
                  className="sw-btn-secondary !h-9 !px-3 !text-xs inline-flex items-center space-x-1.5"
                  title="Copy markdown text to clipboard"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>

                {/* Export / Download Menu ("download in json to pdf") */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setExportMenuOpen((prev) => !prev)}
                    className="sw-btn-primary !h-9 !px-3.5 !text-xs inline-flex items-center space-x-1.5 shadow-warm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export</span>
                    <ChevronDown className="w-3 h-3 ml-0.5" />
                  </button>

                  {exportMenuOpen && (
                    <div
                      className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-[#EDE7E1] shadow-xl p-1.5 z-30 animate-in fade-in zoom-in-95 duration-150"
                      onClick={() => setExportMenuOpen(false)}
                    >
                      <button
                        type="button"
                        onClick={handleExportPdf}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-[#FFF8F5] flex items-center space-x-2.5 transition-colors text-xs text-[#1E1B16] font-medium group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-[#1E1B16] group-hover:text-[#C05A35]">Download PDF (.pdf)</p>
                          <p className="text-[10px] text-[#8A817B]">Formatted, publication-ready document</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportJson}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-[#FFF8F5] flex items-center space-x-2.5 transition-colors text-xs text-[#1E1B16] font-medium group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                          <Code className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-[#1E1B16] group-hover:text-[#C05A35]">Download JSON (.json)</p>
                          <p className="text-[10px] text-[#8A817B]">Structured schema with parsed sections</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportMarkdown}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-[#FFF8F5] flex items-center space-x-2.5 transition-colors text-xs text-[#1E1B16] font-medium group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <FileDown className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-[#1E1B16] group-hover:text-[#C05A35]">Download Markdown (.md)</p>
                          <p className="text-[10px] text-[#8A817B]">Raw markdown formatted file</p>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Error banner if any */}
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {/* View Mode: Reader View */}
            {activeNotesView === 'reader' && (
              <GlowCard className="p-8 bg-white border border-[#EDE7E1]">
                <FormattedNotesView text={generatedContent} />
              </GlowCard>
            )}

            {/* View Mode: Live Editor ("and change that") */}
            {activeNotesView === 'editor' && (
              <div className="rounded-2xl border border-[#EDE7E1] bg-white p-5 shadow-xs space-y-3">
                {/* Editor Quick Tools */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#EDE7E1] text-xs">
                  <div className="flex items-center space-x-1">
                    <span className="text-[11px] font-semibold text-[#8A817B] mr-1">Insert:</span>
                    <button
                      type="button"
                      onClick={() => setGeneratedContent((prev) => prev + '\n\n**Bold Text**')}
                      className="px-2 py-1 rounded-md bg-[#FAF8F5] border border-[#EDE7E1] hover:border-[#E8845F] text-[11px] font-bold"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => setGeneratedContent((prev) => prev + '\n\n## Section Heading\n')}
                      className="px-2 py-1 rounded-md bg-[#FAF8F5] border border-[#EDE7E1] hover:border-[#E8845F] text-[11px] font-bold"
                    >
                      H2
                    </button>
                    <button
                      type="button"
                      onClick={() => setGeneratedContent((prev) => prev + '\n- Bullet point detail')}
                      className="px-2 py-1 rounded-md bg-[#FAF8F5] border border-[#EDE7E1] hover:border-[#E8845F] text-[11px]"
                    >
                      • Bullet
                    </button>
                    <button
                      type="button"
                      onClick={() => setGeneratedContent((prev) => prev + '\n1. Numbered item')}
                      className="px-2 py-1 rounded-md bg-[#FAF8F5] border border-[#EDE7E1] hover:border-[#E8845F] text-[11px]"
                    >
                      1. List
                    </button>
                    <button
                      type="button"
                      onClick={() => setGeneratedContent((prev) => prev + '\n\n**Key Term**: Definition and explanation here.\n')}
                      className="px-2 py-1 rounded-md bg-[#FAF8F5] border border-[#EDE7E1] hover:border-[#E8845F] text-[11px] text-[#C05A35]"
                    >
                      + Definition
                    </button>
                    <button
                      type="button"
                      onClick={() => setGeneratedContent((prev) => prev + '\n\n> 💡 **Exam Takeaway:** Key concept to remember.')}
                      className="px-2 py-1 rounded-md bg-[#FAF8F5] border border-[#EDE7E1] hover:border-[#E8845F] text-[11px] text-[#C05A35]"
                    >
                      + Takeaway
                    </button>
                  </div>

                  <div className="flex items-center space-x-3 text-[11px] text-[#8A817B]">
                    <span>{wordCount} words</span>
                    <span>•</span>
                    <span>{charCount} chars</span>
                  </div>
                </div>

                {/* Textarea */}
                <textarea
                  value={generatedContent}
                  onChange={(e) => setGeneratedContent(e.target.value)}
                  placeholder="Write or edit your study notes here in markdown..."
                  rows={22}
                  className="w-full text-xs font-mono p-4 rounded-xl border border-[#EDE7E1] focus:outline-none focus:border-[#E8845F] focus:ring-1 focus:ring-[#E8845F] bg-[#FAF8F5] text-[#1E1B16] leading-relaxed resize-y"
                />

                {/* Editor Bottom Save Bar */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveNotesView('reader')}
                    className="sw-btn-secondary !h-9 !px-4 !text-xs inline-flex items-center space-x-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview in Reader View</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveToCloud}
                    disabled={isSavingCloud || (isCloudSaved && notesState.id)}
                    className="sw-btn-primary !h-9 !px-5 !text-xs inline-flex items-center space-x-1.5 shadow-warm"
                  >
                    {isSavingCloud ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <CloudUpload className="w-3.5 h-3.5" />
                        <span>Save Changes to Cloud</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )
    }

    // Notes Setup & Material Selection View
    return (
      <div className="flex-1 overflow-y-auto p-6 relative">
        {renderCloudDrawer()}

        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center max-w-xl mx-auto pb-2">
            <div className="w-12 h-12 rounded-2xl bg-[#FDEEE6] text-[#E8845F] flex items-center justify-center mx-auto mb-2.5">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-display font-bold text-[#1E1B16] mb-1">Generate Structured Notes</h3>
            <p className="text-xs text-[#5B544E]">
              Select documents uploaded in Knowledge Hub to organize them into comprehensive notes, cheat sheets, or revision guides.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Access to Existing Cloud Notes */}
          {cloudNotes.length > 0 && (
            <div className="rounded-2xl border border-[#EDE7E1] bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Cloud className="w-4 h-4 text-[#E8845F]" />
                  <h4 className="text-sm font-bold text-[#1E1B16]">
                    Your Cloud Notes Library ({cloudNotes.length})
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCloudDrawer(true)}
                  className="text-xs font-semibold text-[#C05A35] hover:underline"
                >
                  View All ({cloudNotes.length}) →
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {cloudNotes.slice(0, 4).map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => handleSelectCloudNote(note)}
                    className="p-3 rounded-xl border border-[#EDE7E1] bg-[#FAF8F5] hover:border-[#E8845F] hover:bg-white text-left transition-all group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-[#1E1B16] group-hover:text-[#C05A35] line-clamp-1">
                        {note.title}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-[#8A817B] group-hover:text-[#C05A35] shrink-0" />
                    </div>
                    <p className="text-[11px] text-[#8A817B] line-clamp-1">{note.preview || 'Study notes and summary'}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {isGeneratingMap.notes && (
            <div className="p-4 rounded-xl bg-[#FFF8F5] border border-[#E8845F]/30 text-xs text-[#1E1B16] flex items-center justify-between shadow-xs">
              <div className="flex items-center space-x-3">
                <Loader2 className="w-5 h-5 text-[#E8845F] animate-spin shrink-0" />
                <div>
                  <p className="font-bold text-sm text-[#C05A35]">Compiling your Notes in the background...</p>
                  <p className="text-[11px] text-[#5B544E] mt-0.5">
                    Synthesis is running. You can navigate away and we'll alert you with a badge as soon as it completes.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-semibold uppercase px-2.5 py-1 rounded-full bg-[#FDEEE6] text-[#C05A35] shrink-0">
                In Progress
              </span>
            </div>
          )}

          {/* 1. Material Selector */}
          <MaterialSelector
            uploadedSources={uploadedSources}
            selectedMaterialIds={selectedMaterialIds}
            onToggle={handleToggleMaterial}
            onSelectAll={handleSelectAllMaterials}
            onClearAll={handleClearAllMaterials}
            title="1. Select Material to Synthesize"
            subtitle="The notes will be compiled directly from these uploaded documents:"
          />

          {/* 2. Notes Options */}
          <div className="rounded-2xl border border-[#EDE7E1] bg-white p-5 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-[#1E1B16] flex items-center space-x-2">
              <SlidersHorizontal className="w-4 h-4 text-[#E8845F]" />
              <span>2. Notes Style & Format</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Format selection */}
              <div>
                <label className="block text-xs font-semibold text-[#5B544E] mb-2">Note Format</label>
                <select
                  value={notesStyle}
                  onChange={(e) => setNotesStyle(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-[#EDE7E1] focus:outline-none focus:border-[#E8845F] bg-[#FAF8F5] font-medium text-[#1E1B16]"
                >
                  <option value="Comprehensive Study Notes">Comprehensive Study Notes (Detailed)</option>
                  <option value="Executive Summary & Key Points">Executive Summary & Key Points</option>
                  <option value="Exam Cheat Sheet">Exam Cheat Sheet (High-Yield Formulas & Definitions)</option>
                  <option value="Structured Study Guide">Complete Study Guide (With Review Questions)</option>
                </select>
              </div>

              {/* Depth */}
              <div>
                <label className="block text-xs font-semibold text-[#5B544E] mb-2">Depth Level</label>
                <div className="flex rounded-xl border border-[#EDE7E1] p-1 bg-[#FAF8F5]">
                  {['Concise', 'Balanced', 'In-Depth'].map((depth) => (
                    <button
                      key={depth}
                      type="button"
                      onClick={() => setNotesDepth(depth)}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        notesDepth === depth ? 'bg-white text-[#C05A35] shadow-xs' : 'text-[#8A817B] hover:text-[#1E1B16]'
                      }`}
                    >
                      {depth}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Optional Topic */}
            <div>
              <label className="block text-xs font-semibold text-[#5B544E] mb-1.5">
                Specific Topic or Section to Emphasize (Optional)
              </label>
              <input
                type="text"
                value={notesTopic}
                onChange={(e) => setNotesTopic(e.target.value)}
                placeholder="e.g. Focus on Section 4, or summarize the whole document"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#EDE7E1] focus:outline-none focus:border-[#E8845F] bg-[#FAF8F5]"
              />
            </div>
          </div>

          {/* Action Button */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={handleGenerateNotes}
              disabled={isGenerating || selectedMaterialIds.length === 0}
              className="sw-btn-primary !h-12 !px-8 !text-sm inline-flex items-center space-x-2 shadow-warm disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Material into Notes...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Generate Notes from Selected Material</span>
                </>
              )}
            </button>
            {selectedMaterialIds.length === 0 && (
              <p className="text-[11px] text-red-500 mt-2">Please select at least one material above to enable generation.</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: TUTOR MODE (Select material -> Choose style -> Start session -> Converse)
  // ════════════════════════════════════════════════════════════════════════════
  const renderTutorMode = () => {
    // 1. Active Tutoring Session View
    if (isTutorSessionActive) {
      return (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Top Session Status Bar */}
          <div className="px-6 py-3 bg-[#FAF8F5] border-b border-[#EDE7E1] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <GraduationCap className="w-4 h-4 text-[#E8845F]" />
              <span className="text-xs font-bold text-[#1E1B16]">
                Tutoring Session: {selectedMaterialIds.length} source(s)
              </span>
              <span className="text-xs text-[#8A817B]">• {tutorStyle}</span>
            </div>
            <button
              type="button"
              onClick={() => { setIsTutorSessionActive(false); setMessages([]) }}
              className="text-xs font-semibold text-[#C05A35] hover:text-[#A74B2A] transition-colors"
            >
              End Session / Change Material
            </button>
          </div>

          {/* Conversation Feed */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-[#FDEEE6] flex items-center justify-center mr-3 shrink-0 mt-1">
                    <GraduationCap className="w-4 h-4 text-[#E8845F]" />
                  </div>
                )}
                <div className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                  msg.role === 'user'
                    ? 'bg-[#E8845F] text-white shadow-xs'
                    : 'bg-white border border-[#EDE7E1] text-[#1E1B16] shadow-xs'
                }`}>
                  <RichMessageContent content={msg.content} isUser={msg.role === 'user'} />
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="-mx-5 -mb-4 mt-4 px-5 py-3 bg-[#FAFAFA] border-t border-[#EDE7E1] rounded-b-2xl">
                      <p className="text-[11px] font-semibold text-[#8A817B] mb-1.5 uppercase tracking-wider">Grounding</p>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.citations.map((cite, i) => (
                          <span key={i} className="text-xs bg-white border border-[#EDE7E1] rounded-lg px-2.5 py-1 text-[#5B544E]">
                            <span className="font-semibold text-[#1E1B16]">{cite.source_name}</span> (p.{cite.page})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isGenerating && (
              <div className="flex items-start">
                <div className="w-8 h-8 rounded-lg bg-[#FDEEE6] flex items-center justify-center mr-3 shrink-0">
                  <GraduationCap className="w-4 h-4 text-[#E8845F] animate-pulse" />
                </div>
                <div className="bg-white border border-[#EDE7E1] rounded-2xl px-5 py-4 flex items-center space-x-2 shadow-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-[#E8845F]" />
                  <span className="text-xs text-[#8A817B]">Tutor is analyzing your response...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )
    }

    // 2. Tutor Setup & Material Selection View
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center max-w-xl mx-auto pb-2">
            <div className="w-12 h-12 rounded-2xl bg-[#FDEEE6] text-[#E8845F] flex items-center justify-center mx-auto mb-2.5">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-display font-bold text-[#1E1B16] mb-1">Interactive AI Tutor</h3>
            <p className="text-xs text-[#5B544E]">
              Select documents uploaded in Knowledge Hub, pick your preferred learning style, and start an interactive tutoring dialogue.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Material Selector */}
          <MaterialSelector
            uploadedSources={uploadedSources}
            selectedMaterialIds={selectedMaterialIds}
            onToggle={handleToggleMaterial}
            onSelectAll={handleSelectAllMaterials}
            onClearAll={handleClearAllMaterials}
            title="1. Select Material for Tutoring"
            subtitle="The tutor will base lessons and questions strictly on these documents:"
          />

          {/* 2. Tutoring Style & Focus */}
          <div className="rounded-2xl border border-[#EDE7E1] bg-white p-5 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-[#1E1B16] flex items-center space-x-2">
              <SlidersHorizontal className="w-4 h-4 text-[#E8845F]" />
              <span>2. Tutoring Preferences</span>
            </h4>

            <div>
              <label className="block text-xs font-semibold text-[#5B544E] mb-2">Tutoring Mode</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {[
                  { id: 'Friendly', title: 'Friendly', desc: 'Warm, encouraging companion with conversational explanations' },
                  { id: 'Tutor', title: 'Tutor', desc: 'Direct, step-by-step breakdown with worked examples' },
                  { id: 'Mentor', title: 'Mentor', desc: 'Socratic inquiry that guides you to deduce answers yourself' },
                ].map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setTutorStyle(style.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      tutorStyle === style.id
                        ? 'border-[#E8845F] bg-[#FFF8F5] ring-1 ring-[#E8845F]/30 shadow-xs'
                        : 'border-[#EDE7E1] bg-white hover:border-[#D1C7BD]'
                    }`}
                  >
                    <p className={`text-xs font-bold ${tutorStyle === style.id ? 'text-[#C05A35]' : 'text-[#1E1B16]'}`}>
                      {style.title}
                    </p>
                    <p className="text-[11px] text-[#8A817B] mt-1 leading-snug">{style.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Goals or Custom Topic */}
            <div>
              <label className="block text-xs font-semibold text-[#5B544E] mb-2">What would you like to master?</label>
              <div className="flex flex-wrap gap-2 mb-2.5">
                {[
                  "Teach me from the beginning",
                  "Deep-dive into core concepts",
                  "Walk through key examples",
                  "Quiz me on tricky edge cases"
                ].map((topic, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setTutorTopic(topic)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      tutorTopic === topic
                        ? 'border-[#E8845F] bg-[#FFF8F5] text-[#C05A35]'
                        : 'border-[#EDE7E1] bg-white text-[#5B544E] hover:border-[#D1C7BD]'
                    }`}
                  >
                    {topic}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={tutorTopic}
                onChange={(e) => setTutorTopic(e.target.value)}
                placeholder="Or type a specific topic, concept, or question to start..."
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#EDE7E1] focus:outline-none focus:border-[#E8845F] bg-[#FAF8F5]"
              />
            </div>
          </div>

          {/* Action Button */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={handleStartTutorSession}
              disabled={isGenerating || selectedMaterialIds.length === 0}
              className="sw-btn-primary !h-12 !px-8 !text-sm inline-flex items-center space-x-2 shadow-warm disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Preparing Tutoring Session from Documents...</span>
                </>
              ) : (
                <>
                  <GraduationCap className="w-4 h-4" />
                  <span>Start Tutoring Session on Selected Material</span>
                </>
              )}
            </button>
            {selectedMaterialIds.length === 0 && (
              <p className="text-[11px] text-red-500 mt-2">Please select at least one material above to enable tutoring.</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Active content renderer based on tab
  const renderContent = () => {
    switch (activeMode) {
      case 'chat': return renderChatMode()
      case 'quiz': return renderQuizMode()
      case 'flashcards': return renderFlashcardsMode()
      case 'notes': return renderNotesMode()
      case 'tutor': return renderTutorMode()
      default: return renderChatMode()
    }
  }

  return (
    <div className="h-[calc(100vh-3rem)] flex overflow-hidden rounded-2xl bg-white border border-[#EDE7E1] shadow-[0_1px_2px_rgba(30,27,22,0.04),0_8px_24px_-12px_rgba(30,27,22,0.12)]">
      {/* Left Panel - Mode Selection */}
      <div className="w-60 sm:w-64 bg-[#FAFAFA] border-r border-[#EDE7E1] flex flex-col shrink-0">
        <div className="p-4 border-b border-[#EDE7E1]">
          <h2 className="font-display font-bold text-lg flex items-center space-x-2 text-[#1E1B16]">
            <Brain className="w-5 h-5 text-[#E8845F]" />
            <span>AI Workspace</span>
          </h2>
          <p className="text-[11px] text-[#8A817B] mt-0.5">Study Tools Powered by Local Docs</p>
        </div>

        <div className="flex-1 p-3 space-y-1">
          {Object.values(MODES).map((mode) => {
            const Icon = mode.icon
            const isActive = activeMode === mode.id
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => handleModeChange(mode.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive
                    ? 'bg-[rgba(232,132,95,0.11)] text-[#C05A35] font-semibold'
                    : 'text-[#5B544E] hover:bg-[#F3EFEB] hover:text-[#1E1B16]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#E8845F]' : 'text-[#8A817B]'}`} />
                <div className="text-left flex-1 truncate flex items-center justify-between gap-1.5">
                  <p className="leading-none truncate">{mode.label}</p>
                  {isGeneratingMap[mode.id] ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E8845F] shrink-0" title="Generating in background..." />
                  ) : (notifications[mode.id] > 0) ? (
                    <span 
                      className="min-w-[18px] h-[18px] px-1 bg-[#10B981] text-white text-[10px] font-extrabold rounded-full flex items-center justify-center shrink-0 shadow-xs animate-bounce"
                      title={`${notifications[mode.id]} new items ready`}
                    >
                      {notifications[mode.id]}
                    </span>
                  ) : null}
                </div>
              </button>
            )
          })}
        </div>

        {/* Bottom Material Summary */}
        <div className="p-3 border-t border-[#EDE7E1] bg-[#FAF8F5]">
          <div className="flex items-center justify-between text-xs font-semibold text-[#1E1B16] mb-1">
            <span className="flex items-center space-x-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#E8845F]" />
              <span>Knowledge Hub</span>
            </span>
            <span className="text-[11px] text-[#C05A35]">
              {selectedMaterialIds.length}/{uploadedSources.length} selected
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/knowledge')}
            className="text-[11px] text-[#8A817B] hover:text-[#1E1B16] transition-colors w-full text-left"
          >
            + Manage docs in Knowledge Hub
          </button>
        </div>
      </div>

      {/* Center - Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {renderContent()}

        {/* Bottom Chat Input: ONLY visible for 'chat' mode OR active interactive tutor dialogue */}
        {(activeMode === 'chat' || (activeMode === 'tutor' && isTutorSessionActive)) && (
          <div className="p-4 bg-[#FAFAFA] border-t border-[#EDE7E1]">
            <div className="flex items-end bg-white border border-[#E0D9D2] rounded-2xl p-2 focus-within:border-[#E8845F] shadow-xs">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                placeholder={
                  activeMode === 'chat'
                    ? 'Ask anything about your selected materials...'
                    : 'Respond to your tutor or ask a question...'
                }
                className="flex-1 min-h-[44px] max-h-[120px] resize-none bg-transparent px-4 py-2 focus:outline-none text-sm text-[#1E1B16]"
                disabled={isGenerating}
              />
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={!input.trim() || isGenerating}
                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all shrink-0 ${
                  input.trim() && !isGenerating
                    ? 'bg-[#E8845F] text-white hover:bg-[#D96F4A] shadow-xs'
                    : 'bg-[#F1ECE6] text-[#8A817B]'
                }`}
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-center text-[10px] text-[#8A817B] mt-2">
              SourceWise AI runs locally and grounds answers in your uploaded documents.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
