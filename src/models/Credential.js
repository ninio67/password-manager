/**
 * Credential — value object representing one stored credential.
 */
export class Credential {
  constructor({ id = null, name, email, password, category = 'Other', notes = '', createdAt, updatedAt } = {}) {
    this.id        = id;
    this.name      = String(name ?? '').trim();
    this.email     = String(email ?? '').trim();
    this.password  = String(password ?? '');
    this.category  = category;
    this.notes     = String(notes ?? '').trim();
    this.createdAt = createdAt ?? Date.now();
    this.updatedAt = updatedAt ?? null;
  }

  isValid() {
    return this.name.length > 0 && this.email.length > 0 && this.password.length > 0;
  }

  toPlain() {
    const o = {
      name:     this.name,
      email:    this.email,
      password: this.password,
      category: this.category,
      notes:    this.notes,
    };
    if (this.id != null) o.id = this.id;
    return o;
  }
}
