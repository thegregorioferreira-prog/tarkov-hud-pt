const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let win, overlay;

function createWindow() {
  win = new BrowserWindow({
    width: 1500, height: 920, minWidth: 1100, minHeight: 700,
    backgroundColor: '#070a0c',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  win.loadFile(path.join(__dirname, 'index.html'));
}

function createOverlay() {
  if (overlay && !overlay.isDestroyed()) { overlay.show(); return; }
  overlay = new BrowserWindow({
    width: 760, height: 760, minWidth: 420, minHeight: 420,
    transparent: true, frame: false, alwaysOnTop: true, resizable: true,
    skipTaskbar: true, backgroundColor: '#00000000',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  overlay.setAlwaysOnTop(true, 'floating');
  overlay.loadFile(path.join(__dirname, 'overlay.html'));
  overlay.on('closed', () => overlay = null);
}

ipcMain.on('open-overlay', () => createOverlay());
ipcMain.on('close-overlay', () => { if (overlay && !overlay.isDestroyed()) overlay.close(); });
ipcMain.on('overlay-state', (_, state) => {
  if (overlay && !overlay.isDestroyed()) overlay.webContents.send('sync-state', state);
  if (win && !win.isDestroyed()) win.webContents.send('sync-state', state);
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });