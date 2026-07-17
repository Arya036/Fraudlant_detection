import { useState } from 'react';
import { GitBranch, Search, AlertCircle, Network } from 'lucide-react';
import { getGraph } from '../api';
import { getRiskColour, fmtAmount } from '../utils';

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
        const src = posMap[e.source];
        const tgt = posMap[e.target];
        if (!src || !tgt) return null;
        return (
          <line
            key={i}
            x1={src.x} y1={src.y}
            x2={tgt.x} y2={tgt.y}
            stroke="#CBD5E1"
            strokeWidth={Math.min(4, 1 + (e.weight || 0) / 50000)}
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

  async function handleSearch() {
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await getGraph(input.trim());
      setData(res);
    } catch (e) {
      setError(e.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  const nodes = data?.nodes || [];
  const edges = data?.edges || [];
  const profile = data?.graph_profile || {};

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
          <div className="empty-state" style={{ marginTop: 60 }}>
            <Network style={{ width: 48, height: 48 }} />
            <h3>Enter an Account ID</h3>
            <p>The graph engine builds a 2-hop ego-subgraph via SQL, runs mule scoring, and detects circular fund flows.</p>
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
              <div className={`card ${data.is_suspected_mule ? 'risk-high' : 'risk-low'}`}>
                <div className="card-header">
                  <span className="card-title">Mule Detection</span>
                </div>
                <div className="card-body">
                  <div style={{ fontSize: 28, fontWeight: 800, color: data.is_suspected_mule ? 'var(--risk-high)' : 'var(--risk-low)', fontFamily: 'monospace' }}>
                    {typeof data.mule_score === 'number' ? data.mule_score.toFixed(4) : '—'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>mule score (≥0.6 = suspected)</div>
                  <div style={{ marginTop: 12, fontSize: 13, color: data.is_suspected_mule ? 'var(--risk-high)' : 'var(--risk-low)', fontWeight: 600 }}>
                    {data.is_suspected_mule ? '⚠ Suspected Mule Account' : '✓ Not a Suspected Mule'}
                  </div>
                </div>
              </div>

              {/* Ring Detection */}
              <div className={`card ${data.in_ring ? 'risk-critical' : 'risk-low'}`}>
                <div className="card-header">
                  <span className="card-title">Ring Detection</span>
                </div>
                <div className="card-body">
                  <div style={{ fontSize: 28, fontWeight: 800, color: data.in_ring ? 'var(--risk-critical)' : 'var(--risk-low)' }}>
                    {data.in_ring ? '⚠ Ring Found' : '✓ None'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    {data.ring_count > 0 ? `${data.ring_count} circular flow(s)` : 'No circular fund flows detected'}
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
                    ['In-degree',   profile.in_degree],
                    ['Out-degree',  profile.out_degree],
                    ['Total Received', fmtAmount(profile.total_received)],
                    ['Total Sent',     fmtAmount(profile.total_forwarded)],
                    ['Passthrough',    profile.passthrough_ratio != null ? profile.passthrough_ratio.toFixed(3) : '—'],
                    ['Fan-out',        profile.fan_out_ratio != null ? profile.fan_out_ratio.toFixed(3) : '—'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: 'var(--text-muted)' }}>{k}</span>
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
