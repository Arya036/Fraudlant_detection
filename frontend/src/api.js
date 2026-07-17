const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function startInvestigation(accountId) {
  const res = await fetch(`${API_BASE}/investigate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account_id: accountId }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json(); // { job_id, status }
}

export async function pollInvestigation(jobId) {
  const res = await fetch(`${API_BASE}/investigate/${jobId}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json(); // { status, result? }
}

export async function getGraph(accountId) {
  const res = await fetch(`${API_BASE}/tools/graph?account_id=${encodeURIComponent(accountId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function searchRegulations(query, topK = 5) {
  const res = await fetch(`${API_BASE}/tools/rag?query=${encodeURIComponent(query)}&top_k=${topK}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getAlerts(skip = 0, limit = 50) {
  const res = await fetch(`${API_BASE}/alerts?skip=${skip}&limit=${limit}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
