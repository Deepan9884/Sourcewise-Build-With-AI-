import { useState, useEffect, useCallback } from 'react';

export const STORAGE_KEY = 'sourcewise_student_events';
export const EVENTS_CHANGED_EVENT = 'sourcewise:student-events-changed';

export const CATEGORIES = [
  'Hackathon',
  'Workshop',
  'Symposium',
  'Conference',
  'Competition',
  'Paper Presentation',
  'Exam',
  'Seminar',
  'Webinar',
  'Project Deadline',
  'Other'
];

export const INITIAL_EVENTS = [
  {
    id: 'evt-oct-hackathon',
    title: 'SourceWise AI Hackathon - Final Evaluation & Judging',
    category: 'Hackathon',
    mode: 'Hybrid',
    startDate: '2026-10-02',
    endDate: '2026-10-03',
    venue: 'Main Innovation Arena / Virtual Demo',
    organizer: 'Google Cloud & AI Study Alliance',
    role: 'Lead Architect',
    outcome: 'Grand Finalist',
    prizeAward: 'Hackathon Excellence Trophy + Cloud Grants',
    projectName: 'SourceWise AI Study Copilot',
    projectDescription: 'Architected an autonomous AI study planner and multi-modal knowledge synthesis engine for undergraduate engineering students.',
    techStack: ['React 19', 'FastAPI', 'ChromaDB', 'Gemini AI', 'TailwindCSS'],
    teamMembers: 'Alex Morgan (Lead), Priya K., Arun S.',
    keyLearnings: 'Optimized RAG vector retrieval, client-side state hydration, and adaptive mood study scheduling.',
    skillsGained: ['Generative AI', 'Full-Stack Architecture', 'Pitching', 'Team Leadership'],
    rating: 5,
    certificateUrl: 'https://example.com/certificates/sih-2026-winner.pdf',
    projectRepoUrl: 'https://github.com/sourcewise/sourcewise-ai',
    liveDemoUrl: 'https://sourcewise.dev',
    socialPostUrl: 'https://linkedin.com/in/alexmorgan',
    createdAt: '2026-10-01T10:00:00Z'
  },
  {
    id: 'evt-oct-workshop',
    title: 'Google Cloud GenAI Builders Workshop',
    category: 'Workshop',
    mode: 'In-Person',
    startDate: '2026-10-06',
    endDate: '2026-10-06',
    venue: 'Google Developer Space & Campus Hall 2',
    organizer: 'Google Cloud Team',
    role: 'Participant',
    outcome: 'Completed & Certified',
    prizeAward: 'Verified GenAI Cloud Badge',
    keyLearnings: 'Deep dive into semantic chunking strategies, sentence-transformers, embedding caching, and containerized FastAPI pipelines on Google Cloud Run.',
    techStack: ['Python', 'LangChain', 'Docker', 'Google Cloud Platform'],
    skillsGained: ['Vector Databases', 'Prompt Engineering', 'Cloud Deployment'],
    rating: 5,
    createdAt: '2026-10-01T14:30:00Z'
  },
  {
    id: 'evt-oct-midterm',
    title: 'Linear Algebra & Spectral Theory Midterm Examination',
    category: 'Exam',
    mode: 'In-Person',
    startDate: '2026-10-12',
    endDate: '2026-10-12',
    venue: 'Hall 4B, Mathematics Department',
    organizer: 'Department of Mathematics',
    role: 'Student',
    outcome: 'Scheduled Midterm',
    skillsGained: ['Eigenvalues', 'Spectral Theorem', 'Linear Maps'],
    rating: 5,
    createdAt: '2026-10-01T09:00:00Z'
  },
  {
    id: 'evt-oct-symp',
    title: 'IEEE International Cloud & Distributed Systems Symposium',
    category: 'Symposium',
    mode: 'In-Person',
    startDate: '2026-10-16',
    endDate: '2026-10-17',
    venue: 'Convention Center, Anna University',
    organizer: 'IEEE Computer Society',
    role: 'Attendee & Presenter',
    outcome: 'Paper Accepted',
    prizeAward: 'Best Student Paper Honorable Mention',
    projectName: 'High-Throughput Vector Indexing for RAG',
    techStack: ['ChromaDB', 'Python', 'FastAPI'],
    skillsGained: ['Distributed Systems', 'Vector Search', 'Technical Defense'],
    rating: 5,
    createdAt: '2026-10-01T12:00:00Z'
  },
  {
    id: 'evt-oct-comp',
    title: 'ACM ICPC Regional Algorithm Contest',
    category: 'Competition',
    mode: 'In-Person',
    startDate: '2026-10-20',
    endDate: '2026-10-20',
    venue: 'Computing Complex, Tech Campus',
    organizer: 'ACM Student Chapter',
    role: 'Contestant',
    outcome: 'Regional Rank #4',
    prizeAward: 'Certificate of Distinction',
    skillsGained: ['Dynamic Programming', 'Graph Theory', 'Speed Coding'],
    rating: 5,
    createdAt: '2026-10-01T08:00:00Z'
  },
  {
    id: 'evt-oct-dsa',
    title: 'CLRS Advanced Data Structures & Algorithms Lab Exam',
    category: 'Exam',
    mode: 'In-Person',
    startDate: '2026-10-22',
    endDate: '2026-10-22',
    venue: 'Computing Lab 3',
    organizer: 'School of Computer Science',
    role: 'Student',
    outcome: 'Final Lab Exam',
    skillsGained: ['Red-Black Trees', 'Graph Traversal', 'DP Optimization'],
    rating: 5,
    createdAt: '2026-10-01T11:00:00Z'
  },
  {
    id: 'evt-oct-webinar',
    title: 'Transformer Architecture & LLM Alignment Masterclass',
    category: 'Webinar',
    mode: 'Virtual',
    startDate: '2026-10-26',
    endDate: '2026-10-26',
    venue: 'Live Stream / Google Meet',
    organizer: 'DeepLearning.AI',
    role: 'Attendee',
    outcome: 'Completed Masterclass',
    skillsGained: ['RLHF', 'Attention Mechanisms', 'Quantization'],
    rating: 5,
    createdAt: '2026-10-01T16:00:00Z'
  },
  {
    id: 'evt-oct-ml-final',
    title: 'Stanford CS229 Machine Learning Comprehensive Final',
    category: 'Exam',
    mode: 'In-Person',
    startDate: '2026-10-30',
    endDate: '2026-10-30',
    venue: 'Main Examination Hall A',
    organizer: 'Stanford Online / Academic Council',
    role: 'Student',
    outcome: 'Final Exam',
    skillsGained: ['Supervised Learning', 'Neural Networks', 'SVMs', 'PCA'],
    rating: 5,
    createdAt: '2026-10-01T09:30:00Z'
  },
  {
    id: 'evt-1',
    title: 'Smart India Hackathon 2026 - Regional Finals',
    category: 'Hackathon',
    mode: 'In-Person',
    startDate: '2026-03-14',
    endDate: '2026-03-15',
    venue: 'Convention Center, Anna University, Chennai',
    organizer: 'Ministry of Education Innovation Cell & IEEE',
    role: 'Team Lead',
    outcome: 'Winner (1st Place)',
    prizeAward: '1st Prize Trophy + ₹25,000 Cash Grant',
    projectName: 'SourceWise AI Study Copilot',
    projectDescription: 'Architected an autonomous AI study planner and multi-modal knowledge synthesis engine for undergraduate engineering students.',
    techStack: ['React 19', 'FastAPI', 'ChromaDB', 'Gemini AI', 'TailwindCSS'],
    teamMembers: 'Alex Morgan (Lead), Priya K., Arun S.',
    keyLearnings: 'Learned vector similarity retrieval optimization, client-side state hydration, and delivering high-impact pitch decks to industry judges within 3 minutes.',
    skillsGained: ['Generative AI', 'Full-Stack Architecture', 'Pitching', 'Team Leadership'],
    rating: 5,
    certificateUrl: 'https://example.com/certificates/sih-2026-winner.pdf',
    projectRepoUrl: 'https://github.com/sourcewise/sourcewise-ai',
    liveDemoUrl: 'https://sourcewise.dev',
    socialPostUrl: 'https://linkedin.com/in/alexmorgan',
    createdAt: '2026-03-16T10:00:00Z'
  }
];

/**
 * Helper to check if current logged-in user is the dedicated hackathon demo account.
 */
export function isCurrentDemoUser() {
  try {
    const raw = localStorage.getItem('sourcewise-auth');
    if (!raw) return false;
    const auth = JSON.parse(raw);
    const email = auth?.state?.user?.email?.toLowerCase().trim();
    return email === 'demo@gmail.com';
  } catch {
    return false;
  }
}

/**
 * Returns user-specific localStorage key to prevent cross-account event leaks.
 */
export function getUserEventKey() {
  try {
    const raw = localStorage.getItem('sourcewise-auth');
    if (!raw) return 'sourcewise_student_events_guest';
    const auth = JSON.parse(raw);
    const user = auth?.state?.user;
    if (user?.email?.toLowerCase().trim() === 'demo@gmail.com') {
      return 'sourcewise_student_events_demo';
    }
    const uid = user?.id || user?.userId || user?._id || (user?.email ? user.email.toLowerCase().trim() : 'guest');
    return `sourcewise_student_events_${uid}`;
  } catch {
    return 'sourcewise_student_events_guest';
  }
}

/**
 * Get all stored student events safely from localStorage.
 * STRICT ISOLATION: INITIAL_EVENTS is ONLY loaded for demo@gmail.com.
 * All other user emails start with an empty event list [].
 */
export function getStoredEvents() {
  const isDemo = isCurrentDemoUser();
  if (typeof window === 'undefined') return isDemo ? INITIAL_EVENTS : [];
  const key = getUserEventKey();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      const initial = isDemo ? INITIAL_EVENTS : [];
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : (isDemo ? INITIAL_EVENTS : []);
    if (isDemo) {
      // Auto-merge new October 2026 initial events ONLY for demo@gmail.com
      const existingIds = new Set(list.map(e => e.id));
      const missing = INITIAL_EVENTS.filter(e => !existingIds.has(e.id));
      if (missing.length > 0) {
        const merged = [...missing, ...list];
        localStorage.setItem(key, JSON.stringify(merged));
        return merged;
      }
    }
    return list;
  } catch (err) {
    console.warn('[studentEvents] Failed to load events from storage:', err);
    return isDemo ? INITIAL_EVENTS : [];
  }
}

/**
 * Save events to user-scoped localStorage and notify all listeners across pages/tabs.
 */
export function setStoredEvents(events) {
  if (typeof window === 'undefined') return;
  const key = getUserEventKey();
  try {
    localStorage.setItem(key, JSON.stringify(events));
  } catch (err) {
    console.error('[studentEvents] Failed to save events:', err);
  }
  // Dispatch custom event for same-window reactive updates
  window.dispatchEvent(new CustomEvent(EVENTS_CHANGED_EVENT, { detail: events }));
  // Also dispatch storage event for consistency
  try {
    window.dispatchEvent(new Event('storage'));
  } catch {
    // Ignore in older environments
  }
}

/**
 * Add a new event to student events list.
 */
export function addStudentEvent(newEvent) {
  const current = getStoredEvents();
  const event = {
    ...newEvent,
    id: newEvent.id || `evt-${Date.now()}`,
    createdAt: newEvent.createdAt || new Date().toISOString()
  };
  const updated = [event, ...current];
  setStoredEvents(updated);
  return event;
}

/**
 * Delete an event by ID from student events list.
 */
export function deleteStudentEvent(id) {
  const current = getStoredEvents();
  const updated = current.filter(e => e.id !== id);
  setStoredEvents(updated);
  return updated;
}

/**
 * Update an existing event by ID.
 */
export function updateStudentEvent(id, updatedData) {
  const current = getStoredEvents();
  const updated = current.map(e => e.id === id ? { ...e, ...updatedData, updatedAt: new Date().toISOString() } : e);
  setStoredEvents(updated);
  return updated;
}

/**
 * Category styling colors for UI consistency across Calendar and Event pages.
 */
export const EVENT_CATEGORY_STYLES = {
  Hackathon: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    dot: '#10B981',
    badge: 'bg-emerald-100 text-emerald-800'
  },
  Workshop: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-700',
    dot: '#6366F1',
    badge: 'bg-indigo-100 text-indigo-800'
  },
  Symposium: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    dot: '#F59E0B',
    badge: 'bg-amber-100 text-amber-800'
  },
  Conference: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    dot: '#3B82F6',
    badge: 'bg-blue-100 text-blue-800'
  },
  Competition: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-700',
    dot: '#F43F5E',
    badge: 'bg-rose-100 text-rose-800'
  },
  'Paper Presentation': {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    dot: '#8B5CF6',
    badge: 'bg-purple-100 text-purple-800'
  },
  Exam: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    dot: '#EF4444',
    badge: 'bg-red-100 text-red-800'
  },
  Seminar: {
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
    text: 'text-cyan-700',
    dot: '#06B6D4',
    badge: 'bg-cyan-100 text-cyan-800'
  },
  Webinar: {
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    text: 'text-sky-700',
    dot: '#0EA5E9',
    badge: 'bg-sky-100 text-sky-800'
  },
  'Project Deadline': {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    dot: '#F97316',
    badge: 'bg-orange-100 text-orange-800'
  },
  Other: {
    bg: 'bg-stone-50',
    border: 'border-stone-200',
    text: 'text-stone-700',
    dot: '#78716C',
    badge: 'bg-stone-100 text-stone-800'
  }
};

export function getCategoryStyle(category) {
  return EVENT_CATEGORY_STYLES[category] || EVENT_CATEGORY_STYLES.Other;
}

/**
 * Custom React hook that subscribes to student events with real-time sync.
 */
export function useStudentEvents() {
  const [events, setEvents] = useState(() => getStoredEvents());

  useEffect(() => {
    const handleEventsChanged = (e) => {
      if (e.detail && Array.isArray(e.detail)) {
        setEvents(e.detail);
      } else {
        setEvents(getStoredEvents());
      }
    };

    const handleStorage = (e) => {
      if (!e.key || e.key === STORAGE_KEY) {
        setEvents(getStoredEvents());
      }
    };

    window.addEventListener(EVENTS_CHANGED_EVENT, handleEventsChanged);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(EVENTS_CHANGED_EVENT, handleEventsChanged);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const addEvent = useCallback((eventData) => {
    return addStudentEvent(eventData);
  }, []);

  const deleteEvent = useCallback((id) => {
    return deleteStudentEvent(id);
  }, []);

  const updateEvent = useCallback((id, data) => {
    return updateStudentEvent(id, data);
  }, []);

  const setAllEvents = useCallback((newEvents) => {
    setStoredEvents(newEvents);
  }, []);

  return {
    events,
    addEvent,
    deleteEvent,
    updateEvent,
    setAllEvents
  };
}
