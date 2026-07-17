import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh', gap: 16,
          background: '#0F172A', color: '#94A3B8', fontFamily: 'Inter, sans-serif',
          padding: 32, textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚠</div>
          <h2 style={{ color: '#F8FAFC', fontSize: 18, fontWeight: 700 }}>
            Render Error
          </h2>
          <p style={{ maxWidth: 480, lineHeight: 1.7, fontSize: 13 }}>
            {this.state.error?.message || 'Unknown error'}
          </p>
          <pre style={{
            background: '#1E293B', border: '1px solid #334155', borderRadius: 8,
            padding: '12px 16px', fontSize: 11, color: '#DC2626',
            maxWidth: 600, textAlign: 'left', overflowX: 'auto', whiteSpace: 'pre-wrap',
          }}>
            {this.state.error?.stack?.slice(0, 600)}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              background: '#4F46E5', color: 'white', border: 'none', borderRadius: 8,
              padding: '10px 20px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              fontFamily: 'Inter, sans-serif',
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
