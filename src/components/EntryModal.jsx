import { useState, useEffect, useRef } from 'react';
import { PasswordGenerator } from '../models/PasswordGenerator';

const CATEGORIES = ['Streaming', 'Social', 'Gaming', 'Finance', 'Shopping', 'Work', 'Other'];

function passwordStrength(pw) {
  let s = 0;
  if (pw.length >= 8)           s++;
  if (pw.length >= 12)          s++;
  if (/[A-Z]/.test(pw))        s++;
  if (/[0-9]/.test(pw))        s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

const STRENGTH_COLORS = ['#e74c3c','#e67e22','#f1c40f','#2ecc71','#27ae60'];
const STRENGTH_LABELS = ['Very weak','Weak','Fair','Strong','Very strong'];

export function EntryModal({ entry, onSave, onClose }) {
  const isEdit = Boolean(entry?.id);

  const [form, setForm] = useState({
    name:     entry?.name     ?? '',
    email:    entry?.email    ?? '',
    password: entry?.password ?? '',
    category: entry?.category ?? 'Other',
    notes:    entry?.notes    ?? '',
  });
  const [showPw,    setShowPw]    = useState(false);
  const [showGen,   setShowGen]   = useState(false);
  const [error,     setError]     = useState('');

  // Generator state
  const [genOpts, setGenOpts] = useState({ length: 16, upper: true, lower: true, digits: true, symbols: true });
  const [preview,  setPreview]  = useState('');
  const [copied,   setCopied]   = useState(false);

  const nameRef = useRef(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  // Re-generate preview whenever options change
  useEffect(() => {
    if (!showGen) return;
    try { setPreview(PasswordGenerator.generate(genOpts)); }
    catch { setPreview(''); }
  }, [genOpts, showGen]);

  const set    = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setOpt = (k, v) => setGenOpts(o => ({ ...o, [k]: v }));

  const regenerate = () => {
    try { setPreview(PasswordGenerator.generate(genOpts)); setCopied(false); }
    catch { /* at least one type must be selected */ }
  };

  const useGenerated = () => {
    set('password', preview);
    setShowGen(false);
    setShowPw(true);
  };

  const copyPreview = () => {
    navigator.clipboard.writeText(preview).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError('Name, email and password are required.');
      return;
    }
    try {
      await onSave(isEdit ? { ...form, id: entry.id } : form);
      onClose();
    } catch (e) {
      setError(e.message);
    }
  };

  const strength = passwordStrength(form.password);
  const strengthColor = form.password ? STRENGTH_COLORS[strength - 1] || STRENGTH_COLORS[0] : 'transparent';

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{isEdit ? 'Edit entry' : 'New entry'}</span>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="two-col">
          <div className="field">
            <label className="field-label">Service</label>
            <input ref={nameRef} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Netflix" />
          </div>
          <div className="field">
            <label className="field-label">Category</label>
            <select value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="field">
          <label className="field-label">Email / Username</label>
          <input type="text" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@email.com" />
        </div>

        {/* ── Password field ── */}
        <div className="field">
          <div className="pw-label-row">
            <label className="field-label">Password</label>
            <button className="gen-toggle" onClick={() => { setShowGen(v => !v); setCopied(false); }}>
              {showGen ? 'hide generator' : 'generate'}
            </button>
          </div>
          <div className="pw-wrap">
            <input
              type={showPw ? 'text' : 'password'}
              value={form.password}
              onChange={e => set('password', e.target.value)}
              placeholder="••••••••"
            />
            <button className="pw-eye" type="button" onClick={() => setShowPw(v => !v)}>
              {showPw
                ? <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                : <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              }
            </button>
          </div>
          <div className="strength-track">
            <div className="strength-fill" style={{ width: form.password ? `${(strength / 5) * 100}%` : '0%', background: strengthColor }} />
          </div>
          {form.password && (
            <div className="strength-label" style={{ color: strengthColor }}>
              {STRENGTH_LABELS[strength - 1] ?? 'Very weak'}
            </div>
          )}
        </div>

        {/* ── Generator panel ── */}
        {showGen && (
          <div className="gen-panel">
            {/* Preview */}
            <div className="gen-preview">
              <span className="gen-preview-text">{preview}</span>
              <div className="gen-preview-actions">
                <button className="icon-btn" title="Copy" onClick={copyPreview}>
                  {copied
                    ? <svg width="13" height="13" fill="none" stroke="#2ecc71" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                    : <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  }
                </button>
                <button className="icon-btn" title="Regenerate" onClick={regenerate}>
                  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                </button>
              </div>
            </div>

            {/* Length slider */}
            <div className="gen-row">
              <span className="gen-opt-label">Length</span>
              <input
                className="gen-slider"
                type="range" min="8" max="64"
                value={genOpts.length}
                onChange={e => setOpt('length', Number(e.target.value))}
              />
              <span className="gen-num">{genOpts.length}</span>
            </div>

            {/* Toggles */}
            <div className="gen-toggles">
              {[['upper','ABC'],['lower','abc'],['digits','123'],['symbols','!@#']].map(([k, label]) => (
                <button
                  key={k}
                  className={`gen-chip${genOpts[k] ? ' on' : ''}`}
                  onClick={() => setOpt(k, !genOpts[k])}
                >
                  {label}
                </button>
              ))}
            </div>

            <button className="btn-use" onClick={useGenerated}>Use this password</button>
          </div>
        )}

        <div className="field">
          <label className="field-label">Notes</label>
          <input type="text" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional…" />
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save"   onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
