import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLeadById, updateLead } from '../services/api';
import { ArrowLeft, Phone, Mail, MapPin, Play, FileText, CheckCircle, XCircle, PhoneOutgoing } from 'lucide-react';
import Badge from '../components/Badge';
import ScoreDisplay from '../components/ScoreDisplay';
import toast from 'react-hot-toast';

const LeadDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [calling, setCalling] = useState(false);

  useEffect(() => {
    getLeadById(id)
      .then(data => {
        setLead(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load lead details');
        setLoading(false);
      });
  }, [id]);

  const handleUpdateStatus = async (status) => {
    try {
      await updateLead(id, { status });
      toast.success(`Lead marked as ${status}`);
      setLead({ ...lead, status });
    } catch (err) {
      toast.error('Failed to update lead status');
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
              <h1 className="text-2xl mb-1">{lead.name}</h1>
              <div className="text-gold" style={{ fontSize: '1.25rem', fontWeight: 500, marginBottom: '1rem' }}>{lead.company}</div>
              
              <div className="flex gap-4 text-muted mb-4" style={{ fontSize: '0.875rem' }}>
                <span className="flex items-center gap-1"><Phone size={16} /> {lead.phone}</span>
                <span className="flex items-center gap-1"><Mail size={16} /> {lead.email || 'No email'}</span>
                <span className="flex items-center gap-1"><MapPin size={16} /> {lead.city}</span>
              </div>
              <Badge variant={mapCategory(lead.category)}>{mapCategory(lead.category).toUpperCase()} LEAD</Badge>
            </div>
            <ScoreDisplay score={lead.priority || lead.score || 0} size={100} />
          </div>

          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Product Requirements & Details</h3>
          <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px' }}>
            <div><span className="text-muted">Product:</span> <div style={{ fontWeight: 500 }}>{lead.product || lead.needs || 'N/A'}</div></div>
            <div><span className="text-muted">Monthly Volume:</span> <div style={{ fontWeight: 500 }}>{lead.volume ? lead.volume.toLocaleString() + ' rolls' : 'N/A'}</div></div>
            <div><span className="text-muted">Core Size:</span> <div style={{ fontWeight: 500 }}>{lead.core_size || 'N/A'}</div></div>
            <div><span className="text-muted">Application:</span> <div style={{ fontWeight: 500 }}>{lead.application || 'N/A'}</div></div>
            <div><span className="text-muted">Budget Target:</span> <div style={{ fontWeight: 500 }}>{lead.budget || 'N/A'}</div></div>
            <div><span className="text-muted">Timeline:</span> <div style={{ fontWeight: 500 }}>{lead.timeline || 'N/A'}</div></div>
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
              <button className="btn btn-secondary w-full"><FileText size={18} /> Create Quote</button>
              <button className="btn btn-secondary w-full" style={{ color: 'var(--success)', borderColor: 'var(--success)' }} onClick={() => handleUpdateStatus('won')}><CheckCircle size={18} /> Mark Won</button>
              <button className="btn btn-secondary w-full" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleUpdateStatus('lost')}><XCircle size={18} /> Mark Lost</button>
            </div>
          </div>

          <div className="glass-card">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Last Call Analysis</h3>
            <div className="flex items-center justify-between mb-4" style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px' }}>
              <div className="flex items-center gap-2">
                <button className="btn btn-primary" style={{ padding: '0.5rem', borderRadius: '50%' }}><Play size={16} fill="currentColor" /></button>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{lead.call_duration || '00:00'}</div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>Duration</div>
                </div>
              </div>
              <Badge variant={sentimentVariant}>{sentiment}</Badge>
            </div>
            
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              <p className="mb-2"><strong>Transcript:</strong></p>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{lead.transcript || 'No transcript available.'}</pre>
              {lead.notes && (
                <p className="mt-2 text-gold"><strong>Notes:</strong> {lead.notes}</p>
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
