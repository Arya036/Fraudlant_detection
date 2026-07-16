"""
test_mha_pollution.py — Check if MHA is polluting regulatory queries
======================================================================
MHA = 580/1088 chunks (53%). Risk: AML-specific queries return MHA prose
instead of FATF/RBI obligations.

Run: e:\Fraud_Detection\.venv\Scripts\python.exe test_mha_pollution.py
"""
import sys, os
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, "e:/PS6")
os.environ["CHROMA_DB_PATH"] = "e:/PS6/rag/vector_store"

from rag.retriever import retrieve_regulations

QUERIES = [
    "STR filing obligation suspicious transaction",
    "structuring transactions reporting threshold",
    "money laundering typology smurfing layering",
    "KYC due diligence customer identification",
    "mule account suspicious transaction India",
    "FATF recommendation AML compliance",
]

mha_hits = 0
total_hits = 0

print("=" * 65)
print("MHA POLLUTION CHECK — top-3 results per query")
print("=" * 65)

for q in QUERIES:
    r = retrieve_regulations(q, top_k=3)
    hits = r["results"]
    print(f"\nQuery: '{q}'")
    for h in hits:
        src = h["source"]
        is_mha = "MHA" in src or "Annual" in src
        flag = " <-- MHA" if is_mha else ""
        print(f"  [{h['rank']}] {src} p.{h['page']} dist={h['distance']:.3f}{flag}")
        if is_mha:
            mha_hits += 1
        total_hits += 1

print(f"\n{'='*65}")
print(f"SUMMARY: MHA hits = {mha_hits}/{total_hits} ({100*mha_hits/total_hits:.0f}%)")
if mha_hits / total_hits > 0.3:
    print("  WARNING: MHA is returning in >30% of AML-specific queries.")
    print("  Consider filtering MHA out of regulatory queries or re-weighting.")
else:
    print("  OK: MHA is not dominating AML regulatory queries.")
print("=" * 65)
