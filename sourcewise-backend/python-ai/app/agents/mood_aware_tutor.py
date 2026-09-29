"""
Mood-Aware Tutor Agent — adapts tutoring style to the student's
current cognitive/emotional state (hybrid manual + inferred mood).
"""

from typing import List, Dict, Any
from app.agents.base import BaseAgent, AgentContext, AgentResult
from app.agents.registry import registry
from app.services import llm as llm_service


MOOD_STRATEGIES: Dict[str, Dict[str, Any]] = {
    "energized": {
        "style": "challenging", "depth": "deep", "pace": "fast",
        "activities": ["socratic", "problem_solving", "connections"],
        "encouragement": "You're on fire — let's push further!",
        "temperature": 0.5,
    },
    "focused": {
        "style": "structured", "depth": "moderate_deep", "pace": "steady",
        "activities": ["guided_practice", "elaboration", "summarization"],
        "encouragement": "Great focus — keep going.",
        "temperature": 0.35,
    },
    "neutral": {
        "style": "balanced", "depth": "moderate", "pace": "moderate",
        "activities": ["explanation", "examples", "quiz"],
        "encouragement": "Let's work through this together.",
        "temperature": 0.3,
    },
    "tired": {
        "style": "gentle", "depth": "surface", "pace": "slow",
        "activities": ["flashcards", "recognition", "audio_summary"],
        "encouragement": "Small steps count. Want a quick low-effort review?",
        "temperature": 0.25,
    },
    "stressed": {
        "style": "supportive", "depth": "targeted", "pace": "slow",
        "activities": ["breakdown", "one_thing_at_time", "breathing"],
        "encouragement": "You're doing fine. Let's tackle just ONE small thing.",
        "temperature": 0.25,
    },
    "anxious": {
        "style": "reassuring", "depth": "structured", "pace": "very_slow",
        "activities": ["roadmap", "chunking", "confidence_building"],
        "encouragement": "Here's your clear path — one step at a time.",
        "temperature": 0.2,
    },
}

VALID_MOODS = list(MOOD_STRATEGIES.keys())


class MoodAwareTutorAgent(BaseAgent):
    """Tutor that adapts explanation style, depth and pace to mood."""

    def can_handle(self, intent: str) -> bool:
        return intent in ["tutor", "explain", "study", "mood_tutor", "mood-tutor"]

    def get_capabilities(self) -> List[str]:
        return ["mood_adaptive_tutoring", "strategy_selection", "encouragement", "pacing"]

    @staticmethod
    def strategy_for(mood: str) -> Dict[str, Any]:
        return MOOD_STRATEGIES.get((mood or "neutral").lower(), MOOD_STRATEGIES["neutral"])

    async def execute(self, context: AgentContext, **kwargs) -> AgentResult:
        question = kwargs.get("question", "")
        mood = (kwargs.get("mood") or context.metadata.get("mood") or "neutral").lower()
        if mood not in MOOD_STRATEGIES:
            mood = "neutral"
        strategy = self.strategy_for(mood)
        subject = kwargs.get("subject") or context.metadata.get("subject")

        prefix = (
            f"[Tutor mode: {strategy['style']} | depth: {strategy['depth']} | pace: {strategy['pace']}] "
            f"Student mood: {mood}. {strategy['encouragement']} "
            + (f"Subject focus: {subject}. " if subject else "")
            + f"Prefer activities: {', '.join(strategy['activities'])}. "
            f"Student question: {question}"
        )
        try:
            from app.services import vector_store
            chunks = vector_store.query_chunks(
                question=question, source_ids=context.source_ids, top_k=6)
        except Exception:
            chunks = []

        try:
            answer = await llm_service.chat(
                question=prefix, context_chunks=chunks,
                history=context.conversation_history or [],
                user_level="intermediate",
            )
        except Exception as e:
            return self._create_result(success=False, action="mood_tutor",
                message="Tutor request failed", errors=[str(e)])

        return self._create_result(
            success=True, action="mood_tutor",
            data={"answer": answer, "mood": mood, "strategy": {k: v for k, v in strategy.items() if k != "temperature"}},
            message=f"Answered with {strategy['style']} style for mood={mood}",
        )


mood_aware_tutor_agent = MoodAwareTutorAgent()
registry.register(mood_aware_tutor_agent,
                  intents=["tutor", "explain", "study", "mood_tutor", "mood-tutor"])
