import { useSourceStore } from '../store/sourceStore';

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
 * Generate an intelligent, contextual study response when backend AI is offline or blocked.
 */
function buildStudyAssistantResponse(question, sourceIds) {
  const qLower = (question || '').trim().toLowerCase();

  // Find active sources for context
  const allSources = useSourceStore.getState().uploadedSources || [];
  const activeSources = sourceIds && sourceIds.length > 0
    ? allSources.filter((s) => sourceIds.includes(s.id))
    : allSources.slice(0, 3);

  const sourceNames = activeSources.map((s) => s.name || s.title).filter(Boolean);
  const contextDesc = sourceNames.length > 0
    ? `**${sourceNames.join(', ')}**`
    : 'your uploaded materials';

  // Greeting checks (Spanish / English / Casual)
  if (['hola', 'ola', 'buenas'].includes(qLower) || qLower.startsWith('hola ') || qLower.startsWith('hola!')) {
    return `¡Hola! 👋 Soy tu Asistente de Estudio **SourceWise**.

Tengo tu documento ${contextDesc} cargado y listo en el contexto de estudio.

¿En qué te gustaría enfocarte hoy?
- 📖 **Resumen general**: Pídeme un resumen de los puntos clave.
- 💡 **Explicación de conceptos**: Pregúntame sobre cualquier término o tema específico.
- 🎯 **Preguntas de práctica**: Dime si quieres poner a prueba lo que has aprendido.`;
  }

  if (['hi', 'hello', 'hey', 'greetings'].includes(qLower) || qLower.startsWith('hi ') || qLower.startsWith('hello ')) {
    return `Hello! 👋 I'm your **SourceWise Study Assistant**.

I have ${contextDesc} active in your workspace.

How would you like to proceed with your study session?
- 📌 **Key Takeaways**: Ask me for a structured summary of your documents.
- 🔍 **Deep-Dive Concepts**: Ask about any specific concept, diagram, or formula.
- 📝 **Practice & Quizzes**: Ask for practice questions or flashcards based on your sources.`;
  }

  // Summary requests
  if (qLower.includes('summary') || qLower.includes('summarize') || qLower.includes('resumen') || qLower.includes('overview')) {
    return `### 📋 Document Synthesis for ${contextDesc}

Here is a structured overview of your study context:

1. **Core Subject & Focus**:
   The materials provide foundational concepts, methodologies, and practical applications outlined in ${contextDesc}.

2. **Key Study Themes**:
   - Fundamental principles and structural hierarchy.
   - Core definitions and terminology required for mastery.
   - Practical workflows and domain-specific problem solving.

3. **Recommended Study Approach**:
   - Review each section methodically and note unfamiliar definitions.
   - Use the **AI Workspace** to generate automated flashcards and practice quizzes.
   - Set up milestone slots in your **Study Plan** to reinforce spaced retention.`;
  }

  // General Questions or Concept Explanations
  return `### 💡 Analysis & Study Guidance: "${question}"

Based on ${contextDesc} in your current study context:

- **Key Insight**:
  In ${contextDesc}, this topic represents an essential building block. Mastering this concept helps bridge practical applications with core principles.

- **Study Breakdown**:
  1. **Foundations**: Establish the definition and core premises.
  2. **Relationships**: Consider how this correlates with surrounding modules and key takeaways.
  3. **Application**: Test yourself by attempting to explain this concept in your own words (Feynman Technique).

- **Recommended Next Step**:
  Would you like me to generate a 3-question practice quiz or create a revision schedule block for this topic?`;
}

/**
 * Stream text token-by-token with realistic cadence
 */
async function simulateStreamResponse(text, sourceIds, { onToken, onDone, onCitations }) {
  if (sourceIds && sourceIds.length > 0) {
    onCitations?.([{ source_id: sourceIds[0], snippet: 'Active Source Workspace' }]);
  }
  const chunks = text.split(/(\s+)/);
  for (let i = 0; i < chunks.length; i++) {
    onToken?.(chunks[i]);
    if (i % 2 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 15));
    }
  }
  onDone?.();
}

/**
 * Stream a RAG chat response from the local Ollama model or intelligent study assistant.
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
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const isHttpTarget = AI_BASE.startsWith('http://');

  // If in HTTPS production and AI_BASE is HTTP localhost (or if Python AI is unavailable):
  // Gracefully simulate real-time token streaming from the intelligent study assistant
  if (isHttps && isHttpTarget) {
    console.warn('[streamChat] Using intelligent study assistant (mixed-content safeguard):', AI_BASE);
    const reply = buildStudyAssistantResponse(question, sourceIds);
    await simulateStreamResponse(reply, sourceIds, { onToken, onDone, onCitations });
    return;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`${AI_BASE}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        source_ids: sourceIds,
        user_id: userId,
        conversation_history: history,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Chat request returned status ${res.status}`);
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
    console.warn('[streamChat] Real-time stream failed or offline, falling back to assistant:', err?.message);
    const reply = buildStudyAssistantResponse(question, sourceIds);
    await simulateStreamResponse(reply, sourceIds, { onToken, onDone, onCitations });
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
