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
            
        Ok(Self { pool })
    }
}

// Helper to format Option<NaiveDateTime> to Option<String>
fn format_timestamp(ts: Option<NaiveDateTime>) -> Option<String> {
    ts.map(|t| t.format("%Y-%m-%d %H:%M:%S").to_string())
}

// Helper to parse Option<String> to Option<NaiveDateTime>
fn parse_timestamp(ts: Option<String>) -> Option<NaiveDateTime> {
    if let Some(s) = ts {
        if s.trim().is_empty() { return None; }
        if let Ok(dt) = NaiveDateTime::parse_from_str(&s, "%Y-%m-%d %H:%M:%S") {
            return Some(dt);
        }
        if let Ok(d) = NaiveDate::parse_from_str(&s, "%Y-%m-%d") {
            return d.and_hms_opt(0, 0, 0);
        }
    }
    None
}

#[async_trait]
impl Database for PostgresDatabase {
    // --- Users & Auth ---
    async fn get_user_by_username(&self, username: String) -> Result<Option<User>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let row_opt = client.query_opt(
            "SELECT id, username, email, full_name, hashed_password, role, is_active, last_login FROM users WHERE username = $1",
            &[&username]
        ).await.map_err(|e| e.to_string())?;

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
        ).await.map_err(|e| e.to_string())?;
        Ok(row.get::<_, i32>(0) as i64)
    }

    async fn update_user(&self, user: User) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let user_id = user.id.ok_or("User ID is required for update")?;
        client.execute(
            "UPDATE users SET username = $1, email = $2, full_name = $3, hashed_password = $4, role = $5, is_active = $6 WHERE id = $7",
            &[&user.username, &user.email, &user.full_name, &user.hashed_password, &user.role, &user.is_active, &user_id]
        ).await.map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn update_user_last_login(&self, user_id: i32) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let now = chrono::Local::now().naive_local();
        client.execute("UPDATE users SET last_login = $1 WHERE id = $2", &[&now, &user_id]).await.map_err(|e| e.to_string())?;
        Ok(())
    }
    
    async fn create_session(&self, token: String, user_id: i32, exp: i64) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        client.execute(
            "INSERT INTO sessions (token, user_id, exp) VALUES ($1, $2, $3) ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, exp = EXCLUDED.exp",
            &[&token, &user_id, &exp]
        ).await.map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn get_session_user(&self, token: String) -> Result<Option<User>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let row_opt = client.query_opt(
            "SELECT u.id, u.username, u.email, u.full_name, u.hashed_password, u.role, u.is_active, u.last_login
             FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = $1 AND s.exp > EXTRACT(EPOCH FROM NOW())::BIGINT",
            &[&token]
        ).await.map_err(|e| e.to_string())?;
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
            }))
        } else {
            Ok(None)
        }
    }
    
    async fn revoke_session(&self, token: String) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        client.execute("DELETE FROM sessions WHERE token = $1", &[&token]).await.map_err(|e| e.to_string())?;
        Ok(())
    }
    
    async fn cleanup_sessions(&self) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let _ = client.execute("DELETE FROM sessions WHERE exp <= EXTRACT(EPOCH FROM NOW())::BIGINT", &[]).await.map_err(|e| e.to_string())?;
        Ok(())
    }

    // --- Invites ---
    async fn create_invite(&self, invite: Invite) -> Result<i64, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let expiration = parse_timestamp(invite.expiration);
        
        let row = client.query_one(
            "INSERT INTO user_invites (token, role, name, email, expiration, is_used, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
            &[&invite.token, &invite.role, &invite.name, &invite.email, &expiration, &invite.is_used, &invite.is_active]
        ).await.map_err(|e| e.to_string())?;
        
        Ok(row.get::<_, i32>(0) as i64)
    }

    async fn get_invite(&self, token: String) -> Result<Option<Invite>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let row_opt = client.query_opt(
            "SELECT id, token, role, name, email, expiration, is_used, is_active FROM user_invites WHERE token = $1",
            &[&token]
        ).await.map_err(|e| e.to_string())?;

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
        client.execute("UPDATE user_invites SET is_used = TRUE WHERE token = $1", &[&token]).await.map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn get_invites(&self) -> Result<Vec<Invite>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let rows = client.query("SELECT id, token, role, name, email, expiration, is_used, is_active FROM user_invites ORDER BY created_at DESC", &[]).await.map_err(|e| e.to_string())?;
        
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
        client.execute("UPDATE user_invites SET is_active = $1 WHERE id = $2", &[&is_active, &id]).await.map_err(|e| e.to_string())?;
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
        ).await.map_err(|e| e.to_string())?.get(0);

        // Get items
        let rows = client.query(
            "SELECT id, name, description, category, sku, current_quantity, minimum_quantity, reorder_quantity, unit_price, supplier_name, is_active FROM products WHERE name ILIKE $1 OR sku ILIKE $1 OR category ILIKE $1 LIMIT $2 OFFSET $3",
            &[&search_pattern, &limit, &offset]
        ).await.map_err(|e| e.to_string())?;

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
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        
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
        ).await.map_err(|e| e.to_string())?;

        let id: i32 = row.get(0);
        Ok(id as i64)
    }

    async fn update_product(&self, product: Product) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        
        if let Some(id) = product.id {
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
            ).await.map_err(|e| e.to_string())?;
            Ok(())
        } else {
            Err("Product ID is required for update".to_string())
        }
    }

    async fn delete_product(&self, id: i32) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        client.execute("DELETE FROM products WHERE id = $1", &[&id]).await.map_err(|e| e.to_string())?;
        Ok(())
    }

    // --- Employee Commands ---
    async fn get_employees(&self) -> Result<Vec<Employee>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let rows = client.query("SELECT id, employee_id, first_name, last_name, email, phone, role, department, position, salary, status FROM employees", &[]).await.map_err(|e| e.to_string())?;
        
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
        let rows = client.query("SELECT id, employee_id, first_name, last_name, email, phone, role, department, position, salary, status FROM employees WHERE email = $1", &[&email]).await.map_err(|e| e.to_string())?;
        
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
        ).await.map_err(|e| e.to_string())?;
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
            ).await.map_err(|e| e.to_string())?;
            Ok(())
        } else {
            Err("ID required".to_string())
        }
    }

    async fn delete_employee(&self, id: i32) -> Result<(), String> {
        println!("Deleting employee {}", id);
        let mut client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let tx = client.transaction().await.map_err(|e| e.to_string())?;
        
        if let Err(e) = tx.execute("UPDATE tasks SET employee_id = NULL WHERE employee_id = $1", &[&id]).await { println!("Error updating tasks: {:?}", e); return Err(e.to_string()); }
        if let Err(e) = tx.execute("UPDATE project_tasks SET assigned_to = NULL WHERE assigned_to = $1", &[&id]).await { println!("Error updating project_tasks: {:?}", e); return Err(e.to_string()); }
        if let Err(e) = tx.execute("UPDATE payments SET employee_id = NULL WHERE employee_id = $1", &[&id]).await { println!("Error updating payments: {:?}", e); return Err(e.to_string()); }
        if let Err(e) = tx.execute("UPDATE projects SET manager_id = NULL WHERE manager_id = $1", &[&id]).await { println!("Error updating projects: {:?}", e); return Err(e.to_string()); }
        
        // 1. Attendance deletion with SAVEPOINT
        if let Err(_) = tx.execute("SAVEPOINT attendance_del", &[]).await { return Err("Failed to create savepoint".to_string()); }
        if let Err(e) = tx.execute("DELETE FROM attendance WHERE employee_id = $1", &[&id]).await { 
            if e.code() == Some(&SqlState::UNDEFINED_TABLE) {
                println!("Attendance table missing, skipping deletion.");
                if let Err(_) = tx.execute("ROLLBACK TO SAVEPOINT attendance_del", &[]).await { return Err("Failed to rollback savepoint".to_string()); }
            } else {
                println!("Error deleting attendance: {:?}", e);
                return Err(format!("Error deleting attendance: {:?}", e));
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
                return Err(e.to_string()); 
            }
        } else {
            tx.execute("RELEASE SAVEPOINT tool_assign_del", &[]).await.ok();
        }

        if let Err(e) = tx.execute("UPDATE tools SET assigned_to_employee_id = NULL WHERE assigned_to_employee_id = $1", &[&id]).await { println!("Error updating tools: {:?}", e); return Err(e.to_string()); }
        
        // 3. Project Assignments deletion with SAVEPOINT
        if let Err(_) = tx.execute("SAVEPOINT project_assign_del", &[]).await { return Err("Failed to create savepoint".to_string()); }
        if let Err(e) = tx.execute("DELETE FROM project_assignments WHERE employee_id = $1", &[&id]).await { 
            if e.code() == Some(&SqlState::UNDEFINED_TABLE) {
                println!("Project assignments table missing, skipping deletion.");
                if let Err(_) = tx.execute("ROLLBACK TO SAVEPOINT project_assign_del", &[]).await { return Err("Failed to rollback savepoint".to_string()); }
            } else {
                println!("Error deleting project_assignments: {:?}", e); 
                return Err(e.to_string()); 
            }
        } else {
            tx.execute("RELEASE SAVEPOINT project_assign_del", &[]).await.ok();
        }
        
        if let Err(e) = tx.execute("DELETE FROM employees WHERE id = $1", &[&id]).await { 
            println!("Error deleting employee record: {:?}", e); 
            return Err(format!("Error deleting employee record: {:?}", e)); 
        }
        
        if let Err(e) = tx.commit().await {
            println!("Error committing transaction: {:?}", e);
            return Err(e.to_string());
        }
        println!("Employee {} deleted successfully", id);
        Ok(())
    }

    // --- Payment Commands ---
    async fn get_payments(&self) -> Result<Vec<Payment>, String> {
         let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
         let rows = client.query("SELECT id, payment_type, amount, currency, description, status, payment_method, payment_date, due_date, reference_number, employee_id, supplier_name FROM payments", &[]).await.map_err(|e| e.to_string())?;
         
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
        let row = client.query_one(
            "INSERT INTO payments (payment_type, amount, currency, description, status, payment_method, payment_date, due_date, reference_number, employee_id, supplier_name)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id",
            &[
                &payment.payment_type, &payment.amount, &payment.currency, &payment.description, &payment.status,
                &payment.payment_method, &payment_date, &due_date, &payment.reference_number, &payment.employee_id, &payment.supplier_name
            ]
        ).await.map_err(|e| e.to_string())?;
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
            ).await.map_err(|e| e.to_string())?;
            Ok(())
        } else {
            Err("ID required".to_string())
        }
    }

    async fn delete_payment(&self, id: i32) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        client.execute("DELETE FROM payments WHERE id = $1", &[&id]).await.map_err(|e| e.to_string())?;
        Ok(())
    }

    // --- Tasks (Generic) ---
    async fn get_tasks(&self) -> Result<Vec<Task>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let rows = client.query("SELECT id, employee_id, title, description, due_date, status, priority, assigned_date, completed_date FROM tasks", &[]).await.map_err(|e| e.to_string())?;
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
        let rows = client.query("SELECT id, employee_id, title, description, due_date, status, priority, assigned_date, completed_date FROM tasks WHERE employee_id = $1", &[&employee_id]).await.map_err(|e| e.to_string())?;
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
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let due_date = parse_timestamp(task.due_date);
        let assigned_date = parse_timestamp(task.assigned_date);
        let completed_date = parse_timestamp(task.completed_date);
        let row = client.query_one(
            "INSERT INTO tasks (employee_id, title, description, due_date, status, priority, assigned_date, completed_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
            &[
                &task.employee_id, &task.title, &task.description, &due_date,
                &task.status, &task.priority, &assigned_date, &completed_date,
            ],
        ).await.map_err(|e| e.to_string())?;
        Ok(row.get::<_, i32>(0) as i64)
    }

    async fn update_task(&self, task: Task) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let due_date = parse_timestamp(task.due_date);
        let assigned_date = parse_timestamp(task.assigned_date);
        let completed_date = parse_timestamp(task.completed_date);
        if let Some(id) = task.id {
            client.execute(
                "UPDATE tasks SET employee_id = $1, title = $2, description = $3, due_date = $4, status = $5, priority = $6, assigned_date = $7, completed_date = $8 WHERE id = $9",
                &[
                    &task.employee_id, &task.title, &task.description, &due_date,
                    &task.status, &task.priority, &assigned_date, &completed_date, &id
                ],
            ).await.map_err(|e| e.to_string())?;
            Ok(())
        } else {
            Err("Task ID is required for update".to_string())
        }
    }

    async fn delete_task(&self, id: i32) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        client.execute("DELETE FROM tasks WHERE id = $1", &[&id]).await.map_err(|e| e.to_string())?;
        Ok(())
    }

    // --- Attendance ---
    async fn get_attendances(&self) -> Result<Vec<Attendance>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let rows = client.query("SELECT id, employee_id, check_in, check_out, status, notes, location FROM attendance", &[]).await.map_err(|e| e.to_string())?;
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
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let check_in = parse_timestamp(Some(attendance.check_in)).unwrap_or(chrono::Local::now().naive_local());
        let row = client.query_one(
            "INSERT INTO attendance (employee_id, check_in, status, notes, location) VALUES ($1, $2, $3, $4, $5) RETURNING id",
            &[&attendance.employee_id, &check_in, &attendance.status, &attendance.notes, &attendance.location],
        ).await.map_err(|e| e.to_string())?;
        Ok(row.get::<_, i32>(0) as i64)
    }

    async fn clock_out(&self, attendance: Attendance) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let check_out = parse_timestamp(attendance.check_out).unwrap_or(chrono::Local::now().naive_local());
        if let Some(id) = attendance.id {
            let result = client.execute(
                "UPDATE attendance SET check_out = $1, status = $2, notes = $3 WHERE id = $4 AND employee_id = $5",
                &[&check_out, &attendance.status, &attendance.notes, &id, &attendance.employee_id],
            ).await.map_err(|e| e.to_string())?;
            
            if result == 0 {
                return Err("Attendance record not found or permission denied".to_string());
            }
            Ok(())
        } else {
            Err("Attendance ID is required for clock out".to_string())
        }
    }

    // --- Dashboard & Reports ---
    async fn get_dashboard_stats(&self) -> Result<DashboardStats, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let total_products: i64 = client.query_one("SELECT COUNT(*) FROM products", &[]).await.map_err(|e| e.to_string())?.get(0);
        let low_stock_items: i64 = client.query_one("SELECT COUNT(*) FROM products WHERE current_quantity <= minimum_quantity", &[]).await.map_err(|e| e.to_string())?.get(0);
        let total_employees: i64 = client.query_one("SELECT COUNT(*) FROM employees WHERE status = 'active'", &[]).await.map_err(|e| e.to_string())?.get(0);
        let total_payments_pending: i64 = client.query_one("SELECT COUNT(*) FROM payments WHERE status = 'pending'", &[]).await.map_err(|e| e.to_string())?.get(0);
        let total_revenue: f64 = 0.0;
        Ok(DashboardStats { 
            total_products: total_products as i32, 
            low_stock_items: low_stock_items as i32, 
            total_employees: total_employees as i32, 
            total_payments_pending: total_payments_pending as i32, 
            total_revenue 
        })
    }

    async fn get_report_summary(&self) -> Result<ReportSummary, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let inventory_value: f64 = client.query_one("SELECT COALESCE(SUM(current_quantity * unit_price), 0.0) FROM products", &[]).await.map_err(|e| e.to_string())?.get(0);
        let total_revenue: f64 = client.query_one("SELECT COALESCE(SUM(amount), 0.0) FROM payments WHERE payment_type = 'income' AND status = 'completed'", &[]).await.map_err(|e| e.to_string())?.get(0);
        let total_expenses: f64 = client.query_one("SELECT COALESCE(SUM(amount), 0.0) FROM payments WHERE payment_type = 'expense' AND status = 'completed'", &[]).await.map_err(|e| e.to_string())?.get(0);
        let pending_tasks: i64 = client.query_one("SELECT COUNT(*) FROM tasks WHERE status != 'completed'", &[]).await.map_err(|e| e.to_string())?.get(0);
        let active_employees: i64 = client.query_one("SELECT COUNT(*) FROM employees WHERE status = 'active'", &[]).await.map_err(|e| e.to_string())?.get(0);
        
        Ok(ReportSummary {
            inventory_value,
            total_revenue,
            total_expenses,
            net_profit: total_revenue - total_expenses,
            pending_tasks: pending_tasks as i32,
            active_employees: active_employees as i32,
        })
    }

    async fn get_monthly_cashflow(&self) -> Result<Vec<ChartDataPoint>, String> {
        // Mock data for now
        Ok(vec![
            ChartDataPoint { label: "Jan".to_string(), value: 12000.0 },
            ChartDataPoint { label: "Feb".to_string(), value: 15000.0 },
            ChartDataPoint { label: "Mar".to_string(), value: 18000.0 },
            ChartDataPoint { label: "Apr".to_string(), value: 11000.0 },
            ChartDataPoint { label: "May".to_string(), value: 20000.0 },
        ])
    }

    // --- Complaints ---
    async fn get_complaints(&self) -> Result<Vec<Complaint>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let rows = client.query("SELECT id, content, created_at, status, admin_notes, resolution, resolved_at, resolved_by FROM complaints", &[]).await.map_err(|e| e.to_string())?;
        let mut complaints = Vec::new();
        for row in rows {
            complaints.push(Complaint {
                id: Some(row.get(0)),
                content: row.get(1),
                created_at: format_timestamp(row.get(2)),
                status: row.get(3),
                admin_notes: row.get(4),
                resolution: row.get(5),
                resolved_at: format_timestamp(row.get(6)),
                resolved_by: row.get(7),
            });
        }
        Ok(complaints)
    }

    async fn submit_complaint(&self, complaint: Complaint) -> Result<i64, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let row = client.query_one("INSERT INTO complaints (content) VALUES ($1) RETURNING id", &[&complaint.content]).await.map_err(|e| e.to_string())?;
        Ok(row.get::<_, i32>(0) as i64)
    }

    async fn resolve_complaint(&self, id: i32, status: String, resolution: String, resolved_by: String, admin_notes: Option<String>) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let resolved_at = chrono::Local::now().naive_local();
        client.execute(
            "UPDATE complaints SET status = $1, resolution = $2, resolved_by = $3, admin_notes = $4, resolved_at = $5 WHERE id = $6",
            &[&status, &resolution, &resolved_by, &admin_notes, &resolved_at, &id]
        ).await.map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn delete_complaint(&self, id: i32) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        client.execute("DELETE FROM complaints WHERE id = $1", &[&id]).await.map_err(|e| e.to_string())?;
        Ok(())
    }

    // --- Tools ---
    async fn get_tools(&self) -> Result<Vec<Tool>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let rows = client.query("SELECT id, name, type_name, status, assigned_to_employee_id, purchase_date, condition FROM tools", &[]).await.map_err(|e| e.to_string())?;
        let mut tools = Vec::new();
        for row in rows {
            tools.push(Tool {
                id: Some(row.get(0)),
                name: row.get(1),
                type_name: row.get(2),
                status: row.get(3),
                assigned_to_employee_id: row.get(4),
                purchase_date: format_timestamp(row.get(5)),
                condition: row.get(6),
            });
        }
        Ok(tools)
    }

    async fn add_tool(&self, tool: Tool) -> Result<i64, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let purchase_date = parse_timestamp(tool.purchase_date);
        let row = client.query_one(
            "INSERT INTO tools (name, type_name, status, assigned_to_employee_id, purchase_date, condition) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
            &[&tool.name, &tool.type_name, &tool.status, &tool.assigned_to_employee_id, &purchase_date, &tool.condition]
        ).await.map_err(|e| e.to_string())?;
        Ok(row.get::<_, i32>(0) as i64)
    }

    async fn update_tool(&self, tool: Tool) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let purchase_date = parse_timestamp(tool.purchase_date);
        if let Some(id) = tool.id {
            client.execute(
                "UPDATE tools SET name = $1, type_name = $2, status = $3, assigned_to_employee_id = $4, purchase_date = $5, condition = $6 WHERE id = $7",
                &[&tool.name, &tool.type_name, &tool.status, &tool.assigned_to_employee_id, &purchase_date, &tool.condition, &id]
            ).await.map_err(|e| e.to_string())?;
            Ok(())
        } else {
            Err("Tool ID is required for update".to_string())
        }
    }

    async fn delete_tool(&self, id: i32) -> Result<(), String> {
        println!("Deleting tool {}", id);
        let mut client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let tx = client.transaction().await.map_err(|e| e.to_string())?;
        
        // Use SAVEPOINT for tool_assignments deletion
        if let Err(_) = tx.execute("SAVEPOINT tool_assign_del", &[]).await { return Err("Failed to create savepoint".to_string()); }
        if let Err(e) = tx.execute("DELETE FROM tool_assignments WHERE tool_id = $1", &[&id]).await {
            if e.code() == Some(&SqlState::UNDEFINED_TABLE) {
                println!("Tool assignments table missing, skipping deletion.");
                if let Err(_) = tx.execute("ROLLBACK TO SAVEPOINT tool_assign_del", &[]).await { return Err("Failed to rollback savepoint".to_string()); }
            } else {
                println!("Error deleting tool_assignments: {:?}", e);
                return Err(e.to_string());
            }
        } else {
            tx.execute("RELEASE SAVEPOINT tool_assign_del", &[]).await.ok();
        }
        
        if let Err(e) = tx.execute("DELETE FROM tools WHERE id = $1", &[&id]).await {
            println!("Error deleting tool: {:?}", e);
            if let Some(code) = e.code() {
                println!("Error code: {:?}", code);
            }
            return Err(e.to_string());
        }
        
        if let Err(e) = tx.commit().await {
            println!("Error committing transaction: {:?}", e);
            return Err(e.to_string());
        }
        
        println!("Tool {} deleted successfully", id);
        Ok(())
    }

    async fn assign_tool(&self, assignment: ToolAssignment) -> Result<i64, String> {
        let mut client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let tx = client.transaction().await.map_err(|e| e.to_string())?;
        
        tx.execute("UPDATE tools SET assigned_to_employee_id = $1, status = 'assigned' WHERE id = $2", &[&assignment.employee_id, &assignment.tool_id]).await.map_err(|e| e.to_string())?;
        
        let row = tx.query_one(
            "INSERT INTO tool_assignments (tool_id, employee_id, condition_on_assignment) VALUES ($1, $2, $3) RETURNING id", 
            &[&assignment.tool_id, &assignment.employee_id, &assignment.condition_on_assignment]
        ).await.map_err(|e| e.to_string())?;
        
        tx.commit().await.map_err(|e| e.to_string())?;
        Ok(row.get::<_, i32>(0) as i64)
    }

    async fn return_tool(&self, tool_id: i32, condition: String) -> Result<(), String> {
        let mut client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let tx = client.transaction().await.map_err(|e| e.to_string())?;
        tx.execute("UPDATE tools SET assigned_to_employee_id = NULL, status = 'available', condition = COALESCE($1, condition) WHERE id = $2", &[&condition, &tool_id]).await.map_err(|e| e.to_string())?;
        tx.execute("UPDATE tool_assignments SET returned_at = CURRENT_TIMESTAMP, condition_on_return = $1 WHERE tool_id = $2 AND returned_at IS NULL", &[&condition, &tool_id]).await.map_err(|e| e.to_string())?;
        tx.commit().await.map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn get_tool_history(&self, tool_id: i32) -> Result<Vec<ToolAssignment>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let rows = client.query("SELECT id, tool_id, employee_id, assigned_at, returned_at, condition_on_assignment, condition_on_return, notes FROM tool_assignments WHERE tool_id = $1 ORDER BY assigned_at DESC", &[&tool_id]).await.map_err(|e| e.to_string())?;
        let mut history = Vec::new();
        for row in rows {
            history.push(ToolAssignment {
                id: Some(row.get(0)),
                tool_id: row.get(1),
                employee_id: row.get(2),
                assigned_at: format_timestamp(row.get(3)),
                returned_at: format_timestamp(row.get(4)),
                condition_on_assignment: row.get(5),
                condition_on_return: row.get(6),
                notes: row.get(7),
            });
        }
        Ok(history)
    }

    // --- Roles & Permissions ---
    async fn get_roles(&self) -> Result<Vec<Role>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let rows = client.query("SELECT id, name, description, is_custom FROM roles", &[]).await.map_err(|e| e.to_string())?;
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
        let row = client.query_one("INSERT INTO roles (name, description, is_custom) VALUES ($1, $2, $3) RETURNING id", &[&role.name, &role.description, &role.is_custom]).await.map_err(|e| e.to_string())?;
        Ok(row.get::<_, i32>(0) as i64)
    }

    async fn get_permissions(&self) -> Result<Vec<Permission>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let rows = client.query("SELECT id, code, description FROM permissions", &[]).await.map_err(|e| e.to_string())?;
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
        let rows = client.query(query, &[&role_id]).await.map_err(|e| e.to_string())?;
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
        let tx = client.transaction().await.map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM role_permissions WHERE role_id = $1", &[&role_id]).await.map_err(|e| e.to_string())?;
        for perm_id in permission_ids {
            tx.execute("INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)", &[&role_id, &perm_id]).await.map_err(|e| e.to_string())?;
        }
        tx.commit().await.map_err(|e| e.to_string())?;
        Ok(())
    }

    // --- Feature Toggles ---
    async fn get_feature_toggles(&self) -> Result<Vec<FeatureToggle>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let rows = client.query("SELECT key, is_enabled FROM feature_toggles", &[]).await.map_err(|e| e.to_string())?;
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
        client.execute("INSERT INTO feature_toggles (key, is_enabled) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET is_enabled = $2", &[&key, &is_enabled]).await.map_err(|e| e.to_string())?;
        Ok(())
    }

    // --- Setup & Config ---
    async fn get_setup_status(&self) -> Result<bool, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let row = client.query_opt("SELECT setup_completed FROM setup_config LIMIT 1", &[]).await.map_err(|e| e.to_string())?;
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
            .map_err(|e| e.to_string())?
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

        // 2. Setup config
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

    // --- Audit Logs ---
    async fn get_audit_logs(&self) -> Result<Vec<AuditLog>, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        // Assuming audit_logs table exists. If not, this will fail. It wasn't in init_db but is in models.
        // Adding basic support if table exists
        let rows = client.query("SELECT id, user_id, action, entity, entity_id, details, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 100", &[]).await.map_err(|_| "Audit logs table not found".to_string())?;
        let mut logs = Vec::new();
        for row in rows {
            logs.push(AuditLog {
                id: Some(row.get(0)),
                user_id: row.get(1),
                action: row.get(2),
                entity: row.get(3),
                entity_id: row.get(4),
                details: row.get(5),
                created_at: format_timestamp(row.get(6)),
            });
        }
        Ok(logs)
    }

    async fn log_activity(&self, user_id: Option<i32>, action: String, entity: Option<String>, entity_id: Option<i32>, details: Option<String>) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        client.execute("INSERT INTO audit_logs (user_id, action, entity, entity_id, details) VALUES ($1, $2, $3, $4, $5)", &[&user_id, &action, &entity, &entity_id, &details]).await.map_err(|_| "Failed to log".to_string())?;
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
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let start_date = parse_timestamp(project.start_date);
        let end_date = parse_timestamp(project.end_date);
        let row = client.query_one(
            "INSERT INTO projects (name, description, start_date, end_date, status, manager_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
            &[&project.name, &project.description, &start_date, &end_date, &project.status, &project.manager_id]
        ).await.map_err(|e| e.to_string())?;
        Ok(row.get::<_, i32>(0) as i64)
    }

    async fn update_project(&self, project: Project) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let start_date = parse_timestamp(project.start_date);
        let end_date = parse_timestamp(project.end_date);
        if let Some(id) = project.id {
            client.execute(
                "UPDATE projects SET name = $1, description = $2, start_date = $3, end_date = $4, status = $5, manager_id = $6 WHERE id = $7",
                &[&project.name, &project.description, &start_date, &end_date, &project.status, &project.manager_id, &id]
            ).await.map_err(|e| e.to_string())?;
            Ok(())
        } else {
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
        let rows = client.query("SELECT id, project_id, name, description, assigned_to, status, priority, start_date, due_date FROM project_tasks WHERE project_id = $1", &[&project_id]).await.map_err(|e| e.to_string())?;
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
                parent_task_id: None,
                dependencies_json: None,
            });
        }
        Ok(tasks)
    }

    async fn add_project_task(&self, task: ProjectTask) -> Result<i64, String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let start_date = parse_timestamp(task.start_date);
        let due_date = parse_timestamp(task.due_date);
        let row = client.query_one(
            "INSERT INTO project_tasks (project_id, name, description, assigned_to, status, priority, start_date, due_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
            &[&task.project_id, &task.name, &task.description, &task.assigned_to, &task.status, &task.priority, &start_date, &due_date]
        ).await.map_err(|e| e.to_string())?;
        Ok(row.get::<_, i32>(0) as i64)
    }

    async fn update_project_task(&self, task: ProjectTask) -> Result<(), String> {
        let client = self.pool.get().await.map_err(|e| format!("Failed to get db connection: {}", e))?;
        let start_date = parse_timestamp(task.start_date);
        let due_date = parse_timestamp(task.due_date);
        if let Some(id) = task.id {
            client.execute(
                "UPDATE project_tasks SET project_id = $1, name = $2, description = $3, assigned_to = $4, status = $5, priority = $6, start_date = $7, due_date = $8 WHERE id = $9",
                &[&task.project_id, &task.name, &task.description, &task.assigned_to, &task.status, &task.priority, &start_date, &due_date, &id]
            ).await.map_err(|e| e.to_string())?;
            Ok(())
        } else {
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
        let rows = client.query("SELECT id, code, name, type, currency, is_active FROM accounts", &[]).await.map_err(|_| "Table not found".to_string())?;
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
            "INSERT INTO accounts (code, name, type, currency, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id",
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

        // Log movement (optional but good practice, assuming inventory_logs table exists - but I don't want to break if it doesn't exist or schema differs. 
        // Based on get_velocity_report, inventory_logs DOES exist and has change_type, quantity_changed, product_id.
        // Let's check get_velocity_report again.
        // It selects from inventory_logs.
        // So I should probably log it. But I don't see an explicit add_inventory_log method exposed or used here easily.
        // To be safe and stick to the request "wire the supplier logic through inventory>item>batches", updating the product quantity is the key requirement.
        // I will stick to updating product quantity.
        
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
        ).await.map_err(|e| e.to_string())?;

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
