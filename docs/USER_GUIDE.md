# User Guide - The Planning Bord

Welcome to **The Planning Bord**, your comprehensive ERP solution for managing inventory, projects, finance, and human resources.

## 📚 Table of Contents
1.  [Getting Started](#1-getting-started)
2.  [Inventory & Supply Chain](#2-inventory--supply-chain)
3.  [Sales & CRM](#3-sales--crm)
4.  [Project Management](#4-project-management)
5.  [Human Resources](#5-human-resources)
6.  [Finance & Accounting](#6-finance--accounting)
7.  [System Administration](#7-system-administration)

---

## 1. Getting Started

### Dashboard
Upon logging in, you are greeted by the **Dashboard**.
-   **Key Metrics:** View real-time stats like Total Products, Low Stock Alerts, and Pending Tasks.
-   **Notifications:** Check the bell icon for system alerts (e.g., "Stock for Item X is low").
-   **Navigation:** Use the sidebar to access different modules. The available options depend on your user role.

### Login & Security
-   **First Login:** Use the credentials provided by your administrator.
-   **Password Reset:** Contact your admin if you lose access.
-   **Session:** The system automatically logs you out after a period of inactivity for security.

---

## 2. Inventory & Supply Chain

### Product Management
Navigate to **Inventory > Products**.
-   **Add Product:** Click "Add Product" to register new items. You can define SKU, description, unit price, and reorder points.
-   **Stock Levels:** The system automatically tracks stock. Items below the reorder point are flagged as "Low Stock".
-   **Batch Tracking:** Enable batch tracking to monitor expiration dates and lot numbers for perishable goods.

### Bill of Materials (BOM)
For manufacturing workflows:
1.  Select a product.
2.  Click **"Manage Recipe/BOM"**.
3.  Add raw materials and quantities required to build this product.
4.  This allows the system to deduct raw materials automatically when a finished good is produced.

### Velocity Reporting
Navigate to **Inventory > Velocity Report**.
-   **Analysis:** View sales velocity (items sold per day) and lead times.
-   **Recommendations:** The system suggests reorder quantities to prevent stockouts based on historical data.

### Purchase Orders
Navigate to **Supply Chain > Purchase Orders**.
-   **Create PO:** Select a supplier and add items to order.
-   **Receive Stock:** When goods arrive, open the PO and click "Receive". This updates your inventory levels automatically.

---

## 3. Sales & CRM

### Client Management
Navigate to **Sales > Clients**.
-   Maintain a database of your customers.
-   View history of quotes, contracts, and invoices for each client.

### Quotes & Contracts
-   **Quotes:** Create professional price estimates. Convert them to Sales Orders with one click upon acceptance.
-   **Contracts:** Manage long-term service agreements with start/end dates and billing terms.

### Sales Orders
The core of your sales workflow:
1.  **Draft:** Create an order.
2.  **Confirmed:** Lock the order and reserve stock.
3.  **Invoiced:** Generate an invoice for the customer.
4.  **Shipped:** Mark items as dispatched to deduct them from inventory.

---

## 4. Project Management

### Projects & Gantt Charts
Navigate to **Projects**.
-   **Create Project:** Define scope, budget, and deadlines.
-   **Gantt Chart:** Visualize the timeline. Drag and drop tasks to reschedule. Dependencies ensure that Task B cannot start before Task A finishes.

### Resource Planning
Navigate to **Projects > Resource Planning**.
-   **Allocation:** Assign employees and tools to specific project phases.
-   **Conflict Detection:** The system warns you if an employee is double-booked.

### Project Profitability
Navigate to **Projects > Profitability**.
-   **Real-time Analysis:** Compare **Estimated Budget** vs. **Actual Costs**.
-   **Margins:** View profit margins based on billable hours and material costs.

---

## 5. Human Resources

### Employee Management
Navigate to **HR > Employees**.
-   **Records:** Store contact info, roles, and employment history.
-   **Permissions:** Assign roles (e.g., "Manager", "Staff") to control access to system features.

### Attendance & Time Tracking
-   **Clock In/Out:** Employees use the dedicated "Time Tracking" page to clock in.
-   **Status:**
    -   🟢 **On Time:** Normal hours.
    -   🔴 **Late Arrival:** Clock-in after the designated start time.
    -   🟡 **Early Departure:** Clock-out before the shift ends.
-   **Timesheets:** View weekly/monthly summaries of hours worked.

---

## 6. Finance & Accounting

### General Ledger (GL)
Navigate to **Finance > General Ledger**.
-   **Chart of Accounts:** Manage your assets, liabilities, equity, revenue, and expense accounts.
-   **Journal Entries:** View automated postings from Sales and Purchasing modules, or create manual adjustments.

### Invoicing & Payments
-   **Invoices:** View all outstanding and paid invoices.
-   **Payments:** Record incoming payments against invoices. The system supports partial payments.

### Cash Flow
-   **Visual Reports:** View monthly income vs. expense charts to monitor business health.

---

## 7. System Administration

### Integrations
Navigate to **Settings > Integrations**.
-   **Microsoft 365:** Connect your Outlook account to enable email notifications and calendar syncing.
-   **Slack:** Connect a Slack channel to receive real-time system alerts (e.g., "New Order Received").

### Audit Logs
Navigate to **Settings > Audit Logs**.
-   **Traceability:** View a history of all critical actions (who deleted a project, who changed a stock level, etc.).
-   **Filters:** Search logs by user, date, or action type.

### Database Configuration
-   **Connection:** Configure the connection to your local or cloud PostgreSQL database.
-   **Backup:** Regularly back up your database to prevent data loss.

---

## Support
For technical support, please refer to the **Help** page within the application or contact your IT administrator.
