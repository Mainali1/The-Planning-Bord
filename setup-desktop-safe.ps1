# PowerShell Safe Setup Script for Planning Bord Desktop Application
# This script handles problematic npm packages and provides safe installation

param(
    [switch]$ForceSafeMode = $false,
    [switch]$SkipProblematicPackages = $false,
    [switch]$Verbose = $false
)

Write-Host "Setting up Planning Bord Desktop Application (Safe Mode)..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Yellow
} catch {
    Write-Host "Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if all required directories exist
$requiredDirs = @("backend", "frontend", "electron")
foreach ($dir in $requiredDirs) {
    if (!(Test-Path $dir)) {
        Write-Host "Required directory '$dir' not found!" -ForegroundColor Red
        exit 1
    }
}

# Set execution policy for this session
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force

# Define problematic packages that cause issues
$problematicPackages = @(
    "@sentry/profiling-node",
    "msgpackr-extract",
    "electron-builder"
)

function Install-SafeMode {
    param($Path, $PackageName)
    
    Write-Host "Installing $PackageName in safe mode..." -ForegroundColor Yellow
    Set-Location $Path
    
    try {
        # First try with ignore-scripts and legacy-peer-deps
        npm install --ignore-scripts --legacy-peer-deps --no-fund --no-audit
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "$PackageName installed successfully in safe mode!" -ForegroundColor Green
            
            # If not skipping problematic packages, try to install them separately
            if (!$SkipProblematicPackages) {
                foreach ($package in $problematicPackages) {
                    Write-Host "Attempting to install $package separately..." -ForegroundColor Yellow
                    try {
                        npm install $package --no-scripts --legacy-peer-deps --no-fund --no-audit
                        Write-Host "$package installed successfully!" -ForegroundColor Green
                    } catch {
                        Write-Host "Warning: Could not install $package. This may affect some features." -ForegroundColor Yellow
                    }
                }
            }
        } else {
            throw "npm install failed"
        }
    } catch {
        Write-Host "Error installing $PackageName: $_" -ForegroundColor Red
        Write-Host "Attempting fallback installation..." -ForegroundColor Yellow
        
        # Fallback: install only essential packages
        npm install --ignore-scripts --legacy-peer-deps --no-optional --no-fund --no-audit
    }
    
    Set-Location ..
}

function Install-NormalMode {
    param($Path, $PackageName)
    
    Write-Host "Installing $PackageName in normal mode..." -ForegroundColor Yellow
    Set-Location $Path
    
    try {
        npm install
        if ($LASTEXITCODE -eq 0) {
            Write-Host "$PackageName installed successfully!" -ForegroundColor Green
        } else {
            throw "npm install failed"
        }
    } catch {
        Write-Host "Normal mode failed, switching to safe mode for $PackageName..." -ForegroundColor Yellow
        Set-Location ..
        Install-SafeMode -Path $Path -PackageName $PackageName
        return
    }
    
    Set-Location ..
}

Write-Host "Installing all dependencies..." -ForegroundColor Yellow

# Install root dependencies (if package.json exists in root)
if (Test-Path "package.json") {
    Write-Host "Installing root dependencies..." -ForegroundColor Yellow
    if ($ForceSafeMode) {
        npm install --ignore-scripts --legacy-peer-deps --no-fund --no-audit
    } else {
        npm install
    }
}

# Install backend dependencies
if ($ForceSafeMode) {
    Install-SafeMode -Path "backend" -PackageName "backend"
} else {
    Install-NormalMode -Path "backend" -PackageName "backend"
}

# Install frontend dependencies  
if ($ForceSafeMode) {
    Install-SafeMode -Path "frontend" -PackageName "frontend"
} else {
    Install-NormalMode -Path "frontend" -PackageName "frontend"
}

# Install electron dependencies
if ($ForceSafeMode) {
    Install-SafeMode -Path "electron" -PackageName "electron"
} else {
    Install-NormalMode -Path "electron" -PackageName "electron"
}

Write-Host "Setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "You can now run the application using:" -ForegroundColor Yellow
Write-Host "  .\start-desktop.ps1  - Start in development mode" -ForegroundColor White
Write-Host "  .\build-desktop.ps1  - Build standalone installer" -ForegroundColor White
Write-Host ""
if ($ForceSafeMode) {
    Write-Host "Note: Safe mode was used - some features may need manual setup" -ForegroundColor Yellow
}
if ($SkipProblematicPackages) {
    Write-Host "Note: Problematic packages were skipped - some advanced features may not work" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "Requirements:" -ForegroundColor Yellow
Write-Host "  - PostgreSQL 12+ (for database)" -ForegroundColor White
Write-Host "  - Windows 10/11" -ForegroundColor White