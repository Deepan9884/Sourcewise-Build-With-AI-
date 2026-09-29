"""Entry point — run with: python run.py"""
import os
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
