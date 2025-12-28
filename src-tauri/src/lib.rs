pub mod db;
pub mod models;
pub mod setup;

use tauri::{State, Manager};
use std::sync::RwLock;
use models::{Product, Employee, Payment, DashboardStats, Task, Attendance, ReportSummary, ChartDataPoint, Complaint, Tool, Role, Permission, FeatureToggle, ToolAssignment, AuditLog, DashboardConfig, Project, ProjectTask, ProjectAssignment, Account, Invoice, Integration};
use db::{Database, DbConfig, PostgresDatabase};

pub struct AppState {
    pub db: RwLock<Box<dyn Database + Send + Sync>>,
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

// --- Product Commands ---

#[tauri::command]
fn get_products(state: State<AppState>, search: Option<String>, page: Option<i32>, page_size: Option<i32>) -> Result<serde_json::Value, String> {
    state.db.read().unwrap().get_products(search, page, page_size)
}

#[tauri::command]
fn add_product(state: State<AppState>, product: Product) -> Result<i64, String> {
    state.db.read().unwrap().add_product(product)
}

#[tauri::command]
fn update_product(state: State<AppState>, product: Product) -> Result<(), String> {
    state.db.read().unwrap().update_product(product)
}

#[tauri::command]
fn delete_product(state: State<AppState>, id: i32) -> Result<(), String> {
    state.db.read().unwrap().delete_product(id)
}

// --- Employee Commands ---

#[tauri::command]
fn get_employees(state: State<AppState>) -> Result<Vec<Employee>, String> {
    state.db.read().unwrap().get_employees()
}

#[tauri::command]
fn add_employee(state: State<AppState>, employee: Employee) -> Result<i64, String> {
    state.db.read().unwrap().add_employee(employee)
}

#[tauri::command]
fn update_employee(state: State<AppState>, employee: Employee) -> Result<(), String> {
    state.db.read().unwrap().update_employee(employee)
}

#[tauri::command]
fn delete_employee(state: State<AppState>, id: i32) -> Result<(), String> {
    state.db.read().unwrap().delete_employee(id)
}

// --- Payment Commands ---

#[tauri::command]
fn get_payments(state: State<AppState>) -> Result<Vec<Payment>, String> {
    state.db.read().unwrap().get_payments()
}

#[tauri::command]
fn add_payment(state: State<AppState>, payment: Payment) -> Result<i64, String> {
    state.db.read().unwrap().add_payment(payment)
}

#[tauri::command]
fn update_payment(state: State<AppState>, payment: Payment) -> Result<(), String> {
    state.db.read().unwrap().update_payment(payment)
}

#[tauri::command]
fn delete_payment(state: State<AppState>, id: i32) -> Result<(), String> {
    state.db.read().unwrap().delete_payment(id)
}

// --- Task Commands ---

#[tauri::command]
fn get_tasks(state: State<AppState>) -> Result<Vec<Task>, String> {
    state.db.read().unwrap().get_tasks()
}

#[tauri::command]
fn add_task(state: State<AppState>, task: Task) -> Result<i64, String> {
    state.db.read().unwrap().add_task(task)
}

#[tauri::command]
fn update_task(state: State<AppState>, task: Task) -> Result<(), String> {
    state.db.read().unwrap().update_task(task)
}

#[tauri::command]
fn delete_task(state: State<AppState>, id: i32) -> Result<(), String> {
    state.db.read().unwrap().delete_task(id)
}

// --- Attendance Commands ---

#[tauri::command]
fn get_attendances(state: State<AppState>) -> Result<Vec<Attendance>, String> {
    state.db.read().unwrap().get_attendances()
}

#[tauri::command]
fn clock_in(state: State<AppState>, attendance: Attendance) -> Result<i64, String> {
    state.db.read().unwrap().clock_in(attendance)
}

#[tauri::command]
fn clock_out(state: State<AppState>, attendance: Attendance) -> Result<(), String> {
    state.db.read().unwrap().clock_out(attendance)
}

// --- Dashboard Commands ---

#[tauri::command]
fn get_dashboard_stats(state: State<AppState>) -> Result<DashboardStats, String> {
    state.db.read().unwrap().get_dashboard_stats()
}

// --- Reports Commands ---

#[tauri::command]
fn get_report_summary(state: State<AppState>) -> Result<ReportSummary, String> {
    state.db.read().unwrap().get_report_summary()
}

#[tauri::command]
fn get_monthly_cashflow(state: State<AppState>) -> Result<Vec<ChartDataPoint>, String> {
    state.db.read().unwrap().get_monthly_cashflow()
}

// --- Complaint Commands ---

#[tauri::command]
fn get_complaints(state: State<AppState>) -> Result<Vec<Complaint>, String> {
    state.db.read().unwrap().get_complaints()
}

#[tauri::command]
fn submit_complaint(state: State<AppState>, content: String) -> Result<i64, String> {
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
    state.db.read().unwrap().submit_complaint(complaint)
}

#[tauri::command]
fn resolve_complaint(state: State<AppState>, id: i32, status: String, resolution: String, resolved_by: String, admin_notes: Option<String>) -> Result<(), String> {
    state.db.read().unwrap().resolve_complaint(id, status, resolution, resolved_by, admin_notes)
}

#[tauri::command]
fn delete_complaint(state: State<AppState>, id: i32) -> Result<(), String> {
    state.db.read().unwrap().delete_complaint(id)
}

// --- Tool Commands ---

#[tauri::command]
fn get_tools(state: State<AppState>) -> Result<Vec<Tool>, String> {
    state.db.read().unwrap().get_tools()
}

#[tauri::command]
fn add_tool(state: State<AppState>, tool: Tool) -> Result<i64, String> {
    state.db.read().unwrap().add_tool(tool)
}

#[tauri::command]
fn update_tool(state: State<AppState>, tool: Tool) -> Result<(), String> {
    state.db.read().unwrap().update_tool(tool)
}

#[tauri::command]
fn delete_tool(state: State<AppState>, id: i32) -> Result<(), String> {
    state.db.read().unwrap().delete_tool(id)
}

#[tauri::command]
fn assign_tool(state: State<AppState>, tool_id: i32, employee_id: i32, condition: String, notes: Option<String>) -> Result<(), String> {
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
    state.db.read().unwrap().assign_tool(assignment).map(|_| ())
}

#[tauri::command]
fn return_tool(state: State<AppState>, tool_id: i32, condition: String, _notes: Option<String>) -> Result<(), String> {
    state.db.read().unwrap().return_tool(tool_id, condition)
}

#[tauri::command]
fn get_tool_history(state: State<AppState>, tool_id: i32) -> Result<Vec<ToolAssignment>, String> {
    state.db.read().unwrap().get_tool_history(tool_id)
}

// --- RBAC & Feature Toggle Commands ---

#[tauri::command]
fn get_roles(state: State<AppState>) -> Result<Vec<Role>, String> {
    state.db.read().unwrap().get_roles()
}

#[tauri::command]
fn add_role(state: State<AppState>, name: String, description: Option<String>) -> Result<i64, String> {
    let role = Role {
        id: None,
        name,
        description,
        is_custom: true,
    };
    state.db.read().unwrap().add_role(role)
}

#[tauri::command]
fn get_permissions(state: State<AppState>) -> Result<Vec<Permission>, String> {
    state.db.read().unwrap().get_permissions()
}

#[tauri::command]
fn get_role_permissions(state: State<AppState>, role_id: i32) -> Result<Vec<i32>, String> {
    let perms = state.db.read().unwrap().get_role_permissions(role_id)?;
    Ok(perms.into_iter().map(|p| p.id).collect())
}

#[tauri::command]
fn update_role_permissions(state: State<AppState>, role_id: i32, permission_ids: Vec<i32>) -> Result<(), String> {
    state.db.read().unwrap().update_role_permissions(role_id, permission_ids)
}

#[tauri::command]
fn get_feature_toggles(state: State<AppState>) -> Result<Vec<FeatureToggle>, String> {
    state.db.read().unwrap().get_feature_toggles()
}

#[tauri::command]
fn set_feature_toggle(state: State<AppState>, key: String, is_enabled: bool) -> Result<(), String> {
    state.db.read().unwrap().set_feature_toggle(key, is_enabled)
}

// --- Setup Commands ---

#[tauri::command]
fn get_setup_status(state: State<AppState>) -> Result<bool, String> {
    state.db.read().unwrap().get_setup_status()
}

#[tauri::command]
fn complete_setup(state: State<AppState>, company_name: String, admin_email: String, admin_password: String) -> Result<(), String> {
    let db = state.db.read().unwrap();
    db.complete_setup(company_name, admin_email, admin_password)
}

#[tauri::command]
fn get_active_db_type(state: State<AppState>) -> String {
    state.db.read().unwrap().get_type()
}

// --- Audit Log Commands ---

#[tauri::command]
fn get_audit_logs(state: State<AppState>, _page: Option<i32>, _page_size: Option<i32>) -> Result<Vec<AuditLog>, String> {
    state.db.read().unwrap().get_audit_logs()
}

// --- Dashboard Config Commands ---

#[tauri::command]
fn get_dashboard_configs(state: State<AppState>, user_id: i32) -> Result<Vec<DashboardConfig>, String> {
    let configs = state.db.read().unwrap().get_dashboard_configs()?;
    Ok(configs.into_iter().filter(|c| c.user_id == Some(user_id)).collect())
}

#[tauri::command]
fn save_dashboard_config(state: State<AppState>, config: DashboardConfig) -> Result<i64, String> {
    state.db.read().unwrap().save_dashboard_config(config).map(|_| 1)
}

// --- Project Management Commands ---

#[tauri::command]
fn get_projects(state: State<AppState>) -> Result<Vec<Project>, String> {
    state.db.read().unwrap().get_projects()
}

#[tauri::command]
fn add_project(state: State<AppState>, project: Project) -> Result<i64, String> {
    state.db.read().unwrap().add_project(project)
}

#[tauri::command]
fn update_project(state: State<AppState>, project: Project) -> Result<(), String> {
    state.db.read().unwrap().update_project(project)
}

#[tauri::command]
fn get_project_tasks(state: State<AppState>, project_id: i32) -> Result<Vec<ProjectTask>, String> {
    state.db.read().unwrap().get_project_tasks(project_id)
}

#[tauri::command]
fn add_project_task(state: State<AppState>, task: ProjectTask) -> Result<i64, String> {
    state.db.read().unwrap().add_project_task(task)
}

#[tauri::command]
fn update_project_task(state: State<AppState>, task: ProjectTask) -> Result<(), String> {
    state.db.read().unwrap().update_project_task(task)
}

#[tauri::command]
fn delete_project_task(state: State<AppState>, id: i32) -> Result<(), String> {
    state.db.read().unwrap().delete_project_task(id)
}

#[tauri::command]
fn delete_project(state: State<AppState>, id: i32) -> Result<(), String> {
    state.db.read().unwrap().delete_project(id)
}

#[tauri::command]
fn assign_project_employee(state: State<AppState>, project_id: i32, employee_id: i32, role: String) -> Result<(), String> {
    state.db.read().unwrap().assign_project_employee(project_id, employee_id, role)
}

#[tauri::command]
fn get_project_assignments(state: State<AppState>, project_id: i32) -> Result<Vec<ProjectAssignment>, String> {
    state.db.read().unwrap().get_project_assignments(project_id)
}

#[tauri::command]
fn get_all_project_assignments(state: State<AppState>) -> Result<Vec<ProjectAssignment>, String> {
    state.db.read().unwrap().get_all_project_assignments()
}

#[tauri::command]
fn remove_project_assignment(state: State<AppState>, project_id: i32, employee_id: i32) -> Result<(), String> {
    state.db.read().unwrap().remove_project_assignment(project_id, employee_id)
}

// --- Finance Commands ---

#[tauri::command]
fn get_accounts(state: State<AppState>) -> Result<Vec<Account>, String> {
    state.db.read().unwrap().get_accounts()
}

#[tauri::command]
fn add_account(state: State<AppState>, account: Account) -> Result<i64, String> {
    state.db.read().unwrap().add_account(account)
}

#[tauri::command]
fn get_invoices(state: State<AppState>) -> Result<Vec<Invoice>, String> {
    state.db.read().unwrap().get_invoices()
}

#[tauri::command]
fn create_invoice(state: State<AppState>, invoice: Invoice) -> Result<i64, String> {
    state.db.read().unwrap().create_invoice(invoice)
}

// --- Integration Commands ---

#[tauri::command]
fn get_integrations(state: State<AppState>) -> Result<Vec<Integration>, String> {
    state.db.read().unwrap().get_integrations()
}

#[tauri::command]
fn toggle_integration(state: State<AppState>, id: i32, is_connected: bool) -> Result<(), String> {
    state.db.read().unwrap().toggle_integration(id, is_connected)
}

#[tauri::command]
fn configure_integration(state: State<AppState>, id: i32, api_key: Option<String>, config_json: Option<String>) -> Result<(), String> {
    state.db.read().unwrap().configure_integration(id, api_key, config_json)
}

#[tauri::command]
fn seed_demo_data(state: State<AppState>) -> Result<(), String> {
    state.db.read().unwrap().seed_demo_data()
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

            app.manage(AppState { db: RwLock::new(db) });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet, ping,
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
            get_setup_status, complete_setup, get_active_db_type,
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
