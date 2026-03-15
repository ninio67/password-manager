import { useState } from 'react';

export function EntryRow({ entry, onEdit, onDelete, delay = 0 }) {
  const [pwVisible, setPwVisible] = useState(false);
  const [copied,    setCopied]    = useState(null);

  const copy = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 1400);
    });
  };

  const masked = '•'.repeat(Math.min(entry.password.length, 10));

  return (
    <div className="entry-row" style={{ animationDelay: `${delay}s` }}>
      {/* Name + category */}
      <div className="entry-left">
        <span className="entry-dot" />
        <div>
          <div className="entry-name">{entry.name}</div>
          <div className="entry-cat">{entry.category}</div>
        </div>
      </div>

      {/* Credentials */}
      <div className="entry-creds">
        {/* Email */}
        <div className="cred-line">
          <span className="cred-val" title={entry.email}>{entry.email}</span>
          <button className="icon-btn" title="Copy email" onClick={() => copy(entry.email, 'email')}>
            {copied === 'email' ? <CheckIcon /> : <CopyIcon />}
          </button>
        </div>
        {/* Password */}
        <div className="cred-line">
          <span className="cred-val">{pwVisible ? entry.password : masked}</span>
          <button className="icon-btn" title="Toggle" onClick={() => setPwVisible(v => !v)}>
            {pwVisible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
          <button className="icon-btn" title="Copy password" onClick={() => copy(entry.password, 'pw')}>
            {copied === 'pw' ? <CheckIcon /> : <CopyIcon />}
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="entry-actions">
        <button className="icon-btn" title="Edit"   onClick={() => onEdit(entry)}><EditIcon /></button>
        <button className="icon-btn danger" title="Delete" onClick={() => onDelete(entry.id)}><TrashIcon /></button>
      </div>
    </div>
  );
}

// ── inline SVG icons ──────────────────────────────────────
const EyeIcon    = () => <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const EyeOffIcon = () => <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
const CopyIcon   = () => <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
const CheckIcon  = () => <svg width="12" height="12" fill="none" stroke="#2ecc71" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>;
const EditIcon   = () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const TrashIcon  = () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>;
