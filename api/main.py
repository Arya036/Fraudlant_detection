"""
api/main.py — Sentinel AI FastAPI Backend
==========================================
Exposes the LangGraph agent and tool suite as a REST API.
The React frontend consumes these endpoints.

Run:
    uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload

Endpoints:
    GET  /health                   — platform stats
    POST /investigate              — start investigation job (async)
    GET  /investigate/{job_id}     — poll job status / get result
    POST /tools/graph              — build transaction network graph
    POST /tools/rag                — search regulatory corpus
    GET  /alerts                   — list database alerts
    GET  /transactions/{account_id}— raw transaction history
"""

import os
import sys
import uuid
import json
import sqlite3
import threading
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── Path setup ──────────────────────────────────────────────────────────────
ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

try:
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env")
except ImportError:
    pass

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sentinel.api")

DB_PATH   = os.environ.get("PS6_DB_PATH",   str(ROOT / "fundflow.db"))
CHROMA_PATH = os.environ.get("CHROMA_DB_PATH", str(ROOT / "rag" / "vector_store"))

# ── In-memory job store ─────────────────────────────────────────────────────
# Format: { job_id: { status, account_id, tool_trace, result, error, started_at } }
_jobs: dict[str, dict] = {}
_jobs_lock = threading.Lock()

# ── App setup ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Sentinel AI — AML Investigation API",
    description="Autonomous AML investigation platform for PS6 hackathon.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:3000",   # Next.js dev server
        "http://localhost:4173",   # Vite preview
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── DB helper ────────────────────────────────────────────────────────────────
def _get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _db_stats() -> dict:
    try:
        conn = _get_db()
        txns     = conn.execute("SELECT COUNT(*) FROM transactions").fetchone()[0]
        fraud    = conn.execute("SELECT COUNT(*) FROM transactions WHERE is_fraud=1").fetchone()[0]
        alerts   = conn.execute("SELECT COUNT(*) FROM alerts").fetchone()[0]
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


# ═══════════════════════════════════════════════════════════════════════════
# ROUTES
# ═══════════════════════════════════════════════════════════════════════════

# ── Health ───────────────────────────────────────────────────────────────────
@app.get("/health", tags=["Platform"])
def health():
    """Returns platform stats for the landing page stats strip."""
    return {
        "status": "ok",
        "db": _db_stats(),
        "model": "XGBoost (PaySim-trained, FundFlow engine)",
        "rag_ingested": _chroma_ready(),
        "agent": "LangGraph ReAct (GPT-4o-mini)",
        "version": "1.0.0",
    }


# ── Investigate ──────────────────────────────────────────────────────────────
class InvestigateRequest(BaseModel):
    account_id: str


def _run_investigation(job_id: str, account_id: str):
    """Background thread: runs the LangGraph agent and stores result."""
    try:
        from agent.orchestrator import run_investigation
        result = run_investigation(account_id)

        with _jobs_lock:
            _jobs[job_id]["status"] = "done"
            _jobs[job_id]["tool_trace"] = [
                {"tool": t, "status": "done"} for t in result.get("tool_trace", [])
            ]
            _jobs[job_id]["result"] = result
    except Exception as e:
        logger.error("Investigation failed for %s: %s", account_id, e)
        with _jobs_lock:
            _jobs[job_id]["status"] = "error"
            _jobs[job_id]["error"] = str(e)


@app.post("/investigate", status_code=202, tags=["Investigation"])
def start_investigation(req: InvestigateRequest):
    """
    Start an asynchronous investigation. Returns job_id to poll.
    Poll GET /investigate/{job_id} every 2 seconds until status == 'done'.
    """
    if not req.account_id or not req.account_id.strip():
        raise HTTPException(status_code=400, detail="account_id is required")

    job_id = f"inv_{req.account_id}_{int(datetime.now(timezone.utc).timestamp())}"

    with _jobs_lock:
        _jobs[job_id] = {
            "job_id": job_id,
            "account_id": req.account_id,
            "status": "running",
            "tool_trace": [],
            "result": None,
            "error": None,
            "started_at": datetime.now(timezone.utc).isoformat(),
        }

    t = threading.Thread(target=_run_investigation, args=(job_id, req.account_id), daemon=True)
    t.start()

    return {
        "job_id": job_id,
        "account_id": req.account_id,
        "status": "running",
        "estimated_seconds": 60,
        "poll_url": f"/investigate/{job_id}",
    }


@app.get("/investigate/{job_id}", tags=["Investigation"])
def get_investigation(job_id: str):
    """Poll investigation status. Returns full result when status == 'done'."""
    with _jobs_lock:
        job = _jobs.get(job_id)

    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")

    if job["status"] == "error":
        return {
            "job_id": job_id,
            "status": "error",
            "error": job.get("error", "Unknown error"),
        }

    if job["status"] == "running":
        return {
            "job_id": job_id,
            "account_id": job["account_id"],
            "status": "running",
            "tool_trace": job["tool_trace"],
        }

    # Done — build structured response
    result = job["result"] or {}
    g = result.get("guardrails", {})
    raw_trace = result.get("tool_trace", [])

    # Parse str_draft into sections for the frontend
    str_draft = result.get("str_draft", "")
    sections = _parse_str_sections(str_draft)

    return {
        "job_id": job_id,
        "status": "done",
        "account_id": job["account_id"],
        "tool_trace": [{"tool": t, "status": "done"} for t in raw_trace],
        "risk_tier": sections.get("risk_tier", "UNKNOWN"),
        "fraud_probability": sections.get("fraud_probability"),
        "guardrails": {
            "passed": g.get("passed", False),
            "violations": g.get("violations", []),
            "warnings": g.get("warnings", []),
        },
        "str_sections": sections,
        "str_draft_text": str_draft,
    }


def _parse_str_sections(str_draft: str) -> dict:
    """Extract structured data from the text STR for the React frontend."""
    sections = {}
    lines = str_draft.splitlines()

    # Risk tier and fraud probability from REPORT METADATA block
    for line in lines:
        line = line.strip()
        if line.startswith("Risk Tier"):
            parts = line.split(":")
            if len(parts) > 1:
                sections["risk_tier"] = parts[1].strip()
        elif line.startswith("Fraud Prob"):
            parts = line.split(":")
            if len(parts) > 1:
                try:
                    sections["fraud_probability"] = float(parts[1].strip())
                except ValueError:
                    pass

    # Extract Section A data (account summary)
    acc = {}
    in_a = False
    for line in lines:
        stripped = line.strip()
        if "SECTION A" in stripped:
            in_a = True
            continue
        if in_a and stripped.startswith("SECTION"):
            break
        if in_a and ":" in stripped:
            k, _, v = stripped.partition(":")
            acc[k.strip().lower().replace(" ", "_")] = v.strip()
    sections["account_summary"] = acc

    # Extract Section B (graph)
    graph = {}
    in_b = False
    for line in lines:
        stripped = line.strip()
        if "SECTION B" in stripped:
            in_b = True
            continue
        if in_b and stripped.startswith("SECTION"):
            break
        if in_b and ":" in stripped:
            k, _, v = stripped.partition(":")
            graph[k.strip().lower().replace(" ", "_")] = v.strip()
    sections["graph_intelligence"] = graph

    # Extract Section C (ML risk)
    ml = {}
    shap = []
    in_c = False
    for line in lines:
        stripped = line.strip()
        if "SECTION C" in stripped:
            in_c = True
            continue
        if in_c and stripped.startswith("SECTION"):
            break
        if in_c and stripped.startswith("•"):
            # SHAP feature line: "• feature_name: contribution=+X.XX"
            shap_line = stripped.lstrip("• ").strip()
            if ":" in shap_line:
                feat, _, rest = shap_line.partition(":")
                try:
                    val = float(rest.strip().replace("contribution=", "").replace("+", ""))
                    shap.append({"feature": feat.strip(), "contribution": val})
                except ValueError:
                    pass
        elif in_c and ":" in stripped and not stripped.startswith("•"):
            k, _, v = stripped.partition(":")
            ml[k.strip().lower().replace(" ", "_")] = v.strip()
    ml["top_shap_features"] = shap
    sections["ml_risk"] = ml

    # Extract Section D (typologies)
    typologies = []
    in_d = False
    for line in lines:
        stripped = line.strip()
        if "SECTION D" in stripped:
            in_d = True
            continue
        if in_d and stripped.startswith("SECTION"):
            break
        if in_d and stripped.startswith("•") and "None detected" not in stripped:
            typologies.append({"description": stripped.lstrip("• ").strip()})
    sections["typologies"] = typologies

    # Extract Section E (citations)
    citations = []
    in_e = False
    for line in lines:
        stripped = line.strip()
        if "SECTION E" in stripped:
            in_e = True
            continue
        if in_e and stripped.startswith("SECTION"):
            break
        if in_e and stripped.startswith("[") and "(p." in stripped:
            try:
                rank_end = stripped.index("]")
                rank = int(stripped[1:rank_end])
                rest = stripped[rank_end+1:].strip()
                if "(p." in rest:
                    src_end = rest.index("(p.")
                    source = rest[:src_end].strip().rstrip(":")
                    page_part = rest[src_end+3:]
                    page_end = page_part.index(")")
                    page = int(page_part[:page_end])
                    text_start = rest.index('"') + 1 if '"' in rest else 0
                    text_end = rest.rindex('"') if '"' in rest else len(rest)
                    text = rest[text_start:text_end].strip()
                    citations.append({"rank": rank, "source": source, "page": page, "text": text})
            except (ValueError, IndexError):
                pass
    sections["regulatory_citations"] = citations

    # Extract Section F (recommendation)
    recommendation = "REVIEW"
    disclaimer = ""
    in_f = False
    for line in lines:
        stripped = line.strip()
        if "SECTION F" in stripped:
            in_f = True
            continue
        if in_f:
            if "[ESCALATE]" in stripped:
                recommendation = "ESCALATE"
            elif "[BLOCK]" in stripped:
                recommendation = "BLOCK"
            elif "[REVIEW]" in stripped:
                recommendation = "REVIEW"
            if stripped.startswith("DISCLAIMER"):
                disclaimer = "AI-generated DRAFT for internal compliance use only. NOT court-admissible. Requires compliance officer review."
    sections["recommendation"] = recommendation
    sections["disclaimer"] = disclaimer

    return sections


# ── Graph tool ───────────────────────────────────────────────────────────────
class GraphRequest(BaseModel):
    account_id: str
    max_hops: int = 2


@app.post("/tools/graph", tags=["Tools"])
def get_graph(req: GraphRequest):
    """Build the transaction network for an account. Used by Graph View page."""
    try:
        from agent.tools import get_transaction_graph
        raw = get_transaction_graph(req.account_id, req.max_hops)

        # Build node/edge list for react-force-graph
        conn = _get_db()
        rows = conn.execute("""
            SELECT sender_account, receiver_account, amount,
                   fraud_probability, txn_type
            FROM transactions
            WHERE sender_account = ? OR receiver_account = ?
            LIMIT 200
        """, (req.account_id, req.account_id)).fetchall()
        conn.close()

        nodes_set = set()
        edges = []
        for r in rows:
            nodes_set.add(r["sender_account"])
            nodes_set.add(r["receiver_account"])
            edges.append({
                "from": r["sender_account"],
                "to":   r["receiver_account"],
                "amount": round(r["amount"] or 0, 2),
                "fraud_prob": round(r["fraud_probability"] or 0, 4),
                "txn_type": r["txn_type"] or "UNKNOWN",
            })

        nodes = [{"id": n, "is_subject": n == req.account_id} for n in nodes_set]
        high_risk = sum(1 for e in edges if e["fraud_prob"] > 0.7)

        return {
            "account_id": req.account_id,
            "nodes": nodes,
            "edges": edges,
            "stats": {
                "total_nodes": len(nodes),
                "total_edges": len(edges),
                "high_risk_edges": high_risk,
            },
            "graph_analysis": raw,
        }
    except Exception as e:
        logger.error("Graph error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ── RAG tool ─────────────────────────────────────────────────────────────────
class RagRequest(BaseModel):
    query: str
    top_k: int = 3


@app.post("/tools/rag", tags=["Tools"])
def search_regulations(req: RagRequest):
    """Semantic search over the regulatory corpus. Used by RAG Lookup page."""
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="query cannot be empty")
    try:
        from rag.retriever import retrieve_regulations
        return retrieve_regulations(req.query, top_k=min(req.top_k, 10))
    except Exception as e:
        logger.error("RAG error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ── Alerts ────────────────────────────────────────────────────────────────────
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
            # Parse JSON fields
            for field in ("accounts_involved",):
                if a.get(field) and isinstance(a[field], str):
                    try:
                        a[field] = json.loads(a[field])
                    except json.JSONDecodeError:
                        pass
            alerts.append(a)

        return {"total": total, "limit": limit, "offset": offset, "alerts": alerts}
    except Exception as e:
        logger.error("Alerts error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ── Transactions ──────────────────────────────────────────────────────────────
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
            "account_id": account_id,
            "count": len(rows),
            "transactions": [dict(r) for r in rows],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Root ──────────────────────────────────────────────────────────────────────
@app.get("/", tags=["Platform"])
def root():
    return {
        "name": "Sentinel AI API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }
