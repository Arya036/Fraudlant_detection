import { useState } from 'react';
import { GitBranch, Search, AlertCircle, Network, Info } from 'lucide-react';
import { getGraph } from '../api';
import { getRiskColour, fmtAmount } from '../utils';

const DEMO_ACCOUNTS = [
  { id: 'C1953329646', label: 'mule' },
  { id: 'C1885636303', label: 'mule' },
  { id: 'C1953680528', label: 'critical' },
  { id: 'C658156224',  label: 'critical' },
];

// Illustrative sample used only for the idle-state preview (not live data).
const SAMPLE_GRAPH = {
  nodes: [
    { id: 'C1953329646', risk_tier: 'CRITICAL' },
    { id: 'C204418934',  risk_tier: 'HIGH' },
    { id: 'C551718923',  risk_tier: 'MEDIUM' },
    { id: 'C880042118',  risk_tier: 'LOW' },
    { id: 'C337651299',  risk_tier: 'HIGH' },
    { id: 'C712905643',  risk_tier: 'LOW' },
  ],
  edges: [
    { from: 'C204418934', to: 'C1953329646', amount: 180000 },
    { from: 'C551718923', to: 'C1953329646', amount: 95000 },
    { from: 'C1953329646', to: 'C880042118', amount: 130000 },
    { from: 'C1953329646', to: 'C337651299', amount: 140000 },
    { from: 'C337651299', to: 'C712905643', amount: 70000 },
  ],
};

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

function SimpleForceGraph({ nodes, edges }) {
  if (!nodes || nodes.length === 0) return null;

  // Simple SVG-based graph layout (circular placement)
  const W = 600, H = 400, cx = W / 2, cy = H / 2, r = 150;
  const nodePositions = nodes.map((n, i) => {
    const angle = (i / nodes.length) * 2 * Math.PI - Math.PI / 2;
    return {
      ...n,
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  });

  const posMap = Object.fromEntries(nodePositions.map(n => [n.id, n]));

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxHeight: 400 }}>
      {/* Edges */}
      {edges.map((e, i) => {
        const src = posMap[e.from];
        const tgt = posMap[e.to];
        if (!src || !tgt) return null;
        return (
          <line
            key={i}
            x1={src.x} y1={src.y}
            x2={tgt.x} y2={tgt.y}
            stroke="#CBD5E1"
            strokeWidth={Math.min(4, 1 + (e.amount || 0) / 50000)}
            strokeOpacity={0.8}
            markerEnd="url(#arrow)"
          />
        );
      })}
      {/* Arrow marker */}
      <defs>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#94A3B8" />
        </marker>
      </defs>
      {/* Nodes */}
      {nodePositions.map((n, i) => {
        const colour = getRiskColour(n.risk_tier || 'LOW');
        const isCenter = i === 0;
        return (
          <g key={n.id}>
            <circle
              cx={n.x} cy={n.y}
              r={isCenter ? 18 : 12}
              fill={colour}
              fillOpacity={isCenter ? 1 : 0.6}
              stroke={colour}
              strokeWidth={2}
            />
            {isCenter && (
              <circle cx={n.x} cy={n.y} r={24} fill="none" stroke={colour} strokeWidth={1} strokeOpacity={0.3} />
            )}
            <text
              x={n.x} y={n.y + 28}
              textAnchor="middle"
              fill="#475569"
              fontSize={9}
              fontFamily="monospace"
            >
              {n.id?.slice(-6)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function GraphView() {
  const [input,   setInput]   = useState('');
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function handleSearch(acct) {
    const q = (typeof acct === 'string' ? acct : input).trim();
    if (!q) return;
    if (q !== input) setInput(q);
    setLoading(true);
    setError('');
    try {
      const res = await getGraph(q);
      setData(res);
    } catch (e) {
      setError(e.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  const nodes   = data?.nodes || [];
  // Backend returns edges with 'from'/'to' keys
  const edges   = data?.edges || [];
  // Graph analysis (mule score, ring, profile) is nested under graph_analysis
  const ga      = data?.graph_analysis || {};
  const profile = ga?.graph_profile || {};

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Fund Flow Graph</h1>
          <p className="page-subtitle">2-hop ego-subgraph · SQL-built · NetworkX · Mule + Ring detection</p>
        </div>
      </div>

      <div className="page-body">
        {/* Search */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, maxWidth: 560 }}>
          <div className="search-wrap" style={{ flex: 1 }}>
            <Search />
            <input
              className="search-input"
              placeholder="Account ID (e.g. C1953680528)"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button className="btn btn-primary" onClick={handleSearch} disabled={loading || !input.trim()}>
            {loading ? <span className="spinner" /> : <GitBranch size={15} />}
            Build Graph
          </button>
        </div>

        {error && (
          <div className="card risk-critical" style={{ marginBottom: 16 }}>
            <div className="card-body" style={{ display: 'flex', gap: 10 }}>
              <AlertCircle size={16} style={{ color: 'var(--risk-critical)' }} />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{error}</span>
            </div>
          </div>
        )}

        {!data && !loading && (
          <div style={{ marginTop: 24 }}>
            {/* How it works */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 12 }}>How it works</div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {[
                  ['1', 'Build ego-graph', 'A 2-hop subgraph is assembled from SQL around the account.'],
                  ['2', 'Score & detect', 'NetworkX computes the mule score and scans for circular fund flows.'],
                  ['3', 'Read the flow', 'Nodes are risk-coloured; edge weight reflects transaction amount.'],
                ].map(([n, title, desc]) => (
                  <div key={n} className="card" style={{ flex: '1 1 180px', minWidth: 180 }}>
                    <div className="card-body">
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>{n}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Demo account chips */}
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 10 }}>Try a demo account</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {DEMO_ACCOUNTS.map(a => (
                  <button key={a.id} className="btn btn-outline btn-sm" style={{ fontFamily: 'monospace' }} onClick={() => handleSearch(a.id)}>
                    {a.id}<span style={{ marginLeft: 6, color: 'var(--text-muted)' }}>{a.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Example graph preview — fills the empty canvas + previews the output */}
            <div style={{ marginTop: 28 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 12 }}>Example ego-graph</div>
              <div className="card">
                <div className="card-header">
                  <span className="card-title"><Network size={15} />Sample fund-flow (illustrative)</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Build a graph above to see live data</span>
                </div>
                <div className="card-body" style={{ background: 'var(--bg-base)', borderRadius: '0 0 14px 14px' }}>
                  <div style={{ opacity: 0.5, pointerEvents: 'none', filter: 'grayscale(0.15)' }}>
                    <SimpleForceGraph nodes={SAMPLE_GRAPH.nodes} edges={SAMPLE_GRAPH.edges} />
                  </div>
                  <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 }}>
                    {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(label => (
                      <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                        <span style={{ width: 9, height: 9, borderRadius: '50%', background: getRiskColour(label) }} />
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {data && (
          <div className="bento-grid bento-3col">
            {/* Graph */}
            <div className="card col-span-2">
              <div className="card-header">
                <span className="card-title">
                  <Network size={15} />
                  {nodes.length} nodes · {edges.length} edges
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>2-hop ego-subgraph</span>
              </div>
              <div className="card-body" style={{ background: 'var(--bg-base)', borderRadius: '0 0 14px 14px' }}>
                <SimpleForceGraph nodes={nodes} edges={edges} />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
                  Node colour = risk tier · Node size = subject account · Edge weight = transaction amount
                </div>
              </div>
            </div>

            {/* Stats panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Mule Score */}
              <div className={`card ${ga.is_suspected_mule ? 'risk-high' : 'risk-low'}`}>
                <div className="card-header">
                  <span className="card-title">Mule Detection</span>
                </div>
                <div className="card-body">
                  <div style={{ fontSize: 28, fontWeight: 800, color: ga.is_suspected_mule ? 'var(--risk-high)' : 'var(--risk-low)', fontFamily: 'monospace' }}>
                    {typeof ga.mule_score === 'number' ? ga.mule_score.toFixed(4) : '—'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>mule score (≥0.6 = suspected)</div>
                  <div style={{ marginTop: 12, fontSize: 13, color: ga.is_suspected_mule ? 'var(--risk-high)' : 'var(--risk-low)', fontWeight: 600 }}>
                    {ga.is_suspected_mule ? '⚠ Suspected Mule Account' : '✓ Not a Suspected Mule'}
                  </div>
                </div>
              </div>

              {/* Ring Detection */}
              <div className={`card ${ga.in_ring ? 'risk-critical' : 'risk-low'}`}>
                <div className="card-header">
                  <span className="card-title">Ring Detection</span>
                </div>
                <div className="card-body">
                  <div style={{ fontSize: 28, fontWeight: 800, color: ga.in_ring ? 'var(--risk-critical)' : 'var(--risk-low)' }}>
                    {ga.in_ring ? '⚠ Ring Found' : '✓ None'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    {ga.ring_count > 0 ? `${ga.ring_count} circular flow(s)` : 'No circular fund flows detected'}
                  </div>
                </div>
              </div>

              {/* Graph metrics */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Graph Metrics</span>
                </div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    ['In-degree',   profile.in_degree, 'Number of incoming transfer edges into this account in the 2-hop ego-graph.'],
                    ['Out-degree',  profile.out_degree, 'Number of outgoing transfer edges from this account in the 2-hop ego-graph.'],
                    ['Total Received', fmtAmount(profile.total_received), 'Sum of all amounts received by this account in the sampled window.'],
                    ['Total Sent',     fmtAmount(profile.total_sent), 'Sum of all amounts sent by this account in the sampled window.'],
                    ['Passthrough',    profile.passthrough_ratio != null ? profile.passthrough_ratio.toFixed(3) : '—', 'min(total sent \u00f7 total received, 1.0). Near 1.0 = funds received are almost fully forwarded \u2014 a classic mule pass-through signature.'],
                    ['Fan-out',        profile.fan_out_ratio != null ? profile.fan_out_ratio.toFixed(3) : '—', 'Distinct receivers \u00f7 distinct senders. >1 disperses to more parties than it collects from (distribution / smurf-out); <1 consolidates (fan-in).'],
                  ].map(([k, v, tip]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center' }}>{k}{tip && <InfoTip text={tip} />}</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{v ?? '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
