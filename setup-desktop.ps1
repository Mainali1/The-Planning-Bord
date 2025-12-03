# PowerShell Setup Script for Planning Bord Desktop Application

Write-Host "Setting up Planning Bord Desktop Application..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Yellow
} catch {
    Write-Host "Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Install all dependencies
Write-Host "Installing all dependencies..." -ForegroundColor Yellow

# Install root dependencies
Write-Host "Installing root dependencies..." -ForegroundColor Yellow
npm install

# Install backend dependencies
Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
Set-Location backend
npm install
Set-Location ..

# Install frontend dependencies
Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location frontend
npm install
Set-Location ..

# Install electron dependencies
Write-Host "Installing electron dependencies..." -ForegroundColor Yellow
Set-Location electron
npm install
Set-Location ..

Write-Host "Setup completed! You can now run the application using:" -ForegroundColor Green
Write-Host "  .\start-desktop.ps1  - Start in development mode" -ForegroundColor Yellow
Write-Host "  .\build-desktop.ps1  - Build standalone executable" -ForegroundColor Yellow