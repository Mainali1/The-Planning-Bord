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

# Install dependencies if needed
if (!(Test-Path "electron\node_modules")) {
    Write-Host "Installing electron dependencies..." -ForegroundColor Yellow
    Set-Location electron
    npm install
    Set-Location ..
}

# Start the desktop application in development mode
Write-Host "Starting desktop application..." -ForegroundColor Yellow
Set-Location electron
npm run dev