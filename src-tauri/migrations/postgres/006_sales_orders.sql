-- Ensure Clients table exists (CRM Base)
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    company_name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    industry TEXT,
    status TEXT DEFAULT 'Active', -- 'Active', 'Inactive', 'Lead'
    payment_terms TEXT, -- 'Net30', 'Immediate'
    credit_limit DOUBLE PRECISION DEFAULT 0.0,
    tax_id TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add cost_price to products for COGS calculation
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price DOUBLE PRECISION DEFAULT 0.0;

-- Sales Orders (Order-to-Cash)
CREATE TABLE IF NOT EXISTS sales_orders (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    status TEXT DEFAULT 'Draft', -- 'Draft', 'Confirmed', 'Shipped', 'Invoiced', 'Cancelled'
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expected_shipment_date TIMESTAMP,
    total_amount DOUBLE PRECISION DEFAULT 0.0,
    notes TEXT,
    created_by_user_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales_order_lines (
    id SERIAL PRIMARY KEY,
    so_id INTEGER REFERENCES sales_orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    quantity DOUBLE PRECISION NOT NULL,
    unit_price DOUBLE PRECISION DEFAULT 0.0, -- Selling Price at time of order
    total_price DOUBLE PRECISION DEFAULT 0.0,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_sales_orders_client ON sales_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status);
