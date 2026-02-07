-- 1. General Ledger (The Heart of ERP)
CREATE TABLE IF NOT EXISTS gl_accounts (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL, -- e.g., '1000' for Cash, '4000' for Sales
    name TEXT NOT NULL,
    account_type TEXT NOT NULL, -- 'Asset', 'Liability', 'Equity', 'Revenue', 'Expense'
    balance DOUBLE PRECISION DEFAULT 0.0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gl_entries (
    id SERIAL PRIMARY KEY,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    reference_type TEXT, -- 'Invoice', 'Payment', 'Bill', 'Manual'
    reference_id INTEGER,
    posted_by INTEGER, -- User ID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gl_entry_lines (
    id SERIAL PRIMARY KEY,
    entry_id INTEGER REFERENCES gl_entries(id) ON DELETE CASCADE,
    account_id INTEGER REFERENCES gl_accounts(id),
    debit DOUBLE PRECISION DEFAULT 0.0,
    credit DOUBLE PRECISION DEFAULT 0.0,
    description TEXT
    -- Constraint: Sum of debits must equal sum of credits per entry_id (enforced by app logic or trigger)
);

-- 2. Procurement (Purchase Orders)
-- Note: 'suppliers' table is assumed to exist from previous migrations/init
CREATE TABLE IF NOT EXISTS purchase_orders (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER REFERENCES suppliers(id),
    status TEXT DEFAULT 'Draft', -- 'Draft', 'Sent', 'Partial', 'Received', 'Closed', 'Cancelled'
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expected_delivery_date TIMESTAMP,
    total_amount DOUBLE PRECISION DEFAULT 0.0,
    notes TEXT,
    created_by_user_id INTEGER, -- Link to user
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_order_lines (
    id SERIAL PRIMARY KEY,
    po_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    quantity_ordered DOUBLE PRECISION NOT NULL,
    quantity_received DOUBLE PRECISION DEFAULT 0.0,
    unit_price DOUBLE PRECISION DEFAULT 0.0,
    total_price DOUBLE PRECISION DEFAULT 0.0,
    notes TEXT
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_gl_entries_date ON gl_entries(transaction_date);
CREATE INDEX IF NOT EXISTS idx_gl_entry_lines_account ON gl_entry_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
