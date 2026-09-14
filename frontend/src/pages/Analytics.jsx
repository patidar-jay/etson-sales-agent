import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import StatCard from '../components/StatCard';
import { getAnalyticsOverview, getConversionFunnel, getLeadsByCity, getLeadsByProduct } from '../services/api';
import { Users, Flame, Phone, FileText } from 'lucide-react';

const COLORS = ['#14b8a6', '#e2b96a', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const FunnelStep = ({ label, count, percentage, color }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1rem' }}>
    <div style={{ width: `${Math.max(percentage, 5)}%`, height: '40px', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', borderRadius: '4px', transition: 'width 0.5s', minWidth: '100px' }}>
      {count}
    </div>
    <div className="text-muted mt-2" style={{ fontSize: '0.875rem' }}>{label}</div>
  </div>
);

const Analytics = () => {
  const [overview, setOverview] = useState(null);
  const [funnelData, setFunnelData] = useState(null);
  const [cityData, setCityData] = useState([]);
  const [productData, setProductData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getAnalyticsOverview(),
      getConversionFunnel(),
      getLeadsByCity(),
      getLeadsByProduct(),
      fetch('/api/leads/stats').then(r => r.json()).catch(() => ({})),
    ]).then(([overviewRes, funnelRes, cityRes, productRes, statsRes]) => {
      setOverview(overviewRes || {});
      setFunnelData(funnelRes || { total: 0, contacted: 0, qualified: 0, quoted: 0 });

      const cityArray = Object.entries(cityRes || {}).map(([name, leads]) => ({ name, leads }));
      cityArray.sort((a, b) => b.leads - a.leads);
      setCityData(cityArray);

      // Product chart: use real data, or fall back to hot/warm/nurture breakdown from stats
      let prodArray = Object.entries(productRes || {})
        .map(([name, value]) => ({ name, value }))
        .filter(p => p.value > 0);

      if (prodArray.length === 0) {
        // Use lead category stats as meaningful fallback
        const hot     = statsRes?.hot     || 0;
        const warm    = statsRes?.warm    || 0;
        const nurture = statsRes?.nurture || 0;
        prodArray = [
          { name: '🔥 Hot Leads',   value: hot },
          { name: '🌡️ Warm Leads',  value: warm },
          { name: '🌱 Nurture',      value: nurture },
        ].filter(p => p.value > 0);
      }

      prodArray.sort((a, b) => b.value - a.value);
      setProductData(prodArray);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);


  if (loading) return <div className="p-8 text-center">Loading Analytics...</div>;

  const total = funnelData?.total || 1;
  const contacted = funnelData?.contacted || 0;
  const qualified = funnelData?.qualified || 0;
  const quoted = funnelData?.quoted || 0;

  return (
    <div className="slide-in">
      <h1 className="text-2xl mb-6">Analytics Dashboard</h1>
      
      <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <StatCard title="Total Leads" value={overview?.newLeads || 0} icon={<Users size={22} />} trend="up" trendValue="5%" accent="teal" />
        <StatCard title="Hot Leads" value={overview?.highPriority || 0} icon={<Flame size={22} />} trend="up" trendValue="2%" accent="red" />
        <StatCard title="Calls Made" value={overview?.callsMade || 0} icon={<Phone size={22} />} trend="up" trendValue="12%" accent="gold" />
        <StatCard title="Quotes Sent" value={overview?.quotesSent || 0} icon={<FileText size={22} />} trend="up" trendValue="1%" accent="green" />
      </div>

      <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="glass-card">
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Leads by Product Type</h2>
          {productData.length > 0 ? (
            <>
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
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted">No product data</div>
          )}
        </div>

        <div className="glass-card flex flex-col">
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Sales Funnel</h2>
          <div className="flex-1 flex flex-col justify-center" style={{ padding: '1rem 0' }}>
            <FunnelStep label="New Leads" count={total} percentage={100} color="var(--glass-border)" />
            <FunnelStep label="Contacted" count={contacted} percentage={(contacted/total)*100} color="rgba(59, 130, 246, 0.4)" />
            <FunnelStep label="Qualified" count={qualified} percentage={(qualified/total)*100} color="rgba(245, 158, 11, 0.4)" />
            <FunnelStep label="Quoted" count={quoted} percentage={(quoted/total)*100} color="rgba(16, 185, 129, 0.4)" />
          </div>
        </div>
      </div>

      <div className="glass-card">
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Top Cities</h2>
        {cityData.length > 0 ? (
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
        ) : (
          <div className="h-64 flex items-center justify-center text-muted">No city data</div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
