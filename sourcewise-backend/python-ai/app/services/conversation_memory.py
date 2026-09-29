"""
ConversationMemory - deep context tracking for multi-turn conversations.

Tracks topics, summaries, user facts, and conversation threads to make the AI
remember and reference past interactions naturally.
"""
from typing import Dict, List, Optional, Set
from datetime import datetime
import json


class ConversationThread:
    """Represents a topic thread within a conversation."""

    def __init__(self, topic, started_at=None):
        self.topic = topic
        self.started_at = started_at or datetime.now().isoformat()
        self.subtopics = []
        self.key_points = []
        self.user_questions = []
        self.resolved = False

    def to_dict(self):
        return {
            "topic": self.topic,
            "started_at": self.started_at,
            "subtopics": self.subtopics,
            "key_points": self.key_points,
            "user_questions": self.user_questions,
            "resolved": self.resolved,
        }


class SessionSummary:
    """Summary of a completed tutoring session."""

    def __init__(self, data=None):
        data = data or {}
        self.session_id = data.get("session_id", "")
        self.date = data.get("date", datetime.now().isoformat())
        self.duration_minutes = data.get("duration_minutes", 0)
        self.topics_covered = data.get("topics_covered", [])
        self.key_learnings = data.get("key_learnings", [])
        self.questions_asked = data.get("questions_asked", 0)
        self.concepts_mastered = data.get("concepts_mastered", [])
        self.knowledge_gaps = data.get("knowledge_gaps", [])
        self.user_sentiment = data.get("user_sentiment", "neutral")
        self.summary_text = data.get("summary_text", "")

    def to_dict(self):
        return {
            "session_id": self.session_id,
            "date": self.date,
            "duration_minutes": self.duration_minutes,
            "topics_covered": self.topics_covered,
            "key_learnings": self.key_learnings,
            "questions_asked": self.questions_asked,
            "concepts_mastered": self.concepts_mastered,
            "knowledge_gaps": self.knowledge_gaps,
            "user_sentiment": self.user_sentiment,
            "summary_text": self.summary_text,
        }


class ConversationMemory:
    """
    Manages conversation context across sessions for deep memory.

    Tracks:
    - Current session topics and threads
    - User-shared facts and preferences
    - Historical session summaries
    - Running conversation context
    """

    def __init__(self):
        self._sessions: Dict[str, Dict] = {}

    def init_session(self, session_id: str, previous_summaries: Optional[List[Dict]] = None):
        self._sessions[session_id] = {
            "threads": [],
            "current_thread": None,
            "topics_discussed": [],
            "user_facts": [],
            "running_summary": "",
            "turn_count": 0,
            "previous_summaries": previous_summaries or [],
            "confusion_signals": [],
            "satisfaction_signals": [],
        }

    def update(self, session_id: str, user_message: str, ai_response: str, history: List[Dict]):
        if session_id not in self._sessions:
            self.init_session(session_id)

        session = self._sessions[session_id]
        session["turn_count"] += 1

        # Detect topic from user message
        topic = self._extract_topic(user_message)

        # Start new thread if topic changed
        current = session.get("current_thread")
        if topic and (not current or current.topic.lower() != topic.lower()):
            if current:
                current.resolved = True
            new_thread = ConversationThread(topic)
            session["threads"].append(new_thread)
            session["current_thread"] = new_thread
            if topic not in session["topics_discussed"]:
                session["topics_discussed"].append(topic)

        # Add question to current thread
        if current and current == session.get("current_thread"):
            current.user_questions.append(user_message[:200])

        # Detect user facts
        facts = self._extract_user_facts(user_message)
        for fact in facts:
            if fact not in [f["fact"] for f in session["user_facts"]]:
                session["user_facts"].append({
                    "fact": fact,
                    "timestamp": datetime.now().isoformat(),
                })

        # Detect confusion or satisfaction
        sentiment = self._detect_sentiment(user_message)
        if sentiment == "confusion":
            session["confusion_signals"].append({
                "message": user_message[:100],
                "topic": topic or "unknown",
            })
        elif sentiment == "satisfaction":
            session["satisfaction_signals"].append({
                "message": user_message[:100],
                "topic": topic or "unknown",
            })

        # Update running summary
        session["running_summary"] = self._build_running_summary(session)

    def get_context_for_response(self, session_id: str) -> Dict:
        if session_id not in self._sessions:
            return {}

        session = self._sessions[session_id]
        context = {
            "turn_count": session["turn_count"],
            "current_topic": session["current_thread"].topic if session.get("current_thread") else None,
            "topics_discussed": session["topics_discussed"],
            "running_summary": session["running_summary"],
            "user_facts": session["user_facts"],
            "confusion_count": len(session["confusion_signals"]),
            "satisfaction_count": len(session["satisfaction_signals"]),
        }

        # Add previous session context
        if session["previous_summaries"]:
            recent = session["previous_summaries"][-3:]
            context["previous_sessions"] = [
                {
                    "date": s.get("date", ""),
                    "topics": s.get("topics_covered", []),
                    "summary": s.get("summary_text", "")[:300],
                }
                for s in recent
            ]

        return context

    def generate_session_end_summary(self, session_id: str) -> SessionSummary:
        if session_id not in self._sessions:
            return SessionSummary()

        session = self._sessions[session_id]
        topics = session["topics_discussed"]
        total_confusion = len(session["confusion_signals"])
        total_satisfaction = len(session["satisfaction_signals"])

        if total_satisfaction > total_confusion:
            sentiment = "positive"
        elif total_confusion > total_satisfaction:
            sentiment = "struggling"
        else:
            sentiment = "neutral"

        summary = SessionSummary({
            "session_id": session_id,
            "date": datetime.now().isoformat(),
            "topics_covered": topics,
            "key_learnings": [
                t.topic for t in session["threads"] if t.resolved
            ],
            "questions_asked": session["turn_count"],
            "knowledge_gaps": [
                s["topic"] for s in session["confusion_signals"]
            ],
            "user_sentiment": sentiment,
            "summary_text": session["running_summary"],
        })

        # Clean up
        del self._sessions[session_id]
        return summary

    def _extract_topic(self, message: str) -> Optional[str]:
        msg_lower = message.lower().strip()
        topic_starters = [
            "explain ", "what is ", "what are ", "how does ", "how do ",
            "tell me about ", "describe ", "compare ", "why does ",
            "what causes ", "what is the difference between ",
        ]
        for starter in topic_starters:
            if msg_lower.startswith(starter):
                topic = message[len(starter):].strip()
                words = topic.split()[:5]
                return " ".join(words).rstrip("?!.,;:")

        words = msg_lower.split()
        content_words = [w for w in words if len(w) > 3 and w not in {
            "what", "how", "why", "when", "where", "does", "do", "can",
            "could", "would", "should", "tell", "explain", "about",
            "think", "feel", "know", "mean", "make", "give",
        }]
        if content_words:
            return " ".join(content_words[:4])
        return None

    def _extract_user_facts(self, message: str) -> List[str]:
        facts = []
        patterns = [
            "i am ", "i'm ", "i study ", "i learned ", "i need help with ",
            "i have an exam ", "my exam is ", "i struggle with ",
            "i find ", "i prefer ", "i like ", "i want to ",
        ]
        msg_lower = message.lower()
        for pattern in patterns:
            if pattern in msg_lower:
                idx = msg_lower.index(pattern)
                fact = message[idx:idx + 100].strip().rstrip("!.?")
                if len(fact) > 5:
                    facts.append(fact)
        return facts

    def _detect_sentiment(self, message: str) -> str:
        msg_lower = message.lower()
        confusion_signals = [
            "i don't understand", "confused", "lost", "not clear",
            "doesn't make sense", "still don't get", "what do you mean",
            "i'm stuck", "help", "frustrated", "too hard", "too difficult",
        ]
        satisfaction_signals = [
            "got it", "understand", "makes sense", "clear", "thanks",
            "thank you", "awesome", "great", "perfect", "exactly",
            "that helps", "i see", "now i get it", "aha",
        ]
        for signal in confusion_signals:
            if signal in msg_lower:
                return "confusion"
        for signal in satisfaction_signals:
            if signal in msg_lower:
                return "satisfaction"
        return "neutral"

    def _build_running_summary(self, session: Dict) -> str:
        parts = []
        if session["topics_discussed"]:
            parts.append("Topics covered: " + ", ".join(session["topics_discussed"]))
        if session["user_facts"]:
            facts = [f["fact"] for f in session["user_facts"][-5:]]
            parts.append("User shared: " + "; ".join(facts))
        if session["confusion_signals"]:
            confused_topics = list(set(s["topic"] for s in session["confusion_signals"]))
            parts.append("Struggled with: " + ", ".join(confused_topics))
        return " | ".join(parts) if parts else "Session just started"


conversation_memory = ConversationMemory()
