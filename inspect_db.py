import sqlite3

conn = sqlite3.connect("fundflow.db")
cursor = conn.cursor()

tables = cursor.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
print("TABLES IN fundflow.db")
print("=" * 60)
for (table,) in tables:
    count = cursor.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
    cols = [c[1] for c in cursor.execute(f"PRAGMA table_info({table})").fetchall()]
    print(f"\n  TABLE : {table}")
    print(f"  ROWS  : {count:,}")
    print(f"  COLS  : {cols}")

print("\n\nSAMPLE ROWS")
print("=" * 60)

# Transactions sample
print("\ntransactions (3 rows):")
rows = cursor.execute("SELECT * FROM transactions LIMIT 3").fetchall()
cols = [c[1] for c in cursor.execute("PRAGMA table_info(transactions)").fetchall()]
print("  Columns:", cols)
for r in rows:
    print(" ", dict(zip(cols, r)))

# Alerts sample
print("\nalerts (2 rows):")
rows = cursor.execute("SELECT * FROM alerts LIMIT 2").fetchall()
cols = [c[1] for c in cursor.execute("PRAGMA table_info(alerts)").fetchall()]
print("  Columns:", cols)
for r in rows:
    print(" ", dict(zip(cols, r)))

# Cases sample
print("\ncases (2 rows):")
rows = cursor.execute("SELECT * FROM cases LIMIT 2").fetchall()
cols = [c[1] for c in cursor.execute("PRAGMA table_info(cases)").fetchall()]
print("  Columns:", cols)
for r in rows:
    print(" ", dict(zip(cols, r)))

conn.close()
