"""
Unit tests for the internal service auth dependency.

These test verify_internal_key directly (no TestClient / lifespan, so no
embedding model load). Run with: pytest test_internal_auth.py -v
"""
import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.config import settings
from app.utils.internal_auth import verify_internal_key


def make_request(path):
    return Request({"type": "http", "method": "POST", "path": path, "headers": []})


@pytest.mark.asyncio
async def test_open_mode_allows_everything_without_header(monkeypatch):
    """INTERNAL_API_KEY unset (local dev) → all paths pass with no header."""
    monkeypatch.setattr(settings, "INTERNAL_API_KEY", "")
    assert await verify_internal_key(make_request("/chat"), None) is None
    assert await verify_internal_key(make_request("/ingest"), None) is None


@pytest.mark.asyncio
async def test_correct_key_passes(monkeypatch):
    monkeypatch.setattr(settings, "INTERNAL_API_KEY", "s3cret")
    assert await verify_internal_key(make_request("/tutor/explain"), "s3cret") is None


@pytest.mark.asyncio
async def test_wrong_key_rejected(monkeypatch):
    monkeypatch.setattr(settings, "INTERNAL_API_KEY", "s3cret")
    with pytest.raises(HTTPException) as exc:
        await verify_internal_key(make_request("/chat"), "wrong")
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_missing_key_rejected(monkeypatch):
    monkeypatch.setattr(settings, "INTERNAL_API_KEY", "s3cret")
    with pytest.raises(HTTPException) as exc:
        await verify_internal_key(make_request("/orchestrator"), None)
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_health_paths_exempt_when_key_set(monkeypatch):
    """Liveness probes stay open even with a key configured."""
    monkeypatch.setattr(settings, "INTERNAL_API_KEY", "s3cret")
    assert await verify_internal_key(make_request("/health"), None) is None
    assert await verify_internal_key(make_request("/"), None) is None
    assert await verify_internal_key(make_request("/chat/health"), None) is None
    assert await verify_internal_key(make_request("/agent/health"), None) is None
    assert await verify_internal_key(make_request("/orchestrator/health"), None) is None
