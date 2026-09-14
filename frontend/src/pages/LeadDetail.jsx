import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLeadById, updateLead } from '../services/api';
import { ArrowLeft, Phone, Mail, MapPin, Play, FileText, CheckCircle, XCircle, PhoneOutgoing, Bell, BellOff, Calendar, Edit2 } from 'lucide-react';
import Badge from '../components/Badge';
import ScoreDisplay from '../components/ScoreDisplay';
import toast from 'react-hot-toast';
import { API } from '../config.js';

const LeadDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [calling, setCalling] = useState(false);
  const [followupEnabled, setFollowupEnabled] = useState(true);
  const [pendingFollowups, setPendingFollowups] = useState([]);
  const [togglingFollowup, setTogglingFollowup] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  const handleSaveEdit = async () => {
    try {
      await updateLead(id, editForm);
      setLead({ ...lead, ...editForm });
      setEditing(false);
      toast.success('Lead updated!');
    } catch {
      toast.error('Failed to save changes');
    }
  };

  useEffect(() => {
    getLeadById(id)
      .then(data => {
        setLead(data);
        setFollowupEnabled(data.followup_enabled !== 0 && data.followup_enabled !== false);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load lead details');
        setLoading(false);
      });

    // Load pending follow-ups for this lead
    fetch(`${API}/followups?lead_id=${id}`)
      .then(r => r.ok ? r.json() : [])
      .then(items => setPendingFollowups(Array.isArray(items) ? items.filter(i => i.lead_id === id && i.status === 'pending') : []))
      .catch(() => {});
  }, [id]);

  const handleUpdateStatus = async (status) => {
    try {
      await updateLead(id, { status });
      toast.success(`Lead marked as ${status}`);
      setLead({ ...lead, status });
    } catch {
      toast.error('Failed to update lead status');
    }
  };

  const toggleFollowup = async () => {
    setTogglingFollowup(true);
    const newVal = !followupEnabled;
    try {
      const res = await fetch(`${API}/leads/${id}/followup`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newVal }),
      });
      if (!res.ok) throw new Error('Failed');
      setFollowupEnabled(newVal);
      toast.success(newVal ? '✅ Follow-ups enabled for this lead' : '🔕 Follow-ups paused for this lead');
    } catch {
      toast.error('Could not update follow-up setting');
    } finally {
      setTogglingFollowup(false);
    }
  };

  const handleSarvamCall = async () => {
    setCalling(true);
    const loadingToast = toast.loading('Initiating AI call...');
    try {
      const response = await fetch(`/api/leads/${id}/call`, {
        method: 'POST',
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to trigger call');
      }
      
      toast.success('Call initiated successfully! The AI will contact the lead shortly.', { id: loadingToast });
      setLead({ ...lead, status: 'contacted' });
    } catch (err) {
      toast.error(err.message, { id: loadingToast });
    } finally {
      setCalling(false);
    }
  };

  const mapCategory = (cat) => {
    if (!cat) return 'nurture';
    const lower = cat.toLowerCase();
    if (lower === 'high') return 'hot';
    if (lower === 'medium') return 'warm';
    if (lower === 'low') return 'nurture';
    return lower;
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!lead) return <div className="p-8 text-center">Lead not found</div>;

  const sentiment = lead.sentiment || 'Neutral';
  const sentimentVariant = sentiment.toLowerCase() === 'positive' ? 'success' : sentiment.toLowerCase() === 'negative' ? 'hot' : 'warm';

  const formatKey = (key) => key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const getPercentage = (key, val) => {
    const maxValues = {
      icp_fit: 15,
      product_fit: 15,
      volume_revenue: 15,
      supplier_pain: 15,
      timeline: 10,
      decision_authority: 10,
      commercial_viability: 15,
      engagement: 5
    };
    const maxVal = maxValues[key] || 15;
    return Math.min(100, Math.round((val / maxVal) * 100));
  };

  return (
    <div className="slide-in">
      <button className="btn btn-ghost mb-4" onClick={() => navigate(-1)} style={{ padding: 0 }}>
        <ArrowLeft size={20} /> Back to Leads
      </button>

      <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: '1fr 300px' }}>
        <div className="glass-card">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                {editing ? (
                  <input
                    value={editForm.name}
                    onChange={e => setEditForm(p => ({...p, name: e.target.value}))}
                    className="form-input"
                    style={{ fontSize: '1.3rem', fontWeight: 700, width: '100%' }}
                  />
                ) : (
                  <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>{lead.name || 'Unknown Lead'}</h1>
                )}
                {!editing ? (
                  <button className="btn btn-ghost" style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }} onClick={() => { setEditing(true); setEditForm({ name: lead.name||'', company: lead.company||'', phone: lead.phone||'', email: lead.email||'', city: lead.city||'', budget: lead.budget||'', timeline: lead.timeline||'', notes: lead.notes||'', category: lead.category||'nurture', status: lead.status||'new' }); }}>
                    <Edit2 size={14} /> Edit
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-primary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }} onClick={handleSaveEdit}>💾 Save</button>
                    <button className="btn btn-ghost" style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }} onClick={() => setEditing(false)}>✕ Cancel</button>
                  </div>
                )}
              </div>
              {editing ? (
                <input className="form-input" style={{ marginBottom: '1rem', width: '100%' }} value={editForm.company} onChange={e => setEditForm(p => ({...p, company: e.target.value}))} />
              ) : (
                <div className="text-gold" style={{ fontSize: '1.25rem', fontWeight: 500, marginBottom: '1rem' }}>{lead.company}</div>
              )}
              
              <div className="flex gap-4 text-muted mb-4" style={{ fontSize: '0.875rem' }}>
                <span className="flex items-center gap-1"><Phone size={16} /> {editing ? <input className="form-input" value={editForm.phone} onChange={e => setEditForm(p => ({...p, phone: e.target.value}))} /> : (lead.phone || '—')}</span>
                <span className="flex items-center gap-1"><Mail size={16} /> {editing ? <input className="form-input" value={editForm.email} onChange={e => setEditForm(p => ({...p, email: e.target.value}))} /> : (lead.email || 'No email')}</span>
                <span className="flex items-center gap-1"><MapPin size={16} /> {editing ? <input className="form-input" value={editForm.city} onChange={e => setEditForm(p => ({...p, city: e.target.value}))} /> : (lead.city || '—')}</span>
              </div>
              {editing ? (
                <select className="form-input" value={editForm.category} onChange={e => setEditForm(p => ({...p, category: e.target.value}))}>
                  <option value="nurture">Nurture</option>
                  <option value="warm">Warm</option>
                  <option value="hot">Hot</option>
                </select>
              ) : (
                <Badge variant={mapCategory(lead.category)}>{mapCategory(lead.category).toUpperCase()} LEAD</Badge>
              )}
            </div>
            <ScoreDisplay score={lead.priority || lead.score || 0} size={100} />
          </div>

          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Product Requirements & Details</h3>
          <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px' }}>
            <div><span className="text-muted">Product:</span> <div style={{ fontWeight: 500 }}>{lead.product || lead.needs || 'N/A'}</div></div>
            <div><span className="text-muted">Monthly Volume:</span> <div style={{ fontWeight: 500 }}>{lead.volume ? lead.volume.toLocaleString() + ' rolls' : 'N/A'}</div></div>
            <div><span className="text-muted">Core Size:</span> <div style={{ fontWeight: 500 }}>{lead.core_size || 'N/A'}</div></div>
            <div><span className="text-muted">Application:</span> <div style={{ fontWeight: 500 }}>{lead.application || 'N/A'}</div></div>
            <div><span className="text-muted">Budget Target:</span> <div style={{ fontWeight: 500 }}>{editing ? <input className="form-input" value={editForm.budget} onChange={e => setEditForm(p => ({...p, budget: e.target.value}))} /> : (lead.budget || 'N/A')}</div></div>
            <div><span className="text-muted">Timeline:</span> <div style={{ fontWeight: 500 }}>{editing ? <input className="form-input" value={editForm.timeline} onChange={e => setEditForm(p => ({...p, timeline: e.target.value}))} /> : (lead.timeline || 'N/A')}</div></div>
            <div><span className="text-muted">Current Supplier:</span> <div style={{ fontWeight: 500 }}>{lead.current_supplier || 'N/A'}</div></div>
            <div><span className="text-muted">Supplier Pain:</span> <div style={{ fontWeight: 500 }}>{lead.supplier_pain || 'N/A'}</div></div>
            <div><span className="text-muted">Decision Maker:</span> <div style={{ fontWeight: 500 }}>{lead.decision_maker || 'N/A'}</div></div>
            <div><span className="text-muted">Width:</span> <div style={{ fontWeight: 500 }}>{lead.width || 'N/A'}</div></div>
            <div><span className="text-muted">Diameter:</span> <div style={{ fontWeight: 500 }}>{lead.diameter || 'N/A'}</div></div>
            <div><span className="text-muted">Consent Source:</span> <div style={{ fontWeight: 500 }}>{lead.consent_source || 'N/A'}</div></div>
          </div>
        </div>

        <div className="flex" style={{ flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-card">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Actions</h3>
            <div className="flex" style={{ flexDirection: 'column', gap: '0.75rem' }}>
              <button
                className="btn btn-primary w-full"
                style={{ background: 'var(--teal-accent)' }}
                onClick={handleSarvamCall}
                disabled={calling}
              >
                <PhoneOutgoing size={18} /> {calling ? 'Calling...' : 'Call with Sarvam AI'}
              </button>
              <button className="btn btn-secondary w-full" onClick={() => navigate('/quotes', { state: { prefillLead: lead } })}>
                <FileText size={18} /> Create Quote
              </button>
              <button className="btn btn-secondary w-full" style={{ color: 'var(--success)', borderColor: 'var(--success)' }} onClick={() => handleUpdateStatus('won')}><CheckCircle size={18} /> Mark Won</button>
              <button className="btn btn-secondary w-full" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleUpdateStatus('lost')}><XCircle size={18} /> Mark Lost</button>
            </div>
          </div>

          {/* Follow-up Toggle Card */}
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div className="flex justify-between items-center mb-3">
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Follow-ups</h3>
              <span style={{
                fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                background: followupEnabled ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                color: followupEnabled ? '#10b981' : '#ef4444',
              }}>
                {followupEnabled ? 'ACTIVE' : 'PAUSED'}
              </span>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
              {followupEnabled
                ? 'Automated messages will be sent on the cadence schedule.'
                : 'No follow-up messages will be sent to this lead.'}
            </p>

            {/* Pending follow-ups */}
            {pendingFollowups.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                {pendingFollowups.slice(0, 3).map(f => (
                  <div key={f.id} style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem',
                  }}>
                    <Calendar size={11} style={{ color: 'var(--teal-accent)' }} />
                    <span>{new Date(f.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    <span style={{ color: followupEnabled ? '#10b981' : '#ef4444' }}>
                      {followupEnabled ? '✓ Queued' : '✗ Will skip'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Toggle button */}
            <button
              onClick={toggleFollowup}
              disabled={togglingFollowup}
              className="btn w-full"
              style={{
                background: followupEnabled ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
                border: `1px solid ${followupEnabled ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
                color: followupEnabled ? '#ef4444' : '#10b981',
                fontWeight: 600, fontSize: '0.82rem',
                justifyContent: 'center', gap: '0.5rem',
              }}
            >
              {followupEnabled ? <BellOff size={15} /> : <Bell size={15} />}
              {togglingFollowup ? 'Updating...' : followupEnabled ? 'Pause Follow-ups' : 'Enable Follow-ups'}
            </button>
          </div>

          <div className="glass-card">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Last Call Analysis</h3>
            <div style={{ marginBottom: '1rem' }}>
              {lead.recording_url ? (
                <audio
                  controls
                  style={{ width: '100%', borderRadius: '8px', marginBottom: '0.5rem', background: 'transparent' }}
                  src={lead.recording_url}
                />
              ) : (
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  🎙️ No recording available
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                <span className="text-muted">Duration: <strong>{lead.call_duration || 'N/A'}</strong></span>
                <Badge variant={sentimentVariant}>{sentiment}</Badge>
              </div>
            </div>
            
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              <p className="mb-2"><strong>Transcript:</strong></p>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{lead.transcript || 'No transcript available.'}</pre>
              {editing ? (
                <div className="mt-2">
                  <strong>Notes:</strong>
                  <textarea className="form-input" rows={3} style={{ width: '100%', marginTop: '0.5rem' }} value={editForm.notes} onChange={e => setEditForm(p => ({...p, notes: e.target.value}))}></textarea>
                </div>
              ) : (
                lead.notes && <p className="mt-2 text-gold"><strong>Notes:</strong> {lead.notes}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card">
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Score Breakdown</h3>
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {lead.score_breakdown ? Object.entries(lead.score_breakdown).map(([key, val], idx) => {
            const percentage = getPercentage(key, val);
            return (
              <div key={idx}>
                <div className="flex justify-between text-sm mb-1" style={{ fontSize: '0.875rem' }}>
                  <span>{formatKey(key)}</span>
                  <span className="text-teal" style={{ fontWeight: 600 }}>{val} pts</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${percentage}%`, height: '100%', background: 'linear-gradient(90deg, var(--teal-accent), var(--gold-highlight))', borderRadius: '4px' }}></div>
                </div>
              </div>
            );
          }) : [
            { label: 'Intent to Buy', value: 95 },
            { label: 'Budget Fit', value: 80 },
            { label: 'Authority', value: 100 },
            { label: 'Timeline', value: 90 },
            { label: 'Technical Fit', value: 100 }
          ].map((item, idx) => (
            <div key={idx}>
              <div className="flex justify-between text-sm mb-1" style={{ fontSize: '0.875rem' }}>
                <span>{item.label}</span>
                <span className="text-teal" style={{ fontWeight: 600 }}>{item.value}/100</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${item.value}%`, height: '100%', background: 'linear-gradient(90deg, var(--teal-accent), var(--gold-highlight))', borderRadius: '4px' }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LeadDetail;
