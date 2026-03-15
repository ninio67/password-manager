import { useState, useEffect, useCallback, useRef } from 'react';
import { VaultManager } from '../services/VaultManager';

const manager = new VaultManager();

export function useVault() {
  const [entries,   setEntries]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState('all');
  const [query,     setQuery]     = useState('');
  const [toast,     setToast]     = useState(null);
  const toastTimer = useRef(null);

  const refresh = useCallback(() => {
    setEntries([...manager.entries]);
  }, []);

  const showToast = useCallback((msg) => {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  /**
   * Called by App once the master password is verified.
   * Derives the encryption key, then loads all entries.
   */
  const unlock = useCallback(async (masterPassword) => {
    setLoading(true);
    await manager.setMasterPassword(masterPassword);
    await manager.migrateIfNeeded();
    await manager.loadAll();
    refresh();
    setLoading(false);
  }, [refresh]);

  /** Called on lock — clears key + in-memory entries. */
  const lockVault = useCallback(() => {
    manager.clearKey();
    setEntries([]);
    setLoading(true);
  }, []);

  const addEntry = useCallback(async (data) => {
    await manager.add(data);
    refresh();
    showToast('Added');
  }, [refresh, showToast]);

  const updateEntry = useCallback(async (data) => {
    await manager.update(data);
    refresh();
    showToast('Saved');
  }, [refresh, showToast]);

  const deleteEntry = useCallback(async (id) => {
    await manager.delete(id);
    refresh();
    showToast('Deleted');
  }, [refresh, showToast]);

  const exportVault = useCallback(async (format) => {
    const result = await manager.exportVault(format);
    if (result.ok)     showToast(`Exported ${result.count} entries`);
    else if (result.reason !== 'canceled') showToast(`Export failed: ${result.reason}`);
    return result;
  }, [showToast]);

  const importVault = useCallback(async (mode) => {
    const result = await manager.importVault(mode);
    if (result.ok) {
      refresh();
      showToast(`Imported ${result.count} entries`);
    } else if (result.reason !== 'canceled') {
      showToast(`Import failed: ${result.reason}`);
    }
    return result;
  }, [refresh, showToast]);

  const categories  = manager.getCategories();
  const filtered    = manager.filtered(filter, query);

  return {
    entries, loading, filter, setFilter,
    query,   setQuery,
    categories, filtered,
    unlock, lockVault,
    addEntry, updateEntry, deleteEntry,
    exportVault, importVault,
    toast,
  };
}
