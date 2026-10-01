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
    teamMembers: 'Deepan D. (Lead), Priya K., Arun S.',
    keyLearnings: 'Learned vector similarity retrieval optimization, client-side state hydration, and delivering high-impact pitch decks to industry judges within 3 minutes.',
    skillsGained: ['Generative AI', 'Full-Stack Architecture', 'Pitching', 'Team Leadership'],
    rating: 5,
    certificateUrl: 'https://example.com/certificates/sih-2026-winner.pdf',
    projectRepoUrl: 'https://github.com/sourcewise/sourcewise-ai',
    liveDemoUrl: 'https://sourcewise.dev',
    socialPostUrl: 'https://linkedin.com/in/deepand',
    createdAt: '2026-03-16T10:00:00Z'
  },
  {
    id: 'evt-2',
    title: 'Advanced GenAI & Cloud RAG Workshop',
    category: 'Workshop',
    mode: 'In-Person',
    startDate: '2026-02-20',
    venue: 'Department Seminar Hall 3, Tech Campus',
    organizer: 'Google Developer Groups (GDG) on Campus',
    role: 'Participant',
    outcome: 'Completed & Certified',
    prizeAward: 'Verified Cloud Skill Badge',
    keyLearnings: 'Deep dive into semantic chunking strategies, sentence-transformers, embedding caching, and containerized FastAPI pipelines on Google Cloud Run.',
    techStack: ['Python', 'LangChain', 'Docker', 'Google Cloud Platform'],
    skillsGained: ['Vector Databases', 'Prompt Engineering', 'Cloud Deployment'],
    rating: 5,
    certificateUrl: 'https://example.com/certificates/gdg-genai-badge.pdf',
    createdAt: '2026-02-21T14:30:00Z'
  },
  {
    id: 'evt-3',
    title: 'National Level Tech Symposium: TechVeda 2026',
    category: 'Symposium',
    mode: 'In-Person',
    startDate: '2026-01-28',
    venue: 'Auditorium Block, PSG Tech, Coimbatore',
    organizer: 'Department of Computer Science & Engineering',
    role: 'Solo Contestant',
    outcome: '1st Runner-Up',
    prizeAward: 'Silver Medal & ₹10,000 Merit Award',
    projectName: 'Real-time Autonomous Edge Vision',
    projectDescription: 'Presented low-latency edge AI object detection models compiled for embedded microcontroller systems with sub-15ms inference latency.',
    techStack: ['Python', 'OpenCV', 'TensorFlow Lite', 'Raspberry Pi'],
    keyLearnings: 'Tackled aggressive technical Q&A defense from IEEE reviewers, live hardware sensor debugging under stage lighting, and concise scientific slide design.',
    skillsGained: ['Edge AI', 'Computer Vision', 'Technical Defense', 'Hardware Debugging'],
    rating: 4,
    certificateUrl: 'https://example.com/certificates/techveda-runnerup.pdf',
    projectRepoUrl: 'https://github.com/sourcewise/edge-vision',
    createdAt: '2026-01-29T18:00:00Z'
  }
];

/**
 * Get all stored student events safely from localStorage, falling back to INITIAL_EVENTS.
 */
export function getStoredEvents() {
  if (typeof window === 'undefined') return INITIAL_EVENTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_EVENTS));
      return INITIAL_EVENTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_EVENTS;
  } catch (err) {
    console.warn('[studentEvents] Failed to load events from storage:', err);
    return INITIAL_EVENTS;
  }
}

/**
 * Save events to localStorage and notify all listeners across pages/tabs.
 */
export function setStoredEvents(events) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
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
