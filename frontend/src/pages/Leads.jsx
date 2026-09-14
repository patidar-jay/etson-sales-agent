import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, X } from 'lucide-react';
import Badge from '../components/Badge';
import ScoreDisplay from '../components/ScoreDisplay';
import Pagination from '../components/Pagination';
import { getLeadStats } from '../services/api';
import { API } from '../config.js';
const LIMIT = 15;

const mapCategory = (cat) => {
  if (!cat) return 'nurture';
  const l = cat.toLowerCase();
  if (l === 'high') return 'hot';
  if (l === 'medium') return 'warm';
  if (l === 'low') return 'nurture';
  return l;
};

const Leads = () => {
  const [leads,      setLeads]      = useState([]);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [filter,     setFilter]     = useState('all');   // all | hot | warm | nurture
  const [counts,     setCounts]     = useState({ total: 0, hot: 0, warm: 0, nurture: 0 });
  const navigate = useNavigate();
  const debounceRef = useRef(null);

  /* ── debounce search ─────────────────────────────────── */
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQ(searchTerm);
      setPage(1);
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [searchTerm]);

  /* ── fetch leads ─────────────────────────────────────── */
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (debouncedQ)   params.set('search',   debouncedQ);
      if (filter !== 'all') params.set('category', filter);

      const res  = await fetch(`${API}/leads?${params}`);
      const json = await res.json();

      // Support both paginated `{ data, total, totalPages }` and plain array
      if (Array.isArray(json)) {
        setLeads(json);
        setTotal(json.length);
        setTotalPages(1);
      } else {
        setLeads(json.data || []);
        setTotal(json.total || 0);
        setTotalPages(json.totalPages || 1);
      }
    } catch (e) {
      setError('Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedQ, filter]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  /* ── fetch category counts (always unfiltered) ───────── */
  useEffect(() => {
    getLeadStats().then(stats => {
      setCounts({
        total:   stats.total || 0,
        hot:     stats.hot || 0,
        warm:    stats.warm || 0,
        nurture: stats.nurture || 0,
      });
    }).catch(() => {});
  }, []);

  /* ── handle filter tab click ─────────────────────────── */
  const handleFilter = (f) => { setFilter(f); setPage(1); };

  /* ── clear search ────────────────────────────────────── */
  const clearSearch = () => { setSearchTerm(''); setPage(1); };

  /* ── helpers ─────────────────────────────────────────── */
  const getConfidenceColor = (conf) => {
    if (conf === 'High') return 'var(--success)';
    if (conf === 'Medium') return 'var(--warning)';
    return 'var(--danger)';
  };

  return (
    <div className="slide-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl">Leads</h1>
        {total > 0 && (
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {total} lead{total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Filter + Search bar */}
      <div className="glass-card mb-4" style={{ padding: '0.75rem 1rem' }}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Category tabs */}
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'all',    label: `All (${counts.total})`      },
              { key: 'hot',    label: `Hot (${counts.hot})`        },
              { key: 'warm',   label: `Warm (${counts.warm})`      },
              { key: 'nurture',label: `Nurture (${counts.nurture})`},
            ].map(({ key, label }) => (
              <button key={key}
                className={`btn ${filter === key ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleFilter(key)}>
                {label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: 'relative', minWidth: '240px' }}>
            <Search size={16} style={{
              position: 'absolute', left: '0.85rem', top: '50%',
              transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none',
            }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search name, phone, company…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.4rem', paddingRight: searchTerm ? '2.2rem' : '0.8rem', width: '100%' }}
            />
            {searchTerm && (
              <button onClick={clearSearch} style={{
                position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                padding: '2px', display: 'flex',
              }}><X size={14} /></button>
            )}
          </div>
        </div>

        {/* Active search indicator */}
        {debouncedQ && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: 'var(--teal-accent)' }}>
            🔍 Showing results for "<strong>{debouncedQ}</strong>" — {total} found
          </div>
        )}
      </div>

      {/* Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Product</th>
                <th>Volume</th>
                <th>Score</th>
                <th>Confidence</th>
                <th>Category</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  Loading…
                </td></tr>
              ) : error ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--danger)' }}>
                  {error}
                </td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  {debouncedQ ? `No leads found for "${debouncedQ}"` : 'No leads found'}
                </td></tr>
              ) : leads.map(lead => {
                const cat = mapCategory(lead.category);
                return (
                  <tr key={lead.id} className="clickable-row" onClick={() => navigate(`/leads/${lead.id}`)}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="avatar avatar-sm">
                          {lead.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{lead.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{lead.company || lead.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-muted">{lead.product || '—'}</td>
                    <td className="text-muted">{lead.volume || '—'}</td>
                    <td><ScoreDisplay score={lead.priority || 0} size={42} /></td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: getConfidenceColor(lead.confidence), flexShrink: 0 }} />
                        {lead.confidence || 'Medium'}
                      </span>
                    </td>
                    <td><Badge variant={cat}>{cat.toUpperCase()}</Badge></td>
                    <td style={{ fontSize: '0.85rem' }}>{lead.status || '-'}</td>
                    <td className="text-muted" style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                      {lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-IN') : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={LIMIT}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
};

export default Leads;
