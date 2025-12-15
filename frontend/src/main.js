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

// Setup completion check removed - application starts directly to main window

// Setup window removed - application starts directly to main window

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '..', '..', 'assets', 'icon.ico'),
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
    // Load from the correct path in the packaged app
    const isPackaged = app.isPackaged;
    let frontendPath;
    
    if (isPackaged) {
      // In packaged app, files are in the same directory as main.js
      frontendPath = path.join(__dirname, 'frontend', 'src', 'renderer', 'build', 'index.html');
    } else {
      // In development, use the development build path
      frontendPath = path.join(__dirname, 'frontend', 'src', 'renderer', 'build', 'index.html');
    }
    
    console.log('Loading frontend from:', frontendPath);
    console.log('Is packaged:', isPackaged);
    console.log('__dirname:', __dirname);
    
    // Check if the file exists
    if (fs.existsSync(frontendPath)) {
      await mainWindow.loadFile(frontendPath);
    } else {
      console.error('Frontend file not found at:', frontendPath);
      // Try alternative paths
      const altPath1 = path.join(__dirname, 'resources', 'app', 'frontend', 'src', 'renderer', 'build', 'index.html');
      const altPath2 = path.join(process.resourcesPath, 'app', 'frontend', 'src', 'renderer', 'build', 'index.html');
      
      if (fs.existsSync(altPath1)) {
        console.log('Found frontend at alternative path 1:', altPath1);
        await mainWindow.loadFile(altPath1);
      } else if (fs.existsSync(altPath2)) {
        console.log('Found frontend at alternative path 2:', altPath2);
        await mainWindow.loadFile(altPath2);
      } else {
        // Show error page
        await mainWindow.loadURL(`data:text/html,
          <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
              <h1>The Planning Bord</h1>
              <p>Error: Frontend files not found.</p>
              <p>Expected paths:</p>
              <ul>
                <li>${frontendPath}</li>
                <li>${altPath1}</li>
                <li>${altPath2}</li>
              </ul>
              <p>__dirname: ${__dirname}</p>
              <p>resourcesPath: ${process.resourcesPath}</p>
            </body>
          </html>
        `);
      }
    }
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
  
  // Check for bundled Python interpreter
  const bundledPython = path.join(backendRoot, 'python.exe');
  const bundledPythonUnpacked = path.join(unpackedBackendRoot, 'python.exe');
  console.log(`Checking for bundled Python at: ${bundledPython}`);
  console.log(`Checking for bundled Python at: ${bundledPythonUnpacked}`);
  
  // Try the compiled executable first
  const backendPath = path.join(backendRoot, 'dist', 'PlanningBordServer.exe');
  console.log(`Checking for compiled backend at: ${backendPath}`);
  
  if (fs.existsSync(backendPath)) {
    console.log('Found compiled backend, starting...');
    try {
      backendProcess = spawn(backendPath, [], {
        stdio: 'pipe',
        cwd: fs.existsSync(backendRoot) ? backendRoot : unpackedBackendRoot
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
    
    // Try Python from venv
    const pythonVenvPathCandidate = path.join(backendRoot, 'venv', 'Scripts', 'python.exe');
    const pythonVenvPath = fs.existsSync(pythonVenvPathCandidate)
      ? pythonVenvPathCandidate
      : path.join(unpackedBackendRoot, 'venv', 'Scripts', 'python.exe');
    let mainPyPath = path.join(backendRoot, 'main.py');
    if (!fs.existsSync(mainPyPath)) {
      mainPyPath = path.join(unpackedBackendRoot, 'main.py');
    }
    
    console.log(`Checking for Python venv at: ${pythonVenvPath}`);
    console.log(`Checking for main.py at: ${mainPyPath}`);
    
    if (fs.existsSync(pythonVenvPath) && fs.existsSync(mainPyPath)) {
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
      
      // Fallback to bundled/system Python
      if (fs.existsSync(mainPyPath)) {
        console.log('Found main.py, trying Python...');
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
        
        return new Promise((resolve) => {
          setTimeout(resolve, 5000);
        });
      } else {
        console.log('main.py not found at:', mainPyPath);
        console.log('Continuing without backend. Some features may be unavailable.');
        return Promise.resolve();
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

// Setup completion handler removed - application starts directly to main window
ipcMain.handle('complete-setup', async (event, setupData) => {
  return { success: true, message: 'Setup functionality removed - application starts directly' };
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

// Enhanced startup with user-friendly messages
app.whenReady().then(async () => {
  ensureConfigDir();
  
  // Create splash window for better user experience
  const splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  
  splashWindow.loadURL(`data:text/html,
    <html>
      <body style="margin: 0; padding: 0; background: #2c3e50; color: white; font-family: Arial, sans-serif; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh;">
        <h2 style="margin: 0 0 20px 0;">The Planning Bord</h2>
        <p style="margin: 0 0 10px 0;">Starting application...</p>
        <div style="width: 200px; height: 4px; background: rgba(255,255,255,0.3); border-radius: 2px; overflow: hidden;">
          <div style="width: 0%; height: 100%; background: #3498db; animation: loading 2s ease-in-out infinite;"></div>
        </div>
        <style>
          @keyframes loading {
            0% { width: 0%; }
            50% { width: 70%; }
            100% { width: 100%; }
          }
        </style>
      </body>
    </html>
  `);
  
  try {
    console.log('Starting The Planning Bord...');
    
    // Step 1: Start backend
    console.log('Step 1: Starting backend server...');
    await startBackend();
    console.log('Backend process started');
    
    // Step 2: Wait for backend to be healthy
    console.log('Step 2: Waiting for backend to be ready...');
    const isHealthy = await waitForBackendHealthy(20); // Wait up to 20 seconds
    
    if (!isHealthy) {
      console.log('Backend health check failed after waiting');
      splashWindow.close();
      
      const response = dialog.showMessageBoxSync({
        type: 'warning',
        title: 'Backend Connection Issue',
        message: 'The Planning Bord Backend',
        detail: 'The backend server is taking longer than expected to start. This might be due to:\n\n• First-time initialization\n• System performance\n• Port conflicts\n\nThe application will continue, but some features may be unavailable initially.',
        buttons: ['Continue Anyway', 'Retry', 'Exit'],
        defaultId: 0
      });
      
      if (response === 2) { // Exit
        app.quit();
        return;
      } else if (response === 1) { // Retry
        app.relaunch();
        app.quit();
        return;
      }
      // Continue anyway
    } else {
      console.log('Backend is healthy and ready');
    }
    
    // Step 3: Create main window
    console.log('Step 3: Creating main window...');
    createMainWindow();
    
    // Close splash window after main window is ready
    mainWindow.once('ready-to-show', () => {
      setTimeout(() => {
        splashWindow.close();
        mainWindow.show();
      }, 500);
    });
    
    console.log('Application started successfully!');
    
  } catch (error) {
    console.error('Startup error:', error);
    splashWindow.close();
    
    dialog.showErrorBox(
      'Startup Error', 
      `Failed to start The Planning Bord:\n\n${error.message}\n\nPossible solutions:\n• Make sure the application is properly installed\n• Check that no other application is using port 8000\n• Try running as administrator\n• Contact support if the problem persists`
    );
    
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
    createMainWindow();
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
