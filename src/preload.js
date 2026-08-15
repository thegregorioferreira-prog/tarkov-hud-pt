const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tarkov', {
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  getFolder: () => ipcRenderer.invoke('get-folder'),
  getLatest: () => ipcRenderer.invoke('get-latest'),
  readImage: (filePath) => ipcRenderer.invoke('read-image', filePath),
  onNewScreenshot: (cb) => ipcRenderer.on('new-screenshot', (_, data) => cb(data))
});
