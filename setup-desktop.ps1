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

Write-Host "Installing all dependencies..." -ForegroundColor Yellow

# Install root dependencies (if package.json exists in root)
if (Test-Path "package.json") {
    Write-Host "Installing root dependencies..." -ForegroundColor Yellow
    npm install
}

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

Write-Host "Setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "You can now run the application using:" -ForegroundColor Yellow
Write-Host "  .\start-desktop.ps1  - Start in development mode" -ForegroundColor White
Write-Host "  .\build-desktop.ps1  - Build standalone installer" -ForegroundColor White
Write-Host ""
Write-Host "Requirements:" -ForegroundColor Yellow
Write-Host "  - PostgreSQL 12+ (for database)" -ForegroundColor White
Write-Host "  - Windows 10/11" -ForegroundColor White