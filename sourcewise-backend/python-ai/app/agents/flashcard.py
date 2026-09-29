"""
Flashcard Agent - Creates high-quality memory reinforcement resources.

Uses few-shot learning and quality validation to generate
educational flashcards that test understanding, not just memorization.
"""

from typing import List, Dict, Any
from app.agents.base import BaseAgent, AgentContext, AgentResult
from app.agents.registry import registry
from app.agents.educational_dataset import get_few_shot_examples, get_generation_template
from app.services import vector_store, llm as llm_service


# Card type descriptions for quality generation
CARD_TYPES = {
    "definition": "Tests understanding of a concept's meaning and context",
    "concept": "Tests deep understanding of how a concept works",
    "comparison": "Tests ability to distinguish between similar concepts",
    "process": "Tests understanding of step-by-step procedures",
    "application": "Tests ability to apply knowledge to real scenarios",
    "exam": "Tests exam-style recall and problem-solving",
    "cloze": "Tests recall through fill-in-the-blank",
}


class FlashcardAgent(BaseAgent):
    """
    Generates high-quality flashcards with educational intelligence.
    
    Uses few-shot learning with proven examples and validates
    quality before delivering to users.
    """
    
    MINIMUM_QUALITY_SCORE = 80
    
    def can_handle(self, intent: str) -> bool:
        return intent in ["flashcards", "flashcard", "memorize", "remember"]
    
    def get_capabilities(self) -> List[str]:
        return [
            "definition_card_generation",
            "concept_card_generation",
            "comparison_card_generation",
            "process_card_generation",
            "application_card_generation",
            "exam_card_generation",
            "cloze_card_generation",
            "quality_scoring",
            "difficulty_classification",
        ]
    
    async def execute(self, context: AgentContext, **kwargs) -> AgentResult:
        """Generate high-quality flashcards with intelligence"""
        topic = kwargs.get("topic", "key concepts")
        count = kwargs.get("count", 10)
        card_types = kwargs.get("card_types", ["definition", "concept", "comparison", "application"])
        
        # Get chunks from sources
        chunks = vector_store.query_chunks(
            question=f"flashcards about {topic}",
            source_ids=context.source_ids,
            top_k=10,
        )
        
        if not chunks:
            return self._create_result(
                success=False,
                action="generate_flashcards",
                message="No content available for flashcard generation",
            )
        
        # Get few-shot examples
        examples = get_few_shot_examples("flashcard", count=3)
        
        # Generate high-quality flashcards
        cards = await self._generate_quality_cards(chunks, topic, count, card_types, examples)
        
        # Validate quality
        validated_cards = self._validate_cards(cards, context)
        
        # Filter by quality
        high_quality_cards = [c for c in validated_cards if c.get("quality_score", 0) >= self.MINIMUM_QUALITY_SCORE]
        
        # If not enough high-quality cards, include best of rest
        if len(high_quality_cards) < count:
            remaining = sorted(
                [c for c in validated_cards if c.get("quality_score", 0) < self.MINIMUM_QUALITY_SCORE],
                key=lambda c: c.get("quality_score", 0),
                reverse=True
            )
            high_quality_cards.extend(remaining[:count - len(high_quality_cards)])
        
        return self._create_result(
            success=True,
            action="generate_flashcards",
            data={
                "cards": high_quality_cards[:count],
                "topic": topic,
                "card_count": min(count, len(high_quality_cards)),
                "quality_stats": self._calculate_quality_stats(validated_cards),
                "card_types_used": list(set(c.get("type", "qa") for c in high_quality_cards)),
            },
            message=f"Generated {len(high_quality_cards[:count])} high-quality flashcards about {topic}",
        )
    
    async def _generate_quality_cards(
        self,
        chunks: List,
        topic: str,
        count: int,
        card_types: List[str],
        examples: List[Dict]
    ) -> List[Dict]:
        """Generate flashcards using few-shot learning"""
        context_text = "\n".join([c.get("text", "")[:300] for c in chunks[:8]])
        
        # Build few-shot examples string
        examples_text = "\n\n".join([
            f"EXAMPLE {i+1}:\nFRONT: {ex['front']}\nBACK: {ex['back']}\nTYPE: {ex['type']}\nDIFFICULTY: {ex['difficulty']}"
            for i, ex in enumerate(examples)
        ])
        
        card_types_str = ", ".join(card_types)
        
        prompt = f"""Generate {count} high-quality flashcards about: {topic}

CARD TYPES TO INCLUDE: {card_types_str}

CARD TYPE DESCRIPTIONS:
{chr(10).join(f"- {t}: {d}" for t, d in CARD_TYPES.items() if t in card_types)}

BASED ON THIS MATERIAL:
{context_text}

FOLLOW THESE EXAMPLES:
{examples_text}

RULES FOR HIGH-QUALITY CARDS:
1. Test understanding, not just memorization
2. Focus on one concept per card
3. Avoid ambiguity
4. Include context in answers
5. Match difficulty to learner level
6. Use clear, concise language

FORMAT each card EXACTLY like this:
FRONT: [question or term]
BACK: [comprehensive answer with context]
TYPE: [definition|concept|comparison|process|application|exam|cloze]
DIFFICULTY: [easy|medium|hard]
CONCEPT: [main concept being tested]
QUALITY_HINT: [what makes this card educational]

--- (separator between cards)

Generate exactly {count} cards with varied types."""
        
        response = await llm_service.chat(
            question=prompt,
            context_chunks=chunks,
            history=[],
        )
        
        return self._parse_cards(response, count)
    
    def _validate_cards(self, cards: List[Dict], context: AgentContext) -> List[Dict]:
        """Validate and score each flashcard"""
        validated = []
        
        for card in cards:
            score = self._calculate_card_score(card, context)
            card["quality_score"] = score
            card["quality_breakdown"] = self._get_quality_breakdown(card, context)
            validated.append(card)
        
        return validated
    
    def _calculate_card_score(self, card: Dict, context: AgentContext) -> float:
        """Calculate quality score for a flashcard"""
        front = card.get("front", "")
        back = card.get("back", "")
        card_type = card.get("type", "qa")
        
        # Clarity score
        clarity = 50
        if 10 < len(front) < 200:
            clarity += 15
        if 10 < len(back) < 500:
            clarity += 15
        if "?" in front or front.endswith(":"):
            clarity += 10
        clarity = min(100, clarity)
        
        # Learning value score
        learning_value = 50
        type_bonuses = {
            "concept": 20, "comparison": 25, "application": 25,
            "process": 20, "exam": 15, "cloze": 15, "definition": 10,
        }
        learning_value += type_bonuses.get(card_type, 10)
        if len(back) > 50:
            learning_value += 10
        if any(w in back.lower() for w in ["because", "therefore", "example"]):
            learning_value += 10
        learning_value = min(100, learning_value)
        
        # Exam relevance
        exam_relevance = 50
        if any(kw in front.lower() for kw in ["exam", "important", "key", "definition"]):
            exam_relevance += 20
        exam_relevance = min(100, exam_relevance)
        
        # Overall score
        overall = clarity * 0.3 + learning_value * 0.4 + exam_relevance * 0.3
        
        return round(overall, 1)
    
    def _get_quality_breakdown(self, card: Dict, context: AgentContext) -> Dict:
        """Get detailed quality breakdown"""
        return {
            "clarity": "High" if len(card.get("front", "")) > 10 else "Low",
            "depth": "Good" if len(card.get("back", "")) > 50 else "Needs more detail",
            "type_value": card.get("type", "qa"),
        }
    
    def _calculate_quality_stats(self, cards: List[Dict]) -> Dict:
        """Calculate aggregate quality statistics"""
        if not cards:
            return {"average": 0, "min": 0, "max": 0, "above_threshold": 0}
        
        scores = [c.get("quality_score", 0) for c in cards]
        
        return {
            "average": round(sum(scores) / len(scores), 1),
            "min": round(min(scores), 1),
            "max": round(max(scores), 1),
            "above_threshold": sum(1 for s in scores if s >= self.MINIMUM_QUALITY_SCORE),
            "total": len(cards),
        }
    
    def _parse_cards(self, text: str, expected_count: int) -> List[Dict]:
        """Parse flashcards from LLM response"""
        import re
        cards = []
        
        blocks = re.split(r'\n---\n|\n\n\n', text)
        
        for block in blocks:
            if not block.strip():
                continue
            
            front_match = re.search(r'FRONT:\s*(.+?)(?:\n|$)', block)
            back_match = re.search(r'BACK:\s*(.+?)(?:\n|$)', block)
            type_match = re.search(r'TYPE:\s*(definition|concept|comparison|process|application|exam|cloze|qa)', block, re.IGNORECASE)
            difficulty_match = re.search(r'DIFFICULTY:\s*(easy|medium|hard)', block, re.IGNORECASE)
            concept_match = re.search(r'CONCEPT:\s*(.+?)(?:\n|$)', block)
            
            if front_match and back_match:
                cards.append({
                    "front": front_match.group(1).strip(),
                    "back": back_match.group(1).strip(),
                    "type": type_match.group(1).lower() if type_match else "qa",
                    "difficulty": difficulty_match.group(1).lower() if difficulty_match else "medium",
                    "concept": concept_match.group(1).strip() if concept_match else "general",
                })
        
        return cards[:expected_count]


# Register agent
flashcard_agent = FlashcardAgent()
registry.register(flashcard_agent, intents=["flashcards", "flashcard", "memorize", "remember"])
