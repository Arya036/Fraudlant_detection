"""
rag/retriever.py — Regulatory Corpus Retriever
================================================
Semantic retrieval over the ingested Chroma vector store.
Returns top-k passages with document name + page citation.

Used by the search_regulations tool in agent/tools.py.
"""

import os
import logging
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

ROOT = Path(__file__).parent.parent
VECTOR_STORE_PATH = os.environ.get("CHROMA_DB_PATH", str(ROOT / "rag" / "vector_store"))

# Friendly display names for source files.
# Keys = PDF filename stems (as ingested). Values = clean citation labels.
# Add the actual downloaded filenames here so citations look professional.
SOURCE_DISPLAY_NAMES = {
    # Clean names (if user renamed files before ingest)
    "fatf_recommendations": "FATF Recommendations 2012 (updated 2023)",
    "fincen_sar_review": "FinCEN SAR Activity Review",
    "rbi_kyc_aml_master": "RBI KYC/AML Master Direction 2016 (updated 2023)",
    "mha_cybercrime_report": "MHA Cybercrime Annual Report 2023-24",
    # Actual downloaded filenames (as ingested into Chroma)
    "fatf-recommendations-2012": "FATF Recommendations 2012 (updated 2023)",
    "sar_tti_01": "FinCEN SAR Activity Review — Trends, Tips & Issues",
    "MD18KYCF6E92C82E1E1419D87323E3869BC9F13": "RBI Master Direction — KYC/AML 2016 (updated 2023)",
    "AnnualReport_27122024": "MHA Annual Report 2023-24 (Cybercrime / Digital Arrest)",
}

# Lazy-loaded collection
_collection = None


def _get_collection():
    """Load (or reuse) the Chroma collection."""
    global _collection
    if _collection is None:
        import chromadb
        from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction

        client = chromadb.PersistentClient(path=VECTOR_STORE_PATH)
        embedding_fn = SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
        _collection = client.get_collection(
            name="sentinel_regulations",
            embedding_function=embedding_fn,
        )
        logger.info("Chroma collection loaded: %d documents", _collection.count())
    return _collection


def retrieve_regulations(query: str, top_k: int = 3) -> dict:
    """
    Retrieve top-k regulatory passages relevant to the query.

    Args:
        query: Natural language AML/regulation query.
        top_k: Number of passages to return.

    Returns:
        {
            "query": str,
            "results": [
                {
                    "rank": int,
                    "text": str,
                    "source": str,     — human-readable document name
                    "page": int,
                    "source_file": str,
                    "distance": float,
                }
            ]
        }
    """
    try:
        collection = _get_collection()
    except Exception as e:
        raise RuntimeError(f"Could not load Chroma collection: {e}. Run `python rag/ingest.py` first.")

    results = collection.query(
        query_texts=[query],
        n_results=top_k,
        include=["documents", "metadatas", "distances"],
    )

    passages = []
    docs = results.get("documents", [[]])[0]
    metas = results.get("metadatas", [[]])[0]
    dists = results.get("distances", [[]])[0]

    for i, (doc, meta, dist) in enumerate(zip(docs, metas, dists)):
        source_file = meta.get("source", "unknown")
        display_name = SOURCE_DISPLAY_NAMES.get(source_file, source_file)
        passages.append({
            "rank": i + 1,
            "text": doc,
            "source": display_name,
            "page": meta.get("page", "?"),
            "source_file": source_file,
            "distance": round(float(dist), 4),
        })

    return {
        "query": query,
        "results": passages,
    }


def sanity_test():
    """Quick sanity check — query 'PMLA structuring STR threshold'."""
    print("=" * 60)
    print("RAG Sanity Test: 'PMLA structuring STR threshold'")
    print("=" * 60)
    result = retrieve_regulations("PMLA structuring suspicious transaction report threshold", top_k=3)
    for r in result["results"]:
        print(f"\n[{r['rank']}] {r['source']} (p.{r['page']}) — dist={r['distance']}")
        print(f"  {r['text'][:200].strip()}…")


if __name__ == "__main__":
    sanity_test()
