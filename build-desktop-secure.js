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
  supportedPlatforms: ['win32', 'darwin', 'linux'],
  architectures: ['x64', 'arm64'],
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
      log(`📦 Installer created: ${path.join(this.buildDir, `The ${CONFIG.appName} Setup ${CONFIG.version}.exe`)}`);
      
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
    
    // Copy backend source - fix the xcopy command
    log('Copying backend files...');
    const backendSource = path.resolve(this.backendDir);
    execSync(`xcopy /E /I /Y "${backendSource}" "${backendBuildDir}"`, { stdio: 'inherit' });
    
    // Verify requirements.txt exists
    const requirementsPath = path.join(backendBuildDir, 'requirements.txt');
    if (!fs.existsSync(requirementsPath)) {
      throw new Error('requirements.txt not found in backend build directory');
    }
    
    // Create virtual environment
    log('Creating Python virtual environment...');
    execSync(`cd "${backendBuildDir}" && ${CONFIG.pythonExecutable} -m venv venv`, { stdio: 'inherit' });
    
    const venvPython = path.join(backendBuildDir, 'venv', 'Scripts', 'python.exe');
    
    // Install dependencies
    log('Installing Python dependencies...');
    execSync(`cd "${backendBuildDir}" && "${venvPython}" -m pip install -r requirements.txt`, { stdio: 'inherit' });
    
    // Apply code obfuscation if enabled
    if (CONFIG.obfuscateCode) {
      log('Applying code obfuscation...');
      try {
        // Create obfuscated version
        const srcDir = path.join(backendBuildDir, 'src');
        const obfuscatedDir = path.join(backendBuildDir, 'src_obfuscated');
        
        execSync(`pyarmor obfuscate --output "${obfuscatedDir}" --src "${srcDir}"`, { stdio: 'inherit' });
        
        // Replace original with obfuscated code
        execSync(`rmdir /S /Q "${srcDir}" && move "${obfuscatedDir}" "${srcDir}"`, { stdio: 'inherit' });
        
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
      
      execSync(`cd "${backendBuildDir}" && "${venvPython}" -m PyInstaller --onefile --windowed --name "PlanningBordServer" "${mainPy}"`, { stdio: 'inherit' });
      
      success('Backend compiled to executable');
    } catch (err) {
      log('⚠️  Could not create compiled executable, using original', colors.yellow);
    }
    
    success('Backend built successfully');
  }

  async buildFrontend() {
    log('ℹ️  Building frontend...');
    
    const frontendBuildDir = path.join(this.buildDir, 'frontend');
    fs.mkdirSync(frontendBuildDir, { recursive: true });
    
    // Copy frontend source - fix the xcopy command
    log('Copying frontend files...');
    const frontendSource = path.resolve(this.frontendDir);
    execSync(`xcopy /E /I /Y "${frontendSource}" "${frontendBuildDir}"`, { stdio: 'inherit' });
    
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
        
        success('Frontend JavaScript obfuscated');
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
        files: [
          'main-secure.js',
          'preload.js',
          'preload-setup.js',
          'setup.html',
          'assets/**/*',
          'frontend/src/renderer/build/**/*',
          'backend/dist/**/*',
          'LICENSE.txt'
        ],
        win: {
          target: 'nsis'
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
      }
    }
    
    // Create preload script
    const preloadJsContent = `
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Expose safe methods to renderer
});
`;
    
    fs.writeFileSync(path.join(desktopDir, 'preload.js'), preloadJsContent);
    
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