const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let win;
let screenshotDir = 'C:\\Medal\\Screenshots\\Escape From Tarkov';
let watcherTimer = null;
let lastSignature = '';

function createWindow() {
  win = new BrowserWindow({
    width: 1500, height: 920, minWidth: 1100, minHeight: 700,
    backgroundColor: '#080b0d',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile(path.join(__dirname, 'index.html'));
}

function imageFilesRecursive(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try { entries = fs.readdirSync(cur, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const p = path.join(cur, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (/\.(png|jpg|jpeg|webp)$/i.test(e.name)) {
        try {
          const st = fs.statSync(p);
          out.push({ file: e.name, fullPath: p, mtimeMs: st.mtimeMs, size: st.size });
        } catch {}
      }
    }
  }
  return out;
}

function latestImage() {
  const files = imageFilesRecursive(screenshotDir);
  files.sort((a,b) => b.mtimeMs - a.mtimeMs);
  return files[0] || null;
}

function startWatcher() {
  if (watcherTimer) clearInterval(watcherTimer);
  watcherTimer = setInterval(() => {
    if (!win || win.isDestroyed()) return;
    const f = latestImage();
    if (!f) return;
    const sig = `${f.fullPath}|${f.mtimeMs}|${f.size}`;
    if (sig === lastSignature) return;
    lastSignature = sig;
    win.webContents.send('new-screenshot', f);
  }, 500);
}

ipcMain.handle('pick-folder', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
  if (!r.canceled && r.filePaths[0]) {
    screenshotDir = r.filePaths[0];
    lastSignature = '';
    return screenshotDir;
  }
  return screenshotDir;
});

ipcMain.handle('get-folder', () => screenshotDir);
ipcMain.handle('get-latest', () => latestImage());
ipcMain.handle('read-image', async (_, filePath) => {
  try {
    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'image/png';
    return `data:${mime};base64,${data.toString('base64')}`;
  } catch {
    return null;
  }
});

app.whenReady().then(() => {
  createWindow();
  startWatcher();
});

app.on('window-all-closed', () => {
  if (watcherTimer) clearInterval(watcherTimer);
  if (process.platform !== 'darwin') app.quit();
});
