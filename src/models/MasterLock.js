/**
 * MasterLock — manages master-password hashing and verification
 * using the Web Crypto API (PBKDF2 + SHA-256).
 * Hash is stored in localStorage (renderer-side only, no plaintext ever stored).
 */
export class MasterLock {
  static STORAGE_KEY = 'vault_master_hash';
  static SALT_KEY    = 'vault_master_salt';
  static ITERATIONS  = 100_000;

  /** Returns true if a master password has been set */
  static isConfigured() {
    return Boolean(localStorage.getItem(this.STORAGE_KEY));
  }

  /** Hash a password string → base64 string */
  static async hash(password, saltB64 = null) {
    const salt = saltB64
      ? this._b64ToBuffer(saltB64)
      : crypto.getRandomValues(new Uint8Array(16));

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: this.ITERATIONS, hash: 'SHA-256' },
      keyMaterial,
      256
    );

    return {
      hash:    this._bufferToB64(new Uint8Array(bits)),
      saltB64: this._bufferToB64(salt),
    };
  }

  /** Set a new master password (replaces any existing one) */
  static async set(password) {
    const { hash, saltB64 } = await this.hash(password);
    localStorage.setItem(this.STORAGE_KEY, hash);
    localStorage.setItem(this.SALT_KEY,    saltB64);
  }

  /** Verify a candidate password against the stored hash */
  static async verify(candidate) {
    const storedHash = localStorage.getItem(this.STORAGE_KEY);
    const saltB64    = localStorage.getItem(this.SALT_KEY);
    if (!storedHash || !saltB64) return false;
    const { hash } = await this.hash(candidate, saltB64);
    return hash === storedHash;
  }

  /** Remove the master password (unlock without one going forward) */
  static clear() {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.SALT_KEY);
  }

  static _bufferToB64(buf) {
    return btoa(String.fromCharCode(...buf));
  }
  static _b64ToBuffer(b64) {
    return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  }
}
