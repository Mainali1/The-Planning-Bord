# Database Schema

**⚠️ PROPRIETARY DATABASE**: This schema is for The Planning Bord commercial software. Unauthorized access, copying, or reverse engineering is prohibited by license agreement.

## Overview

The Planning Bord uses **SQLite** for local installations (default) with optional **PostgreSQL** support for enterprise deployments. The database schema is designed for business management with integrated inventory, employee, payment, and user management systems.

---

## **1. User Management System**

### **Table: users**

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER (PK) | PRIMARY KEY, AUTO_INCREMENT | Unique user identifier |
| username | VARCHAR(100) | UNIQUE, NOT NULL | Unique username for login |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email address |
| full_name | VARCHAR(255) | NULLABLE | User's full name |
| hashed_password | VARCHAR(255) | NOT NULL | Bcrypt hashed password |
| role | ENUM | DEFAULT 'user' | User role: admin, manager, user |
| is_active | BOOLEAN | DEFAULT TRUE | Account active status |
| microsoft_id | VARCHAR(255) | UNIQUE, NULLABLE | Microsoft 365 integration ID |
| microsoft_token | TEXT | NULLABLE | Encrypted MS365 access token |
| microsoft_token_expires | DATETIME | NULLABLE | MS365 token expiration |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Account creation timestamp |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |
| last_login | DATETIME | NULLABLE | Last login timestamp |

**Relationships:**
- One-to-many with inventory_logs (user who made inventory changes)

---

## **2. Inventory Management System**

### **Table: products**

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER (PK) | PRIMARY KEY, AUTO_INCREMENT | Unique product identifier |
| name | VARCHAR(255) | NOT NULL, INDEX | Product name |
| description | TEXT | NULLABLE | Product description |
| category | ENUM | DEFAULT 'other' | Category: electronics, clothing, food, office, tools, other |
| sku | VARCHAR(100) | UNIQUE, INDEX | Stock keeping unit |
| current_quantity | INTEGER | DEFAULT 0, NOT NULL | Current stock level |
| minimum_quantity | INTEGER | DEFAULT 0, NOT NULL | Minimum stock threshold |
| reorder_quantity | INTEGER | DEFAULT 0, NOT NULL | Quantity to reorder |
| unit_price | FLOAT | DEFAULT 0.0 | Price per unit |
| supplier_name | VARCHAR(255) | NULLABLE | Supplier company name |
| supplier_email | VARCHAR(255) | NULLABLE | Supplier contact email |
| supplier_phone | VARCHAR(50) | NULLABLE | Supplier phone number |
| is_active | BOOLEAN | DEFAULT TRUE | Product active status |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Product creation timestamp |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |
| last_restocked | DATETIME | NULLABLE | Last restock date |

### **Table: inventory_logs**

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER (PK) | PRIMARY KEY, AUTO_INCREMENT | Unique log identifier |
| product_id | INTEGER (FK) | FOREIGN KEY → products.id | Related product |
| user_id | INTEGER (FK) | FOREIGN KEY → users.id | User who made the change |
| change_type | VARCHAR(50) | NOT NULL | Type: sale, add, restock, return, adjustment |
| quantity_changed | INTEGER | NOT NULL | Quantity change (+/-) |
| previous_quantity | INTEGER | NULLABLE | Quantity before change |
| new_quantity | INTEGER | NULLABLE | Quantity after change |
| notes | TEXT | NULLABLE | Change notes |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Log creation timestamp |

---

## **3. Employee Management System**

### **Table: employees**

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER (PK) | PRIMARY KEY, AUTO_INCREMENT | Unique employee identifier |
| employee_id | VARCHAR(50) | UNIQUE, INDEX | Company employee ID |
| first_name | VARCHAR(100) | NOT NULL | Employee first name |
| last_name | VARCHAR(100) | NOT NULL | Employee last name |
| email | VARCHAR(255) | UNIQUE, INDEX | Employee email address |
| phone | VARCHAR(20) | NULLABLE | Employee phone number |
| date_of_birth | DATETIME | NULLABLE | Employee birth date |
| role | ENUM | DEFAULT 'employee' | Role: admin, manager, employee, intern |
| department | VARCHAR(100) | NULLABLE | Employee department |
| position | VARCHAR(100) | NULLABLE | Job position/title |
| hire_date | DATETIME | NULLABLE | Employment start date |
| salary | FLOAT | NULLABLE | Annual salary amount |
| status | ENUM | DEFAULT 'active' | Status: active, inactive, on_leave, terminated |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Employee record creation |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

### **Table: attendances**

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER (PK) | PRIMARY KEY, AUTO_INCREMENT | Unique attendance record |
| employee_id | INTEGER (FK) | FOREIGN KEY → employees.id | Related employee |
| check_in | DATETIME | NOT NULL | Check-in timestamp |
| check_out | DATETIME | NULLABLE | Check-out timestamp |
| status | VARCHAR(50) | DEFAULT 'present' | Status: present, absent, late, early_leave |
| notes | TEXT | NULLABLE | Attendance notes |
| location | VARCHAR(255) | NULLABLE | Location tracking (optional) |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |

### **Table: tasks**

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER (PK) | PRIMARY KEY, AUTO_INCREMENT | Unique task identifier |
| employee_id | INTEGER (FK) | FOREIGN KEY → employees.id | Assigned employee |
| title | VARCHAR(255) | NOT NULL | Task title |
| description | TEXT | NULLABLE | Task description |
| due_date | DATETIME | NULLABLE | Task deadline |
| status | VARCHAR(50) | DEFAULT 'pending' | Status: pending, in_progress, completed, cancelled |
| priority | VARCHAR(20) | DEFAULT 'medium' | Priority: low, medium, high, urgent |
| assigned_date | DATETIME | DEFAULT CURRENT_TIMESTAMP | Assignment date |
| completed_date | DATETIME | NULLABLE | Completion date |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Task creation timestamp |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

### **Table: tool_assignments**

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER (PK) | PRIMARY KEY, AUTO_INCREMENT | Unique assignment identifier |
| employee_id | INTEGER (FK) | FOREIGN KEY → employees.id | Assigned employee |
| tool_name | VARCHAR(255) | NOT NULL | Tool/equipment name |
| tool_description | TEXT | NULLABLE | Tool description |
| assigned_date | DATETIME | DEFAULT CURRENT_TIMESTAMP | Assignment date |
| expected_return_date | DATETIME | NULLABLE | Expected return date |
| actual_return_date | DATETIME | NULLABLE | Actual return date |
| status | VARCHAR(50) | DEFAULT 'assigned' | Status: assigned, returned, damaged, lost |
| condition_when_assigned | VARCHAR(255) | NULLABLE | Initial condition |
| condition_when_returned | VARCHAR(255) | NULLABLE | Return condition |
| damage_notes | TEXT | NULLABLE | Damage/lost notes |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Assignment creation |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

### **Table: complaints**

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER (PK) | PRIMARY KEY, AUTO_INCREMENT | Unique complaint identifier |
| employee_id | INTEGER (FK) | NULLABLE, FOREIGN KEY → employees.id | Related employee (optional) |
| complaint_text | TEXT | NOT NULL | Complaint details |
| category | VARCHAR(100) | NULLABLE | Complaint category |
| priority | VARCHAR(20) | DEFAULT 'medium' | Priority: low, medium, high, urgent |
| is_anonymous | BOOLEAN | DEFAULT FALSE | Anonymous complaint flag |
| status | VARCHAR(50) | DEFAULT 'open' | Status: open, in_progress, resolved, closed |
| resolution_notes | TEXT | NULLABLE | Resolution details |
| resolved_date | DATETIME | NULLABLE | Resolution date |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Complaint submission date |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

---

## **4. Payment & Financial System**

### **Table: payments**

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER (PK) | PRIMARY KEY, AUTO_INCREMENT | Unique payment identifier |
| payment_type | ENUM | NOT NULL | Type: supplier, salary, expense, other |
| amount | FLOAT | NOT NULL | Payment amount |
| currency | VARCHAR(3) | DEFAULT 'USD' | Currency code |
| description | TEXT | NULLABLE | Payment description |
| status | ENUM | DEFAULT 'pending' | Status: pending, completed, failed, cancelled |
| payment_method | ENUM | DEFAULT 'bank_transfer' | Method: bank_transfer, cash, check, credit_card, other |
| payment_date | DATETIME | NULLABLE | Actual payment date |
| due_date | DATETIME | NULLABLE | Payment due date |
| reference_number | VARCHAR(100) | NULLABLE | Payment reference number |
| employee_id | INTEGER (FK) | NULLABLE, FOREIGN KEY → employees.id | Related employee |
| supplier_name | VARCHAR(255) | NULLABLE | Supplier name for payments |
| supplier_email | VARCHAR(255) | NULLABLE | Supplier contact email |
| notes | TEXT | NULLABLE | Payment notes |
| attachments | TEXT | NULLABLE | JSON array of attachment paths |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Payment creation timestamp |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

### **Table: suppliers**

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER (PK) | PRIMARY KEY, AUTO_INCREMENT | Unique supplier identifier |
| name | VARCHAR(255) | NOT NULL | Supplier company name |
| email | VARCHAR(255) | NULLABLE | Primary contact email |
| phone | VARCHAR(50) | NULLABLE | Primary contact phone |
| address | TEXT | NULLABLE | Business address |
| website | VARCHAR(255) | NULLABLE | Company website |
| tax_id | VARCHAR(100) | NULLABLE | Tax identification number |
| payment_terms | VARCHAR(100) | NULLABLE | Payment terms (Net 30, etc.) |
| is_active | BOOLEAN | DEFAULT TRUE | Supplier active status |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Supplier creation timestamp |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

### **Table: salaries**

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER (PK) | PRIMARY KEY, AUTO_INCREMENT | Unique salary record identifier |
| employee_id | INTEGER (FK) | NOT NULL, FOREIGN KEY → employees.id | Related employee |
| base_salary | FLOAT | NOT NULL | Base annual salary |
| bonus | FLOAT | DEFAULT 0.0 | Bonus amount |
| deductions | FLOAT | DEFAULT 0.0 | Total deductions |
| gross_pay | FLOAT | NULLABLE | Calculated gross pay |
| net_pay | FLOAT | NULLABLE | Calculated net pay |
| pay_period_start | DATETIME | NOT NULL | Pay period start date |
| pay_period_end | DATETIME | NOT NULL | Pay period end date |
| status | ENUM | DEFAULT 'pending' | Status: pending, paid, cancelled |
| paid_date | DATETIME | NULLABLE | Actual payment date |
| notes | TEXT | NULLABLE | Salary notes |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Salary record creation |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

---

## **5. Setup & Configuration System**

### **Table: setup_config**

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER (PK) | PRIMARY KEY, AUTO_INCREMENT | Unique configuration identifier |
| license_key | VARCHAR(255) | UNIQUE, NOT NULL | Commercial license key |
| company_name | VARCHAR(255) | NOT NULL | Company/business name |
| company_email | VARCHAR(255) | NOT NULL | Primary business email |
| company_phone | VARCHAR(50) | NULLABLE | Business phone number |
| company_address | TEXT | NULLABLE | Business address |
| admin_user_id | INTEGER (FK) | FOREIGN KEY → users.id | Primary administrator |
| microsoft_tenant_id | VARCHAR(255) | NULLABLE | MS365 tenant ID |
| microsoft_client_id | VARCHAR(255) | NULLABLE | MS365 client ID |
| microsoft_client_secret | TEXT | NULLABLE | Encrypted MS365 client secret |
| features_enabled | TEXT | NULLABLE | JSON array of enabled features |
| setup_completed | BOOLEAN | DEFAULT FALSE | Setup completion status |
| setup_completed_at | DATETIME | NULLABLE | Setup completion timestamp |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Configuration creation |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

---

## **Database Relationships**

```
users (1)─────<(∞) inventory_logs
users (1)─────<(∞) setup_config (admin_user_id)

employees (1)─< (∞) attendances
employees (1)─< (∞) tasks
employees (1)─< (∞) tool_assignments
employees (1)─< (∞) complaints
employees (1)─< (∞) payments (employee_id)
employees (1)─< (∞) salaries

products (1)──< (∞) inventory_logs
```

---

## **Security Features**

### **Data Protection**
- **Encrypted passwords** using bcrypt with salt rounds
- **Encrypted tokens** for Microsoft 365 integration
- **Secure credential storage** in user home directory
- **Audit logging** for all inventory and payment changes
- **Session management** with automatic timeout

### **Access Control**
- **Role-based permissions** (admin, manager, user)
- **JWT authentication** with secure token management
- **Multi-factor authentication** support via Microsoft 365
- **License validation** for software access control

### **Commercial License Enforcement**
- **License key validation** on startup and periodically
- **Feature gating** based on license tier
- **Usage tracking** for compliance monitoring
- **Automatic license revocation** for violations

---

## **Database Configuration**

### **SQLite (Default - Local Installation)**
```python
# Local database stored in user's home directory
~/.planningbord/planningbord.db

# Connection string
sqlite:///~/.planningbord/planningbord.db
```

### **PostgreSQL (Enterprise - Optional)**
```python
# Enterprise deployment with PostgreSQL
postgresql://username:password@hostname:5432/planningbord

# Requires separate PostgreSQL installation
# Enhanced performance for multi-user environments
```

---

## **Migration & Backup**

### **Automatic Migration**
- **Schema creation** on first application startup
- **Version tracking** for schema updates
- **Backup creation** before migrations
- **Rollback capability** for failed updates

### **Backup Strategy**
- **Automated daily backups** of local SQLite database
- **Encrypted backup storage** in secure location
- **Point-in-time recovery** for enterprise PostgreSQL
- **Cross-platform backup compatibility**

---

**⚠️ LEGAL NOTICE**: This database schema is proprietary intellectual property of The Planning Bord Inc. Any unauthorized reproduction, distribution, or reverse engineering is strictly prohibited and may result in civil and criminal liability under applicable intellectual property laws.

**Last Updated**: December 2024