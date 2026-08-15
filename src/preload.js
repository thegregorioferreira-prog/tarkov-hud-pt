const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('tarkov', {
  openOverlay: () => ipcRenderer.send('open-overlay'),
  closeOverlay: () => ipcRenderer.send('close-overlay'),
  syncState: (state) => ipcRenderer.send('overlay-state', state),
  onSyncState: (cb) => ipcRenderer.on('sync-state', (_, data) => cb(data))
});