const { contextBridge, ipcRenderer } = require('electron');

/**
 * VaultBridge — secure IPC bridge exposed to the renderer.
 * Only the methods listed here are accessible from React.
 */
contextBridge.exposeInMainWorld('vaultAPI', {
  getAll:  ()        => ipcRenderer.invoke('db:getAll'),
  add:     (entry)   => ipcRenderer.invoke('db:add',    entry),
  update:  (entry)   => ipcRenderer.invoke('db:update', entry),
  delete:  (id)      => ipcRenderer.invoke('db:delete', id),
  // Export — renderer builds file content, main writes it
  exportDialog: (opts)              => ipcRenderer.invoke('vault:exportDialog', opts),
  writeFile:    (opts)              => ipcRenderer.invoke('vault:writeFile',    opts),
  // Import — main reads file, renderer decrypts/parses
  importDialog: ()                  => ipcRenderer.invoke('vault:importDialog'),
});
