# The Planning Bord - Production Build Guide

This guide will help you build a production-ready installer for The Planning Bord business management software.

## 🏗️ Build Process Overview

The build process creates a professional Windows installer that:
- ✅ Installs the complete application with one click
- ✅ Automatically starts backend server on launch
- ✅ Creates desktop and start menu shortcuts
- ✅ Includes proper error handling and user feedback
- ✅ No terminal or coding knowledge required for end users

## 📋 Prerequisites

Before building, ensure you have:
- Node.js (v16 or later)
- Python 3.8+ with pip
- Windows OS (for Windows installer)
- Internet connection for downloading dependencies

## 🚀 Quick Build (Recommended)

1. **Open Command Prompt as Administrator**
   - Right-click Command Prompt → "Run as administrator"

2. **Navigate to project root**
   ```cmd
   cd "D:\Projects\The-Planning-Bord"
   ```

3. **Run the automated build script**
   ```cmd
   build_all.bat
   ```

4. **Wait for completion** (10-15 minutes)
   - The script will automatically:
     - Build Python backend to executable
     - Build React frontend
     - Create Electron application
     - Generate professional installer

5. **Find your installer**
   - Location: `desktop-build\The Planning Bord Setup.exe`
   - Size: ~150-200MB (includes Python runtime + all dependencies)

## 📦 Manual Build (Advanced)

If you need more control, build components separately:

### Step 1: Backend Server
```cmd
cd backend
build_backend.bat
```

### Step 2: Frontend Application
```cmd
cd frontend\src\renderer
npm install
npm run build
cd ..\..\..
cd frontend
npm install
npm run build:win
```

## 🎯 Installation Process for End Users

Your business customers will experience:

1. **Download** the installer file
2. **Double-click** to run setup
3. **Follow the wizard** (license agreement, installation directory)
4. **Launch** from desktop shortcut
5. **Use immediately** - no configuration needed!

## 🔧 Troubleshooting

### Build Issues

**Backend build fails:**
- Ensure Python is in PATH
- Run `pip install --upgrade pip` first
- Check antivirus isn't blocking PyInstaller

**Frontend build fails:**
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again
- Ensure Node.js version is compatible

**Electron build fails:**
- Run as Administrator
- Check Windows SDK is installed
- Verify icon files exist in `assets/` folder

### Runtime Issues

**Application won't start:**
- Check Windows Event Viewer for errors
- Ensure no other app is using port 8000
- Try running as Administrator
- Check logs in `%USERPROFILE%\.planningbord\logs\`

**Database issues:**
- First run creates database automatically
- Check write permissions in installation directory
- Logs will show any database initialization errors

## 📁 File Structure After Build

```
desktop-build/
├── The Planning Bord Setup.exe    # Main installer
├── win-unpacked/                  # Unpacked application
│   ├── The Planning Bord.exe      # Main application
│   ├── resources/
│   │   ├── backend/               # Python backend
│   │   │   ├── PlanningBordServer.exe
│   │   │   └── ...
│   │   └── app.asar               # Frontend code
│   └── ...
└── ...
```

## 🚀 Deployment Options

### For Small Businesses
- Single installer file distribution
- Email or USB drive delivery
- Simple double-click installation

### For Enterprise
- Network deployment via Group Policy
- Silent installation: `The Planning Bord Setup.exe /S`
- Custom installation directory support

## 📞 Support

If you encounter build issues:
1. Check the build logs in your terminal
2. Verify all prerequisites are installed
3. Try the manual build process for specific error details
4. Ensure you're running as Administrator on Windows

## 🔒 Security Notes

- The installer requires Administrator privileges for proper installation
- Backend server runs on localhost:8000 (not exposed to internet)
- Database is stored locally on user's machine
- All dependencies are bundled (no external downloads needed)

---

**Ready to distribute!** Your business customers will have a seamless installation experience with professional-grade software delivery.