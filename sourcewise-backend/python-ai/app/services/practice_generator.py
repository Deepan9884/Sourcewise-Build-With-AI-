"""
PracticeGenerator service for creating practice problems and evaluating answers.

This service generates multiple choice questions, short answer questions, and
application problems grounded in source material, with detailed feedback.
"""
from typing import List, Optional
from pydantic import BaseModel
from enum import Enum
from app.services.llm import chat
from app.config import settings
import json


class QuestionType(str, Enum):
    """Types of practice questions"""
    MULTIPLE_CHOICE = "multiple_choice"
    SHORT_ANSWER = "short_answer"
    APPLICATION = "application"


class Citation(BaseModel):
    """Source citation for questions"""
    source_id: str
    source_name: str
    text: str
    page: Optional[int] = None


class MultipleChoiceQuestion(BaseModel):
    """Multiple choice question structure"""
    question_id: str
    concept: str
    question_text: str
    options: List[str]
    correct_answer: str
    difficulty: int
    source_ids: List[str]
    citations: List[Citation]
    explanation: str  # Why this is the correct answer


class ShortAnswerQuestion(BaseModel):
    """Short answer question structure"""
    question_id: str
    concept: str
    question_text: str
    key_points: List[str]  # Expected key points in answer
    difficulty: int
    source_ids: List[str]
    citations: List[Citation]


class ApplicationProblem(BaseModel):
    """Application/scenario-based problem structure"""
    question_id: str
    concept: str
    scenario: str
    question_text: str
    key_points: List[str]  # Expected elements in solution
    difficulty: int
    source_ids: List[str]
    citations: List[Citation]


class EvaluationResult(BaseModel):
    """Result of answer evaluation"""
    is_correct: bool
    score: float  # 0.0 to 1.0
    feedback: str
    correct_answer_explanation: str
    strengths: List[str]
    areas_for_improvement: List[str]
    related_concepts: List[str]
    suggested_review: List[str]


class PracticeGenerator:
    """
    Generates practice problems from source material and evaluates answers.
    All questions are grounded in provided source context with citations.
    """

    async def generate_mcq(
        self,
        concept: str,
        context: str,
        source_id: str,
        source_name: str,
        difficulty: int = 3
    ) -> MultipleChoiceQuestion:
        """
        Generate a multiple choice question from source material.
        
        Args:
            concept: The concept to test
            context: Source material context
            source_id: ID of the source document
            source_name: Name of the source document
            difficulty: Question difficulty (1=easy, 5=hard)
            
        Returns:
            MultipleChoiceQuestion with options and correct answer
        """
        prompt = self._build_mcq_prompt(concept, difficulty)
        response = await self._generate_with_llm(prompt, context)
        
        # Parse the LLM response to extract question components
        mcq_data = self._parse_mcq_response(response, concept, source_id, source_name, difficulty)
        
        return mcq_data

    async def generate_short_answer(
        self,
        concept: str,
        context: str,
        source_id: str,
        source_name: str,
        difficulty: int = 3
    ) -> ShortAnswerQuestion:
        """
        Generate an open-ended short answer question.
        
        Args:
            concept: The concept to test
            context: Source material context
            source_id: ID of the source document
            source_name: Name of the source document
            difficulty: Question difficulty (1=easy, 5=hard)
            
        Returns:
            ShortAnswerQuestion with key points expected in answer
        """
        prompt = self._build_short_answer_prompt(concept, difficulty)
        response = await self._generate_with_llm(prompt, context)
        
        # Parse the LLM response
        sa_data = self._parse_short_answer_response(
            response, concept, source_id, source_name, difficulty
        )
        
        return sa_data

    async def generate_application(
        self,
        concept: str,
        context: str,
        source_id: str,
        source_name: str,
        difficulty: int = 4
    ) -> ApplicationProblem:
        """
        Generate a scenario-based application problem.
        
        Args:
            concept: The concept to apply
            context: Source material context
            source_id: ID of the source document
            source_name: Name of the source document
            difficulty: Question difficulty (1=easy, 5=hard)
            
        Returns:
            ApplicationProblem with scenario and expected solution elements
        """
        prompt = self._build_application_prompt(concept, difficulty)
        response = await self._generate_with_llm(prompt, context)
        
        # Parse the LLM response
        app_data = self._parse_application_response(
            response, concept, source_id, source_name, difficulty
        )
        
        return app_data

    async def evaluate_answer(
        self,
        question_text: str,
        user_answer: str,
        correct_answer: str,
        question_type: QuestionType,
        context: str,
        concept: str
    ) -> EvaluationResult:
        """
        Evaluate user's answer with detailed feedback.
        
        Args:
            question_text: The original question
            user_answer: User's submitted answer
            correct_answer: The correct answer (or key points for open-ended)
            question_type: Type of question being evaluated
            context: Source material context
            concept: The concept being tested
            
        Returns:
            EvaluationResult with feedback and suggestions
        """
        prompt = self._build_evaluation_prompt(
            question_text, user_answer, correct_answer, question_type, concept
        )
        response = await self._generate_with_llm(prompt, context)
        
        # Parse evaluation response
        evaluation = self._parse_evaluation_response(response, question_type, user_answer, correct_answer)
        
        return evaluation

    # ─── Private Helper Methods ───────────────────────────────────────────────

    def _build_mcq_prompt(self, concept: str, difficulty: int) -> str:
        """Build prompt for MCQ generation"""
        difficulty_desc = self._get_difficulty_description(difficulty)
        
        return f"""Generate a multiple choice question about "{concept}" based on the source material.

Difficulty level: {difficulty}/5 - {difficulty_desc}

Requirements:
1. Question must be directly answerable from the source material
2. Create 4 options (A, B, C, D)
3. Make distractors plausible but clearly incorrect
4. Ensure only one option is definitively correct
5. Include a brief explanation of why the correct answer is right

Format your response as JSON:
{{
    "question": "The question text",
    "options": ["A) First option", "B) Second option", "C) Third option", "D) Fourth option"],
    "correct_answer": "A) First option",
    "explanation": "Why this is correct",
    "citation": "Relevant quote from source material"
}}

Generate the question:"""

    def _build_short_answer_prompt(self, concept: str, difficulty: int) -> str:
        """Build prompt for short answer generation"""
        difficulty_desc = self._get_difficulty_description(difficulty)
        
        return f"""Generate a short answer question about "{concept}" based on the source material.

Difficulty level: {difficulty}/5 - {difficulty_desc}

Requirements:
1. Question should require 2-4 sentences to answer
2. Must be answerable from the source material
3. Should test understanding, not just recall
4. Identify 3-5 key points that should be in a complete answer

Format your response as JSON:
{{
    "question": "The question text",
    "key_points": ["First key point", "Second key point", "Third key point"],
    "citation": "Relevant quote from source material"
}}

Generate the question:"""

    def _build_application_prompt(self, concept: str, difficulty: int) -> str:
        """Build prompt for application problem generation"""
        difficulty_desc = self._get_difficulty_description(difficulty)
        
        return f"""Generate a scenario-based application problem for "{concept}" based on the source material.

Difficulty level: {difficulty}/5 - {difficulty_desc}

Requirements:
1. Create a realistic scenario where the concept must be applied
2. The scenario should require using knowledge from the source material
3. Question should test ability to apply, not just recall
4. Identify key elements expected in a good solution

Format your response as JSON:
{{
    "scenario": "Description of the situation/scenario",
    "question": "What should be done or analyzed",
    "key_points": ["First expected element", "Second expected element", "Third expected element"],
    "citation": "Relevant quote from source material"
}}

Generate the problem:"""

    def _build_evaluation_prompt(
        self,
        question_text: str,
        user_answer: str,
        correct_answer: str,
        question_type: QuestionType,
        concept: str
    ) -> str:
        """Build prompt for answer evaluation"""
        if question_type == QuestionType.MULTIPLE_CHOICE:
            eval_instructions = """Evaluate if the user selected the correct option.
Provide feedback on why their choice was right or wrong."""
        else:
            eval_instructions = """Evaluate the user's answer against the key points.
Assess completeness, accuracy, and understanding demonstrated.
Provide constructive feedback on strengths and areas for improvement."""
        
        return f"""Evaluate this answer about "{concept}".

Question: {question_text}

User's Answer: {user_answer}

Correct Answer/Key Points: {correct_answer}

{eval_instructions}

Format your response as JSON:
{{
    "is_correct": true/false,
    "score": 0.0-1.0,
    "feedback": "Overall feedback on the answer",
    "correct_answer_explanation": "Explanation of the correct answer",
    "strengths": ["What the user did well"],
    "areas_for_improvement": ["What could be better"],
    "related_concepts": ["Related concepts to review"],
    "suggested_review": ["Specific topics to review from sources"]
}}

Provide the evaluation:"""

    def _get_difficulty_description(self, difficulty: int) -> str:
        """Get description for difficulty level"""
        descriptions = {
            1: "Basic recall and recognition",
            2: "Simple understanding and application",
            3: "Moderate analysis and synthesis",
            4: "Complex analysis and evaluation",
            5: "Advanced synthesis and critical thinking"
        }
        return descriptions.get(difficulty, descriptions[3])

    async def _generate_with_llm(self, prompt: str, context: str) -> str:
        """
        Generate content using LLM with source context.
        
        Args:
            prompt: The instruction prompt
            context: Source material context
            
        Returns:
            Generated content
        """
        from app.services.llm import raw_chat
        return await raw_chat(
            [
                {
                    "role": "system",
                    "content": """You are SourceWise AI -- a warm and helpful study companion creating practice problems.

Your practice questions must:
1. Be directly grounded in the provided source material
2. Test genuine understanding, not just memorization
3. Be clear, unambiguous, and fair
4. Include proper citations to source material
5. Provide constructive, educational feedback

When providing feedback:
- Be encouraging even when answers are wrong ("Good attempt! Let me help you understand...")
- Explain why the correct answer is right
- Connect the concept to real-world applications
- Be warm and supportive

Always respond in valid JSON format as specified in the prompt."""
                },
                {
                    "role": "user",
                    "content": f"""SOURCE MATERIAL:
{context}

---

{prompt}"""
                }
            ],
            temperature=0.4
        )

    def _parse_mcq_response(
        self,
        response: str,
        concept: str,
        source_id: str,
        source_name: str,
        difficulty: int
    ) -> MultipleChoiceQuestion:
        """Parse LLM response into MultipleChoiceQuestion"""
        try:
            # Try to extract JSON from response
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = response[json_start:json_end]
                data = json.loads(json_str)
            else:
                data = json.loads(response)
            
            citation = Citation(
                source_id=source_id,
                source_name=source_name,
                text=data.get("citation", ""),
                page=None
            )
            
            return MultipleChoiceQuestion(
                question_id=f"mcq_{concept}_{difficulty}",
                concept=concept,
                question_text=data["question"],
                options=data["options"],
                correct_answer=data["correct_answer"],
                difficulty=difficulty,
                source_ids=[source_id],
                citations=[citation],
                explanation=data.get("explanation", "")
            )
        except (json.JSONDecodeError, KeyError) as e:
            # Fallback if JSON parsing fails
            return MultipleChoiceQuestion(
                question_id=f"mcq_{concept}_{difficulty}",
                concept=concept,
                question_text=f"Question about {concept}",
                options=["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
                correct_answer="A) Option 1",
                difficulty=difficulty,
                source_ids=[source_id],
                citations=[Citation(source_id=source_id, source_name=source_name, text="", page=None)],
                explanation="Generated question"
            )

    def _parse_short_answer_response(
        self,
        response: str,
        concept: str,
        source_id: str,
        source_name: str,
        difficulty: int
    ) -> ShortAnswerQuestion:
        """Parse LLM response into ShortAnswerQuestion"""
        try:
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = response[json_start:json_end]
                data = json.loads(json_str)
            else:
                data = json.loads(response)
            
            citation = Citation(
                source_id=source_id,
                source_name=source_name,
                text=data.get("citation", ""),
                page=None
            )
            
            return ShortAnswerQuestion(
                question_id=f"sa_{concept}_{difficulty}",
                concept=concept,
                question_text=data["question"],
                key_points=data["key_points"],
                difficulty=difficulty,
                source_ids=[source_id],
                citations=[citation]
            )
        except (json.JSONDecodeError, KeyError) as e:
            return ShortAnswerQuestion(
                question_id=f"sa_{concept}_{difficulty}",
                concept=concept,
                question_text=f"Explain {concept}",
                key_points=["Key point 1", "Key point 2"],
                difficulty=difficulty,
                source_ids=[source_id],
                citations=[Citation(source_id=source_id, source_name=source_name, text="", page=None)]
            )

    def _parse_application_response(
        self,
        response: str,
        concept: str,
        source_id: str,
        source_name: str,
        difficulty: int
    ) -> ApplicationProblem:
        """Parse LLM response into ApplicationProblem"""
        try:
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = response[json_start:json_end]
                data = json.loads(json_str)
            else:
                data = json.loads(response)
            
            citation = Citation(
                source_id=source_id,
                source_name=source_name,
                text=data.get("citation", ""),
                page=None
            )
            
            return ApplicationProblem(
                question_id=f"app_{concept}_{difficulty}",
                concept=concept,
                scenario=data["scenario"],
                question_text=data["question"],
                key_points=data["key_points"],
                difficulty=difficulty,
                source_ids=[source_id],
                citations=[citation]
            )
        except (json.JSONDecodeError, KeyError) as e:
            return ApplicationProblem(
                question_id=f"app_{concept}_{difficulty}",
                concept=concept,
                scenario=f"Scenario involving {concept}",
                question_text=f"Apply {concept} to solve this problem",
                key_points=["Key element 1", "Key element 2"],
                difficulty=difficulty,
                source_ids=[source_id],
                citations=[Citation(source_id=source_id, source_name=source_name, text="", page=None)]
            )

    def _parse_evaluation_response(
        self,
        response: str,
        question_type: QuestionType,
        user_answer: str,
        correct_answer: str
    ) -> EvaluationResult:
        """Parse LLM response into EvaluationResult"""
        try:
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = response[json_start:json_end]
                data = json.loads(json_str)
            else:
                data = json.loads(response)
            
            return EvaluationResult(
                is_correct=data.get("is_correct", False),
                score=data.get("score", 0.0),
                feedback=data.get("feedback", ""),
                correct_answer_explanation=data.get("correct_answer_explanation", ""),
                strengths=data.get("strengths", []),
                areas_for_improvement=data.get("areas_for_improvement", []),
                related_concepts=data.get("related_concepts", []),
                suggested_review=data.get("suggested_review", [])
            )
        except (json.JSONDecodeError, KeyError) as e:
            # Fallback evaluation
            is_correct = user_answer.strip().lower() == correct_answer.strip().lower()
            return EvaluationResult(
                is_correct=is_correct,
                score=1.0 if is_correct else 0.0,
                feedback="Your answer has been evaluated.",
                correct_answer_explanation=f"The correct answer is: {correct_answer}",
                strengths=["Attempted the question"] if user_answer else [],
                areas_for_improvement=["Review the source material"],
                related_concepts=[],
                suggested_review=[]
            )
