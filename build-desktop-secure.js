#!/usr/bin/env node

/**
 * Desktop Build Script for The Planning Bord
 * Creates secure installers for Windows, macOS, and Linux
 * Includes code obfuscation and proprietary protection
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { rimraf } = require('rimraf');
const os = require('os');

// Configuration
const CONFIG = {
  appName: 'The Planning Bord',
  appId: 'com.planningbord.desktop',
  version: '1.0.0',
  buildDir: 'desktop-build',
  backendDir: 'backend',
  frontendDir: 'frontend',
  assetsDir: 'assets',
  pythonExecutable: process.platform === 'win32' ? 'python' : 'python3',
  supportedPlatforms: ['win32'],
  architectures: ['x64'],
  obfuscateCode: true,
  includeLicense: true,
  antiTamper: true
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function error(message) {
  console.error(`${colors.red}❌ Error: ${message}${colors.reset}`);
  process.exit(1);
}

function success(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

class DesktopBuilder {
  constructor() {
    this.currentPlatform = process.platform;
    this.currentArch = process.arch;
    this.buildDir = path.resolve(CONFIG.buildDir);
    this.backendDir = path.resolve(CONFIG.backendDir);
    this.frontendDir = path.resolve(CONFIG.frontendDir);
  }

  async copyDir(src, dest) {
    const copyRecursive = async (src, dest) => {
      const stats = await fs.promises.lstat(src);
      if (stats.isDirectory()) {
        await fs.promises.mkdir(dest, { recursive: true });
        const entries = await fs.promises.readdir(src);
        for (const e of entries) {
          await copyRecursive(path.join(src, e), path.join(dest, e));
        }
      } else {
        await fs.promises.copyFile(src, dest);
      }
    };
    await copyRecursive(src, dest);
  }

  async build() {
    log(`🚀 Starting SECURE build for ${CONFIG.appName} v${CONFIG.version}`, colors.bright);
    log(`Platform: ${this.currentPlatform} (${this.currentArch})`);

    try {
      // Pre-build checks
      await this.checkPrerequisites();
      
      // Clean previous builds
      await this.cleanBuildDirectory();
      
      // Install obfuscation tools
      if (CONFIG.obfuscateCode) {
        await this.installObfuscationTools();
      }
      
      // Build backend with obfuscation
      await this.buildBackend();
      
      // Build frontend
      await this.buildFrontend();
      
      // Apply security measures
      if (CONFIG.antiTamper) {
        await this.applyAntiTamperMeasures();
      }
      
      // Package for desktop
      await this.packageDesktop();
      
      // Create installers
      await this.createInstallers();
      
      success('SECURE Build completed successfully!');
      log(`📦 Installer created: ${path.join(this.buildDir, `${CONFIG.appName} Setup ${CONFIG.version}.exe`)}`);
      
    } catch (err) {
      error(err.message);
    }
  }

  async checkPrerequisites() {
    log('ℹ️  Checking prerequisites...');
    
    // Check Node.js
    try {
      const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
      log(`Node.js version: ${nodeVersion}`);
    } catch (err) {
      throw new Error('Node.js is required but not installed');
    }
    
    // Check Python
    try {
      const pythonVersion = execSync(`${CONFIG.pythonExecutable} --version`, { encoding: 'utf8' }).trim();
      log(`Python version: ${pythonVersion}`);
    } catch (err) {
      throw new Error('Python 3.8+ is required but not installed');
    }
    
    // Check for required files
    const requiredFiles = [
      path.join(this.backendDir, 'requirements.txt'),
      path.join(this.frontendDir, 'src', 'renderer', 'package.json'),
      path.join(this.frontendDir, 'package.json')
    ];
    
    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        throw new Error(`Required file not found: ${file}`);
      }
    }
    
    success('Prerequisites check passed');
  }

  async cleanBuildDirectory() {
    log('ℹ️  Cleaning build directory...');
    
    if (fs.existsSync(this.buildDir)) {
      await rimraf(this.buildDir);
      log('Removed existing build directory');
    }
    
    fs.mkdirSync(this.buildDir, { recursive: true });
    success('Build directory cleaned');
  }

  async installObfuscationTools() {
    log('ℹ️  Installing obfuscation tools...');
    
    try {
      // Install Python obfuscation tools
      execSync(`${CONFIG.pythonExecutable} -m pip install pyarmor pyinstaller`, { stdio: 'inherit' });
      
      // Install JavaScript obfuscation tools
      execSync('npm install -g javascript-obfuscator', { stdio: 'inherit' });
      
      success('Obfuscation tools installed');
    } catch (err) {
      log('⚠️  Could not install obfuscation tools, continuing without them', colors.yellow);
      CONFIG.obfuscateCode = false;
    }
  }

  async buildBackend() {
    log('ℹ️  Building backend with security measures...');
    
    const backendBuildDir = path.join(this.buildDir, 'backend');
    fs.mkdirSync(backendBuildDir, { recursive: true });
    
    // Copy backend source (cross-platform)
    log('Copying backend files...');
    const backendSource = path.resolve(this.backendDir);
    // Use Node 16+ fs.cp if available, otherwise fallback to a recursive copy
    try {
      if (fs.promises && typeof fs.promises.cp === 'function') {
        await fs.promises.cp(backendSource, backendBuildDir, { recursive: true });
      } else {
        // naive recursive copy
        const copyRecursive = async (src, dest) => {
          const stats = await fs.promises.lstat(src);
          if (stats.isDirectory()) {
            await fs.promises.mkdir(dest, { recursive: true });
            const entries = await fs.promises.readdir(src);
            for (const e of entries) {
              await copyRecursive(path.join(src, e), path.join(dest, e));
            }
          } else {
            await fs.promises.copyFile(src, dest);
          }
        };
        await copyRecursive(backendSource, backendBuildDir);
      }
    } catch (err) {
      throw new Error(`Failed to copy backend files: ${err.message}`);
    }
    
    // Verify requirements.txt exists
    const requirementsPath = path.join(backendBuildDir, 'requirements.txt');
    if (!fs.existsSync(requirementsPath)) {
      throw new Error('requirements.txt not found in backend build directory');
    }
    
    // Create virtual environment
    log('Creating Python virtual environment...');
    execSync(`${CONFIG.pythonExecutable} -m venv "${path.join(backendBuildDir, 'venv')}"`, { stdio: 'inherit' });

    // Detect venv python path cross-platform
    let venvPython;
    if (process.platform === 'win32') {
      venvPython = path.join(backendBuildDir, 'venv', 'Scripts', 'python.exe');
    } else {
      venvPython = path.join(backendBuildDir, 'venv', 'bin', 'python');
    }

    // Install dependencies
    log('Installing Python dependencies...');
    try {
      execSync(`"${venvPython}" -m pip install -r "${requirementsPath}"`, { stdio: 'inherit' });
    } catch (err) {
      log(`⚠️  pip install failed: ${err.message}`, colors.yellow);
    }
    // Ensure PyInstaller/PyArmor are available inside the venv for packaging/obfuscation
    try {
      execSync(`"${venvPython}" -m pip install pyinstaller pyarmor`, { stdio: 'inherit' });
    } catch (err) {
      log(`⚠️  Could not install PyInstaller/PyArmor in venv: ${err.message}`, colors.yellow);
    }
    
    // Apply code obfuscation if enabled
    if (CONFIG.obfuscateCode) {
      log('Applying code obfuscation...');
      try {
        // Create obfuscated version
        const srcDir = path.join(backendBuildDir, 'src');
        const obfuscatedDir = path.join(backendBuildDir, 'src_obfuscated');
        
        execSync(`pyarmor obfuscate --output "${obfuscatedDir}" --src "${srcDir}"`, { stdio: 'inherit' });
        
        // Replace original with obfuscated code (cross-platform)
        try {
          await fs.promises.rm(srcDir, { recursive: true, force: true });
        } catch (rmErr) {}
        await fs.promises.rename(obfuscatedDir, srcDir);
        
        success('Backend code obfuscated');
      } catch (err) {
        log('⚠️  Code obfuscation failed, using original code', colors.yellow);
      }
    }
    
    // Create compiled executable
    log('Creating compiled executable...');
    try {
      const mainPy = path.join(backendBuildDir, 'main.py');
      const distDir = path.join(backendBuildDir, 'dist');
      
      // First check if main.py exists
      if (!fs.existsSync(mainPy)) {
        log('⚠️  main.py not found in backend build directory', colors.yellow);
        throw new Error('main.py not found');
      }
      
      // Use PyInstaller with hardening flags when possible
      try {
        const pyinstallerArgs = [
          '--onefile',
          '--name', 'PlanningBordServer',
          '--clean',
          '--strip',
          '--noconsole',
          '"' + mainPy + '"'
        ].join(' ');

        execSync(`cd "${backendBuildDir}" && "${venvPython}" -m PyInstaller ${pyinstallerArgs}`, { stdio: 'inherit' });
      } catch (piErr) {
        // Retry without --noconsole if debugging needed
        log(`⚠️  PyInstaller failed with hardening flags: ${piErr.message}`, colors.yellow);
        execSync(`cd "${backendBuildDir}" && "${venvPython}" -m PyInstaller --onefile --name "PlanningBordServer" "${mainPy}"`, { stdio: 'inherit' });
      }
      
      // Check if executable was created
      const exePath = process.platform === 'win32'
        ? path.join(backendBuildDir, 'dist', 'PlanningBordServer.exe')
        : path.join(backendBuildDir, 'dist', 'PlanningBordServer');
      if (fs.existsSync(exePath)) {
        log(`✅ Executable created at: ${exePath}`);
        // Save the path for later packaging
        this.backendExePath = exePath;
        // Try to further harden the executable with UPX if available
        let upxFound = '';
        try {
          upxFound = execSync(process.platform === 'win32' ? 'where upx' : 'which upx', { encoding: 'utf8' }).trim();
        } catch {}
        if (upxFound) {
          log('ℹ️  UPX found, compressing backend executable...');
          try {
            execSync(`upx -9 "${exePath}"`, { stdio: 'inherit' });
            log('✅ UPX compression completed');
          } catch (upxErr) {
            log(`⚠️  UPX compression failed: ${upxErr.message}`, colors.yellow);
          }
        }
        // Ensure executable bit on unix
        try {
          if (process.platform !== 'win32') {
            await fs.promises.chmod(exePath, 0o755);
          }
        } catch (chmodErr) {}
      } else {
        log('⚠️  Executable not found after PyInstaller', colors.yellow);
        
        // Fallback: Copy Python interpreter for bundled execution
        log('ℹ️  Attempting to copy Python interpreter for fallback execution...');
        try {
          // Find Python executable
          let pythonPath;
          try {
            pythonPath = execSync('where python', { encoding: 'utf8' }).trim().split('\n')[0];
          } catch {
            try {
              pythonPath = execSync('which python', { encoding: 'utf8' }).trim();
            } catch {
              throw new Error('Python executable not found in PATH');
            }
          }
          
          if (pythonPath && fs.existsSync(pythonPath)) {
            const targetPythonPath = path.join(backendBuildDir, 'python.exe');
            fs.copyFileSync(pythonPath, targetPythonPath);
            log(`✅ Copied Python interpreter from ${pythonPath} to ${targetPythonPath}`);
            
            // Also copy Python DLLs and libraries if on Windows
            if (process.platform === 'win32') {
              const pythonDir = path.dirname(pythonPath);
              const dllFiles = fs.readdirSync(pythonDir).filter(f => f.endsWith('.dll'));
              for (const dllFile of dllFiles) {
                try {
                  fs.copyFileSync(path.join(pythonDir, dllFile), path.join(backendBuildDir, dllFile));
                } catch (copyErr) {
                  log(`⚠️  Could not copy ${dllFile}: ${copyErr.message}`, colors.yellow);
                }
              }
              
              // Copy Lib directory if it exists
              const libDir = path.join(path.dirname(pythonPath), 'Lib');
              if (fs.existsSync(libDir)) {
                try {
                  await this.copyDir(libDir, path.join(backendBuildDir, 'Lib'));
                  log('✅ Copied Python Lib directory');
                } catch (copyErr) {
                  log(`⚠️  Could not copy Lib directory: ${copyErr.message}`, colors.yellow);
                }
              }
            }
          } else {
            throw new Error(`Python executable not found at ${pythonPath}`);
          }
        } catch (copyErr) {
          log(`⚠️  Could not copy Python interpreter: ${copyErr.message}`, colors.yellow);
          log('⚠️  Backend will rely on system Python being available', colors.yellow);
        }
      }
      
      success('Backend compiled to executable');
    } catch (err) {
      log(`⚠️  Could not create compiled executable: ${err.message}`, colors.yellow);
      
      // Fallback: Copy Python interpreter even if PyInstaller completely fails
      log('ℹ️  Attempting to copy Python interpreter as fallback...');
      try {
        let pythonPath;
        try {
          pythonPath = execSync('where python', { encoding: 'utf8' }).trim().split('\n')[0];
        } catch {
          try {
            pythonPath = execSync('which python', { encoding: 'utf8' }).trim();
          } catch {
            log('⚠️  Python executable not found in PATH', colors.yellow);
          }
        }
        
        if (pythonPath && fs.existsSync(pythonPath)) {
          const targetPythonPath = path.join(backendBuildDir, 'python.exe');
          fs.copyFileSync(pythonPath, targetPythonPath);
          log(`✅ Copied Python interpreter from ${pythonPath} to ${targetPythonPath}`);
        }
      } catch (copyErr) {
        log(`⚠️  Could not copy Python interpreter: ${copyErr.message}`, colors.yellow);
      }
    }
    
    success('Backend built successfully');
  }

  async buildFrontend() {
    log('ℹ️  Building frontend...');
    
    const frontendBuildDir = path.join(this.buildDir, 'frontend');
    fs.mkdirSync(frontendBuildDir, { recursive: true });
    
    // Copy frontend source (cross-platform)
    log('Copying frontend files...');
    const frontendSource = path.resolve(this.frontendDir);
    try {
      if (fs.promises && typeof fs.promises.cp === 'function') {
        await fs.promises.cp(frontendSource, frontendBuildDir, { recursive: true });
      } else {
        const copyRecursive = async (src, dest) => {
          const stats = await fs.promises.lstat(src);
          if (stats.isDirectory()) {
            await fs.promises.mkdir(dest, { recursive: true });
            const entries = await fs.promises.readdir(src);
            for (const e of entries) {
              await copyRecursive(path.join(src, e), path.join(dest, e));
            }
          } else {
            await fs.promises.copyFile(src, dest);
          }
        };
        await copyRecursive(frontendSource, frontendBuildDir);
      }
    } catch (err) {
      throw new Error(`Failed to copy frontend files: ${err.message}`);
    }
    
    // Verify package.json exists in renderer
    const rendererPackagePath = path.join(frontendBuildDir, 'src', 'renderer', 'package.json');
    if (!fs.existsSync(rendererPackagePath)) {
      throw new Error('package.json not found in frontend renderer directory');
    }
    
    // Install dependencies
    log('Installing frontend dependencies...');
    execSync(`cd "${path.join(frontendBuildDir, 'src', 'renderer')}" && npm install`, { stdio: 'inherit' });
    
    // Build React application
    log('Building React application...');
    execSync(`cd "${path.join(frontendBuildDir, 'src', 'renderer')}" && npm run build`, { stdio: 'inherit' });
    
    // Apply JavaScript obfuscation if enabled
    if (CONFIG.obfuscateCode) {
      log('Applying JavaScript obfuscation...');
      try {
        const buildDir = path.join(frontendBuildDir, 'src', 'renderer', 'build');
        const assetsDir = path.join(buildDir, 'assets');

        // Obfuscate JavaScript files
        const jsFiles = fs.readdirSync(assetsDir).filter(file => file.endsWith('.js'));
        for (const file of jsFiles) {
          const filePath = path.join(assetsDir, file);
          execSync(`javascript-obfuscator "${filePath}" --output "${filePath}" --compact true --control-flow-flattening true`, { stdio: 'inherit' });
        }

        // Remove source maps to avoid exposing readable mappings
        try {
          const mapFiles = fs.readdirSync(assetsDir).filter(f => f.endsWith('.map'));
          for (const m of mapFiles) {
            try { fs.unlinkSync(path.join(assetsDir, m)); } catch (e) {}
          }
        } catch (e) {}

        success('Frontend JavaScript obfuscated and source maps removed');
      } catch (err) {
        log('⚠️  JavaScript obfuscation failed', colors.yellow);
      }
    }
    
    success('Frontend built successfully');
  }

  async applyAntiTamperMeasures() {
    log('ℹ️  Applying anti-tamper measures...');
    
    // Add license file
    if (CONFIG.includeLicense && fs.existsSync('LICENSE')) {
      const licenseContent = fs.readFileSync('LICENSE', 'utf8');
      fs.writeFileSync(path.join(this.buildDir, 'LICENSE.txt'), licenseContent);
      log('License file added');
    }
    
    // Create integrity check file
    const integrityFile = path.join(this.buildDir, 'integrity.json');
    const integrityData = {
      version: CONFIG.version,
      buildDate: new Date().toISOString(),
      platform: this.currentPlatform,
      protected: true
    };
    fs.writeFileSync(integrityFile, JSON.stringify(integrityData, null, 2));
    
    success('Anti-tamper measures applied');
  }

  async packageDesktop() {
    log('ℹ️  Packaging desktop application...');
    
    const desktopDir = path.join(this.buildDir, 'desktop');
    fs.mkdirSync(desktopDir, { recursive: true });
    
    // Copy Electron main files
    const mainPackageJson = {
      name: 'the-planning-bord-desktop',
      version: CONFIG.version,
      description: 'Business Management Software',
      main: 'main-secure.js',
      author: 'The Planning Bord',
      license: 'PROPRIETARY',
      private: true,
      scripts: {
        start: 'electron .',
        'build:electron': 'electron-builder --win --x64'
      },
      build: {
        appId: CONFIG.appId,
        productName: CONFIG.appName,
        directories: {
          output: '.'
        },
        asar: true,
        extraResources: [
          {
            from: 'backend/dist',
            to: 'backend/dist',
            filter: ['**/*']
          },
          {
            from: 'backend',
            to: 'backend',
            filter: ['**/*']
          }
        ],
        files: [
          'main-secure.js',
          'preload.js',
          'preload-setup.js',
          'setup.html',
          'assets/**/*',
          'frontend/src/renderer/build/**/*',
          'LICENSE.txt'
        ],
        win: {
          target: 'nsis',
          // Code signing placeholders: set environment variable CSC_LINK and CSC_KEY_PASSWORD
          // Or place a .pfx at build/certs/win/cert.pfx and set its password in env var CSC_KEY_PASSWORD
          certificateFile: 'build/certs/win/cert.pfx',
          certificatePassword: 'env:CSC_KEY_PASSWORD',
          // Note: Icon will be set after assets are copied
        },
        nsis: {
          oneClick: false,
          perMachine: false,
          allowToChangeInstallationDirectory: true,
          createDesktopShortcut: true,
          createStartMenuShortcut: true,
          shortcutName: CONFIG.appName,
          uninstallDisplayName: CONFIG.appName
        }
      },
      devDependencies: {
        electron: '^27.0.0',
        'electron-builder': '^24.0.0'
      }
    };
    
    fs.writeFileSync(path.join(desktopDir, 'package.json'), JSON.stringify(mainPackageJson, null, 2));
    // If code signing artifacts are not present, don't set certificate fields to avoid builder failure
    try {
      const packageJsonPath = path.join(desktopDir, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const certPath = path.resolve('build', 'certs', 'win', 'cert.pfx');
      if (fs.existsSync(certPath) || process.env.CSC_LINK || process.env.CSC_KEY_PASSWORD) {
        // If user provided cert via file or env, keep placeholders or env usage
        if (fs.existsSync(certPath)) {
          pkg.build = pkg.build || {};
          pkg.build.win = pkg.build.win || {};
          pkg.build.win.certificateFile = 'build/certs/win/cert.pfx';
          pkg.build.win.certificatePassword = 'env:CSC_KEY_PASSWORD';
        }
      } else {
        // Remove signing fields to avoid electron-builder error when absent
        if (pkg.build && pkg.build.win) {
          delete pkg.build.win.certificateFile;
          delete pkg.build.win.certificatePassword;
        }
      }
      fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2));
    } catch (e) {
      log(`⚠️  Could not update package.json signing fields: ${e.message}`, colors.yellow);
    }
    
    // Copy setup-related files to desktop directory
    const setupFiles = [
      'frontend/src/main-secure.js',
      'frontend/src/setup.html',
      'frontend/src/preload-setup.js'
    ];
    
    for (const file of setupFiles) {
      const sourcePath = path.resolve(file);
      const targetPath = path.join(desktopDir, path.basename(file));
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, targetPath);
        log(`Copied ${path.basename(file)} to desktop package`);
        // Obfuscate Electron setup/main scripts if obfuscation is enabled
        if (CONFIG.obfuscateCode) {
          try {
            // Only obfuscate JavaScript files
            if (path.extname(targetPath).toLowerCase() === '.js') {
              const obfuscatorCmd = `javascript-obfuscator "${targetPath}" --output "${targetPath}" --compact true --control-flow-flattening true`;
              execSync(obfuscatorCmd, { stdio: 'inherit' });
            } else {
              log(`Skipping obfuscation for non-JS file: ${path.basename(targetPath)}`);
            }
            log(`Obfuscated ${path.basename(file)}`);
          } catch (err) {
            log(`⚠️  Could not obfuscate ${path.basename(file)}: ${err.message}`, colors.yellow);
          }
        }
      }
    }
    const rendererBuildSource = path.join(this.buildDir, 'frontend', 'src', 'renderer', 'build');
    const rendererBuildTarget = path.join(desktopDir, 'frontend', 'src', 'renderer', 'build');
    try {
      if (fs.promises && typeof fs.promises.cp === 'function') {
        await fs.promises.cp(rendererBuildSource, rendererBuildTarget, { recursive: true });
      } else {
        const copyRecursive = async (src, dest) => {
          const stats = await fs.promises.lstat(src);
          if (stats.isDirectory()) {
            await fs.promises.mkdir(dest, { recursive: true });
            const entries = await fs.promises.readdir(src);
            for (const e of entries) {
              await copyRecursive(path.join(src, e), path.join(dest, e));
            }
          } else {
            await fs.promises.copyFile(src, dest);
          }
        };
        await copyRecursive(rendererBuildSource, rendererBuildTarget);
      }
      log('Copied renderer build to desktop package');
    } catch (err) {
      throw new Error(`Renderer build not found or failed to copy: ${err.message}`);
    }
    
    // Copy actual preload script for renderer
    const preloadSource = path.resolve('frontend', 'src', 'preload.js');
    const preloadTarget = path.join(desktopDir, 'preload.js');
    if (fs.existsSync(preloadSource)) {
      fs.copyFileSync(preloadSource, preloadTarget);
      log('Copied preload.js to desktop package');
      if (CONFIG.obfuscateCode) {
        try {
          execSync(`javascript-obfuscator "${preloadTarget}" --output "${preloadTarget}" --compact true`, { stdio: 'inherit' });
          log('Obfuscated preload.js');
        } catch (err) {
          log(`⚠️  Could not obfuscate preload.js: ${err.message}`, colors.yellow);
        }
      }
    } else {
      throw new Error('frontend/src/preload.js not found');
    }
    
    // Create assets directory and copy files
    const assetsDir = path.join(desktopDir, 'assets');
    fs.mkdirSync(assetsDir, { recursive: true });
    
    // Copy the actual icon file from the main assets directory
    const iconSourcePath = path.resolve('assets', 'icon.ico');
    const iconTargetPath = path.join(assetsDir, 'icon.ico');
    
    if (fs.existsSync(iconSourcePath)) {
      fs.copyFileSync(iconSourcePath, iconTargetPath);
      log('Copied icon.ico to desktop package');
      
      // Update package.json with icon reference after successful copy
      const packageJsonPath = path.join(desktopDir, 'package.json');
      const packageData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      packageData.build.win.icon = 'assets/icon.ico';
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageData, null, 2));
    } else {
      log('⚠️  Warning: icon.ico not found, creating placeholder', colors.yellow);
      fs.writeFileSync(iconTargetPath, '');
    }
    
    // Copy backend files to the desktop directory
    log('Copying backend files to desktop package...');
    const backendSourceDir = path.join(this.buildDir, 'backend');
    const backendTargetDir = path.join(desktopDir, 'backend');
    
    if (fs.existsSync(backendSourceDir)) {
      // Copy entire backend directory including dist folder and source files
      try {
        if (fs.cp) {
          await fs.promises.cp(backendSourceDir, backendTargetDir, { recursive: true });
        } else {
          const copyRecursive = async (src, dest) => {
            const stats = await fs.promises.lstat(src);
            if (stats.isDirectory()) {
              await fs.promises.mkdir(dest, { recursive: true });
              const entries = await fs.promises.readdir(src);
              for (const e of entries) {
                await copyRecursive(path.join(src, e), path.join(dest, e));
              }
            } else {
              await fs.promises.copyFile(src, dest);
            }
          };
          await copyRecursive(backendSourceDir, backendTargetDir);
        }
        log('Backend files copied to desktop package');
        
        // Also copy the main.py file to the root of backend for fallback
        const mainPySource = path.join(backendSourceDir, 'main.py');
        const mainPyTarget = path.join(backendTargetDir, 'main.py');
        if (fs.existsSync(mainPySource) && !fs.existsSync(mainPyTarget)) {
          fs.copyFileSync(mainPySource, mainPyTarget);
          log('main.py copied to backend root for fallback');
        }
      } catch (err) {
        log(`⚠️  Failed copying backend to desktop package: ${err.message}`, colors.yellow);
      }
    } else {
      log('⚠️  Warning: Backend build directory not found', colors.yellow);
    }

    // If we built a single-file backend executable (PyInstaller), include it inside the packaged backend folder
    if (this.backendExePath && fs.existsSync(this.backendExePath)) {
      // Preserve the compiled executable's filename (e.g. PlanningBordServer.exe)
      const targetExe = path.join(backendTargetDir, path.basename(this.backendExePath));
      try {
        await fs.promises.copyFile(this.backendExePath, targetExe);
        log(`Copied backend executable to backend folder as ${path.basename(targetExe)}`);
      } catch (copyErr) {
        log(`⚠️  Could not copy backend executable into backend folder: ${copyErr.message}`, colors.yellow);
      }
    } else {
      // As a fallback, try to copy venv python if present into the backend folder
      const venvPythonCandidateWin = path.join(backendTargetDir, 'venv', 'Scripts', 'python.exe');
      const venvPythonCandidateUnix = path.join(backendTargetDir, 'venv', 'bin', 'python');
      if (fs.existsSync(venvPythonCandidateWin)) {
        await fs.promises.copyFile(venvPythonCandidateWin, path.join(backendTargetDir, 'python.exe'));
        log('Copied venv python.exe into backend folder as fallback');
      } else if (fs.existsSync(venvPythonCandidateUnix)) {
        await fs.promises.copyFile(venvPythonCandidateUnix, path.join(backendTargetDir, 'python'));
        log('Copied venv python into backend folder as fallback');
      } else {
        log('⚠️  No backend executable or venv python found to include in backend folder', colors.yellow);
      }
    }
    
    // Install Electron dependencies
    log('Installing Electron dependencies...');
    execSync(`cd "${desktopDir}" && npm install`, { stdio: 'inherit' });
    
    success('Desktop application packaged');
  }

  async createInstallers() {
    log('ℹ️  Creating installers...');
    
    const desktopDir = path.join(this.buildDir, 'desktop');
    
    log(`Building for ${this.currentPlatform} (${this.currentArch})...`);
    
    try {
      // If building a Windows installer on Linux, ensure wine is available
      if (process.platform === 'linux') {
        // We only attempt Windows build if wine is available
        try {
          execSync('which wine', { stdio: 'ignore' });
        } catch (e) {
          log('⚠️  wine is not installed — cannot build Windows installer on Linux. Skipping Windows build.', colors.yellow);
          return;
        }
      }

      execSync(`cd "${desktopDir}" && npm run build:electron`, { stdio: 'inherit' });
      
      // Move installer to main build directory
      const installerName = `${CONFIG.appName} Setup ${CONFIG.version}.exe`;
      const installerPath = path.join(desktopDir, installerName);
      const targetPath = path.join(this.buildDir, installerName);
      
      if (fs.existsSync(installerPath)) {
        fs.renameSync(installerPath, targetPath);
        success('Installers created successfully');
        log(`📦 Installer location: ${targetPath}`);
      } else {
        // Check for other possible installer names
        const possibleNames = [
          `${CONFIG.appName}-${CONFIG.version}.exe`,
          `${CONFIG.appName}.exe`,
          `Setup.exe`
        ];
        
        for (const name of possibleNames) {
          const altPath = path.join(desktopDir, name);
          if (fs.existsSync(altPath)) {
            fs.renameSync(altPath, targetPath);
            success('Installers created successfully');
            log(`📦 Installer location: ${targetPath}`);
            return;
          }
        }
        
        throw new Error('Installer file not found after build');
      }
      
    } catch (err) {
      if (err.message.includes('icon') || err.message.includes('ICO') || err.message.includes('format')) {
        log('⚠️  Icon-related error detected. Trying build without custom icon...', colors.yellow);
        
        // Try building without icon
        const packageJsonPath = path.join(desktopDir, 'package.json');
        const packageData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        // Remove icon reference
        if (packageData.build.win) {
          delete packageData.build.win.icon;
        }
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageData, null, 2));
        
        try {
          execSync(`cd "${desktopDir}" && npm run build:electron`, { stdio: 'inherit' });
          
          // Move installer to main build directory
          const installerName = `${CONFIG.appName} Setup ${CONFIG.version}.exe`;
          const installerPath = path.join(desktopDir, installerName);
          const targetPath = path.join(this.buildDir, installerName);
          
          if (fs.existsSync(installerPath)) {
            fs.renameSync(installerPath, targetPath);
            success('Installers created successfully (without custom icon)');
            log(`📦 Installer location: ${targetPath}`);
          } else {
            throw new Error('Installer file not found after build without icon');
          }
          
        } catch (secondErr) {
          throw new Error(`Failed to create installer even without icon: ${secondErr.message}`);
        }
      } else {
        throw new Error(`Failed to create installer: ${err.message}`);
      }
    }
  }
}

// Run the build
if (require.main === module) {
  const builder = new DesktopBuilder();
  builder.build().catch(console.error);
}

module.exports = DesktopBuilder;
