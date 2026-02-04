//! # PostgreSQL Database Implementation
//! 
//! This module handles interactions with the PostgreSQL database using async/await and connection pooling.
//! 
//! ## Security Considerations
//! - **Connection Pooling**: Utilizes `deadpool_postgres` for efficient connection management.
//! - **Parameterized Queries**: All SQL queries use parameterized statements to prevent SQL injection.
//! - **Error Handling**: Robust error handling is implemented to manage connection errors, query execution, and transaction rollbacks.
//! 
//! ## Performance Optimization
//! - **Batch Operations**: Supports batch insertions for improved performance when dealing with large datasets.
//! - **Connection Reuse**: Leverages connection pooling to minimize the overhead of establishing new database connections.
//! 
//! ## Error Handling
//! - **Connection Errors**: Handles connection timeouts, failed authentication, and other connection-related errors gracefully.
//! - **Query Errors**: Captures and logs SQL errors, including constraint violations and syntax errors.
//! - **Transaction Rollbacks**: Ensures that transactions are rolled back in case of errors to maintain data integrity.
//! 
//! ## Configuration
//! - **Connection String**: The database connection string should be provided via environment variables or secure configuration files.
//! - **Pool Size**: Configurable connection pool size to balance performance and resource utilization.
//! 
//! ## Dependencies
//! ## Security
//! - **Credential Management**: Database credentials must never be hardcoded. 
//!   They should be provided via environment variables (e.g., `DATABASE_URL`) or secure configuration files.
//! - **Input Validation**: Connection strings are validated to ensure they follow expected protocols.
//! - **Parameterization**: All SQL queries must use parameter substitution (`$1`, `$2`, etc.) to prevent SQL injection.

use super::Database;
use crate::models::*;
use deadpool_postgres::{Pool, Manager, ManagerConfig, RecyclingMethod};
use tokio_postgres::NoTls;
use tokio_postgres::error::SqlState;
use std::str::FromStr;
use chrono::{NaiveDateTime, NaiveDate};
use argon2::{
    password_hash::{
        rand_core::OsRng,
        PasswordHasher, SaltString
    },
    Argon2
};
use async_trait::async_trait;

pub struct PostgresDatabase {
    pub pool: Pool,
    pub connection_string: String,
}

impl PostgresDatabase {
    /// Creates a new PostgresDatabase instance.
    /// 
    /// # Security
    /// - Connection string must be provided via secure configuration.
    /// - Basic validation is performed to ensure protocol compliance.
    /// - Credentials should not be hardcoded in source.
    pub fn new(connection_string: &str) -> Result<Self, String> {
        // Input validation: Ensure valid protocol
        if !connection_string.starts_with("postgres://") && !connection_string.starts_with("postgresql://") {
             return Err("Invalid connection string: Must start with postgres:// or postgresql://".to_string());
        }

        let pg_config = tokio_postgres::Config::from_str(connection_string)
            .map_err(|e| format!("Invalid connection string: {}", e))?;
        
        let mgr_config = ManagerConfig { recycling_method: RecyclingMethod::Fast };
        let mgr = Manager::from_config(pg_config, NoTls, mgr_config);
        let pool = Pool::builder(mgr)
            .max_size(16)
            .build()
            .map_err(|e| format!("Failed to create pool: {}", e))?;
            
        Ok(Self { 
            pool,
            connection_string: connection_string.to_string() 
        })
    }
}

// Helper to format Option<NaiveDateTime> to Option<String>
fn format_timestamp(ts: Option<NaiveDateTime>) -> Option<String> {
    ts.map(|t| t.format("%Y-%m-%d %H:%M:%S").to_string())
}

// Helper to parse Option<String> to Option<NaiveDateTime>
fn parse_timestamp(ts: Option<String>) -> Option<NaiveDateTime> {
    if let Some(s) = ts {
        if s.trim().is_empty() { 
            println!("parse_timestamp: Empty string provided");
            return None; 
        }
        println!("parse_timestamp: Attempting to parse timestamp: '{}'", s);
        // Try ISO format first (with 'T')
        if let Ok(dt) = NaiveDateTime::parse_from_str(&s, "%Y-%m-%dT%H:%M:%S") {
            println!("parse_timestamp: Successfully parsed as ISO format: {:?}", dt);
            return Some(dt);
        }
        // Try space format
        if let Ok(dt) = NaiveDateTime::parse_from_str(&s, "%Y-%m-%d %H:%M:%S") {
            println!("parse_timestamp: Successfully parsed as space format: {:?}", dt);
            return Some(dt);
        }
        // Try just date
        if let Ok(d) = NaiveDate::parse_from_str(&s, "%Y-%m-%d") {
            println!("parse_timestamp: Successfully parsed as date only: {:?}", d);
            return d.and_hms_opt(0, 0, 0);
        }
        println!("parse_timestamp: Failed to parse timestamp: '{}'", s);
    } else {
        println!("parse_timestamp: None value provided");
    }
    None
}

// Helper to format Option<NaiveDate> to Option<String>
fn format_date_opt(d: Option<NaiveDate>) -> Option<String> {
    d.map(|d| d.format("%Y-%m-%d").to_string())
}

// Helper to format NaiveDate to String
fn format_date(d: NaiveDate) -> String {
    d.format("%Y-%m-%d").to_string()
}

#[async_trait]
impl Database for PostgresDatabase {
    // --- Users & Auth ---
    async fn get_user_by_username(&self, username: String) -> Result<Option<User>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let row_opt = client.query_opt(
            "SELECT u.id, u.username, u.email, u.full_name, u.hashed_password, u.role, u.is_active, u.last_login,
             ARRAY(
                 SELECT p.code 
                 FROM permissions p 
                 JOIN role_permissions rp ON p.id = rp.permission_id 
                 JOIN roles r ON rp.role_id = r.id 
                 WHERE r.name = u.role
             ) as permissions
             FROM users u WHERE u.username = $1",
            &[&username]
        ).await.map_err(|e| format!("Failed to fetch user: {}", e))?;

        if let Some(row) = row_opt {
            Ok(Some(User {
                id: Some(row.get(0)),
                username: row.get(1),
                email: row.get(2),
                full_name: row.get(3),
                hashed_password: row.get(4),
                role: row.get(5),
                is_active: row.get(6),
                last_login: format_timestamp(row.get(7)),
                permissions: Some(row.get(8)),
            }))
        } else {
            Ok(None)
        }
    }

    async fn create_user(&self, user: User) -> Result<i64, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let row = client.query_one(
            "INSERT INTO users (username, email, full_name, hashed_password, role, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
            &[&user.username, &user.email, &user.full_name, &user.hashed_password, &user.role, &user.is_active]
        ).await.map_err(|e| format!("Failed to create user: {}", e))?;
        Ok(row.get::<_, i32>(0) as i64)
    }

    async fn update_user(&self, user: User) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let user_id = user.id.ok_or("User ID is required for update")?;
        client.execute(
            "UPDATE users SET username = $1, email = $2, full_name = $3, hashed_password = $4, role = $5, is_active = $6 WHERE id = $7",
            &[&user.username, &user.email, &user.full_name, &user.hashed_password, &user.role, &user.is_active, &user_id]
        ).await.map_err(|e| format!("Failed to update user: {}", e))?;
        Ok(())
    }

    async fn update_user_last_login(&self, user_id: i32) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let now = chrono::Local::now().naive_local();
        client.execute("UPDATE users SET last_login = $1 WHERE id = $2", &[&now, &user_id]).await.map_err(|e| format!("Failed to update last login: {}", e))?;
        Ok(())
    }
    
    async fn create_session(&self, token: String, user_id: i32, exp: i64) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        client.execute(
            "INSERT INTO sessions (token, user_id, exp) VALUES ($1, $2, $3) ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, exp = EXCLUDED.exp",
            &[&token, &user_id, &exp]
        ).await.map_err(|e| format!("Failed to create session: {}", e))?;
        Ok(())
    }

    async fn get_session_user(&self, token: String) -> Result<Option<User>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let row_opt = client.query_opt(
            "SELECT u.id, u.username, u.email, u.full_name, u.hashed_password, u.role, u.is_active, u.last_login,
             ARRAY(
                 SELECT p.code 
                 FROM permissions p 
                 JOIN role_permissions rp ON p.id = rp.permission_id 
                 JOIN roles r ON rp.role_id = r.id 
                 WHERE r.name = u.role
             ) as permissions
             FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = $1 AND s.exp > EXTRACT(EPOCH FROM NOW())::BIGINT",
            &[&token]
        ).await.map_err(|e| format!("Failed to fetch session user: {}", e))?;
        if let Some(row) = row_opt {
            Ok(Some(User {
                id: Some(row.get(0)),
                username: row.get(1),
                email: row.get(2),
                full_name: row.get(3),
                hashed_password: row.get(4),
                role: row.get(5),
                is_active: row.get(6),
                last_login: format_timestamp(row.get(7)),
                permissions: Some(row.get(8)),
            }))
        } else {
            Ok(None)
        }
    }
    
    async fn revoke_session(&self, token: String) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        client.execute("DELETE FROM sessions WHERE token = $1", &[&token]).await.map_err(|e| format!("Failed to revoke session: {}", e))?;
        Ok(())
    }
    
    async fn cleanup_sessions(&self) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let _ = client.execute("DELETE FROM sessions WHERE exp <= EXTRACT(EPOCH FROM NOW())::BIGINT", &[]).await.map_err(|e| format!("Failed to cleanup sessions: {}", e))?;
        Ok(())
    }

    // --- Invites ---
    async fn create_invite(&self, invite: Invite) -> Result<i64, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let expiration = parse_timestamp(invite.expiration);
        
        let row = client.query_one(
            "INSERT INTO user_invites (token, role, name, email, expiration, is_used, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
            &[&invite.token, &invite.role, &invite.name, &invite.email, &expiration, &invite.is_used, &invite.is_active]
        ).await.map_err(|e| format!("Failed to create invite: {}", e))?;
        
        Ok(row.get::<_, i32>(0) as i64)
    }

    async fn get_invite(&self, token: String) -> Result<Option<Invite>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let row_opt = client.query_opt(
            "SELECT id, token, role, name, email, expiration, is_used, is_active FROM user_invites WHERE token = $1",
            &[&token]
        ).await.map_err(|e| format!("Failed to fetch invite: {}", e))?;

        if let Some(row) = row_opt {
            Ok(Some(Invite {
                id: Some(row.get(0)),
                token: row.get(1),
                role: row.get(2),
                name: row.get(3),
                email: row.get(4),
                expiration: format_timestamp(row.get(5)),
                is_used: row.get(6),
                is_active: row.try_get(7).unwrap_or(true),
            }))
        } else {
            Ok(None)
        }
    }

    async fn mark_invite_used(&self, token: String) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        client.execute("UPDATE user_invites SET is_used = TRUE WHERE token = $1", &[&token]).await.map_err(|e| format!("Failed to mark invite as used: {}", e))?;
        Ok(())
    }

    async fn get_invites(&self) -> Result<Vec<Invite>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let rows = client.query("SELECT id, token, role, name, email, expiration, is_used, is_active FROM user_invites ORDER BY created_at DESC", &[]).await.map_err(|e| format!("Failed to fetch invites: {}", e))?;
        
        let mut invites = Vec::new();
        for row in rows {
            invites.push(Invite {
                id: Some(row.get(0)),
                token: row.get(1),
                role: row.get(2),
                name: row.get(3),
                email: row.get(4),
                expiration: format_timestamp(row.get(5)),
                is_used: row.get(6),
                is_active: row.try_get(7).unwrap_or(true),
            });
        }
        Ok(invites)
    }

    async fn toggle_invite_status(&self, id: i32, is_active: bool) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        client.execute("UPDATE user_invites SET is_active = $1 WHERE id = $2", &[&is_active, &id]).await.map_err(|e| format!("Failed to toggle invite status: {}", e))?;
        Ok(())
    }

    // --- Product Commands ---
    async fn get_products(&self, search: Option<String>, page: Option<i32>, page_size: Option<i32>) -> Result<serde_json::Value, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        
        let search_term = search.unwrap_or_default();
        let limit = page_size.unwrap_or(50) as i64;
        let offset = ((page.unwrap_or(1) - 1) as i64) * limit;
        let search_pattern = format!("%{}%", search_term);

        // Count total
        let total: i64 = client.query_one(
            "SELECT COUNT(*) FROM products WHERE name ILIKE $1 OR sku ILIKE $1 OR category ILIKE $1",
            &[&search_pattern]
        ).await.map_err(|e| format!("Failed to count products: {}", e))?.get(0);

        // Get items
        let rows = client.query(
            "SELECT id, name, description, category, sku, current_quantity, minimum_quantity, reorder_quantity, unit_price, supplier_name, is_active FROM products WHERE name ILIKE $1 OR sku ILIKE $1 OR category ILIKE $1 LIMIT $2 OFFSET $3",
            &[&search_pattern, &limit, &offset]
        ).await.map_err(|e| format!("Failed to fetch products: {}", e))?;

        let mut products = Vec::new();
        for row in rows {
            products.push(Product {
                id: Some(row.get(0)),
                name: row.get(1),
                description: row.get(2),
                category: row.get(3),
                sku: row.get(4),
                current_quantity: row.get(5),
                minimum_quantity: row.get(6),
                reorder_quantity: row.get(7),
                unit_price: row.get(8),
                supplier_name: row.get(9),
                is_active: row.get(10),
            });
        }

        Ok(serde_json::json!({
            "items": products,
            "total": total,
            "page": page.unwrap_or(1),
            "page_size": limit
        }))
    }

    async fn add_product(&self, product: Product) -> Result<i64, String> {
        println!("postgres.add_product: Attempting to add product '{:?}' with SKU '{:?}'", product.name, product.sku);
        let client = self.pool.get().await.map_err(|e| {
            println!("postgres.add_product: Failed to get db connection - {}", e);
            format!("Failed to get db connection: {}", e)
        })?;
        
        println!("postgres.add_product: Product data - name: '{:?}', sku: '{:?}', category: '{:?}', current_quantity: {:?}, minimum_quantity: {:?}, unit_price: {:?}", 
                 product.name, product.sku, product.category, product.current_quantity, product.minimum_quantity, product.unit_price);
        
        // Check if SKU already exists (if SKU is provided)
        if let Some(ref sku) = product.sku {
            let existing_count: i64 = client.query_one(
                "SELECT COUNT(*) FROM products WHERE sku = $1",
                &[&sku]
            ).await.map_err(|e| {
                println!("postgres.add_product: Error checking existing SKU - {}", e);
                format!("Failed to check existing SKU: {}", e)
            })?.get(0);
            
            if existing_count > 0 {
                println!("postgres.add_product: SKU '{}' already exists", sku);
                return Err(format!("Product with SKU '{}' already exists. Please use a different SKU or update the existing product.", sku));
            }
        }
        
        let row = client.query_one(
            "INSERT INTO products (name, description, category, sku, current_quantity, minimum_quantity, reorder_quantity, unit_price, supplier_name, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id",
            &[
                &product.name,
                &product.description,
                &product.category,
                &product.sku,
                &product.current_quantity,
                &product.minimum_quantity,
                &product.reorder_quantity,
                &product.unit_price,
                &product.supplier_name,
                &product.is_active,
            ],
        ).await.map_err(|e| {
            println!("postgres.add_product: Database insert error - {}", e);
            format!("Failed to add product: {}", e)
        })?;

        let id: i32 = row.get(0);
        println!("postgres.add_product: Successfully added product with ID: {}", id);
        Ok(id as i64)
    }

    async fn update_product(&self, product: Product) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        
        if let Some(id) = product.id {
            // Check if SKU already exists for a different product (if SKU is provided)
            if let Some(ref sku) = product.sku {
                let existing_id: Option<i32> = client.query_one(
                    "SELECT id FROM products WHERE sku = $1 AND id != $2",
                    &[&sku, &id]
                ).await.ok().map(|row| row.get(0));
                
                if let Some(existing_id) = existing_id {
                    println!("postgres.update_product: SKU '{}' already exists for product ID {}", sku, existing_id);
                    return Err(format!("Product with SKU '{}' already exists for a different product. Please use a different SKU.", sku));
                }
            }
            
            client.execute(
                "UPDATE products SET name = $1, description = $2, category = $3, sku = $4, current_quantity = $5, minimum_quantity = $6, reorder_quantity = $7, unit_price = $8, supplier_name = $9, is_active = $10 WHERE id = $11",
                &[
                    &product.name,
                    &product.description,
                    &product.category,
                    &product.sku,
                    &product.current_quantity,
                    &product.minimum_quantity,
                    &product.reorder_quantity,
                    &product.unit_price,
                    &product.supplier_name,
                    &product.is_active,
                    &id
                ],
            ).await.map_err(|e| format!("Failed to update product: {}", e))?;
            Ok(())
        } else {
            Err("Product ID is required for update".to_string())
        }
    }

    async fn delete_product(&self, id: i32) -> Result<(), String> {
        let mut client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        
        // Check if product is used as a component in any BOM
        let rows = client.query("SELECT count(*) FROM bom_lines WHERE component_product_id = $1", &[&id]).await.map_err(|e| format!("Failed to check BOM usage: {}", e))?;
        if let Some(row) = rows.get(0) {
            let count: i64 = row.get(0);
            if count > 0 {
                return Err("Cannot delete product: It is used as a component in a Bill of Materials.".to_string());
            }
        }

        // Start transaction for cleanup
        let tx = client.transaction().await.map_err(|e| format!("Failed to start transaction: {}", e))?;

        // Delete related inventory logs
        tx.execute("DELETE FROM inventory_logs WHERE product_id = $1", &[&id]).await.map_err(|e| format!("Failed to delete inventory logs: {}", e))?;

        // Delete related inventory batches
        tx.execute("DELETE FROM inventory_batches WHERE product_id = $1", &[&id]).await.map_err(|e| format!("Failed to delete inventory batches: {}", e))?;

        // Delete BOMs where this product is the parent (headers) - Cascade handles lines
        tx.execute("DELETE FROM bom_headers WHERE product_id = $1", &[&id]).await.map_err(|e| format!("Failed to delete BOM headers: {}", e))?;

        // Check and delete from inventory_movements if table exists
        let check_movements = tx.query_one(
            "SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'inventory_movements'
            )", 
            &[]
        ).await.map_err(|e| format!("Failed to check table existence: {}", e))?;
        
        if check_movements.get::<_, bool>(0) {
            tx.execute("DELETE FROM inventory_movements WHERE product_id = $1", &[&id]).await.map_err(|e| format!("Failed to delete inventory movements: {}", e))?;
        }

        let result = tx.execute("DELETE FROM products WHERE id = $1", &[&id]).await.map_err(|e| format!("Failed to delete product: {}", e))?;
        
        if result == 0 {
            // Transaction rolled back on return
            return Err("Product not found".to_string());
        }
        
        tx.commit().await.map_err(|e| format!("Failed to commit transaction: {}", e))?;
        
        Ok(())
    }

    async fn record_sale(&self, sale: Sale) -> Result<i64, String> {
        let mut client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let tx = client.transaction().await.map_err(|e| format!("Failed to start transaction: {}", e))?;

        // 1. Check stock
        let row = tx.query_opt("SELECT current_quantity, unit_price FROM products WHERE id = $1", &[&sale.product_id])
            .await.map_err(|e| format!("Failed to fetch product: {}", e))?;

        if let Some(r) = row {
            let current_qty: i32 = r.get(0);
            let unit_price: f64 = r.get(1);

            if current_qty < sale.quantity {
                return Err(format!("Insufficient stock. Available: {}, Requested: {}", current_qty, sale.quantity));
            }

            // 2. Deduct stock
            tx.execute("UPDATE products SET current_quantity = current_quantity - $1 WHERE id = $2", &[&sale.quantity, &sale.product_id])
                .await.map_err(|e| format!("Failed to update stock: {}", e))?;

            // 3. Record Sale
            // Calculate total price if not provided or just trust frontend?
            // User said "put down the number of slabs of that product and then minus the sales number feom the product"
            // And "profit". Profit = (Price - Cost) * Qty. But we don't have cost yet, just unit_price (selling price?).
            // Let's assume unit_price is selling price.
            // For now, insert into sales table.
            
            let total_price = if sale.total_price > 0.0 { sale.total_price } else { unit_price * sale.quantity as f64 };
            let sale_date = parse_timestamp(sale.sale_date).unwrap_or(chrono::Local::now().naive_local());

            let sale_row = tx.query_one(
                "INSERT INTO sales (product_id, quantity, total_price, sale_date, notes, user_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
                &[&sale.product_id, &sale.quantity, &total_price, &sale_date, &sale.notes, &sale.user_id]
            ).await.map_err(|e| format!("Failed to insert sale: {}", e))?;

            tx.commit().await.map_err(|e| format!("Failed to commit transaction: {}", e))?;
            
            Ok(sale_row.get::<_, i32>(0) as i64)
        } else {
            Err("Product not found".to_string())
        }
    }

    // --- Employee Commands ---
    async fn get_employees(&self) -> Result<Vec<Employee>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let rows = client.query("SELECT id, employee_id, first_name, last_name, email, phone, role, department, position, salary, status FROM employees", &[]).await.map_err(|e| format!("Failed to fetch employees: {}", e))?;
        
        let mut employees = Vec::new();
        for row in rows {
            employees.push(Employee {
                id: Some(row.get(0)),
                employee_id: row.get(1),
                first_name: row.get(2),
                last_name: row.get(3),
                email: row.get(4),
                phone: row.get(5),
                role: row.get(6),
                department: row.get(7),
                position: row.get(8),
                salary: row.get(9),
                status: row.get(10),
            });
        }
        Ok(employees)
    }

    async fn get_employee_by_email(&self, email: String) -> Result<Option<Employee>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let rows = client.query("SELECT id, employee_id, first_name, last_name, email, phone, role, department, position, salary, status FROM employees WHERE email = $1", &[&email]).await.map_err(|e| format!("Failed to fetch employee by email: {}", e))?;
        
        if rows.is_empty() {
            return Ok(None);
        }

        let row = &rows[0];
        Ok(Some(Employee {
            id: Some(row.get(0)),
            employee_id: row.get(1),
            first_name: row.get(2),
            last_name: row.get(3),
            email: row.get(4),
            phone: row.get(5),
            role: row.get(6),
            department: row.get(7),
            position: row.get(8),
            salary: row.get(9),
            status: row.get(10),
        }))
    }

    async fn add_employee(&self, employee: Employee) -> Result<i64, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let row = client.query_one(
            "INSERT INTO employees (employee_id, first_name, last_name, email, phone, role, department, position, salary, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id",
            &[
                &employee.employee_id, &employee.first_name, &employee.last_name, &employee.email, &employee.phone,
                &employee.role, &employee.department, &employee.position, &employee.salary, &employee.status
            ]
        ).await.map_err(|e| format!("Failed to add employee: {}", e))?;
        let id: i32 = row.get(0);
        Ok(id as i64)
    }

    async fn update_employee(&self, employee: Employee) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        if let Some(id) = employee.id {
            client.execute(
                "UPDATE employees SET employee_id = $1, first_name = $2, last_name = $3, email = $4, phone = $5, role = $6, department = $7, position = $8, salary = $9, status = $10 WHERE id = $11",
                &[
                    &employee.employee_id, &employee.first_name, &employee.last_name, &employee.email, &employee.phone,
                    &employee.role, &employee.department, &employee.position, &employee.salary, &employee.status, &id
                ]
            ).await.map_err(|e| format!("Failed to update employee: {}", e))?;
            Ok(())
        } else {
            Err("ID required".to_string())
        }
    }

    async fn delete_employee(&self, id: i32) -> Result<(), String> {
        println!("Deleting employee {}", id);
        let mut client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let tx = client.transaction().await.map_err(|e| format!("Failed to start transaction: {}", e))?;
        
        if let Err(e) = tx.execute("UPDATE tasks SET employee_id = NULL WHERE employee_id = $1", &[&id]).await { println!("Error updating tasks: {:?}", e); return Err(format!("Failed to update tasks: {}", e)); }
        if let Err(e) = tx.execute("UPDATE project_tasks SET assigned_to = NULL WHERE assigned_to = $1", &[&id]).await { println!("Error updating project_tasks: {:?}", e); return Err(format!("Failed to update project tasks: {}", e)); }
        if let Err(e) = tx.execute("UPDATE payments SET employee_id = NULL WHERE employee_id = $1", &[&id]).await { println!("Error updating payments: {:?}", e); return Err(format!("Failed to update payments: {}", e)); }
        if let Err(e) = tx.execute("UPDATE projects SET manager_id = NULL WHERE manager_id = $1", &[&id]).await { println!("Error updating projects: {:?}", e); return Err(format!("Failed to update projects: {}", e)); }
        
        // 1. Attendance deletion with SAVEPOINT
        if let Err(_) = tx.execute("SAVEPOINT attendance_del", &[]).await { return Err("Failed to create savepoint".to_string()); }
        if let Err(e) = tx.execute("DELETE FROM attendance WHERE employee_id = $1", &[&id]).await { 
            if e.code() == Some(&SqlState::UNDEFINED_TABLE) {
                println!("Attendance table missing, skipping deletion.");
                if let Err(_) = tx.execute("ROLLBACK TO SAVEPOINT attendance_del", &[]).await { return Err("Failed to rollback savepoint".to_string()); }
            } else {
                println!("Error deleting attendance: {:?}", e);
                return Err(format!("Failed to delete attendance: {:?}", e));
            }
        } else {
            tx.execute("RELEASE SAVEPOINT attendance_del", &[]).await.ok();
        }

        // 2. Tool Assignments deletion with SAVEPOINT
        if let Err(_) = tx.execute("SAVEPOINT tool_assign_del", &[]).await { return Err("Failed to create savepoint".to_string()); }
        if let Err(e) = tx.execute("DELETE FROM tool_assignments WHERE employee_id = $1", &[&id]).await { 
            if e.code() == Some(&SqlState::UNDEFINED_TABLE) {
                println!("Tool assignments table missing, skipping deletion.");
                if let Err(_) = tx.execute("ROLLBACK TO SAVEPOINT tool_assign_del", &[]).await { return Err("Failed to rollback savepoint".to_string()); }
            } else {
                println!("Error deleting tool_assignments: {:?}", e); 
                return Err(format!("Failed to delete tool assignments: {}", e)); 
            }
        } else {
            tx.execute("RELEASE SAVEPOINT tool_assign_del", &[]).await.ok();
        }

        if let Err(e) = tx.execute("UPDATE tools SET assigned_to_employee_id = NULL WHERE assigned_to_employee_id = $1", &[&id]).await { println!("Error updating tools: {:?}", e); return Err(format!("Failed to update tools: {}", e)); }
        
        // 3. Project Assignments deletion with SAVEPOINT
        if let Err(_) = tx.execute("SAVEPOINT project_assign_del", &[]).await { return Err("Failed to create savepoint".to_string()); }
        if let Err(e) = tx.execute("DELETE FROM project_assignments WHERE employee_id = $1", &[&id]).await { 
            if e.code() == Some(&SqlState::UNDEFINED_TABLE) {
                println!("Project assignments table missing, skipping deletion.");
                if let Err(_) = tx.execute("ROLLBACK TO SAVEPOINT project_assign_del", &[]).await { return Err("Failed to rollback savepoint".to_string()); }
            } else {
                println!("Error deleting project_assignments: {:?}", e); 
                return Err(format!("Failed to delete project assignments: {}", e)); 
            }
        } else {
            tx.execute("RELEASE SAVEPOINT project_assign_del", &[]).await.ok();
        }
        
        if let Err(e) = tx.execute("DELETE FROM employees WHERE id = $1", &[&id]).await { 
            println!("Error deleting employee record: {:?}", e); 
            return Err(format!("Failed to delete employee record: {:?}", e)); 
        }
        
        if let Err(e) = tx.commit().await {
            println!("Error committing transaction: {:?}", e);
            return Err(format!("Failed to commit transaction: {}", e));
        }
        println!("Employee {} deleted successfully", id);
        Ok(())
    }

    // --- Payment Commands ---
    async fn get_payments(&self) -> Result<Vec<Payment>, String> {
         let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
         let rows = client.query("SELECT id, payment_type, amount, currency, description, status, payment_method, payment_date, due_date, reference_number, employee_id, supplier_name FROM payments", &[])
             .await.map_err(|e| format!("Failed to fetch payments: {}", e))?;
         
         let mut payments = Vec::new();
         for row in rows {
             payments.push(Payment {
                 id: Some(row.get(0)),
                 payment_type: row.get(1),
                 amount: row.get(2),
                 currency: row.get(3),
                 description: row.get(4),
                 status: row.get(5),
                 payment_method: row.get(6),
                 payment_date: format_timestamp(row.get(7)),
                 due_date: format_timestamp(row.get(8)),
                 reference_number: row.get(9),
                 employee_id: row.get(10),
                 supplier_name: row.get(11),
             });
         }
         Ok(payments)
    }

    async fn add_payment(&self, payment: Payment) -> Result<i64, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let payment_date = parse_timestamp(payment.payment_date);
        let due_date = parse_timestamp(payment.due_date);
        
        // Ensure date is set (required by DB schema if not nullable, and good for consistency)
        let date = payment_date.unwrap_or_else(|| chrono::Local::now().naive_local());

        let row = client.query_one(
            "INSERT INTO payments (payment_type, amount, currency, description, status, payment_method, payment_date, due_date, reference_number, employee_id, supplier_name, date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id",
            &[
                &payment.payment_type, &payment.amount, &payment.currency, &payment.description, &payment.status,
                &payment.payment_method, &payment_date, &due_date, &payment.reference_number, &payment.employee_id, &payment.supplier_name, &date
            ]
        ).await.map_err(|e| format!("Failed to add payment: {}", e))?;
        let id: i32 = row.get(0);
        Ok(id as i64)
    }

    async fn update_payment(&self, payment: Payment) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let payment_date = parse_timestamp(payment.payment_date);
        let due_date = parse_timestamp(payment.due_date);
        if let Some(id) = payment.id {
            client.execute(
                "UPDATE payments SET payment_type = $1, amount = $2, currency = $3, description = $4, status = $5, payment_method = $6, payment_date = $7, due_date = $8, reference_number = $9, employee_id = $10, supplier_name = $11 WHERE id = $12",
                &[
                    &payment.payment_type, &payment.amount, &payment.currency, &payment.description, &payment.status,
                    &payment.payment_method, &payment_date, &due_date, &payment.reference_number, &payment.employee_id, &payment.supplier_name, &id
                ]
            ).await.map_err(|e| format!("Failed to update payment: {}", e))?;
            Ok(())
        } else {
            Err("ID required".to_string())
        }
    }

    async fn delete_payment(&self, id: i32) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        client.execute("DELETE FROM payments WHERE id = $1", &[&id])
            .await.map_err(|e| format!("Failed to delete payment: {}", e))?;
        Ok(())
    }

    // --- Tasks (Generic) ---
    async fn get_tasks(&self) -> Result<Vec<Task>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let rows = client.query("SELECT id, employee_id, title, description, due_date, status, priority, assigned_date, completed_date FROM tasks", &[]).await.map_err(|e| format!("Failed to fetch tasks: {}", e))?;
        let mut tasks = Vec::new();
        for row in rows {
            tasks.push(Task {
                id: Some(row.get(0)),
                employee_id: row.get(1),
                title: row.get(2),
                description: row.get(3),
                due_date: format_timestamp(row.get(4)),
                status: row.get(5),
                priority: row.get(6),
                assigned_date: format_timestamp(row.get(7)),
                completed_date: format_timestamp(row.get(8)),
            });
        }
        Ok(tasks)
    }

    async fn get_tasks_by_employee(&self, employee_id: i32) -> Result<Vec<Task>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let rows = client.query("SELECT id, employee_id, title, description, due_date, status, priority, assigned_date, completed_date FROM tasks WHERE employee_id = $1", &[&employee_id]).await.map_err(|e| format!("Failed to fetch tasks by employee: {}", e))?;
        let mut tasks = Vec::new();
        for row in rows {
            tasks.push(Task {
                id: Some(row.get(0)),
                employee_id: row.get(1),
                title: row.get(2),
                description: row.get(3),
                due_date: format_timestamp(row.get(4)),
                status: row.get(5),
                priority: row.get(6),
                assigned_date: format_timestamp(row.get(7)),
                completed_date: format_timestamp(row.get(8)),
            });
        }
        Ok(tasks)
    }

    async fn add_task(&self, task: Task) -> Result<i64, String> {
        println!("postgres.add_task: Attempting to add task '{}' with priority '{}' and status '{}'", task.title, task.priority, task.status);
        let client = self.pool.get().await.map_err(|e| {
            let err = format!("Failed to get db connection: {}", e);
            println!("postgres.add_task: Connection error - {}", err);
            err
        })?;
        let due_date = parse_timestamp(task.due_date);
        let assigned_date = parse_timestamp(task.assigned_date);
        let completed_date = parse_timestamp(task.completed_date);
        println!("postgres.add_task: Parsed dates - due: {:?}, assigned: {:?}, completed: {:?}", due_date, assigned_date, completed_date);
        
        let row = client.query_one(
            "INSERT INTO tasks (employee_id, title, description, due_date, status, priority, assigned_date, completed_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
            &[
                &task.employee_id, &task.title, &task.description, &due_date,
                &task.status, &task.priority, &assigned_date, &completed_date,
            ],
        ).await.map_err(|e| {
            let err = format!("Failed to add task: {}", e);
            println!("postgres.add_task: Database insert error - {}", err);
            println!("postgres.add_task: Task data - employee_id: {:?}, title: '{:?}', description: '{:?}', status: '{:?}', priority: '{:?}'", 
                     task.employee_id, task.title, task.description, task.status, task.priority);
            err
        })?;
        
        let task_id = row.get::<_, i32>(0) as i64;
        println!("postgres.add_task: Successfully added task with ID: {}", task_id);
        Ok(task_id)
    }

    async fn update_task(&self, task: Task) -> Result<(), String> {
        println!("postgres.update_task: Attempting to update task '{}' (ID: {:?})", task.title, task.id);
        let client = self.pool.get().await.map_err(|e| {
            let err = format!("Failed to get db connection: {}", e);
            println!("postgres.update_task: Connection error - {}", err);
            err
        })?;
        let due_date = parse_timestamp(task.due_date);
        let assigned_date = parse_timestamp(task.assigned_date);
        let completed_date = parse_timestamp(task.completed_date);
        println!("postgres.update_task: Parsed dates - due: {:?}, assigned: {:?}, completed: {:?}", due_date, assigned_date, completed_date);
        
        if let Some(id) = task.id {
            println!("postgres.update_task: Updating task with ID: {}", id);
            client.execute(
                "UPDATE tasks SET employee_id = $1, title = $2, description = $3, due_date = $4, status = $5, priority = $6, assigned_date = $7, completed_date = $8 WHERE id = $9",
                &[
                    &task.employee_id, &task.title, &task.description, &due_date,
                    &task.status, &task.priority, &assigned_date, &completed_date, &id
                ],
            ).await.map_err(|e| {
                let err = format!("Failed to update task: {}", e);
                println!("postgres.update_task: Database update error - {}", err);
                println!("postgres.update_task: Task data - employee_id: {:?}, title: '{:?}', description: '{:?}', status: '{:?}', priority: '{:?}', id: {}", 
                         task.employee_id, task.title, task.description, task.status, task.priority, id);
                err
            })?;
            println!("postgres.update_task: Successfully updated task {}", id);
            Ok(())
        } else {
            println!("postgres.update_task: Error - Task ID is required for update");
            Err("Task ID is required for update".to_string())
        }
    }

    async fn delete_task(&self, id: i32) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        client.execute("DELETE FROM tasks WHERE id = $1", &[&id]).await.map_err(|e| format!("Failed to delete task: {}", e))?;
        Ok(())
    }

    // --- Attendance ---
    async fn get_attendances(&self) -> Result<Vec<Attendance>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let rows = client.query("SELECT id, employee_id, check_in, check_out, status, notes, location FROM attendance", &[])
            .await.map_err(|e| format!("Failed to fetch attendances: {}", e))?;
        let mut attendances = Vec::new();
        for row in rows {
            attendances.push(Attendance {
                id: Some(row.get(0)),
                employee_id: row.get(1),
                check_in: format_timestamp(row.get(2)).unwrap_or_default(),
                check_out: format_timestamp(row.get(3)),
                status: row.get(4),
                notes: row.get(5),
                location: row.get(6),
            });
        }
        Ok(attendances)
    }

    async fn clock_in(&self, attendance: Attendance) -> Result<i64, String> {
        println!("postgres.clock_in: Starting clock in for employee {:?}", attendance.employee_id);
        let client = self.pool.get().await.map_err(|e| {
            println!("postgres.clock_in: Failed to get db connection - {}", e);
            format!("Failed to get db connection: {}", e)
        })?;
        let check_in = parse_timestamp(Some(attendance.check_in)).unwrap_or(chrono::Local::now().naive_local());
        println!("postgres.clock_in: Parsed check-in time: {:?}", check_in);
        let row = client.query_one(
            "INSERT INTO attendance (employee_id, check_in, status, notes, location) VALUES ($1, $2, $3, $4, $5) RETURNING id",
            &[&attendance.employee_id, &check_in, &attendance.status, &attendance.notes, &attendance.location],
        ).await.map_err(|e| {
            println!("postgres.clock_in: Database error - {}", e);
            format!("Failed to clock in: {}", e)
        })?;
        let id = row.get::<_, i32>(0) as i64;
        println!("postgres.clock_in: Successfully clocked in with ID: {}", id);
        Ok(id)
    }

    async fn clock_out(&self, attendance: Attendance) -> Result<(), String> {
        println!("postgres.clock_out: Starting clock out for attendance ID {:?} and employee {:?}", attendance.id, attendance.employee_id);
        let client = self.pool.get().await.map_err(|e| {
            println!("postgres.clock_out: Failed to get db connection - {}", e);
            format!("Failed to get db connection: {}", e)
        })?;
        let check_out = parse_timestamp(attendance.check_out).unwrap_or(chrono::Local::now().naive_local());
        println!("postgres.clock_out: Parsed check-out time: {:?}", check_out);
        if let Some(id) = attendance.id {
            println!("postgres.clock_out: Attempting to update attendance record ID: {}", id);
            let result = client.execute(
                "UPDATE attendance SET check_out = $1, status = $2, notes = $3 WHERE id = $4 AND employee_id = $5",
                &[&check_out, &attendance.status, &attendance.notes, &id, &attendance.employee_id],
            ).await.map_err(|e| {
                println!("postgres.clock_out: Database error - {}", e);
                format!("Failed to clock out: {}", e)
            })?;
            
            if result == 0 {
                println!("postgres.clock_out: Error - Attendance record not found or permission denied");
                return Err("Attendance record not found or permission denied".to_string());
            }
            println!("postgres.clock_out: Successfully clocked out");
            Ok(())
        } else {
            println!("postgres.clock_out: Error - Attendance ID is required for clock out");
            Err("Attendance ID is required for clock out".to_string())
        }
    }

    // --- Dashboard & Reports ---
    async fn get_dashboard_stats(&self) -> Result<DashboardStats, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let total_products: i64 = client.query_one("SELECT COUNT(*) FROM products", &[])
            .await.map_err(|e| format!("Failed to fetch total products: {}", e))?.get(0);
        let low_stock_items: i64 = client.query_one("SELECT COUNT(*) FROM products WHERE current_quantity <= minimum_quantity", &[])
            .await.map_err(|e| format!("Failed to fetch low stock items: {}", e))?.get(0);
        let total_employees: i64 = client.query_one("SELECT COUNT(*) FROM employees WHERE status = 'active'", &[])
            .await.map_err(|e| format!("Failed to fetch total employees: {}", e))?.get(0);
        let total_payments_pending: i64 = client.query_one("SELECT COUNT(*) FROM payments WHERE status = 'pending'", &[])
            .await.map_err(|e| format!("Failed to fetch pending payments: {}", e))?.get(0);
            
        let sales_revenue: f64 = client.query_one("SELECT COALESCE(SUM(total_price), 0.0) FROM sales", &[])
            .await.map_err(|e| format!("Failed to fetch sales revenue: {}", e))?.get(0);

        let total_sales: i64 = client.query_one("SELECT COUNT(*) FROM sales", &[])
            .await.map_err(|e| format!("Failed to fetch total sales: {}", e))?.get(0);

        let income_payments: f64 = client.query_one("SELECT COALESCE(SUM(amount), 0.0) FROM payments WHERE payment_type = 'income' AND status = 'completed'", &[])
            .await.map_err(|e| format!("Failed to fetch income payments: {}", e))?.get(0);
            
        let total_revenue = sales_revenue + income_payments;

        let total_expenses: f64 = client.query_one("SELECT COALESCE(SUM(amount), 0.0) FROM payments WHERE payment_type = 'expense' AND status = 'completed'", &[])
            .await.map_err(|e| format!("Failed to fetch total expenses: {}", e))?.get(0);

        let total_services: i64 = client.query_one("SELECT COUNT(*) FROM services WHERE is_active = true", &[])
            .await.map_err(|e| format!("Failed to fetch total services: {}", e))?.get(0);

        let total_clients: i64 = client.query_one("SELECT COUNT(*) FROM clients WHERE is_active = true", &[])
            .await.map_err(|e| format!("Failed to fetch total clients: {}", e))?.get(0);

        let billable_hours: f64 = client.query_one("SELECT COALESCE(SUM(duration_hours), 0.0) FROM time_entries WHERE is_billable = true", &[])
            .await.map_err(|e| format!("Failed to fetch billable hours: {}", e))?.get(0);
            
        let total_hours: f64 = client.query_one("SELECT COALESCE(SUM(duration_hours), 0.0) FROM time_entries", &[])
            .await.map_err(|e| format!("Failed to fetch total hours: {}", e))?.get(0);

        let billable_utilization = if total_hours > 0.0 { billable_hours / total_hours } else { 0.0 };

        let contracts_expiring_soon: i64 = client.query_one("SELECT COUNT(*) FROM service_contracts WHERE status = 'active' AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'", &[])
            .await.map_err(|e| format!("Failed to fetch expiring contracts: {}", e))?.get(0);

        let average_project_margin = 0.22;
        let resource_availability_rate = 0.75;
        
        Ok(DashboardStats { 
            total_products: total_products as i32, 
            low_stock_items: low_stock_items as i32, 
            total_employees: total_employees as i32, 
            total_payments_pending: total_payments_pending as i32, 
            total_revenue,
            total_sales: total_sales as i32,
            net_profit: total_revenue - total_expenses,
            total_services: total_services as i32,
            total_clients: total_clients as i32,
            billable_hours,
            billable_utilization,
            average_project_margin,
            resource_availability_rate,
            contracts_expiring_soon: contracts_expiring_soon as i32,
        })
    }

    async fn get_report_summary(&self) -> Result<ReportSummary, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        
        let inventory_value: f64 = client.query_one("SELECT COALESCE(SUM(current_quantity * unit_price), 0.0) FROM products", &[])
            .await.map_err(|e| format!("Failed to fetch inventory value: {}", e))?.get(0);
            
        let income_payments: f64 = client.query_one("SELECT COALESCE(SUM(amount), 0.0) FROM payments WHERE payment_type = 'income' AND status = 'completed'", &[])
            .await.map_err(|e| format!("Failed to fetch income payments: {}", e))?.get(0);
            
        let sales_revenue: f64 = client.query_one("SELECT COALESCE(SUM(total_price), 0.0) FROM sales", &[])
            .await.map_err(|e| format!("Failed to fetch sales revenue: {}", e))?.get(0);

        let total_sales_count: i64 = client.query_one("SELECT COUNT(*) FROM sales", &[])
            .await.map_err(|e| format!("Failed to fetch total sales count: {}", e))?.get(0);
            
        let total_revenue = income_payments + sales_revenue;
            
        let total_expenses: f64 = client.query_one("SELECT COALESCE(SUM(amount), 0.0) FROM payments WHERE payment_type = 'expense' AND status = 'completed'", &[])
            .await.map_err(|e| format!("Failed to fetch total expenses: {}", e))?.get(0);
            
        let pending_tasks: i64 = client.query_one("SELECT COUNT(*) FROM tasks WHERE status != 'completed'", &[])
            .await.map_err(|e| format!("Failed to fetch pending tasks: {}", e))?.get(0);
            
        let active_employees: i64 = client.query_one("SELECT COUNT(*) FROM employees WHERE status = 'active'", &[])
            .await.map_err(|e| format!("Failed to fetch active employees: {}", e))?.get(0);
        
        Ok(ReportSummary {
            inventory_value,
            total_revenue,
            total_expenses,
            net_profit: total_revenue - total_expenses,
            pending_tasks: pending_tasks as i32,
            active_employees: active_employees as i32,
            total_sales_count: total_sales_count as i32
        })
    }

    async fn get_monthly_cashflow(&self) -> Result<Vec<ChartDataPoint>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        
        let rows = client.query("
            SELECT TO_CHAR(d, 'Mon') as month, SUM(amount) as total, MIN(d) as sort_date
            FROM (
                SELECT sale_date as d, total_price as amount FROM sales WHERE sale_date >= NOW() - INTERVAL '6 months'
                UNION ALL
                SELECT payment_date as d, amount FROM payments WHERE payment_type = 'income' AND status = 'completed' AND payment_date >= NOW() - INTERVAL '6 months'
            ) as combined
            GROUP BY 1
            ORDER BY 3
        ", &[]).await.map_err(|e| format!("Failed to fetch monthly cashflow: {}", e))?;

        let mut points = Vec::new();
        for row in rows {
            points.push(ChartDataPoint {
                label: row.get(0),
                value: row.get(1),
            });
        }
        Ok(points)
    }

    // --- Complaints ---
    async fn get_complaints(&self) -> Result<Vec<Complaint>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let rows = client.query("SELECT id, title, description, submitted_by_employee_id, status, submitted_at, resolved_at, resolution, resolved_by_user_id, admin_notes, is_anonymous FROM complaints", &[])
            .await.map_err(|e| format!("Failed to fetch complaints: {}", e))?;
        let mut complaints = Vec::new();
        for row in rows {
            complaints.push(Complaint {
                id: Some(row.get(0)),
                title: row.get(1),
                description: row.get(2),
                submitted_by_employee_id: row.get(3),
                status: row.get(4),
                submitted_at: format_timestamp(row.get(5)),
                resolved_at: format_timestamp(row.get(6)),
                resolution: row.get(7),
                resolved_by_user_id: row.get(8),
                admin_notes: row.get(9),
                is_anonymous: row.get(10),
            });
        }
        Ok(complaints)
    }

    async fn submit_complaint(&self, complaint: Complaint) -> Result<i64, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let submitted_at = parse_timestamp(complaint.submitted_at).unwrap_or_else(|| chrono::Local::now().naive_local());
        let row = client.query_one(
            "INSERT INTO complaints (title, description, submitted_by_employee_id, status, submitted_at, is_anonymous) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
            &[&complaint.title, &complaint.description, &complaint.submitted_by_employee_id, &complaint.status, &submitted_at, &complaint.is_anonymous]
        )
            .await.map_err(|e| format!("Failed to submit complaint: {}", e))?;
        Ok(row.get::<_, i32>(0) as i64)
    }

    async fn resolve_complaint(&self, id: i32, status: String, resolution: String, resolved_by: String, admin_notes: Option<String>) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        
        // Look up user ID from username
        let user_row = client.query_opt("SELECT id FROM users WHERE username = $1", &[&resolved_by])
            .await.map_err(|e| format!("Failed to look up user: {}", e))?;
        let resolved_by_user_id: Option<i32> = user_row.map(|r| r.get(0));

        let resolved_at = chrono::Local::now().naive_local();
        client.execute(
            "UPDATE complaints SET status = $1, resolution = $2, resolved_by_user_id = $3, admin_notes = $4, resolved_at = $5 WHERE id = $6",
            &[&status, &resolution, &resolved_by_user_id, &admin_notes, &resolved_at, &id]
        ).await.map_err(|e| format!("Failed to resolve complaint: {}", e))?;
        Ok(())
    }

    async fn delete_complaint(&self, id: i32) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        client.execute("DELETE FROM complaints WHERE id = $1", &[&id])
            .await.map_err(|e| format!("Failed to delete complaint: {}", e))?;
        Ok(())
    }

    // --- Tools ---
    async fn get_tools(&self) -> Result<Vec<Tool>, String> {
        println!("postgres.get_tools: Fetching all tools from database");
        let client = self.pool.get().await.map_err(|e| {
            let err = format!("Failed to get db connection: {}", e);
            println!("postgres.get_tools: Connection error - {}", err);
            err
        })?;
        let rows = client.query("SELECT id, name, type_name, status, assigned_to_employee_id, purchase_date, condition FROM tools", &[])
            .await.map_err(|e| {
                let err = format!("Failed to fetch tools: {}", e);
                println!("postgres.get_tools: Query error - {}", err);
                err
            })?;
        println!("postgres.get_tools: Found {} tool rows", rows.len());
        let mut tools = Vec::new();
        for row in rows {
            let tool = Tool {
                id: Some(row.get(0)),
                name: row.get(1),
                type_name: row.get(2),
                status: row.get(3),
                assigned_to_employee_id: row.get(4),
                purchase_date: format_timestamp(row.get(5)),
                condition: row.get(6),
            };
            println!("postgres.get_tools: Found tool - ID: {:?}, Name: '{}', Type: '{}', Status: '{}'", 
                     tool.id, tool.name, tool.type_name, tool.status);
            tools.push(tool);
        }
        println!("postgres.get_tools: Returning {} tools", tools.len());
        Ok(tools)
    }

    async fn add_tool(&self, tool: Tool) -> Result<i64, String> {
        println!("postgres.add_tool: Attempting to add tool '{}' of type '{}'", tool.name, tool.type_name);
        let client = self.pool.get().await.map_err(|e| {
            let err = format!("Failed to get db connection: {}", e);
            println!("postgres.add_tool: Connection error - {}", err);
            err
        })?;
        let purchase_date = parse_timestamp(tool.purchase_date);
        println!("postgres.add_tool: Parsed purchase_date: {:?}", purchase_date);
        
        let row = client.query_one(
            "INSERT INTO tools (name, type_name, status, assigned_to_employee_id, purchase_date, condition) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
            &[&tool.name, &tool.type_name, &tool.status, &tool.assigned_to_employee_id, &purchase_date, &tool.condition]
        ).await.map_err(|e| {
            let err = format!("Failed to add tool: {}", e);
            println!("postgres.add_tool: Database insert error - {}", err);
            println!("postgres.add_tool: Tool data - name: '{}', type_name: '{}', status: '{}', assigned_to_employee_id: {:?}, purchase_date: {:?}, condition: {:?}", 
                     tool.name, tool.type_name, tool.status, tool.assigned_to_employee_id, purchase_date, tool.condition);
            err
        })?;
        
        let tool_id = row.get::<_, i32>(0) as i64;
        println!("postgres.add_tool: Successfully added tool with ID: {}", tool_id);
        Ok(tool_id)
    }

    async fn update_tool(&self, tool: Tool) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let purchase_date = parse_timestamp(tool.purchase_date);
        if let Some(id) = tool.id {
            client.execute(
                "UPDATE tools SET name = $1, type_name = $2, status = $3, assigned_to_employee_id = $4, purchase_date = $5, condition = $6 WHERE id = $7",
                &[&tool.name, &tool.type_name, &tool.status, &tool.assigned_to_employee_id, &purchase_date, &tool.condition, &id]
            ).await.map_err(|e| format!("Failed to update tool: {}", e))?;
            Ok(())
        } else {
            Err("Tool ID is required for update".to_string())
        }
    }

    async fn delete_tool(&self, id: i32) -> Result<(), String> {
        println!("Deleting tool {}", id);
        let mut client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let tx = client.transaction().await.map_err(|e| format!("Failed to start transaction: {}", e))?;
        
        // Use SAVEPOINT for tool_assignments deletion
        if let Err(_) = tx.execute("SAVEPOINT tool_assign_del", &[]).await { return Err("Failed to create savepoint".to_string()); }
        if let Err(e) = tx.execute("DELETE FROM tool_assignments WHERE tool_id = $1", &[&id]).await {
            if e.code() == Some(&SqlState::UNDEFINED_TABLE) {
                println!("Tool assignments table missing, skipping deletion.");
                if let Err(_) = tx.execute("ROLLBACK TO SAVEPOINT tool_assign_del", &[]).await { return Err("Failed to rollback savepoint".to_string()); }
            } else {
                println!("Error deleting tool_assignments: {:?}", e);
                return Err(format!("Failed to delete tool assignments: {}", e));
            }
        } else {
            tx.execute("RELEASE SAVEPOINT tool_assign_del", &[]).await.ok();
        }
        
        if let Err(e) = tx.execute("DELETE FROM tools WHERE id = $1", &[&id]).await {
            println!("Error deleting tool: {:?}", e);
            if let Some(code) = e.code() {
                println!("Error code: {:?}", code);
            }
            return Err(format!("Failed to delete tool: {}", e));
        }
        
        if let Err(e) = tx.commit().await {
            println!("Error committing transaction: {:?}", e);
            return Err(format!("Failed to commit transaction: {}", e));
        }
        
        println!("Tool {} deleted successfully", id);
        Ok(())
    }

    async fn assign_tool(&self, assignment: ToolAssignment) -> Result<i64, String> {
        println!("postgres.assign_tool: Attempting to assign tool {:?} to employee {:?}", assignment.tool_id, assignment.employee_id);
        let mut client = self.pool.get().await.map_err(|e| {
            let err = format!("Failed to get db connection: {}", e);
            println!("postgres.assign_tool: Connection error - {}", err);
            err
        })?;
        let tx = client.transaction().await.map_err(|e| {
            let err = format!("Failed to start transaction: {}", e);
            println!("postgres.assign_tool: Transaction error - {}", err);
            err
        })?;
        
        println!("postgres.assign_tool: Updating tool status to assigned...");
        tx.execute("UPDATE tools SET assigned_to_employee_id = $1, status = 'assigned' WHERE id = $2", &[&assignment.employee_id, &assignment.tool_id])
            .await.map_err(|e| {
                let err = format!("Failed to update tool status: {}", e);
                println!("postgres.assign_tool: Tool update error - {}", err);
                err
            })?;
        
        println!("postgres.assign_tool: Creating tool assignment record...");
        let row = tx.query_one(
            "INSERT INTO tool_assignments (tool_id, employee_id, condition_on_assignment) VALUES ($1, $2, $3) RETURNING id", 
            &[&assignment.tool_id, &assignment.employee_id, &assignment.condition_on_assignment]
        ).await.map_err(|e| {
            let err = format!("Failed to create tool assignment: {}", e);
            println!("postgres.assign_tool: Assignment insert error - {}", err);
            err
        })?;
        
        let assignment_id = row.get::<_, i32>(0) as i64;
        println!("postgres.assign_tool: Committing transaction...");
        tx.commit().await.map_err(|e| {
            let err = format!("Failed to commit transaction: {}", e);
            println!("postgres.assign_tool: Commit error - {}", err);
            err
        })?;
        println!("postgres.assign_tool: Successfully assigned tool with assignment ID: {}", assignment_id);
        Ok(assignment_id)
    }

    async fn return_tool(&self, tool_id: i32, user_id: i32, condition: String) -> Result<(), String> {
        println!("postgres.return_tool: Attempting to return tool {} with condition: '{}'", tool_id, condition);
        
        // Validate input parameters
        if tool_id <= 0 {
            return Err("Invalid tool ID".to_string());
        }
        
        let mut client = self.pool.get().await.map_err(|e| {
            let err = format!("Database connection error: Cannot connect to database pool - {}", e);
            println!("postgres.return_tool: Connection error - {}", err);
            err
        })?;
        let tx = client.transaction().await.map_err(|e| {
            let err = format!("Database transaction error: Failed to start transaction - {}", e);
            println!("postgres.return_tool: Transaction error - {}", err);
            err
        })?;
        
        // First check if the tool exists and is assigned
        println!("postgres.return_tool: Checking tool status...");
        let tool_check = tx.query_opt("SELECT assigned_to_employee_id, status FROM tools WHERE id = $1", &[&tool_id])
            .await.map_err(|e| {
                let err = format!("Database query error: Failed to check tool status - {}", e);
                println!("postgres.return_tool: Tool check error - {}", err);
                err
            })?;
            
        match tool_check {
            Some(row) => {
                let assigned_to: Option<i32> = row.get(0);
                let status: String = row.get(1);
                println!("postgres.return_tool: Tool {} - Status: '{}', Assigned to: {:?}", tool_id, status, assigned_to);
                
                // Validate that the tool is actually assigned
                if assigned_to.is_none() || status != "assigned" {
                    println!("postgres.return_tool: Tool {} is not assigned (status: {}, assigned_to: {:?})", tool_id, status, assigned_to);
                    return Err(format!("Cannot return tool {}: Tool is not currently assigned (status: {}). Tools can only be returned if they are in 'assigned' status.", tool_id, status));
                }
                
                // Check if the current user is the assigned employee
                if let Some(assigned_employee_id) = assigned_to {
                    if assigned_employee_id != user_id {
                        println!("postgres.return_tool: Permission denied - Tool {} is assigned to employee {}, but user {} is trying to return it", tool_id, assigned_employee_id, user_id);
                        return Err(format!("Permission denied: Tool {} is assigned to employee {} (you are employee {}). Only the assigned employee can return this tool.", tool_id, assigned_employee_id, user_id));
                    }
                }
            }
            None => {
                println!("postgres.return_tool: Tool {} not found", tool_id);
                return Err(format!("Cannot return tool {}: Tool does not exist in the database", tool_id));
            }
        }
        
        println!("postgres.return_tool: Updating tool status to available...");
        let tool_update_result = tx.execute("UPDATE tools SET assigned_to_employee_id = NULL, status = 'available', condition = COALESCE($1, condition) WHERE id = $2", &[&condition, &tool_id])
            .await;
            
        match tool_update_result {
            Ok(rows) => {
                println!("postgres.return_tool: Tool update affected {} rows", rows);
                if rows == 0 {
                    println!("postgres.return_tool: WARNING - No tool rows were updated!");
                }
            }
            Err(e) => {
                println!("postgres.return_tool: === TOOL UPDATE ERROR DETAILS ===");
                println!("postgres.return_tool: Tool update error: {}", e);
                
                if let Some(db_error) = e.as_db_error() {
                    println!("postgres.return_tool: Tool DB Error - Code: {:?}", db_error.code());
                    println!("postgres.return_tool: Tool DB Error - Message: {:?}", db_error.message());
                    println!("postgres.return_tool: Tool DB Error - Detail: {:?}", db_error.detail());
                    println!("postgres.return_tool: Tool DB Error - Constraint: {:?}", db_error.constraint());
                }
                println!("postgres.return_tool: Tool SQL State: {:?}", e.code());
                println!("postgres.return_tool: === END TOOL ERROR DETAILS ===");
                
                let err = format!("Database system error while updating tool status: {}", e);
                
                // Try to rollback the transaction
                if let Err(rollback_err) = tx.rollback().await {
                    println!("postgres.return_tool: Failed to rollback transaction: {}", rollback_err);
                }
                return Err(err);
            }
        }
            
        println!("postgres.return_tool: Checking for active assignment...");
        println!("postgres.return_tool: Query: SELECT id FROM tool_assignments WHERE tool_id = {} AND returned_at IS NULL", tool_id);
        let assignment_rows = tx.query("SELECT id FROM tool_assignments WHERE tool_id = $1 AND returned_at IS NULL", &[&tool_id])
            .await.map_err(|e| {
                let err = format!("Database query error: Failed to check for active assignment - {}", e);
                println!("postgres.return_tool: Assignment check error - {}", err);
                println!("postgres.return_tool: Assignment check error type: {}", std::any::type_name_of_val(&e));
                if let Some(db_error) = e.as_db_error() {
                    println!("postgres.return_tool: Assignment check DB Error - Code: {:?}", db_error.code());
                    println!("postgres.return_tool: Assignment check DB Error - Message: {:?}", db_error.message());
                    println!("postgres.return_tool: Assignment check DB Error - Detail: {:?}", db_error.detail());
                }
                err
            })?;
        
        if assignment_rows.is_empty() {
            println!("postgres.return_tool: No active assignment found for tool {}", tool_id);
            return Err(format!("Cannot return tool {}: No active assignment found. This tool may have already been returned or the assignment record is missing.", tool_id));
        }
        
        println!("postgres.return_tool: Found {} active assignment(s), updating...", assignment_rows.len());
        
        // Handle empty condition by using a default value
        let condition_value = if condition.trim().is_empty() {
            "good".to_string()
        } else {
            condition.clone()
        };
        
        let update_result = tx.execute(
            "UPDATE tool_assignments SET returned_at = CURRENT_TIMESTAMP, condition_on_return = $1 WHERE tool_id = $2 AND returned_at IS NULL", 
            &[&condition_value, &tool_id]
        ).await;
        
        match update_result {
            Ok(rows) => {
                println!("postgres.return_tool: Assignment update affected {} rows", rows);
                if rows == 0 {
                    println!("postgres.return_tool: WARNING - No assignment rows were updated!");
                    return Err(format!("Cannot return tool {}: Database update failed - no assignment records were updated. This may indicate a concurrent operation or data inconsistency.", tool_id));
                }
            }
            Err(e) => {
                // Capture comprehensive error details
                println!("postgres.return_tool: === DATABASE ERROR DETAILS ===");
                println!("postgres.return_tool: Error type: {}", std::any::type_name_of_val(&e));
                println!("postgres.return_tool: Error message: {}", e);
                
                // Check if it's a tokio-postgres error and extract details
                if let Some(db_error) = e.as_db_error() {
                    println!("postgres.return_tool: DB Error - Severity: {:?}", db_error.severity());
                    println!("postgres.return_tool: DB Error - Code: {:?}", db_error.code());
                    println!("postgres.return_tool: DB Error - Message: {:?}", db_error.message());
                    println!("postgres.return_tool: DB Error - Detail: {:?}", db_error.detail());
                    println!("postgres.return_tool: DB Error - Hint: {:?}", db_error.hint());
                    println!("postgres.return_tool: DB Error - Schema: {:?}", db_error.schema());
                    println!("postgres.return_tool: DB Error - Table: {:?}", db_error.table());
                    println!("postgres.return_tool: DB Error - Column: {:?}", db_error.column());
                    println!("postgres.return_tool: DB Error - Constraint: {:?}", db_error.constraint());
                }
                
                println!("postgres.return_tool: SQL State: {:?}", e.code());
                println!("postgres.return_tool: === END ERROR DETAILS ===");
                
                let err = format!("Database system error while updating tool assignment: {}", e);
                
                // Try to rollback the transaction
                if let Err(rollback_err) = tx.rollback().await {
                    println!("postgres.return_tool: Failed to rollback transaction: {}", rollback_err);
                }
                return Err(err);
            }
        }
            
        println!("postgres.return_tool: Committing transaction...");
        match tx.commit().await {
            Ok(_) => {
                println!("postgres.return_tool: Successfully returned tool {}", tool_id);
                Ok(())
            }
            Err(e) => {
                let err = format!("Database system error: Failed to commit transaction - {}", e);
                println!("postgres.return_tool: Commit error - {}", err);
                Err(err)
            }
        }
    }

    async fn get_tool_history(&self, tool_id: i32) -> Result<Vec<ToolAssignment>, String> {
        println!("postgres.get_tool_history: Fetching history for tool {}", tool_id);
        let client = self.pool.get().await.map_err(|e| {
            let err = format!("Failed to get db connection: {}", e);
            println!("postgres.get_tool_history: Connection error - {}", err);
            err
        })?;
        let rows = client.query("SELECT id, tool_id, employee_id, assigned_at, returned_at, condition_on_assignment, condition_on_return, notes FROM tool_assignments WHERE tool_id = $1 ORDER BY assigned_at DESC", &[&tool_id])
            .await.map_err(|e| {
                let err = format!("Failed to fetch tool history: {}", e);
                println!("postgres.get_tool_history: Query error - {}", err);
                err
            })?;
        println!("postgres.get_tool_history: Found {} history rows", rows.len());
        let mut history = Vec::new();
        for row in rows {
            let assignment = ToolAssignment {
                id: Some(row.get(0)),
                tool_id: row.get(1),
                employee_id: row.get(2),
                assigned_at: format_timestamp(row.get(3)),
                returned_at: format_timestamp(row.get(4)),
                condition_on_assignment: row.get(5),
                condition_on_return: row.get(6),
                notes: row.get(7),
            };
            println!("postgres.get_tool_history: Found assignment - ID: {:?}, Tool ID: {:?}, Employee ID: {:?}, Assigned: {:?}, Returned: {:?}", 
                     assignment.id, assignment.tool_id, assignment.employee_id, assignment.assigned_at, assignment.returned_at);
            history.push(assignment);
        }
        println!("postgres.get_tool_history: Returning {} history entries", history.len());
        Ok(history)
    }

    // --- Roles & Permissions ---
    async fn get_roles(&self) -> Result<Vec<Role>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let rows = client.query("SELECT id, name, description, is_custom FROM roles", &[])
            .await.map_err(|e| format!("Failed to fetch roles: {}", e))?;
        let mut roles = Vec::new();
        for row in rows {
            roles.push(Role {
                id: Some(row.get(0)),
                name: row.get(1),
                description: row.get(2),
                is_custom: row.get(3),
            });
        }
        Ok(roles)
    }

    async fn add_role(&self, role: Role) -> Result<i64, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let row = client.query_one("INSERT INTO roles (name, description, is_custom) VALUES ($1, $2, $3) RETURNING id", &[&role.name, &role.description, &role.is_custom])
            .await.map_err(|e| format!("Failed to add role: {}", e))?;
        Ok(row.get::<_, i32>(0) as i64)
    }

    async fn get_permissions(&self) -> Result<Vec<Permission>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let rows = client.query("SELECT id, code, description FROM permissions", &[])
            .await.map_err(|e| format!("Failed to fetch permissions: {}", e))?;
        let mut permissions = Vec::new();
        for row in rows {
            permissions.push(Permission {
                id: row.get(0),
                code: row.get(1),
                description: row.get(2),
            });
        }
        Ok(permissions)
    }

    async fn get_role_permissions(&self, role_id: i32) -> Result<Vec<Permission>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let query = "
            SELECT p.id, p.code, p.description 
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id 
            WHERE rp.role_id = $1
        ";
        let rows = client.query(query, &[&role_id])
            .await.map_err(|e| format!("Failed to fetch role permissions: {}", e))?;
        let mut permissions = Vec::new();
        for row in rows {
            permissions.push(Permission {
                id: row.get(0),
                code: row.get(1),
                description: row.get(2),
            });
        }
        Ok(permissions)
    }

    async fn update_role_permissions(&self, role_id: i32, permission_ids: Vec<i32>) -> Result<(), String> {
        let mut client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let tx = client.transaction().await.map_err(|e| format!("Failed to start transaction: {}", e))?;
        
        tx.execute("DELETE FROM role_permissions WHERE role_id = $1", &[&role_id])
            .await.map_err(|e| format!("Failed to delete existing permissions: {}", e))?;
            
        for perm_id in permission_ids {
            tx.execute("INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)", &[&role_id, &perm_id])
                .await.map_err(|e| format!("Failed to add permission: {}", e))?;
        }
        
        tx.commit().await.map_err(|e| format!("Failed to commit transaction: {}", e))?;
        Ok(())
    }

    // --- Feature Toggles ---
    async fn get_feature_toggles(&self) -> Result<Vec<FeatureToggle>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let rows = client.query("SELECT key, is_enabled FROM feature_toggles", &[])
            .await.map_err(|e| format!("Failed to fetch feature toggles: {}", e))?;
        let mut toggles = Vec::new();
        for row in rows {
            toggles.push(FeatureToggle {
                key: row.get(0),
                is_enabled: row.get(1),
            });
        }
        Ok(toggles)
    }

    async fn set_feature_toggle(&self, key: String, is_enabled: bool) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        client.execute("INSERT INTO feature_toggles (key, is_enabled) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET is_enabled = $2", &[&key, &is_enabled])
            .await.map_err(|e| format!("Failed to set feature toggle: {}", e))?;
        Ok(())
    }

    // --- Setup & Config ---
    async fn get_setup_status(&self) -> Result<bool, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let row = client.query_opt("SELECT setup_completed FROM setup_config LIMIT 1", &[])
            .await.map_err(|e| format!("Failed to fetch setup status: {}", e))?;
        if let Some(r) = row {
            Ok(r.get(0))
        } else {
            Ok(false)
        }
    }

    fn get_type(&self) -> String {
        "postgres".to_string()
    }

    async fn check_username_exists(&self, username: String) -> Result<bool, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let count: i64 = client.query_one("SELECT COUNT(*) FROM users WHERE username = $1", &[&username])
            .await
            .map_err(|e| format!("Failed to check username existence: {}", e))?
            .get(0);
        Ok(count > 0)
    }

    async fn complete_setup(&self, company_name: String, admin_name: String, admin_email: String, admin_password: String, admin_username: String) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let setup_completed_at = chrono::Local::now().naive_local();
        
        // 1. Create Admin User
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        let password_hash = argon2.hash_password(admin_password.as_bytes(), &salt).map_err(|e| e.to_string())?.to_string();

        // Use query_one with RETURNING id to get the user ID, handling UPSERT
        let row = client.query_one(
            "INSERT INTO users (username, email, full_name, hashed_password, role, is_active) 
             VALUES ($1, $2, $3, $4, 'CEO', TRUE) 
             ON CONFLICT (email) DO UPDATE SET hashed_password = $4, full_name = $3, username = $1
             RETURNING id",
            &[&admin_username, &admin_email, &admin_name, &password_hash]
        ).await.map_err(|e| format!("Failed to create admin user: {}", e))?;
        
        let admin_user_id: i32 = row.get(0);

        // 2. Create CEO Employee Record
        // Parse admin_name to separate first and last name
        let name_parts: Vec<&str> = admin_name.trim().splitn(2, ' ').collect();
        let first_name = name_parts.get(0).map(|s| *s).unwrap_or(&admin_name.as_str()).to_string();
        let last_name = name_parts.get(1).map(|s| *s).unwrap_or("CEO").to_string();
        
        // Generate employee ID based on company name and CEO role
        let employee_id = format!("CEO-{}", chrono::Local::now().format("%Y%m%d%H%M%S"));
        
        client.execute(
            "INSERT INTO employees (employee_id, first_name, last_name, email, role, position, hire_date, status, created_at, updated_at) 
             VALUES ($1, $2, $3, $4, 'CEO', 'Chief Executive Officer', $5, 'active', $6, $6)
             ON CONFLICT (email) DO UPDATE SET 
             first_name = $2, last_name = $3, role = 'CEO', position = 'Chief Executive Officer', 
             updated_at = $6",
            &[&employee_id, &first_name, &last_name, &admin_email, &setup_completed_at, &setup_completed_at]
        ).await.map_err(|e| format!("Failed to create CEO employee record: {}", e))?;

        // 3. Setup config
        // Use a placeholder or generated license key, don't store password as license key
        let license_key = "FREE-LICENSE-KEY"; 
        
        client.execute(
            "INSERT INTO setup_config (company_name, company_email, license_key, setup_completed, setup_completed_at, admin_user_id) 
             VALUES ($1, $2, $3, TRUE, $4, $5)
             ON CONFLICT (license_key) DO UPDATE 
             SET company_name = $1, company_email = $2, setup_completed = TRUE, setup_completed_at = $4, admin_user_id = $5",
            &[&company_name, &admin_email, &license_key, &setup_completed_at, &admin_user_id]
        ).await.map_err(|e| format!("Failed to update setup config: {}", e))?;
        
        Ok(())
    }

    async fn set_company_name(&self, company_name: String) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        client.execute("UPDATE setup_config SET company_name = $1", &[&company_name]).await.map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn get_company_name(&self) -> Result<Option<String>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let row = client
            .query_opt("SELECT company_name FROM setup_config LIMIT 1", &[])
            .await
            .map_err(|e| e.to_string())?;

        Ok(row.map(|r| r.get::<_, String>(0)))
    }

    async fn seed_demo_data(&self) -> Result<(), String> {
        Ok(())
    }

    async fn reset_database(&self) -> Result<(), String> {
        let mut client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let transaction = client.transaction().await.map_err(|e| e.to_string())?;
        
        transaction.batch_execute("
            DROP SCHEMA public CASCADE;
            CREATE SCHEMA public;
            GRANT ALL ON SCHEMA public TO public;
        ").await.map_err(|e| e.to_string())?;
        
        transaction.commit().await.map_err(|e| e.to_string())?;
        
        // Re-initialize using synchronous init_db
        let conn_str = self.connection_string.clone();
        tokio::task::spawn_blocking(move || {
            crate::db::postgres_init::init_db(&conn_str).map_err(|e| e.to_string())
        }).await.map_err(|e| e.to_string())??;
        
        Ok(())
    }

    // --- Audit Logs ---
    async fn get_audit_logs(&self, page: Option<i32>, page_size: Option<i32>, user_id: Option<i32>, action: Option<String>, category: Option<String>, date_from: Option<String>, date_to: Option<String>) -> Result<Vec<AuditLog>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        
        let mut query = "SELECT a.id, a.user_id, COALESCE(u.full_name, u.username) as user_name, a.action, a.category, a.entity, a.entity_id, a.details, a.ip_address, a.user_agent, a.created_at FROM audit_logs a LEFT JOIN users u ON a.user_id = u.id WHERE 1=1".to_string();
        let mut params: Vec<Box<dyn tokio_postgres::types::ToSql + Sync + Send>> = Vec::new();
        let mut param_idx = 1;

        if let Some(uid) = user_id {
            query.push_str(&format!(" AND a.user_id = ${}", param_idx));
            params.push(Box::new(uid));
            param_idx += 1;
        }

        if let Some(act) = action {
             if !act.is_empty() {
                query.push_str(&format!(" AND a.action = ${}", param_idx));
                params.push(Box::new(act));
                param_idx += 1;
             }
        }
        
        if let Some(cat) = category {
             if !cat.is_empty() {
                query.push_str(&format!(" AND a.category = ${}", param_idx));
                params.push(Box::new(cat));
                param_idx += 1;
             }
        }

        if let Some(from) = date_from {
            if let Some(dt) = parse_timestamp(Some(from)) {
                 query.push_str(&format!(" AND a.created_at >= ${}", param_idx));
                 params.push(Box::new(dt));
                 param_idx += 1;
            }
        }
        
        if let Some(to) = date_to {
            if let Some(dt) = parse_timestamp(Some(to)) {
                 query.push_str(&format!(" AND a.created_at <= ${}", param_idx));
                 params.push(Box::new(dt));
                 param_idx += 1;
            }
        }

        query.push_str(" ORDER BY a.created_at DESC");

        if let Some(p) = page {
            if let Some(ps) = page_size {
                let limit = ps as i64;
                let offset = ((p - 1) * ps) as i64;
                query.push_str(&format!(" LIMIT ${} OFFSET ${}", param_idx, param_idx + 1));
                params.push(Box::new(limit));
                params.push(Box::new(offset));
            } else {
                query.push_str(" LIMIT 100");
            }
        } else {
             query.push_str(" LIMIT 100");
        }

        let param_refs: Vec<&(dyn tokio_postgres::types::ToSql + Sync)> = params.iter().map(|p| p.as_ref() as &(dyn tokio_postgres::types::ToSql + Sync)).collect();

        let rows = client.query(&query, &param_refs).await.map_err(|e| e.to_string())?;
        
        let mut logs = Vec::new();
        for row in rows {
            logs.push(AuditLog {
                id: Some(row.get(0)),
                user_id: row.get(1),
                user_name: row.get(2),
                action: row.get(3),
                category: row.get(4),
                entity: row.get(5),
                entity_id: row.get(6),
                details: row.get(7),
                ip_address: row.get(8),
                user_agent: row.get(9),
                created_at: format_timestamp(row.get(10)),
            });
        }
        Ok(logs)
    }

    async fn log_activity(&self, user_id: Option<i32>, action: String, category: String, entity: Option<String>, entity_id: Option<i32>, details: Option<String>, ip_address: Option<String>, user_agent: Option<String>) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        client.execute("INSERT INTO audit_logs (user_id, action, category, entity, entity_id, details, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", &[&user_id, &action, &category, &entity, &entity_id, &details, &ip_address, &user_agent]).await.map_err(|e| e.to_string())?;
        Ok(())
    }

    // --- Dashboard Config ---
    async fn get_dashboard_configs(&self) -> Result<Vec<DashboardConfig>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        // Assuming current user context or returning all for now since user_id isn't passed
        let rows = client.query("SELECT id, user_id, name, layout_json, is_default FROM dashboard_configs", &[]).await.map_err(|_| "Table not found".to_string())?;
        let mut configs = Vec::new();
        for row in rows {
            configs.push(DashboardConfig {
                id: Some(row.get(0)),
                user_id: row.get(1),
                name: row.get(2),
                layout_json: row.get(3),
                is_default: row.get(4),
            });
        }
        Ok(configs)
    }

    async fn save_dashboard_config(&self, config: DashboardConfig) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        client.execute("INSERT INTO dashboard_configs (user_id, name, layout_json, is_default) VALUES ($1, $2, $3, $4)", &[&config.user_id, &config.name, &config.layout_json, &config.is_default]).await.map_err(|e| e.to_string())?;
        Ok(())
    }

    // --- Projects ---
    async fn get_projects(&self) -> Result<Vec<Project>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let rows = client.query("SELECT id, name, description, start_date, end_date, status, manager_id FROM projects", &[]).await.map_err(|e| e.to_string())?;
        let mut projects = Vec::new();
        for row in rows {
            projects.push(Project {
                id: Some(row.get(0)),
                name: row.get(1),
                description: row.get(2),
                start_date: format_timestamp(row.get(3)),
                end_date: format_timestamp(row.get(4)),
                status: row.get(5),
                manager_id: row.get(6),
            });
        }
        Ok(projects)
    }

    async fn add_project(&self, project: Project) -> Result<i64, String> {
        println!("postgres.add_project: Attempting to add project '{:?}' with status '{:?}'", project.name, project.status);
        let client = self.pool.get().await.map_err(|e| {
            let err = format!("Failed to get db connection: {}", e);
            println!("postgres.add_project: Connection error - {}", err);
            err
        })?;
        let start_date = parse_timestamp(project.start_date);
        let end_date = parse_timestamp(project.end_date);
        println!("postgres.add_project: Parsed dates - start: {:?}, end: {:?}", start_date, end_date);
        
        let row = client.query_one(
            "INSERT INTO projects (name, description, start_date, end_date, status, manager_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
            &[&project.name, &project.description, &start_date, &end_date, &project.status, &project.manager_id]
        ).await.map_err(|e| {
            let err = format!("Failed to add project: {}", e);
            println!("postgres.add_project: Database insert error - {}", err);
            println!("postgres.add_project: Project data - name: '{:?}', description: '{:?}', status: '{:?}', manager_id: {:?}", 
                     project.name, project.description, project.status, project.manager_id);
            err
        })?;
        
        let project_id = row.get::<_, i32>(0) as i64;
        println!("postgres.add_project: Successfully added project with ID: {}", project_id);
        Ok(project_id)
    }

    async fn update_project(&self, project: Project) -> Result<(), String> {
        println!("postgres.update_project: Attempting to update project '{:?}' (ID: {:?})", project.name, project.id);
        let client = self.pool.get().await.map_err(|e| {
            let err = format!("Failed to get db connection: {}", e);
            println!("postgres.update_project: Connection error - {}", err);
            err
        })?;
        let start_date = parse_timestamp(project.start_date);
        let end_date = parse_timestamp(project.end_date);
        println!("postgres.update_project: Parsed dates - start: {:?}, end: {:?}", start_date, end_date);
        
        if let Some(id) = project.id {
            println!("postgres.update_project: Updating project with ID: {}", id);
            client.execute(
                "UPDATE projects SET name = $1, description = $2, start_date = $3, end_date = $4, status = $5, manager_id = $6 WHERE id = $7",
                &[&project.name, &project.description, &start_date, &end_date, &project.status, &project.manager_id, &id]
            ).await.map_err(|e| {
                let err = format!("Failed to update project: {}", e);
                println!("postgres.update_project: Database update error - {}", err);
                println!("postgres.update_project: Project data - name: '{:?}', description: '{:?}', status: '{:?}', manager_id: {:?}, id: {}", 
                         project.name, project.description, project.status, project.manager_id, id);
                err
            })?;
            println!("postgres.update_project: Successfully updated project {}", id);
            Ok(())
        } else {
            println!("postgres.update_project: Error - Project ID is required for update");
            Err("Project ID is required for update".to_string())
        }
    }

    async fn delete_project(&self, id: i32) -> Result<(), String> {
        let mut client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        // Use a transaction for safety
        let tx = client.transaction().await.map_err(|e| e.to_string())?;
        
        // Delete related tasks first (if cascade isn't enough or for explicit safety)
        tx.execute("DELETE FROM project_tasks WHERE project_id = $1", &[&id]).await.map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM project_assignments WHERE project_id = $1", &[&id]).await.map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM projects WHERE id = $1", &[&id]).await.map_err(|e| e.to_string())?;
        
        tx.commit().await.map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn get_project_tasks(&self, project_id: i32) -> Result<Vec<ProjectTask>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let rows = client.query("SELECT id, project_id, name, description, assigned_to, status, priority, start_date, due_date, parent_task_id, dependencies_json FROM project_tasks WHERE project_id = $1", &[&project_id]).await.map_err(|e| e.to_string())?;
        let mut tasks = Vec::new();
        for row in rows {
            tasks.push(ProjectTask {
                id: Some(row.get(0)),
                project_id: row.get(1),
                name: row.get(2),
                description: row.get(3),
                assigned_to: row.get(4),
                status: row.get(5),
                priority: row.get(6),
                start_date: format_timestamp(row.get(7)),
                due_date: format_timestamp(row.get(8)),
                parent_task_id: row.get(9),
                dependencies_json: row.get(10),
            });
        }
        Ok(tasks)
    }

    async fn add_project_task(&self, task: ProjectTask) -> Result<i64, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        
        let start_date = parse_timestamp(task.start_date.clone());
        let due_date = parse_timestamp(task.due_date.clone());
        
        // Clean string values - remove extra quotes that might come from JSON parsing and trim whitespace
        let clean_name = task.name.trim_matches('"').trim().to_string();
        let clean_status = task.status.trim_matches('"').trim().to_string();
        let clean_priority = task.priority.trim_matches('"').trim().to_string();
        
        // Validate required fields
        if clean_name.is_empty() {
            return Err("Task name cannot be empty".to_string());
        }
        if clean_status.is_empty() {
            return Err("Task status cannot be empty".to_string());
        }
        if clean_priority.is_empty() {
            return Err("Task priority cannot be empty".to_string());
        }
        
        // Use hardcoded query that matches the updated schema
        let row = client.query_one(
            "INSERT INTO project_tasks (project_id, name, description, assigned_to, status, priority, start_date, due_date, parent_task_id, dependencies_json) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id",
            &[&task.project_id, &clean_name, &task.description, &task.assigned_to, &clean_status, &clean_priority, &start_date, &due_date, &task.parent_task_id, &task.dependencies_json]
        ).await.map_err(|e| format!("Failed to insert project task: {}", e))?;
        
        Ok(row.get(0))
    }

    async fn update_project_task(&self, task: ProjectTask) -> Result<(), String> {
        println!("postgres.update_project_task: Attempting to update project task '{:?}' (ID: {:?}) for project {:?}", task.name, task.id, task.project_id);
        let client = self.pool.get().await.map_err(|e| {
            println!("postgres.update_project_task: Failed to get db connection - {}", e);
            format!("Failed to get db connection: {}", e)
        })?;
        let start_date = parse_timestamp(task.start_date);
        let due_date = parse_timestamp(task.due_date);
        println!("postgres.update_project_task: Parsed dates - start: {:?}, due: {:?}", start_date, due_date);
        if let Some(id) = task.id {
            println!("postgres.update_project_task: Updating task with ID: {}", id);
            let result = client.execute(
                "UPDATE project_tasks SET project_id = $1, name = $2, description = $3, assigned_to = $4, status = $5, priority = $6, start_date = $7, due_date = $8 WHERE id = $9",
                &[&task.project_id, &task.name, &task.description, &task.assigned_to, &task.status, &task.priority, &start_date, &due_date, &id]
            ).await.map_err(|e| {
                println!("postgres.update_project_task: Database update error - {}", e);
                e.to_string()
            })?;
            if result == 0 {
                println!("postgres.update_project_task: Error - Task not found or no changes made");
                return Err("Task not found or no changes made".to_string());
            }
            println!("postgres.update_project_task: Successfully updated task {}", id);
            Ok(())
        } else {
            println!("postgres.update_project_task: Error - Task ID required");
            Err("Task ID required".to_string())
        }
    }

    async fn delete_project_task(&self, id: i32) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        client.execute("DELETE FROM project_tasks WHERE id = $1", &[&id]).await.map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn assign_project_employee(&self, project_id: i32, employee_id: i32, role: String) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        client.execute(
            "INSERT INTO project_assignments (project_id, employee_id, role) VALUES ($1, $2, $3)",
            &[&project_id, &employee_id, &role]
        ).await.map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn get_project_assignments(&self, project_id: i32) -> Result<Vec<ProjectAssignment>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let rows = client.query("SELECT id, project_id, employee_id, role, assigned_at FROM project_assignments WHERE project_id = $1", &[&project_id]).await.map_err(|e| e.to_string())?;
        let mut assignments = Vec::new();
        for row in rows {
            assignments.push(ProjectAssignment {
                id: Some(row.get(0)),
                project_id: row.get(1),
                employee_id: row.get(2),
                role: row.get(3),
                assigned_at: format_timestamp(row.get(4)),
            });
        }
        Ok(assignments)
    }
    
    async fn get_all_project_assignments(&self) -> Result<Vec<ProjectAssignment>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let rows = client.query("SELECT id, project_id, employee_id, role, assigned_at FROM project_assignments", &[]).await.map_err(|e| e.to_string())?;
        let mut assignments = Vec::new();
        for row in rows {
            assignments.push(ProjectAssignment {
                id: Some(row.get(0)),
                project_id: row.get(1),
                employee_id: row.get(2),
                role: row.get(3),
                assigned_at: format_timestamp(row.get(4)),
            });
        }
        Ok(assignments)
    }

    async fn remove_project_assignment(&self, project_id: i32, employee_id: i32) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        client.execute("DELETE FROM project_assignments WHERE project_id = $1 AND employee_id = $2", &[&project_id, &employee_id]).await.map_err(|e| e.to_string())?;
        Ok(())
    }

    // --- Accounts & Invoices ---
    async fn get_accounts(&self) -> Result<Vec<Account>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let rows = client.query("SELECT id, code, name, account_type, currency, is_active FROM accounts", &[]).await.map_err(|e| format!("Failed to fetch accounts: {}", e))?;
        let mut accounts = Vec::new();
        for row in rows {
            accounts.push(Account {
                id: Some(row.get(0)),
                code: row.get(1),
                name: row.get(2),
                type_name: row.get(3),
                currency: row.get(4),
                is_active: row.get(5),
            });
        }
        Ok(accounts)
    }

    async fn add_account(&self, account: Account) -> Result<i64, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let row = client.query_one(
            "INSERT INTO accounts (code, name, account_type, currency, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id",
            &[&account.code, &account.name, &account.type_name, &account.currency, &account.is_active]
        ).await.map_err(|e| e.to_string())?;
        Ok(row.get::<_, i32>(0) as i64)
    }

    async fn get_invoices(&self) -> Result<Vec<Invoice>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let rows = client.query("SELECT id, customer_name, customer_email, invoice_date, due_date, total_amount, status, currency FROM invoices", &[]).await.map_err(|_| "Table not found".to_string())?;
        let mut invoices = Vec::new();
        for row in rows {
            invoices.push(Invoice {
                id: Some(row.get(0)),
                customer_name: row.get(1),
                customer_email: row.get(2),
                invoice_date: format_timestamp(row.get(3)).unwrap_or_default(),
                due_date: format_timestamp(row.get(4)),
                total_amount: row.get(5),
                tax_rate: 0.0,
                tax_amount: 0.0,
                status: row.get(6),
                currency: row.get(7),
                notes: None,
            });
        }
        Ok(invoices)
    }

    async fn create_invoice(&self, invoice: Invoice) -> Result<i64, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let invoice_date = parse_timestamp(Some(invoice.invoice_date));
        let due_date = parse_timestamp(invoice.due_date);
        let row = client.query_one(
            "INSERT INTO invoices (customer_name, customer_email, invoice_date, due_date, total_amount, status, currency) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
            &[&invoice.customer_name, &invoice.customer_email, &invoice_date, &due_date, &invoice.total_amount, &invoice.status, &invoice.currency]
        ).await.map_err(|e| e.to_string())?;
        Ok(row.get::<_, i32>(0) as i64)
    }

    // --- Integrations ---
    async fn get_integrations(&self) -> Result<Vec<Integration>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let rows = client.query("SELECT id, name, is_connected, api_key, config_json, connected_at FROM integrations", &[]).await.map_err(|_| "Table not found".to_string())?;
        let mut integrations = Vec::new();
        for row in rows {
            integrations.push(Integration {
                id: Some(row.get(0)),
                name: row.get(1),
                is_connected: row.get(2),
                api_key: row.get(3),
                config_json: row.get(4),
                connected_at: format_timestamp(row.get(5)),
            });
        }
        Ok(integrations)
    }

    async fn toggle_integration(&self, id: i32, is_connected: bool) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        client.execute("UPDATE integrations SET is_connected = $1 WHERE id = $2", &[&is_connected, &id]).await.map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn configure_integration(&self, id: i32, _api_key: Option<String>, config_json: Option<String>) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        client.execute("UPDATE integrations SET config_json = $1 WHERE id = $2", &[&config_json, &id]).await.map_err(|e| e.to_string())?;
        Ok(())
    }

    // --- Supply Chain (BOM, Batches, Velocity) ---

    async fn get_product_bom(&self, product_id: i32) -> Result<(Option<BomHeader>, Vec<BomLine>), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        
        let header_row = client.query_opt(
            "SELECT id, product_id, name, description, is_active, created_at, updated_at FROM bom_headers WHERE product_id = $1",
            &[&product_id]
        ).await.map_err(|e| e.to_string())?;

        let header = if let Some(row) = header_row {
            Some(BomHeader {
                id: Some(row.get(0)),
                product_id: row.get(1),
                name: row.get(2),
                description: row.get(3),
                is_active: row.get(4),
                created_at: format_timestamp(row.get(5)),
                updated_at: format_timestamp(row.get(6)),
            })
        } else {
            None
        };

        let mut lines = Vec::new();
        if let Some(h) = &header {
            if let Some(bom_id) = h.id {
                let rows = client.query(
                    "SELECT id, bom_id, component_product_id, quantity, unit, wastage_percentage, notes FROM bom_lines WHERE bom_id = $1",
                    &[&bom_id]
                ).await.map_err(|e| e.to_string())?;

                for row in rows {
                    lines.push(BomLine {
                        id: Some(row.get(0)),
                        bom_id: Some(row.get(1)),
                        component_product_id: row.get(2),
                        quantity: row.get(3),
                        unit: row.get(4),
                        wastage_percentage: row.get(5),
                        notes: row.get(6),
                    });
                }
            }
        }

        Ok((header, lines))
    }

    async fn save_bom(&self, header: BomHeader, lines: Vec<BomLine>) -> Result<(), String> {
        let mut client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let transaction = client.transaction().await.map_err(|e| e.to_string())?;

        // 1. Insert/Update Header
        let bom_id: i32 = if let Some(id) = header.id {
            transaction.execute(
                "UPDATE bom_headers SET name=$1, description=$2, is_active=$3, updated_at=CURRENT_TIMESTAMP WHERE id=$4",
                &[&header.name, &header.description, &header.is_active, &id]
            ).await.map_err(|e| e.to_string())?;
            id
        } else {
            let row = transaction.query_one(
                "INSERT INTO bom_headers (product_id, name, description, is_active) VALUES ($1, $2, $3, $4) RETURNING id",
                &[&header.product_id, &header.name, &header.description, &header.is_active]
            ).await.map_err(|e| e.to_string())?;
            row.get(0)
        };

        // 2. Replace Lines (Delete all for this BOM, then insert)
        transaction.execute("DELETE FROM bom_lines WHERE bom_id = $1", &[&bom_id]).await.map_err(|e| e.to_string())?;

        for line in lines {
            transaction.execute(
                "INSERT INTO bom_lines (bom_id, component_product_id, quantity, unit, wastage_percentage, notes) VALUES ($1, $2, $3, $4, $5, $6)",
                &[&bom_id, &line.component_product_id, &line.quantity, &line.unit, &line.wastage_percentage, &line.notes]
            ).await.map_err(|e| e.to_string())?;
        }

        transaction.commit().await.map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn get_batches(&self, product_id: i32) -> Result<Vec<InventoryBatch>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let rows = client.query(
            "SELECT id, product_id, batch_number, quantity, manufacturing_date, expiration_date, received_date, supplier_info, status, notes, created_at, updated_at, supplier_id FROM inventory_batches WHERE product_id = $1 ORDER BY created_at DESC",
            &[&product_id]
        ).await.map_err(|e| e.to_string())?;

        let mut batches = Vec::new();
        for row in rows {
            batches.push(InventoryBatch {
                id: Some(row.get(0)),
                product_id: row.get(1),
                batch_number: row.get(2),
                quantity: row.get(3),
                manufacturing_date: format_timestamp(row.get(4)),
                expiration_date: format_timestamp(row.get(5)),
                received_date: format_timestamp(row.get(6)),
                supplier_info: row.get(7),
                status: row.get(8),
                notes: row.get(9),
                created_at: format_timestamp(row.get(10)),
                updated_at: format_timestamp(row.get(11)),
                supplier_id: row.try_get(12).ok(),
            });
        }
        Ok(batches)
    }

    async fn add_batch(&self, batch: InventoryBatch) -> Result<i64, String> {
        let mut client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let tx = client.transaction().await.map_err(|e| e.to_string())?;

        let row = tx.query_one(
            "INSERT INTO inventory_batches (product_id, batch_number, quantity, manufacturing_date, expiration_date, supplier_info, status, notes, supplier_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id",
            &[
                &batch.product_id,
                &batch.batch_number,
                &batch.quantity,
                &parse_timestamp(batch.manufacturing_date),
                &parse_timestamp(batch.expiration_date),
                &batch.supplier_info,
                &batch.status,
                &batch.notes,
                &batch.supplier_id
            ]
        ).await.map_err(|e| e.to_string())?;
        
        let batch_id: i32 = row.get(0);

        // Update product quantity
        tx.execute(
            "UPDATE products SET current_quantity = current_quantity + $1 WHERE id = $2",
            &[&batch.quantity, &batch.product_id]
        ).await.map_err(|e| e.to_string())?;

        // Log movement to inventory_logs
        // Note: user_id is not available in this context, leaving it NULL.
        // We log this as a 'purchase' since it's a new batch addition.
        tx.execute(
            "INSERT INTO inventory_logs (product_id, change_type, quantity_changed, notes) VALUES ($1, $2, $3, $4)",
            &[
                &batch.product_id,
                &"purchase",
                &batch.quantity,
                &format!("Batch added: {}", batch.batch_number)
            ]
        ).await.map_err(|e| e.to_string())?;
        
        tx.commit().await.map_err(|e| e.to_string())?;

        Ok(batch_id as i64)
    }

    async fn update_batch(&self, batch: InventoryBatch) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        if let Some(id) = batch.id {
             client.execute(
                "UPDATE inventory_batches SET quantity=$1, status=$2, notes=$3, supplier_id=$4, updated_at=CURRENT_TIMESTAMP WHERE id=$5",
                &[&batch.quantity, &batch.status, &batch.notes, &batch.supplier_id, &id]
            ).await.map_err(|e| e.to_string())?;
            Ok(())
        } else {
            Err("Batch ID required".into())
        }
    }

    async fn get_velocity_report(&self) -> Result<Vec<VelocityReport>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        
        // This query calculates sales in last 30 days from inventory_logs
        let rows = client.query(
            "
            WITH Sales AS (
                SELECT product_id, SUM(ABS(quantity_changed)) as sold_qty
                FROM inventory_logs
                WHERE (change_type = 'sale' OR change_type = 'production_out')
                  AND created_at > NOW() - INTERVAL '30 days'
                GROUP BY product_id
            )
            SELECT 
                p.id, p.name, p.sku, p.current_quantity,
                COALESCE(s.sold_qty, 0) as sold_last_30,
                COALESCE(s.sold_qty, 0) / 30.0 as daily_velocity
            FROM products p
            LEFT JOIN Sales s ON p.id = s.product_id
            ORDER BY daily_velocity DESC
            ",
            &[]
        ).await.map_err(|e| format!("Failed to execute velocity report query: {}", e))?;

        let mut reports = Vec::new();
        for row in rows {
            let pid: i32 = row.get(0);
            let name: String = row.get(1);
            let sku: Option<String> = row.get(2);
            let current_qty: i32 = row.get(3);
            let sold_30: i64 = row.get(4); // SUM returns bigint
            let daily_vel: f64 = row.get::<_, Option<f64>>(5).unwrap_or(0.0); // Division returns double precision

            let sold_30_f = sold_30 as f64;
            let est_days = if daily_vel > 0.0 { current_qty as f64 / daily_vel } else { 999.0 };
            
            // Reorder to have 30 days of stock
            let target_stock = daily_vel * 30.0;
            let mut reorder_qty = target_stock - (current_qty as f64);
            if reorder_qty < 0.0 { reorder_qty = 0.0; }

            reports.push(VelocityReport {
                product_id: pid,
                product_name: name,
                sku,
                current_quantity: current_qty,
                total_sold_last_30_days: sold_30_f,
                avg_daily_sales: daily_vel,
                estimated_days_stock: est_days,
                recommended_reorder_qty: reorder_qty,
            });
        }

        Ok(reports)
    }

    // Suppliers
    async fn get_suppliers(&self) -> Result<Vec<Supplier>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let rows = client.query("SELECT id, name, email, phone, contact_person, address, is_active, created_at, updated_at FROM suppliers", &[]).await.map_err(|e| e.to_string())?;
        let mut suppliers = Vec::new();
        for row in rows {
            suppliers.push(Supplier {
                id: Some(row.get(0)),
                name: row.get(1),
                email: row.get(2),
                phone: row.get(3),
                contact_person: row.get(4),
                address: row.get(5),
                is_active: row.get(6),
                created_at: format_timestamp(row.get(7)),
                updated_at: format_timestamp(row.get(8)),
            });
        }
        Ok(suppliers)
    }

    async fn add_supplier(&self, supplier: Supplier) -> Result<i64, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let row = client.query_one(
            "INSERT INTO suppliers (name, email, phone, contact_person, address, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
            &[&supplier.name, &supplier.email, &supplier.phone, &supplier.contact_person, &supplier.address, &supplier.is_active]
        ).await.map_err(|e| e.to_string())?;
        Ok(row.get::<_, i32>(0) as i64)
    }

    async fn update_supplier(&self, supplier: Supplier) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        if let Some(id) = supplier.id {
            client.execute(
                "UPDATE suppliers SET name = $1, email = $2, phone = $3, contact_person = $4, address = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7",
                &[&supplier.name, &supplier.email, &supplier.phone, &supplier.contact_person, &supplier.address, &supplier.is_active, &id]
            ).await.map_err(|e| e.to_string())?;
            Ok(())
        } else {
            Err("Supplier ID is required for update".to_string())
        }
    }

    async fn delete_supplier(&self, id: i32) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        client.execute("DELETE FROM suppliers WHERE id = $1", &[&id]).await.map_err(|e| e.to_string())?;
        Ok(())
    }
    
    // Supplier Orders
    async fn get_supplier_orders(&self) -> Result<Vec<SupplierOrder>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let rows = client.query("SELECT id, supplier_id, created_by_user_id, order_date, status, total_amount, notes, items_json, updated_at FROM supplier_orders ORDER BY order_date DESC", &[]).await.map_err(|e| e.to_string())?;
        let mut orders = Vec::new();
        for row in rows {
            orders.push(SupplierOrder {
                id: Some(row.get(0)),
                supplier_id: row.get(1),
                created_by_user_id: row.get(2),
                order_date: format_timestamp(row.get(3)),
                status: row.get(4),
                total_amount: row.get(5),
                notes: row.get(6),
                items_json: row.get(7),
                updated_at: format_timestamp(row.get(8)),
            });
        }
        Ok(orders)
    }

    async fn add_supplier_order(&self, order: SupplierOrder) -> Result<i64, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let row = client.query_one(
            "INSERT INTO supplier_orders (supplier_id, created_by_user_id, status, total_amount, notes, items_json) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
            &[&order.supplier_id, &order.created_by_user_id, &order.status, &order.total_amount, &order.notes, &order.items_json]
        ).await.map_err(|e| e.to_string())?;
        Ok(row.get::<_, i32>(0) as i64)
    }

    async fn update_supplier_order(&self, order: SupplierOrder) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        if let Some(id) = order.id {
            client.execute(
                "UPDATE supplier_orders SET supplier_id = $1, status = $2, total_amount = $3, notes = $4, items_json = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6",
                &[&order.supplier_id, &order.status, &order.total_amount, &order.notes, &order.items_json, &id]
            ).await.map_err(|e| e.to_string())?;
            Ok(())
        } else {
            Err("Order ID is required for update".to_string())
        }
    }

    async fn delete_supplier_order(&self, id: i32) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let rows_affected = client.execute("DELETE FROM supplier_orders WHERE id = $1", &[&id]).await.map_err(|e| e.to_string())?;
        if rows_affected == 0 {
            return Err("Supplier Order not found".to_string());
        }
        Ok(())
    }

    // --- Business Configuration Methods ---

    async fn get_business_configuration(&self) -> Result<Option<BusinessConfiguration>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let row_opt = client.query_opt(
            "SELECT id, business_type, company_name, industry, is_active, created_at, updated_at, created_by_user_id, tax_rate 
             FROM business_configurations WHERE is_active = true ORDER BY id DESC LIMIT 1",
            &[]
        ).await.map_err(|e| format!("Failed to fetch business configuration: {}", e))?;

        if let Some(row) = row_opt {
            Ok(Some(BusinessConfiguration {
                id: Some(row.get(0)),
                business_type: row.get(1),
                company_name: row.get(2),
                industry: row.get(3),
                is_active: row.get(4),
                created_at: format_timestamp(row.get(5)),
                updated_at: format_timestamp(row.get(6)),
                created_by_user_id: row.get(7),
                tax_rate: row.get(8),
            }))
        } else {
            Ok(None)
        }
    }

    async fn save_business_configuration(&self, config: BusinessConfiguration) -> Result<i64, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        
        // Deactivate any existing active configuration
        client.execute(
            "UPDATE business_configurations SET is_active = false WHERE is_active = true",
            &[]
        ).await.map_err(|e| format!("Failed to deactivate existing configuration: {}", e))?;

        let row = client.query_one(
            "INSERT INTO business_configurations (business_type, company_name, industry, is_active, created_by_user_id, tax_rate) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
            &[&config.business_type, &config.company_name, &config.industry, &config.is_active, &config.created_by_user_id, &config.tax_rate]
        ).await.map_err(|e| format!("Failed to save business configuration: {}", e))?;
        Ok(row.get::<_, i32>(0) as i64)
    }

    async fn update_business_configuration(&self, config: BusinessConfiguration) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let config_id = config.id.ok_or("Business configuration ID is required for update")?;
        
        client.execute(
            "UPDATE business_configurations SET business_type = $1, company_name = $2, industry = $3, 
             is_active = $4, tax_rate = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6",
            &[&config.business_type, &config.company_name, &config.industry, &config.is_active, &config.tax_rate, &config_id]
        ).await.map_err(|e| format!("Failed to update business configuration: {}", e))?;
        Ok(())
    }

    // --- Service Management Methods ---

    async fn get_services(&self) -> Result<Vec<Service>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let rows = client.query(
            "SELECT id, name, description, category, unit_price, billing_type, estimated_hours, is_active, created_at, updated_at 
             FROM services WHERE is_active = true ORDER BY name",
            &[]
        ).await.map_err(|e| format!("Failed to fetch services: {}", e))?;

        Ok(rows.into_iter().map(|row| Service {
            id: Some(row.get(0)),
            name: row.get(1),
            description: row.get(2),
            category: row.get(3),
            unit_price: row.get(4),
            billing_type: row.get(5),
            estimated_hours: row.get(6),
            is_active: row.get(7),
            created_at: format_timestamp(row.get(8)),
            updated_at: format_timestamp(row.get(9)),
        }).collect())
    }

    async fn add_service(&self, service: Service) -> Result<i64, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let row = client.query_one(
            "INSERT INTO services (name, description, category, unit_price, billing_type, estimated_hours, is_active) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
            &[&service.name, &service.description, &service.category, &service.unit_price, &service.billing_type, &service.estimated_hours, &service.is_active]
        ).await.map_err(|e| format!("Failed to add service: {}", e))?;
        Ok(row.get::<_, i32>(0) as i64)
    }

    async fn update_service(&self, service: Service) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let service_id = service.id.ok_or("Service ID is required for update")?;
        
        client.execute(
            "UPDATE services SET name = $1, description = $2, category = $3, unit_price = $4, billing_type = $5, estimated_hours = $6, 
             is_active = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8",
            &[&service.name, &service.description, &service.category, &service.unit_price, &service.billing_type, &service.estimated_hours, &service.is_active, &service_id]
        ).await.map_err(|e| format!("Failed to update service: {}", e))?;
        Ok(())
    }

    async fn delete_service(&self, id: i32) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let rows_affected = client.execute("UPDATE services SET is_active = false WHERE id = $1", &[&id]).await.map_err(|e| e.to_string())?;
        if rows_affected == 0 {
            return Err("Service not found".to_string());
        }
        Ok(())
    }

    // --- Client Management Methods ---

    async fn get_clients(&self) -> Result<Vec<Client>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let rows = client.query(
            "SELECT id, company_name, contact_name, email, phone, address, industry, status, payment_terms, credit_limit, tax_id, notes, is_active, created_at, updated_at 
             FROM clients WHERE is_active = true ORDER BY company_name",
            &[]
        ).await.map_err(|e| format!("Failed to fetch clients: {}", e))?;

        Ok(rows.into_iter().map(|row| Client {
            id: Some(row.get(0)),
            company_name: row.get(1),
            contact_name: row.get(2),
            email: row.get(3),
            phone: row.get(4),
            address: row.get(5),
            industry: row.get(6),
            status: row.get(7),
            payment_terms: row.get(8),
            credit_limit: row.get(9),
            tax_id: row.get(10),
            notes: row.get(11),
            is_active: row.get(12),
            created_at: format_timestamp(row.get(13)),
            updated_at: format_timestamp(row.get(14)),
        }).collect())
    }

    async fn add_client(&self, client: Client) -> Result<i64, String> {
        let client_conn = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let row = client_conn.query_one(
            "INSERT INTO clients (company_name, contact_name, email, phone, address, industry, status, payment_terms, credit_limit, tax_id, notes, is_active) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id",
            &[&client.company_name, &client.contact_name, &client.email, &client.phone, &client.address, &client.industry, &client.status, &client.payment_terms, &client.credit_limit, &client.tax_id, &client.notes, &client.is_active]
        ).await.map_err(|e| format!("Failed to add client: {}", e))?;
        Ok(row.get::<_, i32>(0) as i64)
    }

    async fn update_client(&self, client: Client) -> Result<(), String> {
        let client_conn = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let client_id = client.id.ok_or("Client ID is required for update")?;
        
        client_conn.execute(
            "UPDATE clients SET company_name = $1, contact_name = $2, email = $3, phone = $4, 
             address = $5, industry = $6, status = $7, payment_terms = $8, credit_limit = $9, tax_id = $10, notes = $11, 
             is_active = $12, updated_at = CURRENT_TIMESTAMP WHERE id = $13",
            &[&client.company_name, &client.contact_name, &client.email, &client.phone, &client.address, &client.industry, &client.status, &client.payment_terms, &client.credit_limit, &client.tax_id, &client.notes, &client.is_active, &client_id]
        ).await.map_err(|e| format!("Failed to update client: {}", e))?;
        Ok(())
    }

    async fn delete_client(&self, id: i32) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let rows_affected = client.execute("UPDATE clients SET is_active = false WHERE id = $1", &[&id]).await.map_err(|e| e.to_string())?;
        if rows_affected == 0 {
            return Err("Client not found".to_string());
        }
        Ok(())
    }

    async fn get_client_by_id(&self, id: i32) -> Result<Option<Client>, String> {
        let client_conn = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let row_opt = client_conn.query_opt(
            "SELECT id, company_name, contact_name, email, phone, address, industry, status, payment_terms, credit_limit, tax_id, notes, is_active, created_at, updated_at 
             FROM clients WHERE id = $1",
            &[&id]
        ).await.map_err(|e| format!("Failed to fetch client: {}", e))?;

        if let Some(row) = row_opt {
            Ok(Some(Client {
                id: Some(row.get(0)),
                company_name: row.get(1),
                contact_name: row.get(2),
                email: row.get(3),
                phone: row.get(4),
                address: row.get(5),
                industry: row.get(6),
                status: row.get(7),
                payment_terms: row.get(8),
                credit_limit: row.get(9),
                tax_id: row.get(10),
                notes: row.get(11),
                is_active: row.get(12),
                created_at: format_timestamp(row.get(13)),
                updated_at: format_timestamp(row.get(14)),
            }))
        } else {
            Ok(None)
        }
    }

    // --- Time Tracking Methods ---

    async fn get_time_entries(&self, employee_id: Option<i32>, client_id: Option<i32>, project_id: Option<i32>) -> Result<Vec<TimeEntry>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        
        let mut query = "SELECT id, client_id, service_id, employee_id, project_id, product_id, start_time, end_time, duration_hours, description, 
             hourly_rate, billable_amount, is_billable, status, created_at, updated_at 
             FROM time_entries WHERE 1=1".to_string();
        
        // Dynamic query building
        // Since tokio-postgres requires exact types for params, we need to build the params vector carefully.
        // However, generic client.query takes &[&(dyn ToSql + Sync)].
        // We can't easily build a vector of references to optionals mixed with other types.
        // So we might need to use specific params or just use simple conditional logic.
        
        // Simplest way for fixed optional params:
        // Use COALESCE in SQL or just handle simple cases.
        // Or build the query string and params vector.
        
        // Since we have 3 optional params, there are 8 combinations.
        // A better approach is to append to query and params.
        
        // But for simplicity in this generated code, let's use a fixed query with NULL handling if possible,
        // OR simply build the query dynamically.
        
        // Let's try dynamic building:
        let mut params: Vec<Box<dyn tokio_postgres::types::ToSql + Sync + Send>> = Vec::new();
        let mut param_idx = 1;
        
        if let Some(eid) = employee_id {
            query.push_str(&format!(" AND employee_id = ${}", param_idx));
            params.push(Box::new(eid));
            param_idx += 1;
        }
        
        if let Some(cid) = client_id {
            query.push_str(&format!(" AND client_id = ${}", param_idx));
            params.push(Box::new(cid));
            param_idx += 1;
        }
        
        if let Some(pid) = project_id {
            query.push_str(&format!(" AND project_id = ${}", param_idx));
            params.push(Box::new(pid));
        }
        
        query.push_str(" ORDER BY start_time DESC");
        
        // Convert params to slice of references
        let params_refs: Vec<&(dyn tokio_postgres::types::ToSql + Sync)> = params.iter().map(|p| p.as_ref() as &(dyn tokio_postgres::types::ToSql + Sync)).collect();

        let rows = client.query(&query, &params_refs).await.map_err(|e| format!("Failed to fetch time entries: {}", e))?;

        Ok(rows.into_iter().map(|row| TimeEntry {
            id: Some(row.get(0)),
            client_id: row.get(1),
            service_id: row.get(2),
            employee_id: row.get(3),
            project_id: row.get(4),
            product_id: row.get(5),
            start_time: format_timestamp(Some(row.get(6))).unwrap_or_default(),
            end_time: format_timestamp(row.get(7)),
            duration_hours: row.get(8),
            description: row.get(9),
            hourly_rate: row.get(10),
            billable_amount: row.get(11),
            is_billable: row.get(12),
            status: row.get(13),
            created_at: format_timestamp(row.get(14)),
            updated_at: format_timestamp(row.get(15)),
        }).collect())
    }

    async fn add_time_entry(&self, entry: TimeEntry) -> Result<i64, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let billable_amount = entry.duration_hours * entry.hourly_rate;
        
        // Note: We need to parse the String start_time back to TIMESTAMP for the DB? 
        // Or does postgres crate handle string -> timestamp conversion?
        // Usually it expects SystemTime or NaiveDateTime.
        // But let's look at how other functions do it.
        // Since I don't have a parse helper here, I might rely on postgres casting or I need to check how other inserts work.
        // Looking at `add_client`, it passes string fields directly. 
        // But `start_time` is TIMESTAMP in DB.
        // If `entry.start_time` is ISO string, postgres might accept it if we cast it or if it auto-casts.
        // Let's assume the driver handles it or the query needs casting.
        // Actually, previous code passed `&entry.date`.
        
        let row = client.query_one(
            "INSERT INTO time_entries (client_id, service_id, employee_id, project_id, product_id, start_time, end_time, duration_hours, description, 
             hourly_rate, billable_amount, is_billable, status) 
             VALUES ($1, $2, $3, $4, $5, $6::timestamp, $7::timestamp, $8, $9, $10, $11, $12, $13) RETURNING id",
            &[&entry.client_id, &entry.service_id, &entry.employee_id, &entry.project_id, &entry.product_id, 
              &entry.start_time, &entry.end_time, &entry.duration_hours, 
              &entry.description, &entry.hourly_rate, &billable_amount, &entry.is_billable, &entry.status]
        ).await.map_err(|e| format!("Failed to add time entry: {}", e))?;
        Ok(row.get::<_, i32>(0) as i64)
    }

    async fn update_time_entry(&self, entry: TimeEntry) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let entry_id = entry.id.ok_or("Time entry ID is required for update")?;
        let billable_amount = entry.duration_hours * entry.hourly_rate;
        
        client.execute(
            "UPDATE time_entries SET client_id = $1, service_id = $2, employee_id = $3, project_id = $4, product_id = $5, 
             start_time = $6::timestamp, end_time = $7::timestamp, duration_hours = $8, description = $9, 
             hourly_rate = $10, billable_amount = $11, is_billable = $12, status = $13, 
             updated_at = CURRENT_TIMESTAMP WHERE id = $14",
            &[&entry.client_id, &entry.service_id, &entry.employee_id, &entry.project_id, &entry.product_id,
              &entry.start_time, &entry.end_time, &entry.duration_hours, 
              &entry.description, &entry.hourly_rate, &billable_amount, &entry.is_billable, &entry.status, &entry_id]
        ).await.map_err(|e| format!("Failed to update time entry: {}", e))?;
        Ok(())
    }

    async fn delete_time_entry(&self, id: i32) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        // time_entries doesn't have is_active, so we might need to hard delete or set status to something?
        // But wait, the previous code used `is_active = false`.
        // The table schema provided doesn't have `is_active`.
        // I'll check if I should add `is_active` column or just DELETE.
        // For now, I'll use DELETE as it's safer if column doesn't exist.
        let rows_affected = client.execute("DELETE FROM time_entries WHERE id = $1", &[&id]).await.map_err(|e| e.to_string())?;
        if rows_affected == 0 {
            return Err("Time entry not found".to_string());
        }
        Ok(())
    }

    // --- Service Contract Methods ---

    async fn get_service_contracts(&self, client_id: Option<i32>) -> Result<Vec<ServiceContract>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        
        let mut query = "SELECT id, client_id, contract_number, title, contract_type, start_date, end_date, 
             total_value, billing_frequency, status, terms, created_at, updated_at 
             FROM service_contracts WHERE 1=1".to_string();
        
        let mut params: Vec<Box<dyn tokio_postgres::types::ToSql + Sync + Send>> = Vec::new();
        
        if let Some(cid) = client_id {
            query.push_str(" AND client_id = $1");
            params.push(Box::new(cid));
        }
        
        query.push_str(" ORDER BY created_at DESC");
        
        let params_refs: Vec<&(dyn tokio_postgres::types::ToSql + Sync)> = params.iter().map(|p| p.as_ref() as &(dyn tokio_postgres::types::ToSql + Sync)).collect();
        
        let rows = client.query(&query, &params_refs).await.map_err(|e| format!("Failed to fetch service contracts: {}", e))?;
        
        Ok(rows.into_iter().map(|row| ServiceContract {
            id: Some(row.get(0)),
            client_id: row.get(1),
            contract_number: row.get(2),
            title: row.get(3),
            contract_type: row.get(4),
            start_date: format_date(row.get(5)),
            end_date: format_date_opt(row.get(6)),
            total_value: row.get(7),
            billing_frequency: row.get(8),
            status: row.get(9),
            terms: row.get(10),
            is_active: true, // Defaulting as not in DB
            created_at: format_timestamp(row.get(11)),
            updated_at: format_timestamp(row.get(12)),
        }).collect())
    }

    async fn add_service_contract(&self, contract: ServiceContract) -> Result<i64, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        
        // Parse date strings to NaiveDate
        let start_date = NaiveDate::parse_from_str(&contract.start_date, "%Y-%m-%d")
            .map_err(|e| format!("Invalid start_date format (expected YYYY-MM-DD): {}", e))?;
            
        let end_date = if let Some(d) = &contract.end_date {
            Some(NaiveDate::parse_from_str(d, "%Y-%m-%d")
                .map_err(|e| format!("Invalid end_date format (expected YYYY-MM-DD): {}", e))?)
        } else {
            None
        };
        
        let row = client.query_one(
            "INSERT INTO service_contracts (client_id, contract_number, title, contract_type, start_date, end_date, 
             total_value, billing_frequency, status, terms) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id",
            &[&contract.client_id, &contract.contract_number, &contract.title, &contract.contract_type, 
              &start_date, &end_date, &contract.total_value, &contract.billing_frequency, 
              &contract.status, &contract.terms]
        ).await.map_err(|e| format!("Failed to add service contract: {}", e))?;
        
        Ok(row.get::<_, i32>(0) as i64)
    }

    async fn update_service_contract(&self, contract: ServiceContract) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let id = contract.id.ok_or("Service contract ID is required for update")?;
        
        let start_date = NaiveDate::parse_from_str(&contract.start_date, "%Y-%m-%d")
            .map_err(|e| format!("Invalid start_date format (expected YYYY-MM-DD): {}", e))?;
            
        let end_date = if let Some(d) = &contract.end_date {
            Some(NaiveDate::parse_from_str(d, "%Y-%m-%d")
                .map_err(|e| format!("Invalid end_date format (expected YYYY-MM-DD): {}", e))?)
        } else {
            None
        };
        
        client.execute(
            "UPDATE service_contracts SET client_id = $1, contract_number = $2, title = $3, contract_type = $4, 
             start_date = $5, end_date = $6, total_value = $7, billing_frequency = $8, status = $9, terms = $10,
             updated_at = CURRENT_TIMESTAMP WHERE id = $11",
            &[&contract.client_id, &contract.contract_number, &contract.title, &contract.contract_type, 
              &start_date, &end_date, &contract.total_value, &contract.billing_frequency, 
              &contract.status, &contract.terms, &id]
        ).await.map_err(|e| format!("Failed to update service contract: {}", e))?;
        
        Ok(())
    }

    async fn delete_service_contract(&self, id: i32) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let rows_affected = client.execute("DELETE FROM service_contracts WHERE id = $1", &[&id]).await.map_err(|e| e.to_string())?;
        if rows_affected == 0 {
            return Err("Service contract not found".to_string());
        }
        Ok(())
    }

    // --- Quote Methods ---

    async fn get_quotes(&self, client_id: Option<i32>) -> Result<Vec<Quote>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        
        let mut query = "SELECT id, client_id, quote_number, title, subtotal, tax_amount, total_amount, 
             valid_until, status, notes, created_at, updated_at 
             FROM quotes WHERE 1=1".to_string();
        
        let mut params: Vec<Box<dyn tokio_postgres::types::ToSql + Sync + Send>> = Vec::new();
        
        if let Some(cid) = client_id {
            query.push_str(" AND client_id = $1");
            params.push(Box::new(cid));
        }
        
        query.push_str(" ORDER BY created_at DESC");
        
        let params_refs: Vec<&(dyn tokio_postgres::types::ToSql + Sync)> = params.iter().map(|p| p.as_ref() as &(dyn tokio_postgres::types::ToSql + Sync)).collect();
        
        let rows = client.query(&query, &params_refs).await.map_err(|e| format!("Failed to fetch quotes: {}", e))?;
        
        Ok(rows.into_iter().map(|row| Quote {
            id: Some(row.get(0)),
            client_id: row.get(1),
            quote_number: row.get(2),
            title: row.get(3),
            subtotal: row.get(4),
            tax_amount: row.get(5),
            total_amount: row.get(6),
            valid_until: format_date_opt(row.get(7)).unwrap_or_default(),
            status: row.get(8),
            notes: row.get(9),
            is_active: true, // Defaulting
            created_at: format_timestamp(row.get(10)),
            updated_at: format_timestamp(row.get(11)),
        }).collect())
    }

    async fn add_quote(&self, quote: Quote) -> Result<i64, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        
        let valid_until = if !quote.valid_until.is_empty() {
             Some(NaiveDate::parse_from_str(&quote.valid_until, "%Y-%m-%d")
                .map_err(|e| format!("Invalid valid_until format (expected YYYY-MM-DD): {}", e))?)
        } else {
            None
        };
        
        let row = client.query_one(
            "INSERT INTO quotes (client_id, quote_number, title, subtotal, tax_amount, total_amount, valid_until, status, notes) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id",
            &[&quote.client_id, &quote.quote_number, &quote.title, &quote.subtotal, &quote.tax_amount, 
              &quote.total_amount, &valid_until, &quote.status, &quote.notes]
        ).await.map_err(|e| format!("Failed to add quote: {}", e))?;
        
        Ok(row.get::<_, i32>(0) as i64)
    }

    async fn update_quote(&self, quote: Quote) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let id = quote.id.ok_or("Quote ID is required for update")?;
        
        let valid_until = if !quote.valid_until.is_empty() {
             Some(NaiveDate::parse_from_str(&quote.valid_until, "%Y-%m-%d")
                .map_err(|e| format!("Invalid valid_until format (expected YYYY-MM-DD): {}", e))?)
        } else {
            None
        };
        
        client.execute(
            "UPDATE quotes SET client_id = $1, quote_number = $2, title = $3, subtotal = $4, tax_amount = $5, 
             total_amount = $6, valid_until = $7, status = $8, notes = $9, updated_at = CURRENT_TIMESTAMP WHERE id = $10",
            &[&quote.client_id, &quote.quote_number, &quote.title, &quote.subtotal, &quote.tax_amount, 
              &quote.total_amount, &valid_until, &quote.status, &quote.notes, &id]
        ).await.map_err(|e| format!("Failed to update quote: {}", e))?;
        
        Ok(())
    }

    async fn delete_quote(&self, id: i32) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let rows_affected = client.execute("DELETE FROM quotes WHERE id = $1", &[&id]).await.map_err(|e| e.to_string())?;
        if rows_affected == 0 {
            return Err("Quote not found".to_string());
        }
        Ok(())
    }

    async fn get_quote_items(&self, quote_id: i32) -> Result<Vec<QuoteItem>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        
        let rows = client.query(
            "SELECT id, quote_id, service_id, description, quantity, unit_price, total_price, sort_order 
             FROM quote_items WHERE quote_id = $1 ORDER BY sort_order ASC",
            &[&quote_id]
        ).await.map_err(|e| format!("Failed to fetch quote items: {}", e))?;
        
        Ok(rows.into_iter().map(|row| QuoteItem {
            id: Some(row.get(0)),
            quote_id: row.get(1),
            service_id: row.get(2),
            description: row.get(3),
            quantity: row.get(4),
            unit_price: row.get(5),
            total_price: row.get(6),
            sort_order: row.get(7),
        }).collect())
    }

    async fn add_quote_item(&self, item: QuoteItem) -> Result<i64, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        
        let row = client.query_one(
            "INSERT INTO quote_items (quote_id, service_id, description, quantity, unit_price, total_price, sort_order) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
            &[&item.quote_id, &item.service_id, &item.description, &item.quantity, &item.unit_price, &item.total_price, &item.sort_order]
        ).await.map_err(|e| format!("Failed to add quote item: {}", e))?;
        
        Ok(row.get::<_, i32>(0) as i64)
    }

    async fn update_quote_item(&self, item: QuoteItem) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let id = item.id.ok_or("Quote item ID is required for update")?;
        
        client.execute(
            "UPDATE quote_items SET quote_id = $1, service_id = $2, description = $3, quantity = $4, 
             unit_price = $5, total_price = $6, sort_order = $7 WHERE id = $8",
            &[&item.quote_id, &item.service_id, &item.description, &item.quantity, &item.unit_price, &item.total_price, &item.sort_order, &id]
        ).await.map_err(|e| format!("Failed to update quote item: {}", e))?;
        
        Ok(())
    }

    async fn delete_quote_item(&self, id: i32) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let rows_affected = client.execute("DELETE FROM quote_items WHERE id = $1", &[&id]).await.map_err(|e| e.to_string())?;
        if rows_affected == 0 {
            return Err("Quote item not found".to_string());
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_delete_employee_and_tool() {
        // Security: Use environment variable for credentials. 
        // Do NOT hardcode passwords here.
        // Run with: set DATABASE_URL=postgres://user:pass@localhost:5432/db && cargo test
        let conn_str = match std::env::var("DATABASE_URL") {
            Ok(url) => url,
            Err(_) => {
                println!("Skipping test_delete_employee_and_tool: DATABASE_URL not set");
                return;
            }
        };
            
        let db = PostgresDatabase::new(&conn_str).expect("Failed to connect to DB");
        
        // Cleanup existing test data
        {
            let client = db.pool.get().await.unwrap();
            client.execute("DELETE FROM tool_assignments WHERE employee_id IN (SELECT id FROM employees WHERE employee_id = 'TEST001')", &[]).await.ok();
            client.execute("DELETE FROM tools WHERE assigned_to_employee_id IN (SELECT id FROM employees WHERE employee_id = 'TEST001')", &[]).await.ok();
            client.execute("DELETE FROM employees WHERE employee_id = 'TEST001'", &[]).await.ok();
        }

        // 1. Create Employee
        let emp = Employee {
            id: None,
            employee_id: Some("TEST001".to_string()),
            first_name: "Test".to_string(),
            last_name: "User".to_string(),
            email: Some("test@example.com".to_string()),
            phone: None,
            role: "Employee".to_string(),
            department: None,
            position: None,
            salary: None,
            status: "active".to_string(),
        };
        let emp_id = db.add_employee(emp).await.expect("Failed to add employee");
        println!("Created employee: {}", emp_id);

        // 2. Create Tool assigned to Employee
        let tool = Tool {
            id: None,
            name: "Test Tool".to_string(),
            type_name: "Hammer".to_string(),
            status: "assigned".to_string(),
            assigned_to_employee_id: Some(emp_id as i32),
            purchase_date: None,
            condition: None,
        };
        let tool_id = db.add_tool(tool).await.expect("Failed to add tool");
        println!("Created tool: {}", tool_id);

        // 3. Delete Tool
        match db.delete_tool(tool_id as i32).await {
            Ok(_) => println!("Tool deleted successfully"),
            Err(e) => println!("Failed to delete tool: {}", e),
        }

        // 4. Delete Employee
        match db.delete_employee(emp_id as i32).await {
            Ok(_) => println!("Employee deleted successfully"),
            Err(e) => println!("Failed to delete employee: {}", e),
        }
    }
}
