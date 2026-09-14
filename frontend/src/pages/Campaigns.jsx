import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Play, Pause, CheckCircle, Search, X, MessageCircle, Phone, Zap, Megaphone } from 'lucide-react';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import Pagination from '../components/Pagination';
import { createCampaign, pauseCampaign, resumeCampaign, startCampaign, getCampaignProgress } from '../services/api';
import toast from 'react-hot-toast';
import { API } from '../config.js';
const LIMIT = 12;

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [campFile, setCampFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [campStats, setCampStats] = useState({});
  const debounceRef = useRef(null);

  // Launch modal state
  const [launchModal, setLaunchModal] = useState(null); // holds campaign object
  const [launchType, setLaunchType] = useState('whatsapp'); // 'whatsapp' | 'call'
  const [launchMessage, setLaunchMessage] = useState('');
  const [launching, setLaunching] = useState(false);

  // Progress polling refs
  const pollRefs = useRef({}); // campaignId → intervalId

  /* ── debounce search ─────────────────────────────────── */
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQ(searchTerm);
      setPage(1);
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [searchTerm]);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (debouncedQ) params.set('search', debouncedQ);
      const res = await fetch(`${API}/campaigns?${params}`);
      const json = await res.json();

      let data = [];
      if (Array.isArray(json)) {
        data = json;
        setTotal(json.length);
        setTotalPages(1);
      } else {
        data = json.data || [];
        setTotal(json.total || 0);
        setTotalPages(json.totalPages || 1);
      }
      setCampaigns(data);

      // Start polling for any 'running' campaigns
      data.forEach(c => {
        if (c.status === 'running' && !pollRefs.current[c.id]) {
          startPolling(c.id);
        }
      });
    } catch (err) {
      console.error(err);
      setError('Failed to load campaigns');
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedQ]);

  useEffect(() => {
    fetchCampaigns();
    return () => {
      // Clear all polling on unmount
      Object.values(pollRefs.current).forEach(clearInterval);
    };
  }, [fetchCampaigns]);

  const loadStats = async (campId) => {
    if (campStats[campId]) return; // already loaded
    try {
      const res = await fetch(`${API}/campaigns/${campId}/stats`);
      const d = await res.json();
      setCampStats(p => ({ ...p, [campId]: d }));
    } catch {}
  };

  /* ── Live progress polling for running campaigns ── */
  const startPolling = (id) => {
    if (pollRefs.current[id]) return;
    const interval = setInterval(async () => {
      try {
        const camp = await getCampaignProgress(id);
        setCampaigns(prev => prev.map(c => c.id === id ? camp : c));
        if (camp.status !== 'running') {
          clearInterval(pollRefs.current[id]);
          delete pollRefs.current[id];
          if (camp.status === 'completed') {
            toast.success(`Campaign "${camp.name}" completed! ✅ Sent: ${camp.sent_count}, Failed: ${camp.failed_count}`);
          }
        }
      } catch (e) {
        clearInterval(pollRefs.current[id]);
        delete pollRefs.current[id];
      }
    }, 3000);
    pollRefs.current[id] = interval;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!campFile) { toast.error('Please upload a contact list (Excel or CSV)'); return; }
    try {
      const formData = new FormData();
      formData.append('file', campFile);
      formData.append('name', e.target.campName.value);
      formData.append('description', e.target.campDesc?.value || '');
      const resp = await fetch(`${API}/campaigns`, { method: 'POST', body: formData });
      if (!resp.ok) { const err = await resp.json(); throw new Error(err.error || 'Failed to create campaign'); }
      setIsModalOpen(false);
      setCampFile(null);
      toast.success('Campaign created! Now open it and click Start. 🚀');
      fetchCampaigns();
    } catch (err) {
      toast.error(err.message || 'Failed to create campaign');
    }
  };

  const handleLaunch = async () => {
    if (!launchModal) return;
    if (launchType === 'whatsapp' && !launchMessage.trim()) {
      return toast.error('Please enter a message to send');
    }
    setLaunching(true);
    try {
      await startCampaign(launchModal.id, { type: launchType, message: launchMessage });
      toast.success(`Campaign launched as ${launchType === 'whatsapp' ? 'WhatsApp' : 'Call'} blast! 🚀`);
      setLaunchModal(null);
      setLaunchMessage('');
      startPolling(launchModal.id);
      fetchCampaigns();
    } catch (err) {
      toast.error(err.message || 'Failed to start campaign');
    } finally {
      setLaunching(false);
    }
  };

  const handlePause = async (id) => {
    try {
      await pauseCampaign(id);
      toast.success('Campaign paused');
      clearInterval(pollRefs.current[id]);
      delete pollRefs.current[id];
      fetchCampaigns();
    } catch (err) {
      toast.error('Failed to pause campaign');
    }
  };

  const handleResume = async (id) => {
    try {
      await resumeCampaign(id);
      toast.success('Campaign resumed');
      startPolling(id);
      fetchCampaigns();
    } catch (err) {
      toast.error('Failed to resume campaign');
    }
  };

  const getStatusIcon = (status) => {
    if (!status) return null;
    const s = status.toLowerCase();
    if (s === 'running') return <Play size={14} />;
    if (s === 'paused') return <Pause size={14} />;
    if (s === 'completed') return <CheckCircle size={14} />;
    return null;
  };

  const getStatusVariant = (status) => {
    const s = status ? status.toLowerCase() : '';
    if (s === 'running' || s === 'active') return 'success';
    if (s === 'paused') return 'warm';
    if (s === 'completed') return 'nurture';
    return 'default';
  };

  const getProgress = (camp) => {
    const total = camp.total_contacts || 0;
    const done = (camp.sent_count || 0) + (camp.failed_count || 0);
    return total ? Math.round((done / total) * 100) : 0;
  };

  const defaultMessage = (type) => {
    if (type === 'call') return '';
    return `Hello {name}! 👋\nThis is a message from Etson Sales.\nWe'd love to connect with you.\nPlease reply to this message and our team will get back to you shortly.`;
  };

  return (
    <div className="slide-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="flex justify-between items-center mb-4" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 className="text-2xl">Campaigns</h1>
        <div className="flex gap-3 items-center flex-wrap">
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{
              position: 'absolute', left: '0.75rem', top: '50%',
              transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none',
            }} />
            <input type="text" className="form-input"
              placeholder="Search campaigns…"
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); }}
              style={{ paddingLeft: '2.2rem', width: '220px' }}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} style={{
                position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex',
              }}><X size={13} /></button>
            )}
          </div>
          <button className="btn btn-primary" onClick={() => { setIsModalOpen(true); setCampFile(null); }}>
            <Plus size={18} /> New Campaign
          </button>
        </div>
      </div>
      {debouncedQ && (
        <div style={{ fontSize: '0.82rem', color: 'var(--teal-accent)', marginBottom: '1rem' }}>
          🔍 Showing results for "<strong>{debouncedQ}</strong>" — {total} found
        </div>
      )}

      {error && <div className="p-4 mb-6 bg-red-500/20 text-red-500 rounded-lg text-center">{error}</div>}

      <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {loading ? (
          <div className="flex justify-center items-center h-48 col-span-full"><div className="skeleton w-full h-full"></div></div>
        ) : campaigns.length === 0 ? (
          <div className="empty-state col-span-full">
            <div className="empty-state-icon"><Megaphone size={28} /></div>
            <div className="font-semibold text-main">No campaigns found</div>
            <div className="text-sm">Upload your first contact list to get started!</div>
          </div>
        ) : campaigns.map(camp => (
          <div key={camp.id} className={`glass-card flex flex-col interactive campaign-card-${camp.status || 'draft'}`}>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{camp.name}</h3>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}
                  onClick={e => { e.stopPropagation(); loadStats(camp.id); setExpandedId(expandedId === camp.id ? null : camp.id); }}
                >
                  📊 Stats
                </button>
              </div>
              <Badge variant={getStatusVariant(camp.status)} icon={getStatusIcon(camp.status)}>
                <span className={camp.status?.toLowerCase() === 'running' ? 'animate-pulse' : ''}>{camp.status || 'draft'}</span>
              </Badge>
            </div>

            {/* Campaign type badge */}
            {camp.campaign_type && (
              <div className="mb-3" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {camp.campaign_type === 'whatsapp' ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: '#25d366', background: 'rgba(37,211,102,0.1)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                    <MessageCircle size={12} /> WhatsApp Blast
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: '#60a5fa', background: 'rgba(96,165,250,0.1)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                    <Phone size={12} /> Call Campaign
                  </span>
                )}
              </div>
            )}

            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex justify-between text-muted mb-1" style={{ fontSize: '0.8rem' }}>
                <span>Progress</span>
                <span>{getProgress(camp)}%</span>
              </div>
              <div className="progress-bar-track">
                <div className={`progress-bar-fill ${camp.status === 'running' ? 'animated' : ''}`} style={{ width: `${getProgress(camp)}%` }}></div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: '1fr 1fr 1fr', textAlign: 'center' }}>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{camp.total_contacts || 0}</div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>Total</div>
              </div>
              <div style={{ background: 'rgba(37,211,102,0.1)', padding: '0.5rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#4ade80' }}>{camp.sent_count || 0}</div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>Sent</div>
              </div>
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fca5a5' }}>{camp.failed_count || 0}</div>
                <div className="text-muted" style={{ fontSize: '0.75rem', color: '#fca5a5' }}>Failed</div>
              </div>
            </div>

            {expandedId === camp.id && campStats[camp.id] && (
              <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(0,0,0,0.25)', borderRadius: '8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  {[
                    { label: 'Total Leads', val: campStats[camp.id].leads?.total || 0, color: '#94a3b8' },
                    { label: '🔥 Hot', val: campStats[camp.id].leads?.hot || 0, color: '#ef4444' },
                    { label: '🌡️ Warm', val: campStats[camp.id].leads?.warm || 0, color: '#f59e0b' },
                    { label: '✅ Contacted', val: campStats[camp.id].leads?.contacted || 0, color: '#10b981' },
                  ].map(({ label, val, color }) => (
                    <div key={label} style={{ textAlign: 'center', padding: '0.4rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color }}>{val}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Avg lead score: <strong style={{ color: '#fff' }}>{campStats[camp.id].avgScore || 0}/100</strong></span>
                  <span>Progress: <strong style={{ color: '#0ea5e9' }}>{campStats[camp.id].progress || 0}%</strong></span>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 mt-auto">
              {(!camp.status || camp.status === 'draft') && (
                <button className="btn btn-primary w-full flex justify-center" onClick={() => {
                  setLaunchModal(camp);
                  setLaunchType('whatsapp');
                  setLaunchMessage(defaultMessage('whatsapp'));
                }}>
                  <Zap size={16} /> Start Campaign
                </button>
              )}
              {camp.status?.toLowerCase() === 'running' && (
                <button className="btn btn-secondary w-full flex justify-center" onClick={() => handlePause(camp.id)}>
                  <Pause size={16} /> Pause
                </button>
              )}
              {camp.status?.toLowerCase() === 'paused' && (
                <button className="btn btn-primary w-full flex justify-center" onClick={() => handleResume(camp.id)}>
                  <Play size={16} /> Resume
                </button>
              )}
              {camp.status?.toLowerCase() === 'completed' && (
                <div className="w-full text-center" style={{ fontSize: '0.85rem', color: '#4ade80' }}>
                  ✅ Completed
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="mt-6 glass-card p-0">
        <Pagination page={page} totalPages={totalPages} total={total} limit={LIMIT} onPageChange={setPage} />
      </div>

      {/* ── Create Campaign Modal ── */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="🚀 Create New Campaign" maxWidth="500px">
        <form onSubmit={handleCreate}>
          <div className="form-group mb-4">
            <label className="form-label">Campaign Name</label>
            <input type="text" name="campName" className="form-input" placeholder="e.g. Diwali Retailers 2026" required />
          </div>
          <div className="form-group mb-4">
            <label className="form-label">Description (Optional)</label>
            <textarea name="campDesc" className="form-input" rows="2" placeholder="Brief description of this campaign"></textarea>
          </div>
          <div className="form-group mb-6">
            <label className="form-label">Contact List <span style={{color:'#ef4444'}}>*</span></label>
            <div
              style={{border:'2px dashed rgba(255,255,255,0.2)',borderRadius:'10px',padding:'1.5rem',textAlign:'center',cursor:'pointer',background:'rgba(0,0,0,0.15)',transition:'border-color 0.2s'}}
              onClick={() => document.getElementById('camp-file-input').click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if(f) setCampFile(f); }}
            >
              <input
                type="file"
                id="camp-file-input"
                accept=".xlsx,.xls,.csv"
                style={{display:'none'}}
                onChange={e => setCampFile(e.target.files[0])}
              />
              {campFile ? (
                <div style={{color:'#10b981',fontWeight:600}}>
                  <div style={{fontSize:'1.5rem',marginBottom:'0.25rem'}}>✅</div>
                  {campFile.name} ({Math.round(campFile.size/1024)} KB)
                  <div style={{fontSize:'0.75rem',color:'var(--text-muted)',marginTop:'0.25rem'}}>Click to change file</div>
                </div>
              ) : (
                <div>
                  <div style={{fontSize:'2rem',marginBottom:'0.5rem'}}>📁</div>
                  <div style={{fontWeight:600,marginBottom:'0.25rem'}}>Click or drag & drop Excel / CSV</div>
                  <div style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>Required columns: phone_number, name, company, consent_source</div>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => { setIsModalOpen(false); setCampFile(null); }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={!campFile} style={{opacity: campFile ? 1 : 0.5}}>🚀 Create Campaign</button>
          </div>
        </form>
      </Modal>

      {/* ── Launch Campaign Modal ── */}
      <Modal isOpen={!!launchModal} onClose={() => setLaunchModal(null)} title={`🚀 Launch: ${launchModal?.name}`} maxWidth="560px">
        {launchModal && (
          <div>
            {/* Type selector */}
            <div className="mb-6">
              <label className="form-label mb-3">Choose Campaign Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* WhatsApp option */}
                <div
                  onClick={() => { setLaunchType('whatsapp'); setLaunchMessage(defaultMessage('whatsapp')); }}
                  style={{
                    border: `2px solid ${launchType === 'whatsapp' ? '#25d366' : 'rgba(255,255,255,0.15)'}`,
                    borderRadius: '12px', padding: '1.25rem', cursor: 'pointer',
                    background: launchType === 'whatsapp' ? 'rgba(37,211,102,0.08)' : 'rgba(0,0,0,0.2)',
                    transition: 'all 0.2s', textAlign: 'center'
                  }}
                >
                  <MessageCircle size={28} style={{ color: '#25d366', marginBottom: '0.5rem' }} />
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>WhatsApp Blast</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Send message to all contacts via WhatsApp</div>
                </div>
                {/* Call option */}
                <div
                  onClick={() => { setLaunchType('call'); setLaunchMessage(''); }}
                  style={{
                    border: `2px solid ${launchType === 'call' ? '#60a5fa' : 'rgba(255,255,255,0.15)'}`,
                    borderRadius: '12px', padding: '1.25rem', cursor: 'pointer',
                    background: launchType === 'call' ? 'rgba(96,165,250,0.08)' : 'rgba(0,0,0,0.2)',
                    transition: 'all 0.2s', textAlign: 'center'
                  }}
                >
                  <Phone size={28} style={{ color: '#60a5fa', marginBottom: '0.5rem' }} />
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Call Campaign</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Auto-dial all contacts (script coming soon)</div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="mb-5 p-3 rounded" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)' }}>
              <div className="flex gap-4" style={{ fontSize: '0.85rem' }}>
                <span>📋 <strong>{launchModal.total_contacts || 0}</strong> contacts</span>
                <span style={{ color: 'var(--text-muted)' }}>will receive this campaign</span>
              </div>
            </div>

            {/* Message editor (WhatsApp only) */}
            {launchType === 'whatsapp' && (
              <div className="form-group mb-6">
                <label className="form-label">
                  Message Template <span style={{ color: '#ef4444' }}>*</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                    Use {'{name}'} to personalize
                  </span>
                </label>
                <textarea
                  className="form-input"
                  rows="6"
                  value={launchMessage}
                  onChange={e => setLaunchMessage(e.target.value)}
                  placeholder="Type your WhatsApp message here..."
                  style={{ fontFamily: 'monospace', fontSize: '0.88rem' }}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                  {launchMessage.length} characters
                </div>
              </div>
            )}

            {launchType === 'call' && (
              <div className="mb-6 p-4 rounded" style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.3)' }}>
                <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#60a5fa' }}>📞 Call Script</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  You will be able to set up a call script after you tell us what the AI should say. For now, clicking Start will log all contact numbers to be called.
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button className="btn btn-ghost" onClick={() => setLaunchModal(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleLaunch}
                disabled={launching}
                style={{ minWidth: '140px' }}
              >
                {launching ? 'Launching...' : `🚀 Start ${launchType === 'whatsapp' ? 'WhatsApp' : 'Call'} Campaign`}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Campaigns;
