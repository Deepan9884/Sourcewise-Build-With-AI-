"""
SocraticEngine service for guided questioning and Socratic teaching.

This service implements the Socratic method by generating guiding questions,
progressive hints, and detecting when users reach understanding.
"""
from typing import Optional
from app.services.llm import chat
from app.config import settings


class SocraticEngine:
    """
    Implements Socratic teaching method through guided questioning.
    Helps users discover answers through progressive questioning and hints.
    """

    async def generate_guiding_question(
        self,
        user_question: str,
        context: str,
        difficulty: int = 3
    ) -> str:
        """
        Generate a Socratic guiding question instead of a direct answer.
        
        Args:
            user_question: The user's original question
            context: Source material context
            difficulty: Question difficulty level (1=very easy, 5=challenging)
            
        Returns:
            A guiding question that leads user toward discovery
        """
        prompt = self._build_guiding_question_prompt(
            user_question, difficulty
        )
        return await self._generate_with_llm(prompt, context)

    async def generate_hint(
        self,
        question: str,
        context: str,
        hint_level: int
    ) -> str:
        """
        Generate progressive hints for a question.
        
        Args:
            question: The question or concept the user is working on
            context: Source material context
            hint_level: Hint specificity (1=subtle, 5=nearly direct answer)
            
        Returns:
            A hint at the specified level of directness
        """
        if hint_level < 1 or hint_level > 5:
            raise ValueError("hint_level must be between 1 and 5")
        
        prompt = self._build_hint_prompt(question, hint_level)
        return await self._generate_with_llm(prompt, context)

    async def detect_understanding(
        self,
        user_response: str,
        expected_insight: str,
        context: str
    ) -> bool:
        """
        Determine if user has reached understanding through their response.
        
        Args:
            user_response: The user's answer or explanation
            expected_insight: The key insight or understanding expected
            context: Source material context
            
        Returns:
            True if user demonstrates understanding, False otherwise
        """
        prompt = self._build_understanding_detection_prompt(
            user_response, expected_insight
        )
        
        from app.services.llm import raw_chat
        response_text = await raw_chat(
            [
                {
                    "role": "system",
                    "content": """You are an expert educator analyzing student understanding.
Evaluate whether the student's response demonstrates genuine comprehension of the concept.
Respond with ONLY 'YES' or 'NO' followed by a brief explanation."""
                },
                {
                    "role": "user",
                    "content": f"""SOURCE CONTEXT:
{context}

---

{prompt}"""
                }
            ],
            temperature=0.2
        )
        return response_text.strip().upper().startswith("YES")

    # ─── Private Helper Methods ───────────────────────────────────────────────

    def _build_guiding_question_prompt(
        self,
        user_question: str,
        difficulty: int
    ) -> str:
        """Build prompt for generating Socratic guiding questions"""
        difficulty_guidance = self._get_difficulty_guidance(difficulty)
        
        return f"""The user asked: "{user_question}"

Instead of answering directly, generate a Socratic guiding question that helps them discover the answer themselves.

{difficulty_guidance}

Your guiding question should:
1. Lead the user toward the key insight without giving it away
2. Be based on the source material provided
3. Encourage critical thinking and analysis
4. Build on what they likely already know
5. Be clear and focused on one aspect at a time

Generate a single, well-crafted guiding question that moves them toward understanding."""

    def _build_hint_prompt(
        self,
        question: str,
        hint_level: int
    ) -> str:
        """Build prompt for generating progressive hints"""
        hint_descriptions = {
            1: "Very subtle - point them in the right direction without revealing much. Ask them to consider a related concept or look at a specific aspect.",
            2: "Gentle nudge - highlight a relevant principle or pattern from the sources. Still requires significant thinking.",
            3: "Moderate help - identify the key concept or relationship they need to understand. Provide a partial framework.",
            4: "Substantial guidance - explain most of the reasoning but leave the final connection for them to make.",
            5: "Nearly direct - provide almost all the information, leaving only the final synthesis to the user."
        }
        
        hint_guidance = hint_descriptions.get(hint_level, hint_descriptions[3])
        
        return f"""The user is working on: "{question}"

Provide a warm, encouraging hint at level {hint_level}/5.

Level {hint_level} guidance: {hint_guidance}

Your hint should:
1. Be grounded in the source material
2. Match the specified hint level exactly
3. Be encouraging and supportive -- like a friend helping them study
4. Guide without frustrating or over-explaining
5. Use phrases like "You're on the right track!", "Think about...", "Here's a clue..."

Generate the hint:"""

    def _build_understanding_detection_prompt(
        self,
        user_response: str,
        expected_insight: str
    ) -> str:
        """Build prompt for detecting user understanding"""
        return f"""Evaluate if the user has reached understanding.

Expected insight or understanding:
{expected_insight}

User's response:
{user_response}

Does the user's response demonstrate they have grasped the key concept? Consider:
1. Do they articulate the core idea correctly?
2. Can they explain it in their own words?
3. Do they show understanding of why, not just what?
4. Are there any significant misconceptions?

Respond with YES or NO, followed by a brief explanation of your assessment."""

    def _get_difficulty_guidance(self, difficulty: int) -> str:
        """Get guidance for question difficulty level"""
        guidance = {
            1: "Make the question very accessible and straightforward. Guide them gently.",
            2: "Ask a relatively easy question that requires basic analysis.",
            3: "Create a moderate question that requires thoughtful consideration.",
            4: "Pose a challenging question that requires deeper analysis.",
            5: "Ask a sophisticated question that requires significant critical thinking."
        }
        return guidance.get(difficulty, guidance[3])

    async def _generate_with_llm(self, prompt: str, context: str) -> str:
        """
        Generate Socratic response using LLM with source context.
        
        Args:
            prompt: The instruction prompt for the Socratic interaction
            context: Source material context
            
        Returns:
            Generated Socratic question or hint
        """
        from app.services.llm import raw_chat
        return await raw_chat(
            [
                {
                    "role": "system",
                    "content": """You are SourceWise AI in Socratic teaching mode -- a warm, patient, and encouraging study companion.

Your role is to guide learners to discover answers through questioning, not to provide direct answers.
You are like a friendly mentor who genuinely enjoys watching people learn and grow.

Principles of Socratic teaching:
1. Ask questions that lead to discovery -- make them feel like a detective solving a mystery
2. Build on the learner's existing knowledge -- help them see they already know more than they think
3. Encourage critical thinking -- but never make them feel stupid for struggling
4. Be patient and supportive -- learning takes time, and that is okay
5. Ground all questions in the source material -- use their own sources as clues
6. Help learners construct their own understanding -- celebrate their "aha!" moments

Tone guidelines:
- Be warm and conversational, like a supportive friend
- Use encouraging phrases: "Great thinking!", "You are on the right track!", "Interesting perspective!"
- When they struggle: "This is a tricky one, but I think you can figure it out!"
- When they get close: "You are SO close! Think about..."
- Never be condescending or impatient
- Make the discovery process feel exciting, not frustrating"""
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
