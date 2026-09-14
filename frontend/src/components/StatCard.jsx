import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const StatCard = ({ title, value, icon, trend, trendValue, accent = 'teal' }) => {
  const isPositive = trend === 'up';
  
  return (
    <div className={`glass-card slide-in stat-accent-${accent} interactive`} style={{ padding: '1.25rem' }}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-subtle font-medium text-sm mb-2">{title}</h3>
          <div className="text-2xl">{value}</div>
        </div>
        {icon && (
          <div style={{ 
            padding: '0.75rem', 
            background: `var(--${accent === 'gold' ? 'gold-highlight' : accent === 'red' ? 'danger' : accent === 'green' ? 'success' : 'teal-accent'})`, 
            opacity: 0.9,
            borderRadius: '12px', 
            color: '#fff',
            boxShadow: `0 4px 14px rgba(0,0,0,0.2)`
          }}>
            {icon}
          </div>
        )}
      </div>
      
      {trendValue && (
        <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-teal' : 'text-red-500'}`}>
          {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
          <span className="font-medium">{trendValue}</span>
          <span className="text-subtle ml-1">vs last week</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;
