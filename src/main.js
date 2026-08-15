const { app, BrowserWindow, BrowserView, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let win;
let mapView;
let screenshotDir = path.join(app.getPath('documents'), 'Escape from Tarkov', 'Screenshots');
const MAP_URLS = {
  'Customs':'https://tarkov.dev/map/customs', 'Factory':'https://tarkov.dev/map/factory',
  'Interchange':'https://tarkov.dev/map/interchange', 'Labs':'https://tarkov.dev/map/labs',
  'Lighthouse':'https://tarkov.dev/map/lighthouse', 'Reserve':'https://tarkov.dev/map/reserve',
  'Shoreline':'https://tarkov.dev/map/shoreline', 'Streets of Tarkov':'https://tarkov.dev/map/streets-of-tarkov',
  'Woods':'https://tarkov.dev/map/woods', 'Ground Zero':'https://tarkov.dev/map/ground-zero',
  'Terminal':'https://tarkov.dev/map/terminal', 'The Labyrinth':'https://tarkov.dev/map/the-labyrinth'
};
function createWindow(){
  win=new BrowserWindow({width:1500,height:920,minWidth:1100,minHeight:700,backgroundColor:'#080b0d',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,webviewTag:true}});
  win.loadFile(path.join(__dirname,'index.html'));
  win.on('resize',()=>positionMap());
}
function positionMap(){ if(!mapView||!win||win.isDestroyed())return; const [w,h]=win.getContentSize(); mapView.setBounds({x:300,y:62,width:Math.max(500,w-610),height:Math.max(500,h-62)}); }
ipcMain.handle('pick-folder',async()=>{const r=await dialog.showOpenDialog(win,{properties:['openDirectory']}); if(!r.canceled&&r.filePaths[0]) screenshotDir=r.filePaths[0]; return screenshotDir;});
ipcMain.handle('get-folder',()=>screenshotDir);
ipcMain.handle('map-url',(_,name)=>MAP_URLS[name]||MAP_URLS.Customs);
ipcMain.handle('open-map-view',(_,url)=>{ if(!mapView){mapView=new BrowserView({webPreferences:{contextIsolation:true,nodeIntegration:false}}); win.setBrowserView(mapView);} mapView.webContents.loadURL(url); positionMap(); return true; });
ipcMain.handle('close-map-view',()=>{if(mapView){win.removeBrowserView(mapView);mapView.webContents.destroy();mapView=null;} return true;});
app.whenReady().then(()=>{createWindow(); fs.mkdirSync(screenshotDir,{recursive:true}); let last=''; setInterval(()=>{if(!win||win.isDestroyed())return; try{const files=fs.readdirSync(screenshotDir).filter(x=>/\.(png|jpg|jpeg)$/i.test(x)).map(x=>({x,t:fs.statSync(path.join(screenshotDir,x)).mtimeMs})).sort((a,b)=>b.t-a.t); if(!files.length||files[0].x===last)return; last=files[0].x; win.webContents.send('new-screenshot',{file:files[0].x,fullPath:path.join(screenshotDir,files[0].x)});}catch{}},500);});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
