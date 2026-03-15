const path = require('path');
const fs   = require('fs');

/**
 * Database — SQLite-backed credential store using better-sqlite3.
 * Falls back to a JSON flat-file if better-sqlite3 is unavailable
 * (so the project works even without native modules during dev).
 */
class Database {
  constructor(userDataPath) {
    this.dbPath   = path.join(userDataPath, 'vault.db');
    this.jsonPath = path.join(userDataPath, 'vault.json');
    this.db       = null;
    this.useSqlite = false;
  }

  async init() {
    try {
      const BetterSqlite = require('better-sqlite3');
      this.db = new BetterSqlite(this.dbPath);
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS credentials (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          name       TEXT    NOT NULL,
          email      TEXT    NOT NULL,
          password   TEXT    NOT NULL,
          category   TEXT    NOT NULL DEFAULT 'Other',
          notes      TEXT             DEFAULT '',
          createdAt  INTEGER NOT NULL,
          updatedAt  INTEGER
        )
      `);
      this.useSqlite = true;
    } catch {
      // better-sqlite3 not available — use JSON fallback
      this._ensureJson();
    }
  }

  // ── JSON fallback helpers ────────────────────────────────
  _ensureJson() {
    if (!fs.existsSync(this.jsonPath)) {
      fs.writeFileSync(this.jsonPath, JSON.stringify({ entries: [], nextId: 1 }));
    }
  }

  _readJson() {
    return JSON.parse(fs.readFileSync(this.jsonPath, 'utf8'));
  }

  _writeJson(data) {
    fs.writeFileSync(this.jsonPath, JSON.stringify(data, null, 2));
  }

  // ── Public API ───────────────────────────────────────────
  getAll() {
    if (this.useSqlite) {
      return this.db.prepare('SELECT * FROM credentials ORDER BY id DESC').all();
    }
    return this._readJson().entries.slice().reverse();
  }

  add(entry) {
    const now = Date.now();
    if (this.useSqlite) {
      const stmt = this.db.prepare(
        'INSERT INTO credentials (name, email, password, category, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
      );
      const result = stmt.run(entry.name, entry.email, entry.password, entry.category, entry.notes || '', now);
      return { ...entry, id: result.lastInsertRowid, createdAt: now };
    }
    const data = this._readJson();
    const newEntry = { ...entry, id: data.nextId++, createdAt: now };
    data.entries.push(newEntry);
    this._writeJson(data);
    return newEntry;
  }

  update(entry) {
    const now = Date.now();
    if (this.useSqlite) {
      this.db.prepare(
        'UPDATE credentials SET name=?, email=?, password=?, category=?, notes=?, updatedAt=? WHERE id=?'
      ).run(entry.name, entry.email, entry.password, entry.category, entry.notes || '', now, entry.id);
      return { ...entry, updatedAt: now };
    }
    const data = this._readJson();
    const idx  = data.entries.findIndex(e => e.id === entry.id);
    if (idx !== -1) data.entries[idx] = { ...entry, updatedAt: now };
    this._writeJson(data);
    return data.entries[idx];
  }

  delete(id) {
    if (this.useSqlite) {
      this.db.prepare('DELETE FROM credentials WHERE id=?').run(id);
      return true;
    }
    const data = this._readJson();
    data.entries = data.entries.filter(e => e.id !== id);
    this._writeJson(data);
    return true;
  }
}

module.exports = Database;
