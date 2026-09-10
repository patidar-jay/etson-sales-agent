import React from 'react';

const ScoreDisplay = ({ score, size = 60 }) => {
  const s = Number(score) || 0;
  const radius = (size - 10) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (s / 100) * circumference;
  
  let color = '#ef4444'; // red
  if (s >= 70) color = '#10b981'; // green
  else if (s >= 40) color = '#f59e0b'; // yellow

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--glass-border)"
          strokeWidth="6"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth="6"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div style={{ position: 'absolute', fontWeight: 'bold', fontSize: size > 60 ? '1.5rem' : '1rem', color: 'var(--text-main)' }}>
        {s}
      </div>
    </div>
  );
};

export default ScoreDisplay;
