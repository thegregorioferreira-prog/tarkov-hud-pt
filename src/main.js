const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let win;
let screenshotDir = path.join(app.getPath('documents'), 'Escape from Tarkov', 'Screenshots');

function createWindow() {
  win = new BrowserWindow({
    width: 1500, height: 920, minWidth: 1100, minHeight: 700,
    backgroundColor: '#080b0d',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  win.loadFile(path.join(__dirname, 'index.html'));
}

ipcMain.handle('pick-folder', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
  if (!r.canceled && r.filePaths[0]) {
    screenshotDir = r.filePaths[0];
    return screenshotDir;
  }
  return screenshotDir;
});
ipcMain.handle('get-folder', () => screenshotDir);
ipcMain.handle('open-map', async (_, map) => {
  const urls = {
    'Customs':'https://tarkov.dev/map/customs', 'Factory':'https://tarkov.dev/map/factory', 'Interchange':'https://tarkov.dev/map/interchange',
    'Labs':'https://tarkov.dev/map/labs', 'Lighthouse':'https://tarkov.dev/map/lighthouse', 'Reserve':'https://tarkov.dev/map/reserve',
    'Shoreline':'https://tarkov.dev/map/shoreline', 'Streets of Tarkov':'https://tarkov.dev/map/streets', 'Woods':'https://tarkov.dev/map/woods',
    'Ground Zero':'https://tarkov.dev/map/ground-zero', 'Terminal':'https://tarkov.dev/map/terminal', 'Labyrinth':'https://tarkov.dev/map/labyrinth'
  };
  const u=urls[map] || urls.Customs;
  const mw=new BrowserWindow({width:1500,height:950,backgroundColor:'#080b0d',webPreferences:{contextIsolation:true}});
  await mw.loadURL(u);
});

app.whenReady().then(() => {
  createWindow();
  fs.mkdirSync(screenshotDir, {recursive: true});
  let last = '';
  setInterval(() => {
    if (!win || win.isDestroyed()) return;
    try {
      const files = fs.readdirSync(screenshotDir)
        .filter(x => /\.(png|jpg|jpeg)$/i.test(x))
        .map(x => ({x, t: fs.statSync(path.join(screenshotDir,x)).mtimeMs}))
        .sort((a,b)=>b.t-a.t);
      if (!files.length || files[0].x === last) return;
      last = files[0].x;
      win.webContents.send('new-screenshot', {file: files[0].x, fullPath: path.join(screenshotDir, files[0].x)});
    } catch {}
  }, 700);
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });