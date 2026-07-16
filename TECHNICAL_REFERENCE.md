# Sentinel AI — Technical Implementation Reference
### How Everything Was Built

---

## 1. System Overview

Sentinel AI was built in two phases on top of a common codebase:

- **Phase 1 — FundFlow ML Foundation** (the ML backbone we built):
  A production-grade fraud detection engine covering data ingestion, SQLite schema design,
  49-feature engineering, XGBoost model training, NetworkX graph construction, SHAP explainability,
  and alert generation. All built from scratch on the PaySim synthetic dataset.

- **Phase 2 — Sentinel AI Agentic Layer** (built for PS6):
  An autonomous AML investigator that wires the FundFlow tools into a LangGraph ReAct loop,
  adds a regulatory RAG pipeline (ChromaDB + real regulatory PDFs), an STR draft generator
  aligned to FIU-IND/PMLA format, a guardrails system, and a FastAPI backend.

```
React Frontend
      │
      ▼
FastAPI (api/main.py)           ← Phase 2: Sentinel AI
      │
      ├──► LangGraph ReAct Agent (orchestrator.py)
      │          │
      │     Tool 1: get_transaction_history  ──► SQLite (fundflow.db)   ← Phase 1: FundFlow
      │     Tool 2: get_transaction_graph    ──► NetworkX ego-subgraph   ← Phase 1: FundFlow
      │     Tool 3: score_risk              ──► XGBoost + SHAP          ← Phase 1: FundFlow
      │     Tool 4: search_regulations      ──► ChromaDB RAG             ← Phase 2: Sentinel AI
      │     Tool 5: detect_typology         ──► Pattern rules + graph    ← Phase 1+2: hybrid
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

## 2. FundFlow ML Foundation — What We Built

FundFlow is the ML backbone we built to power Sentinel AI's tools. It covers
the full stack from raw CSV ingestion to a trained XGBoost model, graph engine,
and alert generation.

### 2.0 Data Pipeline — `ingestion/loader.py`

Starting point: the PaySim synthetic dataset (499,196 transactions, ~0.13% fraud rate).

**What we built:**
1. CSV parser and cleaner — handles PaySim column naming, converts timestamps
2. **Type remapping** — PaySim uses African mobile-money types (CASH_IN/CASH_OUT/TRANSFER).
   We mapped these to Indian banking conventions:
   ```
   TRANSFER → UPI / NEFT / IMPS  (randomly assigned by amount tier)
   CASH_OUT → ATM
   CASH_IN  → DEPOSIT
   PAYMENT  → UPI (small amount)
   ```
   Fraud labels come from PaySim's original `isFraud` column — the type remapping
   does not affect which transactions are labelled fraud.
3. **Class rebalancing** — 0.13% → 1.84% fraud rate via stratified undersampling of
   legitimate transactions. `scale_pos_weight=53.28` compensates in the XGBoost training objective.
4. SQLite schema creation and bulk insert of all 499,196 rows into `fundflow.db`.
5. Batch inference pass: runs XGBoost on all transactions and writes `fraud_probability`
   and `risk_tier` back into the `transactions` table.
6. Alert generation: applies rule-based + ML thresholds to identify suspicious patterns
   and writes them to the `alerts` table.

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

We designed and implemented 49 features across 6 categories. All features are computed
causally (no future leakage — rolling windows use only past rows).

**Category 1: Transaction-level (6 features)**
| Feature | Description |
|---|---|
| `amount_log` | `log1p(amount)` — normalises the heavy right tail |
| `hour_of_day`, `day_of_week` | Time signals |
| `is_weekend`, `is_night` | Binary time flags (night = midnight–6am) |
| `is_cross_branch` | Sender and receiver in different branches |

**Category 2: Amount tier + transaction type (8 features)**
| Feature | Description |
|---|---|
| `amount_bucket` | 5-tier (0=everyday UPI <₹500, 4=RTGS >₹1L) |
| `type_NEFT/UPI/ATM/DEPOSIT/IMPS` | One-hot encoded transaction type |
| `channel_mobile`, `channel_internet` | Channel one-hot |

**Category 3: New receiver + cross-bank UPI (3 features)**
| Feature | Description |
|---|---|
| `is_new_receiver` | First time this sender has sent to this receiver (causal) |
| `is_cross_bank_upi` | UPI between two different simulated bank handles |
| `upi_new_recv_risk` | UPI + new receiver + amount > ₹10K (composite risk signal) |

**Category 4: Rolling velocity windows (8 features)**
| Feature | Description |
|---|---|
| `sender_txn_count_1h/24h` | Transaction count in rolling 1h/24h window |
| `sender_avg_amount` | Expanding mean of sender's past amounts (no leakage) |
| `sender_std_amount` | Expanding std dev of sender's past amounts |
| `amount_deviation` | (amount − mean) / std, clipped [−10, 10] |
| `sender_unique_receivers_1h` | Unique receivers in last 1 hour |
| `time_since_last_txn_min` | Minutes since sender's previous transaction |
| `hour_velocity_ratio` | 1h rate vs 24h baseline (burst signal) |

**Category 5: Rule-based AML signals (10 features)**

Designed to flag structuring, velocity bursts, and round-number patterns regardless of ML.

| Feature | AML Pattern |
|---|---|
| `near_50k/100k/1m_threshold` | Amount just below reporting threshold (structuring) |
| `near_any_threshold` | OR of the above |
| `is_round_10k`, `is_round_1k` | Round-number detection (layering indicator) |
| `high_velocity_1h/24h` | ≥5 txns/hour or ≥20 txns/day (burst) |
| `rapid_succession` | Last transaction < 5 min ago |
| `amount_gt_5x_avg` | Current amount > 5× sender's historical average |

**Category 6: India-specific features (2 features)**
| Feature | Signal |
|---|---|
| `kyc_risk_flag` | OTP-only eKYC + account age < 90 days (mule onboarding proxy) |
| `cibil_high_txn_flag` | Credit score < 550 + large transfer (high-risk customer) |

*Graph features (sender/receiver mule score, passthrough ratio, ring membership) are computed
separately in `graph/` and joined as an additional 11 features — documented in section 2.4.*

---

### 2.3 XGBoost Fraud Model — `models/predictor.py`

**Training data:** PaySim synthetic transactions (rebalanced — original ~0.13% fraud rate → 1.84%).

**Architecture:**
- XGBoost binary classifier (`binary:logistic`), 200 estimators, max depth 6
- Input: 49 engineered features (transaction-level, velocity, graph, India-specific)
- Output: `fraud_probability` (0.0–1.0), `risk_tier`, SHAP feature contributions

**Risk tiers:**
| Probability | Tier |
|---|---|
| ≥ 0.80 | CRITICAL |
| 0.60–0.80 | HIGH → BLOCK at threshold 0.70 |
| 0.30–0.60 | MEDIUM → FLAG |
| < 0.30 | LOW → PASS |

**Evaluated metrics (both distributions — see `eval_natural_distribution.py`):**
| Metric | Rebalanced eval set (1.84%) | Natural full dataset (1.84%) |
|---|---|---|
| PR-AUC | 0.7224 | 0.7128 |
| Precision @ 0.70 | 0.2896 | 0.2925 |
| Recall @ 0.70 | 0.8119 | 0.8174 |
| F1 @ 0.70 | 0.4269 | 0.4308 |
| ROC-AUC | 0.9666 | 0.9669 |

> Both distributions give near-identical results because the DB fraud rate (1.84%) matches
> the eval set — both are post-augmentation. The natural PaySim base rate of ~0.13% was not
> separately evaluated (augmentation was applied before splitting).

**Threshold rationale (0.70):** Maximises recall (catch as many fraud cases as possible).
Precision 0.29 = 3 in 10 alerts are real fraud. In AML, missing a real STR is worse than
a false alert (analyst triage cost). High-recall / lower-precision is deliberate.

**SHAP — XGBoost native `predict_contribs()`:**
Returns true log-odds SHAP contributions per feature without requiring the `shap` package
(which imports `torch` and fails on some environments due to DLL issues).
```python
booster.predict(dmatrix, pred_contribs=True)  # shape (n, n_features+1)
# Last column is bias term — drop it. Values in log-odds scale (typically +-0.1 to +-3).
```
Explainer booster cached at module level (`_shap_explainer`) — loads once per process.
Example real SHAP values: `hour_of_day: +2.258`, `receiver_is_pure_receiver: +1.240`
(vs. the old proxy which produced `sender_avg_amount: 225.0` — that was feature×importance, not SHAP).

**Feature leakage:** Confirmed clean. `sender_avg_amount` in `engineer_single()` is computed
from `account_history` (past DB rows, fetched before the current transaction exists in the DB).
The current transaction is never included in its own rolling features.

**Augmentation methodology:** PaySim types (CASH-IN/CASH-OUT/TRANSFER etc.) were remapped
to Indian types (UPI/NEFT/ATM) in `ingestion/loader.py`. Fraud labels come from PaySim's
original `isFraud` column — fraud assignment was NOT derived from the type remapping.

**Model file:** `models/saved/xgboost_fraud.pkl` (pickle, ~8MB)

**Prediction interface:**
```python
from models.predictor import predict_single
result = predict_single(transaction_dict, account_history_df)
# Returns: {"fraud_probability": 0.84, "risk_tier": "CRITICAL",
#           "top_features": [{"feature": "hour_of_day", "shap_value": 2.258, ...}]}
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

#### Design decision: SQL ego-subgraph (not in-memory global graph)
The initial implementation pre-loaded a fixed slice of transactions into a single global
NetworkX graph. This silently returned empty results for any account outside that slice.

**Redesigned approach:** Every `get_transaction_graph` call builds its own subgraph via SQL:
```python
# Step 1: all transactions where subject is sender or receiver
# Step 2: get all 1-hop counterparties
# Step 3: query up to 3000 transactions among those counterparties
# Step 4: build NetworkX from the combined result
```
This guarantees correctness for any of the 499K accounts in the database.


---

### 2.5 Scoring — `scoring/`
Composite risk engine that combines ML probability, mule score, and graph features
into a final risk assessment. Used as part of the STR evidence.

---

## 3. Sentinel AI Agent Layer (Phase 2)

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
Output: fraud_probability, risk_tier, top_features (real SHAP log-odds)
Source: XGBoost predict_single + native predict_contribs() SHAP
```
Fetches last 50 transactions from DB as account history for behavioural features.
SHAP values are true log-odds contributions (e.g. `hour_of_day: +2.26`) — not the
feature×importance proxy that was in the original code (which produced `225.0`).

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

# Natural-distribution model evaluation (run once, save the output)
python eval_natural_distribution.py
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
