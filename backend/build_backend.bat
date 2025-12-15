@echo off
echo Building The Planning Bord Backend Server...

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install requirements
echo Installing requirements...
pip install -r requirements.txt

REM Install PyInstaller
echo Installing PyInstaller...
pip install pyinstaller

REM Build the executable
echo Building executable...
pyinstaller PlanningBordServer.spec --clean --noconfirm

REM Check if build was successful
if exist "dist\PlanningBordServer.exe" (
    echo Build successful! Executable created at: dist\PlanningBordServer.exe
) else (
    echo Build failed! Check the output above for errors.
    exit /b 1
)

echo Backend build complete!