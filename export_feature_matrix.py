"""
FundFlow AI — Export Feature Matrix to CSV
Run this script to generate a viewable CSV of the engineered feature matrix.
Output: data/processed/feature_matrix_sample.csv (first 5000 rows)
        data/processed/feature_matrix_full.csv (all rows — takes ~2 min)
"""
import os, sys
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import PROCESSED_DATA_PATH
from features.engineering import engineer_features, get_feature_columns
from features.graph_features import load_graph_features

SAMPLE_ROWS = 5000
OUTPUT_SAMPLE = os.path.join("data", "processed", "feature_matrix_sample.csv")
OUTPUT_FULL   = os.path.join("data", "processed", "feature_matrix_full.csv")

print("=" * 60)
print("  FundFlow AI — Feature Matrix Export")
print("=" * 60)

# Load India extras if available
india_extras = {}
india_pkl = os.path.join("data", "processed", "india_extras.pkl")
if os.path.exists(india_pkl):
    import pickle
    with open(india_pkl, "rb") as f:
        india_extras = pickle.load(f)
    print(f"  [OK] India extras loaded: {len(india_extras)} accounts")
else:
    print("  [WARN] india_extras.pkl not found — KYC/CIBIL features will be 0")

# Load graph features if available
graph_features = {}
try:
    graph_features = load_graph_features()
    print(f"  [OK] Graph features loaded: {len(graph_features)} accounts")
except Exception as e:
    print(f"  [WARN] Graph features not loaded: {e}")

# ── SAMPLE (5000 rows — fast, good for showing judges) ────────────────────────
print(f"\n[1/2] Generating SAMPLE feature matrix ({SAMPLE_ROWS} rows)...")
df_raw = pd.read_csv(PROCESSED_DATA_PATH, nrows=SAMPLE_ROWS, low_memory=True)
print(f"  Raw shape: {df_raw.shape}")

df_feat = engineer_features(df_raw, graph_features=graph_features, india_extras=india_extras)
feature_cols = get_feature_columns()

# Include key metadata columns alongside features
meta_cols = ['txn_id', 'timestamp', 'sender_account', 'receiver_account',
             'amount', 'txn_type', 'is_fraud']
meta_cols = [c for c in meta_cols if c in df_feat.columns]

export_cols = meta_cols + [c for c in feature_cols if c in df_feat.columns]
df_export = df_feat[export_cols].copy()

df_export.to_csv(OUTPUT_SAMPLE, index=False)
fraud_count = int(df_export['is_fraud'].sum()) if 'is_fraud' in df_export else 0
print(f"  [OK] Sample exported: {len(df_export)} rows, {len(export_cols)} columns")
print(f"  Fraud rows in sample: {fraud_count}")
print(f"  Saved to: {OUTPUT_SAMPLE}")

print(f"\n  Feature columns in matrix:")
for i, col in enumerate(feature_cols, 1):
    print(f"    {i:2}. {col}")

print("\n" + "=" * 60)
print("  DONE. Open the CSV in Excel to show judges.")
print(f"  File: {os.path.abspath(OUTPUT_SAMPLE)}")
print("=" * 60)
