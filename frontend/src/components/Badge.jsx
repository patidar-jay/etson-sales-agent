import React from 'react';

const Badge = ({ variant = 'default', children, icon }) => {
  return (
    <span className={`badge badge-${variant?.toLowerCase() || 'default'}`}>
      {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
      {children}
    </span>
  );
};

export default Badge;
