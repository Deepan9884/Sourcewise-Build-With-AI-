"""
Tokens Router — estimation + budget introspection (no LLM calls).
POST /tokens/estimate → {prompt_tokens, fits, truncated, context_window}
GET  /tokens/budgets  → current token budget settings
"""
from fastapi import APIRouter
from pydantic import BaseModel
from app.config import settings
from app.services import token_counter as tc

router = APIRouter()


class EstimateRequest(BaseModel):
    messages: list[dict] = []
    model: str | None = None


@router.post("/estimate")
async def estimate(req: EstimateRequest):
    model = req.model or (settings.GEMINI_MODEL if settings.LLM_PROVIDER == "gemini" else settings.GROK_MODEL)
    prompt_tokens = tc.count_messages(req.messages)
    window = tc.context_window_for(model)
    fits = prompt_tokens + settings.RESERVE_COMPLETION_TOKENS <= window
    return {
        "model": model,
        "provider": settings.LLM_PROVIDER,
        "prompt_tokens": prompt_tokens,
        "context_window": window,
        "reserve_for_completion": settings.RESERVE_COMPLETION_TOKENS,
        "fits": fits,
    }


@router.get("/budgets")
async def budgets():
    return {
        "provider": settings.LLM_PROVIDER,
        "model": settings.GEMINI_MODEL if settings.LLM_PROVIDER == "gemini" else settings.GROK_MODEL,
        "max_context_chunks": settings.MAX_CONTEXT_CHUNKS,
        "max_chunk_tokens": settings.MAX_CHUNK_TOKENS,
        "max_history_turns": settings.MAX_HISTORY_TURNS,
        "reserve_completion_tokens": settings.RESERVE_COMPLETION_TOKENS,
        "max_output_tokens": settings.MAX_OUTPUT_TOKENS,
        "top_k_chunks": settings.TOP_K_CHUNKS,
        "rerank_top_k": settings.RERANK_TOP_K,
    }
