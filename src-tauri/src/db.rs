use rusqlite::{Connection, Result};

pub fn init_db(db_path: &str) -> Result<Connection> {
    let conn = Connection::open(db_path)?;

    // 1. User Management
    conn.execute(
        "CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            full_name TEXT,
            hashed_password TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            is_active BOOLEAN DEFAULT TRUE,
            microsoft_id TEXT UNIQUE,
            microsoft_token TEXT,
            microsoft_token_expires DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME
        )",
        [],
    )?;

    // 2. Inventory Management
    conn.execute(
        "CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            category TEXT DEFAULT 'other',
            sku TEXT UNIQUE,
            current_quantity INTEGER DEFAULT 0 NOT NULL,
            minimum_quantity INTEGER DEFAULT 0 NOT NULL,
            reorder_quantity INTEGER DEFAULT 0 NOT NULL,
            unit_price REAL DEFAULT 0.0,
            supplier_name TEXT,
            supplier_email TEXT,
            supplier_phone TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_restocked DATETIME
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS inventory_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER,
            user_id INTEGER,
            change_type TEXT NOT NULL,
            quantity_changed INTEGER NOT NULL,
            previous_quantity INTEGER,
            new_quantity INTEGER,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(product_id) REFERENCES products(id),
            FOREIGN KEY(user_id) REFERENCES users(id)
        )",
        [],
    )?;

    // 3. Employee Management
    conn.execute(
        "CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id TEXT UNIQUE,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            email TEXT UNIQUE,
            phone TEXT,
            date_of_birth DATETIME,
            role TEXT DEFAULT 'employee',
            department TEXT,
            position TEXT,
            hire_date DATETIME,
            salary REAL,
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS attendances (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER,
            check_in DATETIME NOT NULL,
            check_out DATETIME,
            status TEXT DEFAULT 'present',
            notes TEXT,
            location TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(employee_id) REFERENCES employees(id)
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER,
            title TEXT NOT NULL,
            description TEXT,
            due_date DATETIME,
            status TEXT DEFAULT 'pending',
            priority TEXT DEFAULT 'medium',
            assigned_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_date DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(employee_id) REFERENCES employees(id)
        )",
        [],
    )?;

    // 4. Payment & Financial System
    conn.execute(
        "CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            payment_type TEXT NOT NULL,
            amount REAL NOT NULL,
            currency TEXT DEFAULT 'USD',
            description TEXT,
            status TEXT DEFAULT 'pending',
            payment_method TEXT DEFAULT 'bank_transfer',
            payment_date DATETIME,
            due_date DATETIME,
            reference_number TEXT,
            employee_id INTEGER,
            supplier_name TEXT,
            supplier_email TEXT,
            notes TEXT,
            attachments TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(employee_id) REFERENCES employees(id)
        )",
        [],
    )?;

    // 5. Setup & Config
    conn.execute(
        "CREATE TABLE IF NOT EXISTS setup_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            license_key TEXT UNIQUE NOT NULL,
            company_name TEXT NOT NULL,
            company_email TEXT NOT NULL,
            company_phone TEXT,
            company_address TEXT,
            admin_user_id INTEGER,
            microsoft_tenant_id TEXT,
            microsoft_client_id TEXT,
            microsoft_client_secret TEXT,
            features_enabled TEXT,
            setup_completed BOOLEAN DEFAULT FALSE,
            setup_completed_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(admin_user_id) REFERENCES users(id)
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS complaints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'pending',
            admin_notes TEXT
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS tools (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type_name TEXT NOT NULL,
            status TEXT DEFAULT 'available',
            assigned_to_employee_id INTEGER,
            purchase_date DATETIME,
            condition TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(assigned_to_employee_id) REFERENCES employees(id)
        )",
        [],
    )?;

    // 6. Enhancements (RBAC, Toggles, Audit)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS roles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            is_custom BOOLEAN DEFAULT FALSE
        )",
        [],
    )?;

    // Insert default roles if they don't exist
    conn.execute("INSERT OR IGNORE INTO roles (name, description, is_custom) VALUES ('CEO', 'Chief Executive Officer', FALSE)", [])?;
    conn.execute("INSERT OR IGNORE INTO roles (name, description, is_custom) VALUES ('Manager', 'Managerial Role', FALSE)", [])?;
    conn.execute("INSERT OR IGNORE INTO roles (name, description, is_custom) VALUES ('Employee', 'Standard Employee', FALSE)", [])?;
    conn.execute("INSERT OR IGNORE INTO roles (name, description, is_custom) VALUES ('Technical', 'System Admin / Technical Support', FALSE)", [])?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS permissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            description TEXT
        )",
        [],
    )?;
    
    // Seed basic permissions (can be expanded)
    let permissions = vec![
        ("MANAGE_INVENTORY", "Can add/edit/delete products"),
        ("VIEW_INVENTORY", "Can view products"),
        ("MANAGE_EMPLOYEES", "Can add/edit/delete employees"),
        ("ASSIGN_TOOLS", "Can assign tools to employees"),
        ("MANAGE_COMPLAINTS", "Can view and resolve complaints"),
        ("MANAGE_SETTINGS", "Can change system settings"),
        ("MANAGE_ROLES", "Can create and modify roles"),
    ];
    for (code, desc) in permissions {
        conn.execute("INSERT OR IGNORE INTO permissions (code, description) VALUES (?1, ?2)", [code, desc])?;
    }

    conn.execute(
        "CREATE TABLE IF NOT EXISTS role_permissions (
            role_id INTEGER,
            permission_id INTEGER,
            PRIMARY KEY (role_id, permission_id),
            FOREIGN KEY(role_id) REFERENCES roles(id),
            FOREIGN KEY(permission_id) REFERENCES permissions(id)
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS feature_toggles (
            key TEXT PRIMARY KEY,
            is_enabled BOOLEAN DEFAULT TRUE
        )",
        [],
    )?;

    // Seed default feature toggles
    let default_toggles = vec![
        ("Inventory", true),
        ("HR", true),
        ("Finance", true),
        ("Tasks", true),
        ("Complaints", true),
        ("Reports", true),
    ];
    for (key, enabled) in default_toggles {
        conn.execute("INSERT OR IGNORE INTO feature_toggles (key, is_enabled) VALUES (?1, ?2)", (key, enabled))?;
    }

    conn.execute(
        "CREATE TABLE IF NOT EXISTS tool_assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER,
            tool_id INTEGER,
            assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            returned_at DATETIME,
            condition_on_assignment TEXT,
            condition_on_return TEXT,
            notes TEXT,
            FOREIGN KEY(employee_id) REFERENCES employees(id),
            FOREIGN KEY(tool_id) REFERENCES tools(id)
        )",
        [],
    )?;

    // Migrations for existing tables (safe to run multiple times)
    let _ = conn.execute("ALTER TABLE complaints ADD COLUMN resolution TEXT", []);
    let _ = conn.execute("ALTER TABLE complaints ADD COLUMN resolved_at DATETIME", []);
    let _ = conn.execute("ALTER TABLE complaints ADD COLUMN resolved_by TEXT", []);
    
    Ok(conn)
}
