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
    # 1. Primary: pdfplumber text extraction
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for i, page in enumerate(pdf.pages, start=1):
                text = (page.extract_text() or "").strip()
                if text:
                    pages.append({"page": i, "text": text})
    except Exception:
        pass

    # 2. Secondary fallback: pypdf (handles certain font encodings that pdfplumber misses)
    if not pages:
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            for i, p in enumerate(reader.pages, start=1):
                text = (p.extract_text() or "").strip()
                if text:
                    pages.append({"page": i, "text": text})
        except Exception:
            pass

    # 3. Tertiary fallback: RapidOCR for scanned/image-only PDFs (safe page cap to avoid browser timeout)
    if not pages:
        pages = _ocr_pdf_pages(file_bytes)

    return pages


def _ocr_pdf_pages(file_bytes: bytes, max_pages: int = 5) -> list[dict]:
    """Extract text from scanned PDF pages using local RapidOCR."""
    pages = []
    try:
        from rapidocr_onnxruntime import RapidOCR
        import numpy as np

        engine = RapidOCR()
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            limit = min(len(pdf.pages), max_pages)
            for i in range(limit):
                try:
                    im = pdf.pages[i].to_image(resolution=80).original
                    img_np = np.array(im)
                    ocr_res, _ = engine(img_np)
                    if ocr_res:
                        txt = "\n".join([line[1] for line in ocr_res if line and len(line) > 1]).strip()
                        if txt and len(txt) >= 20:
                            pages.append({"page": i + 1, "text": txt})
                except Exception:
                    continue
    except Exception:
        pass
    return pages


def _extract_docx(file_bytes: bytes) -> list[dict]:
    doc = Document(io.BytesIO(file_bytes))
    full_text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    # DOCX has no page concept — treat as single page
    return [{"page": 1, "text": full_text}] if full_text else []


def _extract_txt(file_bytes: bytes) -> list[dict]:
    text = file_bytes.decode("utf-8", errors="replace").strip()
    return [{"page": 1, "text": text}] if text else []
