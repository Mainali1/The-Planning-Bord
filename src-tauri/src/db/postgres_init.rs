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

    client.execute(
        "CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            exp BIGINT
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

    // Patch user_invites
    let _ = client.execute("ALTER TABLE user_invites ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE", &[]);
    let _ = client.execute("ALTER TABLE user_invites ALTER COLUMN expiration DROP NOT NULL", &[]);

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
            role TEXT REFERENCES roles(name),
            department TEXT,
            position TEXT,
            hire_date TIMESTAMP,
            salary DOUBLE PRECISION,
            status TEXT DEFAULT 'active',
            address TEXT,
            emergency_contact_name TEXT,
            emergency_contact_phone TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    )?;

    // 4. Finance & Accounting
    client.execute(
        "CREATE TABLE IF NOT EXISTS payments (
            id SERIAL PRIMARY KEY,
            date TIMESTAMP NOT NULL,
            amount DOUBLE PRECISION NOT NULL,
            type TEXT NOT NULL,
            category TEXT,
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
            company_name TEXT,
            company_email TEXT,
            license_key TEXT UNIQUE,
            setup_completed BOOLEAN DEFAULT FALSE,
            setup_completed_at TIMESTAMP,
            admin_user_id INTEGER REFERENCES users(id)
        )",
        &[],
    )?;

    // 6. Tools Management
    client.execute(
        "CREATE TABLE IF NOT EXISTS tools (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            type_name TEXT NOT NULL,
            status TEXT DEFAULT 'available',
            assigned_to_employee_id INTEGER REFERENCES employees(id),
            purchase_date TIMESTAMP,
            purchase_price DOUBLE PRECISION,
            condition TEXT DEFAULT 'new',
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    )?;

    client.execute(
        "CREATE TABLE IF NOT EXISTS tool_assignments (
            id SERIAL PRIMARY KEY,
            tool_id INTEGER REFERENCES tools(id),
            employee_id INTEGER REFERENCES employees(id),
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            returned_at TIMESTAMP,
            return_condition TEXT,
            notes TEXT
        )",
        &[],
    )?;

    // 7. Project Management
    client.execute(
        "CREATE TABLE IF NOT EXISTS projects (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'planning',
            start_date TIMESTAMP,
            end_date TIMESTAMP,
            budget DOUBLE PRECISION,
            client_name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    )?;

    client.execute(
        "CREATE TABLE IF NOT EXISTS project_tasks (
            id SERIAL PRIMARY KEY,
            project_id INTEGER REFERENCES projects(id),
            name TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'pending',
            assigned_to_employee_id INTEGER REFERENCES employees(id),
            due_date TIMESTAMP,
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
            role TEXT,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    )?;

    // 8. Complaints & Feedback
    client.execute(
        "CREATE TABLE IF NOT EXISTS complaints (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            submitted_by_employee_id INTEGER REFERENCES employees(id),
            status TEXT DEFAULT 'open',
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            resolved_at TIMESTAMP,
            resolution TEXT,
            resolved_by_user_id INTEGER REFERENCES users(id),
            admin_notes TEXT,
            is_anonymous BOOLEAN DEFAULT FALSE
        )",
        &[],
    )?;

    // 9. Attendance
    client.execute(
        "CREATE TABLE IF NOT EXISTS attendance (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER REFERENCES employees(id),
            check_in TIMESTAMP NOT NULL,
            check_out TIMESTAMP,
            status TEXT,
            notes TEXT,
            location TEXT
        )",
        &[],
    )?;
    // Patch legacy/mismatched columns
    let _ = client.execute("ALTER TABLE attendance RENAME COLUMN clock_in TO check_in", &[]);
    let _ = client.execute("ALTER TABLE attendance RENAME COLUMN clock_out TO check_out", &[]);
    let _ = client.execute("ALTER TABLE attendance DROP COLUMN IF EXISTS date", &[]);
    let _ = client.execute("ALTER TABLE attendance ADD COLUMN IF NOT EXISTS status TEXT", &[]);
    let _ = client.execute("ALTER TABLE attendance ADD COLUMN IF NOT EXISTS notes TEXT", &[]);
    let _ = client.execute("ALTER TABLE attendance ADD COLUMN IF NOT EXISTS location TEXT", &[]);

    // 10. Audit Logs
    client.execute(
        "CREATE TABLE IF NOT EXISTS audit_logs (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            action TEXT NOT NULL,
            category TEXT,
            entity TEXT,
            entity_id INTEGER,
            details TEXT,
            ip_address TEXT,
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    )?;

    // Ensure columns exist (for migration)
    let _ = client.execute("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS category TEXT", &[]);
    let _ = client.execute("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT", &[]);
    let _ = client.execute("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT", &[]);

    // 11. Feature Toggles
    client.execute(
        "CREATE TABLE IF NOT EXISTS feature_toggles (
            key TEXT PRIMARY KEY,
            is_enabled BOOLEAN DEFAULT FALSE
        )",
        &[],
    )?;
    
    // Seed default feature toggles
    let toggles = vec![
        ("inventory_module", true),
        ("employee_module", true),
        ("finance_module", true),
        ("tools_module", true),
        ("projects_module", true),
        ("complaints_module", true),
        ("attendance_module", true),
    ];
    for (key, enabled) in toggles {
        client.execute("INSERT INTO feature_toggles (key, is_enabled) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING", &[&key, &enabled])?;
    }

    // 12. Integrations
    client.execute(
        "CREATE TABLE IF NOT EXISTS integrations (
            id SERIAL PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            is_connected BOOLEAN DEFAULT FALSE,
            api_key TEXT,
            config_json TEXT,
            connected_at TIMESTAMP
        )",
        &[],
    )?;
    
    // Seed integrations
    let integrations = vec![
        ("QuickBooks", false),
        ("Xero", false),
        ("Slack", false),
        ("Microsoft Teams", false),
        ("Google Calendar", false),
        ("Outlook Calendar", false),
    ];
    for (name, connected) in integrations {
        client.execute("INSERT INTO integrations (name, is_connected) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING", &[&name, &connected])?;
    }

    // 13. Supply Chain (BOM & Batches)
    client.execute(
        "CREATE TABLE IF NOT EXISTS bom_headers (
            id SERIAL PRIMARY KEY,
            product_id INTEGER REFERENCES products(id),
            name TEXT NOT NULL,
            description TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    )?;

    client.execute(
        "CREATE TABLE IF NOT EXISTS bom_lines (
            id SERIAL PRIMARY KEY,
            bom_id INTEGER REFERENCES bom_headers(id) ON DELETE CASCADE,
            component_product_id INTEGER REFERENCES products(id),
            quantity DOUBLE PRECISION NOT NULL,
            unit TEXT,
            wastage_percentage DOUBLE PRECISION DEFAULT 0.0,
            notes TEXT
        )",
        &[],
    )?;

    client.execute(
        "CREATE TABLE IF NOT EXISTS inventory_batches (
            id SERIAL PRIMARY KEY,
            product_id INTEGER REFERENCES products(id),
            batch_number TEXT NOT NULL,
            quantity INTEGER DEFAULT 0,
            manufacturing_date TIMESTAMP,
            expiration_date TIMESTAMP,
            received_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            supplier_info TEXT,
            status TEXT DEFAULT 'active',
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    )?;

    // Patch inventory_batches
    let _ = client.execute("ALTER TABLE inventory_batches ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES suppliers(id)", &[]);

    // 14. Generic Tasks
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
            completed_date TIMESTAMP
        )",
        &[],
    )?;

    // 15. Supplier Management
    client.execute(
        "CREATE TABLE IF NOT EXISTS suppliers (
            id SERIAL PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            email TEXT,
            phone TEXT,
            contact_person TEXT,
            address TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    )?;

    // 16. Supplier Orders
    client.execute(
        "CREATE TABLE IF NOT EXISTS supplier_orders (
            id SERIAL PRIMARY KEY,
            supplier_id INTEGER REFERENCES suppliers(id),
            created_by_user_id INTEGER REFERENCES users(id),
            order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'pending',
            total_amount DOUBLE PRECISION DEFAULT 0.0,
            notes TEXT,
            items_json TEXT, 
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    )?;

    Ok(())
}

fn ensure_database_exists(_connection_string: &str) -> Result<(), Error> {
    // Basic implementation: assumes DB exists or created externally.
    // In production, might want to connect to 'postgres' db and create target db.
    Ok(())
}
