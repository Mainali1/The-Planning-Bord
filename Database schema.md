Here you go — a **complete database schema** and **clean UI wireframes** for your business software.

---

# **📌 Database Schema (ER Diagram Structure)**

*(You can copy directly into AI Coder as reference)*

Below is a full relational schema designed for PostgreSQL/MySQL.

---

## **1. Inventory System**

### **Table: products**

| Field               | Type          | Description           |
| ------------------- | ------------- | --------------------- |
| product_id (PK)     | INT           | Unique identifier     |
| name                | VARCHAR(255)  | Product name          |
| category_id (FK)    | INT           | Category link         |
| supplier_id (FK)    | INT           | Assigned distributor  |
| current_quantity    | INT           | Current stock count   |
| min_quantity        | INT           | Minimum desired stock |
| auto_order_quantity | INT           | Quantity to order     |
| unit_price          | DECIMAL(10,2) | Optional price        |

---

### **Table: categories**

| Field            | Type         | Description   |
| ---------------- | ------------ | ------------- |
| category_id (PK) | INT          | Category ID   |
| name             | VARCHAR(255) | Category name |

---

### **Table: suppliers**

| Field            | Type         | Description            |
| ---------------- | ------------ | ---------------------- |
| supplier_id (PK) | INT          | Supplier ID            |
| name             | VARCHAR(255) | Distributor name       |
| email            | VARCHAR(255) | Email for auto-restock |
| phone            | VARCHAR(50)  | Optional               |
| address          | TEXT         | Optional               |

---

### **Table: inventory_logs**

| Field            | Type                                  |
| ---------------- | ------------------------------------- |
| log_id (PK)      | INT                                   |
| product_id (FK)  | INT                                   |
| change_type      | ENUM('sale','add','restock','return') |
| quantity_changed | INT                                   |
| timestamp        | DATETIME                              |
| notes            | TEXT                                  |

---

### **Table: auto_restock_events**

| Field              | Type                            |
| ------------------ | ------------------------------- |
| event_id (PK)      | INT                             |
| product_id (FK)    | INT                             |
| triggered_quantity | INT                             |
| email_status       | ENUM('pending','sent','failed') |
| sent_timestamp     | DATETIME                        |

---

## **2. Employee Management**

### **Table: employees**

| Field            | Type                                   |
| ---------------- | -------------------------------------- |
| employee_id (PK) | INT                                    |
| first_name       | VARCHAR(255)                           |
| last_name        | VARCHAR(255)                           |
| role             | VARCHAR(255)                           |
| department       | VARCHAR(255)                           |
| email            | VARCHAR(255)                           |
| phone            | VARCHAR(50)                            |
| date_joined      | DATE                                   |
| status           | ENUM('active','on_leave','terminated') |

---

### **Table: attendance**

| Field              | Type                            |
| ------------------ | ------------------------------- |
| attendance_id (PK) | INT                             |
| employee_id (FK)   | INT                             |
| date               | DATE                            |
| status             | ENUM('present','absent','late') |
| reason             | TEXT                            |
| timestamp          | DATETIME                        |

---

### **Table: employee_tools**

| Field            | Type         |
| ---------------- | ------------ |
| tool_id (PK)     | INT          |
| employee_id (FK) | INT          |
| tool_name        | VARCHAR(255) |
| condition        | VARCHAR(255) |
| assigned_date    | DATE         |
| return_date      | DATE         |

---

### **Table: complaints**

| Field                      | Type    |                          |
| -------------------------- | ------- | ------------------------ |
| complaint_id (PK)          | INT     |                          |
| employee_id (FK, NULLABLE) | INT     | (optional for anonymity) |
| complaint_text             | TEXT    |                          |
| date_submitted             | DATE    |                          |
| is_anonymous               | BOOLEAN |                          |

---

### **Table: employee_tasks**

| Field              | Type                                      |
| ------------------ | ----------------------------------------- |
| task_id (PK)       | INT                                       |
| employee_id (FK)   | INT                                       |
| task_title         | VARCHAR(255)                              |
| task_description   | TEXT                                      |
| due_date           | DATE                                      |
| status             | ENUM('pending','in_progress','completed') |
| assigned_timestamp | DATETIME                                  |

---

## **3. Payment / Finance System**

### **Table: payments**

| Field                     | Type                              |
| ------------------------- | --------------------------------- |
| payment_id (PK)           | INT                               |
| type                      | ENUM('supplier','salary','other') |
| employee_id (FK NULLABLE) | INT                               |
| supplier_id (FK NULLABLE) | INT                               |
| amount                    | DECIMAL(10,2)                     |
| date                      | DATE                              |
| notes                     | TEXT                              |

---

### **Table: salaries**

| Field            | Type                     |
| ---------------- | ------------------------ |
| salary_id (PK)   | INT                      |
| employee_id (FK) | INT                      |
| amount           | DECIMAL(10,2)            |
| payment_cycle    | ENUM('monthly','weekly') |
| last_paid_date   | DATE                     |

---