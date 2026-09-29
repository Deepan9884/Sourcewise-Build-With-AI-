import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # Server
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    NODE_API_ORIGIN: str = os.getenv("NODE_API_ORIGIN", "http://localhost:4000")
    FRONTEND_ORIGIN: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

    # LLM Provider Selection: "gemini" | "grok"
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "gemini").lower()

    # Gemini (Google AI)
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

    # Grok (xAI)
    GROK_API_KEY: str = os.getenv("GROK_API_KEY", "")
    GROK_MODEL: str = os.getenv("GROK_MODEL", "grok-beta")
    GROK_BASE_URL: str = os.getenv("GROK_BASE_URL", "https://api.x.ai/v1")

    # ChromaDB (local vector store — stored on disk)
    # NOTE: env var is CHROMA_PERSIST_DIR to match docker-compose.yml
    CHROMA_PATH: str = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
    CHROMA_COLLECTION: str = os.getenv("CHROMA_COLLECTION", "sourcewise")

    # Embedding model (HuggingFace, runs locally — no API key needed)
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

    # RAG settings
    TOP_K_CHUNKS: int = int(os.getenv("TOP_K_CHUNKS", "10"))
    CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "800"))
    CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "120"))

    # RAG quality settings
    QUERY_EXPANSION_ENABLED: bool = os.getenv("QUERY_EXPANSION_ENABLED", "true").lower() == "true"
    MIN_RELEVANCE_THRESHOLD: float = float(os.getenv("MIN_RELEVANCE_THRESHOLD", "0.25"))
    RERANK_TOP_K: int = int(os.getenv("RERANK_TOP_K", "8"))

    # Token reduction / budgeting (applies before Gemini/Grok calls)
    MAX_CONTEXT_CHUNKS: int = int(os.getenv("MAX_CONTEXT_CHUNKS", "8"))
    MAX_CHUNK_TOKENS: int = int(os.getenv("MAX_CHUNK_TOKENS", "600"))
    MAX_HISTORY_TURNS: int = int(os.getenv("MAX_HISTORY_TURNS", "8"))
    RESERVE_COMPLETION_TOKENS: int = int(os.getenv("RESERVE_COMPLETION_TOKENS", "4096"))
    MAX_OUTPUT_TOKENS: int = int(os.getenv("MAX_OUTPUT_TOKENS", "2048"))

    # Internal service auth (shared secret with node-api).
    # Empty = open local-dev mode (previous behaviour). When set, every
    # non-health endpoint requires the matching X-Internal-Key header.
    INTERNAL_API_KEY: str = os.getenv("INTERNAL_API_KEY", "")


settings = Settings()
