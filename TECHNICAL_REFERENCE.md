# Sentinel AI — Technical Implementation Reference
### How Everything Was Built — From FundFlow to FastAPI

---

## 1. System Overview

Sentinel AI is composed of two layers:

- **Layer 1 — FundFlow Engine** (pre-existing fraud detection system):
  An ML-powered transaction risk scorer and network analyser built on SQLite, XGBoost, and NetworkX.

- **Layer 2 — Sentinel AI** (built for PS6):
  An agentic AML investigator that wraps the FundFlow engine with a LangGraph ReAct loop,
  a regulatory RAG pipeline, an STR formatter, guardrails, and a FastAPI backend.

```
React Frontend
      │
      ▼
FastAPI (api/main.py)           ← Layer 2: Sentinel AI
      │
      ├──► LangGraph ReAct Agent (orchestrator.py)
      │          │
      │     Tool 1: get_transaction_history  ──► SQLite (fundflow.db)   ← Layer 1: FundFlow
      │     Tool 2: get_transaction_graph    ──► NetworkX ego-subgraph   ← Layer 1: FundFlow
      │     Tool 3: score_risk              ──► XGBoost model            ← Layer 1: FundFlow
      │     Tool 4: search_regulations      ──► ChromaDB RAG             ← Layer 2: Sentinel AI
      │     Tool 5: detect_typology         ──► Pattern rules + graph    ← hybrid
      │          │
      │     str_generator.py → guardrails.py → Draft STR
      │
      ├──► /tools/graph   ──► NetworkX (direct, no agent)
      ├──► /tools/rag     ──► ChromaDB (direct, no agent)
      ├──► /alerts        ──► SQLite alerts table (direct)
      └──► /health        ──► DB stats

Streamlit Console (console/app.py)  ← fallback UI, same Python backend
```

---

## 2. FundFlow Engine (Layer 1)

### 2.1 Database — `fundflow.db`

SQLite database. 499,196 synthetic transactions derived from the PaySim dataset.

**Key tables:**

| Table | Rows | Description |
|---|---|---|
| `transactions` | 499,196 | All transaction records |
| `account_profiles` | ~10,000 | Per-account behavioural features |
| `alerts` | 294 | Pre-generated risk alerts |

**`transactions` schema:**
```sql
CREATE TABLE transactions (
    txn_id              TEXT PRIMARY KEY,
    timestamp           TEXT,
    sender_account      TEXT,
    receiver_account    TEXT,
    amount              REAL,
    txn_type            TEXT,    -- UPI, ATM, TRANSFER, PAYMENT
    channel             TEXT,    -- mobile, web, branch
    risk_tier           TEXT,    -- LOW, MEDIUM, HIGH, CRITICAL
    fraud_probability   REAL,    -- 0.0 to 1.0 (XGBoost output)
    is_fraud            INTEGER  -- 0 or 1 (PaySim ground truth label)
);
```

**`alerts` schema:**
```sql
CREATE TABLE alerts (
    alert_id            TEXT PRIMARY KEY,
    alert_type          TEXT,    -- MULE_NETWORK, RING_DETECTED, etc.
    severity            TEXT,    -- CRITICAL, HIGH, MEDIUM, LOW
    timestamp           TEXT,
    total_amount        REAL,
    accounts_involved   TEXT,    -- JSON array
    description         TEXT,
    status              TEXT     -- OPEN, REVIEWED, CLOSED
);
```

---

### 2.2 Feature Engineering — `features/engineering.py`

Computes ~30 features per transaction from raw data + account history:

| Feature | Type | Description |
|---|---|---|
| `amount` | numeric | Raw transaction amount |
| `amount_log` | numeric | log1p(amount) — normalises skewed distribution |
| `type_ATM`, `type_UPI`, etc. | binary | One-hot encoded txn_type |
| `channel_mobile`, etc. | binary | One-hot encoded channel |
| `is_night` | binary | 1 if timestamp hour is 22–06 |
| `sender_avg_amount` | numeric | Mean amount sent by this account historically |
| `sender_unique_receivers_1h` | numeric | Unique receivers in past 1 hour |
| `sender_txn_count_7d` | numeric | Transaction count in past 7 days |
| `sender_fraud_rate_hist` | numeric | Historical fraud rate for this account |
| `amount_vs_avg_ratio` | numeric | This amount / sender_avg_amount |

---

### 2.3 XGBoost Fraud Model — `models/predictor.py`

**Training data:** PaySim synthetic transactions (rebalanced — original ~0.13% fraud rate → 1.84%).

**Architecture:**
- XGBoost binary classifier
- Input: ~30 engineered features
- Output: `fraud_probability` (0.0–1.0), `risk_tier`

**Risk tiers:**
| Probability | Tier |
|---|---|
| ≥ 0.70 | CRITICAL/HIGH → BLOCK |
| 0.30–0.70 | MEDIUM → FLAG |
| < 0.30 | LOW → PASS |

**SHAP explainability:** `explainability/explain.py` wraps `shap.TreeExplainer` to produce
the top-5 feature contributions per prediction. This explains *why* the model scored high.

**Model file:** `models/saved/xgboost_fraud.pkl` (pickle, ~8MB)

**Prediction interface:**
```python
from models.predictor import predict_single
result = predict_single(transaction_dict, account_history_list)
# Returns: {"fraud_probability": 0.77, "risk_tier": "HIGH", "top_features": [...]}
```

---

### 2.4 Graph Engine — `graph/`

#### `graph/fund_flow.py` — FundFlowGraph
NetworkX DiGraph builder. Takes a DataFrame of transactions and builds a directed graph
where nodes are account IDs and edges are transactions (weighted by amount).

```python
ffg = FundFlowGraph()
ffg.build_from_df(transactions_df)
stats = ffg.get_graph_stats()  # {"total_nodes": N, "total_edges": M}
```

#### `graph/mule_detector.py` — Mule Account Detection
Computes a mule score (0.0–1.0) based on:
- **Passthrough ratio:** `total_forwarded / total_received` — mules receive then forward
- **Fan-out ratio:** unique receivers / total outgoing transactions
- **Is suspected mule:** `mule_score ≥ 0.6`

#### `graph/ring_detector.py` — Ring/Cycle Detection
Finds circular fund flows using `networkx.simple_cycles()` on the ego-subgraph.
Bounded to ego-subgraph (not full 499K-node graph) to stay fast.

#### Critical fix applied: SQL ego-subgraph (not global slice)
The original FundFlow code pre-loaded 10,000 transactions into a global NetworkX graph.
This silently returned empty results for any account not in that 10K slice.

**Fix:** Every `get_transaction_graph` call now builds the subgraph via SQL:
```python
# Step 1: all transactions where subject is sender or receiver
# Step 2: get all 1-hop counterparties
# Step 3: query up to 3000 transactions among those counterparties
# Step 4: build NetworkX from the combined result
```
This guarantees correctness for any account in the 499K-transaction database.

---

### 2.5 Scoring — `scoring/`
Composite risk engine that combines ML probability, mule score, and graph features
into a final risk assessment. Used as part of the STR evidence.

---

## 3. Sentinel AI Agent Layer (Layer 2)

### 3.1 Agentic Orchestrator — `agent/orchestrator.py`

**Framework:** LangGraph (built on LangChain, adds stateful graph execution)

**Pattern:** ReAct (Reasoning + Acting)
- The LLM receives a system prompt and the account ID
- It reasons about what to investigate next
- It calls a tool via function-calling (not string parsing)
- It receives the tool output
- It reasons about the next step
- Repeat until it has enough evidence, then generates the STR

**Why LangGraph over plain LangChain:**
LangGraph adds a state machine around the ReAct loop, making tool call ordering explicit,
preventing infinite loops, and enabling step-count enforcement (AGENT_MAX_STEPS=10).

**LLM:** GPT-4o-mini via OpenAI function-calling API
- Cost: ~$0.01–0.05 per investigation (input + output tokens)
- Model configured via `AGENT_LLM_MODEL` env var

**Proven agentic behaviour:**
In two test runs, the agent ran `detect_typology` before `score_risk` — the opposite of
the system prompt's suggested order. The LLM autonomously reordered based on what
`get_transaction_graph` returned. This is genuine ReAct agency, not a hardcoded pipeline.

---

### 3.2 The Five Agent Tools — `agent/tools.py`

All tools are decorated with `@tool` (LangChain tool decorator) and exposed to the
LangGraph ReAct agent via function-calling.

#### Tool 1: `get_transaction_history`
```python
Input:  account_id (str)
Output: summary dict + last 50 transactions
Source: SQL query on fundflow.db
```
Computes: total_sent, total_received, avg_amount, fraud_flagged_count, date_range.

#### Tool 2: `get_transaction_graph`
```python
Input:  account_id (str), max_hops (int, default 2)
Output: mule_score, is_suspected_mule, in_ring, ring_count, graph stats
Source: SQL ego-subgraph → NetworkX → mule_detector + ring_detector
```
Key design: builds graph fresh per call via SQL. Never pre-truncated.

#### Tool 3: `score_risk`
```python
Input:  account_id (str)
Output: fraud_probability, risk_tier, top_shap_features
Source: XGBoost predict_single + SHAP TreeExplainer
```
Uses the last 50 transactions as account history for behavioural features.

#### Tool 4: `search_regulations`
```python
Input:  query (str), top_k (int, default 3)
Output: list of {rank, source, page, text, distance}
Source: ChromaDB semantic search (all-MiniLM-L6-v2 embeddings)
```
Searches across 1,088 chunks from 4 real regulatory documents.

#### Tool 5: `detect_typology`
```python
Input:  account_id (str)
Output: list of detected typologies with risk level and description
Source: SQL + pattern rules + ego-subgraph analysis
```
Checks for: structuring (behavioral proxy), velocity burst, smurfing, round-tripping.

---

### 3.3 RAG Pipeline — `rag/`

#### Ingestion — `rag/ingest.py`
1. Scans `rag/corpus/` for all PDF files
2. Extracts text using `pdfplumber` (preserves page numbers)
3. Splits into chunks (~500 chars, 50-char overlap) using `langchain_text_splitters`
4. Embeds each chunk using `sentence-transformers/all-MiniLM-L6-v2` (runs locally, no API cost)
5. Stores in `ChromaDB` collection `"sentinel_regulations"` with metadata: `{source, page, chunk_id}`

**Run once:**
```bash
python run_ps6.py --ingest
```

#### Retrieval — `rag/retriever.py`
1. Embeds the query using the same `all-MiniLM-L6-v2` model
2. ChromaDB performs cosine similarity search
3. Returns top-k chunks with clean display names (mapped from PDF filenames)
4. Distance scores are included for transparency

**Display name mapping** (from cryptic PDF filename → readable citation):
```python
SOURCE_DISPLAY_NAMES = {
    "MD18KYCF6E92C82E1E1419D87323E3869BC9F13.pdf": "RBI Master Direction — KYC/AML 2016 (updated 2023)",
    "fatf-recommendations-2012.pdf":               "FATF Recommendations 2012 (updated 2023)",
    "sar_tti_01.pdf":                              "FinCEN SAR Activity Review",
    "AnnualReport_27122024.pdf":                   "MHA Annual Report 2023-24 (Cybercrime / Digital Arrest)",
}
```

**Corpus breakdown:**
| Document | Chunks | Notes |
|---|---|---|
| FATF Recommendations 2012 | 266 | Global AML standard; primary typology source |
| RBI KYC/AML Master Direction | 192 | India-specific bank obligations |
| FinCEN SAR Activity Review | 50 | US SAR patterns |
| MHA Annual Report 2023-24 | 580 | India cybercrime context |
| **Total** | **1,088** | |

**Retrieval quality:** Evaluated across 6 AML-specific queries. MHA appeared in only 1/18
hits (6%) — FATF and RBI dominate relevant results despite MHA being 53% by volume.

---

### 3.4 STR Generator — `agent/str_generator.py`

Takes all tool outputs and formats them into a 6-section draft STR:

| Section | Content | Source |
|---|---|---|
| Metadata | Account ID, risk tier, generated timestamp | — |
| A — Account Summary | Transaction counts, amounts, date range | Tool 1 |
| B — Graph Intelligence | Mule score, ring status, connected accounts | Tool 2 |
| C — ML Risk Scoring | Fraud probability, SHAP top-5 features | Tool 3 |
| D — AML Typology Analysis | Detected patterns (or "None detected") | Tool 5 |
| E — Regulatory Citations | Retrieved passages with source + page | Tool 4 |
| F — Recommendation + Disclaimer | ESCALATE/REVIEW/BLOCK + mandatory disclaimer | Guardrails |

**Important design decisions:**
- No ₹ (INR) symbols — amounts are synthetic PaySim units
- All amounts labelled "(synthetic units)"
- Disclaimer explicitly says: NOT court-admissible, NOT legal advice, draft only
- PMLA/RBI/FIU-IND listed as statutory filing basis (not RAG-generated claims)

---

### 3.5 Guardrails — `agent/guardrails.py`

Four rules enforced before the STR is returned to the analyst:

| Rule | Check | Fail action |
|---|---|---|
| G1 | Agent called ≥ 3 tools | VIOLATION — STR blocked |
| G2 | ≥ 1 RAG citation retrieved | VIOLATION — STR blocked |
| G3 | score_risk called + fraud_prob ≥ 0.6 | WARNING if prob < 0.6 |
| G4 | No uncited FATF/FinCEN claims | WARNING per uncited mention |

**Two-tier design for G4:**
- `_MUST_CITE_REGULATORS` = {FATF, FinCEN} — must be in retrieved passages
- `_LEGISLATIVE_WHITELIST` = {PMLA, RBI, FIU-IND} — statutory refs in STR header, not RAG claims
- SEBI is NOT in the corpus — not checked by G4

**Validation result on demo account C1953680528:**
```
Guardrails passed: True
Violations: []
Warnings: []
```

---

## 4. FastAPI Backend — `api/main.py`

### 4.1 Async Investigation Pattern

The LangGraph agent takes 30–90 seconds. FastAPI handles this with background threads:

```
POST /investigate
  → creates job_id in _jobs dict
  → starts Python Thread (daemon=True)
  → returns 202 + job_id immediately

Thread runs run_investigation(account_id)
  → writes result to _jobs[job_id]

GET /investigate/{job_id}
  → reads from _jobs dict
  → returns status: "running" | "done" | "error"
  → when "done": returns full structured result
```

**No Redis, no Celery** — simple in-memory dict with threading.Lock. Sufficient for
hackathon demo (single-process, no concurrency issues at 1–5 concurrent investigations).

### 4.2 STR Parsing for React

The LangGraph agent produces a plaintext STR. The `_parse_str_sections()` function
parses this into structured JSON that React can render as accordion sections:

```json
{
  "risk_tier": "HIGH",
  "fraud_probability": 0.7725,
  "account_summary": { "total_transactions": "16", ... },
  "graph_intelligence": { "mule_score": "0.0000", ... },
  "ml_risk": { "fraud_probability": "0.7725", "top_shap_features": [...] },
  "typologies": [],
  "regulatory_citations": [{ "rank": 1, "source": "FATF...", "page": 40, "text": "..." }],
  "recommendation": "ESCALATE",
  "disclaimer": "AI-generated DRAFT..."
}
```

### 4.3 CORS Configuration

Configured for React dev servers:
```python
allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:4173"]
```

For production deployment, replace with your actual frontend domain.

---

## 5. Streamlit Console — `console/app.py`

Fallback UI — same agent, same tools, same results as the React frontend.

4 tabs:
- **Investigate** — account input, agent invocation, STR render
- **Graph View** — Plotly network graph (force-directed)
- **RAG Lookup** — direct regulatory corpus search
- **Alerts** — DB alert browser with severity filter

Sidebar shows: DB stats (synthetic disclaimer), demo accounts, fraud rate note.

---

## 6. Environment and Deployment

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | ✅ Yes | — | OpenAI API key (GPT-4o-mini) |
| `PS6_DB_PATH` | ✅ Yes | `./fundflow.db` | Path to SQLite database |
| `CHROMA_DB_PATH` | ✅ Yes | `./rag/vector_store` | Path to Chroma vector store |
| `AGENT_LLM_MODEL` | No | `gpt-4o-mini` | OpenAI model name |
| `AGENT_MAX_STEPS` | No | `10` | Max ReAct loop iterations |
| `AGENT_EVIDENCE_THRESHOLD` | No | `0.6` | Min fraud_prob before G3 warns |

### Run Commands

```bash
# Verify all components work
python run_ps6.py --verify

# Ingest regulatory PDFs into ChromaDB (run once)
python run_ps6.py --ingest

# Start FastAPI backend (React frontend connects here)
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload

# Start Streamlit console (fallback UI)
python run_ps6.py --console

# Full end-to-end agent test
python test_agent.py

# RAG retrieval test
python test_rag.py

# All 7 integration checks
python verify_all.py
```

---

## 7. Data Provenance

| Data | Source | Reality |
|---|---|---|
| Transactions | PaySim (synthetic) — augmented by FundFlow | Synthetic. Amounts NOT INR. |
| Fraud labels | PaySim ground truth (rebalanced) | 1.84% fraud rate (raw PaySim is ~0.13%) |
| Account profiles | Derived from transaction aggregates | Synthetic |
| Regulatory text | Real PDFs (FATF, RBI, FinCEN, MHA) | Real regulatory documents |
| Model (XGBoost) | Trained on PaySim | Not trained on real Indian bank data |

**PaySim origin:** PaySim was originally derived from African mobile-money transaction data.
It is widely used in fraud detection research but is not representative of Indian bank transactions.
The platform architecture is data-agnostic — it works on any SQL-accessible transaction table.

---

## 8. Known Limitations

| Limitation | Impact | Production fix |
|---|---|---|
| XGBoost pickle version warning | Cosmetic only — model works correctly | `booster.save_model()` format |
| In-memory job store | Jobs lost on server restart | Redis + Celery |
| No streaming tool trace | Frontend shows spinner only | SSE / WebSocket |
| Typology thresholds are relative | Structuring uses account ceiling, not INR | Real regulatory thresholds |
| PaySim data only | Model not trained on real Indian transactions | AMLSim / real bank data |
| Single process FastAPI | Not scalable beyond ~5 concurrent investigations | Gunicorn with workers |

---

*Sentinel AI — PS6 Hackathon 2026 | Team Cypher*
*Document covers implementation as of: 2026-07-16*
