# Installation Guide - The Planning Bord

This guide covers the system requirements, installation steps, and troubleshooting for **The Planning Bord** desktop application.

## 💻 System Requirements

### Hardware
- **Processor:** Intel Core i5 / AMD Ryzen 5 or better (Recommended for optimal performance with large datasets).
- **Memory (RAM):** 8 GB minimum (16 GB recommended).
- **Storage:** 500 MB free disk space for the application; additional space required for the database.
- **Display:** 1920x1080 resolution or higher recommended.

### Software
- **Operating System:** Windows 10 or Windows 11 (64-bit).
- **Runtime:** Microsoft Edge WebView2 Runtime (Included in Windows 11, usually pre-installed on Windows 10).
- **Database:** PostgreSQL 14 or later (Required for data persistence).

## 💿 Installation Steps

### Option A: Using the Installer (Recommended)

1.  **Download the Installer:**
    - Obtain the latest `.msi` or `.exe` file (e.g., `The Planning Bord_1.0.0_x64-setup.exe`) from the official release channel.

2.  **Run the Installer:**
    - Double-click the installer file.
    - If prompted by **User Account Control (UAC)**, click **Yes** to allow the installation.
    - **SmartScreen Warning:** If Windows SmartScreen prevents the app from running ("Windows protected your PC"):
        - Click **More info**.
        - Click **Run anyway**.
        *(This occurs because the application certificate may not yet be trusted globally).*

3.  **Setup Wizard:**
    - Follow the on-screen instructions.
    - Select your installation directory (default is usually `C:\Users\<User>\AppData\Local\Programs\The Planning Bord`).
    - Click **Install**.

4.  **Launch:**
    - Once installed, launch the application from the Desktop shortcut or Start Menu.

### Option B: Building from Source

If you are a developer or need to build a specific version:

1.  **Prerequisites:**
    - **Node.js** (v16+)
    - **Rust** (Latest Stable)
    - **.NET 8.0 SDK**
    - **PostgreSQL** running locally on port 5432.

2.  **Build Command:**
    Open a terminal in the project root and run:
    ```powershell
    # Install frontend dependencies
    npm install
    
    # Restore .NET packages
    dotnet restore
    
    # Build and Package
    cd src-tauri
    cargo tauri build
    ```
    The installer will be generated in `src-tauri/target/release/bundle/nsis/`.

## ⚙️ Configuration

### Database Connection
By default, the application attempts to connect to a local PostgreSQL database with the following credentials:
- **Host:** `localhost`
- **Port:** `5432`
- **User:** `postgres`
- **Password:** `password` (or trusted auth)
- **Database:** `planning_bord`

**To customize the connection:**
Set the `DATABASE_URL` environment variable before launching the application:
```powershell
$env:DATABASE_URL="postgres://myuser:mypassword@myserver:5432/mydb"
./The Planning Bord.exe
```

### First Run
On the first launch, the application will automatically:
1.  Connect to the PostgreSQL database.
2.  Apply all necessary schema migrations (create tables for Inventory, HR, Finance, etc.).
3.  Seed initial data (Default GL Accounts, Admin Roles).

## 🔧 Troubleshooting

### Application Fails to Start
- **WebView2 Missing:** Ensure Microsoft Edge WebView2 Runtime is installed. [Download here](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).
- **Database Connection:** Check if your PostgreSQL service is running. The app requires a valid database connection to start. Check the logs for `Connection refused`.

### "Port 1420 already in use" (Dev Mode)
If running in development mode and you see this error:
1.  Open PowerShell/Command Prompt.
2.  Find the process: `netstat -ano | findstr :1420`
3.  Kill the process: `taskkill /PID <PID> /F`

### "Database Locked" or Schema Errors
- Ensure you are not running an outdated version of the app against a newer database schema, or vice versa.
- If you encounter "Table not found" errors, ensure the migration scripts ran successfully. Check the application logs.

### Visual Glitches / UI Issues
- The application relies on web technologies. Press `Ctrl + Shift + R` (if debug menu is enabled) or restart the application to refresh the UI.
- Ensure your graphics drivers are up to date.

## 🗑 Uninstalling

1.  Go to **Settings > Apps > Installed apps**.
2.  Search for **The Planning Bord**.
3.  Click **... > Uninstall**.
4.  **Note:** This does NOT remove your PostgreSQL database. To delete your data, you must manually drop the `planning_bord` database using a tool like pgAdmin or psql.
