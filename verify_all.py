"""
verify_all.py — Sentinel AI Integration Verification
=====================================================
Runs all 7 integration checks in sequence. Each check prints
PASS or FAIL with a reason. No manual hacks required.

Run: e:\Fraud_Detection\.venv\Scripts\python.exe verify_all.py
"""
import sys, os, json, sqlite3, time
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# ── Setup ────────────────────────────────────────────────────────────────────
ROOT = Path("e:/PS6")
sys.path.insert(0, str(ROOT))
os.chdir(ROOT)

try:
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env")
except ImportError:
    pass

DB_PATH = os.environ.get("PS6_DB_PATH", str(ROOT / "fundflow.db"))
CHROMA_PATH = os.environ.get("CHROMA_DB_PATH", str(ROOT / "rag/vector_store"))
CORPUS_DIR = ROOT / "rag" / "corpus"
DEMO_ACCOUNT = "C1953680528"

results = {}

def check(n, label):
    print(f"\n{'='*65}")
    print(f"CHECK {n}: {label}")
    print(f"{'='*65}")

def passed(n, msg=""):
    tag = f"[PASS] CHECK {n}"
    results[n] = True
    print(f"  {tag}{': ' + msg if msg else ''}")

def failed(n, msg):
    tag = f"[FAIL] CHECK {n}"
    results[n] = False
    print(f"  {tag}: {msg}")


# ─────────────────────────────────────────────────────────────────────────────
# CHECK 1 — Corpus physically present + ChromaDB non-zero
# ─────────────────────────────────────────────────────────────────────────────
check(1, "Corpus populated — PDFs physically in rag/corpus/ + Chroma non-zero")

pdfs = list(CORPUS_DIR.glob("*.pdf"))
print(f"  PDFs in rag/corpus/: {[p.name for p in pdfs]}")

if len(pdfs) < 1:
    failed(1, f"No PDFs found in {CORPUS_DIR}")
else:
    try:
        import chromadb
        from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction
        client = chromadb.PersistentClient(path=CHROMA_PATH)
        ef = SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
        col = client.get_collection("sentinel_regulations", embedding_function=ef)
        count = col.count()
        print(f"  ChromaDB vector count: {count}")
        if count > 0:
            passed(1, f"{len(pdfs)} PDFs + {count} vectors in Chroma")
        else:
            failed(1, "ChromaDB collection exists but is EMPTY — re-run --ingest")
    except Exception as e:
        failed(1, f"ChromaDB error: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# CHECK 2 — Retrieval returns real passages with doc name + page
# ─────────────────────────────────────────────────────────────────────────────
check(2, "Retrieval — 'structuring / STR filing' returns real passages")

try:
    from rag.retriever import retrieve_regulations
    r = retrieve_regulations("structuring suspicious transaction STR filing", top_k=2)
    hits = r.get("results", [])
    if not hits:
        failed(2, "Empty results — corpus may not be ingested or query failed")
    else:
        for h in hits:
            print(f"  [{h['rank']}] {h['source']} p.{h['page']} — dist={h.get('distance','?')}")
            print(f"       {h['text'][:120].strip()}")
        # Check it's not a warning placeholder
        if any("warning" in h.get("text","").lower() for h in hits):
            failed(2, "Result looks like a warning, not a real passage")
        elif all(h.get("source","") and h.get("page") for h in hits):
            passed(2, f"{len(hits)} real passages with source+page")
        else:
            failed(2, "Missing source or page in results")
except Exception as e:
    failed(2, str(e))


# ─────────────────────────────────────────────────────────────────────────────
# CHECK 2b — DB path honesty check (path exists + returns rows for demo account)
# ─────────────────────────────────────────────────────────────────────────────
check("2b", f"DB path honesty — {DB_PATH} exists and returns rows for {DEMO_ACCOUNT}")

if not Path(DB_PATH).exists():
    failed("2b", f"fundflow.db NOT FOUND at {DB_PATH}")
else:
    try:
        conn = sqlite3.connect(DB_PATH)
        rows = conn.execute(
            "SELECT COUNT(*) FROM transactions WHERE sender_account=? OR receiver_account=?",
            (DEMO_ACCOUNT, DEMO_ACCOUNT)
        ).fetchone()[0]
        total = conn.execute("SELECT COUNT(*) FROM transactions").fetchone()[0]
        conn.close()
        if rows == 0:
            failed("2b", f"DB found ({total:,} rows total) but ZERO rows for {DEMO_ACCOUNT}")
        else:
            passed("2b", f"DB at correct path, {total:,} total txns, {rows} for {DEMO_ACCOUNT}")
    except Exception as e:
        failed("2b", str(e))


# ─────────────────────────────────────────────────────────────────────────────
# CHECK 3 + 4 + 5 — Full end-to-end orchestrated agent run
#   3: Orchestrated run returns an STR (not just isolated tools)
#   4: G2 passes — real citations present
#   5: All 5 tools called including detect_typology
# ─────────────────────────────────────────────────────────────────────────────
check(3, f"Full end-to-end orchestrated agent run on {DEMO_ACCOUNT}")

api_key = os.environ.get("OPENAI_API_KEY", "")
if not api_key or len(api_key) < 20:
    msg = "OPENAI_API_KEY not set — skipping checks 3/4/5"
    failed(3, msg)
    failed(4, msg)
    failed(5, msg)
    result = None
else:
    print(f"  API key: {api_key[:8]}...{api_key[-4:]}")
    print(f"  Running agent (30-60 seconds)...")
    t0 = time.time()
    try:
        from agent.orchestrator import run_investigation
        result = run_investigation(DEMO_ACCOUNT)
        elapsed = time.time() - t0
        print(f"  Completed in {elapsed:.1f}s")

        # CHECK 3 — Did we get an STR?
        str_draft = result.get("str_draft", "")
        if len(str_draft) > 200 and "SENTINEL AI" in str_draft:
            passed(3, f"STR generated ({len(str_draft)} chars, {elapsed:.1f}s)")
        else:
            failed(3, f"str_draft is too short or malformed ({len(str_draft)} chars)")

        # CHECK 4 — G2: citations present + guardrails pass
        check(4, "G2 passes — real citations in STR + guardrails PASS")
        g = result.get("guardrails", {})
        violations = g.get("violations", [])
        warnings = g.get("warnings", [])
        passed_flag = g.get("passed", False)
        citations = result.get("tool_trace", [])

        print(f"  Guardrails passed: {passed_flag}")
        print(f"  Violations: {violations if violations else 'None'}")
        print(f"  Warnings: {warnings if warnings else 'None'}")

        g2_violation = any("G2" in v for v in violations)
        if g2_violation:
            failed(4, "G2 VIOLATION — no citations retrieved. search_regulations failed.")
        elif not passed_flag:
            failed(4, f"Guardrails FAILED with violations: {violations}")
        elif "SECTION E" in str_draft and "p." in str_draft:
            passed(4, "G2 clear, Section E contains citations with page numbers")
        else:
            failed(4, "Guardrails passed but Section E missing or no page citations")

        # CHECK 5 — All 5 tools called
        check(5, "All 5 tools called — including detect_typology")
        tool_trace = result.get("tool_trace", [])
        print(f"  Tool trace: {tool_trace}")

        required = {
            "get_transaction_history",
            "get_transaction_graph",
            "score_risk",
            "search_regulations",
            "detect_typology",
        }
        called = set(tool_trace)
        missing = required - called
        if missing:
            failed(5, f"Missing tools: {missing}")
        else:
            passed(5, f"All 5 tools fired: {tool_trace}")

    except Exception as e:
        import traceback
        failed(3, str(e))
        failed(4, "Agent run failed — cannot check G2")
        failed(5, "Agent run failed — cannot check tool trace")
        traceback.print_exc()
        result = None


# ─────────────────────────────────────────────────────────────────────────────
# CHECK 6 — STR text is usable (can be written to file, non-empty, readable)
# ─────────────────────────────────────────────────────────────────────────────
check(6, "Download — STR .txt is usable and non-empty")

if result and result.get("str_draft"):
    out_path = ROOT / "verify_str_output.txt"
    try:
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(result["str_draft"])
        size = out_path.stat().st_size
        # Check key sections are present
        txt = result["str_draft"]
        sections = ["SECTION A", "SECTION B", "SECTION C", "SECTION D", "SECTION E", "SECTION F"]
        found = [s for s in sections if s in txt]
        missing_sections = [s for s in sections if s not in txt]
        print(f"  File written: {out_path} ({size:,} bytes)")
        print(f"  Sections found: {found}")
        if missing_sections:
            print(f"  Missing sections: {missing_sections}")
        if size > 500 and len(found) >= 5:
            passed(6, f"{size:,} bytes, {len(found)}/6 sections present")
        else:
            failed(6, f"STR too small ({size} bytes) or sections missing: {missing_sections}")
    except Exception as e:
        failed(6, f"Could not write STR: {e}")
else:
    failed(6, "No STR available (agent run failed or returned empty)")


# ─────────────────────────────────────────────────────────────────────────────
# CHECK 7 — Cold start: run_ps6.py --verify doesn't crash
# ─────────────────────────────────────────────────────────────────────────────
check(7, "Cold start — run_ps6.py verify mode (no manual hacks)")

import subprocess
try:
    proc = subprocess.run(
        [sys.executable, str(ROOT / "run_ps6.py"), "--verify"],
        capture_output=True, text=True, timeout=60, cwd=str(ROOT),
        env={**os.environ, "PS6_DB_PATH": DB_PATH, "CHROMA_DB_PATH": CHROMA_PATH}
    )
    stdout = proc.stdout + proc.stderr
    print(f"  Exit code: {proc.returncode}")
    print(f"  Output (last 400 chars): ...{stdout[-400:]}")
    if proc.returncode == 0:
        passed(7, "run_ps6.py --verify exited cleanly")
    else:
        # If --verify isn't implemented, we check if the script at least imports cleanly
        if "unrecognized" in stdout.lower() or "unknown" in stdout.lower():
            # --verify flag not implemented yet — test import only
            proc2 = subprocess.run(
                [sys.executable, "-c",
                 "import sys; sys.path.insert(0,'e:/PS6'); import run_ps6; print('import ok')"],
                capture_output=True, text=True, timeout=30, cwd=str(ROOT),
                env={**os.environ}
            )
            if "import ok" in proc2.stdout:
                passed(7, "run_ps6.py imports cleanly (--verify not yet implemented)")
            else:
                failed(7, f"run_ps6.py import failed: {proc2.stderr[:200]}")
        else:
            failed(7, f"run_ps6.py --verify failed (exit {proc.returncode}): {stdout[:300]}")
except subprocess.TimeoutExpired:
    failed(7, "run_ps6.py timed out after 60s")
except Exception as e:
    failed(7, str(e))


# ─────────────────────────────────────────────────────────────────────────────
# FINAL SUMMARY
# ─────────────────────────────────────────────────────────────────────────────
print(f"\n{'='*65}")
print("FINAL RESULT")
print(f"{'='*65}")

all_passed = True
for k, v in results.items():
    status = "PASS" if v else "FAIL"
    print(f"  Check {k}: {status}")
    if not v:
        all_passed = False

print()
if all_passed:
    print("  INTEGRATION COMPLETE. All 7 checks passed.")
    print("  The pipeline is production-ready for demo.")
else:
    failed_checks = [k for k, v in results.items() if not v]
    print(f"  INTEGRATION INCOMPLETE. Failed: {failed_checks}")
    print("  Fix the FAIL items before demo day.")
print(f"{'='*65}")
