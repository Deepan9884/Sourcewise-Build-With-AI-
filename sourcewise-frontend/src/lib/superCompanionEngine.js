import {
  getStoredEvents,
  addStudentEvent,
  deleteStudentEvent,
  getCategoryStyle
} from './studentEvents';
import { useSourceStore } from '../store/sourceStore';
import { usePlannerStore } from '../store/plannerStore';
import { useAuthStore } from '../store/authStore';

/**
 * Format a Date object to YYYY-MM-DD
 */
function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Smart Natural Language Date Resolver.
 * Understands ISO dates, "today", "tomorrow", "next monday", "Oct 15", "October 20", etc.
 */
export function parseNaturalDate(text, baseDate = new Date()) {
  if (!text || typeof text !== 'string') return toDateStr(baseDate);

  const clean = text.trim().toLowerCase();

  if (clean.includes('today')) return toDateStr(baseDate);
  if (clean.includes('tomorrow') || clean.includes('tmrw')) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + 1);
    return toDateStr(d);
  }
  if (clean.includes('day after tomorrow')) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + 2);
    return toDateStr(d);
  }

  // ISO Match: YYYY-MM-DD
  const isoMatch = text.match(/\b(202\d-[01]\d-[0-3]\d)\b/);
  if (isoMatch) return isoMatch[1];

  // Month Names match: e.g. Oct 15, October 20, 15 Oct, 20th November
  const months = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, sept: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11
  };

  const monthRegex = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(202\d))?\b/i;
  const match = text.match(monthRegex);
  if (match) {
    const mStr = match[1].toLowerCase();
    const day = parseInt(match[2], 10);
    const year = match[3] ? parseInt(match[3], 10) : baseDate.getFullYear();
    const month = months[mStr];
    if (month !== undefined && day >= 1 && day <= 31) {
      const d = new Date(year, month, day);
      return toDateStr(d);
    }
  }

  // Reverse: "15th October 2026"
  const revRegex = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s+(202\d))?\b/i;
  const revMatch = text.match(revRegex);
  if (revMatch) {
    const day = parseInt(revMatch[1], 10);
    const mStr = revMatch[2].toLowerCase();
    const year = revMatch[3] ? parseInt(revMatch[3], 10) : baseDate.getFullYear();
    const month = months[mStr];
    if (month !== undefined && day >= 1 && day <= 31) {
      const d = new Date(year, month, day);
      return toDateStr(d);
    }
  }

  // Default fallback to today's date
  return toDateStr(baseDate);
}

/**
 * Extract Category from user query
 */
export function extractCategory(query) {
  const q = query.toLowerCase();
  if (q.includes('hackathon')) return 'Hackathon';
  if (q.includes('workshop') || q.includes('hands-on') || q.includes('lab')) return 'Workshop';
  if (q.includes('symposium') || q.includes('techveda')) return 'Symposium';
  if (q.includes('conference') || q.includes('summit')) return 'Conference';
  if (q.includes('competition') || q.includes('contest') || q.includes('coding contest')) return 'Competition';
  if (q.includes('paper presentation') || q.includes('presentation')) return 'Paper Presentation';
  if (q.includes('exam') || q.includes('midterm') || q.includes('final exam') || q.includes('test')) return 'Exam';
  if (q.includes('seminar') || q.includes('lecture')) return 'Seminar';
  if (q.includes('webinar')) return 'Webinar';
  if (q.includes('deadline') || q.includes('project due') || q.includes('submission')) return 'Project Deadline';
  return 'Hackathon';
}

/**
 * Extract Clean Title from command
 */
export function extractEventTitle(query, category) {
  // Strip out command prefix
  let cleaned = query
    .replace(/^.*?(?:add|create|schedule|log|put)\s+(?:an?\s+)?(?:event|hackathon|workshop|exam|symposium|deadline)?\s*(?:in|to|on)?\s*(?:the\s+)?(?:calendar|calender)?\s*[:,-]?\s*/i, '')
    .trim();

  // Strip dates from the end or middle
  cleaned = cleaned
    .replace(/\s+(?:on|dated|at|for|starting)?\s+(?:202\d-[01]\d-[0-3]\d|\w+\s+\d{1,2}(?:st|nd|rd|th)?|today|tomorrow|next\s+\w+).*$/i, '')
    .replace(/\s+(?:in|at)\s+(?:auditorium|hall|zoom|google meet|campus|room\s*\d+).*$/i, '')
    .trim();

  if (!cleaned || cleaned.length < 2) {
    return `${category} Session`;
  }
  return cleaned;
}

/**
 * Extract Venue / Location if mentioned
 */
export function extractVenue(query) {
  const match = query.match(/(?:at|in|venue:?)\s+([A-Za-z0-9\s,.-]+?)(?:\s+(?:on|dated|starting|from|mode)|$)/i);
  if (match && match[1]) {
    const v = match[1].trim();
    if (!v.toLowerCase().includes('calendar') && !v.toLowerCase().includes('plan')) {
      return v;
    }
  }
  return '';
}

/**
 * Gathers complete context across all parts of the application.
 */
export function getOmniContext() {
  const events = getStoredEvents();
  const sourceState = useSourceStore.getState();
  const plannerState = usePlannerStore.getState();
  const authState = useAuthStore.getState();

  const allSources = sourceState.uploadedSources || [];
  const activeSourceIds = sourceState.activeSourceIds || [];
  const activeSources = allSources.filter(s => activeSourceIds.includes(s.id));

  const currentPlan = plannerState.currentPlan || null;
  const subjects = plannerState.subjects || [];
  const todaySlots = plannerState.todaySlots || [];
  const pacing = plannerState.pacing || null;

  return {
    events,
    allSources,
    activeSources,
    currentPlan,
    subjects,
    todaySlots,
    pacing,
    user: authState.user
  };
}

/**
 * Super AI Companion Command Processor.
 * Returns { handled: boolean, response: string, actionCard?: object }
 */
export async function processSuperCompanionCommand(query, { navigate, onToast }) {
  const q = query.trim();
  const qLower = q.toLowerCase();
  const omni = getOmniContext();

  // ─────────────────────────────────────────────────────────────
  // 1. ADD EVENT TO CALENDAR
  // ─────────────────────────────────────────────────────────────
  const isAddEvent =
    /\b(add|create|schedule|log|put)\s+(?:an?\s+)?(?:event|hackathon|workshop|exam|symposium|conference|seminar|deadline)\b/i.test(qLower) ||
    /\b(add|schedule)\s+.*?\s+(?:in|to|on)\s+(?:the\s+)?(?:calendar|calender)\b/i.test(qLower);

  if (isAddEvent) {
    const category = extractCategory(q);
    const startDate = parseNaturalDate(q);
    const title = extractEventTitle(q, category);
    const venue = extractVenue(q);
    const mode = qLower.includes('online') || qLower.includes('zoom') ? 'Online' : 'In-Person';

    const newEvent = addStudentEvent({
      title,
      category,
      mode,
      startDate,
      venue: venue || undefined,
      role: 'Participant',
      outcome: 'Scheduled / Upcoming',
      rating: 5,
      projectDescription: `Scheduled autonomously via SourceWise Super AI Companion on ${new Date().toLocaleDateString()}`
    });

    onToast?.(`Scheduled "${title}" on ${startDate}!`);

    const style = getCategoryStyle(category);

    return {
      handled: true,
      role: 'assistant',
      content: `### 📅 Event Added to Your Calendar & Portfolio!

I have scheduled **${title}** and synchronized it across your study workspace:

- 🏷️ **Category:** \`${category}\`
- 📅 **Date:** \`${startDate}\`
${venue ? `- 📍 **Venue / Location:** ${venue}\n` : ''}- 🌐 **Mode:** ${mode}

✨ It is now immediately visible in your **My Plan Calendar**, on your **Weekly Timetable**, and inside your **Events Section**!`,
      actionCard: {
        type: 'EVENT_ADDED',
        event: newEvent,
        style
      }
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 2. DELETE EVENT FROM CALENDAR
  // ─────────────────────────────────────────────────────────────
  const isDeleteEvent = /\b(delete|remove|cancel|drop)\s+(?:the\s+)?(?:event|hackathon|workshop|exam|symposium)\b/i.test(qLower);

  if (isDeleteEvent) {
    const events = omni.events;
    if (events.length === 0) {
      return {
        handled: true,
        role: 'assistant',
        content: `You don't have any events logged in your calendar right now. You can ask me to add one by saying:
*"Add an event: Smart India Hackathon on October 15"*`
      };
    }

    // Try finding the matching event
    let target = null;

    // By ID
    const idMatch = q.match(/evt-\d+/i);
    if (idMatch) {
      target = events.find(e => e.id.toLowerCase() === idMatch[0].toLowerCase());
    }

    // By Title fuzzy match
    if (!target) {
      for (const ev of events) {
        const evWords = ev.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const matches = evWords.some(w => qLower.includes(w));
        if (matches || qLower.includes(ev.title.toLowerCase())) {
          target = ev;
          break;
        }
      }
    }

    // By Category if only 1 exists
    if (!target) {
      const cat = extractCategory(q);
      const catEvents = events.filter(e => e.category === cat);
      if (catEvents.length === 1) {
        target = catEvents[0];
      }
    }

    if (target) {
      deleteStudentEvent(target.id);
      onToast?.(`Deleted event "${target.title}"`);

      return {
        handled: true,
        role: 'assistant',
        content: `### 🗑️ Event Removed

I have deleted **"${target.title}"** from your calendar and portfolio.

- 📅 **Was scheduled for:** \`${target.startDate}\`
- 🏷️ **Category:** \`${target.category}\`

Your **My Plan Calendar** and **Events Section** have been updated in real-time.`,
        actionCard: {
          type: 'EVENT_DELETED',
          event: target
        }
      };
    }

    // If multiple or ambiguous
    return {
      handled: true,
      role: 'assistant',
      content: `I found multiple events in your calendar. Which one would you like me to delete?

${events.map((e, idx) => `${idx + 1}. **${e.title}** (${e.category}, ${e.startDate})`).join('\n')}

Reply with *"Delete event <Event Name>"* to remove it.`
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 3. LIST / QUERY EVENTS
  // ─────────────────────────────────────────────────────────────
  const isListEvents =
    /\b(what|list|show|view|tell me)\s+(?:all\s+)?(?:my\s+)?events\b/i.test(qLower) ||
    /\bwhat(?:'s|\s+is)\s+(?:in|on)\s+(?:my\s+)?calendar\b/i.test(qLower) ||
    /\bcalendar\s+events\b/i.test(qLower);

  if (isListEvents) {
    const events = omni.events;
    if (events.length === 0) {
      return {
        handled: true,
        role: 'assistant',
        content: `### 📅 Calendar & Events
You currently have no events scheduled in your calendar.

Would you like to schedule one? Just tell me:
👉 *"Add an event in the calendar: Smart India Hackathon on October 15"*`
      };
    }

    const items = events.map((e, idx) => {
      const dates = e.endDate && e.endDate !== e.startDate ? `${e.startDate} → ${e.endDate}` : e.startDate;
      return `${idx + 1}. **${e.title}**
   - 🏷️ **Category:** \`${e.category}\`
   - 📅 **Date:** \`${dates}\`
   ${e.venue ? `- 📍 **Venue:** ${e.venue}\n   ` : ''}- 🌐 **Mode:** ${e.mode || 'In-Person'}`;
    }).join('\n\n');

    return {
      handled: true,
      role: 'assistant',
      content: `### 📅 Your Scheduled Events & Milestones (${events.length})

Here are all the events currently in your calendar and portfolio:

${items}

💡 *You can tell me to delete any event (e.g. "Delete event ${events[0].title.slice(0, 20)}...") or add a new one at any time!*`,
      actionCard: {
        type: 'EVENTS_LIST',
        events
      }
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 4. LIST / QUERY SOURCES THROUGHOUT THE APP
  // ─────────────────────────────────────────────────────────────
  const isListSources =
    /\b(what|list|show)\s+(?:are\s+)?(?:all\s+)?(?:my\s+)?sources\b/i.test(qLower) ||
    /\b(what|list|show)\s+(?:are\s+)?(?:all\s+)?(?:my\s+)?documents\b/i.test(qLower) ||
    /\bmy\s+materials\b/i.test(qLower);

  if (isListSources) {
    const sources = omni.allSources;
    if (sources.length === 0) {
      return {
        handled: true,
        role: 'assistant',
        content: `### 📚 Uploaded Sources
You haven't uploaded any documents or sources yet. 

You can drag and drop PDFs, DOCX, or TXT files onto the **Knowledge Hub** or **Sources** page to index them for AI RAG!`
      };
    }

    const items = sources.map((s, idx) => {
      const isActive = omni.activeSources.some(a => a.id === s.id);
      const name = s.name || s.title || `Source ${idx + 1}`;
      const chunks = s.chunks_count || s.chunks?.length || 'Indexed';
      return `${idx + 1}. **${name}** ${isActive ? '🟢 *(Active in Context)*' : '⚪'}
   - Chunks: \`${chunks} chunks\` · Size: \`${s.size ? `${Math.round(s.size / 1024)} KB` : 'Ready'}\`
   - Status: \`${s.status || 'Ready'}\``;
    }).join('\n\n');

    return {
      handled: true,
      role: 'assistant',
      content: `### 📚 Your Sources Library (${sources.length} Documents)

I have full access to all your uploaded documents across the app:

${items}

💡 *Ask me to synthesize, summarize, or extract formulas from any of these documents!*`,
      actionCard: {
        type: 'SOURCES_LIST',
        sources
      }
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 5. LIST / QUERY TODAY'S TASKS & SCHEDULE
  // ─────────────────────────────────────────────────────────────
  const isListTasks =
    /\b(what|list|show)\s+(?:are\s+)?(?:all\s+)?(?:my\s+)?(?:pending\s+)?tasks\b/i.test(qLower) ||
    /\btoday'?s?\s+(?:study\s+)?tasks\b/i.test(qLower) ||
    /\bwhat\s+(?:do|should)\s+i\s+study\s+today\b/i.test(qLower);

  if (isListTasks) {
    const slots = omni.todaySlots;
    const plan = omni.currentPlan;

    if (slots.length === 0) {
      return {
        handled: true,
        role: 'assistant',
        content: `### ⚡ Today's Tasks
You don't have any specific study blocks scheduled for today${plan ? ` in **${plan.plan_name || 'your plan'}**` : ''}.

- 🎯 **Overall Pace:** ${omni.pacing ? `${omni.pacing.pacePct}%` : 'On track'}
- 📚 **Total Subjects:** ${omni.subjects.length}

Would you like to review your flashcards or add an event to your calendar?`
      };
    }

    const items = slots.map((s, idx) => {
      const subName = s.plan_subjects?.subject_name || s.subject_name || 'Study';
      const isDone = s.status === 'completed';
      return `${idx + 1}. ${isDone ? '✅' : '⏳'} **${s.topic || 'Study Block'}**
   - 📖 Subject: \`${subName}\`
   - ⏱️ Duration: \`${s.duration_minutes || 30} mins\` · Status: \`${s.status || 'pending'}\``;
    }).join('\n\n');

    return {
      handled: true,
      role: 'assistant',
      content: `### ⚡ Today's Study Tasks (${slots.length})

Here is your study schedule for today:

${items}

You can ask me to explain any of these topics or test you with quick quiz questions!`,
      actionCard: {
        type: 'TASKS_LIST',
        slots
      }
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 6. APP NAVIGATION COMMANDS
  // ─────────────────────────────────────────────────────────────
  const navMap = [
    { regex: /\b(?:go to|take me to|open|show|navigate to)\s+(?:my\s+)?(?:plan|calendar|timetable)\b/i, path: '/plan', name: 'My Plan & Study Calendar' },
    { regex: /\b(?:go to|take me to|open|show|navigate to)\s+(?:my\s+)?events\b/i, path: '/events', name: 'Events & Extracurricular Portfolio' },
    { regex: /\b(?:go to|take me to|open|show|navigate to)\s+(?:my\s+)?(?:knowledge|sources|documents|hub)\b/i, path: '/knowledge', name: 'Knowledge Hub' },
    { regex: /\b(?:go to|take me to|open|show|navigate to)\s+(?:game\s+)?(?:arena|puzzles|games)\b/i, path: '/puzzles', name: 'Game Arena' },
    { regex: /\b(?:go to|take me to|open|show|navigate to)\s+deepcode\b/i, path: '/deepcode', name: 'DeepCode Compiler' },
    { regex: /\b(?:go to|take me to|open|show|navigate to)\s+settings\b/i, path: '/settings', name: 'Settings' },
    { regex: /\b(?:go to|take me to|open|show|navigate to)\s+dashboard\b/i, path: '/dashboard', name: 'Dashboard' },
    { regex: /\b(?:go to|take me to|open|show|navigate to)\s+workspace\b/i, path: '/workspace', name: 'AI Workspace' },
  ];

  for (const item of navMap) {
    if (item.regex.test(qLower)) {
      if (navigate) {
        navigate(item.path);
      }
      return {
        handled: true,
        role: 'assistant',
        content: `### 🧭 Navigating to ${item.name}

Opening **${item.name}** for you now.

[Click here to view ${item.name} directly](${item.path})`,
        actionCard: {
          type: 'NAVIGATE',
          path: item.path,
          name: item.name
        }
      };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 7. CHECK STREAK & MASTERY
  // ─────────────────────────────────────────────────────────────
  const isStreakCheck = /\b(what|how)\s+(?:is\s+)?(?:my\s+)?(?:streak|progress|mastery)\b/i.test(qLower);
  if (isStreakCheck) {
    return {
      handled: true,
      role: 'assistant',
      content: `### 🔥 Your Current Learning Progress

- 🔥 **Streak:** Active study streak
- 🎯 **Pace:** ${omni.pacing ? `${omni.pacing.pacePct}%` : 'Optimal'}
- 📚 **Active Sources:** ${omni.activeSources.length} of ${omni.allSources.length} selected
- 📅 **Logged Events:** ${omni.events.length} events in calendar
- ⚡ **Tasks Pending Today:** ${omni.todaySlots.filter(s => s.status !== 'completed').length}

Keep up the great momentum! Would you like to review a topic or schedule an upcoming milestone?`
    };
  }

  // Not an explicit single command: let fallback or streaming LLM handle with full omni context
  return { handled: false };
}
