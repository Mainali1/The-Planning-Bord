-- Seed Standard Chart of Accounts
INSERT INTO gl_accounts (code, name, account_type, balance) VALUES
('1000', 'Cash / Bank', 'Asset', 0.0),
('1100', 'Accounts Receivable', 'Asset', 0.0),
('1200', 'Inventory', 'Asset', 0.0),
('1500', 'Fixed Assets', 'Asset', 0.0),
('2000', 'Accounts Payable', 'Liability', 0.0),
('2100', 'Sales Tax Payable', 'Liability', 0.0),
('3000', 'Owner Equity', 'Equity', 0.0),
('4000', 'Sales Revenue', 'Revenue', 0.0),
('5000', 'Cost of Goods Sold', 'Expense', 0.0),
('5100', 'Operating Expenses', 'Expense', 0.0),
('5200', 'Salaries & Wages', 'Expense', 0.0)
ON CONFLICT (code) DO NOTHING;
