"""
FundFlow AI — FastAPI Backend
Main application with all routes, WebSocket, and static file serving.
"""
from dotenv import load_dotenv
load_dotenv()
import os
import sys
import json
import asyncio
import hmac
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import (
    Depends,
    FastAPI,
    File,
    Form,
    Header,
    HTTPException,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import ALLOWED_ORIGINS, API_KEY, DB_PATH, PROCESSED_DATA_PATH
from ingestion.loader import get_db_connection, init_db

# ── Global State ──────────────────────────────────────────────────────────────
_graph         = None
_mule_scores   = None
_rings         = None
_india_extras: dict = {}   # {account_id: {kyc_type, account_age_days, credit_score, vpa}}
_graph_features: dict = {} # {account_id: graph feature dict}
_ws_clients: list[WebSocket] = []

# Simulation state
_sim_running: bool = False
_sim_task            = None
_sim_stats: dict     = {"processed": 0, "fraud_detected": 0, "live_alerts_created": 0}
_sim_live_alerts: bool = True
_sim_alert_threshold: float = 0.7
_sim_alerted_txn_ids: set[str] = set()


def get_graph():
    global _graph
    return _graph


def get_mule_scores():
    global _mule_scores
    return _mule_scores


def get_rings():
    global _rings
    return _rings


def get_india_extras() -> dict:
    global _india_extras
    return _india_extras


def get_graph_features() -> dict:
    global _graph_features
    return _graph_features


def _parse_allowed_origins(raw: str) -> list[str]:
    return [origin.strip() for origin in str(raw).split(",") if origin.strip()]


_allowed_origins = _parse_allowed_origins(ALLOWED_ORIGINS)


def require_api_key(x_api_key: str = Header(default="", alias="X-API-Key")):
    expected = str(API_KEY or "").strip()
    if not expected:
        raise HTTPException(500, "Server API key is not configured")
    if not hmac.compare_digest(str(x_api_key or ""), expected):
        raise HTTPException(401, "Invalid API key")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: build graph from database on boot."""
    global _graph, _mule_scores, _rings, _india_extras
    print("[STARTUP] Initialising FundFlow AI...")

    conn = get_db_connection()
    conn.close()

    # ── Load India extras (VPA / KYC / CIBIL) ────────────────────────────────
    try:
        import pickle
        base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        extras_path = os.path.join(base, 'data', 'processed', 'india_extras.pkl')
        gf_path     = os.path.join(base, 'data', 'processed', 'graph_features.pkl')

        if os.path.exists(extras_path):
            with open(extras_path, 'rb') as f:
                _india_extras = pickle.load(f)
            print(f"[STARTUP] India extras loaded: {len(_india_extras):,} accounts")
        else:
            print("[STARTUP] India extras not found — run scripts/generate_india_extras.py")

        if os.path.exists(gf_path):
            with open(gf_path, 'rb') as f:
                _graph_features = pickle.load(f)
            print(f"[STARTUP] Graph features loaded: {len(_graph_features):,} accounts")
        else:
            print("[STARTUP] Graph features not found — run python -m features.graph_features")
    except Exception as e:
        print(f"[STARTUP WARNING] Extras load failed: {e}")

    # ── Build transaction graph ───────────────────────────────────────────────
    try:
        print("[STARTUP] Building transaction graph...")
        from graph.fund_flow import FundFlowGraph
        from graph.ring_detector import find_cycles
        from graph.mule_detector import compute_mule_scores

        conn = get_db_connection()
        rows = conn.execute("""
            SELECT txn_id, sender_account, receiver_account, amount,
                   timestamp, is_fraud, txn_type, step,
                   COALESCE(fraud_probability, 0.0) as fraud_probability
            FROM transactions
            WHERE step >= 600
            LIMIT 50000
        """).fetchall()
        conn.close()

        df_graph = pd.DataFrame([dict(r) for r in rows])
        _graph = FundFlowGraph()
        _graph.build_from_df(df_graph)
        print(f"[STARTUP] Graph built: {_graph.get_graph_stats()}")

        _rings = find_cycles(_graph.G, max_length=5, time_window_hours=24)
        print(f"[STARTUP] Rings detected: {len(_rings)}")

        # Fast path: reuse precomputed graph features for mule scores at startup
        if _graph_features:
            mule_rows = []
            for account in _graph.G.nodes():
                g = _graph_features.get(account)
                if not g:
                    continue
                ie = _india_extras.get(account, {})
                mule_score = float(g.get('mule_score', 0.0))
                mule_rows.append({
                    'account': account,
                    'mule_score': mule_score,
                    'passthrough_ratio': float(g.get('passthrough_ratio', 0.0)),
                    'avg_fwd_delay_min': None,
                    'unique_senders': int(g.get('receiver_unique_senders', 0)),
                    'unique_receivers': 0,
                    'total_received': float(g.get('receiver_total_inflow', 0.0)),
                    'total_sent': 0.0,
                    'amount_cluster_score': 0.0,
                    'kyc_type': ie.get('kyc_type', 'unknown'),
                    'account_age_days': ie.get('account_age_days', None),
                    'is_suspected_mule': int(g.get('is_suspected_mule', 0) or mule_score >= 0.6),
                })

            _mule_scores = pd.DataFrame(mule_rows)
            if len(_mule_scores) > 0:
                _mule_scores = _mule_scores.sort_values('mule_score', ascending=False).reset_index(drop=True)
            print(f"[STARTUP] Mule scores loaded from graph_features: {len(_mule_scores)} accounts")
        else:
            # Fallback path if precomputed graph features are unavailable
            _mule_scores = compute_mule_scores(_graph.G, df_graph, kyc_data=_india_extras)
            print(f"[STARTUP] Mule scores computed: {len(_mule_scores)} accounts")

    except Exception as e:
        print(f"[STARTUP WARNING] Graph init failed: {e}")
        _graph = None
        _mule_scores = pd.DataFrame()
        _rings = []

    print("[STARTUP] FundFlow AI ready.")
    yield
    print("[SHUTDOWN] FundFlow AI shutting down.")


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="FundFlow AI",
    description="Real-Time Fraud Intelligence & Fund Flow Tracking System",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "X-API-Key"],
)

# Static dashboard files — mount css and js so paths like /css/style.css work
dashboard_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "dashboard")
if os.path.exists(dashboard_dir):
    css_dir = os.path.join(dashboard_dir, "css")
    js_dir  = os.path.join(dashboard_dir, "js")
    if os.path.exists(css_dir):
        app.mount("/css", StaticFiles(directory=css_dir), name="css")
    if os.path.exists(js_dir):
        app.mount("/js",  StaticFiles(directory=js_dir),  name="js")
    assets_dir = os.path.join(dashboard_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")


def _prepare_uploaded_transactions(raw_df: pd.DataFrame, mapping: dict | None = None) -> pd.DataFrame:
    """
    Normalize uploaded transaction data to the internal transaction schema.
    """
    if raw_df is None or len(raw_df) == 0:
        raise ValueError("Uploaded file has no rows")

    mapping = mapping or {}
    df = raw_df.copy()

    # Case-insensitive source-column lookup
    source_cols = {str(c).strip().lower(): c for c in df.columns}

    alias_map = {
        'sender_account': ['sender_account', 'sender', 'from_account', 'debit_account', 'nameorig'],
        'receiver_account': ['receiver_account', 'receiver', 'to_account', 'credit_account', 'namedest'],
        'amount': ['amount', 'txn_amount', 'transaction_amount', 'amt'],
        'timestamp': ['timestamp', 'txn_time', 'transaction_time', 'datetime', 'created_at'],
        'txn_type': ['txn_type', 'type', 'transaction_type', 'channel_type'],
        'sender_branch': ['sender_branch', 'from_branch', 'debit_branch'],
        'receiver_branch': ['receiver_branch', 'to_branch', 'credit_branch'],
        'channel': ['channel', 'mode', 'payment_channel'],
        'sender_balance_before': ['sender_balance_before', 'oldbalanceorg', 'balance_before'],
        'sender_balance_after': ['sender_balance_after', 'newbalanceorig', 'balance_after'],
        'receiver_balance_before': ['receiver_balance_before', 'oldbalancedest'],
        'receiver_balance_after': ['receiver_balance_after', 'newbalancedest'],
    }

    resolved = {}
    for target, aliases in alias_map.items():
        # Explicit mapping has priority
        explicit = mapping.get(target)
        if explicit:
            key = str(explicit).strip().lower()
            if key not in source_cols:
                raise ValueError(f"Mapped source column '{explicit}' for '{target}' not found")
            resolved[target] = source_cols[key]
            continue

        for candidate in aliases:
            key = str(candidate).strip().lower()
            if key in source_cols:
                resolved[target] = source_cols[key]
                break

    missing_required = [c for c in ['sender_account', 'receiver_account', 'amount'] if c not in resolved]
    if missing_required:
        raise ValueError(
            f"Missing required columns: {missing_required}. Provide mapping_json for these fields."
        )

    now = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    out = pd.DataFrame()
    out['txn_id'] = [f"UPL_{now}_{i:07d}" for i in range(len(df))]

    if 'timestamp' in resolved:
        out['timestamp'] = pd.to_datetime(df[resolved['timestamp']], errors='coerce')
        out['timestamp'] = out['timestamp'].fillna(pd.Timestamp.utcnow())
    else:
        out['timestamp'] = pd.Timestamp.utcnow()
    out['timestamp'] = out['timestamp'].astype(str)

    out['sender_account'] = df[resolved['sender_account']].astype(str).str.strip()
    out['receiver_account'] = df[resolved['receiver_account']].astype(str).str.strip()
    out['amount'] = pd.to_numeric(df[resolved['amount']], errors='coerce').fillna(0.0)

    if 'txn_type' in resolved:
        out['txn_type'] = df[resolved['txn_type']].astype(str).str.upper().fillna('UPI')
    else:
        out['txn_type'] = 'UPI'

    out['sender_branch'] = (
        df[resolved['sender_branch']].astype(str).fillna('UNKNOWN')
        if 'sender_branch' in resolved else 'UNKNOWN'
    )
    out['receiver_branch'] = (
        df[resolved['receiver_branch']].astype(str).fillna('UNKNOWN')
        if 'receiver_branch' in resolved else 'UNKNOWN'
    )
    out['channel'] = (
        df[resolved['channel']].astype(str).str.lower().fillna('mobile')
        if 'channel' in resolved else 'mobile'
    )

    out['sender_balance_before'] = (
        pd.to_numeric(df[resolved['sender_balance_before']], errors='coerce').fillna(0.0)
        if 'sender_balance_before' in resolved else 0.0
    )
    out['sender_balance_after'] = (
        pd.to_numeric(df[resolved['sender_balance_after']], errors='coerce').fillna(0.0)
        if 'sender_balance_after' in resolved else 0.0
    )
    out['receiver_balance_before'] = (
        pd.to_numeric(df[resolved['receiver_balance_before']], errors='coerce').fillna(0.0)
        if 'receiver_balance_before' in resolved else 0.0
    )
    out['receiver_balance_after'] = (
        pd.to_numeric(df[resolved['receiver_balance_after']], errors='coerce').fillna(0.0)
        if 'receiver_balance_after' in resolved else 0.0
    )

    out['is_fraud'] = 0
    out['is_flagged_fraud'] = 0
    out['step'] = 744

    out = out[(out['sender_account'] != '') & (out['receiver_account'] != '')]
    out = out[out['amount'] > 0]
    return out.reset_index(drop=True)


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    """Serve dashboard."""
    index_path = os.path.join(dashboard_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "FundFlow AI API running. Dashboard not built yet."}


@app.get("/api/stats/dashboard")
def dashboard_stats():
    """Aggregate statistics for the main dashboard."""
    conn = get_db_connection()
    try:
        total     = conn.execute("SELECT COUNT(*) FROM transactions").fetchone()[0]
        fraud_cnt = conn.execute("SELECT COUNT(*) FROM transactions WHERE is_fraud=1").fetchone()[0]
        alerts    = conn.execute("SELECT COUNT(*) FROM alerts WHERE status='NEW'").fetchone()[0]
        cases     = conn.execute("SELECT COUNT(*) FROM cases").fetchone()[0]
        high_risk = conn.execute(
            "SELECT COUNT(*) FROM transactions WHERE fraud_probability >= 0.8"
        ).fetchone()[0]

        # Risk distribution
        risk_dist = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
        for row in conn.execute("""
            SELECT
              CASE
                WHEN COALESCE(fraud_probability,0) < 0.3 THEN 'LOW'
                WHEN COALESCE(fraud_probability,0) < 0.6 THEN 'MEDIUM'
                WHEN COALESCE(fraud_probability,0) < 0.8 THEN 'HIGH'
                ELSE 'CRITICAL'
              END as tier,
              COUNT(*) as cnt
            FROM transactions
            GROUP BY tier
        """).fetchall():
            risk_dist[row[0]] = row[1]

        # Fraud by type
        fraud_by_type = {}
        for row in conn.execute("""
            SELECT txn_type, COUNT(*) as cnt
            FROM transactions WHERE is_fraud=1
            GROUP BY txn_type
        """).fetchall():
            fraud_by_type[row[0]] = row[1]

        return {
            "total_transactions":  total,
            "fraud_count":         fraud_cnt,
            "fraud_rate":          round(fraud_cnt / total * 100, 3) if total else 0,
            "active_alerts":       alerts,
            "total_cases":         cases,
            "high_risk_count":     high_risk,
            "risk_distribution":   risk_dist,
            "fraud_by_type":       fraud_by_type,
            "rings_detected":      len(_rings) if _rings else 0,
            "mules_detected":      (
                int((_mule_scores['is_suspected_mule'] == 1).sum())
                if _mule_scores is not None and len(_mule_scores) > 0 else 0
            ),
        }
    finally:
        conn.close()


@app.get("/api/transactions")
def list_transactions(
    page: int = 1, limit: int = 50,
    fraud_only: bool = False,
    risk_tier: str = None,
):
    """List transactions with pagination and filters."""
    conn = get_db_connection()
    try:
        offset = (page - 1) * limit
        where_clauses = []
        if fraud_only:
            where_clauses.append("is_fraud = 1")
        if risk_tier:
            tier_map = {"LOW":"< 0.3", "MEDIUM":"BETWEEN 0.3 AND 0.6",
                        "HIGH":"BETWEEN 0.6 AND 0.8", "CRITICAL":">= 0.8"}
            if risk_tier in tier_map:
                where_clauses.append(f"COALESCE(fraud_probability,0) {tier_map[risk_tier]}")
        where = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
        rows = conn.execute(f"""
            SELECT * FROM transactions {where}
            ORDER BY timestamp DESC LIMIT ? OFFSET ?
        """, (limit, offset)).fetchall()
        total = conn.execute(f"SELECT COUNT(*) FROM transactions {where}").fetchone()[0]
        return {
            "transactions": [dict(r) for r in rows],
            "total": total, "page": page, "limit": limit,
        }
    finally:
        conn.close()


@app.get("/api/transactions/{txn_id}")
def get_transaction(txn_id: str):
    """Single transaction detail with fraud score."""
    conn = get_db_connection()
    try:
        row = conn.execute(
            "SELECT * FROM transactions WHERE txn_id=?", (txn_id,)
        ).fetchone()
        if not row:
            raise HTTPException(404, f"Transaction {txn_id} not found")
        return dict(row)
    finally:
        conn.close()


@app.get("/api/fund-flow/{account_id}")
def trace_fund_flow(account_id: str, max_hops: int = 6, time_window_hours: int = 24):
    """Trace fund flow from an account."""
    graph = get_graph()
    if not graph:
        raise HTTPException(503, "Graph not initialised yet")
    result = graph.trace_fund_flow(account_id, max_hops, time_window_hours)
    profile = graph.get_account_profile(account_id)
    return {"fund_flow": result, "account_profile": profile}


@app.get("/api/rings")
def get_rings():
    """Get all detected fraud rings."""
    rings = _rings or []
    return {
        "rings": rings[:50],
        "total": len(rings),
        "high_risk": sum(1 for r in rings if r['risk_score'] > 0.6),
    }


@app.get("/api/mules")
def get_mules(limit: int = 50):
    """Get suspected mule accounts."""
    if _mule_scores is None or len(_mule_scores) == 0:
        return {"mules": [], "total": 0}
    suspected = _mule_scores[_mule_scores['is_suspected_mule'] == 1]
    return {
        "mules": suspected.head(limit).to_dict(orient='records'),
        "total": len(suspected),
    }


@app.get("/api/mule-network")
def get_mule_network():
    """Get mule network subgraph for visualization."""
    graph = get_graph()
    if not graph or _mule_scores is None or len(_mule_scores) == 0:
        return {"nodes": [], "edges": [], "suspected_mules": 0}
    from graph.mule_detector import get_mule_network
    return get_mule_network(_mule_scores, graph.G)


@app.get("/api/alerts")
def list_alerts(status: str = None, limit: int = 50):
    """List alerts, optionally filtered by status."""
    conn = get_db_connection()
    try:
        if status:
            rows = conn.execute(
                "SELECT * FROM alerts WHERE status=? ORDER BY timestamp DESC LIMIT ?",
                (status, limit)
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM alerts ORDER BY timestamp DESC LIMIT ?", (limit,)
            ).fetchall()
        result = []
        for r in rows:
            d = dict(r)
            for f in ('accounts_involved', 'evidence'):
                if d.get(f):
                    try: d[f] = json.loads(d[f])
                    except: pass
            result.append(d)
        return {"alerts": result, "total": len(result)}
    finally:
        conn.close()


@app.get("/api/alerts/{alert_id}")
def get_alert(alert_id: str):
    """Get single alert detail."""
    conn = get_db_connection()
    try:
        row = conn.execute(
            "SELECT * FROM alerts WHERE alert_id=?", (alert_id,)
        ).fetchone()
        if not row:
            raise HTTPException(404, f"Alert {alert_id} not found")
        d = dict(row)
        for f in ('accounts_involved', 'evidence'):
            if d.get(f):
                try: d[f] = json.loads(d[f])
                except: pass
        return d
    finally:
        conn.close()


@app.patch("/api/alerts/{alert_id}")
def update_alert(alert_id: str, status: str):
    """Update alert status."""
    valid = {"NEW","INVESTIGATING","CLOSED","FALSE_POSITIVE"}
    if status not in valid:
        raise HTTPException(400, f"Invalid status. Must be one of {valid}")
    conn = get_db_connection()
    try:
        conn.execute("UPDATE alerts SET status=? WHERE alert_id=?", (status, alert_id))
        conn.commit()
        return {"alert_id": alert_id, "status": status}
    finally:
        conn.close()


@app.post("/api/alerts/{alert_id}/analyze")
def analyze_alert(alert_id: str):
    """
    Generate an OpenAI GPT-4o-mini analysis for a specific alert.
    Returns a natural-language fraud analyst report.
    """
    conn = get_db_connection()
    try:
        row = conn.execute(
            "SELECT * FROM alerts WHERE alert_id=?", (alert_id,)
        ).fetchone()
        if not row:
            raise HTTPException(404, f"Alert {alert_id} not found")
        d = dict(row)
        for f in ('accounts_involved', 'evidence'):
            if d.get(f):
                try: d[f] = json.loads(d[f])
                except: pass
    finally:
        conn.close()

    # Build context from alert fields
    alert_type    = (d.get("alert_type") or "UNKNOWN").replace("_", " ")
    severity      = d.get("severity", "MEDIUM")
    amount        = d.get("total_amount", 0)
    risk_score    = d.get("risk_score", 0)
    description   = d.get("description", "")
    action        = d.get("recommended_action", "")
    accounts      = d.get("accounts_involved", [])
    evidence      = d.get("evidence", {})

    accounts_str = ", ".join(accounts) if isinstance(accounts, list) else str(accounts)
    evidence_str = json.dumps(evidence, indent=2) if isinstance(evidence, dict) else str(evidence)

    # Try GPT-4o-mini first
    try:
        import openai
        api_key = os.environ.get("OPENAI_API_KEY", "")
        if not api_key:
            raise ValueError("No API key")

        client = openai.OpenAI(api_key=api_key)
        prompt = f"""You are a senior bank fraud analyst at an Indian bank. Analyze this fraud alert and write a concise professional assessment in 3-4 sentences. Focus on: what the pattern indicates, which regulatory framework applies, and what the investigator should do next.

Alert Details:
- Alert Type: {alert_type}
- Severity: {severity}
- Amount: ₹{amount:,.0f}
- Risk Score: {risk_score:.2f} ({risk_score*100:.0f}%)
- Accounts Involved: {accounts_str}
- System Description: {description}
- Recommended Action: {action}
- Evidence/Context: {evidence_str}

Write a 3-4 sentence professional fraud analyst assessment. Reference Indian regulations (PMLA, RBI, FIU-IND, FATF) where applicable. Do not use markdown. Be direct and actionable."""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=250,
            temperature=0.2,
        )
        analysis = response.choices[0].message.content.strip()
        source   = "openai"

    except Exception:
        # Fallback template
        reg_ref = "PMLA Section 3" if amount > 10_00_000 else "RBI Circular on Payment Fraud"
        analysis = (
            f"This {severity.lower()} severity {alert_type.lower()} alert involves ₹{amount:,.0f} "
            f"across {len(accounts) if isinstance(accounts, list) else 1} account(s) with a risk score of {risk_score*100:.0f}%. "
            f"The behavioral pattern is consistent with financial crime typologies identified under {reg_ref}. "
            f"Recommended immediate action: {action or 'investigate the flagged accounts and verify transaction legitimacy with the account holder'}."
        )
        source = "template"

    return {
        "alert_id": alert_id,
        "analysis": analysis,
        "source":   source,
        "severity": severity,
        "amount":   amount,
        "risk_score": risk_score,
    }


@app.get("/api/cases")
def list_cases(status: str = None, limit: int = 50):
    """List investigation cases."""
    from investigation.case_manager import list_cases as _list
    conn = get_db_connection()
    try:
        return {"cases": _list(conn, status=status, limit=limit)}
    finally:
        conn.close()


@app.get("/api/cases/{case_id}")
def get_case(case_id: str):
    """Get case detail."""
    from investigation.case_manager import get_case as _get
    conn = get_db_connection()
    try:
        case = _get(case_id, conn)
        if not case:
            raise HTTPException(404, f"Case {case_id} not found")
        return case
    finally:
        conn.close()


@app.patch("/api/cases/{case_id}/status")
def update_case_status(case_id: str, status: str, actor: str = "investigator"):
    """Update case status."""
    from investigation.case_manager import update_case_status as _update
    conn = get_db_connection()
    try:
        return _update(case_id, status, actor=actor, db_conn=conn)
    finally:
        conn.close()


@app.post("/api/cases/{case_id}/notes")
def add_note(case_id: str, note: str, actor: str = "investigator"):
    """Add note to a case."""
    from investigation.case_manager import add_note as _add
    conn = get_db_connection()
    try:
        return _add(case_id, note, actor=actor, db_conn=conn)
    finally:
        conn.close()


@app.post("/api/simulate/freeze/{account_id}")
def simulate_freeze(account_id: str):
    """Simulate freezing an account — impact analysis."""
    graph = get_graph()
    if not graph:
        raise HTTPException(503, "Graph not initialised")
    from investigation.freeze_simulator import simulate_freeze as _sim
    fraud_scores = {}
    mule_scores_dict = {}
    if _mule_scores is not None and len(_mule_scores) > 0:
        mule_scores_dict = dict(zip(_mule_scores['account'], _mule_scores['mule_score']))
    return _sim(graph.G, account_id,
                mule_scores=mule_scores_dict,
                fraud_scores=fraud_scores)


@app.get("/api/account/{account_id}")
def get_account_profile(account_id: str):
    """Full account risk profile: graph metrics + KYC + CIBIL + VPA."""
    graph  = get_graph()
    extras = get_india_extras()

    # Graph-level stats
    graph_stats = {}
    if graph and account_id in graph.G:
        node = graph.G.nodes[account_id]
        graph_stats = {
            "total_sent":     round(node.get('total_sent', 0), 2),
            "total_received": round(node.get('total_received', 0), 2),
            "in_degree":      graph.G.in_degree(account_id),
            "out_degree":     graph.G.out_degree(account_id),
        }

    # Mule score
    mule_info = {}
    if _mule_scores is not None and len(_mule_scores) > 0:
        row = _mule_scores[_mule_scores['account'] == account_id]
        if len(row) > 0:
            mule_info = row.iloc[0].to_dict()

    # India extras: KYC, CIBIL, VPA
    ie = extras.get(account_id, {})

    # Recent transactions from DB
    conn = get_db_connection()
    try:
        recent = conn.execute("""
            SELECT txn_id, timestamp, amount, txn_type, receiver_account,
                   COALESCE(fraud_probability, 0.0) as fraud_probability
            FROM transactions
            WHERE sender_account = ?
            ORDER BY timestamp DESC LIMIT 10
        """, (account_id,)).fetchall()
        recent_txns = [dict(r) for r in recent]

        # DB-level risk score (highest seen)
        max_prob_row = conn.execute("""
            SELECT MAX(COALESCE(fraud_probability, 0)) FROM transactions
            WHERE sender_account=? OR receiver_account=?
        """, (account_id, account_id)).fetchone()
        max_fraud_prob = round(float(max_prob_row[0] or 0), 4)
    finally:
        conn.close()

    # KYC risk assessment
    kyc_type    = ie.get('kyc_type', 'unknown')
    age_days    = ie.get('account_age_days', None)
    credit_score = ie.get('credit_score', None)
    kyc_risk    = (kyc_type == 'otp_ekyc' and age_days is not None and age_days < 90)

    return {
        "account_id":        account_id,
        "vpa":               ie.get('vpa', f"{account_id[-8:]}@upi"),
        "bank_handle":       ie.get('bank_handle', 'upi'),
        "kyc_type":          kyc_type,
        "account_age_days":  age_days,
        "credit_score":      credit_score,
        "kyc_risk_flag":     kyc_risk,
        "cibil_risk_flag":   (credit_score is not None and credit_score < 550),
        "max_fraud_probability": max_fraud_prob,
        "mule_score":        mule_info.get('mule_score', 0.0),
        "is_suspected_mule": bool(mule_info.get('is_suspected_mule', 0)),
        "passthrough_ratio": mule_info.get('passthrough_ratio', 0.0),
        "graph_stats":       graph_stats,
        "recent_transactions": recent_txns,
    }


@app.get("/api/explain/{txn_id}")
def explain_transaction(txn_id: str):
    """SHAP explanation for a transaction."""
    conn = get_db_connection()
    try:
        row = conn.execute(
            "SELECT * FROM transactions WHERE txn_id=?", (txn_id,)
        ).fetchone()
        if not row:
            raise HTTPException(404, f"Transaction {txn_id} not found")
        txn = dict(row)
    finally:
        conn.close()

    try:
        from features.engineering import engineer_single, get_feature_columns
        from explainability.explain import explain_transaction_ml, explain_graph
        from models.predictor import get_model_metadata, predict_single
        import pandas as pd

        sender_id = txn.get("sender_account", "")

        # ── Fetch sender history — SAME as gateway does ─────────────────────────
        account_history = None
        if sender_id:
            hist_conn = get_db_connection()
            try:
                rows = hist_conn.execute("""
                    SELECT amount, receiver_account, timestamp
                    FROM transactions
                    WHERE sender_account = ?
                    ORDER BY timestamp DESC
                    LIMIT 100
                """, (sender_id,)).fetchall()
                if rows:
                    account_history = pd.DataFrame([dict(r) for r in rows])
            except Exception:
                pass
            finally:
                hist_conn.close()

        # Re-score with full behavioral features
        fraud_probability = txn.get("fraud_probability", None)
        if fraud_probability is None:
            pred = predict_single(
                txn,
                graph_features=get_graph_features(),
                india_extras=get_india_extras(),
                account_history=account_history,
            )
            fraud_probability = pred.get("fraud_probability")
            txn["risk_tier"] = pred.get("risk_tier")

        meta = get_model_metadata()
        threshold = float(meta.get("decision_threshold", 0.7))
        fp = float(fraud_probability) if fraud_probability is not None else None

        # Engineer features WITH history so SHAP reflects real behavioural signals
        features = engineer_single(
            txn,
            account_history=account_history,
            graph_features=get_graph_features(),
            india_extras=get_india_extras(),
        )
        ml_exp = explain_transaction_ml(features, get_feature_columns())
        graph_exp = explain_graph(
            {"paths": [], "nodes": [], "edges": [], "summary": {}})

        history_note = (
            f"Behavioral features computed from {len(account_history)} historical "
            f"transactions for sender {sender_id}."
            if account_history is not None and len(account_history) > 0
            else "No historical transactions found — behavioral features defaulted to neutral."
        )

        return {
            "txn_id": txn_id,
            "ml_explanation": ml_exp,
            "graph_explanation": graph_exp,
            "scoring_context": {
                "fraud_probability": round(fp, 4) if fp is not None else None,
                "decision_threshold": round(threshold, 4),
                "flagged_as_fraud": bool(fp is not None and fp >= threshold),
                "risk_tier": txn.get("risk_tier", None),
                "history_note": history_note,
            },
        }
    except Exception as e:
        return {"txn_id": txn_id, "error": str(e), "ml_explanation": {}, "graph_explanation": {}}


@app.get("/api/model/performance")
def model_performance():
    """Return model metrics and feature importance."""
    try:
        from models.predictor import get_model_metadata
        return get_model_metadata()
    except FileNotFoundError:
        raise HTTPException(503, "Model not trained yet. Run `python -m models.trainer`")


@app.post("/api/gateway")
async def gateway_score(txn: dict):
    """
    Payment Gateway Simulator — pre-emptive fraud scoring.
    Measures real latency, auto-creates alerts on BLOCK, pushes to
    WebSocket live feed, and generates GPT-powered explanation.
    """
    from models.predictor import predict_single
    import pandas as pd
    from datetime import datetime
    import time as _time

    t_start = _time.perf_counter()

    try:
        # ── Build the transaction dict ────────────────────────────────────────
        if "txn_id" not in txn:
            txn["txn_id"] = f"GW_{int(_time.time()*100)}"
        if "timestamp" not in txn:
            txn["timestamp"] = datetime.now().isoformat()
        txn["amount"] = float(txn.get("amount", 0))
        sender_id  = txn.get("sender_account", "")
        receiver_id = txn.get("receiver_account", "")

        # ── Fetch sender history from SQLite ──────────────────────────────────
        account_history = None
        if sender_id:
            conn = get_db_connection()
            try:
                rows = conn.execute("""
                    SELECT amount, receiver_account, timestamp
                    FROM transactions
                    WHERE sender_account = ?
                    ORDER BY timestamp DESC
                    LIMIT 100
                """, (sender_id,)).fetchall()
                if rows:
                    account_history = pd.DataFrame(
                        [dict(r) for r in rows],
                        columns=["amount", "receiver_account", "timestamp"]
                    )
                    account_history["amount"] = account_history["amount"].astype(float)
            finally:
                conn.close()

        # ── XGBoost scoring ───────────────────────────────────────────────────
        res = predict_single(
            txn,
            graph_features=get_graph_features(),
            india_extras=get_india_extras(),
            account_history=account_history,
        )

        t_end = _time.perf_counter()
        latency_ms = round((t_end - t_start) * 1000, 1)

        prob  = res.get("fraud_probability", 0)
        tier  = res.get("risk_tier", "LOW")
        top_f = res.get("top_features", [])

        # ── Gateway decision ──────────────────────────────────────────────────
        if prob >= 0.7:
            decision = "BLOCKED"
        elif prob >= 0.3:
            decision = "FLAGGED"
        else:
            decision = "APPROVED"

        # ── History context ───────────────────────────────────────────────────
        history_size = len(account_history) if account_history is not None else 0

        # ── Auto-create alert on BLOCK or FLAG ────────────────────────────────
        alert_id = None
        if decision in ("BLOCKED", "FLAGGED"):
            try:
                import hashlib
                h = hashlib.md5(f"{txn['txn_id']}{_time.time()}".encode()).hexdigest()[:6].upper()
                alert_id = f"GW_{datetime.now().strftime('%Y%m%d%H%M%S')}_{h}"
                sev = "CRITICAL" if decision == "BLOCKED" else "HIGH"
                desc = (
                    f"Gateway {decision}: {txn.get('txn_type','UPI')} payment of "
                    f"₹{txn['amount']:,.0f} from {sender_id} to {receiver_id}. "
                    f"Fraud probability: {prob*100:.0f}%."
                )
                conn = get_db_connection()
                try:
                    conn.execute("""
                        INSERT OR IGNORE INTO alerts
                        (alert_id, timestamp, severity, alert_type, accounts_involved,
                         total_amount, risk_score, description, recommended_action, status, evidence)
                        VALUES (?,?,?,?,?,?,?,?,?,?,?)
                    """, (
                        alert_id,
                        datetime.now().isoformat(),
                        sev,
                        f"GATEWAY_{decision}",
                        f'["{sender_id}", "{receiver_id}"]',
                        txn["amount"],
                        prob,
                        desc,
                        "Transaction was pre-emptively blocked by the fraud engine." if decision == "BLOCKED"
                        else "Transaction flagged for manual review before approval.",
                        "NEW",
                        f'{{"txn_id": "{txn["txn_id"]}", "gateway_decision": "{decision}", "risk_score": {prob}}}'
                    ))
                    conn.commit()
                finally:
                    conn.close()
            except Exception:
                pass  # Non-critical — don't fail the response

        # ── Push to WebSocket live feed ───────────────────────────────────────
        try:
            ws_data = {
                "txn_id": txn["txn_id"],
                "timestamp": txn["timestamp"],
                "sender_account": sender_id,
                "receiver_account": receiver_id,
                "amount": txn["amount"],
                "txn_type": txn.get("txn_type", "UPI"),
                "fraud_probability": prob,
                "risk_tier": tier,
                "gateway_decision": decision,
            }
            await broadcast_transaction(ws_data)
        except Exception:
            pass

        # ── GPT-powered natural language explanation (BLOCK only) ─────────────
        gpt_explanation = None
        if decision == "BLOCKED" and top_f:
            gpt_explanation = _generate_gpt_explanation(
                sender_id, receiver_id, txn["amount"],
                txn.get("txn_type", "UPI"), prob, top_f, history_size
            )

        return {
            "decision":          decision,
            "fraud_probability": prob,
            "risk_tier":         tier,
            "latency_ms":        latency_ms,
            "top_features":      top_f,
            "alert_id":          alert_id,
            "gpt_explanation":   gpt_explanation,
            "_context": {
                "history_used":  history_size > 0,
                "history_rows":  history_size,
                "message": (
                    f"Behavioral features computed from {history_size} historical "
                    f"transactions for sender {sender_id}."
                    if history_size > 0
                    else "Sender not found in DB — behavioral features defaulted to neutral."
                )
            }
        }

    except Exception as e:
        raise HTTPException(400, f"Gateway scoring error: {str(e)}")


def _generate_gpt_explanation(sender, receiver, amount, txn_type, prob, top_features, history_rows):
    """Call OpenAI GPT-4o-mini for a natural language fraud explanation."""
    try:
        import openai
        import os
        api_key = os.environ.get("OPENAI_API_KEY", "")
        if not api_key:
            # Fallback: generate a template-based explanation without GPT
            return _template_explanation(sender, receiver, amount, txn_type, prob, top_features)

        client = openai.OpenAI(api_key=api_key)
        features_text = "\n".join(
            f"- {f['feature']}: contribution {f.get('contribution', 0):.3f}"
            for f in top_features[:5]
        )
        prompt = f"""You are a senior bank fraud analyst writing a concise explanation for why a transaction was blocked by the automated fraud detection system. Write 2-3 sentences in professional banking language.

Transaction details:
- Sender: {sender}
- Receiver: {receiver}
- Amount: ₹{amount:,.0f}
- Type: {txn_type}
- Fraud probability: {prob*100:.0f}%
- Sender had {history_rows} historical transactions in our database

Top ML model risk factors (SHAP contributions):
{features_text}

Write a concise, professional explanation of WHY this transaction was blocked. Reference Indian regulations (PMLA, RBI guidelines) where applicable. Do not use markdown formatting."""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
            temperature=0.3,
        )
        return response.choices[0].message.content.strip()
    except Exception:
        return _template_explanation(sender, receiver, amount, txn_type, prob, top_features)


def _template_explanation(sender, receiver, amount, txn_type, prob, top_features):
    """Fallback explanation when GPT is unavailable."""
    reasons = []
    for f in top_features[:3]:
        name = f["feature"].replace("_", " ").title()
        reasons.append(name)
    reason_text = ", ".join(reasons) if reasons else "multiple risk indicators"
    return (
        f"This ₹{amount:,.0f} {txn_type} transfer from {sender} to {receiver} "
        f"was blocked with a {prob*100:.0f}% fraud probability. "
        f"Primary risk factors: {reason_text}. "
        f"This transaction pattern is consistent with financial crime typologies "
        f"identified under PMLA guidelines and RBI transaction monitoring directives."
    )


@app.post("/api/transactions/upload")
async def upload_transactions(
    file: UploadFile = File(...),
    mapping_json: str = Form(""),
    persist: bool = Form(True),
    score: bool = Form(True),
    _: None = Depends(require_api_key),
):
    """
    Upload a CSV/JSON file, normalize with optional mapping, optionally score and persist.

    mapping_json format (optional):
    {
      "sender_account": "from_acct_col",
      "receiver_account": "to_acct_col",
      "amount": "txn_amt_col"
    }
    """
    content = await file.read()
    try:
        import io
        if file.filename.endswith('.csv'):
            raw_df = pd.read_csv(io.StringIO(content.decode()))
        else:
            raw_df = pd.read_json(io.StringIO(content.decode()))

        mapping = json.loads(mapping_json) if mapping_json else {}
        df = _prepare_uploaded_transactions(raw_df, mapping=mapping)

        if len(df) == 0:
            raise HTTPException(400, "No valid rows after normalization/filtering")

        scored_df = df.copy()
        if score:
            from models.predictor import predict_batch

            scored = predict_batch(df)
            scored_df['fraud_probability'] = scored['fraud_probability']
            scored_df['risk_tier'] = scored['risk_tier']
            scored_df['risk_score'] = scored['fraud_probability']

        inserted = 0
        if persist:
            conn = get_db_connection()
            try:
                table_cols = {
                    row['name'] for row in conn.execute("PRAGMA table_info(transactions)").fetchall()
                }
                write_cols = [c for c in scored_df.columns if c in table_cols]
                scored_df[write_cols].to_sql('transactions', conn, if_exists='append', index=False)
                conn.commit()
                inserted = len(scored_df)
            finally:
                conn.close()

        flagged = int((scored_df.get('fraud_probability', pd.Series([0] * len(scored_df))) >= 0.7).sum()) if score else 0

        return {
            "status": "ok",
            "rows_received": len(raw_df),
            "rows_normalized": len(df),
            "rows_persisted": inserted,
            "scored": bool(score),
            "flagged_ge_0_7": flagged,
            "detected_columns": list(raw_df.columns),
            "mapping_used": mapping,
            "sample": scored_df.head(3).to_dict(orient='records'),
        }
    except Exception as e:
        raise HTTPException(400, f"Failed to parse file: {e}")


# ── WebSocket Live Feed ───────────────────────────────────────────────────────

@app.websocket("/ws/live-feed")
async def websocket_live_feed(ws: WebSocket):
    """Real-time transaction stream via WebSocket."""
    await ws.accept()
    _ws_clients.append(ws)
    try:
        while True:
            await asyncio.sleep(30)  # Keep-alive ping
            await ws.send_json({"type": "ping"})
    except WebSocketDisconnect:
        _ws_clients.remove(ws)


async def broadcast_transaction(txn: dict):
    """Broadcast a new transaction to all WebSocket clients."""
    dead = []
    for ws in _ws_clients:
        try:
            await ws.send_json({"type": "transaction", "data": txn})
        except Exception:
            dead.append(ws)
    for ws in dead:
        _ws_clients.remove(ws)


async def broadcast_alert(alert: dict):
    """Broadcast a newly created live alert to all WebSocket clients."""
    dead = []
    for ws in _ws_clients:
        try:
            await ws.send_json({"type": "alert", "data": alert})
        except Exception:
            dead.append(ws)
    for ws in dead:
        _ws_clients.remove(ws)


def _maybe_create_live_alert(txn_payload: dict) -> dict | None:
    """Create one live alert per unique high-risk txn in the current simulation session."""
    global _sim_alerted_txn_ids

    txn_id = str(txn_payload.get("txn_id", "")).strip()
    risk_score = float(txn_payload.get("fraud_probability", 0.0) or 0.0)

    if not txn_id or risk_score < _sim_alert_threshold:
        return None
    if txn_id in _sim_alerted_txn_ids:
        return None

    from alerts.generator import generate_high_risk_alert

    conn = get_db_connection()
    try:
        alert = generate_high_risk_alert(txn_payload, risk_score, db_conn=conn)
    finally:
        conn.close()

    _sim_alerted_txn_ids.add(txn_id)
    return alert


# ── Replay Simulator ──────────────────────────────────────────────────────────

async def _simulation_loop(rate: int = 2):
    """
    Background task: replay DB transactions through the real-time scoring
    pipeline and broadcast each result via WebSocket.
    Loops through a 170-row highlight reel (50 fraud + 120 legit).
    """
    global _sim_running, _sim_stats

    from models.predictor import predict_single as _predict

    # Build highlight reel — three separate queries (SQLite blocks ORDER BY inside UNION)
    conn = get_db_connection()
    try:
        cols = """txn_id, sender_account, receiver_account, amount,
                  timestamp, is_fraud, txn_type, step, channel,
                  sender_branch, receiver_branch,
                  COALESCE(sender_balance_before, 0) AS sender_balance_before,
                  COALESCE(sender_balance_after,  0) AS sender_balance_after"""

        fraud_rows = conn.execute(
            f"SELECT {cols} FROM transactions WHERE is_fraud = 1 ORDER BY RANDOM() LIMIT 60"
        ).fetchall()

        edge_rows = conn.execute(
            f"SELECT {cols} FROM transactions "
            "WHERE is_fraud = 0 AND COALESCE(fraud_probability,0) > 0.5 "
            "ORDER BY RANDOM() LIMIT 40"
        ).fetchall()

        clean_rows = conn.execute(
            f"SELECT {cols} FROM transactions "
            "WHERE is_fraud = 0 AND COALESCE(fraud_probability,0) < 0.1 "
            "ORDER BY RANDOM() LIMIT 100"
        ).fetchall()

        import random as _rand
        combined = [dict(r) for r in list(fraud_rows) + list(edge_rows) + list(clean_rows)]
        _rand.shuffle(combined)
        rows = combined

    except Exception as e:
        print(f"[SIM] Highlight reel query failed: {e}")
        rows = []
    finally:
        conn.close()

    txns = rows
    if not txns:
        print("[SIM] No transactions loaded \u2014 stopping.")
        _sim_running = False
        return


    print(f"[SIM] Highlight reel ready: {len(txns)} transactions")
    idx   = 0
    delay = 1.0 / max(rate, 1)

    while _sim_running:
        txn = txns[idx % len(txns)]
        idx += 1

        try:
            result = _predict(
                txn,
                graph_features=_graph_features,
                india_extras=_india_extras,
            )
            payload = {
                "txn_id":           txn.get("txn_id", ""),
                "sender_account":   txn.get("sender_account", ""),
                "receiver_account": txn.get("receiver_account", ""),
                "amount":           round(float(txn.get("amount", 0)), 2),
                "txn_type":         txn.get("txn_type", ""),
                "timestamp":        str(txn.get("timestamp", "")),
                "fraud_probability": result["fraud_probability"],
                "risk_tier":         result["risk_tier"],
                "is_fraud":          int(txn.get("is_fraud", 0)),
                "top_features":      result["top_features"][:3],
            }
            _sim_stats["processed"] += 1
            if result["fraud_probability"] >= 0.7:
                _sim_stats["fraud_detected"] += 1

            if _sim_live_alerts and result["fraud_probability"] >= _sim_alert_threshold:
                alert = _maybe_create_live_alert(payload)
                if alert:
                    payload["live_alert_id"] = alert.get("alert_id")
                    _sim_stats["live_alerts_created"] += 1
                    await broadcast_alert(alert)

            await broadcast_transaction(payload)

        except Exception as e:
            print(f"[SIM] Scoring error on {txn.get('txn_id')}: {e}")

        await asyncio.sleep(delay)

    print("[SIM] Simulation stopped.")


@app.post("/api/simulate/start")
async def start_simulation(rate: int = 2, live_alerts: bool = True):
    """Start replaying transactions through the real-time scoring pipeline."""
    global _sim_running, _sim_task, _sim_stats, _sim_live_alerts, _sim_alerted_txn_ids
    if _sim_running:
        return {
            "status": "already_running",
            "live_alerts_enabled": _sim_live_alerts,
            **_sim_stats,
        }
    _sim_running = True
    _sim_live_alerts = bool(live_alerts)
    _sim_alerted_txn_ids = set()
    _sim_stats   = {"processed": 0, "fraud_detected": 0, "live_alerts_created": 0}
    _sim_task    = asyncio.create_task(_simulation_loop(rate=rate))
    return {
        "status": "started",
        "rate_per_sec": rate,
        "live_alerts_enabled": _sim_live_alerts,
    }


@app.post("/api/simulate/stop")
async def stop_simulation():
    """Stop the replay simulator."""
    global _sim_running, _sim_task
    _sim_running = False
    if _sim_task:
        _sim_task.cancel()
        _sim_task = None
    return {"status": "stopped", **_sim_stats}


@app.get("/api/simulate/stats")
async def simulation_stats():
    """Current simulator state and counters."""
    return {"running": _sim_running, "live_alerts_enabled": _sim_live_alerts, **_sim_stats}
