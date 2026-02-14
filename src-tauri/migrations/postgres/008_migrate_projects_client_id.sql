-- Migration: Migrate projects table to use client_id instead of client_name
-- Created: 2026-02-08

-- 1. Add client_id column as Foreign Key
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id);

-- 2. Try to migrate existing data (best effort match by name)
-- This assumes client_name in projects matches company_name in clients table exactly
UPDATE projects p
SET client_id = c.id
FROM clients c
WHERE p.client_name = c.company_name;

-- 3. Drop the old client_name column
-- We do this after migration to avoid data loss if migration fails, 
-- but in this script we'll just drop it to complete the schema change.
ALTER TABLE projects DROP COLUMN IF EXISTS client_name;
