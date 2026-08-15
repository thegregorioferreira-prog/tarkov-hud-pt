const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('tarkov',{
  pickFolder:()=>ipcRenderer.invoke('pick-folder'),
  getFolder:()=>ipcRenderer.invoke('get-folder'),
  readLatest:()=>ipcRenderer.invoke('read-latest'),
  openOverlay:()=>ipcRenderer.invoke('open-overlay'),
  closeOverlay:()=>ipcRenderer.invoke('close-overlay'),
  getPosition:()=>ipcRenderer.invoke('get-position'),
  onPosition:(cb)=>ipcRenderer.on('position-update',(_,d)=>cb(d))
});