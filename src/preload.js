const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('tarkov', {
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  getFolder: () => ipcRenderer.invoke('get-folder'),
  onNewScreenshot: (cb) => ipcRenderer.on('new-screenshot', (_, data) => cb(data))
});