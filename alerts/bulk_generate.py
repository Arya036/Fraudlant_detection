"""
FundFlow AI — Bulk Alert Generation
Scans DB for high-risk transactions and creates alerts.
Run after update_db_scores.py
"""
import sys
import os
import json
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from alerts.generator import generate_high_risk_alert
from ingestion.loader import get_db_connection


def _generate_graph_alerts(conn, ring_limit: int = 10, mule_limit: int = 20) -> int:
    """
    Generate ring/mule alerts from real scored transactions instead of hardcoded demos.
    Uses a bounded suspicious subset to keep alert generation fast.
    """
    from graph.fund_flow import FundFlowGraph
    from graph.ring_detector import find_cycles
    from graph.mule_detector import compute_mule_scores
    from alerts.generator import generate_ring_alert, generate_mule_alert

    rows = conn.execute("""
        SELECT txn_id, sender_account, receiver_account, amount,
               timestamp, is_fraud, txn_type, step,
               COALESCE(fraud_probability, 0.0) as fraud_probability
        FROM transactions
        WHERE COALESCE(fraud_probability, 0) >= 0.6 OR is_fraud = 1
        ORDER BY timestamp DESC
        LIMIT 15000
    """).fetchall()

    if not rows:
        print("  No suspicious rows available for ring/mule alert generation.")
        return 0

    df = pd.DataFrame([dict(r) for r in rows])
    graph = FundFlowGraph().build_from_df(df)

    added = 0

    # Ring alerts from detected graph cycles
    rings = find_cycles(graph.G, max_length=5, time_window_hours=24)
    for ring in rings[:ring_limit]:
        if ring.get('risk_score', 0) >= 0.6:
            generate_ring_alert(ring, db_conn=conn)
            added += 1

    # Mule alerts from computed mule scores
    mule_df = compute_mule_scores(graph.G, df)
    if len(mule_df) > 0:
        suspects = mule_df[mule_df['is_suspected_mule'] == 1].head(mule_limit)
        for _, row in suspects.iterrows():
            generate_mule_alert(row.to_dict(), db_conn=conn)
            added += 1

    return added


def generate_bulk_alerts(threshold: float = 0.75, limit: int = 200):
    print("=" * 60)
    print("  FundFlow AI — Bulk Alert Generation")
    print("=" * 60)

    conn = get_db_connection()

    # Clear old alerts
    conn.execute("DELETE FROM alerts")
    conn.commit()

    # Fetch high-risk transactions
    rows = conn.execute(f"""
        SELECT * FROM transactions
        WHERE COALESCE(fraud_probability, 0) >= {threshold}
        ORDER BY fraud_probability DESC
        LIMIT {limit}
    """).fetchall()

    print(f"\nFound {len(rows)} high-risk transactions (prob >= {threshold})")

    alert_count = 0
    for row in rows:
        txn = dict(row)
        risk = float(txn.get('fraud_probability') or 0)
        generate_high_risk_alert(txn, risk, db_conn=conn)
        alert_count += 1

    print("Generating graph-derived ring and mule alerts...")
    graph_alerts = _generate_graph_alerts(conn)
    alert_count += graph_alerts
    print(f"  Added {graph_alerts} ring/mule alerts from live graph analysis.")

    conn.close()
    print(f"\nGenerated {alert_count} alerts total.")
    print("=" * 60)


def create_demo_cases():
    """Create a few demo investigation cases for the dashboard."""
    print("\nCreating demo investigation cases...")
    conn = get_db_connection()

    # Fetch first few alerts
    alerts = conn.execute(
        "SELECT * FROM alerts ORDER BY risk_score DESC LIMIT 3"
    ).fetchall()

    from investigation.case_manager import create_case
    from alerts.generator import create_alert

    case_count = 0
    for alert_row in alerts:
        alert = dict(alert_row)
        for f in ('accounts_involved', 'evidence'):
            if alert.get(f):
                try: alert[f] = json.loads(alert[f])
                except: pass
        create_case(alert, assigned_to="investigator_01", db_conn=conn)
        case_count += 1

    conn.close()
    print(f"  Created {case_count} demo cases.")


if __name__ == "__main__":
    generate_bulk_alerts()
    create_demo_cases()
