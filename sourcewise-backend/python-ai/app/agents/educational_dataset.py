"""
Educational Dataset Layer - Few-shot learning library for high-quality content generation.

Stores examples of good flashcards, quizzes, study plans, and notes
to improve generation quality through few-shot learning.
"""

from typing import List, Dict, Any


# ============================================================
# HIGH-QUALITY FLASHCARD EXAMPLES
# ============================================================

FLASHCARD_EXAMPLES = {
    "definition": [
        {
            "front": "What is a Database Management System (DBMS)?",
            "back": "A DBMS is software that enables users to define, create, maintain, and control access to databases. It provides an interface between end-users/applications and the database, ensuring data integrity, security, and concurrent access. Examples include PostgreSQL, MySQL, and MongoDB.",
            "type": "definition",
            "difficulty": "easy",
            "learning_value": 85,
        },
        {
            "front": "Explain the concept of Atomicity in ACID transactions.",
            "back": "Atomicity ensures that a transaction is treated as a single, indivisible unit. Either ALL operations in the transaction complete successfully, or NONE of them are applied. If any part fails, the entire transaction is rolled back to its original state.",
            "type": "concept",
            "difficulty": "medium",
            "learning_value": 90,
        },
    ],
    "comparison": [
        {
            "front": "Compare TCP and UDP protocols.",
            "back": "TCP: Connection-oriented, reliable, ordered delivery, error-checking, slower. Used for: web browsing, email, file transfer.\n\nUDP: Connectionless, unreliable, no ordering guarantee, faster. Used for: video streaming, gaming, DNS queries.\n\nKey difference: TCP guarantees delivery; UDP prioritizes speed.",
            "type": "comparison",
            "difficulty": "medium",
            "learning_value": 92,
        },
    ],
    "process": [
        {
            "front": "Describe the TCP 3-way handshake process.",
            "back": "1. SYN: Client sends SYN flag to server\n2. SYN-ACK: Server responds with SYN-ACK\n3. ACK: Client sends ACK to confirm\n\nResult: Connection established. This ensures both sides are ready for data transfer.",
            "type": "process",
            "difficulty": "medium",
            "learning_value": 88,
        },
    ],
    "application": [
        {
            "front": "When would you use a hash table over a binary search tree?",
            "back": "Use a hash table when:\n- You need O(1) average lookup time\n- Order doesn't matter\n- You don't need range queries\n\nUse a BST when:\n- You need sorted data\n- You need range queries\n- Memory is constrained",
            "type": "application",
            "difficulty": "hard",
            "learning_value": 91,
        },
    ],
}


# ============================================================
# HIGH-QUALITY QUIZ EXAMPLES
# ============================================================

QUIZ_EXAMPLES = [
    {
        "question": "Which of the following is NOT a characteristic of a relational database?",
        "options": [
            "Tables with rows and columns",
            "ACID compliance",
            "Schema-on-read",
            "Foreign key relationships"
        ],
        "answer": 2,
        "explanation": "Schema-on-read is a characteristic of NoSQL databases. Relational databases use schema-on-write, where the structure is defined before data is inserted.",
        "difficulty": "easy",
        "concept": "Database Fundamentals",
    },
    {
        "question": "In the context of networking, what does the term 'latency' refer to?",
        "options": [
            "The amount of data that can be transmitted per second",
            "The time delay between sending and receiving data",
            "The number of devices on a network",
            "The encryption level of network traffic"
        ],
        "answer": 1,
        "explanation": "Latency is the time delay between when data is sent and when it is received. It's measured in milliseconds (ms) and is crucial for real-time applications like video calls and online gaming.",
        "difficulty": "easy",
        "concept": "Networking Basics",
    },
    {
        "question": "Explain why a B-tree is preferred over a binary search tree for database indexing.",
        "options": [
            "B-trees are simpler to implement",
            "B-trees minimize disk I/O by having higher branching factor",
            "Binary search trees use less memory",
            "B-trees don't support range queries"
        ],
        "answer": 1,
        "explanation": "B-trees have a much higher branching factor than binary trees, meaning fewer levels to traverse. Since each level may require a disk read, B-trees minimize costly I/O operations, making them ideal for database indexing.",
        "difficulty": "hard",
        "concept": "Database Indexing",
    },
]


# ============================================================
# HIGH-QUALITY STUDY PLAN EXAMPLES
# ============================================================

STUDY_PLAN_EXAMPLE = {
    "title": "Study Plan for Computer Networks",
    "days": [
        {
            "name": "Day 1",
            "topics": ["OSI Model", "TCP/IP Model"],
            "activities": ["Read textbook chapters 1-2", "Create flashcards for each layer", "Watch video tutorial"],
            "duration": "3 hours",
            "status": "pending",
            "milestone": False,
            "priority": "high",
            "focus_area": "new_concepts",
        },
        {
            "name": "Day 2",
            "topics": ["IP Addressing", "Subnetting"],
            "activities": ["Practice subnet calculations", "Solve 10 subnetting problems", "Review OSI model"],
            "duration": "3 hours",
            "status": "pending",
            "milestone": False,
            "priority": "high",
            "focus_area": "weak_topics",
        },
        {
            "name": "Day 3",
            "topics": ["TCP", "UDP"],
            "activities": ["Compare protocols", "Create comparison flashcards", "Take practice quiz"],
            "duration": "2.5 hours",
            "status": "pending",
            "milestone": True,
            "priority": "medium",
            "focus_area": "new_concepts",
        },
    ],
    "milestones": [
        {"threshold": 33, "label": "Foundation Complete", "skill_based": True},
        {"threshold": 66, "label": "Core Concepts Mastered", "skill_based": True},
        {"threshold": 100, "label": "Ready for Exam", "skill_based": True},
    ],
    "totalDays": 3,
    "dailyHours": 3,
    "priority_focus": "weak_topics",
}


# ============================================================
# FEW-SHOT LEARNING TEMPLATES
# ============================================================

FEW_SHOT_TEMPLATES = {
    "flashcard_generation": """Generate high-quality flashcards following these examples:

EXAMPLE 1 (Definition Card):
FRONT: What is a Database Management System (DBMS)?
BACK: A DBMS is software that enables users to define, create, maintain, and control access to databases. It provides an interface between end-users/applications and the database, ensuring data integrity, security, and concurrent access.
TYPE: definition
DIFFICULTY: medium
LEARNING_VALUE: 85

EXAMPLE 2 (Comparison Card):
FRONT: Compare TCP and UDP protocols.
BACK: TCP: Connection-oriented, reliable, ordered delivery, slower. Used for web browsing, email.
UDP: Connectionless, unreliable, faster. Used for video streaming, gaming.
KEY DIFFERENCE: TCP guarantees delivery; UDP prioritizes speed.
TYPE: comparison
DIFFICULTY: medium
LEARNING_VALUE: 92

Now generate flashcards for: {topic}
""",

    "quiz_generation": """Generate university-level quiz questions following these examples:

EXAMPLE 1 (Easy MCQ):
Q: Which of the following is NOT a characteristic of a relational database?
A: Tables with rows and columns
B: ACID compliance
C: Schema-on-read  ← CORRECT
D: Foreign key relationships
EXPLANATION: Schema-on-read is a characteristic of NoSQL databases.
DIFFICULTY: easy
CONCEPT: Database Fundamentals

EXAMPLE 2 (Hard MCQ):
Q: Explain why a B-tree is preferred over a BST for database indexing.
A: B-trees are simpler
B: B-trees minimize disk I/O by having higher branching factor  ← CORRECT
C: BSTs use less memory
D: B-trees don't support range queries
EXPLANATION: B-trees have higher branching factor, minimizing disk I/O.
DIFFICULTY: hard
CONCEPT: Database Indexing

Now generate questions for: {topic}
""",

    "study_plan_generation": """Generate an intelligent study plan following these principles:

RULES:
1. Start with foundational concepts
2. Prioritize weak topics early
3. Include review sessions
4. Build in practice quizzes
5. Mark milestones at 25%, 50%, 75%, 100%
6. Keep daily hours realistic (2-4 hours)
7. Include variety in activities

EXAMPLE STRUCTURE:
- Day 1: Foundation (new concepts, create flashcards)
- Day 2: Practice (solve problems, weak areas)
- Day 3: Review + Quiz (consolidate learning)
- Day 4: Advanced topics (build on foundation)
- Day 5: Full review + mock exam

Now create a plan for: {topic}
Exam date: {exam_date}
Daily hours: {daily_hours}
""",
}


def get_few_shot_examples(task_type: str, count: int = 2) -> List[Dict]:
    """Get few-shot examples for a specific task type"""
    if task_type == "flashcard":
        examples = []
        for card_type, cards in FLASHCARD_EXAMPLES.items():
            examples.extend(cards[:1])
        return examples[:count]
    elif task_type == "quiz":
        return QUIZ_EXAMPLES[:count]
    elif task_type == "plan":
        return [STUDY_PLAN_EXAMPLE]
    return []


def get_generation_template(task_type: str) -> str:
    """Get the few-shot generation template for a task type"""
    return FEW_SHOT_TEMPLATES.get(task_type, "")
