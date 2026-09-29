"""
ConceptExtractor — identifies key concepts from text and links them across sources.
Uses LLM for concept identification and vector store for semantic similarity.
"""
import json
from typing import List
from app.config import settings
from app.services.vector_store import query_chunks
from app.services.llm import chat as llm_chat


class Concept:
    """Represents an identified concept."""
    def __init__(self, name: str, description: str, source_id: str, confidence: float = 1.0):
        self.name = name
        self.description = description
        self.source_id = source_id
        self.confidence = confidence
    
    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "source_id": self.source_id,
            "confidence": self.confidence
        }


class ConceptLink:
    """Represents a relationship between concepts."""
    def __init__(self, concept: str, related_concept: str, relationship_type: str, 
                 source_ids: List[str], strength: float = 1.0):
        self.concept = concept
        self.related_concept = related_concept
        self.relationship_type = relationship_type
        self.source_ids = source_ids
        self.strength = strength
    
    def to_dict(self) -> dict:
        return {
            "concept": self.concept,
            "related_concept": self.related_concept,
            "relationship_type": self.relationship_type,
            "source_ids": self.source_ids,
            "strength": self.strength
        }


# ═══════════════════════════════════════════════════════════════════════════════
# PROMPTS
# ══════════════════════════════════════════════════════════════════════════════

CONCEPT_EXTRACTION_PROMPT = """Analyze the following text and identify the key concepts, topics, or ideas.
For each concept, provide:
1. A concise name (2-4 words)
2. A brief description (1 sentence)

Return ONLY a JSON array with this structure:
[{"name": "concept name", "description": "brief description"}]

Text to analyze:
{text}

JSON array:"""

PREREQUISITE_PROMPT = """Given the concept "{concept}" and its context, identify prerequisite concepts or knowledge that a learner would need to understand this concept.

Context:
{context}

List ONLY the prerequisite concepts as a JSON array of strings. If there are no clear prerequisites, return an empty array.

Example format: ["prerequisite 1", "prerequisite 2"]

JSON array:"""

RELATED_CONCEPTS_PROMPT = """Given the concept "{concept}" and related text passages, identify other concepts that are related.

Related passages:
{context}

For each related concept, determine the relationship type:
- "prerequisite": needed before learning this concept
- "related": connected or similar topic
- "extends": builds upon this concept
- "contrasts": opposite or contrasting idea
- "applies_to": practical application area

Return ONLY a JSON array with this structure:
[{"concept": "{concept}", "related_concept": "name", "relationship_type": "type"}]

If no clear relationships exist, return an empty array.

JSON array:"""


# ══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═════════════════════════════════════════════════════════════════════════════

def _extract_json(content: str) -> list:
    """Extract JSON array from LLM response, handling markdown code blocks."""
    content = content.strip()
    if content.startswith("```"):
        # Remove markdown code block markers
        lines = content.split("\n")
        content = "\n".join(lines[1:-1]) if len(lines) > 2 else content
        content = content.replace("```json", "").replace("```", "").strip()
    return json.loads(content)


async def _call_llm(prompt: str, system_prompt: str, temperature: float = 0.2) -> str:
    """Call the unified LLM service with a simple prompt."""
    try:
        response = await llm_chat(
            question=prompt,
            context_chunks=[],  # No RAG context needed for these extraction tasks
            history=[],
            action_type="concept_extraction",
            user_level="intermediate",
        )
        return response
    except Exception as e:
        print(f"[ConceptExtractor] LLM call failed: {e}")
        raise


# ══════════════════════════════════════════════════════════════════════════════
# PUBLIC FUNCTIONS
# ════════════════════════════════════════════════════════════════════════════

async def extract_concepts(text: str, source_id: str) -> List[Concept]:
    """
    Extract key concepts from text using LLM.
    
    Args:
        text: The text to analyze
        source_id: The source document ID
    
    Returns:
        List of identified Concept objects
    """
    # Escape braces in JSON example for .format()
    prompt_template = """Analyze the following text and identify the key concepts, topics, or ideas.
For each concept, provide:
1. A concise name (2-4 words)
2. A brief description (1 sentence)

Return ONLY a JSON array with this structure:
[{{\\"name\\": \\"concept name\\", \\"description\\": \\"brief description\\"}}

Text to analyze:
{text}

JSON array:"""
    prompt = prompt_template.format(text=text[:2000])

    try:
        content = await _call_llm(
            prompt=prompt,
            system_prompt="You are a concept extraction assistant. Return only valid JSON.",
            temperature=0.2,
        )
        
        # Parse JSON
        concepts_data = _extract_json(content)
        
        # Convert to Concept objects
        concepts = []
        for item in concepts_data:
            if isinstance(item, dict) and "name" in item and "description" in item:
                concepts.append(Concept(
                    name=item["name"],
                    description=item["description"],
                    source_id=source_id,
                    confidence=0.9
                ))
        
        return concepts
        
    except Exception as e:
        print(f"[ConceptExtractor] Error extracting concepts: {e}")
        return []


async def identify_prerequisites(concept: str, context: str) -> List[str]:
    """
    Identify prerequisite concepts needed to understand the given concept.
    
    Args:
        concept: The concept to analyze
        context: Surrounding text providing context
    
    Returns:
        List of prerequisite concept names
    """
    prompt_template = """Given the concept "{concept}" and its context, identify prerequisite concepts or knowledge that a learner would need to understand this concept.

Context:
{context}

List ONLY the prerequisite concepts as a JSON array of strings. If there are no clear prerequisites, return an empty array.

Example format: [\\"prerequisite 1\\", \\"prerequisite 2\\"]

JSON array:"""
    prompt = prompt_template.format(concept=concept, context=context[:1500])

    try:
        content = await _call_llm(
            prompt=prompt,
            system_prompt="You are an educational prerequisite analyzer. Return only valid JSON arrays.",
            temperature=0.2,
        )
        
        # Parse JSON
        prerequisites = _extract_json(content)
        
        # Ensure it's a list of strings
        if isinstance(prerequisites, list):
            return [str(p) for p in prerequisites if p]
        
        return []
        
    except Exception as e:
        print(f"[ConceptExtractor] Error identifying prerequisites: {e}")
        return []


async def find_related_concepts(concept: str, all_source_ids: List[str]) -> List[ConceptLink]:
    """
    Find related concepts across multiple sources using semantic similarity.
    
    Args:
        concept: The concept to find relations for
        all_source_ids: List of source IDs to search across
    
    Returns:
        List of ConceptLink objects representing relationships
    """
    try:
        # Use vector store to find semantically similar chunks
        similar_chunks = query_chunks(
            question=concept,
            source_ids=all_source_ids,
            top_k=10
        )
        
        if not similar_chunks:
            return []
        
        # Build context from similar chunks
        context_parts = []
        for i, chunk in enumerate(similar_chunks[:5], 1):
            context_parts.append(f"[{i}] {chunk['text'][:300]}")
        context = "\n\n".join(context_parts)
        
        # Use LLM to identify related concepts
        prompt_template = """Given the concept "{concept}" and related text passages, identify other concepts that are related.

Related passages:
{context}

For each related concept, determine the relationship type:
- "prerequisite": needed before learning this concept
- "related": connected or similar topic
- "extends": builds upon this concept
- "contrasts": opposite or contrasting idea
- "applies_to": practical application area

Return ONLY a JSON array with this structure:
[{{\\"concept\\": \\"{concept}\\", \\"related_concept\\": \\"name\\", \\"relationship_type\\": \\"type\\"}}]

If no clear relationships exist, return an empty array.

JSON array:"""
        prompt = prompt_template.format(concept=concept, context=context)

        content = await _call_llm(
            prompt=prompt,
            system_prompt="You are a concept relationship analyzer. Return only valid JSON.",
            temperature=0.2,
        )
        
        # Parse JSON
        relationships = _extract_json(content)
        
        # Convert to ConceptLink objects
        links = []
        for rel in relationships:
            if isinstance(rel, dict) and all(k in rel for k in ["concept", "related_concept", "relationship_type"]):
                # Collect source IDs from similar chunks
                source_ids = list(set(chunk["source_id"] for chunk in similar_chunks[:5]))
                
                links.append(ConceptLink(
                    concept=rel["concept"],
                    related_concept=rel["related_concept"],
                    relationship_type=rel["relationship_type"],
                    source_ids=source_ids,
                    strength=0.8
                ))
        
        return links
        
    except Exception as e:
        print(f"[ConceptExtractor] Error finding related concepts: {e}")
        return []