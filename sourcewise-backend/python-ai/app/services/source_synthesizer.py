"""
SourceSynthesizer - NotebookLM-style cross-source synthesis.

This service analyzes and combines information from multiple sources to create
comprehensive, well-connected explanations. This is the PRIMARY strength that
makes SourceWise a powerful learning tool.
"""
from typing import Dict, List, Optional, Tuple
from app.services.llm import chat
from app.config import settings


class SourceComparison:
    """Represents how different sources treat the same topic."""

    def __init__(self, topic: str):
        self.topic = topic
        self.sources: List[Dict] = []
        self.complementary_points: List[str] = []
        self.contradictory_points: List[str] = []
        self.unified_summary: str = ""

    def to_dict(self):
        return {
            "topic": self.topic,
            "sources": self.sources,
            "complementary_points": self.complementary_points,
            "contradictory_points": self.contradictory_points,
            "unified_summary": self.unified_summary,
        }


class SynthesisResult:
    """Result of cross-source synthesis."""

    def __init__(self):
        self.quick_answer: str = ""
        self.standard_explanation: str = ""
        self.deep_dive: str = ""
        self.source_comparison: Optional[SourceComparison] = None
        self.key_insights: List[str] = []
        self.connections: List[str] = []
        self.further_exploration: List[str] = []

    def to_dict(self):
        return {
            "quick_answer": self.quick_answer,
            "standard_explanation": self.standard_explanation,
            "deep_dive": self.deep_dive,
            "source_comparison": self.source_comparison.to_dict() if self.source_comparison else None,
            "key_insights": self.key_insights,
            "connections": self.connections,
            "further_exploration": self.further_exploration,
        }


class SourceSynthesizer:
    """
    Creates NotebookLM-style synthesis from multiple sources.

    Capabilities:
    - Cross-source comparison (how different sources treat the same topic)
    - Information integration (combine complementary information)
    - Contradiction detection (identify conflicting claims)
    - Connection making (link concepts across sources)
    - Multi-level explanations (quick, standard, deep dive)
    """

    async def _generate_chat(self, system_content: str, user_content: str, temperature: float = 0.3) -> str:
        from app.services.llm import raw_chat
        return await raw_chat(
            [
                {"role": "system", "content": system_content},
                {"role": "user", "content": user_content},
            ],
            temperature=temperature,
        )

    async def synthesize_multi_source(
        self,
        question: str,
        chunks_by_source: Dict[str, List[Dict]],
    ) -> SynthesisResult:
        """
        Synthesize information from multiple sources to answer a question.

        Args:
            question: User's question
            chunks_by_source: Dict mapping source_id to list of relevant chunks

        Returns:
            SynthesisResult with multi-level explanations and source comparison
        """
        result = SynthesisResult()

        # Build context from all sources
        all_context = self._build_comprehensive_context(chunks_by_source)

        # Generate multi-level explanations
        result.quick_answer = await self._generate_quick_answer(question, all_context)
        result.standard_explanation = await self._generate_standard_explanation(question, all_context)
        result.deep_dive = await self._generate_deep_dive(question, all_context, chunks_by_source)

        # If multiple sources, do source comparison
        if len(chunks_by_source) > 1:
            result.source_comparison = await self._compare_sources(question, chunks_by_source)

        # Generate key insights
        result.key_insights = await self._extract_key_insights(question, all_context)

        # Make connections across sources
        result.connections = await self._find_connections(chunks_by_source)

        # Suggest further exploration
        result.further_exploration = await self._suggest_further_exploration(
            question, all_context
        )

        return result

    async def generate_teaching_material(
        self,
        topic: str,
        chunks: List[Dict],
    ) -> Dict:
        """
        Generate comprehensive teaching material for a topic.

        Returns:
            Dict with summary, key_points, examples, practice_questions, and visual_summary
        """
        context = "\n\n".join([
            f"[{c.get('source_name', 'Source')}, p.{c.get('page', '?')}]\n{c['text']}"
            for c in chunks[:8]
        ])

        prompt = f"""Create comprehensive teaching material for the topic: "{topic}"

Based on the following source material:
{context}

Generate:
1. A clear summary (2-3 paragraphs)
2. Key points (5-7 bullet points)
3. Real-world examples (2-3 examples)
4. Common misconceptions to avoid
5. Practice questions (3 questions at different difficulty levels)
6. A visual summary (text-based concept map or flowchart)

Format your response as JSON:
{{
    "summary": "...",
    "key_points": ["...", "..."],
    "examples": ["...", "..."],
    "misconceptions": ["...", "..."],
    "practice_questions": [
        {{"question": "...", "difficulty": "easy/medium/hard", "answer": "..."}},
        ...
    ],
    "visual_summary": "Text-based visual representation"
}}"""

        content = await self._generate_chat(
            "You are an expert educator creating comprehensive study materials. Be thorough, accurate, and engaging.",
            prompt,
            temperature=0.3
        )

        # Parse JSON response
        import json
        try:
            json_start = content.find("{")
            json_end = content.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                return json.loads(content[json_start:json_end])
        except json.JSONDecodeError:
            pass

        return {
            "summary": content[:500],
            "key_points": [],
            "examples": [],
            "misconceptions": [],
            "practice_questions": [],
            "visual_summary": "",
        }

    async def generate_source_map(
        self,
        chunks_by_source: Dict[str, List[Dict]],
    ) -> Dict:
        """
        Generate a map of how topics connect across sources.

        Returns:
            Dict with topics, cross_references, and source_coverage
        """
        # Build context for topic extraction
        all_text = ""
        for source_id, chunks in chunks_by_source.items():
            source_name = chunks[0].get("source_name", source_id) if chunks else source_id
            all_text += f"\n=== {source_name} ===\n"
            for chunk in chunks[:5]:
                all_text += chunk.get("text", "")[:500] + "\n"

        prompt = f"""Analyze the following study materials and create a topic map.

{all_text[:3000]}

Generate:
1. Main topics covered (5-10 topics)
2. How topics connect across sources
3. Which sources cover which topics
4. Suggested learning order

Format as JSON:
{{
    "topics": ["topic1", "topic2", ...],
    "cross_references": [
        {{"topic": "...", "sources": ["source1", "source2"], "connection": "..."}},
        ...
    ],
    "source_coverage": {{
        "source_name": ["topic1", "topic2", ...],
        ...
    }},
    "suggested_order": ["topic1", "topic2", ...]
}}"""

        content = await self._generate_chat(
            "You are an expert at analyzing and organizing educational content.",
            prompt,
            temperature=0.2
        )

        import json
        try:
            json_start = content.find("{")
            json_end = content.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                return json.loads(content[json_start:json_end])
        except json.JSONDecodeError:
            pass

        return {"topics": [], "cross_references": [], "source_coverage": {}, "suggested_order": []}

    # --- Private helper methods ---

    def _build_comprehensive_context(self, chunks_by_source: Dict[str, List[Dict]]) -> str:
        parts = []
        for source_id, chunks in chunks_by_source.items():
            source_name = chunks[0].get("source_name", source_id) if chunks else source_id
            parts.append(f"\n=== From {source_name} ===")
            for chunk in chunks[:5]:
                parts.append(f"[p.{chunk.get('page', '?')}] {chunk['text']}")
        return "\n".join(parts)

    async def _generate_quick_answer(self, question: str, context: str) -> str:
        prompt = f"""Based on the source material below, provide a QUICK, DIRECT answer to the question.
Keep it concise -- 1-2 sentences maximum. Be clear and to the point.

SOURCE MATERIAL:
{context[:2000]}

QUESTION: {question}

Quick answer:"""

        return await self._generate_chat(
            "You are a concise, helpful study assistant.",
            prompt,
            temperature=0.3
        )

    async def _generate_standard_explanation(self, question: str, context: str) -> str:
        prompt = f"""Based on the source material below, provide a STANDARD explanation for the question.
Write a clear, well-structured paragraph that covers the key points. Be engaging and educational.

SOURCE MATERIAL:
{context[:3000]}

QUESTION: {question}

Standard explanation:"""

        return await self._generate_chat(
            "You are a warm, engaging educator who explains concepts clearly.",
            prompt,
            temperature=0.4
        )

    async def _generate_deep_dive(
        self, question: str, context: str, chunks_by_source: Dict
    ) -> str:
        source_count = len(chunks_by_source)
        prompt = f"""Based on {source_count} source(s), provide a COMPREHENSIVE deep dive explanation.

Include:
- Detailed explanation with examples
- How different sources treat this topic (if multiple sources)
- Key nuances and edge cases
- Connections to related concepts
- Practical applications

SOURCE MATERIAL:
{context[:4000]}

QUESTION: {question}

Deep dive explanation:"""

        return await self._generate_chat(
            "You are an expert educator providing comprehensive, in-depth explanations. Be thorough and insightful.",
            prompt,
            temperature=0.4
        )

    async def _compare_sources(
        self, question: str, chunks_by_source: Dict[str, List[Dict]]
    ) -> SourceComparison:
        comparison = SourceComparison(question)

        # Build per-source summaries
        for source_id, chunks in chunks_by_source.items():
            source_name = chunks[0].get("source_name", source_id) if chunks else source_id
            text = "\n".join(c["text"][:300] for c in chunks[:3])
            comparison.sources.append({
                "source_id": source_id,
                "source_name": source_name,
                "excerpt": text[:500],
            })

        # Use LLM to compare sources
        source_texts = "\n\n".join([
            f"=== {s['source_name']} ===\n{s['excerpt']}"
            for s in comparison.sources
        ])

        prompt = f"""Compare how the following sources address the topic: "{question}"

{source_texts}

Analyze:
1. What complementary information do they provide?
2. Are there any contradictions or different perspectives?
3. What is the unified key takeaway?

Format as JSON:
{{
    "complementary": ["point 1", "point 2"],
    "contradictory": ["point 1", "point 2"],
    "unified_summary": "..."
}}"""

        content = await self._generate_chat(
            "You are an expert at comparing and synthesizing information from multiple sources.",
            prompt,
            temperature=0.2
        )

        import json
        try:
            json_start = content.find("{")
            json_end = content.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                data = json.loads(content[json_start:json_end])
                comparison.complementary_points = data.get("complementary", [])
                comparison.contradictory_points = data.get("contradictory", [])
                comparison.unified_summary = data.get("unified_summary", "")
        except json.JSONDecodeError:
            comparison.unified_summary = content[:300]

        return comparison

    async def _extract_key_insights(self, question: str, context: str) -> List[str]:
        prompt = f"""Extract 3-5 key insights from the source material about: "{question}"

SOURCE MATERIAL:
{context[:2000]}

Return ONLY a JSON array of strings:
["insight 1", "insight 2", "insight 3"]"""

        content = await self._generate_chat(
            "You extract key insights. Return only valid JSON arrays.",
            prompt,
            temperature=0.2
        )

        import json
        try:
            json_start = content.find("[")
            json_end = content.rfind("]") + 1
            if json_start >= 0 and json_end > json_start:
                return json.loads(content[json_start:json_end])
        except json.JSONDecodeError:
            pass
        return []

    async def _find_connections(self, chunks_by_source: Dict[str, List[Dict]]) -> List[str]:
        if len(chunks_by_source) < 2:
            return []

        source_summaries = []
        for source_id, chunks in chunks_by_source.items():
            name = chunks[0].get("source_name", source_id) if chunks else source_id
            text = " ".join(c["text"][:200] for c in chunks[:2])
            source_summaries.append(f"{name}: {text[:400]}")

        prompt = f"""Find connections and relationships between these different sources:

{chr(10).join(source_summaries)}

List 2-3 specific connections or relationships between the sources.
Return ONLY a JSON array of strings:
["connection 1", "connection 2"]"""

        content = await self._generate_chat(
            "You find connections between sources. Return only valid JSON arrays.",
            prompt,
            temperature=0.3
        )

        import json
        try:
            json_start = content.find("[")
            json_end = content.rfind("]") + 1
            if json_start >= 0 and json_end > json_start:
                return json.loads(content[json_start:json_end])
        except json.JSONDecodeError:
            pass
        return []

    async def _suggest_further_exploration(self, question: str, context: str) -> List[str]:
        prompt = f"""Based on the topic "{question}" and the source material, suggest 2-3 related topics the user might want to explore next.

SOURCE MATERIAL:
{context[:1500]}

Return ONLY a JSON array of strings:
["suggested topic 1", "suggested topic 2", "suggested topic 3"]"""

        content = await self._generate_chat(
            "You suggest learning topics. Return only valid JSON arrays.",
            prompt,
            temperature=0.3
        )

        import json
        try:
            json_start = content.find("[")
            json_end = content.rfind("]") + 1
            if json_start >= 0 and json_end > json_start:
                return json.loads(content[json_start:json_end])
        except json.JSONDecodeError:
            pass
        return []


source_synthesizer = SourceSynthesizer()
