"""
Context Compressor — reduces tokens sent to Gemini/Grok.
Strategy (in order):
  1. Drop chunks below relevance threshold
  2. Keep only top-K by score
  3. Truncate over-long chunks to a per-chunk token cap
  4. Report compression stats for token_usage_logs
"""
from app.services import token_counter as tc


def compress_chunks(
    chunks: list[dict],
    max_chunks: int = 8,
    max_chunk_tokens: int = 600,
    min_score: float = 0.0,
) -> tuple[list[dict], dict]:
    """
    Returns (compressed_chunks, stats).
    stats: {original_chunks, kept_chunks, original_tokens, compressed_tokens,
            compression_applied, compression_ratio}
    """
    original_n = len(chunks)
    original_tokens = sum(tc.count_text(c.get("text", "")) for c in chunks)

    # 1. filter by score
    filtered = [c for c in chunks if c.get("score", 1.0) >= min_score]
    # 2. sort + top-K
    filtered.sort(key=lambda x: x.get("score", 0), reverse=True)
    kept = filtered[:max_chunks]

    # 3. truncate long chunks
    out = []
    for c in kept:
        text = c.get("text", "")
        if tc.count_text(text) > max_chunk_tokens:
            enc_trunc = _truncate_text(text, max_chunk_tokens)
            c = {**c, "text": enc_trunc, "truncated": True}
        out.append(c)

    compressed_tokens = sum(tc.count_text(c.get("text", "")) for c in out)
    ratio = (compressed_tokens / original_tokens) if original_tokens else 1.0
    stats = {
        "original_chunks": original_n,
        "kept_chunks": len(out),
        "original_tokens": original_tokens,
        "compressed_tokens": compressed_tokens,
        "compression_applied": len(out) != original_n or compressed_tokens < original_tokens,
        "compression_ratio": round(ratio, 3),
    }
    return out, stats


def _truncate_text(text: str, max_tokens: int) -> str:
    try:
        import tiktoken
        enc = tiktoken.get_encoding("cl100k_base")
        ids = enc.encode(text)
        if len(ids) <= max_tokens:
            return text
        return enc.decode(ids[:max_tokens]) + " [...]"
    except Exception:
        return text[: max_tokens * 4] + " [...]"
