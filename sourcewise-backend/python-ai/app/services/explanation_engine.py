"""
ExplanationEngine service for generating multi-strategy explanations.

This service provides different explanation strategies (analogy, example, stepwise)
and adapts complexity based on user mastery level.
"""
from typing import Optional
from enum import Enum
from app.services.llm import chat
from app.config import settings


class MasteryLevel(str, Enum):
    """User mastery levels matching LearningProfile schema"""
    NOVICE = "novice"
    DEVELOPING = "developing"
    PROFICIENT = "proficient"
    MASTERY = "mastery"


class ExplanationEngine:
    """
    Generates explanations using different pedagogical strategies.
    All explanations are grounded in provided source context.
    """

    async def generate_analogy(
        self,
        concept: str,
        context: str,
        user_level: MasteryLevel = MasteryLevel.NOVICE
    ) -> str:
        """
        Generate analogy-based explanation.
        
        Args:
            concept: The concept to explain
            context: Source material context
            user_level: User's mastery level for complexity adjustment
            
        Returns:
            Analogy-based explanation grounded in sources
        """
        prompt = self._build_analogy_prompt(concept, context, user_level)
        return await self._generate_with_llm(prompt, context)

    async def generate_example(
        self,
        concept: str,
        context: str,
        user_level: MasteryLevel = MasteryLevel.NOVICE
    ) -> str:
        """
        Generate concrete example-based explanation.
        
        Args:
            concept: The concept to explain
            context: Source material context
            user_level: User's mastery level for complexity adjustment
            
        Returns:
            Example-based explanation grounded in sources
        """
        prompt = self._build_example_prompt(concept, context, user_level)
        return await self._generate_with_llm(prompt, context)

    async def generate_stepwise(
        self,
        concept: str,
        context: str,
        user_level: MasteryLevel = MasteryLevel.NOVICE
    ) -> str:
        """
        Generate step-by-step breakdown explanation.
        
        Args:
            concept: The concept to explain
            context: Source material context
            user_level: User's mastery level for complexity adjustment
            
        Returns:
            Step-by-step explanation grounded in sources
        """
        prompt = self._build_stepwise_prompt(concept, context, user_level)
        return await self._generate_with_llm(prompt, context)

    async def adapt_complexity(
        self,
        explanation: str,
        user_level: MasteryLevel,
        concept: str
    ) -> str:
        """
        Adjust explanation complexity to match user's mastery level.
        
        Args:
            explanation: Original explanation to adapt
            user_level: User's current mastery level
            concept: The concept being explained
            
        Returns:
            Adapted explanation at appropriate complexity level
        """
        complexity_prompt = self._build_complexity_adaptation_prompt(
            explanation, user_level, concept
        )
        
        # Use shared LLM raw_chat
        from app.services.llm import raw_chat
        return await raw_chat(
            [
                {
                    "role": "system",
                    "content": "You are an expert educator who adapts explanations to different learning levels."
                },
                {
                    "role": "user",
                    "content": complexity_prompt
                }
            ],
            temperature=0.3
        )

    # ─── Private Helper Methods ───────────────────────────────────────────────

    def _build_analogy_prompt(
        self,
        concept: str,
        context: str,
        user_level: MasteryLevel
    ) -> str:
        """Build prompt for analogy-based explanation"""
        complexity_guidance = self._get_complexity_guidance(user_level)
        
        return f"""Explain the concept "{concept}" using an analogy.

{complexity_guidance}

Create an analogy that:
1. Relates to everyday experiences or familiar concepts
2. Highlights the key aspects of {concept}
3. Is grounded in the source material provided
4. Makes the abstract concrete and relatable

Use the source context to ensure accuracy, but the analogy itself should be accessible and memorable.

Concept to explain: {concept}"""

    def _build_example_prompt(
        self,
        concept: str,
        context: str,
        user_level: MasteryLevel
    ) -> str:
        """Build prompt for example-based explanation"""
        complexity_guidance = self._get_complexity_guidance(user_level)
        
        return f"""Explain the concept "{concept}" using concrete examples.

{complexity_guidance}

Provide examples that:
1. Are directly drawn from or closely related to the source material
2. Illustrate the concept in action
3. Show both typical cases and edge cases if relevant
4. Build understanding through specific instances

Focus on examples that make the concept tangible and easy to understand.

Concept to explain: {concept}"""

    def _build_stepwise_prompt(
        self,
        concept: str,
        context: str,
        user_level: MasteryLevel
    ) -> str:
        """Build prompt for step-by-step explanation"""
        complexity_guidance = self._get_complexity_guidance(user_level)
        
        return f"""Explain the concept "{concept}" using a step-by-step breakdown.

{complexity_guidance}

Create a step-by-step explanation that:
1. Breaks down the concept into logical, sequential parts
2. Builds understanding progressively from simple to complex
3. Explains each step clearly before moving to the next
4. Is grounded in the source material

Use numbered steps and clear transitions. Each step should be understandable before moving forward.

Concept to explain: {concept}"""

    def _build_complexity_adaptation_prompt(
        self,
        explanation: str,
        user_level: MasteryLevel,
        concept: str
    ) -> str:
        """Build prompt for adapting explanation complexity"""
        level_descriptions = {
            MasteryLevel.NOVICE: "a complete beginner with no prior knowledge of this topic. Use simple language, avoid jargon, and explain all terms.",
            MasteryLevel.DEVELOPING: "someone with basic understanding who is building their knowledge. Use some technical terms but explain them clearly.",
            MasteryLevel.PROFICIENT: "someone with solid understanding who can handle technical language and nuanced explanations.",
            MasteryLevel.MASTERY: "an advanced learner who understands the fundamentals and is ready for deep insights, edge cases, and advanced connections."
        }
        
        target_audience = level_descriptions.get(
            user_level,
            level_descriptions[MasteryLevel.NOVICE]
        )
        
        return f"""Adapt the following explanation of "{concept}" for {target_audience}

Original explanation:
{explanation}

Rewrite this explanation to match the learner's level. Maintain accuracy and stay grounded in the source material, but adjust:
- Vocabulary complexity
- Amount of detail and depth
- Assumptions about prior knowledge
- Pace of information delivery

Adapted explanation:"""

    def _get_complexity_guidance(self, user_level: MasteryLevel) -> str:
        """Get complexity guidance based on user mastery level"""
        guidance = {
            MasteryLevel.NOVICE: "Keep it simple and accessible. Avoid jargon. Assume no prior knowledge.",
            MasteryLevel.DEVELOPING: "Use moderate complexity. Introduce technical terms with explanations.",
            MasteryLevel.PROFICIENT: "Use appropriate technical language. Assume solid foundational knowledge.",
            MasteryLevel.MASTERY: "Provide deep insights and advanced connections. Assume strong understanding."
        }
        return guidance.get(user_level, guidance[MasteryLevel.NOVICE])

    async def _generate_with_llm(self, prompt: str, context: str) -> str:
        """
        Generate explanation using LLM with source context.
        
        Args:
            prompt: The instruction prompt for the explanation strategy
            context: Source material context
            
        Returns:
            Generated explanation
        """
        from app.services.llm import raw_chat
        return await raw_chat(
            [
                {
                    "role": "system",
                    "content": """You are SourceWise AI -- a warm, brilliant, and genuinely helpful study companion.

Your explanations must be:
1. Grounded in the provided source material
2. Accurate and pedagogically sound
3. Clear, engaging, and conversational
4. Adapted to the learner's level
5. Friendly and approachable -- like explaining to a friend, not a textbook

When creating analogies or examples:
- Make them relatable to everyday life
- Clearly distinguish between:
  - Content directly from sources (cite these)
  - Pedagogical additions you create to aid understanding (mark these as teaching aids)

Tone: Be warm, enthusiastic about the topic, and genuinely helpful. Use natural language, contractions, and a conversational style."""
                },
                {
                    "role": "user",
                    "content": f"""SOURCE CONTEXT:
{context}

---

{prompt}"""
                }
            ],
            temperature=0.4
        )
