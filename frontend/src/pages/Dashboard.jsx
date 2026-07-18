import { useEffect, useState } from 'react';
import { AlertTriangle, Clock, Database, TrendingUp, ChevronRight, Zap, Shield, Bell } from 'lucide-react';
import { getHealth, getAlerts } from '../api';
import { getRiskClass, fmtAmount, DEMO_ACCOUNTS } from '../utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const RISK_COLOURS = {
  CRITICAL: '#DC2626',
  HIGH:     '#F59E0B',
  MEDIUM:   '#3B82F6',
  LOW:      '#10B981',
};

export default function Dashboard({ setPage, setInitialAccount }) {
  const [health, setHealth] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [input, setInput]   = useState('');

  useEffect(() => {
    getHealth().then(setHealth).catch(() => setHealth({}));
    getAlerts(0, 100).then(d => setAlerts(Array.isArray(d?.alerts) ? d.alerts : [])).catch(() => setAlerts([]));
  }, []);

  function handleInvestigate(accountId) {
    setInitialAccount(accountId || input.trim());
    setPage('investigate');
  }

  // Risk distribution from alerts
  const riskCounts = alerts.reduce((acc, a) => {
    const s = (a.severity || 'LOW').toUpperCase();
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(riskCounts).map(([name, value]) => ({ name, value }));

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">AML Investigation Centre</h1>
          <p className="page-subtitle">Sentinel AI — Autonomous Suspicious Transaction Report Generation</p>
        </div>
        <div className="flex gap-8 items-center">
              {health && (
            <span className="badge badge-low" style={{ fontSize: 11 }}>
              ● {health?.database?.total_transactions?.toLocaleString() || '499,196'} transactions
            </span>
          )}
        </div>
      </div>

      <div className="page-body">
        {/* Row 1: Hero + Stats */}
        <div className="bento-grid bento-4col">
          {/* Hero Card */}
          <div className="hero-card col-span-2">
            <div>
              <div className="hero-tag">
                <Zap size={10} />
                AI Agent — GPT-4o-mini + LangGraph ReAct
              </div>
              <h2 className="hero-title">Start an AML<br />Investigation</h2>
              <p className="hero-sub">
                Enter a flagged account ID. The agent autonomously calls 5 tools,
                retrieves FATF/RBI regulations, and generates a cited draft STR.
              </p>
            </div>
            <div className="hero-input-row">
              <input
                className="hero-input"
                placeholder="Account ID (e.g. C1953680528)"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && input.trim() && handleInvestigate()}
              />
              <button
                className="btn btn-primary"
                onClick={() => handleInvestigate()}
                disabled={!input.trim()}
              >
                <Shield size={15} />
                Investigate
              </button>
            </div>
          </div>

          {/* Stat: Active Alerts */}
          <div className="stat-card">
            <div className="stat-label"><AlertTriangle size={13} /> Active Alerts</div>
            <div className="stat-value" style={{ color: '#DC2626' }}>
              {health?.database?.total_alerts != null ? Number(health.database.total_alerts).toLocaleString() : '294'}
            </div>
            <div className="stat-sub">Total open alerts</div>
          </div>

          {/* Stat: DB */}
          <div className="stat-card">
            <div className="stat-label"><Database size={13} /> Database</div>
            <div className="stat-value">499K</div>
            <div className="stat-sub">PaySim synthetic txns · {health?.database?.fraud_rate ?? '1.84'}% fraud rate</div>
          </div>
        </div>

        {/* Row 2: Recent Alerts + Donut + Demo Accounts */}
        <div className="bento-grid bento-3col mt-16">
          {/* Recent Alerts */}
          <div className="card col-span-2">
            <div className="card-header">
              <span className="card-title"><Bell size={15} />Recent Alerts</span>
              <button className="btn btn-outline btn-sm" onClick={() => setPage('alerts')}>
                View All <ChevronRight size={13} />
              </button>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {alerts.length === 0 ? (
                <div className="empty-state" style={{ padding: 32 }}>
                  <AlertTriangle />
                  <p>No alerts loaded. Ensure the backend is running.</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th>Type</th>
                      <th>Severity</th>
                      <th>Amount</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.slice(0, 8).map((a, i) => {
                      const tier = (a.severity || 'LOW').toUpperCase();
                      const rc   = getRiskClass(tier);
                      const accounts = (() => {
                        try {
                          return Array.isArray(a.accounts_involved)
                            ? a.accounts_involved
                            : typeof a.accounts_involved === 'string'
                              ? JSON.parse(a.accounts_involved)
                              : [];
                        } catch {
                          return [];
                        }
                      })();
                      return (
                        <tr
                          key={i}
                          className={`alert-row-${rc}`}
                          onClick={() => { setInitialAccount(accounts[0] || ''); setPage('investigate'); }}
                        >
                          <td className="primary-col font-mono" style={{ fontSize: 12 }}>
                            {accounts[0] || '—'}
                          </td>
                          <td>{(a.alert_type || '—').replace(/_/g, ' ')}</td>
                          <td><span className={`badge badge-${rc}`}>{tier}</span></td>
                          <td>{fmtAmount(a.total_amount)}</td>
                          <td><ChevronRight size={14} style={{ opacity: 0.4 }} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Risk Distribution */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card-header">
              <span className="card-title"><TrendingUp size={15} />Risk Distribution</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Latest {alerts.length}{health?.database?.total_alerts ? ` of ${Number(health.database.total_alerts).toLocaleString()}` : ''}
              </span>
            </div>
            <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              {pieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={72}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={RISK_COLOURS[entry.name] || '#64748B'} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 8 }}
                        labelStyle={{ color: '#F8FAFC' }}
                        itemStyle={{ color: '#94A3B8' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', justifyContent: 'center', marginTop: 8 }}>
                    {pieData.map(({ name, value }) => (
                      <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: RISK_COLOURS[name] || '#64748B', flexShrink: 0 }} />
                        <span style={{ color: 'var(--text-secondary)' }}>{name} <strong style={{ color: 'var(--text-primary)' }}>{value}</strong></span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <TrendingUp />
                  <p>Awaiting alert data</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 3: Demo accounts quick-launch */}
        <div className="card mt-16">
          <div className="card-header">
            <span className="card-title"><Zap size={15} />Quick Launch — Demo Accounts</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Click any row to start an investigation</span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Account ID</th>
                  <th>Risk Tier</th>
                  <th>Max Fraud Prob</th>
                  <th>Transactions</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {DEMO_ACCOUNTS.map((a) => (
                  <tr
                    key={a.id}
                    className={`alert-row-${getRiskClass(a.tier)}`}
                    onClick={() => handleInvestigate(a.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="primary-col font-mono">{a.id}</td>
                    <td><span className={`badge badge-${getRiskClass(a.tier)}`}>{a.tier}</span></td>
                    <td style={{ color: '#DC2626', fontWeight: 700 }}>{a.prob.toFixed(3)}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{a.txns}</td>
                    <td><ChevronRight size={14} style={{ opacity: 0.4 }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
