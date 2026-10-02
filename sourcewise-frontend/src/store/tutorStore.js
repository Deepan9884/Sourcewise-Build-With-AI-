/**
 * Tutor Store - Manages tutoring sessions, practice, and AI interactions
 */
import { create } from 'zustand';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://node-api-nine-flame.vercel.app';

const useTutorStore = create((set, get) => ({
  // State
  currentSession: null,
  tutoringMode: 'direct', // direct, socratic, exploratory, exam_prep
  explanationHistory: [],
  practiceProblems: [],
  isLoading: false,
  error: null,
  streamingResponse: '',
  isStreaming: false,

  // ── Session Management ──────────────────────────────────────────────────────

  /**
   * Start a new tutoring session
   */
  startSession: async (sourceIds, goals = [], mode = 'direct') => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/tutor/session/start`,
        { sourceIds, goals, mode },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      set({
        currentSession: {
          sessionId: response.data.sessionId,
          sourceIds,
          goals,
          mode,
          startTime: new Date(),
        },
        tutoringMode: mode,
        explanationHistory: [],
        isLoading: false,
      });

      return response.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.error || 'Failed to start session',
        isLoading: false 
      });
      throw error;
    }
  },

  /**
   * End current tutoring session
   */
  endSession: async () => {
    const { currentSession } = get();
    if (!currentSession) return;

    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/tutor/session/end`,
        { sessionId: currentSession.sessionId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      set({
        currentSession: null,
        explanationHistory: [],
        practiceProblems: [],
        isLoading: false,
      });

      return response.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.error || 'Failed to end session',
        isLoading: false 
      });
      throw error;
    }
  },

  /**
   * Ask a question to the AI tutor with SSE streaming
   */
  askQuestion: async (question, sourceIds) => {
    const { currentSession, tutoringMode } = get();
    
    set({ 
      isStreaming: true, 
      streamingResponse: '', 
      error: null 
    });

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/tutor/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          question,
          sourceIds: sourceIds || currentSession?.sourceIds || [],
          mode: tutoringMode,
          sessionId: currentSession?.sessionId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let citations = [];
      let alternatives = [];
      let relatedConcepts = [];
      let practiceSuggestions = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'token') {
                fullResponse += data.data;
                set({ streamingResponse: fullResponse });
              } else if (data.type === 'citations') {
                citations = data.data;
              } else if (data.type === 'alternatives') {
                alternatives = data.data;
              } else if (data.type === 'related') {
                relatedConcepts = data.data;
              } else if (data.type === 'practice') {
                practiceSuggestions = data.data;
              } else if (data.type === 'done') {
                // Stream complete
                const newExplanation = {
                  question,
                  response: fullResponse,
                  citations,
                  alternatives,
                  relatedConcepts,
                  practiceSuggestions,
                  timestamp: new Date(),
                };

                set(state => ({
                  explanationHistory: [...state.explanationHistory, newExplanation],
                  isStreaming: false,
                  streamingResponse: '',
                }));
              } else if (data.type === 'error') {
                throw new Error(data.data);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      set({ 
        error: error.message || 'Failed to get response',
        isStreaming: false,
        streamingResponse: '',
      });
      throw error;
    }
  },

  /**
   * Request alternative explanation for a concept
   */
  requestAlternativeExplanation: async (concept, strategy) => {
    const { currentSession } = get();
    
    const question = `Can you explain "${concept}" using ${strategy} approach?`;
    return get().askQuestion(question, currentSession?.sourceIds);
  },

  /**
   * Set tutoring mode
   */
  setTutoringMode: (mode) => {
    set({ tutoringMode: mode });
  },

  // ── Practice Management ─────────────────────────────────────────────────────

  /**
   * Generate practice question
   */
  generatePractice: async (concept, sourceIds, difficulty = 'medium', type = 'mcq') => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/tutor/practice`,
        { concept, sourceIds, difficulty, type },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const newProblem = {
        ...response.data,
        concept,
        difficulty,
        type,
        generatedAt: new Date(),
      };

      set(state => ({
        practiceProblems: [...state.practiceProblems, newProblem],
        isLoading: false,
      }));

      return newProblem;
    } catch (error) {
      set({ 
        error: error.response?.data?.error || 'Failed to generate practice',
        isLoading: false 
      });
      throw error;
    }
  },

  /**
   * Submit answer to practice question
   */
  submitAnswer: async (attemptId, userAnswer) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/tutor/evaluate`,
        { attemptId, userAnswer },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update practice problem with result
      set(state => ({
        practiceProblems: state.practiceProblems.map(p =>
          p.attemptId === attemptId
            ? { ...p, userAnswer, evaluation: response.data, completed: true }
            : p
        ),
        isLoading: false,
      }));

      return response.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.error || 'Failed to evaluate answer',
        isLoading: false 
      });
      throw error;
    }
  },

  /**
   * Get topic suggestions
   */
  getSuggestedTopics: async () => {
    const { currentSession } = get();
    
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      const params = currentSession?.sessionId 
        ? `?sessionId=${currentSession.sessionId}` 
        : '';
      
      const response = await axios.get(
        `${API_URL}/tutor/suggest-topics${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      set({ isLoading: false });
      return response.data.suggestions;
    } catch (error) {
      set({ 
        error: error.response?.data?.error || 'Failed to get suggestions',
        isLoading: false 
      });
      throw error;
    }
  },

  // ── Utility Actions ─────────────────────────────────────────────────────────

  /**
   * Clear error
   */
  clearError: () => set({ error: null }),

  /**
   * Reset store
   */
  reset: () => set({
    currentSession: null,
    tutoringMode: 'direct',
    explanationHistory: [],
    practiceProblems: [],
    isLoading: false,
    error: null,
    streamingResponse: '',
    isStreaming: false,
  }),
}));

export default useTutorStore;
