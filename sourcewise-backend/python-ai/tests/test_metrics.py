"""Metrics router smoke tests — no external services required."""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_metrics_json():
    r = client.get("/metrics")
    assert r.status_code == 200
    body = r.json()
    assert body["service"] == "sourcewise-python-ai"
    assert "totalRequests" in body


def test_metrics_prom():
    r = client.get("/metrics/prom")
    assert r.status_code == 200
    assert "http_requests_total" in r.text


def test_ready_degraded_without_keys():
    r = client.get("/metrics/ready")
    assert r.status_code == 200
    assert r.json()["status"] in ("ready", "degraded")
