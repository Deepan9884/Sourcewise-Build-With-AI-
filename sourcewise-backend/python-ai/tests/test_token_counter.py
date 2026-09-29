"""Token counter + context compressor tests (no API keys, no network)."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services import token_counter as tc
from app.services.context_compressor import compress_chunks


def test_count_text_basic():
    assert tc.count_text("") == 0
    assert tc.count_text("Hello world") > 0
    # Longer text → more tokens
    assert tc.count_text("x" * 400) > tc.count_text("x" * 40)


def test_count_messages_overhead():
    msgs = [{"role": "user", "content": "hi"}]
    assert tc.count_messages(msgs) > tc.count_text("hi")


def test_truncate_preserves_system():
    # grok-beta has a 131k window. NOTE: repetitive text ("x" * N)
    # tokenizes extremely efficiently under BPE, so use high-entropy
    # UUID text to genuinely exceed the window.
    import uuid
    big = " ".join(uuid.uuid4().hex for _ in range(8000))
    assert tc.count_text(big) > 100000  # sanity: actually large
    msgs = [
        {"role": "system", "content": "You are helpful."},
        {"role": "user", "content": big},
        {"role": "assistant", "content": big},
    ]
    out, truncated = tc.truncate_to_fit(msgs, "grok-beta", reserve_for_completion=4096)
    assert truncated is True
    assert out[0]["role"] == "system"
    assert tc.can_fit(out, "grok-beta", reserve_for_completion=4096)


def test_can_fit_small():
    msgs = [{"role": "user", "content": "Hello"}]
    assert tc.can_fit(msgs, "gemini-1.5-flash") is True


def test_token_usage_from_grok():
    data = {"usage": {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15}}
    u = tc.TokenUsage.from_grok_response(data)
    assert (u.prompt_tokens, u.completion_tokens, u.total_tokens) == (10, 5, 15)


def test_compress_chunks_caps_and_truncates():
    chunks = [
        {"chunk_id": f"c{i}", "source_id": "s", "source_name": "Doc",
         "text": "word " * 500, "page": 1, "score": 0.9 - i * 0.05}
        for i in range(10)
    ]
    out, stats = compress_chunks(chunks, max_chunks=4, max_chunk_tokens=100, min_score=0.0)
    assert len(out) == 4
    assert stats["compression_applied"] is True
    assert stats["compressed_tokens"] < stats["original_tokens"]
    assert stats["compression_ratio"] < 1.0


def test_compress_chunks_filters_low_score():
    chunks = [
        {"chunk_id": "good", "source_id": "s", "source_name": "D",
         "text": "relevant content here", "page": 1, "score": 0.9},
        {"chunk_id": "bad", "source_id": "s", "source_name": "D",
         "text": "irrelevant", "page": 2, "score": 0.01},
    ]
    out, _ = compress_chunks(chunks, max_chunks=8, max_chunk_tokens=600, min_score=0.25)
    assert [c["chunk_id"] for c in out] == ["good"]
