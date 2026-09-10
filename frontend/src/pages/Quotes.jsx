import React, { useState, useEffect } from 'react';
import Badge from '../components/Badge';
import { getQuotes, approveQuote, rejectQuote, sendQuote } from '../services/api';
import { FileText, Send, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

const Quotes = () => {
  const [quotes, setQuotes] = useState([]);

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = () => {
    getQuotes().then(setQuotes).catch(console.error);
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
    switch(status) {
      case 'Approved': return 'success';
      case 'Sent': return 'nurture';
      case 'Rejected': return 'hot';
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
              {quotes.map(quote => (
                <tr key={quote.id}>
                  <td style={{ fontWeight: 500, color: 'var(--teal-accent)' }}>{quote.id}</td>
                  <td style={{ fontWeight: 500 }}>{quote.client}</td>
                  <td style={{ fontSize: '1.125rem', fontWeight: 600 }}>{quote.amount}</td>
                  <td className="text-muted">{quote.date}</td>
                  <td><Badge variant={getStatusVariant(quote.status)}>{quote.status}</Badge></td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-ghost" title="View"><FileText size={16} /></button>
                      {quote.status === 'Draft' && <button className="btn btn-ghost text-teal" title="Send" onClick={() => handleAction(sendQuote, quote.id, 'Quote sent')}><Send size={16} /></button>}
                      {quote.status === 'Sent' && (
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
