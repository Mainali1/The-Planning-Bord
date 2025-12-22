# Technical Stack & Architecture

## 1. System Architecture

The Planning Bord follows a **Hybrid Desktop Architecture**, leveraging WebAssembly for the UI and Rust for system-level operations.

```mermaid
graph TD
    UI[Blazor WASM Frontend] <-->|JS Interop| Bridge[Tauri Bridge]
    Bridge <-->|Invoke| Rust[Rust Backend (Tauri)]
    Rust <-->|Rusqlite| DB[(SQLite Database)]
    Rust <-->|System| OS[Operating System APIs]
```

### Components
-   **Frontend (UI):** Built with Blazor WebAssembly (.NET 8). Handles all user interaction, state management, and view rendering.
    -   **Styling:** Tailwind CSS for utility-first styling.
    -   **State:** In-memory state managed by Scoped Services.
-   **Backend (Core):** Built with Rust (Tauri). Handles data persistence, file system access, and heavy computations.
    -   **Database:** SQLite (managed via `rusqlite`).
    -   **Commands:** Exposed via `#[tauri::command]` macros.

## 2. Component Specifications

### Frontend Services (C#)
All services are registered in `Program.cs` as `Scoped` services and implement specific interfaces for modularity.

| Service | Interface | Responsibility |
| :--- | :--- | :--- |
| **InventoryService** | `IInventoryService` | Product CRUD, Tool tracking, Stock management. |
| **HrService** | `IHrService` | Employee management, Attendance, Payroll. |
| **FinanceService** | `IFinanceService` | Payment tracking, Financial reporting. |
| **TaskService** | `ITaskService` | Task creation, assignment, and status updates. |
| **SystemService** | `ISystemService` | Role-based access control (RBAC), System settings. |
| **NotificationService** | N/A | Centralized toast notifications (Success, Error, Info). |

### Backend Commands (Rust)
Rust functions exposed to the frontend via Tauri's IPC mechanism. Defined in `src-tauri/src/lib.rs`.

| Command | Description |
| :--- | :--- |
| `get_products` | Retrieves paginated product list with search support. |
| `add_product` | Inserts a new product into the database. |
| `get_employees` | Fetches all employee records. |
| `clock_in` / `clock_out` | Records attendance timestamps. |
| `get_dashboard_stats` | Aggregates high-level metrics (Total Products, Revenue, etc.). |
| `get_complaints` | Retrieves user complaints/issues. |

## 3. Data Flow

### Example: Fetching Products
1.  **User Action:** User navigates to `Inventory.razor`.
2.  **Service Call:** Component calls `InventoryService.GetProductsAsync()`.
3.  **IPC Bridge:** Service invokes `__TAURI__.core.invoke("get_products", args)`.
4.  **Rust Execution:**
    -   Tauri routes the call to the `get_products` function in `lib.rs`.
    -   Rust executes a SQL query using `rusqlite`.
    -   Results are serialized to JSON.
5.  **Response:** JSON data is returned to Blazor, deserialized into `PagedResult<Product>`, and rendered.

## 4. API Documentation

### Common Patterns
-   **Pagination:** Many "Get" endpoints return a `PagedResult<T>` containing `Items`, `Total`, `Page`, and `PageSize`.
-   **Error Handling:** Rust functions return `Result<T, String>`. Errors are caught in C# services and logged or displayed via `NotificationService`.

### Database Schema (SQLite)
Key tables include:
-   `products`: Inventory items.
-   `employees`: HR records.
-   `attendances`: Clock-in/out logs.
-   `tasks`: Workflow tasks.
-   `users`: System users and authentication data.
-   `roles` / `permissions`: RBAC configuration.

## 5. Deployment Procedures

### Production Build
The release build process bundles the Blazor WASM assets directly into the Rust executable.

1.  **Publish Frontend:**
    ```powershell
    dotnet publish -c Release src/ThePlanningBord.csproj -o dist
    ```
    *Output:* `dist/wwwroot` containing optimized WASM files.

2.  **Build Backend:**
    ```powershell
    cd src-tauri
    cargo build --release
    ```
    *Output:* `src-tauri/target/release/the-planning-bord.exe`

### Version Control
-   **Git:** Source code management.
-   **Ignored Files:** `bin/`, `obj/`, `dist/`, `target/`, `.vs/`.

## 6. Maintenance Guidelines

-   **Database Migrations:** Currently, schema initialization is handled in `db.rs` (`init_db`). For schema changes, modify the SQL statements in `init_db`.
-   **Dependency Updates:**
    -   .NET: Update NuGet packages via `dotnet add package`.
    -   Rust: Update crates via `cargo update`.
    -   NPM: Update Tailwind via `npm update`.
