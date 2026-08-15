const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('tarkov', {
  pickMedalFolder: () => ipcRenderer.invoke('pick-medal-folder'),
  pickEftFolder: () => ipcRenderer.invoke('pick-eft-folder'),
  getFolders: () => ipcRenderer.invoke('get-folders'),
  getLatestMedal: () => ipcRenderer.invoke('get-latest-medal'),
  getLatestEft: () => ipcRenderer.invoke('get-latest-eft'),
  readImage: (filePath) => ipcRenderer.invoke('read-image', filePath),
  onNewMedal: (cb) => ipcRenderer.on('new-medal', (_, data) => cb(data)),
  onNewEft: (cb) => ipcRenderer.on('new-eft', (_, data) => cb(data))
});
