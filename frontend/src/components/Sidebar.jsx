import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Megaphone, Users, FileText, BarChart3, Settings, Menu, ChevronLeft } from 'lucide-react';
import './Sidebar.css';

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { path: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { path: '/campaigns', icon: <Megaphone size={20} />, label: 'Campaigns' },
    { path: '/leads', icon: <Users size={20} />, label: 'Leads' },
    { path: '/quotes', icon: <FileText size={20} />, label: 'Quotes' },
    { path: '/analytics', icon: <BarChart3 size={20} />, label: 'Analytics' },
    { path: '/settings', icon: <Settings size={20} />, label: 'Settings' },
  ];

  return (
    <div className={`sidebar glass-card ${collapsed ? 'collapsed' : ''}`} style={{ margin: 0, borderRadius: 0, borderTop: 0, borderBottom: 0, borderLeft: 0, display: 'flex', flexDirection: 'column' }}>
      <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        {!collapsed && (
          <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, var(--teal-accent), var(--gold-highlight))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>E</div>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '0.05em' }}>ETSON <span style={{ color: 'var(--teal-accent)' }}>AI</span></span>
          </div>
        )}
        {collapsed && (
           <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, var(--teal-accent), var(--gold-highlight))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', margin: '0 auto' }}>E</div>
        )}
        <button className="btn btn-ghost" onClick={() => setCollapsed(!collapsed)} style={{ padding: '0.25rem' }}>
          {collapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="sidebar-nav" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              color: 'var(--text-muted)',
              textDecoration: 'none',
              transition: 'all 0.2s',
              justifyContent: collapsed ? 'center' : 'flex-start'
            }}
          >
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer" style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: collapsed ? 'center' : 'left' }}>
        {!collapsed ? '© 2026 Etson Sales' : '©'}
      </div>
    </div>
  );
};

export default Sidebar;
