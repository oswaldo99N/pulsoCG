const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('pulsoUpdates', {
  getStatus: () => ipcRenderer.invoke('pulso:updates:status'),
  check: () => ipcRenderer.invoke('pulso:updates:check'),
  download: () => ipcRenderer.invoke('pulso:updates:download'),
  install: () => ipcRenderer.invoke('pulso:updates:install'),
  openRelease: () => ipcRenderer.invoke('pulso:updates:release'),
  onStatus: callback => { const listener = (_event, state) => callback(state); ipcRenderer.on('pulso:updates:changed', listener); return () => ipcRenderer.removeListener('pulso:updates:changed', listener); },
  onOpen: callback => { const listener = () => callback(); ipcRenderer.on('pulso:updates:open', listener); return () => ipcRenderer.removeListener('pulso:updates:open', listener); }
});
