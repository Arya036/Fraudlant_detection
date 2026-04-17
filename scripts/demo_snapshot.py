"""
FundFlow AI — Demo Snapshot Generator
Prints live, data-driven demo anchors so presentations avoid hardcoded IDs.

Run:
  python scripts/demo_snapshot.py
"""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[1] / "fundflow.db"


def main() -> None:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    print("=" * 64)
    print("FundFlow AI Demo Snapshot")
    print("=" * 64)

    totals = conn.execute(
        """
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN is_fraud = 1 THEN 1 ELSE 0 END) AS fraud_rows,
               SUM(CASE WHEN COALESCE(fraud_probability, 0) >= 0.7 THEN 1 ELSE 0 END) AS flagged_rows
        FROM transactions
        """
    ).fetchone()
    print(f"Transactions: {totals['total']:,}")
    print(f"Labeled fraud rows: {totals['fraud_rows']:,}")
    print(f"Flagged rows (>=0.7): {totals['flagged_rows']:,}")
    print("-" * 64)

    print("Top accounts for Fund Flow Explorer:")
    top_accounts = conn.execute(
        """
        SELECT sender_account,
               COUNT(*) AS txn_count,
               MAX(COALESCE(fraud_probability, 0)) AS max_prob,
               SUM(amount) AS total_amount
        FROM transactions
        WHERE COALESCE(fraud_probability, 0) >= 0.7
        GROUP BY sender_account
        HAVING COUNT(*) >= 3
        ORDER BY max_prob DESC, txn_count DESC
        LIMIT 5
        """
    ).fetchall()
    for row in top_accounts:
        print(
            f"  - {row['sender_account']} | txns={row['txn_count']} | "
            f"max_prob={row['max_prob']:.3f} | total=Rs.{row['total_amount']:,.0f}"
        )

    print("-" * 64)
    print("Top open alerts:")
    alerts = conn.execute(
        """
        SELECT alert_id, alert_type, severity, total_amount, risk_score
        FROM alerts
        ORDER BY risk_score DESC, timestamp DESC
        LIMIT 5
        """
    ).fetchall()
    for row in alerts:
        print(
            f"  - {row['alert_id']} | {row['alert_type']} | {row['severity']} | "
            f"amt=Rs.{(row['total_amount'] or 0):,.0f} | score={(row['risk_score'] or 0):.3f}"
        )

    print("-" * 64)
    print("Top investigation cases:")
    cases = conn.execute(
        """
        SELECT case_id, status, priority, total_exposure
        FROM cases
        ORDER BY created_at DESC
        LIMIT 5
        """
    ).fetchall()
    for row in cases:
        print(
            f"  - {row['case_id']} | {row['status']} | {row['priority']} | "
            f"exposure=Rs.{(row['total_exposure'] or 0):,.0f}"
        )

    conn.close()
    print("=" * 64)


if __name__ == "__main__":
    main()
