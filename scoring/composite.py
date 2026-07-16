"""
FundFlow AI — 6-Layer Composite Risk Engine
============================================
Mirrors the competitor's architecture but runs INSIDE our FastAPI stack
using data we already have — no extra infrastructure needed.

Formula:  CompositeScore = 0.7 × max(L1..L6) + 0.3 × weighted_avg(L1..L6)

This ensures: if ANY single layer fires at 0.99, the final score cannot
drop below 0.693 regardless of other layers — a protection against
benign signals diluting a critical one.

Integrated into POST /api/gateway as a second-pass score.
effectiveScore = max(mlScore, compositeScore)
"""

from __future__ import annotations
from typing import Optional
import math


# ── Layer weights (must sum to 1.0) ──────────────────────────────────────────
_WEIGHTS = {
    "L1_location":   0.12,
    "L2_channel":    0.10,
    "L3_behavioral": 0.18,
    "L4_ml":         0.35,   # highest — XGBoost is the anchor
    "L5_network":    0.15,
    "L6_velocity":   0.10,
}

# ── Channel risk table (India-specific) ──────────────────────────────────────
_CHANNEL_RISK = {
    "ATM":         0.55,
    "CASH":        0.55,
    "UPI":         0.25,
    "IMPS":        0.22,
    "RTGS":        0.20,
    "NEFT":        0.18,
    "NET_BANKING": 0.15,
}


def compute_composite_score(
    txn: dict,
    features: dict,
    ml_prob: float,
    account_history=None,   # pd.DataFrame | None
    graph_features: Optional[dict] = None,
    india_extras: Optional[dict] = None,
) -> dict:
    """
    Compute the 6-layer composite risk score for a transaction.

    Returns a dict with:
        composite_score  : float [0, 1]
        effective_score  : float — max(ml_prob, composite_score)
        layers           : dict  — individual layer scores and labels
        dominant_layer   : str   — which layer drove the score highest
    """
    gf = graph_features or {}
    ie = india_extras or {}

    sender   = txn.get("sender_account", "")
    receiver = txn.get("receiver_account", "")
    amount   = float(txn.get("amount", 0))
    txn_type = str(txn.get("txn_type", "")).upper()

    # ── LAYER 1: Location Anomaly (weight 0.12) ──────────────────────────────
    l1 = 0.0
    sender_bank   = _bank_id(sender)
    receiver_bank = _bank_id(receiver)
    if sender_bank != receiver_bank:
        l1 += 0.10   # Cross-bank transfer
    sender_info  = ie.get(sender, {})
    if sender_info.get("cooperative_bank") or sender_info.get("gramin_bank"):
        l1 += 0.25   # Cooperative/rural bank — higher fraud rate
    risk_score_sender = float(gf.get(sender, {}).get("mule_score", 0) or 0)
    l1 += min(risk_score_sender * 0.20, 0.20)   # Elevated account risk
    l1 = min(l1, 1.0)

    # ── LAYER 2: Channel Trust (weight 0.10) ─────────────────────────────────
    l2 = _CHANNEL_RISK.get(txn_type, 0.20)

    # ── LAYER 3: Behavioral Pattern (weight 0.18) ────────────────────────────
    l3 = 0.0
    sender_acct_age = int(sender_info.get("account_age_days", 365))
    if sender_acct_age < 30:
        l3 = max(l3, 0.35)   # New account

    sender_avg = float(features.get("sender_avg_amount", 0) or amount)
    if sender_avg > 0:
        ratio = amount / sender_avg
        if   ratio >= 20: l3 = max(l3, 0.95)
        elif ratio >= 10: l3 = max(l3, 0.85)
        elif ratio >= 5:  l3 = max(l3, 0.70)
        elif ratio >= 3:  l3 = max(l3, 0.55)
        elif ratio >= 1.5:l3 = max(l3, 0.30)

    # PMLA structuring thresholds
    if 45000 <= amount <= 49999:
        l3 = max(l3, 0.60)   # Just below ₹50K reporting threshold
    if 900000 <= amount <= 999999:
        l3 = max(l3, 0.65)   # Just below ₹10L reporting threshold

    # ── LAYER 4: ML Probability (weight 0.35) ────────────────────────────────
    l4 = float(ml_prob)      # Raw XGBoost output — no modification

    # ── LAYER 5: Network / Graph (weight 0.15) ───────────────────────────────
    l5 = 0.0
    sender_gf   = gf.get(sender, {})
    receiver_gf = gf.get(receiver, {})

    if sender_gf.get("ring_id") or receiver_gf.get("ring_id"):
        l5 = max(l5, 0.85)   # Ring member
    if sender_gf.get("chain_id") or receiver_gf.get("chain_id"):
        l5 = max(l5, 0.65)   # Chain member
    mule_s = float(sender_gf.get("mule_score", 0) or 0)
    mule_r = float(receiver_gf.get("mule_score", 0) or 0)
    if mule_s > 0.5: l5 = max(l5, 0.75)
    if mule_r > 0.5: l5 = max(l5, 0.60)
    # High fan-out (many-to-one) indicates mule aggregation
    fan_out = float(sender_gf.get("fan_out_ratio", 0) or 0)
    if fan_out > 5:  l5 = max(l5, 0.80)
    l5 = min(l5, 1.0)

    # ── LAYER 6: Velocity Burst (weight 0.10) ────────────────────────────────
    l6 = 0.0
    txn_count_1h = int(features.get("sender_txn_count_1h", 0) or 0)
    if   txn_count_1h >= 8: l6 = 0.95
    elif txn_count_1h >= 5: l6 = 0.80
    elif txn_count_1h >= 3: l6 = 0.65

    txn_count_24h = int(features.get("sender_txn_count_24h", 0) or 0)
    if txn_count_24h >= 15:
        l6 = max(l6, 0.55)

    # ── Composite formula ─────────────────────────────────────────────────────
    layers = {
        "L1_location":   round(l1, 4),
        "L2_channel":    round(l2, 4),
        "L3_behavioral": round(l3, 4),
        "L4_ml":         round(l4, 4),
        "L5_network":    round(l5, 4),
        "L6_velocity":   round(l6, 4),
    }

    max_score      = max(layers.values())
    weighted_avg   = sum(layers[k] * _WEIGHTS[k] for k in layers)
    composite      = round(0.7 * max_score + 0.3 * weighted_avg, 4)
    effective      = round(max(ml_prob, composite), 4)

    dominant_layer = max(layers, key=layers.get)
    dominant_label = {
        "L1_location":   "Location Anomaly",
        "L2_channel":    "Channel Risk",
        "L3_behavioral": "Behavioral Pattern",
        "L4_ml":         "ML Model",
        "L5_network":    "Network Graph",
        "L6_velocity":   "Velocity Burst",
    }[dominant_layer]

    return {
        "composite_score":  composite,
        "effective_score":  effective,
        "dominant_layer":   dominant_layer,
        "dominant_label":   dominant_label,
        "layers":           layers,
        "weights":          _WEIGHTS,
        "formula":          f"0.7 × {max_score:.3f} (max) + 0.3 × {weighted_avg:.3f} (weighted_avg) = {composite:.3f}",
    }


def _bank_id(account_id: str) -> str:
    """Extract a pseudo-bank prefix from account ID for cross-bank detection."""
    if not account_id:
        return ""
    # M-prefix = merchant / different institution
    if account_id.startswith("M"):
        return "MERCHANT"
    # Use first 3 chars as a weak proxy (same as features/engineering.py)
    return account_id[:3]
