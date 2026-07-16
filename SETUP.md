# Sentinel AI — Setup Guide
### Running the Project on a Different PC
*For React frontend developer — PS6 Hackathon 2026*

---

> **What this project does:** An AI agent takes a suspicious bank account ID and autonomously
> investigates it (transaction history → fund-flow graph → ML risk score → regulatory citations)
> and produces a draft Suspicious Transaction Report (STR).
>
> **What you need to run it:** Python 3.11+, an OpenAI API key, and the two large data files
> that cannot be stored in GitHub (see Step 4 below).

---

## Prerequisites

| Requirement | Version | Check |
|---|---|---|
| Python | 3.11 or 3.12 | `python --version` |
| pip | latest | `pip --version` |
| Git | any | `git --version` |
| OpenAI API key | GPT-4o-mini access | sk-proj-... |

> **Windows users:** All commands below use PowerShell. If you prefer CMD, they work the same.

---

## Step 1 — Clone the Repository

```bash
git clone https://github.com/<your-username>/sentinel-ai.git
cd sentinel-ai
```

---

## Step 2 — Create and Activate a Virtual Environment

```bash
# Create venv
python -m venv .venv

# Activate (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# Activate (Windows CMD)
.\.venv\Scripts\activate.bat

# Activate (Mac / Linux)
source .venv/bin/activate
```

You should see `(.venv)` in your terminal prompt.

---

## Step 3 — Install Dependencies

```bash
pip install -r requirements_ps6.txt
```

This installs: FastAPI, LangGraph, OpenAI SDK, XGBoost, ChromaDB, sentence-transformers,
NetworkX, Streamlit, SHAP, pandas, and all supporting libraries.

**Expected time:** 3–8 minutes (downloads ~500MB of packages).

---

## Step 4 — Get the Large Data Files (NOT in GitHub)

Two files are too large for GitHub (>100MB each) and must be downloaded separately.

### 4a. Download `fundflow.db` — the transaction database (215MB)

```
[PLACEHOLDER: Add your Google Drive / Dropbox link here before sharing]
Download link: https://drive.google.com/...
```

Place the file at the **root of the project folder**:
```
sentinel-ai/
└── fundflow.db   ← place here
```

Verify it works:
```bash
python -c "import sqlite3; c=sqlite3.connect('fundflow.db'); print(c.execute('SELECT COUNT(*) FROM transactions').fetchone())"
# Expected output: (499196,)
```

### 4b. RAG Vector Store — two options

**Option A (faster): Download pre-built vector store**
```
[PLACEHOLDER: Add your Google Drive / Dropbox link here before sharing]
Download link: https://drive.google.com/...
```
Extract the zip and place it at:
```
sentinel-ai/
└── rag/
    └── vector_store/   ← place extracted folder here
        ├── chroma.sqlite3
        └── ...
```

**Option B: Re-ingest from PDFs (takes 5–10 min, requires the 4 PDFs)**
```bash
# Place the 4 regulatory PDFs in rag/corpus/:
#   - fatf-recommendations-2012.pdf
#   - MD18KYCF6E92C82E1E1419D87323E3869BC9F13.pdf  (RBI KYC/AML)
#   - sar_tti_01.pdf                                 (FinCEN SAR)
#   - AnnualReport_27122024.pdf                       (MHA)
#
# Then run:
python run_ps6.py --ingest
# Expected: "Ingestion complete. 1088 chunks stored."
```

---

## Step 5 — Configure Environment Variables

```bash
# Copy the example file
copy .env.example .env       # Windows
cp .env.example .env         # Mac/Linux
```

Open `.env` and fill in your values:

```env
OPENAI_API_KEY=sk-proj-...your-actual-key...
PS6_DB_PATH=./fundflow.db
CHROMA_DB_PATH=./rag/vector_store
AGENT_LLM_MODEL=gpt-4o-mini
AGENT_MAX_STEPS=10
AGENT_EVIDENCE_THRESHOLD=0.6
API_HOST=0.0.0.0
API_PORT=8000
```

> **On Mac/Linux:** Use forward slashes — `./fundflow.db` not `.\fundflow.db`

---

## Step 6 — Verify the Setup

Run the verification script (no OpenAI calls, instant):
```bash
python run_ps6.py --verify
```

Expected output:
```
[1/3] Verifying XGBoost model...  [PASS] Model OK -- fraud_prob=0.XXXX, tier=...
[2/3] Verifying database...        [PASS] DB OK -- 499,196 transactions
[3/3] Verifying graph engine...    [PASS] Graph OK -- XXXX nodes
[ALL PASS]
```

If any check fails, see Troubleshooting at the bottom.

---

## Step 7 — Start the FastAPI Backend

```bash
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

The API starts at **http://localhost:8000**

- **API docs (Swagger):** http://localhost:8000/docs
- **Health check:** http://localhost:8000/health

Test it:
```bash
curl http://localhost:8000/health
# Expected: {"status":"ok","db":{"transactions":499196,...},"rag_ingested":true,...}
```

> **Tip:** `--reload` restarts the server automatically when you edit Python files.
> Remove it in production.

---

## Step 8 — Connect Your React Frontend

In your React project, set the API base URL:

```bash
# In your React project root:
echo "VITE_API_BASE=http://localhost:8000" > .env.local
```

Or for Next.js:
```bash
echo "NEXT_PUBLIC_API_BASE=http://localhost:8000" > .env.local
```

CORS is pre-configured for:
- `http://localhost:5173` (Vite)
- `http://localhost:3000` (Next.js)
- `http://localhost:4173` (Vite preview)

---

## API Quick Reference

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Platform stats (transactions, alerts, model status) |
| `/investigate` | POST | Start investigation → returns `job_id` |
| `/investigate/{job_id}` | GET | Poll status → returns full STR when done |
| `/tools/graph` | POST | Build transaction network graph |
| `/tools/rag` | POST | Search regulatory corpus |
| `/alerts` | GET | List database alerts |
| `/transactions/{account_id}` | GET | Raw transaction history |
| `/docs` | GET | Interactive Swagger UI |

---

## Demo Accounts (for testing)

All accounts below are CRITICAL tier with multiple fraud-flagged transactions:

| Account ID | Transactions | Max Fraud Prob | Best for |
|---|---|---|---|
| `C1953680528` | 16 | 1.000 | Primary demo account |
| `C658156224` | 15 | 1.000 | Alternate demo |
| `C832102131` | 14 | 0.999 | Alternate demo |
| `C111612613` | 13 | 1.000 | Alternate demo |

---

## Optional — Run the Streamlit Console

If you want to run the original Streamlit UI (useful as a fallback):

```bash
python run_ps6.py --console
# Opens at http://localhost:8501
```

---

## Troubleshooting

### "fundflow.db not found"
```
[FAIL] DB FAILED: no such file or directory
```
→ Download fundflow.db from the shared link (Step 4a) and place it in the project root.
→ Check `PS6_DB_PATH` in your `.env` — use absolute path if relative path fails.

### "No module named 'langchain'"
```
ModuleNotFoundError: No module named 'langchain'
```
→ Your venv isn't activated. Run `.\.venv\Scripts\Activate.ps1` first, then re-run pip install.

### "ChromaDB collection not found" or RAG returns empty
```
ValueError: Collection sentinel_regulations does not exist
```
→ The vector store isn't set up. Either download it (Step 4b Option A) or run `python run_ps6.py --ingest`.

### "OPENAI_API_KEY not set" / "AuthenticationError"
→ Check your `.env` file has `OPENAI_API_KEY=sk-proj-...`
→ Make sure you're running uvicorn from the project root (where `.env` lives).

### "Access is denied" / PowerShell execution policy (Windows)
```
cannot be loaded because running scripts is disabled
```
→ Run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

### "XGBoost pickle version warning"
```
UserWarning: If you are loading a serialized model...
```
→ This is a cosmetic warning, not an error. The model still works correctly.

### Port 8000 already in use
```
ERROR: [Errno 10048] Only one usage of each socket address is normally permitted
```
→ Change port: `uvicorn api.main:app --port 8001 --reload`
→ Update your React `.env.local`: `VITE_API_BASE=http://localhost:8001`

---

## Project Structure (reference)

```
sentinel-ai/
├── agent/
│   ├── orchestrator.py     # LangGraph ReAct agent
│   ├── tools.py            # 5 agent tools
│   ├── str_generator.py    # Draft STR formatter
│   └── guardrails.py       # Citation enforcement (G1-G4)
│
├── api/
│   └── main.py             # FastAPI backend ← connect your React here
│
├── rag/
│   ├── ingest.py           # PDF → ChromaDB ingestion
│   ├── retriever.py        # Semantic regulatory search
│   ├── corpus/             # Place regulatory PDFs here
│   └── vector_store/       # Chroma DB (download or run --ingest)
│
├── console/
│   └── app.py              # Streamlit UI (fallback)
│
├── models/                 # XGBoost model
├── graph/                  # NetworkX graph engine
├── features/               # Feature engineering
├── explainability/         # SHAP
├── scoring/                # Risk scoring
│
├── fundflow.db             # ← DOWNLOAD THIS (215MB, not in git)
├── run_ps6.py              # Startup: --verify / --ingest / --console
├── .env.example            # Copy to .env and fill in API key
└── requirements_ps6.txt    # All Python dependencies
```

---

*Sentinel AI — PS6 Hackathon 2026 | Team Cypher*
