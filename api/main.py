"""
api/main.py — Sentinel AI FastAPI Backend  (HARDENED v1.2)
===========================================================
Exposes the LangGraph agent and tool suite as a REST API.
The React frontend consumes these endpoints.

KEY ARCHITECTURE (why this version is resilient):
    Every structured investigation CARD (account summary, graph intelligence,
    ML risk, SHAP, typologies, citations) is a deterministic DB / engine /
    embedding output — NONE of them need the LLM. The 5 agent tools
    (get_transaction_history, get_transaction_graph, score_risk,
    detect_typology, search_regulations) are all LLM-free.

    So we compute the cards ALWAYS, directly from the tools, independent of the
    agent. The LLM is used only for the STR *prose* (str_draft). If the LLM
    fails (e.g. OpenAI rate limit) the cards still render fully; we just mark
    the narrative unavailable. A rate limit degrades the demo gracefully
    instead of blanking it.

Field mappings below are matched to the ACTUAL return shapes in agent/tools.py.

Run:
    uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
"""

import os
import sys
import json
import sqlite3
import threading
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── Path setup ───────────────────────────────────────────────
ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

try:
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env")
except ImportError:
    pass

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sentinel.api")

DB_PATH     = os.environ.get("PS6_DB_PATH",    str(ROOT / "fundflow.db"))
CHROMA_PATH = os.environ.get("CHROMA_DB_PATH", str(ROOT / "rag" / "vector_store"))

DISCLAIMER = (
    "AI-generated DRAFT for internal compliance use only. NOT court-admissible. "
    "Requires compliance officer review."
)

# ── In-memory job store ───────────────────────────────────────
_jobs: dict[str, dict] = {}
_jobs_lock = threading.Lock()

# ── App setup ───────────────────────────────────────────
app = FastAPI(
    title="Sentinel AI — AML Investigation API",
    description="Autonomous AML investigation platform for PS6 hackathon.",
    version="1.2.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://localhost:5174",
        "http://localhost:3000", "http://localhost:4173",
        "http://127.0.0.1:5173", "http://127.0.0.1:5174",
        "http://127.0.0.1:3000", "http://127.0.0.1:4173",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)


# ── DB helpers ───────────────────────────────────────────
def _get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _db_stats() -> dict:
    try:
        conn = _get_db()
        txns   = conn.execute("SELECT COUNT(*) FROM transactions").fetchone()[0]
        fraud  = conn.execute("SELECT COUNT(*) FROM transactions WHERE is_fraud=1").fetchone()[0]
        alerts = conn.execute("SELECT COUNT(*) FROM alerts").fetchone()[0]
        conn.close()
        fraud_rate = round(100 * fraud / txns, 2) if txns else 0
        return {"transactions": txns, "fraud_labeled": fraud, "alerts": alerts,
                "fraud_rate_pct": fraud_rate,
                "data_note": "Synthetic PaySim dataset. Amounts are synthetic units, not INR."}
    except Exception as e:
        logger.error("DB stats error: %s", e)
        return {"transactions": 0, "fraud_labeled": 0, "alerts": 0, "error": str(e)}


def _chroma_ready() -> bool:
    try:
        import chromadb
        client = chromadb.PersistentClient(path=CHROMA_PATH)
        col = client.get_collection("sentinel_regulations")
        return col.count() > 0
    except Exception:
        return False


def _highest_risk_txn(account_id: str) -> Optional[dict]:
    """Return the account's single highest-risk REAL transaction as a dict shaped
    for score_risk(). This replaces the old score_risk(account_id, {}) call, which
    scored an EMPTY transaction and produced a meaningless probability + SHAP.

    We score the account's most suspicious actual transaction so the ML Risk card
    and SHAP drivers describe something real.
    """
    try:
        conn = _get_db()
        row = conn.execute("""
            SELECT txn_id, timestamp, sender_account, receiver_account,
                   amount, txn_type, channel, fraud_probability, is_fraud
            FROM transactions
            WHERE sender_account = ? OR receiver_account = ?
            ORDER BY is_fraud DESC, fraud_probability DESC, amount DESC
            LIMIT 1
        """, (account_id, account_id)).fetchone()
        conn.close()
    except Exception as e:
        logger.error("_highest_risk_txn failed for %s: %s", account_id, e)
        return None
    if not row:
        return None
    return {
        "txn_id":           row["txn_id"],
        "amount":           row["amount"],
        "txn_type":         row["txn_type"],
        "channel":          row["channel"],
        "timestamp":        row["timestamp"],
        "sender_account":   row["sender_account"],
        "receiver_account": row["receiver_account"],
    }


# ═══════════════════════════════════════════════════════════════
# DETERMINISTIC SECTION BUILDER  (no LLM required)
# ═══════════════════════════════════════════════════════════════

def _load_tool_json(tool_func, *args, **kwargs):
    """Call a tool's underlying .func and parse its JSON string result.
    Returns {} on any failure so one broken tool never blanks the whole card set."""
    try:
        raw = tool_func(*args, **kwargs)
        if isinstance(raw, (dict, list)):
            return raw
        return json.loads(raw)
    except Exception as e:
        logger.error("Tool call failed (%s): %s", getattr(tool_func, "__name__", tool_func), e)
        return {}


def _extract_results(parsed):
    """retrieve_regulations() may return a bare list OR a dict with a 'results' key.
    Handle both so the citations card never crashes on shape."""
    if isinstance(parsed, list):
        return parsed
    if isinstance(parsed, dict):
        return parsed.get("results") or []
    return []


def _pick_number(feature: dict):
    """shap_value if present (even 0.0), else contribution, else 0.0.
    Explicit None checks so a legitimate 0.0 SHAP value is NOT dropped."""
    sv = feature.get("shap_value")
    if sv is None:
        sv = feature.get("contribution")
    if sv is None:
        sv = 0.0
    return sv


def _rag_query_for(typology_types: list) -> str:
    """Finding-driven RAG query. Matches the exact typology 'type' strings emitted
    by detect_typology in agent/tools.py."""
    if "MULE_ACCOUNT" in typology_types:
        return "money mule layering intermediary pass-through accounts"
    if "ROUND_TRIPPING" in typology_types:
        return "circular trading round tripping fund flow loops"
    if "LARGE_VALUE_CLUSTERING" in typology_types:
        return "structuring suspicious transaction threshold avoidance reporting"
    if "SMURFING_FAN_IN" in typology_types:
        return "smurfing structuring fan-in multiple senders single beneficiary"
    if "VELOCITY_BURST" in typology_types:
        return "rapid high velocity transactions monitoring suspicious activity"
    return "general compliance transaction monitoring reporting guidelines"


def _build_sections(account_id: str) -> dict:
    """Build all structured cards directly from the (LLM-free) tools.
    Runs identically whether or not the agent/LLM succeeded — this is the
    resilience guarantee and doubles as demo-mode."""
    from agent.tools import (
        get_transaction_history,
        get_transaction_graph,
        score_risk,
        detect_typology,
        search_regulations,
    )

    # 1. Account Summary ────────────────────────────────────────
    # NOTE: get_transaction_history computes its summary over the rows it fetches
    # (default LIMIT 50). Pass a high limit so totals/sums reflect the FULL history,
    # not just the last 50 transactions.
    hist = _load_tool_json(get_transaction_history.func, account_id, 100000)
    summary = (hist.get("summary") if isinstance(hist, dict) else {}) or {}
    account_summary = {
        "total_transactions":    summary.get("total_transactions"),
        "transactions_sent":     summary.get("transactions_sent"),
        "transactions_received": summary.get("transactions_received"),
        "total_amount_sent":     summary.get("total_amount_sent"),
        "total_amount_received": summary.get("total_amount_received"),
        "avg_amount":            summary.get("avg_amount"),
        "max_amount":            summary.get("max_amount"),
        "fraud_flagged_count":   summary.get("fraud_flagged_count"),
        "high_risk_count":       summary.get("high_risk_count"),
        "date_range":            summary.get("date_range"),
        "txn_type_breakdown":    summary.get("txn_type_breakdown") or {},
    }

    # 2. Graph Intelligence ─────────────────────────────────────
    gdata = _load_tool_json(get_transaction_graph.func, account_id)
    # graph_profile keys come from FundFlowGraph.get_account_profile() — passed
    # through RAW so whatever keys it emits reach the frontend unchanged.
    graph_intelligence = {
        "mule_score":         gdata.get("mule_score"),
        "is_suspected_mule":  gdata.get("is_suspected_mule"),
        "in_ring":            gdata.get("in_ring"),
        "ring_count":         gdata.get("ring_count"),
        "ring_ids":           gdata.get("ring_ids") or [],
        "graph_profile":      gdata.get("graph_profile") or {},
        "connected_nodes":    gdata.get("connected_nodes") or [],
        "fraud_edges":        gdata.get("fraud_edges") or [],
        "fund_flow_summary":  gdata.get("fund_flow_summary") or {},
        "ego_graph_size":     gdata.get("ego_graph_size") or {},
    }

    # 3. ML Risk + SHAP ────────────────────────────────────────
    # Score the account's highest-risk REAL transaction (not an empty {}).
    txn = _highest_risk_txn(account_id) or {}
    rdata = _load_tool_json(score_risk.func, account_id, txn)
    top_feats = []
    for f in rdata.get("top_features") or []:
        val = _pick_number(f)
        top_feats.append({
            "feature":      f.get("feature"),
            "shap_value":   val,   # frontend hasShap check needs this non-null
            "contribution": val,
            "direction":    f.get("direction", ""),
        })
    ml_risk = {
        "top_shap_features":  top_feats,
        "decision_threshold": rdata.get("decision_threshold", 0.7),
        "scored_txn_id":      txn.get("txn_id"),
        "interpretation":     rdata.get("interpretation", ""),
    }
    risk_tier         = rdata.get("risk_tier", "UNKNOWN")
    fraud_probability = rdata.get("fraud_probability")

    # 4. Typologies ───────────────────────────────────────────
    tdata = _load_tool_json(detect_typology.func, account_id)
    typs = (tdata.get("typologies") if isinstance(tdata, dict) else []) or []
    typologies = [
        {"type": t.get("type"), "description": t.get("description"), "risk": t.get("risk")}
        for t in typs
    ]

    # 5. Regulatory Citations (finding-driven) ──────────────────────────
    typology_types = [t.get("type") for t in typologies]
    rag_query = _rag_query_for(typology_types)
    reg_parsed = _load_tool_json(search_regulations.func, rag_query, top_k=3)
    regs = _extract_results(reg_parsed)
    regulatory_citations = [
        {"rank": i + 1, "source": r.get("source"), "page": r.get("page"), "text": r.get("text")}
        for i, r in enumerate(regs)
    ]

    recommendation = (
        "ESCALATE"
        if risk_tier in ("CRITICAL", "HIGH") or graph_intelligence.get("is_suspected_mule")
        else "REVIEW"
    )

    return {
        "account_summary":      account_summary,
        "graph_intelligence":   graph_intelligence,
        "ml_risk":              ml_risk,
        "risk_tier":            risk_tier,
        "fraud_probability":    fraud_probability,
        "regulatory_citations": regulatory_citations,
        "typologies":           typologies,
        "recommendation":       recommendation,
        "disclaimer":           DISCLAIMER,
    }


def _deterministic_str_draft(account_id: str) -> str:
    """Build the STR prose WITHOUT the LLM, using the same pure-Python
    formatter the orchestrator uses. Guarantees the Download STR button works
    even when the agent is rate-limited/unavailable."""
    try:
        from agent.str_generator import format_str
        from agent.tools import (
            get_transaction_history,
            get_transaction_graph,
            score_risk,
            detect_typology,
            search_regulations,
        )
        history_data = _load_tool_json(get_transaction_history.func, account_id, 100000)
        graph_data   = _load_tool_json(get_transaction_graph.func, account_id)
        txn          = _highest_risk_txn(account_id) or {}
        risk_data    = _load_tool_json(score_risk.func, account_id, txn)
        tdata        = _load_tool_json(detect_typology.func, account_id)
        typologies   = (tdata.get("typologies") if isinstance(tdata, dict) else []) or []
        rag_query    = _rag_query_for([t.get("type") for t in typologies])
        reg_parsed   = _load_tool_json(search_regulations.func, rag_query, top_k=3)
        regs         = _extract_results(reg_parsed)
        return format_str(
            account_id=account_id,
            history_data=history_data if isinstance(history_data, dict) else {},
            graph_data=graph_data if isinstance(graph_data, dict) else {},
            risk_data=risk_data if isinstance(risk_data, dict) else {},
            regulations=regs,
            typologies=typologies,
        )
    except Exception as e:
        logger.error("Deterministic STR draft failed for %s: %s", account_id, e)
        return ""


# ═══════════════════════════════════════════════════════════════
# ROUTES
# ═══════════════════════════════════════════════════════════════

@app.get("/health", tags=["Platform"])
def health():
    """Platform stats for the landing page stats strip."""
    db = _db_stats()
    return {
        "status": "ok",
        "database": {
            "total_transactions": db.get("transactions", 0),
            "total_alerts":       db.get("alerts", 0),
            "fraud_labeled":      db.get("fraud_labeled", 0),
            "fraud_rate":         db.get("fraud_rate_pct", 0),
            "data_note":          db.get("data_note", ""),
        },
        "model":        "XGBoost (PaySim-trained, FundFlow engine)",
        "rag_ingested": _chroma_ready(),
        "agent":        "LangGraph ReAct (GPT-4o-mini)",
        "version":      "1.3.0",
    }


class InvestigateRequest(BaseModel):
    account_id: str


def _run_investigation(job_id: str, account_id: str):
    """Background thread.

    1) Best-effort LLM agent run for the STR prose + guardrails.
    2) ALWAYS build the deterministic cards from the tools.

    A rate-limited/failed agent no longer blanks the investigation — it only
    drops the narrative prose; llm_status records why.
    """
    result: dict = {}
    llm_status = "ok"
    llm_error: Optional[str] = None

    # 1) Best-effort LLM agent run.
    try:
        from agent.orchestrator import run_investigation
        result = run_investigation(account_id) or {}
    except Exception as e:
        llm_status = "unavailable"
        llm_error = str(e)
        logger.warning(
            "Agent LLM run failed for %s (%s) — serving deterministic cards only",
            account_id, e,
        )

    # 2) Deterministic cards ALWAYS. This is the resilience guarantee.
    try:
        sections = _build_sections(account_id)
    except Exception as e:
        logger.error("Deterministic section build failed for %s: %s", account_id, e)
        with _jobs_lock:
            _jobs[job_id]["status"] = "error"
            _jobs[job_id]["error"] = str(e)
        return

    raw_trace = result.get("tool_trace", []) if isinstance(result, dict) else []
    g = (result.get("guardrails", {}) if isinstance(result, dict) else {}) or {}

    llm_note = None
    if llm_status != "ok":
        llm_note = (
            "AI narrative unavailable (LLM rate-limited or failed). "
            "All metrics below are computed directly from the database and models."
        )

    payload = {
        "job_id":            job_id,
        "status":           "done",
        "account_id":       account_id,
        "tool_trace":       [{"tool": t, "status": "done"} for t in raw_trace],
        "risk_tier":        sections.get("risk_tier"),
        "fraud_probability": sections.get("fraud_probability"),
        "recommendation":   sections.get("recommendation"),
        "guardrails": {
            "passed":     g.get("passed", False),
            "violations": g.get("violations", []),
            "warnings":   g.get("warnings", []),
        },
        "str_sections":   sections,
        "str_draft_text": (
            (result.get("str_draft") if isinstance(result, dict) else "")
            or _deterministic_str_draft(account_id)
        ),
        "llm_status":     llm_status,   # "ok" | "unavailable"
        "llm_error":      llm_error,
        "llm_note":       llm_note,
    }

    with _jobs_lock:
        _jobs[job_id]["status"] = "done"
        _jobs[job_id]["payload"] = payload


@app.post("/investigate", status_code=202, tags=["Investigation"])
def start_investigation(req: InvestigateRequest):
    """Start an async investigation. Poll GET /investigate/{job_id} until done."""
    if not req.account_id or not req.account_id.strip():
        raise HTTPException(status_code=400, detail="account_id is required")

    account_id = req.account_id.strip()
    job_id = f"inv_{account_id}_{int(datetime.now(timezone.utc).timestamp())}"

    with _jobs_lock:
        _jobs[job_id] = {
            "job_id":     job_id,
            "account_id": account_id,
            "status":     "running",
            "payload":    None,
            "error":      None,
            "started_at": datetime.now(timezone.utc).isoformat(),
        }

    t = threading.Thread(target=_run_investigation, args=(job_id, account_id), daemon=True)
    t.start()

    return {
        "job_id":            job_id,
        "account_id":        account_id,
        "status":            "running",
        "estimated_seconds": 60,
        "poll_url":          f"/investigate/{job_id}",
    }


@app.get("/investigate/{job_id}", tags=["Investigation"])
def get_investigation(job_id: str):
    """Poll investigation status. Returns full result when status == 'done'."""
    with _jobs_lock:
        job = _jobs.get(job_id)

    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")

    if job["status"] == "error":
        # Only reached on a hard DB/engine failure, NOT on an LLM rate limit.
        return {"job_id": job_id, "status": "error", "error": job.get("error", "Unknown error")}

    if job["status"] == "running":
        return {"job_id": job_id, "account_id": job["account_id"], "status": "running", "tool_trace": []}

    return job.get("payload") or {"job_id": job_id, "status": "done"}


# ── Graph tool ─────────────────────────────────────────────
class GraphRequest(BaseModel):
    account_id: str
    max_hops: int = 2


def _graph_edges_from_sql(account_id: str):
    """Shared SQL edge/node builder for the primary path and the fallback."""
    conn = _get_db()
    rows = conn.execute("""
        SELECT sender_account, receiver_account, amount,
               fraud_probability, txn_type
        FROM transactions
        WHERE sender_account = ? OR receiver_account = ?
        LIMIT 200
    """, (account_id, account_id)).fetchall()
    conn.close()

    nodes_set = set()
    edges = []
    for r in rows:
        nodes_set.add(r["sender_account"])
        nodes_set.add(r["receiver_account"])
        edges.append({
            "from":       r["sender_account"],
            "to":         r["receiver_account"],
            "amount":     round(r["amount"] or 0, 2),
            "fraud_prob": round(r["fraud_probability"] or 0, 4),
            "txn_type":   r["txn_type"] or "UNKNOWN",
        })
    nodes = [{"id": n, "is_subject": n == account_id} for n in nodes_set]
    return nodes, edges


@app.post("/tools/graph", tags=["Tools"])
def get_graph(req: GraphRequest):
    """Build the transaction network for an account. Used by Graph View page."""
    try:
        # Route through the SAME tool the investigation uses, so the Graph page
        # and the investigation can never disagree about mule status again.
        # (The old code imported build_ego_graph/score_mule/detect_rings, which
        #  do not exist in the current graph modules -> silent ImportError ->
        #  empty graph_analysis -> page wrongly showed "Not a Suspected Mule".)
        from agent.tools import get_transaction_graph

        gdata = _load_tool_json(get_transaction_graph.func, req.account_id, req.max_hops)
        if not gdata or gdata.get("error"):
            raise RuntimeError(gdata.get("error", "graph tool returned no data"))

        nodes, edges = _graph_edges_from_sql(req.account_id)
        high_risk = sum(1 for e in edges if e["fraud_prob"] > 0.7)

        return {
            "account_id": req.account_id,
            "nodes":      nodes,
            "edges":      edges,
            "stats": {
                "total_nodes":     len(nodes),
                "total_edges":     len(edges),
                "high_risk_edges": high_risk,
            },
            "graph_analysis": {
                "mule_score":        gdata.get("mule_score"),
                "is_suspected_mule": gdata.get("is_suspected_mule"),
                "in_ring":           gdata.get("in_ring"),
                "ring_count":        gdata.get("ring_count", 0),
                "graph_profile":     gdata.get("graph_profile", {}),
            },
        }
    except Exception as e:
        logger.error("Graph error: %s", e)
        # Degraded fallback: still return the network so the page renders, but
        # mark analytics unavailable -- NEVER silently report a clean account.
        try:
            nodes, edges = _graph_edges_from_sql(req.account_id)
            return {
                "account_id": req.account_id,
                "nodes":      nodes,
                "edges":      edges,
                "stats":      {"total_nodes": len(nodes), "total_edges": len(edges)},
                "graph_analysis": {"unavailable": True, "error": str(e)},
            }
        except Exception as e2:
            raise HTTPException(status_code=500, detail=str(e2))


# ── RAG tool ──────────────────────────────────────────────
class RagRequest(BaseModel):
    query: str
    top_k: int = 3


@app.post("/tools/rag", tags=["Tools"])
def rag_search(req: RagRequest):
    """Semantic search over the regulatory corpus. Used by RAG Lookup page."""
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="query cannot be empty")
    try:
        from rag.retriever import retrieve_regulations
        return retrieve_regulations(req.query, top_k=min(req.top_k, 10))
    except Exception as e:
        logger.error("RAG error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ── Alerts ──────────────────────────────────────────────
def _normalize_accounts_involved(val):
    """Coerce accounts_involved into a clean list[str] regardless of stored form."""
    if not val:
        return []
    if isinstance(val, list):
        return [str(x) for x in val]
    if isinstance(val, str):
        try:
            parsed = json.loads(val)
            if isinstance(parsed, list):
                return [str(x) for x in parsed]
            return [str(parsed)]
        except json.JSONDecodeError:
            if "," in val:
                return [x.strip() for x in val.split(",") if x.strip()]
            return [val.strip()]
    return [str(val)]


@app.get("/alerts", tags=["Alerts"])
def list_alerts(
    severity: Optional[str] = Query(None, description="Filter: CRITICAL, HIGH, MEDIUM, LOW"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """List database alerts. Supports severity filter and pagination."""
    try:
        conn = _get_db()
        if severity and severity.upper() != "ALL":
            total = conn.execute(
                "SELECT COUNT(*) FROM alerts WHERE severity=?", (severity.upper(),)
            ).fetchone()[0]
            rows = conn.execute(
                "SELECT * FROM alerts WHERE severity=? ORDER BY timestamp DESC LIMIT ? OFFSET ?",
                (severity.upper(), limit, offset),
            ).fetchall()
        else:
            total = conn.execute("SELECT COUNT(*) FROM alerts").fetchone()[0]
            rows = conn.execute(
                "SELECT * FROM alerts ORDER BY timestamp DESC LIMIT ? OFFSET ?",
                (limit, offset),
            ).fetchall()
        conn.close()

        alerts = []
        for row in rows:
            a = dict(row)
            a["accounts_involved"] = _normalize_accounts_involved(a.get("accounts_involved"))
            alerts.append(a)

        return {"total": total, "limit": limit, "offset": offset, "alerts": alerts}
    except Exception as e:
        logger.error("Alerts error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ── Transactions ───────────────────────────────────────────
@app.get("/transactions/{account_id}", tags=["Data"])
def get_transactions(
    account_id: str,
    limit: int = Query(50, ge=1, le=200),
):
    """Raw transaction history for an account."""
    try:
        conn = _get_db()
        rows = conn.execute("""
            SELECT txn_id, timestamp, sender_account, receiver_account,
                   amount, txn_type, channel, risk_tier,
                   fraud_probability, is_fraud
            FROM transactions
            WHERE sender_account = ? OR receiver_account = ?
            ORDER BY timestamp DESC
            LIMIT ?
        """, (account_id, account_id, limit)).fetchall()
        conn.close()
        return {
            "account_id":   account_id,
            "count":        len(rows),
            "transactions": [dict(r) for r in rows],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/", tags=["Platform"])
def root():
    return {"name": "Sentinel AI API", "version": "1.2.0", "docs": "/docs", "health": "/health"}
