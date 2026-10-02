import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Compass, CheckCircle2, Play, Lock, Sparkles, BookOpen,
  ArrowRight, Award, Zap, ChevronRight, Layers, Flame, Target, Map
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { usePlannerStore } from '../../store/plannerStore'

export const ROADMAP_TRACKS = [
  {
    id: 'track-ml',
    title: 'Autonomous AI & Machine Learning Engineer',
    subtitle: 'From Multivariable Calculus to Generative Pre-trained Transformers',
    badge: 'Primary Career Track',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    color: '#6366F1',
    progress: 78,
    totalHours: 120,
    completedHours: 94,
    stages: [
      {
        stageName: 'Stage 1: Mathematical & Probabilistic Foundations',
        status: 'completed',
        nodes: [
          {
            id: 'ml-1',
            title: 'Multivariable Calculus & Gradient Vectors',
            desc: 'Partial derivatives, Jacobians, Hessians, and loss surface geometry.',
            status: 'completed',
            score: 95,
            hours: 12,
            concepts: ['Partial Derivatives', 'Gradient Vector', 'Hessian Matrix', 'Convexity'],
            source: 'Stanford CS229 / Axler'
          },
          {
            id: 'ml-2',
            title: 'Linear Algebra, Eigenvalues & Spectral Decomposition',
            desc: 'Vector projections, orthonormal bases, eigenvalues, and SVD factoring.',
            status: 'completed',
            score: 88,
            hours: 18,
            concepts: ['Eigenvalues', 'Gram-Schmidt', 'Spectral Theorem', 'SVD'],
            source: 'Linear Algebra Done Right'
          },
          {
            id: 'ml-3',
            title: 'Bayesian Probability & Maximum Likelihood',
            desc: 'Bayes Theorem, Gaussian distributions, and Maximum Likelihood Estimation.',
            status: 'completed',
            score: 91,
            hours: 14,
            concepts: ['Bayes Theorem', 'MLE', 'Gaussian Distributions', 'Prior / Posterior'],
            source: 'Murphy Probabilistic ML'
          }
        ]
      },
      {
        stageName: 'Stage 2: Classical Machine Learning & Optimization',
        status: 'completed',
        nodes: [
          {
            id: 'ml-4',
            title: 'Supervised Regressors & Regularization',
            desc: 'Ordinary least squares, gradient descent variants, L1 Lasso and L2 Ridge penalties.',
            status: 'completed',
            score: 92,
            hours: 15,
            concepts: ['Linear Regression', 'L1 / L2 Regularization', 'Learning Rate Schedules'],
            source: 'Stanford CS229'
          },
          {
            id: 'ml-5',
            title: 'Classification & Support Vector Machines',
            desc: 'Logistic regression, decision boundaries, margin maximization, and kernel tricks.',
            status: 'completed',
            score: 88,
            hours: 16,
            concepts: ['Logistic Regression', 'SVM Margins', 'Kernel Trick', 'Soft Margin'],
            source: 'Stanford CS229'
          },
          {
            id: 'ml-6',
            title: 'Unsupervised Clustering & Dimensionality Reduction',
            desc: 'K-Means centroid convergence and PCA orthogonal variance projections.',
            status: 'in_progress',
            score: 65,
            hours: 12,
            concepts: ['K-Means Clustering', 'PCA Orthogonality', 'Covariance Matrix'],
            source: 'Stanford CS229'
          }
        ]
      },
      {
        stageName: 'Stage 3: Deep Neural Networks & Representation Learning',
        status: 'in_progress',
        nodes: [
          {
            id: 'ml-7',
            title: 'Backpropagation Calculus & Optimization Engines',
            desc: 'Multivariable chain rule, error vectors recurrence, Adam/RMSprop momentum.',
            status: 'in_progress',
            score: 74,
            hours: 16,
            concepts: ['Backpropagation', 'Chain Rule', 'Adam Optimizer', 'Dropout'],
            source: 'Stanford CS229'
          },
          {
            id: 'ml-8',
            title: 'Convolutional Networks & Computer Vision',
            desc: 'Feature maps, receptive fields, residual connections, and ResNet architectures.',
            status: 'upcoming',
            score: null,
            hours: 18,
            concepts: ['Convolutions', 'ResNet Blocks', 'Spatial Hierarchies'],
            source: 'Stanford CS229'
          }
        ]
      },
      {
        stageName: 'Stage 4: Transformers, RAG & Production MLOps',
        status: 'upcoming',
        nodes: [
          {
            id: 'ml-9',
            title: 'Transformer Architecture & Multi-Head Self-Attention',
            desc: 'Scaled dot-product attention, positional encodings, and encoder-decoder pipelines.',
            status: 'upcoming',
            score: null,
            hours: 20,
            concepts: ['Self-Attention', 'Positional Encoding', 'Transformer Blocks'],
            source: 'Week 3 NAS Notes'
          },
          {
            id: 'ml-10',
            title: 'RAG Architectures & Vector Database Embedding Retrieval',
            desc: 'Dense embeddings, ChromaDB vector indexing, semantic search, and reranking.',
            status: 'upcoming',
            score: null,
            hours: 15,
            concepts: ['Vector Embeddings', 'ChromaDB', 'Semantic Chunking', 'Hybrid Search'],
            source: 'SourceWise AI Suite'
          }
        ]
      }
    ]
  },
  {
    id: 'track-dsa',
    title: 'Advanced Data Structures & Algorithms',
    subtitle: 'From Asymptotic Complexity to Dynamic Programming & Segment Trees',
    badge: 'Core Problem Solving',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    color: '#8B5CF6',
    progress: 82,
    totalHours: 90,
    completedHours: 74,
    stages: [
      {
        stageName: 'Stage 1: Algorithmic Complexity & Fundamental Structures',
        status: 'completed',
        nodes: [
          {
            id: 'dsa-1',
            title: 'Asymptotic Analysis & Big-O Foundations',
            desc: 'Master theorem recurrence relations, amortized time analysis, and growth bounds.',
            status: 'completed',
            score: 96,
            hours: 10,
            concepts: ['Big-O Notation', 'Master Theorem', 'Amortized Complexity'],
            source: 'CLRS 4th Edition'
          },
          {
            id: 'dsa-2',
            title: 'Hash Tables, Collision Resolutions & Sets',
            desc: 'Universal hashing, open addressing, Robin Hood probing, and average O(1) lookups.',
            status: 'completed',
            score: 91,
            hours: 12,
            concepts: ['Hash Functions', 'Chaining vs Probing', 'Load Factors'],
            source: 'CLRS 4th Edition'
          }
        ]
      },
      {
        stageName: 'Stage 2: Non-Linear Trees & Advanced Hierarchies',
        status: 'completed',
        nodes: [
          {
            id: 'dsa-3',
            title: 'Balanced Search Trees & Red-Black Rotations',
            desc: 'Binary search tree invariants, left/right tree rotations, and color balancing rules.',
            status: 'in_progress',
            score: 68,
            hours: 16,
            concepts: ['Red-Black Trees', 'Tree Rotations', 'Logarithmic Height'],
            source: 'CLRS 4th Edition'
          },
          {
            id: 'dsa-4',
            title: 'Priority Queues & Binary Heaps',
            desc: 'Max/Min heap construction, heapify sift-down operations, and Dijkstra scheduling.',
            status: 'completed',
            score: 90,
            hours: 10,
            concepts: ['Heap Invariant', 'Heapsort', 'Priority Queues'],
            source: 'CLRS 4th Edition'
          }
        ]
      },
      {
        stageName: 'Stage 3: Graph Traversal & Shortest Path Paradigms',
        status: 'in_progress',
        nodes: [
          {
            id: 'dsa-5',
            title: 'Graph BFS / DFS & Topological Sorting',
            desc: 'Cycle detection in directed graphs, connected components, and dependency ordering.',
            status: 'completed',
            score: 85,
            hours: 14,
            concepts: ['BFS / DFS', 'Topological Sort', 'Cycle Detection'],
            source: 'CLRS 4th Edition'
          },
          {
            id: 'dsa-6',
            title: 'Dynamic Programming on Sequences & Grids',
            desc: 'Memoization vs tabulation, state space reduction, and longest common subsequence.',
            status: 'in_progress',
            score: 71,
            hours: 18,
            concepts: ['DP Subproblems', 'Memoization', 'Space Optimization'],
            source: 'CLRS 4th Edition'
          }
        ]
      }
    ]
  },
  {
    id: 'track-sys',
    title: 'Distributed Systems & Enterprise System Design',
    subtitle: 'Architecting High-Throughput, Fault-Tolerant Distributed Backends',
    badge: 'Architecture Track',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    color: '#0D9488',
    progress: 74,
    totalHours: 85,
    completedHours: 63,
    stages: [
      {
        stageName: 'Stage 1: Scalability Fundamentals & Data Partitioning',
        status: 'completed',
        nodes: [
          {
            id: 'sys-1',
            title: 'Consistent Hashing & Dynamic Ring Partitioning',
            desc: 'Minimizing key reorganization during server churn using virtual node rings.',
            status: 'completed',
            score: 88,
            hours: 10,
            concepts: ['Consistent Hashing', 'Virtual Nodes', 'Hash Ring'],
            source: 'Alex Xu Vol 2'
          },
          {
            id: 'sys-2',
            title: 'Load Balancing & Reverse Proxy Topologies',
            desc: 'L4 vs L7 load balancers, round-robin, least-connections, and health checking.',
            status: 'completed',
            score: 83,
            hours: 8,
            concepts: ['L4 vs L7', 'Round Robin', 'Health Probes'],
            source: 'Alex Xu Vol 2'
          }
        ]
      },
      {
        stageName: 'Stage 2: Storage Scaling & High Availability',
        status: 'in_progress',
        nodes: [
          {
            id: 'sys-3',
            title: 'Database Sharding, Replication & CAP Tradeoffs',
            desc: 'Horizontal partitioning, master-replica sync, and eventual consistency bounds.',
            status: 'in_progress',
            score: 72,
            hours: 14,
            concepts: ['Database Sharding', 'CAP Theorem', 'Read Replicas'],
            source: 'Ramakrishnan DBMS'
          },
          {
            id: 'sys-4',
            title: 'Distributed Rate Limiters & Token Bucket Strategy',
            desc: 'Sliding window counters, Redis atomic scripts, and DDoS protection.',
            status: 'completed',
            score: 85,
            hours: 10,
            concepts: ['Token Bucket', 'Sliding Window', 'Redis Atomicity'],
            source: 'Alex Xu Vol 2'
          }
        ]
      }
    ]
  }
]

export default function LearningRoadmaps() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isDemo = user?.email?.toLowerCase().trim() === 'demo@gmail.com'
  const { plans, subjects } = usePlannerStore()

  const customTracks = useMemo(() => {
    if (isDemo) return ROADMAP_TRACKS
    const list = subjects?.length ? subjects : (plans?.[0]?.subjects || [])
    if (!list || list.length === 0) return []
    return list.map((s, idx) => ({
      id: s.id || `track-${idx}`,
      title: s.subject_name || s.name || `Subject ${idx + 1}`,
      subtitle: `Progressive curriculum pathway for ${s.subject_name || 'Subject'}`,
      badge: `Target ${s.target_mastery || 80}%`,
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      color: s.color || '#0D9488',
      progress: s.current_mastery || 0,
      totalHours: 30,
      completedHours: Math.round(((s.current_mastery || 0) / 100) * 30),
      stages: [
        {
          stageName: 'Stage 1: Core Fundamentals & Concept Mastery',
          status: (s.current_mastery || 0) >= 50 ? 'completed' : 'in_progress',
          nodes: [
            {
              id: `node-${idx}-1`,
              title: `${s.subject_name || 'Subject'} Key Principles`,
              desc: `Core concepts and foundational principles for ${s.subject_name || 'this subject'}.`,
              status: (s.current_mastery || 0) >= 50 ? 'completed' : 'in_progress',
              score: s.current_mastery || 0,
              hours: 12,
              concepts: [s.subject_name || 'Core', 'Theory', 'Practical Application'],
              source: 'Course Material',
            }
          ]
        }
      ]
    }))
  }, [isDemo, subjects, plans])

  const tracksToDisplay = isDemo ? ROADMAP_TRACKS : customTracks
  const [selectedTrackId, setSelectedTrackId] = useState(() => (isDemo ? 'track-ml' : (tracksToDisplay[0]?.id || '')))
  const activeTrack = tracksToDisplay.find(t => t.id === selectedTrackId) || tracksToDisplay[0]

  const handleStudyTopic = (topic, sourceName) => {
    navigate('/knowledge', {
      state: {
        topic: topic,
        source: sourceName,
        aiAction: 'tutor'
      }
    })
  }

  const handlePracticeTopic = (topic) => {
    navigate('/arena', {
      state: {
        topic: topic
      }
    })
  }

  if (tracksToDisplay.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#EDE7E1] shadow-xs p-10 text-center" data-testid="learning-roadmaps-empty">
        <div className="w-12 h-12 rounded-2xl bg-[#F1ECE6] flex items-center justify-center mx-auto mb-3">
          <Map className="w-5 h-5 text-[#8A817B]" />
        </div>
        <p className="font-bold text-[#1E1B16]">No Learning Roadmaps Yet</p>
        <p className="text-sm text-[#8A817B] mt-1 max-w-md mx-auto">
          Create a personalized study plan or upload study materials to generate structured progressive learning pathways.
        </p>
        <div className="mt-5">
          <button
            onClick={() => navigate('/plan')}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#1E1B16] hover:bg-[#C05A35] transition-colors shadow-2xs"
          >
            Create Study Plan
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="learning-roadmaps">
      {/* ── Track Switcher Tabs ── */}
      <div className="flex flex-wrap gap-2.5">
        {tracksToDisplay.map(track => {
          const isSelected = track.id === selectedTrackId
          return (
            <button
              key={track.id}
              onClick={() => setSelectedTrackId(track.id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                isSelected
                  ? 'bg-white border-[#1E1B16] text-[#1E1B16] shadow-sm ring-1 ring-[#1E1B16]/10'
                  : 'bg-white/70 border-[#EDE7E1] text-[#8A817B] hover:text-[#1E1B16] hover:bg-white'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: track.color }}
              />
              <span>{track.title.split(' ')[0]} {track.title.split(' ')[1]}</span>
              <span className="text-[11px] font-extrabold px-1.5 py-0.5 rounded-md bg-[#F1ECE6] text-[#5B544E]">
                {track.progress}%
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Track Hero Banner ── */}
      <div className="bg-white rounded-2xl border border-[#EDE7E1] p-5 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full border ${activeTrack.badgeColor}`}>
                {activeTrack.badge}
              </span>
              <span className="text-xs text-[#8A817B] font-medium">
                {activeTrack.completedHours} of {activeTrack.totalHours} study hours completed
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-display font-bold text-[#1E1B16] tracking-tight">
              {activeTrack.title}
            </h2>
            <p className="text-xs sm:text-sm text-[#5B544E]">
              {activeTrack.subtitle}
            </p>
          </div>

          {/* Progress dial */}
          <div className="flex items-center gap-3 bg-[#FAF8F5] border border-[#EDE7E1] rounded-2xl px-4 py-2.5 shrink-0">
            <div className="relative w-11 h-11">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#E7DCCB" strokeWidth="3.5" />
                <circle
                  cx="18" cy="18" r="14" fill="none"
                  stroke={activeTrack.color}
                  strokeWidth="3.5"
                  strokeDasharray={`${activeTrack.progress * 0.8796} 87.96`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold text-[#1E1B16]">
                {activeTrack.progress}%
              </span>
            </div>
            <div>
              <p className="text-xs font-bold text-[#1E1B16]">Track Velocity</p>
              <p className="text-[11px] text-[#0D9488] font-bold">On Schedule (+3.4/wk)</p>
            </div>
          </div>
        </div>

        {/* Global track progress bar */}
        <div className="mt-4 pt-4 border-t border-[#F1ECE6]">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-[#8A817B]">Overall Mastery Progress</span>
            <span className="font-bold text-[#1E1B16]">{activeTrack.progress}% Mastered</span>
          </div>
          <div className="h-2 bg-[#F1ECE6] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${activeTrack.progress}%`, background: activeTrack.color }}
            />
          </div>
        </div>
      </div>

      {/* ── Stages Timeline & Interactive Nodes ── */}
      <div className="space-y-6">
        {activeTrack.stages.map((stage, sIdx) => {
          const isStageDone = stage.status === 'completed'
          const isStageCurrent = stage.status === 'in_progress'

          return (
            <div
              key={stage.stageName}
              className={`rounded-2xl border transition-all p-5 sm:p-6 ${
                isStageCurrent
                  ? 'bg-white border-[#1E1B16]/20 shadow-md ring-1 ring-[#1E1B16]/5'
                  : 'bg-white/80 border-[#EDE7E1]'
              }`}
            >
              {/* Stage Header */}
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isStageDone
                      ? 'bg-emerald-100 text-emerald-800'
                      : isStageCurrent
                      ? 'bg-indigo-100 text-indigo-800 ring-2 ring-indigo-300'
                      : 'bg-[#F1ECE6] text-[#8A817B]'
                  }`}>
                    {isStageDone ? '✓' : sIdx + 1}
                  </span>
                  <h3 className="font-bold text-sm sm:text-base text-[#1E1B16]">
                    {stage.stageName}
                  </h3>
                </div>

                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  isStageDone
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : isStageCurrent
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'bg-[#F1ECE6] text-[#8A817B]'
                }`}>
                  {isStageDone ? 'Completed' : isStageCurrent ? 'Current Focus' : 'Upcoming Stage'}
                </span>
              </div>

              {/* Node cards in this stage */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {stage.nodes.map(node => {
                  const isNodeDone = node.status === 'completed'
                  const isNodeActive = node.status === 'in_progress'

                  return (
                    <div
                      key={node.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                        isNodeActive
                          ? 'bg-[#FAF9F6] border-indigo-200/90 shadow-xs'
                          : isNodeDone
                          ? 'bg-white border-[#E7DCCB]/80'
                          : 'bg-[#FDFCFA]/60 border-[#EDE7E1] opacity-75'
                      }`}
                    >
                      <div>
                        {/* Node Top Row: Status badge & Score */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="flex items-center gap-1.5 text-xs font-bold">
                            {isNodeDone ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : isNodeActive ? (
                              <Flame className="w-4 h-4 text-indigo-600 animate-pulse shrink-0" />
                            ) : (
                              <Lock className="w-3.5 h-3.5 text-[#8A817B] shrink-0" />
                            )}
                            <span className={isNodeDone ? 'text-emerald-700' : isNodeActive ? 'text-indigo-700' : 'text-[#8A817B]'}>
                              {isNodeDone ? 'Mastered' : isNodeActive ? 'In Progress' : 'Milestone'}
                            </span>
                          </span>

                          {node.score !== null && (
                            <span className="text-[11px] font-extrabold px-1.5 py-0.5 rounded bg-white border border-[#EDE7E1] text-[#1E1B16]">
                              {node.score}% Score
                            </span>
                          )}
                        </div>

                        {/* Title & Description */}
                        <h4 className="font-bold text-sm text-[#1E1B16] leading-snug mb-1">
                          {node.title}
                        </h4>
                        <p className="text-xs text-[#5B544E] mb-3 leading-relaxed">
                          {node.desc}
                        </p>

                        {/* Concept Pills */}
                        <div className="flex flex-wrap gap-1 mb-3">
                          {node.concepts.map(c => (
                            <span
                              key={c}
                              className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#F1ECE6]/80 text-[#5B544E]"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Bottom Action Bar */}
                      <div className="pt-2.5 border-t border-[#F1ECE6] flex items-center justify-between gap-2 mt-auto">
                        <span className="text-[10px] text-[#8A817B] truncate">
                          📚 {node.source}
                        </span>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handlePracticeTopic(node.title)}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold text-[#5B544E] hover:text-[#1E1B16] bg-white border border-[#EDE7E1] hover:bg-[#F1ECE6] transition-colors"
                            title="Test memory retention on this topic"
                          >
                            Quiz
                          </button>
                          <button
                            onClick={() => handleStudyTopic(node.title, node.source)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white bg-[#1E1B16] hover:bg-[#C05A35] transition-colors flex items-center gap-1 shadow-2xs"
                          >
                            <span>Study AI</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
