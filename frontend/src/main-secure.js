/**
 * Post-installation setup helper for The Planning Bord
 * This script helps users get started after installation
 */

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
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
    if (fs.existsSync(CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      return config.security?.setup_complete === true;
    }
  } catch (error) {
    console.error('Error checking setup status:', error);
  }
  return false;
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
    icon: path.join(__dirname, 'assets', 'icon.ico')
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
    show: false
  });

  // Load the built React app
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'frontend', 'src', 'renderer', 'build', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startBackend() {
  console.log('Starting backend...');
  
  // Try the compiled executable first
  const backendPath = path.join(__dirname, 'backend', 'dist', 'PlanningBordServer.exe');
  console.log(`Checking for compiled backend at: ${backendPath}`);
  
  if (fs.existsSync(backendPath)) {
    console.log('Found compiled backend, starting...');
    backendProcess = spawn(backendPath, [], {
      stdio: 'pipe',
      cwd: path.join(__dirname, 'backend')
    });
    
    backendProcess.stdout.on('data', (data) => {
      console.log(`Backend: ${data}`);
    });
    
    backendProcess.stderr.on('data', (data) => {
      console.error(`Backend Error: ${data}`);
    });
    
    backendProcess.on('close', (code) => {
      console.log(`Backend process exited with code ${code}`);
    });
    
    // Wait a bit for backend to start
    return new Promise((resolve) => {
      setTimeout(resolve, 3000);
    });
  } else {
    console.log('Compiled backend executable not found at:', backendPath);
    
    // Try Python from venv
    const pythonVenvPath = path.join(__dirname, 'backend', 'venv', 'Scripts', 'python.exe');
    const mainPyPath = path.join(__dirname, 'backend', 'main.py');
    
    console.log(`Checking for Python venv at: ${pythonVenvPath}`);
    console.log(`Checking for main.py at: ${mainPyPath}`);
    
    if (fs.existsSync(pythonVenvPath) && fs.existsSync(mainPyPath)) {
      console.log('Found Python venv, starting backend with venv Python...');
      backendProcess = spawn(pythonVenvPath, [mainPyPath], {
        stdio: 'pipe',
        cwd: path.join(__dirname, 'backend')
      });
      
      return new Promise((resolve) => {
        setTimeout(resolve, 5000);
      });
    } else {
      console.log('Python venv not found, trying system Python...');
      
      // Fallback to system Python
      if (fs.existsSync(mainPyPath)) {
        console.log('Found main.py, trying system Python...');
        backendProcess = spawn('python', [mainPyPath], {
          stdio: 'pipe',
          cwd: path.join(__dirname, 'backend')
        });
        
        return new Promise((resolve) => {
          setTimeout(resolve, 5000);
        });
      } else {
        console.log('main.py not found at:', mainPyPath);
        throw new Error('Neither compiled backend nor Python backend found. Checked paths:\n' +
          `Compiled: ${backendPath}\n` +
          `Python venv: ${pythonVenvPath}\n` +
          `main.py: ${mainPyPath}`);
      }
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

// IPC handlers
ipcMain.handle('check-backend-status', async () => {
  return await checkBackendHealth();
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
ipcMain.on('setup-complete', () => {
  if (setupWindow) {
    setupWindow.close();
  }
  createMainWindow();
});