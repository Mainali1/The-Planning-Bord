const { app, BrowserWindow, ipcMain, Menu, dialog, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');

// Configure logging
log.transports.file.level = 'info';
log.transports.console.level = 'info';
log.info('Electron main process starting...');

// Keep a global reference of the window object
let mainWindow;
let backendProcess;

// Determine if we're in development mode
const isDev = process.argv.includes('--dev');
const isDebug = process.argv.includes('--debug');

// Backend configuration
const BACKEND_PORT = process.env.BACKEND_PORT || 8000;
const BACKEND_HOST = process.env.BACKEND_HOST || 'localhost';
const BACKEND_URL = `http://${BACKEND_HOST}:${BACKEND_PORT}`;

function createWindow() {
    log.info('Creating main window...');
    
    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'assets', 'icon.png'),
        show: false, // Don't show until ready
        titleBarStyle: 'default'
    });

    // Load the app
    if (isDev) {
        // In development, load from local development server
        mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
        mainWindow.webContents.openDevTools();
    } else {
        // In production, load the built React app
        mainWindow.loadFile(path.join(__dirname, 'renderer', 'build', 'index.html'));
    }

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        log.info('Main window ready to show');
        mainWindow.show();
        
        if (isDebug) {
            mainWindow.webContents.openDevTools();
        }
    });

    // Handle window closed
    mainWindow.on('closed', () => {
        log.info('Main window closed');
        mainWindow = null;
    });

    // Set up the menu
    createMenu();
}

function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Settings',
                    click: () => {
                        // Open settings window
                        mainWindow.webContents.send('navigate-to', '/settings');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Exit',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Tools',
            submenu: [
                {
                    label: 'Backup Database',
                    click: async () => {
                        await backupDatabase();
                    }
                },
                {
                    label: 'Check for Updates',
                    click: () => {
                        // Implement update check
                        shell.openExternal('https://your-website.com/downloads');
                    }
                }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'About The Planning Bord',
                            message: 'The Planning Bord Desktop Application',
                            detail: 'Version 1.0.0\\nA comprehensive business management system.'
                        });
                    }
                },
                {
                    label: 'Documentation',
                    click: () => {
                        shell.openExternal('https://your-docs-url.com');
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

async function startBackend() {
    log.info('Starting backend server...');
    
    try {
        // Determine the Python executable path
        const pythonPath = isDev 
            ? 'python'  // In dev, use system Python
            : path.join(process.resourcesPath, 'backend', 'python.exe'); // In prod, use bundled Python
        
        const backendScript = isDev
            ? path.join(__dirname, '..', '..', 'backend', 'main.py')
            : path.join(process.resourcesPath, 'backend', 'main.py');
        
        // Check if backend script exists
        if (!fs.existsSync(backendScript)) {
            log.error(`Backend script not found: ${backendScript}`);
            throw new Error('Backend script not found');
        }
        
        // Start backend process
        backendProcess = spawn(pythonPath, [backendScript], {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: isDev 
                ? path.join(__dirname, '..', '..', 'backend')
                : path.join(process.resourcesPath, 'backend')
        });
        
        backendProcess.stdout.on('data', (data) => {
            log.info(`Backend: ${data.toString().trim()}`);
        });
        
        backendProcess.stderr.on('data', (data) => {
            log.error(`Backend Error: ${data.toString().trim()}`);
        });
        
        backendProcess.on('close', (code) => {
            log.info(`Backend process exited with code ${code}`);
            if (code !== 0) {
                log.error('Backend process crashed');
                // Optionally restart the backend or show error to user
            }
        });
        
        // Wait a bit for backend to start
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        log.info('Backend server started successfully');
        
    } catch (error) {
        log.error('Failed to start backend:', error);
        throw error;
    }
}

async function stopBackend() {
    log.info('Stopping backend server...');
    
    if (backendProcess) {
        backendProcess.kill('SIGTERM');
        backendProcess = null;
    }
}

async function backupDatabase() {
    try {
        const result = await dialog.showSaveDialog(mainWindow, {
            title: 'Backup Database',
            defaultPath: `planning_bord_backup_${new Date().toISOString().split('T')[0]}.db`,
            filters: [
                { name: 'SQLite Database', extensions: ['db'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        
        if (!result.canceled && result.filePath) {
            // Implement database backup logic
            const dbPath = path.join(app.getPath('userData'), 'planning_bord.db');
            
            if (fs.existsSync(dbPath)) {
                fs.copyFileSync(dbPath, result.filePath);
                dialog.showMessageBox(mainWindow, {
                    type: 'info',
                    title: 'Backup Complete',
                    message: 'Database backup completed successfully!'
                });
            } else {
                dialog.showErrorBox('Backup Failed', 'Database file not found.');
            }
        }
    } catch (error) {
        log.error('Backup failed:', error);
        dialog.showErrorBox('Backup Failed', error.message);
    }
}

// IPC handlers
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

ipcMain.handle('get-backend-url', () => {
    return BACKEND_URL;
});

ipcMain.handle('check-backend-status', async () => {
    try {
        const response = await fetch(`${BACKEND_URL}/health`);
        return response.ok;
    } catch (error) {
        log.error('Backend status check failed:', error);
        return false;
    }
});

ipcMain.handle('show-notification', (event, title, body) => {
    const notifier = require('node-notifier');
    notifier.notify({
        title: title,
        message: body,
        icon: path.join(__dirname, 'assets', 'icon.png'),
        sound: true,
        wait: true
    });
});

// App event handlers
app.whenReady().then(async () => {
    log.info('App is ready');
    
    try {
        await startBackend();
        createWindow();
    } catch (error) {
        log.error('Failed to initialize app:', error);
        dialog.showErrorBox('Startup Error', 'Failed to start the application. Please check the logs.');
        app.quit();
    }
});

app.on('window-all-closed', () => {
    log.info('All windows closed');
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.on('before-quit', async (event) => {
    log.info('App is about to quit');
    
    // Prevent immediate quit
    event.preventDefault();
    
    try {
        await stopBackend();
        log.info('Backend stopped successfully');
    } catch (error) {
        log.error('Error stopping backend:', error);
    }
    
    // Now quit the app
    app.exit();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    log.error('Uncaught Exception:', error);
    dialog.showErrorBox('Unexpected Error', error.message);
});

process.on('unhandledRejection', (reason, promise) => {
    log.error('Unhandled Rejection at:', promise, 'reason:', reason);
});