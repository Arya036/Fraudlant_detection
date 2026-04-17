/* ═══════════════════════════════════════════════════════════════
   FundFlow AI — Main App Controller
   Handles: navigation, API calls, dashboard data, alerts, cases
═══════════════════════════════════════════════════════════════ */

const API = 'http://127.0.0.1:8000/api';
const API_KEY = (localStorage.getItem('FUNDFLOW_API_KEY') || 'dev-local-key-change-me').trim();

function withApiKey(headers = {}) {
  return { ...headers, 'X-API-Key': API_KEY };
}

// ── State ─────────────────────────────────────────────────────────────────────
let currentPage = 'dashboard';
let dashStats   = {};

// ── Live KPI counters (in-memory, incremented by WS/gateway events) ────────────
let _kpiTotal  = 0;
let _kpiFraud  = 0;
let _kpiAlerts = 0;

/**
 * Animate a KPI element from its current value to newVal.
 * Uses a rapid tick-up animation so the number visibly increments.
 */
function animateKPI(elId, newVal, flashColor) {
  const el = document.getElementById(elId);
  if (!el) return;
  const current = parseInt(el.textContent.replace(/,/g,'')) || 0;
  if (newVal <= current) { el.textContent = fmtNum(newVal); return; }
  const diff  = newVal - current;
  const steps = Math.min(diff, 20);          // max 20 animation frames
  const step  = diff / steps;
  let  done   = 0;
  const tick  = () => {
    done++;
    const v = done < steps ? Math.round(current + step * done) : newVal;
    el.textContent = fmtNum(v);
    if (done < steps) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  // Flash the element
  el.style.transition = 'color 0.15s';
  el.style.color = flashColor || '#ffffff';
  setTimeout(() => { el.style.color = ''; }, 500);
}

/**
 * Called by WebSocket (any transaction) and Gateway Simulator on every decision.
 * tier: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
 * isAlert: true if a new alert was created
 */
function liveIncrementKPI(tier, isAlert) {
  _kpiTotal++;
  animateKPI('kpi-total', _kpiTotal, '#4a9eff');

  const isFraud = (tier === 'CRITICAL' || tier === 'HIGH');
  if (isFraud) {
    _kpiFraud++;
    animateKPI('kpi-fraud', _kpiFraud, '#ff3d5a');
  }

  if (isAlert) {
    _kpiAlerts++;
    animateKPI('kpi-alerts', _kpiAlerts, '#ff8c42');
    pulseAlertBadge(tier);
  }
}

/**
 * Pulse the sidebar alert badge red when a new CRITICAL/HIGH alert arrives.
 */
function pulseAlertBadge(tier) {
  const badge = document.getElementById('alert-badge');
  if (!badge) return;
  // Increment count
  const current = parseInt(badge.textContent) || 0;
  badge.textContent = current + 1;
  // Trigger animation class
  badge.classList.remove('badge-pulse');      // reset if already animating
  void badge.offsetWidth;                     // force reflow
  badge.classList.add('badge-pulse');
  badge.addEventListener('animationend', () => badge.classList.remove('badge-pulse'), { once: true });
}
let allAlerts   = [];
let allCases    = [];
let uploadDetectedColumns = [];

// ── Navigation ────────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    const page = item.dataset.page;
    if (page) navigateTo(page);
  });
});

// Also handle btn-sm [data-page] links
document.querySelectorAll('[data-page]').forEach(el => {
  if (!el.classList.contains('nav-item')) {
    el.addEventListener('click', e => {
      e.preventDefault();
      navigateTo(el.dataset.page);
    });
  }
});

function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const pageEl = document.getElementById(`page-${page}`);
  const navEl  = document.getElementById(`nav-${page}`);
  if (pageEl) pageEl.classList.add('active');
  if (navEl)  navEl.classList.add('active');
  loadPage(page);
}

function loadPage(page) {
  switch (page) {
    case 'dashboard':   loadDashboard(); break;
    case 'fundflow':    loadFundFlow();  break;
    case 'alerts':      loadAlerts();    break;
    case 'investigation': loadCases();  break;
    case 'mules':       loadMules();    break;
    case 'model':       loadModel();    break;
  }
}

// ── API Helper ────────────────────────────────────────────────────────────────
async function apiFetch(path, opts = {}) {
  try {
    const res = await fetch(API + path, opts);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn(`API error [${path}]:`, e.message);
    return null;
  }
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
async function loadDashboard() {
  const data = await apiFetch('/stats/dashboard');
  if (!data) return;
  dashStats = data;

  // Seed in-memory counters from fresh API data
  _kpiTotal  = data.total_transactions || _kpiTotal;
  _kpiFraud  = data.fraud_count        || _kpiFraud;
  _kpiAlerts = data.active_alerts      || _kpiAlerts;

  document.getElementById('kpi-total').textContent  = fmtNum(_kpiTotal);
  document.getElementById('kpi-fraud').textContent  = fmtNum(_kpiFraud);
  document.getElementById('kpi-alerts').textContent = fmtNum(_kpiAlerts);
  document.getElementById('kpi-rings').textContent  = fmtNum(data.rings_detected);
  document.getElementById('kpi-mules').textContent  = fmtNum(data.mules_detected);

  document.getElementById('last-updated').textContent = 'Updated ' + new Date().toLocaleTimeString();
  document.getElementById('alert-badge').textContent  = _kpiAlerts;

  drawRiskDistChart(data.risk_distribution);
  drawFraudTypeChart(data.fraud_by_type);
  loadRecentAlerts();
}

async function loadRecentAlerts() {
  const data = await apiFetch('/alerts?limit=8');
  if (!data) return;
  const list = document.getElementById('recent-alerts-list');
  list.innerHTML = '';
  (data.alerts || []).filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH')
    .slice(0, 6).forEach(alert => {
      const el = document.createElement('div');
      el.className = 'alert-mini-item';
      el.innerHTML = `
        <div class="alert-mini-type">${alert.alert_type?.replace(/_/g,' ')}</div>
        <div class="alert-mini-desc">${fmtCurrency(alert.total_amount)} · ${alert.severity}</div>`;
      el.addEventListener('click', () => navigateTo('alerts'));
      list.appendChild(el);
    });
}

// ── Alerts ────────────────────────────────────────────────────────────────────
async function loadAlerts() {
  const status = document.getElementById('alerts-filter').value;
  const url = status ? `/alerts?status=${status}&limit=100` : '/alerts?limit=100';
  const data = await apiFetch(url);
  if (!data) return;
  allAlerts = data.alerts || [];

  const grid = document.getElementById('alerts-grid');
  grid.innerHTML = '';

  if (allAlerts.length === 0) {
    grid.innerHTML = '<div class="loading-spinner">No alerts found.</div>';
    return;
  }

  allAlerts.forEach(alert => {
    const card = createAlertCard(alert);
    grid.appendChild(card);
  });
}

function createAlertCard(alert) {
  const card = document.createElement('div');
  card.className = 'alert-card';
  card.style.borderLeftColor = severityColor(alert.severity);
  card.style.cursor = 'pointer';

  const accs = Array.isArray(alert.accounts_involved)
    ? alert.accounts_involved.slice(0,2).join(', ')
    : (alert.accounts_involved || '');

  card.innerHTML = `
    <div class="alert-card-top">
      <div>
        <div class="alert-type-badge bg-tier-${alert.severity || 'MEDIUM'}"
             style="color:${severityColor(alert.severity)}">
          ${(alert.alert_type || '').replace(/_/g,' ')}
        </div>
      </div>
      <div class="alert-amount">${fmtCurrency(alert.total_amount)}</div>
    </div>
    <div class="alert-desc">${alert.description || ''}</div>
    <div class="alert-footer">
      <div class="alert-accounts">${accs}</div>
      <span class="severity-badge severity-${alert.severity}">${alert.severity}</span>
    </div>
    <div style="margin-top:0.75rem;display:flex;gap:0.5rem;flex-wrap:wrap">
      <span class="text-muted">${fmtDateTime(alert.timestamp)}</span>
      <span class="case-status-badge status-${alert.status}">${alert.status}</span>
      <span style="margin-left:auto;font-size:0.7rem;color:var(--text-muted)">Click to analyse →</span>
    </div>`;

  card.addEventListener('click', () => openAlertPanel(alert));
  return card;
}

// ── Alert Detail Panel ─────────────────────────────────────────────────────────
async function openAlertPanel(alert) {
  const overlay = document.getElementById('alert-detail-overlay');
  const body    = document.getElementById('adp-body');
  const sevTag  = document.getElementById('adp-severity-tag');
  const sevColor = severityColor(alert.severity);

  // Set severity tag colour
  sevTag.textContent = alert.severity || 'MEDIUM';
  sevTag.style.background = sevColor + '22';
  sevTag.style.color = sevColor;
  sevTag.style.borderColor = sevColor + '55';

  // Show panel immediately with loading state
  overlay.style.display = 'flex';

  const accs = Array.isArray(alert.accounts_involved)
    ? alert.accounts_involved : [alert.accounts_involved || ''];

  const riskPct = Math.round((alert.risk_score || 0) * 100);
  const riskColor = riskPct >= 70 ? '#ff3d5a' : riskPct >= 40 ? '#ffbb33' : '#00e676';

  // Parse evidence for SHAP-like bars
  const evidence = typeof alert.evidence === 'object' ? alert.evidence : {};
  const txnId    = evidence.txn_id || '';
  const gwDec    = evidence.gateway_decision || '';

  // Build risk signal rows from what we know
  const signals = [
    { label: 'ML Risk Score',    value: alert.risk_score || 0,  color: riskColor },
    { label: 'Amount Exposure',  value: Math.min((alert.total_amount || 0) / 500000, 1), color: '#ff8c42' },
    { label: 'Accounts Flagged', value: Math.min(accs.length / 5, 1), color: '#6c63ff' },
  ];

  const signalBars = signals.map(s => {
    const barW = Math.round(s.value * 100);
    const displayVal = s.label === 'ML Risk Score'
      ? (s.value * 100).toFixed(0) + '%'
      : s.label === 'Amount Exposure'
        ? '₹' + Number(alert.total_amount || 0).toLocaleString('en-IN')
        : accs.length + ' account' + (accs.length !== 1 ? 's' : '');
    return `
      <div class="adp-signal-row">
        <div class="adp-signal-label">${s.label}</div>
        <div class="adp-signal-bar-wrap">
          <div class="adp-signal-bar" style="width:${barW}%;background:${s.color}"></div>
        </div>
        <div class="adp-signal-val" style="color:${s.color}">${displayVal}</div>
      </div>`;
  }).join('');

  body.innerHTML = `
    <!-- Metadata pills -->
    <div class="adp-meta-grid">
      <div class="adp-meta-item">
        <div class="adp-meta-label">Amount</div>
        <div class="adp-meta-value" style="color:${riskColor}">${fmtCurrency(alert.total_amount)}</div>
      </div>
      <div class="adp-meta-item">
        <div class="adp-meta-label">Risk Score</div>
        <div class="adp-meta-value" style="color:${riskColor}">${riskPct}%</div>
      </div>
      <div class="adp-meta-item">
        <div class="adp-meta-label">Status</div>
        <div class="adp-meta-value"><span class="case-status-badge status-${alert.status}">${alert.status}</span></div>
      </div>
      <div class="adp-meta-item">
        <div class="adp-meta-label">Created</div>
        <div class="adp-meta-value" style="font-size:0.8rem">${fmtDateTime(alert.timestamp)}</div>
      </div>
    </div>

    <!-- Description -->
    <p class="adp-description">${alert.description || ''}</p>

    ${txnId ? `<div class="adp-txn-ref">TXN: <span style="color:#6c63ff;font-family:monospace">${txnId}</span>${gwDec ? ' &nbsp;·&nbsp; Decision: <span style="color:' + riskColor + ';font-weight:700">' + gwDec + '</span>' : ''}</div>` : ''}

    <!-- ML Signals -->
    <div class="adp-section-title">ML Explanation</div>
    <div class="adp-signals">${signalBars}</div>

    <!-- Accounts -->
    <div class="adp-section-title">Accounts Involved</div>
    <div style="display:flex;flex-wrap:wrap;gap:0.4rem;margin-bottom:1rem">
      ${accs.map(a => `<span style="font-size:0.75rem;padding:3px 8px;border-radius:4px;background:rgba(108,99,255,0.12);color:#a5b4fc;font-family:monospace">${a}</span>`).join('')}
    </div>

    <!-- OpenAI Analysis — loading -->
    <div class="adp-section-title">🤖 OpenAI Analysis</div>
    <div id="adp-ai-box" class="adp-ai-box adp-ai-loading">
      <div class="adp-ai-spinner"></div>
      <span>Generating analysis...</span>
    </div>

    <!-- Recommended Action -->
    <div class="adp-section-title">Recommended Action</div>
    <div class="adp-action-box">${alert.recommended_action || 'Investigate the flagged accounts.'}</div>
  `;

  // Now fire GPT analysis async
  try {
    const res = await apiFetch('/alerts/' + alert.alert_id + '/analyze', { method: 'POST' });
    const aiBox = document.getElementById('adp-ai-box');
    if (!aiBox) return;

    if (res && res.analysis) {
      const isGPT = res.source === 'openai';
      aiBox.className = 'adp-ai-box adp-ai-done';
      aiBox.innerHTML = `
        <div class="adp-ai-badge">${isGPT ? '✨ GPT-4o-mini Analysis' : '📋 Template Analysis'}</div>
        <p class="adp-ai-text">${res.analysis}</p>
      `;
    } else {
      aiBox.className = 'adp-ai-box adp-ai-error';
      aiBox.innerHTML = '<span style="color:#ff3d5a">Analysis unavailable.</span>';
    }
  } catch (e) {
    const aiBox = document.getElementById('adp-ai-box');
    if (aiBox) {
      aiBox.className = 'adp-ai-box adp-ai-error';
      aiBox.innerHTML = '<span style="color:#ff3d5a">Analysis failed: ' + e.message + '</span>';
    }
  }
}

function closeAlertPanel(event) {
  if (event.target === document.getElementById('alert-detail-overlay')) {
    document.getElementById('alert-detail-overlay').style.display = 'none';
  }
}



document.getElementById('alerts-filter').addEventListener('change', loadAlerts);

// ── Cases ─────────────────────────────────────────────────────────────────────
async function loadCases() {
  const data = await apiFetch('/cases');
  if (!data) return;
  allCases = data.cases || [];

  const list = document.getElementById('cases-list');
  list.innerHTML = '';

  if (allCases.length === 0) {
    list.innerHTML = '<div class="text-muted" style="padding:1rem">No cases yet.</div>';
    return;
  }

  allCases.forEach(c => {
    const el = document.createElement('div');
    el.className = 'case-item';
    el.innerHTML = `
      <div class="case-id">${c.case_id}</div>
      <div class="case-type">${c.evidence?.alert_type?.replace(/_/g,' ') || 'Fraud Investigation'}</div>
      <span class="case-status-badge status-${c.status}">${c.status}</span>`;
    el.addEventListener('click', () => showCaseDetail(c));
    list.appendChild(el);
  });
}

function showCaseDetail(c) {
  document.querySelectorAll('.case-item').forEach(el => el.classList.remove('active'));
  event.currentTarget.classList.add('active');

  const detail = document.getElementById('case-detail');

  const timeline = (c.timeline || []).map(t => `
    <div class="timeline-item">
      <div class="timeline-time">${fmtDateTime(t.time)}</div>
      <div class="timeline-line"></div>
      <div class="timeline-event">${t.event}</div>
    </div>`).join('');

  const linkedAccounts = (Array.isArray(c.linked_accounts) ? c.linked_accounts : []).join(', ');

  detail.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.25rem">
      <div>
        <div style="font-size:1.1rem;font-weight:700;color:var(--accent-blue)">${c.case_id}</div>
        <div class="case-type">${c.evidence?.alert_type?.replace(/_/g,' ') || ''}</div>
      </div>
      <span class="case-status-badge status-${c.status}">${c.status}</span>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:1.25rem">
      <div><div class="text-muted">Priority</div><strong>${c.priority}</strong></div>
      <div><div class="text-muted">Assigned To</div><strong>${c.assigned_to}</strong></div>
      <div><div class="text-muted">Total Exposure</div><strong class="text-red">${fmtCurrency(c.total_exposure)}</strong></div>
      <div><div class="text-muted">Risk Score</div><strong>${(c.evidence?.risk_score || 0).toFixed(3)}</strong></div>
    </div>

    <div style="margin-bottom:1.25rem">
      <div class="text-muted" style="margin-bottom:0.5rem">Linked Accounts</div>
      <div style="font-size:0.8rem;word-break:break-all">${linkedAccounts || '—'}</div>
    </div>

    <div style="margin-bottom:1.25rem">
      <div style="font-weight:600;margin-bottom:0.75rem">Investigation Timeline</div>
      <div class="timeline">${timeline || '<div class="text-muted">No events yet.</div>'}</div>
    </div>

    <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
      <button class="btn-primary" onclick="updateCase('${c.case_id}','INVESTIGATING')">Start Investigation</button>
      <button class="btn-secondary" onclick="updateCase('${c.case_id}','CONFIRMED_FRAUD')">Confirm Fraud</button>
      <button class="btn-secondary" onclick="updateCase('${c.case_id}','FALSE_POSITIVE')">False Positive</button>
      <button class="btn-danger" onclick="simulateFreeze('${(c.linked_accounts || [])[0] || ''}')">🧊 Freeze Account</button>
    </div>`;
}

async function updateCase(caseId, status) {
  await apiFetch(`/cases/${caseId}/status?status=${status}`, { method: 'PATCH' });
  loadCases();
}

// ── Mule Network ──────────────────────────────────────────────────────────────
async function loadMules() {
  const [muleData, networkData] = await Promise.all([
    apiFetch('/mules?limit=50'),
    apiFetch('/mule-network'),
  ]);

  // Table
  const tbody = document.getElementById('mule-tbody');
  tbody.innerHTML = '';
  (muleData?.mules || []).forEach(m => {
    const kyc      = m.kyc_type || 'biometric';
    const kycColor = kyc === 'otp_ekyc' ? '#ff8c42' : kyc === 'minimum_kyc' ? '#ff3d5a' : '#00e676';
    const kycLabel = { biometric:'Biometric ✅', vcip:'V-CIP ✅', otp_ekyc:'OTP eKYC ⚠️', minimum_kyc:'Min KYC 🔴' }[kyc] || kyc;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><code style="font-size:0.75rem">${m.account?.slice(0,16)}</code></td>
      <td>${riskScoreBadge(m.mule_score)}</td>
      <td>${fmtPercent(m.passthrough_ratio)}</td>
      <td>${m.unique_senders}</td>
      <td><span style="color:${kycColor};font-size:.78rem;font-weight:600">${kycLabel}</span></td>
      <td style="display:flex;gap:.4rem">
        <button class="btn-sm" onclick="lookupAccountById('${m.account}')">🔍 Profile</button>
        <button class="btn-sm" onclick="simulateFreeze('${m.account}')">🧊 Freeze</button>
      </td>`;
    tbody.appendChild(tr);
  });

  // Graph — delay so DOM layout settles before vis.js reads container size
  if (networkData && networkData.nodes && networkData.nodes.length > 0) {
    setTimeout(() => drawMuleGraph(networkData), 150);
  }
}

// ── Freeze Simulation Modal ───────────────────────────────────────────────────
async function simulateFreeze(accountId) {
  if (!accountId) return;
  const modal = document.getElementById('freeze-modal');
  const body  = document.getElementById('freeze-modal-body');
  modal.style.display = 'flex';
  body.innerHTML = '<div class="loading-spinner">Running freeze simulation...</div>';

  const data = await apiFetch(`/simulate/freeze/${accountId}`, { method: 'POST' });
  if (!data || data.error) {
    body.innerHTML = `<div class="text-muted">Simulation failed: ${data?.error || 'Unknown error'}</div>`;
    return;
  }

  body.innerHTML = `
    <div class="freeze-summary">${data.summary}</div>
    <div class="freeze-result-row">
      <span class="freeze-result-label">Money Saved (Frozen)</span>
      <span class="freeze-result-value text-green">${fmtCurrency(data.money_saved)}</span>
    </div>
    <div class="freeze-result-row">
      <span class="freeze-result-label">Downstream Accounts Disrupted</span>
      <span class="freeze-result-value">${data.disrupted_accounts}</span>
    </div>
    <div class="freeze-result-row">
      <span class="freeze-result-label">Suspected Fraud Accounts Cut Off</span>
      <span class="freeze-result-value text-red">${data.suspicious_disrupted}</span>
    </div>
    <div class="freeze-result-row">
      <span class="freeze-result-label">Potentially Legitimate Accounts Affected</span>
      <span class="freeze-result-value text-yellow">${data.collateral_accounts}</span>
    </div>`;
}

document.getElementById('freeze-modal-close').addEventListener('click', () => {
  document.getElementById('freeze-modal').style.display = 'none';
});

// ── Model Performance ─────────────────────────────────────────────────────────
async function loadModel() {
  const data = await apiFetch('/model/performance');
  const el   = document.getElementById('model-content');

  if (!data || data.detail) {
    el.innerHTML = '<div class="loading-spinner">Model not trained yet. Please run training first.</div>';
    return;
  }

  const m = data.metrics || {};
  const fi = data.feature_importance || {};

  const topFeatures = Object.entries(fi).sort((a,b) => b[1]-a[1]).slice(0,12);
  const maxImp = topFeatures[0]?.[1] || 1;

  el.innerHTML = `
    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-value">${(m.auc_roc * 100).toFixed(1)}%</div>
        <div class="metric-label">AUC-ROC</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${(m.precision * 100).toFixed(1)}%</div>
        <div class="metric-label">Precision</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${(m.recall * 100).toFixed(1)}%</div>
        <div class="metric-label">Recall</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${(m.f1 * 100).toFixed(1)}%</div>
        <div class="metric-label">F1 Score</div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h2>Feature Importance (XGBoost)</h2></div>
      <div class="feat-bar-wrap">
        ${topFeatures.map(([feat, imp]) => `
          <div class="feat-bar-row">
            <div class="feat-bar-label">${feat.replace(/_/g,' ')}</div>
            <div class="feat-bar-bg">
              <div class="feat-bar-fill" style="width:${(imp/maxImp*100).toFixed(1)}%"></div>
            </div>
            <div class="feat-bar-val">${imp.toFixed(4)}</div>
          </div>`).join('')}
      </div>
    </div>
    <div class="card" style="margin-top:1rem">
      <div class="card-header"><h2>Confusion Matrix</h2></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;max-width:300px;gap:4px;font-size:0.85rem">
        <div style="background:rgba(0,230,118,0.15);padding:12px;border-radius:8px;text-align:center">
          <div style="font-size:1.3rem;font-weight:700;color:var(--accent-green)">${fmtNum(m.confusion_matrix?.[0]?.[0])}</div>
          <div class="text-muted">True Negative</div>
        </div>
        <div style="background:rgba(255,61,90,0.15);padding:12px;border-radius:8px;text-align:center">
          <div style="font-size:1.3rem;font-weight:700;color:var(--accent-red)">${fmtNum(m.confusion_matrix?.[0]?.[1])}</div>
          <div class="text-muted">False Positive</div>
        </div>
        <div style="background:rgba(255,187,51,0.15);padding:12px;border-radius:8px;text-align:center">
          <div style="font-size:1.3rem;font-weight:700;color:var(--accent-yellow)">${fmtNum(m.confusion_matrix?.[1]?.[0])}</div>
          <div class="text-muted">False Negative</div>
        </div>
        <div style="background:rgba(74,158,255,0.15);padding:12px;border-radius:8px;text-align:center">
          <div style="font-size:1.3rem;font-weight:700;color:var(--accent-blue)">${fmtNum(m.confusion_matrix?.[1]?.[1])}</div>
          <div class="text-muted">True Positive</div>
        </div>
      </div>
    </div>`;
}

// ── Formatters ────────────────────────────────────────────────────────────────
function fmtNum(n)         { return (n || 0).toLocaleString('en-IN'); }
function fmtCurrency(n)    { return '₹' + (n || 0).toLocaleString('en-IN', {maximumFractionDigits:0}); }
function fmtPercent(n)     { return ((n || 0) * 100).toFixed(1) + '%'; }
function fmtDateTime(s)    { return s ? new Date(s).toLocaleString('en-IN', {dateStyle:'short', timeStyle:'short'}) : '—'; }

function severityColor(sev) {
  return {CRITICAL:'#ff3d5a', HIGH:'#ff8c42', MEDIUM:'#ffbb33', LOW:'#00e676'}[sev] || '#4a9eff';
}

function riskScoreBadge(score) {
  const pct = Math.round(score * 100);
  const color = score > 0.8 ? '#ff3d5a' : score > 0.6 ? '#ff8c42' : score > 0.4 ? '#ffbb33' : '#00e676';
  return `<span style="color:${color};font-weight:700">${pct}%</span>`;
}

// ── Initialise ────────────────────────────────────────────────────────────────
loadDashboard();
initUploadMapper();
setInterval(loadDashboard, 30000);  // Refresh every 30s

// ── Simulator Controls ────────────────────────────────────────────────────────
let _simRunning    = false;
let _simScored     = 0;
let _simFraud      = 0;
let _simPollHandle = null;

async function toggleSimulator() {
  const btn  = document.getElementById('btn-sim-toggle');
  const rate = parseInt(document.getElementById('sim-rate')?.value || '2');
  const liveAlertsEnabled = Boolean(document.getElementById('sim-live-alerts')?.checked);

  if (!_simRunning) {
    // START
    const res = await apiFetch(
      `/simulate/start?rate=${rate}&live_alerts=${liveAlertsEnabled}`,
      { method: 'POST' }
    );
    if (!res) return;
    _simRunning = true;
    _simScored  = 0;
    _simFraud   = 0;
    btn.textContent = '⬛ Stop Replay';
    btn.style.background = '#ff3d5a';
    document.getElementById('sim-bar').classList.add('running');
    document.getElementById('sim-status-dot').style.background = '#00e676';
    document.getElementById('sim-status-txt').textContent =
      `● Simulating @ ${rate} tx/sec${liveAlertsEnabled ? ' · alerts on' : ' · alerts off'}`;
    document.getElementById('sim-live-alert-count').textContent = '0';
    // Poll stats every 2s
    _simPollHandle = setInterval(_pollSimStats, 2000);
  } else {
    // STOP
    const res = await apiFetch('/simulate/stop', { method: 'POST' });
    _simRunning = false;
    btn.textContent = '▶ Start Replay';
    btn.style.background = '';
    document.getElementById('sim-bar').classList.remove('running');
    document.getElementById('sim-status-dot').style.background = '#444';
    document.getElementById('sim-status-txt').textContent = 'Simulator Off';
    if (_simPollHandle) { clearInterval(_simPollHandle); _simPollHandle = null; }
    if (res) {
      document.getElementById('sim-latency').textContent =
        `Session: ${res.processed} scored, ${res.fraud_detected} flagged, ${res.live_alerts_created || 0} live alerts`;
    }
  }
}

async function _pollSimStats() {
  const data = await apiFetch('/simulate/stats');
  if (!data) return;
  if (!data.running && _simRunning) {
    // Stopped unexpectedly
    toggleSimulator();
    return;
  }
  document.getElementById('sim-count').textContent = (data.processed || 0).toLocaleString('en-IN');
  document.getElementById('sim-fraud').textContent = (data.fraud_detected || 0).toLocaleString('en-IN');
  document.getElementById('sim-live-alert-count').textContent =
    (data.live_alerts_created || 0).toLocaleString('en-IN');
}

// Called by websocket.js on each incoming transaction to update counters instantly
function updateSimCounters(txn) {
  if (!_simRunning) return;
  _simScored++;
  if ((txn.fraud_probability || 0) >= 0.7) _simFraud++;

  // Update latency badge with approx score count
  const latEl = document.getElementById('sim-latency');
  if (latEl) latEl.textContent = `~${_simScored} scored this session`;
}

// ── Account Profile Lookup ────────────────────────────────────────────────────
let _currentProfileAcct = null;

async function lookupAccount() {
  const val = (document.getElementById('acct-lookup-input')?.value || '').trim();
  if (!val) return;
  await lookupAccountById(val);
}

async function lookupAccountById(accountId) {
  _currentProfileAcct = accountId;
  // Navigate to investigation page if not already there
  if (currentPage !== 'investigation') navigateTo('investigation');
  // Pre-populate input
  const inp = document.getElementById('acct-lookup-input');
  if (inp) inp.value = accountId;

  const card = document.getElementById('account-profile-card');
  const body = document.getElementById('account-profile-body');
  card.style.display = 'block';
  body.innerHTML = '<div class="loading-spinner">Loading profile...</div>';

  const data = await apiFetch(`/account/${encodeURIComponent(accountId)}`);
  if (!data) { body.innerHTML = '<p style="color:var(--accent-red)">Account not found.</p>'; return; }
  renderAccountProfile(data);
}

function renderAccountProfile(d) {
  const body = document.getElementById('account-profile-body');
  if (!body) return;

  const kycColor = { biometric:'#00e676', vcip:'#4a9eff', otp_ekyc:'#ff8c42', minimum_kyc:'#ff3d5a' }[d.kyc_type] || '#888';
  const kycLabel = { biometric:'Biometric ✅', vcip:'V-CIP ✅', otp_ekyc:'OTP eKYC ⚠️', minimum_kyc:'Min KYC 🔴', unknown:'Unknown' }[d.kyc_type] || d.kyc_type;
  const cibilColor = (d.credit_score || 750) < 550 ? '#ff3d5a' : (d.credit_score || 750) < 650 ? '#ff8c42' : '#00e676';
  const muleColor  = (d.mule_score || 0) >= 0.6 ? '#ff3d5a' : (d.mule_score || 0) >= 0.4 ? '#ff8c42' : '#00e676';
  const fraudColor = (d.max_fraud_probability || 0) >= 0.7 ? '#ff3d5a' : (d.max_fraud_probability || 0) >= 0.4 ? '#ff8c42' : '#00e676';

  const tile = (label, value, color='var(--text-primary)', sub='') => `
    <div style="background:var(--bg-tertiary);padding:1rem;border-radius:.75rem;border:1px solid var(--border)">
      <div style="font-size:.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.35rem">${label}</div>
      <div style="font-size:1.1rem;font-weight:700;color:${color}">${value}</div>
      ${sub ? `<div style="font-size:.72rem;color:var(--text-muted);margin-top:.2rem">${sub}</div>` : ''}
    </div>`;

  body.innerHTML = `
    ${tile('Account ID',    d.account_id.slice(0,20))}
    ${tile('UPI VPA',       d.vpa || '—', '#818cf8')}
    ${tile('Bank',          (d.bank_handle || 'upi').toUpperCase(), '#4a9eff')}
    ${tile('KYC Status',    kycLabel, kycColor, d.account_age_days ? `Account age: ${d.account_age_days}d` : '')}
    ${tile('CIBIL Score',   d.credit_score ?? '—', cibilColor, d.cibil_risk_flag ? '⚠️ Low score + high transfer' : '')}
    ${tile('Mule Score',    ((d.mule_score||0)*100).toFixed(0)+'%', muleColor, d.is_suspected_mule ? '🚨 Suspected mule' : 'Clean')}
    ${tile('Max Fraud Prob',((d.max_fraud_probability||0)*100).toFixed(0)+'%', fraudColor)}
    ${tile('Pass-Through',  fmtPercent(d.passthrough_ratio||0))}
    ${tile('Total Received',fmtCurrency(d.graph_stats?.total_received||0))}
    ${tile('Total Sent',    fmtCurrency(d.graph_stats?.total_sent||0))}
    ${tile('Unique In',     d.graph_stats?.in_degree ?? '—', 'var(--text-primary)', 'counterparties')}
    ${tile('Unique Out',    d.graph_stats?.out_degree ?? '—', 'var(--text-primary)', 'counterparties')}`;
}

function freezeFromProfile() {
  if (_currentProfileAcct) simulateFreeze(_currentProfileAcct);
}

// ── Account Aggregator Modal ──────────────────────────────────────────────────
function showAAModal() {
  const modal = document.getElementById('aa-modal');
  const dataEl = document.getElementById('aa-data-body');
  modal.style.display = 'flex';
  dataEl.innerHTML = '<div class="loading-spinner">Requesting consent-based data pull from AA network...</div>';

  // Simulate 1.5s AA network latency then show mock response
  setTimeout(() => {
    if (!_currentProfileAcct) { dataEl.innerHTML = '<p>No account selected.</p>'; return; }
    const mockIncome   = (Math.random()*800000 + 200000).toFixed(0);
    const mockAccounts = Math.floor(Math.random()*3) + 1;
    const mockLoans    = Math.random() > 0.6 ? `₹${(Math.random()*500000+50000).toFixed(0)} outstanding` : 'None';
    dataEl.innerHTML = `
      <div style="display:grid;gap:.75rem">
        <div style="background:rgba(0,230,118,.08);padding:.75rem;border-radius:.5rem;border:1px solid rgba(0,230,118,.2)">
          <div style="font-size:.72rem;color:var(--text-muted);text-transform:uppercase">Annual Income (self-declared)</div>
          <div style="font-size:1.1rem;font-weight:700;color:#00e676">₹${Number(mockIncome).toLocaleString('en-IN')}</div>
        </div>
        <div style="background:rgba(74,158,255,.08);padding:.75rem;border-radius:.5rem;border:1px solid rgba(74,158,255,.2)">
          <div style="font-size:.72rem;color:var(--text-muted);text-transform:uppercase">Bank Accounts Linked</div>
          <div style="font-size:1.1rem;font-weight:700;color:#4a9eff">${mockAccounts} account${mockAccounts>1?'s':''} across ${mockAccounts} bank${mockAccounts>1?'s':''}</div>
        </div>
        <div style="background:rgba(255,140,66,.08);padding:.75rem;border-radius:.5rem;border:1px solid rgba(255,140,66,.2)">
          <div style="font-size:.72rem;color:var(--text-muted);text-transform:uppercase">Outstanding Loans</div>
          <div style="font-size:1.1rem;font-weight:700;color:#ff8c42">${mockLoans}</div>
        </div>
        <div style="padding:.5rem;background:rgba(255,255,255,.03);border-radius:.5rem;font-size:.75rem;color:var(--text-muted)">
          ✅ Data pulled via RBI AA Framework with simulated customer consent<br/>
          AA Provider: Finvu · Consent Artefact: CA-${Date.now().toString(36).toUpperCase()}
        </div>
      </div>`;
  }, 1500);
}

// ── Payment Gateway Simulator ─────────────────────────────────────────────────
async function processGatewayPayment() {
  const senderId   = document.getElementById('gw-sender').value.trim();
  const receiverId = document.getElementById('gw-receiver').value.trim();
  const amount     = document.getElementById('gw-amount').value;
  const txnType    = document.getElementById('gw-type').value;

  if (!senderId || !receiverId || !amount) {
    alert("Please fill in all payment details");
    return;
  }

  const processing = document.getElementById('gw-processing');
  const resultBox  = document.getElementById('gw-result');
  const processBtn = document.querySelector('.gw-process-btn');

  resultBox.style.display = 'none';
  processing.style.display = 'block';
  processBtn.disabled = true;
  processBtn.style.opacity = '0.5';

  const payload = {
    sender_account:   senderId,
    receiver_account: receiverId,
    amount:           parseFloat(amount),
    txn_type:         txnType
  };

  try {
    const res = await apiFetch('/gateway', {
      method: 'POST',
      headers: withApiKey({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload)
    });

    await new Promise(r => setTimeout(r, 600));
    processing.style.display = 'none';

    if (res && res.decision) {
      const decision = res.decision;
      const pct      = Math.round(res.fraud_probability * 100);
      const tier     = res.risk_tier || 'LOW';
      const latency  = res.latency_ms || '?';
      const alertId  = res.alert_id;
      const ctx      = res._context || {};
      const gptText  = res.gpt_explanation || '';
      const topF     = res.top_features || [];

      // ⚡ Live KPI update — gateway decision fires counters
      const isAlert = (decision === 'BLOCKED' || decision === 'FLAGGED');
      liveIncrementKPI(tier, isAlert);

      let dIcon, dColor, dBgFrom, dBgTo, dSub;
      if (decision === 'BLOCKED') {
        dIcon = '\u{1F6AB}'; dColor = '#ff3d5a';
        dBgFrom = 'rgba(255,61,90,0.15)'; dBgTo = 'rgba(255,61,90,0.05)';
        dSub = 'Transaction pre-emptively stopped \u2014 funds NOT transferred';
      } else if (decision === 'FLAGGED') {
        dIcon = '\u26A0\uFE0F'; dColor = '#ffbb33';
        dBgFrom = 'rgba(255,187,51,0.15)'; dBgTo = 'rgba(255,187,51,0.05)';
        dSub = 'Transaction held for manual review before settlement';
      } else {
        dIcon = '\u2705'; dColor = '#00e676';
        dBgFrom = 'rgba(0,230,118,0.15)'; dBgTo = 'rgba(0,230,118,0.05)';
        dSub = 'Transaction approved \u2014 payment processing';
      }

      let factorsHtml = '';
      if (topF.length > 0 && decision !== 'APPROVED') {
        factorsHtml = '<div style="margin-top:1rem"><div style="font-size:0.75rem;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.5rem;letter-spacing:1px">Risk Factors (SHAP)</div>';
        topF.slice(0, 5).forEach(f => {
          const name = f.feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          const val  = (f.contribution || 0).toFixed(3);
          const barW = Math.min(Math.abs(f.contribution || 0) * 200, 100);
          factorsHtml += '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.4rem;font-size:0.8rem">'
            + '<div style="width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text-secondary)">' + name + '</div>'
            + '<div style="flex:1;height:6px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden">'
            + '<div style="width:' + barW + '%;height:100%;background:' + dColor + ';border-radius:3px;transition:width 0.5s ease"></div>'
            + '</div>'
            + '<div style="width:50px;text-align:right;font-family:monospace;font-size:0.75rem;color:' + dColor + '">+' + val + '</div>'
            + '</div>';
        });
        factorsHtml += '</div>';
      }

      let gptHtml = '';
      if (gptText) {
        gptHtml = '<div style="margin-top:1rem;padding:0.75rem;border-radius:8px;background:rgba(108,99,255,0.08);border:1px solid rgba(108,99,255,0.2)">'
          + '<div style="font-size:0.7rem;text-transform:uppercase;color:#6c63ff;margin-bottom:0.4rem;letter-spacing:1px">\u{1F916} AI Fraud Analyst Explanation</div>'
          + '<p style="font-size:0.82rem;color:var(--text-secondary);margin:0;line-height:1.5">' + gptText + '</p>'
          + '</div>';
      }

      const ctxColor = ctx.history_used ? '#00e676' : '#ffbb33';
      const ctxIcon  = ctx.history_used ? '\u2705' : '\u26A0\uFE0F';
      const ctxHtml  = '<div style="font-size:0.7rem;color:' + ctxColor + ';margin-top:0.75rem">' + ctxIcon + ' ' + (ctx.message || '') + '</div>';

      const alertHtml = alertId
        ? '<div style="font-size:0.7rem;color:var(--text-muted);margin-top:0.4rem">\u{1F4CB} Alert created: <span style="color:#6c63ff;font-family:monospace">' + alertId + '</span></div>'
        : '';

      resultBox.style.display = 'block';
      resultBox.className = 'gw-decision gw-decision-' + decision.toLowerCase();
      resultBox.innerHTML = '<div style="background:linear-gradient(135deg,' + dBgFrom + ',' + dBgTo + ');padding:1.5rem;border:1px solid ' + dColor + '33;border-radius:12px">'
        + '<div style="display:flex;justify-content:space-between;align-items:flex-start">'
        + '<div>'
        + '<div style="font-size:2rem;font-weight:800;color:' + dColor + ';line-height:1;margin-bottom:0.25rem">' + dIcon + ' TRANSACTION ' + decision + '</div>'
        + '<div style="font-size:0.8rem;color:var(--text-muted)">' + dSub + '</div>'
        + '</div>'
        + '<div style="text-align:right">'
        + '<div style="font-size:1.8rem;font-weight:700;color:' + dColor + '">' + pct + '%</div>'
        + '<div style="font-size:0.7rem;color:var(--text-muted)">fraud risk</div>'
        + '</div>'
        + '</div>'
        + '<div style="display:flex;gap:1rem;margin-top:1rem;flex-wrap:wrap">'
        + '<div style="background:rgba(0,0,0,0.2);padding:0.5rem 0.75rem;border-radius:6px;font-size:0.8rem"><span style="color:var(--text-muted)">Latency:</span> <span style="color:#4a9eff;font-weight:700;font-family:monospace">' + latency + 'ms</span></div>'
        + '<div style="background:rgba(0,0,0,0.2);padding:0.5rem 0.75rem;border-radius:6px;font-size:0.8rem"><span style="color:var(--text-muted)">Tier:</span> <span style="color:' + dColor + ';font-weight:700">' + tier + '</span></div>'
        + '<div style="background:rgba(0,0,0,0.2);padding:0.5rem 0.75rem;border-radius:6px;font-size:0.8rem"><span style="color:var(--text-muted)">Rail:</span> <span style="font-weight:700;color:var(--text-primary)">' + payload.txn_type + '</span></div>'
        + '<div style="background:rgba(0,0,0,0.2);padding:0.5rem 0.75rem;border-radius:6px;font-size:0.8rem"><span style="color:var(--text-muted)">Amount:</span> <span style="font-weight:700;color:var(--text-primary)">\u20B9' + parseFloat(amount).toLocaleString('en-IN') + '</span></div>'
        + '</div>'
        + factorsHtml
        + gptHtml
        + ctxHtml
        + alertHtml
        + '</div>';
    } else {
      resultBox.style.display = 'block';
      resultBox.innerHTML = '<div style="padding:1rem;color:#ff3d5a">Gateway scoring failed.</div>';
    }
  } catch (e) {
    processing.style.display = 'none';
    resultBox.style.display = 'block';
    resultBox.innerHTML = '<div style="padding:1rem;color:#ff3d5a">Error: ' + e.message + '</div>';
  } finally {
    processBtn.disabled = false;
    processBtn.style.opacity = '1';
  }
}

// ── Upload + Column Mapping ──────────────────────────────────────────────────
function _escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function _parseCsvHeaderLine(line) {
  const cols = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      cols.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cols.push(current.trim());

  return cols
    .map(c => c.replace(/^"|"$/g, '').trim())
    .filter(Boolean);
}

function _detectColumnsFromText(fileName, text) {
  if ((fileName || '').toLowerCase().endsWith('.json')) {
    const parsed = JSON.parse(text);
    let sample = null;
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
      sample = parsed[0];
    } else if (parsed && Array.isArray(parsed.records) && parsed.records.length > 0) {
      sample = parsed.records[0];
    } else if (parsed && typeof parsed === 'object') {
      sample = parsed;
    }
    return sample ? Object.keys(sample) : [];
  }

  const headerLine = text.split(/\r?\n/).find(line => line.trim().length > 0) || '';
  return _parseCsvHeaderLine(headerLine);
}

function _guessUploadMapping(columns) {
  const normalized = columns.map(c => ({ raw: c, key: String(c).trim().toLowerCase() }));
  const pick = (candidates) => {
    const hit = normalized.find(c => candidates.includes(c.key));
    return hit ? hit.raw : '';
  };

  return {
    sender_account: pick(['sender_account', 'sender', 'from_account', 'debit_account', 'nameorig']),
    receiver_account: pick(['receiver_account', 'receiver', 'to_account', 'credit_account', 'namedest']),
    amount: pick(['amount', 'txn_amount', 'transaction_amount', 'amt']),
    timestamp: pick(['timestamp', 'txn_time', 'transaction_time', 'datetime', 'created_at']),
    txn_type: pick(['txn_type', 'type', 'transaction_type', 'channel_type']),
    channel: pick(['channel', 'mode', 'payment_channel'])
  };
}

function _populateUploadMappingSelects(columns, guessed = {}) {
  const config = [
    { id: 'upload-map-sender', target: 'sender_account' },
    { id: 'upload-map-receiver', target: 'receiver_account' },
    { id: 'upload-map-amount', target: 'amount' },
    { id: 'upload-map-timestamp', target: 'timestamp' },
    { id: 'upload-map-txn-type', target: 'txn_type' },
    { id: 'upload-map-channel', target: 'channel' }
  ];

  config.forEach(({ id, target }) => {
    const el = document.getElementById(id);
    if (!el) return;

    el.innerHTML = '<option value="">(auto / not set)</option>';
    columns.forEach(col => {
      const opt = document.createElement('option');
      opt.value = col;
      opt.textContent = col;
      el.appendChild(opt);
    });

    if (guessed[target] && columns.includes(guessed[target])) {
      el.value = guessed[target];
    }
  });
}

function _collectUploadMapping() {
  const mapField = (id) => (document.getElementById(id)?.value || '').trim();
  const mapping = {};

  const sender = mapField('upload-map-sender');
  const receiver = mapField('upload-map-receiver');
  const amount = mapField('upload-map-amount');
  const timestamp = mapField('upload-map-timestamp');
  const txnType = mapField('upload-map-txn-type');
  const channel = mapField('upload-map-channel');

  if (sender) mapping.sender_account = sender;
  if (receiver) mapping.receiver_account = receiver;
  if (amount) mapping.amount = amount;
  if (timestamp) mapping.timestamp = timestamp;
  if (txnType) mapping.txn_type = txnType;
  if (channel) mapping.channel = channel;

  return mapping;
}

function _renderUploadSample(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return '<div style="margin-top:.5rem;color:var(--text-muted)">No sample rows returned.</div>';
  }

  const cols = Object.keys(rows[0]).slice(0, 8);
  const header = cols.map(c => `<th>${_escapeHtml(c)}</th>`).join('');
  const body = rows.slice(0, 3).map(r => {
    const cells = cols.map(c => `<td>${_escapeHtml(r[c])}</td>`).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  return `
    <div style="margin-top:.65rem;overflow:auto">
      <table class="data-table" style="font-size:.75rem">
        <thead><tr>${header}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;
}

async function prepareUploadMapping() {
  const fileInput = document.getElementById('upload-file');
  const result = document.getElementById('upload-result');
  const file = fileInput?.files?.[0];

  if (!file) {
    if (result) {
      result.style.borderColor = 'rgba(255,140,66,0.35)';
      result.style.background = 'rgba(255,140,66,0.08)';
      result.textContent = 'Choose a CSV or JSON file first.';
    }
    return;
  }

  try {
    const text = await file.text();
    const columns = _detectColumnsFromText(file.name, text);
    if (!columns.length) throw new Error('No columns detected from file header/content');

    uploadDetectedColumns = columns;
    const guessed = _guessUploadMapping(columns);
    _populateUploadMappingSelects(columns, guessed);

    if (result) {
      result.style.borderColor = 'rgba(74,158,255,0.35)';
      result.style.background = 'rgba(74,158,255,0.08)';
      result.innerHTML = `Detected ${columns.length} columns: ${columns.map(_escapeHtml).join(', ')}`;
    }
  } catch (e) {
    if (result) {
      result.style.borderColor = 'rgba(255,61,90,0.4)';
      result.style.background = 'rgba(255,61,90,0.08)';
      result.textContent = `Column detection failed: ${e.message}`;
    }
  }
}

async function uploadMappedTransactions() {
  const fileInput = document.getElementById('upload-file');
  const scoreCheckbox = document.getElementById('upload-score');
  const persistCheckbox = document.getElementById('upload-persist');
  const result = document.getElementById('upload-result');
  const file = fileInput?.files?.[0];

  if (!file) {
    alert('Select a file first.');
    return;
  }

  if (!uploadDetectedColumns.length) {
    await prepareUploadMapping();
  }

  const mapping = _collectUploadMapping();
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mapping_json', JSON.stringify(mapping));
  formData.append('score', String(Boolean(scoreCheckbox?.checked)));
  formData.append('persist', String(Boolean(persistCheckbox?.checked)));

  if (result) {
    result.style.borderColor = 'rgba(74,158,255,0.35)';
    result.style.background = 'rgba(74,158,255,0.08)';
    result.textContent = 'Uploading and processing...';
  }

  try {
    const res = await fetch(API + '/transactions/upload', {
      method: 'POST',
      headers: withApiKey(),
      body: formData
    });
    const payload = await res.json();
    if (!res.ok) {
      throw new Error(payload.detail || `HTTP ${res.status}`);
    }

    if (result) {
      result.style.borderColor = 'rgba(0,230,118,0.35)';
      result.style.background = 'rgba(0,230,118,0.08)';
      result.innerHTML = `
        <div><strong>Upload complete.</strong></div>
        <div style="margin-top:.25rem">Rows received: ${fmtNum(payload.rows_received)}</div>
        <div>Rows normalized: ${fmtNum(payload.rows_normalized)}</div>
        <div>Rows persisted: ${fmtNum(payload.rows_persisted)}</div>
        <div>Scored: ${payload.scored ? 'yes' : 'no'} · Flagged >= 0.7: ${fmtNum(payload.flagged_ge_0_7)}</div>
        ${_renderUploadSample(payload.sample)}
      `;
    }
  } catch (e) {
    if (result) {
      result.style.borderColor = 'rgba(255,61,90,0.4)';
      result.style.background = 'rgba(255,61,90,0.08)';
      result.textContent = `Upload failed: ${e.message}`;
    }
  }
}

function initUploadMapper() {
  _populateUploadMappingSelects([], {});
  const fileInput = document.getElementById('upload-file');
  if (fileInput) {
    fileInput.addEventListener('change', () => {
      uploadDetectedColumns = [];
      prepareUploadMapping();
    });
  }
}

// ── SHAP Explain Modal ────────────────────────────────────────────────────────
async function showFraudExplanation(txnId) {
  const modal = document.getElementById('shap-modal');
  const body = document.getElementById('shap-modal-body');
  modal.style.display = 'flex';
  body.innerHTML = '<div class="loading-spinner">Querying Python SHAP Explainer...</div>';

  try {
    // Demo mock if txn_id starts with DEMO_
    if (txnId.startsWith('DEMO_')) {
      setTimeout(() => {
        body.innerHTML = `
          <div style="padding:1rem; border-left:3px solid #ff3d5a; background:rgba(255,61,90,0.1); margin-bottom:1rem;">
            <strong>Transaction ID:</strong> ${txnId}<br>
            <small style="color:var(--text-muted)">Demo Mode Explanation</small>
          </div>
          <p><strong>Top Fraud Contributors (SHAP values):</strong></p>
          <ul style="line-height:1.6">
            <li><strong style="color:#4a9eff">Velocity Ratio 24h:</strong> +0.84</li>
            <li><strong style="color:#4a9eff">Cross-Bank UPI:</strong> +0.42</li>
            <li><strong style="color:#4a9eff">Sender Amount Bucket:</strong> +0.31</li>
          </ul>
        `;
      }, 600);
      return;
    }

    const res = await apiFetch(`/explain/${txnId}`);
    if (res && res.ml_explanation) {
      const topFeats = res.ml_explanation.top_contributors || res.ml_explanation.top_factors || [];
      if (!topFeats.length) {
        body.innerHTML = '<div>Explanation unavailable.</div>';
        return;
      }
      
      let html = `
        <div style="padding:1rem; border-left:3px solid #ff3d5a; background:rgba(255,61,90,0.1); margin-bottom:1rem;">
          <strong>Transaction ID:</strong> ${txnId}<br>
          <small style="color:var(--text-muted)">Method: ${res.ml_explanation.method || 'SHAP'}</small>
        </div>
      `;

      const sc = res.scoring_context || {};
      if (sc.fraud_probability !== null && sc.fraud_probability !== undefined) {
        const pct = (Number(sc.fraud_probability) * 100).toFixed(1);
        const thr = (Number(sc.decision_threshold || 0.7) * 100).toFixed(1);
        const verdict = sc.flagged_as_fraud
          ? `Flagged as fraud because score ${pct}% is above threshold ${thr}%.`
          : `Not flagged as fraud because score ${pct}% is below threshold ${thr}%.`;
        html += `
          <div style="padding:.9rem; border-radius:8px; background:rgba(74,158,255,0.08); border:1px solid rgba(74,158,255,0.25); margin-bottom:.8rem;">
            <div style="font-weight:700; color:var(--text-primary)">${verdict}</div>
            <div style="font-size:.78rem; color:var(--text-muted); margin-top:4px;">
              Risk Tier: ${_escapeHtml(sc.risk_tier || 'N/A')} · Probability: ${pct}%
            </div>
          </div>
        `;
      }

      html += `
        <p style="margin-bottom:0.5rem; color:var(--text-primary)"><strong>Primary Risk Factors:</strong></p>
        <div style="display:flex; flex-direction:column; gap:8px;">
      `;

      topFeats.slice(0, 5).forEach(f => {
        const shap = Number(f.contribution || 0);
        const shapText = `${shap >= 0 ? '+' : ''}${shap.toFixed(4)}`;
        const color = shap >= 0 ? '#ff8c42' : '#00e676';
        const dir = shap >= 0 ? '↑ increases risk' : '↓ decreases risk';
        const featVal = Number(f.value);
        const featValText = Number.isFinite(featVal)
          ? featVal.toLocaleString('en-IN', { maximumFractionDigits: 4 })
          : String(f.value ?? 'N/A');
        html += `
          <div style="display:flex; justify-content:space-between; padding:6px 10px; background:rgba(0,0,0,0.2); border-radius:4px; border:1px solid var(--border);">
            <div style="display:flex; flex-direction:column; min-width:0; margin-right:10px;">
              <span style="font-family:monospace; font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${_escapeHtml((f.feature || '').replace(/_/g, ' '))}</span>
              <span style="font-size:.72rem; color:var(--text-muted)">feature value: ${_escapeHtml(featValText)}</span>
            </div>
            <span style="font-weight:700; color:${color}">${shapText} SHAP · ${dir}</span>
          </div>
        `;
      });

      html += `</div>`;

      const narrative = Array.isArray(res.ml_explanation.narrative) ? res.ml_explanation.narrative : [];
      if (narrative.length) {
        html += `
          <p style="margin:.8rem 0 .4rem 0; color:var(--text-primary)"><strong>Why it was flagged:</strong></p>
          <ul style="margin:0; padding-left:1.1rem; display:grid; gap:.35rem; color:var(--text-muted); font-size:.84rem;">
            ${narrative.slice(0, 4).map(line => `<li>${_escapeHtml(line)}</li>`).join('')}
          </ul>
        `;
      }

      body.innerHTML = html;
    } else if (res && res.error) {
      body.innerHTML = `<div style="color:#ff3d5a; padding:1rem;">Error: ${res.error}</div>`;
    } else {
      body.innerHTML = '<div>Explanation unavailable.</div>';
    }
  } catch (e) {
    body.innerHTML = `<span style="color:#ff3d5a; padding:1rem;">Error connecting to explainer: ${e.message}</span>`;
  }
}
