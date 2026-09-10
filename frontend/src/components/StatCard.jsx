import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const StatCard = ({ title, value, icon, trend, trendValue }) => {
  const isPositive = trend === 'up';
  
  return (
    <div className="glass-card slide-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <h3 className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500 }}>{title}</h3>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)' }}>{value}</div>
        </div>
        <div style={{ padding: '0.75rem', background: 'rgba(14, 165, 160, 0.1)', borderRadius: '12px', color: 'var(--teal-accent)' }}>
          {icon}
        </div>
      </div>
      
      {trendValue && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', color: isPositive ? 'var(--success)' : 'var(--danger)' }}>
          {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
          <span>{trendValue}</span>
          <span className="text-muted" style={{ marginLeft: '0.25rem' }}>vs last week</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;
