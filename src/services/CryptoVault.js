/**
 * CryptoVault — AES-256-GCM encryption layer for vault credentials.
 *
 * Key derivation:  PBKDF2 (SHA-256, 200 000 iterations) → 256-bit AES-GCM key
 * Encryption:      AES-256-GCM with a random 12-byte IV per encrypt call
 * Storage format:  base64(iv) + "." + base64(ciphertext+tag)
 *
 * The derived key lives only in memory for the session lifetime.
 * The main process / SQLite store only ever sees ciphertext.
 */
export class CryptoVault {
  static PBKDF2_ITERATIONS = 200_000;
  static SALT_KEY          = 'vault_enc_salt';   // localStorage — salt is not secret

  // ── Key derivation ──────────────────────────────────────

  /**
   * Derive (or re-derive) an AES-GCM CryptoKey from the master password.
   * Call this once at unlock time; keep the returned key in memory.
   */
  static async deriveKey(masterPassword) {
    const salt = CryptoVault._getOrCreateSalt();

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(masterPassword),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name:       'PBKDF2',
        salt:       CryptoVault._b64ToBuffer(salt),
        iterations: CryptoVault.PBKDF2_ITERATIONS,
        hash:       'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,          // not extractable
      ['encrypt', 'decrypt']
    );
  }

  // ── Encrypt / Decrypt ───────────────────────────────────

  /**
   * Encrypt a plain-text string.
   * Returns a portable string:  base64(iv) + "." + base64(ciphertext)
   */
  static async encrypt(key, plaintext) {
    const iv         = crypto.getRandomValues(new Uint8Array(12));
    const encoded    = new TextEncoder().encode(plaintext);
    const cipherBuf  = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

    return CryptoVault._bufferToB64(iv) + '.' + CryptoVault._bufferToB64(new Uint8Array(cipherBuf));
  }

  /**
   * Decrypt a string produced by encrypt().
   * Throws DOMException (OperationError) if the key is wrong or data is tampered.
   */
  static async decrypt(key, token) {
    const [ivB64, ctB64] = token.split('.');
    if (!ivB64 || !ctB64) throw new Error('Invalid ciphertext format');

    const iv        = CryptoVault._b64ToBuffer(ivB64);
    const ctBuf     = CryptoVault._b64ToBuffer(ctB64);
    const plainBuf  = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ctBuf);

    return new TextDecoder().decode(plainBuf);
  }

  // ── Encrypt / decrypt a full credential object ──────────

  /**
   * Fields that are encrypted at rest.
   * name / category / notes are also encrypted so the DB reveals nothing.
   */
  static ENCRYPTED_FIELDS = ['name', 'email', 'password', 'category', 'notes'];

  /** Returns a copy of the entry with sensitive fields replaced by ciphertext. */
  static async encryptEntry(key, entry) {
    const out = { ...entry };
    for (const field of CryptoVault.ENCRYPTED_FIELDS) {
      if (out[field] != null) {
        out[field] = await CryptoVault.encrypt(key, String(out[field]));
      }
    }
    return out;
  }

  /** Returns a copy of the entry with ciphertext fields decrypted back to plaintext. */
  static async decryptEntry(key, entry) {
    const out = { ...entry };
    for (const field of CryptoVault.ENCRYPTED_FIELDS) {
      if (out[field] != null && out[field].includes('.')) {
        try {
          out[field] = await CryptoVault.decrypt(key, out[field]);
        } catch {
          out[field] = '';  // tampered / wrong key — blank rather than crash
        }
      }
    }
    return out;
  }

  // ── Export / Import encryption ──────────────────────────

  /**
   * Encrypt a full export payload (JSON string) into a self-contained
   * .vault file format:
   *
   *   vault:1:<base64(salt)>:<base64(iv)>:<base64(ciphertext)>
   *
   * A fresh random salt + IV are used so the file can be decrypted on
   * any machine — the user only needs their master password.
   */
  static async encryptExport(masterPassword, jsonPayload) {
    // Fresh random salt (32 bytes) — independent of the local vault salt
    const salt = crypto.getRandomValues(new Uint8Array(32));
    const saltB64 = CryptoVault._bufferToB64(salt);

    // Derive a key from the master password + this export salt
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(masterPassword),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    const exportKey = await crypto.subtle.deriveKey(
      {
        name:       'PBKDF2',
        salt:       salt,
        iterations: CryptoVault.PBKDF2_ITERATIONS,
        hash:       'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    const iv       = crypto.getRandomValues(new Uint8Array(12));
    const encoded  = new TextEncoder().encode(jsonPayload);
    const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, exportKey, encoded);

    const ivB64   = CryptoVault._bufferToB64(iv);
    const ctB64   = CryptoVault._bufferToB64(new Uint8Array(cipherBuf));

    return `vault:1:${saltB64}:${ivB64}:${ctB64}`;
  }

  /**
   * Decrypt a .vault file string produced by encryptExport().
   * Returns the original JSON string, or throws on wrong password / tampered data.
   */
  static async decryptExport(masterPassword, vaultFileContent) {
    const parts = vaultFileContent.trim().split(':');
    if (parts.length !== 5 || parts[0] !== 'vault' || parts[1] !== '1') {
      throw new Error('Invalid or unsupported .vault file format.');
    }
    const [, , saltB64, ivB64, ctB64] = parts;

    const salt = CryptoVault._b64ToBuffer(saltB64);
    const iv   = CryptoVault._b64ToBuffer(ivB64);
    const ct   = CryptoVault._b64ToBuffer(ctB64);

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(masterPassword),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    const exportKey = await crypto.subtle.deriveKey(
      {
        name:       'PBKDF2',
        salt:       salt,
        iterations: CryptoVault.PBKDF2_ITERATIONS,
        hash:       'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    let plainBuf;
    try {
      plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, exportKey, ct);
    } catch {
      throw new Error('Decryption failed — wrong master password or corrupted file.');
    }

    return new TextDecoder().decode(plainBuf);
  }

  // ── Salt management ─────────────────────────────────────

  /** Read existing salt or create and persist a new one. */
  static _getOrCreateSalt() {
    let salt = localStorage.getItem(CryptoVault.SALT_KEY);
    if (!salt) {
      const buf = crypto.getRandomValues(new Uint8Array(32));
      salt = CryptoVault._bufferToB64(buf);
      localStorage.setItem(CryptoVault.SALT_KEY, salt);
    }
    return salt;
  }

  // ── Helpers ─────────────────────────────────────────────

  static _bufferToB64(buf) {
    return btoa(String.fromCharCode(...buf));
  }

  static _b64ToBuffer(b64) {
    return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  }
}
