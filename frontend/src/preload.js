const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // App info
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    getBackendUrl: () => ipcRenderer.invoke('get-backend-url'),
    
    // Backend communication
    checkBackendStatus: () => ipcRenderer.invoke('check-backend-status'),
    
    // Notifications
    showNotification: (title, body) => ipcRenderer.invoke('show-notification', title, body),
    
    // Navigation
    navigateTo: (route) => ipcRenderer.send('navigate-to', route),
    
    // System info
    platform: process.platform,
    
    // Event listeners
    onNavigateTo: (callback) => {
        ipcRenderer.on('navigate-to', (event, route) => callback(route));
    },
    
    onBackendStatusChange: (callback) => {
        ipcRenderer.on('backend-status-changed', (event, status) => callback(status));
    },
    
    // Remove listeners
    removeAllListeners: (channel) => {
        ipcRenderer.removeAllListeners(channel);
    }
});

// Log that preload script is loaded
console.log('Electron preload script loaded');