import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Megaphone, Users, FileText,
  BarChart3, Settings, Menu, ChevronLeft,
  MessageCircle, PhoneCall
} from 'lucide-react';
import './Sidebar.css';
import { API } from '../config.js';

const NavSection = ({ label, collapsed }) => (
  !collapsed ? (
    <div className="nav-section-label">{label}</div>
  ) : (
    <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '0.5rem 0.75rem' }} />
  )
);

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [waUnread, setWaUnread] = useState(0);

  useEffect(() => {
    fetch(`${API}/whatsapp/unread`)
      .then(r => r.json())
      .then(d => setWaUnread(d.count || 0))
      .catch(() => {});

    const es = new EventSource(`${API}/whatsapp/stream`);
    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'init') setWaUnread(msg.unread || 0);
        else if (msg.type === 'incoming') setWaUnread(n => n + 1);
      } catch {}
    };
    return () => es.close();
  }, []);

  const NavItem = ({ path, icon, label, badge, onActivate, end: isEnd }) => (
    <NavLink
      to={path}
      end={isEnd}
      onClick={onActivate}
      className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      style={({ isActive }) => ({
        display: 'flex', alignItems: 'center',
        gap: collapsed ? 0 : '0.75rem',
        padding: '0.6rem 0.85rem',
        borderRadius: '9px',
        color: isActive ? '#fff' : 'var(--text-muted)',
        textDecoration: 'none',
        transition: 'all 0.18s ease',
        justifyContent: collapsed ? 'center' : 'flex-start',
        position: 'relative',
        background: isActive
          ? 'linear-gradient(135deg, rgba(20,184,166,0.2), rgba(20,184,166,0.08))'
          : 'transparent',
        border: isActive
          ? '1px solid rgba(20,184,166,0.25)'
          : '1px solid transparent',
        boxShadow: isActive
          ? '0 0 20px rgba(20,184,166,0.1)'
          : 'none',
        fontWeight: isActive ? 600 : 400,
      })}
    >
      <div style={{ position: 'relative', flexShrink: 0, display: 'flex' }}>
        {icon}
        {badge > 0 && (
          <div style={{
            position: 'absolute', top: -5, right: -5,
            minWidth: 16, height: 16, borderRadius: 99,
            background: '#ef4444', color: '#fff',
            fontSize: '0.6rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px',
            boxShadow: '0 0 8px rgba(239,68,68,0.6)',
            animation: 'pulse 2s infinite',
          }}>
            {badge > 99 ? '99+' : badge}
          </div>
        )}
      </div>
      {!collapsed && <span style={{ fontSize: '0.875rem' }}>{label}</span>}
      {!collapsed && badge > 0 && (
        <span style={{
          marginLeft: 'auto', background: '#ef4444',
          color: '#fff', fontSize: '0.65rem', fontWeight: 700,
          padding: '1px 6px', borderRadius: 99,
        }}>
          {badge}
        </span>
      )}
    </NavLink>
  );

  return (
    <div
      className={`sidebar glass-card ${collapsed ? 'collapsed' : ''}`}
      style={{
        margin: 0, borderRadius: 0,
        borderTop: 0, borderBottom: 0, borderLeft: 0,
        display: 'flex', flexDirection: 'column',
        width: collapsed ? 72 : 230,
        transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
        flexShrink: 0,
        background: 'rgba(10,14,32,0.85)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        zIndex: 10,
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        padding: '1.25rem 0.85rem 1rem',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        marginBottom: '0.5rem',
      }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'linear-gradient(135deg, #14b8a6, #e2b96a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '0.85rem', color: 'white',
              boxShadow: '0 4px 12px rgba(20,184,166,0.3)',
            }}>E</div>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
              ETSON <span style={{ color: 'var(--teal-accent)' }}>AI</span>
            </span>
          </div>
        )}
        {collapsed && (
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'linear-gradient(135deg, #14b8a6, #e2b96a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '0.85rem', color: 'white',
          }}>E</div>
        )}
        <button
          className="btn btn-ghost"
          onClick={() => setCollapsed(!collapsed)}
          style={{ padding: '0.25rem', marginLeft: collapsed ? 0 : '0.25rem' }}
        >
          {collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, padding: '0 0.5rem', overflowY: 'auto' }}>
        {/* MAIN */}
        <NavSection label="MAIN" collapsed={collapsed} />
        <NavItem path="/" icon={<LayoutDashboard size={18} />} label="Dashboard" end />

        {/* OUTREACH */}
        <NavSection label="OUTREACH" collapsed={collapsed} />
        <NavItem path="/campaigns" icon={<Megaphone size={18} />} label="Campaigns" />
        <NavItem
          path="/whatsapp"
          icon={<MessageCircle size={18} style={{ color: '#25D366' }} />}
          label="Whatomate"
        />
        <NavItem path="/call-logs" icon={<PhoneCall size={18} style={{ color: '#60a5fa' }} />} label="Call Logs" />

        {/* CRM */}
        <NavSection label="CRM" collapsed={collapsed} />
        <NavItem path="/leads" icon={<Users size={18} />} label="Leads" />
        <NavItem path="/quotes" icon={<FileText size={18} />} label="Quotes" />

        {/* INSIGHTS */}
        <NavSection label="INSIGHTS" collapsed={collapsed} />
        <NavItem path="/analytics" icon={<BarChart3 size={18} />} label="Analytics" />
      </nav>

      {/* Footer */}
      <div style={{
        padding: '0.75rem 0.85rem',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <NavItem path="/settings" icon={<Settings size={18} />} label="Settings" />
        {!collapsed && (
          <div style={{
            fontSize: '0.65rem', color: 'var(--text-subtle)',
            textAlign: 'center', marginTop: '0.75rem',
          }}>
            © 2026 Etson Sales
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
