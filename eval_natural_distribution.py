"""
eval_natural_distribution.py
=============================
Evaluates the XGBoost model on the natural class distribution (~0.13% fraud)
using the pre-scored fundflow.db (fraud_probability already stored per row).

This script does NOT require re-running inference — it reads the stored
fraud_probability and is_fraud columns that were written during batch scoring.

Outputs:
  - PR-AUC on natural distribution
  - Precision, Recall, F1 at threshold 0.70
  - Confusion matrix
  - Comparison table: rebalanced vs natural distribution metrics

Run: python eval_natural_distribution.py
"""
import sys
import sqlite3
import numpy as np
import os

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, "e:/PS6")

DB_PATH = os.environ.get("PS6_DB_PATH", "e:/PS6/fundflow.db")
THRESHOLD = 0.70

print("=" * 65)
print("NATURAL DISTRIBUTION EVALUATION")
print("=" * 65)

# ── Load all scored transactions from DB ─────────────────────────────────────
conn = sqlite3.connect(DB_PATH)
# Use all transactions that have both is_fraud and fraud_probability
rows = conn.execute("""
    SELECT is_fraud, fraud_probability
    FROM transactions
    WHERE fraud_probability IS NOT NULL
      AND is_fraud IS NOT NULL
""").fetchall()
conn.close()

y_true = np.array([r[0] for r in rows], dtype=int)
y_prob  = np.array([r[1] for r in rows], dtype=float)

total  = len(y_true)
n_fraud = y_true.sum()
base_rate = n_fraud / total

print(f"\nDataset (natural distribution):")
print(f"  Total transactions : {total:,}")
print(f"  Fraud transactions : {n_fraud:,}")
print(f"  Base rate          : {100*base_rate:.3f}%")

# ── Metrics at threshold 0.70 ─────────────────────────────────────────────────
y_pred = (y_prob >= THRESHOLD).astype(int)
tp = int(((y_pred == 1) & (y_true == 1)).sum())
fp = int(((y_pred == 1) & (y_true == 0)).sum())
fn = int(((y_pred == 0) & (y_true == 1)).sum())
tn = int(((y_pred == 0) & (y_true == 0)).sum())

precision = tp / (tp + fp) if (tp + fp) > 0 else 0
recall    = tp / (tp + fn) if (tp + fn) > 0 else 0
f1        = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
fpr       = fp / (fp + tn) if (fp + tn) > 0 else 0

print(f"\nMetrics at threshold {THRESHOLD} (NATURAL ~{100*base_rate:.2f}% distribution):")
print(f"  True Positives  : {tp:,}  (real fraud caught)")
print(f"  False Positives : {fp:,}  (legit transactions flagged)")
print(f"  False Negatives : {fn:,}  (real fraud missed)")
print(f"  True Negatives  : {tn:,}  (legit correctly passed)")
print(f"  Precision       : {precision:.4f}  ({100*precision:.1f}% of alerts are real fraud)")
print(f"  Recall          : {recall:.4f}  ({100*recall:.1f}% of fraud caught)")
print(f"  F1              : {f1:.4f}")
print(f"  False Pos Rate  : {fpr:.4f}  ({100*fpr:.2f}% of legit transactions flagged)")

# ── PR-AUC (manual trapezoid) ─────────────────────────────────────────────────
try:
    from sklearn.metrics import average_precision_score, roc_auc_score
    pr_auc   = average_precision_score(y_true, y_prob)
    roc_auc  = roc_auc_score(y_true, y_prob)
    print(f"\n  PR-AUC (natural) : {pr_auc:.4f}")
    print(f"  ROC-AUC (natural): {roc_auc:.4f}  (misleading at {100*base_rate:.2f}% — for reference only)")
except ImportError:
    print("  (sklearn not available for PR-AUC — install scikit-learn)")
    pr_auc = None
    roc_auc = None

# ── Comparison table ──────────────────────────────────────────────────────────
print(f"\n{'='*65}")
print("COMPARISON: Rebalanced (1.84%) vs Natural ({:.2f}%) test set".format(100*base_rate))
print(f"{'='*65}")
print(f"{'Metric':<25} {'Rebalanced 1.84%':>18} {'Natural ' + f'{100*base_rate:.2f}' + '%':>18}")
print(f"{'-'*65}")
print(f"{'PR-AUC':<25} {'0.7224':>18} {f'{pr_auc:.4f}' if pr_auc else 'N/A':>18}")
print(f"{'Precision @ 0.70':<25} {'0.2896':>18} {f'{precision:.4f}':>18}")
print(f"{'Recall @ 0.70':<25} {'0.8119':>18} {f'{recall:.4f}':>18}")
print(f"{'F1 @ 0.70':<25} {'0.4269':>18} {f'{f1:.4f}':>18}")
print(f"{'ROC-AUC':<25} {'0.9666':>18} {f'{roc_auc:.4f}' if roc_auc else 'N/A':>18}")
print(f"{'='*65}")
print("\nSave these natural-distribution numbers. Use them instead of apologizing.")
print("Correct framing: 'Evaluated on both distributions. At natural 0.13% rate,")
print(f"  PR-AUC={pr_auc:.4f}, precision={precision:.4f}, recall={recall:.4f}.'")
print("No caveat needed — you measured it.")
