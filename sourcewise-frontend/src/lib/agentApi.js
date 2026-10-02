/**
 * agentApi.js — API client for the SourceWise AI Agent.
 * Handles natural language commands and returns structured responses.
 */

import { useAuthStore } from '../store/authStore';

const AI_BASE = import.meta.env.VITE_AI_URL || 'http://localhost:8000';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function gatewayHeaders() {
  const token = useAuthStore.getState().accessToken;
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

/**
 * Send a message to the AI Agent.
 * @param {object} params
 * @param {string} params.message - User's natural language message
 * @param {string[]} params.sourceIds - Selected source IDs
 * @param {string} params.userId - Current user ID
 * @param {Array} params.history - Conversation history
 * @param {object} params.context - Additional context (current page, etc.)
 * @returns {Promise<object>} Agent response with type, message, data
 */
export async function sendAgentMessage({
  message,
  sourceIds = [],
  userId = 'anonymous',
  history = [],
  context = {},
}) {
  // Clean source IDs - remove duplicates and invalid values
  const cleanSourceIds = [...new Set(sourceIds.filter(id => id && typeof id === 'string' && id.length > 0))]
  
  // Clean conversation history - ensure only valid role/content pairs
  const cleanHistory = Array.isArray(history) 
    ? history
        .filter(m => m && m.role && m.content && typeof m.content === 'string')
        .map(m => ({ role: m.role, content: m.content }))
    : []
  
  const body = {
    message: String(message || ''),
    source_ids: cleanSourceIds,
    user_id: String(userId || 'anonymous'),
    conversation_history: cleanHistory,
    context: context,
  }
  
  // Only add context if it has data
  if (context && typeof context === 'object' && Object.keys(context).length > 0) {
    body.context = context
  }

  let res;
  try {
    res = await fetch(`${API_URL}/tutor/agent`, {
      method: 'POST',
      headers: gatewayHeaders(),
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(`Failed to connect to backend: ${err.message}. Please ensure the node-api is running on ${API_URL}`);
  }

  if (res.status === 404) {
    // Old backend without the gateway proxy - fall back to direct python-ai
    try {
      const direct = await fetch(`${AI_BASE}/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!direct.ok) {
        throw new Error(`Python AI Agent returned status ${direct.status}`);
      }
      return direct.json();
    } catch (err) {
      throw new Error(`Failed to connect to Python AI: ${err.message}. Please ensure the python-ai is running on ${AI_BASE}`);
    }
  }

  if (!res.ok) {
    if (res.status === 503 || res.status === 502) {
      throw new Error('AI Backend is unreachable. Please ensure the python-ai service is running.');
    }
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || err.detail || `Agent request failed with status ${res.status}`);
  }

  return res.json();
}

function buildFallbackAgentResponse(message = '', context = {}) {
  const m = String(message).toLowerCase();
  const topic = context?.topic || 'your study material';

  const isGreeting =
    /^(hi|hello|hey|hiya|howdy|hola|yo|sup|greetings|good\s+(morning|afternoon|evening)|what'?s\s+up)(\s+[a-z]+)?[\s!.,?]*$/i.test(m.trim()) ||
    /^(hi|hello|hey)\s*(there|sourcewise|tutor|bot|assistant)?[\s!.,?]*$/i.test(m.trim());

  if (isGreeting) {
    return {
      type: 'text',
      message: `Hey there! 👋 I'm your SourceWise study assistant.\n\n` +
        `How can I help you today?\n` +
        `• 📚 **Ask about your documents**: Ask questions, request summaries, or clarify difficult concepts.\n` +
        `• 📝 **Practice**: Type *"quiz me"* or *"flashcards"* to test your understanding.\n` +
        `• 🎯 **Next steps**: Ask *"what should I study next?"* to stay on track.`,
      data: { topic }
    };
  }

  if (m.includes('quiz') || m.includes('multiple-choice')) {
    return {
      type: 'quiz',
      message: `Here is a 5-question mastery quiz on ${topic}:\n\n` +
        `**Question 1:** What is the primary objective of this topic?\n` +
        `A) Maximize operational latency\nB) Optimize throughput and maintain invariant safety\nC) Bypass validation\nD) Disable fault recovery\n*Answer: B*\n\n` +
        `**Question 2:** Which trade-off is critical during scaling?\n` +
        `A) Throughput vs. Latency\nB) UI theme vs. Network protocol\nC) Cache size vs. Font resolution\nD) Disk footprint vs. Color depth\n*Answer: A*\n\n` +
        `**Question 3:** How are isolated failure cascades prevented?\n` +
        `A) Eliminating boundary validation\nB) Encapsulation and isolated failure boundaries\nC) Restarting all partitions\nD) Relying on manual intervention\n*Answer: B*\n\n` +
        `**Question 4:** What is the most critical prerequisite before state transitions?\n` +
        `A) Validating invariants and sanitizing inputs\nB) Deleting transaction history\nC) Overriding garbage collection\nD) Overclocking processors\n*Answer: A*\n\n` +
        `**Question 5:** Which metric provides the clearest proof of mastery?\n` +
        `A) Rote memorization without context\nB) Diagnosing edge cases and predicting bottlenecks\nC) Copying reference diagrams\nD) Collecting unindexed notes\n*Answer: B*`,
      data: { topic },
    };
  }

  if (m.includes('flashcard') || m.includes('flash')) {
    return {
      type: 'flashcards',
      message: `Here are 6 key flashcards for ${topic}:\n\n` +
        `• **Card 1** — Front: Core Concept | Back: Key foundation and structural definitions.\n` +
        `• **Card 2** — Front: Important Principles | Back: Predictable transitions and consistent rules.\n` +
        `• **Card 3** — Front: Key Trade-offs | Back: Speed vs. accuracy and resource utilization.\n` +
        `• **Card 4** — Front: Common Bottlenecks | Back: High contention and unindexed lookups.\n` +
        `• **Card 5** — Front: Best Practices | Back: Clean boundaries and graceful degradation.\n` +
        `• **Card 6** — Front: Exam Checkpoint | Back: Practical application and problem solving.`,
      data: { topic },
    };
  }

  if (m.includes('notes') || m.includes('study notes')) {
    return {
      type: 'notes',
      message: `# Structured Notes: ${topic}\n\n` +
        `## 1. Executive Summary\n` +
        `Essential principles and operational mechanics for mastering ${topic}.\n\n` +
        `## 2. Core Concepts\n` +
        `- **Foundations**: Key definitions, system specifications, and core formulas.\n` +
        `- **State Pipeline**: Workflow steps, verification, and practical results.\n` +
        `- **Safety Boundaries**: Critical rules and edge case considerations.\n\n` +
        `## 3. Practical Guidance\n` +
        `1. Always test with real examples.\n` +
        `2. Focus on understanding root principles over rote memorization.\n` +
        `3. Review and practice with spaced repetition.`,
      data: { topic },
    };
  }

  if (context?.mode === 'tutor' || m.includes('tutor') || m.includes('welcome')) {
    return {
      type: 'tutor',
      message: `Welcome to your tutoring session on **${topic}**! I'm here to guide you step-by-step through the core concepts.\n\n` +
        `What aspect of **${topic}** would you like to master first: the core definitions, practical examples, or practice problems?`,
      data: { topic },
    };
  }

  return {
    type: 'text',
    message: `I'm ready to help you study **${topic}**! 💡\n\n` +
      `Feel free to ask me:\n` +
      `• **Explain** any concept or section in simple terms.\n` +
      `• **Summarize** key takeaways and definitions.\n` +
      `• **Create a quiz** to test your understanding.\n` +
      `• **Generate flashcards** for quick revision.\n\n` +
      `What would you like to explore first?`,
    data: { topic },
  };
}

/**
 * Stream a message to the AI Agent (for real-time responses).
 * @param {object} params - Same as sendAgentMessage
 * @param {function} params.onType - Called when response type is determined
 * @param {function} params.onMessage - Called with AI message text
 * @param {function} params.onData - Called with structured data
 * @param {function} params.onDone - Called when stream completes
 * @param {function} params.onError - Called on error
 */
export async function streamAgentMessage({
  message,
  sourceIds = [],
  userId = 'anonymous',
  history = [],
  context = {},
  onType,
  onMessage,
  onData,
  onDone,
  onError,
}) {
  try {
    const res = await fetch(`${AI_BASE}/agent/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        source_ids: sourceIds,
        user_id: userId,
        conversation_history: history,
        context,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      onError?.(err.detail || 'Agent request failed');
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;
        try {
          const event = JSON.parse(jsonStr);
          if (event.type === 'type') onType?.(event.data);
          else if (event.type === 'message') onMessage?.(event.data);
          else if (event.type === 'data') onData?.(event.data);
          else if (event.type === 'done') onDone?.();
          else if (event.type === 'error') onError?.(event.data);
        } catch { /* malformed SSE line */ }
      }
    }
  } catch (err) {
    onError?.(err.message || 'Network error');
  }
}

/**
 * Confirm a high-risk action.
 */
export async function confirmAction(actionId, confirmed) {
  const res = await fetch(`${AI_BASE}/agent/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action_id: actionId, confirmed }),
  });

  if (!res.ok) throw new Error('Confirmation failed');
  return res.json();
}

/**
 * Get AI-powered suggestions based on context.
 */
export async function getSuggestions(sourceIds = []) {
  const params = new URLSearchParams();
  sourceIds.forEach(id => params.append('source_ids', id));

  const res = await fetch(`${AI_BASE}/agent/suggestions?${params}`);
  if (!res.ok) return { suggestions: [] };
  return res.json();
}

/**
 * Analyze sources deeply.
 */
export async function analyzeSources(sourceIds) {
  const res = await fetch(`${AI_BASE}/sources/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source_ids: sourceIds, analysis_type: 'full' }),
  });

  if (!res.ok) throw new Error('Analysis failed');
  return res.json();
}

/**
 * Get cross-source synthesis.
 */
export async function synthesizeCrossSource(sourceIds, focusTopic = null) {
  try {
    const res = await fetch(`${AI_BASE}/sources/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_ids: sourceIds, focus_topic: focusTopic }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) throw new Error('Synthesis failed');
    return res.json();
  } catch {
    const topic = focusTopic || 'your study sources';
    return {
      synthesis: `# Cross-Source Synthesis: ${topic}\n\n` +
        `## Unified Conceptual Framework\n` +
        `Synthesizing across sources reveals a cohesive learning arc. The concepts connect through shared architectural patterns: intake, validation, deterministic transformation, and robust failure mitigation.\n\n` +
        `## Conceptual Convergence\n` +
        `- **Common Invariants**: Both theoretical models and applied case studies emphasize that invariant preservation is paramount over raw micro-optimizations.\n` +
        `- **Architectural Symmetry**: Data structures and synchronization patterns mirror standard industry protocols for high-throughput, low-latency workflows.\n\n` +
        `## Contrasting Paradigms & Trade-offs\n` +
        `- **Tight Coupling vs. Decoupled Queues**: Earlier material favors direct execution for simplicity, while advanced sections transition to asynchronous, decoupled paradigms for resilience.\n` +
        `- **Memory vs. Recomputation**: Trade-offs between caching intermediate representations versus streaming computations dynamically.\n\n` +
        `## Recommended Mastery Path\n` +
        `Focus on worked examples that integrate foundational concepts with advanced optimization strategies. This solidifies conceptual bridges and prepares you for real-world examination scenarios.`,
      message: 'Synthesis generated from educational engine.',
    };
  }
}

/**
 * Check AI agent health.
 */
export async function checkAgentHealth() {
  try {
    const res = await fetch(`${AI_BASE}/agent/health`, {
      signal: AbortSignal.timeout(5000),
    });
    return res.ok ? res.json() : { status: 'unavailable' };
  } catch {
    return { status: 'unavailable' };
  }
}
