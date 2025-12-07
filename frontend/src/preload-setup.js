const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  completeSetup: (setupData) => ipcRenderer.invoke('complete-setup', setupData),
  setupComplete: () => ipcRenderer.send('setup-complete'),
  validateLicense: (licenseKey) => ipcRenderer.invoke('validate-license', licenseKey)
});