import React, { useState, useEffect, useCallback } from 'react';
import {
  Save, Plus, Trash, Copy, Eye, EyeOff, RefreshCw, Webhook,
  Key, Shield, CheckCircle, AlertTriangle, Pencil, X, Check,
  MessageSquare, Bot, Phone, Bell, Package, Settings2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getProducts, createProduct, deleteProduct } from '../services/api';
import { API } from '../config.js';

// ── useSettings hook ──────────────────────────────────────────────────────────
function useSettings(keys, defaults = {}) {
  const [values, setValues] = useState(defaults);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`${API}/settings`)
      .then(r => r.json())
      .then(rows => {
        const map = {};
        rows.forEach(r => { map[r.key] = r.value; });
        setValues(prev => {
          const merged = { ...prev };
          keys.forEach(k => { if (map[k] !== undefined) merged[k] = map[k]; });
          return merged;
        });
      })
      .catch(() => {});
  }, []); // eslint-disable-line

  const set = useCallback((key, val) => {
    setValues(prev => ({ ...prev, [key]: val }));
    setSaved(false);
  }, []);

  const save = useCallback(async (saveKeys) => {
    setSaving(true);
    setSaved(false);
    try {
      await Promise.all(saveKeys.map(k =>
        fetch(`${API}/settings/${k}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: String(values[k] ?? '') }),
        })
      ));
      toast.success('Settings saved!');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }, [values]);

  return { values, set, save, saving, saved };
}

// ── Toggle Switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, color = '16,185,129' }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 99, position: 'relative',
        background: checked ? `rgb(${color})` : '#374151',
        border: 'none', cursor: 'pointer',
        transition: 'background 0.25s', flexShrink: 0, padding: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: checked ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%', background: 'white',
        transition: 'left 0.2s ease', boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
      }} />
    </button>
  );
}

// ── SaveBar ───────────────────────────────────────────────────────────────────
function SaveBar({ onSave, saving, saved }) {
  return (
    <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <button className="btn btn-primary" onClick={onSave} disabled={saving}>
        <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
      </button>
      {saved && <span style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>✅ Saved</span>}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
const Settings = () => {
  const [activeTab, setActiveTab] = useState('agent');
  const [products, setProducts] = useState([]);
  const [showTokens, setShowTokens] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // ── Agent settings ──
  const agentKeys = ['agent_name','agent_greeting','agent_voice','agent_language',
                     'sarvam_agent_id','max_call_duration','ai_system_prompt'];
  const agentSettings = useSettings(agentKeys, {
    agent_name: 'Aria',
    agent_greeting: 'Namaste! Main Etson Manufacturing ke behalf par ek AI calling assistant hoon. Hum thermal paper rolls ke requirements samajhne ke liye call kar rahe hain. Yeh call recorded hai. Kya aapke paas 2 minute hain?',
    agent_voice: 'Meera — Professional Female (Hindi/English)',
    agent_language: 'Hindi + English (Hinglish)',
    sarvam_agent_id: '',
    max_call_duration: '5',
    ai_system_prompt: '',
  });

  // ── WhatsApp settings ──
  const waKeys = ['whatomate_url','whatomate_api_key','sales_team_whatsapp','whatsapp_send_enabled'];
  const waSettings = useSettings(waKeys, {
    whatomate_url: 'http://localhost:8080',
    whatomate_api_key: '',
    sales_team_whatsapp: '',
    whatsapp_send_enabled: 'true',
  });
  const [showWaKey, setShowWaKey] = useState(false);
  const [testMsg, setTestMsg] = useState({ phone: '', message: '' });

  // ── Scoring settings ──
  const scoreKeys = ['scoring_icp_fit','scoring_product_fit','scoring_volume','scoring_supplier_pain',
                     'scoring_timeline','scoring_decision_authority','scoring_commercial','scoring_engagement'];
  const scoreSettings = useSettings(scoreKeys, {
    scoring_icp_fit: '15', scoring_product_fit: '15', scoring_volume: '15',
    scoring_supplier_pain: '15', scoring_timeline: '10', scoring_decision_authority: '10',
    scoring_commercial: '15', scoring_engagement: '5',
  });
  const scoreTotal = scoreKeys.reduce((s, k) => s + parseInt(scoreSettings.values[k] || '0'), 0);

  // ── Notification settings (includes global follow-up toggle) ──
  const notifKeys = ['notif_hot_leads','notif_campaign_completion','notif_quote_approval',
                     'notif_followup_reminders','notif_weekly_report','notif_daily_summary',
                     'notif_daily_summary_time','followups_enabled'];
  const notifSettings = useSettings(notifKeys, {
    notif_hot_leads: 'true', notif_campaign_completion: 'true', notif_quote_approval: 'true',
    notif_followup_reminders: 'true', notif_weekly_report: 'false',
    notif_daily_summary: 'true', notif_daily_summary_time: '09:00',
    followups_enabled: 'true',
  });

  // ── API Keys (persisted to settings table) ───────────────────────────────────────
  const apiKeyDefs = [
    { id: 'ak1', settingKey: 'sarvam_api_key',           name: 'Sarvam AI API Key',       provider: 'Sarvam AI',   env: 'SARVAM_API_KEY' },
    { id: 'ak2', settingKey: 'openai_api_key',           name: 'OpenAI API Key',          provider: 'OpenAI',      env: 'OPENAI_API_KEY' },
    { id: 'ak3', settingKey: 'whatomate_url',  name: 'Whatomate URL', provider: 'Whatomate', env: 'WHATOMATE_URL' },
    { id: 'ak4', settingKey: 'whatomate_api_key',      name: 'Whatomate API Key',     provider: 'Whatomate', env: 'WHATOMATE_API_KEY' },
  ];
  const apiKeyKeys = apiKeyDefs.map(d => d.settingKey);
  const apiKeySettings = useSettings(apiKeyKeys, Object.fromEntries(apiKeyDefs.map(d => [d.settingKey, ''])));

  // ── Webhooks (persisted to settings as JSON) ──────────────────────────────────────
  const defaultWebhooks = [
    { id: 'wh1', name: 'Sarvam Call Completion', url: `${window.location.protocol}//${window.location.hostname}:3001/api/webhooks/sarvam`, event: 'call.completed', status: 'active', secret: 'whsec_etson_sarvam_2026', lastTriggered: 'Auto', successRate: '99%' },
  ];
  const [webhooks, setWebhooks] = useState(defaultWebhooks);
  const [webhooksSaved, setWebhooksSaved] = useState(false);
  const [webhooksSaving, setWebhooksSaving] = useState(false);

  // Load webhooks from settings on mount
  useEffect(() => {
    fetch(`${API}/settings/webhooks_config`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.value) { try { setWebhooks(JSON.parse(d.value)); } catch {} } })
      .catch(() => {});
  }, []);

  const saveWebhooks = async (list) => {
    setWebhooksSaving(true);
    try {
      await fetch(`${API}/settings/webhooks_config`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: JSON.stringify(list) }),
      });
      toast.success('Webhooks saved');
      setWebhooksSaved(true);
      setTimeout(() => setWebhooksSaved(false), 3000);
    } catch { toast.error('Failed to save webhooks'); }
    finally { setWebhooksSaving(false); }
  };

  // ── Tokens (persisted to settings as JSON) ────────────────────────────────────
  const defaultToken = { id: 'tk1', name: 'Dashboard Access Token', token: 'etson_dash_tk_2026_' + Math.random().toString(36).substr(2,16), scope: 'read:leads,write:leads', expires: '2027-09-10', status: 'active', type: 'Bearer' };
  const [tokens, setTokens] = useState([defaultToken]);
  const [tokensSaved, setTokensSaved] = useState(false);
  const [tokensSaving, setTokensSaving] = useState(false);

  useEffect(() => {
    fetch(`${API}/settings/tokens_config`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.value) { try { setTokens(JSON.parse(d.value)); } catch {} } })
      .catch(() => {});
  }, []);

  const saveTokens = async (list) => {
    setTokensSaving(true);
    try {
      await fetch(`${API}/settings/tokens_config`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: JSON.stringify(list) }),
      });
      toast.success('Tokens saved');
      setTokensSaved(true);
      setTimeout(() => setTokensSaved(false), 3000);
    } catch { toast.error('Failed to save tokens'); }
    finally { setTokensSaving(false); }
  };

  const fetchProducts = () => { getProducts().then(setProducts).catch(console.error); };
  useEffect(() => { fetchProducts(); }, []);

  const handleAddProduct = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    data.price = Number(data.price);
    try { await createProduct(data); toast.success('Product added'); fetchProducts(); e.target.reset(); }
    catch { toast.error('Failed to add product'); }
  };
  const handleDeleteProduct = async (id) => {
    try { await deleteProduct(id); toast.success('Product deleted'); fetchProducts(); }
    catch { toast.error('Failed to delete product'); }
  };

  const copyToClipboard = (text, label) => { navigator.clipboard.writeText(text); toast.success(`${label} copied`); };
  const toggleVis = (id) => setShowTokens(p => ({ ...p, [id]: !p[id] }));
  const maskSecret = (s, vis) => {
    if (vis || !s) return s || '(not set)';
    if (s.length <= 12) return '•'.repeat(s.length);
    return s.substring(0, 8) + '•'.repeat(Math.max(0, s.length - 12)) + s.substring(s.length - 4);
  };

  const startEdit = (item) => { setEditingId(item.id); setEditForm({ ...item }); };
  const cancelEdit = () => { setEditingId(null); setEditForm({}); };
  const upd = (f, v) => setEditForm(p => ({ ...p, [f]: v }));

  // Webhook CRUD
  const saveWebhook = () => { setWebhooks(p => p.map(w => w.id === editingId ? { ...w, ...editForm } : w)); toast.success('Webhook updated'); cancelEdit(); };
  const delWebhook = (id) => { setWebhooks(p => p.filter(w => w.id !== id)); toast.success('Deleted'); };
  const addWebhook = () => {
    const id = 'wh' + Date.now();
    const nw = { id, name: 'New Webhook', url: 'https://', event: 'call.completed', status: 'inactive', secret: 'whsec_' + Math.random().toString(36).substr(2, 16), lastTriggered: 'Never', successRate: '-' };
    setWebhooks(p => [...p, nw]); startEdit(nw);
  };
  // API key CRUD
  const saveApiKey = () => { setApiKeys(p => p.map(a => a.id === editingId ? { ...a, ...editForm } : a)); toast.success('Saved'); cancelEdit(); };
  const delApiKey = (id) => { setApiKeys(p => p.filter(a => a.id !== id)); toast.success('Removed'); };
  const addApiKey = () => {
    const id = 'ak' + Date.now();
    const nk = { id, name: 'New Key', key: '', env: 'NEW_KEY', provider: 'Custom', status: 'active', created: new Date().toISOString().split('T')[0], lastUsed: 'Never' };
    setApiKeys(p => [...p, nk]); startEdit(nk);
  };
  // Token CRUD
  const saveToken = () => { setTokens(p => p.map(t => t.id === editingId ? { ...t, ...editForm } : t)); toast.success('Saved'); cancelEdit(); };
  const addToken = () => {
    const id = 'tk' + Date.now();
    const nt = { id, name: 'New Token', token: 'etson_' + Math.random().toString(36).substr(2, 24), scope: 'read:leads', expires: '2027-09-10', status: 'active', type: 'Bearer' };
    setTokens(p => [...p, nt]); startEdit(nt); navigator.clipboard.writeText(nt.token); toast.success('Token created & copied');
  };

  const sendTestWaMessage = async () => {
    const phone = testMsg.phone;
    const text  = testMsg.message;
    if (!phone || !text) { toast.error('Enter phone and message'); return; }
    setTestMsg(p => ({...p, sending: true}));
    try {
      const res = await fetch(`${API}/whatsapp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, text }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Send failed');
      toast.success('✅ Message sent via Whatomate!');
      setTestMsg({ phone: '', message: '', sending: false });
    } catch(e) {
      toast.error(e.message);
      setTestMsg(p => ({...p, sending: false}));
    }
  };

  const inp = { background: 'rgba(0,0,0,0.3)', border: '1px solid var(--teal-accent)', borderRadius: '6px', padding: '0.4rem 0.6rem', color: '#fff', fontSize: '0.85rem', width: '100%', fontFamily: 'inherit', outline: 'none' };
  const mono = { ...inp, fontFamily: 'monospace', fontSize: '0.8rem' };
  const sect = { marginBottom: '1.25rem' };
  const lbl = { fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block', fontWeight: 500 };

  const tabs = [
    { key: 'agent',         label: 'AI Agent Config',   icon: <Bot size={14} /> },
    { key: 'whatsapp',      label: 'WhatsApp',          icon: <MessageSquare size={14} /> },
    { key: 'scoring',       label: 'Scoring Rules',     icon: <Settings2 size={14} /> },
    { key: 'notifications', label: 'Notifications',     icon: <Bell size={14} /> },
    { key: 'webhooks',      label: 'Webhooks',          icon: <Webhook size={14} /> },
    { key: 'apikeys',       label: 'API Keys',          icon: <Key size={14} /> },
    { key: 'tokens',        label: 'Access Tokens',     icon: <Shield size={14} /> },
    { key: 'catalog',       label: 'Product Catalog',   icon: <Package size={14} /> },
  ];

  return (
    <div className="slide-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl">Settings</h1>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Changes save to database — persist through restarts</span>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="glass-card" style={{ width: '220px', padding: '1rem', flexShrink: 0 }}>
          <div className="flex" style={{ flexDirection: 'column', gap: '0.25rem' }}>
            {tabs.map(tab => (
              <button key={tab.key}
                className={`btn w-full ${activeTab === tab.key ? 'btn-primary' : 'btn-ghost'}`}
                style={{ justifyContent: 'flex-start', gap: '0.5rem', fontSize: '0.875rem' }}
                onClick={() => { setActiveTab(tab.key); cancelEdit(); }}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="glass-card flex-1" style={{ minWidth: 0 }}>

          {/* ═══ AI AGENT CONFIG ═══════════════════════════════════════════ */}
          {activeTab === 'agent' && (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>AI Agent Configuration</h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', ...sect }}>
                <div>
                  <label style={lbl}>Agent Name</label>
                  <input style={inp} value={agentSettings.values.agent_name} onChange={e => agentSettings.set('agent_name', e.target.value)} placeholder="Aria" />
                </div>
                <div>
                  <label style={lbl}>Sarvam Agent ID</label>
                  <input style={mono} value={agentSettings.values.sarvam_agent_id} onChange={e => agentSettings.set('sarvam_agent_id', e.target.value)} placeholder="agent_etson_aria_v1_prod" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: '1rem', ...sect }}>
                <div>
                  <label style={lbl}>Voice Persona</label>
                  <select style={inp} value={agentSettings.values.agent_voice} onChange={e => agentSettings.set('agent_voice', e.target.value)}>
                    <option>Meera — Professional Female (Hindi/English)</option>
                    <option>Arvind — Professional Male (Hindi/English)</option>
                    <option>Diya — Friendly Female (English)</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Primary Language</label>
                  <select style={inp} value={agentSettings.values.agent_language} onChange={e => agentSettings.set('agent_language', e.target.value)}>
                    <option>Hindi + English (Hinglish)</option>
                    <option>Hindi</option>
                    <option>English</option>
                    <option>Gujarati</option>
                    <option>Tamil</option>
                    <option>Telugu</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Max Duration (min)</label>
                  <input type="number" style={inp} min="1" max="60" value={agentSettings.values.max_call_duration} onChange={e => agentSettings.set('max_call_duration', e.target.value)} />
                </div>
              </div>

              <div style={sect}>
                <label style={lbl}>Default Greeting Script</label>
                <textarea style={{ ...inp, minHeight: 90, resize: 'vertical', lineHeight: 1.6 }}
                  value={agentSettings.values.agent_greeting}
                  onChange={e => agentSettings.set('agent_greeting', e.target.value)} />
              </div>

              <div style={sect}>
                <label style={lbl}>Custom AI System Prompt <span style={{ color: '#64748b' }}>(for transcript analysis & follow-up writing — leave blank to use default)</span></label>
                <textarea style={{ ...inp, minHeight: 120, resize: 'vertical', lineHeight: 1.6, fontFamily: 'monospace', fontSize: '0.8rem' }}
                  value={agentSettings.values.ai_system_prompt}
                  onChange={e => agentSettings.set('ai_system_prompt', e.target.value)}
                  placeholder="You are Ananya from Etson Manufacturing. You analyze sales calls for thermal paper customers..." />
              </div>

              <SaveBar onSave={() => agentSettings.save(agentKeys)} saving={agentSettings.saving} saved={agentSettings.saved} />
            </div>
          )}

          {/* ═══ WHATSAPP ══════════════════════════════════════════════════ */}
          {activeTab === 'whatsapp' && (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>WhatsApp — Whatomate</h2>

              {/* Connection */}
              <div style={{ padding: '1rem', background: 'rgba(37,211,102,0.06)', borderRadius: 10, border: '1px solid rgba(37,211,102,0.2)', marginBottom: '1.25rem' }}>
                <div style={{ fontWeight: 600, marginBottom: '0.75rem', color: '#25D366' }}>🔌 Whatomate Connection</div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={lbl}>Whatomate URL</label>
                  <input style={mono} value={waSettings.values.whatomate_url} onChange={e => waSettings.set('whatomate_url', e.target.value)} placeholder="http://localhost:8080" />
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>Run: docker run -d -p 8080:8080 ghcr.io/shridarpatil/whatomate:latest</p>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={lbl}>Whatomate API Key</label>
                  <input style={mono} type="password" value={waSettings.values.whatomate_api_key} onChange={e => waSettings.set('whatomate_api_key', e.target.value)} placeholder="Get from http://localhost:8080 → Settings → API Keys" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', ...sect }}>
                  <div>
                    <label style={lbl}>Sales Team WhatsApp Number</label>
                    <input style={mono} value={waSettings.values.sales_team_whatsapp} onChange={e => waSettings.set('sales_team_whatsapp', e.target.value)} placeholder="916267178440 (no + or spaces)" />
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 3 }}>Country code + number, no spaces</div>
                  </div>
                  <div>
                    <label style={lbl}>Outgoing Messages</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <Toggle
                        checked={waSettings.values.whatsapp_send_enabled === 'true'}
                        onChange={v => waSettings.set('whatsapp_send_enabled', String(v))}
                        color="37,211,102"
                      />
                      <span style={{ fontSize: '0.85rem', color: waSettings.values.whatsapp_send_enabled === 'true' ? '#25D366' : '#ef4444', fontWeight: 600 }}>
                        {waSettings.values.whatsapp_send_enabled === 'true' ? 'Sending Enabled' : 'FROZEN — Receive Only'}
                      </span>
                    </div>
                  </div>
                </div>
                <SaveBar onSave={() => waSettings.save(waKeys)} saving={waSettings.saving} saved={waSettings.saved} />
              </div>

              {/* Test send */}
              <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 10, border: '1px solid var(--glass-border)' }}>
                <div style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.9rem' }}>📤 Send Test Message</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '0.75rem', alignItems: 'end' }}>
                  <div>
                    <label style={lbl}>Phone Number</label>
                    <input style={mono} placeholder="916267178440" value={testMsg.phone} onChange={e => setTestMsg(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                  <div>
                    <label style={lbl}>Message</label>
                    <input style={inp} placeholder="Test message from Etson Dashboard..." value={testMsg.message} onChange={e => setTestMsg(p => ({ ...p, message: e.target.value }))} />
                  </div>
                  <button className="btn btn-primary" style={{ background: '#25D366', flexShrink: 0 }} disabled={testMsg.sending} onClick={sendTestWaMessage}>{testMsg.sending ? 'Sending...' : 'Send'}</button>
                </div>
              </div>
            </div>
          )}

          {/* ═══ SCORING RULES ═════════════════════════════════════════════ */}
          {activeTab === 'scoring' && (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Lead Scoring Weights</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Adjust the importance of each signal. Total must equal 100.</p>

              <div className="flex" style={{ flexDirection: 'column', gap: '1.25rem' }}>
                {[
                  { key: 'scoring_icp_fit',            label: 'Customer & ICP Fit',        color: '#0ea5a0' },
                  { key: 'scoring_product_fit',         label: 'Product & Spec Fit',        color: '#0ea5a0' },
                  { key: 'scoring_volume',              label: 'Volume & Revenue',           color: '#d4a853' },
                  { key: 'scoring_supplier_pain',       label: 'Supplier Pain',              color: '#d4a853' },
                  { key: 'scoring_timeline',            label: 'Timeline to Buy',            color: '#3b82f6' },
                  { key: 'scoring_decision_authority',  label: 'Decision Authority',         color: '#3b82f6' },
                  { key: 'scoring_commercial',          label: 'Commercial Viability',       color: '#ef4444' },
                  { key: 'scoring_engagement',          label: 'Engagement & Next Step',     color: '#8b5cf6' },
                ].map(rule => (
                  <div key={rule.key}>
                    <div className="flex justify-between mb-1">
                      <span style={{ fontSize: '0.875rem' }}>{rule.label}</span>
                      <span style={{ color: rule.color, fontWeight: 700, fontFamily: 'monospace' }}>
                        {scoreSettings.values[rule.key]}/100
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <input type="range" style={{ flex: 1, accentColor: rule.color }} min="0" max="25"
                        value={scoreSettings.values[rule.key] || '0'}
                        onChange={e => scoreSettings.set(rule.key, e.target.value)} />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: 50, textAlign: 'right' }}>max 25</span>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: scoreTotal === 100 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: 8, border: `1px solid ${scoreTotal === 100 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: scoreTotal === 100 ? '#10b981' : '#ef4444' }}>
                  Total: {scoreTotal} / 100 {scoreTotal === 100 ? '✅' : '⚠️ Must equal 100'}
                </span>
              </div>

              <SaveBar onSave={() => scoreSettings.save(scoreKeys)} saving={scoreSettings.saving} saved={scoreSettings.saved} />
            </div>
          )}

          {/* ═══ NOTIFICATIONS ═════════════════════════════════════════════ */}
          {activeTab === 'notifications' && (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Notification Preferences</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>All notifications are sent to the Sales Team WhatsApp number in the WhatsApp tab.</p>

              {/* ── Global Follow-up Automation Master Toggle ── */}
              <div style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem', borderRadius: 12, border: `2px solid ${notifSettings.values.followups_enabled === 'true' ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'}`, background: notifSettings.values.followups_enabled === 'true' ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      📬 Follow-up Automation
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: notifSettings.values.followups_enabled === 'true' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: notifSettings.values.followups_enabled === 'true' ? '#10b981' : '#ef4444' }}>
                        {notifSettings.values.followups_enabled === 'true' ? 'RUNNING' : 'STOPPED'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                      {notifSettings.values.followups_enabled === 'true'
                        ? 'Scheduler is active — messages sent on HOT/WARM/COLD cadence.'
                        : 'Scheduler is STOPPED — no follow-up messages will be sent to any lead.'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.35rem' }}>
                      HOT → Day 1, 3 &nbsp;·&nbsp; WARM → Day 3, 7, 14 &nbsp;·&nbsp; COLD → Day 30
                    </div>
                  </div>
                  <Toggle
                    checked={notifSettings.values.followups_enabled === 'true'}
                    onChange={v => notifSettings.set('followups_enabled', String(v))}
                  />
                </div>
              </div>

              <div className="flex" style={{ flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { key: 'notif_hot_leads',            label: 'Hot Lead Alerts',         desc: 'Instant WhatsApp when a lead scores ≥ 70' },
                  { key: 'notif_followup_reminders',   label: 'Follow-up Sent Alerts',   desc: 'Notify sales team each time a follow-up fires' },
                  { key: 'notif_daily_summary',        label: 'Daily Morning Summary',   desc: 'Stats digest at the configured time' },
                  { key: 'notif_campaign_completion',  label: 'Campaign Completion',     desc: 'When all calls in a campaign finish' },
                  { key: 'notif_quote_approval',       label: 'Quote Approval Needed',   desc: 'When a quote draft needs human approval' },
                  { key: 'notif_weekly_report',        label: 'Weekly Analytics Report', desc: 'Sunday summary of leads, conversions, revenue' },
                ].map(n => (
                  <div key={n.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.9rem 1.1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid var(--glass-border)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{n.label}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{n.desc}</div>
                    </div>
                    <Toggle checked={notifSettings.values[n.key] === 'true'} onChange={v => notifSettings.set(n.key, String(v))} />
                  </div>
                ))}

                {notifSettings.values.notif_daily_summary === 'true' && (
                  <div style={{ padding: '0.9rem 1.1rem', background: 'rgba(14,165,160,0.05)', borderRadius: 10, border: '1px solid rgba(14,165,160,0.2)' }}>
                    <label style={lbl}>Daily Summary Time</label>
                    <input type="time" style={{ ...inp, width: 140 }}
                      value={notifSettings.values.notif_daily_summary_time}
                      onChange={e => notifSettings.set('notif_daily_summary_time', e.target.value)} />
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>Server timezone (IST)</div>
                  </div>
                )}
              </div>

              <SaveBar onSave={() => notifSettings.save(notifKeys)} saving={notifSettings.saving} saved={notifSettings.saved} />
            </div>
          )}

          {/* ═══ WEBHOOKS ══════════════════════════════════════════════════ */}
          {activeTab === 'webhooks' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Webhook Endpoints</h2>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Real-time event URLs. The Sarvam URL below is your active inbound webhook.</p>
                </div>
                <button className="btn btn-primary" onClick={addWebhook}><Plus size={16} /> Add</button>
              </div>

              <div className="flex" style={{ flexDirection: 'column', gap: '0.75rem' }}>
                {webhooks.map(wh => {
                  const editing = editingId === wh.id;
                  return (
                    <div key={wh.id} style={{ background: editing ? 'rgba(14,165,160,0.04)' : 'rgba(255,255,255,0.02)', border: `1px solid ${editing ? 'var(--teal-accent)' : 'var(--glass-border)'}`, borderRadius: 10, padding: '1rem' }}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3" style={{ flex: 1 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: (editing ? editForm.status : wh.status) === 'active' ? '#27ae60' : '#6b7280', flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            {editing ? <input value={editForm.name} onChange={e => upd('name', e.target.value)} style={inp} autoFocus />
                              : <><div style={{ fontWeight: 600 }}>{wh.name}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Event: <span style={{ color: 'var(--teal-accent)' }}>{wh.event}</span></div></>}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {editing ? (
                            <><button className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={saveWebhook}><Check size={13} /> Save</button>
                              <button className="btn btn-ghost" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={cancelEdit}><X size={13} /></button></>
                          ) : (
                            <><button className="btn btn-ghost" style={{ padding: '0.25rem' }} onClick={() => startEdit(wh)}><Pencil size={14} style={{ color: 'var(--teal-accent)' }} /></button>
                              <button className="btn btn-ghost" style={{ padding: '0.25rem', color: 'var(--danger)' }} onClick={() => delWebhook(wh.id)}><Trash size={14} /></button></>
                          )}
                        </div>
                      </div>
                      {editing ? (
                        <div className="flex" style={{ flexDirection: 'column', gap: '0.5rem' }}>
                          <input value={editForm.url} onChange={e => upd('url', e.target.value)} style={mono} placeholder="https://..." />
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <select value={editForm.event} onChange={e => upd('event', e.target.value)} style={inp}>
                              {['call.completed','call.started','call.failed','lead.scored','campaign.completed','quote.sent'].map(ev => <option key={ev}>{ev}</option>)}
                            </select>
                            <select value={editForm.status} onChange={e => upd('status', e.target.value)} style={inp}>
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 6, padding: '0.5rem 0.75rem', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--teal-accent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wh.url}</span>
                          <button className="btn btn-ghost" style={{ padding: '0.15rem', flexShrink: 0 }} onClick={() => copyToClipboard(wh.url, 'URL')}><Copy size={13} /></button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button className="btn btn-primary" onClick={() => saveWebhooks(webhooks)} disabled={webhooksSaving}>
                  <Save size={16} /> {webhooksSaving ? 'Saving...' : 'Save Webhooks'}
                </button>
                {webhooksSaved && <span style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>✅ Webhooks saved to DB</span>}
              </div>
            </div>
          )}


          {/* ═══ API KEYS ══════════════════════════════════════════════════ */}
          {activeTab === 'apikeys' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>API Keys & Credentials</h2>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Stored securely in the database. Used by the backend on every request.</p>
                </div>
              </div>

              <div className="flex" style={{ flexDirection: 'column', gap: '0.85rem' }}>
                {apiKeyDefs.map(ak => (
                  <div key={ak.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: 10, padding: '1rem' }}>
                    <div className="flex items-center gap-3" style={{ marginBottom: '0.75rem' }}>
                      <div style={{ background: 'rgba(14,165,160,0.15)', borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Key size={16} style={{ color: 'var(--teal-accent)' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{ak.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{ak.provider}</div>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 4, padding: '0.1rem 0.5rem', fontFamily: 'monospace', fontSize: '0.68rem', color: '#f59e0b' }}>{ak.env}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <input
                          type={showTokens[ak.id] ? 'text' : 'password'}
                          style={{ ...mono, paddingRight: '4rem' }}
                          value={apiKeySettings.values[ak.settingKey] || ''}
                          onChange={e => apiKeySettings.set(ak.settingKey, e.target.value)}
                          placeholder={`Enter ${ak.name}...`}
                        />
                        <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost" style={{ padding: '0.15rem' }} onClick={() => toggleVis(ak.id)}>{showTokens[ak.id] ? <EyeOff size={13} /> : <Eye size={13} />}</button>
                          {apiKeySettings.values[ak.settingKey] && <button className="btn btn-ghost" style={{ padding: '0.15rem' }} onClick={() => copyToClipboard(apiKeySettings.values[ak.settingKey], ak.name)}><Copy size={13} /></button>}
                        </div>
                      </div>
                      <button className="btn btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem', flexShrink: 0 }}
                        onClick={() => apiKeySettings.save([ak.settingKey])} disabled={apiKeySettings.saving}>
                        <Save size={13} /> Save
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(14,165,160,0.05)', borderRadius: 8, border: '1px solid rgba(14,165,160,0.2)', fontSize: '0.8rem' }}>
                <div style={{ fontWeight: 600, color: 'var(--teal-accent)', marginBottom: '0.4rem' }}>ℹ️ How these work</div>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>Keys saved here are stored in the <code>settings</code> database table and read by the backend at runtime — no server restart needed. They override any values in <code>.env</code>.</p>
              </div>

              {apiKeySettings.saved && <div style={{ marginTop: '1rem', color: '#10b981', fontWeight: 600, fontSize: '0.85rem' }}>✅ Key saved</div>}
            </div>
          )}

          {/* ═══ ACCESS TOKENS ═════════════════════════════════════════════ */}
          {activeTab === 'tokens' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Access Tokens</h2>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Internal API tokens for dashboard access control.</p>
                </div>
                <button className="btn btn-primary" onClick={addToken}><Plus size={16} /> Generate</button>
              </div>

              <div className="flex" style={{ flexDirection: 'column', gap: '0.75rem' }}>
                {tokens.map(tk => {
                  const editing = editingId === tk.id;
                  const revoked = tk.status === 'revoked';
                  return (
                    <div key={tk.id} style={{ background: editing ? 'rgba(14,165,160,0.04)' : 'rgba(255,255,255,0.02)', border: `1px solid ${editing ? 'var(--teal-accent)' : revoked ? 'rgba(239,68,68,0.3)' : 'var(--glass-border)'}`, borderRadius: 10, padding: '1rem', opacity: revoked ? 0.55 : 1 }}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          {editing
                            ? <input value={editForm.name} onChange={e => upd('name', e.target.value)} style={inp} autoFocus />
                            : <><div style={{ fontWeight: 600 }}>{tk.name}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tk.type} · Expires {tk.expires}</div></>}
                        </div>
                        <div className="flex gap-1">
                          {editing ? (
                            <><button className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={saveToken}><Check size={13} /> Save</button>
                              <button className="btn btn-ghost" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={cancelEdit}><X size={13} /></button></>
                          ) : !revoked ? (
                            <><button className="btn btn-ghost" style={{ padding: '0.25rem' }} onClick={() => startEdit(tk)}><Pencil size={14} style={{ color: 'var(--teal-accent)' }} /></button>
                              <button className="btn btn-ghost" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', color: 'var(--danger)' }} onClick={() => setTokens(p => p.map(t => t.id === tk.id ? { ...t, status: 'revoked' } : t))}>Revoke</button></>
                          ) : <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>REVOKED</span>}
                        </div>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 6, padding: '0.4rem 0.75rem', fontFamily: 'monospace', fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{maskSecret(tk.token, showTokens[tk.id])}</span>
                        <div className="flex gap-1">
                          <button className="btn btn-ghost" style={{ padding: '0.15rem' }} onClick={() => toggleVis(tk.id)}>{showTokens[tk.id] ? <EyeOff size={13} /> : <Eye size={13} />}</button>
                          <button className="btn btn-ghost" style={{ padding: '0.15rem' }} onClick={() => copyToClipboard(tk.token, 'Token')}><Copy size={13} /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button className="btn btn-primary" onClick={() => { const list = tokens; saveTokens(list); }} disabled={tokensSaving}>
                  <Save size={16} /> {tokensSaving ? 'Saving...' : 'Save Tokens'}
                </button>
                {tokensSaved && <span style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>✅ Tokens saved to DB</span>}
              </div>
            </div>
          )}

          {/* ═══ PRODUCT CATALOG ═══════════════════════════════════════════ */}
          {activeTab === 'catalog' && (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Product Catalog</h2>
              <form onSubmit={handleAddProduct} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 2, minWidth: 160 }}>
                  <label style={lbl}>Product Name</label>
                  <input type="text" name="name" style={inp} required placeholder="Thermal Roll 80mm×80mm" />
                </div>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <label style={lbl}>Description</label>
                  <input type="text" name="description" style={inp} placeholder="Optional description" />
                </div>
                <div style={{ width: 90 }}>
                  <label style={lbl}>Price (₹)</label>
                  <input type="number" name="price" style={inp} required placeholder="45" step="0.01" />
                </div>
                <div style={{ width: 80 }}>
                  <label style={lbl}>Unit</label>
                  <input type="text" name="unit" style={inp} defaultValue="roll" placeholder="roll" />
                </div>
                <button type="submit" className="btn btn-primary"><Plus size={16} /> Add</button>
              </form>

              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead><tr><th>ID</th><th>Name</th><th>Price (₹)</th><th>Unit</th><th>Stock</th><th></th></tr></thead>
                  <tbody>
                    {products.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{String(p.id).slice(0, 12)}</td>
                        <td style={{ fontWeight: 500 }}>{p.name}</td>
                        <td>₹{p.price}</td>
                        <td>{p.unit}</td>
                        <td>{p.stock?.toLocaleString() || '—'}</td>
                        <td><button className="btn btn-ghost" style={{ color: 'var(--danger)', padding: '0.2rem' }} onClick={() => handleDeleteProduct(p.id)}><Trash size={15} /></button></td>
                      </tr>
                    ))}
                    {products.length === 0 && <tr><td colSpan="6" className="text-center text-muted" style={{ padding: '2rem' }}>No products — add one above</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Settings;
