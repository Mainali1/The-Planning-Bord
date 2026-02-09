-- Migration to support Project Profitability Reporting
-- 1. Link Sales Orders to Projects (Revenue source)
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id);

-- 2. Link Payments/Expenses to Projects (Cost source)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id);

-- 3. Add Hourly Cost to Employees (Labor Cost calculation)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS hourly_cost DOUBLE PRECISION DEFAULT 0.0;

-- 4. Create Index for performance
CREATE INDEX IF NOT EXISTS idx_sales_orders_project_id ON sales_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_payments_project_id ON payments(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project_id ON time_entries(project_id);
