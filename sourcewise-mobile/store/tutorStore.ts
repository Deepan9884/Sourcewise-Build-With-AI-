import { create } from 'zustand';
import { API_URL } from '../utils/api';
import { useAuthStore } from './authStore';

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
  citations?: Citation[];
  alternatives?: AlternativeExplanation[];
  relatedConcepts?: RelatedConcept[];
  practiceSuggestions?: PracticeSuggestion[];
  isLoading?: boolean;
}

export interface Citation {
  id: number;
  chunk_id: string;
  source_id: string;
  source_name: string;
  text: string;
  page: number;
}

export interface AlternativeExplanation {
  strategy: string;
  content: string;
  when_to_use: string;
}

export interface RelatedConcept {
  concept: string;
  relationship: string;
  source_ids: string[];
}

export interface PracticeSuggestion {
  concept: string;
  difficulty: number;
  reason: string;
}

export interface PracticeAttempt {
  attemptId: string;
  question: string;
  options?: string[];
  keyPoints?: string[];
  type: 'mcq' | 'short_answer' | 'application';
  concept: string;
  sourceIds: string[];
}

export interface EvaluationResult {
  is_correct: boolean;
  score: number;
  feedback: string;
  correct_answer_explanation: string;
  strengths: string[];
  areas_for_improvement: string[];
  related_concepts: string[];
  suggested_review: string[];
}

export type TutoringMode = 'direct' | 'socratic' | 'exploratory' | 'exam_prep';

interface TutorState {
  messages: Message[];
  currentSessionId: string | null;
  currentMode: TutoringMode;
  isStreaming: boolean;
  streamingText: string;
  currentCitations: Citation[];
  currentAlternatives: AlternativeExplanation[];
  currentRelatedConcepts: RelatedConcept[];
  currentPracticeSuggestions: PracticeSuggestion[];
  selectedSourceIds: string[];
  sessionActive: boolean;

  addMessage: (message: Message) => void;
  setStreaming: (isStreaming: boolean) => void;
  setStreamingText: (text: string) => void;
  setCurrentCitations: (citations: Citation[]) => void;
  setCurrentAlternatives: (alternatives: AlternativeExplanation[]) => void;
  setCurrentRelatedConcepts: (concepts: RelatedConcept[]) => void;
  setCurrentPracticeSuggestions: (suggestions: PracticeSuggestion[]) => void;
  setCurrentMode: (mode: TutoringMode) => void;
  setSelectedSourceIds: (ids: string[]) => void;
  startSession: (sourceIds: string[], mode?: TutoringMode) => Promise<void>;
  endSession: () => Promise<void>;
  sendMessage: (text: string, authToken: string) => Promise<void>;
  clearMessages: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

export const useTutorStore = create<TutorState>((set, get) => ({
  messages: [],
  currentSessionId: null,
  currentMode: 'direct',
  isStreaming: false,
  streamingText: '',
  currentCitations: [],
  currentAlternatives: [],
  currentRelatedConcepts: [],
  currentPracticeSuggestions: [],
  selectedSourceIds: [],
  sessionActive: false,

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  setStreaming: (isStreaming) => set({ isStreaming }),

  setStreamingText: (streamingText) => set({ streamingText }),

  setCurrentCitations: (citations) => set({ currentCitations: citations }),

  setCurrentAlternatives: (alternatives) => set({ currentAlternatives: alternatives }),

  setCurrentRelatedConcepts: (concepts) => set({ currentRelatedConcepts: concepts }),

  setCurrentPracticeSuggestions: (suggestions) => set({ currentPracticeSuggestions: suggestions }),

  setCurrentMode: (mode) => set({ currentMode: mode }),

  setSelectedSourceIds: (ids) => set({ selectedSourceIds: ids }),

  clearMessages: () => set({ messages: [] }),

  startSession: async (sourceIds, mode = 'direct') => {
    try {
      const { token } = useAuthStore.getState();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${API_URL}/tutor/session/start`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ sourceIds, mode }),
      });

      if (response.ok) {
        const data = await response.json();
        set({
          currentSessionId: data.sessionId,
          selectedSourceIds: sourceIds,
          currentMode: mode,
          sessionActive: true,
          messages: [],
        });
      }
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  },

  endSession: async () => {
    const { currentSessionId } = get();
    if (!currentSessionId) return;

    try {
      const { token } = useAuthStore.getState();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch(`${API_URL}/tutor/session/end`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ sessionId: currentSessionId }),
      });

      set({
        currentSessionId: null,
        sessionActive: false,
        messages: [],
        currentCitations: [],
        currentAlternatives: [],
        currentRelatedConcepts: [],
        currentPracticeSuggestions: [],
      });
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  },

  sendMessage: async (text, authToken) => {
    const { currentSessionId, selectedSourceIds, currentMode, messages } = get();

    // Add user message
    const userMessage: Message = {
      id: generateId(),
      text,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };
    get().addMessage(userMessage);

    // Add loading AI message
    const aiMessageId = generateId();
    const aiMessage: Message = {
      id: aiMessageId,
      text: '',
      sender: 'ai',
      timestamp: new Date().toISOString(),
      isLoading: true,
    };
    get().addMessage(aiMessage);

    // Start streaming
    set({ isStreaming: true, streamingText: '' });

    try {
      // Build history from messages
      const history = messages.map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const response = await fetch(`${API_URL}/tutor/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          question: text,
          sourceIds: selectedSourceIds,
          mode: currentMode,
          sessionId: currentSessionId,
          history,
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      // Read SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              try {
                const parsed = JSON.parse(data);

                switch (parsed.type) {
                  case 'citations':
                    set({ currentCitations: parsed.data });
                    break;
                  case 'synthesis':
                    // Handle synthesis metadata
                    break;
                  case 'token':
                    fullText += parsed.data;
                    set({ streamingText: fullText });
                    // Update the AI message in real-time
                    set((state) => ({
                      messages: state.messages.map((m) =>
                        m.id === aiMessageId ? { ...m, text: fullText, isLoading: false } : m
                      ),
                    }));
                    break;
                  case 'alternatives':
                    set({ currentAlternatives: parsed.data });
                    break;
                  case 'related':
                    set({ currentRelatedConcepts: parsed.data });
                    break;
                  case 'practice':
                    set({ currentPracticeSuggestions: parsed.data });
                    break;
                  case 'error':
                    console.error('Stream error:', parsed.data);
                    break;
                }
              } catch (e) {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        }
      }

      // Finalize the message
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === aiMessageId
            ? {
                ...m,
                text: fullText || 'I could not generate a response. Please try again.',
                isLoading: false,
              }
            : m
        ),
      }));
    } catch (error) {
      console.error('Failed to send message:', error);
      // Update AI message with error
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === aiMessageId
            ? { ...m, text: 'Sorry, something went wrong. Please try again.', isLoading: false }
            : m
        ),
      }));
    } finally {
      set({ isStreaming: false, streamingText: '' });
    }
  },
}));
