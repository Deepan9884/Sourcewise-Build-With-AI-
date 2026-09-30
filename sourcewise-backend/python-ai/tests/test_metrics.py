"""Metrics router smoke tests — no external services required."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
import httpx
from app.main import app


@pytest.mark.asyncio
async def test_metrics_json():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        r = await client.get("/metrics")
        assert r.status_code == 200
        body = r.json()
        assert body["service"] == "sourcewise-python-ai"
        assert "totalRequests" in body


@pytest.mark.asyncio
async def test_metrics_prom():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        r = await client.get("/metrics/prom")
        assert r.status_code == 200
        assert "http_requests_total" in r.text


@pytest.mark.asyncio
async def test_ready_degraded_without_keys():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        r = await client.get("/metrics/ready")
        assert r.status_code == 200
        assert r.json()["status"] in ("ready", "degraded")
