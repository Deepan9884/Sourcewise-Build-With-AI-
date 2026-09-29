from pydantic import BaseModel, Field
from typing import Optional


# ── Ingest ───────────────────────────────────────────────────────────────────

class IngestRequest(BaseModel):
    source_id: str
    user_id: str
    source_name: str


class IngestResponse(BaseModel):
    source_id: str
    source_name: str
    chunks_indexed: int
    status: str = "ready"


# ── Chat ─────────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str           # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    question: str
    source_ids: list[str] = Field(default_factory=list)
    user_id: str = "anonymous"
    conversation_history: list[ChatMessage] = Field(default_factory=list)


class Citation(BaseModel):
    id: int
    chunk_id: str
    source_id: str
    source_name: str
    text: str
    page: Optional[int] = None


class ChatResponse(BaseModel):
    answer: str
    citations: list[Citation] = Field(default_factory=list)
    model: str
    usage: Optional[dict] = None


# ── Source ────────────────────────────────────────────────────────────────────

class SourceInfo(BaseModel):
    source_id: str
    source_name: str
    chunk_count: int
