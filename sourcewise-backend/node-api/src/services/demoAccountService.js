/**
 * SourceWise Demo Account Mock & State Service
 * 
 * Provides complete, rich, production-grade mock data ONLY for demo@gmail.com
 * ensuring that for hackathon presentations and judging, every single section
 * (uploads, planning, calendar, learning, mastery, progress, analytics, mood, notes)
 * is gorgeously populated and fully interactive with in-memory persistence.
 */

const DEMO_USER_ID = '098ac993-cd75-446e-9ccd-b0ff77d8278c';
const DEMO_EMAIL = 'demo@gmail.com';

function isDemoUser(req) {
  if (!req) return false;
  const user = req.user || req.currentUser;
  if (!user) return false;
  const id = user.id || user.userId || user._id;
  const email = (user.email || '').toLowerCase().trim();
  return id === DEMO_USER_ID || email === DEMO_EMAIL;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

function dateStrDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function dateStrDaysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// ─── 1. SOURCES (Uploaded Study Materials) ──────────────────────────────────
const DEMO_SOURCES = [
  {
    id: 'src-demo-cs229-ml',
    user_id: DEMO_USER_ID,
    name: 'Introduction to Machine Learning - Stanford CS229.pdf',
    title: 'Introduction to Machine Learning - Stanford CS229.pdf',
    type: 'pdf',
    size: 4823040,
    status: 'ready',
    chunks_count: 342,
    chunks_indexed: 342,
    chunksIndexed: 342,
    difficulty: 'hard',
    estimated_reading_time: 480,
    created_at: daysAgo(18),
    summary: 'Comprehensive introduction to Machine Learning covering supervised learning, neural network backpropagation, support vector machines, and unsupervised clustering. Stanford CS229 lecture notes.',
    concepts: ['Linear Regression', 'Logistic Regression', 'Neural Networks', 'Support Vector Machines', 'K-Means Clustering', 'PCA', 'Reinforcement Learning'],
    analysis: {
      overview: 'Stanford CS229 lecture notes covering supervised, unsupervised, and reinforcement learning.',
      key_concepts: ['Linear Regression', 'Logistic Regression', 'Neural Networks', 'Support Vector Machines', 'K-Means Clustering', 'PCA', 'Reinforcement Learning'],
      difficulty_assessment: 'hard',
      estimated_study_time: 480,
      chapter_structure: [
        'Chapter 1: Supervised Learning & Gradient Descent',
        'Chapter 2: Classification, Logistic Regression & GLMs',
        'Chapter 3: Deep Neural Networks & Backprop',
        'Chapter 4: Support Vector Machines & Kernels',
        'Chapter 5: Unsupervised Learning & PCA',
        'Chapter 6: Reinforcement Learning & MDPs'
      ],
      key_takeaways: [
        'Gradient descent convergence depends on learning rate and convexity',
        'Bias-variance tradeoff dictates regularization strategies (L1/L2)',
        'SVM dual formulation enables infinite-dimensional kernel tricks'
      ],
      recommendations: [
        'Review Linear Algebra fundamentals before diving into Spectral clustering',
        'Practice gradient derivations by hand before coding neural networks',
        'Focus on Dimensionality Reduction (PCA) for upcoming midterm review'
      ]
    }
  },
  {
    id: 'src-demo-clrs-algorithms',
    user_id: DEMO_USER_ID,
    name: 'Data Structures and Algorithms - CLRS 4th Edition.pdf',
    title: 'Data Structures and Algorithms - CLRS 4th Edition.pdf',
    type: 'pdf',
    size: 9437184,
    status: 'ready',
    chunks_count: 891,
    chunks_indexed: 891,
    chunksIndexed: 891,
    difficulty: 'hard',
    estimated_reading_time: 960,
    created_at: daysAgo(15),
    summary: 'The definitive textbook on algorithms covering asymptotic analysis, sorting networks, dynamic programming, graph algorithms, and advanced tree data structures.',
    concepts: ['Big-O Notation', 'Sorting Algorithms', 'Dynamic Programming', 'Graph Algorithms', 'Red-Black Trees', 'Hash Tables', 'Greedy Algorithms', 'NP-Completeness'],
    analysis: {
      overview: 'Comprehensive coverage of algorithmic paradigms, amortized analysis, and graph theory from CLRS.',
      key_concepts: ['Big-O Notation', 'Sorting Algorithms', 'Dynamic Programming', 'Graph Algorithms', 'Red-Black Trees', 'Hash Tables', 'Greedy Algorithms', 'NP-Completeness'],
      difficulty_assessment: 'hard',
      estimated_study_time: 960,
      chapter_structure: [
        'Part I: Foundations & Asymptotic Complexity',
        'Part II: Sorting and Order Statistics',
        'Part III: Advanced Data Structures & Trees',
        'Part IV: Dynamic Programming & Greedy Algorithms',
        'Part V: Graph Algorithms (BFS, DFS, Dijkstra, Bellman-Ford)'
      ],
      key_takeaways: [
        'Optimal substructure and overlapping subproblems define DP problems',
        'Amortized analysis proves hash table O(1) average lookup time',
        'Red-Black tree rotations maintain logarithmic height bounds'
      ],
      recommendations: [
        'Complete DP problem sets on interval scheduling',
        'Practice tree rebalancing proofs for oral examination'
      ]
    }
  },
  {
    id: 'src-demo-sysdesign-interview',
    user_id: DEMO_USER_ID,
    name: 'System Design Interview - Alex Xu Volume 2.pdf',
    title: 'System Design Interview - Alex Xu Volume 2.pdf',
    type: 'pdf',
    size: 3145728,
    status: 'ready',
    chunks_count: 278,
    chunks_indexed: 278,
    chunksIndexed: 278,
    difficulty: 'medium',
    estimated_reading_time: 360,
    created_at: daysAgo(12),
    summary: 'Practical guide to building distributed systems at scale. Includes architectural blueprints for payment gateways, video streaming platforms, rate limiters, and distributed message queues.',
    concepts: ['Load Balancing', 'Database Sharding', 'Caching Strategies', 'Message Queues', 'CDN', 'Microservices', 'CAP Theorem'],
    analysis: {
      overview: 'Scalable system architecture patterns, data partitioning, and real-world high-throughput designs.',
      key_concepts: ['Load Balancing', 'Database Sharding', 'Caching Strategies', 'Message Queues', 'CDN', 'Microservices', 'CAP Theorem'],
      difficulty_assessment: 'medium',
      estimated_study_time: 360
    }
  },
  {
    id: 'src-demo-linear-algebra',
    user_id: DEMO_USER_ID,
    name: 'Linear Algebra Done Right - Axler.pdf',
    title: 'Linear Algebra Done Right - Axler.pdf',
    type: 'pdf',
    size: 2621440,
    status: 'ready',
    chunks_count: 198,
    chunks_indexed: 198,
    chunksIndexed: 198,
    difficulty: 'medium',
    estimated_reading_time: 300,
    created_at: daysAgo(10),
    summary: 'Mathematically rigorous approach to vector spaces, linear transformations, eigenvalues, eigenvectors, and spectral decomposition without early determinant reliance.',
    concepts: ['Vector Spaces', 'Linear Maps', 'Eigenvalues', 'Inner Products', 'Spectral Theorem', 'Operators'],
    analysis: {
      overview: 'Pure mathematical formulation of vector spaces and linear operators.',
      key_concepts: ['Vector Spaces', 'Linear Maps', 'Eigenvalues', 'Inner Products', 'Spectral Theorem', 'Operators'],
      difficulty_assessment: 'medium',
      estimated_study_time: 300
    }
  },
  {
    id: 'src-demo-prob-stats',
    user_id: DEMO_USER_ID,
    name: 'Probability and Statistics for ML - Murphy.pdf',
    title: 'Probability and Statistics for ML - Murphy.pdf',
    type: 'pdf',
    size: 5242880,
    status: 'ready',
    chunks_count: 423,
    chunks_indexed: 423,
    chunksIndexed: 423,
    difficulty: 'hard',
    estimated_reading_time: 540,
    created_at: daysAgo(7),
    summary: 'Statistical foundation of machine learning, covering Bayesian inference, graphical models, Maximum Likelihood Estimation (MLE), and Expectation-Maximization.',
    concepts: ['Bayes Theorem', 'Gaussian Distributions', 'Maximum Likelihood', 'EM Algorithm', 'Graphical Models', 'MCMC'],
    analysis: {
      overview: 'Probabilistic machine learning foundations and graphical modeling techniques.',
      key_concepts: ['Bayes Theorem', 'Gaussian Distributions', 'Maximum Likelihood', 'EM Algorithm', 'Graphical Models', 'MCMC'],
      difficulty_assessment: 'hard',
      estimated_study_time: 540
    }
  },
  {
    id: 'src-demo-ostep',
    user_id: DEMO_USER_ID,
    name: 'Operating Systems - Three Easy Pieces.pdf',
    title: 'Operating Systems - Three Easy Pieces.pdf',
    type: 'pdf',
    size: 3670016,
    status: 'ready',
    chunks_count: 312,
    chunks_indexed: 312,
    chunksIndexed: 312,
    difficulty: 'medium',
    estimated_reading_time: 420,
    created_at: daysAgo(5),
    summary: 'Modern textbook exploring virtualization, concurrency, and persistence. Explains CPU scheduling, virtual memory paging, mutex locks, and log-structured file systems.',
    concepts: ['Process Scheduling', 'Virtual Memory', 'File Systems', 'Threads & Locks', 'Deadlock', 'I/O Systems'],
    analysis: {
      overview: 'In-depth exploration of virtualization, multi-threading concurrency, and persistence.',
      key_concepts: ['Process Scheduling', 'Virtual Memory', 'File Systems', 'Threads & Locks', 'Deadlock', 'I/O Systems'],
      difficulty_assessment: 'medium',
      estimated_study_time: 420
    }
  },
  {
    id: 'src-demo-nas-notes',
    user_id: DEMO_USER_ID,
    name: 'Week 3 Lecture Notes - Neural Architecture Search.pdf',
    title: 'Week 3 Lecture Notes - Neural Architecture Search.pdf',
    type: 'pdf',
    size: 524288,
    status: 'ready',
    chunks_count: 47,
    chunks_indexed: 47,
    chunksIndexed: 47,
    difficulty: 'hard',
    estimated_reading_time: 60,
    created_at: daysAgo(3),
    summary: 'Advanced research notes covering DARTS (Differentiable Architecture Search), weight-sharing supernets, and hardware-constrained edge AI deployment.',
    concepts: ['DARTS', 'Efficient NAS', 'Hardware-aware NAS', 'Once-for-All Networks', 'Proxy Tasks'],
    analysis: {
      overview: 'Survey of gradient-based AutoML and automated neural architecture discovery.',
      key_concepts: ['DARTS', 'Efficient NAS', 'Hardware-aware NAS', 'Once-for-All Networks', 'Proxy Tasks'],
      difficulty_assessment: 'hard',
      estimated_study_time: 60
    }
  },
  {
    id: 'src-demo-dbms',
    user_id: DEMO_USER_ID,
    name: 'Database Systems - Ramakrishnan & Gehrke.pdf',
    title: 'Database Systems - Ramakrishnan & Gehrke.pdf',
    type: 'pdf',
    size: 7340032,
    status: 'ready',
    chunks_count: 612,
    chunks_indexed: 612,
    chunksIndexed: 612,
    difficulty: 'medium',
    estimated_reading_time: 600,
    created_at: daysAgo(2),
    summary: 'Comprehensive analysis of relational database engines: B+ tree indexing, query execution optimization, 2PL concurrency protocols, and ARIES recovery algorithm.',
    concepts: ['SQL', 'Query Optimization', 'ACID Transactions', 'B+ Trees', 'Concurrency Control', 'Recovery'],
    analysis: {
      overview: 'Database internal architecture, buffer pool management, and distributed query planning.',
      key_concepts: ['SQL', 'Query Optimization', 'ACID Transactions', 'B+ Trees', 'Concurrency Control', 'Recovery'],
      difficulty_assessment: 'medium',
      estimated_study_time: 600
    }
  }
];

// ─── 2. STUDY PLANS & SUBJECTS ─────────────────────────────────────────────
const PLAN_ID = 'plan-demo-ml-2026';
const OLD_PLAN_ID = 'plan-demo-python-sprint';

const DEMO_SUBJECTS = [
  {
    id: 'subj-ml',
    plan_id: PLAN_ID,
    subject_name: 'Machine Learning',
    exam_date: dateStrDaysFromNow(30),
    exam_weight: 1.5,
    current_mastery: 78,
    target_mastery: 85,
    source_ids: ['src-demo-cs229-ml', 'src-demo-prob-stats'],
    difficulty_estimate: 'hard',
    priority_score: 1.8,
    color: '#6366f1'
  },
  {
    id: 'subj-dsa',
    plan_id: PLAN_ID,
    subject_name: 'Data Structures & Algorithms',
    exam_date: dateStrDaysFromNow(22),
    exam_weight: 1.2,
    current_mastery: 82,
    target_mastery: 90,
    source_ids: ['src-demo-clrs-algorithms'],
    difficulty_estimate: 'hard',
    priority_score: 1.5,
    color: '#8b5cf6'
  },
  {
    id: 'subj-sys',
    plan_id: PLAN_ID,
    subject_name: 'System Design',
    exam_date: dateStrDaysFromNow(38),
    exam_weight: 1.0,
    current_mastery: 74,
    target_mastery: 80,
    source_ids: ['src-demo-sysdesign-interview'],
    difficulty_estimate: 'medium',
    priority_score: 1.2,
    color: '#a78bfa'
  },
  {
    id: 'subj-math',
    plan_id: PLAN_ID,
    subject_name: 'Mathematics',
    exam_date: dateStrDaysFromNow(12),
    exam_weight: 0.8,
    current_mastery: 76,
    target_mastery: 80,
    source_ids: ['src-demo-linear-algebra'],
    difficulty_estimate: 'medium',
    priority_score: 1.0,
    color: '#c4b5fd'
  }
];

const DEMO_PLANS = [
  {
    id: PLAN_ID,
    user_id: DEMO_USER_ID,
    name: 'ML Engineer Exam Prep 2026',
    exam_period_start: dateStrDaysAgo(5),
    exam_period_end: dateStrDaysFromNow(45),
    daily_study_budget_minutes: 150,
    preferred_start_time: '09:00',
    preferred_end_time: '22:00',
    break_preferences: { shortBreak: 10, longBreak: 30, sessionsBeforeLong: 4 },
    status: 'active',
    plan_data: {
      totalSlots: 127,
      generatedAt: daysAgo(5),
      side_exams: [
        { name: 'Linear Algebra Midterm', date: dateStrDaysFromNow(12), weight: 0.3 }
      ]
    },
    generation_context: { subjectCount: 4, moodAdjustments: { multiplier: 1.0 } },
    subjects: DEMO_SUBJECTS,
    created_at: daysAgo(5),
    updated_at: daysAgo(1)
  },
  {
    id: OLD_PLAN_ID,
    user_id: DEMO_USER_ID,
    name: 'Python Fundamentals Sprint',
    exam_period_start: dateStrDaysAgo(60),
    exam_period_end: dateStrDaysAgo(30),
    daily_study_budget_minutes: 90,
    preferred_start_time: '18:00',
    preferred_end_time: '22:00',
    break_preferences: {},
    status: 'completed',
    plan_data: { totalSlots: 54, generatedAt: daysAgo(60) },
    generation_context: { subjectCount: 1 },
    subjects: [
      {
        id: 'subj-py',
        plan_id: OLD_PLAN_ID,
        subject_name: 'Python Basics',
        exam_date: dateStrDaysAgo(30),
        exam_weight: 1.0,
        current_mastery: 95,
        target_mastery: 90,
        difficulty_estimate: 'easy',
        priority_score: 1.0,
        color: '#10b981'
      }
    ],
    created_at: daysAgo(60),
    updated_at: daysAgo(30)
  }
];

// ─── 3. SCHEDULE SLOTS (Past, Today, and Future 40 Days) ────────────────────
function buildDemoSlots() {
  const slots = [];
  const subjectMap = {
    'subj-ml': DEMO_SUBJECTS[0],
    'subj-dsa': DEMO_SUBJECTS[1],
    'subj-sys': DEMO_SUBJECTS[2],
    'subj-math': DEMO_SUBJECTS[3],
  };

  const topics = {
    'subj-ml': [
      'Gradient Descent Deep Dive & Learning Rates',
      'L1 & L2 Regularization & Sparsity',
      'Convolutional Neural Networks & ResNet',
      'Transformer Architecture & Self-Attention',
      'Loss Functions (Cross-Entropy, MSE, Hinge)',
      'Cross-Validation & Hyperparameter Tuning',
      'Support Vector Machines Dual Formulation',
      'PCA & SVD Dimensionality Reduction'
    ],
    'subj-dsa': [
      'Binary Search Tree Balancing & Rotations',
      'Graph Traversal (BFS & DFS Algorithms)',
      'Dynamic Programming on Subsequences',
      'Sliding Window & Two Pointer Patterns',
      'Min/Max Heap Priority Queues',
      'Trie Prefix Trees for Autocomplete',
      'Disjoint Set Union (Union-Find) with Rank',
      'Segment Trees & Range Minimum Query'
    ],
    'subj-sys': [
      'URL Shortener Scale Architecture',
      'Real-Time Chat WebSockets & Fan-out',
      'Social Feed Caching & Newsfeed Service',
      'Token Bucket Distributed Rate Limiter',
      'Distributed Key-Value Store & Consistent Hash',
      'Notification System Multi-channel Delivery'
    ],
    'subj-math': [
      'Vector Spaces & Basis Orthogonality',
      'Gram-Schmidt Orthonormalization',
      'Eigenvalues & Characteristic Polynomials',
      'Spectral Decomposition for Symmetric Matrices',
      'Bayes Theorem & Prior Probability Calculations'
    ]
  };

  const subjKeys = ['subj-ml', 'subj-dsa', 'subj-sys', 'subj-math'];
  const times = [
    ['09:00', '10:30', 90],
    ['11:00', '12:30', 90],
    ['14:00', '15:30', 90],
    ['16:00', '17:00', 60],
    ['19:00', '20:30', 90]
  ];

  // Past 5 Days: mostly completed, 1 skipped
  for (let day = 5; day >= 1; day--) {
    const dateStr = dateStrDaysAgo(day);
    for (let s = 0; s < 2; s++) {
      const sKey = subjKeys[(day * 2 + s) % subjKeys.length];
      const subj = subjectMap[sKey];
      const t = times[s];
      const isSkipped = (day === 3 && s === 1);
      slots.push({
        id: `slot-past-${day}-${s}`,
        plan_id: PLAN_ID,
        subject_id: sKey,
        date: dateStr,
        start_time: t[0],
        end_time: t[1],
        duration_minutes: t[2],
        slot_type: s === 0 ? 'study' : 'practice',
        topic: topics[sKey][(day + s) % topics[sKey].length],
        activity_type: s === 0 ? 'read' : 'practice',
        status: isSkipped ? 'skipped' : 'completed',
        mood_context: { energy: 4, focus: 4 },
        is_fixed: false,
        generated_by: 'ai_initial',
        plan_subjects: { subject_name: subj.subject_name, color: subj.color, exam_date: subj.exam_date }
      });
    }
  }

  // Today (3 slots: 1 completed, 2 pending)
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayDefs = [
    {
      sKey: 'subj-ml',
      topic: 'Gradient Descent Deep Dive & Learning Rates',
      time: ['09:00', '10:30', 90],
      type: 'study',
      activity: 'read',
      status: 'completed'
    },
    {
      sKey: 'subj-dsa',
      topic: 'Binary Search Tree Balancing & Rotations',
      time: ['11:00', '12:30', 90],
      type: 'practice',
      activity: 'practice',
      status: 'pending'
    },
    {
      sKey: 'subj-sys',
      topic: 'URL Shortener Scale Architecture',
      time: ['14:00', '15:30', 90],
      type: 'study',
      activity: 'explain',
      status: 'pending'
    }
  ];

  todayDefs.forEach((td, i) => {
    const subj = subjectMap[td.sKey];
    slots.push({
      id: `slot-today-${i + 1}`,
      plan_id: PLAN_ID,
      subject_id: td.sKey,
      date: todayStr,
      start_time: td.time[0],
      end_time: td.time[1],
      duration_minutes: td.time[2],
      slot_type: td.type,
      topic: td.topic,
      activity_type: td.activity,
      status: td.status,
      mood_context: {},
      is_fixed: false,
      generated_by: 'ai_initial',
      plan_subjects: { subject_name: subj.subject_name, color: subj.color, exam_date: subj.exam_date }
    });
  });

  // Future 40 Days
  for (let day = 1; day <= 40; day++) {
    const dateStr = dateStrDaysFromNow(day);
    const count = (day % 6 === 0) ? 1 : 2; // slight variation
    for (let s = 0; s < count; s++) {
      const sKey = subjKeys[(day + s) % subjKeys.length];
      const subj = subjectMap[sKey];
      const t = times[(day + s) % times.length];
      const slotType = s === 0 ? 'study' : (day % 3 === 0 ? 'quiz' : 'review');
      slots.push({
        id: `slot-future-${day}-${s}`,
        plan_id: PLAN_ID,
        subject_id: sKey,
        date: dateStr,
        start_time: t[0],
        end_time: t[1],
        duration_minutes: t[2],
        slot_type: slotType,
        topic: topics[sKey][(day + s) % topics[sKey].length],
        activity_type: s === 0 ? 'read' : (slotType === 'quiz' ? 'quiz' : 'flashcards'),
        status: 'pending',
        mood_context: {},
        is_fixed: false,
        generated_by: 'ai_initial',
        plan_subjects: { subject_name: subj.subject_name, color: subj.color, exam_date: subj.exam_date }
      });
    }
  }

  return slots;
}

let activeSlots = buildDemoSlots();

// ─── 4. CONCEPT MASTERY ────────────────────────────────────────────────────
const DEMO_MASTERY = [
  { concept: 'Linear Regression', mastery_score: 92, level: 'mastery', confidence_score: 95, total_attempts: 18, correct_attempts: 16, last_assessed: daysAgo(2), next_review_date: daysFromNow(7), interval_days: 7 },
  { concept: 'Big-O Notation', mastery_score: 96, level: 'mastery', confidence_score: 99, total_attempts: 22, correct_attempts: 21, last_assessed: daysAgo(1), next_review_date: daysFromNow(10), interval_days: 10 },
  { concept: 'Hash Tables', mastery_score: 91, level: 'mastery', confidence_score: 90, total_attempts: 16, correct_attempts: 14, last_assessed: daysAgo(2), next_review_date: daysFromNow(7), interval_days: 7 },
  { concept: 'Logistic Regression', mastery_score: 88, level: 'proficient', confidence_score: 85, total_attempts: 12, correct_attempts: 10, last_assessed: daysAgo(3), next_review_date: daysFromNow(5), interval_days: 5 },
  { concept: 'Vector Spaces', mastery_score: 88, level: 'proficient', confidence_score: 85, total_attempts: 10, correct_attempts: 9, last_assessed: daysAgo(3), next_review_date: daysFromNow(5), interval_days: 5 },
  { concept: 'K-Means Clustering', mastery_score: 85, level: 'proficient', confidence_score: 80, total_attempts: 10, correct_attempts: 8, last_assessed: daysAgo(5), next_review_date: daysFromNow(3), interval_days: 3 },
  { concept: 'Load Balancing', mastery_score: 83, level: 'proficient', confidence_score: 80, total_attempts: 8, correct_attempts: 6, last_assessed: daysAgo(4), next_review_date: daysFromNow(3), interval_days: 3 },
  { concept: 'Graph Algorithms', mastery_score: 79, level: 'proficient', confidence_score: 75, total_attempts: 11, correct_attempts: 8, last_assessed: daysAgo(3), next_review_date: daysFromNow(3), interval_days: 3 },
  { concept: 'CAP Theorem', mastery_score: 75, level: 'proficient', confidence_score: 70, total_attempts: 8, correct_attempts: 6, last_assessed: daysAgo(6), next_review_date: daysFromNow(3), interval_days: 3 },
  { concept: 'Neural Networks', mastery_score: 74, level: 'developing', confidence_score: 70, total_attempts: 15, correct_attempts: 11, last_assessed: daysAgo(1), next_review_date: daysFromNow(3), interval_days: 3 },
  { concept: 'Eigenvalues', mastery_score: 72, level: 'developing', confidence_score: 65, total_attempts: 8, correct_attempts: 5, last_assessed: daysAgo(5), next_review_date: daysFromNow(1), interval_days: 1 },
  { concept: 'Dynamic Programming', mastery_score: 71, level: 'developing', confidence_score: 65, total_attempts: 14, correct_attempts: 10, last_assessed: daysAgo(2), next_review_date: daysFromNow(2), interval_days: 2 },
  { concept: 'Database Sharding', mastery_score: 67, level: 'developing', confidence_score: 60, total_attempts: 6, correct_attempts: 4, last_assessed: daysAgo(5), next_review_date: daysFromNow(1), interval_days: 1 },
  { concept: 'Support Vector Machines', mastery_score: 61, level: 'developing', confidence_score: 55, total_attempts: 9, correct_attempts: 5, last_assessed: daysAgo(4), next_review_date: daysFromNow(1), interval_days: 1 },
  { concept: 'Red-Black Trees', mastery_score: 52, level: 'developing', confidence_score: 45, total_attempts: 7, correct_attempts: 3, last_assessed: daysAgo(7), next_review_date: daysFromNow(0), interval_days: 1 },
  { concept: 'Spectral Theorem', mastery_score: 48, level: 'novice', confidence_score: 40, total_attempts: 5, correct_attempts: 2, last_assessed: daysAgo(8), next_review_date: daysFromNow(0), interval_days: 1 },
  { concept: 'PCA', mastery_score: 45, level: 'novice', confidence_score: 40, total_attempts: 6, correct_attempts: 2, last_assessed: daysAgo(6), next_review_date: daysFromNow(0), interval_days: 1 },
  { concept: 'Reinforcement Learning', mastery_score: 38, level: 'novice', confidence_score: 30, total_attempts: 5, correct_attempts: 1, last_assessed: daysAgo(8), next_review_date: daysFromNow(0), interval_days: 1 }
];

// ─── 5. KNOWLEDGE GAPS ─────────────────────────────────────────────────────
const DEMO_GAPS = [
  { id: 'gap-1', concept: 'PCA & Dimensionality Reduction', severity: 5, status: 'open', identified_at: daysAgo(6) },
  { id: 'gap-2', concept: 'Reinforcement Learning Bellman Equations', severity: 4, status: 'open', identified_at: daysAgo(8) },
  { id: 'gap-3', concept: 'Red-Black Tree Rotations', severity: 4, status: 'open', identified_at: daysAgo(7) },
  { id: 'gap-4', concept: 'Spectral Decomposition Theorem', severity: 3, status: 'open', identified_at: daysAgo(8) },
  { id: 'gap-5', concept: 'Expectation-Maximization (EM)', severity: 5, status: 'open', identified_at: daysAgo(10) },
  { id: 'gap-6', concept: 'Markov Chain Monte Carlo (MCMC)', severity: 4, status: 'open', identified_at: daysAgo(9) },
  { id: 'gap-7', concept: 'Linear Regression Gradient Derivation', severity: 2, status: 'resolved', resolved_at: daysAgo(5) },
  { id: 'gap-8', concept: 'Big-O Asymptotic Proofs', severity: 3, status: 'resolved', resolved_at: daysAgo(10) }
];

// ─── 6. REVIEWS & SPACED REPETITION ────────────────────────────────────────
const DEMO_REVIEWS = [
  { id: 'rev-1', concept: 'PCA', mastery_score: 45, next_review_date: dateStrDaysFromNow(0), interval_days: 1, last_reviewed: daysAgo(1), review_count: 3 },
  { id: 'rev-2', concept: 'Reinforcement Learning', mastery_score: 38, next_review_date: dateStrDaysFromNow(0), interval_days: 1, last_reviewed: daysAgo(2), review_count: 2 },
  { id: 'rev-3', concept: 'Red-Black Trees', mastery_score: 52, next_review_date: dateStrDaysFromNow(0), interval_days: 1, last_reviewed: daysAgo(1), review_count: 4 },
  { id: 'rev-4', concept: 'Support Vector Machines', mastery_score: 61, next_review_date: dateStrDaysFromNow(1), interval_days: 1, last_reviewed: daysAgo(1), review_count: 6 },
  { id: 'rev-5', concept: 'Database Sharding', mastery_score: 67, next_review_date: dateStrDaysFromNow(1), interval_days: 1, last_reviewed: daysAgo(2), review_count: 3 },
  { id: 'rev-6', concept: 'Eigenvalues', mastery_score: 72, next_review_date: dateStrDaysFromNow(1), interval_days: 1, last_reviewed: daysAgo(2), review_count: 5 },
  { id: 'rev-7', concept: 'Dynamic Programming', mastery_score: 71, next_review_date: dateStrDaysFromNow(2), interval_days: 2, last_reviewed: daysAgo(2), review_count: 7 },
  { id: 'rev-8', concept: 'Neural Networks', mastery_score: 74, next_review_date: dateStrDaysFromNow(3), interval_days: 3, last_reviewed: daysAgo(1), review_count: 8 },
  { id: 'rev-9', concept: 'Graph Algorithms', mastery_score: 79, next_review_date: dateStrDaysFromNow(3), interval_days: 3, last_reviewed: daysAgo(3), review_count: 6 },
  { id: 'rev-10', concept: 'Load Balancing', mastery_score: 83, next_review_date: dateStrDaysFromNow(3), interval_days: 3, last_reviewed: daysAgo(4), review_count: 5 },
  { id: 'rev-11', concept: 'K-Means Clustering', mastery_score: 85, next_review_date: dateStrDaysFromNow(3), interval_days: 3, last_reviewed: daysAgo(5), review_count: 9 },
  { id: 'rev-12', concept: 'Logistic Regression', mastery_score: 88, next_review_date: dateStrDaysFromNow(5), interval_days: 5, last_reviewed: daysAgo(3), review_count: 12 },
  { id: 'rev-13', concept: 'Linear Regression', mastery_score: 92, next_review_date: dateStrDaysFromNow(7), interval_days: 7, last_reviewed: daysAgo(2), review_count: 18 },
  { id: 'rev-14', concept: 'Hash Tables', mastery_score: 91, next_review_date: dateStrDaysFromNow(7), interval_days: 7, last_reviewed: daysAgo(2), review_count: 16 },
  { id: 'rev-15', concept: 'Big-O Notation', mastery_score: 96, next_review_date: dateStrDaysFromNow(10), interval_days: 10, last_reviewed: daysAgo(1), review_count: 22 }
];

// ─── 7. MOOD STATE & CHECK-INS ──────────────────────────────────────────────
let currentMoodState = {
  dominantMood: 'focused',
  energy: 8,
  focus: 9,
  stress: 2,
  trend: 'stable',
  recommendedAdjustments: { loadMultiplier: 1.0, reason: 'Mood is optimal for high cognitive retention.' }
};

const DEMO_MOOD_HISTORY = [];
const moodChoices = ['focused', 'energized', 'neutral', 'focused', 'tired', 'focused', 'energized'];
for (let d = 14; d >= 0; d--) {
  const m = moodChoices[d % moodChoices.length];
  DEMO_MOOD_HISTORY.push({
    id: `mood-${d}`,
    mood: m,
    energy_level: m === 'tired' ? 4 : (m === 'energized' ? 9 : 8),
    focus_level: m === 'tired' ? 5 : (m === 'energized' ? 9 : 9),
    stress_level: m === 'tired' ? 6 : 2,
    source: 'manual',
    notes: d === 0 ? 'Excited for the hackathon presentation!' : (d === 3 ? 'Long study session, bit tired' : 'Great flow state'),
    created_at: daysAgo(d)
  });
}

// ─── 8. PROGRESS TIMELINE EVENTS (150+ items) ────────────────────────────────
function buildDemoEvents() {
  const events = [];
  const eventTypes = ['quiz', 'practice', 'flashcard_review', 'revision_completed'];
  const concepts = [
    'Linear Regression', 'Neural Networks', 'Dynamic Programming',
    'Graph Algorithms', 'K-Means Clustering', 'Support Vector Machines',
    'Hash Tables', 'Load Balancing', 'Vector Spaces', 'Eigenvalues'
  ];

  // Source upload events
  DEMO_SOURCES.forEach(s => {
    events.push({
      id: `ev-up-${s.id}`,
      event_type: 'source_upload',
      source_id: s.id,
      metadata: { source_name: s.name, size: s.size },
      created_at: s.created_at
    });
  });

  // Daily study events across 25 days
  for (let day = 1; day <= 25; day++) {
    const count = 3 + (day % 3);
    for (let c = 0; c < count; c++) {
      const concept = concepts[(day + c) % concepts.length];
      const evType = eventTypes[(day + c) % eventTypes.length];
      const score = 65 + ((day * 7 + c * 13) % 32);
      events.push({
        id: `ev-${day}-${c}`,
        event_type: evType,
        concept,
        score,
        correct: score >= 70,
        duration_minutes: 15 + ((c * 7) % 25),
        created_at: daysAgo(day)
      });
    }
  }

  // Today's events
  events.unshift(
    { id: 'ev-today-1', event_type: 'quiz', concept: 'Neural Networks', score: 85, correct: true, duration_minutes: 15, created_at: new Date().toISOString() },
    { id: 'ev-today-2', event_type: 'flashcard_review', concept: 'Big-O Notation', score: 98, correct: true, duration_minutes: 10, created_at: new Date().toISOString() },
    { id: 'ev-today-3', event_type: 'practice', concept: 'Gradient Descent Deep Dive', score: 90, correct: true, duration_minutes: 30, created_at: new Date().toISOString() }
  );

  return events;
}

let activeEvents = buildDemoEvents();

// ─── 9. CALENDAR EVENTS ────────────────────────────────────────────────────
const DEMO_CALENDAR_EVENTS = [
  { id: 'cal-1', title: 'Stanford CS229 ML Final Exam', event_type: 'exam', start_time: daysFromNow(30), end_time: daysFromNow(30), is_blocker: true, description: 'Final Comprehensive Exam on Machine Learning' },
  { id: 'cal-2', title: 'Data Structures & Algorithms Final', event_type: 'exam', start_time: daysFromNow(22), end_time: daysFromNow(22), is_blocker: true, description: 'CLRS Advanced Algorithm Assessment' },
  { id: 'cal-3', title: 'Linear Algebra Midterm', event_type: 'exam', start_time: daysFromNow(12), end_time: daysFromNow(12), is_blocker: true, description: 'Midterm covering Eigenvalues & Spectral Theory' },
  { id: 'cal-4', title: 'SourceWise AI Hackathon Demo Day', event_type: 'work', start_time: daysFromNow(7), end_time: daysFromNow(7), is_blocker: true, description: 'Live Presentation to Judging Panel' },
  { id: 'cal-5', title: 'Advanced Study Group - Machine Learning', event_type: 'class', start_time: daysFromNow(3), end_time: daysFromNow(3), is_blocker: false, description: 'Weekly group walkthrough of backprop derivations' }
];

// ─── 10. REPLAN EVENTS ─────────────────────────────────────────────────────
const DEMO_REPLANS = [
  {
    id: 'replan-1',
    plan_id: PLAN_ID,
    trigger_type: 'mood_shift',
    trigger_data: { mood: 'tired', multiplier: 0.8, reason: 'Auto-scaled session duration to prevent burnout' },
    slots_affected: 3,
    slots_rescheduled: 3,
    user_approved: false,
    created_at: daysAgo(3)
  },
  {
    id: 'replan-2',
    plan_id: PLAN_ID,
    trigger_type: 'manual',
    trigger_data: { reason: 'Prioritized graph traversal practice ahead of midterm' },
    slots_affected: 4,
    slots_rescheduled: 4,
    user_approved: true,
    created_at: daysAgo(6)
  },
  {
    id: 'replan-3',
    plan_id: PLAN_ID,
    trigger_type: 'missed_day',
    trigger_data: { missedCount: 1, redistributedDays: 3 },
    slots_affected: 2,
    slots_rescheduled: 2,
    user_approved: false,
    created_at: daysAgo(10)
  }
];

// ─── 11. NOTES ─────────────────────────────────────────────────────────────
const DEMO_NOTES = [
  {
    id: 'note-1',
    user_id: DEMO_USER_ID,
    title: 'Backpropagation Derivation & Chain Rule',
    content: `# Backpropagation Calculus Notes\n\n### 1. The Core Objective\nWe compute the gradient of the loss $\\mathcal{L}$ with respect to weights $W^{[l]}$ using the multivariable chain rule:\n\n$$\\frac{\\partial \\mathcal{L}}{\\partial W^{[l]}} = \\delta^{[l]} (A^{[l-1]})^T$$\n\n### 2. Error Vector Recurrence\n$$\\delta^{[l]} = (W^{[l+1]})^T \\delta^{[l+1]} \\odot \\sigma'(Z^{[l]})$$\n\n> **Key Takeaway**: Caching pre-activation vectors $Z^{[l]}$ during the forward pass reduces memory recomputations during backward pass.\n`,
    created_at: daysAgo(4),
    updated_at: daysAgo(1)
  },
  {
    id: 'note-2',
    user_id: DEMO_USER_ID,
    title: 'Dynamic Programming Patterns: Overlapping Subproblems',
    content: `# DP Mastery Playbook\n\n### 5-Step Framework:\n1. **Define Subproblems**: State dimensions (e.g. $DP[i][j]$ = max profit up to day $i$ with $j$ transactions)\n2. **Identify Recurrence Relation**: Transition equations\n3. **Base Cases**: Boundary initialization\n4. **Memoization vs Tabulation**: Space complexity tradeoff\n5. **State Space Reduction**: Rolling array optimization (e.g. $O(N) \\rightarrow O(1)$ space)\n`,
    created_at: daysAgo(8),
    updated_at: daysAgo(3)
  },
  {
    id: 'note-3',
    user_id: DEMO_USER_ID,
    title: 'System Design: Consistent Hashing & Virtual Nodes',
    content: `# Consistent Hashing Architecture\n\n- **Problem**: Modulo hashing ($N \\pmod K$) invalidates $99\\%$ of cache keys when node $K$ scales.\n- **Solution**: Hash ring ($0$ to $2^{32}-1$). Key mapped to first server clockwise.\n- **Virtual Nodes**: Assign each server 100-200 virtual points on the ring to guarantee balanced load distribution across heterogeneous machines.\n`,
    created_at: daysAgo(11),
    updated_at: daysAgo(7)
  }
];

// ─── SERVICE EXPORTED HANDLERS ─────────────────────────────────────────────
module.exports = {
  isDemoUser,
  DEMO_USER_ID,
  DEMO_EMAIL,

  // Sources
  getSources: () => DEMO_SOURCES,
  getSourceById: (id) => DEMO_SOURCES.find(s => s.id === id) || null,
  addSource: (source) => {
    DEMO_SOURCES.unshift(source);
    return source;
  },
  deleteSource: (id) => {
    const idx = DEMO_SOURCES.findIndex(s => s.id === id);
    if (idx !== -1) DEMO_SOURCES.splice(idx, 1);
    return true;
  },

  // Plans & Schedules
  getPlans: () => DEMO_PLANS,
  getPlanById: (id) => {
    const plan = DEMO_PLANS.find(p => p.id === id) || DEMO_PLANS[0];
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = activeSlots.filter(s => s.plan_id === plan.id && s.date >= today);
    return { ...plan, upcomingSlots: upcoming };
  },
  getSchedule: (planId, from, to) => {
    let list = activeSlots.filter(s => !planId || s.plan_id === planId);
    if (from) list = list.filter(s => s.date >= from);
    if (to) list = list.filter(s => s.date <= to);
    return list;
  },
  getTodaySlots: (planId) => {
    const today = new Date().toISOString().slice(0, 10);
    const slots = activeSlots.filter(s => s.date === today && (!planId || s.plan_id === planId));
    return { date: today, slots, mood: currentMoodState };
  },
  completeSlot: (slotId) => {
    const s = activeSlots.find(slot => slot.id === slotId);
    if (s) {
      s.status = s.status === 'completed' ? 'pending' : 'completed';
      return s;
    }
    return null;
  },
  getPacing: (planId) => ({
    planId: planId || PLAN_ID,
    date: new Date().toISOString().slice(0, 10),
    pacePct: 94,
    onTrack: true,
    completedSlots: 28,
    expectedSlots: 26,
    deviationDays: 0,
    milestones: [
      { label: 'Foundations & Math Prereqs', date: dateStrDaysAgo(3), reached: true },
      { label: 'Midterm Self-Assessment Exam', date: dateStrDaysFromNow(12), reached: false },
      { label: 'CLRS Algorithms Marathon', date: dateStrDaysFromNow(22), reached: false },
      { label: 'Stanford CS229 Benchmark Final', date: dateStrDaysFromNow(30), reached: false }
    ]
  }),
  getReplans: (planId) => DEMO_REPLANS,

  // Mastery & Gaps
  getMastery: () => DEMO_MASTERY,
  getKnowledgeGaps: () => DEMO_GAPS,
  getReviewsToday: () => DEMO_REVIEWS.filter(r => r.next_review_date <= new Date().toISOString().slice(0, 10)),
  getReviewSchedule: () => DEMO_REVIEWS,
  getReviewStats: () => ({
    dueToday: 3,
    upcoming: 12,
    totalReviews: 87,
    retentionRate: 94
  }),
  completeReview: (concept, score) => {
    const item = DEMO_REVIEWS.find(r => r.concept.toLowerCase() === (concept || '').toLowerCase());
    if (item) {
      item.review_count += 1;
      item.next_review_date = dateStrDaysFromNow(3);
    }
    const m = DEMO_MASTERY.find(m => m.concept.toLowerCase() === (concept || '').toLowerCase());
    if (m) {
      m.total_attempts += 1;
      m.correct_attempts += score >= 70 ? 1 : 0;
      m.mastery_score = Math.min(100, Math.round((m.correct_attempts / m.total_attempts) * 100));
    }
    return { success: true };
  },

  // Progress & Analytics
  getProgressEvents: (limit = 50, offset = 0, type) => {
    let list = activeEvents;
    if (type) list = list.filter(e => e.event_type === type);
    return list.slice(offset, offset + limit);
  },
  getProgressSummary: () => ({
    streak: 14,
    totalSources: DEMO_SOURCES.length,
    totalQuizzes: 15,
    quizAccuracy: 86,
    totalStudyMinutes: 3140,
    recentActivity: activeEvents.slice(0, 10).map(e => ({
      type: e.event_type,
      concept: e.concept,
      score: e.score,
      date: e.created_at
    })),
    totalEvents: activeEvents.length
  }),
  getProgressStreak: () => ({ streak: 14 }),
  getTrends: () => {
    const snapshots = [];
    for (let w = 7; w >= 0; w--) {
      snapshots.push({
        period: 'weekly',
        study_hours: 6.2 + (7 - w) * 0.5,
        quiz_accuracy: 64 + (7 - w) * 3,
        topics_mastered: 4 + (7 - w),
        learning_velocity: 3.4,
        snapshot_date: dateStrDaysAgo(w * 7)
      });
    }
    return {
      snapshots,
      trends: { quiz: 'improving', mastery: 'improving' }
    };
  },
  getDashboardOverview: () => ({
    streak: 14,
    totalSources: DEMO_SOURCES.length,
    totalQuizzes: 15,
    quizAccuracy: 86,
    totalStudyMinutes: 3140,
    studyHours: 52.4,
    masteryPercentage: 78,
    topicsMastered: 12,
    topicsTotal: 18,
    learningVelocity: 3.4,
    dueReviewsCount: 3,
    whatToStudy: {
      type: 'review',
      concept: 'PCA & Dimensionality Reduction',
      reason: 'FSRS-v5 algorithm predicts retention drop below 85% today'
    },
    recentActivity: activeEvents.slice(0, 6).map(e => ({
      type: e.event_type,
      concept: e.concept,
      score: e.score,
      date: e.created_at
    }))
  }),
  getAnalyticsOverview: () => ({
    studyHours: 52.4,
    quizAccuracy: 86,
    masteryPercentage: 78,
    topicsMastered: 12,
    topicsTotal: 18,
    learningVelocity: 3.4,
    streak: 14,
    retentionRate: 94,
    totalSessions: 42
  }),

  // Mood
  getMoodCurrent: () => currentMoodState,
  getMoodHistory: () => DEMO_MOOD_HISTORY,
  getMoodInsights: () => ({
    bestMood: 'focused',
    worstMood: 'tired',
    peakEnergyDay: 'Wednesday',
    insights: [
      'Your quiz performance is 28% higher when studying in a "focused" state.',
      'Active recall sessions in the morning yield optimal 94% retention.',
      'Auto-adaptive replanning protected your pacing streak when fatigue was logged.'
    ],
    trend: 'stable'
  }),
  recordMoodCheckin: (payload) => {
    currentMoodState = {
      dominantMood: payload.mood || 'focused',
      energy: payload.energy_level || 8,
      focus: payload.focus_level || 9,
      stress: payload.stress_level || 2,
      trend: 'stable',
      recommendedAdjustments: { loadMultiplier: 1.0, reason: 'Mood logged successfully' }
    };
    DEMO_MOOD_HISTORY.unshift({
      id: `mood-${Date.now()}`,
      mood: payload.mood || 'focused',
      energy_level: payload.energy_level || 8,
      focus_level: payload.focus_level || 9,
      stress_level: payload.stress_level || 2,
      source: 'manual',
      notes: payload.notes || null,
      created_at: new Date().toISOString()
    });
    return currentMoodState;
  },

  // Calendar
  getCalendarStatus: () => ({
    connected: true,
    email: DEMO_EMAIL,
    provider: 'google',
    lastSync: new Date().toISOString()
  }),
  getCalendarEvents: () => DEMO_CALENDAR_EVENTS,

  // Notes
  getNotes: () => DEMO_NOTES
};
