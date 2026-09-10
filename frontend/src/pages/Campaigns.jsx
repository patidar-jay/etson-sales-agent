import React, { useState, useEffect } from 'react';
import { Plus, UploadCloud, Play, Pause, CheckCircle } from 'lucide-react';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { getCampaigns, createCampaign } from '../services/api';
import toast from 'react-hot-toast';

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = () => {
    getCampaigns().then(data => {
      setCampaigns(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('name', e.target[0].value);
      await createCampaign(formData);
      setIsModalOpen(false);
      toast.success('Campaign created and started successfully!');
      fetchCampaigns();
    } catch (err) {
      toast.error('Failed to create campaign');
    }
  };

  const getStatusIcon = (status) => {
    if (status === 'Running') return <Play size={14} />;
    if (status === 'Paused') return <Pause size={14} />;
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

      <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {loading ? (
          <div className="p-8 text-center text-muted">Loading campaigns...</div>
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

            <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr 1fr', textAlign: 'center', marginTop: 'auto' }}>
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
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Campaign" maxWidth="600px">
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Campaign Name</label>
            <input type="text" className="form-input" placeholder="e.g. Diwali Retailers 2026" required />
          </div>
          <div className="form-group">
            <label className="form-label">Upload Leads (.xlsx, .csv)</label>
            <div style={{ border: '2px dashed var(--glass-border)', borderRadius: '8px', padding: '2rem', textAlign: 'center', background: 'rgba(0,0,0,0.1)', cursor: 'pointer' }}>
              <UploadCloud size={32} className="text-muted mx-auto mb-2" style={{ margin: '0 auto 0.5rem auto' }} />
              <div style={{ fontWeight: 500 }}>Drag & drop or click to upload</div>
              <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Supports Excel and CSV up to 10MB</div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Start Campaign</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Campaigns;
