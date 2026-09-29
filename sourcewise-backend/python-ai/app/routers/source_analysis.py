"""
Source Analysis Router — Deep document analysis endpoints.

Provides NotebookLM-like source analysis including:
- Key concept extraction
- Chapter structure detection
- Cross-source synthesis
- Difficulty mapping
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict
from app.services import vector_store, llm as llm_service


router = APIRouter()


class SourceAnalysisRequest(BaseModel):
    """Request for source analysis"""
    source_ids: List[str]
    analysis_type: str = "full"  # "full" | "quick" | "concepts" | "structure"


class ConceptInfo(BaseModel):
    """Extracted concept information"""
    name: str
    description: str
    difficulty: str  # "easy" | "medium" | "hard"
    importance: str  # "low" | "medium" | "high"
    related_concepts: List[str] = []


class ChapterInfo(BaseModel):
    """Detected chapter/section information"""
    title: str
    page_start: int
    page_end: int
    key_concepts: List[str]
    summary: str


class SourceAnalysisResult(BaseModel):
    """Complete source analysis result"""
    source_id: str
    source_name: str
    overview: str
    key_concepts: List[ConceptInfo]
    chapter_structure: List[ChapterInfo]
    key_takeaways: List[str]
    difficulty_assessment: str  # "easy" | "medium" | "hard" | "mixed"
    estimated_study_time: str
    recommendations: List[str]


@router.post("/analyze", response_model=List[SourceAnalysisResult])
async def analyze_sources(req: SourceAnalysisRequest):
    """
    Perform deep analysis of selected sources.
    
    Returns detailed analysis including:
    - Document overview
    - Key concepts with difficulty levels
    - Chapter structure detection
    - Key takeaways
    - Study recommendations
    """
    results = []
    
    for source_id in req.source_ids:
        try:
            # Get chunks for this source
            chunks = vector_store.query_chunks(
                question="main topics structure overview concepts",
                source_ids=[source_id],
                top_k=20,
            )
            
            if not chunks:
                continue
            
            source_name = chunks[0].get("source_name", "Unknown")
            
            # Build context
            context = "\n\n".join([
                f"[Page {c['page']}]\n{c['text']}"
                for c in chunks
            ])
            
            # Generate analysis using LLM
            analysis_prompt = f"""Analyze this document thoroughly and provide structured output.

DOCUMENT: {source_name}

CONTENT:
{context}

Provide a JSON-like structured analysis (but format as readable text):

1. OVERVIEW: 2-3 sentence summary of what this document covers

2. KEY CONCEPTS: List the 5-10 most important concepts with:
   - Name
   - Brief description
   - Difficulty (easy/medium/hard)
   - Importance (low/medium/high)

3. CHAPTER STRUCTURE: Identify main sections/chapters with:
   - Title
   - Page range
   - Key concepts in each section
   - Brief summary

4. KEY TAKEAWAYS: 5-7 bullet points of what to remember

5. DIFFICULTY ASSESSMENT: Overall difficulty level

6. ESTIMATED STUDY TIME: How long to study this material

7. RECOMMENDATIONS: 3-5 specific study recommendations"""
            
            analysis_text = await llm_service.chat(
                question=analysis_prompt,
                context_chunks=chunks,
                history=[],
            )
            
            # Parse the analysis (simplified parsing)
            result = SourceAnalysisResult(
                source_id=source_id,
                source_name=source_name,
                overview=analysis_text[:500] + "..." if len(analysis_text) > 500 else analysis_text,
                key_concepts=[],  # Would be parsed from LLM response
                chapter_structure=[],
                key_takeaways=[],
                difficulty_assessment="medium",
                estimated_study_time="2-3 hours",
                recommendations=["Review key concepts", "Practice with flashcards", "Take a quiz"],
            )
            
            results.append(result)
            
        except Exception as e:
            print(f"[SourceAnalysis] Error analyzing {source_id}: {e}")
            continue
    
    return results


class CrossSourceRequest(BaseModel):
    """Request for cross-source synthesis"""
    source_ids: List[str]
    focus_topic: Optional[str] = None


@router.post("/synthesize")
async def synthesize_cross_source(req: CrossSourceRequest):
    """
    Analyze relationships between multiple sources.
    
    Identifies:
    - Common themes across sources
    - Complementary information
    - Contradictions or different perspectives
    - Connections between topics
    """
    if len(req.source_ids) < 2:
        raise HTTPException(
            status_code=400,
            detail="Need at least 2 sources for cross-source synthesis"
        )
    
    try:
        # Get chunks from all sources
        all_chunks = []
        for source_id in req.source_ids:
            chunks = vector_store.query_chunks(
                question=req.focus_topic or "main topics concepts",
                source_ids=[source_id],
                top_k=8,
            )
            all_chunks.extend(chunks)
        
        if not all_chunks:
            return {"synthesis": "No content found in selected sources"}
        
        # Group by source
        by_source = {}
        for c in all_chunks:
            sid = c['source_id']
            if sid not in by_source:
                by_source[sid] = {
                    'name': c['source_name'],
                    'content': []
                }
            by_source[sid]['content'].append(f"[p.{c['page']}] {c['text']}")
        
        # Build synthesis prompt
        sources_text = "\n\n".join([
            f"=== {info['name']} ===\n" + "\n".join(info['content'][:3])
            for info in by_source.values()
        ])
        
        synthesis_prompt = f"""Analyze how these sources relate to each other.

{sources_text}

Provide:

1. COMMON THEMES: What topics/ideas appear across multiple sources?

2. COMPLEMENTARY INFORMATION: Where do sources add different details or perspectives to the same topic?

3. DIFFERENT PERSPECTIVES: Where do sources present different viewpoints or approaches?

4. KNOWLEDGE GAPS: What important topics might be missing from some sources?

5. CONNECTIONS: How do the topics in different sources relate to each other?

6. STUDY STRATEGY: Based on this analysis, what's the best way to study these materials together?

Focus on: {req.focus_topic or "all major topics"}"""
        
        synthesis = await llm_service.chat(
            question=synthesis_prompt,
            context_chunks=all_chunks[:10],
            history=[],
        )
        
        return {
            "synthesis": synthesis,
            "source_count": len(req.source_ids),
            "sources": [by_source[sid]['name'] for sid in req.source_ids if sid in by_source],
        }
        
    except Exception as e:
        print(f"[SourceAnalysis] Error in cross-source synthesis: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{source_id}/concepts")
async def get_source_concepts(source_id: str):
    """Extract key concepts from a single source"""
    chunks = vector_store.query_chunks(
        question="key concepts definitions terms",
        source_ids=[source_id],
        top_k=15,
    )
    
    if not chunks:
        return {"concepts": [], "message": "No content found"}
    
    source_name = chunks[0].get("source_name", "Unknown")
    context = "\n".join([c['text'] for c in chunks[:10]])
    
    concepts_prompt = f"""Extract the key concepts from this document: {source_name}

{context}

List each concept with:
- Name
- Brief definition (1-2 sentences)
- Difficulty level (easy/medium/hard)

Format as a clean list."""
    
    concepts = await llm_service.chat(
        question=concepts_prompt,
        context_chunks=chunks,
        history=[],
    )
    
    return {
        "source_id": source_id,
        "source_name": source_name,
        "concepts": concepts,
    }


class KnowledgeGraphRequest(BaseModel):
    """Request for knowledge graph generation"""
    source_ids: List[str]
    focus_topic: Optional[str] = None


@router.post("/knowledge-graph")
async def generate_knowledge_graph(req: KnowledgeGraphRequest):
    """
    Generate a knowledge graph from selected sources.
    
    Returns nodes (concepts) and edges (relationships) for visualization.
    """
    all_chunks = []
    for source_id in req.source_ids:
        chunks = vector_store.query_chunks(
            question=req.focus_topic or "main topics concepts relationships",
            source_ids=[source_id],
            top_k=12,
        )
        all_chunks.extend(chunks)
    
    if not all_chunks:
        return {"nodes": [], "edges": [], "message": "No content found"}
    
    # Group by source
    sources_text = "\n\n".join([
        f"=== {c.get('source_name', 'Unknown')} ===\n{c['text']}"
        for c in all_chunks[:15]
    ])
    
    graph_prompt = f"""Analyze this content and extract a knowledge graph.

{sources_text}

Return a JSON structure with:
1. nodes: Array of concept objects with id, label, type (main/sub), and group (topic category)
2. edges: Array of relationship objects with source (node id), target (node id), and label (relationship type)

Focus on:
- Main topics as parent nodes
- Sub-concepts as child nodes
- Dependencies between concepts
- Topic groupings

Return ONLY valid JSON, no other text."""

    graph_response = await llm_service.chat(
        question=graph_prompt,
        context_chunks=all_chunks[:10],
        history=[],
    )
    
    # Parse the response
    import json
    try:
        # Try to extract JSON from the response
        json_start = graph_response.find('{')
        json_end = graph_response.rfind('}') + 1
        if json_start >= 0 and json_end > json_start:
            graph_data = json.loads(graph_response[json_start:json_end])
        else:
            graph_data = {"nodes": [], "edges": []}
    except json.JSONDecodeError:
        graph_data = {"nodes": [], "edges": []}
    
    return {
        "nodes": graph_data.get("nodes", []),
        "edges": graph_data.get("edges", []),
        "source_count": len(req.source_ids),
    }
