pub mod postgres;
pub mod postgres_init;
pub mod config;
pub mod noop;

#[cfg(test)]
pub mod memory;
pub use postgres::PostgresDatabase;
pub use config::DbConfig;
pub use noop::NoOpDatabase;
#[cfg(test)]
pub use memory::InMemoryDatabase;
use crate::models::*;
use async_trait::async_trait;

#[async_trait]
pub trait Database: Send + Sync {
    async fn get_setup_status(&self) -> Result<bool, String>;
    fn get_type(&self) -> String; // Usually just returns a string literal, no IO
    async fn complete_setup(&self, company_name: String, admin_name: String, admin_email: String, admin_password: String, admin_username: String) -> Result<(), String>;
    async fn set_company_name(&self, company_name: String) -> Result<(), String>;
    async fn get_company_name(&self) -> Result<Option<String>, String>;

    // Users & Auth
    async fn check_username_exists(&self, username: String) -> Result<bool, String>;
    async fn get_user_by_username(&self, username: String) -> Result<Option<User>, String>;
    async fn create_user(&self, user: User) -> Result<i64, String>;
    async fn update_user(&self, user: User) -> Result<(), String>;
    async fn update_user_last_login(&self, user_id: i32) -> Result<(), String>;
    async fn create_session(&self, token: String, user_id: i32, exp: i64) -> Result<(), String>;
    async fn get_session_user(&self, token: String) -> Result<Option<User>, String>;
    async fn revoke_session(&self, token: String) -> Result<(), String>;
    async fn cleanup_sessions(&self) -> Result<(), String>;

    // Invites
    async fn create_invite(&self, invite: Invite) -> Result<i64, String>;
    async fn get_invite(&self, token: String) -> Result<Option<Invite>, String>;
    async fn mark_invite_used(&self, token: String) -> Result<(), String>;
    async fn get_invites(&self) -> Result<Vec<Invite>, String>;
    async fn toggle_invite_status(&self, id: i32, is_active: bool) -> Result<(), String>;

    // Products
    async fn get_products(&self, search: Option<String>, page: Option<i32>, page_size: Option<i32>) -> Result<serde_json::Value, String>;
    async fn add_product(&self, product: Product) -> Result<i64, String>;
    async fn update_product(&self, product: Product) -> Result<(), String>;
    async fn delete_product(&self, id: i32) -> Result<(), String>;
    async fn record_sale(&self, sale: Sale) -> Result<i64, String>;

    // Employees
    async fn get_employees(&self) -> Result<Vec<Employee>, String>;
    async fn get_employee_by_email(&self, email: String) -> Result<Option<Employee>, String>;
    async fn add_employee(&self, employee: Employee) -> Result<i64, String>;
    async fn update_employee(&self, employee: Employee) -> Result<(), String>;
    async fn delete_employee(&self, id: i32) -> Result<(), String>;

    // Payments
    async fn get_payments(&self) -> Result<Vec<Payment>, String>;
    async fn add_payment(&self, payment: Payment) -> Result<i64, String>;
    async fn update_payment(&self, payment: Payment) -> Result<(), String>;
    async fn delete_payment(&self, id: i32) -> Result<(), String>;

    // Tasks (Generic)
    async fn get_tasks(&self) -> Result<Vec<Task>, String>;
    async fn get_tasks_by_employee(&self, employee_id: i32) -> Result<Vec<Task>, String>;
    async fn add_task(&self, task: Task) -> Result<i64, String>;
    async fn update_task(&self, task: Task) -> Result<(), String>;
    async fn delete_task(&self, id: i32) -> Result<(), String>;

    // Attendance
    async fn get_attendances(&self) -> Result<Vec<Attendance>, String>;
    async fn clock_in(&self, attendance: Attendance) -> Result<i64, String>;
    async fn clock_out(&self, attendance: Attendance) -> Result<(), String>;

    // Dashboard & Reports
    async fn get_dashboard_stats(&self) -> Result<DashboardStats, String>;
    async fn get_report_summary(&self) -> Result<ReportSummary, String>;
    async fn get_monthly_cashflow(&self) -> Result<Vec<ChartDataPoint>, String>;

    // Complaints
    async fn get_complaints(&self) -> Result<Vec<Complaint>, String>;
    async fn submit_complaint(&self, complaint: Complaint) -> Result<i64, String>;
    async fn resolve_complaint(&self, id: i32, status: String, resolution: String, resolved_by: String, admin_notes: Option<String>) -> Result<(), String>;
    async fn delete_complaint(&self, id: i32) -> Result<(), String>;

    // Tools
    async fn get_tools(&self) -> Result<Vec<Tool>, String>;
    async fn add_tool(&self, tool: Tool) -> Result<i64, String>;
    async fn update_tool(&self, tool: Tool) -> Result<(), String>;
    async fn delete_tool(&self, id: i32) -> Result<(), String>;
    async fn assign_tool(&self, assignment: ToolAssignment) -> Result<i64, String>;
    async fn return_tool(&self, id: i32, return_condition: String) -> Result<(), String>;

    // Roles & Permissions
    async fn get_roles(&self) -> Result<Vec<Role>, String>;
    async fn add_role(&self, role: Role) -> Result<i64, String>;
    async fn get_permissions(&self) -> Result<Vec<Permission>, String>;
    async fn get_role_permissions(&self, role_id: i32) -> Result<Vec<Permission>, String>;
    async fn update_role_permissions(&self, role_id: i32, permission_ids: Vec<i32>) -> Result<(), String>;

    // Feature Toggles
    async fn get_feature_toggles(&self) -> Result<Vec<FeatureToggle>, String>;
    async fn set_feature_toggle(&self, name: String, is_enabled: bool) -> Result<(), String>;

    // Audit Logs
    async fn get_audit_logs(&self, page: Option<i32>, page_size: Option<i32>, user_id: Option<i32>, action: Option<String>, category: Option<String>, date_from: Option<String>, date_to: Option<String>) -> Result<Vec<AuditLog>, String>;
    async fn log_activity(&self, user_id: Option<i32>, action: String, category: String, entity: Option<String>, entity_id: Option<i32>, details: Option<String>, ip_address: Option<String>, user_agent: Option<String>) -> Result<(), String>;

    // Dashboard Config
    async fn get_dashboard_configs(&self) -> Result<Vec<DashboardConfig>, String>;
    async fn save_dashboard_config(&self, config: DashboardConfig) -> Result<(), String>;

    // Tool History
    async fn get_tool_history(&self, tool_id: i32) -> Result<Vec<ToolAssignment>, String>;
    
    // Projects
    async fn get_projects(&self) -> Result<Vec<Project>, String>;
    async fn add_project(&self, project: Project) -> Result<i64, String>;
    async fn update_project(&self, project: Project) -> Result<(), String>;
    async fn delete_project(&self, id: i32) -> Result<(), String>;
    async fn get_project_tasks(&self, project_id: i32) -> Result<Vec<ProjectTask>, String>;
    async fn add_project_task(&self, task: ProjectTask) -> Result<i64, String>;
    async fn update_project_task(&self, task: ProjectTask) -> Result<(), String>;
    async fn delete_project_task(&self, id: i32) -> Result<(), String>;
    async fn assign_project_employee(&self, project_id: i32, employee_id: i32, role: String) -> Result<(), String>;
    async fn get_project_assignments(&self, project_id: i32) -> Result<Vec<ProjectAssignment>, String>;
    async fn get_all_project_assignments(&self) -> Result<Vec<ProjectAssignment>, String>;
    async fn remove_project_assignment(&self, project_id: i32, employee_id: i32) -> Result<(), String>;
    
    // Integrations
    async fn get_integrations(&self) -> Result<Vec<Integration>, String>;
    async fn toggle_integration(&self, id: i32, is_connected: bool) -> Result<(), String>;
    async fn configure_integration(&self, id: i32, api_key: Option<String>, config_json: Option<String>) -> Result<(), String>;

    // Finance (Accounts & Invoices)
    async fn get_accounts(&self) -> Result<Vec<Account>, String>;
    async fn add_account(&self, account: Account) -> Result<i64, String>;
    async fn get_invoices(&self) -> Result<Vec<Invoice>, String>;
    async fn create_invoice(&self, invoice: Invoice) -> Result<i64, String>;
    
    // Demo Data
    async fn seed_demo_data(&self) -> Result<(), String>;
    
    // System
    async fn reset_database(&self) -> Result<(), String>;

    // Supply Chain (BOM, Batches, Velocity)
    async fn get_product_bom(&self, product_id: i32) -> Result<(Option<BomHeader>, Vec<BomLine>), String>;
    async fn save_bom(&self, header: BomHeader, lines: Vec<BomLine>) -> Result<(), String>;
    async fn get_batches(&self, product_id: i32) -> Result<Vec<InventoryBatch>, String>;
    async fn add_batch(&self, batch: InventoryBatch) -> Result<i64, String>;
    async fn update_batch(&self, batch: InventoryBatch) -> Result<(), String>;
    async fn get_velocity_report(&self) -> Result<Vec<VelocityReport>, String>;

    // Suppliers
    async fn get_suppliers(&self) -> Result<Vec<Supplier>, String>;
    async fn add_supplier(&self, supplier: Supplier) -> Result<i64, String>;
    async fn update_supplier(&self, supplier: Supplier) -> Result<(), String>;
    async fn delete_supplier(&self, id: i32) -> Result<(), String>;
    
    // Supplier Orders
    async fn get_supplier_orders(&self) -> Result<Vec<SupplierOrder>, String>;
    async fn add_supplier_order(&self, order: SupplierOrder) -> Result<i64, String>;
    async fn update_supplier_order(&self, order: SupplierOrder) -> Result<(), String>;
    async fn delete_supplier_order(&self, id: i32) -> Result<(), String>;
}
