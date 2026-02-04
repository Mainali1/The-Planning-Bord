-- Business Type Configuration System
-- This migration adds support for business type selection and configuration

-- Business Configuration Table - stores the main business type selection
CREATE TABLE IF NOT EXISTS business_configurations (
    id SERIAL PRIMARY KEY,
    business_type TEXT NOT NULL CHECK (business_type IN ('product-only', 'service-only', 'both')),
    company_name TEXT,
    industry TEXT,
    tax_rate DOUBLE PRECISION DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE
);

-- Service Catalog - for service-based businesses
CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    unit_price DOUBLE PRECISION DEFAULT 0.0,
    billing_type TEXT DEFAULT 'hourly' CHECK (billing_type IN ('hourly', 'fixed', 'retainer', 'milestone')),
    estimated_hours DOUBLE PRECISION,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Client Management - for service-based businesses
CREATE TABLE IF NOT EXISTS clients (
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
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced Time Tracking - supports both product and service businesses
CREATE TABLE IF NOT EXISTS time_entries (
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
);

-- Service Contracts - for ongoing service relationships
CREATE TABLE IF NOT EXISTS service_contracts (
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
);

-- Contract Services - links services to contracts
CREATE TABLE IF NOT EXISTS contract_services (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER REFERENCES service_contracts(id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES services(id),
    quantity INTEGER DEFAULT 1,
    unit_price DOUBLE PRECISION,
    total_price DOUBLE PRECISION,
    notes TEXT
);

-- Quotes/Proposals - for service sales process
CREATE TABLE IF NOT EXISTS quotes (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    quote_number TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    subtotal DOUBLE PRECISION,
    tax_amount DOUBLE PRECISION,
    total_amount DOUBLE PRECISION,
    valid_until DATE,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quote Items - line items for quotes
CREATE TABLE IF NOT EXISTS quote_items (
    id SERIAL PRIMARY KEY,
    quote_id INTEGER REFERENCES quotes(id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES services(id),
    description TEXT NOT NULL,
    quantity DOUBLE PRECISION DEFAULT 1,
    unit_price DOUBLE PRECISION,
    total_price DOUBLE PRECISION,
    sort_order INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_configurations_business_type ON business_configurations(business_type);
CREATE INDEX IF NOT EXISTS idx_business_configurations_is_active ON business_configurations(is_active);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_billing_type ON services(billing_type);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_time_entries_employee_id ON time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_client_id ON time_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_status ON time_entries(status);
CREATE INDEX IF NOT EXISTS idx_time_entries_is_billable ON time_entries(is_billable);
CREATE INDEX IF NOT EXISTS idx_service_contracts_client_id ON service_contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_service_contracts_status ON service_contracts(status);
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);

-- Insert default business configuration for existing installations
INSERT INTO business_configurations (business_type, company_name, industry, is_active, tax_rate) 
VALUES ('product-only', 'Default Company', 'Manufacturing', TRUE, 0.0) 
ON CONFLICT DO NOTHING;