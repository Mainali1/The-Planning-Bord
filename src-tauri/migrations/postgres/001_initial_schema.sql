-- Initial Schema for PostgreSQL

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    sku TEXT UNIQUE,
    current_quantity INTEGER DEFAULT 0,
    minimum_quantity INTEGER DEFAULT 0,
    reorder_quantity INTEGER DEFAULT 0,
    unit_price DOUBLE PRECISION DEFAULT 0.0,
    supplier_name TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    employee_id TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT,
    department TEXT,
    position TEXT,
    salary DOUBLE PRECISION,
    status TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    payment_type TEXT NOT NULL, -- 'income' or 'expense'
    amount DOUBLE PRECISION NOT NULL,
    currency TEXT DEFAULT 'USD',
    description TEXT,
    status TEXT DEFAULT 'pending',
    payment_method TEXT,
    payment_date TIMESTAMP,
    due_date TIMESTAMP,
    reference_number TEXT,
    employee_id INTEGER REFERENCES employees(id),
    supplier_name TEXT
);

CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMP,
    status TEXT DEFAULT 'todo',
    priority TEXT DEFAULT 'medium',
    assigned_date TIMESTAMP,
    completed_date TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    check_in TIMESTAMP NOT NULL,
    check_out TIMESTAMP,
    status TEXT, -- 'present', 'late', etc.
    notes TEXT,
    location TEXT
);

CREATE TABLE IF NOT EXISTS complaints (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'pending',
    admin_notes TEXT,
    resolution TEXT,
    resolved_by TEXT,
    resolved_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tools (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type_name TEXT,
    status TEXT DEFAULT 'available',
    assigned_to_employee_id INTEGER REFERENCES employees(id),
    purchase_date TIMESTAMP,
    condition TEXT
);

CREATE TABLE IF NOT EXISTS tool_assignments (
    id SERIAL PRIMARY KEY,
    tool_id INTEGER REFERENCES tools(id),
    employee_id INTEGER REFERENCES employees(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    returned_at TIMESTAMP,
    condition_on_assignment TEXT,
    condition_on_return TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    is_custom BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS feature_toggles (
    key TEXT PRIMARY KEY,
    is_enabled BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS setup_config (
    id INTEGER PRIMARY KEY, -- Singleton row, usually 1
    company_name TEXT,
    license_key TEXT,
    company_email TEXT,
    setup_completed BOOLEAN DEFAULT FALSE,
    setup_completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER, -- Nullable if system action or unknown user
    action TEXT NOT NULL,
    entity TEXT,
    entity_id INTEGER,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dashboard_configs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    layout_json TEXT, -- JSON string
    is_default BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    status TEXT DEFAULT 'planning',
    manager_id INTEGER REFERENCES employees(id)
);

CREATE TABLE IF NOT EXISTS project_tasks (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    assigned_to INTEGER REFERENCES employees(id), -- Changed to INTEGER to match struct
    status TEXT DEFAULT 'todo',
    priority TEXT DEFAULT 'medium',
    start_date TIMESTAMP,
    due_date TIMESTAMP,
    parent_task_id INTEGER REFERENCES project_tasks(id),
    dependencies_json TEXT -- JSON array of dependency IDs
);

CREATE TABLE IF NOT EXISTS project_assignments (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    role TEXT, -- 'manager', 'member', etc.
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT, -- 'asset', 'liability', 'equity', 'revenue', 'expense'
    currency TEXT DEFAULT 'USD',
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    customer_name TEXT,
    customer_email TEXT,
    invoice_date TIMESTAMP,
    due_date TIMESTAMP,
    total_amount DOUBLE PRECISION,
    tax_rate DOUBLE PRECISION,
    tax_amount DOUBLE PRECISION,
    status TEXT DEFAULT 'draft',
    currency TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS integrations (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL, -- 'quickbooks', 'xero', 'salesforce'
    is_connected BOOLEAN DEFAULT FALSE,
    api_key TEXT,
    config_json TEXT,
    connected_at TIMESTAMP
);
