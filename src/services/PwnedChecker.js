/**
 * PwnedChecker — checks passwords against the HaveIBeenPwned
 * Pwned Passwords API using the k-anonymity model.
 *
 * Privacy guarantee: only the first 5 characters of the SHA-1
 * hash are ever sent over the network. The full hash (and the
 * original password) never leave the device.
 *
 * API docs: https://haveibeenpwned.com/API/v3#PwnedPasswords
 */
export class PwnedChecker {
  static BASE = 'https://api.pwnedpasswords.com/range/';

  /**
   * Returns how many times this password has appeared in
   * known breaches, or 0 if it has not been seen.
   *
   * @param {string} password
   * @returns {Promise<number>}
   */
  static async checkPassword(password) {
    const hash   = await this._sha1(password);
    const prefix = hash.slice(0, 5).toUpperCase();
    const suffix = hash.slice(5).toUpperCase();

    const res = await fetch(`${this.BASE}${prefix}`, {
      headers: { 'Add-Padding': 'true' },   // padding hides response size
    });

    if (!res.ok) throw new Error(`HIBP API error: ${res.status}`);

    const text = await res.text();
    for (const line of text.split('\r\n')) {
      const [lineSuffix, countStr] = line.split(':');
      if (lineSuffix === suffix) {
        return parseInt(countStr, 10);
      }
    }
    return 0;
  }

  /**
   * Check multiple passwords. Returns a Map<password, count>.
   * Deduplicates so identical passwords are only fetched once.
   *
   * @param {string[]} passwords
   * @param {{ onProgress?: (done: number, total: number) => void }} opts
   * @returns {Promise<Map<string, number>>}
   */
  static async checkMany(passwords, { onProgress } = {}) {
    const unique  = [...new Set(passwords)];
    const results = new Map();
    let done = 0;

    for (const pw of unique) {
      try {
        results.set(pw, await this.checkPassword(pw));
      } catch {
        results.set(pw, -1);   // -1 = check failed (offline / API down)
      }
      done++;
      onProgress?.(done, unique.length);
    }

    return results;
  }

  /**
   * SHA-1 using the Web Crypto API (available in Electron renderer).
   * @param {string} str
   * @returns {Promise<string>} hex string
   */
  static async _sha1(str) {
    const buf    = new TextEncoder().encode(str);
    const digest = await crypto.subtle.digest('SHA-1', buf);
    return Array.from(new Uint8Array(digest))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
