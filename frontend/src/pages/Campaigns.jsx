import React, { useState, useEffect } from 'react';
import { Plus, Play, Pause, CheckCircle } from 'lucide-react';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { getCampaigns, createCampaign, pauseCampaign, resumeCampaign } from '../services/api';
import toast from 'react-hot-toast';

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCampaigns = () => {
    setLoading(true);
    getCampaigns().then(data => {
      setCampaigns(data || []);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setError('Failed to load campaigns');
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const name = e.target[0].value;
      const description = e.target[1].value;
      await createCampaign({ name, description });
      setIsModalOpen(false);
      toast.success('Campaign created and started successfully!');
      fetchCampaigns();
    } catch (err) {
      toast.error('Failed to create campaign');
    }
  };

  const handlePause = async (id) => {
    try {
      await pauseCampaign(id);
      toast.success('Campaign paused');
      fetchCampaigns();
    } catch (err) {
      toast.error('Failed to pause campaign');
    }
  };

  const handleResume = async (id) => {
    try {
      await resumeCampaign(id);
      toast.success('Campaign resumed');
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
    return <CheckCircle size={14} />;
  };

  const getStatusVariant = (status) => {
    const s = status ? status.toLowerCase() : '';
    if (s === 'running' || s === 'active') return 'success';
    if (s === 'paused' || s === 'draft') return 'warm';
    return 'default';
  };

  return (
    <div className="slide-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl">Campaigns</h1>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> New Campaign
        </button>
      </div>

      {error && <div className="p-4 mb-6 bg-red-500/20 text-red-500 rounded-lg text-center">{error}</div>}

      <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {loading ? (
          <div className="p-8 text-center text-muted">Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <div className="p-8 text-center text-muted">No campaigns found</div>
        ) : campaigns.map(camp => (
          <div key={camp.id} className="glass-card flex" style={{ flexDirection: 'column' }}>
            <div className="flex justify-between items-start mb-4">
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{camp.name}</h3>
              <Badge variant={getStatusVariant(camp.status)} icon={getStatusIcon(camp.status)}>
                <span className={camp.status?.toLowerCase() === 'running' ? 'animate-pulse' : ''}>{camp.status}</span>
              </Badge>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between text-muted mb-1" style={{ fontSize: '0.875rem' }}>
                <span>Progress</span>
                <span>{camp.total_contacts ? Math.round(((camp.answered || 0) / camp.total_contacts) * 100) : 0}%</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${camp.total_contacts ? ((camp.answered || 0) / camp.total_contacts) * 100 : 0}%`, height: '100%', background: 'var(--teal-accent)', transition: 'width 1s ease-in-out' }}></div>
              </div>
            </div>

            <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: '1fr 1fr 1fr', textAlign: 'center' }}>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{camp.total_contacts || camp.total || 0}</div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>Total</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)' }}>{camp.answered || 0}</div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>Answered</div>
              </div>
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fca5a5' }}>{camp.hot_leads || camp.hot || 0}</div>
                <div className="text-muted" style={{ fontSize: '0.75rem', color: '#fca5a5' }}>Hot</div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-auto">
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
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Campaign" maxWidth="500px">
        <form onSubmit={handleCreate}>
          <div className="form-group mb-4">
            <label className="form-label">Campaign Name</label>
            <input type="text" className="form-input" placeholder="e.g. Diwali Retailers 2026" required />
          </div>
          <div className="form-group mb-6">
            <label className="form-label">Description (Optional)</label>
            <textarea className="form-input" rows="3" placeholder="Brief description of the campaign"></textarea>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Create Campaign</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Campaigns;
