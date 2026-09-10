import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter } from 'lucide-react';
import Badge from '../components/Badge';
import ScoreDisplay from '../components/ScoreDisplay';
import { getLeads } from '../services/api';

const Leads = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  const mapCategory = (cat) => {
    if (!cat) return 'nurture';
    const lower = cat.toLowerCase();
    if (lower === 'high') return 'hot';
    if (lower === 'medium') return 'warm';
    if (lower === 'low') return 'nurture';
    return lower;
  };

  useEffect(() => {
    getLeads()
      .then(data => {
        setLeads(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load leads');
        setLoading(false);
      });
  }, []);

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          lead.company?.toLowerCase().includes(searchTerm.toLowerCase());
    const leadCat = mapCategory(lead.category);
    const matchesFilter = filter === 'all' || leadCat === filter;
    return matchesSearch && matchesFilter;
  });

  const getConfidenceColor = (conf) => {
    if (conf === 'High') return 'var(--success)';
    if (conf === 'Medium') return 'var(--warning)';
    return 'var(--danger)';
  };

  return (
    <div className="slide-in flex-wrap">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl">Leads</h1>
      </div>

      <div className="glass-card mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <button className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('all')}>All ({leads.length})</button>
          <button className={`btn ${filter === 'hot' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('hot')}>Hot ({leads.filter(l => mapCategory(l.category)==='hot').length})</button>
          <button className={`btn ${filter === 'warm' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('warm')}>Warm ({leads.filter(l => mapCategory(l.category)==='warm').length})</button>
          <button className={`btn ${filter === 'nurture' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('nurture')}>Nurture ({leads.filter(l => mapCategory(l.category)==='nurture').length})</button>
        </div>
        
        <div className="flex gap-4 flex-wrap">
          <div style={{ position: 'relative' }}>
            <Search size={18} className="text-muted" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search leads..." 
              style={{ paddingLeft: '2.5rem', width: '250px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn btn-secondary"><Filter size={18} /> Filters</button>
        </div>
      </div>

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
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--danger)' }}>{error}</td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No leads found</td>
                </tr>
              ) : (
                filteredLeads.map(lead => (
                  <tr key={lead.id} className="clickable-row" onClick={() => navigate(`/leads/${lead.id}`)}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{lead.name}</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>{lead.company}</div>
                    </td>
                    <td>{lead.product}</td>
                    <td>{(lead.volume || 0).toLocaleString()}</td>
                    <td>
                      <ScoreDisplay score={lead.priority || lead.score || 0} size={40} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: getConfidenceColor(lead.confidence) }}></div>
                        {lead.confidence || 'Medium'}
                      </div>
                    </td>
                    <td><Badge variant={mapCategory(lead.category)}>{mapCategory(lead.category)}</Badge></td>
                    <td>{lead.status}</td>
                    <td className="text-muted">{lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-IN') : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Leads;
