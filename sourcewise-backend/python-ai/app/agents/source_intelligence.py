"""
Source Intelligence Agent - Converts uploaded content into structured knowledge.

Triggers on source upload and generates:
- Summary
- Key Concepts
- Difficulty Assessment
- Knowledge Graph
"""

from typing import List, Dict, Any
from app.agents.base import BaseAgent, AgentContext, AgentResult
from app.agents.registry import registry
from app.services import vector_store, llm as llm_service


class SourceIntelligenceAgent(BaseAgent):
    """
    Analyzes uploaded sources and extracts structured knowledge.
    """
    
    def can_handle(self, intent: str) -> bool:
        return intent in ["upload", "analyze", "source"]
    
    def get_capabilities(self) -> List[str]:
        return [
            "content_extraction",
            "concept_extraction",
            "difficulty_assessment",
            "knowledge_graph_generation",
            "summary_generation",
        ]
    
    async def execute(self, context: AgentContext, **kwargs) -> AgentResult:
        """Analyze source and extract structured knowledge"""
        source_ids = context.source_ids or kwargs.get("source_ids", [])
        
        if not source_ids:
            return self._create_result(
                success=False,
                action="analyze_sources",
                message="No sources selected for analysis",
            )
        
        analyses = []
        for source_id in source_ids:
            analysis = await self._analyze_source(source_id, context)
            if analysis:
                analyses.append(analysis)
        
        return self._create_result(
            success=True,
            action="analyze_sources",
            data={
                "analyses": analyses,
                "source_count": len(analyses),
            },
            message=f"Analyzed {len(analyses)} source(s) and extracted structured knowledge.",
        )
    
    async def _analyze_source(self, source_id: str, context: AgentContext) -> Dict[str, Any]:
        """Analyze a single source"""
        try:
            # Get chunks from vector store
            chunks = vector_store.query_chunks(
                question="main topics concepts summary structure",
                source_ids=[source_id],
                top_k=15,
            )
            
            if not chunks:
                return None
            
            source_name = chunks[0].get("source_name", "Unknown")
            
            # Build context for LLM
            context_text = "\n\n".join([
                f"[Page {c.get('page', '?')}]\n{c.get('text', '')[:500]}"
                for c in chunks[:10]
            ])
            
            # Generate comprehensive analysis
            analysis_prompt = f"""Analyze this document thoroughly and return a JSON object.

DOCUMENT: {source_name}

CONTENT:
{context_text}

Return ONLY valid JSON with this structure:
{{
  "summary": "2-3 sentence overview",
  "key_concepts": [
    {{"name": "Concept", "description": "Brief description", "difficulty": "easy|medium|hard", "importance": "low|medium|high"}}
  ],
  "learning_objectives": ["What the student should learn"],
  "difficulty_assessment": "easy|medium|hard|mixed",
  "estimated_study_time": "X hours",
  "chapter_structure": [
    {{"title": "Section", "concepts": ["concept1", "concept2"]}}
  ],
  "key_takeaways": ["Important points to remember"],
  "prerequisites": ["What should be learned first"]
}}"""
            
            response = await llm_service.chat(
                question=analysis_prompt,
                context_chunks=chunks,
                history=[],
            )
            
            # Parse JSON from response
            import json
            import re
            try:
                json_match = re.search(r'\{[\s\S]*\}', response)
                if json_match:
                    analysis = json.loads(json_match.group())
                else:
                    analysis = self._create_fallback_analysis(source_name)
            except json.JSONDecodeError:
                analysis = self._create_fallback_analysis(source_name)
            
            analysis["source_id"] = source_id
            analysis["source_name"] = source_name
            
            return analysis
            
        except Exception as e:
            print(f"[SourceIntelligence] Error analyzing {source_id}: {e}")
            return None
    
    def _create_fallback_analysis(self, source_name: str) -> Dict:
        """Create fallback analysis if LLM parsing fails"""
        return {
            "summary": f"Analysis of {source_name}",
            "key_concepts": [],
            "learning_objectives": [],
            "difficulty_assessment": "medium",
            "estimated_study_time": "2 hours",
            "chapter_structure": [],
            "key_takeaways": [],
            "prerequisites": [],
        }


# Register agent
source_intelligence_agent = SourceIntelligenceAgent()
registry.register(source_intelligence_agent, intents=["upload", "analyze", "source"])
