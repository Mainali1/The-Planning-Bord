# The Planning Bord: Technical Whitepaper & Business Analysis

**Document ID:** TPB-2026-001  
**Date:** January 27, 2026  
**Version:** 1.0.0-Stable  
**Confidentiality:** Public / Investor Release  

---

## 1. Executive Summary

**The Planning Bord** represents a paradigm shift in Enterprise Resource Planning (ERP) software. Unlike traditional, bloated, and expensive cloud-based ERPs that hold user data hostage behind subscription walls, The Planning Bord is a **high-performance, local-first, privacy-centric desktop solution**.

By leveraging a **Hybrid Architecture** combining the raw speed and memory safety of **Rust** with the rich, interactive capabilities of **Microsoft Blazor (C#)**, we deliver an application that starts instantly, runs offline, and scales from a single laptop to a local enterprise network without latency.

**Key Value Propositions:**
*   **For Investors:** A disruptive product in the SME (Small-to-Medium Enterprise) market, addressing "Subscription Fatigue" with a perpetually licensed, low-maintenance software model.
*   **For Customers:** Total data ownership. Your financial records, employee data, and trade secrets reside on *your* hardware, secured by industrial-strength encryption.
*   **For Developers:** A masterclass in modern application design, utilizing Tauri v2 for an ultra-lightweight footprint (<50MB installer) compared to Electron-based competitors (>200MB).

---

## 2. Technical Architecture & Source Code Deep Dive

The application follows a **Clean Architecture** pattern, enforcing strict separation of concerns between the User Interface (UI), Business Logic, and Data Persistence layers.

### 2.1 The "Tauri" Advantage (Hybrid Stack)
Instead of bundling a heavy Chrome browser (like Electron), The Planning Bord uses the operating system's native webview (WebView2 on Windows).

| Layer | Technology | Function | Source Location |
|-------|------------|----------|-----------------|
| **Presentation** | **Blazor WASM (C#)** | Renders UI, handles user input, client-side validation. | `src/Pages/`, `src/Shared/` |
| **Bridge** | **Tauri IPC** | Secure, asynchronous message passing between C# and Rust. | `src/Services/TauriInterop.cs` |
| **Core Logic** | **Rust** | Heavy computation, file I/O, system-level operations. | `src-tauri/src/lib.rs` |
| **Data** | **PostgreSQL** | Relational database engine, transaction management. | `src-tauri/src/db/postgres.rs` |

### 2.2 Database Design & Schema (`src-tauri/migrations/`)
The system rests on a robust PostgreSQL foundation, ensuring ACID compliance (Atomicity, Consistency, Isolation, Durability). The schema is modularized:

*   **Core Module (`001_initial_schema.sql`)**:
    *   **Identity**: `employees`, `roles`, `permissions` (RBAC).
    *   **Finance**: `payments`, `invoices`, `accounts` (Double-entry ready).
    *   **Operations**: `projects`, `tasks`, `tools` (Asset tracking).
    *   **Audit**: `audit_logs` table tracks *who* did *what* and *when*, critical for compliance.

*   **Supply Chain Module (`002_supply_chain.sql`)**:
    *   **BOM (Bill of Materials)**: Recursive structures (`bom_headers`, `bom_lines`) allow complex manufacturing recipes (e.g., Raw Materials -> Sub-assembly -> Final Product).
    *   **Batch Tracking**: `inventory_batches` tracks expiration dates and supplier info per lot.
    *   **Velocity Engine**: `inventory_movements` table records every single stock change (Sale, Purchase, Loss), enabling "Velocity Reporting" to predict stockouts.

### 2.3 Key Algorithms & Implementations

#### **A. Transactional Sales Engine**
Located in `src-tauri/src/db/postgres.rs`, the `record_sale` function is the heartbeat of the revenue system.
*   **Mechanism**: It wraps the entire sale process in a database transaction.
*   **Safety**: It locks the specific product row. If two cashiers try to sell the last item simultaneously, the database forces sequential processing, preventing negative stock.
*   **Logic**: `Stock Check` -> `Deduct Quantity` -> `Insert Sale Record` -> `Update Velocity` -> `Commit`.

#### **B. Real-Time Net Profit Calculation**
Unlike legacy systems that require "End of Day" processing, The Planning Bord calculates profit in real-time.
*   **Formula**: `Net Profit = (Sum(Sales) + Sum(Income)) - Sum(Expenses)`
*   **Optimization**: Uses highly optimized SQL aggregates (`COALESCE(SUM(...), 0)`) to return dashboard metrics in milliseconds, even with millions of records.

---

## 3. Comprehensive Feature Analysis

### 3.1 Financial Intelligence Suite
*   **Dashboard**: Customizable widgets for CEO/Managers showing Real-time Revenue, Expense Breakdown, and Cashflow Trends.
*   **Invoicing**: Full CRUD capabilities for customer invoices with tax calculations.
*   **Ledger**: Support for different account types (Asset, Liability, Equity) allowing for future expansion into full accounting.

### 3.2 Advanced Supply Chain
*   **Manufacturing Support**: The BOM system allows businesses to define "Recipes". Selling a finished good automatically deducts the raw materials from inventory if configured.
*   **Batch Management**: Critical for food/pharma industries. Track exactly which batch of ingredients went into which product.
*   **Reorder Intelligence**: The system analyzes sales velocity to suggest *what* to buy and *when*.

### 3.3 Human Resources (HR) & Operations
*   **Attendance**: Check-in/Check-out system with status codes (Present, Late).
*   **Tool Tracking**: "Library-style" system for checking out expensive tools to employees, tracking condition upon return.
*   **Project Management**: Gantt-chart ready structure with Dependencies (`dependencies_json`), Tasks, and Milestones.

### 3.4 Integration Ecosystem (`src/Services/IntegrationService.cs`)
The system is built to play nicely with others. The architecture supports "Plugins" for:
*   **Communication**: Slack, Microsoft Teams (Notification dispatch).
*   **Calendars**: Google Calendar, Outlook Calendar (Task syncing).
*   **Accounting**: QuickBooks, Xero (Financial data export).
*   **Surveys**: SurveyMonkey, Typeform (Customer feedback import).

---

## 4. Security & Compliance

*   **Role-Based Access Control (RBAC)**: Granular permissions system. A "Warehouse Worker" cannot see "Financial Reports". This is enforced at the API level in Rust, not just hidden in the UI.
*   **Audit Trails**: Every sensitive action (Price change, Stock adjustment, Employee deletion) is logged in `audit_logs` with `user_id`, `ip_address` (if applicable), and `timestamp`.
*   **Data Encryption**: Passwords are hashed (Argon2), and the local database connection is secured via internal socket permissions.

---

## 5. Market Analysis & Business Strategy

### 5.1 The "Anti-SaaS" Movement
Businesses are growing tired of monthly subscriptions that increase as they grow. The Planning Bord offers a **Perpetual License** model with optional support contracts.
*   **SaaS Cost (5 Years)**: $50/user/mo * 10 users * 60 months = **$30,000**
*   **The Planning Bord**: One-time license $5,000 + Annual Support $1,000 = **$9,000**
*   **Savings**: **70%**

### 5.2 Target Demographics
1.  **Manufacturing SMEs**: Need BOM and Batch tracking but can't afford SAP/Oracle.
2.  **Retail Chains**: Need real-time inventory across multiple POS terminals (via local LAN).
3.  **Field Services**: Need Tool Tracking and Project Management in one suite.

---

## 6. Roadmap & Future Development

### Phase 1: Mobile Companion (Q3 2026)
*   Leverage the shared C# Models (`src/Models/*.cs`) to build a **MAUI (Multi-platform App UI)** mobile app.
*   Allows warehouse staff to scan barcodes using phone cameras.

### Phase 2: AI Forecasting (Q4 2026)
*   Integrate local LLM (Large Language Model) support to analyze `inventory_movements`.
*   Feature: "Chat with your Data" (e.g., "Why did sales drop last Tuesday?").

### Phase 3: Multi-Site Replication (2027)
*   Implement PostgreSQL replication to allow distinct branches to sync data to a HQ server optionally.

---

## 7. Conclusion

The Planning Bord is engineered to be the last ERP a growing business will ever need to buy. It respects the user's hardware, data, and wallet. By combining **Rust's performance** with **C#'s productivity**, we have created a platform that is robust, maintainable, and ready for the future of enterprise computing.
