/**
 * Local SQLite Database - replaces Supabase for local development
 * Data is stored in etson-local.db (gitignored)
 * All data comes ONLY from real Sarvam AI webhook calls
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../../etson-local.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');

// Create tables if they don't exist (empty - no seed data)
db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id          TEXT PRIMARY KEY,
    name        TEXT,
    phone       TEXT,
    email       TEXT,
    company     TEXT,
    city        TEXT,
    product     TEXT,
    needs       TEXT,
    volume      INTEGER,
    budget      TEXT,
    application TEXT,
    width       TEXT,
    diameter    TEXT,
    core_size   TEXT,
    current_supplier TEXT,
    supplier_pain    TEXT,
    decision_maker   TEXT,
    timeline         TEXT,
    status      TEXT DEFAULT 'new',
    category    TEXT DEFAULT 'nurture',
    priority    INTEGER DEFAULT 0,
    confidence  TEXT,
    sentiment   TEXT,
    transcript  TEXT,
    call_duration TEXT,
    recording_url TEXT,
    notes       TEXT,
    score_breakdown TEXT,
    source      TEXT,
    consent_source TEXT,
    campaign_id TEXT,
    assigned_to TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS campaigns (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT,
    status      TEXT DEFAULT 'draft',
    total_contacts INTEGER DEFAULT 0,
    answered    INTEGER DEFAULT 0,
    hot_leads   INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS quotes (
    id          TEXT PRIMARY KEY,
    lead_id     TEXT,
    client      TEXT,
    items       TEXT,
    amount      TEXT,
    status      TEXT DEFAULT 'draft',
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT,
    price       REAL,
    unit        TEXT,
    stock       INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS webhook_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    interaction_id TEXT UNIQUE,
    processed_at   TEXT DEFAULT (datetime('now'))
  );
`);

// Adapter: mimics Supabase client API so routes need minimal changes
export const localDB = {
  from: (table) => new TableQuery(db, table)
};

class TableQuery {
  constructor(db, table) {
    this.db = db;
    this.table = table;
    this._select = '*';
    this._wheres = [];
    this._order = null;
    this._limit = null;
    this._isSingle = false;
    this._notNulls = [];
  }

  select(cols = '*') { this._select = cols; return this; }
  eq(col, val)       { this._wheres.push({ col, op: '=',      val }); return this; }
  neq(col, val)      { this._wheres.push({ col, op: '!=',     val }); return this; }
  ilike(col, val)    { this._wheres.push({ col, op: 'LIKE',   val }); return this; }
  not(col, op, val)  {
    if (op === 'is' && val === null) this._notNulls.push(col);
    return this;
  }
  or(filter)         { /* simplified – not needed for current routes */ return this; }
  order(col, { ascending = true } = {}) { this._order = `${col} ${ascending ? 'ASC' : 'DESC'}`; return this; }
  limit(n)           { this._limit = n; return this; }
  single()           { this._isSingle = true; return this; }

  _buildWhere() {
    const clauses = [
      ...this._wheres.map(w => `${w.col} ${w.op} ?`),
      ...this._notNulls.map(c => `${c} IS NOT NULL`)
    ];
    return clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
  }
  _vals() { return this._wheres.map(w => w.val); }

  async _run(mode, data) {
    try {
      if (mode === 'select') {
        const sql = [
          `SELECT ${this._select} FROM ${this.table}`,
          this._buildWhere(),
          this._order ? `ORDER BY ${this._order}` : '',
          this._limit ? `LIMIT ${this._limit}` : ''
        ].filter(Boolean).join(' ');
        const rows = this.db.prepare(sql).all(...this._vals());
        // Parse JSON fields
        const parsed = rows.map(r => {
          for (const k of ['score_breakdown', 'items']) {
            if (r[k] && typeof r[k] === 'string') {
              try { r[k] = JSON.parse(r[k]); } catch {}
            }
          }
          return r;
        });
        if (this._isSingle) {
          if (!parsed[0]) return { data: null, error: { code: 'PGRST116', message: 'Not found' } };
          return { data: parsed[0], error: null };
        }
        return { data: parsed, error: null };
      }

      if (mode === 'insert') {
        const keys = Object.keys(data);
        const vals = keys.map(k => typeof data[k] === 'object' ? JSON.stringify(data[k]) : data[k]);
        const sql = `INSERT OR IGNORE INTO ${this.table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`;
        const info = this.db.prepare(sql).run(...vals);
        if (this._isSingle) {
          const id = data.id || info.lastInsertRowid;
          const row = this.db.prepare(`SELECT * FROM ${this.table} WHERE rowid=? OR id=?`).get(info.lastInsertRowid, id);
          return { data: row, error: null };
        }
        return { data: null, error: null };
      }

      if (mode === 'update') {
        const keys = Object.keys(data);
        const vals = [...keys.map(k => typeof data[k] === 'object' ? JSON.stringify(data[k]) : data[k]), ...this._vals()];
        const sql = `UPDATE ${this.table} SET ${keys.map(k => k + '=?').join(',')} ${this._buildWhere()}`;
        this.db.prepare(sql).run(...vals);
        return { error: null };
      }

      if (mode === 'delete') {
        const sql = `DELETE FROM ${this.table} ${this._buildWhere()}`;
        this.db.prepare(sql).run(...this._vals());
        return { error: null };
      }

    } catch (e) {
      return { data: null, error: { message: e.message } };
    }
  }

  // Supabase-style awaitable
  then(resolve) { return this._run('select').then(resolve); }
  insert(data)  { const arr = Array.isArray(data) ? data : [data]; return { select: () => this, single: () => this, then: (r) => this._run('insert', arr[0]).then(r) }; }
  update(data)  { return { eq: (c,v) => { this.eq(c,v); return { then: (r) => this._run('update', data).then(r) }; }, then: (r) => this._run('update', data).then(r) }; }
  delete()      { return { eq: (c,v) => { this.eq(c,v); return { then: (r) => this._run('delete').then(r) }; } }; }
}

// Settings (for webhook idempotency) via webhook_log table
export const settingsHelper = {
  async get(key) {
    const row = db.prepare('SELECT 1 FROM webhook_log WHERE interaction_id=?').get(key);
    return row ? { data: { key }, error: null } : { data: null, error: null };
  },
  async set(key) {
    try {
      db.prepare('INSERT OR IGNORE INTO webhook_log (interaction_id) VALUES (?)').run(key);
      return { error: null };
    } catch (e) {
      return { error: { message: e.message } };
    }
  }
};

export default db;
