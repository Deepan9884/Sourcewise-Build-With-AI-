/**
 * llmService.js — Direct Cloud LLM Service for SourceWise Node API
 * Connects directly to Google Gemini (with multi-model fallback and streaming SSE).
 * Ensures full AI intelligence is always available even in serverless or isolated environments.
 */

const supabase = require('../utils/supabase');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
];

const DEFAULT_SYSTEM_INSTRUCTION = `You are SourceWise AI, an advanced, world-class academic study assistant and mentor.
Your mission is to help students deeply comprehend, critique, and master their study materials.
Guidelines:
1. Always be deeply analytical, pedagogical, and insightful. Analyze what the user is trying to learn or ask.
2. When answering questions about uploaded materials (e.g. 'orientation speech.pdf', lecture notes, research papers):
   - Provide an authoritative executive overview of what the material is about.
   - Deconstruct the key themes, underlying message, and conceptual pillars.
   - Detail the structural/rhetorical flow and practical takeaways.
   - Suggest concrete next steps (e.g. key recall questions, reflection prompts).
3. Format with clean GitHub markdown, bold highlights, clear section headers, and bullet points.
4. NEVER provide generic, empty filler phrases (like "Within the context of X, this inquiry highlights an essential concept"). Deliver genuine, substantive academic substance.`;

/**
 * Fetch source metadata from Supabase
 */
async function getSourcesMetadata(sourceIds = [], userId = null) {
  if (!sourceIds || sourceIds.length === 0) return [];
  try {
    let query = supabase.from('sources').select('id, name, type, summary, concepts, analysis');
    const validUuids = sourceIds.filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
    if (validUuids.length > 0) {
      query = query.in('id', validUuids);
      const { data } = await query;
      if (data && data.length > 0) return data;
    }
  } catch (err) {
    console.warn('[llmService] Source metadata query error:', err.message);
  }
  // Fallback to name descriptors if UUID lookup wasn't present
  return sourceIds.map(id => ({ id, name: id.replace(/^src[-_]/, '') }));
}

/**
 * Format conversation history and prompt for Gemini
 */
function buildGeminiContents(question, history = [], sources = []) {
  const contents = [];

  // Add source grounding context if sources exist
  let sourceContextText = '';
  if (sources.length > 0) {
    sourceContextText = 'Context: The user is studying the following uploaded material(s):\n';
    sources.forEach((s, idx) => {
      sourceContextText += `${idx + 1}. Document: "${s.name || 'Study Document'}" (Type: ${s.type || 'document'})\n`;
      if (s.summary) sourceContextText += `   Summary: ${typeof s.summary === 'string' ? s.summary.slice(0, 400) : JSON.stringify(s.summary).slice(0, 400)}\n`;
      if (s.concepts) sourceContextText += `   Key Concepts: ${Array.isArray(s.concepts) ? s.concepts.join(', ') : JSON.stringify(s.concepts).slice(0, 300)}\n`;
    });
    sourceContextText += '\nPlease ground your analysis and answers deeply in these materials and their specific domain.\n\n';
  }

  // Map history to Gemini format (roles: 'user' | 'model')
  if (Array.isArray(history)) {
    for (const msg of history.slice(-6)) {
      if (!msg || !msg.content) continue;
      const role = (msg.role === 'assistant' || msg.role === 'model') ? 'model' : 'user';
      contents.push({
        role,
        parts: [{ text: String(msg.content) }]
      });
    }
  }

  // Append current user question with context
  const fullUserText = sourceContextText ? `${sourceContextText}User Question: ${question}` : question;
  contents.push({
    role: 'user',
    parts: [{ text: fullUserText }]
  });

  return contents;
}

/**
 * Generate a complete text response via Gemini with multi-model fallback
 */
async function generateText({ question, sourceIds = [], history = [], personalContext = {} }) {
  const sources = await getSourcesMetadata(sourceIds);
  const contents = buildGeminiContents(question, history, sources);

  let lastError = null;

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: DEFAULT_SYSTEM_INSTRUCTION }] },
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.warn(`[llmService] Model ${model} returned ${res.status}:`, errData?.error?.message);
        lastError = new Error(errData?.error?.message || `Gemini status ${res.status}`);
        continue;
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return {
          text: text.trim(),
          model,
          sources: sources.map(s => s.name || s.id),
        };
      }
    } catch (err) {
      console.warn(`[llmService] Model ${model} fetch exception:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini models failed to generate content');
}

/**
 * Stream response tokens directly to an Express response using Server-Sent Events (SSE)
 */
async function streamText(res, { question, sourceIds = [], history = [] }) {
  const sources = await getSourcesMetadata(sourceIds);
  const contents = buildGeminiContents(question, history, sources);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Emit citations
  if (sources.length > 0) {
    const citations = sources.map(s => ({
      source_id: s.id,
      title: s.name,
      snippet: s.summary ? s.summary.slice(0, 150) : `Active material: ${s.name}`,
    }));
    res.write(`data: ${JSON.stringify({ type: 'citations', data: citations })}\n\n`);
  }

  let fullResponse = '';
  let streamSucceeded = false;

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;
      const geminiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: DEFAULT_SYSTEM_INSTRUCTION }] },
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        })
      });

      if (!geminiRes.ok) {
        console.warn(`[llmService.stream] Model ${model} status ${geminiRes.status}`);
        continue;
      }

      const reader = geminiRes.body.getReader();
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
            const parsed = JSON.parse(jsonStr);
            const partText = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (partText) {
              fullResponse += partText;
              res.write(`data: ${JSON.stringify({ type: 'token', data: partText })}\n\n`);
            }
          } catch (_) {}
        }
      }

      streamSucceeded = true;
      break;
    } catch (err) {
      console.warn(`[llmService.stream] Model ${model} streaming error:`, err.message);
    }
  }

  // If streaming failed, fall back to non-streaming or intelligent synthesis
  if (!streamSucceeded || !fullResponse) {
    try {
      const fallbackResult = await generateText({ question, sourceIds, history });
      const tokens = fallbackResult.text.split(/(\s+)/);
      for (const tok of tokens) {
        res.write(`data: ${JSON.stringify({ type: 'token', data: tok })}\n\n`);
      }
      fullResponse = fallbackResult.text;
    } catch (fbErr) {
      res.write(`data: ${JSON.stringify({ type: 'error', data: fbErr.message })}\n\n`);
    }
  }

  res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  res.end();
  return fullResponse;
}

module.exports = {
  generateText,
  streamText,
  getSourcesMetadata,
};
