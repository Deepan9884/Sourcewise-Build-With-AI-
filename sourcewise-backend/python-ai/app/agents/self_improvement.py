"""
Self-Improvement System - Feedback collection and quality learning.

Tracks user interactions with educational content and learns
what patterns produce better learning outcomes.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime
from app.agents.memory import agent_memory, MemoryEntry, MemoryType


class FeedbackType(str):
    """Types of feedback that can be collected"""
    FLASHCARD_USED = "flashcard_used"
    FLASHCARD_SKIPPED = "flashcard_skipped"
    QUIZ_COMPLETED = "quiz_completed"
    QUIZ_PASSED = "quiz_passed"
    QUIZ_FAILED = "quiz_failed"
    PLAN_COMPLETED = "plan_completed"
    PLAN_ABANDONED = "plan_abandoned"
    RECOMMENDATION_ACCEPTED = "recommendation_accepted"
    RECOMMENDATION_IGNORED = "recommendation_ignored"


class QualityPattern(BaseModel):
    """A pattern that affects content quality"""
    pattern_type: str
    description: str
    success_rate: float
    sample_size: int
    last_updated: str


class SelfImprovementSystem:
    """
    Tracks feedback and learns what content patterns work best.
    """
    
    def __init__(self):
        self._patterns: Dict[str, QualityPattern] = {}
    
    def record_feedback(
        self,
        user_id: str,
        feedback_type: str,
        content_data: Dict[str, Any],
        outcome: str,
        score: Optional[float] = None
    ):
        """Record user feedback on educational content"""
        # Store in memory
        agent_memory.store(MemoryEntry(
            user_id=user_id,
            memory_type=MemoryType.RECOMMENDATION_HISTORY,
            memory_data={
                "feedback_type": feedback_type,
                "content": content_data,
                "outcome": outcome,
                "score": score,
            },
            importance=0.8,
        ))
        
        # Update patterns
        self._update_patterns(feedback_type, content_data, outcome)
    
    def record_flashcard_usage(
        self,
        user_id: str,
        card_data: Dict,
        used: bool,
        recall_score: Optional[float] = None
    ):
        """Record flashcard usage feedback"""
        outcome = "used" if used else "skipped"
        self.record_feedback(
            user_id=user_id,
            feedback_type=FeedbackType.FLASHCARD_USED if used else FeedbackType.FLASHCARD_SKIPPED,
            content_data=card_data,
            outcome=outcome,
            score=recall_score,
        )
    
    def record_quiz_outcome(
        self,
        user_id: str,
        quiz_data: Dict,
        passed: bool,
        score: float
    ):
        """Record quiz outcome feedback"""
        outcome = "passed" if passed else "failed"
        feedback_type = FeedbackType.QUIZ_PASSED if passed else FeedbackType.QUIZ_FAILED
        
        self.record_feedback(
            user_id=user_id,
            feedback_type=feedback_type,
            content_data=quiz_data,
            outcome=outcome,
            score=score,
        )
    
    def record_plan_completion(
        self,
        user_id: str,
        plan_data: Dict,
        completed: bool
    ):
        """Record study plan completion feedback"""
        outcome = "completed" if completed else "abandoned"
        feedback_type = FeedbackType.PLAN_COMPLETED if completed else FeedbackType.PLAN_ABANDONED
        
        self.record_feedback(
            user_id=user_id,
            feedback_type=feedback_type,
            content_data=plan_data,
            outcome=outcome,
        )
    
    def record_recommendation_outcome(
        self,
        user_id: str,
        recommendation: Dict,
        accepted: bool
    ):
        """Record recommendation acceptance feedback"""
        outcome = "accepted" if accepted else "ignored"
        feedback_type = FeedbackType.RECOMMENDATION_ACCEPTED if accepted else FeedbackType.RECOMMENDATION_IGNORED
        
        self.record_feedback(
            user_id=user_id,
            feedback_type=feedback_type,
            content_data=recommendation,
            outcome=outcome,
        )
    
    def get_learning_insights(self, user_id: str) -> Dict[str, Any]:
        """Get insights from collected feedback"""
        memories = agent_memory.recall(
            user_id,
            MemoryType.RECOMMENDATION_HISTORY,
            limit=100
        )
        
        # Analyze feedback
        flashcard_stats = self._analyze_flashcard_feedback(memories)
        quiz_stats = self._analyze_quiz_feedback(memories)
        plan_stats = self._analyze_plan_feedback(memories)
        recommendation_stats = self._analyze_recommendation_feedback(memories)
        
        return {
            "flashcard_insights": flashcard_stats,
            "quiz_insights": quiz_stats,
            "plan_insights": plan_stats,
            "recommendation_insights": recommendation_stats,
            "overall_engagement": self._calculate_engagement(memories),
        }
    
    def get_quality_patterns(self) -> Dict[str, QualityPattern]:
        """Get learned quality patterns"""
        return self._patterns
    
    def _update_patterns(self, feedback_type: str, content_data: Dict, outcome: str):
        """Update quality patterns based on feedback"""
        # Extract pattern features
        features = self._extract_features(content_data)
        
        for feature in features:
            pattern_key = f"{feedback_type}_{feature}"
            
            if pattern_key not in self._patterns:
                self._patterns[pattern_key] = QualityPattern(
                    pattern_type=feedback_type,
                    description=f"Pattern for {feature}",
                    success_rate=0.5,
                    sample_size=0,
                    last_updated=datetime.now().isoformat(),
                )
            
            pattern = self._patterns[pattern_key]
            pattern.sample_size += 1
            
            # Update success rate with exponential moving average
            success = 1.0 if outcome in ["used", "passed", "completed", "accepted"] else 0.0
            alpha = 0.1  # Learning rate
            pattern.success_rate = pattern.success_rate * (1 - alpha) + success * alpha
            pattern.last_updated = datetime.now().isoformat()
    
    def _extract_features(self, content_data: Dict) -> List[str]:
        """Extract features from content for pattern matching"""
        features = []
        
        # Card type
        if "type" in content_data:
            features.append(f"type_{content_data['type']}")
        
        # Difficulty
        if "difficulty" in content_data:
            features.append(f"diff_{content_data['difficulty']}")
        
        # Concept
        if "concept" in content_data:
            features.append(f"concept_{content_data['concept'][:20]}")
        
        return features
    
    def _analyze_flashcard_feedback(self, memories: List) -> Dict:
        """Analyze flashcard feedback patterns"""
        used = sum(1 for m in memories if m.memory_data.get("feedback_type") == FeedbackType.FLASHCARD_USED)
        skipped = sum(1 for m in memories if m.memory_data.get("feedback_type") == FeedbackType.FLASHCARD_SKIPPED)
        
        total = used + skipped
        engagement_rate = used / total if total > 0 else 0
        
        return {
            "used": used,
            "skipped": skipped,
            "engagement_rate": round(engagement_rate, 2),
        }
    
    def _analyze_quiz_feedback(self, memories: List) -> Dict:
        """Analyze quiz feedback patterns"""
        passed = sum(1 for m in memories if m.memory_data.get("feedback_type") == FeedbackType.QUIZ_PASSED)
        failed = sum(1 for m in memories if m.memory_data.get("feedback_type") == FeedbackType.QUIZ_FAILED)
        
        total = passed + failed
        pass_rate = passed / total if total > 0 else 0
        
        return {
            "passed": passed,
            "failed": failed,
            "pass_rate": round(pass_rate, 2),
        }
    
    def _analyze_plan_feedback(self, memories: List) -> Dict:
        """Analyze study plan feedback patterns"""
        completed = sum(1 for m in memories if m.memory_data.get("feedback_type") == FeedbackType.PLAN_COMPLETED)
        abandoned = sum(1 for m in memories if m.memory_data.get("feedback_type") == FeedbackType.PLAN_ABANDONED)
        
        total = completed + abandoned
        completion_rate = completed / total if total > 0 else 0
        
        return {
            "completed": completed,
            "abandoned": abandoned,
            "completion_rate": round(completion_rate, 2),
        }
    
    def _analyze_recommendation_feedback(self, memories: List) -> Dict:
        """Analyze recommendation feedback patterns"""
        accepted = sum(1 for m in memories if m.memory_data.get("feedback_type") == FeedbackType.RECOMMENDATION_ACCEPTED)
        ignored = sum(1 for m in memories if m.memory_data.get("feedback_type") == FeedbackType.RECOMMENDATION_IGNORED)
        
        total = accepted + ignored
        acceptance_rate = accepted / total if total > 0 else 0
        
        return {
            "accepted": accepted,
            "ignored": ignored,
            "acceptance_rate": round(acceptance_rate, 2),
        }
    
    def _calculate_engagement(self, memories: List) -> Dict:
        """Calculate overall engagement metrics"""
        total_interactions = len(memories)
        
        if total_interactions == 0:
            return {"level": "new", "score": 0}
        
        # Calculate engagement score
        positive = sum(1 for m in memories if m.memory_data.get("outcome") in ["used", "passed", "completed", "accepted"])
        engagement_score = (positive / total_interactions) * 100 if total_interactions > 0 else 0
        
        # Determine level
        if engagement_score >= 80:
            level = "high"
        elif engagement_score >= 50:
            level = "medium"
        else:
            level = "low"
        
        return {
            "level": level,
            "score": round(engagement_score, 1),
            "total_interactions": total_interactions,
        }


# Global self-improvement system
self_improvement = SelfImprovementSystem()
