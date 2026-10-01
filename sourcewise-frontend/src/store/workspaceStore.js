import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { sendAgentMessage } from '../lib/agentApi'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

/**
 * Text parser for quiz questions if LLM outputs markdown format
 */
export function parseQuizText(text) {
  if (!text || typeof text !== 'string') return []
  const questions = []

  // Split on markdown horizontal rules or Question markers
  const rawBlocks = text.split(/(?:^|\n)\s*(?:---|___|\*\*\*)\s*(?:\n|$)|(?=(?:^|\n)\s*(?:\*{0,2}Question\s*\d*|\bQ\d*|\d+\.)\s*[:\.]?)/mi)

  for (const block of rawBlocks) {
    const trimmedBlock = block.trim()
    if (!trimmedBlock) continue

    const lines = trimmedBlock.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length < 2) continue

    let qLine = ''
    let options = []
    let correct = -1
    let explanation = ''
    let inOptions = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // Clean markdown bold and italics from the line to make parsing robust
      const cleanLine = line.replace(/\*\*/g, '').replace(/\*/g, '').trim()

      // Match option A) B) C) D)
      const optMatch = cleanLine.match(/^(?:[-*•]\s*)?([A-D])[\)\.:]\s*(.+)/i)
      if (optMatch) {
        inOptions = true
        options.push(optMatch[2].trim())
        continue
      }

      // Match Answer line
      const ansMatch = cleanLine.match(/^(?:ANSWER|Ans|Correct(?:\s*Answer)?)\s*[:\.]?\s*\[?([A-D])\]?/i)
      if (ansMatch) {
        const letter = ansMatch[1].toUpperCase()
        correct = 'ABCD'.indexOf(letter)
        continue
      }

      // Match Explanation line
      const expMatch = cleanLine.match(/^(?:EXPLANATION|Reason)\s*[:\.]?\s*(.+)/i)
      if (expMatch) {
        explanation = expMatch[1].trim()
        continue
      }

      // Match Difficulty or Concept lines to avoid treating as question
      if (/^(?:Difficulty|Concept(?:\s*Tested)?)\s*[:\.]/i.test(cleanLine)) {
        continue
      }

      // If not yet in options, treat as question text
      if (!inOptions && !qLine) {
        const stripped = cleanLine
          .replace(/^(?:#+\s*)?(?:Question\s*\d*[\.:]?|\bQ\d*[\.:]?|\d+[\.:])\s*/i, '')
          .trim()
        if (stripped) {
          qLine = stripped
        }
      } else if (!inOptions && qLine) {
        qLine += ' ' + cleanLine
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

/**
 * Text parser for flashcards
 */
export function parseFlashcardsText(text) {
  if (!text || typeof text !== 'string') return []
  const cards = []

  // Split on --- or Card markers
  const rawBlocks = text.split(/(?:^|\n)\s*(?:---|___|\*\*\*)\s*(?:\n|$)|(?=(?:^|\n)\s*(?:\*{0,2}Card\s*\d+\*{0,2})\s*(?:\n|$))/mi)

  for (const block of rawBlocks) {
    const trimmed = block.trim()
    if (!trimmed) continue

    // Clean markdown bold and italics from the block for rock-solid extraction
    const cleanBlock = trimmed.replace(/\*\*/g, '').replace(/\*/g, '').trim()

    // Look for Front: ... and Back: ...
    const frontMatch = cleanBlock.match(/(?:FRONT|Term|Question|Concept)\s*[:\.]?\s*([\s\S]+?)(?=(?:\n\s*(?:BACK|Answer|Definition|Explanation)\s*[:\.]?)|$)/i)
    const backMatch = cleanBlock.match(/(?:BACK|Answer|Definition|Explanation)\s*[:\.]?\s*([\s\S]+?)(?=(?:\n\s*---)|$)/i)

    if (frontMatch && backMatch) {
      const front = frontMatch[1].replace(/^(?:Card\s*\d+[:\.]?\s*)/i, '').trim()
      const back = backMatch[1].trim()
      if (front && back) {
        cards.push({ front, back })
      }
    }
  }

  return cards
}

export const useWorkspaceStore = create(
  persist(
    (set, get) => ({
      // Active workspace navigation mode
      activeMode: 'chat',
      setActiveMode: (mode) => {
        set({ activeMode: mode })
        // Clear notifications for this mode upon opening
        get().clearNotification(mode)
      },

      // Multi-material selection state
      selectedMaterialIds: [],
      setSelectedMaterialIds: (ids) => set({ selectedMaterialIds: typeof ids === 'function' ? ids(get().selectedMaterialIds) : ids }),

      // Background Generation Flags (per section so they don't block each other)
      isGenerating: {
        chat: false,
        quiz: false,
        flashcards: false,
        notes: false,
        tutor: false,
      },

      // Unread notification counts per section when completed in background
      notifications: {
        quiz: 0,
        flashcards: 0,
        notes: 0,
        total: 0,
      },

      // Active completed alert toast
      lastCompletedToast: null,
      dismissToast: () => set({ lastCompletedToast: null }),

      // Global error state
      workspaceError: null,
      setWorkspaceError: (error) => set({ workspaceError: error }),

      // ── Quiz State ─────────────────────────────────────────────────────────
      quiz: {
        questions: [],
        currentIndex: 0,
        answers: {},
        completed: false,
        count: 5,
        difficulty: 'medium',
        type: 'multiple choice',
        topic: '',
        error: null,
      },

      setQuizOption: (key, val) =>
        set((s) => ({
          quiz: {
            ...s.quiz,
            [key]: typeof val === 'function' ? val(s.quiz[key]) : val,
          },
        })),

      setQuizAnswers: (answers) =>
        set((s) => ({
          quiz: {
            ...s.quiz,
            answers: typeof answers === 'function' ? answers(s.quiz.answers) : answers,
          },
        })),

      setQuizCompleted: (completed) =>
        set((s) => ({
          quiz: { ...s.quiz, completed: !!completed },
        })),

      setQuizAnswer: (questionIndex, answerIndex) =>
        set((s) => ({
          quiz: {
            ...s.quiz,
            answers: { ...s.quiz.answers, [questionIndex]: answerIndex },
          },
        })),

      setCurrentQuizIndex: (idx) =>
        set((s) => ({ quiz: { ...s.quiz, currentIndex: idx } })),

      submitQuiz: () =>
        set((s) => ({ quiz: { ...s.quiz, completed: true } })),

      resetQuiz: () =>
        set((s) => ({
          quiz: {
            ...s.quiz,
            currentIndex: 0,
            answers: {},
            completed: false,
          },
        })),

      // ── Flashcards State ───────────────────────────────────────────────────
      flashcards: {
        cards: [],
        currentIndex: 0,
        isFlipped: false,
        rating: null,
        count: 10,
        focus: 'key terms and definitions',
        topic: '',
        error: null,
      },

      setFlashcardOption: (key, val) =>
        set((s) => ({
          flashcards: {
            ...s.flashcards,
            [key]: typeof val === 'function' ? val(s.flashcards[key]) : val,
          },
        })),

      setIsFlipped: (val) =>
        set((s) => ({
          flashcards: {
            ...s.flashcards,
            isFlipped: typeof val === 'function' ? val(s.flashcards.isFlipped) : !!val,
          },
        })),

      setCurrentCardIndex: (idx) =>
        set((s) => ({ flashcards: { ...s.flashcards, currentIndex: idx, isFlipped: false, rating: null } })),

      toggleCardFlip: () =>
        set((s) => ({ flashcards: { ...s.flashcards, isFlipped: !s.flashcards.isFlipped } })),

      setFlashcardRating: (rating) =>
        set((s) => ({ flashcards: { ...s.flashcards, rating } })),

      resetFlashcards: () =>
        set((s) => ({
          flashcards: {
            ...s.flashcards,
            currentIndex: 0,
            isFlipped: false,
            rating: null,
          },
        })),

      // ── Notes State ────────────────────────────────────────────────────────
      notes: {
        content: null,
        style: 'Comprehensive Study Notes',
        depth: 'Balanced',
        topic: '',
        error: null,
      },

      setNotesOption: (key, val) =>
        set((s) => ({ notes: { ...s.notes, [key]: val } })),

      clearNotes: () =>
        set((s) => ({ notes: { ...s.notes, content: null } })),

      // ── Tutor State ────────────────────────────────────────────────────────
      tutor: {
        isSessionActive: false,
        style: 'Tutor',
        topic: '',
        error: null,
      },

      setTutorOption: (key, val) =>
        set((s) => ({ tutor: { ...s.tutor, [key]: val } })),

      // ── Chat State ─────────────────────────────────────────────────────────
      chatMessages: [],
      setChatMessages: (msgs) => set({ chatMessages: typeof msgs === 'function' ? msgs(get().chatMessages) : msgs }),
      addChatMessage: (msg) => set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
      clearChatMessages: () => set({ chatMessages: [] }),

      // ── Notification Helpers ───────────────────────────────────────────────
      clearNotification: (mode) => {
        set((s) => {
          const updated = { ...s.notifications, [mode]: 0 }
          const total = (updated.quiz || 0) + (updated.flashcards || 0) + (updated.notes || 0)
          return { notifications: { ...updated, total } }
        })
      },

      triggerSectionNotification: (mode, title, message) => {
        const { activeMode } = get()
        const isCurrentActiveTab = activeMode === mode && window.location.pathname.startsWith('/workspace')

        // If the user is not actively on this tab, increment badge count
        if (!isCurrentActiveTab) {
          set((s) => {
            const nextCount = (s.notifications[mode] || 0) + 1
            const updatedNotifs = { ...s.notifications, [mode]: nextCount }
            const total = (updatedNotifs.quiz || 0) + (updatedNotifs.flashcards || 0) + (updatedNotifs.notes || 0)
            return {
              notifications: { ...updatedNotifs, total },
              lastCompletedToast: {
                mode,
                title,
                message,
                timestamp: Date.now(),
              },
            }
          })
        }
      },

      // ── Background Generation Actions ──────────────────────────────────────

      /**
       * Background Quiz Generation
       * Continues executing even if user switches tab or navigates away.
       */
      startQuizGeneration: async ({ sourceIds, userId, count, difficulty, type, topic, token }) => {
        const quizCount = count || get().quiz.count || 5
        const quizDiff = difficulty || get().quiz.difficulty || 'medium'
        const quizTyp = type || get().quiz.type || 'multiple choice'
        const quizTop = topic !== undefined ? topic : get().quiz.topic

        set((s) => ({
          isGenerating: { ...s.isGenerating, quiz: true },
          quiz: { ...s.quiz, error: null },
          workspaceError: null,
        }))

        const topicDesc = quizTop?.trim() ? `focusing on "${quizTop.trim()}"` : "covering the most important concepts"
        const prompt = `Create a ${quizCount}-question ${quizDiff} ${quizTyp} quiz ${topicDesc} based strictly on the selected study material.
Return 4 options for each question (A, B, C, D), specify the correct answer, and provide a clear explanation.`

        try {
          const response = await sendAgentMessage({
            message: prompt,
            sourceIds: sourceIds || [],
            userId: userId || 'anonymous',
            history: [],
            context: { action: 'create_quiz', count: quizCount, difficulty: quizDiff, topic: quizTop }
          })

          let rawQuestions = []
          if (response?.data?.questions && Array.isArray(response.data.questions)) {
            rawQuestions = response.data.questions
          } else if (Array.isArray(response?.data)) {
            rawQuestions = response.data
          } else {
            rawQuestions = parseQuizText(response.message || response.data || '')
          }

          const normalized = rawQuestions.map((q, idx) => {
            const rawQ = q.question || q.q || `Question ${idx + 1}`
            const cleanQ = rawQ
              .replace(/^(?:#+\s*)?(?:Question\s*\d*[\.:]?|\bQ\d*[\.:]?|\d+[\.:])\s*/i, '')
              .replace(/\*\*/g, '')
              .replace(/\*/g, '')
              .trim()

            const cleanOptions = (Array.isArray(q.options) && q.options.length >= 2 ? q.options : ['Option A', 'Option B', 'Option C', 'Option D']).map(opt =>
              typeof opt === 'string'
                ? opt.replace(/^(?:[-*•]\s*)?(?:[A-D][\)\.:])\s*/i, '').replace(/\*\*/g, '').replace(/\*/g, '').trim()
                : opt
            )

            return {
              id: idx,
              question: cleanQ || `Question ${idx + 1}`,
              options: cleanOptions,
              correct: typeof q.answer === 'number' ? q.answer : (typeof q.correct === 'number' ? q.correct : 0),
              explanation: (q.explanation || 'Refer to your study material for details.').replace(/\*\*/g, '').replace(/\*/g, '').trim(),
              concept: q.topic || q.concept || 'General Knowledge'
            }
          })

          if (normalized.length === 0) {
            throw new Error("Could not parse quiz questions from the generated content. Please try again.")
          }

          set((s) => ({
            quiz: {
              ...s.quiz,
              questions: normalized,
              currentIndex: 0,
              answers: {},
              completed: false,
              error: null,
            },
            isGenerating: { ...s.isGenerating, quiz: false },
          }))

          // Track progress event silently
          if (token && API_URL) {
            fetch(`${API_URL}/progress/track`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                event_type: 'quiz_generated',
                source_id: sourceIds?.[0] || null,
                metadata: { source_count: sourceIds?.length || 0, question_count: normalized.length },
              }),
            }).catch(() => {})
          }

          // Trigger section badge & toast if user is elsewhere
          get().triggerSectionNotification(
            'quiz',
            'Quiz Ready!',
            `Your ${normalized.length}-question practice quiz is ready to play.`
          )

          return normalized
        } catch (err) {
          const errMsg = err.message || "Failed to generate quiz. Please check that AI services are active."
          set((s) => ({
            quiz: { ...s.quiz, error: errMsg },
            isGenerating: { ...s.isGenerating, quiz: false },
          }))
          throw err
        }
      },

      /**
       * Background Flashcard Generation
       * Continues executing even if user switches tab or navigates away.
       */
      startFlashcardGeneration: async ({ sourceIds, userId, count, focus, topic, token }) => {
        const fcCount = count || get().flashcards.count || 10
        const fcFocus = focus || get().flashcards.focus || 'key terms and definitions'
        const fcTopic = topic !== undefined ? topic : get().flashcards.topic

        set((s) => ({
          isGenerating: { ...s.isGenerating, flashcards: true },
          flashcards: { ...s.flashcards, error: null },
          workspaceError: null,
        }))

        const topicDesc = fcTopic?.trim() ? `on "${fcTopic.trim()}"` : "from the selected documents"
        const prompt = `Create ${fcCount} flashcards ${topicDesc} focusing on ${fcFocus} based on the uploaded material.
Format each card with:
FRONT: [Question, key term, or concept]
BACK: [Clear definition, explanation, or answer]
---`

        try {
          const response = await sendAgentMessage({
            message: prompt,
            sourceIds: sourceIds || [],
            userId: userId || 'anonymous',
            history: [],
            context: { action: 'create_flashcards', count: fcCount, focus: fcFocus, topic: fcTopic }
          })

          let rawCards = response?.data?.cards || (Array.isArray(response?.data) ? response.data : [])
          if (!rawCards || rawCards.length === 0) {
            rawCards = parseFlashcardsText(response.message || response.data || '')
          }

          const normalized = rawCards.map((c, idx) => {
            const rawFront = c.front || c.term || c.question || ''
            const rawBack = c.back || c.definition || c.answer || ''
            const cleanFront = rawFront
              .replace(/^(?:#+\s*)?(?:Card\s*\d+[:\.]?\s*)?(?:Front\s*[:\.]?\s*)/i, '')
              .replace(/\*\*/g, '')
              .replace(/\*/g, '')
              .trim()
            const cleanBack = rawBack
              .replace(/^(?:#+\s*)?(?:Back\s*[:\.]?\s*)/i, '')
              .replace(/\*\*/g, '')
              .replace(/\*/g, '')
              .trim()

            return {
              id: idx,
              front: cleanFront,
              back: cleanBack
            }
          }).filter(c => c.front && c.back)

          if (normalized.length === 0) {
            throw new Error("Unable to extract flashcards from response. Please try again.")
          }

          set((s) => ({
            flashcards: {
              ...s.flashcards,
              cards: normalized,
              currentIndex: 0,
              isFlipped: false,
              rating: null,
              error: null,
            },
            isGenerating: { ...s.isGenerating, flashcards: false },
          }))

          if (token && API_URL) {
            fetch(`${API_URL}/progress/track`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                event_type: 'flashcards_generated',
                source_id: sourceIds?.[0] || null,
                metadata: { source_count: sourceIds?.length || 0, card_count: normalized.length },
              }),
            }).catch(() => {})
          }

          get().triggerSectionNotification(
            'flashcards',
            'Flashcards Ready!',
            `${normalized.length} flashcards are ready for memorization.`
          )

          return normalized
        } catch (err) {
          const errMsg = err.message || "Failed to generate flashcards. Please check backend connection."
          set((s) => ({
            flashcards: { ...s.flashcards, error: errMsg },
            isGenerating: { ...s.isGenerating, flashcards: false },
          }))
          throw err
        }
      },

      /**
       * Background Notes Generation
       */
      startNotesGeneration: async ({ sourceIds, userId, style, depth, topic, token }) => {
        const nStyle = style || get().notes.style || 'Comprehensive Study Notes'
        const nDepth = depth || get().notes.depth || 'Balanced'
        const nTopic = topic !== undefined ? topic : get().notes.topic

        set((s) => ({
          isGenerating: { ...s.isGenerating, notes: true },
          notes: { ...s.notes, error: null },
          workspaceError: null,
        }))

        const topicDesc = nTopic?.trim() ? `focusing on "${nTopic.trim()}"` : "covering the material thoroughly"
        const prompt = `Generate ${nStyle} (${nDepth} level) ${topicDesc} based on the selected uploaded study material.
Structure the notes with clear markdown headings, bullet points, key definitions, formulas or frameworks, and an executive summary of key exam takeaways.`

        try {
          const response = await sendAgentMessage({
            message: prompt,
            sourceIds: sourceIds || [],
            userId: userId || 'anonymous',
            history: [],
            context: { action: 'create_notes', style: nStyle, depth: nDepth, topic: nTopic }
          })

          const content = response?.data?.notes || response?.data?.guide || response?.data?.summary || response?.message || response?.data
          if (!content) {
            throw new Error("No notes content returned. Please try again.")
          }

          const finalStr = typeof content === 'string' ? content : JSON.stringify(content, null, 2)

          set((s) => ({
            notes: {
              ...s.notes,
              content: finalStr,
              error: null,
            },
            isGenerating: { ...s.isGenerating, notes: false },
          }))

          if (token && API_URL) {
            fetch(`${API_URL}/progress/track`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                event_type: 'notes_generated',
                source_id: sourceIds?.[0] || null,
                metadata: { source_count: sourceIds?.length || 0 },
              }),
            }).catch(() => {})
          }

          get().triggerSectionNotification(
            'notes',
            'Notes Synthesized!',
            'Your structured study notes and summary are ready to read.'
          )

          return finalStr
        } catch (err) {
          const errMsg = err.message || "Failed to generate notes."
          set((s) => ({
            notes: { ...s.notes, error: errMsg },
            isGenerating: { ...s.isGenerating, notes: false },
          }))
          throw err
        }
      },
    }),
    {
      name: 'sourcewise_workspace_storage',
      partialize: (state) => ({
        quiz: state.quiz,
        flashcards: state.flashcards,
        notes: state.notes,
        chatMessages: state.chatMessages,
        notifications: state.notifications,
        activeMode: state.activeMode,
      }),
    }
  )
)
