# Planning Bord Desktop Application

This is a standalone desktop version of The Planning Bord business management system, built with Electron.

## Features

- **Standalone Application**: Runs locally on your computer without requiring a web browser
- **Integrated Backend**: The backend server runs automatically when you start the application
- **Local Database**: All data is stored locally on your machine
- **Cross-Platform**: Works on Windows, macOS, and Linux

## Quick Start (PowerShell)

### Option 1: Setup Everything
```powershell
.\setup-desktop.ps1
```

### Option 2: Start Development
```powershell
.\start-desktop.ps1
```

### Option 3: Build Standalone Executable
```powershell
.\build-desktop.ps1
```

## Manual Setup

1. **Install Dependencies**:
   ```powershell
   # Install all dependencies
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   cd ../electron && npm install
   ```

2. **Build Frontend**:
   ```powershell
   cd frontend
   npm run build
   cd ..
   ```

3. **Start Desktop Application**:
   ```powershell
   cd electron
   npm start
   ```

## Building for Distribution

To create a standalone executable:

```powershell
cd electron
npm run build:win    # For Windows
npm run build:mac    # For macOS
npm run build:linux  # For Linux
```

The installer will be created in `electron/dist/` folder.

## Architecture

- **Electron Main Process**: Manages the application window and lifecycle
- **Backend Server**: Node.js/Express API server (runs automatically)
- **Frontend**: React application (embedded in Electron)
- **Database**: PostgreSQL (needs to be installed separately)

## Database Setup

You need PostgreSQL installed and running. Create a database named `planning_bord`:

```sql
CREATE DATABASE planning_bord;
```

The application will automatically create the necessary tables when it starts.

## Configuration

The application uses environment variables for configuration. You can modify the database connection settings in the Electron main process if needed.

## Development

The application runs in development mode with hot reloading enabled. Changes to the frontend code will automatically reload the application window.

## Troubleshooting

1. **Port Already in Use**: Make sure port 5000 is available for the backend server
2. **Database Connection**: Ensure PostgreSQL is running and accessible
3. **Build Issues**: Clear `node_modules` and reinstall dependencies

## PowerShell Commands

All scripts are designed to work with PowerShell. Make sure you have PowerShell execution policy set:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```