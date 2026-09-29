"""
Text extractor — pulls raw text from PDF, DOCX, and plain TXT files.
No API calls. Runs entirely locally using pdfplumber and python-docx.
"""
import io
import pdfplumber
from docx import Document


def extract_text(file_bytes: bytes, filename: str) -> list[dict]:
    """
    Returns a list of page dicts: [{"page": 1, "text": "..."}, ...]
    """
    ext = filename.rsplit(".", 1)[-1].lower()

    if ext == "pdf":
        return _extract_pdf(file_bytes)
    elif ext in ("docx", "doc"):
        return _extract_docx(file_bytes)
    elif ext == "txt":
        return _extract_txt(file_bytes)
    else:
        raise ValueError(f"Unsupported file type: .{ext}")


def _extract_pdf(file_bytes: bytes) -> list[dict]:
    pages = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for i, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            text = text.strip()
            if text:
                pages.append({"page": i, "text": text})
    return pages


def _extract_docx(file_bytes: bytes) -> list[dict]:
    doc = Document(io.BytesIO(file_bytes))
    full_text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    # DOCX has no page concept — treat as single page
    return [{"page": 1, "text": full_text}] if full_text else []


def _extract_txt(file_bytes: bytes) -> list[dict]:
    text = file_bytes.decode("utf-8", errors="replace").strip()
    return [{"page": 1, "text": text}] if text else []
