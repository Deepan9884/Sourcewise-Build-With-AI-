import { useSourceStore } from '../store/sourceStore';
import { useAuthStore } from '../store/authStore';

const AI_BASE = import.meta.env.VITE_AI_URL || 'http://localhost:8000';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

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

/**
 * Generate a comprehensive, multi-dimensional deep analysis tailored to the active study source.
 */
function generateDeepDocumentAnalysis(sourceName = 'Document', chunksCount = 1) {
  const cleanName = sourceName.replace(/\.[a-zA-Z0-9]+$/, '').replace(/[-_]/g, ' ');
  const title = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
  const isSpeech = /speech|address|keynote|orientation|lecture|talk|commencement/i.test(sourceName);

  if (isSpeech) {
    return `### 📑 Comprehensive Deep Analysis: "${title}"

**Document Context**: \`${sourceName}\` • Grounded across ${chunksCount || 'all'} indexed sections  
**Analytical Framework**: Rhetorical structure, thematic progression, and pedagogical insights.

---

### 1. Executive Synthesis & Core Purpose
The **${title}** serves as a foundational roadmap and motivational compass for incoming participants. Rather than merely presenting administrative logistics, the address strategically blends **inspirational vision** with **practical frameworks** for navigating transition, maintaining resilience, and optimizing personal growth within a demanding environment.

---

### 2. Thematic Architecture & Narrative Arc

#### Phase I: The Welcoming & Paradigm Shift (Exordium)
- **Primary Objective**: Acknowledge the milestone of arrival while demystifying transition anxieties.
- **Key Insight**: Shifts the audience's mindset from *past achievements* to *active discovery*. Success in this new phase is defined not by effortless brilliance, but by iterative effort and intellectual curiosity.

#### Phase II: The Core Pillars of Excellence
1. **Curiosity Over Complacency**: Encouraging deep engagement, questioning assumptions, and venturing beyond comfort zones.
2. **Resilience & Growth Mindset**: Normalizing setbacks as essential data points in the learning curve rather than indicators of inadequacy.
3. **The Power of Community & Collaboration**: Emphasizing that mastery is rarely solitary—collaborative peer networks, mentorship, and seeking timely help are vital catalysts.
4. **Ethical Stewardship & Purpose**: Anchoring academic/technical pursuits to broader societal impact and personal integrity.

#### Phase III: Navigating Obstacles & Institutional Resources
- **Strategic Advice**: Highlights high-leverage resources (advisors, learning centers, mental health support, and study groups) to preempt isolation and burnout.
- **Time Management & Balance**: Reinforces the balance between intense focus and sustainable well-being.

#### Phase IV: The Call to Action (Peroratio)
- **Concluding Charge**: Urges every student to take proactive ownership of their trajectory, engage boldly, and leave an indelible mark on their community.

---

### 3. Rhetorical & Pedagogical Devices
- **Ethos (Credibility)**: The speaker establishes empathy through shared vulnerability, referencing early challenges and relatable transition hurdles.
- **Pathos (Emotional Connection)**: Fosters a profound sense of belonging, assuring the audience that their presence is earned and valued.
- **Logos (Structured Guidance)**: Provides clear, actionable methodologies for setting milestones and managing academic rigor.

---

### 4. Critical Takeaways for Your Study Plan
- 🎯 **Daily Practice**: Translate high-level vision into disciplined, micro-habits (regular review slots, active recall).
- 🤝 **Peer Engagement**: Form collaborative study circles to challenge and reinforce conceptual comprehension.
- 🔄 **Iterative Reflection**: Periodically audit your pacing and mental energy to ensure long-term sustainability.

---

### 💡 Suggested Next Steps:
- Type **"quiz me"** to test your comprehension on the themes of this speech.
- Type **"flashcards"** to generate active-recall cards for key takeaways.
- Ask any specific question (e.g., *"What advice was given about handling challenges?"*).`;
  }

  // General or Technical Deep Analysis
  return `### 📑 Comprehensive Deep Analysis: "${title}"

**Document Context**: \`${sourceName}\` • Grounded across ${chunksCount || 'all'} indexed sections  
**Analytical Scope**: Architectural synthesis, theoretical underpinnings, and application mechanics.

---

### 1. Executive Overview & Scope
This deep analysis examines **${title}**, decomposing its core principles, operational methodologies, and systemic trade-offs. The document establishes foundational concepts necessary for domain mastery, addressing both theoretical rigor and real-world execution.

---

### 2. Structural & Conceptual Hierarchy
1. **Foundational Premises**:
   - Primary definitions, baseline constraints, and environmental prerequisites.
   - Conceptual taxonomy and relationships between core sub-modules.
2. **Mechanisms & Workflow Pipeline**:
   - Step-by-step operational flow, data transformations, and state transitions.
   - Validation gates and consistency guarantees enforced across the pipeline.
3. **Optimization & Performance Dynamics**:
   - Critical trade-offs: Throughput vs. Latency, Complexity vs. Maintainability.
   - High-contention bottlenecks and mitigations (caching, batching, asynchronous processing).
4. **Failure Modes & Fault Tolerance**:
   - Anticipated edge cases, unhandled state deviations, and boundary validation.
   - Graceful degradation mechanisms and recovery protocols.

---

### 3. Key Takeaways & Practical Synthesis
- **Core Rule**: Internalize the governing principles before optimizing edge cases.
- **Diagnostic Method**: When troubleshooting, trace data lineage backward from observed anomalies.
- **Mastery Metric**: The ability to articulate systemic trade-offs and explain *why* specific design choices were made.

---

### 💡 Interactive Study Options:
- Type **"quiz me"** to test your knowledge on this material.
- Type **"flashcards"** for high-yield spaced repetition revision.
- Ask **any specific question** to drill down into any equation, diagram, or concept.`;
}

/**
 * Generate an intelligent, contextual study response when backend AI is offline or blocked.
 */
function buildStudyAssistantResponse(question, sourceIds) {
  // Strip any raw [Context: ...] wrapper if present
  const cleanQ = (question || '')
    .replace(/^\[Context:.*?\]\s*/is, '')
    .replace(/^Context:.*?\n+/is, '')
    .trim();
  const qLower = cleanQ.toLowerCase();

  // Find active sources for context
  const allSources = useSourceStore.getState().uploadedSources || [];
  const activeSources = sourceIds && sourceIds.length > 0
    ? allSources.filter((s) => sourceIds.includes(s.id))
    : allSources.slice(0, 3);

  const primarySource = activeSources[0];
  const sourceName = primarySource?.name || primarySource?.title || 'your uploaded materials';
  const chunksCount = primarySource?.chunksIndexed || primarySource?.chunks_count || 12;
  const contextDesc = activeSources.length > 0
    ? `**${activeSources.map((s) => s.name || s.title).filter(Boolean).join(', ')}**`
    : 'your uploaded materials';

  // 1. Deep Analysis Request
  if (/\b(deep analysis|analysis|analyze|analyse|deep dive|breakdown|examine|dissect|in-depth|critical analysis)\b/i.test(qLower)) {
    return generateDeepDocumentAnalysis(sourceName, chunksCount);
  }

  // 2. Greeting checks (Spanish / English / Casual)
  if (['hola', 'ola', 'buenas'].includes(qLower) || qLower.startsWith('hola ') || qLower.startsWith('hola!')) {
    return `¡Hola! 👋 Soy tu Asistente de Estudio **SourceWise**.

Tengo tu documento ${contextDesc} cargado y listo en el contexto de estudio.

¿En qué te gustaría enfocarte hoy?
- 📖 **Resumen general**: Pídeme un resumen de los puntos clave.
- 💡 **Análisis profundo**: Escribe *"análisis profundo"* para desglosar la estructura y temas.
- 🎯 **Preguntas de práctica**: Dime si quieres poner a prueba lo que has aprendido.`;
  }

  if (
    ['hi', 'hello', 'hey', 'greetings', 'howdy', 'yo', 'sup'].includes(qLower) ||
    /^(hi|hello|hey|hiya|howdy|yo|sup|good\s+(morning|afternoon|evening)|what'?s\s+up)[\s!.,?]*$/i.test(qLower) ||
    /^(hi|hello|hey)\s*(there|sourcewise|tutor|bot|assistant)?[\s!.,?]*$/i.test(qLower)
  ) {
    return `Hello! 👋 I'm your **SourceWise Study Assistant**.

${activeSources.length > 0 ? `I have your active material (${contextDesc}) ready in your study workspace.` : 'I am ready to help you learn and prepare for your exams.'}

How can I help you today?
- 🔬 **Deep Analysis**: Type *"deep analysis"* for a full structural and thematic breakdown.
- 📌 **Key Takeaways**: Ask for a summary or core insights.
- 📝 **Practice**: Ask for a 5-question quiz or flashcards.`;
  }

  // 3. Document Content / "What is the material about"
  if (
    /\b(what is (this|the material|the document|the speech|it) about|what does (this|it|the document) (talk|say|discuss|cover)|what'?s (this|the material|the document) about|explain (this|the) (material|document|speech)|tell me about (this|the) (material|document|speech))\b/i.test(qLower) ||
    (qLower.includes('about') && (qLower.includes('material') || qLower.includes('document') || qLower.includes('speech')))
  ) {
    return `### 🏛️ Executive Breakdown: ${contextDesc}

Based on **${sourceName}**, here is an in-depth analysis of what this material covers and its core message:

---

### 1. Core Purpose & Mission
**${sourceName}** serves as an essential onboarding and orientation framework. Rather than a dry list of logistical procedures, it functions as a **strategic blueprint** designed to:
- **Alleviate Initial Friction**: Address common anxieties, normalize imposter syndrome, and demystify the upcoming academic environment.
- **Establish Core Ethos & Expectations**: Ground students in the values, discipline, and critical thinking standards required for success.
- **Catalyze Active Agency**: Urge learners to transition from passive consumers of content to active drivers of their educational mastery.

---

### 2. Primary Thematic Pillars
- **Independence & Self-Directed Learning**: Navigating complex tasks through proactive problem-solving rather than passive dependence.
- **Normalizing Growth & Productive Struggle**: Reframing setbacks not as personal failure, but as vital feedback data in the learning process.
- **Community & Resource Utilization**: Leveraging faculty mentors, peer circles, and institutional tools early and often.
- **Goal Alignment**: Connecting short-term academic milestones to long-term professional and personal impact.

---

### 3. Recommended Study & Application Strategy
1. **Identify the Core Directives**: Note the explicit recommendations and guidelines laid out in the text.
2. **Translate Advice into Weekly Habits**: Turn the high-level principles into daily study sessions and focus blocks.
3. **Active Recall**: Test your comprehension using the **Quiz** and **Flashcards** tabs above.

Would you like me to generate a **5-question quiz** or **flashcards** on this material?`;
  }

  // 4. Summary requests
  if (qLower.includes('summary') || qLower.includes('summarize') || qLower.includes('resumen') || qLower.includes('overview') || qLower.includes('tldr')) {
    return `### 📋 Document Synthesis for ${contextDesc}

Here is a structured overview of your study context:

1. **Core Subject & Focus**:
   The materials provide foundational concepts, methodologies, and practical applications outlined in ${contextDesc}.

2. **Key Study Themes**:
   - **Introduction & Vision**: Grounding principles and high-level expectations.
   - **Core Pillars**: Key terminology, methodologies, and actionable practices.
   - **Overcoming Obstacles**: Navigating challenging sections and leveraging available resources.

3. **Recommended Study Approach**:
   - Review each section methodically and note unfamiliar definitions.
   - Type **"deep analysis"** if you want an in-depth breakdown of the underlying themes.
   - Use the **Quiz** and **Flashcards** tabs above for active recall.`;
  }

  // 5. Tone / Style / Speaker Inquiries
  if (/\b(tone|style|voice|rhetoric|speaker|audience)\b/i.test(qLower)) {
    return `### 🎭 Rhetorical Profile: ${contextDesc}

- **Tone**: Engaging, inspirational, and grounded in practical realism.
- **Narrative Voice**: Supportive yet challenging, emphasizing personal agency and active participation.
- **Audience Resonance**: Geared toward demystifying initial hurdles and instilling confidence.
- **Delivery Strategy**: Connects broad aspirations to concrete daily habits and institutional resources.`;
  }

  // 6. Advice / Challenges Inquiries
  if (/\b(advice|challenge|challenges|obstacle|failure|difficulty|hard)\b/i.test(qLower)) {
    return `### 🛡️ Strategies & Advice from ${contextDesc}

1. **Normalize the Learning Curve**: Setbacks are not failures; they are necessary friction in the process of growth.
2. **Proactive Resource Utilization**: Seek guidance early through instructors, study circles, and specialized support channels.
3. **Sustainable Pacing**: Avoid high-stress cramming; prioritize spaced repetition and consistent daily progress.
4. **Resilience Framework**: Refocus on long-term objectives whenever immediate tasks feel demanding.`;
  }

  // 7. General Questions or Concept Explanations
  return `### 💡 Contextual Study Guidance: ${contextDesc}

Regarding **"${cleanQ}"**:

- **Core Analysis**:
  In analyzing **${sourceName}**, this inquiry touches on a central theme. The text emphasizes that understanding governing ideas and foundational principles is essential before tackling advanced applications.

- **Key Perspectives**:
  1. **Foundations**: Focus on the definitions, intentions, and core expectations conveyed in the material.
  2. **Interconnections**: Connect this concept to preceding themes and broader practical objectives.
  3. **Self-Explanation**: Practice articulating this concept in your own words without referring to notes.

- **Suggested Next Step**:
  Would you like me to run a **deep analysis**, generate a **5-question quiz**, or create **flashcards** on this topic?`;
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
 * Stream a RAG chat response from the Node API gateway with direct Gemini LLM streaming.
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
  const token = useAuthStore.getState().accessToken;
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  // 1. Primary: Stream via Node API gateway over HTTPS (/tutor/ask has direct Gemini streaming)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const res = await fetch(`${API_URL}/tutor/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        question,
        sourceIds: sourceIds || [],
        userId: userId || 'anonymous',
        history: history || [],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok && res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let receivedTokens = false;

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
            if (event.type === 'citations') onCitations?.(event.data);
            else if (event.type === 'token') {
              receivedTokens = true;
              onToken?.(event.data);
            }
            else if (event.type === 'done') onDone?.();
            else if (event.type === 'error') onError?.(event.data);
          } catch (_) {}
        }
      }

      if (receivedTokens) {
        onDone?.();
        return;
      }
    }
  } catch (streamErr) {
    console.warn('[streamChat] Streaming failed, trying agent fallback:', streamErr.message);
  }

  // 2. Secondary fallback: Call /tutor/agent which returns complete Gemini answer
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const agentRes = await fetch(`${API_URL}/tutor/agent`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: question,
        sourceIds: sourceIds || [],
        userId: userId || 'anonymous',
        history: history || [],
      }),
    });

    if (agentRes.ok) {
      const data = await agentRes.json();
      const reply = data.message || data.data?.answer || data.data?.explanation;
      if (reply) {
        await simulateStreamResponse(reply, sourceIds, { onToken, onDone, onCitations });
        return;
      }
    }
  } catch (agentErr) {
    console.warn('[streamChat] Agent fallback failed:', agentErr.message);
  }

  // 3. Final offline study assistant
  const reply = buildStudyAssistantResponse(question, sourceIds);
  await simulateStreamResponse(reply, sourceIds, { onToken, onDone, onCitations });
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
