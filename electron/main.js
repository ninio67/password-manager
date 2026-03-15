const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
Menu.setApplicationMenu(null);
const path = require('path');
const fs   = require('fs');
const Database = require('./database');

app.setAppUserModelId('com.vault.app');

let mainWindow;
let db;

const ICON_PATH = path.join(__dirname, '../public/icon.ico');

// ── Window state persistence ───────────────────────────────
function getWindowStatePath() {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function loadWindowState() {
  try {
    return JSON.parse(fs.readFileSync(getWindowStatePath(), 'utf8'));
  } catch {
    return { width: 960, height: 680 };
  }
}

function saveWindowState(win) {
  if (win.isMaximized() || win.isMinimized()) return;
  const bounds = win.getBounds();
  try {
    fs.writeFileSync(getWindowStatePath(), JSON.stringify(bounds));
  } catch {}
}

function createWindow() {
  const state = loadWindowState();

  mainWindow = new BrowserWindow({
    width:     state.width  || 960,
    height:    state.height || 680,
    x:         state.x,
    y:         state.y,
    minWidth:  480,
    minHeight: 400,
    title: 'Vault',
    icon: ICON_PATH,
    backgroundColor: '#0e0e0e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
  });

  // Persist size/position on change
  const saveBounds = () => saveWindowState(mainWindow);
  mainWindow.on('resize',    saveBounds);
  mainWindow.on('move',      saveBounds);
  mainWindow.on('close',     saveBounds);

  if (fs.existsSync(ICON_PATH)) {
    mainWindow.setIcon(ICON_PATH);
  }

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(async () => {
  const userDataPath = app.getPath('userData');
  db = new Database(userDataPath);
  await db.init();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC HANDLERS ──────────────────────────────────────────
ipcMain.handle('db:getAll',    async () => db.getAll());
ipcMain.handle('db:add',       async (_, entry) => db.add(entry));
ipcMain.handle('db:update',    async (_, entry) => db.update(entry));
ipcMain.handle('db:delete',    async (_, id)    => db.delete(id));

// ── EXPORT — renderer encrypts/decrypts; main just handles file I/O ──
ipcMain.handle('vault:exportDialog', async (_, { format }) => {
  let ext, filters;
  if (format === 'csv') {
    ext = 'csv';
    filters = [{ name: 'CSV', extensions: ['csv'] }];
  } else if (format === 'json') {
    ext = 'json';
    filters = [{ name: 'JSON', extensions: ['json'] }];
  } else {
    ext = 'vault';
    filters = [{ name: 'Encrypted Vault', extensions: ['vault'] }];
  }

  const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
    title:       'Export vault',
    defaultPath: `vault-export-${new Date().toISOString().slice(0,10)}.${ext}`,
    filters,
  });

  if (canceled || !filePath) return { ok: false, reason: 'canceled' };
  return { ok: true, filePath };
});

ipcMain.handle('vault:writeFile', async (_, { filePath, content }) => {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
});

// ── IMPORT — renderer decrypts after reading ──────────────
ipcMain.handle('vault:importDialog', async () => {
  const { filePaths, canceled } = await dialog.showOpenDialog(mainWindow, {
    title:      'Import vault',
    properties: ['openFile'],
    filters: [
      { name: 'All supported',   extensions: ['vault', 'json', 'csv'] },
      { name: 'Encrypted Vault', extensions: ['vault'] },
      { name: 'JSON',            extensions: ['json'] },
      { name: 'CSV',             extensions: ['csv'] },
    ],
  });

  if (canceled || !filePaths.length) return { ok: false, reason: 'canceled' };

  try {
    const content = fs.readFileSync(filePaths[0], 'utf8');
    const ext     = path.extname(filePaths[0]).toLowerCase();
    return { ok: true, content, ext };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
});
