"""
Ingest Router — handles document upload and vectorization.
POST /ingest   → upload a file, extract, chunk, embed, store in ChromaDB
DELETE /ingest/{source_id} → remove all chunks for a source
GET /ingest/{source_id}/count → chunk count for a source
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.models.schemas import IngestResponse
from app.services import extractor, chunker, vector_store

router = APIRouter()


@router.post("", response_model=IngestResponse)
async def ingest_document(
    file: UploadFile = File(...),
    source_id: str = Form(...),
    user_id: str = Form(...),
    source_name: str = Form(...),
):
    """
    Upload a file → extract text → chunk → embed → store in ChromaDB.
    Idempotent: re-uploading the same source_id replaces previous chunks.
    """
    allowed = {"pdf", "docx", "doc", "txt"}
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '.{ext}'. Allowed: {allowed}",
        )

    # Read file bytes
    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Remove old chunks if re-uploading same source
    vector_store.delete_source(source_id)

    # Extract → Chunk → Embed → Store
    pages = extractor.extract_text(file_bytes, file.filename)
    if not pages:
        raise HTTPException(
            status_code=422,
            detail="Could not extract text. This PDF appears to be a scanned image with no digital text layer. Please use an OCR-processed PDF or export text."
        )

    chunks = chunker.chunk_pages(pages, source_id=source_id, source_name=source_name)
    if not chunks:
        raise HTTPException(status_code=422, detail="Document produced no usable chunks.")

    count = vector_store.add_chunks(chunks)

    return IngestResponse(
        source_id=source_id,
        source_name=source_name,
        chunks_indexed=count,
        status="ready",
    )


@router.delete("/{source_id}")
async def delete_source(source_id: str):
    """Remove all vectors for a source from ChromaDB."""
    deleted = vector_store.delete_source(source_id)
    return {"source_id": source_id, "chunks_deleted": deleted}


@router.get("/{source_id}/count")
async def get_chunk_count(source_id: str):
    """Return how many chunks are stored for a source."""
    count = vector_store.get_source_chunk_count(source_id)
    return {"source_id": source_id, "chunk_count": count}
