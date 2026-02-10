-- Migration: Support Services in Sales Order Lines
-- Created: 2026-02-08

-- 1. Add service_id column
ALTER TABLE sales_order_lines ADD COLUMN IF NOT EXISTS service_id INTEGER REFERENCES services(id);

-- 2. Ensure product_id is nullable (it should be by default, but just in case)
ALTER TABLE sales_order_lines ALTER COLUMN product_id DROP NOT NULL;

-- 3. Add constraint to ensure either product or service is selected
-- We drop it first if it exists to avoid errors on re-run
ALTER TABLE sales_order_lines DROP CONSTRAINT IF EXISTS chk_so_line_item_type;
ALTER TABLE sales_order_lines ADD CONSTRAINT chk_so_line_item_type CHECK (
    (product_id IS NOT NULL AND service_id IS NULL) OR
    (product_id IS NULL AND service_id IS NOT NULL)
);
