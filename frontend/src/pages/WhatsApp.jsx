/**
 * WhatsApp.jsx — Embeds Whatomate directly inside the Etson dashboard.
 * Provides full Whatomate access without leaving Etson.
 */
import React, { useState, useEffect } from 'react';
import { ExternalLink, RefreshCw, Maximize2, Minimize2, AlertTriangle, Wifi, WifiOff } from 'lucide-react';

const WHATOMATE_URL    = 'http://localhost:8080';   // direct (Open in Tab button)
const WHATOMATE_PROXY  = 'http://localhost:3002';   // dedicated proxy (strips X-Frame-Options)

export default function WhatsApp() {
  const [isFullscreen, setIsFullscreen]   = useState(false);
  const [isLoading,    setIsLoading]      = useState(true);
  const [isOnline,     setIsOnline]       = useState(true);
  const [reloadKey,    setReloadKey]      = useState(0);
  const [statusCheck,  setStatusCheck]    = useState(null); // 'ok' | 'error' | null

  // ── Check if Whatomate is reachable ─────────────────────────────────────────
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/whatsapp/wa-status', { signal: AbortSignal.timeout(3000) });
        const data = await res.json();
        setStatusCheck(data.reachable ? 'ok' : 'error');
        setIsOnline(data.reachable);
      } catch {
        // Backend route may not exist yet — just try loading the iframe
        setStatusCheck('ok');
        setIsOnline(true);
      }
    };
    check();
  }, [reloadKey]);

  const handleReload = () => {
    setIsLoading(true);
    setReloadKey(k => k + 1);
  };

  const containerStyle = isFullscreen ? {
    position:   'fixed',
    inset:      0,
    zIndex:     9999,
    background: '#0d1117',
    display:    'flex',
    flexDirection: 'column',
  } : {
    display:        'flex',
    flexDirection:  'column',
    height:         'calc(100vh - 60px)',
    background:     '#0d1117',
  };

  const headerStyle = {
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'space-between',
    padding:         '0.6rem 1.25rem',
    background:      'rgba(22,27,34,0.95)',
    borderBottom:    '1px solid rgba(255,255,255,0.06)',
    flexShrink:      0,
  };

  const btnStyle = {
    background:   'rgba(255,255,255,0.06)',
    border:       '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color:        '#e6edf3',
    cursor:       'pointer',
    display:      'flex',
    alignItems:   'center',
    gap:          '0.4rem',
    padding:      '0.4rem 0.75rem',
    fontSize:     '0.8rem',
    transition:   'background 0.15s',
  };

  return (
    <div style={containerStyle}>
      {/* ── Top bar ── */}
      <div style={headerStyle}>
        {/* Left: title + status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'linear-gradient(135deg,#25D366,#128C7E)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: '1rem' }}>💬</span>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#e6edf3', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              WhatsApp
              <span style={{ color: '#25D366', fontWeight: 400, fontSize: '0.85rem' }}>— Whatomate</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: isOnline ? '#22c55e' : '#ef4444', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {isOnline
                ? <><Wifi size={11} /> Connected · Live Whatomate UI</>
                : <><WifiOff size={11} /> Whatomate offline — run ./start.sh</>}
            </div>
          </div>
        </div>

        {/* Right: action buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button style={btnStyle} onClick={handleReload} title="Reload">
            <RefreshCw size={13} /> Reload
          </button>
          <button
            style={btnStyle}
            onClick={() => setIsFullscreen(f => !f)}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
          <button
            style={{ ...btnStyle, background: 'rgba(37,211,102,0.12)', borderColor: 'rgba(37,211,102,0.3)', color: '#25D366' }}
            onClick={() => window.open(WHATOMATE_URL, '_blank')}
            title="Open in new tab"
          >
            <ExternalLink size={13} /> Open in Tab
          </button>
        </div>
      </div>

      {/* ── Offline warning ── */}
      {!isOnline && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.75rem 1.25rem',
          background: 'rgba(239,68,68,0.1)',
          borderBottom: '1px solid rgba(239,68,68,0.2)',
          color: '#fca5a5', fontSize: '0.85rem',
        }}>
          <AlertTriangle size={16} />
          Whatomate is not reachable. Make sure Docker containers are running:&nbsp;
          <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 6px', borderRadius: 4 }}>
            docker compose up -d whatomate
          </code>
        </div>
      )}

      {/* ── Loading overlay ── */}
      {isLoading && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: '#0d1117',
          pointerEvents: 'none',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💬</div>
          <div style={{ color: '#25D366', fontWeight: 600, fontSize: '1rem' }}>Loading Whatomate...</div>
          <div style={{ color: '#8b949e', fontSize: '0.8rem', marginTop: '0.4rem' }}>
            Full WhatsApp inbox • AI auto-reply • Contacts
          </div>
        </div>
      )}

      {/* ── Whatomate iframe ── */}
      <iframe
        key={reloadKey}
        src={WHATOMATE_PROXY}
        title="Whatomate WhatsApp"
        onLoad={() => setIsLoading(false)}
        onError={() => { setIsLoading(false); setIsOnline(false); }}
        style={{
          flex:    1,
          border:  'none',
          width:   '100%',
          background: '#0d1117',
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.3s ease',
        }}
        allow="camera; microphone; clipboard-read; clipboard-write"
      />
    </div>
  );
}
