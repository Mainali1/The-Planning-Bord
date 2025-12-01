-- Database Performance Optimization Script
-- This script adds indexes and optimizations for the Planning Bord application

-- ====================
-- INDEX OPTIMIZATIONS
-- ====================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Products table indexes (frequently queried for inventory)
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_current_quantity ON products(current_quantity);
CREATE INDEX IF NOT EXISTS idx_products_min_quantity ON products(min_quantity);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);

-- Composite index for inventory queries (category + quantity)
CREATE INDEX IF NOT EXISTS idx_products_category_quantity ON products(category_id, current_quantity);

-- Inventory logs table indexes (high write volume, needs careful indexing)
CREATE INDEX IF NOT EXISTS idx_inventory_logs_product_id ON inventory_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_change_type ON inventory_logs(change_type);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_timestamp ON inventory_logs(timestamp);

-- Composite index for product-time queries
CREATE INDEX IF NOT EXISTS idx_inventory_logs_product_timestamp ON inventory_logs(product_id, timestamp DESC);

-- Auto restock events indexes
CREATE INDEX IF NOT EXISTS idx_auto_restock_events_product_id ON auto_restock_events(product_id);
CREATE INDEX IF NOT EXISTS idx_auto_restock_events_email_status ON auto_restock_events(email_status);

-- Employees table indexes
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_date_joined ON employees(date_joined);

-- Attendance table indexes (frequently queried by date)
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);

-- Composite index for employee-date queries
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date);

-- Employee tasks indexes
CREATE INDEX IF NOT EXISTS idx_employee_tasks_employee_id ON employee_tasks(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_tasks_status ON employee_tasks(status);
CREATE INDEX IF NOT EXISTS idx_employee_tasks_due_date ON employee_tasks(due_date);

-- Composite index for employee-status queries
CREATE INDEX IF NOT EXISTS idx_employee_tasks_employee_status ON employee_tasks(employee_id, status);

-- Payments table indexes
CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(type);
CREATE INDEX IF NOT EXISTS idx_payments_employee_id ON payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_payments_supplier_id ON payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);

-- Salaries table indexes
CREATE INDEX IF NOT EXISTS idx_salaries_employee_id ON salaries(employee_id);
CREATE INDEX IF NOT EXISTS idx_salaries_payment_cycle ON salaries(payment_cycle);
CREATE INDEX IF NOT EXISTS idx_salaries_last_paid_date ON salaries(last_paid_date);

-- Categories and suppliers indexes
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_email ON suppliers(email);

-- ====================
-- QUERY PERFORMANCE ANALYSIS
-- ====================

-- Enable query performance monitoring
-- This should be run by a database administrator

-- PostgreSQL specific: Enable query statistics
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- MySQL specific: Enable slow query log
-- SET GLOBAL slow_query_log = 'ON';
-- SET GLOBAL long_query_time = 2; -- Log queries taking more than 2 seconds

-- ====================
-- SLOW QUERY ANALYSIS QUERIES
-- ====================

-- PostgreSQL: Find slow queries (requires pg_stat_statements extension)
/*
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
WHERE mean_time > 100  -- Queries taking more than 100ms on average
ORDER BY mean_time DESC
LIMIT 20;
*/

-- MySQL: Analyze slow queries (requires slow query log enabled)
/*
SELECT 
    sql_text,
    execution_count,
    avg_timer_wait/1000000000 as avg_seconds,
    max_timer_wait/1000000000 as max_seconds,
    sum_lock_time/1000000000 as total_lock_seconds
FROM performance_schema.events_statements_summary_by_digest
WHERE avg_timer_wait > 200000000000  -- Queries taking more than 200ms
ORDER BY avg_timer_wait DESC
LIMIT 20;
*/

-- ====================
-- TABLE ANALYSIS AND OPTIMIZATION
-- ====================

-- Analyze table statistics (PostgreSQL)
-- ANALYZE users, products, inventory_logs, employees, attendance, payments;

-- Optimize tables (MySQL)
-- OPTIMIZE TABLE users, products, inventory_logs, employees, attendance, payments;

-- ====================
-- PARTITIONING STRATEGIES (for large tables)
-- ====================

-- Example: Partition inventory_logs by month (PostgreSQL)
/*
CREATE TABLE inventory_logs_partitioned (
    log_id SERIAL,
    product_id INTEGER NOT NULL,
    change_type VARCHAR(20) NOT NULL,
    quantity_changed INTEGER NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    notes TEXT,
    PRIMARY KEY (log_id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Create monthly partitions
CREATE TABLE inventory_logs_2024_01 PARTITION OF inventory_logs_partitioned
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE inventory_logs_2024_02 PARTITION OF inventory_logs_partitioned
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
*/

-- ====================
-- QUERY OPTIMIZATION EXAMPLES
-- ====================

-- Before optimization: Full table scan on inventory_logs
-- SELECT * FROM inventory_logs WHERE product_id = 123 AND timestamp > '2024-01-01';

-- After optimization: Uses composite index idx_inventory_logs_product_timestamp
-- SELECT * FROM inventory_logs WHERE product_id = 123 AND timestamp > '2024-01-01';

-- Before optimization: No index on current_quantity
-- SELECT * FROM products WHERE current_quantity < min_quantity;

-- After optimization: Uses index idx_products_current_quantity and idx_products_min_quantity
-- SELECT * FROM products WHERE current_quantity < min_quantity;

-- ====================
-- PERFORMANCE MONITORING QUERIES
-- ====================

-- Monitor index usage
-- PostgreSQL:
/*
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan
FROM pg_stat_user_indexes 
WHERE idx_scan = 0;
*/

-- MySQL:
/*
SELECT 
    OBJECT_SCHEMA,
    OBJECT_NAME,
    INDEX_NAME,
    COUNT_FETCH
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE COUNT_FETCH = 0;
*/

-- ====================
-- CLEANUP UNUSED INDEXES
-- ====================

-- Drop unused indexes (run after monitoring for several weeks)
-- DROP INDEX IF EXISTS idx_unused_index_name;

-- ====================
-- PERFORMANCE RECOMMENDATIONS
-- ====================

-- 1. Regularly run ANALYZE/OPTIMIZE on frequently updated tables
-- 2. Monitor slow query logs weekly
-- 3. Review and adjust indexes based on actual query patterns
-- 4. Consider partitioning for tables with >1M rows
-- 5. Use connection pooling for high-traffic applications
-- 6. Implement read replicas for reporting queries
-- 7. Cache frequently accessed data in Redis

-- ====================
-- EXECUTION INSTRUCTIONS
-- ====================

-- 1. Review all indexes before creating them
-- 2. Test on a staging environment first
-- 3. Monitor performance impact after deployment
-- 4. Adjust based on your specific query patterns
-- 5. Consider your database size and growth projections