"""
Chat Router — RAG-powered chat with streaming support.

POST /chat         → blocking response (full answer at once)
POST /chat/stream  → SSE streaming response (token by token)
GET  /chat/health  → LLM provider health check
"""
import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.models.schemas import ChatRequest, ChatResponse, Citation
from app.services import rag_chain, llm as llm_service
from app.config import settings

router = APIRouter()


@router.post("", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """Blocking RAG chat — returns complete answer with citations + usage."""
    if not req.source_ids:
        raise HTTPException(
            status_code=400,
            detail="Please select at least one source to chat with.",
        )

    try:
        answer_text, raw_citations, usage = await rag_chain.answer_with_usage(
            question=req.question,
            source_ids=req.source_ids,
            history=[m.model_dump() for m in req.conversation_history],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    citations = [Citation(**c) for c in raw_citations]

    return ChatResponse(
        answer=answer_text,
        citations=citations,
        model=usage.get("model") or (settings.GEMINI_MODEL if settings.LLM_PROVIDER == "gemini" else settings.GROK_MODEL),
        usage=usage,
    )


@router.post("/stream")
async def stream_chat(req: ChatRequest):
    """
    Streaming RAG chat — returns SSE stream.
    Events:
      data: {"type": "citations", "data": [...]}
      data: {"type": "token",     "data": "word"}
      data: {"type": "done"}
      data: {"type": "error",     "data": "..."}
    """
    if not req.source_ids:
        raise HTTPException(
            status_code=400,
            detail="Please select at least one source to chat with.",
        )

    async def event_generator():
        try:
            async for event in rag_chain.stream_answer(
                question=req.question,
                source_ids=req.source_ids,
                history=[m.model_dump() for m in req.conversation_history],
            ):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'data': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/health")
async def health():
    """Check LLM provider status and model availability."""
    status = await llm_service.health_check()
    return status
