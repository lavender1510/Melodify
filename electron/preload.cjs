const { contextBridge, ipcRenderer } = require('electron');
// Explizite, kleine API: kein Node-Zugriff im Renderer.
contextBridge.exposeInMainWorld('melodify', {
  load: () => ipcRenderer.invoke('state:load'),
  diagnoseMedia: (id) => ipcRenderer.invoke('media:diagnose', id),
  save: (patch) => ipcRenderer.invoke('state:save', patch),
  addFolders: () => ipcRenderer.invoke('library:add-folder'),
  rescan: () => ipcRenderer.invoke('library:rescan'),
  importPlaylist: () => ipcRenderer.invoke('playlists:import'),
  setMinimizeToTray: (enabled) => ipcRenderer.invoke('settings:tray', enabled),
  showWindow: () => ipcRenderer.invoke('window:show'),
  onScanProgress: (callback) => { const fn = (_e, progress) => callback(progress); ipcRenderer.on('scan:progress', fn); return () => ipcRenderer.removeListener('scan:progress', fn); },
  onMediaAction: (callback) => { const fn = (_e, action) => callback(action); ipcRenderer.on('media:action', fn); return () => ipcRenderer.removeListener('media:action', fn); }
});
