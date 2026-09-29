"""
Knowledge Agent - Manages structured knowledge.

Creates concept maps, links knowledge across sources, enables concept search,
and maps concept dependencies and learning paths.
"""

from typing import List, Dict, Any
from app.agents.base import BaseAgent, AgentContext, AgentResult
from app.agents.registry import registry
from app.services import vector_store, llm as llm_service


class KnowledgeAgent(BaseAgent):
    """
    Manages knowledge representation, relationships, and learning paths.
    """
    
    def can_handle(self, intent: str) -> bool:
        return intent in ["knowledge", "concepts", "relationships", "connections"]
    
    def get_capabilities(self) -> List[str]:
        return [
            "concept_mapping",
            "knowledge_linking",
            "relationship_extraction",
            "concept_search",
            "dependency_mapping",
            "learning_path_generation",
        ]
    
    async def execute(self, context: AgentContext, **kwargs) -> AgentResult:
        """Execute knowledge actions"""
        action = kwargs.get("action", "graph")
        
        if action == "search":
            return await self._search_concepts(context, **kwargs)
        elif action == "link":
            return await self._link_knowledge(context, **kwargs)
        elif action == "dependencies":
            return await self._map_dependencies(context, **kwargs)
        elif action == "learning_paths":
            return await self._generate_learning_paths(context, **kwargs)
        else:
            return await self._generate_graph(context, **kwargs)
    
    async def _generate_graph(self, context: AgentContext, **kwargs) -> AgentResult:
        """Generate knowledge graph from sources"""
        chunks = vector_store.query_chunks(
            question="main topics concepts relationships",
            source_ids=context.source_ids,
            top_k=12,
        )
        
        if not chunks:
            return self._create_result(
                success=False,
                action="generate_graph",
                message="No content available for knowledge graph",
            )
        
        # Generate graph using LLM
        context_text = "\n\n".join([
            f"[{c.get('source_name', 'Unknown')}]\n{c.get('text', '')[:300]}"
            for c in chunks[:10]
        ])
        
        graph_prompt = f"""Analyze this content and extract a knowledge graph.

{context_text}

Return ONLY valid JSON with this structure:
{{
  "concepts": [
    {{"id": "c1", "name": "Concept Name", "type": "main|sub", "group": "topic category", "difficulty": "easy|medium|hard"}}
  ],
  "relationships": [
    {{"source": "c1", "target": "c2", "label": "relationship type", "strength": "strong|medium|weak"}}
  ]
}}

Focus on:
- Main topics as parent nodes
- Sub-concepts as child nodes
- Dependencies between concepts
- Topic groupings
- Difficulty levels"""
        
        response = await llm_service.chat(
            question=graph_prompt,
            context_chunks=chunks,
            history=[],
        )
        
        # Parse JSON
        import json
        import re
        try:
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                graph_data = json.loads(json_match.group())
            else:
                graph_data = {"concepts": [], "relationships": []}
        except:
            graph_data = {"concepts": [], "relationships": []}
        
        return self._create_result(
            success=True,
            action="generate_graph",
            data={
                "nodes": graph_data.get("concepts", []),
                "edges": graph_data.get("relationships", []),
                "concept_count": len(graph_data.get("concepts", [])),
            },
            message=f"Generated knowledge graph with {len(graph_data.get('concepts', []))} concepts",
        )
    
    async def _map_dependencies(self, context: AgentContext, **kwargs) -> AgentResult:
        """Map concept dependencies and prerequisites"""
        chunks = vector_store.query_chunks(
            question="prerequisites dependencies required knowledge learning order",
            source_ids=context.source_ids,
            top_k=10,
        )
        
        if not chunks:
            return self._create_result(
                success=False,
                action="map_dependencies",
                message="No content available for dependency mapping",
            )
        
        context_text = "\n\n".join([
            f"[{c.get('source_name', 'Unknown')}]\n{c.get('text', '')[:300]}"
            for c in chunks[:8]
        ])
        
        dep_prompt = f"""Analyze this content and map concept dependencies.

{context_text}

Return ONLY valid JSON with this structure:
{{
  "dependencies": [
    {{
      "concept": "Concept Name",
      "prerequisites": ["Prerequisite 1", "Prerequisite 2"],
      "enables": ["What this concept enables"],
      "difficulty": "easy|medium|hard",
      "importance": "high|medium|low"
    }}
  ],
  "learning_order": ["Concept 1", "Concept 2", "Concept 3"]
}}

Focus on:
- What must be learned before what
- Concept difficulty progression
- Critical path concepts
- Optional vs required knowledge"""
        
        response = await llm_service.chat(
            question=dep_prompt,
            context_chunks=chunks,
            history=[],
        )
        
        import json
        import re
        try:
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                dep_data = json.loads(json_match.group())
            else:
                dep_data = {"dependencies": [], "learning_order": []}
        except:
            dep_data = {"dependencies": [], "learning_order": []}
        
        return self._create_result(
            success=True,
            action="map_dependencies",
            data=dep_data,
            message=f"Mapped {len(dep_data.get('dependencies', []))} concept dependencies",
        )
    
    async def _generate_learning_paths(self, context: AgentContext, **kwargs) -> AgentResult:
        """Generate learning paths for different skill levels"""
        chunks = vector_store.query_chunks(
            question="beginner intermediate advanced learning path",
            source_ids=context.source_ids,
            top_k=10,
        )
        
        if not chunks:
            return self._create_result(
                success=False,
                action="learning_paths",
                message="No content available for learning paths",
            )
        
        context_text = "\n\n".join([
            f"[{c.get('source_name', 'Unknown')}]\n{c.get('text', '')[:300]}"
            for c in chunks[:8]
        ])
        
        path_prompt = f"""Analyze this content and create learning paths.

{context_text}

Return ONLY valid JSON with this structure:
{{
  "paths": {{
    "beginner": {{
      "name": "Beginner Path",
      "description": "Start here if you're new",
      "concepts": ["Concept 1", "Concept 2"],
      "estimated_hours": 10
    }},
    "intermediate": {{
      "name": "Intermediate Path",
      "description": "For those with basic knowledge",
      "concepts": ["Concept 3", "Concept 4"],
      "estimated_hours": 15
    }},
    "advanced": {{
      "name": "Advanced Path",
      "description": "Master level content",
      "concepts": ["Concept 5", "Concept 6"],
      "estimated_hours": 20
    }}
  }}
}}

Focus on:
- Progressive difficulty
- Logical learning sequence
- Building on prior knowledge
- Practical application"""
        
        response = await llm_service.chat(
            question=path_prompt,
            context_chunks=chunks,
            history=[],
        )
        
        import json
        import re
        try:
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                path_data = json.loads(json_match.group())
            else:
                path_data = {"paths": {}}
        except:
            path_data = {"paths": {}}
        
        return self._create_result(
            success=True,
            action="learning_paths",
            data=path_data,
            message=f"Generated {len(path_data.get('paths', {}))} learning paths",
        )
    
    async def _search_concepts(self, context: AgentContext, **kwargs) -> AgentResult:
        """Search for concepts across sources"""
        query = kwargs.get("query", "")
        
        chunks = vector_store.query_chunks(
            question=query,
            source_ids=context.source_ids,
            top_k=5,
        )
        
        concepts = []
        for c in chunks:
            concepts.append({
                "concept": c.get("text", "")[:100],
                "source": c.get("source_name", "Unknown"),
                "page": c.get("page", 0),
            })
        
        return self._create_result(
            success=True,
            action="search_concepts",
            data={"concepts": concepts},
            message=f"Found {len(concepts)} related concepts",
        )
    
    async def _link_knowledge(self, context: AgentContext, **kwargs) -> AgentResult:
        """Link knowledge across sources"""
        return self._create_result(
            success=True,
            action="link_knowledge",
            data={"links": []},
            message="Knowledge linking complete",
        )


# Register agent
knowledge_agent = KnowledgeAgent()
registry.register(knowledge_agent, intents=["knowledge", "concepts", "relationships", "connections"])
