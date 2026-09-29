"""
Study Planner Agent - Generates intelligent, feasible study plans.

Uses educational dataset examples, learning profile analysis,
and quality validation to create plans that students actually complete.
"""

from typing import List, Dict, Any
from app.agents.base import BaseAgent, AgentContext, AgentResult
from app.agents.registry import registry
from app.agents.educational_dataset import get_few_shot_examples, STUDY_PLAN_EXAMPLE
from app.services import vector_store, llm as llm_service
import json
import re


class StudyPlannerAgent(BaseAgent):
    """
    Generates intelligent, feasible study plans with educational quality.
    
    Planning Rules:
    - Never schedule 8+ hours daily
    - Never create impossible workloads
    - Always prioritize weak topics
    - Always include revision time
    - Use skill-based milestones
    """
    
    MAX_DAILY_HOURS = 6
    MIN_DAILY_HOURS = 1
    MAX_TOPICS_PER_DAY = 4
    
    def can_handle(self, intent: str) -> bool:
        return intent in ["plan", "schedule", "study plan", "organize"]
    
    def get_capabilities(self) -> List[str]:
        return [
            "feasible_plan_generation",
            "weak_topic_prioritization",
            "milestone_tracking",
            "dynamic_replanning",
            "recovery_planning",
            "quality_validation",
        ]
    
    async def execute(self, context: AgentContext, **kwargs) -> AgentResult:
        """Execute planner actions"""
        action = kwargs.get("action", "generate")

        if action == "generate_multi":
            return await self._generate_multi_subject(context, **kwargs)
        elif action == "replan":
            return await self._replan(context, **kwargs)
        elif action == "recover":
            return await self._recovery_plan(context, **kwargs)
        elif action == "validate":
            return await self._validate_plan(context, **kwargs)
        else:
            return await self._generate_plan(context, **kwargs)
    
    async def _generate_plan(self, context: AgentContext, **kwargs) -> AgentResult:
        """Generate an intelligent, feasible study plan"""
        topic = kwargs.get("topic", "your study material")
        exam_date = kwargs.get("exam_date", "1 week from now")
        daily_hours = kwargs.get("daily_hours", 2)
        
        # Enforce feasible daily hours
        daily_hours = max(self.MIN_DAILY_HOURS, min(self.MAX_DAILY_HOURS, daily_hours))
        
        # Get content overview
        chunks = vector_store.query_chunks(
            question="main topics chapters concepts",
            source_ids=context.source_ids,
            top_k=8,
        )
        
        context_text = "\n".join([
            f"- {c.get('source_name', 'Unknown')}: {c.get('text', '')[:100]}..."
            for c in chunks[:5]
        ]) if chunks else "No specific content available"
        
        # Get learning profile for intelligent planning
        profile = context.learning_profile or {}
        mastery_data = profile.get("concept_mastery", [])
        gaps = profile.get("knowledge_gaps", [])
        
        # Identify weak topics for priority planning
        weak_topics = [m["concept"] for m in mastery_data if m.get("mastery_score", 0) < 50][:5]
        strong_topics = [m["concept"] for m in mastery_data if m.get("mastery_score", 0) >= 80][:5]
        
        # Get memory context
        memory = context.agent_memory or {}
        learning_history = memory.get("learning_history", {})
        previously_studied = learning_history.get("topics_studied", [])
        
        # Build few-shot example
        example = STUDY_PLAN_EXAMPLE
        example_text = json.dumps(example, indent=2)
        
        # Generate intelligent plan
        plan_prompt = f"""Create an INTELLIGENT and FEASIBLE study plan as JSON for: {topic}
Exam date: {exam_date}
Daily study hours: {daily_hours} (MAXIMUM)

Available study material:
{context_text}

LEARNING CONTEXT:
- Weak topics (prioritize these): {', '.join(weak_topics) if weak_topics else 'None identified'}
- Strong topics (review briefly): {', '.join(strong_topics) if strong_topics else 'None'}
- Previously studied: {', '.join(previously_studied[:5]) if previously_studied else 'None'}
- Knowledge gaps: {len(gaps)} gaps identified

FOLLOW THIS EXAMPLE FORMAT:
{example_text}

CRITICAL RULES:
1. NEVER schedule more than {daily_hours} hours per day
2. Maximum {self.MAX_TOPICS_PER_DAY} topics per day
3. PRIORITIZE weak topics in early days
4. Include review sessions for consolidation
5. Build in practice quizzes every 2-3 days
6. Mark milestones at 25%, 50%, 75%, 100%
7. Each day must have realistic activities
8. Focus first 2-3 days on weak areas

Return ONLY valid JSON with this exact structure:
{{
  "title": "Study Plan for {topic}",
  "days": [...],
  "milestones": [...],
  "totalDays": N,
  "dailyHours": {daily_hours},
  "priority_focus": "weak_topics",
  "feasibility_score": 95
}}"""
        
        response = await llm_service.chat(
            question=plan_prompt,
            context_chunks=chunks,
            history=[],
        )
        
        # Parse JSON
        try:
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                plan_data = json.loads(json_match.group())
            else:
                plan_data = self._create_fallback_plan(topic, daily_hours, weak_topics)
        except json.JSONDecodeError:
            plan_data = self._create_fallback_plan(topic, daily_hours, weak_topics)
        
        # Validate plan feasibility
        feasibility = self._validate_feasibility(plan_data, daily_hours)
        plan_data["feasibility_score"] = feasibility["score"]
        
        return self._create_result(
            success=True,
            action="generate_plan",
            data={
                "plan": plan_data,
                "topic": topic,
                "exam_date": exam_date,
                "feasibility": feasibility,
                "intelligence": {
                    "weak_topics_prioritized": len(weak_topics) > 0,
                    "memory_used": bool(previously_studied),
                    "feasible_hours": daily_hours <= self.MAX_DAILY_HOURS,
                },
            },
            message=f"Created feasible study plan for {topic} ({plan_data.get('totalDays', 5)} days, {daily_hours}h/day)",
        )
    
    async def _validate_plan(self, context: AgentContext, **kwargs) -> AgentResult:
        """Validate a study plan for feasibility and quality"""
        plan_data = kwargs.get("plan", {})
        daily_hours = kwargs.get("daily_hours", 2)
        
        feasibility = self._validate_feasibility(plan_data, daily_hours)
        
        return self._create_result(
            success=True,
            action="validate_plan",
            data={"feasibility": feasibility},
            message=f"Plan feasibility: {feasibility['score']}/100",
        )
    
    def _validate_feasibility(self, plan_data: Dict, max_daily_hours: int) -> Dict:
        """Validate plan feasibility"""
        issues = []
        score = 100
        
        days = plan_data.get("days", [])
        
        for day in days:
            # Check daily hours
            duration_str = day.get("duration", "2 hours")
            try:
                hours = int(duration_str.split()[0])
                if hours > max_daily_hours:
                    issues.append(f"{day.get('name', 'Day')}: {hours}h exceeds {max_daily_hours}h limit")
                    score -= 10
            except:
                pass
            
            # Check topics per day
            topics = day.get("topics", [])
            if len(topics) > self.MAX_TOPICS_PER_DAY:
                issues.append(f"{day.get('name', 'Day')}: {len(topics)} topics exceeds {self.MAX_TOPICS_PER_DAY} limit")
                score -= 5
        
        # Check overall structure
        if len(days) < 3:
            issues.append("Plan too short (< 3 days)")
            score -= 10
        
        if len(days) > 14:
            issues.append("Plan too long (> 14 days)")
            score -= 5
        
        return {
            "score": max(0, min(100, score)),
            "feasible": score >= 80,
            "issues": issues,
            "day_count": len(days),
        }
    
    async def _replan(self, context: AgentContext, **kwargs) -> AgentResult:
        """Dynamic replanning for missed tasks"""
        current_plan = kwargs.get("current_plan", {})
        missed_day = kwargs.get("missed_day_index", 0)
        
        days = current_plan.get("days", [])
        
        # Collect pending tasks
        pending_tasks = []
        remaining_days = []
        
        for i in range(missed_day, len(days)):
            if days[i].get("status") != "completed":
                pending_tasks.extend(days[i].get("topics", []))
                remaining_days.append(days[i])
        
        # Redistribute tasks
        tasks_per_day = max(1, len(pending_tasks) // max(len(remaining_days), 1))
        
        updated_days = days[:missed_day]
        task_idx = 0
        
        for day in remaining_days:
            day_tasks = pending_tasks[task_idx:task_idx + tasks_per_day]
            task_idx += tasks_per_day
            if day_tasks:
                day["topics"] = day_tasks
                day["status"] = "pending"
                day["replanned"] = True
            updated_days.append(day)
        
        updated_plan = {
            **current_plan,
            "days": updated_days,
            "lastReplanned": "now",
            "replanCount": current_plan.get("replanCount", 0) + 1,
        }
        
        return self._create_result(
            success=True,
            action="replan",
            data={"plan": updated_plan},
            message=f"Replanned from day {missed_day}",
        )
    
    async def _recovery_plan(self, context: AgentContext, **kwargs) -> AgentResult:
        """Generate recovery plan when learner falls behind"""
        current_plan = kwargs.get("current_plan", {})
        days_behind = kwargs.get("days_behind", 1)
        
        days = current_plan.get("days", [])
        
        # Compress plan
        compressed_days = []
        skip_count = 0
        
        for day in days:
            if day.get("status") == "completed":
                compressed_days.append(day)
                continue
            
            if skip_count < days_behind and not day.get("priority") == "high":
                skip_count += 1
                continue
            
            compressed_days.append(day)
        
        updated_plan = {
            **current_plan,
            "days": compressed_days,
            "totalDays": len(compressed_days),
            "recoveryMode": True,
        }
        
        return self._create_result(
            success=True,
            action="recovery_plan",
            data={"plan": updated_plan},
            message=f"Recovery plan: {len(compressed_days)} days",
        )
    
    async def _generate_multi_subject(self, context: AgentContext, **kwargs) -> AgentResult:
        """Generate an interleaved multi-subject plan with mood-aware guidance.

        kwargs: subjects=[{subject_name, exam_date, exam_weight, current_mastery,
                            target_mastery, difficulty_estimate}],
                daily_hours, mood (optional), mood_adjustments (optional)
        Returns per-subject day allocations + interleaving order + study guidance.
        The Node planner engine turns this into concrete schedule_slots.
        """
        subjects = kwargs.get("subjects", []) or []
        daily_hours = max(self.MIN_DAILY_HOURS, min(self.MAX_DAILY_HOURS, kwargs.get("daily_hours", 2)))
        mood = (kwargs.get("mood") or "neutral").lower()
        mood_adj = kwargs.get("mood_adjustments") or {}

        if not subjects:
            return self._create_result(success=False, action="generate_multi",
                message="At least one subject is required", errors=["no_subjects"])

        # Priority scoring mirrors Node engine (kept in sync deliberately)
        def score(s: Dict) -> float:
            import datetime as _dt
            try:
                exam = _dt.date.fromisoformat(str(s.get("exam_date") or "9999-12-31"))
                d = (exam - _dt.date.today()).days
            except Exception:
                d = 30
            urgency = 5 if d <= 0 else 4 if d <= 3 else 3 if d <= 7 else 2 if d <= 14 else 1
            gap = max(0, (s.get("target_mastery", 80) - s.get("current_mastery", 0))) / 20
            weight = min(3, max(0.5, s.get("exam_weight", 1)))
            boost = 1.2 if s.get("difficulty_estimate") == "hard" else 0.85 if s.get("difficulty_estimate") == "easy" else 1.0
            return round((urgency * 0.45 + gap * 0.3 + weight * 0.25) * boost, 2)

        ranked = sorted([{**s, "priority_score": score(s)} for s in subjects],
                        key=lambda x: x["priority_score"], reverse=True)
        total = sum(s["priority_score"] for s in ranked) or 1
        for s in ranked:
            s["suggested_daily_share"] = round(s["priority_score"] / total, 2)

        mood_guidance = {
            "energized": "Schedule hard topics first; push depth and problem-solving.",
            "focused": "Steady deep-work blocks; alternate study + practice.",
            "neutral": "Balanced interleaving across subjects.",
            "tired": "Light load: flashcards, review, short 25-min sessions.",
            "stressed": "Halve new material; one small win per subject; extra breaks.",
            "anxious": "Clear per-day roadmap; chunk tasks; start with easiest win.",
        }
        return self._create_result(
            success=True, action="generate_multi",
            data={"subjects": ranked, "daily_hours": daily_hours, "mood": mood,
                   "mood_guidance": mood_guidance.get(mood, mood_guidance["neutral"]),
                   "mood_adjustments": mood_adj,
                   "interleaving": "round-robin by priority share; hard topics in morning; quiz every 3rd touch"},
            message=f"Multi-subject plan: {len(ranked)} subjects, {daily_hours}h/day, mood={mood}",
        )

    def _create_fallback_plan(self, topic: str, daily_hours: int, weak_topics: List[str] = None) -> Dict:
        """Create fallback plan"""
        weak = weak_topics or []
        return {
            "title": f"Study Plan for {topic}",
            "days": [
                {
                    "name": f"Day {i+1}",
                    "topics": [weak[i]] if i < len(weak) else [f"Topic {i+1}"],
                    "activities": ["Read and review", "Practice quiz"],
                    "duration": f"{daily_hours} hours",
                    "status": "pending",
                    "milestone": i in [1, 3, 5],
                    "priority": "high" if i < len(weak) else "medium",
                }
                for i in range(5)
            ],
            "milestones": [
                {"threshold": 25, "label": "25% Complete", "skill_based": True},
                {"threshold": 50, "label": "50% Complete", "skill_based": True},
                {"threshold": 75, "label": "75% Complete", "skill_based": True},
                {"threshold": 100, "label": "100% Complete", "skill_based": True},
            ],
            "totalDays": 5,
            "dailyHours": daily_hours,
            "priority_focus": "weak_topics",
        }


# Register agent
study_planner_agent = StudyPlannerAgent()
registry.register(study_planner_agent, intents=["plan", "schedule", "study plan", "organize"])
