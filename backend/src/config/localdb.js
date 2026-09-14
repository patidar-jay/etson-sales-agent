/**
 * Local SQLite Database - replaces Supabase for local development
 * Data is stored in etson-local.db (gitignored)
 * All data comes ONLY from real Sarvam AI webhook calls
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../etson-local.db');

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
    followup_enabled INTEGER DEFAULT 1,
    dnd_opt_out INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS campaigns (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT,
    campaign_type TEXT,
    status      TEXT DEFAULT 'draft',
    total_contacts INTEGER DEFAULT 0,
    answered    INTEGER DEFAULT 0,
    hot_leads   INTEGER DEFAULT 0,
    sent_count  INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    started_at  TEXT,
    completed_at TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS quotes (
    id          TEXT PRIMARY KEY,
    lead_id     TEXT,
    client      TEXT,
    phone       TEXT,
    notes       TEXT,
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

  CREATE TABLE IF NOT EXISTS followup_queue (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id      TEXT NOT NULL,
    action_type  TEXT NOT NULL,
    scheduled_at TEXT NOT NULL,
    status       TEXT DEFAULT 'pending',
    completed_at TEXT,
    created_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id      TEXT,
    phone        TEXT,
    direction    TEXT NOT NULL,
    text         TEXT NOT NULL,
    status       TEXT DEFAULT 'sent',
    wm_message_id TEXT,
    created_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS whatsapp_contacts (
    id           TEXT PRIMARY KEY,
    name         TEXT,
    phone        TEXT NOT NULL,
    company      TEXT,
    notes        TEXT,
    category     TEXT DEFAULT 'general',
    is_blocked   INTEGER DEFAULT 0,
    last_message_at TEXT,
    created_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key          TEXT PRIMARY KEY,
    value        TEXT,
    updated_at   TEXT DEFAULT (datetime('now'))
  );
`);

// Safely add missing columns to existing databases (ALTER TABLE won't fail on fresh DBs)
const safeAddColumn = (table, col, type) => {
  try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`); } catch {}
};
safeAddColumn('leads', 'followup_enabled', 'INTEGER DEFAULT 1');
safeAddColumn('leads', 'dnd_opt_out', 'INTEGER DEFAULT 0');
safeAddColumn('campaigns', 'campaign_type', 'TEXT');
safeAddColumn('campaigns', 'sent_count', 'INTEGER DEFAULT 0');
safeAddColumn('campaigns', 'failed_count', 'INTEGER DEFAULT 0');
safeAddColumn('campaigns', 'started_at', 'TEXT');
safeAddColumn('campaigns', 'completed_at', 'TEXT');
safeAddColumn('quotes', 'phone', 'TEXT');
safeAddColumn('quotes', 'notes', 'TEXT');
safeAddColumn('whatsapp_messages', 'wm_message_id', 'TEXT');

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
    this._orClauses = [];
    this._orVals = [];
  }

  select(cols = '*') { this._select = cols; return this; }
  eq(col, val)       { this._wheres.push({ col, op: '=',    val }); return this; }
  neq(col, val)      { this._wheres.push({ col, op: '!=',   val }); return this; }
  ilike(col, val)    { this._wheres.push({ col, op: 'LIKE', val }); return this; }
  not(col, op, val)  {
    if (op === 'is' && val === null) this._notNulls.push(col);
    return this;
  }
  or(filter) {
    if (!filter) return this;
    // Parse Supabase-style: 'name.ilike.%val%,company.ilike.%val%'
    filter.split(',').forEach(part => {
      const dotIdx = part.indexOf('.');
      const dotIdx2 = part.indexOf('.', dotIdx + 1);
      const col = part.slice(0, dotIdx);
      const op  = part.slice(dotIdx + 1, dotIdx2);
      const val = part.slice(dotIdx2 + 1);
      if (op === 'ilike') {
        this._orClauses.push(`${col} LIKE ?`);
        this._orVals.push(val);
      }
    });
    return this;
  }
  order(col, { ascending = true } = {}) { this._order = `${col} ${ascending ? 'ASC' : 'DESC'}`; return this; }
  limit(n)   { this._limit = n; return this; }
  single()   { this._isSingle = true; return this; }

  _buildWhere() {
    const andClauses = [
      ...this._wheres.map(w => `${w.col} ${w.op} ?`),
      ...this._notNulls.map(c => `${c} IS NOT NULL`),
    ];
    const orPart = this._orClauses.length ? `(${this._orClauses.join(' OR ')})` : '';
    const all = [...andClauses, ...(orPart ? [orPart] : [])];
    return all.length ? 'WHERE ' + all.join(' AND ') : '';
  }
  _vals() { return [...this._wheres.map(w => w.val), ...this._orVals]; }

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
        const arr = Array.isArray(data) ? data : [data];
        const self = this;
        let lastId = null;
        const insertMany = this.db.transaction((items) => {
          for (const item of items) {
            const keys = Object.keys(item);
            const vals = keys.map(k => (typeof item[k] === 'object' && item[k] !== null) ? JSON.stringify(item[k]) : item[k]);
            const sql = `INSERT INTO ${self.table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`;
            const info = self.db.prepare(sql).run(...vals);
            lastId = info.lastInsertRowid;
          }
        });
        insertMany(arr);
        if (this._isSingle) {
          const row = lastId ? this.db.prepare(`SELECT * FROM ${this.table} WHERE rowid=?`).get(lastId) : null;
          if (row) {
            for (const k of ['items','score_breakdown']) {
              if (row[k] && typeof row[k] === 'string') { try { row[k] = JSON.parse(row[k]); } catch {} }
            }
          }
          return { data: row, error: null };
        }
        return { data: null, error: null };
      }

      if (mode === 'update') {
        const keys = Object.keys(data);
        const vals = [...keys.map(k => (typeof data[k] === 'object' && data[k] !== null) ? JSON.stringify(data[k]) : data[k]), ...this._vals()];
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

  then(resolve) { return this._run('select').then(resolve); }
  insert(data) {
    const arr = Array.isArray(data) ? data : [data];
    const self = this;
    const insertObj = {
      select: () => {
        // .insert([...]).select().single() — mark as single and return thenable
        return {
          single: () => {
            self._isSingle = true;
            return { then: (r) => self._run('insert', arr).then(r) };
          },
          then: (r) => self._run('insert', arr).then(r),
        };
      },
      single: () => { self._isSingle = true; return { then: (r) => self._run('insert', arr).then(r) }; },
      then: (r) => self._run('insert', arr).then(r),
    };
    return insertObj;
  }
  update(data) {
    const self = this;
    const makeChain = () => ({
      eq: (c, v) => { self.eq(c, v); return makeChain(); },
      select: () => ({
        single: () => {
          self._isSingle = true;
          return {
            then: async (r) => {
              await self._run('update', data);
              // Re-query the updated row
              const q = new TableQuery(self.db, self.table);
              self._wheres.forEach(w => q.eq(w.col, w.val));
              q._isSingle = true;
              return q._run('select').then(r);
            }
          };
        },
        then: async (r) => {
          await self._run('update', data);
          const q = new TableQuery(self.db, self.table);
          self._wheres.forEach(w => q.eq(w.col, w.val));
          return q._run('select').then(r);
        }
      }),
      then: (r) => self._run('update', data).then(r)
    });
    return makeChain();
  }
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
