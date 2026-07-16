"""
rag/ingest.py — RAG Corpus Ingestion Pipeline
===============================================
Chunks and embeds regulatory PDFs into a Chroma vector store.

Supported documents (place in rag/corpus/):
  - FATF Recommendations 2012 (updated 2023) — fatf_recommendations.pdf
  - FinCEN SAR Activity Review               — fincen_sar_review.pdf
  - RBI KYC/AML Master Direction 2016 (2023) — rbi_kyc_aml_master.pdf
  - MHA Cybercrime Annual Report 2023-24     — mha_cybercrime_report.pdf

Chunking strategy:
  - Chunk size   : ~500 tokens (≈ 2000 characters)
  - Overlap      : 50 tokens (≈ 200 characters)
  - Embedding    : sentence-transformers/all-MiniLM-L6-v2 (free, local)
  - Vector store : Chroma (persistent)

Run once before starting the agent:
  python rag/ingest.py
"""

import os
import sys
import json
import logging
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

ROOT = Path(__file__).parent.parent
CORPUS_DIR = ROOT / "rag" / "corpus"
VECTOR_STORE_PATH = os.environ.get("CHROMA_DB_PATH", str(ROOT / "rag" / "vector_store"))

# Chunk parameters (approximate character counts)
CHUNK_SIZE_CHARS = 2000
CHUNK_OVERLAP_CHARS = 200


def load_pdf(pdf_path: Path) -> list[dict]:
    """
    Load a PDF and return a list of page dicts:
    [{text: str, page: int, source: str}]
    """
    try:
        from pypdf import PdfReader
        reader = PdfReader(str(pdf_path))
        pages = []
        for i, page in enumerate(reader.pages, 1):
            text = page.extract_text() or ""
            if text.strip():
                pages.append({
                    "text": text,
                    "page": i,
                    "source": pdf_path.stem,
                })
        logger.info("Loaded %s: %d pages", pdf_path.name, len(pages))
        return pages
    except Exception as e:
        logger.error("Failed to load %s: %s", pdf_path.name, e)
        return []


def chunk_pages(pages: list[dict]) -> list[dict]:
    """
    Split page text into overlapping chunks.
    Returns list of chunk dicts: {text, page, source, chunk_id}
    """
    chunks = []
    for page in pages:
        text = page["text"]
        start = 0
        chunk_idx = 0
        while start < len(text):
            end = start + CHUNK_SIZE_CHARS
            chunk_text = text[start:end].strip()
            if len(chunk_text) > 100:  # skip tiny fragments
                chunks.append({
                    "text": chunk_text,
                    "page": page["page"],
                    "source": page["source"],
                    "chunk_id": f"{page['source']}_p{page['page']}_c{chunk_idx}",
                })
                chunk_idx += 1
            start += CHUNK_SIZE_CHARS - CHUNK_OVERLAP_CHARS
    return chunks


def ingest_corpus():
    """
    Main ingestion function: load PDFs → chunk → embed → store in Chroma.
    """
    try:
        import chromadb
        from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction
    except ImportError:
        logger.error("chromadb or sentence-transformers not installed. Run: pip install chromadb sentence-transformers")
        sys.exit(1)

    # Find PDFs
    if not CORPUS_DIR.exists():
        CORPUS_DIR.mkdir(parents=True, exist_ok=True)
        logger.warning("Corpus directory created: %s", CORPUS_DIR)
        logger.warning("Please add regulatory PDFs to %s and re-run.", CORPUS_DIR)
        return

    pdf_files = list(CORPUS_DIR.glob("*.pdf"))
    if not pdf_files:
        logger.warning("No PDF files found in %s", CORPUS_DIR)
        logger.info("Expected files: fatf_recommendations.pdf, fincen_sar_review.pdf, rbi_kyc_aml_master.pdf, mha_cybercrime_report.pdf")
        return

    logger.info("Found %d PDF files: %s", len(pdf_files), [f.name for f in pdf_files])

    # Load and chunk all PDFs
    all_chunks = []
    for pdf_file in pdf_files:
        pages = load_pdf(pdf_file)
        chunks = chunk_pages(pages)
        all_chunks.extend(chunks)
        logger.info("  → %d chunks from %s", len(chunks), pdf_file.name)

    if not all_chunks:
        logger.error("No chunks produced. Check PDF files.")
        return

    logger.info("Total chunks: %d", len(all_chunks))

    # Build Chroma client + collection
    Path(VECTOR_STORE_PATH).mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=VECTOR_STORE_PATH)
    embedding_fn = SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")

    # Delete existing collection if rebuilding
    try:
        client.delete_collection("sentinel_regulations")
        logger.info("Deleted existing collection.")
    except Exception:
        pass

    collection = client.create_collection(
        name="sentinel_regulations",
        embedding_function=embedding_fn,
        metadata={"hnsw:space": "cosine"},
    )

    # Upsert in batches of 100
    BATCH_SIZE = 100
    for i in range(0, len(all_chunks), BATCH_SIZE):
        batch = all_chunks[i:i + BATCH_SIZE]
        collection.add(
            documents=[c["text"] for c in batch],
            metadatas=[{"source": c["source"], "page": c["page"]} for c in batch],
            ids=[c["chunk_id"] for c in batch],
        )
        logger.info("Upserted batch %d/%d", i // BATCH_SIZE + 1, (len(all_chunks) + BATCH_SIZE - 1) // BATCH_SIZE)

    logger.info("✅ RAG ingestion complete: %d chunks in Chroma at %s", len(all_chunks), VECTOR_STORE_PATH)

    # Save manifest
    manifest = {
        "total_chunks": len(all_chunks),
        "sources": list({c["source"] for c in all_chunks}),
        "vector_store_path": VECTOR_STORE_PATH,
    }
    manifest_path = ROOT / "rag" / "ingest_manifest.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    logger.info("Manifest saved: %s", manifest_path)


if __name__ == "__main__":
    ingest_corpus()
