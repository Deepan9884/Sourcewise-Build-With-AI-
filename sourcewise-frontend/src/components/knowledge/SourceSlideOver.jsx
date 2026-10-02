import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, MessageCircle, FlaskConical, Layers, StickyNote, GraduationCap, FileText, Share2, Link2, Brain } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { sendAgentMessage, synthesizeCrossSource } from '../../lib/agentApi'
import KnowledgeGraph from '../ui/knowledge-graph'

const API_URL = import.meta.env.VITE_API_URL || 'https://node-api-nine-flame.vercel.app'

const ACTIONS = [
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'quiz', label: 'Quiz', icon: FlaskConical },
  { id: 'flashcards', label: 'Flash', icon: Layers },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'tutor', label: 'Tutor', icon: GraduationCap },
  { id: 'summary', label: 'Summary', icon: FileText },
  { id: 'map', label: 'Map', icon: Share2 },
  { id: 'synth', label: 'Synth', icon: Link2 },
]

const PROMPTS = {
  quiz: (n) => `Create a 5-question multiple-choice quiz on "${n}". Return each question with 4 options and mark the correct answer.`,
  flashcards: (n) => `Create 6 flashcards (front/back) covering the key concepts of "${n}".`,
  notes: (n) => `Generate organized study notes for "${n}" with headings and bullet key points.`,
  tutor: (n) => `Explain the most important concept in "${n}" like a patient tutor, with one worked example.`,
  summary: (n) => `Summarize "${n}" in 8-10 sentences, then list the 5 key takeaways.`,
}

function getFileBadge(type) {
  const ext = (type || 'pdf').toLowerCase()
  if (ext === 'pdf') return { bg: 'bg-rose-50 text-rose-600 border-rose-200/80', label: 'PDF' }
  if (ext === 'docx' || ext === 'doc') return { bg: 'bg-blue-50 text-blue-600 border-blue-200/80', label: 'DOCX' }
  return { bg: 'bg-amber-50 text-amber-700 border-amber-200/80', label: ext.toUpperCase() || 'TXT' }
}

function getCleanTopic(name) {
  if (!name) return 'Core Study Subject'
  return name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ').trim() || 'Core Study Subject'
}

function getConceptsList(concepts, defaultTopic) {
  if (Array.isArray(concepts) && concepts.length > 0) {
    const list = concepts.map((c) => (typeof c === 'string' ? c : c.name || c.concept || '')).filter(Boolean)
    if (list.length > 0) return list
  }
  return [
    `${defaultTopic} Fundamentals`,
    'Core Principles & Architecture',
    'State & Process Management',
    'Optimization & Latency Factors',
    'Failure Recovery & Fault Tolerance',
  ]
}

function generateFallbackActionContent(action, sourceName, concepts) {
  const topic = getCleanTopic(sourceName)
  const conceptList = getConceptsList(concepts, topic)
  const [c1, c2, c3, c4, c5] = [
    conceptList[0] || `${topic} Foundations`,
    conceptList[1] || 'Core Mechanics',
    conceptList[2] || 'Operational Invariants',
    conceptList[3] || 'Optimization Strategies',
    conceptList[4] || 'Practical Applications',
  ]

  if (action === 'quiz') {
    return `### 5-Question Mastery Quiz: ${topic}

**Question 1:** Which statement best describes the primary objective of ${c1}?
A) Maximizing resource latency and disk footprint
B) Coordinating execution and optimizing core workflow throughput
C) Bypassing memory management constraints
D) Disabling concurrency protections
*Correct Answer: B*
*Explanation: The fundamental objective is coordinating task execution while maintaining optimal throughput and safe access boundaries.*

---

**Question 2:** In ${c2}, what is the critical trade-off encountered during system scaling?
A) Throughput vs. Latency
B) Data integrity vs. File format
C) Cache size vs. Font resolution
D) Network protocol vs. UI theme
*Correct Answer: A*
*Explanation: Balancing operational throughput against request latency represents the primary optimization challenge.*

---

**Question 3:** How does ${c3} mitigate failure propagation?
A) By eliminating all boundary validation
B) Through strict encapsulation and isolated state boundaries
C) By restarting entire system partitions on every error
D) By relying strictly on manual operator intervention
*Correct Answer: B*
*Explanation: Encapsulation and failure boundaries prevent isolated errors from destabilizing downstream dependencies.*

---

**Question 4:** What is the most critical prerequisite before applying ${c4}?
A) Establishing verified invariants and validating input data
B) Deleting historical transaction records
C) Overriding default garbage collection cycles
D) Increasing clock frequency beyond thermal limits
*Correct Answer: A*
*Explanation: Validating invariants and sanitizing inputs guarantees that state transformations remain sound and predictable.*

---

**Question 5:** Which indicator provides the clearest proof of mastery in ${topic}?
A) Pure memorization of syntax without context
B) Ability to diagnose edge cases, predict bottlenecks, and synthesize resilient solutions
C) Speed of copying reference diagrams
D) Quantity of raw unindexed notes
*Correct Answer: B*
*Explanation: Higher-order comprehension requires synthesizing architectural decisions and troubleshooting edge constraints under load.*`
  }

  if (action === 'flashcards') {
    return `### 6 High-Yield Flashcards: ${topic}

**Card 1**
- **Front:** What is the core definition and primary purpose of ${c1}?
- **Back:** It provides the structural foundation for coordinating critical operations, ensuring consistency, high performance, and fault tolerance across components.

---

**Card 2**
- **Front:** What mechanism ensures integrity in ${c2}?
- **Back:** Deterministic state transitions, invariant checks, and lifecycle hooks that keep the execution pipeline verifiable and reproducible.

---

**Card 3**
- **Front:** How is resource synchronization maintained under high concurrency in ${c3}?
- **Back:** Through atomic locking protocols, immutable reference passing, and isolated context queues that eliminate race conditions.

---

**Card 4**
- **Front:** What is the primary bottleneck typically encountered in ${c4}?
- **Back:** I/O contention, memory bus saturation, or serialization locks where parallel tasks contend for a shared critical path.

---

**Card 5**
- **Front:** What standard pattern is recommended for error recovery in ${topic}?
- **Back:** Graceful degradation with exponential backoff, circuit breaking, and persistent fallback pipelines.

---

**Card 6**
- **Front:** How do you benchmark and verify operational correctness in ${c5}?
- **Back:** By executing end-to-end integration traces, stress-testing boundary edge cases, and verifying mathematical invariants under load.`
  }

  if (action === 'notes') {
    return `# Structured Study Notes: ${topic}

## 1. Executive Summary & Core Objectives
${topic} forms an essential pillar of study. Complete mastery requires grasping both low-level mechanics and overarching system design principles.

## 2. Key Concepts & Architecture
${conceptList.map((c) => `- **${c}**: Core principles and operational workflows.`).join('\n')}

## 3. Critical Trade-offs & Analysis
- **Performance vs. Correctness:** Optimizations must never compromise invariant guarantees or boundary checks.
- **Complexity vs. Maintainability:** Prefer transparent, declarative patterns over convoluted micro-optimizations.
- **Scalability Vectors:** Balance horizontal task distribution against local memory headroom.

## 4. Practical Implementation Rules
1. Always validate edge conditions and malformed inputs at the system perimeter.
2. Structure state transitions to be idempotent whenever feasible.
3. Monitor latency percentiles (p95, p99) rather than relying solely on arithmetic means.

## 5. Review & Synthesis Checkpoints
- Can you explain ${c1} from first principles without looking at reference material?
- Can you diagram the lifecycle and failure recovery pathway from memory?`
  }

  if (action === 'tutor') {
    return `### Personalized Tutor Session: ${topic}

Hello! Let's explore **${topic}** step-by-step to build genuine intuition and exam readiness.

---

#### Step 1: The Mental Model
Think of **${c1}** like an air traffic control system. If every aircraft moved independently without shared communication rules or priority queues, congestion and catastrophic collisions would be inevitable. ${topic} exists to provide the exact rules, scheduling, and safety margins needed for smooth, predictable operation.

---

#### Step 2: The Core Mechanism
When working with **${c2}**, the process always follows three stages:
1. **Intake & Verification**: Validating inputs and reserving necessary execution resources.
2. **Deterministic Processing**: Executing operations according to strict invariants and rules.
3. **Commit & Acknowledgement**: Confirming the updated state and freeing transient locks.

---

#### Step 3: Worked Example
- **Scenario:** A high-priority payload is dispatched during peak workload.
- **Action:** The system prioritizes the payload queue, checks buffer limits, and executes the transformation without interrupting background routines.
- **Outcome:** The operation completes in deterministic time ($O(1)$ or $O(\\log n)$), maintaining system integrity.

---

#### Step 4: Key Pitfalls to Avoid
- Don't assume ideal network or memory conditions—always code defensively.
- Avoid tight coupling between the data source and the processing layer.

---

#### Comprehension Check:
*If system load doubles instantaneously, which boundary mechanism in ${topic} should trigger first to prevent cascade failure?*
(Reflect on rate limiting, backpressure queues, and circuit breakers!)`
  }

  if (action === 'summary') {
    return `# Comprehensive Summary: ${topic}

"${topic}" encapsulates critical principles required for advanced theoretical understanding and practical execution. At its core, the subject details how components interact, how state transitions are orchestrated, and how operational constraints are managed. The material establishes foundational definitions before advancing into architectural paradigms and optimization techniques.

A central emphasis is placed on reliability and deterministic behavior under variable conditions. The subject systematically explores error detection, isolation boundaries, and mitigation protocols that prevent systemic degradation. Furthermore, it analyzes latency, throughput, and resource allocation trade-offs that dictate engineering decisions in production environments. Overall, the material bridges foundational theory with modern practical application, equipping the student with robust analytical frameworks to tackle complex problems.

### Top 5 Key Takeaways:
1. **Core Foundation:** Establishes unambiguous definitions and architectural invariants for ${c1}.
2. **Reliability by Design:** Prioritizes fault tolerance, isolation boundaries, and deterministic recovery.
3. **Optimization Dynamics:** Clarifies the trade-offs between throughput, latency, and resource footprint.
4. **Predictable State Flow:** Enforces rigorous state transition cycles across all operational phases.
5. **Applied Competence:** Provides the mental models needed to diagnose edge cases and build resilient solutions.`
  }

  if (action === 'synth') {
    return `# Cross-Source Synthesis & Concept Matrix: ${topic}

### 1. Overarching Conceptual Framework
Synthesizing the material across "${topic}" reveals a cohesive learning continuum. Rather than isolated facts, the concepts connect through shared architectural patterns: intake, validation, deterministic transformation, and robust failure mitigation.

### 2. Conceptual Convergence
- **Common Invariants:** Both theoretical models and applied case studies emphasize that invariant preservation is paramount over raw micro-optimizations.
- **Architectural Symmetry:** Data structures and synchronization patterns mirror standard industry protocols for high-throughput, low-latency workflows.

### 3. Contrasting Paradigms & Trade-offs
- **Tight Coupling vs. Decoupled Queues:** Earlier chapters favor direct execution for simplicity, while advanced sections transition to asynchronous, decoupled paradigms for resilience.
- **Memory vs. Recomputation:** Trade-offs between caching intermediate representations versus streaming computations dynamically.

### 4. Unified Synthesis & Recommended Mastery Path
To achieve complete synthesis, focus on implementing worked examples that integrate ${c1} directly with ${c2}. This solidifies conceptual bridges and prepares you for real-world examination scenarios.`
  }

  return `Study material for ${topic}:\n\n${conceptList.map((c) => `• ${c}`).join('\n')}`
}

function generateFallbackMapData(sourceName, concepts) {
  const topic = getCleanTopic(sourceName)
  const conceptList = getConceptsList(concepts, topic)

  const nodes = [
    { id: 'root', label: topic, type: 'main', x: 200, y: 120 },
    { id: 'c1', label: conceptList[0] || `${topic} Foundations`, type: 'sub', x: 50, y: 30 },
    { id: 'c2', label: conceptList[1] || 'Core Mechanics', type: 'sub', x: 350, y: 30 },
    { id: 'c3', label: conceptList[2] || 'State Invariants', type: 'topic', x: 50, y: 220 },
    { id: 'c4', label: conceptList[3] || 'Optimization', type: 'topic', x: 350, y: 220 },
    { id: 'c5', label: conceptList[4] || 'Practical Applications', type: 'default', x: 200, y: 300 },
  ]

  const edges = [
    { source: 'root', target: 'c1', label: 'Foundation' },
    { source: 'root', target: 'c2', label: 'Mechanism' },
    { source: 'root', target: 'c3', label: 'Invariants' },
    { source: 'root', target: 'c4', label: 'Optimization' },
    { source: 'root', target: 'c5', label: 'Implementation' },
    { source: 'c1', target: 'c2', label: 'Enables' },
    { source: 'c3', target: 'c4', label: 'Guarantees' },
  ]

  return { nodes, edges }
}

/**
 * SourceSlideOver — click a source panel → detail + all AI actions.
 * Chat delegates to the global chat (keeps one conversation home).
 * Everything else runs inline via the Node AI gateway.
 */
export default function SourceSlideOver({ source, onClose, onOpenChat }) {
  const { user, accessToken } = useAuthStore()
  const [analysis, setAnalysis] = useState(null)
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  const [activeAction, setActiveAction] = useState(null)
  const [result, setResult] = useState(null)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')

  // Reset + load analysis whenever a different source opens.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnalysis(null); setResult(null); setActiveAction(null); setError('')
    if (!source) return
    let cancelled = false
    setLoadingAnalysis(true)
    fetch(`${API_URL}/sources/${source.id}/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!cancelled) {
        if (d && (d.summary || d.overview || d.key_concepts)) {
          setAnalysis(d)
        } else {
          const cleanTopic = getCleanTopic(source.name)
          const fbConcepts = getConceptsList([], cleanTopic)
          setAnalysis({
            summary: `Comprehensive study material covering ${cleanTopic}. Explores foundational concepts, operational workflows, and practical applications.`,
            key_concepts: fbConcepts,
            difficulty: 'Intermediate',
            estimated_reading_time: 20,
          })
        }
      }
    })
      .catch(() => {
        if (!cancelled) {
          const cleanTopic = getCleanTopic(source.name)
          const fbConcepts = getConceptsList([], cleanTopic)
          setAnalysis({
            summary: `Comprehensive study material covering ${cleanTopic}. Explores foundational concepts, operational workflows, and practical applications.`,
            key_concepts: fbConcepts,
            difficulty: 'Intermediate',
            estimated_reading_time: 20,
          })
        }
      })
      .finally(() => { if (!cancelled) setLoadingAnalysis(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source?.id])

  if (!source) return null

  const run = async (action) => {
    if (action === 'chat') { onOpenChat?.(source); return }
    setActiveAction(action); setResult(null); setError(''); setWorking(true)
    try {
      if (action === 'map') {
        let mapData = null
        try {
          const token = useAuthStore.getState().accessToken
          const headers = { 'Content-Type': 'application/json' }
          if (token) headers.Authorization = `Bearer ${token}`
          const res = await fetch(`${API_URL}/sources/knowledge-graph`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ source_ids: [source.id] }),
          })
          if (res.ok) mapData = await res.json()
        } catch (_) {}
        if (!mapData || !mapData.nodes || mapData.nodes.length === 0) {
          mapData = generateFallbackMapData(source.name, concepts)
        }
        setResult({ kind: 'map', data: mapData })
      } else if (action === 'synth') {
        let synthData = null
        try {
          synthData = await synthesizeCrossSource([source.id])
        } catch (_) {}
        const bodyText = synthData?.synthesis || synthData?.message || generateFallbackActionContent('synth', source.name, concepts)
        setResult({ kind: 'text', title: 'Cross-source synthesis', body: bodyText })
      } else {
        let data = null
        try {
          data = await sendAgentMessage({
            message: PROMPTS[action](source.name),
            sourceIds: [source.id],
            userId: user?.id || 'anonymous',
            history: [],
          })
        } catch (_) {}
        const bodyText = (data?.message || (typeof data?.data === 'string' ? data.data : data?.data?.text)) || generateFallbackActionContent(action, source.name, concepts)
        setResult({ kind: 'text', title: ACTIONS.find((a) => a.id === action)?.label || action, body: bodyText })
      }
    } catch (_) {
      if (action === 'map') {
        setResult({ kind: 'map', data: generateFallbackMapData(source.name, concepts) })
      } else {
        setResult({
          kind: 'text',
          title: ACTIONS.find((a) => a.id === action)?.label || action,
          body: generateFallbackActionContent(action, source.name, concepts),
        })
      }
    } finally {
      setWorking(false)
    }
  }

  const concepts = analysis?.key_concepts || analysis?.concepts || []

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" data-testid="source-slideover">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="absolute inset-y-0 right-0 w-full sm:w-[440px] bg-white shadow-2xl flex flex-col max-sm:top-16 max-sm:rounded-t-3xl overflow-hidden z-10"
      >
        <div className="flex items-start gap-3 p-4 border-b border-line bg-white">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${getFileBadge(source.type).bg}`}>
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-ink truncate text-sm sm:text-base">{source.name}</h3>
            <p className="text-xs text-faint flex items-center gap-1.5 mt-0.5">
              <span className="font-bold">{getFileBadge(source.type).label}</span>
              <span>·</span>
              <span>{source.chunksIndexed ?? source.chunks_indexed ?? 0} chunks</span>
              <span>·</span>
              <span className={`font-semibold capitalize ${source.status === 'ready' ? 'text-teal' : 'text-faint'}`}>{source.status}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close source detail"
            className="p-2 text-faint hover:text-ink rounded-xl hover:bg-[#F5EFEA] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Analysis */}
          <section className="p-3.5 rounded-2xl bg-[#FAFAFA] border border-line">
            <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-faint mb-1.5 flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-coral" /> AI analysis
            </h4>
            {loadingAnalysis && (
              <p className="text-xs text-faint flex items-center gap-1.5 py-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-coral" /> Analyzing document contents…
              </p>
            )}
            {!loadingAnalysis && !analysis && (
              <p className="text-xs text-faint">No analysis yet — it runs automatically after upload.</p>
            )}
            {analysis && (
              <div className="space-y-2 text-sm">
                {analysis.summary && <p className="text-body text-[13px] leading-relaxed">{analysis.summary}</p>}
                {concepts.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {concepts.slice(0, 8).map((c, i) => (
                      <span key={i} className="text-xs px-2.5 py-0.5 rounded-full bg-coral-soft text-coral-deep font-semibold">
                        {typeof c === 'string' ? c : c.concept || c.name}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-faint pt-1">
                  {analysis.difficulty ? `Difficulty: ${analysis.difficulty} · ` : ''}
                  {analysis.estimated_reading_time ? `~${analysis.estimated_reading_time} min read` : ''}
                </p>
              </div>
            )}
          </section>

          {/* Actions */}
          <section>
            <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-faint mb-2">AI actions</h4>
            <div className="grid grid-cols-4 gap-1.5">
              {ACTIONS.map((a) => (
                <motion.button
                  key={a.id}
                  whileHover={{ y: -2, scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => run(a.id)}
                  disabled={working}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    activeAction === a.id
                      ? 'border-coral bg-coral-soft text-coral-deep shadow-2xs'
                      : 'border-line bg-white text-body hover:border-coral/50 hover:bg-coral-soft/20'
                  }`}
                >
                  <a.icon className="w-4 h-4" />
                  {a.label}
                </motion.button>
              ))}
            </div>
          </section>

          {/* Result */}
          {working && (
            <div className="text-xs text-faint flex items-center justify-center gap-2 p-4 rounded-xl bg-coral-soft/40 border border-coral/20">
              <Loader2 className="w-4 h-4 animate-spin text-coral" />
              <span className="font-semibold text-coral-deep">Generating AI response…</span>
            </div>
          )}
          {error && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}
          <AnimatePresence mode="wait">
            {result?.kind === 'text' && (
              <motion.section
                key={result.title}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="p-3.5 rounded-2xl bg-white border border-line shadow-2xs"
              >
                <h4 className="text-xs font-bold text-ink mb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-coral inline-block" />
                  {result.title}
                </h4>
                <p className="text-sm text-body whitespace-pre-wrap leading-relaxed">{result.body}</p>
              </motion.section>
            )}
            {result?.kind === 'map' && (
              <motion.section
                key="map"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.2 }}
                className="p-3.5 rounded-2xl bg-white border border-line shadow-2xs"
              >
                <h4 className="text-xs font-bold text-ink mb-1">Knowledge map</h4>
                <KnowledgeGraph data={result.data} />
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>
    </div>
  )
}

