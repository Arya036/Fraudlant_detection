"""
agent/tools.py — Sentinel AI Agent Tools
=========================================
Five callable tools for the LangGraph agent:
  1. get_transaction_history  — SQL query over fundflow.db
  2. get_transaction_graph    — NetworkX ego-subgraph (SQL-built, never pre-truncated)
  3. score_risk               — FundFlow XGBoost + SHAP
  4. search_regulations       — RAG over FATF/FinCEN/RBI corpus
  5. detect_typology          — Pattern-based AML detector

Graph design note:
  We do NOT maintain a global pre-truncated graph. A global 10K-row slice is brittle:
  if the subject account's transactions aren't in that slice, the ego-graph silently
  comes back empty and we under-report. Instead every graph tool call queries the DB
  directly for the account's 2-hop neighborhood and builds a fresh small graph.
  This is always correct regardless of account position in the database.

AML typology note:
  Transaction amounts are PaySim synthetic units, NOT INR.
  Structuring detection uses pattern-based analysis (clustering relative to the
  account's own amount distribution) rather than absolute INR PMLA thresholds,
  which would be meaningless on this dataset. Absolute regulatory thresholds should
  be applied in production against real currency amounts.
"""

import os
import sys
import json
import sqlite3
import logging
from typing import Optional

import pandas as pd
from langchain_core.tools import tool

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# ── Path setup so FundFlow imports resolve from PS6 root ──────────────────────
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from models.predictor import predict_single
from graph.fund_flow import FundFlowGraph
from graph.mule_detector import compute_mule_scores
from graph.ring_detector import find_cycles

logger = logging.getLogger(__name__)

# ── DB path ───────────────────────────────────────────────────────────────────
DB_PATH = os.environ.get("PS6_DB_PATH", os.path.join(ROOT, "fundflow.db"))


# ─────────────────────────────────────────────────────────────────────────────
# GRAPH HELPER — SQL-based ego-subgraph (replaces the broken global slice)
# ─────────────────────────────────────────────────────────────────────────────

def _build_account_ego_graph(
    account_id: str,
    hop2_limit: int = 3000,
) -> tuple[Optional[FundFlowGraph], Optional[pd.DataFrame]]:
    """
    Build a 2-hop ego-subgraph for account_id by direct SQL queries.

    Why not a global graph?
      A pre-truncated global graph (e.g. LIMIT 10000) silently gives wrong results
      if the account's transactions don't appear in that slice. This function always
      queries the full DB for the relevant neighborhood — correct for any account.

    Hop 1: ALL transactions directly involving account_id (no limit — account's
            own history is the signal we care about).
    Hop 2: Transactions among hop-1 counterparties, limited to `hop2_limit` rows
            to prevent explosion on highly-connected hub accounts.

    Returns:
        (ffg, combined_df) or (None, None) if account has no transactions.
    """
    conn = sqlite3.connect(DB_PATH)

    # Hop 1 — all direct transactions
    hop1_df = pd.read_sql_query(
        """
        SELECT * FROM transactions
        WHERE sender_account = ? OR receiver_account = ?
        ORDER BY timestamp
        """,
        conn, params=(account_id, account_id),
    )

    if hop1_df.empty:
        conn.close()
        return None, None

    # Hop-1 counterparties (excluding subject account itself)
    hop1_neighbors = (
        set(hop1_df["sender_account"].tolist())
        | set(hop1_df["receiver_account"].tolist())
    ) - {account_id}

    if not hop1_neighbors:
        conn.close()
        ffg = FundFlowGraph()
        ffg.build_from_df(hop1_df)
        return ffg, hop1_df

    # Hop 2 — transactions among hop-1 counterparties (bounded)
    placeholders = ",".join(["?" for _ in hop1_neighbors])
    hop2_df = pd.read_sql_query(
        f"""
        SELECT * FROM transactions
        WHERE (sender_account IN ({placeholders}) OR receiver_account IN ({placeholders}))
          AND sender_account != ? AND receiver_account != ?
        ORDER BY timestamp
        LIMIT {hop2_limit}
        """,
        conn,
        params=list(hop1_neighbors) + list(hop1_neighbors) + [account_id, account_id],
    )
    conn.close()

    combined = pd.concat([hop1_df, hop2_df]).drop_duplicates("txn_id")
    logger.info(
        "Ego-graph for %s: hop1=%d, hop2=%d, total=%d rows",
        account_id, len(hop1_df), len(hop2_df), len(combined),
    )

    ffg = FundFlowGraph()
    ffg.build_from_df(combined)
    return ffg, combined


# ─────────────────────────────────────────────────────────────────────────────
# TOOL 1 — get_transaction_history
# ─────────────────────────────────────────────────────────────────────────────
@tool
def get_transaction_history(account_id: str, limit: int = 50) -> str:
    """
    Fetch the last N transactions for a given account ID from the database.
    Returns a JSON string with transaction list and summary statistics.

    Args:
        account_id: The account ID to look up (e.g. 'C1828508781').
        limit: Maximum number of transactions to return (default 50).
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        df = pd.read_sql_query(
            """
            SELECT txn_id, timestamp, sender_account, receiver_account,
                   amount, txn_type, channel, risk_tier, fraud_probability,
                   is_fraud, sender_branch, receiver_branch
            FROM transactions
            WHERE sender_account = ? OR receiver_account = ?
            ORDER BY timestamp DESC
            LIMIT ?
            """,
            conn,
            params=(account_id, account_id, limit),
        )
        conn.close()

        if df.empty:
            return json.dumps({"error": f"No transactions found for account {account_id}"})

        sent_df = df[df["sender_account"] == account_id]
        recv_df = df[df["receiver_account"] == account_id]

        summary = {
            "account_id": account_id,
            "total_transactions": len(df),
            "transactions_sent": len(sent_df),
            "transactions_received": len(recv_df),
            "total_amount_sent": round(float(sent_df["amount"].sum()), 2),
            "total_amount_received": round(float(recv_df["amount"].sum()), 2),
            "avg_amount": round(float(df["amount"].mean()), 2),
            "max_amount": round(float(df["amount"].max()), 2),
            "fraud_flagged_count": int(df["is_fraud"].sum()),
            "high_risk_count": int((df["risk_tier"].isin(["HIGH", "CRITICAL"])).sum()),
            "date_range": {
                "earliest": str(df["timestamp"].min()),
                "latest": str(df["timestamp"].max()),
            },
            "txn_type_breakdown": df["txn_type"].value_counts().to_dict(),
            "data_note": "Amounts are in PaySim synthetic units (not INR). Dataset is synthetic.",
        }

        transactions = df.to_dict(orient="records")
        return json.dumps({"summary": summary, "transactions": transactions}, default=str)

    except Exception as e:
        logger.exception("get_transaction_history failed")
        return json.dumps({"error": str(e)})


# ─────────────────────────────────────────────────────────────────────────────
# TOOL 2 — get_transaction_graph
# ─────────────────────────────────────────────────────────────────────────────
@tool
def get_transaction_graph(account_id: str, max_hops: int = 4) -> str:
    """
    Trace fund flows from a given account using a SQL-built ego-subgraph.
    Returns connected accounts, mule scores, ring membership, and graph profile.

    The graph is constructed via direct SQL queries (2-hop neighborhood) so results
    are always correct regardless of the account's position in the database.

    Args:
        account_id: Starting account for graph traversal.
        max_hops: Maximum number of hops to follow in fund-flow trace (default 4).
    """
    try:
        ffg, combined_df = _build_account_ego_graph(account_id)
        if ffg is None:
            return json.dumps({"error": f"No transactions found for account {account_id}"})

        # Fund flow trace within the ego-graph
        flow = ffg.trace_fund_flow(account_id, max_hops=max_hops, time_window_hours=48)

        # Account profile
        profile = ffg.get_account_profile(account_id)

        # Mule score
        mule_df = compute_mule_scores(ffg.G, combined_df)
        mule_row = mule_df[mule_df["account"] == account_id]
        mule_score = float(mule_row["mule_score"].values[0]) if len(mule_row) > 0 else 0.0
        is_mule = bool(mule_row["is_suspected_mule"].values[0]) if len(mule_row) > 0 else False

        # Ring detection on the ego-graph (small — always fast)
        rings = find_cycles(ffg.G, max_length=5, time_window_hours=48)
        account_rings = [r for r in rings if account_id in r.get("accounts", [])]

        result = {
            "account_id": account_id,
            "graph_profile": profile,
            "mule_score": round(mule_score, 4),
            "is_suspected_mule": is_mule,
            "in_ring": len(account_rings) > 0,
            "ring_count": len(account_rings),
            "ring_ids": [r["ring_id"] for r in account_rings],
            "fund_flow_summary": flow.get("summary", {}),
            "connected_nodes": flow.get("nodes", [])[:30],
            "fraud_edges": [
                e for e in flow.get("edges", []) if e.get("fraud_prob", 0) > 0.5
            ][:10],
            "ego_graph_size": {
                "nodes": ffg.get_graph_stats().get("total_nodes", 0),
                "edges": ffg.get_graph_stats().get("total_edges", 0),
            },
        }
        return json.dumps(result, default=str)

    except Exception as e:
        logger.exception("get_transaction_graph failed")
        return json.dumps({"error": str(e)})


# ─────────────────────────────────────────────────────────────────────────────
# TOOL 3 — score_risk
# ─────────────────────────────────────────────────────────────────────────────
@tool
def score_risk(account_id: str, transaction: dict) -> str:
    """
    Score a transaction for fraud risk using the FundFlow XGBoost model.
    Returns fraud probability, risk tier, and top SHAP feature drivers.

    Args:
        account_id: Sender account ID for fetching behavioral history.
        transaction: Dict with keys: amount, txn_type, channel, timestamp,
                     sender_account, receiver_account (all optional except amount).
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        history = pd.read_sql_query(
            "SELECT * FROM transactions WHERE sender_account = ? ORDER BY timestamp DESC LIMIT 50",
            conn, params=(account_id,),
        )
        conn.close()

        result = predict_single(
            txn=transaction,
            account_history=history if len(history) > 0 else None,
            graph_features=None,  # MVP: graph features not passed (defaults to 0)
            india_extras=None,
        )

        return json.dumps({
            "account_id": account_id,
            "fraud_probability": round(result["fraud_probability"], 4),
            "fraud_label": result["fraud_label"],
            "risk_tier": result["risk_tier"],
            "decision_threshold": result["decision_threshold"],
            "top_features": result["top_features"][:5],
            "interpretation": (
                f"XGBoost risk tier {result['risk_tier']} "
                f"(fraud_probability={result['fraud_probability']:.3f}). "
                f"Primary SHAP drivers: "
                + ", ".join(
                    f"{f['feature']} ({f['contribution']:+.3f})"
                    for f in result["top_features"][:3]
                )
            ),
            "model_note": "Model trained on PaySim synthetic data. Graph features disabled in MVP (all default 0).",
        }, default=str)

    except Exception as e:
        logger.exception("score_risk failed")
        return json.dumps({"error": str(e)})


# ─────────────────────────────────────────────────────────────────────────────
# TOOL 4 — search_regulations
# ─────────────────────────────────────────────────────────────────────────────
@tool
def search_regulations(query: str, top_k: int = 3) -> str:
    """
    Search the FATF/FinCEN/RBI regulatory corpus using semantic RAG retrieval.
    Returns top-k passages with document source and page citation.

    Args:
        query: Natural language search query (e.g. 'structuring transactions PMLA threshold').
        top_k: Number of passages to retrieve (default 3).
    """
    try:
        from rag.retriever import retrieve_regulations
        results = retrieve_regulations(query, top_k=top_k)
        return json.dumps(results, default=str)
    except Exception as e:
        if "not ingested" in str(e).lower() or "does not exist" in str(e).lower() or "InvalidCollectionException" in type(e).__name__:
            return json.dumps({
                "warning": "RAG corpus not yet ingested. Run `python run_ps6.py --ingest` first.",
                "query": query,
                "results": [],
            })
        logger.exception("search_regulations failed")
        return json.dumps({"error": str(e)})


# ─────────────────────────────────────────────────────────────────────────────
# TOOL 5 — detect_typology
# ─────────────────────────────────────────────────────────────────────────────
@tool
def detect_typology(account_id: str) -> str:
    """
    Detect AML typologies for a given account: structuring (pattern-based),
    velocity bursts, smurfing (fan-in), and round-tripping (circular flows).

    NOTE: Transaction amounts are PaySim synthetic units, NOT INR.
    Structuring detection uses relative pattern analysis (clustering near the
    account's own ceiling) rather than fixed INR PMLA thresholds, which would be
    meaningless on this synthetic dataset. Apply institution-specific currency
    thresholds in production.

    Args:
        account_id: The account to analyze for typology patterns.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        df = pd.read_sql_query(
            """
            SELECT * FROM transactions
            WHERE sender_account = ? OR receiver_account = ?
            ORDER BY timestamp
            """,
            conn, params=(account_id, account_id),
        )
        conn.close()

        if df.empty:
            return json.dumps({
                "account_id": account_id,
                "typologies": [],
                "summary": "No transactions found.",
            })

        typologies = []
        sent = df[df["sender_account"] == account_id]

        # ── Structuring (pattern-based, dataset-agnostic) ─────────────────────
        # We detect clustering just below the account's own ceiling amount.
        # This is equivalent to the behavioral signal (deliberate sub-threshold
        # avoidance) without requiring absolute INR amounts.
        # In production: replace ceiling with actual regulatory thresholds (e.g.
        # INR 50K, 1L, 10L) applied against real currency amounts.
        if len(sent) >= 3:
            ceiling = float(sent["amount"].max())
            if ceiling > 0:
                low, high = ceiling * 0.80, ceiling * 0.995
                near_ceiling = sent[(sent["amount"] >= low) & (sent["amount"] < high)]
                if len(near_ceiling) >= 3:
                    typologies.append({
                        "type": "STRUCTURING_PATTERN",
                        "description": (
                            f"{len(near_ceiling)} transactions clustered at 80-99% of "
                            f"account ceiling ({ceiling:,.0f} synthetic units). "
                            f"Pattern consistent with deliberate sub-threshold avoidance. "
                            f"[Note: amounts are PaySim synthetic units — apply "
                            f"institution-specific INR thresholds in production]"
                        ),
                        "risk": "HIGH",
                        "evidence_txns": near_ceiling["txn_id"].tolist()[:5],
                    })

        # ── Velocity burst ────────────────────────────────────────────────────
        df_ts = df.copy()
        df_ts["timestamp"] = pd.to_datetime(df_ts["timestamp"])
        df_sorted = df_ts.sort_values("timestamp")
        if len(df_sorted) >= 5:
            window = df_sorted["timestamp"].max() - df_sorted["timestamp"].min()
            hours = max(window.total_seconds() / 3600, 1)
            rate = len(df_sorted) / hours
            if rate > 5:
                typologies.append({
                    "type": "VELOCITY_BURST",
                    "description": (
                        f"{rate:.1f} transactions/hour over {hours:.1f} hours "
                        f"({len(df_sorted)} total transactions)"
                    ),
                    "risk": "HIGH",
                    "evidence_txns": df_sorted["txn_id"].tolist()[:5],
                })

        # ── Graph-based: ring + mule (SQL ego-subgraph — always correct) ──────
        # Uses _build_account_ego_graph which queries the full DB for the
        # account's 2-hop neighborhood. No global pre-truncation.
        try:
            ffg, ego_df = _build_account_ego_graph(account_id)
            if ffg is not None and account_id in ffg.G:
                # Ring detection on the small ego-graph — fast, not exponential
                rings = find_cycles(ffg.G, max_length=5, time_window_hours=48)
                account_rings = [r for r in rings if account_id in r.get("accounts", [])]
                if account_rings:
                    typologies.append({
                        "type": "ROUND_TRIPPING",
                        "description": (
                            f"Circular fund flow: account participates in "
                            f"{len(account_rings)} ring(s) within 48 hours"
                        ),
                        "risk": "CRITICAL",
                        "ring_ids": [r["ring_id"] for r in account_rings],
                    })

                mule_df = compute_mule_scores(ffg.G, ego_df)
                mule_row = mule_df[mule_df["account"] == account_id]
                if len(mule_row) > 0 and float(mule_row["mule_score"].values[0]) >= 0.6:
                    score = float(mule_row["mule_score"].values[0])
                    pass_ratio = float(mule_row["passthrough_ratio"].values[0])
                    typologies.append({
                        "type": "MULE_ACCOUNT",
                        "description": (
                            f"Mule account pattern: mule_score={score:.2f}, "
                            f"passthrough_ratio={pass_ratio:.2f} "
                            f"(ratio near 1.0 = funds received and immediately forwarded)"
                        ),
                        "risk": "CRITICAL",
                    })
        except Exception as eg:
            logger.debug("Graph typology analysis skipped: %s", eg)

        # ── Smurfing: fan-in (many senders → one receiver) ───────────────────
        recv = df[df["receiver_account"] == account_id]
        unique_senders = recv["sender_account"].nunique()
        if unique_senders >= 5 and len(recv) >= 10:
            typologies.append({
                "type": "SMURFING_FAN_IN",
                "description": (
                    f"Fan-in pattern: {unique_senders} unique senders → this account "
                    f"({len(recv)} inbound transactions)"
                ),
                "risk": "HIGH",
            })

        summary = (
            f"Detected {len(typologies)} typology pattern(s) for {account_id}: "
            + (", ".join(t["type"] for t in typologies) if typologies else "None")
        )

        return json.dumps({
            "account_id": account_id,
            "typologies": typologies,
            "summary": summary,
        }, default=str)

    except Exception as e:
        logger.exception("detect_typology failed")
        return json.dumps({"error": str(e)})


# ── Tool registry for agent binding ──────────────────────────────────────────
ALL_TOOLS = [
    get_transaction_history,
    get_transaction_graph,
    score_risk,
    search_regulations,
    detect_typology,
]
