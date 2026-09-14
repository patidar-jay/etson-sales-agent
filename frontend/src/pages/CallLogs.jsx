import React, { useState, useEffect, useRef } from 'react';
import { PhoneCall, RefreshCw, Mic, FileText, Clock, X, AlertCircle, ChevronDown } from 'lucide-react';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import toast from 'react-hot-toast';
import { API } from '../config.js';

const formatDuration = (secs) => {
  if (!secs) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

const statusVariant = (s) => {
  if (!s) return 'default';
  const v = s.toLowerCase();
  if (v === 'answered' || v === 'connected' || v === 'completed') return 'success';
  if (v === 'failed' || v === 'no_answer' || v === 'busy') return 'hot';
  return 'warm';
};

// Setup instructions when Sarvam analytics IDs not configured
const SetupCard = () => (
  <div className="glass-card" style={{ maxWidth: 560, margin: '4rem auto', textAlign: 'center', padding: '2.5rem' }}>
    <AlertCircle size={48} style={{ color: 'var(--teal-accent)', marginBottom: '1rem' }} />
    <h2 style={{ marginBottom: '0.5rem' }}>Sarvam Analytics Not Configured</h2>
    <p className="text-muted mb-6">To see call logs, transcripts, and recordings, add these 3 values to your <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0.1rem 0.4rem', borderRadius: 4 }}>.env</code> file:</p>
    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '1rem 1.5rem', textAlign: 'left', fontFamily: 'monospace', fontSize: '0.88rem', border: '1px solid var(--glass-border)', marginBottom: '1.5rem' }}>
      <div style={{ color: '#94a3b8', marginBottom: '0.4rem' }}># backend/.env</div>
      <div><span style={{ color: 'var(--teal-accent)' }}>SARVAM_ORG_ID</span>=<span style={{ color: '#fbbf24' }}>your_org_id</span></div>
      <div><span style={{ color: 'var(--teal-accent)' }}>SARVAM_WORKSPACE_ID</span>=<span style={{ color: '#fbbf24' }}>your_workspace_id</span></div>
      <div><span style={{ color: 'var(--teal-accent)' }}>SARVAM_APP_ID</span>=<span style={{ color: '#fbbf24' }}>your_app_id</span></div>
    </div>
    <p className="text-muted" style={{ fontSize: '0.85rem' }}>
      Find these in your <strong>Sarvam dashboard</strong> → open your agent → the URL will look like:<br />
      <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0.2rem 0.5rem', borderRadius: 4, marginTop: '0.5rem', display: 'inline-block' }}>
        dashboard.sarvam.ai/org/<span style={{ color: '#fbbf24' }}>ORG_ID</span>/workspace/<span style={{ color: '#f87171' }}>WORKSPACE_ID</span>/app/<span style={{ color: 'var(--teal-accent)' }}>APP_ID</span>
      </code>
    </p>
  </div>
);

// Chat-bubble transcript viewer
const TranscriptView = ({ data }) => {
  const messages = Array.isArray(data?.messages)
    ? data.messages
    : Array.isArray(data)
    ? data
    : [];

  if (!messages.length) {
    return (
      <div className="text-muted text-center p-6">
        {data?.configured === false ? 'Configure Sarvam Analytics IDs to view transcripts.' : 'No transcript available for this call.'}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '40vh', overflowY: 'auto', padding: '0.5rem' }}>
      {messages.map((msg, i) => {
        const isAgent = (msg.role || '').toLowerCase() !== 'user';
        return (
          <div key={i} style={{ display: 'flex', justifyContent: isAgent ? 'flex-start' : 'flex-end' }}>
            <div style={{
              maxWidth: '75%', padding: '0.6rem 0.9rem', borderRadius: isAgent ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
              background: isAgent ? 'rgba(20,184,166,0.15)' : 'rgba(255,255,255,0.08)',
              border: `1px solid ${isAgent ? 'rgba(20,184,166,0.3)' : 'rgba(255,255,255,0.12)'}`,
              fontSize: '0.88rem', lineHeight: 1.5,
            }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                {isAgent ? '🤖 Agent' : '👤 Customer'}
              </div>
              {msg.content || msg.text || msg.message || '(no content)'}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Styled audio player
const AudioPlayer = ({ src }) => {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  if (!src) return (
    <div className="text-muted text-center p-4" style={{ fontSize: '0.85rem' }}>
      No recording available for this call.
    </div>
  );

  return (
    <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: '1rem', border: '1px solid var(--glass-border)' }}>
      <audio ref={audioRef} src={src}
        onTimeUpdate={() => setProgress(audioRef.current ? (audioRef.current.currentTime / audioRef.current.duration) * 100 : 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => setPlaying(false)}
      />
      <div className="flex items-center gap-3">
        <button className="btn btn-primary" style={{ borderRadius: '50%', width: 38, height: 38, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} onClick={toggle}>
          {playing ? '⏸' : '▶'}
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, overflow: 'hidden', cursor: 'pointer' }}
            onClick={(e) => {
              if (!audioRef.current) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = (e.clientX - rect.left) / rect.width;
              audioRef.current.currentTime = pct * audioRef.current.duration;
            }}>
            <div style={{ width: `${progress}%`, height: '100%', background: 'var(--teal-accent)', transition: 'width 0.2s' }} />
          </div>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', flexShrink: 0 }}>
          {formatDuration(duration)}
        </span>
      </div>
    </div>
  );
};

const CallLogs = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [error, setError] = useState(null);
  const [offset, setOffset] = useState(0);
  const LIMIT = 20;

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Detail modal
  const [selectedCall, setSelectedCall] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [recording, setRecording] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: LIMIT, offset });
      if (startDate) params.set('start_datetime', new Date(startDate).toISOString());
      if (endDate)   params.set('end_datetime',   new Date(endDate).toISOString());
      const res = await fetch(`${API}/call-logs?${params}`);
      const data = await res.json();
      if (data.configured === false) { setConfigured(false); setLogs([]); }
      else { setConfigured(true); setLogs(data.items || []); setTotal(data.total || 0); }
    } catch (err) {
      setError('Failed to load call logs: ' + err.message);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, [offset]);

  const openDetail = async (call) => {
    setSelectedCall(call);
    setTranscript(null);
    setRecording(null);
    setLoadingDetail(true);
    const id = call.interaction_id;
    try {
      const [t, r] = await Promise.all([
        fetch(`${API}/call-logs/${id}/transcript`).then(r => r.json()),
        fetch(`${API}/call-logs/${id}/recording`).then(r => r.json()),
      ]);
      setTranscript(t);
      setRecording(r);
    } catch (err) {
      toast.error('Could not load call details');
    } finally { setLoadingDetail(false); }
  };

  if (!configured) return <SetupCard />;

  return (
    <div className="slide-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-5" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 className="text-2xl" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <PhoneCall size={24} style={{ color: 'var(--teal-accent)' }} /> Call Logs
        </h1>
        <div className="flex gap-2 items-center flex-wrap">
          <input type="date" className="form-input" style={{ width: 'auto', padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
            value={startDate} onChange={e => setStartDate(e.target.value)} title="From date" />
          <span className="text-muted">→</span>
          <input type="date" className="form-input" style={{ width: 'auto', padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
            value={endDate} onChange={e => setEndDate(e.target.value)} title="To date" />
          <button className="btn btn-primary" onClick={() => { setOffset(0); fetchLogs(); }}>
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex gap-4 mb-5">
        <div className="glass-card" style={{ padding: '0.75rem 1.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flex: 1 }}>
          <PhoneCall size={18} style={{ color: 'var(--teal-accent)' }} />
          <div><div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{total}</div><div className="text-muted" style={{ fontSize: '0.75rem' }}>Total Calls</div></div>
        </div>
        <div className="glass-card" style={{ padding: '0.75rem 1.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flex: 1 }}>
          <Mic size={18} style={{ color: '#4ade80' }} />
          <div><div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{logs.filter(l => l.connectivity_status?.toLowerCase() === 'answered' || l.connectivity_status?.toLowerCase() === 'connected').length}</div><div className="text-muted" style={{ fontSize: '0.75rem' }}>Answered</div></div>
        </div>
        <div className="glass-card" style={{ padding: '0.75rem 1.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flex: 1 }}>
          <Clock size={18} style={{ color: '#fbbf24' }} />
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
              {logs.length ? formatDuration(logs.reduce((a, l) => a + (l.duration_in_seconds || 0), 0) / logs.length) : '0:00'}
            </div>
            <div className="text-muted" style={{ fontSize: '0.75rem' }}>Avg Duration</div>
          </div>
        </div>
      </div>

      {/* Table */}
      {error && <div className="p-4 mb-4 rounded text-center" style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}>{error}</div>}

      <div className="glass-card" style={{ padding: 0, flex: 1, overflowY: 'auto' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Phone</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Language</th>
                <th>Messages</th>
                <th>Date & Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading call logs...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No call logs found. Run a Call Campaign to see data here.</td></tr>
              ) : logs.map((log, i) => (
                <tr key={log.attempt_id || i}>
                  <td style={{ fontWeight: 500, color: 'var(--teal-accent)' }}>{log.user_contact_masked || log.user_identifier || '—'}</td>
                  <td><Badge variant={statusVariant(log.connectivity_status)}>{log.connectivity_status || 'unknown'}</Badge></td>
                  <td>{formatDuration(log.duration_in_seconds)}</td>
                  <td className="text-muted">{log.language_name || '—'}</td>
                  <td>{log.num_messages ?? '—'}</td>
                  <td className="text-muted">{formatDate(log.start_datetime)}</td>
                  <td>
                    <button className="btn btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => openDetail(log)}>
                      <FileText size={14} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {total > LIMIT && (
        <div className="flex justify-center gap-3 mt-4">
          <button className="btn btn-ghost" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))}>← Prev</button>
          <span className="text-muted" style={{ lineHeight: '2.2rem' }}>
            {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}
          </span>
          <button className="btn btn-ghost" disabled={offset + LIMIT >= total} onClick={() => setOffset(offset + LIMIT)}>Next →</button>
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        isOpen={!!selectedCall}
        onClose={() => setSelectedCall(null)}
        title={`📞 Call — ${selectedCall?.user_contact_masked || selectedCall?.user_identifier || 'Unknown'}`}
        maxWidth="680px"
      >
        {selectedCall && (
          <div>
            {/* Meta info */}
            <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {[
                { label: 'Status',    value: selectedCall.connectivity_status || '—' },
                { label: 'Duration',  value: formatDuration(selectedCall.duration_in_seconds) },
                { label: 'Language',  value: selectedCall.language_name || '—' },
                { label: 'Messages',  value: selectedCall.num_messages ?? '—' },
                { label: 'Ended by',  value: selectedCall.ended_by || '—' },
                { label: 'Date',      value: formatDate(selectedCall.start_datetime) },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'rgba(0,0,0,0.2)', padding: '0.6rem 0.8rem', borderRadius: 8 }}>
                  <div className="text-muted" style={{ fontSize: '0.72rem', marginBottom: '0.2rem' }}>{label}</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Recording */}
            <div className="mb-5">
              <h4 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Mic size={16} style={{ color: 'var(--teal-accent)' }} /> Recording
              </h4>
              {loadingDetail ? (
                <div className="text-muted text-center p-3">Loading recording...</div>
              ) : (
                <AudioPlayer src={recording?.audio_url || recording?.url || recording?.recording_url} />
              )}
            </div>

            {/* Transcript */}
            <div>
              <h4 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <FileText size={16} style={{ color: 'var(--teal-accent)' }} /> Transcript
              </h4>
              {loadingDetail ? (
                <div className="text-muted text-center p-3">Loading transcript...</div>
              ) : (
                <TranscriptView data={transcript} />
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button className="btn btn-primary" onClick={() => setSelectedCall(null)}>Close</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CallLogs;
