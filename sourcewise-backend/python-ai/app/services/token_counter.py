"""
Token Counter — provider-aware token estimation for Gemini / Grok.
Uses tiktoken cl100k_base as approximation (both providers are
OpenAI-compatible in tokenization). Falls back to char-based
heuristic when tiktoken is unavailable.

Also exposes exact-count helpers that read provider-reported
usage when available (Grok returns usage; Gemini usageMetadata).
"""
from dataclasses import dataclass
from typing import Optional


# Context window limits per model
CONTEXT_WINDOWS = {
    "gemini-1.5-flash": 1_048_576,
    "gemini-1.5-pro": 2_097_152,
    "gemini-2.0-flash": 1_048_576,
    "grok-beta": 131_072,
    "grok-2": 131_072,
    "grok-1": 131_072,
}

DEFAULT_CONTEXT_WINDOW = 128_000


def _get_encoder():
    try:
        import tiktoken
        return tiktoken.get_encoding("cl100k_base")
    except Exception:
        return None


_ENCODER = None


def _encoder():
    global _ENCODER
    if _ENCODER is None:
        _ENCODER = _get_encoder()
    return _ENCODER


def count_text(text: str) -> int:
    """Count tokens in a plain string."""
    if not text:
        return 0
    enc = _encoder()
    if enc is not None:
        try:
            return len(enc.encode(text))
        except Exception:
            pass
    # Fallback: ~4 chars per token
    return max(1, len(text) // 4)


def count_messages(messages: list[dict]) -> int:
    """Count tokens for OpenAI-format message list (incl. overhead)."""
    tokens = 0
    for msg in messages:
        tokens += 4  # per-message overhead
        for key, value in msg.items():
            tokens += count_text(str(value))
            if key == "name":
                tokens -= 1
    tokens += 2  # assistant reply priming
    return tokens


def context_window_for(model: str) -> int:
    return CONTEXT_WINDOWS.get(model, DEFAULT_CONTEXT_WINDOW)


def can_fit(messages: list[dict], model: str, reserve_for_completion: int = 4096) -> bool:
    return count_messages(messages) + reserve_for_completion <= context_window_for(model)


def truncate_to_fit(
    messages: list[dict],
    model: str,
    reserve_for_completion: int = 4096,
    preserve_system: bool = True,
) -> tuple[list[dict], bool]:
    """
    Truncate oldest messages so the list fits the model context window.
    Returns (truncated_messages, was_truncated).
    System prompt is always preserved when preserve_system=True.
    """
    if can_fit(messages, model, reserve_for_completion):
        return messages, False

    system_msg = None
    rest = list(messages)
    if preserve_system and rest and rest[0].get("role") == "system":
        system_msg = rest[0]
        rest = rest[1:]

    budget = context_window_for(model) - reserve_for_completion
    if system_msg:
        budget -= count_messages([system_msg])

    result: list[dict] = []
    for msg in reversed(rest):
        cost = count_messages([msg])
        if cost <= budget:
            result.insert(0, msg)
            budget -= cost
        else:
            truncated = _truncate_single(msg, budget)
            if truncated:
                result.insert(0, truncated)
            break

    if system_msg:
        result.insert(0, system_msg)
    return result, True


def _truncate_single(msg: dict, budget: int) -> Optional[dict]:
    # Leave headroom for per-message overhead (+4), reply priming (+2),
    # and the "[...]" suffix (~4 tokens) so the result passes can_fit.
    if budget <= 24:
        return None
    content = str(msg.get("content", ""))
    enc = _encoder()
    if enc is not None:
        try:
            ids = enc.encode(content)
            cut = max(0, budget - 16)
            text = enc.decode(ids[:cut]) + " [...]"
            return {**msg, "content": text}
        except Exception:
            pass
    cut_chars = max(0, (budget - 16) * 4)
    return {**msg, "content": content[:cut_chars] + " [...]"}


@dataclass
class TokenUsage:
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0

    @classmethod
    def from_grok_response(cls, data: dict, fallback_prompt: int = 0) -> "TokenUsage":
        usage = data.get("usage") or {}
        pt = usage.get("prompt_tokens", fallback_prompt)
        ct = usage.get("completion_tokens", 0)
        tt = usage.get("total_tokens", pt + ct)
        return cls(prompt_tokens=pt, completion_tokens=ct, total_tokens=tt)

    @classmethod
    def from_gemini_response(cls, response, fallback_prompt: int = 0, text: str = "") -> "TokenUsage":
        try:
            meta = getattr(response, "usage_metadata", None)
            if meta is not None:
                pt = getattr(meta, "prompt_token_count", fallback_prompt) or fallback_prompt
                ct = getattr(meta, "candidates_token_count", 0) or 0
                if not ct and text:
                    ct = count_text(text)
                tt = getattr(meta, "total_token_count", pt + ct) or (pt + ct)
                return cls(prompt_tokens=pt, completion_tokens=ct, total_tokens=tt)
        except Exception:
            pass
        ct = count_text(text) if text else 0
        return cls(prompt_tokens=fallback_prompt, completion_tokens=ct, total_tokens=fallback_prompt + ct)


class TokenCounter:
    """Convenience wrapper binding provider+model."""

    def __init__(self, provider: str = "gemini", model: str = "gemini-1.5-flash"):
        self.provider = provider
        self.model = model
        self.context_window = context_window_for(model)

    def count_messages(self, messages: list[dict]) -> int:
        return count_messages(messages)

    def count_text(self, text: str) -> int:
        return count_text(text)

    def can_fit(self, messages: list[dict], reserve_for_completion: int = 4096) -> bool:
        return can_fit(messages, self.model, reserve_for_completion)

    def truncate_to_fit(
        self,
        messages: list[dict],
        reserve_for_completion: int = 4096,
        preserve_system: bool = True,
    ) -> tuple[list[dict], bool]:
        return truncate_to_fit(messages, self.model, reserve_for_completion, preserve_system)
