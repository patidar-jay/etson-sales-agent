import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { rateLimit } from 'express-rate-limit';
import db from './config/localdb.js';

// Load .env file if it exists (local dev). On Vercel, env vars are injected automatically.
dotenv.config();

import webhookRoutes from './routes/webhooks.js';
import campaignRoutes from './routes/campaigns.js';
import leadRoutes from './routes/leads.js';
import quoteRoutes from './routes/quotes.js';
import productRoutes from './routes/products.js';
import analyticsRoutes from './routes/analytics.js';
import followupRoutes from './routes/followups.js';
import settingsRoutes from './routes/settings.js';
import waRoutes, { broadcastWAMessage } from './routes/whatsapp.js';
import callLogRoutes from './routes/callLogs.js';
import { startFollowUpScheduler } from './services/followups.js';
import { createProxyMiddleware } from 'http-proxy-middleware';


const app = express();
const port = process.env.PORT || 3001;

app.use(cors({
  origin: (origin, callback) => {
    // Allow localhost, Vercel deployments, and no-origin requests (curl, Postman)
    const allowed = !origin ||
      origin.includes('localhost') ||
      origin.includes('vercel.app') ||
      origin.includes('etson');
    callback(null, allowed ? origin : false);
  },
  credentials: true
}));
app.use(express.json());

// ── Localtunnel bypass ────────────────────────────────────────────────────────
// Localtunnel shows a browser challenge page for new visitors.
// Setting this header tells localtunnel to bypass it — required for Sarvam webhooks.
app.use((req, res, next) => {
  res.setHeader('bypass-tunnel-reminder', 'true');
  next();
});


// Use memory storage for serverless compatibility (Vercel read-only filesystem)
const upload = multer({ storage: multer.memoryStorage() });

// ── Rate limiters ─────────────────────────────────────────────────────────────
// Sarvam webhook: max 60 calls/min (burst protection against replay)
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many webhook calls — slow down' },
});
// WA send: max 30 messages/min — only applied to POST routes, not SSE/read
const waSendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  skip: (req) => req.method === 'GET',  // Don't rate limit reads, SSE streams, or unread counts
  message: { error: 'Too many messages — please wait a moment' },
});


// Mount routes
app.use('/api/webhooks', webhookLimiter, webhookRoutes);
app.use('/api/campaigns', upload.single('file'), campaignRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/products', productRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/followups', followupRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/whatsapp', waSendLimiter, waRoutes);
app.use('/api/call-logs', callLogRoutes);

// ── Whatomate reverse proxy ───────────────────────────────────────────────────
// Strips X-Frame-Options: DENY so Whatomate UI can be embedded as an iframe
// in the Etson frontend. Proxies /wa-proxy/* → http://localhost:8080/*
const WHATOMATE_BASE = process.env.WHATOMATE_URL || 'http://localhost:8080';
app.use('/wa-proxy', createProxyMiddleware({
  target:      WHATOMATE_BASE,
  changeOrigin: true,
  pathRewrite:  { '^/wa-proxy': '' },
  selfHandleResponse: false,
  on: {
    proxyRes: (proxyRes) => {
      // Strip headers that block iframe embedding
      delete proxyRes.headers['x-frame-options'];
      delete proxyRes.headers['X-Frame-Options'];
      delete proxyRes.headers['content-security-policy'];
      delete proxyRes.headers['Content-Security-Policy'];
    },
  },
}));


// ── Whatomate WhatsApp Webhook ──────────────────────────────────────────────
// GET  /webhook/whatsapp  → Health check (Whatomate pings this)
// POST /webhook/whatsapp  → Incoming WhatsApp messages from Whatomate
app.get('/webhook/whatsapp', (req, res) => {
  console.log('[Whatomate Webhook] Health ping ✅');
  res.status(200).json({ status: 'ok', message: 'Etson WhatsApp webhook active' });
});

app.post('/webhook/whatsapp', (req, res) => {
  const body = req.body;
  try {
    const event   = body.event || body.type || '';
    const payload = body.data || body;

    // ── Skip outbound messages and status updates ────────────────────
    if (event === 'message.status' || event === 'message.ack') {
      return res.status(200).json({ status: 'ok' });
    }
    if (payload.fromMe === true || payload.direction === 'out') {
      return res.status(200).json({ status: 'ok' });
    }

    // ── Extract sender phone and message text ────────────────────────
    // Whatomate format: { phone, message } or HyperSender format: { from, body }
    const rawPhone    = payload.phone || payload.from || '';
    const senderPhone = String(rawPhone)
      .replace('@c.us', '').replace('@s.whatsapp.net', '').replace(/\D/g, '');
    const messageText = payload.message || payload.body || payload.text || '';

    if (!senderPhone || !messageText) return res.status(200).json({ status: 'ok' });

    // ── Match to a lead by last 10 digits ───────────────────────────
    const lead = db.prepare(
      `SELECT id, name FROM leads WHERE phone LIKE ?`
    ).get(`%${senderPhone.slice(-10)}%`);

    // ── Save to whatsapp_messages ────────────────────────────────────
    db.prepare(
      `INSERT INTO whatsapp_messages (lead_id, phone, direction, text, status) VALUES (?,?,?,?,?)`
    ).run(lead?.id || null, senderPhone, 'in', messageText, 'received');

    // ── Broadcast to SSE dashboard clients ───────────────────────────
    broadcastWAMessage({
      type:      'incoming',
      phone:     senderPhone,
      lead_id:   lead?.id   || null,
      lead_name: lead?.name || null,
      text:      messageText,
      status:    'received',
      created_at: new Date().toISOString(),
    });

    console.log(`[WA Webhook] ${senderPhone}${lead ? ` → ${lead.name}` : ''}: "${messageText.slice(0, 60)}"`);

  } catch (e) {
    console.error('[WA Webhook] Error:', e.message);
  }
  res.status(200).json({ status: 'received' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', time: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Export for Vercel serverless runtime
export default app;

// Start server locally (not on Vercel serverless)
if (process.env.LOCAL_DEV === 'true') {
  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    // Start follow-up cron scheduler
    startFollowUpScheduler();
  });
}
