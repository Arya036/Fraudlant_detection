"""
run_ps6.py -- Sentinel AI Startup Script
=========================================
Usage:
  python run_ps6.py          # verify + start console
  python run_ps6.py --verify # verify components only
  python run_ps6.py --ingest # ingest RAG corpus only
"""

import sys
import os
import argparse
import subprocess
import sqlite3

# UTF-8 safe stdout for Windows cp1252 terminals
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv optional

ROOT = os.path.dirname(os.path.abspath(__file__))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)


def verify_components() -> bool:
    """Run all Day-1 verification checks (Section 12 of technical reference)."""
    print("\n" + "=" * 60)
    print("SENTINEL AI -- Component Verification")
    print("=" * 60)
    all_pass = True

    # 1. XGBoost model
    print("\n[1/3] Verifying XGBoost model...")
    try:
        from models.predictor import predict_single
        result = predict_single({
            "amount": 50000, "txn_type": "UPI",
            "sender_account": "C123", "receiver_account": "M456",
            "channel": "mobile", "timestamp": "2026-03-01 02:00:00",
        })
        prob, tier = result["fraud_probability"], result["risk_tier"]
        print(f"  [PASS] Model OK -- fraud_prob={prob:.4f}, tier={tier}")
    except Exception as e:
        print(f"  [FAIL] Model FAILED: {e}")
        all_pass = False

    # 2. Database
    print("\n[2/3] Verifying database connection...")
    db_path = os.environ.get("PS6_DB_PATH", os.path.join(ROOT, "fundflow.db"))
    try:
        conn = sqlite3.connect(db_path)
        count = conn.execute("SELECT COUNT(*) FROM transactions").fetchone()[0]
        profiles = conn.execute("SELECT COUNT(*) FROM account_profiles").fetchone()[0]
        conn.close()
        print(f"  [PASS] DB OK -- {count:,} transactions, {profiles:,} account profiles")
    except Exception as e:
        print(f"  [FAIL] DB FAILED: {e}")
        all_pass = False

    # 3. Graph engine
    print("\n[3/3] Verifying graph engine...")
    try:
        import pandas as pd
        from graph.fund_flow import FundFlowGraph
        conn = sqlite3.connect(db_path)
        df = pd.read_sql_query("SELECT * FROM transactions LIMIT 1000", conn)
        conn.close()
        ffg = FundFlowGraph()
        ffg.build_from_df(df)
        stats = ffg.get_graph_stats()
        print(f"  [PASS] Graph OK -- {stats['total_nodes']} nodes, {stats['total_edges']} edges")
    except Exception as e:
        print(f"  [FAIL] Graph FAILED: {e}")
        all_pass = False

    print("\n" + "=" * 60)
    print(f"  {'[ALL PASS]' if all_pass else '[SOME FAILED]'}")
    print("=" * 60 + "\n")
    return all_pass


def ingest_rag():
    """Run the RAG corpus ingestion pipeline."""
    print("\nRunning RAG ingestion...")
    from rag.ingest import ingest_corpus
    ingest_corpus()


def start_console():
    """Launch the Streamlit investigation console."""
    console_path = os.path.join(ROOT, "console", "app.py")
    print(f"\nStarting Sentinel AI console at http://localhost:8501")
    subprocess.run([
        sys.executable, "-m", "streamlit", "run", console_path,
        "--server.port", "8501",
        "--server.headless", "false",
        "--browser.gatherUsageStats", "false",
    ])


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sentinel AI PS6 Runner")
    parser.add_argument("--verify", action="store_true", help="Verify components only")
    parser.add_argument("--ingest", action="store_true", help="Ingest RAG corpus only")
    args = parser.parse_args()

    if args.verify:
        sys.exit(0 if verify_components() else 1)
    elif args.ingest:
        ingest_rag()
    else:
        ok = verify_components()
        if not ok:
            print("[WARN] Some components failed. Console may not work fully.")
        start_console()
