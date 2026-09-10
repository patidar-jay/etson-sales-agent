import React, { useState, useEffect } from 'react';
import Badge from '../components/Badge';
import { getQuotes, approveQuote, rejectQuote, sendQuote } from '../services/api';
import { FileText, Send, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

const Quotes = () => {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = () => {
    setLoading(true);
    getQuotes().then(data => {
      setQuotes(data || []);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  const handleAction = async (actionFn, id, successMsg) => {
    try {
      await actionFn(id);
      toast.success(successMsg);
      fetchQuotes();
    } catch (err) {
      toast.error('Action failed');
    }
  };

  const getStatusVariant = (status) => {
    if (!status) return 'default';
    switch(status.toLowerCase()) {
      case 'approved': return 'success';
      case 'sent': return 'nurture';
      case 'rejected': return 'hot';
      case 'draft': return 'warm';
      default: return 'default';
    }
  };

  return (
    <div className="slide-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl">Quotes & Proposals</h1>
        <button className="btn btn-primary"><FileText size={18} /> New Quote</button>
      </div>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Quote ID</th>
                <th>Client</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading...</td>
                </tr>
              ) : quotes.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No quotes found</td>
                </tr>
              ) : quotes.map(quote => (
                <tr key={quote.id}>
                  <td style={{ fontWeight: 500, color: 'var(--teal-accent)' }}>{quote.id}</td>
                  <td style={{ fontWeight: 500 }}>{quote.client || quote.lead_name || '-'}</td>
                  <td style={{ fontSize: '1.125rem', fontWeight: 600 }}>{quote.amount ? `₹${quote.amount.toLocaleString()}` : '-'}</td>
                  <td className="text-muted">{quote.created_at ? new Date(quote.created_at).toLocaleDateString('en-IN') : '-'}</td>
                  <td><Badge variant={getStatusVariant(quote.status)}>{quote.status || '-'}</Badge></td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-ghost" title="View"><FileText size={16} /></button>
                      {quote.status?.toLowerCase() === 'draft' && <button className="btn btn-ghost text-teal" title="Send" onClick={() => handleAction(sendQuote, quote.id, 'Quote sent')}><Send size={16} /></button>}
                      {quote.status?.toLowerCase() === 'sent' && (
                        <>
                          <button className="btn btn-ghost" style={{ color: 'var(--success)' }} title="Approve" onClick={() => handleAction(approveQuote, quote.id, 'Quote approved')}><Check size={16} /></button>
                          <button className="btn btn-ghost" style={{ color: 'var(--danger)' }} title="Reject" onClick={() => handleAction(rejectQuote, quote.id, 'Quote rejected')}><X size={16} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Quotes;
