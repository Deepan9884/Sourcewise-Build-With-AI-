"""
Structured JSON logging for SourceWise AI.
Stdlib only — no new dependencies.
Usage: from app.utils.logging import get_logger; logger = get_logger(__name__)
"""
import json
import logging
import os
import sys
from datetime import datetime, timezone


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "service": "sourcewise-python-ai",
            "env": os.getenv("ENVIRONMENT", "development"),
            "level": record.levelname.lower(),
            "logger": record.name,
            "msg": record.getMessage(),
        }
        # Attach structured extras without leaking internals
        for key in ("request_id", "user_id", "endpoint", "provider", "model",
                    "duration_ms", "status", "method", "path"):
            if hasattr(record, key):
                payload[key] = getattr(record, key)
        if record.exc_info and record.exc_info[0] is not None:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload)


_configured = False


def configure_logging(level: str | None = None) -> None:
    global _configured
    if _configured:
        return
    lvl = (level or os.getenv("LOG_LEVEL", "INFO")).upper()
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(getattr(logging, lvl, logging.INFO))
    # Quiet noisy third-party loggers one notch
    for noisy in ("uvicorn.access", "httpx", "chromadb"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
    _configured = True


def get_logger(name: str) -> logging.Logger:
    configure_logging()
    return logging.getLogger(name)
