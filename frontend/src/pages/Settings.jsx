import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash, Copy, Eye, EyeOff, RefreshCw, Webhook, Key, Shield, CheckCircle, AlertTriangle, Pencil, X, Check, MessageSquare, Send, Bot, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { getProducts, createProduct, deleteProduct } from '../services/api';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('agent');
  const [products, setProducts] = useState([]);
  const [showTokens, setShowTokens] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const [webhooks, setWebhooks] = useState([
    { id: 'wh1', name: 'Sarvam Call Completion', url: 'https://api.etson.in/api/webhooks/sarvam', event: 'call.completed', status: 'active', secret: 'whsec_etson_sarvam_2026_abc123', lastTriggered: '2 min ago', successRate: '99.2%' },
    { id: 'wh2', name: 'Lead Score Update', url: 'https://api.etson.in/api/webhooks/score-update', event: 'lead.scored', status: 'active', secret: 'whsec_etson_score_2026_def456', lastTriggered: '5 min ago', successRate: '100%' },
    { id: 'wh3', name: 'Campaign Status Change', url: 'https://api.etson.in/api/webhooks/campaign-status', event: 'campaign.status_changed', status: 'inactive', secret: 'whsec_etson_camp_2026_ghi789', lastTriggered: 'Never', successRate: '-' },
  ]);
  const [apiKeys, setApiKeys] = useState([
    { id: 'ak1', name: 'Sarvam AI API Key', key: 'sk-sarvam-etson-prod-2026-xxxxxxxxxxxxxxxxxxxx', env: 'SARVAM_API_KEY', status: 'active', created: '2026-09-01', lastUsed: '2 min ago', provider: 'Sarvam AI' },
    { id: 'ak2', name: 'Firebase Service Account', key: 'firebase-adminsdk-etson@etson-sales.iam.gserviceaccount.com', env: 'FIREBASE_SERVICE_ACCOUNT', status: 'active', created: '2026-09-01', lastUsed: '1 min ago', provider: 'Google Firebase' },
    { id: 'ak3', name: 'Resend Email API Key', key: 're_etson_prod_2026_xxxxxxxxxxxxxxxxxxxxxxxx', env: 'RESEND_API_KEY', status: 'active', created: '2026-09-03', lastUsed: '1 hour ago', provider: 'Resend' },
    { id: 'ak4', name: 'Sarvam Agent ID', key: 'agent_etson_aria_v1_prod', env: 'SARVAM_AGENT_ID', status: 'active', created: '2026-09-01', lastUsed: '2 min ago', provider: 'Sarvam AI' },
  ]);
  const [tokens, setTokens] = useState([
    { id: 'tk1', name: 'Dashboard Access Token', token: 'etson_dash_tk_2026_xxxxxxxxxxxxxxxxxxxxxxxxxx', scope: 'read:leads,write:leads,read:campaigns', expires: '2027-03-10', status: 'active', type: 'Bearer' },
    { id: 'tk2', name: 'Webhook Signing Secret', token: 'etson_wh_sign_2026_xxxxxxxxxxxxxxxxxxxxxxxxxx', scope: 'webhooks:verify', expires: 'Never', status: 'active', type: 'HMAC-SHA256' },
    { id: 'tk3', name: 'Campaign API Token', token: 'etson_camp_tk_2026_xxxxxxxxxxxxxxxxxxxxxxxxxx', scope: 'read:campaigns,write:campaigns,execute:campaigns', expires: '2026-12-31', status: 'active', type: 'Bearer' },
    { id: 'tk4', name: 'Read-Only Analytics Token', token: 'etson_ro_tk_2026_xxxxxxxxxxxxxxxxxxxxxxxxxx', scope: 'read:analytics,read:leads', expires: '2027-09-10', status: 'active', type: 'Bearer' },
  ]);

  // ===== WHATSAPP STATE =====
  const [waConfig, setWaConfig] = useState({
    businessPhoneId: '1234567890',
    wabaId: 'WABA_etson_123456',
    accessToken: 'EAAetson_whatsapp_token_xxxxxxxxxxxxxxxx',
    webhookVerifyToken: 'etson_wa_verify_2026',
    connected: true,
    provider: 'meta',
  });
  const [waAgents, setWaAgents] = useState([
    { id: 'wa1', name: 'Sarvam WhatsApp Agent', provider: 'Sarvam AI', apiKey: 'sk-sarvam-wa-etson-prod-xxxxxxxxxxxxxxx', agentId: 'agent_etson_wa_v1', endpoint: 'https://api.sarvam.ai/v1/chat', status: 'active', model: 'Sarvam-105B', language: 'Hindi + English', lastUsed: '10 min ago' },
    { id: 'wa2', name: 'WATI Campaign Bot', provider: 'WATI', apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.wati_etson_xxxx', agentId: '', endpoint: 'https://live-server.wati.io/api', status: 'inactive', model: 'WATI Templates', language: 'Hindi + English', lastUsed: 'Never' },
  ]);
  const [waMsgForm, setWaMsgForm] = useState({ phone: '', message: '', template: 'custom', leadId: '' });
  const [waTemplates] = useState([
    { id: 'tpl1', name: 'Quote Follow-up', text: 'Namaste {name}! Etson Manufacturing ki taraf se, kya aapne hamara quotation dekha? Koi sawaal ho to batayein. 🙏' },
    { id: 'tpl2', name: 'Hot Lead Intro', text: 'Namaste {name}! Etson Manufacturing me aapka swagat hai. Hum {product} provide karte hain. Kya hum aapki requirements discuss kar sakte hain?' },
    { id: 'tpl3', name: 'Sample Offer', text: 'Namaste {name}! Hum aapko FREE sample bhejne ke liye tayaar hain. Apna delivery address bhejein aur hum kal tak sample dispatch karenge. ✅' },
    { id: 'tpl4', name: 'Follow-up Day 3', text: 'Namaste {name}! Kya aap Etson ke products me interested hain? Hamara sales team aapki help ke liye available hai. Call karein: +91-XXXXXXXXXX' },
  ]);

  const fetchProducts = () => { getProducts().then(setProducts).catch(console.error); };

  useEffect(() => { fetchProducts(); }, []);

  const handleSave = (e) => { e.preventDefault(); toast.success('Settings saved successfully!'); };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    data.price = Number(data.price);
    try { await createProduct(data); toast.success('Product added'); fetchProducts(); e.target.reset(); }
    catch (err) { toast.error('Failed to add product'); }
  };

  const handleDeleteProduct = async (id) => {
    try { await deleteProduct(id); toast.success('Product deleted'); fetchProducts(); }
    catch (err) { toast.error('Failed to delete product'); }
  };

  const copyToClipboard = (text, label) => { navigator.clipboard.writeText(text); toast.success(`${label} copied to clipboard`); };
  const toggleTokenVisibility = (id) => { setShowTokens(prev => ({ ...prev, [id]: !prev[id] })); };
  const maskSecret = (secret, visible) => {
    if (visible) return secret;
    if (secret.length <= 12) return '•'.repeat(secret.length);
    return secret.substring(0, 8) + '•'.repeat(Math.max(0, secret.length - 12)) + secret.substring(secret.length - 4);
  };

  // === EDIT HELPERS ===
  const startEdit = (item) => { setEditingId(item.id); setEditForm({ ...item }); };
  const cancelEdit = () => { setEditingId(null); setEditForm({}); };
  const updateEditField = (field, value) => { setEditForm(prev => ({ ...prev, [field]: value })); };

  // === WEBHOOK CRUD ===
  const saveWebhookEdit = () => {
    setWebhooks(prev => prev.map(wh => wh.id === editingId ? { ...wh, ...editForm } : wh));
    toast.success('Webhook updated'); cancelEdit();
  };
  const toggleWebhookStatus = (id) => {
    setWebhooks(prev => prev.map(wh => wh.id === id ? { ...wh, status: wh.status === 'active' ? 'inactive' : 'active' } : wh));
    toast.success('Webhook status updated');
  };
  const deleteWebhook = (id) => { setWebhooks(prev => prev.filter(wh => wh.id !== id)); toast.success('Webhook deleted'); };
  const addWebhook = () => {
    const id = 'wh' + Date.now();
    const newWh = { id, name: 'New Webhook', url: 'https://', event: 'call.completed', status: 'inactive', secret: 'whsec_' + Math.random().toString(36).substr(2, 20), lastTriggered: 'Never', successRate: '-' };
    setWebhooks(prev => [...prev, newWh]);
    startEdit(newWh);
    toast.success('Webhook added — edit the details below');
  };

  // === API KEY CRUD ===
  const saveApiKeyEdit = () => {
    setApiKeys(prev => prev.map(ak => ak.id === editingId ? { ...ak, ...editForm } : ak));
    toast.success('API key updated'); cancelEdit();
  };
  const deleteApiKey = (id) => { setApiKeys(prev => prev.filter(k => k.id !== id)); toast.success('API key removed'); };
  const addApiKey = () => {
    const id = 'ak' + Date.now();
    const newKey = { id, name: 'New API Key', key: '', env: 'NEW_API_KEY', provider: 'Custom', status: 'active', created: new Date().toISOString().split('T')[0], lastUsed: 'Never' };
    setApiKeys(prev => [...prev, newKey]);
    startEdit(newKey);
    toast.success('API key added — fill in the details');
  };

  // === TOKEN CRUD ===
  const saveTokenEdit = () => {
    setTokens(prev => prev.map(t => t.id === editingId ? { ...t, ...editForm } : t));
    toast.success('Token updated'); cancelEdit();
  };
  const revokeToken = (id) => {
    setTokens(prev => prev.map(t => t.id === id ? { ...t, status: 'revoked' } : t));
    toast.success('Token revoked');
  };
  const regenerateToken = (id, name) => { toast.success(`${name} regenerated`); };
  const addToken = () => {
    const id = 'tk' + Date.now();
    const newTk = { id, name: 'New Token', token: 'etson_' + Math.random().toString(36).substr(2, 30), scope: 'read:leads', expires: '2027-09-10', status: 'active', type: 'Bearer' };
    setTokens(prev => [...prev, newTk]);
    startEdit(newTk);
    navigator.clipboard.writeText(newTk.token);
    toast.success('Token created & copied — edit details below');
  };

  // === WHATSAPP CRUD ===
  const saveWaAgentEdit = () => {
    setWaAgents(prev => prev.map(a => a.id === editingId ? { ...a, ...editForm } : a));
    toast.success('WhatsApp agent updated'); cancelEdit();
  };
  const deleteWaAgent = (id) => { setWaAgents(prev => prev.filter(a => a.id !== id)); toast.success('Agent removed'); };
  const toggleWaAgent = (id) => {
    setWaAgents(prev => prev.map(a => a.id === id ? { ...a, status: a.status === 'active' ? 'inactive' : 'active' } : a));
    toast.success('Agent status updated');
  };
  const addWaAgent = () => {
    const id = 'wa' + Date.now();
    const newAgent = { id, name: 'New Agent', provider: 'Custom', apiKey: '', agentId: '', endpoint: 'https://', status: 'inactive', model: '', language: 'Hindi + English', lastUsed: 'Never' };
    setWaAgents(prev => [...prev, newAgent]);
    startEdit(newAgent);
    toast.success('Agent added — fill in the details');
  };
  const sendWaMessage = () => {
    if (!waMsgForm.phone || !waMsgForm.message) { toast.error('Phone and message required'); return; }
    toast.success(`WhatsApp message queued to +91${waMsgForm.phone.replace(/^\+?91/, '')}`);
    setWaMsgForm(prev => ({ ...prev, message: '', phone: '' }));
  };
  const applyTemplate = (tplId) => {
    const tpl = waTemplates.find(t => t.id === tplId);
    if (tpl) setWaMsgForm(prev => ({ ...prev, message: tpl.text, template: tplId }));
  };

  const inputStyle = { background: 'rgba(0,0,0,0.3)', border: '1px solid var(--teal-accent)', borderRadius: '6px', padding: '0.4rem 0.6rem', color: '#fff', fontSize: '0.85rem', width: '100%', fontFamily: 'inherit', outline: 'none' };
  const monoInputStyle = { ...inputStyle, fontFamily: 'monospace', fontSize: '0.8rem' };

  const tabs = [
    { key: 'agent', label: 'AI Agent Config' },
    { key: 'whatsapp', label: 'WhatsApp', icon: <MessageSquare size={14} /> },
    { key: 'webhooks', label: 'Webhooks', icon: <Webhook size={14} /> },
    { key: 'apikeys', label: 'API Keys', icon: <Key size={14} /> },
    { key: 'tokens', label: 'Access Tokens', icon: <Shield size={14} /> },
    { key: 'scoring', label: 'Scoring Rules' },
    { key: 'catalog', label: 'Product Catalog' },
    { key: 'notifications', label: 'Notifications' },
  ];

  return (
    <div className="slide-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl">Settings</h1>
        <button className="btn btn-primary" onClick={handleSave}><Save size={18} /> Save Changes</button>
      </div>

      <div className="flex gap-6">
        <div className="glass-card" style={{ width: '250px', padding: '1rem', flexShrink: 0 }}>
          <div className="flex" style={{ flexDirection: 'column', gap: '0.25rem' }}>
            {tabs.map(tab => (
              <button key={tab.key} className={`btn w-full ${activeTab === tab.key ? 'btn-primary' : 'btn-ghost'}`}
                style={{ justifyContent: 'flex-start', gap: '0.5rem', fontSize: '0.875rem' }}
                onClick={() => { setActiveTab(tab.key); cancelEdit(); }}>
                {tab.icon || null} {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card flex-1" style={{ minWidth: 0 }}>

          {/* ===== AI AGENT ===== */}
          {activeTab === 'agent' && (
            <form onSubmit={handleSave}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>AI Voice Agent Configuration</h2>
              <div className="form-group">
                <label className="form-label">Agent Name</label>
                <input type="text" className="form-input" defaultValue="Aria" />
              </div>
              <div className="form-group">
                <label className="form-label">Default Greeting</label>
                <textarea className="form-input" rows="4" defaultValue="Namaste! Main Etson Manufacturing ke behalf par ek AI calling assistant hoon. Hum thermal paper rolls ke requirements samajhne ke liye call kar rahe hain. Yeh call recorded hai. Kya aapke paas 2 minute hain?"></textarea>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Voice Persona</label>
                  <select className="form-input">
                    <option>Meera — Professional Female (Hindi/English)</option>
                    <option>Arvind — Professional Male (Hindi/English)</option>
                    <option>Diya — Friendly Female (English)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Primary Language</label>
                  <select className="form-input">
                    <option>Hindi + English (Hinglish)</option>
                    <option>Hindi</option>
                    <option>English</option>
                    <option>Gujarati</option>
                    <option>Tamil</option>
                    <option>Telugu</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Sarvam Agent ID</label>
                <input type="text" className="form-input" defaultValue="agent_etson_aria_v1_prod" style={{ fontFamily: 'monospace', fontSize: '0.875rem' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Max Call Duration (minutes)</label>
                <input type="number" className="form-input" defaultValue="5" min="1" max="60" style={{ width: '120px' }} />
              </div>
            </form>
          )}

          {/* ===== WEBHOOKS ===== */}
          {activeTab === 'webhooks' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Webhook Endpoints</h2>
                  <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Manage incoming and outgoing webhook URLs for real-time events.</p>
                </div>
                <button className="btn btn-primary" onClick={addWebhook}><Plus size={16} /> Add Webhook</button>
              </div>

              <div className="flex" style={{ flexDirection: 'column', gap: '0.75rem' }}>
                {webhooks.map(wh => {
                  const isEditing = editingId === wh.id;
                  return (
                    <div key={wh.id} style={{ background: isEditing ? 'rgba(14,165,160,0.04)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isEditing ? 'var(--teal-accent)' : 'var(--glass-border)'}`, borderRadius: '10px', padding: '1rem', transition: 'all 0.2s' }}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3" style={{ flex: 1 }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: (isEditing ? editForm.status : wh.status) === 'active' ? '#27ae60' : '#6b7280', boxShadow: (isEditing ? editForm.status : wh.status) === 'active' ? '0 0 8px #27ae60' : 'none', flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            {isEditing ? (
                              <input value={editForm.name} onChange={e => updateEditField('name', e.target.value)} style={inputStyle} placeholder="Webhook name" autoFocus />
                            ) : (
                              <>
                                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{wh.name}</div>
                                <div className="text-muted" style={{ fontSize: '0.75rem' }}>Event: <span className="text-teal">{wh.event}</span></div>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {isEditing ? (
                            <>
                              <button className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={saveWebhookEdit}><Check size={13} /> Save</button>
                              <button className="btn btn-ghost" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={cancelEdit}><X size={13} /> Cancel</button>
                            </>
                          ) : (
                            <>
                              <button className="btn btn-ghost" style={{ padding: '0.25rem' }} title="Edit" onClick={() => startEdit(wh)}><Pencil size={14} className="text-teal" /></button>
                              <button className="btn btn-ghost" style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }} onClick={() => toggleWebhookStatus(wh.id)}>
                                {wh.status === 'active' ? 'Disable' : 'Enable'}
                              </button>
                              <button className="btn btn-ghost" style={{ color: 'var(--danger)', padding: '0.25rem' }} onClick={() => deleteWebhook(wh.id)}><Trash size={14} /></button>
                            </>
                          )}
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="flex" style={{ flexDirection: 'column', gap: '0.5rem' }}>
                          <div>
                            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Endpoint URL</label>
                            <input value={editForm.url} onChange={e => updateEditField('url', e.target.value)} style={monoInputStyle} placeholder="https://api.example.com/webhook" />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <div>
                              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Event Type</label>
                              <select value={editForm.event} onChange={e => updateEditField('event', e.target.value)} style={inputStyle}>
                                <option value="call.completed">call.completed</option>
                                <option value="call.started">call.started</option>
                                <option value="call.failed">call.failed</option>
                                <option value="lead.scored">lead.scored</option>
                                <option value="lead.created">lead.created</option>
                                <option value="campaign.status_changed">campaign.status_changed</option>
                                <option value="campaign.completed">campaign.completed</option>
                                <option value="quote.approved">quote.approved</option>
                                <option value="quote.sent">quote.sent</option>
                              </select>
                            </div>
                            <div>
                              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Status</label>
                              <select value={editForm.status} onChange={e => updateEditField('status', e.target.value)} style={inputStyle}>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Signing Secret</label>
                            <input value={editForm.secret} onChange={e => updateEditField('secret', e.target.value)} style={monoInputStyle} placeholder="whsec_..." />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '6px', padding: '0.5rem 0.75rem', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--teal-accent)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wh.url}</span>
                            <button className="btn btn-ghost" style={{ padding: '0.15rem', flexShrink: 0 }} onClick={() => copyToClipboard(wh.url, 'URL')}><Copy size={13} /></button>
                          </div>
                          <div className="flex gap-4" style={{ fontSize: '0.75rem', flexWrap: 'wrap' }}>
                            <div>
                              <span className="text-muted">Secret: </span>
                              <span style={{ fontFamily: 'monospace' }}>{maskSecret(wh.secret, showTokens[wh.id])}</span>
                              <button className="btn btn-ghost" style={{ padding: '0.1rem 0.25rem' }} onClick={() => toggleTokenVisibility(wh.id)}>
                                {showTokens[wh.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                              </button>
                              <button className="btn btn-ghost" style={{ padding: '0.1rem 0.25rem' }} onClick={() => copyToClipboard(wh.secret, 'Secret')}><Copy size={12} /></button>
                            </div>
                            <div><span className="text-muted">Last: </span>{wh.lastTriggered}</div>
                            <div><span className="text-muted">Success: </span><span style={{ color: wh.successRate === '100%' ? '#27ae60' : '#f59e0b' }}>{wh.successRate}</span></div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(14,165,160,0.05)', borderRadius: '8px', border: '1px solid rgba(14,165,160,0.15)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--teal-accent)' }}>📡 Sarvam Webhook Payload Format</div>
                <pre style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.6, overflow: 'auto' }}>{`POST /api/webhooks/sarvam
Content-Type: application/json
X-Webhook-Secret: whsec_...

{
  "interaction_id": "int_abc123",
  "status": "completed",
  "phone": "+919876543210",
  "call_duration": 225,
  "transcript": "...",
  "agent_variables": { "name": "Rajesh", "product_width": "80mm" }
}`}</pre>
              </div>
            </div>
          )}

          {/* ===== API KEYS ===== */}
          {activeTab === 'apikeys' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>API Keys & Credentials</h2>
                  <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Manage external service API keys. Click the pencil to edit.</p>
                </div>
                <button className="btn btn-primary" onClick={addApiKey}><Plus size={16} /> Add API Key</button>
              </div>

              <div className="flex" style={{ flexDirection: 'column', gap: '0.75rem' }}>
                {apiKeys.map(ak => {
                  const isEditing = editingId === ak.id;
                  return (
                    <div key={ak.id} style={{ background: isEditing ? 'rgba(14,165,160,0.04)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isEditing ? 'var(--teal-accent)' : 'var(--glass-border)'}`, borderRadius: '10px', padding: '1rem', transition: 'all 0.2s' }}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3" style={{ flex: 1 }}>
                          <div style={{ background: 'rgba(14,165,160,0.15)', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Key size={16} className="text-teal" />
                          </div>
                          {isEditing ? (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                              <input value={editForm.name} onChange={e => updateEditField('name', e.target.value)} style={inputStyle} placeholder="Key name" autoFocus />
                              <input value={editForm.provider} onChange={e => updateEditField('provider', e.target.value)} style={{ ...inputStyle, fontSize: '0.8rem' }} placeholder="Provider (e.g. Sarvam AI)" />
                            </div>
                          ) : (
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{ak.name}</div>
                              <div className="text-muted" style={{ fontSize: '0.75rem' }}>{ak.provider} • Created {ak.created}</div>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {isEditing ? (
                            <>
                              <button className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={saveApiKeyEdit}><Check size={13} /> Save</button>
                              <button className="btn btn-ghost" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={cancelEdit}><X size={13} /> Cancel</button>
                            </>
                          ) : (
                            <>
                              <button className="btn btn-ghost" style={{ padding: '0.25rem' }} title="Edit" onClick={() => startEdit(ak)}><Pencil size={14} className="text-teal" /></button>
                              <button className="btn btn-ghost" style={{ color: 'var(--danger)', padding: '0.25rem' }} onClick={() => deleteApiKey(ak.id)}><Trash size={14} /></button>
                            </>
                          )}
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="flex" style={{ flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <div>
                            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>API Key / Secret Value</label>
                            <input value={editForm.key} onChange={e => updateEditField('key', e.target.value)} style={monoInputStyle} placeholder="sk-..." />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Environment Variable Name</label>
                            <input value={editForm.env} onChange={e => updateEditField('env', e.target.value)} style={monoInputStyle} placeholder="SARVAM_API_KEY" />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex gap-3 items-center" style={{ marginTop: '0.75rem' }}>
                            <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', borderRadius: '6px', padding: '0.5rem 0.75rem', fontFamily: 'monospace', fontSize: '0.8rem', color: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{maskSecret(ak.key, showTokens[ak.id])}</span>
                              <div className="flex gap-1">
                                <button className="btn btn-ghost" style={{ padding: '0.15rem' }} onClick={() => toggleTokenVisibility(ak.id)}>
                                  {showTokens[ak.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                                </button>
                                <button className="btn btn-ghost" style={{ padding: '0.15rem' }} onClick={() => copyToClipboard(ak.key, 'Key')}><Copy size={13} /></button>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-4 items-center" style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
                            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '4px', padding: '0.15rem 0.5rem', fontFamily: 'monospace', color: '#f59e0b', fontSize: '0.7rem' }}>{ak.env}</div>
                            <div className="flex items-center gap-1"><CheckCircle size={12} style={{ color: '#27ae60' }} /><span className="text-muted">Active</span></div>
                            <div className="text-muted">Last used: {ak.lastUsed}</div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(239,68,68,0.05)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.15)' }}>
                <div className="flex items-center gap-2" style={{ fontWeight: 600, fontSize: '0.875rem', color: '#ef4444', marginBottom: '0.5rem' }}>
                  <AlertTriangle size={14} /> Security Warning
                </div>
                <p className="text-muted" style={{ fontSize: '0.8rem', lineHeight: 1.6 }}>API keys grant full access to external services. Never expose them in frontend code or version control. Use environment variables in production. Rotate keys immediately if compromised.</p>
              </div>
            </div>
          )}

          {/* ===== ACCESS TOKENS ===== */}
          {activeTab === 'tokens' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Access Tokens</h2>
                  <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Manage authentication tokens. Click pencil to edit name, scopes, and expiry.</p>
                </div>
                <button className="btn btn-primary" onClick={addToken}><Plus size={16} /> Generate Token</button>
              </div>

              <div className="flex" style={{ flexDirection: 'column', gap: '0.75rem' }}>
                {tokens.map(tk => {
                  const isEditing = editingId === tk.id;
                  const isRevoked = tk.status === 'revoked';
                  return (
                    <div key={tk.id} style={{ background: isEditing ? 'rgba(14,165,160,0.04)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isEditing ? 'var(--teal-accent)' : isRevoked ? 'rgba(239,68,68,0.3)' : 'var(--glass-border)'}`, borderRadius: '10px', padding: '1rem', opacity: isRevoked ? 0.5 : 1, transition: 'all 0.2s' }}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3" style={{ flex: 1 }}>
                          <div style={{ background: isRevoked ? 'rgba(239,68,68,0.15)' : 'rgba(14,165,160,0.15)', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Shield size={16} style={{ color: isRevoked ? '#ef4444' : 'var(--teal-accent)' }} />
                          </div>
                          {isEditing ? (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                              <input value={editForm.name} onChange={e => updateEditField('name', e.target.value)} style={inputStyle} placeholder="Token name" autoFocus />
                            </div>
                          ) : (
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{tk.name}</div>
                              <div className="text-muted" style={{ fontSize: '0.75rem' }}>Type: {tk.type} • Expires: {tk.expires}</div>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {isEditing ? (
                            <>
                              <button className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={saveTokenEdit}><Check size={13} /> Save</button>
                              <button className="btn btn-ghost" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={cancelEdit}><X size={13} /> Cancel</button>
                            </>
                          ) : !isRevoked ? (
                            <>
                              <button className="btn btn-ghost" style={{ padding: '0.25rem' }} title="Edit" onClick={() => startEdit(tk)}><Pencil size={14} className="text-teal" /></button>
                              <button className="btn btn-ghost" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }} onClick={() => regenerateToken(tk.id, tk.name)}><RefreshCw size={12} /> Rotate</button>
                              <button className="btn btn-ghost" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', color: 'var(--danger)' }} onClick={() => revokeToken(tk.id)}>Revoke</button>
                            </>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>REVOKED</span>
                          )}
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="flex" style={{ flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <div>
                              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Type</label>
                              <select value={editForm.type} onChange={e => updateEditField('type', e.target.value)} style={inputStyle}>
                                <option value="Bearer">Bearer</option>
                                <option value="HMAC-SHA256">HMAC-SHA256</option>
                                <option value="Basic">Basic</option>
                              </select>
                            </div>
                            <div>
                              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Expires</label>
                              <input type="date" value={editForm.expires === 'Never' ? '' : editForm.expires} onChange={e => updateEditField('expires', e.target.value || 'Never')} style={inputStyle} />
                            </div>
                          </div>
                          <div>
                            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Scopes (comma-separated)</label>
                            <input value={editForm.scope} onChange={e => updateEditField('scope', e.target.value)} style={monoInputStyle} placeholder="read:leads,write:campaigns" />
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            Available scopes: <span style={{ fontFamily: 'monospace', color: '#8b8b8b' }}>read:leads, write:leads, read:campaigns, write:campaigns, execute:campaigns, read:analytics, read:quotes, write:quotes, webhooks:verify</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '6px', padding: '0.5rem 0.75rem', fontFamily: 'monospace', fontSize: '0.8rem', color: '#e0e0e0', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{maskSecret(tk.token, showTokens[tk.id])}</span>
                            <div className="flex gap-1">
                              <button className="btn btn-ghost" style={{ padding: '0.15rem' }} onClick={() => toggleTokenVisibility(tk.id)}>
                                {showTokens[tk.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                              </button>
                              <button className="btn btn-ghost" style={{ padding: '0.15rem' }} onClick={() => copyToClipboard(tk.token, 'Token')}><Copy size={13} /></button>
                            </div>
                          </div>
                          <div className="flex gap-2 items-center" style={{ marginTop: '0.5rem', flexWrap: 'wrap' }}>
                            {tk.scope.split(',').map((s, i) => (
                              <span key={i} style={{ background: 'rgba(14,165,160,0.1)', border: '1px solid rgba(14,165,160,0.2)', borderRadius: '4px', padding: '0.1rem 0.4rem', fontFamily: 'monospace', fontSize: '0.65rem', color: 'var(--teal-accent)' }}>{s.trim()}</span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ padding: '0.75rem', background: 'rgba(14,165,160,0.05)', borderRadius: '8px', border: '1px solid rgba(14,165,160,0.15)', fontSize: '0.8rem' }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: 'var(--teal-accent)' }}>🔒 Token Security</div>
                  <p className="text-muted">Tokens are shown only once at creation. Store them securely. Rotate regularly.</p>
                </div>
                <div style={{ padding: '0.75rem', background: 'rgba(212,168,83,0.05)', borderRadius: '8px', border: '1px solid rgba(212,168,83,0.15)', fontSize: '0.8rem' }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: '#d4a853' }}>📋 Usage Example</div>
                  <pre className="text-muted" style={{ fontSize: '0.7rem', lineHeight: 1.5 }}>{`curl -H "Authorization: Bearer etson_..."
  https://api.etson.in/api/leads`}</pre>
                </div>
              </div>
            </div>
          )}

          {/* ===== SCORING ===== */}
          {activeTab === 'scoring' && (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Lead Scoring Weights</h2>
              <p className="text-muted mb-6" style={{ fontSize: '0.875rem' }}>Adjust the importance of each dimension. Total must equal 100.</p>
              <div className="flex" style={{ flexDirection: 'column', gap: '1.25rem' }}>
                {[
                  { label: 'Customer & ICP Fit', value: 15, color: '#0ea5a0' },
                  { label: 'Product & Spec Fit', value: 15, color: '#0ea5a0' },
                  { label: 'Volume & Revenue', value: 15, color: '#d4a853' },
                  { label: 'Supplier Pain', value: 15, color: '#d4a853' },
                  { label: 'Timeline', value: 10, color: '#3498db' },
                  { label: 'Decision Authority', value: 10, color: '#3498db' },
                  { label: 'Commercial Viability', value: 15, color: '#e74c3c' },
                  { label: 'Engagement & Next Step', value: 5, color: '#8b5cf6' },
                ].map((rule, i) => (
                  <div key={i}>
                    <div className="flex justify-between mb-1">
                      <span style={{ fontSize: '0.875rem' }}>{rule.label}</span>
                      <span style={{ color: rule.color, fontWeight: 700, fontFamily: 'monospace' }}>{rule.value}/100</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <input type="range" style={{ flex: 1, accentColor: rule.color }} min="0" max="25" defaultValue={rule.value} />
                      <span className="text-muted" style={{ fontSize: '0.75rem', width: '60px', textAlign: 'right' }}>max 25</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(14,165,160,0.05)', borderRadius: '8px', textAlign: 'center', fontWeight: 600, color: 'var(--teal-accent)' }}>
                Total: 100 / 100 ✅
              </div>
            </div>
          )}

          {/* ===== CATALOG ===== */}
          {activeTab === 'catalog' && (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Product Catalog</h2>
              <form onSubmit={handleAddProduct} className="mb-6 flex gap-2 items-end">
                <div className="flex-1">
                  <label className="form-label">Name</label>
                  <input type="text" name="name" className="form-input" required placeholder="Product Name" />
                </div>
                <div className="flex-1">
                  <label className="form-label">Category</label>
                  <input type="text" name="category" className="form-input" required placeholder="Category" />
                </div>
                <div style={{ width: '100px' }}>
                  <label className="form-label">Price</label>
                  <input type="number" name="price" className="form-input" required placeholder="0.00" />
                </div>
                <button type="submit" className="btn btn-primary"><Plus size={18} /> Add</button>
              </form>
              <div className="table-container">
                <table className="table">
                  <thead><tr><th>ID</th><th>Name</th><th>Category</th><th>Base Price (₹)</th><th>Actions</th></tr></thead>
                  <tbody>
                    {products.map(p => (
                      <tr key={p.id}><td>{p.id}</td><td>{p.name}</td><td>{p.category}</td><td>{p.price}</td>
                        <td><button className="btn btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteProduct(p.id)}><Trash size={16} /></button></td>
                      </tr>
                    ))}
                    {products.length === 0 && <tr><td colSpan="5" className="text-center text-muted p-4">No products found</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===== NOTIFICATIONS ===== */}
          {activeTab === 'notifications' && (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Notification Preferences</h2>
              {[
                { title: 'Hot Lead Alerts', desc: 'Instant notification when a lead scores > 80', default: true },
                { title: 'Campaign Completion', desc: 'Daily summary of campaign results', default: true },
                { title: 'Quote Approval Needed', desc: 'Alert when a quote draft needs human approval', default: true },
                { title: 'Follow-up Reminders', desc: 'Notify when a scheduled follow-up is due', default: true },
                { title: 'Weekly Analytics Report', desc: 'Email summary of leads, conversions, revenue', default: false },
                { title: 'API Error Alerts', desc: 'Alert when webhook or API calls fail', default: true },
              ].map((n, i) => (
                <div key={i} className="flex items-center justify-between mb-4 pb-4" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <div><div style={{ fontWeight: 500 }}>{n.title}</div><div className="text-muted" style={{ fontSize: '0.875rem' }}>{n.desc}</div></div>
                  <input type="checkbox" defaultChecked={n.default} style={{ width: '20px', height: '20px', accentColor: 'var(--teal-accent)' }} />
                </div>
              ))}
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">Alert Email Address</label>
                <input type="email" className="form-input" defaultValue="sales@etson.in" placeholder="email@example.com" />
              </div>
            </div>
          )}

          {/* ===== WHATSAPP ===== */}
          {activeTab === 'whatsapp' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>WhatsApp & Messaging</h2>
                  <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Configure WhatsApp Business API, manage AI agents, and send direct messages.</p>
                </div>
                <div className="flex items-center gap-2">
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: waConfig.connected ? '#27ae60' : '#ef4444', boxShadow: waConfig.connected ? '0 0 8px #27ae60' : 'none' }} />
                  <span style={{ fontSize: '0.8rem', color: waConfig.connected ? '#27ae60' : '#ef4444' }}>{waConfig.connected ? 'Connected' : 'Disconnected'}</span>
                </div>
              </div>

              {/* Business API Config */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <div style={{ background: 'rgba(37,211,102,0.15)', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Phone size={15} style={{ color: '#25d166' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>WhatsApp Business API</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>Meta Cloud API configuration</div>
                    </div>
                  </div>
                  <select value={waConfig.provider} onChange={e => setWaConfig(p => ({ ...p, provider: e.target.value }))} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '6px', padding: '0.3rem 0.6rem', color: '#fff', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <option value="meta">Meta Cloud API</option>
                    <option value="wati">WATI</option>
                    <option value="twilio">Twilio</option>
                    <option value="sarvam">Sarvam AI</option>
                    <option value="interakt">Interakt</option>
                    <option value="aisensy">AiSensy</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Business Phone Number ID</label>
                    <input value={waConfig.businessPhoneId} onChange={e => setWaConfig(p => ({ ...p, businessPhoneId: e.target.value }))} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '6px', padding: '0.4rem 0.6rem', color: '#fff', fontSize: '0.8rem', width: '100%', fontFamily: 'monospace' }} placeholder="1234567890" />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>WABA ID</label>
                    <input value={waConfig.wabaId} onChange={e => setWaConfig(p => ({ ...p, wabaId: e.target.value }))} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '6px', padding: '0.4rem 0.6rem', color: '#fff', fontSize: '0.8rem', width: '100%', fontFamily: 'monospace' }} placeholder="WABA_xxx" />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Access Token</label>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <input type={showTokens['waToken'] ? 'text' : 'password'} value={waConfig.accessToken} onChange={e => setWaConfig(p => ({ ...p, accessToken: e.target.value }))} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '6px', padding: '0.4rem 0.6rem', color: '#fff', fontSize: '0.75rem', flex: 1, fontFamily: 'monospace' }} placeholder="EAAxxxxxxxx" />
                      <button className="btn btn-ghost" style={{ padding: '0.3rem' }} onClick={() => toggleTokenVisibility('waToken')}>{showTokens['waToken'] ? <EyeOff size={13} /> : <Eye size={13} />}</button>
                      <button className="btn btn-ghost" style={{ padding: '0.3rem' }} onClick={() => copyToClipboard(waConfig.accessToken, 'Token')}><Copy size={13} /></button>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Webhook Verify Token</label>
                    <input value={waConfig.webhookVerifyToken} onChange={e => setWaConfig(p => ({ ...p, webhookVerifyToken: e.target.value }))} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '6px', padding: '0.4rem 0.6rem', color: '#fff', fontSize: '0.8rem', width: '100%', fontFamily: 'monospace' }} placeholder="etson_verify_..." />
                  </div>
                </div>
                <button className="btn btn-primary" style={{ marginTop: '0.75rem', fontSize: '0.8rem', padding: '0.4rem 1rem' }} onClick={() => toast.success('WhatsApp Business API configuration saved!')}>Save API Config</button>
              </div>

              {/* Direct Message Composer */}
              <div style={{ background: 'rgba(37,211,102,0.03)', border: '1px solid rgba(37,211,102,0.15)', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Send size={15} style={{ color: '#25d166' }} />
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Send Direct WhatsApp Message</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Phone Number (with country code)</label>
                    <input value={waMsgForm.phone} onChange={e => setWaMsgForm(p => ({ ...p, phone: e.target.value }))} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '6px', padding: '0.4rem 0.6rem', color: '#fff', fontSize: '0.85rem', width: '100%' }} placeholder="+919876543210" />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Use Template</label>
                    <select value={waMsgForm.template} onChange={e => { setWaMsgForm(p => ({ ...p, template: e.target.value })); if (e.target.value !== 'custom') applyTemplate(e.target.value); }} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '6px', padding: '0.4rem 0.6rem', color: '#fff', fontSize: '0.8rem', width: '100%' }}>
                      <option value="custom">✏️ Custom message</option>
                      {waTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Message</label>
                  <textarea value={waMsgForm.message} onChange={e => setWaMsgForm(p => ({ ...p, message: e.target.value }))} rows={3} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '6px', padding: '0.5rem 0.75rem', color: '#fff', fontSize: '0.85rem', width: '100%', resize: 'vertical', fontFamily: 'inherit' }} placeholder="Type your message here... Use {name}, {product} as placeholders." />
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', textAlign: 'right' }}>{waMsgForm.message.length} / 4096 chars</div>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #25d166, #128c7e)', border: 'none' }} onClick={sendWaMessage}><Send size={14} /> Send Message</button>
                  <button className="btn btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => setWaMsgForm({ phone: '', message: '', template: 'custom', leadId: '' })}>Clear</button>
                </div>
              </div>

              {/* Agent API Keys */}
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <Bot size={15} className="text-teal" />
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>WhatsApp AI Agents</div>
                </div>
                <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }} onClick={addWaAgent}><Plus size={14} /> Add Agent</button>
              </div>
              <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.75rem' }}>Connect any WhatsApp-compatible AI agent (Sarvam, WATI, Twilio, custom). Each agent needs its own API key and endpoint.</p>

              <div className="flex" style={{ flexDirection: 'column', gap: '0.75rem' }}>
                {waAgents.map(agent => {
                  const isEditing = editingId === agent.id;
                  return (
                    <div key={agent.id} style={{ background: isEditing ? 'rgba(14,165,160,0.04)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isEditing ? 'var(--teal-accent)' : 'var(--glass-border)'}`, borderRadius: '10px', padding: '1rem', transition: 'all 0.2s' }}>
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3" style={{ flex: 1 }}>
                          <div style={{ background: 'rgba(37,211,102,0.12)', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Bot size={16} style={{ color: '#25d166' }} />
                          </div>
                          {isEditing ? (
                            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                              <input value={editForm.name} onChange={e => updateEditField('name', e.target.value)} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--teal-accent)', borderRadius: '6px', padding: '0.35rem 0.6rem', color: '#fff', fontSize: '0.85rem', width: '100%' }} placeholder="Agent name" autoFocus />
                              <input value={editForm.provider} onChange={e => updateEditField('provider', e.target.value)} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--teal-accent)', borderRadius: '6px', padding: '0.35rem 0.6rem', color: '#fff', fontSize: '0.8rem', width: '100%' }} placeholder="Provider" />
                            </div>
                          ) : (
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{agent.name}</div>
                              <div className="text-muted" style={{ fontSize: '0.75rem' }}>{agent.provider} • {agent.model} • {agent.language}</div>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {isEditing ? (
                            <>
                              <button className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={saveWaAgentEdit}><Check size={13} /> Save</button>
                              <button className="btn btn-ghost" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={cancelEdit}><X size={13} /> Cancel</button>
                            </>
                          ) : (
                            <>
                              <button className="btn btn-ghost" style={{ padding: '0.25rem' }} onClick={() => startEdit(agent)} title="Edit"><Pencil size={14} className="text-teal" /></button>
                              <button className="btn btn-ghost" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }} onClick={() => toggleWaAgent(agent.id)}>{agent.status === 'active' ? 'Disable' : 'Enable'}</button>
                              <button className="btn btn-ghost" style={{ color: 'var(--danger)', padding: '0.25rem' }} onClick={() => deleteWaAgent(agent.id)}><Trash size={14} /></button>
                            </>
                          )}
                        </div>
                      </div>

                      {isEditing ? (
                        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <div>
                              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>API Key / Secret</label>
                              <input value={editForm.apiKey} onChange={e => updateEditField('apiKey', e.target.value)} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--teal-accent)', borderRadius: '6px', padding: '0.35rem 0.6rem', color: '#fff', fontSize: '0.75rem', width: '100%', fontFamily: 'monospace' }} placeholder="sk-... or Bearer token" />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Agent / Bot ID</label>
                              <input value={editForm.agentId} onChange={e => updateEditField('agentId', e.target.value)} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--teal-accent)', borderRadius: '6px', padding: '0.35rem 0.6rem', color: '#fff', fontSize: '0.8rem', width: '100%', fontFamily: 'monospace' }} placeholder="agent_xxx or bot ID" />
                            </div>
                          </div>
                          <div>
                            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>API Endpoint URL</label>
                            <input value={editForm.endpoint} onChange={e => updateEditField('endpoint', e.target.value)} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--teal-accent)', borderRadius: '6px', padding: '0.35rem 0.6rem', color: '#fff', fontSize: '0.75rem', width: '100%', fontFamily: 'monospace' }} placeholder="https://api.provider.com/v1/..." />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <div>
                              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Model</label>
                              <input value={editForm.model} onChange={e => updateEditField('model', e.target.value)} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--teal-accent)', borderRadius: '6px', padding: '0.35rem 0.6rem', color: '#fff', fontSize: '0.8rem', width: '100%' }} placeholder="Sarvam-105B, GPT-4o, etc." />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Language</label>
                              <select value={editForm.language} onChange={e => updateEditField('language', e.target.value)} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--teal-accent)', borderRadius: '6px', padding: '0.35rem 0.6rem', color: '#fff', fontSize: '0.8rem', width: '100%' }}>
                                <option>Hindi + English</option>
                                <option>Hindi</option>
                                <option>English</option>
                                <option>Gujarati</option>
                                <option>Tamil</option>
                                <option>Telugu</option>
                                <option>All Indian languages</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ marginTop: '0.75rem' }}>
                          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '6px', padding: '0.4rem 0.75rem', fontFamily: 'monospace', fontSize: '0.75rem', color: '#aaa', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{maskSecret(agent.apiKey, showTokens[agent.id])}</span>
                            <div className="flex gap-1">
                              <button className="btn btn-ghost" style={{ padding: '0.1rem' }} onClick={() => toggleTokenVisibility(agent.id)}>{showTokens[agent.id] ? <EyeOff size={12} /> : <Eye size={12} />}</button>
                              <button className="btn btn-ghost" style={{ padding: '0.1rem' }} onClick={() => copyToClipboard(agent.apiKey, 'API Key')}><Copy size={12} /></button>
                            </div>
                          </div>
                          <div className="flex gap-4" style={{ fontSize: '0.75rem', flexWrap: 'wrap' }}>
                            <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '4px', padding: '0.15rem 0.5rem', fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--teal-accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>{agent.endpoint}</div>
                            <div className="flex items-center gap-1">
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: agent.status === 'active' ? '#27ae60' : '#6b7280', boxShadow: agent.status === 'active' ? '0 0 6px #27ae60' : 'none' }} />
                              <span className="text-muted">{agent.status}</span>
                            </div>
                            <div className="text-muted">Last used: {agent.lastUsed}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Message Templates */}
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '10px' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MessageSquare size={14} className="text-teal" /> Message Templates
                </div>
                <div className="flex" style={{ flexDirection: 'column', gap: '0.5rem' }}>
                  {waTemplates.map(t => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.15)', borderRadius: '6px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, fontSize: '0.8rem', marginBottom: '0.2rem', color: 'var(--teal-accent)' }}>{t.name}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem', lineHeight: 1.4 }}>{t.text}</div>
                      </div>
                      <button className="btn btn-ghost" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', flexShrink: 0 }} onClick={() => applyTemplate(t.id)}>Use</button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* spacing for reverted closing tag */}

        </div>
      </div>
    </div>
  );
};

export default Settings;
