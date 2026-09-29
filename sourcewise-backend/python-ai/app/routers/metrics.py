"""
Metrics + readiness endpoints.
GET /metrics        → JSON: uptime, request counters, per-endpoint latency
GET /metrics/prom   → Prometheus text exposition
GET /ready          → readiness: embedder + chroma + LLM provider (degraded, never 500 unless fatal)
"""
import time
from collections import defaultdict
from fastapi import APIRouter

router = APIRouter()

_started_at = time.time()
_counts: dict[str, int] = defaultdict(int)
_errors: dict[str, int] = defaultdict(int)
_lat_total: dict[str, float] = defaultdict(float)


def record_request(endpoint: str, duration_ms: float, status: int) -> None:
    _counts[endpoint] += 1
    _lat_total[endpoint] += duration_ms
    if status >= 500:
        _errors[endpoint] += 1


def snapshot() -> dict:
    endpoints = {}
    for ep, c in _counts.items():
        avg = (_lat_total[ep] / c) if c else 0
        endpoints[ep] = {
            "count": c,
            "errors": _errors.get(ep, 0),
            "avgMs": round(avg, 2),
        }
    return {
        "service": "sourcewise-python-ai",
        "uptimeSecs": int(time.time() - _started_at),
        "totalRequests": sum(_counts.values()),
        "endpoints": endpoints,
    }


@router.get("", tags=["Metrics"])
def metrics():
    return {"timestamp": time.time(), **snapshot()}


@router.get("/prom", tags=["Metrics"])
def metrics_prom():
    s = snapshot()
    lines = [
        "# HELP http_requests_total Total AI requests",
        "# TYPE http_requests_total counter",
        f"http_requests_total {s['totalRequests']}",
    ]
    for ep, v in s["endpoints"].items():
        safe = "".join(ch if ch.isalnum() or ch in "_:/" else "_" for ch in ep)
        lines.append(f'http_requests_total{{endpoint="{safe}"}} {v["count"]}')
        lines.append(f'http_errors_total{{endpoint="{safe}"}} {v["errors"]}')
        lines.append(f'http_duration_avg_ms{{endpoint="{safe}"}} {v["avgMs"]}')
    return "\n".join(lines) + "\n"


@router.get("/ready", tags=["Metrics"])
def ready():
    """Readiness probe — checks embedder, vector store, LLM config."""
    from app.config import settings

    checks: dict[str, str] = {}
    # Embedder configured?
    checks["embedder"] = "ok" if settings.EMBEDDING_MODEL else "missing"
    # Vector dir configured?
    checks["vector_db"] = "ok" if settings.CHROMA_PATH else "missing"
    # LLM provider key present? (degraded allowed — fallback may exist)
    if settings.LLM_PROVIDER == "gemini":
        checks["llm_gemini"] = "ok" if settings.GEMINI_API_KEY else "missing_key"
    elif settings.LLM_PROVIDER == "grok":
        checks["llm_grok"] = "ok" if settings.GROK_API_KEY else "missing_key"
    else:
        checks["llm"] = f"unknown_provider:{settings.LLM_PROVIDER}"
    overall = "ready" if all(v == "ok" for v in checks.values()) else "degraded"
    return {"status": overall, "checks": checks}
