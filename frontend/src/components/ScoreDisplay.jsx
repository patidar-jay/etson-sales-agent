import React, { useEffect, useState } from 'react';

const ScoreDisplay = ({ score = 0, size = 46 }) => {
  const [offset, setOffset] = useState(0);
  const strokeWidth = size * 0.1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  let color = 'var(--danger)'; // < 30
  if (score >= 70) color = 'var(--success)';
  else if (score >= 30) color = 'var(--warning)';

  useEffect(() => {
    // Animate stroke dashoffset
    setTimeout(() => {
      setOffset(circumference - (score / 100) * circumference);
    }, 100);
  }, [score, circumference]);

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background track */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset || circumference}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      {/* Score text */}
      <div style={{ position: 'absolute', fontWeight: 700, fontSize: `${size * 0.3}px`, color: 'var(--text-main)' }}>
        {score}
      </div>
    </div>
  );
};

export default ScoreDisplay;
