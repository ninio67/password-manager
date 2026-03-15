import { useState, useEffect, useCallback, useRef } from 'react';
import { useVault }              from './hooks/useVault';
import { EntryRow }              from './components/EntryRow';
import { EntryModal }            from './components/EntryModal';
import { LockScreen }            from './components/LockScreen';
import { HealthPanel }           from './components/HealthPanel';
import { ImportExportPanel }     from './components/ImportExportPanel';
import { DeleteConfirmModal }  from './components/DeleteConfirmModal';

export default function App() {
  const {
    loading, filter, setFilter,
    query,   setQuery,
    categories, filtered,
    entries,
    unlock, lockVault,
    addEntry, updateEntry, deleteEntry,
    exportVault, importVault,
    toast,
  } = useVault();

  // ── Auth state ──────────────────────────────────────────
  const [unlocked,    setUnlocked]    = useState(false);

  // ── UI state ────────────────────────────────────────────
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editTarget,  setEditTarget]  = useState(null);
  const [deleteTarget,setDeleteTarget]= useState(null);
  const [healthOpen,  setHealthOpen]  = useState(false);
  const [ieOpen,      setIeOpen]      = useState(false);
  const [light,       setLight]       = useState(
    () => localStorage.getItem('vault_theme') === 'light'
  );

  // Dark is default; add 'light' class to toggle
  useEffect(() => {
    document.documentElement.classList.toggle('light', light);
    localStorage.setItem('vault_theme', light ? 'light' : 'dark');
  }, [light]);

  const searchRef = useRef(null);

  // ── Keyboard shortcuts ───────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const mod = e.ctrlKey || e.metaKey;

      // Escape — close any open modal
      if (e.key === 'Escape') {
        if (modalOpen)      { closeModal();                    return; }
        if (deleteTarget)   { setDeleteTarget(null);           return; }
        if (healthOpen)     { setHealthOpen(false);            return; }
        if (ieOpen)         { setIeOpen(false);                return; }
      }

      // Don't fire shortcuts when typing in an input
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (mod && e.key === 'n') { e.preventDefault(); openAdd();              return; }
      if (mod && e.key === 'f') { e.preventDefault(); searchRef.current?.focus(); return; }
      if (mod && e.key === 'l') { e.preventDefault(); lock();                 return; }
      if (mod && e.key === ',') { e.preventDefault(); setHealthOpen(true);    return; }
      if (mod && e.key === 'i') { e.preventDefault(); setIeOpen(true);        return; }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [modalOpen, deleteTarget, healthOpen, ieOpen]);
  const openAdd    = ()      => { setEditTarget(null); setModalOpen(true); };
  const openEdit   = (entry) => { setEditTarget(entry); setModalOpen(true); };
  const closeModal = ()      => { setModalOpen(false); setEditTarget(null); };
  const handleSave = (data)  => editTarget ? updateEntry(data) : addEntry(data);
  const handleDelete = (id) => {
    const entry = entries.find(e => e.id === id);
    if (entry) setDeleteTarget(entry);
  };
  const confirmDelete = async () => {
    if (deleteTarget) await deleteEntry(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleUnlock = async (password) => {
    await unlock(password);
    setUnlocked(true);
  };

  const lock = () => {
    lockVault();
    setUnlocked(false);
  };

  if (!unlocked) return <LockScreen onUnlock={handleUnlock} />;

  return (
    <div className="app">
      {/* Header */}
      <header>
        <div className="wordmark">
          <svg width="18" height="18" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            {/* Hex ring - outer */}
            <polygon points="50,3 95,27.5 95,72.5 50,97 5,72.5 5,27.5" fill="#f0a500"/>
            {/* Hex ring - inner cutout (dark background) */}
            <polygon points="50,14 84,33 84,67 50,86 16,67 16,33" fill="#0e0e0e"/>
            {/* Amber diamond */}
            <polygon points="50,26 74,50 50,74 26,50" fill="#f0a500"/>
            {/* Dark inner square */}
            <polygon points="50,40 63,53 50,66 37,53" fill="#0e0e0e"/>
          </svg>
          Password Vault
        </div>
        <div className="header-row">
          <h1 className="heading">Your credentials</h1>
          <div className="header-actions">
            <span className="header-meta">
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </span>
            {/* Import / Export button */}
            <button className="hdr-btn" title="Import / Export  [Ctrl+I]" onClick={() => setIeOpen(true)}>
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <polyline points="8 17 12 21 16 17"/>
                <line x1="12" y1="21" x2="12" y2="11"/>
                <polyline points="8 7 12 3 16 7"/>
                <line x1="12" y1="3" x2="12" y2="13"/>
              </svg>
            </button>
            {/* Health button */}
            <button className="hdr-btn" title="Password health  [Ctrl+,]" onClick={() => setHealthOpen(true)}>
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </button>
            {/* Theme toggle */}
            <button className="hdr-btn" title="Toggle theme" onClick={() => setLight(l => !l)}>
              {light
                ? <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                : <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              }
            </button>
            {/* Lock button */}
            <button className="hdr-btn" title="Lock vault  [Ctrl+L]" onClick={lock}>
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-wrap">
          <svg className="search-icon" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input ref={searchRef} type="search" placeholder="Search…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <button className="btn-add" title="New entry  [Ctrl+N]" onClick={openAdd}>
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Add
        </button>
      </div>

      {/* Category filters */}
      <div className="filters">
        <span className={`chip${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>All</span>
        {categories.map(c => (
          <span key={c} className={`chip${filter === c ? ' active' : ''}`} onClick={() => setFilter(c)}>{c}</span>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="empty"><p>Loading…</p></div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <p>{entries.length === 0 ? 'No entries yet' : 'No results'}</p>
        </div>
      ) : (
        <div className="entries-list">
          {filtered.map((e, i) => (
            <EntryRow key={e.id} entry={e} delay={i * 0.04} onEdit={openEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Modals */}
      {modalOpen     && <EntryModal entry={editTarget} onSave={handleSave} onClose={closeModal} />}
      {deleteTarget  && <DeleteConfirmModal entry={deleteTarget} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />}
      {healthOpen    && <HealthPanel entries={entries} onEdit={openEdit} onClose={() => setHealthOpen(false)} />}
      {ieOpen     && (
        <ImportExportPanel
          onExport={exportVault}
          onImport={importVault}
          onClose={() => setIeOpen(false)}
        />
      )}

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
