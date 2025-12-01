#!/bin/bash
# Demo Data Seed Script for Planning Bord

echo "🌱 Starting database seeding..."

# Check if PostgreSQL is running
if ! pg_isready -q; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL first."
    exit 1
fi

# Create a simple SQL file with demo data
cat > seed_data.sql << 'EOF'
-- Demo data for Planning Bord
TRUNCATE TABLE users, businesses, employees, products, payments CASCADE;

-- Insert demo users
INSERT INTO users (email, password, first_name, last_name, is_active) VALUES
('admin@demo.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'User', true),
('demo@demo.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Demo', 'User', true);

-- Insert demo business
INSERT INTO businesses (user_id, name, type, address, phone, email) VALUES
(1, 'Demo Business', 'retail', '123 Demo Street, Demo City, DC 12345', '555-1234', 'demo@business.com');

-- Insert demo employees
INSERT INTO employees (business_id, first_name, last_name, email, phone, position, salary, hire_date) VALUES
(1, 'John', 'Doe', 'john@demobusiness.com', '555-1234', 'Manager', 50000, '2023-01-15'),
(1, 'Jane', 'Smith', 'jane@demobusiness.com', '555-5678', 'Sales Associate', 35000, '2023-03-20');

-- Insert demo products
INSERT INTO products (business_id, name, description, price, stock_quantity, category) VALUES
(1, 'Demo Product 1', 'High-quality demo product', 29.99, 100, 'Electronics'),
(1, 'Demo Product 2', 'Premium demo item', 49.99, 50, 'Accessories'),
(1, 'Demo Product 3', 'Basic demo product', 19.99, 200, 'General');

-- Insert demo payments
INSERT INTO payments (business_id, amount, payment_date, payment_method, status, description) VALUES
(1, 1500.00, '2024-01-15', 'credit_card', 'completed', 'Monthly subscription'),
(1, 750.00, '2024-01-20', 'bank_transfer', 'completed', 'Product sales');

-- Reset sequences
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('businesses_id_seq', (SELECT MAX(id) FROM businesses));
SELECT setval('employees_id_seq', (SELECT MAX(id) FROM employees));
SELECT setval('products_id_seq', (SELECT MAX(id) FROM products));
SELECT setval('payments_id_seq', (SELECT MAX(id) FROM payments));
EOF

echo "✅ Demo data SQL file created successfully!"
echo ""
echo "To apply the demo data to your database:"
echo "1. Make sure your database exists: createdb planning_bord"
echo "2. Run: psql -d planning_bord -f seed_data.sql"
echo ""
echo "Demo login credentials:"
echo "   Admin: admin@demo.com / password"
echo "   Demo: demo@demo.com / password"
echo ""
echo "🎉 Demo data seeding complete!"