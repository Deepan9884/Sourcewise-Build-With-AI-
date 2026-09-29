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
  }
  
  // Only add context if it has data
  if (context && typeof context === 'object' && Object.keys(context).length > 0) {
    body.context = context
  }

  const res = await fetch(`${API_URL}/tutor/agent`, {
    method: 'POST',
    headers: gatewayHeaders(),
    body: JSON.stringify(body),
  });

  if (res.status === 404) {
    // Old backend without the gateway proxy — fall back to direct python-ai
    const direct = await fetch(`${AI_BASE}/agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!direct.ok) {
      const err = await direct.json().catch(() => ({ detail: direct.statusText }));
      throw new Error(err.detail || `Agent request failed with status ${direct.status}`);
    }
    return direct.json();
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || err.detail || `Agent request failed with status ${res.status}`);
  }

  return res.json();
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
  const res = await fetch(`${AI_BASE}/sources/synthesize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source_ids: sourceIds, focus_topic: focusTopic }),
  });

  if (!res.ok) throw new Error('Synthesis failed');
  return res.json();
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
