import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneCall, Flame, TrendingUp, Clock, PlayCircle, Megaphone, FileText, MessageCircle } from 'lucide-react';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import { getLeads, getAnalyticsOverview, getDailyTrend, getRecentMessages } from '../services/api';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const Home = () => {
  const [allLeads, setAllLeads] = useState([]);
  const [recentLeads, setRecentLeads] = useState([]);
  const [overview, setOverview] = useState({});
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recentMsgs, setRecentMsgs] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([getLeads(), getAnalyticsOverview(), getDailyTrend()])
      .then(([leadsData, overviewData, trendRes]) => {
        const safeLeads = Array.isArray(leadsData) ? leadsData : (leadsData?.data || []);
        setAllLeads(safeLeads);
        const hotLeads = safeLeads.filter(l => l.category?.toLowerCase() === 'hot' || l.category?.toLowerCase() === 'high');
        setRecentLeads(hotLeads.slice(0, 5));
        setOverview(overviewData || {});
        const last7 = Array.isArray(trendRes) ? trendRes.slice(-7) : [];
        setTrendData(last7);
        getRecentMessages(5).then(msgs => setRecentMsgs(Array.isArray(msgs) ? msgs : [])).catch(() => {});
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load data');
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="flex justify-center items-center h-full"><div className="skeleton" style={{ width: '100%', height: '100%' }}></div></div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  const hotLeadsCount = allLeads.filter(l => l.category?.toLowerCase() === 'hot' || l.category?.toLowerCase() === 'high').length;
  const pipelineValue = allLeads
    .filter(l => l.category?.toLowerCase() === 'hot' || l.category?.toLowerCase() === 'high')
    .reduce((sum, lead) => sum + (Number(lead.volume) || 0), 0);

  // Check if trend data has any non-zero values
  const hasTrendData = trendData.some(d => d.leads > 0);

  return (
    <div className="slide-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl">Dashboard</h1>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="quick-action-card" onClick={() => navigate('/campaigns')}>
          <div className="qa-icon" style={{ background: 'rgba(20,184,166,0.15)', color: 'var(--teal-accent)' }}>
            <Megaphone size={20} />
          </div>
          <div className="font-semibold mt-1">Create Campaign</div>
          <div className="text-xs text-subtle">Start a new outreach blast</div>
        </div>
        
        <div className="quick-action-card" onClick={() => navigate('/quotes')}>
          <div className="qa-icon" style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}>
            <FileText size={20} />
          </div>
          <div className="font-semibold mt-1">New Quote</div>
          <div className="text-xs text-subtle">Send proposal to a lead</div>
        </div>

        <div className="quick-action-card" onClick={() => navigate('/whatsapp')}>
          <div className="qa-icon" style={{ background: 'rgba(37,211,102,0.15)', color: '#25d366' }}>
            <MessageCircle size={20} />
          </div>
          <div className="font-semibold mt-1">Send WhatsApp</div>
          <div className="text-xs text-subtle">Message a contact directly</div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <StatCard title="Total Leads" value={overview.newLeads || 0} icon={<PhoneCall size={22} />} trend="up" trendValue={`${overview.newLeadsToday || 0} today`} accent="teal" />
        <StatCard title="Hot Leads" value={hotLeadsCount} icon={<Flame size={22} />} trend="up" trendValue={`${overview.won || 0} won`} accent="red" />
        <StatCard title="Pipeline Value" value={`₹${(pipelineValue / 100000).toFixed(1)}L`} icon={<TrendingUp size={22} />} trend="up" trendValue="from calls" accent="green" />
        <StatCard title="Pending Follow-ups" value={overview.pendingFollowUps || 0} icon={<Clock size={22} />} trend="down" trendValue={`${overview.callsMade || 0} contacted`} accent="gold" />
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
        {/* Chart */}
        <div className="glass-card flex flex-col">
          <h2 className="mb-4 text-xl">7-Day Lead Trend</h2>
          <div className="flex-1" style={{ minHeight: '250px', width: '100%' }}>
            {hasTrendData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--teal-accent)" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="var(--teal-accent)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--bg-navy)', borderColor: 'var(--glass-border)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--teal-accent)' }}
                  />
                  <Area type="monotone" dataKey="leads" stroke="var(--teal-accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state h-full py-0">
                <div className="empty-state-icon"><TrendingUp size={28} /></div>
                <div className="font-semibold text-main">No lead activity yet</div>
                <div className="text-sm">Run a campaign to see trends here.</div>
              </div>
            )}
          </div>
        </div>

        {/* Hot Leads */}
        <div className="glass-card flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl">Recent Hot Leads</h2>
            <button className="btn btn-ghost text-teal text-sm" onClick={() => navigate('/leads')}>View All</button>
          </div>
          <div className="flex flex-col gap-3 flex-1 overflow-y-auto" style={{ maxHeight: '250px' }}>
            {recentLeads.length === 0 ? (
              <div className="empty-state h-full py-0">
                <div className="empty-state-icon"><Flame size={28} /></div>
                <div className="font-semibold text-main">No hot leads</div>
                <div className="text-sm">Hot leads from Sarvam calls will appear here.</div>
              </div>
            ) : recentLeads.map(lead => (
              <div key={lead.id} className="flex justify-between items-center cursor-pointer p-3 rounded-lg hover:bg-white/5 transition-colors" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }} onClick={() => navigate(`/leads/${lead.id}`)}>
                <div className="flex items-center gap-3">
                  <div className="avatar avatar-sm">
                    {lead.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-main">{lead.name}</div>
                    <div className="text-xs text-subtle">{lead.company || lead.phone}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="hot">{lead.priority || lead.score || 0}</Badge>
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
