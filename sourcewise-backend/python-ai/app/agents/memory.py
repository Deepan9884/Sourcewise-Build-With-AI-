"""
Agent Memory System - Persistent memory for all SourceWise agents.

Stores learning history, recommendation history, learning behavior,
and agent decisions to improve future agent decisions.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from datetime import datetime
from enum import Enum


class MemoryType(str, Enum):
    """Types of memory that can be stored"""
    LEARNING_HISTORY = "learning_history"
    RECOMMENDATION_HISTORY = "recommendation_history"
    LEARNING_BEHAVIOR = "learning_behavior"
    AGENT_DECISION = "agent_decision"
    STUDY_SESSION = "study_session"
    CONCEPT_INTERACTION = "concept_interaction"


class MemoryEntry(BaseModel):
    """A single memory entry"""
    id: str = ""
    user_id: str
    memory_type: MemoryType
    memory_data: Dict[str, Any]
    importance: float = 0.5  # 0.0 to 1.0
    created_at: str = datetime.now().isoformat()
    expires_at: Optional[str] = None
    metadata: Dict[str, Any] = {}


class AgentMemory:
    """
    Persistent memory system for agents.
    
    Stores:
    - Learning history (topics studied, paths taken)
    - Recommendation history (what was suggested, outcomes)
    - Learning behavior (preferred times, styles, session duration)
    - Agent decisions (why recommendations were made)
    """
    
    def __init__(self):
        self._memory_store: Dict[str, List[MemoryEntry]] = {}
    
    def store(self, entry: MemoryEntry) -> str:
        """Store a memory entry"""
        if not entry.id:
            entry.id = f"mem_{datetime.now().timestamp()}_{len(self._memory_store.get(entry.user_id, []))}"
        
        if entry.user_id not in self._memory_store:
            self._memory_store[entry.user_id] = []
        
        self._memory_store[entry.user_id].append(entry)
        return entry.id
    
    def recall(
        self,
        user_id: str,
        memory_type: Optional[MemoryType] = None,
        limit: int = 10,
        min_importance: float = 0.0
    ) -> List[MemoryEntry]:
        """Recall memories for a user"""
        memories = self._memory_store.get(user_id, [])
        
        # Filter by type
        if memory_type:
            memories = [m for m in memories if m.memory_type == memory_type]
        
        # Filter by importance
        memories = [m for m in memories if m.importance >= min_importance]
        
        # Filter out expired memories
        now = datetime.now().isoformat()
        memories = [m for m in memories if not m.expires_at or m.expires_at > now]
        
        # Sort by importance and recency
        memories.sort(key=lambda m: (m.importance, m.created_at), reverse=True)
        
        return memories[:limit]
    
    def get_learning_history(self, user_id: str) -> Dict[str, Any]:
        """Get summarized learning history"""
        memories = self.recall(user_id, MemoryType.LEARNING_HISTORY, limit=50)
        
        topics_studied = []
        learning_paths = []
        completed_plans = []
        
        for mem in memories:
            data = mem.memory_data
            if "topic" in data:
                topics_studied.append(data["topic"])
            if "path" in data:
                learning_paths.append(data["path"])
            if "plan_id" in data and data.get("completed"):
                completed_plans.append(data["plan_id"])
        
        return {
            "topics_studied": list(set(topics_studied)),
            "learning_paths": learning_paths,
            "completed_plans": completed_plans,
            "total_sessions": len(memories),
        }
    
    def get_recommendation_history(self, user_id: str) -> Dict[str, Any]:
        """Get summarized recommendation history"""
        memories = self.recall(user_id, MemoryType.RECOMMENDATION_HISTORY, limit=50)
        
        previously_suggested = []
        outcomes = []
        
        for mem in memories:
            data = mem.memory_data
            if "concept" in data:
                previously_suggested.append(data["concept"])
            if "outcome" in data:
                outcomes.append(data["outcome"])
        
        acceptance_rate = (
            sum(1 for o in outcomes if o == "accepted") / len(outcomes)
            if outcomes else 0
        )
        
        return {
            "previously_suggested": list(set(previously_suggested)),
            "total_suggestions": len(memories),
            "acceptance_rate": round(acceptance_rate, 2),
            "outcomes": outcomes[-10:],  # Last 10 outcomes
        }
    
    def get_learning_behavior(self, user_id: str) -> Dict[str, Any]:
        """Get summarized learning behavior"""
        memories = self.recall(user_id, MemoryType.LEARNING_BEHAVIOR, limit=100)
        
        study_times = []
        session_durations = []
        completion_rates = []
        
        for mem in memories:
            data = mem.memory_data
            if "study_time" in data:
                study_times.append(data["study_time"])
            if "session_duration" in data:
                session_durations.append(data["session_duration"])
            if "completion_rate" in data:
                completion_rates.append(data["completion_rate"])
        
        # Calculate preferred study times
        time_counts = {}
        for t in study_times:
            hour = t.get("hour", 12)
            time_counts[hour] = time_counts.get(hour, 0) + 1
        
        preferred_hours = sorted(time_counts.keys(), key=lambda h: time_counts[h], reverse=True)[:3]
        
        return {
            "preferred_study_hours": preferred_hours,
            "average_session_duration": (
                sum(session_durations) / len(session_durations)
                if session_durations else 30
            ),
            "average_completion_rate": (
                sum(completion_rates) / len(completion_rates)
                if completion_rates else 0.5
            ),
            "total_sessions": len(memories),
        }
    
    def get_agent_decisions(self, user_id: str) -> List[Dict[str, Any]]:
        """Get recent agent decisions for context"""
        memories = self.recall(user_id, MemoryType.AGENT_DECISION, limit=20)
        
        return [
            {
                "agent": m.memory_data.get("agent", "unknown"),
                "action": m.memory_data.get("action", "unknown"),
                "reason": m.memory_data.get("reason", ""),
                "timestamp": m.created_at,
            }
            for m in memories
        ]
    
    def record_study_session(
        self,
        user_id: str,
        topic: str,
        duration_minutes: int,
        activities: List[str],
        outcome: str = "completed"
    ):
        """Record a study session"""
        self.store(MemoryEntry(
            user_id=user_id,
            memory_type=MemoryType.STUDY_SESSION,
            memory_data={
                "topic": topic,
                "duration_minutes": duration_minutes,
                "activities": activities,
                "outcome": outcome,
            },
            importance=0.6,
        ))
    
    def record_recommendation(
        self,
        user_id: str,
        concept: str,
        recommendation_type: str,
        reason: str,
        outcome: str = "pending"
    ):
        """Record a recommendation and its outcome"""
        self.store(MemoryEntry(
            user_id=user_id,
            memory_type=MemoryType.RECOMMENDATION_HISTORY,
            memory_data={
                "concept": concept,
                "type": recommendation_type,
                "reason": reason,
                "outcome": outcome,
            },
            importance=0.7,
        ))
    
    def record_agent_decision(
        self,
        user_id: str,
        agent: str,
        action: str,
        reason: str,
        data: Optional[Dict] = None
    ):
        """Record an agent decision for future context"""
        self.store(MemoryEntry(
            user_id=user_id,
            memory_type=MemoryType.AGENT_DECISION,
            memory_data={
                "agent": agent,
                "action": action,
                "reason": reason,
                "data": data or {},
            },
            importance=0.5,
        ))
    
    def record_learning_behavior(
        self,
        user_id: str,
        study_time: Optional[Dict] = None,
        session_duration: Optional[int] = None,
        completion_rate: Optional[float] = None
    ):
        """Record learning behavior patterns"""
        self.store(MemoryEntry(
            user_id=user_id,
            memory_type=MemoryType.LEARNING_BEHAVIOR,
            memory_data={
                "study_time": study_time or {},
                "session_duration": session_duration,
                "completion_rate": completion_rate,
            },
            importance=0.4,
        ))
    
    def get_context_for_agent(self, user_id: str) -> Dict[str, Any]:
        """Get comprehensive memory context for agent decisions"""
        return {
            "learning_history": self.get_learning_history(user_id),
            "recommendation_history": self.get_recommendation_history(user_id),
            "learning_behavior": self.get_learning_behavior(user_id),
            "recent_decisions": self.get_agent_decisions(user_id),
        }


# Global memory instance
agent_memory = AgentMemory()
