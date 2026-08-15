const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { shell } = require('electron');

let win = null;
let mapWin = null;
let screenshotDir = '';
let lastFile = '';

const MAPS = {
  'Customs':'customs',
  'Factory':'factory',
  'Interchange':'interchange',
  'Labs':'the-lab',
  'Lighthouse':'lighthouse',
  'Reserve':'reserve',
  'Shoreline':'shoreline',
  'Streets of Tarkov':'streets-of-tarkov',
  'Woods':'woods',
  'Ground Zero':'ground-zero',
  'Terminal':'terminal',
  'Labyrinth':'the-labyrinth'
};

function defaultScreenshotDir() {
  const home = app.getPath('home');
  const candidates = [
    path.join(home,'OneDrive','Documentos','Escape from Tarkov','Screenshots'),
    path.join(home,'OneDrive','Documents','Escape from Tarkov','Screenshots'),
    path.join(home,'Documentos','Escape from Tarkov','Screenshots'),
    path.join(home,'Documents','Escape from Tarkov','Screenshots')
  ];
  return candidates.find(p => fs.existsSync(p)) || candidates[0];
}

function createWindow() {
  win = new BrowserWindow({
    width:1500, height:920, minWidth:1100, minHeight:700,
    backgroundColor:'#080b0d',
    title:'Tarkov HUD PT',
    webPreferences:{
      preload:path.join(__dirname,'preload.js'),
      contextIsolation:true,
      nodeIntegration:false
    }
  });
  win.loadFile(path.join(__dirname,'index.html'));
  win.on('closed',()=>{ win=null; if(mapWin && !mapWin.isDestroyed()) mapWin.close(); });
}

function openRealMap(mapName) {
  const slug = MAPS[mapName] || 'customs';
  const url = `https://tarkov.dev/map/${slug}`;

  if (mapWin && !mapWin.isDestroyed()) {
    mapWin.loadURL(url);
    mapWin.focus();
    return true;
  }

  mapWin = new BrowserWindow({
    width:1500, height:900, minWidth:900, minHeight:650,
    parent:win || undefined,
    title:`Tarkov HUD PT — ${mapName}`,
    backgroundColor:'#111',
    webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}
  });
  mapWin.loadURL(url);
  mapWin.on('closed',()=>{mapWin=null;});
  return true;
}

function listScreenshots() {
  try {
    return fs.readdirSync(screenshotDir)
      .filter(f=>/\.(png|jpg|jpeg|webp)$/i.test(f))
      .map(f=>({name:f,time:fs.statSync(path.join(screenshotDir,f)).mtimeMs}))
      .sort((a,b)=>b.time-a.time);
  } catch { return []; }
}

function cleanupOld() {
  const files=listScreenshots();
  for (const f of files.slice(7)) {
    try { fs.unlinkSync(path.join(screenshotDir,f.name)); } catch {}
  }
}

function parseEftScreenshot(file) {
  const base=path.basename(file);
  // EFT native screenshot variants containing XYZ followed by quaternion.
  const patterns=[
    /_(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)_(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)_/,
    /\[(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\].*?(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/
  ];
  let m=null;
  for(const re of patterns){ m=base.match(re); if(m) break; }
  if(!m) return null;
  const x=+m[1], y=+m[2], z=+m[3];
  const qx=+m[4], qy=+m[5], qz=+m[6], qw=+m[7];
  const siny=2*(qw*qy+qx*qz);
  const cosy=1-2*(qy*qy+qz*qz);
  const bearing=(Math.atan2(siny,cosy)*180/Math.PI+360)%360;
  return {x,y,z,bearing};
}

ipcMain.handle('pick-folder',async()=>{
  const r=await dialog.showOpenDialog(win,{properties:['openDirectory']});
  if(!r.canceled && r.filePaths[0]){
    screenshotDir=r.filePaths[0];
    fs.mkdirSync(screenshotDir,{recursive:true});
  }
  return screenshotDir;
});
ipcMain.handle('get-folder',()=>screenshotDir);
ipcMain.handle('cleanup-now',()=>{cleanupOld(); return listScreenshots().length;});
ipcMain.handle('open-map',(_,map)=>openRealMap(map));
ipcMain.handle('select-map',(_,map)=>{
  if(mapWin && !mapWin.isDestroyed()) mapWin.loadURL(`https://tarkov.dev/map/${MAPS[map]||'customs'}`);
  return true;
});
ipcMain.handle('open-external',(_,url)=>{
  if(typeof url==='string' && /^https:\/\/tarkov\.dev\//.test(url)) shell.openExternal(url);
  return true;
});

app.whenReady().then(()=>{
  screenshotDir=defaultScreenshotDir();
  fs.mkdirSync(screenshotDir,{recursive:true});
  createWindow();

  setInterval(()=>{
    if(!win || win.isDestroyed()) return;
    const files=listScreenshots();
    if(!files.length) return;
    const newest=files[0];
    if(newest.name===lastFile) return;
    lastFile=newest.name;
    const full=path.join(screenshotDir,newest.name);
    const position=parseEftScreenshot(newest.name);
    win.webContents.send('new-screenshot',{
      file:newest.name,
      fullPath:full,
      position:position||null
    });
    cleanupOld();
  },500);
});

app.on('window-all-closed',()=>{if(process.platform!=='darwin') app.quit();});
