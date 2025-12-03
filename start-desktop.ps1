# PowerShell Development Script for Planning Bord Desktop Application

Write-Host "Starting Planning Bord Desktop Application in Development Mode..." -ForegroundColor Green

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

# Install dependencies if needed
Write-Host "Checking dependencies..." -ForegroundColor Yellow

# Backend dependencies
Set-Location backend
if (!(Test-Path "node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    npm install
}
Set-Location ..

# Frontend dependencies  
Set-Location frontend
if (!(Test-Path "node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
}
Set-Location ..

# Electron dependencies
Set-Location electron
if (!(Test-Path "node_modules")) {
    Write-Host "Installing electron dependencies..." -ForegroundColor Yellow
    npm install
}

# Create frontend build if it doesn't exist
if (!(Test-Path "frontend")) {
    Write-Host "Building frontend..." -ForegroundColor Yellow
    Set-Location ..
    Set-Location frontend
    npm run build
    Set-Location ..
    Set-Location electron
    if (Test-Path "../frontend/build") {
        Copy-Item -Path "../frontend/build/*" -Destination "frontend" -Recurse -Force
    }
}

# Create icon if it doesn't exist
if (!(Test-Path "assets")) {
    New-Item -ItemType Directory -Force -Path "assets" | Out-Null
}
if (!(Test-Path "assets\icon.ico")) {
    Write-Host "Creating placeholder icon..." -ForegroundColor Yellow
    # Create a simple text-based icon using PowerShell
    $iconContent = @"
    <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" fill="#2563eb"/>
      <text x="32" y="40" font-family="Arial" font-size="24" fill="white" text-anchor="middle">PB</text>
    </svg>
"@
    $iconContent | Out-File -FilePath "assets\icon.svg" -Encoding UTF8
}

# Start the desktop application in development mode
Write-Host "Starting desktop application..." -ForegroundColor Yellow
npm run dev