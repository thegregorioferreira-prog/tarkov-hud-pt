const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('tarkov', {
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  getFolder: () => ipcRenderer.invoke('get-folder'),
  cleanupNow: () => ipcRenderer.invoke('cleanup-now'),
  openMap: (map) => ipcRenderer.invoke('open-map', map),
  setRemoteId: (id) => ipcRenderer.invoke('set-remote-id', id),
  getRemoteId: () => ipcRenderer.invoke('get-remote-id'),
  selectMap: (map) => ipcRenderer.invoke('map-select', map),
  onNewScreenshot: (cb) => ipcRenderer.on('new-screenshot', (_, data) => cb(data)),
  onRemoteStatus: (cb) => ipcRenderer.on('remote-status', (_, data) => cb(data))
});
