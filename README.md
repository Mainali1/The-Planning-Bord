# The Planning Bord

The Planning Bord is a comprehensive Enterprise Resource Planning (ERP) application built with **Tauri (Rust)** for the backend and **Blazor WebAssembly (C#)** for the frontend. It provides modules for Inventory Management, Human Resources, Finance, Task Management, and System Administration.

## Project Overview

This application is designed to be a robust, offline-capable desktop application that manages core business processes. It leverages the performance and security of Rust with the productivity and component ecosystem of Blazor.

## Prerequisites

- **Node.js** (for Tauri CLI)
- **Rust** (latest stable)
- **.NET 8.0 SDK** (or later)
- **Visual Studio Code** or **Visual Studio 2022** (recommended)
- **PostgreSQL** (Optional - the application can attempt to set up a local instance, but a system installation is recommended for development)

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
- **Database**:
  - By default, the application attempts to connect to a local PostgreSQL instance (using `trust` auth on `localhost:5432`).
  - You can override the connection string by setting the `DATABASE_URL` environment variable (e.g., `postgres://user:password@localhost:5432/planning_bord`).

## Architecture

- **Frontend:** Blazor WebAssembly
  - Components: Reusable UI elements (Inventory, Attendance, etc.)
  - Services: Modular services (`InventoryService`, `HrService`) communicating with the backend.
  - Interop: `TauriInterop` service handles communication with Rust via `__TAURI__.core.invoke`.

- **Backend:** Rust (Tauri)
  - Commands: Rust functions exposed to the frontend (e.g., `get_products`, `clock_in`).
  - Database: PostgreSQL via `rust-postgres` for persistent storage.
  - State Management: `AppState` struct holding the database connection.

## Troubleshooting

### Common Issues

1.  **"Localhost refused to connect" or White Screen:**
    - **Cause:** The frontend assets are not loading, or the Tauri backend cannot connect to the dev server.
    - **Solution:**
        - Ensure `dotnet publish` was successful if running in release mode.
        - Check terminal output for build errors.
        - The application includes an exponential backoff reconnection strategy. If the issue persists, check if the Rust backend is crashing (check terminal logs).

2.  **Database Connection Failed:**
    - **Cause:** PostgreSQL service is not running or credentials are incorrect.
    - **Solution:**
      - Ensure PostgreSQL is running on port 5432.
      - Check if `DATABASE_URL` environment variable is set correctly.
      - If using default setup, ensure the local Postgres instance allows `trust` authentication for the `postgres` user.

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
