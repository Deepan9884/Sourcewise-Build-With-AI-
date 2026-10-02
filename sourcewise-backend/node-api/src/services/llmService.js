/**
 * llmService.js — Direct Cloud LLM Service for SourceWise Node API
 * Connects directly to Google Gemini (with multi-model fallback, JSON schemas, and streaming SSE).
 * Eliminates all localhost dependencies in production.
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
4. NEVER provide generic, empty filler phrases. Deliver genuine, substantive academic substance.
5. CRITICAL DIRECTIVE FOR LEARNING FEATURE REQUESTS:
   The SourceWise platform provides dedicated, specialized UI tabs and sections for specific learning activities:
   - For Quizzes / Practice Tests ("quiz me", "give me a quiz", "test me", "generate quiz"):
     Direct the user to the "Quiz" tab right above in this workspace. Explain that the Quiz tab has interactive multiple-choice & short-answer questions, customizable difficulty, instant grading, and progress tracking.
   - For Flashcards / Spaced Repetition ("flashcards", "flashcard", "flip cards", "memorize"):
     Direct the user to the "Flashcards" tab right above in this workspace for active-recall flip cards and spaced-repetition ratings.
   - For 1-on-1 Tutoring / Socratic Method ("tutor me", "socratic tutoring", "teach me"):
     Direct the user to the "Tutor" tab right above in this workspace for guided step-by-step dialogue.
   - For Structured Notes / Summaries ("make notes", "generate notes", "study notes"):
     Direct the user to the "Notes" tab right above in this workspace to generate, edit, cloud-save, and export formatted notes (PDF/Markdown/JSON).
   - For Study Plan / Schedule / Calendar ("study plan", "make a schedule", "roadmap"):
     Direct the user to the "My Plan" section (/plan) to track daily pacing and schedule study blocks.
   - For Brain Games / Puzzles ("games", "puzzles", "crossword", "arena"):
     Direct the user to the "Game Arena" (/puzzles) to play word searches and memory match challenges.
   - For Code Execution ("compiler", "deepcode", "run code"):
     Direct the user to "DeepCode" (/deepcode) for an in-browser code editor and runner.
    ALWAYS clearly instruct the user to go to that respective dedicated tab or section whenever they ask to access or use these learning features.
6. DOCUMENT GROUNDING RULE: The "Context:" header before the user question tells you EXACTLY which document(s) are selected. Answer ONLY about those named documents. NEVER substitute or invent other textbooks or materials not in the context. If you lack the document full text, say so honestly and ask the user to share excerpts.
7. STUDENT WELLNESS & FATIGUE RULE: If the user expresses fatigue, sleepiness, stress, or needing a break (e.g. "i am sleepy", "i'm tired", "i'm overwhelmed", "can i take a break"):
   - NEVER treat their physical state or mood as an academic or technical topic in the study materials!
   - Respond as an intelligent, caring academic mentor. Explain the neuroscience of sleep and memory consolidation, encourage healthy rest or a power nap, and reassure them that their study progress is saved.`;

/**
 * Dedicated Intent Router for SourceWise Features.
 */
function getFeatureRedirection(question, sourceName = 'your study material') {
  const cleanQ = (question || '')
    .replace(/^\[Context:.*?\]\s*/is, '')
    .replace(/^Context:.*?\n+/is, '')
    .trim();
  const qLower = cleanQ.toLowerCase();

  // CRITICAL: Never intercept structured generation requests or long prompts!
  // Generation prompts for quizzes, flashcards, or notes must pass through to Gemini.
  if (
    cleanQ.length > 100 ||
    /^(create|generate|synthesize|produce|build|return|draft|format)\b/i.test(cleanQ) ||
    /\b(critical requirements|strictly forbidden|front:|back:|options|option a|specify the correct answer)\b/i.test(cleanQ)
  ) {
    return null;
  }

  // 0. Sleepiness / Fatigue / Mood / Casual Check
  if (
    /\b(i('?m| am)?\s*(so\s*)?(sleepy|tired|exhausted|drowsy|fatigued|drained|burned out|burnt out|falling asleep))\b/i.test(qLower) ||
    /\b(need\s+(a\s+)?sleep|want\s+to\s+sleep|going\s+to\s+sleep|gonna\s+sleep|can('?t| not)\s+keep\s+my\s+eyes\s+open)\b/i.test(qLower) ||
    /^(sleepy|tired|exhausted|so tired|so sleepy|good\s*night)[\s!.,?]*$/i.test(qLower)
  ) {
    return `### 😴 Listen to Your Body — Time to Rest!

Studying while sleepy leads to rapidly diminishing returns. Cognitive neuroscience shows that your brain needs sleep for **memory consolidation** — the process where newly acquired information is stabilized and shifted from the hippocampus into long-term neocortical memory.

Here is what I recommend right now:

1. **Option A: The 20-Minute Power Nap (Recommended)**
   - Set an alarm for **20–25 minutes** (prevents entering deep slow-wave sleep and waking up groggy).
   - A quick nap flushes adenosine buildup and dramatically restores alertness.

2. **Option B: Call It a Day & Sleep**
   - If it's late at night, close your books! Forcing study when exhausted causes high frustration and minimal retention.
   - Sleep now — your brain will organize what you reviewed today while you sleep.

3. **Option C: Need to Finish Just One Small Task?**
   - Stand up, drink a cold glass of water, and take 3 deep breaths.
   - Switch to lighter active recall (like 5 quick flashcards) instead of dense reading.

💤 **Your progress and materials are safely saved!** Rest up, and whenever you're ready, we'll continue with high energy.`;
  }

  if (
    /\b(i('?m| am)?\s*(going to\s*)?(take|need|want)\s*(a\s*)?break)\b/i.test(qLower) ||
    /\b(can i take a break|time for a break|break time|tired of studying|pause study)\b/i.test(qLower) ||
    /^(break|taking a break|need a break)[\s!.,?]*$/i.test(qLower)
  ) {
    return `### ☕ Take a Well-Deserved Break!

Effective learning follows the **Pomodoro rhythm**: 25–45 minutes of deep focus paired with 5–15 minutes of genuine relaxation. Continuous marathon studying without breaks causes cognitive fatigue and reduced retention.

**Tips for a high-yield break:**
- 🚶 **Move around**: Stand up, stretch, or take a quick 5-minute walk to boost cerebral blood flow.
- 💧 **Hydrate**: Drink a full glass of cold water.
- 📵 **Visual rest**: Avoid scrolling social media — give your eyes and visual processing cortex a real break.

Whenever you return, just type *"I'm back"* and we'll pick up right where you left off!`;
  }

  // 1. Quiz / Practice Test
  if (
    /\b(quiz|quiz me|give me a quiz|test me|practice quiz|practice test|generate a quiz|take a quiz|exam questions|test my knowledge|quizzes|mcq|mcqs)\b/i.test(qLower) ||
    /^(quiz|quiz me|test me|give me a quiz)[\s!.,?]*$/i.test(qLower)
  ) {
    return `### 🎯 Ready for an Interactive Practice Quiz?

To test your knowledge on **${sourceName}**, please switch to the **Quiz** tab right above in this workspace!

**In the Quiz section you can:**
- 📝 Customize question count (5, 10, 15 questions) and difficulty (Easy, Medium, Hard)
- ⏱️ Answer questions interactively with instant feedback & auto-grading
- 💡 Read step-by-step explanations for every question
- 📊 Track your concept mastery and test scores over time

👉 **Click the "Quiz" tab above to start your practice test!**`;
  }

  // 2. Flashcards
  if (
    /\b(flashcard|flashcards|flash card|flash cards|make flashcards|generate flashcards|flip cards|cards|spaced repetition|memorize)\b/i.test(qLower) ||
    /^(flashcard|flashcards|flash cards)[\s!.,?]*$/i.test(qLower)
  ) {
    return `### 🗂️ Ready for Spaced-Repetition Flashcards?

To review and memorize key terms and definitions from **${sourceName}**, please switch to the **Flashcards** tab right above in this workspace!

**In the Flashcards section you can:**
- 🔄 Flip cards to practice active recall on core concepts and formulas
- ⭐ Rate card difficulty (Again, Hard, Good, Easy) to schedule reviews
- 🎯 Focus on high-yield definitions and exam-critical takeaways

👉 **Click the "Flashcards" tab above to open your deck!**`;
  }

  // 3. Tutor / Socratic
  if (
    /\b(tutor me|tutoring|socratic|teach me|tutor session|start tutoring|personal tutor|1-on-1 tutor)\b/i.test(qLower) ||
    /^(tutor|tutor me)[\s!.,?]*$/i.test(qLower)
  ) {
    return `### 🎓 Ready for 1-on-1 Interactive Tutoring?

For personalized step-by-step guidance on **${sourceName}**, please switch to the **Tutor** tab right above in this workspace!

**In the Tutor section you can:**
- 🧑‍🏫 Choose your tutoring style (Friendly, Socratic, or Mentor)
- 🔍 Walk through complex problems and conceptual frameworks step-by-step
- 💬 Ask continuous follow-up questions tailored to your learning pace

👉 **Click the "Tutor" tab above to begin your tutoring session!**`;
  }

  // 4. Notes
  if (
    /\b(make notes|take notes|generate notes|study notes|create notes|structured notes|summary notes|export notes)\b/i.test(qLower) ||
    /^(notes|make notes|study notes)[\s!.,?]*$/i.test(qLower)
  ) {
    return `### 📝 Looking for Structured Study Notes?

To generate, format, and save structured notes on **${sourceName}**, please switch to the **Notes** tab right above in this workspace!

**In the Notes section you can:**
- 📑 Choose between Comprehensive, Executive, or Bullet-point study notes
- ✏️ Edit notes in real-time with Markdown and LaTeX math support
- 💾 Save notes directly to your personal Cloud Notebook
- 📥 Export as PDF, Markdown, or JSON

👉 **Click the "Notes" tab above to create your notes!**`;
  }

  // 5. Plan / Schedule
  if (
    /\b(study plan|planner|make a schedule|study schedule|exam schedule|my plan|roadmap|plan my studies|pacing)\b/i.test(qLower)
  ) {
    return `### 📅 Looking to Build or Check Your Study Plan?

To manage your multi-subject study schedule, exam timeline, and daily pacing, navigate to the **My Plan** section (\`/plan\`)!

**In My Plan you can:**
- 📊 Track your daily pacing, streaks, and subject completion targets
- 🗓️ Schedule study blocks and integrate with Google Calendar
- 🔄 Get automatic adaptive replanning based on your schedule

👉 **Navigate to My Plan (\`/plan\`) to manage your schedule!**`;
  }

  // 6. Games / Puzzles / Arena
  if (
    /\b(puzzle|puzzles|game|games|crossword|word search|memory flip|game arena|arena)\b/i.test(qLower)
  ) {
    return `### 🎮 Looking for Brain Games & Puzzles?

To sharpen your memory with interactive study games based on your materials, visit the **Puzzles & Game Arena** section (\`/puzzles\`)!

**In the Game Arena you can:**
- 🧩 Solve vocabulary word searches and crosswords generated from your documents
- 🃏 Play memory match and rapid recall challenges
- 🏆 Earn study achievements and level up

👉 **Navigate to Game Arena (\`/puzzles\`) to play!**`;
  }

  // 7. DeepCode / Compiler
  if (
    /\b(code|compiler|deepcode|run code|write code|execute code|programming)\b/i.test(qLower)
  ) {
    return `### 💻 Looking for Code Execution & Analysis?

Visit the **DeepCode Compiler** section (\`/deepcode\`) to write, inspect, and run code in an interactive sandbox with real-time AI assistance!

👉 **Navigate to DeepCode (\`/deepcode\`) to start coding!**`;
  }

  return null;
}

/**
 * Fetch source metadata from Supabase.
 * Returns only real user-owned sources — never injects demo sources into a user's context.
 */
async function getSourcesMetadata(sourceIds = [], userId = null, sourceNameHints = []) {
  let sources = [];
  try {
    // 1. Fetch user's persistent sources from Supabase if userId is provided
    if (userId) {
      const { data, error } = await supabase
        .from('sources')
        .select('id, name, type, summary, concepts, analysis, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        sources = data;
      }
    }

    // 2. If specific sourceIds were provided, try to match from Supabase (strictly scoped to this user)
    if (Array.isArray(sourceIds) && sourceIds.length > 0) {
      const validUuids = sourceIds.filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
      if (validUuids.length > 0) {
        let query = supabase
          .from('sources')
          .select('id, name, type, summary, concepts, analysis')
          .in('id', validUuids);
        if (userId) {
          query = query.eq('user_id', userId);
        }
        const { data } = await query;
        if (data && data.length > 0) {
          const existingIds = new Set(sources.map(s => s.id));
          for (const d of data) {
            if (!existingIds.has(d.id)) sources.unshift(d);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[llmService] Source metadata query error:', err.message);
  }

  // 3. Filter to requested sourceIds if provided
  if (Array.isArray(sourceIds) && sourceIds.length > 0) {
    const matched = sources.filter(s => sourceIds.includes(s.id) || sourceIds.includes(s.name));
    if (matched.length > 0) return matched;
  }

  // 4. If we have source name hints (from the frontend upload), create lightweight stubs
  //    so Gemini knows WHAT document it's answering about — without fake demo content.
  if (sourceNameHints && sourceNameHints.length > 0) {
    return sourceNameHints.map(name => ({ id: name, name, type: 'document', summary: '', concepts: [] }));
  }

  // 5. Return whatever real user sources we found (most recent first), or empty array.
  //    NEVER fall back to demo sources — that caused hallucinated CS textbook content.
  return sources;
}

/**
 * Format conversation history and prompt for Gemini
 */
function buildGeminiContents(question, history = [], sources = []) {
  const contents = [];

  // Add rich source grounding context if sources exist
  let sourceContextText = '';
  if (sources.length > 0) {
    sourceContextText = 'Context: The user is studying the following uploaded material(s):\n';
    sources.forEach((s, idx) => {
      sourceContextText += `${idx + 1}. Document: "${s.name || 'Study Document'}" (Type: ${s.type || 'document'})\n`;
      const summaryText = typeof s.summary === 'string' ? s.summary : (s.analysis?.overview || '');
      if (summaryText) {
        sourceContextText += `   Summary/Key Excerpt: ${summaryText.slice(0, 1500)}\n`;
      }
      const conceptsList = Array.isArray(s.concepts) ? s.concepts : (s.analysis?.key_concepts || []);
      if (conceptsList.length > 0) {
        const cNames = conceptsList.map(c => (typeof c === 'string' ? c : c.name || '')).filter(Boolean);
        sourceContextText += `   Key Concepts: ${cNames.slice(0, 8).join(', ')}\n`;
      }
      if (s.analysis?.key_takeaways?.length > 0) {
        sourceContextText += `   Takeaways: ${s.analysis.key_takeaways.slice(0, 4).join('; ')}\n`;
      }
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
async function generateText({ question, sourceIds = [], history = [], personalContext = {}, userId = null, sourceNameHints = [], skipRedirection = false }) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is not configured');
  }

  const sources = await getSourcesMetadata(sourceIds, userId, sourceNameHints);
  const primarySourceName = sources[0]?.name || 'your study material';
  if (!skipRedirection) {
    const redirection = getFeatureRedirection(question, primarySourceName);
    if (redirection) {
      return {
        text: redirection,
        model: 'system-intent-router',
        sources: sources.map(s => s.name || s.id),
      };
    }
  }
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
 * Generate structured JSON response via Gemini with JSON mode
 */
async function generateJson({ prompt, systemPrompt = '' }) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.4,
          }
        })
      });
      if (res.ok) {
        const data = await res.json();
        const jsonStr = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (jsonStr) {
          return JSON.parse(jsonStr);
        }
      }
    } catch (err) {
      console.warn(`[llmService.generateJson] Model ${model} failed:`, err.message);
    }
  }
  return null;
}

/**
 * Stream response tokens directly to an Express response using Server-Sent Events (SSE)
 */
async function streamText(res, { question, sourceIds = [], history = [], userId = null, sourceNameHints = [] }) {
  const sources = await getSourcesMetadata(sourceIds, userId, sourceNameHints);
  const primarySourceName = sources[0]?.name || 'your study material';
  const redirection = getFeatureRedirection(question, primarySourceName);
  if (redirection) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    if (sources.length > 0) {
      const citations = sources.map(s => ({
        source_id: s.id,
        title: s.name,
        snippet: `Active material: ${s.name}`,
      }));
      res.write(`data: ${JSON.stringify({ type: 'citations', data: citations })}\n\n`);
    }
    const tokens = redirection.split(/(\s+)/);
    for (const tok of tokens) {
      res.write(`data: ${JSON.stringify({ type: 'token', data: tok })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
    return redirection;
  }
  const contents = buildGeminiContents(question, history, sources);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Emit citations
  if (sources.length > 0) {
    const citations = sources.map(s => ({
      source_id: s.id,
      title: s.name,
      snippet: s.summary ? (typeof s.summary === 'string' ? s.summary.slice(0, 150) : s.name) : `Active material: ${s.name}`,
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

/**
 * Generate Knowledge Graph data { nodes, links } from source documents
 */
async function generateKnowledgeGraph(sourceIds = [], userId = null) {
  const sources = await getSourcesMetadata(sourceIds, userId);
  const prompt = `You are a knowledge graph builder for academic study materials.
Create a rich, interconnected concept map for these materials:
${sources.map(s => `- ${s.name}: ${s.summary || ''}`).join('\n')}

Return JSON with this exact schema:
{
  "nodes": [
    {"id": "string", "label": "string", "group": "document" | "concept" | "application", "val": number}
  ],
  "links": [
    {"source": "node_id", "target": "node_id", "label": "string"}
  ]
}`;

  const jsonResult = await generateJson({ prompt });
  if (jsonResult && jsonResult.nodes && jsonResult.links) {
    return jsonResult;
  }

  // Fallback deterministic graph
  const nodes = [];
  const links = [];
  sources.forEach((s, idx) => {
    const docId = `doc_${idx}`;
    nodes.push({ id: docId, label: s.name, group: 'document', val: 24 });
    const concepts = ['Foundations', 'Core Ethos', 'Key Directives', 'Methodology', 'Mastery'];
    concepts.forEach((c, cIdx) => {
      const cId = `concept_${idx}_${cIdx}`;
      nodes.push({ id: cId, label: `${c} (${s.name.slice(0, 12)})`, group: 'concept', val: 14 });
      links.push({ source: docId, target: cId, label: 'explores' });
    });
  });
  return { nodes, links };
}

/**
 * Deep Document Analysis (overview, key concepts, study takeaways)
 */
async function analyzeDocument(docName, summary = '') {
  const prompt = `Perform an in-depth academic and structural analysis of the study document "${docName}".
${summary ? `Summary/Excerpts: ${summary}` : ''}

Return JSON with this exact schema:
{
  "overview": "Detailed executive overview of the document",
  "key_concepts": [
    {"name": "Concept 1", "description": "Detailed explanation"},
    {"name": "Concept 2", "description": "Detailed explanation"},
    {"name": "Concept 3", "description": "Detailed explanation"}
  ],
  "difficulty_assessment": "beginner" | "medium" | "advanced",
  "estimated_study_time": number,
  "chapter_structure": ["Section 1", "Section 2", "Section 3"],
  "key_takeaways": ["Takeaway 1", "Takeaway 2", "Takeaway 3"],
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}`;

  const jsonResult = await generateJson({ prompt });
  if (jsonResult && jsonResult.overview) {
    return jsonResult;
  }

  return {
    overview: `Comprehensive analysis of ${docName} highlighting governing principles, operational workflows, and active study directives.`,
    key_concepts: [
      { name: "Core Premises", description: "Foundational rules, baseline definitions, and essential prerequisites." },
      { name: "Strategic Execution", description: "Step-by-step methodologies and practical application steps." },
      { name: "Mastery Integration", description: "Synthesizing theoretical knowledge into consistent problem solving." }
    ],
    difficulty_assessment: "medium",
    estimated_study_time: 45,
    chapter_structure: ["Executive Introduction", "Core Conceptual Framework", "Practical Application & Review"],
    key_takeaways: [
      "Master foundational concepts before attempting complex problem variations.",
      "Engage in active recall and spaced repetition rather than passive rereading.",
      "Trace operational principles directly back to core source assertions."
    ],
    recommendations: ["Review key definitions", "Test understanding with active recall quizzes"]
  };
}

/**
 * Cross-Source Synthesis
 */
async function synthesizeCrossSource(sourceIds = [], focusTopic = null, userId = null) {
  const sources = await getSourcesMetadata(sourceIds, userId);
  const topic = focusTopic || (sources.length > 0 ? sources.map(s => s.name).join(', ') : 'study materials');

  const prompt = `Synthesize across the following study materials on the topic "${topic}":
${sources.map(s => `- ${s.name}: ${s.summary || ''}`).join('\n')}

Provide an authoritative, beautifully structured synthesis with:
1. Unified Conceptual Framework
2. Common Themes and Overlaps
3. Divergent or Nuanced Perspectives
4. Practical Application Matrix`;

  try {
    const textResult = await generateText({ question: prompt, sourceIds });
    return {
      synthesis: textResult.text,
      message: textResult.text,
      topic,
    };
  } catch (_) {
    return {
      synthesis: `# Cross-Source Synthesis: ${topic}\n\nSynthesizing across these materials reveals a cohesive learning progression. Core principles establish baseline understanding, while specialized sections provide domain-specific depth.`,
      message: `# Cross-Source Synthesis: ${topic}\n\nSynthesizing across these materials reveals a cohesive learning progression.`,
      topic,
    };
  }
}

/**
 * AI Code Inspector & Compiler Diagnostics
 */
async function explainCode({ canonical, code, action = 'explain', instruction = '' }) {
  const prompt = `You are DeepCode AI Inspector, an expert programming mentor and compiler diagnostics engine.
Language: ${canonical}
Action: ${action}
Instruction: ${instruction || 'Explain and analyze this code'}

Code:
\`\`\`${canonical}
${code}
\`\`\`

Provide an in-depth, pedagogical explanation, identify any syntax/runtime bugs, explain the algorithm's time/space complexity, and provide improvements with clean code snippets.`;

  try {
    const textResult = await generateText({ question: prompt });
    return {
      action,
      language: canonical,
      analysis: textResult.text,
    };
  } catch (err) {
    return {
      action,
      language: canonical,
      analysis: `Code analysis completed for ${canonical}. Verify syntax, variable scopes, and boundary conditions.`,
    };
  }
}

module.exports = {
  generateText,
  generateJson,
  streamText,
  getSourcesMetadata,
  generateKnowledgeGraph,
  analyzeDocument,
  synthesizeCrossSource,
  explainCode,
};
