"""
Tutor Router — Advanced AI tutoring with multi-strategy explanations.

POST /tutor/explain        → streaming SSE response with tutoring content
POST /tutor/practice       → generate practice questions
POST /tutor/evaluate       → evaluate practice answers
POST /concepts/extract     → extract concepts from text
POST /concepts/graph       → build concept graph
"""
import json
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from app.services.tutor_chain import TutorChain, TutoringMode
from app.services.practice_generator import PracticeGenerator
from app.services import concept_extractor
from app.services import knowledge_graph_builder
from app.config import settings

router = APIRouter()

# Initialize services
tutor_chain = TutorChain()
practice_generator = PracticeGenerator()


# ── Request/Response Models ──────────────────────────────────────────────────

class TutorExplainRequest(BaseModel):
    """Request model for /tutor/explain endpoint"""
    question: str = Field(..., description="User's question to be explained")
    source_ids: List[str] = Field(..., description="List of source document IDs to search")
    user_profile: Optional[Dict] = Field(None, description="User's learning profile with mastery levels and preferences")
    mode: str = Field(default="direct", description="Tutoring mode: direct, socratic, exploratory, exam_prep")
    history: Optional[List[Dict]] = Field(default=None, description="Conversation history for context")
    session_id: Optional[str] = Field(None, description="Session ID for context management")


class PracticeRequest(BaseModel):
    """Request model for /tutor/practice endpoint"""
    concept: str = Field(..., description="Concept to generate practice question for")
    source_ids: List[str] = Field(..., description="List of source document IDs to base questions on")
    difficulty: str = Field(default="medium", description="Difficulty level: easy, medium, hard")
    type: str = Field(default="mcq", description="Question type: mcq, short_answer, application")


class EvaluateRequest(BaseModel):
    """Request model for /tutor/evaluate endpoint"""
    question_id: str = Field(..., description="ID of the practice question")
    question_text: str = Field(..., description="The original question text")
    user_answer: str = Field(..., description="User's answer to evaluate")
    correct_answer: str = Field(..., description="The correct answer")
    concept: str = Field(..., description="The concept being tested")
    source_context: Optional[str] = Field(None, description="Relevant source material context")


class ConceptExtractRequest(BaseModel):
    """Request model for /concepts/extract endpoint"""
    source_id: str = Field(..., description="Source document ID")
    text: str = Field(..., description="Text to extract concepts from")


class ConceptGraphRequest(BaseModel):
    """Request model for /concepts/graph endpoint"""
    source_ids: List[str] = Field(..., description="List of source document IDs to build graph from")


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/explain")
async def explain(req: TutorExplainRequest):
    """
    Streaming tutoring response with multi-strategy explanations.
    
    Returns SSE stream with events:
      data: {"type": "citations", "data": [...]}
      data: {"type": "synthesis", "data": {...}}
      data: {"type": "token", "data": "explanation text"}
      data: {"type": "alternatives", "data": [...]}
      data: {"type": "related", "data": [...]}
      data: {"type": "practice", "data": [...]}
      data: {"type": "done"}
      data: {"type": "error", "data": "error message"}
    
    Validates:
    - Requirements 1.1, 1.2, 1.3: Multi-strategy explanations
    - Requirement 13.1: Context-aware conversation management
    """
    # Validate source_ids
    if not req.source_ids:
        raise HTTPException(
            status_code=400,
            detail="Please select at least one source to chat with.",
        )
    
    # Validate and convert tutoring mode
    try:
        mode = TutoringMode(req.mode.lower())
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid tutoring mode: {req.mode}. Must be one of: direct, socratic, exploratory, exam_prep",
        )
    
    async def event_generator():
        """Generate SSE events for streaming response"""
        try:
            async for event in tutor_chain.stream_explain(
                question=req.question,
                source_ids=req.source_ids,
                user_profile=req.user_profile,
                mode=mode,
                history=req.history or [],
                session_id=req.session_id,
            ):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as e:
            # Log error for debugging
            print(f"[TutorRouter] Error in explain endpoint: {e}")
            yield f"data: {json.dumps({'type': 'error', 'data': str(e)})}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/practice")
async def generate_practice(req: PracticeRequest):
    """
    Generate practice questions based on concept and source material.
    
    Returns structured question with options, metadata, and citations.
    
    Validates:
    - Requirements 5.1, 5.2: Practice question generation
    """
    if not req.source_ids:
        raise HTTPException(
            status_code=400,
            detail="Please select at least one source for practice generation.",
        )
    
    try:
        # Generate question based on type
        if req.type == "mcq":
            result = await practice_generator.generate_mcq(
                concept=req.concept,
                source_ids=req.source_ids,
                difficulty=req.difficulty,
            )
        elif req.type == "short_answer":
            result = await practice_generator.generate_short_answer(
                concept=req.concept,
                source_ids=req.source_ids,
                difficulty=req.difficulty,
            )
        elif req.type == "application":
            result = await practice_generator.generate_application(
                concept=req.concept,
                source_ids=req.source_ids,
                difficulty=req.difficulty,
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid question type: {req.type}. Must be one of: mcq, short_answer, application",
            )
        
        return result
    
    except Exception as e:
        print(f"[TutorRouter] Error in practice endpoint: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate practice question: {str(e)}",
        )


@router.post("/evaluate")
async def evaluate_answer(req: EvaluateRequest):
    """
    Evaluate user's answer to a practice question with detailed feedback.
    
    Returns evaluation result with explanations and suggestions.
    
    Validates:
    - Requirements 5.3, 5.4: Answer evaluation and feedback
    """
    try:
        result = await practice_generator.evaluate_answer(
            question_text=req.question_text,
            user_answer=req.user_answer,
            correct_answer=req.correct_answer,
            concept=req.concept,
            source_context=req.source_context,
        )
        
        return result
    
    except Exception as e:
        print(f"[TutorRouter] Error in evaluate endpoint: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to evaluate answer: {str(e)}",
        )


@router.post("/concepts/extract")
async def extract_concepts_endpoint(req: ConceptExtractRequest):
    """
    Extract concepts from source text.
    
    Returns list of identified concepts with metadata.
    
    Validates:
    - Requirements 4.2, 6.4: Concept extraction
    """
    if not req.text or len(req.text.strip()) < 10:
        raise HTTPException(
            status_code=400,
            detail="Text must be at least 10 characters long.",
        )
    
    try:
        concepts = await concept_extractor.extract_concepts(
            text=req.text,
            source_id=req.source_id,
        )
        
        return {
            "source_id": req.source_id,
            "concepts": [c.to_dict() for c in concepts],
            "count": len(concepts),
        }
    
    except Exception as e:
        print(f"[TutorRouter] Error in extract concepts endpoint: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to extract concepts: {str(e)}",
        )


@router.post("/concepts/graph")
async def build_concept_graph_endpoint(req: ConceptGraphRequest):
    """
    Build concept graph from multiple sources.
    
    Returns graph structure with nodes and edges.
    
    Validates:
    - Requirements 4.2, 4.4, 6.4: Knowledge graph construction
    """
    if not req.source_ids:
        raise HTTPException(
            status_code=400,
            detail="Please select at least one source to build graph from.",
        )
    
    try:
        graph = await knowledge_graph_builder.build_graph(
            source_ids=req.source_ids,
        )
        
        graph_dict = graph.to_dict()
        
        return {
            "source_ids": req.source_ids,
            "graph": graph_dict,
            "node_count": len(graph_dict.get("concepts", [])),
            "edge_count": len(graph_dict.get("edges", [])),
        }
    
    except Exception as e:
        print(f"[TutorRouter] Error in build graph endpoint: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to build concept graph: {str(e)}",
        )


# ── Request/Response Models for Synthesis ─────────────────────────────────────

class SynthesisRequest(BaseModel):
    """Request model for /tutor/synthesize endpoint"""
    question: str = Field(..., description="Question to synthesize answer for")
    source_ids: List[str] = Field(..., description="List of source document IDs")


class TeachingMaterialRequest(BaseModel):
    """Request model for /tutor/teaching-material endpoint"""
    topic: str = Field(..., description="Topic to generate teaching material for")
    source_ids: List[str] = Field(..., description="Source document IDs")


class SourceMapRequest(BaseModel):
    """Request model for /tutor/source-map endpoint"""
    source_ids: List[str] = Field(..., description="Source document IDs")


# ── Synthesis Endpoints ──────────────────────────────────────────────────────

@router.post("/synthesis")
async def synthesize_sources(req: SynthesisRequest):
    """
    NotebookLM-style cross-source synthesis.

    Generates multi-level explanations (quick, standard, deep dive)
    with source comparison and connection-making.
    """
    from app.services.source_synthesizer import source_synthesizer
    from app.services.vector_store import query_chunks

    if not req.source_ids:
        raise HTTPException(status_code=400, detail="Please select at least one source.")

    try:
        # Get chunks from all sources
        chunks_by_source = {}
        for source_id in req.source_ids:
            chunks = query_chunks(
                question=req.question,
                source_ids=[source_id],
                top_k=5,
            )
            if chunks:
                chunks_by_source[source_id] = chunks

        if not chunks_by_source:
            raise HTTPException(status_code=404, detail="No relevant content found in sources.")

        # Synthesize
        result = await source_synthesizer.synthesize_multi_source(
            question=req.question,
            chunks_by_source=chunks_by_source,
        )

        return result.to_dict()

    except HTTPException:
        raise
    except Exception as e:
        print(f"[TutorRouter] Error in synthesis endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Synthesis failed: {str(e)}")


@router.post("/teaching-material")
async def generate_teaching_material(req: TeachingMaterialRequest):
    """Generate comprehensive teaching material for a topic."""
    from app.services.source_synthesizer import source_synthesizer
    from app.services.vector_store import query_chunks

    if not req.source_ids:
        raise HTTPException(status_code=400, detail="Please select at least one source.")

    try:
        # Get relevant chunks
        all_chunks = []
        for source_id in req.source_ids:
            chunks = query_chunks(
                question=req.topic,
                source_ids=[source_id],
                top_k=5,
            )
            all_chunks.extend(chunks)

        if not all_chunks:
            raise HTTPException(status_code=404, detail="No relevant content found.")

        result = await source_synthesizer.generate_teaching_material(
            topic=req.topic,
            chunks=all_chunks,
        )

        return result

    except HTTPException:
        raise
    except Exception as e:
        print(f"[TutorRouter] Error in teaching material endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Failed: {str(e)}")


@router.post("/source-map")
async def generate_source_map(req: SourceMapRequest):
    """Generate a map of how topics connect across sources."""
    from app.services.source_synthesizer import source_synthesizer
    from app.services.vector_store import query_chunks

    if not req.source_ids:
        raise HTTPException(status_code=400, detail="Please select at least one source.")

    try:
        # Get chunks from all sources
        chunks_by_source = {}
        for source_id in req.source_ids:
            chunks = query_chunks(
                question="main topics and concepts",
                source_ids=[source_id],
                top_k=10,
            )
            if chunks:
                chunks_by_source[source_id] = chunks

        result = await source_synthesizer.generate_source_map(chunks_by_source)
        return result

    except Exception as e:
        print(f"[TutorRouter] Error in source map endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Failed: {str(e)}")
