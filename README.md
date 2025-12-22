# The Planning Bord

The Planning Bord is a comprehensive Enterprise Resource Planning (ERP) application built with **Tauri (Rust)** for the backend and **Blazor WebAssembly (C#)** for the frontend. It provides modules for Inventory Management, Human Resources, Finance, Task Management, and System Administration.

## Project Overview

This application is designed to be a robust, offline-capable desktop application that manages core business processes. It leverages the performance and security of Rust with the productivity and component ecosystem of Blazor.

## Prerequisites

- **Node.js** (for Tauri CLI)
- **Rust** (latest stable)
- **.NET 8.0 SDK** (or later)
- **Visual Studio Code** or **Visual Studio 2022** (recommended)

## Installation and Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd The-Planning-Bord
    ```

2.  **Install dependencies:**
    - Restore .NET packages:
      ```bash
      dotnet restore
      ```
    - Install Tauri CLI and dependencies (inside `src-tauri` if needed, or globally):
      ```bash
      cargo install tauri-cli
      ```

3.  **Build the application:**
    ```bash
    dotnet publish -c Release
    cd src-tauri
    cargo tauri build
    ```

## Development

To run the application in development mode with hot reloading:

1.  **Start the frontend and backend:**
    ```bash
    cargo tauri dev
    ```
    This command will build the Blazor frontend and start the Tauri application.

## Configuration

Configuration is managed via:
- `src-tauri/tauri.conf.json`: Main Tauri configuration (window settings, permissions, bundle settings).
- `src/wwwroot/appsettings.json` (if applicable): Frontend configuration.
- Database: The application uses a local SQLite database (`planningbord.db`) located in the user's app data directory.

## Architecture

- **Frontend:** Blazor WebAssembly
  - Components: Reusable UI elements (Inventory, Attendance, etc.)
  - Services: Modular services (`InventoryService`, `HrService`) communicating with the backend.
  - Interop: `TauriInterop` service handles communication with Rust via `__TAURI__.core.invoke`.

- **Backend:** Rust (Tauri)
  - Commands: Rust functions exposed to the frontend (e.g., `get_products`, `clock_in`).
  - Database: SQLite via `rusqlite` for persistent storage.
  - State Management: `AppState` struct holding the database connection.

## Troubleshooting

### Common Issues

1.  **"Localhost refused to connect" or White Screen:**
    - **Cause:** The frontend assets are not loading, or the Tauri backend cannot connect to the dev server.
    - **Solution:**
        - Ensure `dotnet publish` was successful if running in release mode.
        - Check terminal output for build errors.
        - The application includes an exponential backoff reconnection strategy. If the issue persists, check if the Rust backend is crashing (check terminal logs).

2.  **Database Locked:**
    - **Cause:** Multiple instances of the app or a hung process.
    - **Solution:** Close all instances of the application. Restart the computer if necessary.

3.  **Build Errors (E0063, CS0103):**
    - **Cause:** Mismatched struct fields or missing service registrations.
    - **Solution:** Run `dotnet build` and `cargo check` to identify specific errors. Ensure all fields in Rust structs match the database schema and C# models.

## Usage Examples

- **Inventory:** Navigate to the "Inventory" tab to add, update, or delete products. Use the search bar to filter items.
- **HR:** Use the "Employees" tab to manage staff. The "Attendance" tab allows clock-in/out functionality.
- **Finance:** Track payments and expenses in the "Finance" module.

## Maintenance

- **Database:** The SQLite database is automatically created. Backups should be performed by copying the `planningbord.db` file from the app data directory.
- **Updates:** Rebuild the application using `cargo tauri build` to generate new installers.
