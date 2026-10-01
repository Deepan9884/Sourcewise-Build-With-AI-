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


def is_front_matter_or_metadata(text: str, page: int = 1) -> bool:
    """
    Detect if a chunk is bibliographic front matter or publishing metadata
    (e.g., table of contents, copyright page, publisher details, author biography).
    """
    if not text or not text.strip():
        return True

    lower = text.lower()

    # Instant disqualifiers: standard copyright / publishing notices
    strong_markers = [
        "all rights reserved",
        "cataloging-in-publication",
        "library of congress",
        "isbn-10",
        "isbn-13",
        "isbn:",
        "printed in the united states",
        "published by",
        "table of contents",
        "cover design by",
        "typeset by",
        "printed and bound",
    ]
    for sm in strong_markers:
        if sm in lower:
            return True

    # Count softer metadata markers
    soft_markers = [
        "contents\n",
        "preface\n",
        "acknowledgments",
        "acknowledgements",
        "about the author",
        "author biography",
        "editorial director",
        "first edition",
        "second edition",
        "third edition",
        "copyright ©",
        "copyright ",
    ]
    soft_count = sum(1 for m in soft_markers if m in lower)
    if soft_count >= 2:
        return True

    # Check for Table of Contents pattern (lines like "Chapter 1 ... 12" or "Section A ... 34")
    import re
    toc_lines = re.findall(r'(?:chapter|section|part|unit|\d+[\.:])\s+.*?(?:\.{2,}|\s{3,})\s*\d+', lower)
    if len(toc_lines) >= 3:
        return True

    return False


def get_educational_chunks(
    source_ids: list[str],
    query: str = None,
    top_k: int = 12,
    sample_across_doc: bool = True
) -> list[dict]:
    """
    Retrieve substantive body chunks from selected sources, filtering out
    front matter (copyright, TOC, publisher metadata) and sampling evenly across the document.
    """
    col = _get_collection()

    clean_query = (query or "").strip()
    is_generic_query = (
        not clean_query
        or any(clean_query.lower() == g for g in [
            "general knowledge", "key concepts", "your study material",
            "study material", "word search", "concept match", "speed recall",
            "memory flip", "word scramble", "fill in the blank"
        ])
        or clean_query.lower().startswith("quiz on general knowledge")
        or clean_query.lower().startswith("flashcards about key concepts")
    )

    # 1. If we have source_ids and the query is generic, check if we can retrieve chunks directly from the store
    if source_ids:
        try:
            filter_dict = {"source_id": {"$in": source_ids}} if len(source_ids) > 1 else {"source_id": source_ids[0]}
            stored = col.get(
                where=filter_dict,
                include=["documents", "metadatas"]
            )
            if stored and stored["ids"] and len(stored["ids"]) > 0:
                all_chunks = []
                for i, chunk_id in enumerate(stored["ids"]):
                    text = stored["documents"][i]
                    meta = stored["metadatas"][i]
                    page = meta.get("page", 1)
                    all_chunks.append({
                        "chunk_id": chunk_id,
                        "text": text,
                        "source_id": meta.get("source_id", ""),
                        "source_name": meta.get("source_name", "Source"),
                        "page": page,
                        "score": 1.0,
                    })

                # Filter out front matter
                body_chunks = [c for c in all_chunks if not is_front_matter_or_metadata(c["text"], c["page"])]
                if not body_chunks:
                    # If everything was filtered out, relax filter
                    body_chunks = all_chunks

                # If generic query and document has multiple chunks, sample evenly across pages
                if is_generic_query and sample_across_doc and len(body_chunks) > top_k:
                    # Sort primarily by page, then chunk_id
                    body_chunks.sort(key=lambda c: (c.get("page", 1), c.get("chunk_id", "")))
                    total_body = len(body_chunks)
                    # Pick top_k evenly spaced chunks across the entire body
                    step = total_body / float(top_k)
                    sampled = [body_chunks[int(i * step)] for i in range(top_k)]
                    return sampled

                if is_generic_query:
                    return body_chunks[:top_k]
        except Exception:
            # Fall back to vector similarity search
            pass

    # 2. Similarity search with enriched educational query
    effective_query = clean_query
    if is_generic_query:
        effective_query = "core concepts rules lessons definitions explanations practical examples exercises vocabulary"
    else:
        # Append educational anchoring terms
        effective_query = f"{clean_query} core concepts rules explanations vocabulary"

    candidate_k = min(60, max(top_k * 4, 30))
    raw_chunks = query_chunks(effective_query, source_ids=source_ids, top_k=candidate_k)

    # Filter out front-matter chunks
    substantive = [c for c in raw_chunks if not is_front_matter_or_metadata(c["text"], c.get("page", 1))]
    if not substantive:
        substantive = raw_chunks

    # If sampling across document is requested and we have diverse pages:
    if sample_across_doc and len(substantive) > top_k:
        # Group or sort to ensure breadth across different pages
        substantive.sort(key=lambda c: (c.get("page", 1), -c.get("score", 0)))
        step = len(substantive) / float(top_k)
        return [substantive[int(i * step)] for i in range(top_k)]

    return substantive[:top_k]



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
