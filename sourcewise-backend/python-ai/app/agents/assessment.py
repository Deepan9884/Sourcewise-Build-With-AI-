"""
Assessment Agent - Measures understanding through intelligent quizzes.

Uses quiz blueprint engine, difficulty distribution, and quality validation
to generate university-level assessments.
"""

from typing import List, Dict, Any, Optional
from app.agents.base import BaseAgent, AgentContext, AgentResult
from app.agents.registry import registry
from app.agents.educational_dataset import get_few_shot_examples, get_generation_template
from app.services import vector_store, llm as llm_service


# Difficulty distribution targets
DIFFICULTY_DISTRIBUTION = {
    "easy": 0.30,
    "medium": 0.50,
    "hard": 0.20,
}

# Question types
QUESTION_TYPES = {
    "mcq": "Multiple Choice Question - 4 options, 1 correct",
    "true_false": "True/False with explanation",
    "fill_blank": "Fill in the blank",
    "short_answer": "Short answer (1-2 sentences)",
    "scenario": "Scenario-based application question",
    "application": "Apply knowledge to solve a problem",
}


class AssessmentAgent(BaseAgent):
    """
    Generates and evaluates intelligent assessments.
    
    Uses quiz blueprint engine for topic analysis and
    difficulty distribution for balanced quizzes.
    """
    
    def can_handle(self, intent: str) -> bool:
        return intent in ["quiz", "test", "practice", "assess", "exam"]
    
    def get_capabilities(self) -> List[str]:
        return [
            "quiz_blueprint_generation",
            "difficulty_distribution",
            "question_type_selection",
            "quality_validation",
            "adaptive_difficulty",
            "exam_simulation",
        ]
    
    async def execute(self, context: AgentContext, **kwargs) -> AgentResult:
        """Generate or evaluate assessment"""
        action = kwargs.get("action", "generate")
        
        if action == "evaluate":
            return await self._evaluate_quiz(context, **kwargs)
        elif action == "blueprint":
            return await self._generate_blueprint(context, **kwargs)
        else:
            return await self._generate_quiz(context, **kwargs)
    
    async def _generate_quiz(self, context: AgentContext, **kwargs) -> AgentResult:
        """Generate intelligent quiz with blueprint analysis"""
        topic = kwargs.get("topic", "core concepts and lessons")
        count = kwargs.get("count", 10)
        difficulty = kwargs.get("difficulty", "adaptive")
        question_types = kwargs.get("question_types", ["mcq", "true_false", "scenario"])
        
        # Get substantive chunks from sources
        chunks = vector_store.get_educational_chunks(
            source_ids=context.source_ids,
            query=topic,
            top_k=12,
            sample_across_doc=True,
        )
        
        if not chunks:
            return self._create_result(
                success=False,
                action="generate_quiz",
                message="No content available for quiz generation",
            )
        
        # Generate quiz blueprint
        blueprint = self._create_quiz_blueprint(topic, count, difficulty, context)
        
        # Get few-shot examples
        examples = get_few_shot_examples("quiz", count=3)
        
        # Generate quiz with blueprint
        questions = await self._generate_intelligent_quiz(
            chunks, topic, count, blueprint, question_types, examples
        )
        
        # Validate questions
        validated_questions = self._validate_questions(questions, context)
        
        # Ensure difficulty distribution
        balanced_questions = self._balance_difficulty(validated_questions, count)
        
        return self._create_result(
            success=True,
            action="generate_quiz",
            data={
                "questions": balanced_questions,
                "topic": topic,
                "blueprint": blueprint,
                "question_count": len(balanced_questions),
                "difficulty_distribution": self._get_difficulty_distribution(balanced_questions),
                "quality_score": self._calculate_quiz_quality(balanced_questions),
            },
            message=f"Generated {len(balanced_questions)} intelligent quiz questions about {topic}",
        )
    
    async def _generate_blueprint(self, context: AgentContext, **kwargs) -> AgentResult:
        """Generate quiz blueprint for a topic"""
        topic = kwargs.get("topic", "general")
        
        blueprint = self._create_quiz_blueprint(topic, 10, "adaptive", context)
        
        return self._create_result(
            success=True,
            action="blueprint",
            data={"blueprint": blueprint},
            message=f"Generated quiz blueprint for {topic}",
        )
    
    def _create_quiz_blueprint(self, topic: str, count: int, difficulty: str, context: AgentContext) -> Dict:
        """Create a quiz blueprint based on topic and context"""
        # Get learning profile for adaptive difficulty
        profile = context.learning_profile or {}
        mastery_data = profile.get("concept_mastery", [])
        
        # Calculate adaptive difficulty
        if difficulty == "adaptive" and mastery_data:
            avg_mastery = sum(m.get("mastery_score", 0) for m in mastery_data) / len(mastery_data)
            if avg_mastery >= 80:
                difficulty = "hard"
            elif avg_mastery >= 50:
                difficulty = "medium"
            else:
                difficulty = "easy"
        
        # Calculate question counts by difficulty
        easy_count = max(1, int(count * DIFFICULTY_DISTRIBUTION["easy"]))
        medium_count = max(1, int(count * DIFFICULTY_DISTRIBUTION["medium"]))
        hard_count = max(1, count - easy_count - medium_count)
        
        # Get concepts from mastery data
        concepts = [m.get("concept", "") for m in mastery_data[:10]]
        
        return {
            "topic": topic,
            "total_questions": count,
            "difficulty": difficulty,
            "distribution": {
                "easy": easy_count,
                "medium": medium_count,
                "hard": hard_count,
            },
            "concepts": concepts,
            "question_types": ["mcq", "true_false", "scenario"],
            "quality_target": 85,
        }
    
    async def _generate_intelligent_quiz(
        self,
        chunks: List,
        topic: str,
        count: int,
        blueprint: Dict,
        question_types: List[str],
        examples: List[Dict]
    ) -> List[Dict]:
        """Generate quiz using blueprint and few-shot learning"""
        context_text = "\n\n".join([f"[{c.get('source_name', 'Source')}, p.{c.get('page', 1)}]\n{c.get('text', '')}" for c in chunks[:10]])
        
        # Build few-shot examples
        examples_text = "\n\n".join([
            f"EXAMPLE {i+1} ({q.get('difficulty', 'medium')}):\n"
            f"Q: {q['question']}\n"
            f"A: {q['options'][0]}\nB: {q['options'][1]}\n"
            f"C: {q['options'][2]}\nD: {q['options'][3]}\n"
            f"ANSWER: {chr(65 + q['answer'])}\n"
            f"EXPLANATION: {q['explanation']}\n"
            f"DIFFICULTY: {q.get('difficulty', 'medium')}\n"
            f"CONCEPT: {q.get('concept', 'general')}"
            for i, q in enumerate(examples)
        ])
        
        dist = blueprint["distribution"]
        types_str = ", ".join(question_types)
        
        prompt = f"""Generate {count} university-level quiz questions about: {topic}

DISTRIBUTION REQUIRED:
- Easy: {dist['easy']} questions
- Medium: {dist['medium']} questions  
- Hard: {dist['hard']} questions

QUESTION TYPES: {types_str}

BASED ON THIS MATERIAL:
{context_text}

FOLLOW THESE EXAMPLES:
{examples_text}

RULES:
1. Questions must test understanding, concepts, rules, and skills, not document trivia
2. Include scenario-based questions
3. Provide clear, educational explanations
4. Ensure answer correctness
5. Make distractors plausible but clearly wrong
6. CRITICAL: Questions MUST test substantive concepts, vocabulary, grammar rules, techniques, and lessons taught in the text.
7. STRICTLY FORBIDDEN: NEVER ask meta, trivia, or bibliographic questions about the document itself (e.g., NEVER ask "Who is the author?", "What is the book title?", "What are the chapter/section names?", "Who published this?", "What is in the table of contents?", or questions about copyright/ISBN/page numbers).

FORMAT each question EXACTLY like this:
Q: [question text]
A: [option A]
B: [option B]
C: [option C]
D: [option D]
ANSWER: [correct letter]
EXPLANATION: [why this is correct]
DIFFICULTY: [easy|medium|hard]
CONCEPT: [main concept being tested]
TYPE: [mcq|true_false|scenario]

--- (separator between questions)

Generate exactly {count} questions with the specified distribution."""
        
        response = await llm_service.chat(
            question=prompt,
            context_chunks=chunks,
            history=[],
        )
        
        return self._parse_questions(response, count)
    
    def _validate_questions(self, questions: List[Dict], context: AgentContext) -> List[Dict]:
        """Validate each question for quality"""
        validated = []
        
        for q in questions:
            validation = self._validate_single_question(q, context)
            q["validation"] = validation
            q["quality_score"] = validation["overall"]
            validated.append(q)
        
        return validated
    
    def _validate_single_question(self, question: Dict, context: AgentContext) -> Dict:
        """Validate a single question"""
        q_text = question.get("question", "")
        options = question.get("options", [])
        answer = question.get("answer", 0)
        
        # Clarity
        clarity = 50
        if 10 < len(q_text) < 300:
            clarity += 20
        if "?" in q_text:
            clarity += 10
        if len(options) == 4:
            clarity += 10
        if 0 <= answer < len(options):
            clarity += 10
        
        # Difficulty appropriateness
        difficulty = 50
        diff = question.get("difficulty", "medium")
        if diff == "easy":
            difficulty = 60
        elif diff == "medium":
            difficulty = 80
        elif diff == "hard":
            difficulty = 90
        
        # Learning value
        learning_value = 50
        if any(kw in q_text.lower() for kw in ["explain", "why", "how", "compare", "apply"]):
            learning_value += 25
        if len(options) >= 3:
            learning_value += 15
        
        overall = (clarity + difficulty + learning_value) / 3
        
        return {
            "clarity": min(100, clarity),
            "difficulty": min(100, difficulty),
            "learning_value": min(100, learning_value),
            "overall": round(overall, 1),
        }
    
    def _balance_difficulty(self, questions: List[Dict], target_count: int) -> List[Dict]:
        """Balance difficulty distribution"""
        if len(questions) <= target_count:
            return questions
        
        # Sort by quality score
        questions.sort(key=lambda q: q.get("quality_score", 0), reverse=True)
        
        # Take top questions
        return questions[:target_count]
    
    def _get_difficulty_distribution(self, questions: List[Dict]) -> Dict:
        """Get actual difficulty distribution"""
        total = len(questions)
        if total == 0:
            return {"easy": 0, "medium": 0, "hard": 0}
        
        easy = sum(1 for q in questions if q.get("difficulty") == "easy")
        medium = sum(1 for q in questions if q.get("difficulty") == "medium")
        hard = sum(1 for q in questions if q.get("difficulty") == "hard")
        
        return {
            "easy": f"{easy} ({easy/total*100:.0f}%)",
            "medium": f"{medium} ({medium/total*100:.0f}%)",
            "hard": f"{hard} ({hard/total*100:.0f}%)",
        }
    
    def _calculate_quiz_quality(self, questions: List[Dict]) -> float:
        """Calculate overall quiz quality score"""
        if not questions:
            return 0
        
        scores = [q.get("quality_score", 50) for q in questions]
        return round(sum(scores) / len(scores), 1)
    
    async def _evaluate_quiz(self, context: AgentContext, **kwargs) -> AgentResult:
        """Evaluate quiz answers and calculate score"""
        questions = kwargs.get("questions", [])
        answers = kwargs.get("answers", {})
        
        if not questions:
            return self._create_result(
                success=False,
                action="evaluate_quiz",
                message="No questions to evaluate",
            )
        
        correct = 0
        total = len(questions)
        weak_concepts = []
        
        for i, q in enumerate(questions):
            user_answer = answers.get(i, -1)
            correct_answer = q.get("answer", 0)
            
            if user_answer == correct_answer:
                correct += 1
            else:
                concept = q.get("concept", "unknown")
                weak_concepts.append(concept)
        
        score = round((correct / total) * 100) if total > 0 else 0
        
        return self._create_result(
            success=True,
            action="evaluate_quiz",
            data={
                "score": score,
                "correct": correct,
                "total": total,
                "accuracy": score,
                "weak_concepts": weak_concepts,
                "passed": score >= 70,
                "grade": self._calculate_grade(score),
            },
            message=f"Quiz completed! Score: {score}% ({correct}/{total} correct) - Grade: {self._calculate_grade(score)}",
        )
    
    def _calculate_grade(self, score: float) -> str:
        """Calculate letter grade from score"""
        if score >= 90:
            return "A"
        elif score >= 80:
            return "B"
        elif score >= 70:
            return "C"
        elif score >= 60:
            return "D"
        else:
            return "F"
    
    def _parse_questions(self, text: str, expected_count: int) -> List[Dict]:
        """Parse quiz questions from LLM response"""
        import re
        questions = []
        
        blocks = re.split(r'\n---\n|\n\n\n', text)
        
        for block in blocks:
            if not block.strip():
                continue
            
            q_match = re.search(r'Q:\s*(.+?)(?:\n|$)', block)
            if not q_match:
                continue
            
            options = []
            for letter in ['A', 'B', 'C', 'D']:
                opt_match = re.search(rf'{letter}:\s*(.+?)(?:\n|$)', block)
                if opt_match:
                    options.append(opt_match.group(1).strip())
            
            answer_match = re.search(r'ANSWER:\s*([A-D])', block, re.IGNORECASE)
            explanation_match = re.search(r'EXPLANATION:\s*(.+?)(?:\n|$)', block)
            difficulty_match = re.search(r'DIFFICULTY:\s*(easy|medium|hard)', block, re.IGNORECASE)
            concept_match = re.search(r'CONCEPT:\s*(.+?)(?:\n|$)', block)
            type_match = re.search(r'TYPE:\s*(mcq|true_false|scenario|fill_blank|short_answer|application)', block, re.IGNORECASE)
            
            if q_match and len(options) >= 4:
                answer_idx = 'ABCD'.index(answer_match.group(1).upper()) if answer_match else 0
                questions.append({
                    "question": q_match.group(1).strip(),
                    "options": options[:4],
                    "answer": answer_idx,
                    "explanation": explanation_match.group(1).strip() if explanation_match else "",
                    "difficulty": difficulty_match.group(1).lower() if difficulty_match else "medium",
                    "concept": concept_match.group(1).strip() if concept_match else "general",
                    "type": type_match.group(1).lower() if type_match else "mcq",
                })
        
        return questions[:expected_count]


# Register agent
assessment_agent = AssessmentAgent()
registry.register(assessment_agent, intents=["quiz", "test", "practice", "assess", "exam"])
