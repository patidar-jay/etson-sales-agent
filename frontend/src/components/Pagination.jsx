import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Reusable Pagination component.
 * Props:
 *   page        – current page (1-based)
 *   totalPages  – total number of pages
 *   total       – total item count
 *   limit       – items per page
 *   onPageChange(newPage) – callback
 */
const Pagination = ({ page = 1, totalPages = 1, total = 0, limit = 20, onPageChange }) => {
  if (totalPages <= 1) return null;

  const from = Math.min((page - 1) * limit + 1, total);
  const to   = Math.min(page * limit, total);

  // Build page number window (max 5 buttons)
  const pages = [];
  let start = Math.max(1, page - 2);
  let end   = Math.min(totalPages, start + 4);
  if (end - start < 4) start = Math.max(1, end - 4);
  for (let i = start; i <= end; i++) pages.push(i);

  const btnBase = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: '34px', height: '34px', borderRadius: '8px', border: 'none',
    cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
    transition: 'all 0.15s',
  };
  const btnDefault = { ...btnBase, background: 'var(--glass-bg)', color: 'var(--text-muted)' };
  const btnActive  = { ...btnBase, background: 'var(--teal-accent)', color: '#fff' };
  const btnDisabled = { ...btnBase, background: 'transparent', color: 'var(--text-subtle)', cursor: 'not-allowed' };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0.75rem 1rem', borderTop: '1px solid var(--glass-border)',
      flexWrap: 'wrap', gap: '0.5rem',
    }}>
      {/* Info */}
      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
        Showing <strong style={{ color: 'var(--text-main)' }}>{from}–{to}</strong> of{' '}
        <strong style={{ color: 'var(--text-main)' }}>{total}</strong> results
      </span>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {/* First */}
        <button style={page === 1 ? btnDisabled : btnDefault}
          disabled={page === 1} onClick={() => onPageChange(1)} title="First page">
          <ChevronsLeft size={15} />
        </button>
        {/* Prev */}
        <button style={page === 1 ? btnDisabled : btnDefault}
          disabled={page === 1} onClick={() => onPageChange(page - 1)} title="Previous">
          <ChevronLeft size={15} />
        </button>

        {/* Page numbers */}
        {start > 1 && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0 4px' }}>…</span>}
        {pages.map(p => (
          <button key={p}
            style={p === page ? btnActive : btnDefault}
            onClick={() => onPageChange(p)}>
            {p}
          </button>
        ))}
        {end < totalPages && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0 4px' }}>…</span>}

        {/* Next */}
        <button style={page === totalPages ? btnDisabled : btnDefault}
          disabled={page === totalPages} onClick={() => onPageChange(page + 1)} title="Next">
          <ChevronRight size={15} />
        </button>
        {/* Last */}
        <button style={page === totalPages ? btnDisabled : btnDefault}
          disabled={page === totalPages} onClick={() => onPageChange(totalPages)} title="Last page">
          <ChevronsRight size={15} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
