# Installation Guide - The Planning Bord

This guide covers the installation, system requirements, and troubleshooting for **The Planning Bord** desktop application.

## System Requirements

- **Operating System:** Windows 10 or Windows 11 (64-bit)
- **Processor:** Intel Core i3 / AMD Ryzen 3 or better
- **Memory (RAM):** 4 GB minimum (8 GB recommended)
- **Storage:** 200 MB free disk space
- **Software:** Microsoft Edge WebView2 Runtime (usually pre-installed on modern Windows)

## Installation Steps

1. **Download the Installer:**
   - Locate the installer file: `The Planning Bord_1.0.0_x64-setup.exe` (or `.msi`).

2. **Run the Installer:**
   - Double-click the installer file.
   - If prompted by User Account Control (UAC), click **Yes** to allow the installation.

3. **Follow the Setup Wizard:**
   - Choose the installation language (default: English).
   - Review and accept the **License Agreement**.
   - Choose the installation location (or keep the default).
   - Click **Install**.

4. **Finish:**
   - Once completed, click **Finish**.
   - The application will launch automatically if the checkbox was selected.
   - You can also launch it from the Desktop Shortcut or Start Menu.

## Updating the Application

- **Automatic Updates:** The application checks for updates on startup (if configured).
- **Manual Update:** Download the latest installer and run it. The installer will automatically upgrade the existing version while preserving your data.
- **Data Preservation:** Your database (`data.db`) is stored in the application's data directory and is NOT removed during upgrades.

## Troubleshooting

### "Windows protected your PC" (SmartScreen)
If you see this message:
1. Click **More info**.
2. Click **Run anyway**.
(This happens because the application is self-signed/not signed by a major certificate authority yet).

### Application fails to start
- Ensure **WebView2 Runtime** is installed. Download it from [Microsoft](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).
- Check if your antivirus is blocking the application.

### "Database Locked" Error
- Ensure only one instance of the application is running.

## Uninstalling

1. Go to **Settings > Apps > Installed apps**.
2. Search for **The Planning Bord**.
3. Click **... > Uninstall**.
