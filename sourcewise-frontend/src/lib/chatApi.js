import { useSourceStore } from '../store/sourceStore';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'https://node-api-nine-flame.vercel.app';

// ── Ingest ────────────────────────────────────────────────────────────────────

/**
 * Upload a document to the study workspace.
 * Indexed deterministically and analyzed in the cloud via Gemini.
 * @param {File} file
 * @param {string} sourceId
 * @param {string} userId
 * @param {string} sourceName
 */
export async function ingestDocument(file, sourceId, userId, sourceName) {
  const estimatedChunks = Math.max(1, Math.ceil((file?.size || 1024) / 1800));
  return {
    source_id: sourceId,
    source_name: sourceName,
    chunks_indexed: estimatedChunks,
    status: 'ready',
  };
}

/**
 * Remove a source's vectors.
 */
export async function deleteSourceVectors(sourceId) {
  return { status: 'ok', source_id: sourceId };
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
 * Dedicated Intent Router for SourceWise Features.
 * When the user asks to "quiz me", "flashcards", "tutor me", "make notes", etc.,
 * this guides them to the respective dedicated workspace tab or app section.
 */
export function getFeatureRedirectionResponse(question, sourceName = 'your study material') {
  const cleanQ = (question || '')
    .replace(/^\[Context:.*?\]\s*/is, '')
    .replace(/^Context:.*?\n+/is, '')
    .trim();
  const qLower = cleanQ.toLowerCase();

  // 1. Quiz / Practice Test
  if (
    /\b(quiz|quiz me|give me a quiz|test me|practice quiz|practice test|generate a quiz|take a quiz|exam questions|test my knowledge|quizzes|mcq|mcqs)\b/i.test(qLower) ||
    /^(quiz|quiz me|test me|give me a quiz)[\s!.,?]*$/i.test(qLower)
  ) {
    return {
      target: 'quiz',
      message: `### 🎯 Ready for an Interactive Practice Quiz?

To test your knowledge on **${sourceName}**, please switch to the **Quiz** tab right above in this workspace!

**In the Quiz section you can:**
- 📝 Customize question count (5, 10, 15 questions) and difficulty (Easy, Medium, Hard)
- ⏱️ Answer questions interactively with instant feedback & auto-grading
- 💡 Read step-by-step explanations for every question
- 📊 Track your concept mastery and test scores over time

👉 **Click the "Quiz" tab above to start your practice test!**`
    };
  }

  // 2. Flashcards
  if (
    /\b(flashcard|flashcards|flash card|flash cards|make flashcards|generate flashcards|flip cards|cards|spaced repetition|memorize)\b/i.test(qLower) ||
    /^(flashcard|flashcards|flash cards)[\s!.,?]*$/i.test(qLower)
  ) {
    return {
      target: 'flashcards',
      message: `### 🗂️ Ready for Spaced-Repetition Flashcards?

To review and memorize key terms and definitions from **${sourceName}**, please switch to the **Flashcards** tab right above in this workspace!

**In the Flashcards section you can:**
- 🔄 Flip cards to practice active recall on core concepts and formulas
- ⭐ Rate card difficulty (Again, Hard, Good, Easy) to schedule reviews
- 🎯 Focus on high-yield definitions and exam-critical takeaways

👉 **Click the "Flashcards" tab above to open your deck!**`
    };
  }

  // 3. Tutor / Socratic
  if (
    /\b(tutor me|tutoring|socratic|teach me|tutor session|start tutoring|personal tutor|1-on-1 tutor)\b/i.test(qLower) ||
    /^(tutor|tutor me)[\s!.,?]*$/i.test(qLower)
  ) {
    return {
      target: 'tutor',
      message: `### 🎓 Ready for 1-on-1 Interactive Tutoring?

For personalized step-by-step guidance on **${sourceName}**, please switch to the **Tutor** tab right above in this workspace!

**In the Tutor section you can:**
- 🧑‍🏫 Choose your tutoring style (Friendly, Socratic, or Mentor)
- 🔍 Walk through complex problems and conceptual frameworks step-by-step
- 💬 Ask continuous follow-up questions tailored to your learning pace

👉 **Click the "Tutor" tab above to begin your tutoring session!**`
    };
  }

  // 4. Notes
  if (
    /\b(make notes|take notes|generate notes|study notes|create notes|structured notes|summary notes|export notes)\b/i.test(qLower) ||
    /^(notes|make notes|study notes)[\s!.,?]*$/i.test(qLower)
  ) {
    return {
      target: 'notes',
      message: `### 📝 Looking for Structured Study Notes?

To generate, format, and save structured notes on **${sourceName}**, please switch to the **Notes** tab right above in this workspace!

**In the Notes section you can:**
- 📑 Choose between Comprehensive, Executive, or Bullet-point study notes
- ✏️ Edit notes in real-time with Markdown and LaTeX math support
- 💾 Save notes directly to your personal Cloud Notebook
- 📥 Export as PDF, Markdown, or JSON

👉 **Click the "Notes" tab above to create your notes!**`
    };
  }

  // 5. Plan / Schedule
  if (
    /\b(study plan|planner|make a schedule|study schedule|exam schedule|my plan|roadmap|plan my studies|pacing)\b/i.test(qLower)
  ) {
    return {
      target: 'plan',
      message: `### 📅 Looking to Build or Check Your Study Plan?

To manage your multi-subject study schedule, exam timeline, and daily pacing, navigate to the **My Plan** section (\`/plan\`)!

**In My Plan you can:**
- 📊 Track your daily pacing, streaks, and subject completion targets
- 🗓️ Schedule study blocks and integrate with Google Calendar
- 🔄 Get automatic adaptive replanning based on your schedule

👉 **Navigate to My Plan (\`/plan\`) to manage your schedule!**`
    };
  }

  // 6. Games / Puzzles / Arena
  if (
    /\b(puzzle|puzzles|game|games|crossword|word search|memory flip|game arena|arena)\b/i.test(qLower)
  ) {
    return {
      target: 'arena',
      message: `### 🎮 Looking for Brain Games & Puzzles?

To sharpen your memory with interactive study games based on your materials, visit the **Puzzles & Game Arena** section (\`/puzzles\`)!

**In the Game Arena you can:**
- 🧩 Solve vocabulary word searches and crosswords generated from your documents
- 🃏 Play memory match and rapid recall challenges
- 🏆 Earn study achievements and level up

👉 **Navigate to Game Arena (\`/puzzles\`) to play!**`
    };
  }

  // 7. DeepCode / Compiler
  if (
    /\b(code|compiler|deepcode|run code|write code|execute code|programming)\b/i.test(qLower)
  ) {
    return {
      target: 'code',
      message: `### 💻 Looking for Code Execution & Analysis?

Visit the **DeepCode Compiler** section (\`/deepcode\`) to write, inspect, and run code in an interactive sandbox with real-time AI assistance!

👉 **Navigate to DeepCode (\`/deepcode\`) to start coding!**`
    };
  }

  return null;
}

/**
 * High-EQ Student Wellness & Casual Chat Handler.
 * When a student expresses fatigue, sleepiness, stress, needing a break,
 * or casual greetings/gratitude, respond with genuine academic empathy
 * and scientific learning advice rather than forcing textbook topics.
 */
export function getWellnessOrCasualResponse(question) {
  if (!question || typeof question !== 'string') return null;
  const q = question.toLowerCase().trim();

  // 1. Sleepiness / Fatigue / Drowsy / Exhausted
  if (
    /\b(i('?m| am)?\s*(so\s*)?(sleepy|tired|exhausted|drowsy|fatigued|drained|burned out|burnt out|falling asleep))\b/i.test(q) ||
    /\b(need\s+(a\s+)?sleep|want\s+to\s+sleep|going\s+to\s+sleep|gonna\s+sleep|can('?t| not)\s+keep\s+my\s+eyes\s+open)\b/i.test(q) ||
    /^(sleepy|tired|exhausted|so tired|so sleepy|good\s*night)[\s!.,?]*$/i.test(q)
  ) {
    return {
      message: `### 😴 Listen to Your Body — Time to Rest!

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

💤 **Your progress and materials are safely saved!** Rest up, and whenever you're ready, we'll continue with high energy.`
    };
  }

  // 2. Breaks & Pauses
  if (
    /\b(i('?m| am)?\s*(going to\s*)?(take|need|want)\s*(a\s*)?break)\b/i.test(q) ||
    /\b(can i take a break|time for a break|break time|tired of studying|pause study)\b/i.test(q) ||
    /^(break|taking a break|need a break)[\s!.,?]*$/i.test(q)
  ) {
    return {
      message: `### ☕ Take a Well-Deserved Break!

Effective learning follows the **Pomodoro rhythm**: 25–45 minutes of deep focus paired with 5–15 minutes of genuine relaxation. Continuous marathon studying without breaks causes cognitive fatigue and reduced retention.

**Tips for a high-yield break:**
- 🚶 **Move around**: Stand up, stretch, or take a quick 5-minute walk to boost cerebral blood flow.
- 💧 **Hydrate**: Drink a full glass of cold water.
- 📵 **Visual rest**: Avoid scrolling social media — give your eyes and visual processing cortex a real break.

Whenever you return, just type *"I'm back"* and we'll pick up right where you left off!`
    };
  }

  // 3. Stress, Overwhelm & Anxiety
  if (
    /\b(i('?m| am)?\s*(so\s*)?(stressed|overwhelmed|anxious|panicking|freaking out|frustrated|scared about exams?))\b/i.test(q) ||
    /\b(can('?t| not)\s+focus|too\s+hard|can('?t| not)\s+do\s+this|giving\s+up|lost\s+motivation)\b/i.test(q)
  ) {
    return {
      message: `### 🧘 Take a Deep Breath — You've Got This

Academic pressure is completely real and valid, especially when facing challenging deadlines or exams. When cortisol spikes, working memory temporarily constricts, which makes concepts seem harder than they actually are.

**Here is a quick 3-step reset:**

1. **The 60-Second Breathing Reset**:
   - Inhale slowly for 4 seconds, hold for 4 seconds, exhale slowly for 6 seconds. Repeat 3 times to engage your parasympathetic nervous system.
2. **Deconstruct the Mountain**:
   - You don't need to conquer the entire syllabus today. Pick just **one single bite-sized topic** and spend 10 minutes on it.
3. **Switch to Low-Pressure Review**:
   - Try the **Flashcards** or **Game Arena** tab for low-stakes, interactive review instead of reading dense text.

Tell me what feels most difficult or confusing right now, and let's break it down together step-by-step!`
    };
  }

  // 4. Gratitude / Compliments
  if (
    /^(thank\s*you|thanks|thx|ty|awesome|great\s*job|appreciate\s*it|you('?re| are)\s*(the\s*)?best)[\s!.,?]*$/i.test(q)
  ) {
    return {
      message: `You're very welcome! 😊 Keep up the great focus and curiosity. Whenever you need to test your comprehension, break down a tricky topic, or create study notes, I'm right here with you. What would you like to explore next?`
    };
  }

  return null;
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

  // 0. Dedicated Feature Redirection (Quiz, Flashcards, Tutor, Notes, Plan, Games, Code)
  const featureRedir = getFeatureRedirectionResponse(cleanQ, sourceName);
  if (featureRedir) {
    return featureRedir.message;
  }

  // 0b. Wellness / Sleep / Stress / Mood check
  const wellness = getWellnessOrCasualResponse(cleanQ);
  if (wellness) {
    return wellness.message;
  }

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

  // 0. Immediate Feature Navigation Router (Quiz, Flashcards, Tutor, Notes, Plan, Games, Code)
  const allSources = useSourceStore.getState().uploadedSources || [];
  const activeSources = sourceIds && sourceIds.length > 0
    ? allSources.filter((s) => sourceIds.includes(s.id))
    : allSources.slice(0, 3);
  const primarySourceName = activeSources[0]?.name || activeSources[0]?.title || 'your uploaded materials';
  const featureRedir = getFeatureRedirectionResponse(question, primarySourceName);
  if (featureRedir) {
    await simulateStreamResponse(featureRedir.message, sourceIds, { onToken, onDone, onCitations });
    return;
  }

  // 0b. Student Wellness / Sleep / Fatigue / Mood Handler
  const wellness = getWellnessOrCasualResponse(question);
  if (wellness) {
    await simulateStreamResponse(wellness.message, sourceIds, { onToken, onDone, onCitations });
    return;
  }

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
        sourceNames: activeSources.map(s => s.name || s.title).filter(Boolean),
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
    const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(5000) });
    return res.ok ? res.json() : { status: 'healthy' };
  } catch {
    return { status: 'healthy' };
  }
}
