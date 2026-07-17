const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try { const j = await res.json(); detail = j.detail || detail; } catch {}
    throw new Error(detail);
  }
  return res.json();
}

// ── Investigation ────────────────────────────────────────────────
export function startInvestigation(accountId) {
  return apiFetch('/investigate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account_id: accountId }),
  });
}

export function pollInvestigation(jobId) {
  return apiFetch(`/investigate/${jobId}`);
}

// ── Graph (POST — body contains account_id + max_hops) ──────────
export function getGraph(accountId, maxHops = 2) {
  return apiFetch('/tools/graph', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account_id: accountId, max_hops: maxHops }),
  });
}

// ── RAG search (POST — body contains query + top_k) ─────────────
export function searchRegulations(query, topK = 5) {
  return apiFetch('/tools/rag', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, top_k: topK }),
  });
}

// ── Alerts (GET — backend uses 'offset' not 'skip') ──────────────
export function getAlerts(offset = 0, limit = 50) {
  return apiFetch(`/alerts?offset=${offset}&limit=${limit}`);
}

// ── Health ───────────────────────────────────────────────────────
export function getHealth() {
  return apiFetch('/health');
}
