# The Planning Bord

The Planning Bord is a comprehensive, enterprise-grade ERP (Enterprise Resource Planning) desktop application designed for modern businesses. Built with a **Hybrid Desktop Architecture**, it combines the performance and security of **Rust (Tauri)** with the rich, interactive UI of **Blazor WebAssembly (C#)**.

## 🚀 Key Features

### 📦 Inventory & Supply Chain
- **Advanced Inventory Control:** Real-time stock tracking with batch management and expiration monitoring.
- **Bill of Materials (BOM) & Recipes:** Define complex product structures for manufacturing.
- **Velocity Reporting:** Intelligent reorder recommendations based on sales velocity and lead times.
- **Purchase Orders:** Streamlined procurement process.

### 👥 Human Resources
- **Employee Management:** Comprehensive staff records and role-based access control (RBAC).
- **Time Tracking:** Precision clock-in/out with "Late Arrival" and "Early Departure" detection.
- **Attendance Records:** Detailed history of employee work hours.

### 📊 Project Management & Services
- **Project Planning:** Interactive Gantt charts for timeline visualization.
- **Resource Planning:** Efficiently allocate staff and tools to projects.
- **Project Profitability:** Real-time financial analysis of project margins.
- **Service Management:** Track service-based offerings alongside physical products.

### 💰 Finance & Sales
- **General Ledger:** Full double-entry bookkeeping capabilities.
- **Sales Orders:** Manage customer orders from quote to delivery.
- **Invoicing:** Automated invoice generation and payment tracking.
- **Financial Reporting:** Balance sheets, income statements, and cash flow analysis.

### 🤝 CRM & Client Relations
- **Client Management:** Centralized database for customer details.
- **Quotes & Contracts:** Generate professional quotes and manage long-term contracts.
- **Complaints System:** Anonymous feedback channel for continuous improvement.

### 🔌 Integrations
- **Microsoft 365:** Seamless integration for Outlook email and calendar.
- **Slack:** Real-time notifications for critical system events.
- **Extensible API:** Designed to support future integrations (Quickbooks, etc.).

## 🛠 Tech Stack

- **Frontend:** Blazor WebAssembly (.NET 8)
- **Styling:** Tailwind CSS
- **Backend:** Rust (Tauri v2)
- **Database:** PostgreSQL (with `tokio-postgres`)
- **Architecture:** Local-first, offline-capable desktop application.

## 📋 Prerequisites

- **Node.js** (v16+ for Tailwind CSS and Tauri CLI)
- **Rust** (Latest Stable)
- **.NET 8.0 SDK**
- **PostgreSQL** (v14+ Recommended)
- **Visual Studio 2022** or **VS Code**

## ⚡ Installation & Setup

1.  **Clone the Repository**
    ```bash
    git clone <repository-url>
    cd The-Planning-Bord
    ```

2.  **Install Dependencies**
    *   **Frontend (.NET):**
        ```bash
        dotnet restore
        ```
    *   **Styling (Tailwind):**
        ```bash
        npm install
        ```
    *   **Backend (Rust):**
        ```bash
        cd src-tauri
        cargo install tauri-cli
        cargo fetch
        ```

3.  **Database Configuration**
    The application defaults to connecting to a local PostgreSQL instance.
    *   Default Connection: `postgres://postgres:password@localhost:5432/planning_bord`
    *   Override via Environment Variable: `DATABASE_URL`

4.  **Run in Development Mode**
    This command compiles the Tailwind CSS, builds the Blazor frontend, and starts the Tauri application with hot-reloading.
    ```bash
    cargo tauri dev
    ```

5.  **Build for Production**
    Generate an optimized installer (`.msi` or `.exe`).
    ```bash
    cargo tauri build
    ```

## 📄 License

This software is licensed under a proprietary commercial license. See the [LICENSE](LICENSE) file for details. Unauthorized copying, reverse engineering, or distribution is strictly prohibited.

---
© 2024 The Planning Bord. All Rights Reserved.
