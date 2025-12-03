# PowerShell Build Script for Planning Bord Desktop Application

Write-Host "Building Planning Bord Desktop Application..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Yellow
} catch {
    Write-Host "Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Set execution policy for this session
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force

# Create necessary directories
Write-Host "Creating directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "electron\assets" | Out-Null
New-Item -ItemType Directory -Force -Path "electron\frontend" | Out-Null

# Build frontend first
Write-Host "Building frontend..." -ForegroundColor Yellow
Set-Location frontend
npm install
npm run build
Set-Location ..

# Copy frontend build to electron
Write-Host "Copying frontend build..." -ForegroundColor Yellow
Copy-Item -Path "frontend\build\*" -Destination "electron\frontend" -Recurse -Force

# Copy backend to electron
Write-Host "Copying backend..." -ForegroundColor Yellow
Copy-Item -Path "backend" -Destination "electron\backend" -Recurse -Force

# Install electron dependencies
Write-Host "Installing electron dependencies..." -ForegroundColor Yellow
Set-Location electron
npm install

# Build the desktop application
Write-Host "Building desktop application..." -ForegroundColor Yellow
npm run build:win

Write-Host "Build completed! Check the electron/dist folder for the installer." -ForegroundColor Green