@echo off
echo ========================================
echo Building The Planning Bord Desktop App
echo ========================================

REM Set error handling
setlocal enabledelayedexpansion
set "errorlevel=0"

REM Check if we're in the right directory
if not exist "package.json" (
    echo ERROR: Please run this script from the frontend directory
    exit /b 1
)

echo Step 1: Building Backend Server...
echo ----------------------------------------
cd ..\backend

echo Installing backend dependencies...
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing Python dependencies...
pip install -r requirements.txt
if !errorlevel! neq 0 (
    echo ERROR: Failed to install backend dependencies
    exit /b 1
)

echo Installing PyInstaller...
pip install pyinstaller
if !errorlevel! neq 0 (
    echo ERROR: Failed to install PyInstaller
    exit /b 1
)

echo Building backend executable...
pyinstaller PlanningBordServer.spec --clean --noconfirm
if !errorlevel! neq 0 (
    echo ERROR: Failed to build backend executable
    exit /b 1
)

if not exist "dist\PlanningBordServer.exe" (
    echo ERROR: Backend executable not created
    exit /b 1
)

echo Backend build successful!
echo.

echo Step 2: Building Frontend Renderer...
echo ----------------------------------------
cd ..\frontend\src\renderer

echo Installing renderer dependencies...
call npm install
if !errorlevel! neq 0 (
    echo ERROR: Failed to install renderer dependencies
    exit /b 1
)

echo Building renderer...
call npm run build
if !errorlevel! neq 0 (
    echo ERROR: Failed to build renderer
    exit /b 1
)

echo Renderer build successful!
echo.

echo Step 3: Building Electron App...
echo ----------------------------------------
cd ..\..\..

echo Installing frontend dependencies...
cd frontend
call npm install
if !errorlevel! neq 0 (
    echo ERROR: Failed to install frontend dependencies
    exit /b 1
)

echo Building Electron application...
call npm run build:win
if !errorlevel! neq 0 (
    echo ERROR: Failed to build Electron application
    exit /b 1
)

echo.
echo ========================================
echo BUILD COMPLETED SUCCESSFULLY!
echo ========================================
echo.
echo Output location: desktop-build\win-unpacked\
echo Installer location: desktop-build\The Planning Bord Setup.exe
echo.
echo You can now distribute the installer to your business customers.
echo They just need to run the setup.exe file - no terminal or coding required!
echo.
pause