"""
PDF ingestion with local parsing only.

Uses pdfplumber (text + tables) with pytesseract OCR fallback for scanned
documents. Deliberately does NOT use LlamaParse or Unstructured.io — both
are paid APIs, and sending government audit PDFs to a third-party service
is an avoidable dependency when the documents parse acceptably locally.
"""
import os
import io
import requests

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; PublicRecordDashboardBot/1.0)"}


def download_pdf(url: str) -> bytes:
    resp = requests.get(url, headers=HEADERS, timeout=60)
    resp.raise_for_status()
    return resp.content


def extract_text(pdf_bytes: bytes) -> str:
    """Text layer first; OCR only if the PDF turns out to be scanned."""
    try:
        import pdfplumber
    except ImportError:
        raise RuntimeError("pdfplumber not installed — run: pip install -r requirements.txt")

    text_parts = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            t = page.extract_text() or ""
            text_parts.append(t)

    text = "\n".join(text_parts).strip()

    # A near-empty text layer means a scanned document — fall back to OCR.
    if len(text) < 200:
        try:
            import pytesseract
            from pdf2image import convert_from_bytes
            images = convert_from_bytes(pdf_bytes)
            text = "\n".join(pytesseract.image_to_string(img) for img in images)
        except ImportError:
            raise RuntimeError(
                "PDF appears scanned (no text layer) and OCR deps are missing. "
                "Install: pip install pytesseract pdf2image, plus the tesseract binary."
            )
    return text


def extract_tables(pdf_bytes: bytes) -> list:
    try:
        import pdfplumber
    except ImportError:
        raise RuntimeError("pdfplumber not installed")
    tables = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            for t in (page.extract_tables() or []):
                tables.append(t)
    return tables


def ingest_pdf(url: str, source_label: str = "") -> dict:
    """Download + parse. Returns raw extracted content for an editor to
    review — deliberately does NOT auto-generate claims from the text."""
    pdf_bytes = download_pdf(url)
    text = extract_text(pdf_bytes)
    tables = extract_tables(pdf_bytes)
    print(f"    parsed {source_label or url}: {len(text)} chars, {len(tables)} tables")
    return {"url": url, "source_label": source_label, "text_length": len(text),
            "table_count": len(tables), "text": text, "tables": tables}
