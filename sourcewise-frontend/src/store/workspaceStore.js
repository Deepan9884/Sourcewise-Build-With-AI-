import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { sendAgentMessage } from '../lib/agentApi'
import { fetchCloudNotes, saveCloudNote, updateCloudNote, deleteCloudNote } from '../lib/notesApi'

const API_URL = import.meta.env.VITE_API_URL || 'https://node-api-nine-flame.vercel.app'

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
        if (stripped && !stripped.toLowerCase().includes('switch to the') && !stripped.toLowerCase().includes('workspace tab')) {
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

    // Must match FRONT/Term/Question with a required colon or delimiter
    const frontMatch = cleanBlock.match(/(?:^|\n)\s*(?:FRONT|Term|Question|Concept)\s*[:\.-]\s*([\s\S]+?)(?=(?:\n\s*(?:BACK|Answer|Definition|Explanation)\s*[:\.-])|$)/i)
    const backMatch = cleanBlock.match(/(?:^|\n)\s*(?:BACK|Answer|Definition|Explanation)\s*[:\.-]\s*([\s\S]+?)(?=(?:\n\s*(?:---|___))|$)/i)

    if (frontMatch && backMatch) {
      const front = frontMatch[1].replace(/^(?:Card\s*\d+[:\.]?\s*)/i, '').trim()
      const back = backMatch[1].trim()
      if (front && back && !front.toLowerCase().includes('switch to the') && !front.toLowerCase().includes('workspace tab')) {
        cards.push({ front, back })
      }
    }
  }

  return cards
}

function getFallbackQuiz(topic) {
  const t = topic?.trim() || 'your study material'
  return [
    {
      id: 0,
      question: `What is the core premise and objective of ${t}?`,
      options: ['Establish foundational principles and study guidance', 'Maximize operational latency', 'Bypass all core prerequisites', 'Introduce arbitrary administrative limits'],
      correct: 0,
      explanation: `${t} establishes foundational guidance and core principles for domain mastery.`,
      concept: 'Core Principles'
    },
    {
      id: 1,
      question: 'Which cognitive strategy most effectively reinforces long-term retention?',
      options: ['Passive rereading of notes', 'Active recall and spaced repetition', 'Cramming immediately before deadlines', 'Highlighting entire text blocks'],
      correct: 1,
      explanation: 'Active recall and spaced intervals stimulate synaptic strengthening and memory consolidation.',
      concept: 'Cognitive Science'
    },
    {
      id: 2,
      question: `How does ${t} recommend addressing complex or challenging concepts?`,
      options: ['Skip difficult sections completely', 'Decompose concepts into first principles and test understanding iteratively', 'Rely solely on rote memorization without context', 'Abandon active practice'],
      correct: 1,
      explanation: 'First-principles breakdown and iterative verification lead to genuine conceptual mastery.',
      concept: 'Problem Solving'
    },
    {
      id: 3,
      question: 'What role does peer collaboration and discussion play in learning?',
      options: ['It slows down individual progress', 'It clarifies edge cases and tests depth of understanding through synthesis', 'It replaces personal study entirely', 'It is only useful for administrative logistics'],
      correct: 1,
      explanation: 'Explaining and defending concepts with peers reveals hidden blind spots and reinforces understanding.',
      concept: 'Collaboration'
    },
    {
      id: 4,
      question: 'What is the most effective approach when facing study fatigue or diminishing returns?',
      options: ['Force continuous studying through the night', 'Take a 20-minute restorative nap to enable memory consolidation', 'Increase caffeine intake indefinitely', 'Quit studying permanently'],
      correct: 1,
      explanation: 'A short restorative nap flushes adenosine and stabilizes memories formed during the session.',
      concept: 'Study Habits'
    }
  ]
}

function getFallbackFlashcards(topic) {
  const t = topic?.trim() || 'your study material'
  return [
    { id: 0, front: `Core Thesis of ${t}`, back: `Foundational roadmap and governing principles essential for mastering ${t}.` },
    { id: 1, front: 'Active Recall', back: 'Stimulating memory retrieval during learning, significantly enhancing long-term memory retention.' },
    { id: 2, front: 'Spaced Repetition', back: 'Reviewing key concepts at increasing time intervals to counteract the forgetting curve.' },
    { id: 3, front: 'Growth Mindset', back: 'The conviction that intellectual capabilities expand through strategic effort and iterative practice.' },
    { id: 4, front: 'First Principles Thinking', back: 'Breaking complex problems down to basic truths and reasoning up from there.' }
  ]
}

function getWorkspaceKey(userId) {
  return userId ? `sourcewise_workspace_${userId}` : 'sourcewise_workspace_guest';
}

function getInitialWorkspaceData() {
  try {
    const rawAuth = localStorage.getItem('sourcewise-auth');
    if (rawAuth) {
      const parsed = JSON.parse(rawAuth);
      const userId = parsed?.state?.user?.id;
      if (userId) {
        const raw = localStorage.getItem(getWorkspaceKey(userId));
        if (raw) {
          return { userId, data: JSON.parse(raw) };
        }
        return { userId, data: null };
      }
    }
  } catch (_) {}
  return { userId: null, data: null };
}

const initialWs = getInitialWorkspaceData();

export const useWorkspaceStore = create(
  (set, get) => ({
    _userId: initialWs.userId,

    initForUser: (userId) => {
      // 1. Wipe in-memory state clean first so previous user's data vanishes immediately
      set({
        _userId: userId || null,
        chatMessages: [],
        selectedMaterialIds: [],
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
        notes: {
          id: null,
          title: 'Study Notes',
          content: '',
          style: 'comprehensive',
          depth: 'deep',
          topic: '',
          isCloudSaved: false,
          isSavingCloud: false,
          isFetchingCloud: false,
          cloudNotes: [],
          activeView: 'reader',
          error: null,
        },
        notifications: {
          quiz: 0,
          flashcards: 0,
          notes: 0,
          total: 0,
        },
        activeMode: 'chat',
      });

      // 2. Load scoped data for this user if exists
      if (userId) {
        try {
          const raw = localStorage.getItem(getWorkspaceKey(userId));
          if (raw) {
            const parsed = JSON.parse(raw);
            set({
              chatMessages: Array.isArray(parsed.chatMessages) ? parsed.chatMessages : [],
              selectedMaterialIds: Array.isArray(parsed.selectedMaterialIds) ? parsed.selectedMaterialIds : [],
              quiz: parsed.quiz ? { ...get().quiz, ...parsed.quiz } : get().quiz,
              flashcards: parsed.flashcards ? { ...get().flashcards, ...parsed.flashcards } : get().flashcards,
              notes: parsed.notes ? { ...get().notes, ...parsed.notes } : get().notes,
              notifications: parsed.notifications || get().notifications,
              activeMode: parsed.activeMode || 'chat',
            });
          }
        } catch (_) {}
      }
    },

    resetWorkspace: () => {
      set({
        _userId: null,
        chatMessages: [],
        selectedMaterialIds: [],
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
        notes: {
          id: null,
          title: 'Study Notes',
          content: '',
          style: 'comprehensive',
          depth: 'deep',
          topic: '',
          isCloudSaved: false,
          isSavingCloud: false,
          isFetchingCloud: false,
          cloudNotes: [],
          activeView: 'reader',
          error: null,
        },
        notifications: {
          quiz: 0,
          flashcards: 0,
          notes: 0,
          total: 0,
        },
        activeMode: 'chat',
      });
      try {
        localStorage.removeItem('sourcewise_workspace_storage');
        localStorage.removeItem('sourcewise_workspace_guest');
      } catch (_) {}
    },

    _persistWorkspace: () => {
      const s = get();
      try {
        localStorage.setItem(
          getWorkspaceKey(s._userId),
          JSON.stringify({
            chatMessages: s.chatMessages,
            selectedMaterialIds: s.selectedMaterialIds,
            quiz: s.quiz,
            flashcards: s.flashcards,
            notes: s.notes,
            notifications: s.notifications,
            activeMode: s.activeMode,
          })
        );
      } catch (_) {}
    },

    // Active workspace navigation mode
    activeMode: initialWs.data?.activeMode || 'chat',
    setActiveMode: (mode) => {
      set({ activeMode: mode });
      get().clearNotification(mode);
      get()._persistWorkspace();
    },

    // Multi-material selection state
    selectedMaterialIds: initialWs.data?.selectedMaterialIds || [],
    setSelectedMaterialIds: (ids) => {
      set({ selectedMaterialIds: typeof ids === 'function' ? ids(get().selectedMaterialIds) : ids });
      get()._persistWorkspace();
    },

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
        id: null,
        title: 'Untitled Study Notes',
        content: null,
        style: 'Comprehensive Study Notes',
        depth: 'Balanced',
        topic: '',
        error: null,
        isCloudSaved: false,
        cloudNotes: [],
        isFetchingCloud: false,
        isSavingCloud: false,
        activeView: 'reader', // 'reader' | 'editor'
      },

      setNotesOption: (key, val) =>
        set((s) => ({
          notes: {
            ...s.notes,
            [key]: typeof val === 'function' ? val(s.notes[key]) : val,
          },
        })),

      setNotesTitle: (title) =>
        set((s) => ({
          notes: { ...s.notes, title, isCloudSaved: false },
        })),

      setNotesContent: (content) =>
        set((s) => ({
          notes: {
            ...s.notes,
            content: typeof content === 'function' ? content(s.notes.content) : content,
            isCloudSaved: false,
          },
        })),

      clearNotes: () =>
        set((s) => ({
          notes: {
            ...s.notes,
            id: null,
            title: 'Untitled Study Notes',
            content: null,
            isCloudSaved: false,
            activeView: 'reader',
          },
        })),

      loadCloudNote: (note) =>
        set((s) => ({
          notes: {
            ...s.notes,
            id: note.id,
            title: note.title || 'Untitled Notes',
            content: note.content || '',
            style: note.style || s.notes.style,
            depth: note.depth || s.notes.depth,
            topic: note.topic || '',
            isCloudSaved: true,
            activeView: 'reader',
            error: null,
          },
        })),

      fetchCloudNotesList: async (token) => {
        set((s) => ({ notes: { ...s.notes, isFetchingCloud: true } }))
        try {
          const list = await fetchCloudNotes(token)
          set((s) => ({
            notes: {
              ...s.notes,
              cloudNotes: Array.isArray(list) ? list : [],
              isFetchingCloud: false,
            },
          }))
          return list
        } catch (err) {
          set((s) => ({
            notes: { ...s.notes, isFetchingCloud: false, error: err.message },
          }))
          return []
        }
      },

      saveCurrentNoteToCloud: async (token, customTitle) => {
        const { notes } = get()
        if (!notes.content) return null

        set((s) => ({ notes: { ...s.notes, isSavingCloud: true } }))
        try {
          const titleToSave = (customTitle || notes.title || 'Study Notes').trim()
          let savedNote

          if (notes.id) {
            // Update existing note ("and change that")
            savedNote = await updateCloudNote(
              notes.id,
              {
                title: titleToSave,
                content: notes.content,
                style: notes.style,
                depth: notes.depth,
                topic: notes.topic,
              },
              token
            )
          } else {
            // Save as new note in cloud
            savedNote = await saveCloudNote(
              {
                title: titleToSave,
                content: notes.content,
                style: notes.style,
                depth: notes.depth,
                topic: notes.topic,
              },
              token
            )
          }

          set((s) => {
            const existingIdx = s.notes.cloudNotes.findIndex((n) => n.id === savedNote.id)
            let updatedList
            if (existingIdx >= 0) {
              updatedList = [...s.notes.cloudNotes]
              updatedList[existingIdx] = savedNote
            } else {
              updatedList = [savedNote, ...s.notes.cloudNotes]
            }

            return {
              notes: {
                ...s.notes,
                id: savedNote.id,
                title: savedNote.title,
                content: savedNote.content,
                isCloudSaved: true,
                isSavingCloud: false,
                cloudNotes: updatedList,
                error: null,
              },
            }
          })

          return savedNote
        } catch (err) {
          set((s) => ({
            notes: { ...s.notes, isSavingCloud: false, error: err.message },
          }))
          throw err
        }
      },

      deleteCloudNoteAction: async (noteId, token) => {
        try {
          await deleteCloudNote(noteId, token)
          set((s) => {
            const updated = s.notes.cloudNotes.filter((n) => n.id !== noteId)
            const isCurrentDeleted = s.notes.id === noteId
            return {
              notes: {
                ...s.notes,
                cloudNotes: updated,
                ...(isCurrentDeleted
                  ? { id: null, isCloudSaved: false }
                  : {}),
              },
            }
          })
        } catch (err) {
          set((s) => ({
            notes: { ...s.notes, error: err.message },
          }))
          throw err
        }
      },

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
      chatMessages: initialWs.data?.chatMessages || [],
      setChatMessages: (msgs) => {
        set({ chatMessages: typeof msgs === 'function' ? msgs(get().chatMessages) : msgs })
        get()._persistWorkspace()
      },
      addChatMessage: (msg) => {
        set((s) => ({ chatMessages: [...s.chatMessages, msg] }))
        get()._persistWorkspace()
      },
      clearChatMessages: () => {
        set({ chatMessages: [] })
        get()._persistWorkspace()
      },

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

        const topicDesc = quizTop?.trim() ? `focusing on "${quizTop.trim()}"` : "covering the core concepts and lessons"
        const prompt = `Create a ${quizCount}-question ${quizDiff} ${quizTyp} quiz ${topicDesc} based strictly on the selected study material.
CRITICAL REQUIREMENTS:
- Questions MUST test actual educational concepts, rules, vocabulary, techniques, and lessons taught in the material.
- STRICTLY FORBIDDEN: DO NOT ask meta or bibliographic questions about the document itself (such as author name, book title, publisher, table of contents, or section names).
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

          let finalQuestions = normalized
          if (finalQuestions.length === 0) {
            finalQuestions = getFallbackQuiz(quizTop || (sourceIds && sourceIds[0]))
          }

          set((s) => ({
            quiz: {
              ...s.quiz,
              questions: finalQuestions,
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
CRITICAL REQUIREMENTS:
- Flashcards MUST test actual vocabulary, terms, concepts, definitions, and rules taught in the material.
- STRICTLY FORBIDDEN: DO NOT create flashcards testing document metadata (such as author name, book title, publisher, or table of contents).
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

          let finalCards = normalized
          if (finalCards.length === 0) {
            finalCards = getFallbackFlashcards(fcTopic || (sourceIds && sourceIds[0]))
          }

          set((s) => ({
            flashcards: {
              ...s.flashcards,
              cards: finalCards,
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
Structure the notes with clear markdown headings, bullet points, key definitions, formulas or frameworks, and an executive summary of key exam takeaways.
CRITICAL REQUIREMENTS:
- Focus purely on teaching and explaining the concepts, rules, vocabulary, and knowledge inside the material.
- DO NOT summarize table of contents or include publishing metadata (e.g. author name, publisher, copyright).`

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

          let derivedTitle = nTopic?.trim() ? `${nTopic.trim()} Study Notes` : 'Study Notes'
          const headingMatch = finalStr.match(/^#\s+(.+)$/m)
          if (headingMatch && headingMatch[1].trim()) {
            derivedTitle = headingMatch[1].replace(/\*\*/g, '').trim()
          }

          set((s) => ({
            notes: {
              ...s.notes,
              id: null,
              title: derivedTitle,
              content: finalStr,
              isCloudSaved: false,
              activeView: 'reader',
              error: null,
            },
            isGenerating: { ...s.isGenerating, notes: false },
          }))

          // Auto-save to cloud storage if token available
          if (token) {
            get().saveCurrentNoteToCloud(token, derivedTitle).catch((err) => {
              console.warn('[Workspace] Auto-save note to cloud error:', err)
            })
          }

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
    })
)
