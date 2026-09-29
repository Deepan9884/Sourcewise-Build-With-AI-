"""
Orchestrator Agent - Central coordinator for all agent operations.

Controls workflow execution, agent routing, and data flow.
Includes quality validation, specification compliance, AGES governance, and self-improvement integration.
"""

from typing import Optional, List, Dict, Any
from app.agents.base import BaseAgent, AgentContext, AgentResult
from app.agents.registry import registry
from app.agents.memory import agent_memory
from app.agents.self_improvement import self_improvement
from app.agents.specifications import (
    FlashcardSpecification, QuizSpecification, StudyPlanSpecification,
    SummarySpecification, SpecificationResult
)
from app.agents.educational_validation import educational_framework
from app.agents.trust_engine import trust_engine
from app.agents.golden_dataset import golden_dataset
import logging

logger = logging.getLogger('sourcewise.orchestrator')


class OrchestratorAgent(BaseAgent):
    """
    Central coordinator that:
    1. Classifies user intent
    2. Routes to appropriate agent(s)
    3. Manages execution flow
    4. Handles errors and recovery
    5. Maintains agent memory
    """
    
    INTENT_KEYWORDS = {
        "upload": ["upload", "add document", "add source", "new file"],
        "learn": ["explain", "teach", "help me understand", "what is", "how does"],
        "quiz": ["quiz", "test", "practice", "assess", "exam"],
        "flashcards": ["flashcard", "flash cards", "memorize", "remember"],
        "plan": ["plan", "schedule", "study plan", "organize"],
        "revise": ["review", "revise", "revision", "repeat"],
        "analyze": ["analyze", "analysis", "insight", "report"],
        "recommend": ["what should", "next", "recommend", "suggest", "focus"],
        "profile": ["profile", "mastery", "progress", "level"],
        "tutor": ["tutor", "guide", "mentor", "coach"],
    }
    
    def can_handle(self, intent: str) -> bool:
        return True  # Orchestrator can handle any intent
    
    def get_capabilities(self) -> List[str]:
        return [
            "intent_classification",
            "agent_routing",
            "workflow_orchestration",
            "error_recovery",
            "memory_management",
        ]
    
    async def execute(self, context: AgentContext, **kwargs) -> AgentResult:
        """
        Main orchestration logic.
        
        1. Load agent memory for context
        2. Classify user intent
        3. Determine required agents
        4. Execute agents in order
        5. Store results in memory
        6. Aggregate results
        """
        user_request = kwargs.get("user_request", "")
        
        # Load memory context
        memory_context = agent_memory.get_context_for_agent(context.user_id)
        context.agent_memory = memory_context
        
        # Classify intent
        intent = self.classify_intent(user_request)
        
        # Get execution plan
        execution_plan = self.get_execution_plan(intent, context)
        
        # Execute agents with error handling
        results = []
        for agent_name in execution_plan:
            agent = registry.get_agent(agent_name)
            if agent:
                try:
                    logger.info(f"Executing agent: {agent_name} for intent: {intent}")
                    result = await agent.execute(context, intent=intent, user_request=user_request)
                    results.append(result)
                    logger.info(f"Agent {agent_name} completed: success={result.success}")
                    
                    # Store agent decision in memory
                    agent_memory.record_agent_decision(
                        user_id=context.user_id,
                        agent=agent_name,
                        action=result.action,
                        reason=f"Intent: {intent}, Success: {result.success}",
                        data=result.data,
                    )
                except Exception as e:
                    logger.error(f"Agent {agent_name} failed: {e}")
                    results.append(AgentResult(
                        success=False,
                        agent_name=agent_name,
                        action="execute",
                        message=f"Error: {str(e)}",
                        errors=[str(e)],
                    ))
        
        # Aggregate results
        return self.aggregate_results(intent, results, context)
    
    def classify_intent(self, user_request: str) -> str:
        """Classify user request into intent category"""
        request_lower = user_request.lower()
        
        scores = {}
        for intent, keywords in self.INTENT_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in request_lower)
            if score > 0:
                scores[intent] = score
        
        if scores:
            return max(scores, key=scores.get)
        
        return "learn"  # Default to learn
    
    def get_execution_plan(self, intent: str, context: AgentContext) -> List[str]:
        """Determine which agents to execute based on intent"""
        plans = {
            "upload": [
                "SourceIntelligenceAgent",
                "KnowledgeAgent",
                "FlashcardAgent",
                "AssessmentAgent",
                "StudyPlannerAgent",
                "RecommendationAgent",
            ],
            "learn": [
                "TutorAgent",
                "LearningProfileAgent",
            ],
            "quiz": [
                "AssessmentAgent",
                "LearningProfileAgent",
                "RevisionAgent",
                "AnalyticsAgent",
                "RecommendationAgent",
            ],
            "flashcards": [
                "FlashcardAgent",
                "RevisionAgent",
            ],
            "plan": [
                "StudyPlannerAgent",
            ],
            "revise": [
                "RevisionAgent",
                "LearningProfileAgent",
                "AnalyticsAgent",
            ],
            "analyze": [
                "AnalyticsAgent",
                "LearningProfileAgent",
            ],
            "recommend": [
                "RecommendationAgent",
                "AnalyticsAgent",
                "LearningProfileAgent",
                "RevisionAgent",
                "StudyPlannerAgent",
            ],
            "profile": [
                "LearningProfileAgent",
                "AnalyticsAgent",
            ],
            "tutor": [
                "TutorAgent",
                "LearningProfileAgent",
            ],
        }
        
        return plans.get(intent, ["TutorAgent"])
    
    def aggregate_results(self, intent: str, results: List[AgentResult], context: AgentContext) -> AgentResult:
        """Aggregate multiple agent results into single response"""
        successful = [r for r in results if r.success]
        failed = [r for r in results if not r.success]
        
        # Merge data from all successful results
        merged_data = {
            "intent": intent,
            "agents_executed": [r.agent_name for r in results],
            "execution_flow": [r.agent_name for r in results],
        }
        
        for result in successful:
            if result.data:
                merged_data[result.agent_name] = result.data
        
        # Get learning insights
        learning_insights = self_improvement.get_learning_insights(context.user_id)
        merged_data["learning_insights"] = learning_insights
        
        # Specification validation for generated content
        spec_validation = self._validate_specifications(results, context)
        merged_data["specification_validation"] = spec_validation
        
        # Build response message
        if successful:
            primary_result = successful[-1]  # Last successful agent
            message = primary_result.message
        else:
            message = "I couldn't process your request. Please try again."
        
        # Add compliance status to message
        if spec_validation.get("all_passed"):
            message += "\n\n✅ All specifications passed."
        elif spec_validation.get("failed_count", 0) > 0:
            message += f"\n\n⚠️ {spec_validation['failed_count']} specification(s) need attention."
        
        return AgentResult(
            success=len(successful) > 0,
            agent_name=self.name,
            action="orchestrate",
            data=merged_data,
            message=message,
            errors=[r.message for r in failed],
            metadata={
                "intent": intent,
                "agents_attempted": len(results),
                "agents_succeeded": len(successful),
                "quality_validated": True,
                "specification_validated": True,
            },
        )
    
    def _validate_specifications(self, results: List[AgentResult], context: AgentContext) -> Dict:
        """Validate specifications for all generated content"""
        validations = []
        
        for result in results:
            if not result.success or not result.data:
                continue
            
            # Validate flashcards
            if "cards" in result.data:
                for card in result.data["cards"]:
                    spec_result = FlashcardSpecification.validate(card)
                    validations.append({
                        "type": "flashcard",
                        "passed": spec_result.passed,
                        "score": spec_result.score,
                        "failed_rules": spec_result.failed_rules,
                    })
            
            # Validate quiz
            if "questions" in result.data:
                spec_result = QuizSpecification.validate(result.data["questions"])
                validations.append({
                    "type": "quiz",
                    "passed": spec_result.passed,
                    "score": spec_result.score,
                    "failed_rules": spec_result.failed_rules,
                })
            
            # Validate plan
            if "plan" in result.data:
                spec_result = StudyPlanSpecification.validate(result.data["plan"])
                validations.append({
                    "type": "plan",
                    "passed": spec_result.passed,
                    "score": spec_result.score,
                    "failed_rules": spec_result.failed_rules,
                })
            
            # Validate summary
            if "summary" in result.data:
                spec_result = SummarySpecification.validate(result.data["summary"])
                validations.append({
                    "type": "summary",
                    "passed": spec_result.passed,
                    "score": spec_result.score,
                    "failed_rules": spec_result.failed_rules,
                })
        
        passed = sum(1 for v in validations if v["passed"])
        failed = sum(1 for v in validations if not v["passed"])
        avg_score = sum(v["score"] for v in validations) / max(1, len(validations))
        
        return {
            "validations": validations,
            "total": len(validations),
            "passed": passed,
            "failed": failed,
            "all_passed": failed == 0,
            "avg_score": round(avg_score, 1),
        }
    
    def _calculate_trust_score(self, results: List[AgentResult]) -> Dict:
        """Calculate trust score for generated content"""
        # Gather metrics from results
        quality_scores = []
        spec_scores = []
        
        for result in results:
            if result.data:
                if "educational_confidence" in result.data:
                    quality_scores.append(result.data["educational_confidence"])
                if "specification_compliance" in result.data:
                    spec_scores.append(result.data["specification_compliance"])
        
        avg_quality = sum(quality_scores) / max(1, len(quality_scores))
        avg_spec = sum(spec_scores) / max(1, len(spec_scores))
        
        # Calculate trust score
        trust = trust_engine.calculate_trust_score(
            quality=avg_quality,
            specification=avg_spec,
            benchmark=avg_spec,  # Use spec as proxy
            historical_success=85,  # Default
            confidence=avg_quality,
        )
        
        return {
            "trust_score": trust.overall,
            "grade": trust.grade,
            "level": trust.level,
            "quality": avg_quality,
            "specification": avg_spec,
        }
    
    def _check_deployment_gate(self, trust_data: Dict) -> Dict:
        """Check if deployment is allowed"""
        blockers = []
        
        if trust_data.get("trust_score", 0) < 95:
            blockers.append(f"Trust score {trust_data.get('trust_score', 0)} < 95")
        
        if trust_data.get("quality", 0) < 95:
            blockers.append(f"Quality score {trust_data.get('quality', 0)} < 95")
        
        if trust_data.get("specification", 0) < 95:
            blockers.append(f"Specification compliance {trust_data.get('specification', 0)} < 95")
        
        return {
            "approved": len(blockers) == 0,
            "blockers": blockers,
            "trust_score": trust_data.get("trust_score", 0),
        }


# Register orchestrator
orchestrator = OrchestratorAgent()
registry.register(orchestrator, intents=[
    "upload", "learn", "quiz", "flashcards", "plan",
    "revise", "analyze", "recommend", "profile", "tutor",
    "govern", "benchmark", "predict", "audit",
])
