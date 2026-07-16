"""
test_rag.py — Quick RAG retrieval test
Run: e:\Fraud_Detection\.venv\Scripts\python.exe test_rag.py
"""
import sys, os
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, "e:/PS6")
os.environ["CHROMA_DB_PATH"] = "e:/PS6/rag/vector_store"

from rag.retriever import retrieve_regulations

print("=" * 60)
print("RAG RETRIEVAL TEST")
print("=" * 60)

queries = [
    "suspicious transaction mule account structuring",
    "know your customer KYC due diligence",
    "suspicious transaction report STR filing",
]

for q in queries:
    print(f"\nQuery: '{q}'")
    print("-" * 50)
    r = retrieve_regulations(q, top_k=2)
    for x in r["results"]:
        print(f"  [{x['rank']}] {x['source']}  p.{x['page']}")
        print(f"       {x['text'][:250].strip()}")
        print()

print("=" * 60)
print("RAG TEST COMPLETE")
print("=" * 60)
