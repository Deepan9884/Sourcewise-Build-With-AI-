"""
Chunker — splits raw page text into overlapping chunks with metadata.
Uses langchain's RecursiveCharacterTextSplitter for smart paragraph-aware splits.
"""
from langchain.text_splitter import RecursiveCharacterTextSplitter
from app.config import settings
import uuid


def chunk_pages(pages: list[dict], source_id: str, source_name: str) -> list[dict]:
    """
    Input:  [{"page": 1, "text": "..."}, ...]
    Output: [{"chunk_id": "...", "text": "...", "source_id": "...", "source_name": "...", "page": 1}, ...]
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.CHUNK_SIZE,
        chunk_overlap=settings.CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    chunks = []
    for page_data in pages:
        page_num = page_data["page"]
        text = page_data["text"]

        raw_chunks = splitter.split_text(text)
        for raw in raw_chunks:
            raw = raw.strip()
            if len(raw) < 30:   # skip tiny fragments
                continue
            chunks.append({
                "chunk_id": str(uuid.uuid4()),
                "text": raw,
                "source_id": source_id,
                "source_name": source_name,
                "page": page_num,
            })

    return chunks
