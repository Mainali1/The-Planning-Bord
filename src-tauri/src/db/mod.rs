pub mod postgres;
pub mod postgres_init;
pub mod config;
pub mod noop;

pub mod memory;
pub use postgres::PostgresDatabase;
pub use config::DbConfig;
pub use noop::NoOpDatabase;
pub use memory::InMemoryDatabase;
use crate::models::*;

pub trait Database: Send + Sync {
    fn get_setup_status(&self) -> Result<bool, String>;
    fn get_type(&self) -> String;
    fn complete_setup(&self, company_name: String, admin_email: String, admin_password: String) -> Result<(), String>;
    fn set_company_name(&self, company_name: String) -> Result<(), String>;

    // Users & Auth
    fn get_user_by_username(&self, username: String) -> Result<Option<User>, String>;
    fn create_user(&self, user: User) -> Result<i64, String>;
    fn update_user_last_login(&self, user_id: i32) -> Result<(), String>;

    // Products
    fn get_products(&self, search: Option<String>, page: Option<i32>, page_size: Option<i32>) -> Result<serde_json::Value, String>;
    fn add_product(&self, product: Product) -> Result<i64, String>;
    fn update_product(&self, product: Product) -> Result<(), String>;
    fn delete_product(&self, id: i32) -> Result<(), String>;

    // Employees
    fn get_employees(&self) -> Result<Vec<Employee>, String>;
    fn add_employee(&self, employee: Employee) -> Result<i64, String>;
    fn update_employee(&self, employee: Employee) -> Result<(), String>;
    fn delete_employee(&self, id: i32) -> Result<(), String>;

    // Payments
    fn get_payments(&self) -> Result<Vec<Payment>, String>;
    fn add_payment(&self, payment: Payment) -> Result<i64, String>;
    fn update_payment(&self, payment: Payment) -> Result<(), String>;
    fn delete_payment(&self, id: i32) -> Result<(), String>;

    // Tasks (Generic)
    fn get_tasks(&self) -> Result<Vec<Task>, String>;
    fn add_task(&self, task: Task) -> Result<i64, String>;
    fn update_task(&self, task: Task) -> Result<(), String>;
    fn delete_task(&self, id: i32) -> Result<(), String>;

    // Attendance
    fn get_attendances(&self) -> Result<Vec<Attendance>, String>;
    fn clock_in(&self, attendance: Attendance) -> Result<i64, String>;
    fn clock_out(&self, attendance: Attendance) -> Result<(), String>;

    // Dashboard & Reports
    fn get_dashboard_stats(&self) -> Result<DashboardStats, String>;
    fn get_report_summary(&self) -> Result<ReportSummary, String>;
    fn get_monthly_cashflow(&self) -> Result<Vec<ChartDataPoint>, String>;

    // Complaints
    fn get_complaints(&self) -> Result<Vec<Complaint>, String>;
    fn submit_complaint(&self, complaint: Complaint) -> Result<i64, String>;
    fn resolve_complaint(&self, id: i32, status: String, resolution: String, resolved_by: String, admin_notes: Option<String>) -> Result<(), String>;
    fn delete_complaint(&self, id: i32) -> Result<(), String>;

    // Tools
    fn get_tools(&self) -> Result<Vec<Tool>, String>;
    fn add_tool(&self, tool: Tool) -> Result<i64, String>;
    fn update_tool(&self, tool: Tool) -> Result<(), String>;
    fn delete_tool(&self, id: i32) -> Result<(), String>;
    fn assign_tool(&self, assignment: ToolAssignment) -> Result<i64, String>;
    fn return_tool(&self, id: i32, return_condition: String) -> Result<(), String>;

    // Roles & Permissions
    fn get_roles(&self) -> Result<Vec<Role>, String>;
    fn add_role(&self, role: Role) -> Result<i64, String>;
    fn get_permissions(&self) -> Result<Vec<Permission>, String>;
    fn get_role_permissions(&self, role_id: i32) -> Result<Vec<Permission>, String>;
    fn update_role_permissions(&self, role_id: i32, permission_ids: Vec<i32>) -> Result<(), String>;

    // Feature Toggles
    fn get_feature_toggles(&self) -> Result<Vec<FeatureToggle>, String>;
    fn set_feature_toggle(&self, name: String, is_enabled: bool) -> Result<(), String>;

    // Audit Logs
    fn get_audit_logs(&self) -> Result<Vec<AuditLog>, String>;
    fn log_activity(&self, user_id: Option<i32>, action: String, entity: Option<String>, entity_id: Option<i32>, details: Option<String>) -> Result<(), String>;

    // Dashboard Config
    fn get_dashboard_configs(&self) -> Result<Vec<DashboardConfig>, String>;
    fn save_dashboard_config(&self, config: DashboardConfig) -> Result<(), String>;

    // Tool History
    fn get_tool_history(&self, tool_id: i32) -> Result<Vec<ToolAssignment>, String>;
    
    // Projects
    fn get_projects(&self) -> Result<Vec<Project>, String>;
    fn add_project(&self, project: Project) -> Result<i64, String>;
    fn update_project(&self, project: Project) -> Result<(), String>;
    fn delete_project(&self, id: i32) -> Result<(), String>;
    fn get_project_tasks(&self, project_id: i32) -> Result<Vec<ProjectTask>, String>;
    fn add_project_task(&self, task: ProjectTask) -> Result<i64, String>;
    fn update_project_task(&self, task: ProjectTask) -> Result<(), String>;
    fn delete_project_task(&self, id: i32) -> Result<(), String>;
    fn assign_project_employee(&self, project_id: i32, employee_id: i32, role: String) -> Result<(), String>;
    fn get_project_assignments(&self, project_id: i32) -> Result<Vec<ProjectAssignment>, String>;
    fn get_all_project_assignments(&self) -> Result<Vec<ProjectAssignment>, String>;
    fn remove_project_assignment(&self, project_id: i32, employee_id: i32) -> Result<(), String>;
    
    // Integrations
    fn get_integrations(&self) -> Result<Vec<Integration>, String>;
    fn toggle_integration(&self, id: i32, is_connected: bool) -> Result<(), String>;
    fn configure_integration(&self, id: i32, api_key: Option<String>, config_json: Option<String>) -> Result<(), String>;

    // Finance (Accounts & Invoices)
    fn get_accounts(&self) -> Result<Vec<Account>, String>;
    fn add_account(&self, account: Account) -> Result<i64, String>;
    fn get_invoices(&self) -> Result<Vec<Invoice>, String>;
    fn create_invoice(&self, invoice: Invoice) -> Result<i64, String>;
    
    // Demo Data
    fn seed_demo_data(&self) -> Result<(), String>;
}
