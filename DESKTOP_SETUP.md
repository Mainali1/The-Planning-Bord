# Planning Bord Desktop Application

This is a standalone desktop version of The Planning Bord business management system, built with Electron. It provides a complete business management solution that runs locally on your computer with full web API support.

## Features

### Standalone Application
- **No Browser Required**: Runs as a native desktop application
- **Integrated Backend**: Node.js backend starts automatically with the app
- **Local Database**: All data stored locally on your machine
- **Cross-Platform**: Works on Windows, macOS, and Linux

### Web API Support
- **External API Access**: Full support for Microsoft 365, email, and other web services
- **No Network Restrictions**: Unlike browser-based apps, desktop version can access external APIs
- **Microsoft Graph Integration**: Complete Microsoft 365 integration (Outlook, Teams, SharePoint)
- **Email Services**: Full email notification capabilities
- **Background Processing**: Redis queue system for reliable job processing

### Professional Installer
- **Standalone Installer**: Creates professional Windows installer (.exe)
- **Desktop Shortcuts**: Automatic Start Menu and Desktop shortcuts
- **Auto-updater**: Built-in update mechanism for easy maintenance
- **File Protocol Support**: Uses file:// protocol for enhanced security

## Quick Start (PowerShell)

### 1. Setup Everything
```powershell
# Run setup to install all dependencies
.\setup-desktop.ps1
```

### 2. Start Development
```powershell
# Start the desktop application in development mode
.\start-desktop.ps1
```

### 3. Build Standalone Installer
```powershell
# Create professional installer for distribution
.\build-desktop.ps1
```

## File Organization

The project is organized to keep configuration files separate from main application code:

```
the-planning-bord/
├── backend/                    # Node.js backend API
├── frontend/                   # React frontend application  
├── electron/                   # Desktop application wrapper
├── build/                      # Build configuration files
│   ├── docker-compose.yml      # Docker stack configuration
│   ├── redis.conf             # Redis server configuration
│   ├── ecosystem.config.js    # PM2 process manager config
│   └── *.config.js            # Various configuration files
├── docs/                       # Documentation
└── *.ps1                       # PowerShell setup/build scripts
```

Configuration files have been moved to the `build/` folder to reduce clutter in the root directory.

## Manual Setup

### 1. Install Dependencies
```powershell
# Install all dependencies
npm install
cd backend && npm install
cd ../frontend && npm install
cd ../electron && npm install
```

### 2. Build Frontend
```powershell
cd frontend
npm run build
cd ..
```

### 3. Start Desktop Application
```powershell
cd electron
npm start
```

## Building for Distribution

To create a standalone executable installer:

```powershell
cd electron
npm run build:win    # For Windows (creates .exe installer)
npm run build:mac    # For macOS (creates .dmg)
npm run build:linux  # For Linux (creates AppImage)
```

The installer will be created in `electron/dist/` folder with:
- Professional Windows installer (.exe)
- Portable version (no installation required)
- Desktop and Start Menu shortcuts
- Auto-updater configuration

## Architecture

### Electron Main Process
- **Window Management**: Creates and manages application windows
- **Backend Integration**: Automatically starts Node.js backend server
- **Auto-updater**: Handles application updates
- **Security**: Implements proper security policies with web API support

### Backend Server
- **Node.js/Express**: RESTful API server
- **PostgreSQL**: Primary database (requires separate installation)
- **Redis**: Background job processing queue
- **Microsoft Graph API**: Full Microsoft 365 integration
- **Email Services**: SMTP integration for notifications

### Frontend Application
- **React**: Modern React application with hooks
- **TailwindCSS**: Responsive, accessible UI
- **Electron Integration**: Seamless desktop integration
- **File Protocol**: Uses file:// for enhanced security

## Database Setup

You need PostgreSQL installed and running. Create a database named `planning_bord`:

```sql
CREATE DATABASE planning_bord;
```

The application will automatically create the necessary tables when it starts.

## Configuration

The application uses environment variables for configuration. Key settings:

### Backend Configuration
- **Database**: PostgreSQL connection settings
- **Microsoft 365**: Client ID, secret, and tenant information
- **Email**: SMTP configuration for notifications
- **Redis**: Queue system configuration

### Desktop Configuration
- **Web API Access**: Enabled for external integrations
- **CORS**: Configured to allow external API calls
- **Security**: Balanced security with API access

## Development Mode

The application runs in development mode with:
- **Hot Reloading**: Frontend changes auto-reload
- **Backend Restart**: Automatic backend restart on changes
- **Debug Console**: Electron developer tools
- **Error Logging**: Comprehensive error tracking

## Troubleshooting

### Common Issues

1. **Port Already in Use**: Ensure port 5000 is available for backend server
2. **Database Connection**: Verify PostgreSQL is running and accessible
3. **Build Issues**: Clear `node_modules` and reinstall dependencies
4. **Web API Access**: Check firewall settings for external API calls

### PowerShell Execution Policy

If you encounter execution policy errors:

```powershell
# Set execution policy for current user
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Or run with bypass for this session
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
```

### Web API Access Issues

If external APIs are not working:
- Check that `ALLOW_EXTERNAL_APIS=true` is set
- Verify firewall allows outbound connections
- Ensure Microsoft 365 credentials are valid
- Check Electron main.js webSecurity settings

## Security Features

- **Local Data Storage**: All data stays on your machine
- **File Protocol**: Uses file:// instead of http:// for enhanced security
- **CORS Configuration**: Properly configured for external API access
- **Input Validation**: Server-side validation for all inputs
- **JWT Authentication**: Secure token-based authentication
- **Role-based Access**: Granular permission system

## Support

For issues with the desktop application:
1. Check the troubleshooting section above
2. Review the PowerShell script output for error messages
3. Check the Electron console for JavaScript errors
4. Verify all prerequisites are installed and running