-- Supply Chain Upgrade: BOM, Batches, and Movements

-- 1. Bill of Materials (BOM)
CREATE TABLE IF NOT EXISTS bom_headers (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bom_lines (
    id SERIAL PRIMARY KEY,
    bom_id INTEGER REFERENCES bom_headers(id) ON DELETE CASCADE,
    component_product_id INTEGER REFERENCES products(id),
    quantity DOUBLE PRECISION NOT NULL,
    unit TEXT,
    wastage_percentage DOUBLE PRECISION DEFAULT 0.0,
    notes TEXT
);

-- 2. Batch Tracking
CREATE TABLE IF NOT EXISTS inventory_batches (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    batch_number TEXT NOT NULL,
    quantity DOUBLE PRECISION DEFAULT 0.0,
    manufacturing_date TIMESTAMP,
    expiration_date TIMESTAMP,
    received_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    supplier_info TEXT, -- Simplified from supplier_id for now
    status TEXT DEFAULT 'active', -- 'active', 'quarantined', 'expired', 'depleted'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_batch_per_product UNIQUE (product_id, batch_number)
);

-- 3. Inventory Movements (For Velocity/History)
CREATE TABLE IF NOT EXISTS inventory_movements (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    batch_id INTEGER REFERENCES inventory_batches(id),
    movement_type TEXT NOT NULL, -- 'purchase', 'sale', 'production_in', 'production_out', 'adjustment', 'transfer'
    quantity DOUBLE PRECISION NOT NULL, -- Positive for add, negative for reduce
    reference_type TEXT, -- 'invoice', 'order', 'manual'
    reference_id TEXT,
    performed_by_user_id INTEGER, -- Optional link to user
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for velocity reporting
CREATE INDEX idx_inventory_movements_product_date ON inventory_movements(product_id, created_at);
