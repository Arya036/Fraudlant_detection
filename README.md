# Sentinel AI — AML Investigation Agent

> **PS6 Hackathon Submission** | AI for Digital Public Safety: Defeating Counterfeiting, Fraud & Digital Arrest Scams

[![Python 3.11](https://img.shields.io/badge/Python-3.11-blue?style=flat-square)](https://python.org)
[![LangGraph](https://img.shields.io/badge/Agent-LangGraph_ReAct-purple?style=flat-square)](https://langchain-ai.github.io/langgraph/)
[![XGBoost](https://img.shields.io/badge/Model-XGBoost-orange?style=flat-square)](https://xgboost.readthedocs.io/)
[![ChromaDB](https://img.shields.io/badge/RAG-ChromaDB-green?style=flat-square)](https://trychroma.com)
[![Streamlit](https://img.shields.io/badge/UI-Streamlit-red?style=flat-square)](https://streamlit.io)

---

## What is Sentinel AI?

Sentinel AI is an **autonomous AML (Anti-Money Laundering) investigation platform** that takes a flagged bank account ID and produces a fully-cited, human-ready draft Suspicious Transaction Report (STR) — the document Indian financial institutions file with FIU-IND under PMLA, 2002.

A compliance analyst enters one account ID. The AI agent takes over: it queries transaction history, traces the fund-flow graph, scores fraud risk with XGBoost, retrieves relevant FATF/RBI/FinCEN regulatory passages via RAG, detects money laundering typologies, and synthesises everything into a structured draft STR — typically in under 90 seconds (measured on test hardware).

**The human analyst reviews, verifies, and files. The agent does the hours of data assembly.**

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     SENTINEL AI PLATFORM                        │
│                                                                 │
│  ┌─────────────────────────┐   ┌──────────────────────────────┐ │
│  │  MODULE 1               │   │  STREAMLIT CONSOLE (UI)      │ │
│  │  FundFlow Graph Engine  │   │  4-tab investigation UI      │ │
│  │  (XGBoost + NetworkX)   │   │  Plotly network graphs       │ │
│  └──────────┬──────────────┘   │  RAG search interface        │ │
│             │ tools            │  Alert browser               │ │
│             ▼                  └──────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │             MODULE 2: AGENTIC AML INVESTIGATOR           │   │
│  │                                                          │   │
│  │  LangGraph ReAct Agent  (GPT-4o-mini, function-calling)  │   │
│  │                                                          │   │
│  │  Tool 1: get_transaction_history  → SQL over SQLite      │   │
│  │  Tool 2: get_transaction_graph    → NetworkX ego-graph   │   │
│  │  Tool 3: score_risk               → XGBoost + SHAP       │   │
│  │  Tool 4: search_regulations       → ChromaDB RAG         │   │
│  │  Tool 5: detect_typology          → AML pattern engine   │   │
│  │                        ↓                                 │   │
│  │  [Draft STR] → Guardrails → [Analyst Review]             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  RAG CORPUS (1,088 chunks, Chroma + all-MiniLM-L6-v2)   │   │
│  │  FATF Recommendations 2012 (updated 2023)                │   │
│  │  RBI KYC/AML Master Direction 2016 (updated 2023)        │   │
│  │  FinCEN SAR Activity Review                              │   │
│  │  MHA Annual Report 2023-24 (Digital Arrest / Cybercrime) │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Features

### Autonomous Investigation Agent
- **LangGraph ReAct loop** — the LLM selects which tool to call next based on what it has seen so far. It is not a hardcoded pipeline. If an account has zero transactions, the agent terminates early. If risk is LOW, it may skip typology analysis.
- **5 specialised tools** that the agent chains autonomously
- **Guardrails system** — enforces minimum tool calls, requires regulatory citation before STR generation, flags uncited regulatory claims (hallucination detection)

### Fund Flow Graph Engine
- Built a SQL-first ego-subgraph construction that queries the full 499K-transaction database for every account's 2-hop neighbourhood — never pre-truncated, always correct regardless of account position
- Mule account scoring algorithm: passthrough ratio + fan-out ratio → `mule_score` (0.0–1.0)
- Ring/circular fund flow detection using `networkx.simple_cycles()` on bounded ego-subgraph (fast, not exponential)
- Full NetworkX DiGraph construction with weighted edges (transaction amount) and node risk attributes

### ML Risk Scoring
- XGBoost model trained on PaySim synthetic dataset
- SHAP explainability: top-5 feature contributions per prediction
- Risk tiers: LOW / MEDIUM / HIGH / CRITICAL with configurable thresholds

### Regulatory RAG
- 1,088 chunks from 4 real regulatory documents ingested into ChromaDB
- `all-MiniLM-L6-v2` embeddings (local, no API cost)
- Every STR citation includes document name + page number

### AML Typology Detection
- **Structuring** — pattern-based clustering near account ceiling (dataset-agnostic)
- **Velocity burst** — transactions-per-hour spike detection
- **Mule account** — passthrough ratio + mule_score ≥ 0.6
- **Round-tripping** — circular fund flow within 48h window
- **Smurfing** — fan-in from ≥ 5 unique senders

### Guardrails (Citation Enforcement)
- **G1** — Agent must call ≥ 3 tools before STR generation
- **G2** — At least 1 RAG citation required in every STR
- **G3** — `score_risk` must be called; warns if fraud_probability < 0.6
- **G4** — Flags uncited FATF/FinCEN claims (whitelists PMLA/RBI/FIU-IND as statutory boilerplate; SEBI not in corpus)

---

## Project Structure

```
e:\PS6\
├── agent/
│   ├── orchestrator.py     # LangGraph ReAct agent — main investigation loop
│   ├── tools.py            # 5 agent tools (history, graph, risk, RAG, typology)
│   ├── str_generator.py    # Draft STR formatter (Sections A–F)
│   └── guardrails.py       # Citation + evidence enforcement (G1–G4)
│
├── rag/
│   ├── ingest.py           # PDF → chunks → ChromaDB (run once)
│   ├── retriever.py        # Semantic search over regulatory corpus
│   ├── corpus/             # Place regulatory PDFs here
│   └── vector_store/       # Chroma persistent store (auto-created)
│
├── console/
│   └── app.py              # Streamlit 4-tab investigation console
│
├── models/                 # XGBoost fraud model (trained by us on PaySim)
├── graph/                  # Fund flow graph engine (NetworkX)
├── features/               # 49-feature engineering pipeline
├── explainability/         # SHAP via XGBoost native predict_contribs
├── scoring/                # Composite risk + alert engine
│
├── run_ps6.py              # Startup script (--ingest / --console)
├── test_agent.py           # End-to-end agent test
├── test_rag.py             # RAG retrieval test
└── requirements_ps6.txt    # All dependencies
```

---

## Quickstart

### 1. Prerequisites

```bash
# Python 3.11+ required
# Git clone or copy this folder to your machine
```

### 2. Environment setup

```bash
# If using the shared venv:
e:\Fraud_Detection\.venv\Scripts\activate

# Install PS6-specific dependencies
pip install -r requirements_ps6.txt
```

### 3. Configure environment variables

Copy `.env.example` to `.env` and fill in:

```env
OPENAI_API_KEY=sk-proj-...your-key...
PS6_DB_PATH=e:\PS6\fundflow.db
CHROMA_DB_PATH=e:\PS6\rag\vector_store
AGENT_LLM_MODEL=gpt-4o-mini
AGENT_MAX_STEPS=10
AGENT_EVIDENCE_THRESHOLD=0.6
```

### 4. Ingest the RAG corpus (once)

```bash
# Place regulatory PDFs in rag/corpus/ then:
python run_ps6.py --ingest
# Expected: ~1088 chunks ingested across 4 documents
```

### 5. Launch the console

```bash
python run_ps6.py --console
# Opens at http://localhost:8501
```

### 6. Run the end-to-end agent test

```bash
python test_agent.py
# Investigates account C1953680528 (16 txns, all fraud-flagged, prob=0.77, CRITICAL)
# Output: full cited STR saved to test_str_output.txt
```

---

## Demo Accounts

All accounts below are CRITICAL tier with multiple fraud-flagged transactions:

| Account ID | Transactions | Fraud-flagged | Max Fraud Prob | Tier |
|---|---|---|---|---|
| `C1953680528` | 16 | 16 | 1.000 | CRITICAL |
| `C658156224` | 15 | 15 | 1.000 | CRITICAL |
| `C832102131` | 14 | 14 | 0.999 | CRITICAL |
| `C111612613` | 13 | 13 | 1.000 | CRITICAL |

---

## Datasets & Data Provenance

| Data | Source | Status |
|---|---|---|
| Transaction data | PaySim (synthetic) — FundFlow-augmented | Synthetic — amounts are not INR |
| Fraud rate (1.84%) | FundFlow rebalanced PaySim | Higher than raw PaySim's ~0.13% by design |
| Regulatory corpus | Real PDFs (FATF, RBI, FinCEN, MHA) | Real regulatory documents |

> **Disclosure:** All transaction data is synthetic (PaySim-derived). Amounts are in synthetic units, not INR. Absolute regulatory thresholds (e.g. PMLA ₹10L) are not applicable to this dataset. The fraud rate of 1.84% reflects FundFlow's rebalanced training set. All STR outputs are internal compliance drafts for human analyst review — not court-admissible evidence.

---

## Judging Alignment (PS6 Criteria)

| Criterion | Weight | How We Address It |
|---|---|---|
| Innovation | 30% | LangGraph ReAct agent autonomously chains 5 domain-specific AML tools; genuine function-calling LLM orchestration (not a pipeline) |
| Technical Implementation | 30% | XGBoost + SHAP, NetworkX ego-graph, ChromaDB RAG, LangGraph — all integrated end-to-end |
| Scalability | 15% | Modular tool design; SQL-based graph construction (no pre-truncation); vector store scales to full corpus |
| User Experience | 15% | 4-tab Streamlit console; dark theme; real-time investigation flow; full cited STR output |
| Impact | 10% | Directly addresses FIU-IND STR filing workflow; reduces AML analyst assembly time from hours to minutes (tested at ~90s per investigation) |

---

## Limitations & Honest Disclosures

1. **Synthetic data** — The XGBoost model is trained on PaySim (a synthetic mobile-money dataset, not Indian bank data). Graph patterns reflect synthetic behaviour. The system architecture is data-agnostic and would work on real transaction exports.
2. **No real-time streaming** — Transactions are batch-loaded into SQLite, not ingested in real-time.
3. **Graph is ego-subgraph only** — For performance, graph analysis is scoped to 2-hop neighbourhood. The full 499K-transaction graph is not traversed during investigation.
4. **STR is a draft** — All outputs require human compliance officer review before any regulatory filing.
5. **Typology thresholds are relative** — Structuring detection uses account-relative amount ceiling, not absolute INR thresholds (which are meaningless on synthetic data).

---

## How We Built It

Sentinel AI was built in two phases:

### Phase 1 — ML Foundation (FundFlow)
We built a complete transaction fraud detection stack from scratch:
- **Data pipeline:** Downloaded the PaySim synthetic dataset, designed `ingestion/loader.py` to parse, clean, and map PaySim's transaction types to Indian banking conventions (UPI/NEFT/ATM/IMPS). Built the SQLite schema and loaded 499,196 transactions.
- **Feature engineering:** Implemented 49 features across 6 categories in `features/engineering.py` — transaction-level signals, rolling time-window velocity (1h/24h), new-receiver flags, cross-bank UPI detection, structuring threshold proximity, graph-derived signals (mule score, passthrough ratio), and India-specific features (KYC risk tier, CIBIL credit flag).
- **Model training:** Trained an XGBoost binary classifier (`models/trainer.py`) with `scale_pos_weight=53.28` to handle class imbalance, using `eval_metric=aucpr` (chosen over AUC specifically because of imbalance). Achieved PR-AUC=0.72, Recall=0.82 at threshold 0.70.
- **Graph engine:** Built `graph/fund_flow.py` (NetworkX DiGraph), `graph/mule_detector.py` (passthrough + fan-out ratio algorithm), and `graph/ring_detector.py` (ego-bounded simple-cycles). Solved the performance problem by constructing ego-subgraphs via SQL rather than loading the full 499K graph into memory.
- **SHAP explainability:** Integrated XGBoost's native `predict_contribs()` (true log-odds SHAP values per feature, no external shap package needed) via `models/predictor.py`. Values are in the correct ±0.1 to ±3 log-odds range.
- **Alert generation:** Built `scoring/composite.py` to apply rule-based + ML thresholds and write structured alerts to the SQLite `alerts` table.

### Phase 2 — Agentic Investigation Layer (Sentinel AI)
Built on top of the ML foundation:
- **LangGraph ReAct agent** — orchestrates the 5 tools autonomously using GPT-4o-mini function-calling. Tool order is not hardcoded; the LLM decides based on what each tool returns.
- **Regulatory RAG** — ingested 4 real regulatory PDFs (1,088 chunks) into ChromaDB. Built `rag/retriever.py` with source→display-name mapping for clean citations in STRs.
- **STR generator** — formats all tool evidence into a 6-section draft STR aligned to FIU-IND/RBI/PMLA structure.
- **Guardrail system** — enforces citation requirements and minimum evidence before STR generation (G1–G4).
- **FastAPI backend** — async investigation endpoint with job polling, graph endpoint, RAG search, and alerts API for the React frontend.
- **Streamlit console** — 4-tab investigation UI for demo and fallback.


---

## Team

**Team Cypher** — PS6 Hackathon 2026
*AI for Digital Public Safety*

---

*All STR outputs generated by this system are AI-generated internal compliance drafts.
They are NOT filed STRs, NOT legal advice, and NOT court-admissible evidence.
Independent verification by a certified compliance officer is required before any regulatory action.*
