"""
Internal service authentication.

The Node API gateway authenticates users (JWT) and forwards requests here
with the shared secret in the X-Internal-Key header.

- When INTERNAL_API_KEY is NOT configured: all endpoints stay open
  (plain local-dev mode — same behaviour as before).
- When it IS configured: every endpoint except / and */health requires
  the matching header, otherwise 401.

Health endpoints stay open so docker healthchecks and the frontend
AI-status indicator keep working when a key is configured.
"""
from fastapi import Header, HTTPException, Request

from app.config import settings

INTERNAL_KEY_HEADER = "X-Internal-Key"


async def verify_internal_key(
    request: Request,
    x_internal_key: str | None = Header(default=None),
):
    """FastAPI dependency enforcing the internal shared secret."""
    path = request.url.path
    if path == "/" or path == "/health" or path.endswith("/health"):
        return

    expected = settings.INTERNAL_API_KEY
    if not expected:
        return

    if x_internal_key != expected:
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing internal API key",
        )
