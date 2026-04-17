import sqlite3
conn = sqlite3.connect('fundflow.db')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

rows = cursor.execute("""
    SELECT sender_account, COUNT(*) as fraud_count, SUM(amount) as total_amount
    FROM transactions
    WHERE is_fraud = 1
    GROUP BY sender_account
    ORDER BY fraud_count DESC
    LIMIT 10
""").fetchall()

print("Top Fraudulent Sender Accounts:")
for r in rows:
    acct = r["sender_account"]
    cnt = r["fraud_count"]
    amt = r["total_amount"]
    print(f"  {acct}  |  {cnt} fraud txns  |  Rs {amt:,.0f}")

conn.close()
