import { useMemo, useState, useCallback } from 'react';
import { HealthChecker } from '../models/HealthChecker';
import { PwnedChecker }  from '../services/PwnedChecker';

const ISSUE_LABEL = { weak: 'Weak', reused: 'Reused', short: 'Too short', pwned: 'Breached' };
const ISSUE_COLOR = { weak: '#e67e22', reused: '#c0392b', short: '#e74c3c', pwned: '#e03c3c' };

// ── Score ring ────────────────────────────────────────────
function ScoreRing({ score }) {
  const r    = 28;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 80 ? '#3ecf8e' : score >= 50 ? '#f4c542' : '#e03c3c';

  return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={r} fill="none" stroke="var(--border)" strokeWidth="4" />
      <circle
        cx="36" cy="36" r={r}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="butt"
        transform="rotate(-90 36 36)"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text x="36" y="40" textAnchor="middle" fontSize="15" fontWeight="500"
        fontFamily="'IBM Plex Mono', monospace" fill="var(--text)">
        {score}
      </text>
    </svg>
  );
}

// ── Progress bar ──────────────────────────────────────────
function ScanProgress({ done, total }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="hibp-progress-wrap">
      <div className="hibp-progress-bar">
        <div className="hibp-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="hibp-progress-label">
        Checking {done} / {total}…
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────
export function HealthPanel({ entries, onEdit, onClose }) {

  // Local analysis (sync)
  const { issues: localIssues, score: localScore, counts: localCounts } = useMemo(
    () => HealthChecker.analyse(entries),
    [entries]
  );

  // HIBP state
  const [pwnedMap,    setPwnedMap]    = useState(null);   // Map<password, count> | null
  const [scanning,    setScanning]    = useState(false);
  const [scanDone,    setScanDone]    = useState(0);
  const [scanTotal,   setScanTotal]   = useState(0);
  const [scanError,   setScanError]   = useState('');

  // Merge local issues + pwned issues
  const { issues, score, counts } = useMemo(() => {
    if (!pwnedMap) return { issues: localIssues, score: localScore, counts: localCounts };

    // Clone local issues
    const merged = new Map([...localIssues].map(([id, tags]) => [id, [...tags]]));

    for (const e of entries) {
      const count = pwnedMap.get(e.password);
      if (count && count > 0) {
        const existing = merged.get(e.id) ?? [];
        if (!existing.includes('pwned')) existing.push('pwned');
        merged.set(e.id, existing);
      }
    }

    const affected = merged.size;
    const newScore = entries.length === 0
      ? 100
      : Math.round(((entries.length - affected) / entries.length) * 100);

    const newCounts = {
      weak:   [...merged.values()].filter(v => v.includes('weak')).length,
      reused: [...merged.values()].filter(v => v.includes('reused')).length,
      short:  [...merged.values()].filter(v => v.includes('short')).length,
      pwned:  [...merged.values()].filter(v => v.includes('pwned')).length,
      total:  affected,
    };

    return { issues: merged, score: newScore, counts: newCounts };
  }, [pwnedMap, localIssues, localScore, localCounts, entries]);

  const flagged = entries.filter(e => issues.has(e.id));

  // Run HIBP scan
  const runScan = useCallback(async () => {
    setScanError('');
    setScanning(true);
    setScanDone(0);
    const passwords = entries.map(e => e.password);
    setScanTotal([...new Set(passwords)].length);
    try {
      const map = await PwnedChecker.checkMany(passwords, {
        onProgress: (done, total) => {
          setScanDone(done);
          setScanTotal(total);
        },
      });
      setPwnedMap(map);
      const failed = [...map.values()].filter(v => v === -1).length;
      if (failed > 0) setScanError(`${failed} password${failed > 1 ? 's' : ''} couldn't be checked (network issue).`);
    } catch (err) {
      setScanError('Breach scan failed. Check your connection and try again.');
    } finally {
      setScanning(false);
    }
  }, [entries]);

  const pwnedCount = counts.pwned ?? 0;
  const scanRan    = pwnedMap !== null;

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal health-modal">

        {/* Header */}
        <div className="modal-header">
          <span className="modal-title">Password Health</span>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {/* Score + stats */}
        <div className="health-score-row">
          <ScoreRing score={score} />
          <div className="health-score-info">
            <div className="health-score-label">Security score</div>
            <div className="health-stats">
              {counts.pwned  > 0 && <span className="health-badge" style={{ color: ISSUE_COLOR.pwned  }}>⚠ {counts.pwned} breached</span>}
              {counts.weak   > 0 && <span className="health-badge" style={{ color: ISSUE_COLOR.weak   }}>⚠ {counts.weak} weak</span>}
              {counts.reused > 0 && <span className="health-badge" style={{ color: ISSUE_COLOR.reused }}>⚠ {counts.reused} reused</span>}
              {counts.short  > 0 && <span className="health-badge" style={{ color: ISSUE_COLOR.short  }}>⚠ {counts.short} too short</span>}
              {counts.total  === 0 && <span className="health-badge" style={{ color: '#3ecf8e' }}>✓ All passwords look good</span>}
            </div>
          </div>
        </div>

        {/* HIBP breach check panel */}
        <div className="hibp-panel">
          <div className="hibp-header">
            <div className="hibp-title-row">
              <span className="hibp-title">Breach Check</span>
              <a
                className="hibp-link"
                href="https://haveibeenpwned.com"
                target="_blank"
                rel="noreferrer"
              >
                via HaveIBeenPwned ↗
              </a>
            </div>
            <p className="hibp-desc">
              Checks your passwords against {' '}
              <strong>billions of leaked credentials</strong> using a
              privacy-safe k-anonymity model — your passwords never leave this device.
            </p>
          </div>

          {/* Progress / action area */}
          {scanning ? (
            <ScanProgress done={scanDone} total={scanTotal} />
          ) : (
            <button
              className={`hibp-scan-btn${scanRan ? ' hibp-scan-btn--rescan' : ''}`}
              onClick={runScan}
              disabled={entries.length === 0}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              {scanRan ? 'Re-scan passwords' : 'Scan for breaches'}
            </button>
          )}

          {/* Error message */}
          {scanError && !scanning && (
            <p className="hibp-error">{scanError}</p>
          )}

          {/* Breach summary after scan */}
          {scanRan && !scanning && (
            <div className={`hibp-result ${pwnedCount > 0 ? 'hibp-result--danger' : 'hibp-result--ok'}`}>
              {pwnedCount > 0 ? (
                <>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <strong>{pwnedCount} password{pwnedCount > 1 ? 's' : ''}</strong> found in known data breaches. Change them immediately.
                </>
              ) : (
                <>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <polyline points="9 12 11 14 15 10"/>
                  </svg>
                  None of your passwords were found in known breaches.
                </>
              )}
            </div>
          )}
        </div>

        {/* Flagged entries */}
        {flagged.length > 0 && (
          <div className="health-list">
            {flagged.map(e => {
              const tags       = issues.get(e.id) ?? [];
              const pwnedCount = pwnedMap?.get(e.password);
              return (
                <div key={e.id} className="health-row">
                  <div className="health-row-left">
                    <div className="entry-name">{e.name}</div>
                    <div className="health-tags">
                      {tags.map(tag => (
                        <span key={tag} className="health-tag" style={{ color: ISSUE_COLOR[tag] }}>
                          {tag === 'pwned' && pwnedCount > 0
                            ? `Seen ${pwnedCount.toLocaleString()}× in breaches`
                            : ISSUE_LABEL[tag]
                          }
                        </span>
                      ))}
                    </div>
                  </div>
                  <button className="btn-fix" onClick={() => { onEdit(e); onClose(); }}>Fix →</button>
                </div>
              );
            })}
          </div>
        )}

        {flagged.length === 0 && !scanning && (
          <div className="health-empty">
            <p>{scanRan ? 'No issues found. Vault is secure.' : 'No local issues found.'}</p>
          </div>
        )}

      </div>
    </div>
  );
}
