"""
Tutor Agent - Teaches concepts through explanation and Socratic method.

Modes: Beginner, Intermediate, Advanced, Exam Mode
"""

from typing import List, Dict, Any, Optional
from app.agents.base import BaseAgent, AgentContext, AgentResult
from app.agents.registry import registry
from app.services import vector_store, llm as llm_service


class TutorAgent(BaseAgent):
    """
    Teaches concepts through various pedagogical approaches.
    """
    
    def can_handle(self, intent: str) -> bool:
        return intent in ["learn", "tutor", "explain", "teach"]
    
    def get_capabilities(self) -> List[str]:
        return [
            "concept_explanation",
            "socratic_teaching",
            "guided_learning",
            "difficulty_adaptation",
            "alternative_explanations",
        ]
    
    async def execute(self, context: AgentContext, **kwargs) -> AgentResult:
        """Teach a concept based on mode and learning profile"""
        question = kwargs.get("question", kwargs.get("user_request", ""))
        mode = kwargs.get("mode", "direct")
        
        # Get chunks from sources
        chunks = vector_store.query_chunks(
            question=question,
            source_ids=context.source_ids,
            top_k=8,
        )
        
        if not chunks:
            return self._create_result(
                success=False,
                action="tutor",
                message="No relevant content found. Please select sources first.",
            )
        
        # Build explanation based on mode
        if mode == "socratic":
            explanation = await self._socratic_explain(question, chunks, context)
        elif mode == "exam_prep":
            explanation = await self._exam_prep_explain(question, chunks, context)
        else:
            explanation = await self._direct_explain(question, chunks, context)
        
        # Get related concepts
        related = await self._get_related_concepts(chunks)
        
        return self._create_result(
            success=True,
            action="tutor",
            data={
                "explanation": explanation,
                "mode": mode,
                "related_concepts": related,
                "citations": [
                    {"source": c.get("source_name"), "page": c.get("page")}
                    for c in chunks[:3]
                ],
            },
            message=explanation,
        )
    
    async def _direct_explain(self, question: str, chunks: List, context: AgentContext) -> str:
        """Direct explanation"""
        context_text = "\n".join([c.get("text", "")[:300] for c in chunks[:5]])
        
        prompt = f"""Explain this concept clearly and thoroughly.

QUESTION: {question}

SOURCE MATERIAL:
{context_text}

Provide:
1. Clear definition
2. Key points
3. Examples if helpful
4. Why it matters

Be clear, concise, and educational."""
        
        return await llm_service.chat(
            question=prompt,
            context_chunks=chunks,
            history=[],
        )
    
    async def _socratic_explain(self, question: str, chunks: List, context: AgentContext) -> str:
        """Socratic method - ask questions instead of giving answers"""
        context_text = "\n".join([c.get("text", "")[:300] for c in chunks[:5]])
        
        prompt = f"""Use the Socratic method to help the student understand.

QUESTION: {question}

SOURCE MATERIAL:
{context_text}

Instead of giving the answer directly:
1. Ask a guiding question
2. Provide a hint
3. Give an analogy
4. Then reveal the answer

Make the student think before providing the solution."""
        
        return await llm_service.chat(
            question=prompt,
            context_chunks=chunks,
            history=[],
        )
    
    async def _exam_prep_explain(self, question: str, chunks: List, context: AgentContext) -> str:
        """Exam preparation mode - focus on what's likely to be tested"""
        context_text = "\n".join([c.get("text", "")[:300] for c in chunks[:5]])
        
        prompt = f"""Explain this for exam preparation.

QUESTION: {question}

SOURCE MATERIAL:
{context_text}

Focus on:
1. Key facts to memorize
2. Common exam patterns
3. Potential trick questions
4. Quick recall techniques

Be exam-focused and concise."""
        
        return await llm_service.chat(
            question=prompt,
            context_chunks=chunks,
            history=[],
        )
    
    async def _get_related_concepts(self, chunks: List) -> List[Dict]:
        """Get related concepts from chunks"""
        concepts = []
        for c in chunks[:5]:
            text = c.get("text", "")
            # Simple concept extraction
            if "is defined as" in text or "refers to" in text:
                concepts.append({
                    "concept": text[:50].split(".")[0],
                    "relationship": "defined in source",
                })
        return concepts[:5]


# Register agent
tutor_agent = TutorAgent()
registry.register(tutor_agent, intents=["learn", "tutor", "explain", "teach"])
