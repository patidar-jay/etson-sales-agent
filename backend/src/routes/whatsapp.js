/**
 * WhatsApp Messaging API Routes
 * Handles message history per lead, send message, and SSE real-time stream
 */
import express from 'express';
import db from '../config/localdb.js';
import { wmSend, wmStatus, wmGetContacts, wmUpsertContact } from '../services/whatomate.js';

const router = express.Router();


// ── SSE client registry ───────────────────────────────────────────────────────
const sseClients = new Set();

/**
 * Broadcast a new message to all connected SSE clients
 * Called from index.js when an incoming WA message is received
 */
export function broadcastWAMessage(msg) {
  const data = `data: ${JSON.stringify(msg)}\n\n`;
  for (const client of sseClients) {
    try { client.write(data); } catch { sseClients.delete(client); }
  }
}

// ── GET /api/whatsapp/wa-status — Whatomate health check ──────────────────
router.get('/wa-status', async (req, res) => {
  const status = await wmStatus();
  res.json(status);
});

// ── GET /api/whatsapp/wa-contacts — Get Whatomate contacts ────────────────
router.get('/wa-contacts', async (req, res) => {
  const contacts = await wmGetContacts();
  res.json({ contacts });
});

// ── GET /api/whatsapp/stream — SSE real-time push ────────────────────────────
router.get('/stream', (req, res) => {
  res.set({
    'Content-Type':  'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection':    'keep-alive',
    'X-Accel-Buffering': 'no',        // disable nginx buffering
    'Access-Control-Allow-Origin': '*',
  });
  res.flushHeaders();

  // Send heartbeat every 20s to keep connection alive
  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch { cleanup(); }
  }, 20000);

  sseClients.add(res);

  // Send current unread count immediately on connect
  try {
    const unread = db.prepare(
      `SELECT COUNT(*) as count FROM whatsapp_messages WHERE direction = 'in' AND status = 'received'`
    ).get();
    res.write(`data: ${JSON.stringify({ type: 'init', unread: unread?.count || 0 })}\n\n`);
  } catch {}

  const cleanup = () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
    res.end();
  };

  req.on('close', cleanup);
  req.on('error', cleanup);
});

// ── GET /api/whatsapp/messages/:leadId — history for a lead ──────────────────
router.get('/messages/:leadId', (req, res) => {
  try {
    const msgs = db.prepare(
      `SELECT id, lead_id, phone, direction, text, status, created_at
       FROM whatsapp_messages
       WHERE lead_id = ?
       ORDER BY created_at ASC
       LIMIT 100`
    ).all(req.params.leadId);

    // Mark incoming messages as read
    db.prepare(
      `UPDATE whatsapp_messages SET status = 'read'
       WHERE lead_id = ? AND direction = 'in' AND status = 'received'`
    ).run(req.params.leadId);

    res.json(msgs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/whatsapp/messages — all messages (supports ?phone= for unknown contacts) ──
router.get('/messages', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 500;
    const phone = req.query.phone ? String(req.query.phone).replace(/\D/g, '') : null;

    let msgs;
    if (phone) {
      // Fetch conversation for a specific phone number (unknown contacts)
      msgs = db.prepare(
        `SELECT wm.*, l.name as lead_name, l.company as lead_company
         FROM whatsapp_messages wm
         LEFT JOIN leads l ON wm.lead_id = l.id
         WHERE wm.phone LIKE ?
         ORDER BY wm.created_at ASC
         LIMIT ?`
      ).all(`%${phone.slice(-10)}%`, limit);
      // Mark incoming as read
      db.prepare(
        `UPDATE whatsapp_messages SET status = 'read'
         WHERE direction = 'in' AND status = 'received' AND phone LIKE ?`
      ).run(`%${phone.slice(-10)}%`);
    } else {
      msgs = db.prepare(
        `SELECT wm.*, l.name as lead_name, l.company as lead_company
         FROM whatsapp_messages wm
         LEFT JOIN leads l ON wm.lead_id = l.id
         ORDER BY wm.created_at DESC
         LIMIT ?`
      ).all(limit);
    }
    res.json(msgs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/whatsapp/unread — unread count ───────────────────────────────────
router.get('/unread', (req, res) => {
  try {
    const row = db.prepare(
      `SELECT COUNT(*) as count FROM whatsapp_messages WHERE direction = 'in' AND status = 'received'`
    ).get();
    res.json({ count: row?.count || 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/whatsapp/send — send a message via Whatomate ──────────────────
router.post('/send', async (req, res) => {
  try {
    const { phone, text, lead_id } = req.body;
    if (!phone || !text) return res.status(400).json({ error: 'phone and text required' });

    // Save to DB first (as outgoing)
    db.prepare(
      `INSERT INTO whatsapp_messages (lead_id, phone, direction, text, status)
       VALUES (?, ?, 'out', ?, 'queued')`
    ).run(lead_id || null, phone, text);

    // Send via HyperSender
    const result = await wmSend(phone, text);

    // Update status
    const status = result ? 'sent' : 'failed';
    db.prepare(
      `UPDATE whatsapp_messages SET status = ?
       WHERE phone = ? AND direction = 'out' AND text = ?
       ORDER BY created_at DESC LIMIT 1`
    ).run(status, phone, text);

    // Broadcast to SSE clients
    broadcastWAMessage({
      type: 'outgoing',
      phone, text, lead_id,
      status,
      created_at: new Date().toISOString(),
    });

    res.json({ success: true, status, queued_uuid: result?.queued_request_uuid });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── PUT /api/whatsapp/read/:phone — mark all messages from phone as read ──────
router.put('/read/:phone', (req, res) => {
  try {
    const phone = req.params.phone.replace(/\D/g, '');
    // Mark all incoming messages for this phone as 'read'
    const result = db.prepare(
      `UPDATE whatsapp_messages SET status = 'read'
       WHERE direction = 'in' AND status = 'received' AND phone LIKE ?`
    ).run(`%${phone.slice(-10)}%`);
    res.json({ success: true, updated: result.changes });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/whatsapp/webhook-info — returns current public webhook URL ────────
router.get('/webhook-info', (req, res) => {
  try {
    const row = db.prepare(`SELECT value FROM settings WHERE key = 'webhook_url'`).get();
    const publicRow = db.prepare(`SELECT value FROM settings WHERE key = 'public_url'`).get();
    const webhookUrl = row?.value || null;
    const publicUrl  = publicRow?.value || null;
    res.json({
      webhookUrl,
      publicUrl,
      localEndpoint: '/webhook/whatsapp',
      status: webhookUrl ? 'configured' : 'not_configured',
      instructions: [
        '1. Run Whatomate: docker-compose up whatomate -d',
        '2. Open http://localhost:8080 → Settings → Webhooks',
        '3. Set webhook URL to: {publicUrl}/webhook/whatsapp',
      ],
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── PUT /api/whatsapp/webhook-info — update the stored webhook URL ─────────────
router.put('/webhook-info', (req, res) => {
  try {
    const { publicUrl } = req.body;
    if (!publicUrl) return res.status(400).json({ error: 'publicUrl required' });
    const webhookUrl = publicUrl.replace(/\/$/, '') + '/webhook/whatsapp';
    db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES ('public_url', ?)`).run(publicUrl);
    db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES ('webhook_url', ?)`).run(webhookUrl);
    res.json({ success: true, webhookUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// ══════════════════════════════════════════════════════════════════════════════
// CONTACTS CRUD
// ══════════════════════════════════════════════════════════════════════════════

// ── GET /api/whatsapp/contacts — list all manual contacts ─────────────────────
router.get('/contacts', (req, res) => {
  try {
    const { search } = req.query;
    let contacts = db.prepare(`SELECT * FROM whatsapp_contacts ORDER BY updated_at DESC`).all();
    if (search) {
      const s = search.toLowerCase();
      contacts = contacts.filter(c =>
        c.name.toLowerCase().includes(s) ||
        c.phone.includes(s) ||
        (c.company || '').toLowerCase().includes(s)
      );
    }
    res.json(contacts);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/whatsapp/contacts/:id — single contact ───────────────────────────
router.get('/contacts/:id', (req, res) => {
  try {
    const contact = db.prepare(`SELECT * FROM whatsapp_contacts WHERE id = ?`).get(req.params.id);
    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    res.json(contact);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/whatsapp/contacts — create a new contact ───────────────────────
router.post('/contacts', (req, res) => {
  try {
    const { name, phone, company, notes, category } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'name and phone are required' });

    const cleanPhone = String(phone).replace(/\D/g, '');
    if (!cleanPhone) return res.status(400).json({ error: 'Invalid phone number' });

    // Check duplicate
    const exists = db.prepare(`SELECT id FROM whatsapp_contacts WHERE phone = ?`).get(cleanPhone);
    if (exists) return res.status(409).json({ error: 'Contact with this phone already exists' });

    const id = `wc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    db.prepare(
      `INSERT INTO whatsapp_contacts (id, name, phone, company, notes, category)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, name.trim(), cleanPhone, company || '', notes || '', category || 'nurture');

    const contact = db.prepare(`SELECT * FROM whatsapp_contacts WHERE id = ?`).get(id);
    res.status(201).json(contact);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PUT /api/whatsapp/contacts/:id — update a contact ────────────────────────
router.put('/contacts/:id', (req, res) => {
  try {
    const { name, phone, company, notes, category, is_blocked } = req.body;
    const existing = db.prepare(`SELECT * FROM whatsapp_contacts WHERE id = ?`).get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Contact not found' });

    const cleanPhone = phone ? String(phone).replace(/\D/g, '') : existing.phone;
    db.prepare(
      `UPDATE whatsapp_contacts
       SET name = ?, phone = ?, company = ?, notes = ?, category = ?, is_blocked = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      name ?? existing.name,
      cleanPhone,
      company ?? existing.company,
      notes ?? existing.notes,
      category ?? existing.category,
      is_blocked !== undefined ? (is_blocked ? 1 : 0) : existing.is_blocked,
      req.params.id
    );

    const updated = db.prepare(`SELECT * FROM whatsapp_contacts WHERE id = ?`).get(req.params.id);
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE /api/whatsapp/contacts/:id — delete contact + all messages ─────────
router.delete('/contacts/:id', (req, res) => {
  try {
    const contact = db.prepare(`SELECT * FROM whatsapp_contacts WHERE id = ?`).get(req.params.id);
    if (!contact) return res.status(404).json({ error: 'Contact not found' });

    // Delete all messages for this phone
    db.prepare(`DELETE FROM whatsapp_messages WHERE phone = ?`).run(contact.phone);
    // Delete contact
    db.prepare(`DELETE FROM whatsapp_contacts WHERE id = ?`).run(req.params.id);

    res.json({ success: true, deleted: req.params.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// MESSAGES CRUD
// ══════════════════════════════════════════════════════════════════════════════

// ── DELETE /api/whatsapp/messages/:id — delete a single message ───────────────
router.delete('/messages/:id', (req, res) => {
  try {
    const msg = db.prepare(`SELECT id FROM whatsapp_messages WHERE id = ?`).get(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    db.prepare(`DELETE FROM whatsapp_messages WHERE id = ?`).run(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE /api/whatsapp/conversation/:phone — clear all messages for a phone ─
router.delete('/conversation/:phone', (req, res) => {
  try {
    const phone = req.params.phone.replace(/\D/g, '');
    const result = db.prepare(`DELETE FROM whatsapp_messages WHERE phone LIKE ?`).run(`%${phone.slice(-10)}%`);
    res.json({ success: true, deleted: result.changes });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PUT /api/whatsapp/messages/:id — edit outgoing message text ───────────────
router.put('/messages/:id', (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'text is required' });
    const msg = db.prepare(`SELECT * FROM whatsapp_messages WHERE id = ?`).get(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    if (msg.direction !== 'out') return res.status(403).json({ error: 'Can only edit outgoing messages' });
    db.prepare(`UPDATE whatsapp_messages SET text = ? WHERE id = ?`).run(text.trim(), req.params.id);
    res.json({ success: true, id: req.params.id, text: text.trim() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/whatsapp/recent — last 10 messages across all leads
router.get('/recent', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const msgs = db.prepare(`
      SELECT wm.*, l.name as lead_name, l.company as lead_company
      FROM whatsapp_messages wm
      LEFT JOIN leads l ON wm.lead_id = l.id
      ORDER BY wm.created_at DESC
      LIMIT ?
    `).all(limit);
    res.json(msgs);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

export default router;
export { sseClients };
