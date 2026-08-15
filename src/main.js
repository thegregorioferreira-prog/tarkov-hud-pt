const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');

let win;
let watcherTimer = null;
let autoTimer = null;
let screenshotDir;

function defaultScreenshotDir() {
  const home = app.getPath('home');
  const candidates = [
    path.join(home, 'OneDrive', 'Documentos', 'Escape from Tarkov', 'Screenshots'),
    path.join(home, 'OneDrive', 'Documents', 'Escape from Tarkov', 'Screenshots'),
    path.join(home, 'Documentos', 'Escape from Tarkov', 'Screenshots'),
    path.join(home, 'Documents', 'Escape from Tarkov', 'Screenshots')
  ];
  return candidates.find(p => fs.existsSync(p)) || candidates[0];
}

function createWindow() {
  win = new BrowserWindow({
    width: 1500, height: 920, minWidth: 1100, minHeight: 700,
    backgroundColor: '#080b0d',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  win.loadFile(path.join(__dirname, 'index.html'));
}

function listScreenshots() {
  try {
    return fs.readdirSync(screenshotDir)
      .filter(x => /\.(png|jpg|jpeg)$/i.test(x))
      .map(x => ({ x, t: fs.statSync(path.join(screenshotDir, x)).mtimeMs }))
      .sort((a,b) => b.t-a.t);
  } catch { return []; }
}

function cleanupOldScreenshots() {
  const files = listScreenshots();
  for (const f of files.slice(7)) {
    try { fs.unlinkSync(path.join(screenshotDir, f.x)); } catch {}
  }
}

function sendF9() {
  // Windows only. Sends F9 to the foreground application so EFT can create
  // its native screenshot (and therefore its coordinate-bearing filename).
  if (process.platform !== 'win32') return false;
  const ps = `Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public static class K { [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo); }'; [K]::keybd_event(0x78,0,0,[UIntPtr]::Zero); Start-Sleep -Milliseconds 40; [K]::keybd_event(0x78,0,2,[UIntPtr]::Zero)`;
  execFile('powershell.exe', ['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-Command', ps], {windowsHide:true}, () => {});
  return true;
}

ipcMain.handle('pick-folder', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
  if (!r.canceled && r.filePaths[0]) {
    screenshotDir = r.filePaths[0];
    fs.mkdirSync(screenshotDir, {recursive: true});
    return screenshotDir;
  }
  return screenshotDir;
});
ipcMain.handle('get-folder', () => screenshotDir);
ipcMain.handle('set-auto', (_, enabled, intervalMs) => {
  if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
  if (enabled) {
    const ms = Math.max(1000, Math.min(30000, Number(intervalMs) || 2000));
    autoTimer = setInterval(() => sendF9(), ms);
    sendF9();
  }
  return !!enabled;
});
ipcMain.handle('cleanup-now', () => { cleanupOldScreenshots(); return listScreenshots().length; });
ipcMain.handle('open-map', async (_, map) => {
  const urls = {
    'Customs':'https://tarkov.dev/map/customs', 'Factory':'https://tarkov.dev/map/factory', 'Interchange':'https://tarkov.dev/map/interchange',
    'Labs':'https://tarkov.dev/map/labs', 'Lighthouse':'https://tarkov.dev/map/lighthouse', 'Reserve':'https://tarkov.dev/map/reserve',
    'Shoreline':'https://tarkov.dev/map/shoreline', 'Streets of Tarkov':'https://tarkov.dev/map/streets', 'Woods':'https://tarkov.dev/map/woods',
    'Ground Zero':'https://tarkov.dev/map/ground-zero', 'Terminal':'https://tarkov.dev/map/terminal', 'Labyrinth':'https://tarkov.dev/map/labyrinth'
  };
  const mw=new BrowserWindow({width:1500,height:950,backgroundColor:'#080b0d',webPreferences:{contextIsolation:true}});
  await mw.loadURL(urls[map] || urls.Customs);
});

app.whenReady().then(() => {
  screenshotDir = defaultScreenshotDir();
  fs.mkdirSync(screenshotDir, {recursive: true});
  createWindow();
  let last = '';
  watcherTimer = setInterval(() => {
    if (!win || win.isDestroyed()) return;
    const files = listScreenshots();
    if (files.length && files[0].x !== last) {
      last = files[0].x;
      win.webContents.send('new-screenshot', {file: files[0].x, fullPath: path.join(screenshotDir, files[0].x)});
      cleanupOldScreenshots();
    }
  }, 500);
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
