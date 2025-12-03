const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  restartApp: () => ipcRenderer.invoke('restart-app')
});

// Expose app info
contextBridge.exposeInMainWorld('appInfo', {
  platform: process.platform,
  arch: process.arch,
  version: process.versions.electron
});