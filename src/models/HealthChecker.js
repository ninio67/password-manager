/**
 * HealthChecker — analyses a list of Credential objects and
 * returns per-entry issues plus an overall score.
 */
export class HealthChecker {
  static STRENGTH_THRESHOLD = 3; // below this = weak

  /**
   * @param {Credential[]} entries
   * @returns {{ issues: Map<number, string[]>, score: number, counts: object }}
   */
  static analyse(entries) {
    const issues = new Map(); // id → string[]
    const pwCount = new Map(); // password → id[]

    // First pass: collect duplicates
    for (const e of entries) {
      const norm = e.password.trim();
      if (!pwCount.has(norm)) pwCount.set(norm, []);
      pwCount.get(norm).push(e.id);
    }

    // Second pass: flag each entry
    for (const e of entries) {
      const list = [];

      // Weak password
      if (this._strength(e.password) < this.STRENGTH_THRESHOLD) {
        list.push('weak');
      }

      // Reused password
      const dupeIds = pwCount.get(e.password.trim()) ?? [];
      if (dupeIds.length > 1) {
        list.push('reused');
      }

      // Very short
      if (e.password.length < 8) {
        list.push('short');
      }

      if (list.length) issues.set(e.id, list);
    }

    const affected = issues.size;
    const score = entries.length === 0
      ? 100
      : Math.round(((entries.length - affected) / entries.length) * 100);

    const counts = {
      weak:   [...issues.values()].filter(v => v.includes('weak')).length,
      reused: [...issues.values()].filter(v => v.includes('reused')).length,
      short:  [...issues.values()].filter(v => v.includes('short')).length,
      total:  affected,
    };

    return { issues, score, counts };
  }

  static _strength(pw) {
    let s = 0;
    if (pw.length >= 8)           s++;
    if (pw.length >= 12)          s++;
    if (/[A-Z]/.test(pw))        s++;
    if (/[0-9]/.test(pw))        s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  }
}
