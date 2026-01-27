pub mod db;
pub mod models;
pub mod setup;

use tauri::{State, Manager};
use tokio::sync::RwLock;
use std::collections::HashMap;
use models::{Product, Employee, Payment, DashboardStats, Task, Attendance, ReportSummary, ChartDataPoint, Complaint, Tool, Role, Permission, FeatureToggle, ToolAssignment, AuditLog, DashboardConfig, Project, ProjectTask, ProjectAssignment, Account, Invoice, Integration, User, LoginResponse, Invite, BomHeader, BomLine, InventoryBatch, VelocityReport, BomData, Supplier, SupplierOrder};
use db::{Database, DbConfig, PostgresDatabase};
use argon2::{
    password_hash::{
        rand_core::OsRng,
        PasswordHash, PasswordHasher, PasswordVerifier, SaltString
    },
    Argon2
};
use uuid::Uuid;
use jsonwebtoken::{encode, decode, Header, Validation, EncodingKey, DecodingKey};
use serde::{Deserialize, Serialize};
use rand::Rng;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    user: User,
    exp: i64,
    ip: Option<String>,
    user_agent: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct InviteClaims {
    sub: String, // email
    role: String,
    name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    exp: Option<usize>,
}

pub struct AppState {
    pub db: RwLock<Box<dyn Database + Send + Sync>>,
    pub sessions: RwLock<HashMap<String, Session>>,
    pub jwt_secret: String,
}

fn add_connect_timeout(url: &str) -> String {
    if url.contains("connect_timeout=") {
        url.to_string()
    } else if url.contains('?') {
        format!("{}&connect_timeout=2", url)
    } else {
        format!("{}?connect_timeout=2", url)
    }
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn ping() -> String {
    "pong".to_string()
}

// --- User & Auth Commands ---

#[tauri::command]
async fn login(state: State<'_, AppState>, username: String, password_plain: String) -> Result<LoginResponse, String> {
    let db = state.db.read().await;
    let user_opt = db.get_user_by_username(username.clone()).await?;
    
    if let Some(user) = user_opt {
        // Verify password
        let parsed_hash = PasswordHash::new(&user.hashed_password).map_err(|e| e.to_string())?;
        if Argon2::default().verify_password(password_plain.as_bytes(), &parsed_hash).is_ok() {
            // Update last login
            let _ = db.update_user_last_login(user.id.unwrap()).await;

            // Generate Token
            let token = Uuid::new_v4().to_string();
            
            // Store Session
            let exp = chrono::Utc::now().timestamp() + 86400;
            state.sessions.write().await.insert(token.clone(), Session { user: user.clone(), exp, ip: None, user_agent: None });
            let _ = db.create_session(token.clone(), user.id.unwrap(), exp).await;
            
            let _ = db.log_activity(user.id, "login".to_string(), "UserManagement".to_string(), Some("Session".to_string()), None, Some("User logged in".to_string()), None, None).await;

            Ok(LoginResponse {
                user,
                token
            })
        } else {
            Err("Invalid credentials".to_string())
        }
    } else {
        Err("Invalid credentials".to_string())
    }
}

#[tauri::command]
async fn verify_connection(connection_string: String) -> Result<bool, String> {
    let conn = add_connect_timeout(&connection_string);
    // Attempt to connect/init. init_db handles basic connection check.
    // Wrap blocking call
    let conn_clone = conn.clone();
    tauri::async_runtime::spawn_blocking(move || {
        db::postgres_init::init_db(&conn_clone)
    }).await
    .map_err(|e| format!("Task failed: {}", e))?
    .map_err(|e| format!("Connection failed: {:?}", e))?;
    
    Ok(true)
}



#[tauri::command]
async fn generate_invite_token(state: State<'_, AppState>, role: String, name: String, email: String, expiration_hours: u64, token: String) -> Result<String, String> {
    let user = check_auth(&state, &token, vec!["CEO", "Manager"]).await?;

    // 1. Generate JWT as the invite token
    let (expiration_ts, expiration_db) = if expiration_hours == 0 {
        (None, None)
    } else {
        let exp_time = chrono::Utc::now()
            .checked_add_signed(chrono::Duration::hours(expiration_hours as i64))
            .ok_or("Invalid expiration time")?;
        let exp_db = chrono::Local::now()
            .checked_add_signed(chrono::Duration::hours(expiration_hours as i64))
            .ok_or("Invalid expiration time")?
            .format("%Y-%m-%d %H:%M:%S")
            .to_string();
        (Some(exp_time.timestamp() as usize), Some(exp_db))
    };

    let claims = InviteClaims {
        sub: email.clone(),
        role: role.clone(),
        name: name.clone(),
        exp: expiration_ts,
    };

    // Use secret from state (loaded from secrets.json or generated)
    let secret = &state.jwt_secret; 
    let invite_token = encode(&Header::default(), &claims, &EncodingKey::from_secret(secret.as_ref()))
        .map_err(|e| e.to_string())?;

    // 2. Store in Database
    let invite = Invite {
        id: None,
        token: invite_token.clone(),
        role: role.clone(),
        name,
        email: email.clone(),
        expiration: expiration_db,
        is_used: false,
        is_active: true,
    };
    
    {
        let db = state.db.read().await;
        db.create_invite(invite).await?;
        // Log activity
        let _ = db.log_activity(user.id, "generate_invite".to_string(), "UserManagement".to_string(), Some("Invite".to_string()), None, Some(format!("Role: {}, Email: {}", role, email)), None, None).await;
    }

    Ok(invite_token)
}

#[tauri::command]
async fn check_invite_token(state: State<'_, AppState>, invite_token: String) -> Result<InviteClaims, String> {
    // 1. Validate JWT structure and expiration
    let secret = &state.jwt_secret;
    let token_data = decode::<InviteClaims>(&invite_token, &DecodingKey::from_secret(secret.as_ref()), &Validation::default())
        .map_err(|_| "Invalid or expired token".to_string())?;

    let claims = token_data.claims;
    let db = state.db.read().await;
    
    // 2. Verify against Database (check if used or revoked)
    let stored_invite = db.get_invite(invite_token.clone()).await?
        .ok_or("Invite not found in database".to_string())?;
        
    if stored_invite.is_used {
        return Err("Invite has already been used".to_string());
    }
    if !stored_invite.is_active {
        return Err("Invite is disabled".to_string());
    }
    
    Ok(claims)
}

#[tauri::command]
async fn accept_invite(state: State<'_, AppState>, invite_token: String, password_plain: String, username: String, full_name: String) -> Result<LoginResponse, String> {
    // 1. Validate JWT structure and expiration
    let secret = &state.jwt_secret;
    let token_data = decode::<InviteClaims>(&invite_token, &DecodingKey::from_secret(secret.as_ref()), &Validation::default())
        .map_err(|_| "Invalid or expired token".to_string())?;

    let claims = token_data.claims;
    let db = state.db.read().await;
    
    // 2. Verify against Database
    let stored_invite = db.get_invite(invite_token.clone()).await?
        .ok_or("Invite not found in database".to_string())?;
        
    if stored_invite.is_used {
        return Err("Invite has already been used".to_string());
    }
    if !stored_invite.is_active {
        return Err("Invite is disabled".to_string());
    }

    // Check if username taken
    if db.check_username_exists(username.clone()).await? {
        return Err("Username already taken".to_string());
    }

    // 3. Create User
    // Hash password
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2.hash_password(password_plain.as_bytes(), &salt).map_err(|e| e.to_string())?.to_string();

    let new_user = User {
        id: None,
        username: username,
        email: claims.sub.clone(),
        full_name: Some(full_name),
        hashed_password: password_hash,
        role: claims.role,
        is_active: true,
        last_login: Some(chrono::Local::now().to_string()),
        permissions: None,
    };
    let id = db.create_user(new_user.clone()).await?;
    let mut user = new_user;
    user.id = Some(id as i32);

    // 4. Mark invite as used
    db.mark_invite_used(invite_token).await?;
    
    // Log activity
    let _ = db.log_activity(user.id, "accept_invite".to_string(), "UserManagement".to_string(), Some("User".to_string()), user.id, Some("User joined via invite".to_string()), None, None).await;

    // 5. Create session
    let session_token = Uuid::new_v4().to_string();
    let exp = chrono::Utc::now().timestamp() + 86400;
    state.sessions.write().await.insert(session_token.clone(), Session { user: user.clone(), exp, ip: None, user_agent: None });
    let _ = db.create_session(session_token.clone(), user.id.unwrap(), exp).await;

    Ok(LoginResponse {
        user,
        token: session_token
    })
}

// Helper for verifying auth
async fn check_auth(state: &State<'_, AppState>, token: &str, allowed_roles: Vec<&str>) -> Result<User, String> {
    let db = state.db.read().await;
    if let Some(user) = db.get_session_user(token.to_string()).await? {
        if allowed_roles.contains(&user.role.as_str()) || allowed_roles.contains(&"CEO") || allowed_roles.is_empty() {
            Ok(user)
        } else {
            Err("Insufficient permissions".to_string())
        }
    } else {
        Err("Invalid or expired session".to_string())
    }
}

async fn get_client_info(state: &State<'_, AppState>, token: &str) -> (Option<String>, Option<String>) {
    let sessions = state.sessions.read().await;
    if let Some(session) = sessions.get(token) {
        (session.ip.clone(), session.user_agent.clone())
    } else {
        (None, None)
    }
}

#[tauri::command]
async fn logout(state: State<'_, AppState>, token: String) -> Result<(), String> {
    let mut sessions = state.sessions.write().await;
    let user_id = sessions.get(&token).and_then(|s| s.user.id);
    
    let db = state.db.read().await;
    let _ = db.revoke_session(token.clone()).await;
    
    if let Some(uid) = user_id {
         let _ = db.log_activity(Some(uid), "logout".to_string(), "UserManagement".to_string(), Some("Session".to_string()), None, Some("User logged out".to_string()), None, None).await;
    }
    
    sessions.remove(&token);
    Ok(())
}

#[tauri::command]
async fn update_client_info(state: State<'_, AppState>, ip_address: String, user_agent: String, token: String) -> Result<(), String> {
    let mut sessions = state.sessions.write().await;
    if let Some(session) = sessions.get_mut(&token) {
        session.ip = Some(ip_address);
        session.user_agent = Some(user_agent);
    }
    Ok(())
}

#[tauri::command]
async fn register_user(state: State<'_, AppState>, mut user: User, password_plain: String) -> Result<i64, String> {
    // Hash password
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2.hash_password(password_plain.as_bytes(), &salt).map_err(|e| e.to_string())?.to_string();
    
    user.hashed_password = password_hash;
    
    let db = state.db.read().await;
    let id = db.create_user(user.clone()).await?;
    let _ = db.log_activity(Some(id as i32), "register".to_string(), "UserManagement".to_string(), Some("User".to_string()), Some(id as i32), Some("User registered".to_string()), None, None).await;
    Ok(id)
}

// --- Product Commands ---

#[tauri::command]
async fn get_products(state: State<'_, AppState>, search: Option<String>, page: Option<i32>, page_size: Option<i32>, token: String) -> Result<serde_json::Value, String> {
    check_auth(&state, &token, vec![]).await?; // Any authenticated
    state.db.read().await.get_products(search, page, page_size).await
}

#[tauri::command]
async fn add_product(state: State<'_, AppState>, product: Product, token: String) -> Result<i64, String> {
    let user = check_auth(&state, &token, vec!["CEO", "Manager"]).await?;
    let db = state.db.read().await;
    let id = db.add_product(product.clone()).await?;
    let _ = db.log_activity(user.id, "create".to_string(), "Inventory".to_string(), Some("Product".to_string()), Some(id as i32), Some(format!("Added product: {}", product.name)), None, None).await;
    Ok(id)
}

#[tauri::command]
async fn update_product(state: State<'_, AppState>, product: Product, token: String) -> Result<(), String> {
    let user = check_auth(&state, &token, vec!["CEO", "Manager"]).await?;
    let db = state.db.read().await;
    db.update_product(product.clone()).await?;
    let _ = db.log_activity(user.id, "update".to_string(), "Inventory".to_string(), Some("Product".to_string()), product.id.map(|i| i as i32), Some(format!("Updated product: {}", product.name)), None, None).await;
    Ok(())
}

#[tauri::command]
async fn delete_product(state: State<'_, AppState>, id: i32, token: String) -> Result<(), String> {
    let user = check_auth(&state, &token, vec!["CEO", "Manager"]).await?;
    let db = state.db.read().await;
    db.delete_product(id).await?;
    let _ = db.log_activity(user.id, "delete".to_string(), "Inventory".to_string(), Some("Product".to_string()), Some(id), Some("Deleted product".to_string()), None, None).await;
    Ok(())
}

// --- Supply Chain Commands ---

#[tauri::command]
async fn get_suppliers(state: State<'_, AppState>, token: String) -> Result<Vec<Supplier>, String> {
    check_auth(&state, &token, vec!["CEO", "Manager", "Inventory"]).await?;
    state.db.read().await.get_suppliers().await
}

#[tauri::command]
async fn add_supplier(state: State<'_, AppState>, supplier: Supplier, token: String) -> Result<i64, String> {
    let user = check_auth(&state, &token, vec!["CEO", "Manager", "Inventory"]).await?;
    let db = state.db.read().await;
    let id = db.add_supplier(supplier.clone()).await?;
    let _ = db.log_activity(user.id, "create".to_string(), "SupplyChain".to_string(), Some("Supplier".to_string()), Some(id as i32), Some(format!("Added supplier: {}", supplier.name)), None, None).await;
    Ok(id)
}

#[tauri::command]
async fn update_supplier(state: State<'_, AppState>, supplier: Supplier, token: String) -> Result<(), String> {
    let user = check_auth(&state, &token, vec!["CEO", "Manager", "Inventory"]).await?;
    let db = state.db.read().await;
    db.update_supplier(supplier.clone()).await?;
    let _ = db.log_activity(user.id, "update".to_string(), "SupplyChain".to_string(), Some("Supplier".to_string()), supplier.id.map(|i| i as i32), Some(format!("Updated supplier: {}", supplier.name)), None, None).await;
    Ok(())
}

#[tauri::command]
async fn delete_supplier(state: State<'_, AppState>, id: i32, token: String) -> Result<(), String> {
    let user = check_auth(&state, &token, vec!["CEO", "Manager"]).await?;
    let db = state.db.read().await;
    db.delete_supplier(id).await?;
    let _ = db.log_activity(user.id, "delete".to_string(), "SupplyChain".to_string(), Some("Supplier".to_string()), Some(id), Some("Deleted supplier".to_string()), None, None).await;
    Ok(())
}

#[tauri::command]
async fn get_supplier_orders(state: State<'_, AppState>, token: String) -> Result<Vec<SupplierOrder>, String> {
    check_auth(&state, &token, vec!["CEO", "Manager", "Inventory"]).await?;
    state.db.read().await.get_supplier_orders().await
}

#[tauri::command]
async fn add_supplier_order(state: State<'_, AppState>, order: SupplierOrder, token: String) -> Result<i64, String> {
    let user = check_auth(&state, &token, vec!["CEO", "Manager", "Inventory"]).await?;
    let db = state.db.read().await;
    let id = db.add_supplier_order(order.clone()).await?;
    let _ = db.log_activity(user.id, "create".to_string(), "SupplyChain".to_string(), Some("SupplierOrder".to_string()), Some(id as i32), Some(format!("Added order for supplier: {}", order.supplier_id)), None, None).await;
    Ok(id)
}

#[tauri::command]
async fn update_supplier_order(state: State<'_, AppState>, order: SupplierOrder, token: String) -> Result<(), String> {
    let user = check_auth(&state, &token, vec!["CEO", "Manager", "Inventory"]).await?;
    let db = state.db.read().await;
    db.update_supplier_order(order.clone()).await?;
    let _ = db.log_activity(user.id, "update".to_string(), "SupplyChain".to_string(), Some("SupplierOrder".to_string()), order.id.map(|i| i as i32), Some(format!("Updated order for supplier: {}", order.supplier_id)), None, None).await;
    Ok(())
}

#[tauri::command]
async fn delete_supplier_order(state: State<'_, AppState>, id: i32, token: String) -> Result<(), String> {
    let user = check_auth(&state, &token, vec!["CEO", "Manager", "Inventory"]).await?;
    let db = state.db.read().await;
    db.delete_supplier_order(id).await?;
    let _ = db.log_activity(user.id, "delete".to_string(), "SupplyChain".to_string(), Some("SupplierOrder".to_string()), Some(id), Some("Deleted order".to_string()), None, None).await;
    Ok(())
}

#[tauri::command]
async fn get_product_bom(state: State<'_, AppState>, product_id: i32, token: String) -> Result<BomData, String> {
    check_auth(&state, &token, vec!["CEO", "Manager", "Inventory"]).await?;
    let (header, lines) = state.db.read().await.get_product_bom(product_id).await?;
    Ok(BomData { header, lines })
}

#[tauri::command]
async fn save_bom(state: State<'_, AppState>, header: BomHeader, lines: Vec<BomLine>, token: String) -> Result<(), String> {
    let user = check_auth(&state, &token, vec!["CEO", "Manager", "Inventory"]).await?;
    let db = state.db.read().await;
    db.save_bom(header.clone(), lines.clone()).await?;
    let _ = db.log_activity(user.id, "update".to_string(), "SupplyChain".to_string(), Some("BOM".to_string()), header.id, Some(format!("Saved BOM for product: {}", header.product_id)), None, None).await;
    Ok(())
}

#[tauri::command]
async fn get_batches(state: State<'_, AppState>, product_id: i32, token: String) -> Result<Vec<InventoryBatch>, String> {
    check_auth(&state, &token, vec!["CEO", "Manager", "Inventory"]).await?;
    state.db.read().await.get_batches(product_id).await
}

#[tauri::command]
async fn add_batch(state: State<'_, AppState>, batch: InventoryBatch, token: String) -> Result<i64, String> {
    let user = check_auth(&state, &token, vec!["CEO", "Manager", "Inventory"]).await?;
    let db = state.db.read().await;
    let id = db.add_batch(batch.clone()).await?;
    let _ = db.log_activity(user.id, "create".to_string(), "Inventory".to_string(), Some("Batch".to_string()), Some(id as i32), Some(format!("Added batch: {}", batch.batch_number)), None, None).await;
    Ok(id)
}

#[tauri::command]
async fn update_batch(state: State<'_, AppState>, batch: InventoryBatch, token: String) -> Result<(), String> {
    let user = check_auth(&state, &token, vec!["CEO", "Manager", "Inventory"]).await?;
    let db = state.db.read().await;
    db.update_batch(batch.clone()).await?;
    let _ = db.log_activity(user.id, "update".to_string(), "Inventory".to_string(), Some("Batch".to_string()), batch.id.map(|i| i as i32), Some(format!("Updated batch: {}", batch.batch_number)), None, None).await;
    Ok(())
}

#[tauri::command]
async fn get_velocity_report(state: State<'_, AppState>, token: String) -> Result<Vec<VelocityReport>, String> {
    check_auth(&state, &token, vec!["CEO", "Manager", "Inventory", "Finance"]).await?;
    state.db.read().await.get_velocity_report().await
}

// --- Employee Commands ---

#[tauri::command]
async fn get_employees(state: State<'_, AppState>, token: String) -> Result<Vec<Employee>, String> {
    check_auth(&state, &token, vec!["CEO", "Manager", "HR"]).await?;
    state.db.read().await.get_employees().await
}

#[tauri::command]
async fn add_employee(state: State<'_, AppState>, employee: Employee, token: String) -> Result<i64, String> {
    let user = check_auth(&state, &token, vec!["CEO", "Manager", "HR"]).await?;
    let db = state.db.read().await;
    let id = db.add_employee(employee.clone()).await?;
    let _ = db.log_activity(user.id, "create".to_string(), "UserManagement".to_string(), Some("Employee".to_string()), Some(id as i32), Some(format!("Added employee: {} {}", employee.first_name, employee.last_name)), None, None).await;
    Ok(id)
}

#[tauri::command]
async fn update_employee(state: State<'_, AppState>, employee: Employee, token: String) -> Result<(), String> {
    let user = check_auth(&state, &token, vec!["CEO", "Manager", "HR"]).await?;
    let db = state.db.read().await;
    db.update_employee(employee.clone()).await?;
    let _ = db.log_activity(user.id, "update".to_string(), "UserManagement".to_string(), Some("Employee".to_string()), employee.id.map(|i| i as i32), Some(format!("Updated employee: {} {}", employee.first_name, employee.last_name)), None, None).await;
    Ok(())
}

#[tauri::command]
async fn delete_employee(state: State<'_, AppState>, id: i32, token: String) -> Result<(), String> {
    let user = check_auth(&state, &token, vec!["CEO", "Manager", "HR"]).await?;
    let db = state.db.read().await;
    db.delete_employee(id).await?;
    let _ = db.log_activity(user.id, "delete".to_string(), "UserManagement".to_string(), Some("Employee".to_string()), Some(id), Some("Deleted employee".to_string()), None, None).await;
    Ok(())
}

// --- Payment Commands ---

#[tauri::command]
async fn get_payments(state: State<'_, AppState>, token: String) -> Result<Vec<Payment>, String> {
    check_auth(&state, &token, vec!["CEO", "Manager", "Finance"]).await?;
    state.db.read().await.get_payments().await
}

#[tauri::command]
async fn add_payment(state: State<'_, AppState>, payment: Payment, token: String) -> Result<i64, String> {
    let user = check_auth(&state, &token, vec!["CEO", "Manager", "Finance"]).await?;
    let db = state.db.read().await;
    let id = db.add_payment(payment.clone()).await?;
    let _ = db.log_activity(user.id, "create".to_string(), "Finance".to_string(), Some("Payment".to_string()), Some(id as i32), Some(format!("Added payment amount: {}", payment.amount)), None, None).await;
    Ok(id)
}

#[tauri::command]
async fn update_payment(state: State<'_, AppState>, payment: Payment, token: String) -> Result<(), String> {
    let user = check_auth(&state, &token, vec!["CEO", "Manager", "Finance"]).await?;
    let db = state.db.read().await;
    db.update_payment(payment.clone()).await?;
    let _ = db.log_activity(user.id, "update".to_string(), "Finance".to_string(), Some("Payment".to_string()), payment.id.map(|i| i as i32), Some(format!("Updated payment amount: {}", payment.amount)), None, None).await;
    Ok(())
}

#[tauri::command]
async fn delete_payment(state: State<'_, AppState>, id: i32, token: String) -> Result<(), String> {
    let user = check_auth(&state, &token, vec!["CEO", "Manager", "Finance"]).await?;
    let db = state.db.read().await;
    db.delete_payment(id).await?;
    let _ = db.log_activity(user.id, "delete".to_string(), "Finance".to_string(), Some("Payment".to_string()), Some(id), Some("Deleted payment".to_string()), None, None).await;
    Ok(())
}

// --- Task Commands ---

#[tauri::command]
async fn get_tasks(state: State<'_, AppState>, token: String) -> Result<Vec<Task>, String> {
    let user = check_auth(&state, &token, vec![]).await?;
    let db = state.db.read().await;
    
    // Check if user is an employee (and not a Manager/CEO)
    if user.role != "CEO" && user.role != "Manager" {
        // If user is an employee, try to find their employee record to get ID
        if let Some(employee) = db.get_employee_by_email(user.email.clone()).await? {
             if let Some(emp_id) = employee.id {
                 return db.get_tasks_by_employee(emp_id as i32).await;
             }
        }
        // If employee record not found or has no ID, return empty list
        return Ok(vec![]);
    }
    
    // CEO/Manager see all tasks
    db.get_tasks().await
}

#[tauri::command]
async fn add_task(state: State<'_, AppState>, task: Task, token: String) -> Result<i64, String> {
    let user = check_auth(&state, &token, vec!["CEO", "Manager"]).await?;
    let db = state.db.read().await;
    let id = db.add_task(task.clone()).await?;
    let _ = db.log_activity(user.id, "create".to_string(), "TaskManagement".to_string(), Some("Task".to_string()), Some(id as i32), Some(format!("Added task: {}", task.title)), None, None).await;
    Ok(id)
}

#[tauri::command]
async fn update_task(state: State<'_, AppState>, task: Task, token: String) -> Result<(), String> {
    let user = check_auth(&state, &token, vec![]).await?; // Allow all to call, but we check permission inside
    
    // If Manager/CEO, allow full update
    if user.role == "CEO" || user.role == "Manager" {
        let db = state.db.read().await;
        db.update_task(task.clone()).await?;
        let _ = db.log_activity(user.id, "update".to_string(), "TaskManagement".to_string(), Some("Task".to_string()), task.id.map(|i| i as i32), Some(format!("Updated task: {}", task.title)), None, None).await;
        return Ok(());
    }

    // If Employee, only allow updating status of assigned tasks
    let db = state.db.read().await;
    if let Some(employee) = db.get_employee_by_email(user.email.clone()).await? {
        if let Some(emp_id) = employee.id {
             // Fetch existing task to verify assignment
             let tasks = db.get_tasks_by_employee(emp_id).await?;
             if let Some(existing_task) = tasks.iter().find(|t| t.id == task.id) {
                 // Verify that only status changed, or just allow status update. 
                 let mut task_to_update = existing_task.clone();
                 task_to_update.status = task.status.clone(); // Only allow status change
                 
                 db.update_task(task_to_update).await?;
                 let _ = db.log_activity(user.id, "update_status".to_string(), "TaskManagement".to_string(), Some("Task".to_string()), task.id.map(|i| i as i32), Some(format!("Updated task status: {}", task.status)), None, None).await;
                 return Ok(());
             }
        }
    }
    
    Err("Insufficient permissions to update this task".to_string())
}

#[tauri::command]
async fn delete_task(state: State<'_, AppState>, id: i32, token: String) -> Result<(), String> {
    let user = check_auth(&state, &token, vec!["CEO", "Manager"]).await?;
    let db = state.db.read().await;
    db.delete_task(id).await?;
    let _ = db.log_activity(user.id, "delete".to_string(), "TaskManagement".to_string(), Some("Task".to_string()), Some(id), Some("Deleted task".to_string()), None, None).await;
    Ok(())
}

// --- Attendance Commands ---

#[tauri::command]
async fn get_attendances(state: State<'_, AppState>, token: String) -> Result<Vec<Attendance>, String> {
    check_auth(&state, &token, vec!["CEO", "Manager", "HR"]).await?;
    state.db.read().await.get_attendances().await
}

#[tauri::command]
async fn clock_in(state: State<'_, AppState>, mut attendance: Attendance, token: String) -> Result<i64, String> {
    let user = check_auth(&state, &token, vec![]).await?; // Any authenticated user
    let db = state.db.read().await;
    
    if let Some(emp) = db.get_employee_by_email(user.email.clone()).await? {
        attendance.employee_id = emp.id;
    } else {
        return Err("No employee record found for this user.".to_string());
    }
    
    let id = db.clock_in(attendance.clone()).await?;
    let _ = db.log_activity(user.id, "clock_in".to_string(), "Attendance".to_string(), Some("Attendance".to_string()), Some(id as i32), Some(format!("Clocked in: {}", attendance.check_in)), None, None).await;
    Ok(id)
}

#[tauri::command]
async fn clock_out(state: State<'_, AppState>, mut attendance: Attendance, token: String) -> Result<(), String> {
    let user = check_auth(&state, &token, vec![]).await?; // Any authenticated user
    let db = state.db.read().await;
    
    if let Some(emp) = db.get_employee_by_email(user.email.clone()).await? {
        attendance.employee_id = emp.id;
    } else {
        return Err("No employee record found for this user.".to_string());
    }
    
    db.clock_out(attendance.clone()).await?;
    let _ = db.log_activity(user.id, "clock_out".to_string(), "Attendance".to_string(), Some("Attendance".to_string()), None, Some(format!("Clocked out: {}", attendance.check_out.unwrap_or_default())), None, None).await;
    Ok(())
}

// --- Dashboard Commands ---

#[tauri::command]
async fn get_dashboard_stats(state: State<'_, AppState>, token: String) -> Result<DashboardStats, String> {
    let user = check_auth(&state, &token, vec![]).await?; // Check auth, get user
    let mut stats = state.db.read().await.get_dashboard_stats().await?;

    // Filter sensitive data based on role
    let role = user.role.as_str();
    if role != "CEO" && role != "Manager" {
        stats.total_employees = 0;
        stats.total_payments_pending = 0;
        stats.total_revenue = 0.0;
    }

    Ok(stats)
}

// --- Reports Commands ---

#[tauri::command]
async fn get_report_summary(state: State<'_, AppState>, token: String) -> Result<ReportSummary, String> {
    check_auth(&state, &token, vec!["CEO", "Manager", "Finance"]).await?;
    state.db.read().await.get_report_summary().await
}

#[tauri::command]
async fn get_monthly_cashflow(state: State<'_, AppState>, token: String) -> Result<Vec<ChartDataPoint>, String> {
    check_auth(&state, &token, vec!["CEO", "Manager", "Finance"]).await?;
    state.db.read().await.get_monthly_cashflow().await
}

// --- Complaint Commands ---

#[tauri::command]
async fn get_complaints(state: State<'_, AppState>, token: String) -> Result<Vec<Complaint>, String> {
    check_auth(&state, &token, vec!["CEO", "Manager", "HR"]).await?;
    state.db.read().await.get_complaints().await
}

#[tauri::command]
async fn submit_complaint(state: State<'_, AppState>, content: String, token: String) -> Result<i64, String> {
    let user = check_auth(&state, &token, vec![]).await?; // Authenticated
    let created_at = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let complaint = Complaint {
        id: None,
        content: content.clone(),
        created_at: Some(created_at),
        status: "pending".to_string(),
        admin_notes: None,
        resolution: None,
        resolved_at: None,
        resolved_by: None,
    };
    let db = state.db.read().await;
    let id = db.submit_complaint(complaint).await?;
    let _ = db.log_activity(user.id, "create".to_string(), "HR".to_string(), Some("Complaint".to_string()), Some(id as i32), Some("Submitted complaint".to_string()), None, None).await;
    Ok(id)
}

#[tauri::command]
async fn resolve_complaint(state: State<'_, AppState>, id: i32, status: String, resolution: String, resolved_by: String, admin_notes: Option<String>, token: String) -> Result<(), String> {
    let user = check_auth(&state, &token, vec!["CEO", "Manager", "HR"]).await?;
    let db = state.db.read().await;
    db.resolve_complaint(id, status.clone(), resolution, resolved_by, admin_notes).await?;
    let _ = db.log_activity(user.id, "resolve".to_string(), "HR".to_string(), Some("Complaint".to_string()), Some(id), Some(format!("Resolved complaint status: {}", status)), None, None).await;
    Ok(())
}

#[tauri::command]
async fn delete_complaint(state: State<'_, AppState>, id: i32, token: String) -> Result<(), String> {
    let user = check_auth(&state, &token, vec!["CEO", "Manager", "HR"]).await?;
    let db = state.db.read().await;
    db.delete_complaint(id).await?;
    let _ = db.log_activity(user.id, "delete".to_string(), "HR".to_string(), Some("Complaint".to_string()), Some(id), Some("Deleted complaint".to_string()), None, None).await;
    Ok(())
}

// --- Tool Commands ---

#[tauri::command]
async fn get_tools(state: State<'_, AppState>, token: String) -> Result<Vec<Tool>, String> {
    check_auth(&state, &token, vec![]).await?; // Any authenticated
    state.db.read().await.get_tools().await
}

#[tauri::command]
async fn add_tool(state: State<'_, AppState>, tool: Tool, token: String) -> Result<i64, String> {
    let user = check_auth(&state, &token, vec!["CEO", "Manager"]).await?;
    let db = state.db.read().await;
    let id = db.add_tool(tool.clone()).await?;
    let _ = db.log_activity(user.id, "create".to_string(), "ResourceManagement".to_string(), Some("Tool".to_string()), Some(id as i32), Some(format!("Added tool: {}", tool.name)), None, None).await;
    Ok(id)
}

#[tauri::command]
async fn update_tool(state: State<'_, AppState>, tool: Tool, token: String) -> Result<(), String> {
    let user = check_auth(&state, &token, vec!["CEO", "Manager"]).await?;
    let db = state.db.read().await;
    db.update_tool(tool.clone()).await?;
    let _ = db.log_activity(user.id, "update".to_string(), "ResourceManagement".to_string(), Some("Tool".to_string()), tool.id, Some(format!("Updated tool: {}", tool.name)), None, None).await;
    Ok(())
}

#[tauri::command]
async fn delete_tool(state: State<'_, AppState>, id: i32, token: String) -> Result<(), String> {
    let user = check_auth(&state, &token, vec!["CEO", "Manager"]).await?;
    let db = state.db.read().await;
    db.delete_tool(id).await?;
    let _ = db.log_activity(user.id, "delete".to_string(), "ResourceManagement".to_string(), Some("Tool".to_string()), Some(id), Some("Deleted tool".to_string()), None, None).await;
    Ok(())
}

#[tauri::command]
async fn assign_tool(state: State<'_, AppState>, tool_id: i32, employee_id: i32, condition: String, notes: Option<String>, token: String) -> Result<(), String> {
    let user = check_auth(&state, &token, vec!["CEO", "Manager"]).await?;
    let assignment = ToolAssignment {
        id: None,
        tool_id: Some(tool_id),
        employee_id: Some(employee_id),
        assigned_at: Some(chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string()),
        returned_at: None,
        condition_on_assignment: Some(condition.clone()),
        condition_on_return: None,
        notes,
    };
    let db = state.db.read().await;
    db.assign_tool(assignment).await.map(|_| ())?;
    let _ = db.log_activity(user.id, "assign".to_string(), "ResourceManagement".to_string(), Some("Tool".to_string()), Some(tool_id), Some(format!("Assigned to emp: {}", employee_id)), None, None).await;
    Ok(())
}

#[tauri::command]
async fn return_tool(state: State<'_, AppState>, tool_id: i32, condition: String, _notes: Option<String>, token: String) -> Result<(), String> {
    let user = check_auth(&state, &token, vec!["CEO", "Manager"]).await?;
    let db = state.db.read().await;
    db.return_tool(tool_id, condition.clone()).await?;
    let _ = db.log_activity(user.id, "return".to_string(), "ResourceManagement".to_string(), Some("Tool".to_string()), Some(tool_id), Some(format!("Returned tool, condition: {}", condition)), None, None).await;
    Ok(())
}

#[tauri::command]
async fn get_tool_history(state: State<'_, AppState>, tool_id: i32, token: String) -> Result<Vec<ToolAssignment>, String> {
    check_auth(&state, &token, vec!["CEO", "Manager"]).await?;
    state.db.read().await.get_tool_history(tool_id).await
}

// --- RBAC & Feature Toggle Commands ---

#[tauri::command]
async fn get_roles(state: State<'_, AppState>, token: String) -> Result<Vec<Role>, String> {
    check_auth(&state, &token, vec![]).await?; // Any authenticated
    state.db.read().await.get_roles().await
}

#[tauri::command]
async fn add_role(state: State<'_, AppState>, name: String, description: Option<String>, token: String) -> Result<i64, String> {
    let user = check_auth(&state, &token, vec!["CEO", "Technical"]).await?;
    let role = Role {
        id: None,
        name: name.clone(),
        description,
        is_custom: true,
    };
    let db = state.db.read().await;
    let id = db.add_role(role).await?;
    let _ = db.log_activity(user.id, "create".to_string(), "RoleManagement".to_string(), Some("Role".to_string()), Some(id as i32), Some(format!("Added role: {}", name)), None, None).await;
    Ok(id)
}

#[tauri::command]
async fn get_permissions(state: State<'_, AppState>, token: String) -> Result<Vec<Permission>, String> {
    check_auth(&state, &token, vec!["CEO", "Technical"]).await?;
    state.db.read().await.get_permissions().await
}

#[tauri::command]
async fn get_role_permissions(state: State<'_, AppState>, role_id: i32, token: String) -> Result<Vec<i32>, String> {
    check_auth(&state, &token, vec!["CEO", "Technical"]).await?;
    let perms = state.db.read().await.get_role_permissions(role_id).await?;
    Ok(perms.into_iter().map(|p| p.id).collect())
}

#[tauri::command]
async fn update_role_permissions(state: State<'_, AppState>, role_id: i32, permission_ids: Vec<i32>, token: String) -> Result<(), String> {
    let user = check_auth(&state, &token, vec!["CEO", "Technical"]).await?;
    let db = state.db.read().await;
    db.update_role_permissions(role_id, permission_ids.clone()).await?;
    let _ = db.log_activity(user.id, "update".to_string(), "RoleManagement".to_string(), Some("RolePermissions".to_string()), Some(role_id), Some(format!("Updated permissions: {:?}", permission_ids)), None, None).await;
    Ok(())
}

#[tauri::command]
async fn get_feature_toggles(state: State<'_, AppState>, token: String) -> Result<Vec<FeatureToggle>, String> {
    check_auth(&state, &token, vec![]).await?; // Any authenticated
    state.db.read().await.get_feature_toggles().await
}

#[tauri::command]
async fn set_feature_toggle(state: State<'_, AppState>, key: String, is_enabled: bool, token: String) -> Result<(), String> {
    let user = check_auth(&state, &token, vec!["CEO", "Technical"]).await?;
    let db = state.db.read().await;
    db.set_feature_toggle(key.clone(), is_enabled).await?;
    let _ = db.log_activity(user.id, "update".to_string(), "SystemConfig".to_string(), Some("FeatureToggle".to_string()), None, Some(format!("Set {} to {}", key, is_enabled)), None, None).await;
    Ok(())
}

// --- Setup Commands ---

#[tauri::command]
async fn get_setup_status(state: State<'_, AppState>) -> Result<bool, String> {
    state.db.read().await.get_setup_status().await
}

#[tauri::command]
async fn get_company_name(state: State<'_, AppState>) -> Result<Option<String>, String> {
    state.db.read().await.get_company_name().await
}

#[tauri::command]
async fn check_username(state: State<'_, AppState>, username: String) -> Result<bool, String> {
    state.db.read().await.check_username_exists(username).await
}

#[tauri::command]
async fn complete_setup(state: State<'_, AppState>, company_name: String, admin_name: String, admin_email: String, admin_password: String, admin_username: String) -> Result<(), String> {
    let db = state.db.read().await;
    db.complete_setup(company_name.clone(), admin_name, admin_email, admin_password, admin_username).await?;
    let _ = db.log_activity(None, "setup".to_string(), "SystemConfig".to_string(), Some("System".to_string()), None, Some(format!("Setup completed for {}", company_name)), None, None).await;
    Ok(())
}

#[tauri::command]
async fn get_active_db_type(state: State<'_, AppState>) -> Result<String, String> {
    Ok(state.db.read().await.get_type())
}

// --- Audit Log Commands ---

#[tauri::command]
async fn get_audit_logs(state: State<'_, AppState>, page: Option<i32>, page_size: Option<i32>, user_id: Option<i32>, action: Option<String>, category: Option<String>, date_from: Option<String>, date_to: Option<String>, token: String) -> Result<Vec<AuditLog>, String> {
    check_auth(&state, &token, vec!["CEO", "Technical"]).await?;
    state.db.read().await.get_audit_logs(page, page_size, user_id, action, category, date_from, date_to).await
}

#[tauri::command]
async fn export_audit_logs(state: State<'_, AppState>, token: String) -> Result<String, String> {
    check_auth(&state, &token, vec!["CEO", "Technical"]).await?;
    let logs = state.db.read().await.get_audit_logs(None, None, None, None, None, None, None).await?;
    
    // Generate CSV
    let mut wtr = csv::Writer::from_writer(vec![]);
    wtr.write_record(&["ID", "User ID", "User Name", "Action", "Category", "Entity", "Entity ID", "Details", "IP Address", "User Agent", "Timestamp"]).map_err(|e| e.to_string())?;
    
    for log in logs {
        wtr.write_record(&[
            log.id.map(|i| i.to_string()).unwrap_or_default(),
            log.user_id.map(|i| i.to_string()).unwrap_or_default(),
            log.user_name.unwrap_or_default(),
            log.action,
            log.category.unwrap_or_default(),
            log.entity,
            log.entity_id.map(|i| i.to_string()).unwrap_or_default(),
            log.details.unwrap_or_default(),
            log.ip_address.unwrap_or_default(),
            log.user_agent.unwrap_or_default(),
            log.created_at.unwrap_or_default(),
        ]).map_err(|e| e.to_string())?;
    }
    
    let data = String::from_utf8(wtr.into_inner().map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    Ok(data)
}

// --- Dashboard Config Commands ---

#[tauri::command]
async fn get_dashboard_configs(state: State<'_, AppState>, user_id: i32, token: String) -> Result<Vec<DashboardConfig>, String> {
    check_auth(&state, &token, vec![]).await?; // Any authenticated
    let configs = state.db.read().await.get_dashboard_configs().await?;
    Ok(configs.into_iter().filter(|c| c.user_id == Some(user_id)).collect())
}

#[tauri::command]
async fn save_dashboard_config(state: State<'_, AppState>, config: DashboardConfig, token: String) -> Result<i64, String> {
    let user = check_auth(&state, &token, vec![]).await?; // Any authenticated
    let db = state.db.read().await;
    db.save_dashboard_config(config.clone()).await?;
    let _ = db.log_activity(user.id, "update".to_string(), "Dashboard".to_string(), Some("DashboardConfig".to_string()), config.id, Some(format!("Saved config: {}", config.name)), None, None).await;
    Ok(1)
}

// --- Project Management Commands ---

#[tauri::command]
async fn get_projects(state: State<'_, AppState>, token: String) -> Result<Vec<Project>, String> {
    check_auth(&state, &token, vec![]).await?; // Any authenticated
    state.db.read().await.get_projects().await
}

#[tauri::command]
async fn add_project(state: State<'_, AppState>, project: Project, token: String) -> Result<i64, String> {
    let user = check_auth(&state, &token, vec!["CEO", "Manager"]).await?;
    let db = state.db.read().await;
    let id = db.add_project(project.clone()).await?;
    let _ = db.log_activity(user.id, "create".to_string(), "ProjectManagement".to_string(), Some("Project".to_string()), Some(id as i32), Some(format!("Added project: {}", project.name)), None, None).await;
    Ok(id)
}

#[tauri::command]
async fn update_project(state: State<'_, AppState>, project: Project, token: String) -> Result<(), String> {
    let user = check_auth(&state, &token, vec!["CEO", "Manager"]).await?;
    let db = state.db.read().await;
    db.update_project(project.clone()).await?;
    let _ = db.log_activity(user.id, "update".to_string(), "ProjectManagement".to_string(), Some("Project".to_string()), project.id, Some(format!("Updated project: {}", project.name)), None, None).await;
    Ok(())
}

#[tauri::command]
async fn get_project_tasks(state: State<'_, AppState>, project_id: i32, token: String) -> Result<Vec<ProjectTask>, String> {
    check_auth(&state, &token, vec![]).await?; // Any authenticated
    state.db.read().await.get_project_tasks(project_id).await
}

#[tauri::command]
async fn add_project_task(state: State<'_, AppState>, task: ProjectTask, token: String) -> Result<i64, String> {
    let user = check_auth(&state, &token, vec![]).await?; // Any authenticated
    let db = state.db.read().await;
    if let (Some(pid), Some(emp_id)) = (task.project_id, task.assigned_to) {
        let assigns = db.get_project_assignments(pid).await?;
        let allowed = assigns.iter().any(|a| a.employee_id == emp_id);
        if !allowed {
            return Err("Assigned employee is not part of this project".into());
        }
    }
    let id = db.add_project_task(task.clone()).await?;
    let _ = db.log_activity(user.id, "create".to_string(), "ProjectManagement".to_string(), Some("ProjectTask".to_string()), Some(id as i32), Some(format!("Added task: {}", task.name)), None, None).await;
    Ok(id)
}

#[tauri::command]
async fn update_project_task(state: State<'_, AppState>, task: ProjectTask, token: String) -> Result<(), String> {
    let user = check_auth(&state, &token, vec![]).await?; // Any authenticated
    let db = state.db.read().await;
    if let (Some(pid), Some(emp_id)) = (task.project_id, task.assigned_to) {
        let assigns = db.get_project_assignments(pid).await?;
        let allowed = assigns.iter().any(|a| a.employee_id == emp_id);
        if !allowed {
            return Err("Assigned employee is not part of this project".into());
        }
    }
    db.update_project_task(task.clone()).await?;
    let _ = db.log_activity(user.id, "update".to_string(), "ProjectManagement".to_string(), Some("ProjectTask".to_string()), task.id, Some(format!("Updated task: {}", task.name)), None, None).await;
    Ok(())
}

#[tauri::command]
async fn delete_project_task(state: State<'_, AppState>, id: i32, token: String) -> Result<(), String> {
    let user = check_auth(&state, &token, vec![]).await?; // Any authenticated
    let db = state.db.read().await;
    db.delete_project_task(id).await?;
    let _ = db.log_activity(user.id, "delete".to_string(), "ProjectManagement".to_string(), Some("ProjectTask".to_string()), Some(id), Some("Deleted task".to_string()), None, None).await;
    Ok(())
}

#[tauri::command]
async fn delete_project(state: State<'_, AppState>, id: i32, token: String) -> Result<(), String> {
    let user = check_auth(&state, &token, vec!["CEO", "Manager"]).await?;
    let (ip, ua) = get_client_info(&state, &token).await;
    let db = state.db.read().await;
    db.delete_project(id).await?;
    let _ = db.log_activity(user.id, "delete".to_string(), "ProjectManagement".to_string(), Some("Project".to_string()), Some(id), Some("Deleted project".to_string()), ip, ua).await;
    Ok(())
}

#[tauri::command]
async fn assign_project_employee(state: State<'_, AppState>, project_id: i32, employee_id: i32, role: String, token: String) -> Result<(), String> {
    let user = check_auth(&state, &token, vec!["CEO", "Manager"]).await?;
    let db = state.db.read().await;
    db.assign_project_employee(project_id, employee_id, role.clone()).await?;
    let _ = db.log_activity(user.id, "assign".to_string(), "ProjectManagement".to_string(), Some("ProjectAssignment".to_string()), Some(project_id), Some(format!("Assigned emp {} as {}", employee_id, role)), None, None).await;
    Ok(())
}

#[tauri::command]
async fn get_project_assignments(state: State<'_, AppState>, project_id: i32, token: String) -> Result<Vec<ProjectAssignment>, String> {
    check_auth(&state, &token, vec![]).await?; // Any authenticated
    state.db.read().await.get_project_assignments(project_id).await
}

#[tauri::command]
async fn get_all_project_assignments(state: State<'_, AppState>, token: String) -> Result<Vec<ProjectAssignment>, String> {
    check_auth(&state, &token, vec!["CEO", "Manager"]).await?;
    state.db.read().await.get_all_project_assignments().await
}

#[tauri::command]
async fn remove_project_assignment(state: State<'_, AppState>, project_id: i32, employee_id: i32, token: String) -> Result<(), String> {
    let user = check_auth(&state, &token, vec!["CEO", "Manager"]).await?;
    let db = state.db.read().await;
    db.remove_project_assignment(project_id, employee_id).await?;
    let _ = db.log_activity(user.id, "remove_assignment".to_string(), "ProjectManagement".to_string(), Some("ProjectAssignment".to_string()), Some(project_id), Some(format!("Removed emp {} from project", employee_id)), None, None).await;
    Ok(())
}

// --- Finance Commands ---

#[tauri::command]
async fn get_accounts(state: State<'_, AppState>, token: String) -> Result<Vec<Account>, String> {
    check_auth(&state, &token, vec!["CEO", "Manager", "Finance"]).await?;
    state.db.read().await.get_accounts().await
}

#[tauri::command]
async fn add_account(state: State<'_, AppState>, account: Account, token: String) -> Result<i64, String> {
    let user = check_auth(&state, &token, vec!["CEO", "Manager", "Finance"]).await?;
    let db = state.db.read().await;
    let id = db.add_account(account.clone()).await?;
    let _ = db.log_activity(user.id, "create".to_string(), "Finance".to_string(), Some("Account".to_string()), Some(id as i32), Some(format!("Added account: {}", account.name)), None, None).await;
    Ok(id)
}

#[tauri::command]
async fn get_invoices(state: State<'_, AppState>, token: String) -> Result<Vec<Invoice>, String> {
    check_auth(&state, &token, vec!["CEO", "Manager", "Finance"]).await?;
    state.db.read().await.get_invoices().await
}

#[tauri::command]
async fn create_invoice(state: State<'_, AppState>, invoice: Invoice, token: String) -> Result<i64, String> {
    let user = check_auth(&state, &token, vec!["CEO", "Manager", "Finance"]).await?;
    let db = state.db.read().await;
    let id = db.create_invoice(invoice.clone()).await?;
    let _ = db.log_activity(user.id, "create".to_string(), "Finance".to_string(), Some("Invoice".to_string()), Some(id as i32), Some(format!("Created invoice for: {}", invoice.customer_name)), None, None).await;
    Ok(id)
}

// --- Integration Commands ---

#[tauri::command]
async fn get_integrations(state: State<'_, AppState>, token: String) -> Result<Vec<Integration>, String> {
    check_auth(&state, &token, vec!["CEO", "Technical"]).await?;
    state.db.read().await.get_integrations().await
}

#[tauri::command]
async fn toggle_integration(state: State<'_, AppState>, id: i32, is_connected: bool, token: String) -> Result<(), String> {
    let user = check_auth(&state, &token, vec!["CEO", "Technical"]).await?;
    let db = state.db.read().await;
    db.toggle_integration(id, is_connected).await?;
    let _ = db.log_activity(user.id, "update".to_string(), "SystemConfig".to_string(), Some("Integration".to_string()), Some(id), Some(format!("Toggled integration: {}", is_connected)), None, None).await;
    Ok(())
}

#[tauri::command]
async fn configure_integration(state: State<'_, AppState>, id: i32, api_key: Option<String>, config_json: Option<String>, token: String) -> Result<(), String> {
    let user = check_auth(&state, &token, vec!["CEO", "Technical"]).await?;
    let db = state.db.read().await;
    db.configure_integration(id, api_key, config_json).await?;
    let _ = db.log_activity(user.id, "update".to_string(), "SystemConfig".to_string(), Some("Integration".to_string()), Some(id), Some("Configured integration".to_string()), None, None).await;
    Ok(())
}

#[tauri::command]
async fn seed_demo_data(state: State<'_, AppState>, token: String) -> Result<(), String> {
    let user = check_auth(&state, &token, vec!["CEO", "Technical"]).await?;
    let db = state.db.read().await;
    db.seed_demo_data().await?;
    let _ = db.log_activity(user.id, "create".to_string(), "SystemConfig".to_string(), Some("DemoData".to_string()), None, Some("Seeded demo data".to_string()), None, None).await;
    Ok(())
}

#[tauri::command]
async fn save_db_config(app: tauri::AppHandle, state: State<'_, AppState>, config: DbConfig) -> Result<(), String> {
    let app_dir = app.path().app_local_data_dir().map_err(|e| e.to_string())?;
    let mut cfg = config.clone();
    if let db::config::DbType::Local = cfg.db_type {
        let input = if cfg.connection_string.trim().is_empty() { None } else { Some(cfg.connection_string.clone()) };
        // ensure_local_db is async, wait for it? No, it's in setup::local, which is sync IO.
        // We should wrap it.
        let handle = app.clone();
        let conn = tauri::async_runtime::spawn_blocking(move || setup::local::ensure_local_db(&handle, input))
            .await
            .map_err(|e| e.to_string())??;
        cfg.connection_string = conn;
    }
    cfg.connection_string = add_connect_timeout(&cfg.connection_string);
    cfg.save(&app_dir)?;

    let new_db: Box<dyn Database + Send + Sync> = match cfg.db_type {
        db::config::DbType::Local | db::config::DbType::Cloud => {
             let conn = add_connect_timeout(&cfg.connection_string);
             println!("Initializing DB connection to: {}", conn);
             
             let conn_clone = conn.clone();
             tauri::async_runtime::spawn_blocking(move || {
                db::postgres_init::init_db(&conn_clone)
             }).await
             .map_err(|e| format!("Task failed: {}", e))?
             .map_err(|e| format!("Init DB failed: {:?}", e))?;

             let pg_db = PostgresDatabase::new(&conn).map_err(|e| e.to_string())?;
             Box::new(pg_db)
        }
    };
    
    *state.db.write().await = new_db;
    
    Ok(())
}

#[tauri::command]
async fn ensure_local_db(app: tauri::AppHandle, connection_string: Option<String>) -> Result<String, String> {
    let handle = app.clone();
    tauri::async_runtime::spawn_blocking(move || setup::local::ensure_local_db(&handle, connection_string))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn cleanup_local_db(app: tauri::AppHandle) -> Result<(), String> {
    let handle = app.clone();
    tauri::async_runtime::spawn_blocking(move || setup::local::cleanup_local_db(&handle))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
fn check_embedded_pg_available(app: tauri::AppHandle) -> Result<bool, String> {
    Ok(setup::embedded::embedded_available(&app))
}

#[tauri::command]
fn check_postgres_installed() -> Result<bool, String> {
    Ok(setup::local::postgres_installed())
}

#[tauri::command]
fn exit_app(app: tauri::AppHandle) -> Result<(), String> {
    app.exit(0);
    Ok(())
}

#[tauri::command]
async fn get_all_invites(state: State<'_, AppState>, token: String) -> Result<Vec<Invite>, String> {
    let _ = check_auth(&state, &token, vec!["CEO", "Manager"]).await?;
    let db = state.db.read().await;
    db.get_invites().await
}

#[tauri::command]
async fn toggle_invite_status(state: State<'_, AppState>, token: String, invite_id: i32, is_active: bool) -> Result<(), String> {
    let user = check_auth(&state, &token, vec!["CEO", "Manager"]).await?;
    let db = state.db.read().await;
    db.toggle_invite_status(invite_id, is_active).await?;
    
    // Log activity
    let _ = db.log_activity(user.id, "toggle_invite".to_string(), "UserManagement".to_string(), Some("Invite".to_string()), Some(invite_id), Some(format!("New Status: {}", is_active)), None, None).await;
    
    Ok(())
}

#[tauri::command]
async fn reset_database(state: State<'_, AppState>, token: String) -> Result<(), String> {
    let _ = check_auth(&state, &token, vec!["CEO", "Technical"]).await?;
    let db = state.db.read().await;
    db.reset_database().await?;
    
    // Clear all sessions to invalidate current tokens
    let mut sessions = state.sessions.write().await;
    sessions.clear();
    
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    dotenv::dotenv().ok();
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_handle = app.handle();
            let app_data_dir = app_handle.path().app_local_data_dir().expect("failed to get app data dir");
            
            if !app_data_dir.exists() {
                std::fs::create_dir_all(&app_data_dir).expect("failed to create app data dir");
            }
            
            let db: Box<dyn Database + Send + Sync>;
            
            // Check if config exists
            if let Some(config) = DbConfig::load(&app_data_dir) {
                println!("Loaded DB config: {:?}", config);
                 // For local DB, we just use the config. If it fails, the UI should handle setup.
                 // We do NOT block startup to provision DB, as it causes timeouts.
                 let conn = add_connect_timeout(&config.connection_string);
                 match db::postgres_init::init_db(&conn) {
                     Ok(()) => {
                         match PostgresDatabase::new(&conn) {
                            Ok(pg_db) => { db = Box::new(pg_db); }
                            Err(e) => {
                                println!("Postgres connect error: {}", e);
                                println!("Critical Error: Failed to connect to configured Postgres database. Application is in Error State.");
                                db = Box::new(crate::db::NoOpDatabase);
                            }
                        }
                    }
                    Err(e) => {
                        println!("Postgres init error: {:?}", e);
                        println!("Critical Error: Failed to initialize Postgres database. Application is in Error State.");
                        db = Box::new(crate::db::NoOpDatabase);
                    }
                 }
            } else {
                 // Check for Postgres env var as fallback
                 if let Ok(pg_url) = std::env::var("DATABASE_URL") {
                    println!("Connecting to PostgreSQL via env var...");
                    let conn = add_connect_timeout(&pg_url);
                    match db::postgres_init::init_db(&conn) {
                        Ok(()) => {
                            match PostgresDatabase::new(&conn) {
                                Ok(pg_db) => { db = Box::new(pg_db); }
                                Err(e) => {
                                    println!("Postgres connect error: {:?}", e);
                                    println!("Critical Error: Failed to connect to Postgres (env var). Application is in Error State.");
                                    db = Box::new(crate::db::NoOpDatabase);
                                }
                            }
                        }
                        Err(e) => {
                            println!("Postgres init error: {:?}", e);
                            println!("Critical Error: Failed to initialize Postgres (env var). Application is in Error State.");
                            db = Box::new(crate::db::NoOpDatabase);
                        }
                    }
                 } else {
                    println!("No DB config found. Starting in Setup Mode (NoOpDatabase).");
                    db = Box::new(crate::db::NoOpDatabase);
                 }
            }

            // Load or Generate JWT Secret
            let secret_path = app_data_dir.join("secrets.json");
            let jwt_secret = if secret_path.exists() {
                if let Ok(content) = std::fs::read_to_string(&secret_path) {
                    // Simple JSON: {"jwt_secret": "..."}
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                        json["jwt_secret"].as_str().unwrap_or("default_fallback_secret").to_string()
                    } else {
                        "default_fallback_secret".to_string()
                    }
                } else {
                    "default_fallback_secret".to_string()
                }
            } else {
                // Generate a secure 32-byte hex secret (256 bits of entropy) using CSPRNG
                let secret: String = (0..32)
                    .map(|_| rand::thread_rng().gen::<u8>())
                    .map(|b| format!("{:02x}", b))
                    .collect();
                let db_pwd: String = (0..16)
                    .map(|_| rand::thread_rng().gen::<u8>())
                    .map(|b| format!("{:02x}", b))
                    .collect();
                let json = serde_json::json!({ "jwt_secret": secret, "db_password": db_pwd });
                if let Ok(content) = serde_json::to_string_pretty(&json) {
                    let _ = std::fs::write(&secret_path, content);
                }
                secret
            };

            app.manage(AppState { 
                db: RwLock::new(db),
                sessions: RwLock::new(HashMap::new()),
                jwt_secret
            });

            // Start background session cleanup task
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    // Run every hour
                    tokio::time::sleep(tokio::time::Duration::from_secs(3600)).await;
                    
                    let state = handle.state::<AppState>();
                    
                    // Cleanup in-memory sessions
                    {
                        let mut sessions = state.sessions.write().await;
                        let now = chrono::Utc::now().timestamp();
                        sessions.retain(|_, v| v.exp > now);
                    }
                    
                    // Cleanup DB sessions
                    {
                        let db = state.db.read().await;
                        if let Err(e) = db.cleanup_sessions().await {
                            eprintln!("Failed to cleanup sessions: {}", e);
                        }
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet, ping, login, logout, register_user, verify_connection, generate_invite_token, check_invite_token, accept_invite, get_all_invites, toggle_invite_status,
            get_products, add_product, update_product, delete_product,
            get_product_bom, save_bom, get_batches, add_batch, update_batch, get_velocity_report,
            get_suppliers, add_supplier, update_supplier, delete_supplier,
            get_supplier_orders, add_supplier_order, update_supplier_order, delete_supplier_order,
            get_employees, add_employee, update_employee, delete_employee,
            get_payments, add_payment, update_payment, delete_payment,
            get_tasks, add_task, update_task, delete_task,
            get_attendances, clock_in, clock_out,
            get_dashboard_stats,
            get_report_summary, get_monthly_cashflow,
            get_complaints, submit_complaint, resolve_complaint, delete_complaint,
            get_tools, add_tool, update_tool, delete_tool,
            assign_tool, return_tool, get_tool_history,
            get_roles, add_role, get_permissions, get_role_permissions, update_role_permissions,
            get_feature_toggles, set_feature_toggle,
            get_setup_status, get_company_name, complete_setup, check_username, get_active_db_type,
            get_audit_logs, export_audit_logs, update_client_info,
            get_dashboard_configs, save_dashboard_config,
            get_projects, add_project, update_project, get_project_tasks, add_project_task, update_project_task, delete_project, assign_project_employee, get_project_assignments, get_all_project_assignments, remove_project_assignment, delete_project_task,
            get_accounts, add_account, get_invoices, create_invoice,
            get_integrations, toggle_integration, configure_integration, seed_demo_data, reset_database,
            save_db_config, ensure_local_db, cleanup_local_db, check_embedded_pg_available, check_postgres_installed, exit_app
        ])
        .run(tauri::generate_context!())
        .unwrap_or_else(|e| {
            eprintln!("Error while running tauri application: {}", e);
            std::process::exit(1);
        });
}
