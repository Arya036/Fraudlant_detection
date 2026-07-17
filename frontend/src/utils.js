export function getRiskClass(tier) {
  const t = (tier || '').toUpperCase();
  if (t === 'CRITICAL') return 'critical';
  if (t === 'HIGH')     return 'high';
  if (t === 'MEDIUM')   return 'medium';
  return 'low';
}

export function getRiskColour(tier) {
  const t = (tier || '').toUpperCase();
  if (t === 'CRITICAL') return '#DC2626';
  if (t === 'HIGH')     return '#F59E0B';
  if (t === 'MEDIUM')   return '#3B82F6';
  return '#10B981';
}

export function fmtAmount(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export function fmtProb(p) {
  if (p == null) return '—';
  return Number(p).toFixed(4);
}

export function fmtPct(p) {
  if (p == null) return '—';
  return (Number(p) * 100).toFixed(1) + '%';
}

export function truncate(str, n = 120) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n) + '…' : str;
}

export function timeAgo(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export const DEMO_ACCOUNTS = [
  { id: 'C1953680528', tier: 'CRITICAL', prob: 1.000, txns: 16 },
  { id: 'C658156224',  tier: 'CRITICAL', prob: 1.000, txns: 15 },
  { id: 'C832102131',  tier: 'CRITICAL', prob: 0.999, txns: 14 },
  { id: 'C111612613',  tier: 'CRITICAL', prob: 1.000, txns: 13 },
];
