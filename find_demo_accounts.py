"""Find best demo accounts from the database."""
import sys, sqlite3, json
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

conn = sqlite3.connect("e:/PS6/fundflow.db")

print("=== TOP SUSPICIOUS ACCOUNTS (most fraud-flagged transactions) ===")
rows = conn.execute("""
    SELECT sender_account, COUNT(*) as total_txns,
           SUM(is_fraud) as fraud_count,
           MAX(fraud_probability) as max_prob,
           MAX(risk_tier) as tier
    FROM transactions
    WHERE is_fraud = 1
    GROUP BY sender_account
    ORDER BY fraud_count DESC, max_prob DESC
    LIMIT 10
""").fetchall()
for r in rows:
    print(f"  {r[0]} | txns={r[1]} | fraud={r[2]} | max_prob={r[3]:.3f} | tier={r[4]}")

print()
print("=== ACCOUNTS IN CRITICAL ALERTS ===")
alerts = conn.execute("""
    SELECT alert_id, alert_type, severity, accounts_involved, total_amount
    FROM alerts
    WHERE severity IN ('CRITICAL','HIGH')
    ORDER BY total_amount DESC
    LIMIT 8
""").fetchall()
for a in alerts:
    accts = json.loads(a[3]) if a[3] else []
    print(f"  [{a[2]}] {a[0]} | {a[1]} | amt={a[4]:.0f} | accounts={accts[:3]}")

conn.close()
print("\nDone.")
