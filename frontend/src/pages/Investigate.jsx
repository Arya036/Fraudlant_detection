import { useState, useEffect, useRef } from 'react';
import {
  Search, Shield, CheckCircle, Loader2, AlertTriangle,
  Download, RefreshCw, ChevronLeft, BarChart2, Network,
  FileText, BookOpen, Activity, Info
} from 'lucide-react';
import { startInvestigation, pollInvestigation } from '../api';
import { getRiskClass, getRiskColour, fmtAmount, fmtProb } from '../utils';

const DEMO_ACCOUNTS = [
  { id: 'C1953329646', label: 'mule' },
  { id: 'C1885636303', label: 'mule' },
  { id: 'C1953680528', label: 'critical' },
  { id: 'C658156224',  label: 'critical' },
];

// Lightweight hover tooltip — no external deps / CSS required.
function InfoTip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 4, cursor: 'help' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <Info size={12} style={{ color: 'var(--text-muted)' }} />
      {show && (
        <span style={{
          position: 'absolute', bottom: '150%', left: '50%', transform: 'translateX(-50%)',
          background: '#1e293b', color: '#f8fafc', padding: '7px 10px', borderRadius: 6,
          fontSize: 11, lineHeight: 1.45, width: 230, zIndex: 50, fontWeight: 400,
          textAlign: 'left', whiteSpace: 'normal', pointerEvents: 'none',
          boxShadow: '0 6px 18px rgba(0,0,0,0.22)',
        }}>
          {text}
        </span>
      )}
    </span>
  );
}

const TOOL_STEPS = [
  { key: 'history',    label: 'get_transaction_history',  emoji: '📋' },
  { key: 'graph',      label: 'get_transaction_graph',    emoji: '🕸️'  },
  { key: 'risk',       label: 'score_risk',               emoji: '⚡'  },
  { key: 'rag',        label: 'search_regulations',       emoji: '📚'  },
  { key: 'typology',   label: 'detect_typology',          emoji: '🔍'  },
  { key: 'generating', label: 'Generating STR draft…',    emoji: '📄'  },
];

function AgentRunning({ accountId, stepsDone }) {
  return (
    <div style={{ maxWidth: 600, margin: '40px auto 0' }}>
      <div className="hero-card" style={{ animation: 'pulse-glow 2s ease-in-out infinite' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
            <div className="spinner" />
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              Investigating {accountId}
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            LangGraph ReAct agent is autonomously running…
          </p>
        </div>

        <div className="agent-log">
          {TOOL_STEPS.map((step, i) => {
            const done   = stepsDone > i;
            const active = stepsDone === i;
            return (
              <div key={step.key} className={`log-line ${done ? 'done' : active ? 'active' : ''}`}>
                <span className={`log-dot ${done ? 'done' : active ? 'active' : ''}`} />
                <span>{step.emoji} {step.label}</span>
                {done   && <span className="log-time">✓</span>}
                {active && <span className="log-time"><span className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} /></span>}
              </div>
            );
          })}
        </div>

      <p style={{ fontSize:11, color:'#9CA3AF', textAlign:'center', marginTop:16 }}>
          Typically 30–90 seconds · Calling GPT-4o-mini + 5 domain tools
        </p>
      </div>
    </div>
  );
}

function ShapBar({ feature, value, maxAbs }) {
  const isPos = value >= 0;
  const pct   = maxAbs > 0 ? Math.min(100, (Math.abs(value) / maxAbs) * 100) : 0;
  return (
    <div className="shap-row">
      <div className="shap-label-row">
        <span className="shap-feature">{feature}</span>
        <span className={`shap-value ${isPos ? 'shap-pos' : 'shap-neg'}`}>
          {isPos ? '+' : ''}{value?.toFixed(4) ?? '—'}
        </span>
      </div>
      <div className="shap-bar-track">
        <div
          className={`shap-bar-fill ${isPos ? 'shap-bar-pos' : 'shap-bar-neg'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function STRResult({ result, accountId, onReset }) {
  const rc        = getRiskClass(result.risk_tier);
  const riskColor = getRiskColour(result.risk_tier);
  // API response: str_sections contains parsed fields
  const sections  = result.str_sections || {};
  const topFeats  = sections.ml_risk?.top_shap_features || [];
  const maxAbs    = Math.max(...topFeats.map(f => Math.abs(f.contribution ?? 0)), 0.001);
  const citations = sections.regulatory_citations || [];
  const typologies = sections.typologies || [];
  const graphData  = sections.graph_intelligence || {};
  const acctData   = sections.account_summary || {};

  function downloadSTR() {
    const text = result.str_draft_text || JSON.stringify(result, null, 2);
    const blob = new Blob([text], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `STR_${accountId}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fade-in-up">
      {/* Risk banner */}
      <div style={{
        background: `${riskColor}18`,
        border: `1px solid ${riskColor}44`,
        borderRadius: 12,
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        marginBottom: 20,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className={`badge badge-${rc}`} style={{ fontSize: 13, padding: '5px 14px' }}>
              {result.risk_tier}
            </span>
            <span style={{ fontSize: 22, fontWeight: 800, color: riskColor, fontFamily: 'monospace' }}>
              {fmtProb(result.fraud_probability)}
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>fraud probability</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Account <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{accountId}</strong>
            {' '}&mdash; {result.recommendation || 'REVIEW'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={downloadSTR}>
            <Download size={15} /> Download STR
          </button>
          <button className="btn btn-outline" onClick={onReset}>
            <RefreshCw size={15} /> New
          </button>
        </div>
      </div>

      {/* Cards row 1 */}
      <div className="bento-grid bento-3col">
        {/* Account Summary */}
        <div className={`card risk-${rc}`}>
          <div className="card-header">
            <span className="card-title"><FileText size={15} />Account Summary</span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ['Total Transactions', acctData.total_transactions],
              ['Sent / Received',    `${acctData.transactions_sent ?? '—'} / ${acctData.transactions_received ?? '—'}`],
              ['Total Sent',         acctData.total_amount_sent ? `${fmtAmount(acctData.total_amount_sent)} units` : '—'],
              ['Avg Amount',         acctData.avg_amount ? `${fmtAmount(acctData.avg_amount)} units` : '—'],
              ['Fraud-flagged',      acctData.fraud_flagged_count ?? '—'],
              ['Period',             acctData.date_range ? `${acctData.date_range.earliest?.slice(0, 10)} → ${acctData.date_range.latest?.slice(0, 10)}` : '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{v ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Graph Intelligence */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><Network size={15} />Graph Intelligence</span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ['Mule Score',      typeof graphData.mule_score === 'number' ? graphData.mule_score.toFixed(4) : '—', 'Composite mule likelihood (0–1) from pass-through ratio, forwarding delay, sender/receiver spread, amount clustering, and KYC risk. ≥0.6 = suspected.'],
              ['Suspected Mule',  graphData.is_suspected_mule != null ? (graphData.is_suspected_mule ? '⚠ Yes' : (acctData.transactions_received === 0 ? '✓ No (Originator (send-only))' : '✓ No')) : '—', 'Flagged when the mule score is ≥ 0.6.'],
              ['In Circular Ring',graphData.in_ring != null ? (graphData.in_ring ? '⚠ Yes' : '✓ No') : '—', 'Whether this account sits inside a detected circular fund-flow (money looping back toward its origin).'],
              ['In-degree',       graphData.graph_profile?.in_degree ?? '—', 'Number of incoming transfer edges into this account.'],
              ['Out-degree',      graphData.graph_profile?.out_degree ?? '—', 'Number of outgoing transfer edges from this account.'],
              ['Connected Accts', (graphData.connected_nodes || []).slice(0, 3).join(', ') || '—', 'Accounts reached via the time-ordered fund-flow trace (up to 3 shown). May be fewer than out-degree, which counts all graph edges.'],
            ].map(([k, v, tip]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center' }}>{k}{tip && <InfoTip text={tip} />}</span>
                <span style={{ color: String(v).startsWith('⚠') ? 'var(--risk-high)' : String(v).startsWith('✓') ? 'var(--risk-low)' : 'var(--text-primary)', fontWeight: 500, maxWidth: 180, textAlign: 'right', wordBreak: 'break-all' }}>{v ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ML Risk + SHAP */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><BarChart2 size={15} />ML Risk Scoring</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>PR-AUC 0.72</span>
          </div>
          <div className="card-body">
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>XGBoost Score</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: riskColor, fontFamily: 'monospace' }}>
                {fmtProb(result.fraud_probability)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Threshold: 0.70 · Recall@0.70: 0.81 · Precision: 0.29
              </div>
            </div>
            <div className="divider" />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10, display: 'flex', alignItems: 'center' }}>
              Top SHAP Contributors (log-odds)
              <InfoTip text="SHAP values show each feature's contribution to this account's fraud score, in log-odds. Positive (red) pushes toward fraud; negative (green) pulls away. The model's base/bias term is excluded." />
            </div>
            {topFeats.length > 0 ? topFeats.map((f, i) => (
              <ShapBar
                key={i}
                feature={f.feature}
                value={f.shap_value ?? f.contribution}
                maxAbs={maxAbs}
              />
            )) : (
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>SHAP data unavailable</p>
            )}
          </div>
        </div>
      </div>

      {/* Cards row 2 */}
      <div className="bento-grid bento-3col mt-16">
        {/* Typology */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><Activity size={15} />AML Typologies</span>
          </div>
          <div className="card-body">
            {typologies.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={15} style={{ color: 'var(--risk-low)' }} /> None detected
              </div>
            ) : typologies.map((t, i) => (
              <div key={i} style={{ marginBottom:10, padding:'10px 12px', background:'var(--bg-base)', borderRadius:8, borderLeft:'3px solid var(--risk-high)', border:'1px solid var(--border)', borderLeftColor:'var(--risk-high)', borderLeftWidth:3 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--risk-high)', marginBottom:3 }}>[{t.risk}] {t.type}</div>
                <div style={{ fontSize:12, color:'var(--text-secondary)' }}>{t.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Citations */}
        <div className="card col-span-2">
          <div className="card-header">
            <span className="card-title"><BookOpen size={15} />Regulatory Citations (RAG)</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>FATF · RBI · FinCEN · MHA</span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {citations.length === 0 ? (
              <div className="empty-state" style={{ padding: 20 }}>
                <Info />
                <p>No regulatory citations retrieved</p>
              </div>
            ) : citations.map((c, i) => (
              <div key={i} className="citation-block">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="citation-source">[{i + 1}] {c.source}</span>
                  {c.page && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>p.{c.page}</span>}
                </div>
                <p className="citation-text">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{
        marginTop:20, padding:'12px 16px',
        background:'var(--bg-base)', border:'1px solid var(--border)',
        borderRadius:10, fontSize:11, color:'var(--text-muted)', lineHeight:1.7,
      }}>
        <strong style={{ color:'var(--text-secondary)' }}>⚠ Disclaimer:</strong>{' '}
        This is an AI-generated DRAFT for internal compliance use only. It is NOT a filed STR, NOT legal advice,
        and NOT court-admissible evidence. All findings require independent verification by a certified compliance
        officer. Transaction data is synthetic (PaySim-derived); regulatory thresholds must be validated against
        real currency amounts in production.
      </div>
    </div>
  );
}

export default function Investigate({ initialAccount, setInitialAccount }) {
  const [input,     setInput]     = useState(initialAccount || '');
  const [jobId,     setJobId]     = useState(null);
  const [status,    setStatus]    = useState('idle');
  const [result,    setResult]    = useState(null);
  const [error,     setError]     = useState('');
  const [stepsDone, setStepsDone] = useState(0);
  const pollRef   = useRef(null);
  const cancelRef = useRef(false);   // guards StrictMode double-mount

  useEffect(() => {
    if (initialAccount) {
      setInput(initialAccount);
      setInitialAccount('');
      setTimeout(() => handleStart(initialAccount), 100);
    }
    return () => { cancelRef.current = true; clearPoll(); };
  }, []);

  function clearPoll() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  async function handleStart(acct) {
    const accountId = (acct || input).trim();
    if (!accountId) return;
    clearPoll();
    cancelRef.current = false;
    setStatus('running');
    setResult(null);
    setError('');
    setStepsDone(0);

    let job_id;
    try {
      const res = await startInvestigation(accountId);
      job_id = res.job_id;
      setJobId(job_id);
    } catch (e) {
      setError(e.message);
      setStatus('error');
      return;
    }

    let step = 0;
    let polls = 0;
    const MAX_POLLS = 45;  // 45 × 4 s = 3 min timeout

    pollRef.current = setInterval(async () => {
      if (cancelRef.current) { clearPoll(); return; }
      polls++;
      if (polls > MAX_POLLS) {
        clearPoll();
        setError('Investigation timed out after 3 minutes.');
        setStatus('error');
        return;
      }
      try {
        const data = await pollInvestigation(job_id);
        if (step < TOOL_STEPS.length) { step++; setStepsDone(step); }

        if (data.status === 'done') {
          clearPoll();
          setResult(data);
          setStatus('done');
        } else if (data.status === 'error') {
          clearPoll();
          setError(data.error || 'Investigation failed on the backend.');
          setStatus('error');
        }
      } catch (e) {
        clearPoll();
        setError(e.message);
        setStatus('error');
      }
    }, 4000);
  }

  function reset() {
    clearPoll();
    cancelRef.current = false;
    setStatus('idle');
    setResult(null);
    setError('');
    setJobId(null);
    setStepsDone(0);
    setInput('');
  }

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Investigate Account</h1>
          <p className="page-subtitle">Autonomous AML investigation → Draft STR generation</p>
        </div>
        {status !== 'idle' && (
          <button className="btn btn-outline btn-sm" onClick={reset}>
            <ChevronLeft size={13} /> New Investigation
          </button>
        )}
      </div>

      <div className="page-body">
        {/* Idle state: input form */}
        {status === 'idle' && (
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <div className="hero-card">
              <div className="hero-tag"><Shield size={10} />Sentinel AI Agent</div>
              <h2 className="hero-title" style={{ fontSize: 22 }}>Start Investigation</h2>
              <p className="hero-sub">
                The agent will call 5 tools: transaction history, fund flow graph,
                XGBoost risk scoring, regulatory RAG, and AML typology detection.
              </p>
              <div className="hero-input-row">
                <input
                  className="hero-input"
                  placeholder="Account ID (e.g. C1953680528)"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && input.trim() && handleStart()}
                />
                <button
                  className="btn btn-primary"
                  onClick={() => handleStart()}
                  disabled={!input.trim()}
                >
                  <Search size={15} /> Investigate
                </button>
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12, textAlign: 'center' }}>
              Typical run time: 30–90 seconds · Requires OpenAI API key configured in backend
            </p>

            {/* Demo account chips */}
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 10, textAlign: 'center' }}>Try a demo account</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                {DEMO_ACCOUNTS.map(a => (
                  <button key={a.id} className="btn btn-outline btn-sm" style={{ fontFamily: 'monospace' }} onClick={() => handleStart(a.id)}>
                    {a.id}<span style={{ marginLeft: 6, color: 'var(--text-muted)' }}>{a.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* How it works */}
            <div style={{ marginTop: 28 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 12, textAlign: 'center' }}>How it works</div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {[
                  ['1', 'Gather evidence', 'The agent pulls transaction history and builds the fund-flow graph.'],
                  ['2', 'Score the risk', 'XGBoost scores fraud probability with SHAP; AML typologies are matched.'],
                  ['3', 'Cite & draft', 'FATF/RBI/FinCEN passages are retrieved and a draft STR is generated.'],
                ].map(([n, title, desc]) => (
                  <div key={n} className="card" style={{ flex: '1 1 150px', minWidth: 150 }}>
                    <div className="card-body">
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>{n}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Running */}
        {status === 'running' && <AgentRunning accountId={input} stepsDone={stepsDone} />}

        {/* Error */}
        {status === 'error' && (
          <div style={{ maxWidth: 560, margin: '40px auto 0' }}>
            <div className="card risk-critical">
              <div className="card-body" style={{ textAlign: 'center', padding: 32 }}>
                <AlertTriangle size={32} style={{ color: 'var(--risk-critical)', marginBottom: 12 }} />
                <h3 style={{ marginBottom: 8 }}>Investigation Failed</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>{error}</p>
                <button className="btn btn-outline" onClick={reset}>Try Again</button>
              </div>
            </div>
          </div>
        )}

        {/* Done */}
        {status === 'done' && result && (
          <STRResult result={result} accountId={input} onReset={reset} />
        )}
      </div>
    </div>
  );
}
