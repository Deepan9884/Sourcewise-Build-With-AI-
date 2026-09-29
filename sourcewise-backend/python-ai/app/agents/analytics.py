"""
Analytics Agent - Generates insights and predictions from learning data.

Calculates metrics, detects trends, predicts outcomes, and produces reports.
"""

from typing import List, Dict, Any
from app.agents.base import BaseAgent, AgentContext, AgentResult
from app.agents.registry import registry


class AnalyticsAgent(BaseAgent):
    """
    Generates analytics, predictions, and insights from learning activities.
    """
    
    def can_handle(self, intent: str) -> bool:
        return intent in ["analyze", "analytics", "insight", "report"]
    
    def get_capabilities(self) -> List[str]:
        return [
            "study_time_calculation",
            "accuracy_analysis",
            "mastery_growth_tracking",
            "retention_measurement",
            "trend_detection",
            "predictive_analytics",
            "risk_assessment",
            "snapshot_generation",
        ]
    
    async def execute(self, context: AgentContext, **kwargs) -> AgentResult:
        """Execute analytics actions"""
        action = kwargs.get("action", "overview")
        
        if action == "trends":
            return await self._analyze_trends(context, **kwargs)
        elif action == "predict":
            return await self._predict_outcomes(context, **kwargs)
        elif action == "snapshot":
            return await self._generate_snapshot(context, **kwargs)
        else:
            return await self._get_overview(context, **kwargs)
    
    async def _get_overview(self, context: AgentContext, **kwargs) -> AgentResult:
        """Get comprehensive analytics overview with predictions"""
        profile = context.learning_profile or {}
        mastery_data = profile.get("concept_mastery", [])
        
        # Calculate metrics
        total_concepts = len(mastery_data)
        mastered = sum(1 for m in mastery_data if m.get("level") in ["mastery", "proficient"])
        avg_mastery = (
            sum(m.get("mastery_score", 0) for m in mastery_data) / total_concepts
            if total_concepts > 0 else 0
        )
        
        # Quiz accuracy
        quiz_accuracy = kwargs.get("quiz_accuracy", 0)
        total_quizzes = kwargs.get("total_quizzes", 0)
        
        # Study time
        study_hours = kwargs.get("study_hours", 0)
        
        # Predictions
        predictions = self._predict_outcomes_sync(
            mastery_data, quiz_accuracy, total_quizzes, study_hours
        )
        
        # Learning velocity
        velocity = self._calculate_velocity(mastery_data)
        
        # Risk assessment
        risk = self._assess_learning_risk(mastery_data, quiz_accuracy)
        
        return self._create_result(
            success=True,
            action="overview",
            data={
                "total_concepts": total_concepts,
                "mastered_concepts": mastered,
                "mastery_percentage": round(avg_mastery, 1),
                "quiz_accuracy": quiz_accuracy,
                "total_quizzes": total_quizzes,
                "study_hours": study_hours,
                "learning_velocity": velocity,
                "predictions": predictions,
                "risk_level": risk["level"],
                "risk_factors": risk["factors"],
            },
            message=f"Analytics: {mastered}/{total_concepts} concepts mastered, {quiz_accuracy}% quiz accuracy",
        )
    
    async def _analyze_trends(self, context: AgentContext, **kwargs) -> AgentResult:
        """Analyze learning trends with enhanced detection"""
        mastery_data = context.learning_profile.get("concept_mastery", []) if context.learning_profile else []
        
        # Calculate trend metrics
        quiz_trend = self._detect_trend(
            kwargs.get("quiz_history", []),
            "score"
        )
        
        mastery_trend = self._detect_trend(
            [{"score": m.get("mastery_score", 0), "date": m.get("last_assessed", "")} for m in mastery_data],
            "score"
        )
        
        study_trend = self._detect_trend(
            kwargs.get("study_history", []),
            "duration"
        )
        
        return self._create_result(
            success=True,
            action="trends",
            data={
                "quiz_trend": quiz_trend["direction"],
                "mastery_trend": mastery_trend["direction"],
                "study_trend": study_trend["direction"],
                "quiz_velocity": quiz_trend["velocity"],
                "mastery_velocity": mastery_trend["velocity"],
                "insights": self._generate_trend_insights(quiz_trend, mastery_trend, study_trend),
            },
            message=f"Trends: Quiz {quiz_trend['direction']}, Mastery {mastery_trend['direction']}",
        )
    
    async def _predict_outcomes(self, context: AgentContext, **kwargs) -> AgentResult:
        """Predict learning outcomes"""
        profile = context.learning_profile or {}
        mastery_data = profile.get("concept_mastery", [])
        
        predictions = self._predict_outcomes_sync(
            mastery_data,
            kwargs.get("quiz_accuracy", 0),
            kwargs.get("total_quizzes", 0),
            kwargs.get("study_hours", 0),
        )
        
        return self._create_result(
            success=True,
            action="predict",
            data={"predictions": predictions},
            message=f"Predicted exam readiness: {predictions['exam_readiness']}%",
        )
    
    async def _generate_snapshot(self, context: AgentContext, **kwargs) -> AgentResult:
        """Generate analytics snapshot"""
        period = kwargs.get("period", "weekly")
        
        return self._create_result(
            success=True,
            action="snapshot",
            data={
                "period": period,
                "study_hours": kwargs.get("study_hours", 0),
                "quiz_accuracy": kwargs.get("quiz_accuracy", 0),
                "topics_mastered": kwargs.get("topics_mastered", 0),
            },
            message=f"Generated {period} analytics snapshot",
        )
    
    def _predict_outcomes_sync(
        self,
        mastery_data: List[Dict],
        quiz_accuracy: float,
        total_quizzes: int,
        study_hours: float
    ) -> Dict:
        """Predict learning outcomes based on current data"""
        total_concepts = len(mastery_data)
        mastered = sum(1 for m in mastery_data if m.get("level") in ["mastery", "proficient"])
        avg_mastery = (
            sum(m.get("mastery_score", 0) for m in mastery_data) / total_concepts
            if total_concepts > 0 else 0
        )
        
        # Predicted exam readiness (0-100)
        exam_readiness = min(100, round(
            avg_mastery * 0.4 +
            quiz_accuracy * 0.3 +
            (mastered / max(total_concepts, 1) * 100) * 0.2 +
            min(study_hours * 2, 20) * 0.1
        ))
        
        # Predicted retention (0-100)
        # Based on spaced repetition coverage
        review_coverage = sum(
            1 for m in mastery_data
            if m.get("next_review_date")
        ) / max(total_concepts, 1) * 100
        
        predicted_retention = min(100, round(
            avg_mastery * 0.5 +
            review_coverage * 0.3 +
            quiz_accuracy * 0.2
        ))
        
        # Completion probability
        completion_probability = min(100, round(
            (mastered / max(total_concepts, 1) * 100) * 0.5 +
            quiz_accuracy * 0.3 +
            min(total_quizzes, 10) * 2
        ))
        
        return {
            "exam_readiness": exam_readiness,
            "predicted_retention": predicted_retention,
            "completion_probability": completion_probability,
            "confidence_level": "high" if exam_readiness > 70 else "medium" if exam_readiness > 40 else "low",
        }
    
    def _assess_learning_risk(self, mastery_data: List[Dict], quiz_accuracy: float) -> Dict:
        """Assess learning risk level"""
        factors = []
        risk_score = 0
        
        # Low mastery
        low_mastery = sum(1 for m in mastery_data if m.get("mastery_score", 0) < 50)
        if low_mastery > len(mastery_data) * 0.3:
            factors.append(f"{low_mastery} concepts below 50% mastery")
            risk_score += 30
        
        # Low quiz accuracy
        if quiz_accuracy < 50 and quiz_accuracy > 0:
            factors.append("Quiz accuracy below 50%")
            risk_score += 25
        
        # No recent activity
        recent = sum(
            1 for m in mastery_data
            if m.get("last_assessed", "") > "2026-06-15"
        )
        if recent == 0 and len(mastery_data) > 0:
            factors.append("No recent learning activity")
            risk_score += 20
        
        # Determine level
        if risk_score >= 50:
            level = "high"
        elif risk_score >= 25:
            level = "medium"
        else:
            level = "low"
        
        return {"level": level, "score": risk_score, "factors": factors}
    
    def _calculate_velocity(self, mastery_data: List[Dict]) -> float:
        """Calculate learning velocity (concepts mastered per week)"""
        from datetime import datetime, timedelta
        week_ago = (datetime.now() - timedelta(days=7)).isoformat()
        
        recent_masteries = sum(
            1 for m in mastery_data
            if m.get("level") in ["mastery", "proficient"]
            and m.get("last_assessed", "") > week_ago
        )
        
        return recent_masteries
    
    def _detect_trend(self, data: List[Dict], value_key: str) -> Dict:
        """Detect trend direction from historical data"""
        if len(data) < 2:
            return {"direction": "stable", "velocity": 0}
        
        values = [d.get(value_key, 0) for d in data if d.get(value_key) is not None]
        
        if len(values) < 2:
            return {"direction": "stable", "velocity": 0}
        
        # Simple trend detection
        recent_avg = sum(values[-3:]) / min(3, len(values))
        older_avg = sum(values[:-3]) / max(1, len(values) - 3) if len(values) > 3 else values[0]
        
        diff = recent_avg - older_avg
        
        if diff > 5:
            direction = "improving"
        elif diff < -5:
            direction = "declining"
        else:
            direction = "stable"
        
        # Check for acceleration
        if len(values) >= 4:
            recent_diff = values[-1] - values[-2]
            older_diff = values[-2] - values[-3]
            if recent_diff > older_diff * 1.5 and recent_diff > 0:
                direction = "accelerating"
            elif recent_diff < older_diff * 0.5 and recent_diff > 0:
                direction = "plateauing"
        
        return {"direction": direction, "velocity": round(diff, 2)}
    
    def _generate_trend_insights(self, quiz_trend: Dict, mastery_trend: Dict, study_trend: Dict) -> List[str]:
        """Generate insights from trends"""
        insights = []
        
        if quiz_trend["direction"] == "improving":
            insights.append("Quiz scores are improving - keep practicing!")
        elif quiz_trend["direction"] == "declining":
            insights.append("Quiz scores declining - review weak areas")
        
        if mastery_trend["direction"] == "accelerating":
            insights.append("Learning is accelerating - great momentum!")
        elif mastery_trend["direction"] == "plateauing":
            insights.append("Learning has plateaued - try new study methods")
        
        if study_trend["direction"] == "declining":
            insights.append("Study time decreasing - maintain consistency")
        
        return insights


# Register agent
analytics_agent = AnalyticsAgent()
registry.register(analytics_agent, intents=["analyze", "analytics", "insight", "report"])
