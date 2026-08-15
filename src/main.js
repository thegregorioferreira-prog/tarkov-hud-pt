const { app, BrowserWindow, ipcMain, dialog, screen } = require('electron');
const path = require('path');
const fs = require('fs');

let win, overlay;
let screenshotDir = path.join(app.getPath('documents'), 'Escape from Tarkov', 'Screenshots');
let lastFile = '';
let lastPosition = null;

function makeWindow() {
  win = new BrowserWindow({
    width: 1500, height: 920, minWidth: 1100, minHeight: 700,
    backgroundColor: '#070a0c',
    webPreferences: { preload: path.join(__dirname,'preload.js'), contextIsolation:true, nodeIntegration:false }
  });
  win.loadFile(path.join(__dirname,'index.html'));
}

function parseScreenshotName(file) {
  const stem = path.basename(file, path.extname(file));
  // Supports common coordinate-bearing names: x/y/z/bearing as the final
  // four numeric tokens. Also accepts labelled tokens (x=, y=, z=, yaw=).
  const labelled = {
    x: /(?:^|[_\s-])x(?:=|:)(-?\d+(?:\.\d+)?)/i.exec(stem),
    y: /(?:^|[_\s-])y(?:=|:)(-?\d+(?:\.\d+)?)/i.exec(stem),
    z: /(?:^|[_\s-])z(?:=|:)(-?\d+(?:\.\d+)?)/i.exec(stem),
    bearing: /(?:yaw|heading|bearing|rot)(?:=|:)(-?\d+(?:\.\d+)?)/i.exec(stem)
  };
  if (labelled.x && labelled.y && labelled.z) {
    return {x:+labelled.x[1], y:+labelled.y[1], z:+labelled.z[1], bearing:labelled.bearing?+labelled.bearing[1]:0, source:'labelled'};
  }
  const nums = stem.match(/-?\d+(?:\.\d+)?/g);
  if (!nums || nums.length < 3) return null;
  const n = nums.map(Number);
  if (n.length >= 4) {
    const [x,y,z,b] = n.slice(-4);
    return {x,y,z,bearing:b,source:'numeric'};
  }
  const [x,y,z] = n.slice(-3);
  return {x,y,z,bearing:0,source:'numeric'};
}

function scanLatest() {
  try {
    fs.mkdirSync(screenshotDir,{recursive:true});
    const files=fs.readdirSync(screenshotDir)
      .filter(f=>/\.(png|jpe?g)$/i.test(f))
      .map(f=>({f,t:fs.statSync(path.join(screenshotDir,f)).mtimeMs}))
      .sort((a,b)=>b.t-a.t);
    if(!files.length) return {ok:false, reason:'Nenhum screenshot encontrado.'};
    const f=files[0].f;
    const parsed=parseScreenshotName(f);
    lastFile=f;
    if(!parsed) return {ok:false, reason:'Screenshot encontrado, mas não foi possível ler coordenadas do nome.', file:f};
    lastPosition={...parsed,file:f,time:Date.now()};
    if(win && !win.isDestroyed()) win.webContents.send('position-update',lastPosition);
    if(overlay && !overlay.isDestroyed()) overlay.webContents.send('position-update',lastPosition);
    return {ok:true, ...lastPosition};
  } catch(e) { return {ok:false, reason:e.message}; }
}

function createOverlay() {
  if (overlay && !overlay.isDestroyed()) { overlay.focus(); return; }
  overlay=new BrowserWindow({
    width:520,height:260,
    frame:false, transparent:true, alwaysOnTop:true, resizable:true,
    skipTaskbar:true,
    webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}
  });
  overlay.setAlwaysOnTop(true,'floating');
  overlay.loadFile(path.join(__dirname,'overlay.html'));
  overlay.webContents.once('did-finish-load',()=>{ if(lastPosition) overlay.webContents.send('position-update',lastPosition); });
  overlay.on('closed',()=>overlay=null);
}

ipcMain.handle('pick-folder',async()=>{
  const r=await dialog.showOpenDialog(win,{properties:['openDirectory']});
  if(!r.canceled){ screenshotDir=r.filePaths[0]; return screenshotDir; }
  return screenshotDir;
});
ipcMain.handle('get-folder',()=>screenshotDir);
ipcMain.handle('read-latest',()=>scanLatest());
ipcMain.handle('open-overlay',()=>{createOverlay(); return true;});
ipcMain.handle('close-overlay',()=>{if(overlay&&!overlay.isDestroyed()) overlay.close(); return true;});
ipcMain.handle('get-position',()=>lastPosition);

app.whenReady().then(()=>{
  makeWindow();
  fs.mkdirSync(screenshotDir,{recursive:true});
  setInterval(()=>{
    if(!win||win.isDestroyed()) return;
    try{
      const files=fs.readdirSync(screenshotDir).filter(f=>/\.(png|jpe?g)$/i.test(f))
        .map(f=>({f,t:fs.statSync(path.join(screenshotDir,f)).mtimeMs}))
        .sort((a,b)=>b.t-a.t);
      if(files.length && files[0].f!==lastFile) scanLatest();
    }catch{}
  },700);
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin') app.quit();});