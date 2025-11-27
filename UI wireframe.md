---

# **📌 UI Wireframes (Text-Based Layout)**

These are clean wireframe structures you can hand to AI Coder to convert into React/Svelte components.

---

# **1. Dashboard Wireframe**

```
---------------------------------------------------------
| SmartBiz Manager — Dashboard                          |
---------------------------------------------------------
| Sidebar                 | Main Panel                  |
|-------------------------|-----------------------------|
| - Dashboard             | [Stats Cards]               |
| - Inventory             |  • Total Products           |
| - Employees             |  • Low Stock Items          |
| - Payments              |  • Pending Tasks            |
| - Reports               |  • Employee Attendance      |
| - Settings              |                             |
|-------------------------------------------------------|
| Quick Graphs/Charts                                   |
|  - Inventory Trends                                    |
|  - Sales / Usage Graph                                 |
---------------------------------------------------------
```

---

# **2. Inventory Management Wireframe**

```
---------------------------------------------------------
| Inventory List                                         |
---------------------------------------------------------
| Search Bar | + Add Product                             |
---------------------------------------------------------
| Table:                                            (...)|
| ------------------------------------------------------- |
| | Product | Qty | Min | Supplier | Status | Actions |  |
| ------------------------------------------------------- |
| | Chips   | 20  | 30  | ABC Dist | Low    | Edit   |   |
| ------------------------------------------------------- |
---------------------------------------------------------

[Right Panel – Product Details]
- Product Name
- Current Quantity
- Minimum Quantity
- Auto-order Quantity
- Supplier Information
- Inventory History Logs
- Button: "Order Now"
```

---

# **3. Employee Management Wireframe**

```
---------------------------------------------------------
| Employees                                               |
---------------------------------------------------------
| Search | + Add Employee                                 |
---------------------------------------------------------
| Table:                                                  |
| ------------------------------------------------------- |
| | Name | Role | Status | Attendance | Tools | Actions | |
| --------------------------------------------------------|

[Employee Details Panel]
- Name, Role, Department
- Attendance Calendar
- Assigned Tools
- Recent Tasks
- Complaints (anonymous hidden ID)
```

---

# **4. Attendance System Wireframe**

```
---------------- Employee Attendance ---------------------
| Calendar View                                           |
|   - Mark Present/Late/Absent                            |
|   - Add Reason                                          |
-----------------------------------------------------------
| Monthly Summary Chart                                   |
```

---

# **5. Task Assignment Wireframe**

```
---------------- Assign Task -----------------------------
| Select Employee (Dropdown)                              |
| Task Title                                              |
| Task Description                                        |
| Due Date                                                |
| [Send Task Notification]                                |
-----------------------------------------------------------
| Employee Task List                                      |
| - Pending                                               |
| - In Progress                                           |
| - Completed                                             |
-----------------------------------------------------------
```

---

# **6. Payment/Finance Wireframe**

```
---------------- Payments --------------------------------
| + Add Payment                                           |
-----------------------------------------------------------
| Filters: Supplier / Employee / Date Range               |
-----------------------------------------------------------
| Table:                                                  |
| | Type | Person | Amount | Date | Notes | Actions |     |
-----------------------------------------------------------
```

---

# **7. Microsoft 365 Integration Panel**

```
---------------- Microsoft 365 Settings ------------------
| Connect to MS Account                                   |
| Status: Connected / Not Connected                       |
-----------------------------------------------------------
| Options:                                                |
| - Sync Inventory Reports to OneDrive                    |
| - Use Outlook for Auto-Restock Emails                  |
| - Sync Employee Tasks to Planner/To-Do                  |
| - Send Notifications to MS Teams                        |
-----------------------------------------------------------
```

---