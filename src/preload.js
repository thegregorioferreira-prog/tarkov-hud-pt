const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('tarkov', {
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  getFolder: () => ipcRenderer.invoke('get-folder'),
  openMap: (map) => ipcRenderer.invoke('open-map', map),
  setAuto: (enabled, intervalMs) => ipcRenderer.invoke('set-auto', enabled, intervalMs),
  cleanupNow: () => ipcRenderer.invoke('cleanup-now'),
  onNewScreenshot: (cb) => ipcRenderer.on('new-screenshot', (_, data) => cb(data))
});
