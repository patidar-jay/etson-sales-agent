import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import StatCard from '../components/StatCard';
import { trendData } from '../data/mockData';
import { getAnalyticsOverview } from '../services/api';

const productData = [
  { name: '80mm Thermal', value: 400 },
  { name: '55mm Thermal', value: 300 },
  { name: 'ATM Rolls', value: 300 },
  { name: 'Barcode Labels', value: 200 },
  { name: 'Custom', value: 100 },
];
const COLORS = ['#0ea5a0', '#d4a853', '#3b82f6', '#f59e0b', '#ef4444'];

const cityData = [
  { name: 'Mumbai', leads: 120 },
  { name: 'Delhi', leads: 98 },
  { name: 'Bangalore', leads: 86 },
  { name: 'Hyderabad', leads: 65 },
  { name: 'Chennai', leads: 54 },
  { name: 'Pune', leads: 45 },
  { name: 'Ahmedabad', leads: 42 },
  { name: 'Kolkata', leads: 38 },
];

const FunnelStep = ({ label, count, percentage, color }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1rem' }}>
    <div style={{ width: `${percentage}%`, height: '40px', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', borderRadius: '4px', transition: 'width 0.5s', minWidth: '100px' }}>
      {count}
    </div>
    <div className="text-muted mt-2" style={{ fontSize: '0.875rem' }}>{label}</div>
  </div>
);

const Analytics = () => {
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    getAnalyticsOverview().then(setOverview).catch(console.error);
  }, []);

  return (
    <div className="slide-in">
      <h1 className="text-2xl mb-6">Analytics Dashboard</h1>
      
      <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <StatCard title="Total Leads" value={overview ? overview.newLeads : '...'} trend="up" trendValue="5%" />
        <StatCard title="Hot Leads" value={overview ? overview.highPriority : '...'} trend="up" trendValue="2%" />
        <StatCard title="Calls Made" value={overview ? overview.callsMade : '...'} trend="up" trendValue="12%" />
        <StatCard title="Quotes Sent" value={overview ? overview.quotesSent : '...'} trend="up" trendValue="1" />
      </div>

      <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="glass-card">
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Leads by Product Type</h2>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={productData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                  {productData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-navy)', borderColor: 'var(--glass-border)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 flex-wrap mt-4">
            {productData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: COLORS[index % COLORS.length] }}></div>
                {entry.name}
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card">
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Sales Funnel</h2>
          <div style={{ padding: '1rem' }}>
            <FunnelStep label="New Leads" count={245} percentage={100} color="var(--glass-border)" />
            <FunnelStep label="Contacted" count={180} percentage={75} color="rgba(59, 130, 246, 0.4)" />
            <FunnelStep label="Qualified" count={95} percentage={40} color="rgba(245, 158, 11, 0.4)" />
            <FunnelStep label="Quoted" count={42} percentage={17} color="rgba(16, 185, 129, 0.4)" />
            <FunnelStep label="Won" count={18} percentage={8} color="var(--teal-accent)" />
          </div>
        </div>
      </div>

      <div className="glass-card">
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Top Cities</h2>
        <div style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cityData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-navy)', borderColor: 'var(--glass-border)', borderRadius: '8px' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <Bar dataKey="leads" fill="var(--teal-accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
