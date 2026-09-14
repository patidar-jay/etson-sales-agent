import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { getQuotes, createQuote, updateQuote, approveQuote, rejectQuote, sendQuote, getLeads, getProducts } from '../services/api';
import { FileText, Send, Check, X, Plus, Trash2, Edit } from 'lucide-react';
import toast from 'react-hot-toast';

const defaultForm = {
  lead_id: '',
  client: '',
  phone: '',
  items: [],
  notes: 'Payment: 100% Advance. Validity: 15 Days.'
};

const Quotes = () => {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [leads, setLeads] = useState([]);
  const [form, setForm] = useState(defaultForm);

  const [products, setProducts] = useState([]);
  const location = useLocation();

  useEffect(() => {
    fetchQuotes();
    getLeads().then(res => setLeads(res.data || res || [])).catch(console.error);
    getProducts().then(res => setProducts(res || [])).catch(console.error);
  }, []);

  useEffect(() => {
    if (location.state?.prefillLead && products.length > 0) {
      const l = location.state.prefillLead;
      setForm({
        ...defaultForm,
        lead_id: l.id,
        client: l.company || l.name,
        phone: l.phone || '',
        items: [{ product: products[0]?.name || '', qty: 100, price: products[0]?.price || 0 }]
      });
      setShowModal(true);
      // Clear location state so it doesn't reopen on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state, products]);

  const fetchQuotes = () => {
    setLoading(true);
    getQuotes().then(res => {
      setQuotes(res.data || res || []);
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

  const handleLeadChange = (e) => {
    const id = e.target.value;
    const l = leads.find(x => x.id === id);
    setForm(f => ({
      ...f, lead_id: id,
      client: l ? (l.company || l.name) : f.client,
      phone: l ? (l.phone || '') : f.phone
    }));
  };

  const addItem = () => {
    const prod = products[0] || { name: 'Custom Item', price: 0 };
    setForm(f => ({ ...f, items: [...f.items, { product: prod.name, qty: 100, price: prod.price || 0 }] }));
  };
  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  const handleItemChange = (idx, field, val) => {
    const newItems = [...form.items];
    newItems[idx][field] = field === 'product' ? val : Number(val);
    setForm({ ...form, items: newItems });
  };
  const totalAmount = form.items.reduce((acc, item) => acc + (item.qty * item.price), 0);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.client) return toast.error('Client name is required');
    setSaving(true);
    try {
      const payload = { ...form, amount: totalAmount };
      if (editingId) {
        await updateQuote(editingId, payload);
        toast.success('Quote Updated');
      } else {
        await createQuote(payload);
        toast.success('Quote Created');
      }
      setShowModal(false);
      fetchQuotes();
    } catch (err) {
      toast.error('Failed to save quote');
    } finally {
      setSaving(false);
    }
  };

  const openNewModal = () => {
    setEditingId(null);
    setForm(defaultForm);
    setShowModal(true);
  };

  const openEditModal = (quote) => {
    setEditingId(quote.id);
    setForm({
      lead_id: quote.lead_id || '',
      client: quote.client || quote.lead_name || '',
      phone: quote.phone || quote.lead_phone || '',
      items: Array.isArray(quote.items) ? quote.items : defaultForm.items,
      notes: quote.notes || ''
    });
    setShowModal(true);
  };

  return (
    <div className="slide-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl">Quotes & Proposals</h1>
        <button className="btn btn-primary" onClick={openNewModal}><FileText size={18} /> New Quote</button>
      </div>

      <div className="glass-card" style={{ padding: 0, overflowY: 'auto', flex: 1 }}>
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
                  <td colSpan="6">
                    <div className="empty-state">
                      <div className="empty-state-icon"><FileText size={28} /></div>
                      <div className="font-semibold text-main">No quotes found</div>
                      <div className="text-sm">Create your first quote proposal to send to a client.</div>
                    </div>
                  </td>
                </tr>
              ) : quotes.map(quote => (
                <tr key={quote.id}>
                  <td style={{ fontWeight: 500, color: 'var(--teal-accent)' }}>{quote.id}</td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="avatar avatar-sm">{quote.client?.charAt(0).toUpperCase() || quote.lead_name?.charAt(0).toUpperCase()}</div>
                      <span style={{ fontWeight: 500 }}>{quote.client || quote.lead_name || '-'}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: '1.125rem', fontWeight: 600 }}>{quote.amount ? `₹${quote.amount.toLocaleString('en-IN')}` : '-'}</td>
                  <td className="text-muted">{quote.created_at ? new Date(quote.created_at).toLocaleDateString('en-IN') : '-'}</td>
                  <td><Badge variant={getStatusVariant(quote.status)}>{quote.status || '-'}</Badge></td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-ghost" title="View/Edit" onClick={() => openEditModal(quote)}><Edit size={16} /></button>
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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingId ? `📄 Edit Quote ${editingId}` : "📄 New Quote"} maxWidth="680px">
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Select Lead (optional — auto-fills below)</label>
            <select className="form-input" value={form.lead_id} onChange={handleLeadChange}>
              <option value="">-- Select Lead --</option>
              {leads.map(l => (
                <option key={l.id} value={l.id}>
                  {l.company ? `${l.company} — ${l.name}` : l.name} {l.phone ? `(${l.phone})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label className="form-label">Client / Company Name *</label>
              <input type="text" className="form-input" required placeholder="e.g. BrightTech"
                value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Phone Number</label>
              <input type="text" className="form-input" placeholder="e.g. 919876543210"
                value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>

          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="form-label mb-0">Products *</label>
              <button type="button" className="btn btn-ghost text-teal" onClick={addItem} style={{ border: '1px solid var(--teal-accent)', padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}>
                <Plus size={14} /> Add Product
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 90px 90px 32px', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span>Product</span><span>Qty</span><span>Price</span><span>Total</span><span></span>
            </div>
            {form.items.map((item, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 80px 90px 90px 32px', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                <select className="form-input" style={{ padding: '0.4rem' }} value={item.product} onChange={e => handleItemChange(idx, 'product', e.target.value)}>
                  {products.map(p => <option key={p.id || p.name} value={p.name}>{p.name}</option>)}
                </select>
                <input type="number" min="1" className="form-input text-right" style={{ padding: '0.4rem' }} value={item.qty} onChange={e => handleItemChange(idx, 'qty', e.target.value)} />
                <input type="number" min="0" step="0.01" className="form-input text-right" style={{ padding: '0.4rem' }} value={item.price} onChange={e => handleItemChange(idx, 'price', e.target.value)} />
                <span className="text-right text-teal font-semibold">₹{(item.qty * item.price).toLocaleString()}</span>
                {form.items.length > 1 ? (
                  <button type="button" className="btn btn-ghost text-red-500" onClick={() => removeItem(idx)} style={{ padding: '0.2rem' }}><Trash2 size={16}/></button>
                ) : <span/>}
              </div>
            ))}
            <div className="flex justify-end gap-4 mt-4 pt-4 items-center" style={{ borderTop: '1px solid var(--glass-border)' }}>
              <span className="text-muted">Total Amount:</span>
              <span className="text-2xl text-teal">₹{totalAmount.toLocaleString()}</span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes / Terms</label>
            <textarea className="form-input" rows="3" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}></textarea>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : (editingId ? 'Save Changes' : 'Create Quote')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Quotes;
