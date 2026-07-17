import { useState } from 'react';
import { Search, BookOpen, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { searchRegulations } from '../api';
import { truncate } from '../utils';

const PRESET_QUERIES = [
  'structuring / smurfing detection',
  'suspicious transaction reporting India PMLA',
  'money mule account indicators',
  'round-tripping layering typology',
  'know your customer KYC obligations',
];

const SOURCE_COLOURS = {
  'FATF': '#818CF8',
  'RBI':  '#34D399',
  'FinCEN': '#FB923C',
  'MHA':  '#F472B6',
};

function getSourceColour(source) {
  for (const [k, v] of Object.entries(SOURCE_COLOURS)) {
    if ((source || '').includes(k)) return v;
  }
  return '#94A3B8';
}

export default function RAGLookup() {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [searched, setSearched] = useState(false);

  async function handleSearch(q) {
    const qq = q || query.trim();
    if (!qq) return;
    setQuery(qq);
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const data = await searchRegulations(qq, 6);
      setResults(data.results || []);
    } catch (e) {
      setError(e.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Regulatory Corpus Search</h1>
          <p className="page-subtitle">1,088 chunks · FATF · RBI KYC/AML · FinCEN · MHA — semantic RAG retrieval</p>
        </div>
      </div>

      <div className="page-body">
        {/* Search bar */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, maxWidth: 700 }}>
          <div className="search-wrap" style={{ flex: 1 }}>
            <Search />
            <input
              className="search-input"
              placeholder="e.g. structuring threshold, STR filing obligations, mule account indicators…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={() => handleSearch()}
            disabled={loading || !query.trim()}
          >
            {loading ? <span className="spinner" style={{ borderTopColor: 'white' }} /> : <Search size={15} />}
            Search
          </button>
        </div>

        {/* Preset queries */}
        {!searched && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
              Common queries
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PRESET_QUERIES.map(q => (
                <button
                  key={q}
                  className="btn btn-outline btn-sm"
                  onClick={() => handleSearch(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Corpus stats */}
        {!searched && (
          <div className="bento-grid bento-4col" style={{ marginBottom: 24 }}>
            {[
              { label: 'FATF Recommendations 2012', chunks: 266, colour: SOURCE_COLOURS.FATF },
              { label: 'RBI KYC/AML Master Direction', chunks: 192, colour: SOURCE_COLOURS.RBI },
              { label: 'FinCEN SAR Activity Review', chunks: 50, colour: SOURCE_COLOURS.FinCEN },
              { label: 'MHA Annual Report 2023-24', chunks: 580, colour: SOURCE_COLOURS.MHA },
            ].map(s => (
              <div key={s.label} className="stat-card" style={{ borderLeft: `3px solid ${s.colour}` }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.colour }}>{s.chunks}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>chunks indexed</div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="card risk-critical" style={{ marginBottom: 16 }}>
            <div className="card-body" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <AlertCircle size={16} style={{ color: 'var(--risk-critical)' }} />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{error}</span>
            </div>
          </div>
        )}

        {/* Results */}
        {searched && !loading && results.length === 0 && !error && (
          <div className="empty-state">
            <BookOpen />
            <h3>No results found</h3>
            <p>Try a broader query or check that the RAG corpus is ingested.</p>
          </div>
        )}

        {results.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {results.length} result{results.length !== 1 ? 's' : ''} for <strong style={{ color: 'var(--text-primary)' }}>"{query}"</strong>
            </div>
            {results.map((r, i) => {
              const sc = getSourceColour(r.source);
              const dist = r.distance != null ? (1 - r.distance).toFixed(3) : null;
              return (
                <div key={i} className="card" style={{ borderLeft: `3px solid ${sc}` }}>
                  <div className="card-body">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: sc, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        [{i + 1}] {r.source}
                      </span>
                      {r.page && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>p.{r.page}</span>
                      )}
                      {dist && (
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="prob-bar-track" style={{ width: 60 }}>
                            <div
                              className="prob-bar-fill"
                              style={{ width: `${Math.max(5, parseFloat(dist) * 100)}%`, background: sc }}
                            />
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{dist}</span>
                        </div>
                      )}
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                      {r.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
