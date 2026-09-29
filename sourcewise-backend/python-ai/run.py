"""Entry point — run with: python run.py"""
import os
import sys

_venv_site = os.path.abspath(os.path.join(os.path.dirname(__file__), ".venv", "Lib", "site-packages"))
if os.path.isdir(_venv_site) and _venv_site not in sys.path:
    sys.path.insert(0, _venv_site)

import uvicorn

if __name__ == "__main__":
    # Auto-reload is a dev-only convenience; never enable it in production
    # (the Docker image sets ENVIRONMENT=production via compose).
    reload = os.getenv("ENVIRONMENT", "development") != "production"
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=reload,
        log_level="info",
    )
