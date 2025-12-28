# Technical Stack Document

## System Architecture

The Planning Bord follows a **Modular Monolith** architecture wrapped in a **Tauri** shell.

### Diagram

```mermaid
graph TD
    User[User] --> UI[Blazor WebAssembly UI]
    UI --> Services[Domain Services (C#)]
    Services --> Interop[TauriInterop Service]
    Interop --> Bridge[Tauri Bridge (IPC)]
    Bridge --> Backend[Rust Backend]
    Backend --> DB[(PostgreSQL Database)]
```

## Component Specifications

### Frontend (Blazor WebAssembly)
- **Framework:** .NET 8.0 Blazor WebAssembly
- **Language:** C# / Razor
- **Key Components:**
    - `Inventory.razor`: Product management grid with pagination.
    - `Attendance.razor`: Time tracking interface.
    - `Dashboard.razor`: High-level metrics and charts.
- **Services:**
    - `TauriInterop.cs`: Centralized communication handler with exponential backoff and error handling.
    - `InventoryService.cs`, `HrService.cs`, `FinanceService.cs`: Domain-specific logic.
    - `NotificationService.cs`: Centralized toast notification system.

### Backend (Rust / Tauri)
- **Framework:** Tauri 2.0 (v2)
- **Language:** Rust
- **Database:** PostgreSQL (managed via `rust-postgres`)
- **Modules:**
    - `lib.rs`: Command registration and entry point.
    - `db.rs`: Database initialization and schema migration.
    - `models.rs`: Rust struct definitions matching C# models.

## Data Flow

1.  **Request:** User performs an action (e.g., "Add Product").
2.  **Service Call:** `Inventory.razor` calls `InventoryService.AddProductAsync`.
3.  **Interop:** `InventoryService` calls `TauriInterop.InvokeAsync("add_product", product)`.
4.  **IPC:** Tauri transmits the request to the Rust backend.
5.  **Command Execution:** Rust `add_product` function executes, locking the `AppState` mutex to access the database.
6.  **Persistence:** SQL `INSERT` statement runs against the PostgreSQL database.
7.  **Response:** Result (e.g., new ID) is returned to Rust, then over IPC to C#, and finally updates the UI.

## API Documentation (Tauri Commands)

### General
- `greet(name: String) -> String`: Returns a greeting.
- `ping() -> String`: Returns "pong" for health checks.

### Inventory
- `get_products(search: Option<String>, page: Option<i32>, page_size: Option<i32>) -> PagedResult`: Retrieves paginated products.
- `add_product(product: Product) -> i64`: Adds a product, returns ID.
- `update_product(product: Product) -> ()`: Updates an existing product.
- `delete_product(id: i32) -> ()`: Deletes a product.

### HR
- `get_employees() -> Vec<Employee>`: Lists all employees.
- `clock_in(attendance: Attendance) -> i64`: Records clock-in.
- `clock_out(attendance: Attendance) -> ()`: Records clock-out.

### Finance
- `get_payments() -> Vec<Payment>`: Lists payments.
- `add_payment(payment: Payment) -> i64`: Records a payment.

## Deployment Procedures

1.  **Version Bump:** Update version in `tauri.conf.json`.
2.  **Frontend Build:** `dotnet publish -c Release -o src-tauri/target/frontend-build` (or similar output path configured in `tauri.conf.json`).
3.  **Tauri Build:** Run `cargo tauri build`.
4.  **Artifacts:** Installers (MSI, EXE) are generated in `src-tauri/target/release/bundle`.

## Maintenance Guidelines

- **Code Style:**
    - C#: Follow standard .NET conventions (PascalCase for methods, camelCase for local vars).
    - Rust: Follow `rustfmt` standards.
- **Testing:**
    - Run `dotnet test` for C# logic.
    - Run `cargo test` for Rust backend logic.
- **Monitoring:**
    - Check application logs (stdout/stderr) for `[TauriInterop]` errors.
    - Use `CheckHealthAsync` to verify backend connectivity programmatically.
