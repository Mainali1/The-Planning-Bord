-- Item Categorization
-- 1. Create ENUM type
DO $$ BEGIN
    CREATE TYPE item_type_enum AS ENUM ('goods', 'ingredients', 'assets');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add column to products table with default 'goods'
ALTER TABLE products ADD COLUMN IF NOT EXISTS item_type item_type_enum DEFAULT 'goods';

-- 3. Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_products_item_type ON products(item_type);
