const { contextBridge, ipcRenderer } = require('electron');
// Explizite, kleine API: kein Node-Zugriff im Renderer.
contextBridge.exposeInMainWorld('melodify', {
  onClosing: (callback) => {const fn=()=>callback();ipcRenderer.on('session:closing',fn);return ()=>ipcRenderer.removeListener('session:closing',fn);},
  closeReady: (saved=true) => ipcRenderer.send('session:closed',saved),
  load: () => ipcRenderer.invoke('state:load'),
  diagnoseMedia: (id) => ipcRenderer.invoke('media:diagnose', id),
  save: (patch) => ipcRenderer.invoke('state:save', patch),
  addFolders: () => ipcRenderer.invoke('library:add-folder'),
  rescan: (folder) => ipcRenderer.invoke('library:rescan',folder),
  watchFolder: (folder,enabled) => ipcRenderer.invoke('library:watch',folder,enabled),
  cancelScan: () => ipcRenderer.invoke('library:cancel'),
  removeFolder: (folder) => ipcRenderer.invoke('library:remove',folder),
  recover: () => ipcRenderer.invoke('state:recover'),
  exportPlaylist: (id) => ipcRenderer.invoke('playlists:export',id),
  importPlaylist: () => ipcRenderer.invoke('playlists:import'),
  setMinimizeToTray: (enabled) => ipcRenderer.invoke('settings:tray', enabled),
  showWindow: () => ipcRenderer.invoke('window:show'),
  onScanProgress: (callback) => { const fn = (_e, progress) => callback(progress); ipcRenderer.on('scan:progress', fn); return () => ipcRenderer.removeListener('scan:progress', fn); },
  onMediaAction: (callback) => { const fn = (_e, action) => callback(action); ipcRenderer.on('media:action', fn); return () => ipcRenderer.removeListener('media:action', fn); }
});
