import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { 
  Send, Loader2, Brain, MessageSquare, FileText, 
  HelpCircle, BookOpen, Copy, Check, ChevronRight, ChevronLeft,
  Award, AlertCircle, Sparkles, RefreshCw, Download, 
  CheckCircle2, SlidersHorizontal, ArrowRight, RotateCcw,
  GraduationCap, Layers, Compass, CheckSquare, Square
} from 'lucide-react'
import { useSourceStore } from '../store/sourceStore'
import { useAuthStore } from '../store/authStore'
import { streamChat } from '../lib/chatApi'
import { sendAgentMessage } from '../lib/agentApi'
import { GlowCard } from '../components/ui/glow-card'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const MODES = {
  chat: { id: 'chat', label: 'Chat', icon: MessageSquare, description: 'Ask questions and converse with your documents' },
  quiz: { id: 'quiz', label: 'Quiz', icon: HelpCircle, description: 'Test your understanding with practice quizzes' },
  flashcards: { id: 'flashcards', label: 'Flashcards', icon: BookOpen, description: 'Memorize terms & concepts with flashcards' },
  tutor: { id: 'tutor', label: 'Tutor', icon: GraduationCap, description: 'Personalized interactive tutoring on your material' },
  notes: { id: 'notes', label: 'Notes', icon: FileText, description: 'Generate structured study notes and summaries' },
}

/**
 * Clean inline markdown formatter for notes & summaries
 */
function formatInline(str) {
  if (!str) return ''
  const parts = str.split(/(\*\*.*?\*\*|`.*?`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-[#1E1B16]">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="px-1.5 py-0.5 rounded bg-[#F3EFEB] text-[#C05A35] font-mono text-xs">{part.slice(1, -1)}</code>
    }
    return part
  })
}

/**
 * Structured Notes Renderer
 */
function FormattedNotesView({ text }) {
  if (!text) return null
  const lines = text.split('\n')
  return (
    <div className="space-y-3 font-sans text-sm text-[#1E1B16] leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim()
        if (!trimmed) return <div key={idx} className="h-2" />

        if (line.startsWith('# ')) {
          return (
            <h1 key={idx} className="text-xl font-bold font-display text-[#1E1B16] pt-3 pb-1 border-b border-[#EDE7E1]">
              {line.replace('# ', '')}
            </h1>
          )
        }
        if (line.startsWith('## ')) {
          return (
            <h2 key={idx} className="text-base font-bold font-display text-[#C05A35] pt-2">
              {line.replace('## ', '')}
            </h2>
          )
        }
        if (line.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-sm font-semibold text-[#1E1B16] pt-1">
              {line.replace('### ', '')}
            </h3>
          )
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const content = trimmed.substring(2)
          return (
            <div key={idx} className="flex items-start space-x-2 pl-2">
              <span className="text-[#E8845F] text-base leading-4">•</span>
              <p className="flex-1">{formatInline(content)}</p>
            </div>
          )
        }
        if (trimmed.match(/^\d+\.\s/)) {
          const num = trimmed.match(/^\d+\.\s/)[0]
          const content = trimmed.replace(/^\d+\.\s/, '')
          return (
            <div key={idx} className="flex items-start space-x-2 pl-2">
              <span className="text-[#C05A35] font-semibold text-xs min-w-[20px]">{num}</span>
              <p className="flex-1">{formatInline(content)}</p>
            </div>
          )
        }
        if (trimmed.startsWith('> ')) {
          return (
            <blockquote key={idx} className="pl-3 border-l-2 border-[#E8845F] bg-[#FAF8F5] py-1.5 px-3 rounded-r-lg text-xs italic text-[#5B544E]">
              {formatInline(trimmed.replace('> ', ''))}
            </blockquote>
          )
        }
        return <p key={idx}>{formatInline(line)}</p>
      })}
    </div>
  )
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
  
  const [activeMode, setActiveMode] = useState(urlMode || 'chat')
  const [selectedMaterialIds, setSelectedMaterialIds] = useState([])
  
  // Generation / Loading / Error states
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState(null)
  
  // Chat state
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [showChatSourceSelector, setShowChatSourceSelector] = useState(false)

  // Quiz state & options
  const [quizQuestions, setQuizQuestions] = useState([])
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState({})
  const [quizCompleted, setQuizCompleted] = useState(false)
  const [quizCount, setQuizCount] = useState(5)
  const [quizDifficulty, setQuizDifficulty] = useState('medium')
  const [quizType, setQuizType] = useState('multiple choice')
  const [quizTopic, setQuizTopic] = useState('')

  // Flashcards state & options
  const [flashcards, setFlashcards] = useState([])
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [flashcardRating, setFlashcardRating] = useState(null)
  const [flashcardCount, setFlashcardCount] = useState(10)
  const [flashcardFocus, setFlashcardFocus] = useState('key terms and definitions')
  const [flashcardTopic, setFlashcardTopic] = useState('')

  // Notes state & options
  const [generatedContent, setGeneratedContent] = useState(null)
  const [copied, setCopied] = useState(false)
  const [notesStyle, setNotesStyle] = useState('Comprehensive Study Notes')
  const [notesDepth, setNotesDepth] = useState('Balanced')
  const [notesTopic, setNotesTopic] = useState('')

  // Tutor state & options
  const [isTutorSessionActive, setIsTutorSessionActive] = useState(false)
  const [tutorStyle, setTutorStyle] = useState('Socratic Coach')
  const [tutorTopic, setTutorTopic] = useState('')
  
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Sync mode with URL
  useEffect(() => {
    if (urlMode && MODES[urlMode]) {
      setActiveMode(urlMode)
    }
  }, [urlMode])

  // Hydrate sources from backend if store is empty
  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/sources`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (res.ok) {
        const data = await res.json()
        const localIds = useSourceStore.getState().uploadedSources.map((s) => s.id)
        const fresh = data.filter((s) => !localIds.includes(s.id)).map((s) => ({
          id: s.id,
          name: s.name,
          size: s.size || 0,
          type: s.type || 'pdf',
          status: s.status || 'ready',
          chunksIndexed: s.chunks_indexed || 0,
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

  // Prepopulate initial prompts or topics from location state
  useEffect(() => {
    if (location.state?.initialPrompt) {
      setInput(location.state.initialPrompt)
      setQuizTopic(location.state.initialPrompt)
      setFlashcardTopic(location.state.initialPrompt)
      setNotesTopic(location.state.initialPrompt)
      setTutorTopic(location.state.initialPrompt)
    }
  }, [location.state])

  // Auto-scroll chat / tutor messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle switching tabs
  const handleModeChange = (mode) => {
    setActiveMode(mode)
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

  // Fallback text parser for quiz questions if LLM outputs markdown
  const parseQuizText = (text) => {
    if (!text || typeof text !== 'string') return []
    const questions = []
    const blocks = text.split(/(?=(?:^\d+\.|\bQ\d*:|\bQuestion\s*\d*:))/mi)
    for (const block of blocks) {
      const lines = block.trim().split('\n').map(l => l.trim()).filter(Boolean)
      if (lines.length < 2) continue
      const qLine = lines[0].replace(/^(?:\d+\.|\bQ\d*:|\bQuestion\s*\d*:)\s*/i, '')
      const options = []
      let correct = 0
      let explanation = ''
      for (const line of lines.slice(1)) {
        const optMatch = line.match(/^[A-D][\).:]\s*(.+)/i)
        if (optMatch) {
          options.push(optMatch[1])
        } else if (line.match(/^ANSWER:\s*([A-D])/i)) {
          const letter = line.match(/^ANSWER:\s*([A-D])/i)[1].toUpperCase()
          correct = 'ABCD'.indexOf(letter)
        } else if (line.match(/^EXPLANATION:\s*(.+)/i)) {
          explanation = line.match(/^EXPLANATION:\s*(.+)/i)[1]
        }
      }
      if (qLine && options.length >= 2) {
        questions.push({
          question: qLine,
          options,
          correct: correct >= 0 ? correct : 0,
          explanation
        })
      }
    }
    return questions
  }

  // 1. Generate Quiz
  const handleGenerateQuiz = async () => {
    if (selectedMaterialIds.length === 0) {
      setError("Please select at least one material uploaded in Knowledge Hub.")
      return
    }

    setIsGenerating(true)
    setError(null)
    const topicDesc = quizTopic.trim() ? `focusing on "${quizTopic.trim()}"` : "covering the most important concepts"
    const prompt = `Create a ${quizCount}-question ${quizDifficulty} ${quizType} quiz ${topicDesc} based strictly on the selected study material.
Return 4 options for each question (A, B, C, D), specify the correct answer, and provide a clear explanation.`

    try {
      const response = await sendAgentMessage({
        message: prompt,
        sourceIds: selectedMaterialIds,
        userId: user?.id || 'anonymous',
        history: [],
        context: { action: 'create_quiz', count: quizCount, difficulty: quizDifficulty, topic: quizTopic }
      })

      let rawQuestions = []
      if (response?.data?.questions && Array.isArray(response.data.questions)) {
        rawQuestions = response.data.questions
      } else if (Array.isArray(response?.data)) {
        rawQuestions = response.data
      } else {
        rawQuestions = parseQuizText(response.message || response.data || '')
      }

      const normalized = rawQuestions.map((q, idx) => ({
        id: idx,
        question: q.question || q.q || `Question ${idx + 1}`,
        options: Array.isArray(q.options) && q.options.length >= 2 ? q.options : ['True', 'False'],
        correct: typeof q.answer === 'number' ? q.answer : (typeof q.correct === 'number' ? q.correct : 0),
        explanation: q.explanation || 'Refer to your study material for details.',
        concept: q.topic || q.concept || 'General Knowledge'
      }))

      if (normalized.length === 0) {
        throw new Error("Could not parse quiz questions from the generated content. Please try again.")
      }

      setQuizQuestions(normalized)
      setCurrentQuizIndex(0)
      setQuizAnswers({})
      setQuizCompleted(false)
      trackContentGeneration('quiz_generated')
    } catch (err) {
      setError(err.message || "Failed to generate quiz. Please verify that your AI service is active.")
    } finally {
      setIsGenerating(false)
    }
  }

  // Fallback text parser for flashcards
  const parseFlashcardsText = (text) => {
    if (!text || typeof text !== 'string') return []
    const cards = []
    const blocks = text.split(/---|---|\n\n(?=FRONT:|\bCard\s*\d+:)/i)
    for (const block of blocks) {
      const frontMatch = block.match(/(?:FRONT|Term|Question):\s*(.+?)(?=\n(?:BACK|Answer|Definition):|$)/is)
      const backMatch = block.match(/(?:BACK|Answer|Definition):\s*(.+?)(?=\n---|$)/is)
      if (frontMatch && backMatch) {
        cards.push({
          front: frontMatch[1].trim(),
          back: backMatch[1].trim()
        })
      }
    }
    return cards
  }

  // 2. Generate Flashcards
  const handleGenerateFlashcards = async () => {
    if (selectedMaterialIds.length === 0) {
      setError("Please select at least one material uploaded in Knowledge Hub.")
      return
    }

    setIsGenerating(true)
    setError(null)
    const topicDesc = flashcardTopic.trim() ? `on "${flashcardTopic.trim()}"` : "from the selected documents"
    const prompt = `Create ${flashcardCount} flashcards ${topicDesc} focusing on ${flashcardFocus} based on the uploaded material.
Format each card with:
FRONT: [Question, key term, or concept]
BACK: [Clear definition, explanation, or answer]
---`

    try {
      const response = await sendAgentMessage({
        message: prompt,
        sourceIds: selectedMaterialIds,
        userId: user?.id || 'anonymous',
        history: [],
        context: { action: 'create_flashcards', count: flashcardCount, focus: flashcardFocus, topic: flashcardTopic }
      })

      let rawCards = response?.data?.cards || (Array.isArray(response?.data) ? response.data : [])
      if (!rawCards || rawCards.length === 0) {
        rawCards = parseFlashcardsText(response.message || response.data || '')
      }

      const normalized = rawCards.map((c, idx) => ({
        id: idx,
        front: c.front || c.term || c.question || '',
        back: c.back || c.definition || c.answer || ''
      })).filter(c => c.front && c.back)

      if (normalized.length === 0) {
        throw new Error("Unable to extract flashcards from response. Please try again.")
      }

      setFlashcards(normalized)
      setCurrentCardIndex(0)
      setIsFlipped(false)
      setFlashcardRating(null)
      trackContentGeneration('flashcards_generated')
    } catch (err) {
      setError(err.message || "Failed to generate flashcards. Please check your backend connection.")
    } finally {
      setIsGenerating(false)
    }
  }

  // 3. Generate Notes
  const handleGenerateNotes = async () => {
    if (selectedMaterialIds.length === 0) {
      setError("Please select at least one material uploaded in Knowledge Hub.")
      return
    }

    setIsGenerating(true)
    setError(null)
    const topicDesc = notesTopic.trim() ? `focusing on "${notesTopic.trim()}"` : "covering the material thoroughly"
    const prompt = `Generate ${notesStyle} (${notesDepth} level) ${topicDesc} based on the selected uploaded study material.
Structure the notes with clear markdown headings, bullet points, key definitions, formulas or frameworks, and an executive summary of key exam takeaways.`

    try {
      const response = await sendAgentMessage({
        message: prompt,
        sourceIds: selectedMaterialIds,
        userId: user?.id || 'anonymous',
        history: [],
        context: { action: 'create_notes', style: notesStyle, depth: notesDepth, topic: notesTopic }
      })

      const content = response?.data?.notes || response?.data?.guide || response?.data?.summary || response?.message || response?.data
      if (!content) {
        throw new Error("No notes content returned. Please try again.")
      }

      setGeneratedContent(typeof content === 'string' ? content : JSON.stringify(content, null, 2))
      trackContentGeneration('notes_generated')
    } catch (err) {
      setError(err.message || "Failed to generate notes. Please check that python-ai is running.")
    } finally {
      setIsGenerating(false)
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
        context: { mode: 'tutor', style: tutorStyle, topic: tutorTopic }
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

  // ════════════════════════════════════════════════════════════════════════════
  // INTERACTIVE CHAT & TUTOR MESSAGE SENDER
  // ════════════════════════════════════════════════════════════════════════════
  const handleSendMessage = async () => {
    if (!input.trim() || isGenerating) return
    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsGenerating(true)

    if (selectedMaterialIds.length === 0) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Please select at least one study material from the Knowledge Hub above.' 
      }])
      setIsGenerating(false)
      return
    }

    if (activeMode === 'chat') {
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
    } else if (activeMode === 'tutor') {
      try {
        const response = await sendAgentMessage({
          message: userMessage,
          sourceIds: selectedMaterialIds,
          userId: user?.id || 'anonymous',
          history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
          context: { mode: 'tutor', style: tutorStyle }
        })
        const reply = response.message || response.data?.explanation || JSON.stringify(response.data)
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: reply, 
          citations: response.data?.citations || [] 
        }])
      } catch (err) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }])
      } finally {
        setIsGenerating(false)
      }
    }
  }

  // Quiz Interaction Handlers
  const handleQuizAnswer = (questionIndex, answerIndex) => {
    setQuizAnswers(prev => ({ ...prev, [questionIndex]: answerIndex }))
  }

  const handleQuizSubmit = () => {
    setQuizCompleted(true)
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

  const handleDownloadNotes = () => {
    if (!generatedContent) return
    const blob = new Blob([generatedContent], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Study_Notes_${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
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
              <div className="whitespace-pre-wrap leading-relaxed text-sm">{msg.content}</div>
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
                  onClick={() => { setQuizCompleted(false); setQuizAnswers({}); setCurrentQuizIndex(0) }}
                  className="sw-btn-secondary !h-10 !px-5 !text-xs inline-flex items-center space-x-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retake This Quiz</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setQuizQuestions([]); setQuizCompleted(false); setQuizAnswers({}); setCurrentQuizIndex(0) }}
                  className="sw-btn-primary !h-10 !px-5 !text-xs inline-flex items-center space-x-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
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
                onClick={() => { setQuizQuestions([]); setQuizAnswers({}); setCurrentQuizIndex(0) }}
                className="text-xs text-[#8A817B] hover:text-[#C05A35] transition-colors"
              >
                Quit / New Quiz
              </button>
            </div>

            {/* Question Card */}
            {currentQ && (
              <GlowCard className="p-6">
                <p className="text-base font-semibold text-[#1E1B16] mb-5 leading-snug">
                  {currentQuizIndex + 1}. {currentQ.question}
                </p>

                <div className="space-y-2.5">
                  {currentQ.options.map((option, idx) => {
                    const isSelected = quizAnswers[currentQuizIndex] === idx
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
                          <span className="font-medium">{option}</span>
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
                  <Sparkles className="w-4 h-4" />
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
            {card && (
              <div 
                onClick={() => setIsFlipped(prev => !prev)}
                className="relative w-full h-72 cursor-pointer select-none group perspective-1000"
              >
                <div className={`relative w-full h-full rounded-2xl transition-transform duration-500 transform-style-3d shadow-md ${
                  isFlipped ? 'rotate-y-180' : ''
                }`}>
                  {/* Front Side */}
                  <div className="absolute inset-0 rounded-2xl bg-white border-2 border-[#EDE7E1] p-8 flex flex-col items-center justify-center text-center backface-hidden group-hover:border-[#E8845F]/50 transition-colors">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A817B] mb-3">Front • Question / Concept</span>
                    <p className="text-lg font-bold text-[#1E1B16] leading-relaxed">{card.front}</p>
                    <span className="text-xs text-[#8A817B] mt-6 flex items-center space-x-1">
                      <RotateCcw className="w-3 h-3 text-[#E8845F]" />
                      <span>Click or press space to reveal answer</span>
                    </span>
                  </div>

                  {/* Back Side */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#E8845F] to-[#C05A35] text-white p-8 flex flex-col items-center justify-center text-center backface-hidden rotate-y-180 shadow-warm">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/80 mb-3">Back • Explanation / Definition</span>
                    <p className="text-base font-medium leading-relaxed">{card.back}</p>
                    <span className="text-xs text-white/80 mt-6">Click to flip back</span>
                  </div>
                </div>
              </div>
            )}

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
                  onClick={() => setIsFlipped(prev => !prev)}
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
                  <Sparkles className="w-4 h-4" />
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
  const renderNotesMode = () => {
    // Generated Notes View
    if (generatedContent) {
      return (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-4">
            {/* Header & Actions Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#EDE7E1]">
              <div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#FDEEE6] text-[#C05A35]">
                  Notes from {selectedMaterialIds.length} source(s)
                </span>
                <span className="text-xs text-[#8A817B] ml-2">• {notesStyle}</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleCopyNotes}
                  className="sw-btn-secondary !h-9 !px-3 !text-xs inline-flex items-center space-x-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadNotes}
                  className="sw-btn-secondary !h-9 !px-3 !text-xs inline-flex items-center space-x-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .md</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGeneratedContent(null)}
                  className="sw-btn-primary !h-9 !px-3.5 !text-xs inline-flex items-center space-x-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate New Notes</span>
                </button>
              </div>
            </div>

            {/* Document Reader Card */}
            <GlowCard className="p-8 bg-white border border-[#EDE7E1]">
              <FormattedNotesView text={generatedContent} />
            </GlowCard>
          </div>
        </div>
      )
    }

    // Notes Setup & Material Selection View
    return (
      <div className="flex-1 overflow-y-auto p-6">
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
                  <Sparkles className="w-4 h-4" />
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
                  <div className="whitespace-pre-wrap leading-relaxed text-sm">{msg.content}</div>
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
              <label className="block text-xs font-semibold text-[#5B544E] mb-2">Tutoring Style</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {[
                  { id: 'Socratic Coach', title: 'Socratic Coach', desc: 'Asks guiding questions to help you deduce answers yourself' },
                  { id: 'Patient Explainer', title: 'Patient Explainer', desc: 'Step-by-step breakdown with analogies and worked examples' },
                  { id: 'Exam Drill Tutor', title: 'Exam Drill Tutor', desc: 'Challenges you with exam-level questions and targets gaps' },
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
                  <Sparkles className="w-4 h-4" />
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
                <div className="text-left flex-1 truncate">
                  <p className="leading-none">{mode.label}</p>
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
