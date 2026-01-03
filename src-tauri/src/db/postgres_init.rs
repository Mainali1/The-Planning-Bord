use postgres::{Client, NoTls, Error};

pub fn init_db(connection_string: &str) -> Result<(), Error> {
    ensure_database_exists(connection_string)?;
    let mut client = Client::connect(connection_string, NoTls)?;

    // 0. Core RBAC (Roles & Permissions) - Must be first for FKs
    client.execute(
        "CREATE TABLE IF NOT EXISTS roles (
            id SERIAL PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            is_custom BOOLEAN DEFAULT FALSE
        )",
        &[],
    )?;

    // Insert default roles
    client.execute("INSERT INTO roles (name, description, is_custom) VALUES ('CEO', 'Chief Executive Officer', FALSE) ON CONFLICT (name) DO NOTHING", &[])?;
    client.execute("INSERT INTO roles (name, description, is_custom) VALUES ('Manager', 'Managerial Role', FALSE) ON CONFLICT (name) DO NOTHING", &[])?;
    client.execute("INSERT INTO roles (name, description, is_custom) VALUES ('Employee', 'Standard Employee', FALSE) ON CONFLICT (name) DO NOTHING", &[])?;
    client.execute("INSERT INTO roles (name, description, is_custom) VALUES ('Technical', 'System Admin / Technical Support', FALSE) ON CONFLICT (name) DO NOTHING", &[])?;

    client.execute(
        "CREATE TABLE IF NOT EXISTS permissions (
            id SERIAL PRIMARY KEY,
            code TEXT UNIQUE NOT NULL,
            description TEXT
        )",
        &[],
    )?;
    
    // Seed basic permissions
    let permissions = vec![
        ("MANAGE_INVENTORY", "Can add/edit/delete products"),
        ("VIEW_INVENTORY", "Can view products"),
        ("MANAGE_EMPLOYEES", "Can add/edit/delete employees"),
        ("ASSIGN_TOOLS", "Can assign tools to employees"),
        ("MANAGE_COMPLAINTS", "Can view and resolve complaints"),
        ("MANAGE_SETTINGS", "Can change system settings"),
        ("MANAGE_ROLES", "Can create and modify roles"),
        ("MANAGE_TOOLS", "Can create, update, and delete tools"),
        ("MANAGE_PROJECTS", "Can create, update, and delete projects"),
    ];
    for (code, desc) in permissions {
        client.execute("INSERT INTO permissions (code, description) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING", &[&code, &desc])?;
    }

    client.execute(
        "CREATE TABLE IF NOT EXISTS role_permissions (
            role_id INTEGER REFERENCES roles(id),
            permission_id INTEGER REFERENCES permissions(id),
            PRIMARY KEY (role_id, permission_id)
        )",
        &[],
    )?;

    // 1. User Management
    client.execute(
        "CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            full_name TEXT,
            hashed_password TEXT NOT NULL,
            role TEXT REFERENCES roles(name) DEFAULT 'Employee',
            is_active BOOLEAN DEFAULT TRUE,
            microsoft_id TEXT UNIQUE,
            microsoft_token TEXT,
            microsoft_token_expires TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP
        )",
        &[],
    )?;

    // Patch users
    let _ = client.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE", &[]);
    let _ = client.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Employee'", &[]);
    let _ = client.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE", &[]);


    // Invite Tokens
    client.execute(
        "CREATE TABLE IF NOT EXISTS user_invites (
            id SERIAL PRIMARY KEY,
            token TEXT UNIQUE NOT NULL,
            role TEXT NOT NULL,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            expiration TIMESTAMP NOT NULL,
            is_used BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    )?;

    // 2. Inventory Management
    client.execute(
        "CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            category TEXT DEFAULT 'other',
            sku TEXT UNIQUE,
            current_quantity INTEGER DEFAULT 0 NOT NULL,
            minimum_quantity INTEGER DEFAULT 0 NOT NULL,
            reorder_quantity INTEGER DEFAULT 0 NOT NULL,
            unit_price DOUBLE PRECISION DEFAULT 0.0,
            supplier_name TEXT,
            supplier_email TEXT,
            supplier_phone TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_restocked TIMESTAMP
        )",
        &[],
    )?;

    client.execute(
        "CREATE TABLE IF NOT EXISTS inventory_logs (
            id SERIAL PRIMARY KEY,
            product_id INTEGER REFERENCES products(id),
            user_id INTEGER REFERENCES users(id),
            change_type TEXT NOT NULL,
            quantity_changed INTEGER NOT NULL,
            previous_quantity INTEGER,
            new_quantity INTEGER,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    )?;

    // 3. Employee Management
    client.execute(
        "CREATE TABLE IF NOT EXISTS employees (
            id SERIAL PRIMARY KEY,
            employee_id TEXT UNIQUE,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            email TEXT UNIQUE,
            phone TEXT,
            date_of_birth TIMESTAMP,
            role TEXT REFERENCES roles(name) DEFAULT 'Employee',
            department TEXT,
            position TEXT,
            hire_date TIMESTAMP,
            salary DOUBLE PRECISION,
            status TEXT DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    )?;

    client.execute(
        "CREATE TABLE IF NOT EXISTS attendances (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER REFERENCES employees(id),
            check_in TIMESTAMP NOT NULL,
            check_out TIMESTAMP,
            status TEXT DEFAULT 'present',
            notes TEXT,
            location TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    )?;

    client.execute(
        "CREATE TABLE IF NOT EXISTS tasks (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER REFERENCES employees(id),
            title TEXT NOT NULL,
            description TEXT,
            due_date TIMESTAMP,
            status TEXT DEFAULT 'pending',
            priority TEXT DEFAULT 'medium',
            assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_date TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    )?;

    // 4. Payment & Financial System
    client.execute(
        "CREATE TABLE IF NOT EXISTS payments (
            id SERIAL PRIMARY KEY,
            payment_type TEXT NOT NULL,
            amount DOUBLE PRECISION NOT NULL,
            currency TEXT DEFAULT 'USD',
            description TEXT,
            status TEXT DEFAULT 'pending',
            payment_method TEXT DEFAULT 'bank_transfer',
            payment_date TIMESTAMP,
            due_date TIMESTAMP,
            reference_number TEXT,
            employee_id INTEGER REFERENCES employees(id),
            supplier_name TEXT,
            supplier_email TEXT,
            notes TEXT,
            attachments TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    )?;

    client.execute(
        "CREATE TABLE IF NOT EXISTS accounts (
            id SERIAL PRIMARY KEY,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            currency TEXT DEFAULT 'USD',
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    )?;

    client.execute(
        "CREATE TABLE IF NOT EXISTS invoices (
            id SERIAL PRIMARY KEY,
            customer_name TEXT NOT NULL,
            customer_email TEXT,
            invoice_date TIMESTAMP NOT NULL,
            due_date TIMESTAMP,
            total_amount DOUBLE PRECISION NOT NULL,
            tax_rate DOUBLE PRECISION DEFAULT 0.0,
            tax_amount DOUBLE PRECISION DEFAULT 0.0,
            status TEXT DEFAULT 'draft',
            currency TEXT DEFAULT 'USD',
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    )?;

    // 5. Setup & Config
    client.execute(
        "CREATE TABLE IF NOT EXISTS setup_config (
            id SERIAL PRIMARY KEY,
            license_key TEXT UNIQUE NOT NULL,
            company_name TEXT NOT NULL,
            company_email TEXT NOT NULL,
            company_phone TEXT,
            company_address TEXT,
            admin_user_id INTEGER REFERENCES users(id),
            microsoft_tenant_id TEXT,
            microsoft_client_id TEXT,
            microsoft_client_secret TEXT,
            features_enabled TEXT,
            setup_completed BOOLEAN DEFAULT FALSE,
            setup_completed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    )?;

    // Patch for existing tables (Migration)
    let _ = client.execute("ALTER TABLE setup_config ADD COLUMN IF NOT EXISTS license_key TEXT", &[]);
    let _ = client.execute("ALTER TABLE setup_config ADD COLUMN IF NOT EXISTS admin_user_id INTEGER REFERENCES users(id)", &[]);
    let _ = client.execute("ALTER TABLE setup_config ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN DEFAULT FALSE", &[]);
    let _ = client.execute("ALTER TABLE setup_config ADD COLUMN IF NOT EXISTS setup_completed_at TIMESTAMP", &[]);


    client.execute(
        "CREATE TABLE IF NOT EXISTS complaints (
            id SERIAL PRIMARY KEY,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'pending',
            admin_notes TEXT,
            resolution TEXT,
            resolved_at TIMESTAMP,
            resolved_by TEXT
        )",
        &[],
    )?;

    client.execute(
        "CREATE TABLE IF NOT EXISTS tools (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            type_name TEXT NOT NULL,
            status TEXT DEFAULT 'available',
            assigned_to_employee_id INTEGER REFERENCES employees(id),
            purchase_date TIMESTAMP,
            condition TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    )?;

    // 6. Enhancements (Toggles, Audit)
    client.execute(
        "CREATE TABLE IF NOT EXISTS feature_toggles (
            key TEXT PRIMARY KEY,
            is_enabled BOOLEAN DEFAULT TRUE
        )",
        &[],
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
        client.execute("INSERT INTO feature_toggles (key, is_enabled) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING", &[&key, &enabled])?;
    }

    client.execute(
        "CREATE TABLE IF NOT EXISTS tool_assignments (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER REFERENCES employees(id),
            tool_id INTEGER REFERENCES tools(id),
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            returned_at TIMESTAMP,
            condition_on_assignment TEXT,
            condition_on_return TEXT,
            notes TEXT
        )",
        &[],
    )?;

    // 7. New Enterprise Features (Audit, Dashboard, Projects, Advanced Finance)
    client.execute(
        "CREATE TABLE IF NOT EXISTS audit_logs (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            action TEXT NOT NULL,
            entity TEXT NOT NULL,
            entity_id INTEGER,
            details TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    )?;

    client.execute(
        "CREATE TABLE IF NOT EXISTS dashboard_configs (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            name TEXT NOT NULL,
            layout_json TEXT,
            is_default BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    )?;

    client.execute(
        "CREATE TABLE IF NOT EXISTS projects (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            start_date TIMESTAMP,
            end_date TIMESTAMP,
            status TEXT DEFAULT 'planning',
            manager_id INTEGER REFERENCES employees(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    )?;

    client.execute(
        "CREATE TABLE IF NOT EXISTS project_assignments (
            id SERIAL PRIMARY KEY,
            project_id INTEGER REFERENCES projects(id),
            employee_id INTEGER REFERENCES employees(id),
            role TEXT DEFAULT 'member',
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(project_id, employee_id)
        )",
        &[],
    )?;

    client.execute(
        "CREATE TABLE IF NOT EXISTS project_tasks (
            id SERIAL PRIMARY KEY,
            project_id INTEGER REFERENCES projects(id),
            name TEXT NOT NULL,
            description TEXT,
            assigned_to INTEGER REFERENCES employees(id),
            status TEXT DEFAULT 'todo',
            priority TEXT DEFAULT 'medium',
            start_date TIMESTAMP,
            due_date TIMESTAMP,
            parent_task_id INTEGER REFERENCES project_tasks(id),
            dependencies_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    )?;

    client.execute(
        "CREATE TABLE IF NOT EXISTS accounts (
            id SERIAL PRIMARY KEY,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            currency TEXT DEFAULT 'USD',
            is_active BOOLEAN DEFAULT TRUE
        )",
        &[],
    )?;

    client.execute(
        "CREATE TABLE IF NOT EXISTS transactions (
            id SERIAL PRIMARY KEY,
            account_id INTEGER REFERENCES accounts(id),
            date TIMESTAMP NOT NULL,
            amount DOUBLE PRECISION NOT NULL,
            type TEXT NOT NULL,
            description TEXT,
            reference TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    )?;

    client.execute(
        "CREATE TABLE IF NOT EXISTS invoices (
            id SERIAL PRIMARY KEY,
            customer_name TEXT NOT NULL,
            customer_email TEXT,
            invoice_date TIMESTAMP NOT NULL,
            due_date TIMESTAMP,
            total_amount DOUBLE PRECISION DEFAULT 0,
            tax_rate DOUBLE PRECISION DEFAULT 0,
            tax_amount DOUBLE PRECISION DEFAULT 0,
            status TEXT DEFAULT 'draft',
            currency TEXT DEFAULT 'USD',
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    )?;

    client.execute(
        "CREATE TABLE IF NOT EXISTS invoice_items (
            id SERIAL PRIMARY KEY,
            invoice_id INTEGER REFERENCES invoices(id),
            description TEXT NOT NULL,
            quantity DOUBLE PRECISION DEFAULT 1,
            unit_price DOUBLE PRECISION DEFAULT 0,
            total DOUBLE PRECISION DEFAULT 0
        )",
        &[],
    )?;

    // 8. Integrations
    client.execute(
        "CREATE TABLE IF NOT EXISTS integrations (
            id SERIAL PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            is_connected BOOLEAN DEFAULT FALSE,
            api_key TEXT,
            config_json TEXT,
            connected_at TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    )?;

    // Seed Integrations
    let default_integrations = vec![
        "QuickBooks", "Xero", "Salesforce", "HubSpot", 
        "Slack", "Teams", "Google Calendar", "Outlook"
    ];
    for name in default_integrations {
        client.execute("INSERT INTO integrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING", &[&name])?;
    }

    Ok(())
}

fn ensure_database_exists(connection_string: &str) -> Result<(), Error> {
    let idx = connection_string.rfind('/').unwrap_or(connection_string.len());
    let target_db = if idx + 1 < connection_string.len() {
        let after = &connection_string[idx + 1..];
        after.split('?').next().unwrap_or("postgres")
    } else {
        "postgres"
    };
    let mut base = format!("{}{}", &connection_string[..idx + 1], "postgres");
    if !base.contains('?') {
        base.push_str("?connect_timeout=2");
    } else if !base.contains("connect_timeout=") {
        base.push_str("&connect_timeout=2");
    }
    let mut client = Client::connect(&base, NoTls)?;
    let rows = client.query("SELECT 1 FROM pg_database WHERE datname = $1", &[&target_db])?;
    if rows.is_empty() {
        client.execute(
            &format!("CREATE DATABASE {}", target_db.replace('"', "")),
            &[],
        )?;
    }
    Ok(())
}

