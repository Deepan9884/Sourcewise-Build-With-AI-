/**
 * chatApi.js — API client for SourceWise AI (Python FastAPI service).
 * All AI runs locally via Ollama. No external API keys needed.
 */

const AI_BASE = import.meta.env.VITE_AI_URL || 'http://localhost:8000';

// ── Ingest ────────────────────────────────────────────────────────────────────

/**
 * Upload a document to the AI service for vectorization.
 * In production or when AI service is offline, falls back gracefully to client indexing.
 * @param {File} file
 * @param {string} sourceId
 * @param {string} userId
 * @param {string} sourceName
 */
export async function ingestDocument(file, sourceId, userId, sourceName) {
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const isHttpTarget = AI_BASE.startsWith('http://');

  // Browsers block HTTPS -> HTTP calls as Mixed Content ("Failed to fetch")
  if (isHttps && isHttpTarget) {
    console.warn('[ingestDocument] Skipping unencrypted Python AI ingest from HTTPS context:', AI_BASE);
    const estimatedChunks = Math.max(1, Math.ceil((file?.size || 1024) / 1800));
    return { source_id: sourceId, source_name: sourceName, chunks_indexed: estimatedChunks, status: 'ready', simulated: true };
  }

  try {
    const form = new FormData();
    form.append('file', file);
    form.append('source_id', sourceId);
    form.append('user_id', userId);
    form.append('source_name', sourceName);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${AI_BASE}/ingest`, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Ingest failed');
    }
    return await res.json(); // { source_id, source_name, chunks_indexed, status }
  } catch (err) {
    console.warn('[ingestDocument] AI vectorization offline, fallback to client indexing:', err?.message);
    const estimatedChunks = Math.max(1, Math.ceil((file?.size || 1024) / 1800));
    return { source_id: sourceId, source_name: sourceName, chunks_indexed: estimatedChunks, status: 'ready', fallback: true };
  }
}

/**
 * Remove a source's vectors from ChromaDB.
 */
export async function deleteSourceVectors(sourceId) {
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  if (isHttps && AI_BASE.startsWith('http://')) {
    return { status: 'skipped' };
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${AI_BASE}/ingest/${sourceId}`, { method: 'DELETE', signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return { status: 'skipped' };
    return await res.json();
  } catch {
    return { status: 'skipped' };
  }
}

// ── Chat (Streaming) ──────────────────────────────────────────────────────────

/**
 * Stream a RAG chat response from the local Ollama model.
 *
 * @param {object} params
 * @param {string}   params.question
 * @param {string[]} params.sourceIds      - which sources to query
 * @param {string}   params.userId
 * @param {Array}    params.history        - [{role, content}, ...]
 * @param {function} params.onCitations    - called once with citations array
 * @param {function} params.onToken        - called per token with string
 * @param {function} params.onDone         - called when stream ends
 * @param {function} params.onError        - called on error with message
 */
export async function streamChat({
  question,
  sourceIds,
  userId,
  history = [],
  onCitations,
  onToken,
  onDone,
  onError,
}) {
  try {
    const res = await fetch(`${AI_BASE}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        source_ids: sourceIds,
        user_id: userId,
        conversation_history: history,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      onError?.(err.detail || 'Chat request failed');
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
      buffer = lines.pop(); // keep incomplete line in buffer

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;
        try {
          const event = JSON.parse(jsonStr);
          if (event.type === 'citations') onCitations?.(event.data);
          else if (event.type === 'token') onToken?.(event.data);
          else if (event.type === 'done') onDone?.();
          else if (event.type === 'error') onError?.(event.data);
        } catch { /* malformed SSE line */ }
      }
    }
  } catch (err) {
    onError?.(err.message || 'Network error');
  }
}

// ── Health ────────────────────────────────────────────────────────────────────

export async function checkAIHealth() {
  try {
    const res = await fetch(`${AI_BASE}/chat/health`, { signal: AbortSignal.timeout(5000) });
    return res.ok ? res.json() : { ollama_running: false };
  } catch {
    return { ollama_running: false };
  }
}
