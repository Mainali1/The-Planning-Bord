pub mod db;
pub mod models;
pub mod setup;

use tauri::{State, Manager};
use std::sync::RwLock;
use std::collections::HashMap;
use models::{Product, Employee, Payment, DashboardStats, Task, Attendance, ReportSummary, ChartDataPoint, Complaint, Tool, Role, Permission, FeatureToggle, ToolAssignment, AuditLog, DashboardConfig, Project, ProjectTask, ProjectAssignment, Account, Invoice, Integration, User, LoginResponse, Invite};
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

#[derive(Debug, Serialize, Deserialize)]
struct InviteClaims {
    sub: String, // email
    role: String,
    name: String,
    exp: usize,
}

pub struct AppState {
    pub db: RwLock<Box<dyn Database + Send + Sync>>,
    pub sessions: RwLock<HashMap<String, User>>,
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
fn login(state: State<AppState>, username: String, password_plain: String) -> Result<LoginResponse, String> {
    let db = state.db.read().map_err(|e| e.to_string())?;
    let user_opt = db.get_user_by_username(username.clone())?;
    
    if let Some(user) = user_opt {
        // Verify password
        let parsed_hash = PasswordHash::new(&user.hashed_password).map_err(|e| e.to_string())?;
        if Argon2::default().verify_password(password_plain.as_bytes(), &parsed_hash).is_ok() {
            // Update last login
            let _ = db.update_user_last_login(user.id.unwrap());

            // Generate Token
            let token = Uuid::new_v4().to_string();
            
            // Store Session
            state.sessions.write().map_err(|e| e.to_string())?.insert(token.clone(), user.clone());

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
fn verify_connection(connection_string: String) -> Result<bool, String> {
    let conn = add_connect_timeout(&connection_string);
    // Attempt to connect/init. init_db handles basic connection check.
    match db::postgres_init::init_db(&conn) {
        Ok(_) => Ok(true),
        Err(e) => Err(format!("Connection failed: {:?}", e)),
    }
}

#[tauri::command]
fn generate_invite_token(state: State<AppState>, role: String, name: String, email: String, expiration_hours: u64, token: String) -> Result<String, String> {
    let user = check_auth(&state, &token, vec!["CEO", "Manager"])?;

    // 1. Generate JWT as the invite token
    let expiration_ts = chrono::Utc::now()
        .checked_add_signed(chrono::Duration::hours(expiration_hours as i64))
        .expect("valid timestamp")
        .timestamp() as usize;
    
    // We also calculate a formatted string for DB storage
    let expiration_db = chrono::Local::now()
        .checked_add_signed(chrono::Duration::hours(expiration_hours as i64))
        .expect("valid timestamp")
        .format("%Y-%m-%d %H:%M:%S")
        .to_string();

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
    };
    
    {
        let db = state.db.read().map_err(|e| e.to_string())?;
        db.create_invite(invite)?;
        // Log activity
        let _ = db.log_activity(user.id, "generate_invite".to_string(), Some("Invite".to_string()), None, Some(format!("Role: {}, Email: {}", role, email)));
    }

    Ok(invite_token)
}

#[tauri::command]
fn check_invite_token(state: State<AppState>, invite_token: String) -> Result<InviteClaims, String> {
    // 1. Validate JWT structure and expiration
    let secret = &state.jwt_secret;
    let token_data = decode::<InviteClaims>(&invite_token, &DecodingKey::from_secret(secret.as_ref()), &Validation::default())
        .map_err(|_| "Invalid or expired token".to_string())?;

    let claims = token_data.claims;
    let db = state.db.read().map_err(|e| e.to_string())?;
    
    // 2. Verify against Database (check if used or revoked)
    let stored_invite = db.get_invite(invite_token.clone())?
        .ok_or("Invite not found in database".to_string())?;
        
    if stored_invite.is_used {
        return Err("Invite has already been used".to_string());
    }
    
    Ok(claims)
}

#[tauri::command]
fn accept_invite(state: State<AppState>, invite_token: String, password_plain: String, username: String, full_name: String) -> Result<LoginResponse, String> {
    // 1. Validate JWT structure and expiration
    let secret = &state.jwt_secret;
    let token_data = decode::<InviteClaims>(&invite_token, &DecodingKey::from_secret(secret.as_ref()), &Validation::default())
        .map_err(|_| "Invalid or expired token".to_string())?;

    let claims = token_data.claims;
    let db = state.db.read().map_err(|e| e.to_string())?;
    
    // 2. Verify against Database
    let stored_invite = db.get_invite(invite_token.clone())?
        .ok_or("Invite not found in database".to_string())?;
        
    if stored_invite.is_used {
        return Err("Invite has already been used".to_string());
    }

    // Check if username taken
    if db.check_username_exists(username.clone())? {
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
    };
    let id = db.create_user(new_user.clone())?;
    let mut user = new_user;
    user.id = Some(id as i32);

    // 4. Mark invite as used
    db.mark_invite_used(invite_token)?;
    
    // Log activity
    let _ = db.log_activity(user.id, "accept_invite".to_string(), Some("User".to_string()), user.id, Some("User joined via invite".to_string()));

    // 5. Create session
    let session_token = Uuid::new_v4().to_string();
    state.sessions.write().map_err(|e| e.to_string())?.insert(session_token.clone(), user.clone());

    Ok(LoginResponse {
        user,
        token: session_token
    })
}

// Helper for verifying auth
fn check_auth(state: &State<AppState>, token: &str, allowed_roles: Vec<&str>) -> Result<User, String> {
    let sessions = state.sessions.read().map_err(|e| e.to_string())?;
    if let Some(user) = sessions.get(token) {
        if allowed_roles.contains(&user.role.as_str()) || allowed_roles.contains(&"CEO") { // CEO always allowed if in list? Or handle CEO explicitly.
            Ok(user.clone())
        } else if allowed_roles.is_empty() {
             Ok(user.clone()) // No specific roles required, just auth
        } else {
            Err("Insufficient permissions".to_string())
        }
    } else {
        Err("Invalid or expired session".to_string())
    }
}

#[tauri::command]
fn register_user(state: State<AppState>, mut user: User, password_plain: String) -> Result<i64, String> {
    // Hash password
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2.hash_password(password_plain.as_bytes(), &salt).map_err(|e| e.to_string())?.to_string();
    
    user.hashed_password = password_hash;
    
    state.db.read().map_err(|e| e.to_string())?.create_user(user)
}

// --- Product Commands ---

#[tauri::command]
fn get_products(state: State<AppState>, search: Option<String>, page: Option<i32>, page_size: Option<i32>, token: String) -> Result<serde_json::Value, String> {
    check_auth(&state, &token, vec![])?; // Any authenticated
    state.db.read().map_err(|e| e.to_string())?.get_products(search, page, page_size)
}

#[tauri::command]
fn add_product(state: State<AppState>, product: Product, token: String) -> Result<i64, String> {
    check_auth(&state, &token, vec!["CEO", "Manager"])?;
    state.db.read().map_err(|e| e.to_string())?.add_product(product)
}

#[tauri::command]
fn update_product(state: State<AppState>, product: Product, token: String) -> Result<(), String> {
    check_auth(&state, &token, vec!["CEO", "Manager"])?;
    state.db.read().map_err(|e| e.to_string())?.update_product(product)
}

#[tauri::command]
fn delete_product(state: State<AppState>, id: i32, token: String) -> Result<(), String> {
    check_auth(&state, &token, vec!["CEO", "Manager"])?;
    state.db.read().map_err(|e| e.to_string())?.delete_product(id)
}

// --- Employee Commands ---

#[tauri::command]
fn get_employees(state: State<AppState>, token: String) -> Result<Vec<Employee>, String> {
    check_auth(&state, &token, vec!["CEO", "Manager", "HR"])?;
    state.db.read().map_err(|e| e.to_string())?.get_employees()
}

#[tauri::command]
fn add_employee(state: State<AppState>, employee: Employee, token: String) -> Result<i64, String> {
    check_auth(&state, &token, vec!["CEO", "Manager", "HR"])?;
    state.db.read().map_err(|e| e.to_string())?.add_employee(employee)
}

#[tauri::command]
fn update_employee(state: State<AppState>, employee: Employee, token: String) -> Result<(), String> {
    check_auth(&state, &token, vec!["CEO", "Manager", "HR"])?;
    state.db.read().map_err(|e| e.to_string())?.update_employee(employee)
}

#[tauri::command]
fn delete_employee(state: State<AppState>, id: i32, token: String) -> Result<(), String> {
    check_auth(&state, &token, vec!["CEO", "Manager", "HR"])?;
    state.db.read().map_err(|e| e.to_string())?.delete_employee(id)
}

// --- Payment Commands ---

#[tauri::command]
fn get_payments(state: State<AppState>, token: String) -> Result<Vec<Payment>, String> {
    check_auth(&state, &token, vec!["CEO", "Manager", "Finance"])?;
    state.db.read().map_err(|e| e.to_string())?.get_payments()
}

#[tauri::command]
fn add_payment(state: State<AppState>, payment: Payment, token: String) -> Result<i64, String> {
    check_auth(&state, &token, vec!["CEO", "Manager", "Finance"])?;
    state.db.read().map_err(|e| e.to_string())?.add_payment(payment)
}

#[tauri::command]
fn update_payment(state: State<AppState>, payment: Payment, token: String) -> Result<(), String> {
    check_auth(&state, &token, vec!["CEO", "Manager", "Finance"])?;
    state.db.read().map_err(|e| e.to_string())?.update_payment(payment)
}

#[tauri::command]
fn delete_payment(state: State<AppState>, id: i32, token: String) -> Result<(), String> {
    check_auth(&state, &token, vec!["CEO", "Manager", "Finance"])?;
    state.db.read().map_err(|e| e.to_string())?.delete_payment(id)
}

// --- Task Commands ---

#[tauri::command]
fn get_tasks(state: State<AppState>, token: String) -> Result<Vec<Task>, String> {
    check_auth(&state, &token, vec![])?; // Any authenticated
    state.db.read().map_err(|e| e.to_string())?.get_tasks()
}

#[tauri::command]
fn add_task(state: State<AppState>, task: Task, token: String) -> Result<i64, String> {
    check_auth(&state, &token, vec![])?; // Any authenticated
    state.db.read().map_err(|e| e.to_string())?.add_task(task)
}

#[tauri::command]
fn update_task(state: State<AppState>, task: Task, token: String) -> Result<(), String> {
    check_auth(&state, &token, vec![])?; // Any authenticated
    state.db.read().map_err(|e| e.to_string())?.update_task(task)
}

#[tauri::command]
fn delete_task(state: State<AppState>, id: i32, token: String) -> Result<(), String> {
    check_auth(&state, &token, vec![])?; // Any authenticated
    state.db.read().map_err(|e| e.to_string())?.delete_task(id)
}

// --- Attendance Commands ---

#[tauri::command]
fn get_attendances(state: State<AppState>, token: String) -> Result<Vec<Attendance>, String> {
    check_auth(&state, &token, vec!["CEO", "Manager", "HR"])?;
    state.db.read().map_err(|e| e.to_string())?.get_attendances()
}

#[tauri::command]
fn clock_in(state: State<AppState>, attendance: Attendance, token: String) -> Result<i64, String> {
    check_auth(&state, &token, vec![])?; // Any authenticated user
    state.db.read().map_err(|e| e.to_string())?.clock_in(attendance)
}

#[tauri::command]
fn clock_out(state: State<AppState>, attendance: Attendance, token: String) -> Result<(), String> {
    check_auth(&state, &token, vec![])?; // Any authenticated user
    state.db.read().map_err(|e| e.to_string())?.clock_out(attendance)
}

// --- Dashboard Commands ---

#[tauri::command]
fn get_dashboard_stats(state: State<AppState>, token: String) -> Result<DashboardStats, String> {
    let user = check_auth(&state, &token, vec![])?; // Check auth, get user
    let mut stats = state.db.read().map_err(|e| e.to_string())?.get_dashboard_stats()?;

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
fn get_report_summary(state: State<AppState>, token: String) -> Result<ReportSummary, String> {
    check_auth(&state, &token, vec!["CEO", "Manager", "Finance"])?;
    state.db.read().map_err(|e| e.to_string())?.get_report_summary()
}

#[tauri::command]
fn get_monthly_cashflow(state: State<AppState>, token: String) -> Result<Vec<ChartDataPoint>, String> {
    check_auth(&state, &token, vec!["CEO", "Manager", "Finance"])?;
    state.db.read().map_err(|e| e.to_string())?.get_monthly_cashflow()
}

// --- Complaint Commands ---

#[tauri::command]
fn get_complaints(state: State<AppState>, token: String) -> Result<Vec<Complaint>, String> {
    check_auth(&state, &token, vec!["CEO", "Manager", "HR"])?;
    state.db.read().map_err(|e| e.to_string())?.get_complaints()
}

#[tauri::command]
fn submit_complaint(state: State<AppState>, content: String, token: String) -> Result<i64, String> {
    check_auth(&state, &token, vec![])?; // Authenticated
    let created_at = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let complaint = Complaint {
        id: None,
        content,
        created_at: Some(created_at),
        status: "pending".to_string(),
        admin_notes: None,
        resolution: None,
        resolved_at: None,
        resolved_by: None,
    };
    state.db.read().map_err(|e| e.to_string())?.submit_complaint(complaint)
}

#[tauri::command]
fn resolve_complaint(state: State<AppState>, id: i32, status: String, resolution: String, resolved_by: String, admin_notes: Option<String>, token: String) -> Result<(), String> {
    check_auth(&state, &token, vec!["CEO", "Manager", "HR"])?;
    state.db.read().map_err(|e| e.to_string())?.resolve_complaint(id, status, resolution, resolved_by, admin_notes)
}

#[tauri::command]
fn delete_complaint(state: State<AppState>, id: i32, token: String) -> Result<(), String> {
    check_auth(&state, &token, vec!["CEO", "Manager", "HR"])?;
    state.db.read().map_err(|e| e.to_string())?.delete_complaint(id)
}

// --- Tool Commands ---

#[tauri::command]
fn get_tools(state: State<AppState>, token: String) -> Result<Vec<Tool>, String> {
    check_auth(&state, &token, vec![])?; // Any authenticated
    state.db.read().map_err(|e| e.to_string())?.get_tools()
}

#[tauri::command]
fn add_tool(state: State<AppState>, tool: Tool, token: String) -> Result<i64, String> {
    check_auth(&state, &token, vec!["CEO", "Manager"])?;
    state.db.read().map_err(|e| e.to_string())?.add_tool(tool)
}

#[tauri::command]
fn update_tool(state: State<AppState>, tool: Tool, token: String) -> Result<(), String> {
    check_auth(&state, &token, vec!["CEO", "Manager"])?;
    state.db.read().map_err(|e| e.to_string())?.update_tool(tool)
}

#[tauri::command]
fn delete_tool(state: State<AppState>, id: i32, token: String) -> Result<(), String> {
    check_auth(&state, &token, vec!["CEO", "Manager"])?;
    state.db.read().map_err(|e| e.to_string())?.delete_tool(id)
}

#[tauri::command]
fn assign_tool(state: State<AppState>, tool_id: i32, employee_id: i32, condition: String, notes: Option<String>, token: String) -> Result<(), String> {
    check_auth(&state, &token, vec!["CEO", "Manager"])?;
    let assignment = ToolAssignment {
        id: None,
        tool_id: Some(tool_id),
        employee_id: Some(employee_id),
        assigned_at: Some(chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string()),
        returned_at: None,
        condition_on_assignment: Some(condition),
        condition_on_return: None,
        notes,
    };
    state.db.read().map_err(|e| e.to_string())?.assign_tool(assignment).map(|_| ())
}

#[tauri::command]
fn return_tool(state: State<AppState>, tool_id: i32, condition: String, _notes: Option<String>, token: String) -> Result<(), String> {
    check_auth(&state, &token, vec!["CEO", "Manager"])?;
    state.db.read().map_err(|e| e.to_string())?.return_tool(tool_id, condition)
}

#[tauri::command]
fn get_tool_history(state: State<AppState>, tool_id: i32, token: String) -> Result<Vec<ToolAssignment>, String> {
    check_auth(&state, &token, vec!["CEO", "Manager"])?;
    state.db.read().map_err(|e| e.to_string())?.get_tool_history(tool_id)
}

// --- RBAC & Feature Toggle Commands ---

#[tauri::command]
fn get_roles(state: State<AppState>, token: String) -> Result<Vec<Role>, String> {
    check_auth(&state, &token, vec![])?; // Any authenticated
    state.db.read().map_err(|e| e.to_string())?.get_roles()
}

#[tauri::command]
fn add_role(state: State<AppState>, name: String, description: Option<String>, token: String) -> Result<i64, String> {
    check_auth(&state, &token, vec!["CEO", "Technical"])?;
    let role = Role {
        id: None,
        name,
        description,
        is_custom: true,
    };
    state.db.read().map_err(|e| e.to_string())?.add_role(role)
}

#[tauri::command]
fn get_permissions(state: State<AppState>, token: String) -> Result<Vec<Permission>, String> {
    check_auth(&state, &token, vec!["CEO", "Technical"])?;
    state.db.read().map_err(|e| e.to_string())?.get_permissions()
}

#[tauri::command]
fn get_role_permissions(state: State<AppState>, role_id: i32, token: String) -> Result<Vec<i32>, String> {
    check_auth(&state, &token, vec!["CEO", "Technical"])?;
    let perms = state.db.read().map_err(|e| e.to_string())?.get_role_permissions(role_id)?;
    Ok(perms.into_iter().map(|p| p.id).collect())
}

#[tauri::command]
fn update_role_permissions(state: State<AppState>, role_id: i32, permission_ids: Vec<i32>, token: String) -> Result<(), String> {
    check_auth(&state, &token, vec!["CEO", "Technical"])?;
    state.db.read().map_err(|e| e.to_string())?.update_role_permissions(role_id, permission_ids)
}

#[tauri::command]
fn get_feature_toggles(state: State<AppState>, token: String) -> Result<Vec<FeatureToggle>, String> {
    check_auth(&state, &token, vec![])?; // Any authenticated
    state.db.read().map_err(|e| e.to_string())?.get_feature_toggles()
}

#[tauri::command]
fn set_feature_toggle(state: State<AppState>, key: String, is_enabled: bool, token: String) -> Result<(), String> {
    check_auth(&state, &token, vec!["CEO", "Technical"])?;
    state.db.read().map_err(|e| e.to_string())?.set_feature_toggle(key, is_enabled)
}

// --- Setup Commands ---

#[tauri::command]
fn get_setup_status(state: State<AppState>) -> Result<bool, String> {
    state.db.read().map_err(|e| e.to_string())?.get_setup_status()
}

#[tauri::command]
fn check_username(state: State<AppState>, username: String) -> Result<bool, String> {
    state.db.read().map_err(|e| e.to_string())?.check_username_exists(username)
}

#[tauri::command]
fn complete_setup(state: State<AppState>, company_name: String, admin_name: String, admin_email: String, admin_password: String, admin_username: String) -> Result<(), String> {
    let db = state.db.read().map_err(|e| e.to_string())?;
    db.complete_setup(company_name, admin_name, admin_email, admin_password, admin_username)
}

#[tauri::command]
fn get_active_db_type(state: State<AppState>) -> String {
    match state.db.read() {
        Ok(db) => db.get_type(),
        Err(_) => "error".to_string(),
    }
}

// --- Audit Log Commands ---

#[tauri::command]
fn get_audit_logs(state: State<AppState>, _page: Option<i32>, _page_size: Option<i32>, token: String) -> Result<Vec<AuditLog>, String> {
    check_auth(&state, &token, vec!["CEO", "Technical"])?;
    state.db.read().map_err(|e| e.to_string())?.get_audit_logs()
}

// --- Dashboard Config Commands ---

#[tauri::command]
fn get_dashboard_configs(state: State<AppState>, user_id: i32, token: String) -> Result<Vec<DashboardConfig>, String> {
    check_auth(&state, &token, vec![])?; // Any authenticated
    let configs = state.db.read().map_err(|e| e.to_string())?.get_dashboard_configs()?;
    Ok(configs.into_iter().filter(|c| c.user_id == Some(user_id)).collect())
}

#[tauri::command]
fn save_dashboard_config(state: State<AppState>, config: DashboardConfig, token: String) -> Result<i64, String> {
    check_auth(&state, &token, vec![])?; // Any authenticated
    state.db.read().map_err(|e| e.to_string())?.save_dashboard_config(config).map(|_| 1)
}

// --- Project Management Commands ---

#[tauri::command]
fn get_projects(state: State<AppState>, token: String) -> Result<Vec<Project>, String> {
    check_auth(&state, &token, vec![])?; // Any authenticated
    state.db.read().map_err(|e| e.to_string())?.get_projects()
}

#[tauri::command]
fn add_project(state: State<AppState>, project: Project, token: String) -> Result<i64, String> {
    check_auth(&state, &token, vec!["CEO", "Manager"])?;
    state.db.read().map_err(|e| e.to_string())?.add_project(project)
}

#[tauri::command]
fn update_project(state: State<AppState>, project: Project, token: String) -> Result<(), String> {
    check_auth(&state, &token, vec!["CEO", "Manager"])?;
    state.db.read().map_err(|e| e.to_string())?.update_project(project)
}

#[tauri::command]
fn get_project_tasks(state: State<AppState>, project_id: i32, token: String) -> Result<Vec<ProjectTask>, String> {
    check_auth(&state, &token, vec![])?; // Any authenticated
    state.db.read().map_err(|e| e.to_string())?.get_project_tasks(project_id)
}

#[tauri::command]
fn add_project_task(state: State<AppState>, task: ProjectTask, token: String) -> Result<i64, String> {
    check_auth(&state, &token, vec![])?; // Any authenticated
    state.db.read().map_err(|e| e.to_string())?.add_project_task(task)
}

#[tauri::command]
fn update_project_task(state: State<AppState>, task: ProjectTask, token: String) -> Result<(), String> {
    check_auth(&state, &token, vec![])?; // Any authenticated
    state.db.read().map_err(|e| e.to_string())?.update_project_task(task)
}

#[tauri::command]
fn delete_project_task(state: State<AppState>, id: i32, token: String) -> Result<(), String> {
    check_auth(&state, &token, vec![])?; // Any authenticated
    state.db.read().map_err(|e| e.to_string())?.delete_project_task(id)
}

#[tauri::command]
fn delete_project(state: State<AppState>, id: i32, token: String) -> Result<(), String> {
    check_auth(&state, &token, vec!["CEO", "Manager"])?;
    state.db.read().map_err(|e| e.to_string())?.delete_project(id)
}

#[tauri::command]
fn assign_project_employee(state: State<AppState>, project_id: i32, employee_id: i32, role: String, token: String) -> Result<(), String> {
    check_auth(&state, &token, vec!["CEO", "Manager"])?;
    state.db.read().map_err(|e| e.to_string())?.assign_project_employee(project_id, employee_id, role)
}

#[tauri::command]
fn get_project_assignments(state: State<AppState>, project_id: i32, token: String) -> Result<Vec<ProjectAssignment>, String> {
    check_auth(&state, &token, vec![])?; // Any authenticated
    state.db.read().map_err(|e| e.to_string())?.get_project_assignments(project_id)
}

#[tauri::command]
fn get_all_project_assignments(state: State<AppState>, token: String) -> Result<Vec<ProjectAssignment>, String> {
    check_auth(&state, &token, vec!["CEO", "Manager"])?;
    state.db.read().map_err(|e| e.to_string())?.get_all_project_assignments()
}

#[tauri::command]
fn remove_project_assignment(state: State<AppState>, project_id: i32, employee_id: i32, token: String) -> Result<(), String> {
    check_auth(&state, &token, vec!["CEO", "Manager"])?;
    state.db.read().map_err(|e| e.to_string())?.remove_project_assignment(project_id, employee_id)
}

// --- Finance Commands ---

#[tauri::command]
fn get_accounts(state: State<AppState>, token: String) -> Result<Vec<Account>, String> {
    check_auth(&state, &token, vec!["CEO", "Manager", "Finance"])?;
    state.db.read().map_err(|e| e.to_string())?.get_accounts()
}

#[tauri::command]
fn add_account(state: State<AppState>, account: Account, token: String) -> Result<i64, String> {
    check_auth(&state, &token, vec!["CEO", "Manager", "Finance"])?;
    state.db.read().map_err(|e| e.to_string())?.add_account(account)
}

#[tauri::command]
fn get_invoices(state: State<AppState>, token: String) -> Result<Vec<Invoice>, String> {
    check_auth(&state, &token, vec!["CEO", "Manager", "Finance"])?;
    state.db.read().map_err(|e| e.to_string())?.get_invoices()
}

#[tauri::command]
fn create_invoice(state: State<AppState>, invoice: Invoice, token: String) -> Result<i64, String> {
    check_auth(&state, &token, vec!["CEO", "Manager", "Finance"])?;
    state.db.read().map_err(|e| e.to_string())?.create_invoice(invoice)
}

// --- Integration Commands ---

#[tauri::command]
fn get_integrations(state: State<AppState>, token: String) -> Result<Vec<Integration>, String> {
    check_auth(&state, &token, vec!["CEO", "Technical"])?;
    state.db.read().map_err(|e| e.to_string())?.get_integrations()
}

#[tauri::command]
fn toggle_integration(state: State<AppState>, id: i32, is_connected: bool, token: String) -> Result<(), String> {
    check_auth(&state, &token, vec!["CEO", "Technical"])?;
    state.db.read().map_err(|e| e.to_string())?.toggle_integration(id, is_connected)
}

#[tauri::command]
fn configure_integration(state: State<AppState>, id: i32, api_key: Option<String>, config_json: Option<String>, token: String) -> Result<(), String> {
    check_auth(&state, &token, vec!["CEO", "Technical"])?;
    state.db.read().map_err(|e| e.to_string())?.configure_integration(id, api_key, config_json)
}

#[tauri::command]
fn seed_demo_data(state: State<AppState>, token: String) -> Result<(), String> {
    check_auth(&state, &token, vec!["CEO", "Technical"])?;
    state.db.read().map_err(|e| e.to_string())?.seed_demo_data()
}

#[tauri::command]
fn save_db_config(app: tauri::AppHandle, state: State<AppState>, config: DbConfig) -> Result<(), String> {
    let app_dir = app.path().app_local_data_dir().map_err(|e| e.to_string())?;
    let mut cfg = config.clone();
    if let db::config::DbType::Local = cfg.db_type {
        let input = if cfg.connection_string.trim().is_empty() { None } else { Some(cfg.connection_string.clone()) };
        let conn = setup::local::ensure_local_db(&app, input)?;
        cfg.connection_string = conn;
    }
    cfg.connection_string = add_connect_timeout(&cfg.connection_string);
    cfg.save(&app_dir)?;

    let new_db: Box<dyn Database + Send + Sync> = match cfg.db_type {
        db::config::DbType::Local | db::config::DbType::Cloud => {
             let conn = add_connect_timeout(&cfg.connection_string);
             println!("Initializing DB connection to: {}", conn);
             db::postgres_init::init_db(&conn).map_err(|e| e.to_string())?;
             let pg_db = PostgresDatabase::new(&conn).map_err(|e| e.to_string())?;
             Box::new(pg_db)
        }
    };
    
    *state.db.write().map_err(|e| e.to_string())? = new_db;
    
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
                                println!("Falling back to InMemoryDatabase");
                                db = Box::new(crate::db::InMemoryDatabase::new());
                            }
                        }
                    }
                    Err(e) => {
                        println!("Postgres not available, using InMemoryDatabase. Error details: {:?}", e);
                        db = Box::new(crate::db::InMemoryDatabase::new());
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
                                    db = Box::new(crate::db::InMemoryDatabase::new());
                                }
                            }
                        }
                        Err(e) => {
                            println!("Postgres init error: {:?}", e);
                            db = Box::new(crate::db::InMemoryDatabase::new());
                        }
                    }
                 } else {
                    println!("No DB config found. Using InMemoryDatabase.");
                    db = Box::new(crate::db::InMemoryDatabase::new());
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
                
                let json = serde_json::json!({ "jwt_secret": secret });
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
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet, ping, login, register_user, verify_connection, generate_invite_token, check_invite_token, accept_invite,
            get_products, add_product, update_product, delete_product,
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
            get_setup_status, complete_setup, check_username, get_active_db_type,
            get_audit_logs,
            get_dashboard_configs, save_dashboard_config,
            get_projects, add_project, update_project, get_project_tasks, add_project_task, update_project_task, delete_project, assign_project_employee, get_project_assignments, get_all_project_assignments, remove_project_assignment, delete_project_task,
            get_accounts, add_account, get_invoices, create_invoice,
            get_integrations, toggle_integration, configure_integration, seed_demo_data,
            save_db_config, ensure_local_db, cleanup_local_db, check_embedded_pg_available, check_postgres_installed, exit_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}