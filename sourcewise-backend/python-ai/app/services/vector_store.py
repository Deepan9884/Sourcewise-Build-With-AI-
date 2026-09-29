"""
Vector Store — wraps ChromaDB for local, persistent vector storage.
Stores embeddings on disk (./chroma_db). No cloud, no API key.
"""
import chromadb
from chromadb.config import Settings as ChromaSettings
from app.config import settings
from app.services.embedder import embed_texts, embed_single

# Singleton client
_client = None
_collection = None


def _get_collection():
    global _client, _collection
    if _client is None:
        _client = chromadb.PersistentClient(
            path=settings.CHROMA_PATH,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
    if _collection is None:
        _collection = _client.get_or_create_collection(
            name=settings.CHROMA_COLLECTION,
            metadata={"hnsw:space": "cosine"},
        )
    return _collection


def add_chunks(chunks: list[dict]) -> int:
    """
    Add a list of chunk dicts to ChromaDB.
    Each chunk: {chunk_id, text, source_id, source_name, page}
    Returns number of chunks added.
    """
    if not chunks:
        return 0

    col = _get_collection()

    ids = [c["chunk_id"] for c in chunks]
    texts = [c["text"] for c in chunks]
    metadatas = [
        {
            "source_id": c["source_id"],
            "source_name": c["source_name"],
            "page": c.get("page", 1),
        }
        for c in chunks
    ]
    embeddings = embed_texts(texts)

    col.add(ids=ids, documents=texts, embeddings=embeddings, metadatas=metadatas)
    return len(chunks)


def query_chunks(question: str, source_ids: list[str], top_k: int = None) -> list[dict]:
    """
    Find the top-k most relevant chunks for a question, filtered to source_ids.
    Returns list of {chunk_id, text, source_id, source_name, page, score}.
    """
    if top_k is None:
        top_k = settings.TOP_K_CHUNKS

    col = _get_collection()
    q_embed = embed_single(question)

    where_filter = (
        {"source_id": {"$in": source_ids}} if source_ids else None
    )

    results = col.query(
        query_embeddings=[q_embed],
        n_results=top_k,
        where=where_filter,
        include=["documents", "metadatas", "distances"],
    )

    chunks = []
    if results and results["ids"]:
        for i, chunk_id in enumerate(results["ids"][0]):
            chunks.append({
                "chunk_id": chunk_id,
                "text": results["documents"][0][i],
                "source_id": results["metadatas"][0][i]["source_id"],
                "source_name": results["metadatas"][0][i]["source_name"],
                "page": results["metadatas"][0][i].get("page", 1),
                "score": 1 - results["distances"][0][i],  # cosine similarity
            })

    # Sort by relevance descending
    chunks.sort(key=lambda x: x["score"], reverse=True)
    return chunks


def delete_source(source_id: str) -> int:
    """Remove all chunks belonging to a source. Returns count deleted."""
    col = _get_collection()
    existing = col.get(where={"source_id": source_id})
    ids_to_delete = existing["ids"]
    if ids_to_delete:
        col.delete(ids=ids_to_delete)
    return len(ids_to_delete)


def get_source_chunk_count(source_id: str) -> int:
    """Return how many chunks are stored for a given source."""
    col = _get_collection()
    result = col.get(where={"source_id": source_id})
    return len(result["ids"])
