import { useState, useEffect } from 'react';
import { Bell, ChevronRight, Filter, RefreshCw, AlertTriangle } from 'lucide-react';
import { getAlerts } from '../api';
import { getRiskClass, fmtAmount, timeAgo } from '../utils';

const SEVERITIES = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export default function Alerts({ setPage, setInitialAccount }) {
  const [alerts,   setAlerts]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('ALL');
  const [error,    setError]    = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await getAlerts(0, 100);
      setAlerts(data.alerts || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const filtered = filter === 'ALL'
    ? alerts
    : alerts.filter(a => (a.severity || '').toUpperCase() === filter);

  const counts = SEVERITIES.reduce((acc, s) => {
    acc[s] = s === 'ALL'
      ? alerts.length
      : alerts.filter(a => (a.severity || '').toUpperCase() === s).length;
    return acc;
  }, {});

  const SEVERITY_COLOURS = {
    CRITICAL: { bg: 'rgba(220,38,38,0.15)',   text: '#DC2626' },
    HIGH:     { bg: 'rgba(245,158,11,0.15)',  text: '#F59E0B' },
    MEDIUM:   { bg: 'rgba(59,130,246,0.15)',  text: '#3B82F6' },
    LOW:      { bg: 'rgba(16,185,129,0.15)',  text: '#10B981' },
    ALL:      { bg: 'rgba(79,70,229,0.2)',    text: '#818CF8' },
  };

  function openInvestigation(a) {
    try {
      const accounts = JSON.parse(a.accounts_involved || '[]');
      const id = accounts[0];
      if (id) { setInitialAccount(id); setPage('investigate'); }
    } catch {}
  }

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Alert Queue</h1>
          <p className="page-subtitle">{alerts.length} alerts · Click any row to investigate</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={load} disabled={loading}>
          <RefreshCw size={13} className={loading ? 'spinner' : ''} />
          Refresh
        </button>
      </div>

      <div className="page-body">
        {/* Severity filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {SEVERITIES.map(s => {
            const rc = getRiskClass(s);
            const active = filter === s;
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                style={{
                  padding: '7px 16px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: active ? (SEVERITY_COLOURS[s]?.bg || 'rgba(79,70,229,0.2)') : 'transparent',
                  color: active ? (SEVERITY_COLOURS[s]?.text || 'var(--primary)') : 'var(--text-muted)',
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                {s}
                <span style={{
                  background: 'rgba(255,255,255,0.08)',
                  borderRadius: 20,
                  padding: '1px 7px',
                  fontSize: 11,
                }}>
                  {counts[s] || 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="card risk-critical" style={{ marginBottom: 16 }}>
            <div className="card-body" style={{ display: 'flex', gap: 10 }}>
              <AlertTriangle size={16} style={{ color: 'var(--risk-critical)' }} />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{error}</span>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            {loading ? (
              <div className="empty-state" style={{ padding: 48 }}>
                <div className="spinner" style={{ width: 28, height: 28 }} />
                <p>Loading alerts…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="empty-state" style={{ padding: 48 }}>
                <Bell />
                <h3>No alerts</h3>
                <p>No alerts matching the current filter.</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ paddingLeft: 20 }}>Account</th>
                    <th>Type</th>
                    <th>Severity</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a, i) => {
                    const tier  = (a.severity || 'LOW').toUpperCase();
                    const rc    = getRiskClass(tier);
                    let accounts = [];
                    try { accounts = JSON.parse(a.accounts_involved || '[]'); } catch {}
                    return (
                      <tr
                        key={i}
                        className={`alert-row-${rc}`}
                        onClick={() => openInvestigation(a)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="primary-col font-mono" style={{ fontSize: 12, paddingLeft: 20 }}>
                          {accounts[0] || a.alert_id?.slice(0, 14) || '—'}
                        </td>
                        <td style={{ fontSize: 12 }}>
                          {(a.alert_type || '—').replace(/_/g, ' ')}
                        </td>
                        <td>
                          <span className={`badge badge-${rc}`}>{tier}</span>
                        </td>
                        <td>{fmtAmount(a.total_amount)}</td>
                        <td>
                          <span style={{
                            fontSize: 11,
                            padding: '3px 8px',
                            borderRadius: 20,
                            background: a.status === 'OPEN' ? 'rgba(245,158,11,0.12)' : 'rgba(100,116,139,0.15)',
                            color: a.status === 'OPEN' ? 'var(--risk-high)' : 'var(--text-muted)',
                          }}>
                            {a.status || 'OPEN'}
                          </span>
                        </td>
                        <td style={{ fontSize: 12 }}>
                          {a.timestamp ? timeAgo(a.timestamp) : '—'}
                        </td>
                        <td>
                          <ChevronRight size={14} style={{ opacity: 0.35 }} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
