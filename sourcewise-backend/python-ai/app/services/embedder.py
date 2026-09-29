"""
Embedder — converts text into dense vector representations using a local
HuggingFace sentence-transformer model. No API key, runs on CPU.

Model: all-MiniLM-L6-v2 (~90 MB, loads once at startup)
"""
from sentence_transformers import SentenceTransformer
from app.config import settings
import numpy as np

# Loaded once at module import — cached for the lifetime of the process
_model = None


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        print(f"[Embedder] Loading model: {settings.EMBEDDING_MODEL}")
        _model = SentenceTransformer(settings.EMBEDDING_MODEL)
        print("[Embedder] Model ready.")
    return _model


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed a list of strings → list of float vectors."""
    model = get_model()
    vectors = model.encode(texts, show_progress_bar=False, convert_to_numpy=True)
    return vectors.tolist()


def embed_single(text: str) -> list[float]:
    """Embed a single string → float vector."""
    return embed_texts([text])[0]
