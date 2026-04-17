"""
FundFlow AI — Demo Test Pack Helper
Prints concrete anchors for the 3-case demo rehearsal pack.

Run:
  python scripts/demo_test_pack.py
"""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[1] / "fundflow.db"
UPLOAD_SAMPLE = Path(__file__).resolve().parents[1] / "data" / "raw" / "demo_upload_sample.csv"


def main() -> None:
    if not DB_PATH.exists():
        print(f"DB not found: {DB_PATH}")
        print("Run setup_and_run.py or loader/training pipeline first.")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    print("=" * 70)
    print("FundFlow AI — Demo Test Pack Anchors")
    print("=" * 70)

    top_account = conn.execute(
        """
        SELECT sender_account,
               COUNT(*) AS txn_count,
               MAX(COALESCE(fraud_probability, 0)) AS max_prob
        FROM transactions
        WHERE COALESCE(fraud_probability, 0) >= 0.7
        GROUP BY sender_account
        ORDER BY max_prob DESC, txn_count DESC
        LIMIT 1
        """
    ).fetchone()

    top_txn = conn.execute(
        """
        SELECT txn_id, sender_account, receiver_account, amount, txn_type,
               COALESCE(fraud_probability, 0) AS fraud_probability
        FROM transactions
        ORDER BY fraud_probability DESC, timestamp DESC
        LIMIT 1
        """
    ).fetchone()

    alert_count = conn.execute(
        "SELECT COUNT(*) AS n FROM alerts"
    ).fetchone()["n"]

    print("[Case 1] Live Stream + Live Alerts")
    if top_account:
        print(
            f"  Suggested account to trace after stream: {top_account['sender_account']} "
            f"(txns={top_account['txn_count']}, max_prob={top_account['max_prob']:.3f})"
        )
    else:
        print("  No high-risk sender found yet.")

    print("[Case 2] Manual Score + Explain")
    if top_txn:
        print(f"  Suggested txn for Why? explain: {top_txn['txn_id']}")
        print(
            f"  Sender={top_txn['sender_account']} Receiver={top_txn['receiver_account']} "
            f"Amount={top_txn['amount']:.2f} Type={top_txn['txn_type']} "
            f"Prob={top_txn['fraud_probability']:.3f}"
        )
    else:
        print("  No transaction found in DB.")

    print("[Case 3] Upload Mapping")
    print(f"  Sample file ready: {UPLOAD_SAMPLE.exists()} -> {UPLOAD_SAMPLE}")

    print("-" * 70)
    print(f"Current alerts in DB: {alert_count}")
    print("Checklist file: DEMO_TEST_CASES.md")
    print("=" * 70)

    conn.close()


if __name__ == "__main__":
    main()
