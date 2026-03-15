# Vault — Password Manager Desktop App

A minimal, fully offline desktop password manager built with **Electron + React + Vite**.
Credentials are stored in a **JSON file** in your OS user-data folder (no internet required, ever).

---

## Project Structure

```
vault-app/
├── electron/
│   ├── main.js        ← Electron main process (window creation, IPC)
│   ├── preload.js     ← Secure IPC bridge (contextBridge)
│   └── database.js    ← Database class (JSON flat-file, SQLite-ready)
├── src/
│   ├── models/
│   │   └── Credential.js     ← Credential value-object class
│   ├── services/
│   │   └── VaultManager.js   ← Business logic (CRUD, filter, search)
│   ├── hooks/
│   │   └── useVault.js       ← React hook wiring everything together
│   ├── components/
│   │   ├── EntryRow.jsx      ← Single credential row
│   │   └── EntryModal.jsx    ← Add / edit modal
│   ├── App.jsx        ← Root React component
│   ├── main.jsx       ← React entry point
│   └── styles.css     ← All styles
├── public/            ← App icons go here (icon.ico / icon.icns / icon.png)
├── index.html
├── vite.config.js
└── package.json
```

---

## Setup

### 1. Install dependencies

```bash
npm install
```

> **Note:** Electron's binary download requires GitHub access.
> If you're behind a corporate proxy or restricted network, set:
> ```bash
> export ELECTRON_GET_USE_PROXY=true
> export GLOBAL_AGENT_HTTPS_PROXY=http://your-proxy:port
> ```
> Or download the Electron binary manually and place it in the electron cache.

### 2. Run in development mode

```bash
npm run dev
```

This starts Vite (React) on port 5173 and launches Electron pointing at it with DevTools open.

---

## Building the .exe (Windows)

### On Windows:
```bash
npm run dist:win
```

Output: `release/Vault Setup 1.0.0.exe`

### On macOS (cross-compile for Windows):
```bash
npm run dist:win
```
Requires Wine and Mono for cross-compilation, or use a Windows CI machine.

### On Linux:
```bash
npm run dist:win   # Windows exe
npm run dist:linux # AppImage
```

---

## Building for other platforms

| Command            | Output                      |
|--------------------|-----------------------------|
| `npm run dist:win`   | `release/*.exe` (NSIS installer) |
| `npm run dist:mac`   | `release/*.dmg`              |
| `npm run dist:linux` | `release/*.AppImage`         |
| `npm run dist`       | Auto-detects current OS      |

---

## Where is data stored?

Credentials are saved to a **JSON file** in your OS user-data directory:

| OS      | Path |
|---------|------|
| Windows | `%APPDATA%\vault-app\vault.json` |
| macOS   | `~/Library/Application Support/vault-app/vault.json` |
| Linux   | `~/.config/vault-app/vault.json` |

> To add SQLite support: `npm install better-sqlite3` — the `Database` class
> will automatically prefer SQLite over the JSON fallback when available.

---

## OOP Architecture

| Class / Hook       | Layer      | Responsibility |
|--------------------|------------|----------------|
| `Credential`       | Model      | Data shape + validation |
| `Database`         | Persistence| JSON / SQLite read-write |
| `VaultManager`     | Service    | CRUD + filter + search |
| `useVault`         | Hook       | React state bridge |
| `EntryRow`         | Component  | Render one credential |
| `EntryModal`       | Component  | Add / edit form |
| `App`              | Root       | Layout + orchestration |
