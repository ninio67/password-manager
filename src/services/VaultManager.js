import { Credential }  from '../models/Credential';
import { CryptoVault } from './CryptoVault';

/**
 * VaultManager — manages in-memory credential state and
 * delegates persistence to the Electron IPC bridge (window.vaultAPI).
 *
 * Encryption: all credential fields are AES-256-GCM encrypted before
 * being handed to the main process.  The main process / SQLite DB
 * never sees plaintext values.
 */
export class VaultManager {
  constructor() {
    this.entries    = [];
    this._cryptoKey = null;   // CryptoKey set at unlock time
  }

  get api() {
    return window.vaultAPI;
  }

  // ── Key management ──────────────────────────────────────

  /** Call once at unlock time with the verified master password. */
  async setMasterPassword(password) {
    this._masterPassword = password;
    this._cryptoKey = await CryptoVault.deriveKey(password);
  }

  /** Wipe the in-memory key on lock. */
  clearKey() {
    this._cryptoKey      = null;
    this._masterPassword = null;
    this.entries         = [];
  }

  _requireKey() {
    if (!this._cryptoKey) throw new Error('Vault is locked — no encryption key available.');
    return this._cryptoKey;
  }

  // ── CRUD ────────────────────────────────────────────────

  async loadAll() {
    const key    = this._requireKey();
    const raw    = await this.api.getAll();
    const decrypted = await Promise.all(raw.map(r => CryptoVault.decryptEntry(key, r)));
    this.entries = decrypted.map(r => new Credential(r));
    return this.entries;
  }

  async add(data) {
    const key  = this._requireKey();
    const cred = new Credential(data);
    if (!cred.isValid()) throw new Error('Name, email and password are required.');

    const plain     = cred.toPlain();
    const encrypted = await CryptoVault.encryptEntry(key, plain);
    const saved     = await this.api.add(encrypted);

    // Decrypt the saved record (it comes back with id/timestamps added)
    const decrypted = await CryptoVault.decryptEntry(key, saved);
    const full      = new Credential(decrypted);
    this.entries.unshift(full);
    return full;
  }

  async update(data) {
    const key  = this._requireKey();
    const cred = new Credential(data);
    if (!cred.isValid()) throw new Error('Name, email and password are required.');

    const plain     = cred.toPlain();
    const encrypted = await CryptoVault.encryptEntry(key, plain);
    const saved     = await this.api.update(encrypted);

    const decrypted = await CryptoVault.decryptEntry(key, saved);
    const idx       = this.entries.findIndex(e => e.id === cred.id);
    const full      = new Credential(decrypted);
    if (idx !== -1) this.entries[idx] = full;
    return full;
  }

  async delete(id) {
    await this.api.delete(id);
    this.entries = this.entries.filter(e => e.id !== id);
  }

  getCategories() {
    return [...new Set(this.entries.map(e => e.category))];
  }

  filtered(category, query) {
    let list = category === 'all'
      ? this.entries
      : this.entries.filter(e => e.category === category);

    if (query) {
      const q = query.toLowerCase();
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.notes.toLowerCase().includes(q)
      );
    }
    return list;
  }

  // ── Migration ────────────────────────────────────────────

  /**
   * On first unlock after CryptoVault is introduced, existing entries
   * will be plaintext. Detect and re-encrypt them in place.
   */
  async migrateIfNeeded() {
    const key = this._requireKey();
    const raw = await this.api.getAll();
    if (!raw.length) return;

    // An encrypted field always contains a '.' (base64 iv + ciphertext)
    // A plaintext field never looks like that for normal names/emails
    const needsMigration = raw.some(r =>
      r.name && !r.name.includes('.') && r.name.length < 100
    );

    if (!needsMigration) return;

    for (const entry of raw) {
      // Only migrate entries that look plaintext (no dot-separated base64)
      if (!entry.name || entry.name.includes('.')) continue;
      const encrypted = await CryptoVault.encryptEntry(key, {
        name:     entry.name,
        email:    entry.email,
        password: entry.password,
        category: entry.category,
        notes:    entry.notes,
      });
      await this.api.update({ ...encrypted, id: entry.id });
    }
  }

  // ── Export ───────────────────────────────────────────────

  /**
   * Export decrypted entries to JSON, CSV, or encrypted .vault.
   * File dialog + write handled by main process; decryption/encryption here.
   */
  async exportVault(format = 'vault') {
    const dialogResult = await this.api.exportDialog({ format });
    if (!dialogResult.ok) return dialogResult;

    const entries = this.entries; // already decrypted in memory
    let content;

    if (format === 'csv') {
      const header = 'name,email,password,category,notes';
      const rows   = entries.map(e =>
        [e.name, e.email, e.password, e.category, e.notes]
          .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`)
          .join(',')
      );
      content = [header, ...rows].join('\r\n');
    } else if (format === 'json') {
      content = JSON.stringify(
        entries.map(({ name, email, password, category, notes }) =>
          ({ name, email, password, category, notes })
        ),
        null, 2
      );
    } else {
      // Encrypted .vault format — requires master password
      const jsonPayload = JSON.stringify(
        entries.map(({ name, email, password, category, notes }) =>
          ({ name, email, password, category, notes })
        )
      );
      content = await CryptoVault.encryptExport(this._masterPassword, jsonPayload);
    }

    const writeResult = await this.api.writeFile({ filePath: dialogResult.filePath, content });
    if (!writeResult.ok) return writeResult;
    return { ok: true, count: entries.length };
  }

  // ── Import ───────────────────────────────────────────────

  /**
   * Import from .vault (encrypted), JSON, or CSV.
   * File read by main process, parsed + encrypted here before inserting into DB.
   */
  async importVault(mode = 'merge') {
    const key = this._requireKey();

    const fileResult = await this.api.importDialog();
    if (!fileResult.ok) return fileResult;

    const { content, ext } = fileResult;
    let rows = [];

    try {
      if (ext === '.vault') {
        // Decrypt the export file using the master password
        let jsonPayload;
        try {
          jsonPayload = await CryptoVault.decryptExport(this._masterPassword, content);
        } catch (err) {
          return { ok: false, reason: err.message };
        }
        const parsed = JSON.parse(jsonPayload);
        rows = Array.isArray(parsed) ? parsed : [];
      } else if (ext === '.json') {
        const parsed = JSON.parse(content);
        rows = Array.isArray(parsed) ? parsed : [];
      } else {
        // CSV parser
        const lines = content.split(/\r?\n/).filter(Boolean);
        const header = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
        for (let i = 1; i < lines.length; i++) {
          const cols = []; let cur = ''; let inQuote = false;
          for (const ch of lines[i]) {
            if (ch === '"') { inQuote = !inQuote; }
            else if (ch === ',' && !inQuote) { cols.push(cur); cur = ''; }
            else cur += ch;
          }
          cols.push(cur);
          const obj = {};
          header.forEach((h, idx) => { obj[h] = cols[idx] ?? ''; });
          rows.push(obj);
        }
      }
    } catch (err) {
      return { ok: false, reason: `Parse error: ${err.message}` };
    }

    const valid = rows.filter(r => r.name && r.email && r.password);
    if (!valid.length) return { ok: false, reason: 'No valid entries found. Each row needs name, email and password.' };

    if (mode === 'replace') {
      const existing = await this.api.getAll();
      for (const e of existing) await this.api.delete(e.id);
    }

    let imported = 0;
    for (const r of valid) {
      const plain = {
        name:     String(r.name     ?? '').trim(),
        email:    String(r.email    ?? '').trim(),
        password: String(r.password ?? ''),
        category: String(r.category ?? 'Other').trim() || 'Other',
        notes:    String(r.notes    ?? '').trim(),
      };
      const encrypted = await CryptoVault.encryptEntry(key, plain);
      await this.api.add(encrypted);
      imported++;
    }

    await this.loadAll();
    return { ok: true, count: imported };
  }
}
