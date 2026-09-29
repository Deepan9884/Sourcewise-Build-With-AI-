import { create } from 'zustand';
import { API_URL } from '../utils/api';

export interface ConceptMastery {
  concept: string;
  level: 'novice' | 'developing' | 'proficient' | 'mastery';
  assessmentCount: number;
  accuracy: number;
}

export interface KnowledgeGap {
  concept: string;
  severity: number;
  identifiedAt: string;
}

export interface StudyPattern {
  dayOfWeek: number;
  hourOfDay: number;
  effectivenessScore: number;
}

export interface LearningProfile {
  conceptMastery: ConceptMastery[];
  knowledgeGaps: KnowledgeGap[];
  preferences: {
    tutoringMode: string;
    explanationVerbosity: string;
    preferredExplanationStyles: string[];
  };
  studyPatterns: {
    optimalStudyTimes: StudyPattern[];
    averageSessionLength: number;
    totalStudyTime: number;
    sessionsCompleted: number;
    currentStreak: number;
    longestStreak: number;
  };
  currentGoals: {
    description: string;
    progress: number;
    status: string;
  }[];
}

export interface WeeklyReport {
  totalMinutesStudied: number;
  sessionsCompleted: number;
  conceptsStudied: number;
  conceptsMastered: number;
  practiceAccuracy: number;
  insights: { type: string; message: string }[];
}

export interface KnowledgeMap {
  concepts: {
    id: string;
    name: string;
    level: string;
    description: string;
  }[];
  relationships: {
    from: string;
    to: string;
    type: string;
  }[];
}

interface AnalyticsState {
  learningProfile: LearningProfile | null;
  knowledgeMap: KnowledgeMap | null;
  weeklyReport: WeeklyReport | null;
  isLoading: boolean;

  fetchLearningProfile: (authToken: string) => Promise<void>;
  fetchKnowledgeMap: (authToken: string) => Promise<void>;
  fetchWeeklyReport: (authToken: string) => Promise<void>;
  fetchAll: (authToken: string) => Promise<void>;
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  learningProfile: null,
  knowledgeMap: null,
  weeklyReport: null,
  isLoading: false,

  fetchLearningProfile: async (authToken) => {
    try {
      set({ isLoading: true });
      const response = await fetch(`${API_URL}/learning-profile/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        set({ learningProfile: data });
      }
    } catch (error) {
      console.error('Failed to fetch learning profile:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchKnowledgeMap: async (authToken) => {
    try {
      const response = await fetch(`${API_URL}/learning-profile/me/knowledge-map`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        set({ knowledgeMap: data });
      }
    } catch (error) {
      console.error('Failed to fetch knowledge map:', error);
    }
  },

  fetchWeeklyReport: async (authToken) => {
    try {
      const response = await fetch(`${API_URL}/analytics/recommendations/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        set({ weeklyReport: data });
      }
    } catch (error) {
      console.error('Failed to fetch weekly report:', error);
    }
  },

  fetchAll: async (authToken) => {
    set({ isLoading: true });
    await Promise.all([
      useAnalyticsStore.getState().fetchLearningProfile(authToken),
      useAnalyticsStore.getState().fetchKnowledgeMap(authToken),
      useAnalyticsStore.getState().fetchWeeklyReport(authToken),
    ]);
    set({ isLoading: false });
  },
}));
