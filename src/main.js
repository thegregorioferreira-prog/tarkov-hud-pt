const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let win;
let medalDir = 'C:\\Medal\\Screenshots\\Escape From Tarkov';
let eftDir = path.join(app.getPath('documents'), 'Escape from Tarkov', 'Screenshots');
let watcherTimer = null;
let lastMedalSignature = '';
let lastEftSignature = '';

function createWindow() {
  win = new BrowserWindow({
    width: 1500, height: 920, minWidth: 1100, minHeight: 700,
    backgroundColor: '#080b0d',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  win.loadFile(path.join(__dirname, 'index.html'));
}

function imageFilesRecursive(dir) {
  const out=[]; if(!fs.existsSync(dir)) return out; const stack=[dir];
  while(stack.length){ const cur=stack.pop(); let entries; try{entries=fs.readdirSync(cur,{withFileTypes:true})}catch{continue}
    for(const e of entries){const p=path.join(cur,e.name); if(e.isDirectory()) stack.push(p); else if(/\.(png|jpg|jpeg|webp)$/i.test(e.name)){try{const st=fs.statSync(p);out.push({file:e.name,fullPath:p,mtimeMs:st.mtimeMs,size:st.size})}catch{}}}
  } return out;
}
function latestImage(dir){const f=imageFilesRecursive(dir); f.sort((a,b)=>b.mtimeMs-a.mtimeMs); return f[0]||null;}

// EFT's own screenshots can encode position and facing in the filename, e.g.
// 2025-12-25[10-14]_-519.33, -39.61, 68.41_-0.04164, 0.80479, -0.05690, -0.58935_5.68 (0).png
function parseEftFilename(name){
  const m=name.match(/\[\d{2}-\d{2}\]_(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)_(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  if(!m) return null;
  return {x:Number(m[1]),y:Number(m[2]),z:Number(m[3]),qx:Number(m[4]),qy:Number(m[5]),qz:Number(m[6]),qw:Number(m[7])};
}

function startWatcher(){
 if(watcherTimer) clearInterval(watcherTimer);
 watcherTimer=setInterval(()=>{
   if(!win||win.isDestroyed()) return;
   const medal=latestImage(medalDir); if(medal){const sig=`${medal.fullPath}|${medal.mtimeMs}|${medal.size}`; if(sig!==lastMedalSignature){lastMedalSignature=sig;win.webContents.send('new-medal',medal)}}
   const eft=latestImage(eftDir); if(eft){const sig=`${eft.fullPath}|${eft.mtimeMs}|${eft.size}`; if(sig!==lastEftSignature){lastEftSignature=sig; const parsed=parseEftFilename(eft.file); win.webContents.send('new-eft', {file:eft, parsed})}}
 },500);
}

ipcMain.handle('pick-medal-folder',async()=>{const r=await dialog.showOpenDialog(win,{properties:['openDirectory']});if(!r.canceled&&r.filePaths[0]){medalDir=r.filePaths[0];lastMedalSignature='';return medalDir}return medalDir});
ipcMain.handle('pick-eft-folder',async()=>{const r=await dialog.showOpenDialog(win,{properties:['openDirectory']});if(!r.canceled&&r.filePaths[0]){eftDir=r.filePaths[0];lastEftSignature='';return eftDir}return eftDir});
ipcMain.handle('get-folders',()=>({medal:medalDir,eft:eftDir}));
ipcMain.handle('get-latest-medal',()=>latestImage(medalDir));
ipcMain.handle('get-latest-eft',()=>{const f=latestImage(eftDir);return f?{file:f,parsed:parseEftFilename(f.file)}:null});
ipcMain.handle('read-image',async(_,filePath)=>{try{const data=fs.readFileSync(filePath);const ext=path.extname(filePath).toLowerCase();const mime=ext==='.jpg'||ext==='.jpeg'?'image/jpeg':ext==='.webp'?'image/webp':'image/png';return `data:${mime};base64,${data.toString('base64')}`}catch{return null}});
app.whenReady().then(()=>{createWindow();startWatcher()});
app.on('window-all-closed',()=>{if(watcherTimer)clearInterval(watcherTimer);if(process.platform!=='darwin')app.quit()});
