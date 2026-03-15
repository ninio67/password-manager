import { useState, useRef, useEffect } from 'react';
import { MasterLock } from '../models/MasterLock';

export function LockScreen({ onUnlock }) {
  const isNew = !MasterLock.isConfigured();

  const [pw,      setPw]      = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw,  setShowPw]  = useState(false);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = async () => {
    if (!pw) return;
    setLoading(true);
    setError('');

    try {
      if (isNew) {
        if (pw.length < 6) { setError('At least 6 characters required.'); setLoading(false); return; }
        if (pw !== confirm) { setError('Passwords do not match.'); setLoading(false); return; }
        await MasterLock.set(pw);
        onUnlock(pw);
      } else {
        const ok = await MasterLock.verify(pw);
        if (ok) {
          onUnlock(pw);
        } else {
          setError('Incorrect password.');
          setPw('');
          inputRef.current?.focus();
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const onKey = e => { if (e.key === 'Enter') handleSubmit(); };

  return (
    <div className="lock-screen">
      <div className="lock-box">
        <div className="lock-icon">
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            {/* Hex ring - outer */}
            <polygon points="50,3 95,27.5 95,72.5 50,97 5,72.5 5,27.5" fill="#f0a500"/>
            {/* Hex ring - inner cutout */}
            <polygon points="50,14 84,33 84,67 50,86 16,67 16,33" fill="#1a1a1a"/>
            {/* Amber diamond */}
            <polygon points="50,26 74,50 50,74 26,50" fill="#f0a500"/>
            {/* Dark inner square */}
            <polygon points="50,40 63,53 50,66 37,53" fill="#1a1a1a"/>
          </svg>
        </div>
        <div className="lock-wordmark">Vault</div>
        <p className="lock-sub">{isNew ? 'Set a master password to protect your vault' : 'Enter your master password'}</p>

        <div className="lock-field">
          <div className="pw-wrap">
            <input
              ref={inputRef}
              type={showPw ? 'text' : 'password'}
              placeholder={isNew ? 'Choose a password…' : 'Master password…'}
              value={pw}
              onChange={e => setPw(e.target.value)}
              onKeyDown={onKey}
              className="lock-input"
            />
            <button className="pw-eye" type="button" onClick={() => setShowPw(v => !v)}>
              {showPw
                ? <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                : <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              }
            </button>
          </div>
        </div>

        {isNew && (
          <div className="lock-field">
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="Confirm password…"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onKeyDown={onKey}
              className="lock-input"
            />
          </div>
        )}

        {error && <p className="lock-error">{error}</p>}

        <button className="lock-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? '…' : isNew ? 'Set password & unlock' : 'Unlock'}
        </button>


      </div>
    </div>
  );
}
