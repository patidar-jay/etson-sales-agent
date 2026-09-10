import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneCall, Flame, TrendingUp, Clock, PlayCircle } from 'lucide-react';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import { getLeads, getAnalyticsOverview } from '../services/api';
import { trendData } from '../data/mockData';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const Home = () => {
  const [allLeads, setAllLeads] = useState([]);
  const [recentLeads, setRecentLeads] = useState([]);
  const [overview, setOverview] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([getLeads(), getAnalyticsOverview()])
      .then(([leadsData, overviewData]) => {
        const safeLeads = Array.isArray(leadsData) ? leadsData : [];
        setAllLeads(safeLeads);
        
        const hotLeads = safeLeads.filter(l => l.category === 'hot' || l.category === 'High');
        setRecentLeads(hotLeads.slice(0, 5));
        
        setOverview(overviewData || {});
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load data');
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  const hotLeadsCount = allLeads.filter(l => l.category === 'hot' || l.category === 'High').length;
  const pipelineValue = allLeads
    .filter(l => l.category === 'hot' || l.category === 'High')
    .reduce((sum, lead) => sum + (Number(lead.volume) || 0), 0);

  return (
    <div className="slide-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl">Dashboard</h1>
        <div className="flex gap-2">
          <button className="btn btn-secondary">Download Report</button>
          <button className="btn btn-primary">Start Calling</button>
        </div>
      </div>

      <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <StatCard title="Today's Calls" value={overview.callsMade || 0} icon={<PhoneCall />} trend="up" trendValue="12%" />
        <StatCard title="Hot Leads" value={hotLeadsCount} icon={<Flame color="#ef4444" />} trend="up" trendValue="5%" />
        <StatCard title="Pipeline Value" value={`₹${(pipelineValue / 100000).toFixed(1)}L`} icon={<TrendingUp />} trend="up" trendValue="18%" />
        <StatCard title="Pending Follow-ups" value={overview.pendingFollowUps || 5} icon={<Clock color="#f59e0b" />} trend="down" trendValue="2%" />
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div className="glass-card">
          <h2 className="mb-4" style={{ fontSize: '1.125rem', fontWeight: 600 }}>7-Day Lead Trend</h2>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--teal-accent)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--teal-accent)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-navy)', borderColor: 'var(--glass-border)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--teal-accent)' }}
                />
                <Area type="monotone" dataKey="leads" stroke="var(--teal-accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card">
          <div className="flex justify-between items-center mb-4">
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Recent Hot Leads</h2>
            <button className="btn btn-ghost text-teal" style={{ fontSize: '0.875rem' }} onClick={() => navigate('/leads')}>View All</button>
          </div>
          <div className="flex" style={{ flexDirection: 'column', gap: '1rem' }}>
            {recentLeads.map(lead => (
              <div key={lead.id} className="flex justify-between items-center cursor-pointer" onClick={() => navigate(`/leads/${lead.id}`)} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{lead.name}</div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>{lead.company}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="hot">{lead.priority || lead.score || 0}</Badge>
                  <button className="btn btn-ghost" style={{ padding: '0.25rem' }}><PlayCircle size={18} className="text-teal" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
