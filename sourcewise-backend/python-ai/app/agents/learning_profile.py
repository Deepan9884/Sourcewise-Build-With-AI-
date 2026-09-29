"""
Learning Profile Agent - Maintains learner model.

Tracks mastery, confidence, knowledge gaps, and learning velocity.
"""

from typing import List, Dict, Any
from app.agents.base import BaseAgent, AgentContext, AgentResult
from app.agents.registry import registry


class LearningProfileAgent(BaseAgent):
    """
    Maintains and updates the learner's profile.
    """
    
    def can_handle(self, intent: str) -> bool:
        return intent in ["profile", "mastery", "progress", "level"]
    
    def get_capabilities(self) -> List[str]:
        return [
            "mastery_tracking",
            "confidence_calculation",
            "gap_detection",
            "velocity_measurement",
            "level_classification",
        ]
    
    async def execute(self, context: AgentContext, **kwargs) -> AgentResult:
        """Update learning profile based on activity"""
        action = kwargs.get("action", "update")
        
        if action == "update":
            return await self._update_profile(context, **kwargs)
        elif action == "get":
            return await self._get_profile(context)
        else:
            return await self._analyze_profile(context)
    
    async def _update_profile(self, context: AgentContext, **kwargs) -> AgentResult:
        """Update profile based on quiz/flashcard/tutor results"""
        concept = kwargs.get("concept", "")
        score = kwargs.get("score", 0)
        correct = kwargs.get("correct", False)
        event_type = kwargs.get("event_type", "unknown")
        
        # Calculate mastery update
        mastery_update = self._calculate_mastery_update(
            concept=concept,
            score=score,
            correct=correct,
            event_type=event_type,
        )
        
        # Detect knowledge gaps
        gap_detected = score < 50
        
        # Calculate level
        level = self._calculate_level(mastery_update["mastery_score"])
        
        return self._create_result(
            success=True,
            action="update_profile",
            data={
                "concept": concept,
                "mastery_update": mastery_update,
                "level": level,
                "gap_detected": gap_detected,
                "event_type": event_type,
            },
            message=f"Updated mastery for '{concept}': {mastery_update['mastery_score']}% ({level})",
        )
    
    async def _get_profile(self, context: AgentContext) -> AgentResult:
        """Get current learning profile summary"""
        profile = context.learning_profile or {}
        
        mastery_data = profile.get("concept_mastery", [])
        gaps = profile.get("knowledge_gaps", [])
        
        # Calculate summary stats
        total_concepts = len(mastery_data)
        mastered = sum(1 for m in mastery_data if m.get("level") in ["mastery", "proficient"])
        avg_mastery = (
            sum(m.get("mastery_score", 0) for m in mastery_data) / total_concepts
            if total_concepts > 0 else 0
        )
        
        return self._create_result(
            success=True,
            action="get_profile",
            data={
                "total_concepts": total_concepts,
                "mastered_concepts": mastered,
                "average_mastery": round(avg_mastery, 1),
                "open_gaps": len(gaps),
                "mastery_distribution": self._get_mastery_distribution(mastery_data),
            },
            message=f"Learning profile: {mastered}/{total_concepts} concepts mastered ({avg_mastery:.1f}% avg)",
        )
    
    async def _analyze_profile(self, context: AgentContext) -> AgentResult:
        """Analyze profile for insights"""
        profile = context.learning_profile or {}
        mastery_data = profile.get("concept_mastery", [])
        
        # Identify patterns
        weak_areas = [
            m for m in mastery_data
            if m.get("mastery_score", 0) < 50
        ]
        
        strong_areas = [
            m for m in mastery_data
            if m.get("mastery_score", 0) >= 80
        ]
        
        # Learning velocity (concepts mastered recently)
        recent_masteries = [
            m for m in mastery_data
            if m.get("level") in ["mastery", "proficient"]
        ]
        
        return self._create_result(
            success=True,
            action="analyze_profile",
            data={
                "weak_areas": [{"concept": w["concept"], "score": w["mastery_score"]} for w in weak_areas[:5]],
                "strong_areas": [{"concept": s["concept"], "score": s["mastery_score"]} for s in strong_areas[:5]],
                "recommendations": self._generate_recommendations(weak_areas, strong_areas),
            },
            message=f"Analysis: {len(weak_areas)} weak areas, {len(strong_areas)} strong areas",
        )
    
    def _calculate_mastery_update(self, concept: str, score: float, correct: bool, event_type: str) -> Dict:
        """Calculate mastery score update"""
        # Weight by event type
        weights = {
            "quiz": 1.0,
            "flashcard_review": 0.5,
            "practice": 0.8,
            "revision": 0.7,
            "tutoring_session": 0.3,
        }
        
        weight = weights.get(event_type, 0.5)
        adjusted_score = score * weight
        
        return {
            "concept": concept,
            "score": adjusted_score,
            "correct": correct,
            "weight": weight,
            "mastery_score": score,
        }
    
    def _calculate_level(self, mastery_score: float) -> str:
        """Calculate mastery level from score"""
        if mastery_score >= 90:
            return "mastery"
        elif mastery_score >= 75:
            return "proficient"
        elif mastery_score >= 50:
            return "developing"
        else:
            return "novice"
    
    def _get_mastery_distribution(self, mastery_data: List[Dict]) -> Dict:
        """Get distribution of mastery levels"""
        distribution = {"novice": 0, "developing": 0, "proficient": 0, "mastery": 0}
        
        for m in mastery_data:
            level = m.get("level", "novice")
            if level in distribution:
                distribution[level] += 1
        
        return distribution
    
    def _generate_recommendations(self, weak_areas: List, strong_areas: List) -> List[str]:
        """Generate learning recommendations"""
        recommendations = []
        
        if weak_areas:
            recommendations.append(
                f"Focus on {len(weak_areas)} weak concepts: {', '.join(w['concept'] for w in weak_areas[:3])}"
            )
        
        if strong_areas:
            recommendations.append(
                f"Leverage your strength in {strong_areas[0]['concept']} for related topics"
            )
        
        if not weak_areas and not strong_areas:
            recommendations.append("Start with a diagnostic quiz to assess your knowledge")
        
        return recommendations


# Register agent
learning_profile_agent = LearningProfileAgent()
registry.register(learning_profile_agent, intents=["profile", "mastery", "progress", "level"])
