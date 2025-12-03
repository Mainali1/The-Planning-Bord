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
if (!(Test-Path "node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
}
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend build failed!" -ForegroundColor Red
    exit 1
}
Set-Location ..

# Copy frontend build to electron
Write-Host "Copying frontend build..." -ForegroundColor Yellow
if (Test-Path "electron\frontend") {
    Remove-Item -Path "electron\frontend" -Recurse -Force
}
Copy-Item -Path "frontend\build\*" -Destination "electron\frontend" -Recurse -Force

# Copy backend to electron
Write-Host "Copying backend..." -ForegroundColor Yellow
if (Test-Path "electron\backend") {
    Remove-Item -Path "electron\backend" -Recurse -Force
}
Copy-Item -Path "backend" -Destination "electron\backend" -Recurse -Force

# Install electron dependencies
Write-Host "Installing electron dependencies..." -ForegroundColor Yellow
Set-Location electron
if (!(Test-Path "node_modules")) {
    npm install
}

# Create icon if it doesn't exist
if (!(Test-Path "assets\icon.ico")) {
    Write-Host "Creating placeholder icon..." -ForegroundColor Yellow
    # Create a simple text-based icon using PowerShell
    $iconContent = @"
    <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" fill="#2563eb"/>
      <text x="32" y="40" font-family="Arial" font-size="24" fill="white" text-anchor="middle">PB</text>
    </svg>
"@
    New-Item -ItemType Directory -Force -Path "assets" | Out-Null
    $iconContent | Out-File -FilePath "assets\icon.svg" -Encoding UTF8
}

# Build the desktop application
Write-Host "Building desktop application..." -ForegroundColor Yellow
npm run build:win
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed! Check the error messages above." -ForegroundColor Red
    exit 1
}

Write-Host "Build completed! Check the electron/dist folder for the installer." -ForegroundColor Green
Write-Host "Installer location: $(Get-Location)\electron\dist" -ForegroundColor Yellow

# List the built files
Write-Host "Built files:" -ForegroundColor Yellow
Get-ChildItem -Path "electron\dist" -Name | ForEach-Object {
    Write-Host "  - $_" -ForegroundColor White
}