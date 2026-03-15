import { useState } from 'react';

/**
 * ImportExportPanel — modal panel for exporting and importing credentials.
 */
export function ImportExportPanel({ onExport, onImport, onClose }) {
  const [importMode, setImportMode] = useState('merge');
  const [busy,       setBusy]       = useState(false);

  const handleExport = async (fmt) => {
    setBusy(true);
    await onExport(fmt);
    setBusy(false);
  };

  const handleImport = async () => {
    setBusy(true);
    await onImport(importMode);
    setBusy(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal ie-panel" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">Import / Export</h2>
          <button className="modal-close" onClick={onClose} title="Close">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Export section */}
        <section className="ie-section">
          <div className="ie-section-label">Export</div>
          <p className="ie-desc">
            Save all your credentials to a file.
          </p>
          <div className="ie-row">
            <button
              className="ie-btn ie-btn-primary"
              disabled={busy}
              onClick={() => handleExport('vault')}
              title="Encrypted with your master password — only readable by Vault"
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Export as .vault
            </button>
            <button
              className="ie-btn"
              disabled={busy}
              onClick={() => handleExport('json')}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export as JSON
            </button>
            <button
              className="ie-btn"
              disabled={busy}
              onClick={() => handleExport('csv')}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export as CSV
            </button>
          </div>
          <p className="ie-hint">
            <strong>.vault</strong> files are AES-256 encrypted with your master password.
            JSON and CSV are plain-text — keep them secure.
            CSV is compatible with 1Password, Bitwarden, etc.
          </p>
        </section>

        <div className="ie-divider"/>

        {/* Import section */}
        <section className="ie-section">
          <div className="ie-section-label">Import</div>
          <p className="ie-desc">
            Load credentials from a <strong>.vault</strong>, <strong>.json</strong>, or <strong>.csv</strong> file.
            Encrypted <strong>.vault</strong> files will be decrypted automatically using your master password.
          </p>

          {/* Import mode radio */}
          <div className="ie-radio-group">
            <label className={`ie-radio${importMode === 'merge' ? ' selected' : ''}`}>
              <input
                type="radio"
                name="importMode"
                value="merge"
                checked={importMode === 'merge'}
                onChange={() => setImportMode('merge')}
              />
              <span className="ie-radio-dot"/>
              <span>
                <strong>Merge</strong>
                <span className="ie-radio-sub"> — add imported entries alongside existing ones</span>
              </span>
            </label>
            <label className={`ie-radio${importMode === 'replace' ? ' selected' : ''}`}>
              <input
                type="radio"
                name="importMode"
                value="replace"
                checked={importMode === 'replace'}
                onChange={() => setImportMode('replace')}
              />
              <span className="ie-radio-dot"/>
              <span>
                <strong>Replace</strong>
                <span className="ie-radio-sub"> — delete all existing entries first</span>
              </span>
            </label>
          </div>

          {importMode === 'replace' && (
            <div className="ie-warning">
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              This will permanently delete all current entries before importing.
            </div>
          )}

          <button
            className="ie-btn ie-btn-primary"
            disabled={busy}
            onClick={handleImport}
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Choose file &amp; import…
          </button>
        </section>

      </div>
    </div>
  );
}
