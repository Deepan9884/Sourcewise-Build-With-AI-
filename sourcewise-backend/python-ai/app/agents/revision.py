"""
Revision Agent - Manages long-term retention through spaced repetition.

Creates review schedules, prioritizes reviews, and tracks retention.
"""

from typing import List, Dict, Any
from datetime import datetime, timedelta
from app.agents.base import BaseAgent, AgentContext, AgentResult
from app.agents.registry import registry


class RevisionAgent(BaseAgent):
    """
    Manages spaced repetition and review scheduling.
    """
    
    def can_handle(self, intent: str) -> bool:
        return intent in ["revise", "review", "revision"]
    
    def get_capabilities(self) -> List[str]:
        return [
            "review_scheduling",
            "spaced_repetition",
            "priority_calculation",
            "retention_tracking",
        ]
    
    async def execute(self, context: AgentContext, **kwargs) -> AgentResult:
        """Execute revision-related actions"""
        action = kwargs.get("action", "get_due")
        
        if action == "schedule":
            return await self._schedule_review(context, **kwargs)
        elif action == "complete":
            return await self._complete_review(context, **kwargs)
        else:
            return await self._get_due_reviews(context, **kwargs)
    
    async def _schedule_review(self, context: AgentContext, **kwargs) -> AgentResult:
        """Schedule a concept for review"""
        concept = kwargs.get("concept", "")
        mastery_score = kwargs.get("mastery_score", 0)
        
        # Calculate interval based on mastery (SM-2 algorithm)
        interval_days = self._calculate_interval(mastery_score)
        next_review = datetime.now() + timedelta(days=interval_days)
        
        return self._create_result(
            success=True,
            action="schedule_review",
            data={
                "concept": concept,
                "mastery_score": mastery_score,
                "interval_days": interval_days,
                "next_review": next_review.isoformat(),
            },
            message=f"Scheduled '{concept}' for review in {interval_days} days",
        )
    
    async def _complete_review(self, context: AgentContext, **kwargs) -> AgentResult:
        """Complete a review and update schedule"""
        concept = kwargs.get("concept", "")
        score = kwargs.get("score", 0)
        current_interval = kwargs.get("current_interval", 1)
        
        # Calculate new interval
        new_interval = self._calculate_next_interval(score, current_interval)
        next_review = datetime.now() + timedelta(days=new_interval)
        
        return self._create_result(
            success=True,
            action="complete_review",
            data={
                "concept": concept,
                "score": score,
                "new_interval": new_interval,
                "next_review": next_review.isoformat(),
            },
            message=f"Review complete for '{concept}'. Next review in {new_interval} days",
        )
    
    async def _get_due_reviews(self, context: AgentContext, **kwargs) -> AgentResult:
        """Get reviews due today"""
        # This would query the database in production
        return self._create_result(
            success=True,
            action="get_due_reviews",
            data={
                "due_today": [],
                "upcoming": [],
                "overdue": [],
            },
            message="Retrieved due reviews",
        )
    
    def _calculate_interval(self, mastery_score: float) -> int:
        """Calculate initial review interval based on mastery"""
        if mastery_score > 90:
            return 7
        elif mastery_score > 75:
            return 3
        elif mastery_score > 50:
            return 2
        else:
            return 1
    
    def _calculate_next_interval(self, score: float, current_interval: int) -> int:
        """Calculate next interval using SM-2 algorithm"""
        if score > 90:
            return min(current_interval * 2, 30)
        elif score > 75:
            return min(current_interval + 1, 14)
        else:
            return 1  # Reset to 1 day


# Register agent
revision_agent = RevisionAgent()
registry.register(revision_agent, intents=["revise", "review", "revision"])
