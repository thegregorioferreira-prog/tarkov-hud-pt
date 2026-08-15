const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');

let win;
let mapWin;
let watcherTimer = null;
let screenshotDir;
let remoteId = '';
let socket = null;
let lastPosition = null;

const MAPS = {
  'Customs':'customs', 'Factory':'factory', 'Interchange':'interchange', 'Labs':'the-lab',
  'Lighthouse':'lighthouse', 'Reserve':'reserve', 'Shoreline':'shoreline',
  'Streets of Tarkov':'streets-of-tarkov', 'Woods':'woods', 'Ground Zero':'ground-zero',
  'Terminal':'terminal', 'Labyrinth':'the-labyrinth'
};

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
  win.on('closed', () => { win = null; if (mapWin && !mapWin.isDestroyed()) mapWin.close(); });
}

function openRealMap(mapName) {
  const slug = MAPS[mapName] || 'customs';
  const url = `https://tarkov.dev/map/${slug}`;
  if (mapWin && !mapWin.isDestroyed()) {
    mapWin.loadURL(url);
    mapWin.focus();
    return;
  }
  mapWin = new BrowserWindow({
    width: 1600, height: 1000, minWidth: 1000, minHeight: 700,
    backgroundColor: '#101314',
    title: `Tarkov HUD PT — Mapa ${mapName}`,
    webPreferences: { contextIsolation: true, nodeIntegration: false }
  });
  mapWin.loadURL(url);
  mapWin.on('closed', () => { mapWin = null; });
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

function connectRemote() {
  if (!remoteId) return false;
  if (socket && socket.readyState === WebSocket.OPEN) return true;
  try {
    socket = new WebSocket(`wss://socket.tarkov.dev?sessionid=${encodeURIComponent(remoteId)}-tm`, {
      headers: { 'User-Agent': 'Tarkov-HUD-PT/0.9.0' }
    });
    socket.on('open', () => {
      if (win && !win.isDestroyed()) win.webContents.send('remote-status', 'MAPA REAL CONECTADO');
      if (lastPosition) sendPlayerPosition(lastPosition);
    });
    socket.on('message', data => {
      try { const msg = JSON.parse(data.toString()); if (msg.type === 'ping') socket.send(JSON.stringify({type:'pong'})); } catch {}
    });
    socket.on('close', () => { if (win && !win.isDestroyed()) win.webContents.send('remote-status', 'MAPA REAL DESLIGADO'); socket = null; });
    socket.on('error', () => { if (win && !win.isDestroyed()) win.webContents.send('remote-status', 'ERRO NA LIGAÇÃO DO MAPA'); });
    return true;
  } catch { return false; }
}

function sendCommand(data) {
  if (!connectRemote()) return false;
  if (!socket || socket.readyState !== WebSocket.OPEN) return false;
  socket.send(JSON.stringify({ type:'command', data, sessionID:remoteId }));
  return true;
}

function sendMap(mapName) {
  return sendCommand({ type:'map', value: MAPS[mapName] || 'customs' });
}

function sendPlayerPosition(p) {
  lastPosition = p;
  const ok = sendCommand({
    type:'playerPosition',
    map: MAPS[p.mapName] || 'customs',
    position:{ x:p.x, y:p.y, z:p.z },
    rotation:p.bearing
  });
  return ok;
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
ipcMain.handle('cleanup-now', () => { cleanupOldScreenshots(); return listScreenshots().length; });
ipcMain.handle('open-map', (_, map) => { openRealMap(map); return true; });
ipcMain.handle('set-remote-id', (_, id) => {
  remoteId = String(id || '').trim();
  if (socket) { try { socket.close(); } catch {} socket = null; }
  const ok = connectRemote();
  return ok;
});
ipcMain.handle('get-remote-id', () => remoteId);
ipcMain.handle('map-select', (_, map) => sendMap(map));

function parseEftScreenshot(file) {
  const base=file.replace(/\\/g,'/').split('/').pop();
  // Native EFT screenshot names encode position and quaternion. Keep a few tolerant variants.
  const patterns = [
    /\]_\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*_\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*_/,
    /_(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)_(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)_/
  ];
  let m=null; for(const re of patterns){ m=base.match(re); if(m) break; }
  if(!m) return null;
  const x=Number(m[1]), y=Number(m[2]), z=Number(m[3]);
  const qx=Number(m[4]), qy=Number(m[5]), qz=Number(m[6]), qw=Number(m[7]);
  const siny=2*(qw*qy+qx*qz), cosy=1-2*(qy*qy+qz*qz);
  const bearing=(Math.atan2(siny,cosy)*180/Math.PI+360)%360;
  return {x,y,z,bearing};
}

app.whenReady().then(() => {
  screenshotDir = defaultScreenshotDir();
  fs.mkdirSync(screenshotDir, {recursive:true});
  createWindow();
  let last = '';
  watcherTimer = setInterval(() => {
    if (!win || win.isDestroyed()) return;
    const files=listScreenshots();
    if(files.length && files[0].x!==last){
      last=files[0].x;
      const p=parseEftScreenshot(files[0].x);
      if(p){
        p.mapName = win.webContents.executeJavaScript('document.getElementById("map")?.value || "Customs"').catch(()=> 'Customs');
        // Resolve the Promise without blocking the file watcher.
        Promise.resolve(p.mapName).then(mapName => {
          p.mapName = mapName || 'Customs';
          sendPlayerPosition(p);
          win.webContents.send('new-screenshot',{file:files[0].x,fullPath:path.join(screenshotDir,files[0].x),position:p});
        });
      } else {
        win.webContents.send('new-screenshot',{file:files[0].x,fullPath:path.join(screenshotDir,files[0].x)});
      }
      cleanupOldScreenshots();
    }
  },500);
});
app.on('window-all-closed',()=>{ if(socket){try{socket.close()}catch{}} if(process.platform!=='darwin') app.quit(); });
