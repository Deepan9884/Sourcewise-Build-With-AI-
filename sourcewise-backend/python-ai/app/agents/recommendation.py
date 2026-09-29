"""
Recommendation Agent - Decides what the learner should do next.

Analyzes profile, analytics, context, and memory to provide
adaptive, personalized recommendations with priority scoring.
"""

from typing import List, Dict, Any
from app.agents.base import BaseAgent, AgentContext, AgentResult
from app.agents.registry import registry


class RecommendationAgent(BaseAgent):
    """
    Generates personalized learning recommendations with adaptive scoring.
    """
    
    def can_handle(self, intent: str) -> bool:
        return intent in ["recommend", "suggest", "next", "focus"]
    
    def get_capabilities(self) -> List[str]:
        return [
            "adaptive_recommendations",
            "priority_scoring",
            "memory_aware_suggestions",
            "dashboard_feeds",
            "personalized_suggestions",
        ]
    
    async def execute(self, context: AgentContext, **kwargs) -> AgentResult:
        """Generate adaptive recommendations based on learning context and memory"""
        profile = context.learning_profile or {}
        mastery_data = profile.get("concept_mastery", [])
        gaps = profile.get("knowledge_gaps", [])
        memory = context.agent_memory or {}
        
        # Get memory context
        learning_history = memory.get("learning_history", {})
        recommendation_history = memory.get("recommendation_history", {})
        learning_behavior = memory.get("learning_behavior", {})
        
        # Score all concepts for priority
        scored_concepts = self._score_concepts(
            mastery_data, gaps, recommendation_history, learning_behavior
        )
        
        # Generate categorized recommendations
        recommendations = []
        
        # 1. Due Reviews (highest priority)
        due_reviews = kwargs.get("due_reviews", [])
        if due_reviews:
            recommendations.append({
                "type": "review",
                "priority": "high",
                "priority_score": 95,
                "title": f"Review {len(due_reviews)} concepts due today",
                "concept": due_reviews[0].get("concept") if due_reviews else None,
                "reason": "Spaced repetition schedule",
                "category": "revise_next",
            })
        
        # 2. Knowledge Gaps
        if gaps:
            gap_concepts = sorted(gaps, key=lambda g: g.get("severity", 3), reverse=True)
            recommendations.append({
                "type": "study",
                "priority": "high",
                "priority_score": 90,
                "title": f"Address {len(gaps)} knowledge gaps",
                "concept": gap_concepts[0].get("concept") if gap_concepts else None,
                "reason": "Low mastery detected",
                "category": "weakest_topic",
            })
        
        # 3. Weak Topics from scoring
        weak_from_scoring = [c for c in scored_concepts if c["score"] < 40][:3]
        for weak in weak_from_scoring:
            recommendations.append({
                "type": "practice",
                "priority": "medium",
                "priority_score": weak["score"] + 30,
                "title": f"Practice: {weak['concept']}",
                "concept": weak["concept"],
                "reason": weak["reason"],
                "category": "practice_next",
            })
        
        # 4. Quiz suggestion
        total_quizzes = kwargs.get("total_quizzes", 0)
        if total_quizzes == 0 and mastery_data:
            recommendations.append({
                "type": "quiz",
                "priority": "medium",
                "priority_score": 70,
                "title": "Take a diagnostic quiz",
                "reason": "No quizzes taken yet",
                "category": "study_next",
            })
        
        # 5. Upcoming exams
        upcoming_exams = kwargs.get("upcoming_exams", [])
        if upcoming_exams:
            exam = upcoming_exams[0]
            days_left = exam.get("days_left", 0)
            if days_left <= 7:
                recommendations.append({
                    "type": "plan",
                    "priority": "high",
                    "priority_score": 85,
                    "title": f"Exam in {days_left} days - focus on weak areas",
                    "reason": "Upcoming deadline",
                    "category": "priority_topic",
                })
        
        # 6. Memory-aware: avoid recently suggested
        previously_suggested = recommendation_history.get("previously_suggested", [])
        for rec in recommendations:
            if rec.get("concept") in previously_suggested:
                rec["priority_score"] -= 10
                rec["reason"] += " (reviewed recently)"
        
        # Sort by priority score
        recommendations.sort(key=lambda r: r.get("priority_score", 0), reverse=True)
        
        # What to study now
        what_to_study = self._determine_what_to_study(
            due_reviews, gaps, weak_from_scoring, mastery_data, learning_behavior
        )
        
        return self._create_result(
            success=True,
            action="recommend",
            data={
                "recommendations": recommendations[:6],
                "what_to_study": what_to_study,
                "total_recommendations": len(recommendations),
                "scoring_metadata": {
                    "concepts_scored": len(scored_concepts),
                    "memory_used": bool(memory),
                },
            },
            message=self._format_recommendation_message(recommendations, what_to_study),
        )
    
    def _score_concepts(
        self,
        mastery_data: List[Dict],
        gaps: List[Dict],
        recommendation_history: Dict,
        learning_behavior: Dict
    ) -> List[Dict]:
        """Score concepts for priority ranking"""
        scored = []
        
        for m in mastery_data:
            concept = m.get("concept", "")
            mastery_score = m.get("mastery_score", 0)
            total_attempts = m.get("total_attempts", 0)
            
            # Base score (lower mastery = higher priority)
            base_score = 100 - mastery_score
            
            # Attempt weight (fewer attempts = higher priority)
            attempt_weight = max(0, 50 - total_attempts * 5)
            
            # Gap bonus
            gap_bonus = 20 if any(g.get("concept") == concept for g in gaps) else 0
            
            # Recent activity penalty (recently studied = lower priority)
            recently_suggested = concept in recommendation_history.get("previously_suggested", [])
            recency_penalty = 15 if recently_suggested else 0
            
            # Final score
            final_score = base_score + attempt_weight + gap_bonus - recency_penalty
            
            # Determine reason
            reasons = []
            if mastery_score < 50:
                reasons.append("low mastery")
            if total_attempts < 3:
                reasons.append("needs more practice")
            if gap_bonus > 0:
                reasons.append("knowledge gap")
            if recently_suggested:
                reasons.append("recently reviewed")
            
            scored.append({
                "concept": concept,
                "score": max(0, min(100, final_score)),
                "mastery": mastery_score,
                "attempts": total_attempts,
                "reason": ", ".join(reasons) if reasons else "normal priority",
            })
        
        # Sort by score descending
        scored.sort(key=lambda c: c["score"], reverse=True)
        
        return scored
    
    def _determine_what_to_study(
        self,
        due_reviews: List,
        gaps: List,
        weak_topics: List,
        mastery_data: List,
        learning_behavior: Dict
    ) -> Dict:
        """Determine the single best thing to study now"""
        if due_reviews:
            return {
                "type": "review",
                "concept": due_reviews[0].get("concept"),
                "reason": "Review is due today",
            }
        
        if gaps:
            return {
                "type": "study",
                "concept": gaps[0].get("concept"),
                "reason": "Knowledge gap detected",
            }
        
        if weak_topics:
            return {
                "type": "practice",
                "concept": weak_topics[0].get("concept"),
                "reason": "Weak topic needs practice",
            }
        
        if not mastery_data:
            return {
                "type": "quiz",
                "concept": None,
                "reason": "Take a quiz to assess your knowledge",
            }
        
        # Use learning behavior to suggest time
        preferred_hours = learning_behavior.get("preferred_study_hours", [])
        if preferred_hours:
            return {
                "type": "continue",
                "concept": None,
                "reason": f"Keep studying - your preferred time is {preferred_hours[0]}:00",
            }
        
        return {
            "type": "continue",
            "concept": None,
            "reason": "Keep up the great work!",
        }
    
    def _format_recommendation_message(self, recommendations: List, what_to_study: Dict) -> str:
        """Format recommendation message"""
        if not recommendations:
            return "Great progress! Keep studying to unlock more insights."
        
        primary = what_to_study.get("reason", "Continue your learning journey")
        return f"Based on your learning profile: {primary}"


# Register agent
recommendation_agent = RecommendationAgent()
registry.register(recommendation_agent, intents=["recommend", "suggest", "next", "focus"])
