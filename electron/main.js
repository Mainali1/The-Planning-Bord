const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const log = require('electron-log');

// Configure logging
log.transports.file.level = 'info';
log.info('Application starting...');

let mainWindow;
let backendProcess;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false
  });

  // Load the frontend
  const frontendPath = path.join(__dirname, 'frontend', 'index.html');
  mainWindow.loadFile(frontendPath);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    log.info('Main window shown');
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Set up menu
  createMenu();
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
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
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function startBackend() {
  return new Promise((resolve, reject) => {
    const backendPath = path.join(__dirname, 'backend', 'src', 'server.js');
    const nodePath = process.execPath;
    
    log.info('Starting backend server...');
    
    backendProcess = spawn(nodePath, [backendPath], {
      cwd: path.join(__dirname, 'backend'),
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: '5000',
        DB_HOST: 'localhost',
        DB_PORT: '5432',
        DB_NAME: 'planning_bord',
        DB_USER: 'postgres',
        DB_PASSWORD: 'password'
      }
    });

    backendProcess.stdout.on('data', (data) => {
      log.info(`Backend: ${data}`);
      if (data.toString().includes('Server running on port')) {
        resolve();
      }
    });

    backendProcess.stderr.on('data', (data) => {
      log.error(`Backend Error: ${data}`);
    });

    backendProcess.on('error', (error) => {
      log.error(`Backend process error: ${error}`);
      reject(error);
    });

    backendProcess.on('exit', (code) => {
      log.info(`Backend process exited with code ${code}`);
    });
  });
}

// App event handlers
app.whenReady().then(async () => {
  try {
    // Start backend server
    await startBackend();
    
    // Create main window
    createWindow();
    
    log.info('Application ready');
  } catch (error) {
    log.error('Failed to start application:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (backendProcess) {
    log.info('Stopping backend server...');
    backendProcess.kill();
  }
});

// IPC handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('restart-app', () => {
  app.relaunch();
  app.quit();
});