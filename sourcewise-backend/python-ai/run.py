"""Entry point — run with: python run.py"""
import os
import sys

_venv_site = os.path.abspath(os.path.join(os.path.dirname(__file__), ".venv", "Lib", "site-packages"))
if os.path.isdir(_venv_site) and _venv_site not in sys.path:
    sys.path.insert(0, _venv_site)

import uvicorn

if __name__ == "__main__":
    # On Windows/Node child_process spawns, uvicorn reload can cause socket inheritance lockups.
    # Disable reload by default for rock-solid stability unless DEV_RELOAD=true is set.
    reload = os.getenv("DEV_RELOAD", "false").lower() == "true"
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=reload,
        log_level="info",
    )
