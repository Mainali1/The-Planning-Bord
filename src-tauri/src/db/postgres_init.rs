use tokio_postgres::{NoTls, Error};

pub async fn init_db(connection_string: &str) -> Result<(), Error> {
    ensure_database_exists(connection_string).await?;
    let (client, connection) = tokio_postgres::connect(connection_string, NoTls).await?;

    // The connection object performs the actual communication with the database,
    // so spawn it off to run on its own.
    tokio::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("connection error: {}", e);
        }
    });

    // Helper Functions
    client.execute(
        "CREATE OR REPLACE FUNCTION format_timestamp(ts TIMESTAMP) RETURNS TEXT AS $$
        BEGIN
            IF ts IS NULL THEN
                RETURN NULL;
            END IF;
            RETURN to_char(ts, 'YYYY-MM-DD\"T\"HH24:MI:SS');
        END;
        $$ LANGUAGE plpgsql;",
        &[],
    ).await?;

    // 0. Core RBAC (Roles & Permissions) - Must be first for FKs
    client.execute(
        "CREATE TABLE IF NOT EXISTS roles (
            id SERIAL PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            is_custom BOOLEAN DEFAULT FALSE
        )",
        &[],
    ).await?;

    // Insert default roles
    client.execute("INSERT INTO roles (name, description, is_custom) VALUES ('CEO', 'Chief Executive Officer', FALSE) ON CONFLICT (name) DO NOTHING", &[]).await?;
    client.execute("INSERT INTO roles (name, description, is_custom) VALUES ('Manager', 'Managerial Role', FALSE) ON CONFLICT (name) DO NOTHING", &[]).await?;
    client.execute("INSERT INTO roles (name, description, is_custom) VALUES ('HR', 'Human Resources', FALSE) ON CONFLICT (name) DO NOTHING", &[]).await?;
    client.execute("INSERT INTO roles (name, description, is_custom) VALUES ('Employee', 'Standard Employee', FALSE) ON CONFLICT (name) DO NOTHING", &[]).await?;
    client.execute("INSERT INTO roles (name, description, is_custom) VALUES ('Technical', 'System Admin / Technical Support', FALSE) ON CONFLICT (name) DO NOTHING", &[]).await?;

    client.execute(
        "CREATE TABLE IF NOT EXISTS permissions (
            id SERIAL PRIMARY KEY,
            code TEXT UNIQUE NOT NULL,
            description TEXT
        )",
        &[],
    ).await?;
    
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
        ("VIEW_BACKEND_ERRORS", "Can view detailed backend error notifications"),
    ];
    for (code, desc) in permissions {
        client.execute("INSERT INTO permissions (code, description) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING", &[&code, &desc]).await?;
    }

    client.execute(
        "CREATE TABLE IF NOT EXISTS role_permissions (
            role_id INTEGER REFERENCES roles(id),
            permission_id INTEGER REFERENCES permissions(id),
            PRIMARY KEY (role_id, permission_id)
        )",
        &[],
    ).await?;

    // Assign VIEW_BACKEND_ERRORS to Technical and CEO
    client.execute(
        "INSERT INTO role_permissions (role_id, permission_id)
         SELECT r.id, p.id
         FROM roles r, permissions p
         WHERE r.name IN ('Technical', 'CEO') AND p.code = 'VIEW_BACKEND_ERRORS'
         ON CONFLICT DO NOTHING",
        &[],
    ).await?;

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
    ).await?;

    // Patch users
    let _ = client.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE", &[]).await;
    let _ = client.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT", &[]).await;
    let _ = client.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Employee'", &[]).await;
    let _ = client.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE", &[]).await;

    // Patches moved to end of file to ensure tables exist
    
    // Patch gl_accounts
    let _ = client.execute("ALTER TABLE gl_accounts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP", &[]).await;

    client.execute(
        "CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            exp BIGINT
        )",
        &[],
    ).await?;


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
    ).await?;

    // Patch user_invites
    let _ = client.execute("ALTER TABLE user_invites ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE", &[]).await;
    let _ = client.execute("ALTER TABLE user_invites ALTER COLUMN expiration DROP NOT NULL", &[]).await;

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
    ).await?;

    // Patch products
    let _ = client.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price DOUBLE PRECISION DEFAULT 0.0", &[]).await;

    // Item Categorization
    client.execute("DO $$ BEGIN
        CREATE TYPE item_type_enum AS ENUM ('goods', 'ingredients', 'assets');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;", &[]).await.ok();

    let _ = client.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS item_type item_type_enum DEFAULT 'goods'", &[]).await;

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
    ).await?;

    // 2.1 Sales (New)
    client.execute(
        "CREATE TABLE IF NOT EXISTS sales (
            id SERIAL PRIMARY KEY,
            product_id INTEGER REFERENCES products(id),
            quantity INTEGER NOT NULL,
            total_price DOUBLE PRECISION NOT NULL,
            sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            notes TEXT,
            user_id INTEGER REFERENCES users(id)
        )",
        &[],
    ).await?;

    // 3. Employee Management
    client.execute(
        "CREATE TABLE IF NOT EXISTS employees (
            id SERIAL PRIMARY KEY,
            employee_id TEXT UNIQUE,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            full_name TEXT,
            email TEXT UNIQUE,
            phone TEXT,
            date_of_birth TIMESTAMP,
            role TEXT REFERENCES roles(name),
            department TEXT,
            position TEXT,
            manager_id INTEGER REFERENCES employees(id),
            hire_date TIMESTAMP,
            salary DOUBLE PRECISION,
            hourly_cost DOUBLE PRECISION DEFAULT 0.0,
            status TEXT DEFAULT 'active',
            address TEXT,
            emergency_contact_name TEXT,
            emergency_contact_phone TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    ).await?;

    // Patch employees
    let _ = client.execute("ALTER TABLE employees ADD COLUMN IF NOT EXISTS full_name TEXT", &[]).await;
    let _ = client.execute("ALTER TABLE employees ADD COLUMN IF NOT EXISTS manager_id INTEGER REFERENCES employees(id)", &[]).await;
    let _ = client.execute("ALTER TABLE employees ADD COLUMN IF NOT EXISTS hourly_cost DOUBLE PRECISION DEFAULT 0.0", &[]).await;

    // 4. Finance & Accounting
    client.execute(
        "CREATE TABLE IF NOT EXISTS payments (
            id SERIAL PRIMARY KEY,
            date TIMESTAMP NOT NULL,
            amount DOUBLE PRECISION NOT NULL,
            payment_type TEXT NOT NULL,
            category TEXT,
            description TEXT,
            status TEXT DEFAULT 'pending',
            payment_method TEXT DEFAULT 'bank_transfer',
            payment_date TIMESTAMP,
            due_date TIMESTAMP,
            reference_number TEXT,
            employee_id INTEGER REFERENCES employees(id),
            project_id INTEGER,
            supplier_name TEXT,
            supplier_email TEXT,
            notes TEXT,
            attachments TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    ).await?;

    client.execute(
        "CREATE TABLE IF NOT EXISTS accounts (
            id SERIAL PRIMARY KEY,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            account_type TEXT NOT NULL,
            currency TEXT DEFAULT 'USD',
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    ).await?;

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
    ).await?;

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
    ).await?;

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
    ).await?;

    client.execute(
        "CREATE TABLE IF NOT EXISTS tool_assignments (
            id SERIAL PRIMARY KEY,
            tool_id INTEGER REFERENCES tools(id),
            employee_id INTEGER REFERENCES employees(id),
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            returned_at TIMESTAMP,
            condition_on_assignment TEXT,
            condition_on_return TEXT,
            notes TEXT
        )",
        &[],
    ).await?;

    // Migration for existing databases: rename return_condition to condition_on_return
    client.execute(
        "DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tool_assignments' AND column_name='return_condition') THEN
                ALTER TABLE tool_assignments RENAME COLUMN return_condition TO condition_on_return;
            END IF;
        END $$;",
        &[],
    ).await.ok(); // Ignore error if column doesn't exist

    // Add condition_on_assignment column if it doesn't exist
    client.execute(
        "ALTER TABLE tool_assignments ADD COLUMN IF NOT EXISTS condition_on_assignment TEXT",
        &[],
    ).await.ok();

    // Patch tools for asset linking
    let _ = client.execute("ALTER TABLE tools ADD COLUMN IF NOT EXISTS product_id INTEGER REFERENCES products(id)", &[]).await;

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
            client_id INTEGER,
            manager_id INTEGER REFERENCES employees(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    ).await?;


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
    ).await?;

    // Add missing columns to project_tasks table to match the Rust model
    let _ = client.execute("ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium'", &[]).await;
    let _ = client.execute("ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS start_date TIMESTAMP", &[]).await;
    let _ = client.execute("ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS parent_task_id INTEGER REFERENCES project_tasks(id)", &[]).await;
    let _ = client.execute("ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS dependencies_json TEXT", &[]).await;
    
    // Rename assigned_to_employee_id to assigned_to to match Rust model
    let _ = client.execute(
        "DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_tasks' AND column_name='assigned_to_employee_id') THEN
                ALTER TABLE project_tasks RENAME COLUMN assigned_to_employee_id TO assigned_to;
            END IF;
        END $$;",
        &[],
    ).await;

    client.execute(
        "CREATE TABLE IF NOT EXISTS project_assignments (
            id SERIAL PRIMARY KEY,
            project_id INTEGER REFERENCES projects(id),
            employee_id INTEGER REFERENCES employees(id),
            role TEXT,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    ).await?;

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
    ).await?;

    // Patch complaints for legacy schema
    let _ = client.execute("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS title TEXT DEFAULT 'Complaint'", &[]).await;
    let _ = client.execute(
        "DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='complaints' AND column_name='content') THEN
                ALTER TABLE complaints RENAME COLUMN content TO description;
            END IF;
        END $$;",
        &[],
    ).await; // Use PL/pgSQL for conditional rename
    let _ = client.execute("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS description TEXT", &[]).await; // Ensure description exists
    let _ = client.execute("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS submitted_by_employee_id INTEGER REFERENCES employees(id)", &[]).await;
    let _ = client.execute(
        "DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='complaints' AND column_name='created_at') THEN
                ALTER TABLE complaints RENAME COLUMN created_at TO submitted_at;
            END IF;
        END $$;",
        &[],
    ).await;
    let _ = client.execute("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS resolved_by_user_id INTEGER REFERENCES users(id)", &[]).await;
    let _ = client.execute("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT FALSE", &[]).await;


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
    ).await?;
    // Patch legacy/mismatched columns
    let _ = client.execute(
        "DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance' AND column_name='clock_in') THEN
                ALTER TABLE attendance RENAME COLUMN clock_in TO check_in;
            END IF;
        END $$;",
        &[],
    ).await;
    let _ = client.execute(
        "DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance' AND column_name='clock_out') THEN
                ALTER TABLE attendance RENAME COLUMN clock_out TO check_out;
            END IF;
        END $$;",
        &[],
    ).await;
    let _ = client.execute("ALTER TABLE attendance DROP COLUMN IF EXISTS date", &[]).await;
    let _ = client.execute("ALTER TABLE attendance ADD COLUMN IF NOT EXISTS status TEXT", &[]).await;
    let _ = client.execute("ALTER TABLE attendance ADD COLUMN IF NOT EXISTS notes TEXT", &[]).await;
    let _ = client.execute("ALTER TABLE attendance ADD COLUMN IF NOT EXISTS location TEXT", &[]).await;

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
    ).await?;

    // Ensure columns exist (for migration)
    let _ = client.execute("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS category TEXT", &[]).await;
    let _ = client.execute("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT", &[]).await;
    let _ = client.execute("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT", &[]).await;

    // 11. Feature Toggles
    client.execute(
        "CREATE TABLE IF NOT EXISTS feature_toggles (
            key TEXT PRIMARY KEY,
            is_enabled BOOLEAN DEFAULT FALSE
        )",
        &[],
    ).await?;
    
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
        client.execute("INSERT INTO feature_toggles (key, is_enabled) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING", &[&key, &enabled]).await?;
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
    ).await?;
    
    // Seed integrations
    let integrations = vec![
        ("QuickBooks", false),
        ("Xero", false),
        ("Slack", false),
        ("Microsoft Teams", false),
        ("Google Calendar", false),
        ("Outlook Calendar", false),
        ("SurveyMonkey", false),
        ("Typeform", false),
    ];
    for (name, connected) in integrations {
        client.execute("INSERT INTO integrations (name, is_connected) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING", &[&name, &connected]).await?;
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
    ).await?;

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
    ).await?;

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
    ).await?;

    client.execute(
        "CREATE TABLE IF NOT EXISTS inventory_movements (
            id SERIAL PRIMARY KEY,
            product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
            batch_id INTEGER REFERENCES inventory_batches(id),
            movement_type TEXT NOT NULL,
            quantity DOUBLE PRECISION NOT NULL,
            reference_type TEXT,
            reference_id TEXT,
            performed_by_user_id INTEGER,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    ).await?;

    // Indexes
    let _ = client.execute("CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_date ON inventory_movements(product_id, created_at)", &[]).await;

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
    ).await?;

    // 15. Supplier Management
    client.execute(
        "CREATE TABLE IF NOT EXISTS suppliers (
            id SERIAL PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            email TEXT,
            order_email TEXT,
            phone TEXT,
            contact_person TEXT,
            address TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    ).await?;

    // Patch inventory_batches
    let _ = client.execute("ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS order_email TEXT", &[]).await;
    let _ = client.execute("ALTER TABLE inventory_batches ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES suppliers(id)", &[]).await;

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
    ).await?;

    // 17. Business Type & Service Management
    client.execute(
        "CREATE TABLE IF NOT EXISTS business_configurations (
            id SERIAL PRIMARY KEY,
            business_type TEXT NOT NULL CHECK (business_type IN ('product-only', 'service-only', 'both')),
            company_name TEXT,
            industry TEXT,
            tax_rate DOUBLE PRECISION DEFAULT 0.0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by_user_id INTEGER REFERENCES users(id),
            is_active BOOLEAN DEFAULT TRUE
        )",
        &[],
    ).await?;

    // Patch business_configurations
    let _ = client.execute("ALTER TABLE business_configurations ADD COLUMN IF NOT EXISTS tax_rate DOUBLE PRECISION DEFAULT 0.0", &[]).await;

    client.execute(
        "CREATE TABLE IF NOT EXISTS services (
            id SERIAL PRIMARY KEY,
            service_code TEXT UNIQUE,
            name TEXT NOT NULL,
            description TEXT,
            category TEXT,
            unit_price DOUBLE PRECISION DEFAULT 0.0,
            flat_price DOUBLE PRECISION DEFAULT 0.0,
            billing_type TEXT DEFAULT 'hourly' CHECK (billing_type IN ('hourly', 'fixed', 'retainer', 'milestone')),
            estimated_hours DOUBLE PRECISION,
            typical_duration TEXT,
            duration_unit TEXT DEFAULT 'days' CHECK (duration_unit IN ('days', 'hours')),
            sla_terms TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    ).await?;

    // Patch services
    let _ = client.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS service_code TEXT UNIQUE", &[]).await;
    let _ = client.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS flat_price DOUBLE PRECISION DEFAULT 0.0", &[]).await;
    let _ = client.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS typical_duration TEXT", &[]).await;
    let _ = client.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS duration_unit TEXT DEFAULT 'days'", &[]).await;
    let _ = client.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS sla_terms TEXT", &[]).await;

    client.execute(
        "CREATE TABLE IF NOT EXISTS clients (
            id SERIAL PRIMARY KEY,
            company_name TEXT NOT NULL,
            contact_name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            phone TEXT,
            address TEXT,
            industry TEXT,
            status TEXT DEFAULT 'lead' CHECK (status IN ('lead', 'prospect', 'active', 'inactive')),
            payment_terms TEXT,
            credit_limit DOUBLE PRECISION,
            tax_id TEXT,
            notes TEXT,
            annual_contract_value DOUBLE PRECISION DEFAULT 0.0,
            primary_products_purchased TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    ).await?;

    // Patch clients
    let _ = client.execute("ALTER TABLE clients ADD COLUMN IF NOT EXISTS annual_contract_value DOUBLE PRECISION DEFAULT 0.0", &[]).await;
    let _ = client.execute("ALTER TABLE clients ADD COLUMN IF NOT EXISTS primary_products_purchased TEXT", &[]).await;

    // Client Services Junction Table
    client.execute(
        "CREATE TABLE IF NOT EXISTS client_services (
            client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
            service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
            PRIMARY KEY (client_id, service_id)
        )",
        &[],
    ).await?;

    client.execute(
        "CREATE TABLE IF NOT EXISTS time_entries (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER REFERENCES employees(id),
            client_id INTEGER REFERENCES clients(id),
            project_id INTEGER REFERENCES projects(id),
            service_id INTEGER REFERENCES services(id),
            product_id INTEGER REFERENCES products(id),
            description TEXT NOT NULL,
            start_time TIMESTAMP NOT NULL,
            end_time TIMESTAMP,
            duration_hours DOUBLE PRECISION,
            is_billable BOOLEAN DEFAULT TRUE,
            hourly_rate DOUBLE PRECISION,
            status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'invoiced', 'paid')),
            billable_amount DOUBLE PRECISION,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    ).await?;

    client.execute(
        "CREATE TABLE IF NOT EXISTS service_contracts (
            id SERIAL PRIMARY KEY,
            client_id INTEGER REFERENCES clients(id),
            contract_number TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            contract_type TEXT NOT NULL CHECK (contract_type IN ('retainer', 'project', 'recurring', 'milestone')),
            start_date DATE NOT NULL,
            end_date DATE,
            total_value DOUBLE PRECISION,
            billing_frequency TEXT CHECK (billing_frequency IN ('weekly', 'monthly', 'quarterly', 'annually', 'milestone')),
            status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled', 'expired')),
            terms TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    ).await?;

    client.execute(
        "CREATE TABLE IF NOT EXISTS contract_services (
            id SERIAL PRIMARY KEY,
            contract_id INTEGER REFERENCES service_contracts(id) ON DELETE CASCADE,
            service_id INTEGER REFERENCES services(id),
            quantity INTEGER DEFAULT 1,
            unit_price DOUBLE PRECISION,
            total_price DOUBLE PRECISION,
            notes TEXT
        )",
        &[],
    ).await?;

    client.execute(
        "CREATE TABLE IF NOT EXISTS quotes (
            id SERIAL PRIMARY KEY,
            client_id INTEGER REFERENCES clients(id),
            quote_number TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            subtotal DOUBLE PRECISION,
            tax_amount DOUBLE PRECISION,
            total_amount DOUBLE PRECISION,
            valid_until DATE NOT NULL,
            status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    ).await?;

    client.execute(
        "CREATE TABLE IF NOT EXISTS quote_items (
            id SERIAL PRIMARY KEY,
            quote_id INTEGER REFERENCES quotes(id) ON DELETE CASCADE,
            service_id INTEGER REFERENCES services(id),
            description TEXT,
            quantity DOUBLE PRECISION,
            unit_price DOUBLE PRECISION,
            total_price DOUBLE PRECISION,
            sort_order INTEGER
        )",
        &[],
    ).await?;

    // Seed default business configuration if empty
    let count: i64 = client.query_one("SELECT COUNT(*) FROM business_configurations", &[]).await?.get(0);
    if count == 0 {
        client.execute(
            "INSERT INTO business_configurations (business_type, company_name, industry, is_active, tax_rate) VALUES ($1, $2, $3, $4, $5)",
            &[&"both", &"Mainali Services", &"Manufacturing", &true, &0.0],
        ).await?;
    }

    // 18. ERP Standardization (GL & Purchase Orders)
    client.execute(
        "CREATE TABLE IF NOT EXISTS gl_accounts (
            id SERIAL PRIMARY KEY,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            account_type TEXT NOT NULL,
            balance DOUBLE PRECISION DEFAULT 0.0,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    ).await?;

    client.execute(
        "CREATE TABLE IF NOT EXISTS gl_entries (
            id SERIAL PRIMARY KEY,
            transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            description TEXT,
            reference_type TEXT,
            reference_id INTEGER,
            posted_by INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    ).await?;

    client.execute(
        "CREATE TABLE IF NOT EXISTS gl_entry_lines (
            id SERIAL PRIMARY KEY,
            entry_id INTEGER REFERENCES gl_entries(id) ON DELETE CASCADE,
            account_id INTEGER REFERENCES gl_accounts(id),
            debit DOUBLE PRECISION DEFAULT 0.0,
            credit DOUBLE PRECISION DEFAULT 0.0,
            description TEXT
        )",
        &[],
    ).await?;

    client.execute(
        "CREATE TABLE IF NOT EXISTS purchase_orders (
            id SERIAL PRIMARY KEY,
            supplier_id INTEGER REFERENCES suppliers(id),
            status TEXT DEFAULT 'Draft',
            order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expected_delivery_date TIMESTAMP,
            total_amount DOUBLE PRECISION DEFAULT 0.0,
            notes TEXT,
            created_by_user_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    ).await?;

    client.execute(
        "CREATE TABLE IF NOT EXISTS purchase_order_lines (
            id SERIAL PRIMARY KEY,
            po_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
            product_id INTEGER REFERENCES products(id),
            quantity_ordered DOUBLE PRECISION NOT NULL,
            quantity_received DOUBLE PRECISION DEFAULT 0.0,
            unit_price DOUBLE PRECISION DEFAULT 0.0,
            total_price DOUBLE PRECISION DEFAULT 0.0,
            notes TEXT
        )",
        &[],
    ).await?;

    // 19. Sales Orders (Order-to-Cash)
    client.execute(
        "CREATE TABLE IF NOT EXISTS sales_orders (
            id SERIAL PRIMARY KEY,
            client_id INTEGER REFERENCES clients(id),
            project_id INTEGER REFERENCES projects(id),
            status TEXT DEFAULT 'Draft',
            order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expected_shipment_date TIMESTAMP,
            total_amount DOUBLE PRECISION DEFAULT 0.0,
            notes TEXT,
            created_by_user_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    ).await?;

    client.execute(
        "CREATE TABLE IF NOT EXISTS sales_order_lines (
            id SERIAL PRIMARY KEY,
            so_id INTEGER REFERENCES sales_orders(id) ON DELETE CASCADE,
            product_id INTEGER REFERENCES products(id),
            quantity DOUBLE PRECISION NOT NULL,
            unit_price DOUBLE PRECISION DEFAULT 0.0,
            total_price DOUBLE PRECISION DEFAULT 0.0,
            notes TEXT
        )",
        &[],
    ).await?;

    // Patch sales_order_lines for Service Support
    let _ = client.execute("ALTER TABLE sales_order_lines ADD COLUMN IF NOT EXISTS service_id INTEGER REFERENCES services(id)", &[]).await;
    let _ = client.execute("ALTER TABLE sales_order_lines ALTER COLUMN product_id DROP NOT NULL", &[]).await;
    // Drop existing constraint if it exists to avoid error on repeated runs or re-definitions
    let _ = client.execute("ALTER TABLE sales_order_lines DROP CONSTRAINT IF EXISTS chk_so_line_item_type", &[]).await;
    let _ = client.execute("ALTER TABLE sales_order_lines ADD CONSTRAINT chk_so_line_item_type CHECK (
        (product_id IS NOT NULL AND service_id IS NULL) OR
        (product_id IS NULL AND service_id IS NOT NULL)
    )", &[]).await;

    // Patch payments table
    let _ = client.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id)", &[]).await;

    // Patch sales_orders table
    let _ = client.execute("ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id)", &[]).await;

    // Indexes
    let _ = client.execute("CREATE INDEX IF NOT EXISTS idx_sales_orders_client ON sales_orders(client_id)", &[]).await;
    let _ = client.execute("CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status)", &[]).await;
    
    // Indexes
    let _ = client.execute("CREATE INDEX IF NOT EXISTS idx_gl_entries_date ON gl_entries(transaction_date)", &[]).await;
    let _ = client.execute("CREATE INDEX IF NOT EXISTS idx_gl_entry_lines_account ON gl_entry_lines(account_id)", &[]).await;
    let _ = client.execute("CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id)", &[]).await;
    let _ = client.execute("CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status)", &[]).await;

    // Seed Default GL Accounts
    let gl_count: i64 = client.query_one("SELECT COUNT(*) FROM gl_accounts", &[]).await?.get(0);
    if gl_count == 0 {
        let accounts = vec![
            ("1000", "Bank", "Asset"),
            ("1100", "Accounts Receivable", "Asset"),
            ("1200", "Inventory", "Asset"),
            ("2000", "Accounts Payable", "Liability"),
            ("4000", "Sales Revenue", "Revenue"),
            ("5000", "Cost of Goods Sold", "Expense"),
            ("5100", "Operating Expense", "Expense"),
            ("5200", "Salary Expense", "Expense"),
        ];

        for (code, name, type_) in accounts {
            client.execute(
                "INSERT INTO gl_accounts (code, name, account_type, is_active) VALUES ($1, $2, $3, $4)",
                &[&code, &name, &type_, &true],
            ).await?;
        }
    }

    // --- Post-Initialization Patches & Constraints ---
    // Moved here to ensure all tables exist before applying constraints
    println!("DEBUG: Applying post-initialization patches and constraints...");
    
    // 1. Projects Patches
    let _ = client.execute("ALTER TABLE projects ADD COLUMN IF NOT EXISTS manager_id INTEGER REFERENCES employees(id)", &[]).await;
    // Ensure client_id column exists (legacy)
    let _ = client.execute("ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id)", &[]).await;
    // Apply FK constraint for fresh installs (where column exists but no FK)
    // Ignore error if constraint already exists by dropping it first
    let _ = client.execute("ALTER TABLE projects DROP CONSTRAINT IF EXISTS fk_projects_client", &[]).await;
    let _ = client.execute("ALTER TABLE projects ADD CONSTRAINT fk_projects_client FOREIGN KEY (client_id) REFERENCES clients(id)", &[]).await;

    // 2. Payments Patches
    let _ = client.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD'", &[]).await;
    let _ = client.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'", &[]).await;
    let _ = client.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'expense'", &[]).await;
    let _ = client.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP", &[]).await;
    let _ = client.execute("ALTER TABLE payments ALTER COLUMN date DROP NOT NULL", &[]).await;
    
    // Ensure project_id column exists (legacy)
    let _ = client.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id)", &[]).await;
    // Apply FK constraint for fresh installs (where column exists but no FK)
    let _ = client.execute("ALTER TABLE payments DROP CONSTRAINT IF EXISTS fk_payments_project", &[]).await;
    let _ = client.execute("ALTER TABLE payments ADD CONSTRAINT fk_payments_project FOREIGN KEY (project_id) REFERENCES projects(id)", &[]).await;

    Ok(())
}

async fn ensure_database_exists(connection_string: &str) -> Result<(), Error> {
    // Parse the connection string to separate the base URL and the database name.
    // We connect to the default 'postgres' database to check/create the target database.
    
    if let Some(last_slash_idx) = connection_string.rfind('/') {
        let base_url = &connection_string[..last_slash_idx];
        let db_name = &connection_string[last_slash_idx + 1..];

        // Handle potential query parameters (e.g., ?sslmode=disable)
        let (db_name_clean, params) = if let Some(q_idx) = db_name.find('?') {
             (&db_name[..q_idx], &db_name[q_idx..])
        } else {
             (db_name, "")
        };

        // If target is already 'postgres', nothing to do
        if db_name_clean == "postgres" {
            return Ok(());
        }

        // Connect to maintenance DB 'postgres'
        let postgres_conn_str = format!("{}/postgres{}", base_url, params);
        
        // Attempt to connect to the maintenance database
        let (client, connection) = tokio_postgres::connect(&postgres_conn_str, NoTls).await?;
        
        tokio::spawn(async move {
            if let Err(e) = connection.await {
                eprintln!("maintenance connection error: {}", e);
            }
        });
        
        // Check if database exists
        let rows = client.query("SELECT 1 FROM pg_database WHERE datname = $1", &[&db_name_clean]).await?;
        let exists = !rows.is_empty();

        if !exists {
            // CREATE DATABASE cannot take parameters for the DB name, so we must format the string.
            // We wrap the name in double quotes to handle special characters safely.
            let query = format!("CREATE DATABASE \"{}\"", db_name_clean);
            client.execute(&query, &[]).await?;
        }
    }
    Ok(())
}
