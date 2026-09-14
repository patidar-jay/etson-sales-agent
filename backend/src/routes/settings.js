/**
 * Settings API Routes
 * Generic key-value settings store backed by the `settings` SQLite table.
 * Used for WhatsApp freeze toggle, AI prompts, scoring weights, etc.
 */
import express from 'express';
import db from '../config/localdb.js';

const router = express.Router();

// GET /api/settings/:key
router.get('/:key', (req, res) => {
  try {
    const row = db.prepare(`SELECT value, updated_at FROM settings WHERE key = ?`).get(req.params.key);
    if (!row) return res.status(404).json({ error: 'Setting not found' });
    res.json({ key: req.params.key, value: row.value, updated_at: row.updated_at });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/settings — all settings
router.get('/', (req, res) => {
  try {
    const rows = db.prepare(`SELECT key, value, updated_at FROM settings ORDER BY key`).all();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/settings/:key
router.put('/:key', (req, res) => {
  try {
    const { value } = req.body;
    if (value === undefined) return res.status(400).json({ error: 'value is required' });
    db.prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    ).run(req.params.key, String(value));
    console.log(`[Settings] ${req.params.key} = ${value}`);
    res.json({ success: true, key: req.params.key, value: String(value) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
