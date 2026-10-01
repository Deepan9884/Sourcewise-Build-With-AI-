"""
RAG Chain — the core ML pipeline.
Ties together: vector retrieval → context assembly → LLM generation.
Token-aware: compresses context chunks and reports usage for billing.
"""
from app.services import vector_store, llm as llm_service
from app.services import token_counter as tc
from app.services.context_compressor import compress_chunks
from app.config import settings
from typing import AsyncIterator


async def _expand_query(question: str) -> list[str]:
    """
    Query expansion is DISABLED by default for token savings: each expansion
    previously cost an extra LLM call plus 3x retrieval fan-out.
    Returns just the original question unless QUERY_EXPANSION_ENABLED is set
    AND the deployer explicitly opts into LLM expansion (not implemented for
    cloud providers yet — local stub kept for future work).
    """
    return [question]


def _deduplicate_chunks(all_chunks: list[dict]) -> list[dict]:
    """Remove duplicate chunks by chunk_id, keeping the highest-scored version."""
    seen = {}
    for chunk in all_chunks:
        cid = chunk["chunk_id"]
        if cid not in seen or chunk["score"] > seen[cid]["score"]:
            seen[cid] = chunk
    return list(seen.values())


def _build_enriched_context(chunks: list[dict]) -> str:
    """
    Build a well-structured context string grouped by source.
    Helps the LLM understand which information comes from where.
    """
    if not chunks:
        return ""

    # Group chunks by source
    by_source = {}
    for chunk in chunks:
        sid = chunk["source_id"]
        if sid not in by_source:
            by_source[sid] = {
                "name": chunk["source_name"],
                "chunks": []
            }
        by_source[sid]["chunks"].append(chunk)

    parts = []
    source_idx = 1
    for sid, info in by_source.items():
        parts.append(f"=== SOURCE {source_idx}: {info['name']} ===")
        for chunk in info["chunks"][:5]:
            parts.append(f"[Page {chunk['page']}] {chunk['text']}")
        parts.append("")
        source_idx += 1

    return "\n".join(parts)


import re

def _is_greeting_or_chitchat(question: str) -> bool:
    """Detect if question is a greeting, polite check, or general intro rather than a doc search query."""
    q = question.strip().lower()
    q = re.sub(r"[!?.~]+$", "", q).strip()
    greeting_patterns = [
        r"^(hi|hello|hey|greetings|howdy|sup|hola|yo)$",
        r"^(hi|hello|hey|good morning|good afternoon|good evening)( there)?$",
        r"^(who are you|what can you do|what are your capabilities|can you help me|help me study|how are you)$",
        r"^(start|begin|let'?s study|ready)$",
    ]
    return any(re.match(pat, q, re.IGNORECASE) for pat in greeting_patterns)

GREETING_RESPONSE = (
    "Hello! \U0001f44b I'm your SourceWise study assistant.\n\n"
    "I'm ready to help you study your materials! You can:\n"
    "- **Ask questions** about your uploaded documents\n"
    "- **Generate practice quizzes** or **flashcards**\n"
    "- **Get concept explanations** or **summaries**\n"
    "- **Check your study plan and pending tasks**\n\n"
    "What would you like to work on today?"
)


async def answer(
    question: str,
    source_ids: list[str],
    history: list[dict] = None,
) -> tuple[str, list[dict]]:
    """
    Full RAG pass — returns (answer_text, citations).
    citations: [{id, chunk_id, source_id, source_name, text, page}, ...]
    """
    answer_text, _citations, _usage = await answer_with_usage(question, source_ids, history)
    return answer_text, _citations


async def answer_with_usage(
    question: str,
    source_ids: list[str],
    history: list[dict] = None,
) -> tuple[str, list[dict], dict]:
    """
    Full RAG pass — returns (answer_text, citations, usage).
    usage: {provider, model, prompt_tokens, completion_tokens, total_tokens,
            context_chunks, compression_applied, compression_ratio, ...}
    """
    # 0. Check for friendly greeting / chitchat
    if _is_greeting_or_chitchat(question):
        return (
            GREETING_RESPONSE,
            [],
            {"provider": settings.LLM_PROVIDER, "prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0, "context_chunks": 0},
        )

    # 1. Query expansion for better retrieval
    queries = await _expand_query(question)

    # 2. Retrieve relevant chunks from vector store for all query variants
    all_chunks = []
    for q in queries:
        chunks = vector_store.query_chunks(
            question=q,
            source_ids=source_ids,
            top_k=settings.TOP_K_CHUNKS,
        )
        all_chunks.extend(chunks)

    # 3. Deduplicate and take top results
    unique_chunks = _deduplicate_chunks(all_chunks)
    unique_chunks.sort(key=lambda x: x["score"], reverse=True)
    top_chunks = unique_chunks[:settings.RERANK_TOP_K]

    if not top_chunks:
        context_chunks = []
        comp_stats = {"compression_applied": False, "compression_ratio": 1.0, "compressed_tokens": 0}
    else:
        # 5. Compress context to reduce tokens sent to Gemini/Grok
        compressed, comp_stats = compress_chunks(
            top_chunks,
            max_chunks=settings.MAX_CONTEXT_CHUNKS,
            max_chunk_tokens=settings.MAX_CHUNK_TOKENS,
            min_score=settings.MIN_RELEVANCE_THRESHOLD,
        )
        context_chunks = compressed or top_chunks[:settings.MAX_CONTEXT_CHUNKS]

    answer_text, usage = await llm_service.chat_with_usage(
        question=question,
        context_chunks=context_chunks,
        history=history or [],
    )
    usage["context_chunks"] = len(context_chunks)
    usage["compression_applied"] = comp_stats["compression_applied"]
    usage["compression_ratio"] = comp_stats["compression_ratio"]
    usage["context_tokens_estimate"] = comp_stats["compressed_tokens"]

    # 6. Build citations list
    citations = [
        {
            "id": i + 1,
            "chunk_id": c["chunk_id"],
            "source_id": c["source_id"],
            "source_name": c["source_name"],
            "text": c["text"][:280] + ("..." if len(c["text"]) > 280 else ""),
            "page": c["page"],
        }
        for i, c in enumerate(context_chunks[:5])
    ]

    return answer_text, citations, usage


async def stream_answer(
    question: str,
    source_ids: list[str],
    history: list[dict] = None,
) -> AsyncIterator[dict]:
    """
    Streaming RAG pass — yields SSE-style event dicts.
    Events: {"type": "citations", "data": [...]}
             {"type": "token", "data": "..."}
             {"type": "usage", "data": {...}}
             {"type": "done"}
             {"type": "error", "data": "..."}
    """
    async for event in stream_answer_with_usage(question, source_ids, history):
        yield event


async def stream_answer_with_usage(
    question: str,
    source_ids: list[str],
    history: list[dict] = None,
) -> AsyncIterator[dict]:
    """Streaming RAG pass with usage event before done."""
    # 0. Check for friendly greeting / chitchat
    if _is_greeting_or_chitchat(question):
        yield {"type": "citations", "data": []}
        yield {"type": "token", "data": GREETING_RESPONSE}
        yield {
            "type": "usage",
            "data": {"provider": settings.LLM_PROVIDER, "prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0, "context_chunks": 0},
        }
        yield {"type": "done"}
        return

    # 1. Query expansion
    queries = await _expand_query(question)

    # 2. Retrieve and deduplicate chunks
    all_chunks = []
    for q in queries:
        chunks = vector_store.query_chunks(
            question=q,
            source_ids=source_ids,
            top_k=settings.TOP_K_CHUNKS,
        )
        all_chunks.extend(chunks)

    unique_chunks = _deduplicate_chunks(all_chunks)
    unique_chunks.sort(key=lambda x: x["score"], reverse=True)
    top_chunks = unique_chunks[:settings.RERANK_TOP_K]

    if not top_chunks:
        yield {"type": "citations", "data": []}
        try:
            async for event in llm_service.stream_chat_with_usage(
                question=question,
                context_chunks=[],
                history=history or [],
            ):
                yield event
        except Exception as e:
            yield {"type": "error", "data": str(e)}
            return
        yield {"type": "done"}
        return

    # 4. Compress context
    compressed, comp_stats = compress_chunks(
        top_chunks,
        max_chunks=settings.MAX_CONTEXT_CHUNKS,
        max_chunk_tokens=settings.MAX_CHUNK_TOKENS,
        min_score=settings.MIN_RELEVANCE_THRESHOLD,
    )
    context_chunks = compressed or top_chunks[:settings.MAX_CONTEXT_CHUNKS]

    # 5. Emit citations first
    citations = [
        {
            "id": i + 1,
            "chunk_id": c["chunk_id"],
            "source_id": c["source_id"],
            "source_name": c["source_name"],
            "text": c["text"][:280] + ("..." if len(c["text"]) > 280 else ""),
            "page": c["page"],
        }
        for i, c in enumerate(context_chunks[:5])
    ]
    yield {"type": "citations", "data": citations}

    # 6. Stream tokens from provider (token-budgeted)
    try:
        async for event in llm_service.stream_chat_with_usage(
            question=question,
            context_chunks=context_chunks,
            history=history or [],
        ):
            if event["type"] == "usage":
                event["data"]["context_chunks"] = len(context_chunks)
                event["data"]["compression_applied"] = comp_stats["compression_applied"]
                event["data"]["compression_ratio"] = comp_stats["compression_ratio"]
                event["data"]["context_tokens_estimate"] = comp_stats["compressed_tokens"]
            yield event
    except Exception as e:
        yield {"type": "error", "data": str(e)}
        return

    yield {"type": "done"}
