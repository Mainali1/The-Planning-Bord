/**
 * Post-installation setup helper for The Planning Bord
 * This script helps users get started after installation
 */

const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');

let mainWindow;
let backendProcess;
let setupWindow;

// Configuration paths
const CONFIG_DIR = path.join(os.homedir(), '.planningbord');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const LICENSE_FILE = path.join(CONFIG_DIR, 'license.key');

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function isSetupComplete() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return false;
    }
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    const licenseOk = fs.existsSync(LICENSE_FILE) && fs.readFileSync(LICENSE_FILE, 'utf8').trim().length > 0;
    const versionOk = typeof app.getVersion === 'function' ? config.version === app.getVersion() : true;
    return config.security?.setup_complete === true && licenseOk && versionOk;
  } catch (error) {
    console.error('Error checking setup status:', error);
    return false;
  }
}

function createSetupWindow() {
  setupWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload-setup.js')
    },
    resizable: false,
    maximizable: false,
    minimizable: false,
    alwaysOnTop: true,
    title: 'The Planning Bord - Initial Setup',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    autoHideMenuBar: true
  });

  setupWindow.loadFile(path.join(__dirname, 'setup.html'));
  
  setupWindow.on('closed', () => {
    setupWindow = null;
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    show: false,
    autoHideMenuBar: true
  });

  // Load UI: prefer dev server, fallback to built files
  const isDev = process.env.NODE_ENV === 'development';
  const devUrl = 'http://localhost:5173';
  (async () => {
    if (isDev) {
      try {
        const res = await fetch(devUrl);
        if (res && (res.ok || res.status === 0)) {
          await mainWindow.loadURL(devUrl);
          mainWindow.webContents.openDevTools();
          return;
        }
      } catch {}
    }
    await mainWindow.loadFile(path.join(__dirname, 'frontend', 'src', 'renderer', 'build', 'index.html'));
  })();

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startBackend() {
  console.log('Starting backend...');
  const isPackaged = app.isPackaged;
  const resourcesRoot = process.resourcesPath;
  const backendRoot = isPackaged
    ? path.join(resourcesRoot, 'backend')
    : path.join(__dirname, '..', '..', 'backend');
  const unpackedBackendRoot = isPackaged
    ? path.join(resourcesRoot, 'app.asar.unpacked', 'backend')
    : backendRoot;
  ensureConfigDir();
  const logsDir = path.join(CONFIG_DIR, 'logs');
  try { fs.mkdirSync(logsDir, { recursive: true }); } catch {}
  const logFile = path.join(logsDir, 'backend.log');
  
  // Try the compiled executable first
  const backendPath = path.join(backendRoot, 'dist', 'PlanningBordServer.exe');
  console.log(`Checking for compiled backend at: ${backendPath}`);
  
  if (fs.existsSync(backendPath)) {
    console.log('Found compiled backend, starting...');
    try {
      backendProcess = spawn(backendPath, [], {
        stdio: 'pipe',
        cwd: backendRoot
      });
    } catch (e) {
      console.error('Failed to start compiled backend:', e.message);
      return Promise.resolve();
    }
    
    const out = fs.createWriteStream(logFile, { flags: 'a' });
    backendProcess.stdout.on('data', (data) => { try { out.write(data); } catch {} });
    backendProcess.stderr.on('data', (data) => { try { out.write(Buffer.from(`\nERROR: ${data}`)); } catch {} });
    
    backendProcess.on('close', (code) => {
      console.log(`Backend process exited with code ${code}`);
    });
    
    // Wait a bit for backend to start
    return new Promise((resolve) => {
      setTimeout(resolve, 3000);
    });
  } else {
    console.log('Compiled backend executable not found at:', backendPath);
    
    // Check if we're running from a packaged app (no venv available)
    let mainPyPath = path.join(backendRoot, 'main.py');
    if (!fs.existsSync(mainPyPath)) {
      mainPyPath = path.join(unpackedBackendRoot, 'main.py');
    }
    console.log(`Checking for main.py at: ${mainPyPath}`);
    
    // Check for bundled Python interpreter
    const bundledPython = path.join(backendRoot, 'python.exe');
    const bundledPythonUnpacked = path.join(unpackedBackendRoot, 'python.exe');
    console.log(`Checking for bundled Python at: ${bundledPython}`);
    console.log(`Checking for bundled Python at: ${bundledPythonUnpacked}`);
    
    if (fs.existsSync(mainPyPath)) {
      // In packaged app, skip venv check and go straight to system Python
      const isPackaged = !process.env.NODE_ENV || process.env.NODE_ENV === 'production';
      
      if (isPackaged) {
        console.log('Running from packaged app, looking for Python interpreter...');
        
        // Try bundled Python first
        let pythonCommand = 'python'; // fallback to system Python
        if (fs.existsSync(bundledPython)) {
          pythonCommand = bundledPython;
          console.log('Found bundled Python interpreter:', bundledPython);
        } else if (fs.existsSync(bundledPythonUnpacked)) {
          pythonCommand = bundledPythonUnpacked;
          console.log('Found bundled Python interpreter in unpacked:', bundledPythonUnpacked);
        } else {
          console.log('No bundled Python found, falling back to system Python');
        }
        
        try {
          backendProcess = spawn(pythonCommand, [mainPyPath], {
            stdio: 'pipe',
            cwd: backendRoot
          });
        } catch (e) {
          console.error('Failed to start Python backend:', e.message);
          return Promise.resolve();
        }
        
        const out = fs.createWriteStream(logFile, { flags: 'a' });
        backendProcess.stdout.on('data', (data) => { 
          try { 
            out.write(data); 
            console.log(`Backend: ${data}`);
          } catch {} 
        });
        
        backendProcess.stderr.on('data', (data) => { 
          try { 
            out.write(Buffer.from(`\nERROR: ${data}`));
            console.error(`Backend Error: ${data}`);
          } catch {} 
        });
        
        backendProcess.on('close', (code) => {
          console.log(`Backend process exited with code ${code}`);
        });
        
        return new Promise((resolve) => {
          setTimeout(resolve, 5000);
        });
      } else {
        // Development mode - try venv first
        const pythonVenvPath = fs.existsSync(path.join(backendRoot, 'venv', 'Scripts', 'python.exe'))
          ? path.join(backendRoot, 'venv', 'Scripts', 'python.exe')
          : path.join(unpackedBackendRoot, 'venv', 'Scripts', 'python.exe');
        console.log(`Checking for Python venv at: ${pythonVenvPath}`);
        
        if (fs.existsSync(pythonVenvPath)) {
          console.log('Found Python venv, starting backend with venv Python...');
          try {
          backendProcess = spawn(pythonVenvPath, [mainPyPath], {
            stdio: 'pipe',
            cwd: fs.existsSync(backendRoot) ? backendRoot : unpackedBackendRoot
          });
          } catch (e) {
            console.error('Failed to start venv Python backend:', e.message);
            return Promise.resolve();
          }
          
          const out = fs.createWriteStream(logFile, { flags: 'a' });
          backendProcess.stdout.on('data', (data) => { 
            try { 
              out.write(data); 
              console.log(`Backend: ${data}`);
            } catch {} 
          });
          
          backendProcess.stderr.on('data', (data) => { 
            try { 
              out.write(Buffer.from(`\nERROR: ${data}`));
              console.error(`Backend Error: ${data}`);
            } catch {} 
          });
          
          return new Promise((resolve) => {
            setTimeout(resolve, 5000);
          });
        } else {
          console.log('Python venv not found, trying bundled or system Python...');
          
          // Try bundled Python first, then system Python
          let pythonCommand = 'python'; // fallback to system Python
          if (fs.existsSync(bundledPython)) {
            pythonCommand = bundledPython;
            console.log('Using bundled Python interpreter:', bundledPython);
          } else if (fs.existsSync(bundledPythonUnpacked)) {
            pythonCommand = bundledPythonUnpacked;
            console.log('Using bundled Python interpreter in unpacked:', bundledPythonUnpacked);
          } else {
            console.log('Using system Python');
          }
          
          try {
            backendProcess = spawn(pythonCommand, [mainPyPath], {
              stdio: 'pipe',
              cwd: fs.existsSync(backendRoot) ? backendRoot : unpackedBackendRoot
            });
          } catch (e) {
            console.error('Failed to start Python backend:', e.message);
            return Promise.resolve();
          }
          
          const out = fs.createWriteStream(logFile, { flags: 'a' });
          backendProcess.stdout.on('data', (data) => { 
            try { 
              out.write(data); 
              console.log(`Backend: ${data}`);
            } catch {} 
          });
          
          backendProcess.stderr.on('data', (data) => { 
            try { 
              out.write(Buffer.from(`\nERROR: ${data}`));
              console.error(`Backend Error: ${data}`);
            } catch {} 
          });
          
          return new Promise((resolve) => {
            setTimeout(resolve, 5000);
          });
        }
      }
    } else {
      console.log('main.py not found at:', mainPyPath);
      console.log('Continuing without backend. Some features may be unavailable.');
      return Promise.resolve();
    }
  }
}

async function checkBackendHealth() {
  try {
    const response = await fetch('http://localhost:8000/health');
    return response.ok;
  } catch (error) {
    console.log('Backend health check failed:', error.message);
    return false;
  }
}

async function waitForBackendHealthy(maxSeconds = 15) {
  for (let i = 0; i < maxSeconds; i++) {
    if (await checkBackendHealth()) return true;
    await new Promise(r => setTimeout(r, 1000));
  }
  return false;
}

// Remove app menu
Menu.setApplicationMenu(null);

// IPC handlers
if (!ipcMain || typeof ipcMain.handle !== 'function') {
  throw new Error('Electron IPC not available. Start the app using Electron (e.g., npm run dev:frontend)');
}
ipcMain.handle('check-backend-status', async () => {
  const ok = await checkBackendHealth();
  try { mainWindow?.webContents.send('backend-status-changed', ok); } catch {}
  return ok;
});

ipcMain.handle('complete-setup', async (event, setupData) => {
  try {
    ensureConfigDir();
    
    // Save configuration
    const config = {
      version: '1.0.0',
      setup_completed_at: new Date().toISOString(),
      company: {
        name: setupData.companyName,
        admin_email: setupData.adminEmail
      },
      server: {
        mode: setupData.serverMode,
        cloud_server_url: setupData.cloudServerUrl,
        cloud_api_key: setupData.cloudApiKey
      },
      microsoft_365: {
        client_id: setupData.ms365ClientId,
        tenant_id: setupData.ms365TenantId,
        client_secret: setupData.ms365ClientSecret,
        enabled: !!(setupData.ms365ClientId && setupData.ms365TenantId)
      },
      features: {
        inventory: setupData.enableInventory,
        employees: setupData.enableEmployees,
        finance: setupData.enableFinance,
        notifications: setupData.enableNotifications
      },
      security: {
        setup_complete: true,
        license_key: setupData.licenseKey
      }
    };
    
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    
    // Save license key separately
    fs.writeFileSync(LICENSE_FILE, setupData.licenseKey);
    
    try {
      if (!backendProcess) {
        await startBackend();
      }
    } catch {}
    const healthy = await waitForBackendHealthy(15);
    try { setupWindow?.webContents.send('backend-status-changed', healthy); } catch {}
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('validate-license', async (event, licenseKey) => {
  // Basic license validation
  const parts = licenseKey.split('-');
  if (parts.length !== 4) {
    return { valid: false, message: 'Invalid format. Use XXXX-XXXX-XXXX-XXXX' };
  }
  
  for (const part of parts) {
    if (part.length !== 4 || !part.match(/^[A-Z0-9]+$/)) {
      return { valid: false, message: 'Invalid format. Use XXXX-XXXX-XXXX-XXXX' };
    }
  }
  
  // TODO: Add license server validation
  return { valid: true, message: 'License key format is valid' };
});

// App event handlers
app.whenReady().then(async () => {
  ensureConfigDir();
  
  try {
    console.log('Starting backend...');
    await startBackend();
    console.log('Backend started successfully');
    
    // Check if backend is actually responding
    console.log('Checking backend health...');
    const isHealthy = await checkBackendHealth();
    if (!isHealthy) {
      console.log('Backend health check failed, but continuing...');
    } else {
      console.log('Backend health check passed');
    }
    
    if (!isSetupComplete()) {
      createSetupWindow();
    } else {
      createMainWindow();
    }
  } catch (error) {
    console.error('Startup error:', error);
    dialog.showErrorBox('Startup Error', `Failed to start The Planning Bord: ${error.message}\n\nPlease check that the backend files are properly installed.`);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    if (!isSetupComplete()) {
      createSetupWindow();
    } else {
      createMainWindow();
    }
  }
});

// Handle setup completion
ipcMain.on('setup-complete', async () => {
  if (setupWindow) {
    setupWindow.close();
  }
  try {
    if (!backendProcess) {
      await startBackend();
    }
  } catch {}
  createMainWindow();
});
