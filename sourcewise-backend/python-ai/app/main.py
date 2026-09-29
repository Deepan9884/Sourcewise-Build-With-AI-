"""
FastAPI application entry point.
Wires together all routers with CORS and startup events.
"""
import os
import sys

_venv_site = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".venv", "Lib", "site-packages"))
if os.path.isdir(_venv_site) and _venv_site not in sys.path:
    sys.path.insert(0, _venv_site)

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import time
from app.config import settings
from app.routers import ingest, chat, tutor, agent, source_analysis, orchestrator, tokens, mood_tutor, metrics, puzzles
from app.utils.internal_auth import verify_internal_key
from app.utils.logging import get_logger

logger = get_logger("sourcewise.main")

# Import all agents to register them
from app.agents import registry
from app.agents.source_intelligence import source_intelligence_agent
from app.agents.knowledge import knowledge_agent
from app.agents.tutor import tutor_agent
from app.agents.assessment import assessment_agent
from app.agents.flashcard import flashcard_agent
from app.agents.learning_profile import learning_profile_agent
from app.agents.study_planner import study_planner_agent
from app.agents.revision import revision_agent
from app.agents.analytics import analytics_agent
from app.agents.recommendation import recommendation_agent
from app.agents.mood_aware_tutor import mood_aware_tutor_agent
from app.agents.puzzle_agent import puzzle_agent


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm up the embedding model on startup so first request isn't slow
    logger.info("startup preload embedding model")
    from app.services.embedder import get_model
    get_model()
    logger.info("startup ready", extra={"endpoint": "lifespan"})
    yield
    logger.info("shutdown")


app = FastAPI(
    title="SourceWise AI",
    description="Local RAG-powered study assistant. No external APIs.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.NODE_API_ORIGIN,
        settings.FRONTEND_ORIGIN,
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:4000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest.router, prefix="/ingest", tags=["Ingest"], dependencies=[Depends(verify_internal_key)])
app.include_router(chat.router,   prefix="/chat",   tags=["Chat"],   dependencies=[Depends(verify_internal_key)])
app.include_router(tutor.router,  prefix="/tutor",  tags=["Tutor"],  dependencies=[Depends(verify_internal_key)])
app.include_router(agent.router, prefix="/agent", tags=["AI Agent"], dependencies=[Depends(verify_internal_key)])
app.include_router(source_analysis.router, prefix="/sources", tags=["Source Analysis"], dependencies=[Depends(verify_internal_key)])
app.include_router(orchestrator.router, prefix="/orchestrator", tags=["Agent Orchestrator"], dependencies=[Depends(verify_internal_key)])
app.include_router(tokens.router, prefix="/tokens", tags=["Tokens"], dependencies=[Depends(verify_internal_key)])
app.include_router(mood_tutor.router, prefix="/mood-tutor", tags=["Mood-Aware Tutor"], dependencies=[Depends(verify_internal_key)])
app.include_router(puzzles.router,    prefix="/puzzles",    tags=["Puzzles"],          dependencies=[Depends(verify_internal_key)])
app.include_router(metrics.router, prefix="/metrics", tags=["Metrics"])


@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    try:
        from app.routers.metrics import record_request
        dur_ms = (time.time() - start) * 1000
        record_request(f"{request.method} {request.url.path}", dur_ms, response.status_code)
    except Exception:
        pass
    return response


@app.get("/", tags=["Health"])
def root():
    model = settings.GEMINI_MODEL if settings.LLM_PROVIDER == "gemini" else settings.GROK_MODEL
    return {
        "service": "SourceWise AI",
        "status": "running",
        "provider": settings.LLM_PROVIDER,
        "model": model,
        "vector_db": "ChromaDB (local)",
        "embeddings": settings.EMBEDDING_MODEL,
        "token_budgets": {
            "max_context_chunks": settings.MAX_CONTEXT_CHUNKS,
            "max_chunk_tokens": settings.MAX_CHUNK_TOKENS,
            "max_history_turns": settings.MAX_HISTORY_TURNS,
            "max_output_tokens": settings.MAX_OUTPUT_TOKENS,
        },
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
