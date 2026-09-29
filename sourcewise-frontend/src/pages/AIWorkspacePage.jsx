import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Send, Loader2, Brain, MessageSquare, FileText, 
  HelpCircle, BookOpen, Copy, Check, ChevronRight,
  Award, AlertCircle
} from 'lucide-react'
import { useSourceStore } from '../store/sourceStore'
import { useAuthStore } from '../store/authStore'
import { streamChat } from '../lib/chatApi'
import { sendAgentMessage } from '../lib/agentApi'
import { GlowCard } from '../components/ui/glow-card'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const MODES = {
  chat: { id: 'chat', label: 'Chat', icon: MessageSquare, description: 'Ask questions about your sources' },
  quiz: { id: 'quiz', label: 'Quiz', icon: HelpCircle, description: 'Test your knowledge' },
  flashcards: { id: 'flashcards', label: 'Flashcards', icon: BookOpen, description: 'Memorize key concepts' },
  tutor: { id: 'tutor', label: 'Tutor', icon: Brain, description: 'Get personalized explanations' },
  notes: { id: 'notes', label: 'Notes', icon: FileText, description: 'Generate organized notes' },
}

export default function AIWorkspacePage() {
  const { mode: urlMode } = useParams()
  const navigate = useNavigate()
  const { activeSourceIds } = useSourceStore()
  const { user, accessToken } = useAuthStore()
  
  const [activeMode, setActiveMode] = useState(urlMode || 'chat')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState(null)
  const [flashcards, setFlashcards] = useState([])
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [quizQuestions, setQuizQuestions] = useState([])
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState({})
  const [quizCompleted, setQuizCompleted] = useState(false)
  const [copied, setCopied] = useState(false)
  const [flashcardRating, setFlashcardRating] = useState(null)
  
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (urlMode && MODES[urlMode]) {
      setActiveMode(urlMode)
    }
  }, [urlMode])

  useEffect(() => {
    const sessionStart = Date.now()
    return () => {
      if (accessToken && messages.length > 1) {
        const durationMinutes = Math.round((Date.now() - sessionStart) / 60000)
        if (durationMinutes >= 1) {
          fetch(`${API_URL}/progress/track`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              event_type: 'chat_session',
              duration_minutes: durationMinutes,
              metadata: { mode: activeMode, message_count: messages.length },
            }),
          }).catch(() => {})
        }
      }
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleModeChange = (mode) => {
    setActiveMode(mode)
    navigate(`/workspace/${mode}`, { replace: true })
    setGeneratedContent(null)
    setFlashcards([])
    setQuizQuestions([])
    setQuizCompleted(false)
    setFlashcardRating(null)
  }

  const handleSendMessage = async () => {
    if (!input.trim() || isGenerating) return
    
    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsGenerating(true)

    if (activeSourceIds.length === 0) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Please select at least one source in the Knowledge Hub first.' 
      }])
      setIsGenerating(false)
      return
    }

    if (activeMode === 'chat') {
      // Streaming RAG chat
      let assistantMessage = { role: 'assistant', content: '', citations: [] }
      setMessages(prev => [...prev, assistantMessage])

      await streamChat({
        question: userMessage,
        sourceIds: activeSourceIds,
        userId: user?.id || 'anonymous',
        history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
        onCitations: (citations) => {
          setMessages(prev => {
            const newMessages = [...prev]
            newMessages[newMessages.length - 1] = { ...newMessages[newMessages.length - 1], citations }
            return newMessages
          })
        },
        onToken: (token) => {
          setMessages(prev => {
            const newMessages = [...prev]
            const lastMsg = newMessages[newMessages.length - 1]
            newMessages[newMessages.length - 1] = { ...lastMsg, content: lastMsg.content + token }
            return newMessages
          })
        },
        onDone: () => setIsGenerating(false),
        onError: (err) => {
          setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err}` }])
          setIsGenerating(false)
        }
      })
    } else {
      // AI Agent for other modes
      try {
        const response = await sendAgentMessage({
          message: userMessage,
          sourceIds: activeSourceIds,
          userId: user?.id || 'anonymous',
          history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
        })

        if (response.type === 'create_quiz') {
          parseQuizFromResponse(response.data)
          setMessages(prev => [...prev, { role: 'assistant', content: 'Quiz generated! Answer the questions below.' }])
          trackContentGeneration('quiz_generated')
        } else if (response.type === 'create_flashcards') {
          parseFlashcardsFromResponse(response.data)
          setMessages(prev => [...prev, { role: 'assistant', content: 'Flashcards generated! Click to flip.' }])
          trackContentGeneration('flashcards_generated')
        } else if (response.type === 'summary') {
          setMessages(prev => [...prev, { role: 'assistant', content: response.message || response.data }])
          setGeneratedContent(response.data)
          trackContentGeneration('summary_generated')
        } else if (response.type === 'notes') {
          setMessages(prev => [...prev, { role: 'assistant', content: response.message || response.data }])
          setGeneratedContent(response.data)
          trackContentGeneration('notes_generated')
        } else if (response.type === 'study_guide') {
          setMessages(prev => [...prev, { role: 'assistant', content: response.message || response.data }])
          setGeneratedContent(response.data)
          trackContentGeneration('study_guide_generated')
        } else {
          setMessages(prev => [...prev, { role: 'assistant', content: response.message || response.data }])
          setGeneratedContent(response.data)
        }
      } catch (err) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }])
      } finally {
        setIsGenerating(false)
      }
    }
  }

  const parseQuizFromResponse = (data) => {
    try {
      if (typeof data === 'string') {
        const questions = []
        const lines = data.split('\n')
        let currentQuestion = null
        
        for (const line of lines) {
          if (line.match(/^\d+\.\s/)) {
            if (currentQuestion) questions.push(currentQuestion)
            currentQuestion = { question: line.replace(/^\d+\.\s/, ''), options: [], correct: 0 }
          } else if (line.match(/^[a-d]\)/i) && currentQuestion) {
            currentQuestion.options.push(line.replace(/^[a-d]\)\s*/i, ''))
          }
        }
        if (currentQuestion) questions.push(currentQuestion)
        setQuizQuestions(questions)
      } else if (Array.isArray(data)) {
        setQuizQuestions(data)
      }
    } catch (e) {
      console.error('Failed to parse quiz:', e)
    }
  }

  const parseFlashcardsFromResponse = (data) => {
    try {
      if (typeof data === 'string') {
        const cards = []
        const parts = data.split(/---|FRONT:|BACK:/i)
        for (let i = 1; i < parts.length - 1; i += 2) {
          cards.push({ front: parts[i].trim(), back: parts[i + 1]?.trim() || '' })
        }
        setFlashcards(cards)
      } else if (Array.isArray(data)) {
        setFlashcards(data)
      }
    } catch (e) {
      console.error('Failed to parse flashcards:', e)
    }
  }

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
          metadata: { total, correct, source_ids: activeSourceIds },
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
            source_id: activeSourceIds[0] || null,
          }),
        })
      }
    } catch (err) {
      console.error('[Quiz] Progress tracking error:', err)
    }
  }

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
          source_id: activeSourceIds[0] || null,
          metadata: { source_count: activeSourceIds.length },
        }),
      })
    } catch (err) {
      console.error('[Progress] Content generation tracking error:', err)
    }
  }

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
            source_id: activeSourceIds[0] || null,
          }),
        })
        await fetch(`${API_URL}/mastery`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ concept, score, correct, source_id: activeSourceIds[0] || null }),
        })
        await fetch(`${API_URL}/revision/schedule`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ concept, mastery_score: score, source_id: activeSourceIds[0] || null }),
        })
      } catch (err) {
        console.error('[Flashcard] Progress tracking error:', err)
      }
    }

    setTimeout(() => {
      if (currentCardIndex < flashcards.length - 1) {
        setCurrentCardIndex(currentCardIndex + 1)
      }
      setFlashcardRating(null)
    }, 300)
  }

  const renderChatMode = () => (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <img src="/workspace-chat.png" alt="Student chatting with the fox companion at a laptop" className="w-52 h-36 object-contain mb-4 mix-blend-multiply" />
            <h3 className="text-xl font-bold text-[#1E1B16] mb-2">Chat with Sources</h3>
            <p className="text-sm text-[#5B544E] max-w-md">Ask anything about your uploaded documents — every answer comes straight from your sources.</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-[#FDEEE6] flex items-center justify-center mr-3 shrink-0 mt-1">
                <Brain className="w-4 h-4 text-[#E8845F]" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-5 py-4 ${
              msg.role === 'user'
                ? 'bg-[#E8845F] text-white'
                : 'bg-white border border-[#EDE7E1] text-[#1E1B16]'
            }`}>
              <div className="whitespace-pre-wrap leading-relaxed text-sm">{msg.content}</div>
              {msg.citations && msg.citations.length > 0 && (
                <div className="-mx-5 -mb-4 mt-4 px-5 py-3 bg-[#FAFAFA] border-t border-[#EDE7E1] rounded-b-2xl">
                  <p className="text-xs font-semibold text-[#8A817B] mb-2">Sources</p>
                  {msg.citations.map((cite, i) => (
                    <div key={i} className="text-xs bg-white border border-[#EDE7E1] rounded-lg p-2 mb-1 text-[#5B544E]">
                      <span className="font-medium text-[#1E1B16]">{cite.source_name}</span> (p.{cite.page})
                    </div>
                  ))}
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
            <div className="bg-white border border-[#EDE7E1] rounded-2xl px-5 py-4 flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#E8845F]" />
              <span className="text-sm text-[#8A817B]">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )

  const renderQuizMode = () => (
    <div className="flex-1 overflow-y-auto p-6">
      {quizQuestions.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center">
          <img src="/workspace-quiz.png" alt="Celebrating a quiz win with the fox companion" className="w-52 h-36 object-contain mb-4 mix-blend-multiply" />
          <h3 className="text-xl font-bold text-[#1E1B16] mb-2">Generate a Quiz</h3>
          <p className="text-sm text-[#5B544E] max-w-md">Tell me what to quiz you on below, and I'll build a quiz from your sources.</p>
        </div>
      ) : quizCompleted ? (
        <div className="max-w-2xl mx-auto space-y-6">
          <GlowCard className="p-8 text-center">
            <Award className="w-16 h-16 text-[#E8845F] mx-auto mb-4" />
            <h3 className="text-2xl font-display font-bold mb-2 text-[#1E1B16]">Quiz Complete!</h3>
            {(() => {
              const total = quizQuestions.length
              const correct = quizQuestions.reduce((count, q, idx) => {
                return count + (quizAnswers[idx] === q.correct ? 1 : 0)
              }, 0)
              const score = total > 0 ? Math.round((correct / total) * 100) : 0
              return (
                <>
                  <p className="text-4xl font-bold text-[#C05A35] mb-2">{score}%</p>
                  <p className="text-[#5B544E]">{correct} of {total} correct</p>
                  <div className="mt-6 space-y-2">
                    {quizQuestions.map((q, idx) => (
                      <div key={idx} className={`flex items-center space-x-2 p-2 rounded-lg text-sm ${
                        quizAnswers[idx] === q.correct ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                      }`}>
                        {quizAnswers[idx] === q.correct ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        <span className="truncate">{q.question}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => { setQuizQuestions([]); setQuizCompleted(false); setQuizAnswers({}); setCurrentQuizIndex(0) }}
                    className="sw-btn-secondary !h-10 !text-sm mt-4"
                  >
                    New Quiz
                  </button>
                </>
              )
            })()}
          </GlowCard>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-display font-bold text-[#1E1B16]">Quiz ({currentQuizIndex + 1}/{quizQuestions.length})</h3>
            <span className="text-sm text-[#8A817B]">
              {Object.keys(quizAnswers).length}/{quizQuestions.length} answered
            </span>
          </div>
          
          {quizQuestions[currentQuizIndex] && (
            <GlowCard className="p-6">
              <p className="font-medium mb-4 text-[#1E1B16]">{quizQuestions[currentQuizIndex].question}</p>
              <div className="space-y-2">
                {quizQuestions[currentQuizIndex].options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuizAnswer(currentQuizIndex, idx)}
                    className={`w-full text-left p-3 rounded-xl border transition-all text-sm text-[#1E1B16] ${
                      quizAnswers[currentQuizIndex] === idx
                        ? 'border-[#E8845F] bg-[rgba(232,132,95,0.08)]'
                        : 'border-[#EDE7E1] hover:border-[rgba(232,132,95,0.4)]'
                    }`}
                  >
                    {String.fromCharCode(65 + idx)}. {option}
                  </button>
                ))}
              </div>
            </GlowCard>
          )}
          
          <div className="flex justify-between">
            <button
              onClick={() => setCurrentQuizIndex(Math.max(0, currentQuizIndex - 1))}
              disabled={currentQuizIndex === 0}
              className="sw-btn-secondary !h-10 !text-sm"
            >
              Previous
            </button>
            {currentQuizIndex < quizQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentQuizIndex(currentQuizIndex + 1)}
                className="sw-btn-primary !h-10 !text-sm"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleQuizSubmit}
                className="sw-btn-primary !h-10 !text-sm"
              >
                Submit Quiz
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )

  const renderFlashcardsMode = () => (
    <div className="flex-1 overflow-y-auto p-6">
      {flashcards.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center">
          <img src="/workspace-flashcards.png" alt="Playing and memorising with the fox companion" className="w-52 h-36 object-contain mb-4 mix-blend-multiply" />
          <h3 className="text-xl font-bold text-[#1E1B16] mb-2">Generate Flashcards</h3>
          <p className="text-sm text-[#5B544E] max-w-md">Tell me what to focus on below, and I'll turn your sources into flashcards.</p>
        </div>
      ) : (
        <div className="max-w-lg mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-display font-bold text-[#1E1B16]">Flashcards ({currentCardIndex + 1}/{flashcards.length})</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentCardIndex(Math.max(0, currentCardIndex - 1))}
                disabled={currentCardIndex === 0}
                className="p-2 rounded-lg border border-[#EDE7E1] text-[#5B544E] disabled:opacity-50 hover:border-[rgba(232,132,95,0.4)]"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
              </button>
              <button
                onClick={() => setCurrentCardIndex(Math.min(flashcards.length - 1, currentCardIndex + 1))}
                disabled={currentCardIndex === flashcards.length - 1}
                className="p-2 rounded-lg border border-[#EDE7E1] text-[#5B544E] disabled:opacity-50 hover:border-[rgba(232,132,95,0.4)]"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {flashcards[currentCardIndex] && (
            <div className="perspective-1000">
              <div className="relative w-full h-64 cursor-pointer group">
                <div className="absolute inset-0 rounded-2xl bg-white border border-[#EDE7E1] p-6 flex items-center justify-center text-center backface-hidden group-hover:opacity-0 transition-opacity">
                  <p className="text-lg font-medium text-[#1E1B16]">{flashcards[currentCardIndex].front}</p>
                </div>
                <div className="absolute inset-0 rounded-2xl bg-[#E8845F] text-white p-6 flex items-center justify-center text-center backface-hidden opacity-0 group-hover:opacity-100 transition-opacity rotate-y-180">
                  <p className="text-lg">{flashcards[currentCardIndex].back}</p>
                </div>
              </div>
              <p className="text-center text-sm text-[#8A817B] mt-4">Hover to reveal answer</p>
              <div className="flex justify-center space-x-2 mt-4">
                {[
                  { label: 'Again', value: 'again', color: 'bg-red-100 text-red-600 border-red-200 hover:bg-red-200' },
                  { label: 'Hard', value: 'hard', color: 'bg-orange-100 text-orange-600 border-orange-200 hover:bg-orange-200' },
                  { label: 'Good', value: 'good', color: 'bg-green-100 text-green-600 border-green-200 hover:bg-green-200' },
                  { label: 'Easy', value: 'easy', color: 'bg-blue-100 text-blue-600 border-blue-200 hover:bg-blue-200' },
                ].map(({ label, value, color }) => (
                  <button
                    key={value}
                    onClick={() => handleFlashcardRating(value)}
                    disabled={flashcardRating !== null}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${color} ${
                      flashcardRating === value ? 'ring-2 ring-[#E8845F]' : ''
                    } disabled:opacity-50`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )

  const renderNotesMode = () => (
    <div className="flex-1 overflow-y-auto p-6">
      {generatedContent ? (
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-display font-bold text-[#1E1B16]">Generated Notes</h3>
            <button
              onClick={() => handleCopy(typeof generatedContent === 'string' ? generatedContent : JSON.stringify(generatedContent, null, 2))}
              className="sw-btn-secondary !h-9 !px-3 !text-xs"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
          <GlowCard className="p-8">
            <pre className="whitespace-pre-wrap font-sans text-[#1E1B16] text-sm leading-relaxed">
              {typeof generatedContent === 'string' ? generatedContent : JSON.stringify(generatedContent, null, 2)}
            </pre>
          </GlowCard>
        </div>
      ) : (
        <div className="h-full flex flex-col items-center justify-center text-center">
          <img src="/workspace-notes.png" alt="Organising study notes with the fox companion" className="w-52 h-36 object-contain mb-4 mix-blend-multiply" />
          <h3 className="text-xl font-bold text-[#1E1B16] mb-2">Generate Notes</h3>
          <p className="text-sm text-[#5B544E] max-w-md">Tell me what to cover below, and I'll organise your sources into clear notes.</p>
        </div>
      )}
    </div>
  )

  const renderTutorMode = () => (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <img src="/workspace-tutor.png" alt="Learning with the fox tutor" className="w-52 h-36 object-contain mb-4 mix-blend-multiply" />
            <h3 className="text-xl font-bold text-[#1E1B16] mb-2">AI Tutor</h3>
            <p className="text-sm text-[#5B544E] max-w-md">Tell me what's tripping you up — I'll explain concepts, quiz you, and walk through tricky material step by step.</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-[#FDEEE6] flex items-center justify-center mr-3 shrink-0 mt-1">
                <Brain className="w-4 h-4 text-[#E8845F]" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-5 py-4 ${
              msg.role === 'user'
                ? 'bg-[#E8845F] text-white'
                : 'bg-white border border-[#EDE7E1] text-[#1E1B16]'
            }`}>
              <div className="whitespace-pre-wrap leading-relaxed text-sm">{msg.content}</div>
              {msg.citations && msg.citations.length > 0 && (
                <div className="-mx-5 -mb-4 mt-4 px-5 py-3 bg-[#FAFAFA] border-t border-[#EDE7E1] rounded-b-2xl">
                  <p className="text-xs font-semibold text-[#8A817B] mb-2">Sources</p>
                  {msg.citations.map((cite, i) => (
                    <div key={i} className="text-xs bg-white border border-[#EDE7E1] rounded-lg p-2 mb-1 text-[#5B544E]">
                      <span className="font-medium text-[#1E1B16]">{cite.source_name}</span> (p.{cite.page})
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isGenerating && (
          <div className="flex items-start">
            <div className="w-8 h-8 rounded-lg bg-[#FDEEE6] flex items-center justify-center mr-3 shrink-0">
              <Brain className="w-4 h-4 animate-pulse text-[#E8845F]" />
            </div>
            <div className="bg-white border border-[#EDE7E1] rounded-2xl px-5 py-4 flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#E8845F]" />
              <span className="text-sm text-[#8A817B]">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )

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
      <div className="w-60 sm:w-64 bg-[#FAFAFA] border-r border-[#EDE7E1] flex flex-col">
        <div className="p-4 border-b border-[#EDE7E1]">
          <h2 className="font-display font-bold text-lg flex items-center space-x-2 text-[#1E1B16]">
            <Brain className="w-5 h-5 text-[#E8845F]" />
            <span>AI Workspace</span>
          </h2>
        </div>
        <div className="flex-1 p-3 space-y-1">
          {Object.values(MODES).map((mode) => {
            const Icon = mode.icon
            const isActive = activeMode === mode.id
            return (
              <button
                key={mode.id}
                onClick={() => handleModeChange(mode.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive
                    ? 'bg-[rgba(232,132,95,0.11)] text-[#C05A35] font-semibold'
                    : 'text-[#5B544E] hover:bg-[#F3EFEB] hover:text-[#1E1B16]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#E8845F]' : 'text-[#8A817B]'}`} />
                <span>{mode.label}</span>
              </button>
            )
          })}
        </div>
        <div className="p-3 border-t border-[#EDE7E1]">
          <div className="text-xs text-[#8A817B]">
            {activeSourceIds.length} source{activeSourceIds.length !== 1 ? 's' : ''} selected
          </div>
        </div>
      </div>

      {/* Center - Main Content */}
      <div className="flex-1 flex flex-col">
        {renderContent()}
        
        {/* Input Area */}
        <div className="p-4 bg-[#FAFAFA] border-t border-[#EDE7E1]">
          <div className="flex items-end bg-white border border-[#E0D9D2] rounded-2xl p-2 focus-within:border-[#E8845F]">
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
                activeMode === 'chat' ? 'Ask anything about your sources...' :
                activeMode === 'quiz' ? 'Generate a quiz about...' :
                activeMode === 'flashcards' ? 'Create flashcards for...' :
                activeMode === 'notes' ? 'Create notes about...' :
                'Type your message...'
              }
              className="flex-1 min-h-[48px] max-h-[120px] resize-none bg-transparent px-4 py-2 focus:outline-none text-sm text-[#1E1B16]"
              disabled={isGenerating}
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || isGenerating}
              className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
                input.trim() && !isGenerating
                  ? 'bg-[#E8845F] text-white'
                  : 'bg-[#F1ECE6] text-[#8A817B]'
              }`}
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-center text-[10px] text-[#8A817B] mt-2">
            SourceWise AI runs locally and grounds answers in your documents.
          </p>
        </div>
      </div>
    </div>
  )
}
