/**
 * PasswordGenerator — generates cryptographically random passwords
 * using the Web Crypto API (works in both browser and Electron renderer).
 */
export class PasswordGenerator {
  static CHARS = {
    upper:   'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lower:   'abcdefghijklmnopqrstuvwxyz',
    digits:  '0123456789',
    symbols: '!@#$%^&*()-_=+[]{}|;:,.<>?',
  };

  /**
   * @param {object} opts
   * @param {number}  opts.length   - password length (8–64)
   * @param {boolean} opts.upper    - include uppercase
   * @param {boolean} opts.lower    - include lowercase
   * @param {boolean} opts.digits   - include digits
   * @param {boolean} opts.symbols  - include symbols
   */
  static generate({ length = 16, upper = true, lower = true, digits = true, symbols = true } = {}) {
    let pool = '';
    const required = [];

    if (upper)   { pool += this.CHARS.upper;   required.push(this.randomFrom(this.CHARS.upper)); }
    if (lower)   { pool += this.CHARS.lower;   required.push(this.randomFrom(this.CHARS.lower)); }
    if (digits)  { pool += this.CHARS.digits;  required.push(this.randomFrom(this.CHARS.digits)); }
    if (symbols) { pool += this.CHARS.symbols; required.push(this.randomFrom(this.CHARS.symbols)); }

    if (!pool) throw new Error('Select at least one character type.');

    // Fill remaining length with random pool chars
    const remaining = length - required.length;
    const rest = Array.from({ length: remaining }, () => this.randomFrom(pool));

    // Shuffle required + rest together using Fisher-Yates
    const all = [...required, ...rest];
    for (let i = all.length - 1; i > 0; i--) {
      const j = this.randomInt(i + 1);
      [all[i], all[j]] = [all[j], all[i]];
    }

    return all.join('');
  }

  /** Cryptographically random integer in [0, max) */
  static randomInt(max) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] % max;
  }

  /** Pick one random character from a string */
  static randomFrom(str) {
    return str[this.randomInt(str.length)];
  }
}
