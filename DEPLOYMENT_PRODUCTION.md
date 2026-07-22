# Sentinel AI — Production Deployment Guide

This document describes how **Sentinel AI** (AI-driven AML fraud-detection platform) is deployed to production, and how to reproduce a fresh deployment from scratch.

- **Backend:** FastAPI app served on **Modal** (serverless, scales to zero)
- **Frontends:** deployed on **Vercel**
  - Landing page (Nuxt)
  - Investigation console (React + Vite)
- **Persistence:** Modal **Volume** (`sentinel-data`) holding the trained model, SQLite transaction DB, and the Chroma vector store


---

## 1. Architecture at a glance

```
Browser
  |
  |  (1) Landing page  ->  Vercel (Nuxt)
  |  (2) Console app   ->  Vercel (React + Vite)
  |
  v  HTTPS (REST, async job polling)
Modal (serverless FastAPI, app: "sentinel-ai")
  |-- XGBoost scorer + 6-layer composite risk engine
  |-- NetworkX graph engine (mule / ring / fund-flow)
  |-- Chroma RAG store (regulatory corpus)
  |-- LangGraph ReAct agent (GPT-4o-mini)  --> OpenAI API
  |
  v
Modal Volume "sentinel-data"  (model.json, transactions.db, chroma/)
```

The API is **asynchronous**: an investigation is submitted with `POST /investigate`, which returns a `job_id`; the client then polls `GET /investigate/{job_id}` until the report is ready. There is no WebSocket/streaming layer.

---

## 2. Prerequisites

- Python 3.11
- A [Modal](https://modal.com) account (`pip install modal`, then `modal token new`)
- A [Vercel](https://vercel.com) account (`npm i -g vercel`)
- An **OpenAI API key** (used by the GPT-4o-mini agent)
- The repo cloned locally: `git clone https://github.com/<YOUR-USERNAME>/<REPO>.git`

> Note: sentence embeddings use `all-MiniLM-L6-v2` running **locally inside the container**, so no embedding API key is required. Only the OpenAI key is needed (for the agent LLM).

---

## 3. Secrets & environment variables

### Backend (Modal secret: `sentinel-secrets`)

| Variable | Required | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | Yes | GPT-4o-mini investigation agent |
| `LOG_LEVEL` | No | Logging verbosity (default `INFO`) |

Create the secret:

```bash
modal secret create sentinel-secrets OPENAI_API_KEY=sk-<YOUR-KEY>
```

### Frontend (Vercel project env)

| Variable | Required | Example |
|---|---|---|
| `VITE_API_BASE_URL` | Yes | `https://<workspace>--sentinel-ai-fastapi-app.modal.run` |

Set it per environment (Production / Preview) in the Vercel dashboard, or:

```bash
vercel env add VITE_API_BASE_URL production
```

---

## 4. Backend deployment (Modal)

The backend is defined in `modal_app.py`. Key configuration:

```python
@app.function(
    image=image,
    secrets=[modal.Secret.from_name("sentinel-secrets")],
    volumes={"/data": modal.Volume.from_name("sentinel-data")},
    cpu=1.0,
    memory=3072,
    timeout=600,
    scaledown_window=300,
)
@modal.asgi_app()
def fastapi_app():
    from api.main import app
    return app
```

### 4.1 Create the persistent volume (first time only)

```bash
modal volume create sentinel-data
```

### 4.2 Upload model + data + vector store into the volume

```bash
modal volume put sentinel-data ./models/model.json         /model.json
modal volume put sentinel-data ./data/transactions.db      /transactions.db
modal volume put sentinel-data ./data/chroma               /chroma
```

> The Chroma collection is `sentinel_regulations` (1,088 chunks: FATF, RBI, FinCEN, MHA). If you rebuild it, re-run your ingestion script before uploading.

### 4.3 Deploy

```bash
modal deploy modal_app.py
```

Modal prints the public URL, e.g.:

```
https://<workspace>--sentinel-ai-fastapi-app.modal.run
```

Copy this URL — it is the `VITE_API_BASE_URL` for the frontend.

---

## 5. CORS configuration

`api/main.py` must allow the Vercel origins. Confirm this block exists **before** deploying:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)
```

The regex covers every Vercel preview and production domain. If you also use a custom domain, add it explicitly to `allow_origins`.

---

## 6. Frontend deployment (Vercel)

Two separate Vercel projects.

### 6.1 Investigation console (React + Vite)

```bash
cd frontend/console
vercel --prod
```

- Framework preset: **Vite**
- Build command: `npm run build`
- Output directory: `dist`
- Env: `VITE_API_BASE_URL` = your Modal backend URL

### 6.2 Landing page (Nuxt)

```bash
cd frontend/landing
vercel --prod
```

- Framework preset: **Nuxt**
- Build command: `npm run build`

### 6.3 Deployment Protection

If the deployed site returns a Vercel login/SSO wall, disable **Settings -> Deployment Protection** (set to *Disabled* / *Only Preview*) so reviewers can open the live demo without a Vercel account.

---

## 7. Post-deployment verification

Run these against the live backend URL.

```bash
BASE=https://<workspace>--sentinel-ai-fastapi-app.modal.run

# 1. Health check (also warms a container)
curl $BASE/health

# 2. Submit an investigation
curl -X POST $BASE/investigate \
  -H "Content-Type: application/json" \
  -d '{"account_id": "C1953680528"}'
# -> { "job_id": "..." }

# 3. Poll for the report
curl $BASE/investigate/<job_id>
```

### API reference (v1.2.0)

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness + version |
| POST | `/investigate` | Start an investigation, returns `job_id` |
| GET | `/investigate/{job_id}` | Poll investigation result / draft STR |
| POST | `/tools/graph` | Graph metrics for an account |
| POST | `/tools/rag` | Regulatory RAG query |
| GET | `/alerts` | Recent high-risk alerts |
| GET | `/transactions/{account_id}` | Transaction history for an account |

**Demo accounts:** `C1953680528` (risk 0.7725 / HIGH, 16 txns), `C2110462016` (suspected mule 0.6137, part of a ring).

---

## 8. Demo-day / production readiness

- **Cold starts:** Modal scales to zero, so the first request after idle takes a few seconds. Before a live demo, hit `/health` to pre-warm a container.
- **Optional warm pool:** for a guaranteed-warm demo window, temporarily set `min_containers=1` on the function, then redeploy. Revert afterwards to avoid idle cost.
- **Cost:** Modal Starter is $0/mo and includes recurring monthly credits that comfortably cover an idle, scale-to-zero backend for demos. Vercel Hobby is free for these frontends.
- **Logs:** `modal app logs sentinel-ai` to tail backend logs during the demo.

---

## 9. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Frontend calls fail with CORS error | Origin not matched | Confirm the `allow_origin_regex` block in `api/main.py`, redeploy |
| `401` / login wall on the live site | Vercel Deployment Protection on | Disable it in project settings |
| Agent step returns an auth error | Missing/invalid OpenAI key | Recreate `sentinel-secrets`, redeploy |
| Empty graph metrics / "SQL fallback" in logs | Volume missing DB or stale model | Re-`modal volume put` the DB/model, redeploy |
| First request very slow | Cold start | Pre-warm with `/health` before demo |
| `RAG` returns nothing | Chroma not uploaded | Upload `/chroma` to the volume |

---

## 10. Redeploy checklist

1. `git pull` latest `api/main.py` and engine code
2. Confirm CORS block present
3. `modal deploy modal_app.py`
4. `curl $BASE/health` -> expect version `1.2.0`
5. Run one `POST /investigate` end-to-end
6. Confirm the console (Vercel) loads and Graph Metrics populate

---

_Last updated for Sentinel AI API v1.2.0._
