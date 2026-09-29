"""
Mood-Tutor Router — mood-adaptive explanations with RAG citations + usage.
POST /mood-tutor/explain        → blocking response
POST /mood-tutor/explain/stream → SSE streaming
"""
import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional
from app.models.schemas import ChatMessage, Citation
from app.agents.mood_aware_tutor import mood_aware_tutor_agent, VALID_MOODS
from app.agents.base import AgentContext
from app.services import rag_chain, llm as llm_service

router = APIRouter()


class MoodTutorRequest(BaseModel):
    question: str
    source_ids: list[str] = Field(default_factory=list)
    user_id: str = "anonymous"
    mood: str = "neutral"
    subject: Optional[str] = None
    conversation_history: list[ChatMessage] = Field(default_factory=list)


class MoodTutorResponse(BaseModel):
    answer: str
    mood: str
    strategy: dict
    citations: list[Citation] = Field(default_factory=list)
    usage: Optional[dict] = None


def _strategy(mood: str) -> dict:
    from app.agents.mood_aware_tutor import MOOD_STRATEGIES
    return MOOD_STRATEGIES.get((mood or "neutral").lower(), MOOD_STRATEGIES["neutral"])


@router.post("/explain", response_model=MoodTutorResponse)
async def explain(req: MoodTutorRequest):
    mood = (req.mood or "neutral").lower()
    if mood not in VALID_MOODS:
        raise HTTPException(status_code=400, detail=f"Invalid mood. Use one of: {', '.join(VALID_MOODS)}")
    ctx = AgentContext(user_id=req.user_id, source_ids=req.source_ids,
                       conversation_history=[m.model_dump() for m in req.conversation_history],
                       metadata={"mood": mood, "subject": req.subject})
    result = await mood_aware_tutor_agent.execute(
        ctx, question=req.question, mood=mood, subject=req.subject)
    if not result.success:
        raise HTTPException(status_code=500, detail="; ".join(result.errors) or "Tutor failed")
    # Attach RAG citations (best effort)
    citations = []
    try:
        _, raw, usage = await rag_chain.answer_with_usage(
            question=req.question, source_ids=req.source_ids,
            history=[m.model_dump() for m in req.conversation_history])
        citations = [Citation(**c) for c in raw]
    except Exception:
        usage = {"provider": "unknown", "total_tokens": 0}
    return MoodTutorResponse(answer=result.data["answer"], mood=mood,
                             strategy=result.data["strategy"], citations=citations, usage=usage)


@router.post("/explain/stream")
async def explain_stream(req: MoodTutorRequest):
    mood = (req.mood or "neutral").lower()
    if mood not in VALID_MOODS:
        raise HTTPException(status_code=400, detail=f"Invalid mood. Use one of: {', '.join(VALID_MOODS)}")
    strategy = _strategy(mood)

    async def event_generator():
        try:
            yield f"data: {json.dumps({'type': 'strategy', 'data': strategy})}\n\n"
            async for event in rag_chain.stream_answer(
                    question=f"[Mood: {mood} | style: {strategy['style']}] {req.question}",
                    source_ids=req.source_ids,
                    history=[m.model_dump() for m in req.conversation_history]):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'data': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
